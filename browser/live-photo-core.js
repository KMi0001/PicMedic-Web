/*
 * live-photo-core.js
 *
 * "라이브 포토 확인" 브라우저판 핵심 로직. 데스크톱판 core/live_photo_finder.py
 * (PicMedic 저장소)와 같은 원리 — 애플이 HEIC/JPG의 EXIF와 그 짝 MOV 양쪽에
 * 똑같이 심어두는 Content Identifier(UUID)를 raw 바이트에서 정규식으로 찾아
 * 대조한다. exiftool도, HEIC 디코딩 라이브러리(libheif)도 필요 없다 — 픽셀을
 * 그릴 게 아니라 메타데이터 바이트 몇 개만 읽으면 되기 때문이다.
 *
 * 데스크톱판(core/live_photo_finder.py)은 폴더 전체를 훑어 "사진 여러 장 <->
 * MOV 여러 개"를 짝짓다 보니 같은 UUID를 공유하는 사진이 여러 장이면(중복
 * 백업 등) 모호해질 수 있어서 1:1 검증 로직이 필요했다. 이 웹판은 사용자가
 * 사진 1장과 동영상 1개를 직접 골라 "이 둘이 짝이 맞는지"만 확인하므로 그런
 * 모호함이 없다 — 둘의 UUID 집합에 겹치는 게 하나라도 있으면 짝으로 본다.
 */

const UUID_RE = /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/g;

// MOV 파일 하나당 최대 이만큼만 읽는다 — 라이브 포토 클립은 보통 수 MB라
// 충분하고, 혹시 훨씬 큰 동영상을 골라도 무한정 느려지진 않게 막는다.
const VIDEO_READ_CAP = 30 * 1024 * 1024;

// JPG는 EXIF가 파일 앞쪽에 있으므로, 뒤에 이어지는 압축된 픽셀 데이터(사실상
// 무작위 바이트라 정규식이 낭비도 되고 아주 드물게 우연히 UUID 모양이 나올
// 수도 있음)까지 읽지 않고 앞부분만 본다.
const JPEG_HEAD_BYTES = 512 * 1024;

function findUuidsInBytes(bytes) {
  // latin1(=byte당 1글자)로 디코딩하면 임의의 바이너리를 던져도 예외 없이
  // 항상 같은 길이의 문자열이 나온다 — UTF-8 디코딩과 달리 깨진/비문자
  // 바이트가 섞여 있어도 안전하다.
  const text = new TextDecoder("latin1").decode(bytes);
  const found = text.match(UUID_RE) || [];
  return new Set(found.map((s) => s.toUpperCase()));
}

// ---------------------------------------------------------------------------
// HEIC(ISOBMFF/HEIF 컨테이너)에서 'Exif' 아이템 바이트 위치 찾기
// ---------------------------------------------------------------------------

function str4(view, offset) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

// ISOBMFF 박스 목록을 [start, end) 범위 안에서 나열한다 (size/type 헤더만
// 읽고 내용은 안 읽음 — meta 박스를 찾을 때까지 mdat 같은 큰 박스도 건너뛰기만
// 하면 되므로 빠르다).
function readBoxes(view, start, end) {
  const boxes = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = view.getUint32(offset, false);
    const type = str4(view, offset + 4);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      const hi = view.getUint32(offset + 8, false);
      const lo = view.getUint32(offset + 12, false);
      size = hi * 4294967296 + lo;
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) break;
    boxes.push({ type, start: offset, headerSize, end: offset + size });
    offset += size;
  }
  return boxes;
}

// 'iinf'(item info) 박스 안에서 각 아이템의 id/타입을 뽑는다 — 'Exif' 타입인
// 아이템의 itemID를 찾기 위함.
function parseIinf(view, box) {
  let p = box.start + box.headerSize;
  p += 4; // FullBox version(1) + flags(3)
  const version = view.getUint8(box.start + box.headerSize);
  let entryCount;
  if (version === 0) {
    entryCount = view.getUint16(p, false);
    p += 2;
  } else {
    entryCount = view.getUint32(p, false);
    p += 4;
  }

  const items = [];
  for (let i = 0; i < entryCount && p + 8 <= box.end; i++) {
    let size = view.getUint32(p, false);
    const type = str4(view, p + 4);
    let headerSize = 8;
    if (size === 1) {
      const hi = view.getUint32(p + 8, false);
      const lo = view.getUint32(p + 12, false);
      size = hi * 4294967296 + lo;
      headerSize = 16;
    }
    if (size < headerSize) break;
    if (type === "infe") {
      let q = p + headerSize;
      const infeVersion = view.getUint8(q);
      q += 4; // infe도 FullBox: version(1) + flags(3)
      if (infeVersion >= 2) {
        let itemID;
        if (infeVersion === 2) {
          itemID = view.getUint16(q, false);
          q += 2;
        } else {
          itemID = view.getUint32(q, false);
          q += 4;
        }
        q += 2; // item_protection_index
        const itemType = str4(view, q);
        items.push({ itemID, itemType });
      }
    }
    p += size;
  }
  return items;
}

