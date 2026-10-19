/* Batch controller: one decoded image at a time; no photo network requests. */
(function () {
  const $ = id => document.getElementById(id);
  const limits = { count: 20, file: 20 * 1024 ** 2, input: 100 * 1024 ** 2, output: 100 * 1024 ** 2, pixels: 24000000 };
  let files = [], running = false, cancelled = false, zipUrl = null;
  const text = (el, ko, en) => {
    el.setAttribute('data-ko', ko); el.setAttribute('data-en', en);
    el.textContent = document.documentElement.lang === 'en' ? en : ko;
  };
  function releaseZip() {
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    zipUrl = null;
    $('batch-download').removeAttribute('href');
    $('batch-download').classList.add('hidden');
  }
  window.preparePhotoBatch = function (selection) {
    if (running) return;
    releaseZip();
    files = [];
    $('batch-list').replaceChildren(); $('batch-progress').value = 0;
    $('batch-start').disabled = true;
    showSection($('batch'));
    const selected = Array.from(selection);
    if (selected.length > limits.count || selected.some(f => f.size > limits.file) || selected.reduce((s, f) => s + f.size, 0) > limits.input) {
      text($('batch-status'), '선택 한도를 초과했어요. 최대 20장, 파일당 20MB, 전체 100MB 이내로 다시 선택해주세요.', 'Selection too large. Choose up to 20 photos, 20 MB per file and 100 MB in total.');
      return;
    }
    files = selected;
    text($('batch-status'), `${files.length}장 선택됨. 출력 형식을 고르고 변환을 시작하세요.`, `${files.length} photos selected. Choose an output format and start.`);
    for (const file of files) {
      const row = document.createElement('li'), name = document.createElement('span'), state = document.createElement('span');
      name.textContent = file.name; state.className = 'batch-state';
      text(state, '대기', 'Waiting'); row.append(name, state); $('batch-list').append(row);
    }
    $('batch-start').disabled = files.length === 0;
  };
  function lock(value) {
    running = value;
    for (const id of ['batch-start', 'batch-retry', 'batch-format', 'batch-quality']) $(id).disabled = value;
    $('batch-cancel').classList.toggle('hidden', !value);
  }
  $('batch-format').addEventListener('change', () => $('batch-quality-wrap').classList.toggle('hidden', $('batch-format').value === 'png'));
  $('batch-cancel').addEventListener('click', () => {
    cancelled = true;
    text($('batch-status'), '취소 중… 현재 사진 처리가 끝나면 멈춥니다.', 'Cancelling… stopping after the current photo finishes.');
  });
  $('batch-retry').addEventListener('click', () => {
    files = []; releaseZip(); $('batch-list').replaceChildren(); showSection(pickerSection);
  });
  $('batch-start').addEventListener('click', async () => {
    if (running || !files.length) return;
    releaseZip(); lock(true); cancelled = false;
    const format = $('batch-format').value, mime = CONVERT_MIME[format];
    const quality = Number($('batch-quality').value) / 100;
    const entries = [], used = new Set(); let bytes = 0, failed = 0, processed = 0;
    const states = Array.from($('batch-list').querySelectorAll('.batch-state'));
    states.forEach(state => text(state, '대기', 'Waiting'));
    $('batch-progress').max = files.length; $('batch-progress').value = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        if (cancelled) break;
        text($('batch-status'), `${i + 1} / ${files.length}장 변환 중`, `Converting ${i + 1} / ${files.length}`);
        text(states[i], '변환 중', 'Converting');
        let canvas;
        try {
          const detected = detectFormat(await readHeadBytes(files[i]));
          if (!BROWSER_DECODABLE_FORMATS.has(detected)) throw new Error('unsupported');
          canvas = await decodeToCanvas(files[i], detected, limits.pixels);
          if (cancelled) break;
          const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('encode')), mime, quality));
          if (cancelled) break;
          if (blob.type !== mime) throw new Error('unsupported');
          if (bytes + blob.size > limits.output) throw new Error('output-limit');
          let base = files[i].name.replace(/\.[^./\\]+$/, '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+/, '').slice(0, 100) || 'photo';
          let name = `${base}.${CONVERT_EXT[format]}`, suffix = 2;
          while (used.has(name.toLowerCase())) name = `${base} (${suffix++}).${CONVERT_EXT[format]}`;
          used.add(name.toLowerCase()); entries.push({ name, blob }); bytes += blob.size;
          text(states[i], '성공', 'Done');
        } catch (err) {
          failed++;
          if (err.message === 'pixel-limit') text(states[i], '실패: 2,400만 픽셀 초과', 'Failed: exceeds 24 megapixels');
          else if (err.message === 'output-limit') text(states[i], '실패: 결과 합계 100MB 초과', 'Failed: total output exceeds 100 MB');
          else text(states[i], '실패: 지원하지 않거나 읽을 수 없는 사진', 'Failed: unsupported or unreadable photo');
        } finally {
          if (canvas) { canvas.width = 0; canvas.height = 0; }
        }
        processed = i + 1; $('batch-progress').value = processed;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (cancelled) {
        for (let i = processed; i < states.length; i++) text(states[i], '취소됨', 'Cancelled');
        text($('batch-status'), '취소했어요. 저장하지 않은 결과는 해제했습니다. 다시 변환할 수 있어요.', 'Cancelled. Unsaved results were released. You can start again.');
      } else if (entries.length) {
        text($('batch-status'), 'ZIP 파일 준비 중…', 'Preparing ZIP…');
        const zip = await createPhotoZip(entries, () => cancelled);
        if (cancelled) throw new Error('cancelled');
        zipUrl = URL.createObjectURL(zip);
        $('batch-download').href = zipUrl; $('batch-download').classList.remove('hidden');
        text($('batch-status'), `완료: 성공 ${entries.length}장 · 실패 ${failed}장. ZIP 다운로드를 눌러 저장하세요.`, `Finished: ${entries.length} succeeded, ${failed} failed. Download the ZIP to save.`);
      } else text($('batch-status'), '변환 가능한 사진이 없어요. 파일별 실패 안내를 확인해주세요.', 'No photos could be converted. Check the errors for each file.');
    } catch (_) {
      text($('batch-status'), cancelled ? '취소했어요. 다시 변환할 수 있어요.' : 'ZIP을 만들지 못했어요. 사진 수를 줄여 다시 시도해주세요.', cancelled ? 'Cancelled. You can start again.' : 'Could not create the ZIP. Try fewer photos.');
    } finally {
      entries.length = 0; lock(false);
    }
  });
  window.addEventListener('pagehide', releaseZip);
})();
