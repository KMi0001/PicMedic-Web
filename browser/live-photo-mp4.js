/*
 * live-photo-mp4.js
 *
 * 라이브 포토의 짝 동영상(.MOV, QuickTime)을 .MP4로 바꿔서 내려받게 하는 순수 JS 변환기.
 * 외부 라이브러리 없이(=CDN/라이선스 걱정 없이) MOV 상자(box) 구조를 직접 읽어서
 * MP4로 다시 포장한다.
 *
 * - 영상 트랙: 다시 인코딩하지 않고 샘플 데이터를 그대로 옮긴다(화질 손실 없음, 빠름).
 *   그래서 영상 코덱은 원본 그대로다 — H.264면 어디서든 재생되고, HEVC(H.265)면
 *   재생하는 PC에 HEVC 지원이 없을 수 있다(result.videoCodec === "hevc"로 알려준다).
 * - 소리 트랙: 원본이 AAC면 그대로 옮기고, 무압축 PCM(옛 아이폰)이면 브라우저의
 *   WebCodecs AudioEncoder로 AAC로 바꿔서 담는다. 그 브라우저가 AAC 인코딩을
 *   지원하지 않으면 영상만 담은 MP4를 만들고 audioStatus로 이유를 알려준다.
 * - QuickTime 전용 메타데이터 트랙(mebx 등)은 버린다.
 *
 * 플레인 스크립트(모듈 아님) — 전역 window.LivePhotoMp4로 노출하고, Node에서 테스트할 수
 * 있게 module.exports도 지원한다.
 */