// 'iloc'(item location) 박스에서 itemID별 (파일 안 실제 바이트 위치, 길이)를 뽑는다.
function parseIloc(view, box) {
  let p = box.start + box.headerSize;
  const version = view.getUint8(p);
  p += 4;
  const sizesByte1 = view.getUint8(p);
  p += 1;
  const offsetSize = sizesByte1 >> 4;
  const lengthSize = sizesByte1 & 0x0f;
  const sizesByte2 = view.getUint8(p);
  p += 1;
  const baseOffsetSize = sizesByte2 >> 4;
  const indexSize = version === 1 || version === 2 ? sizesByte2 & 0x0f : 0;

  let itemCount;
  if (version < 2) {
    itemCount = view.getUint16(p, false);
    p += 2;
  } else {
    itemCount = view.getUint32(p, false);
    p += 4;
  }

  function readUint(size) {
    let v = 0;
    for (let i = 0; i < size; i++) {
      v = v * 256 + view.getUint8(p);
      p += 1;
    }
    return v;
  }

  const items = [];
  for (let i = 0; i < itemCount; i++) {
    let itemID;
    if (version < 2) {
      itemID = view.getUint16(p, false);
      p += 2;
    } else {
      itemID = view.getUint32(p, false);
      p += 4;
    }
    if (version === 1 || version === 2) p += 2; // construction_method
    p += 2; // data_reference_index
    const baseOffset = readUint(baseOffsetSize);
    const extentCount = view.getUint16(p, false);
    p += 2;
    const extents = [];
    for (let e = 0; e < extentCount; e++) {
      if ((version === 1 || version === 2) && indexSize > 0) readUint(indexSize);
      const extentOffset = readUint(offsetSize);
      const extentLength = readUint(lengthSize);
      extents.push({ extentOffset, extentLength });
    }
    items.push({ itemID, baseOffset, extents });
  }
  return items;
}