(function (root) {
  "use strict";

  const TWO32 = 4294967296;

  // ---------------------------------------------------------------- 바이트 도우미
  function u32(n) {
    return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
  }
  function u16(n) {
    return new Uint8Array([(n >>> 8) & 255, n & 255]);
  }
  function bytes(...a) {
    return new Uint8Array(a);
  }
  function zeros(n) {
    return new Uint8Array(n);
  }
  function cc(s) {
    return new Uint8Array([s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3)]);
  }
  function cat(...parts) {
    let len = 0;
    for (const p of parts) len += p.length;
    const out = new Uint8Array(len);
    let pos = 0;
    for (const p of parts) {
      out.set(p, pos);
      pos += p.length;
    }
    return out;
  }
  function catList(list) {
    let len = 0;
    for (const p of list) len += p.length;
    const out = new Uint8Array(len);
    let pos = 0;
    for (const p of list) {
      out.set(p, pos);
      pos += p.length;
    }
    return out;
  }
  function mk(type, ...parts) {
    const body = cat(...parts);
    return cat(u32(8 + body.length), cc(type), body);
  }
  function full(type, version, flags, ...parts) {
    return mk(type, bytes(version, (flags >>> 16) & 255, (flags >>> 8) & 255, flags & 255), ...parts);
  }

  // ---------------------------------------------------------------- 상자 읽기
  function fourcc(dv, pos) {
    return String.fromCharCode(dv.getUint8(pos), dv.getUint8(pos + 1), dv.getUint8(pos + 2), dv.getUint8(pos + 3));
  }

  function readBoxes(u8, start, end) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const out = [];
    let pos = start;
    while (pos + 8 <= end) {
      let size = dv.getUint32(pos);
      const type = fourcc(dv, pos + 4);
      let hdr = 8;
      if (size === 1) {
        if (pos + 16 > end) break;
        size = dv.getUint32(pos + 8) * TWO32 + dv.getUint32(pos + 12);
        hdr = 16;
      } else if (size === 0) {
        size = end - pos;
      }
      if (size < hdr) break;
      const boxEnd = Math.min(pos + size, end);
      out.push({ type, start: pos, end: boxEnd, body: pos + hdr });
      pos += size;
    }
    return out;
  }

  function kids(u8, box) {
    return readBoxes(u8, box.body, box.end);
  }
  function kid(u8, box, type) {
    return kids(u8, box).find((b) => b.type === type) || null;
  }
  function raw(u8, box) {
    return u8.subarray(box.start, box.end);
  }

  function fail(message) {
    const e = new Error(message);
    e.livePhotoMp4 = true;
    return e;
  }

  // ---------------------------------------------------------------- moov 해석
  function parseTrack(u8, dv, trak) {
    const tkhd = kid(u8, trak, "tkhd");
    const mdia = kid(u8, trak, "mdia");
    if (!tkhd || !mdia) return null;
    const mdhd = kid(u8, mdia, "mdhd");
    const hdlr = kid(u8, mdia, "hdlr");
    const minf = kid(u8, mdia, "minf");
    const stbl = minf && kid(u8, minf, "stbl");
    if (!mdhd || !hdlr || !stbl) return null;

    const mdhdV = dv.getUint8(mdhd.body);
    const timescale = mdhdV === 1 ? dv.getUint32(mdhd.body + 20) : dv.getUint32(mdhd.body + 12);
    const duration =
      mdhdV === 1
        ? dv.getUint32(mdhd.body + 24) * TWO32 + dv.getUint32(mdhd.body + 28)
        : dv.getUint32(mdhd.body + 16);
    const handler = fourcc(dv, hdlr.body + 8);
    const tkhdV = dv.getUint8(tkhd.body);
    const trackId = tkhdV === 1 ? dv.getUint32(tkhd.body + 20) : dv.getUint32(tkhd.body + 12);

    const t = {
      handler,
      trackId,
      timescale,
      duration,
      tkhd,
      edts: kid(u8, trak, "edts"),
      stsd: kid(u8, stbl, "stsd"),
      stts: kid(u8, stbl, "stts"),
      ctts: kid(u8, stbl, "ctts"),
      stss: kid(u8, stbl, "stss"),
      stszBox: kid(u8, stbl, "stsz"),
    };

    const stsc = kid(u8, stbl, "stsc");
    const stco = kid(u8, stbl, "stco");
    const co64 = kid(u8, stbl, "co64");
    if (!t.stsd || !t.stts || !t.stszBox || !stsc || !(stco || co64)) return null;

    // stsz
    const constSize = dv.getUint32(t.stszBox.body + 4);
    const count = dv.getUint32(t.stszBox.body + 8);
    const sizes = [];
    if (constSize === 0) {
      for (let i = 0; i < count; i++) sizes.push(dv.getUint32(t.stszBox.body + 12 + i * 4));
    }
    t.stsz = { constSize, count, sizes };

    // stsc
    const runCount = dv.getUint32(stsc.body + 4);
    t.stsc = [];
    for (let i = 0; i < runCount; i++) {
      const p = stsc.body + 8 + i * 12;
      t.stsc.push({ first: dv.getUint32(p), perChunk: dv.getUint32(p + 4) });
    }

    // stco / co64
    t.chunkOffsets = [];
    if (stco) {
      const n = dv.getUint32(stco.body + 4);
      for (let i = 0; i < n; i++) t.chunkOffsets.push(dv.getUint32(stco.body + 8 + i * 4));
    } else {
      const n = dv.getUint32(co64.body + 4);
      for (let i = 0; i < n; i++) {
        const p = co64.body + 8 + i * 8;
        t.chunkOffsets.push(dv.getUint32(p) * TWO32 + dv.getUint32(p + 4));
      }
    }
    return t;
  }

  function parseMov(buf) {
    const u8 = new Uint8Array(buf);
    if (u8.length < 16) throw fail("동영상 파일이 너무 작아요.");
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const top = readBoxes(u8, 0, u8.length);
    const moov = top.find((b) => b.type === "moov");
    if (!moov) throw fail("동영상 정보(moov)를 찾지 못했어요. 손상됐거나 MOV/MP4 파일이 아닐 수 있어요.");
    const mvhd = kid(u8, moov, "mvhd");
    if (!mvhd) throw fail("동영상 헤더를 찾지 못했어요.");
    const tracks = [];
    for (const trak of kids(u8, moov).filter((b) => b.type === "trak")) {
      const t = parseTrack(u8, dv, trak);
      if (t) tracks.push(t);
    }
    return { u8, dv, mvhd, tracks };
  }

  // 트랙의 모든 샘플 바이트를 순서대로 이어붙인다(청크 단위로 복사).
  function collectSamples(u8, t) {
    const { constSize, count, sizes } = t.stsz;
    const outSizes = new Uint32Array(count);
    const pieces = [];
    let idx = 0;
    let runIdx = 0;
    for (let c = 0; c < t.chunkOffsets.length && idx < count; c++) {
      while (runIdx + 1 < t.stsc.length && t.stsc[runIdx + 1].first <= c + 1) runIdx++;
      const perChunk = t.stsc[runIdx].perChunk;
      let len = 0;
      for (let s = 0; s < perChunk && idx < count; s++, idx++) {
        const sz = constSize || sizes[idx];
        outSizes[idx] = sz;
        len += sz;
      }
      const off = t.chunkOffsets[c];
      if (off + len > u8.length) throw fail("동영상 파일이 중간에 잘린 것 같아요.");
      pieces.push(u8.subarray(off, off + len));
    }
    return { data: catList(pieces), sizes: outSizes, count: idx };
  }

  // ---------------------------------------------------------------- 영상 샘플 엔트리 재구성
  const VIDEO_ENTRY_TYPES = { avc1: "avc", avc3: "avc", hvc1: "hevc", hev1: "hevc" };

  function buildVideoStsd(u8, dv, t) {
    const entryStart = t.stsd.body + 8; // ver/flags(4) + entry_count(4)
    const entryType = fourcc(dv, entryStart + 4);
    const family = VIDEO_ENTRY_TYPES[entryType];
    if (!family) throw fail(`이 영상 코덱(${entryType.trim()})은 MP4로 바꿀 수 없어요.`);
    const entrySize = dv.getUint32(entryStart);
    const width = dv.getUint16(entryStart + 32);
    const height = dv.getUint16(entryStart + 34);

    const children = readBoxes(u8, entryStart + 86, entryStart + entrySize);
    const configType = family === "avc" ? "avcC" : "hvcC";
    const config = children.find((b) => b.type === configType);
    if (!config) throw fail("영상 설정 정보를 찾지 못했어요.");
    const extras = [raw(u8, config)];
    for (const b of children) {
      if (b.type === "pasp") extras.push(raw(u8, b));
      if (b.type === "colr") {
        const ctype = fourcc(dv, b.body);
        if (ctype === "nclx") extras.push(raw(u8, b));
        else if (ctype === "nclc") {
          // QuickTime 방식 색상 정보(nclc) → MP4 방식(nclx). 끝에 full-range 플래그 1바이트만 더 붙는다.
          extras.push(mk("colr", cc("nclx"), u8.subarray(b.body + 4, b.body + 10), bytes(0)));
        }
      }
    }

    const entry = mk(
      entryType,
      zeros(6), u16(1), // reserved, data_reference_index
      zeros(16), // version/revision/vendor/quality
      u16(width), u16(height),
      u32(0x00480000), u32(0x00480000), // 72 dpi
      u32(0), u16(1), // data size, frame count
      zeros(32), u16(0x0018), u16(0xffff), // compressor name, depth, pre_defined
      ...extras
    );
    return { stsd: full("stsd", 0, 0, u32(1), entry), family, entryType };
  }

  // ---------------------------------------------------------------- 소리 트랙
  function findEsds(u8, start, end) {
    for (const b of readBoxes(u8, start, end)) {
      if (b.type === "esds") return b;
      if (b.type === "wave") {
        const inner = findEsds(u8, b.body, b.end);
        if (inner) return inner;
      }
    }
    return null;
  }

  function audioEntryInfo(u8, dv, t) {
    const entryStart = t.stsd.body + 8;
    const entrySize = dv.getUint32(entryStart);
    const type = fourcc(dv, entryStart + 4);
    const version = dv.getUint16(entryStart + 16);
    const info = { type, version, entryStart, entrySize };
    if (type === "lpcm" || version === 2) {
      // QuickTime 사운드 디스크립션 v2
      info.sampleRate = dv.getFloat64(entryStart + 40);
      info.channels = dv.getUint32(entryStart + 48);
      info.bits = dv.getUint32(entryStart + 56);
      info.flags = dv.getUint32(entryStart + 60);
    } else {
      info.channels = dv.getUint16(entryStart + 24);
      info.bits = dv.getUint16(entryStart + 26);
      info.sampleRate = dv.getUint32(entryStart + 32) / 65536;
      if (type === "sowt") info.flags = 4; // 부호 있는 정수, 리틀엔디언
      else if (type === "twos") info.flags = 4 | 2; // 부호 있는 정수, 빅엔디언
    }
    return info;
  }

  // PCM 바이트 → 인터리브된 Float32Array. 지원하지 않는 형식이면 null.
  function pcmToFloat32(data, info) {
    const isFloat = (info.flags & 1) !== 0;
    const bigEndian = (info.flags & 2) !== 0;
    const bits = info.bits;
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (!isFloat && bits === 16) {
      const n = data.length >> 1;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = dv.getInt16(i * 2, !bigEndian) / 32768;
      return out;
    }
    if (!isFloat && bits === 24) {
      const n = Math.floor(data.length / 3);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const p = i * 3;
        let v = bigEndian ? (data[p] << 16) | (data[p + 1] << 8) | data[p + 2] : (data[p + 2] << 16) | (data[p + 1] << 8) | data[p];
        if (v & 0x800000) v -= 0x1000000;
        out[i] = v / 8388608;
      }
      return out;
    }
    if (isFloat && bits === 32) {
      const n = data.length >> 2;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = dv.getFloat32(i * 4, !bigEndian);
      return out;
    }
    return null;
  }

  const AAC_FREQS = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];

  function makeAudioSpecificConfig(sampleRate, channels) {
    const freqIdx = AAC_FREQS.indexOf(sampleRate);
    if (freqIdx < 0) return null;
    const v = (2 << 11) | (freqIdx << 7) | (channels << 3);
    return bytes((v >> 8) & 255, v & 255);
  }

  function descriptor(tag, ...parts) {
    const body = cat(...parts);
    // 길이를 항상 4바이트(0x80 0x80 0x80 nn)로 써서 큰 값도 안전하게
    return cat(bytes(tag, 0x80 | ((body.length >> 21) & 0x7f), 0x80 | ((body.length >> 14) & 0x7f), 0x80 | ((body.length >> 7) & 0x7f), body.length & 0x7f), body);
  }

  function buildEsds(asc, bitrate) {
    const decoderSpecific = descriptor(0x05, asc);
    const decoderConfig = descriptor(0x04, bytes(0x40, 0x15), bytes(0, 0, 0), u32(bitrate), u32(bitrate), decoderSpecific);
    const slConfig = descriptor(0x06, bytes(0x02));
    const es = descriptor(0x03, u16(0), bytes(0), decoderConfig, slConfig);
    return full("esds", 0, 0, es);
  }

  function buildMp4aEntry(channels, sampleRate, esdsBox) {
    return mk(
      "mp4a",
      zeros(6), u16(1),
      u16(0), u16(0), u32(0),
      u16(channels), u16(16), u16(0), u16(0),
      u32(((sampleRate & 0xffff) << 16) >>> 0),
      esdsBox
    );
  }

  function stripAdts(frame) {
    if (frame.length > 7 && frame[0] === 0xff && (frame[1] & 0xf0) === 0xf0) {
      const protectionAbsent = frame[1] & 1;
      return frame.subarray(protectionAbsent ? 7 : 9);
    }
    return frame;
  }

  async function encodeAac(float32, sampleRate, channels, onProgress) {
    const AE = root.AudioEncoder;
    const AD = root.AudioData;
    if (typeof AE === "undefined" || typeof AD === "undefined") return { ok: false, status: "encoder-unavailable" };
    const cfg = { codec: "mp4a.40.2", sampleRate, numberOfChannels: channels, bitrate: 64000 * channels, aac: { format: "aac" } };
    try {
      const sup = await AE.isConfigSupported(cfg);
      if (!sup || !sup.supported) return { ok: false, status: "encoder-unavailable" };
    } catch (e) {
      return { ok: false, status: "encoder-unavailable" };
    }

    const frames = [];
    let description = null;
    let encodeError = null;
    const encoder = new AE({
      output: (chunk, meta) => {
        const d = new Uint8Array(chunk.byteLength);
        chunk.copyTo(d);
        frames.push(stripAdts(d));
        const desc = meta && meta.decoderConfig && meta.decoderConfig.description;
        if (desc && !description) {
          description = desc instanceof ArrayBuffer ? new Uint8Array(desc) : new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength);
        }
      },
      error: (e) => {
        encodeError = e;
      },
    });
    try {
      encoder.configure(cfg);
      const totalFrames = Math.floor(float32.length / channels);
      const chunkFrames = 4096;
      for (let start = 0; start < totalFrames; start += chunkFrames) {
        const n = Math.min(chunkFrames, totalFrames - start);
        const audioData = new AD({
          format: "f32",
          sampleRate,
          numberOfFrames: n,
          numberOfChannels: channels,
          timestamp: Math.round((start / sampleRate) * 1e6),
          data: float32.subarray(start * channels, (start + n) * channels),
        });
        encoder.encode(audioData);
        audioData.close();
        if (onProgress) onProgress(Math.min(1, (start + n) / totalFrames));
      }
      await encoder.flush();
      encoder.close();
    } catch (e) {
      return { ok: false, status: "failed" };
    }
    if (encodeError || frames.length === 0) return { ok: false, status: "failed" };
    return { ok: true, frames, description };
  }

  // 원본 소리 트랙을 MP4에 담을 수 있는 형태로 준비한다. 못 담으면 status만 돌려준다.
  async function prepareAudio(mov, onProgress) {
    const { u8, dv, tracks } = mov;
    const t = tracks.find((x) => x.handler === "soun");
    if (!t) return { status: "no-audio-track" };
    const info = audioEntryInfo(u8, dv, t);

    // (1) 이미 AAC → 그대로 옮긴다(재인코딩 없음)
    if (info.type === "mp4a") {
      const esds = findEsds(u8, info.entryStart + (info.version === 1 ? 52 : info.version === 2 ? 72 : 36), info.entryStart + info.entrySize);
      if (esds) {
        const { data } = collectSamples(u8, t);
        return {
          status: "included",
          timescale: t.timescale,
          duration: t.duration,
          entry: buildMp4aEntry(info.channels, Math.round(info.sampleRate), raw(u8, esds)),
          stts: raw(u8, t.stts),
          stsz: raw(u8, t.stszBox),
          data,
        };
      }
    }

    // (2) 무압축 PCM → AAC로 인코딩
    if (!info.sampleRate || !info.channels) return { status: "unsupported-format" };
    const { data } = collectSamples(u8, t);
    const float32 = pcmToFloat32(data, info);
    if (!float32) return { status: "unsupported-format" };
    const sampleRate = Math.round(info.sampleRate);
    const enc = await encodeAac(float32, sampleRate, info.channels, onProgress);
    if (!enc.ok) return { status: enc.status };

    const asc = enc.description || makeAudioSpecificConfig(sampleRate, info.channels);
    if (!asc) return { status: "unsupported-format" };
    const n = enc.frames.length;
    const stszBody = new Uint8Array(12 + n * 4);
    const sdv = new DataView(stszBody.buffer);
    sdv.setUint32(4, 0);
    sdv.setUint32(8, n);
    enc.frames.forEach((f, i) => sdv.setUint32(12 + i * 4, f.length));
    return {
      status: "included",
      timescale: sampleRate,
      duration: n * 1024,
      entry: buildMp4aEntry(info.channels, sampleRate, buildEsds(asc, 64000 * info.channels)),
      stts: full("stts", 0, 0, u32(1), u32(n), u32(1024)),
      stsz: mk("stsz", stszBody),
      data: catList(enc.frames),
    };
  }

  // ---------------------------------------------------------------- 조립
  const IDENTITY_MATRIX = cat(u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000));

  function dinf() {
    return mk("dinf", full("dref", 0, 0, u32(1), full("url ", 0, 1)));
  }

  function mdhdBox(timescale, duration) {
    return full("mdhd", 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u16(0x55c4), u16(0));
  }

  function hdlrBox(subtype, name) {
    const nameBytes = new TextEncoder().encode(name + "\0");
    return full("hdlr", 0, 0, u32(0), cc(subtype), zeros(12), nameBytes);
  }

  function stscOneChunk(sampleCount) {
    return full("stsc", 0, 0, u32(1), u32(1), u32(sampleCount), u32(1));
  }

  function stcoBox(offset) {
    return full("stco", 0, 0, u32(1), u32(offset));
  }

  function sampleCountOfStsz(stszBox) {
    // stszBox: 완성된 stsz 상자. 본문의 sample_count(8~11번째 바이트 이후)
    const dv = new DataView(stszBox.buffer, stszBox.byteOffset, stszBox.byteLength);
    return dv.getUint32(16);
  }

  async function convertMovToMp4(arrayBuffer, options) {
    const opts = options || {};
    const progress = typeof opts.onProgress === "function" ? opts.onProgress : () => {};
    const mov = parseMov(arrayBuffer);
    const { u8, dv } = mov;

    const video = mov.tracks.find((t) => t.handler === "vide");
    if (!video) throw fail("영상 트랙을 찾지 못했어요.");
    const videoStsd = buildVideoStsd(u8, dv, video);
    const videoSamples = collectSamples(u8, video);
    if (videoSamples.count === 0) throw fail("영상 프레임이 비어 있어요.");

    progress("audio");
    const audio = await prepareAudio(mov, (p) => progress("audio", p));

    const hasAudio = audio.status === "included";
    const videoId = video.trackId || 1;
    const audioId = videoId + 1;

    // mvhd: 원본을 그대로 쓰되 next_track_ID만 고친다.
    const mvhd = new Uint8Array(raw(u8, mov.mvhd));
    new DataView(mvhd.buffer).setUint32(mvhd.length - 4, audioId + 1);
    const movieTimescale = dv.getUint8(mov.mvhd.body) === 1 ? dv.getUint32(mov.mvhd.body + 20) : dv.getUint32(mov.mvhd.body + 12);

    const ftyp = mk("ftyp", cc("isom"), u32(512), cc("isom"), cc("iso2"), cc("mp41"));
    const videoBytes = videoSamples.data.length;
    const audioBytes = hasAudio ? audio.data.length : 0;

    function buildMoov(videoOffset, audioOffset) {
      const videoStbl = mk(
        "stbl",
        videoStsd.stsd,
        raw(u8, video.stts),
        ...(video.ctts ? [raw(u8, video.ctts)] : []),
        ...(video.stss ? [raw(u8, video.stss)] : []),
        stscOneChunk(videoSamples.count),
        raw(u8, video.stszBox),
        stcoBox(videoOffset)
      );
      const videoTrak = mk(
        "trak",
        raw(u8, video.tkhd),
        ...(video.edts ? [raw(u8, video.edts)] : []),
        mk(
          "mdia",
          mdhdBox(video.timescale, video.duration),
          hdlrBox("vide", "VideoHandler"),
          mk("minf", full("vmhd", 0, 1, zeros(8)), dinf(), videoStbl)
        )
      );

      let audioTrak = new Uint8Array(0);
      if (hasAudio) {
        const audioMovieDuration = Math.ceil((audio.duration / audio.timescale) * movieTimescale);
        const tkhd = full(
          "tkhd", 0, 7,
          u32(0), u32(0), u32(audioId), u32(0), u32(audioMovieDuration),
          zeros(8), u16(0), u16(0), u16(0x0100), u16(0),
          IDENTITY_MATRIX, u32(0), u32(0)
        );
        const sampleCount = sampleCountOfStsz(audio.stsz);
        const audioStbl = mk("stbl", full("stsd", 0, 0, u32(1), audio.entry), audio.stts, stscOneChunk(sampleCount), audio.stsz, stcoBox(audioOffset));
        audioTrak = mk(
          "trak",
          tkhd,
          mk(
            "mdia",
            mdhdBox(audio.timescale, audio.duration),
            hdlrBox("soun", "SoundHandler"),
            mk("minf", full("smhd", 0, 0, u16(0), u16(0)), dinf(), audioStbl)
          )
        );
      }
      return mk("moov", mvhd, videoTrak, audioTrak);
    }

    const moovSize = buildMoov(0, 0).length; // 오프셋 값이 바뀌어도 크기는 같다
    const mdatPayloadStart = ftyp.length + moovSize + 8;
    const moov = buildMoov(mdatPayloadStart, mdatPayloadStart + videoBytes);

    const mdatSize = 8 + videoBytes + audioBytes;
    if (mdatSize >= TWO32) throw fail("동영상이 너무 커서 변환할 수 없어요.");
    const mdatHeader = cat(u32(mdatSize), cc("mdat"));

    const parts = [ftyp, moov, mdatHeader, videoSamples.data];
    if (hasAudio) parts.push(audio.data);
    const blob = typeof Blob !== "undefined" ? new Blob(parts, { type: "video/mp4" }) : null;

    return {
      blob,
      bytes: blob ? null : catList(parts),
      videoCodec: videoStsd.family,
      hasAudio,
      audioStatus: audio.status,
      durationSec: video.timescale ? video.duration / video.timescale : 0,
    };
  }

  const api = { convertMovToMp4, _internal: { parseMov, collectSamples, pcmToFloat32, makeAudioSpecificConfig } };
  root.LivePhotoMp4 = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