// HEIC 파일 전체 바이트에서 'Exif' 아이템의 원본 바이트 조각만 잘라 돌려준다.
// 컨테이너 구조가 예상과 다르면(변형 파일, 파싱 실패 등) null.
function findHeicExifBytes(bytes) {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const top = readBoxes(view, 0, bytes.length);
    const meta = top.find((b) => b.type === "meta");
    if (!meta) return null;

    const metaChildren = readBoxes(view, meta.start + meta.headerSize + 4, meta.end);
    const iinfBox = metaChildren.find((b) => b.type === "iinf");
    const ilocBox = metaChildren.find((b) => b.type === "iloc");
    if (!iinfBox || !ilocBox) return null;

    const infeItems = parseIinf(view, iinfBox);
    const exifInfe = infeItems.find((it) => it.itemType === "Exif");
    if (!exifInfe) return null;

    const ilocItems = parseIloc(view, ilocBox);
    const ilocItem = ilocItems.find((it) => it.itemID === exifInfe.itemID);
    if (!ilocItem || ilocItem.extents.length === 0) return null;

    const ext = ilocItem.extents[0];
    const start = ilocItem.baseOffset + ext.extentOffset;
    const length = ext.extentLength;
    if (start < 0 || length <= 0 || start + length > bytes.length) return null;
    return bytes.slice(start, start + length);
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = new Set([".heic", ".heif", ".jpg", ".jpeg"]);
const VIDEO_EXTENSIONS = new Set([".mov", ".mp4", ".m4v"]);

function extensionOf(filename) {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

async function extractUuidsFromImage(file) {
  const ext = extensionOf(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (ext === ".heic" || ext === ".heif") {
    const exifBytes = findHeicExifBytes(bytes);
    return exifBytes ? findUuidsInBytes(exifBytes) : new Set();
  }
  const head = bytes.subarray(0, Math.min(bytes.length, JPEG_HEAD_BYTES));
  return findUuidsInBytes(head);
}

async function extractUuidsFromVideo(file) {
  const buf = await file.slice(0, VIDEO_READ_CAP).arrayBuffer();
  return findUuidsInBytes(new Uint8Array(buf));
}

// imageFile/videoFile이 진짜 라이브 포토 짝인지 확인한다 — 두 파일의 UUID
// 집합에 하나라도 겹치면 짝으로 본다.
async function checkLivePhotoPair(imageFile, videoFile) {
  const [imageUuids, videoUuids] = await Promise.all([
    extractUuidsFromImage(imageFile),
    extractUuidsFromVideo(videoFile),
  ]);
  const shared = [...imageUuids].filter((u) => videoUuids.has(u));
  return {
    matched: shared.length > 0,
    sharedUuid: shared[0] || null,
    imageHadMetadata: imageUuids.size > 0,
    videoHadMetadata: videoUuids.size > 0,
  };
}

function yieldToUI() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// 같은 UUID를 공유하는 MOV가 여러 개면(예: "동영상 다운로드"로 만든 복사본이
// 스캔 범위 안에 같이 들어온 경우), 크기가 같은 것들은 "같은 동영상의
// 복사본"으로 보고 하나만 남긴다 — 서로 다른 두 동영상이 우연히 같은 UUID와
// 같은 파일 크기를 동시에 가질 확률은 사실상 0에 가깝다(데스크톱판
// core/live_photo_finder.py::_dedupe_identical_movs와 같은 근거, 2026-09-16
// 사용자 리포트로 발견 — 내보내기 결과를 원본과 같은 폴더 아래에 둔 채로
// 다시 스캔하니 전부 매칭 안 됨).
function dedupeIdenticalMovs(candidateMovs) {
  if (candidateMovs.size <= 1) return candidateMovs;
  const bySize = new Map();
  for (const f of candidateMovs) {
    if (!bySize.has(f.size)) bySize.set(f.size, f);
  }
  return new Set(bySize.values());
}

// 폴더째로 고른 파일 목록(webkitdirectory) 안에서 라이브 포토 짝을 한꺼번에
// 찾는다 — 데스크톱판 core/live_photo_finder.py::find_live_photo_matches와
// 같은 알고리즘이다. 사진 하나의 EXIF에는 진짜 Content Identifier 말고도
// 다른 UUID(DocumentID 등)가 같이 들어있는 경우가 흔해서, 그 UUID들이
// 가리키는 MOV가 여러 개로 갈리면(어느 쪽이 진짜인지 모호하면) 매칭시키지
// 않는다 — 그렇지 않으면 사진 한 장이 사진과 무관한 동영상 여러 개와 동시에
// 매칭돼버린다(데스크톱판에서 실제로 겪은 버그, core/live_photo_finder.py
// 커밋 참고). MOV 하나도 결과에 한 번만 쓰이게 한다 — 같은 사진이 폴더
// 여러 곳에 중복 백업돼 있어도 동영상을 여러 번 내보내지 않기 위함.
async function findLivePhotoMatchesInFiles(files, onProgress) {
  const imageFiles = [];
  const movFiles = [];
  for (const f of files) {
    const ext = extensionOf(f.name);
    if (VIDEO_EXTENSIONS.has(ext)) movFiles.push(f);
    else if (IMAGE_EXTENSIONS.has(ext)) imageFiles.push(f);
  }

  const total = imageFiles.length + movFiles.length;
  let done = 0;

  const uuidToMovs = new Map();
  for (const movFile of movFiles) {
    done += 1;
    if (onProgress) onProgress(done, total, movFile.name);
    const uuids = await extractUuidsFromVideo(movFile);
    for (const u of uuids) {
      if (!uuidToMovs.has(u)) uuidToMovs.set(u, []);
      uuidToMovs.get(u).push(movFile);
    }
    if (done % 15 === 0) await yieldToUI();
  }

  const matches = [];
  const usedMovs = new Set();
  for (const imageFile of imageFiles) {
    done += 1;
    if (onProgress) onProgress(done, total, imageFile.name);
    const uuids = await extractUuidsFromImage(imageFile);
    if (uuids.size > 0) {
      let candidateMovs = new Set();
      for (const u of uuids) {
        const movs = uuidToMovs.get(u);
        if (movs) for (const m of movs) candidateMovs.add(m);
      }
      candidateMovs = dedupeIdenticalMovs(candidateMovs);
      if (candidateMovs.size === 1) {
        const movFile = [...candidateMovs][0];
        if (!usedMovs.has(movFile)) {
          usedMovs.add(movFile);
          matches.push({ imageFile, movFile });
        }
      }
    }
    if (done % 15 === 0) await yieldToUI();
  }
  return matches;
}
