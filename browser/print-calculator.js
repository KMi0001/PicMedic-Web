(function () {
  'use strict';
  // Pixel density is PPI; DPI refers to printer dots. Round requirements up.
  function calculate(widthCm, heightCm, ppi, photoWidth, photoHeight) {
    if (![widthCm, heightCm, ppi].every(n => Number.isFinite(n) && n > 0)) return null;
    const inchesW = widthCm / 2.54, inchesH = heightCm / 2.54;
    const result = { width: Math.ceil(inchesW * ppi - 1e-9), height: Math.ceil(inchesH * ppi - 1e-9) };
    if ([photoWidth, photoHeight].every(n => Number.isSafeInteger(n) && n > 0)) {
      // Automatically rotate the photo to minimize cropping.
      const direct = Math.min(photoWidth / inchesW, photoHeight / inchesH);
      const rotated = Math.min(photoHeight / inchesW, photoWidth / inchesH);
      result.ppi = Math.max(direct, rotated);
      result.rotated = rotated > direct;
      result.crop = Math.max(0, Math.min(100, (1 - inchesW * inchesH * result.ppi ** 2 / (photoWidth * photoHeight)) * 100));
      result.meetsTarget = result.ppi >= ppi - 1e-9;
    }
    return result;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { calculate };
  if (typeof document === 'undefined') return;
  const form = document.getElementById('print-calculator');
  if (!form) return;
  const en = document.documentElement.lang === 'en';
  const field = id => document.getElementById(id);
  const presets = { '3x5': [7.62, 12.7], '4x6': [10.16, 15.24], '5x7': [12.7, 17.78], '8x10': [20.32, 25.4], a4: [21, 29.7] };
  function update() {
    const output = field('print-result');
    const photoW = field('photo-width').value, photoH = field('photo-height').value;
    if (!form.checkValidity() || ((photoW !== '' || photoH !== '') && (photoW === '' || photoH === ''))) {
      output.textContent = en ? 'Enter positive values within the displayed limits. For your photo, enter both pixel dimensions or leave both blank.' : '표시된 범위 안의 양수를 입력하세요. 내 사진의 가로·세로 픽셀은 둘 다 입력하거나 둘 다 비워두세요.';
      return;
    }
    const r = calculate(+field('print-width').value, +field('print-height').value, +field('print-ppi').value, +photoW, +photoH);
    if (!r) return;
    output.replaceChildren();
    const add = (text, strong) => { const p = document.createElement('p'); const node = strong ? document.createElement('strong') : p; node.textContent = text; if (strong) p.append(node); output.append(p); };
    add(en ? `Required: ${r.width.toLocaleString('en-US')} × ${r.height.toLocaleString('en-US')} pixels` : `필요 픽셀: ${r.width.toLocaleString('ko-KR')} × ${r.height.toLocaleString('ko-KR')} px`, true);
    if (r.ppi !== undefined) {
      add(en ? `Your photo: ${r.ppi.toFixed(1)} PPI — ${r.meetsTarget ? 'meets' : 'below'} your target density.` : `내 사진: ${r.ppi.toFixed(1)} PPI — 목표 해상도 ${r.meetsTarget ? '충족' : '미달'}`);
      add(en ? `Fill-to-fit cropping: about ${r.crop.toFixed(1)}% of the photo area${r.rotated ? ' (photo rotated 90°)' : ''}.` : `여백 없이 채우면 사진 면적의 약 ${r.crop.toFixed(1)}%가 잘려요${r.rotated ? ' (사진을 90° 회전한 기준)' : ''}.`);
      add(en ? 'To keep the whole photo, choose fit with borders. Confirm the crop in your print shop preview.' : '전체 사진을 남기려면 여백 포함 인화를 선택하세요. 실제 잘리는 위치는 인화 업체의 미리보기에서 확인하세요.');
    } else {
      add(en ? 'Optionally enter your photo dimensions below to check density and cropping.' : '아래에 내 사진의 픽셀 수를 입력하면 해상도와 잘림 비율도 확인할 수 있어요.');
    }
  }
  field('print-size').addEventListener('change', () => {
    const size = presets[field('print-size').value];
    if (size) { field('print-width').value = size[0]; field('print-height').value = size[1]; }
    update();
  });
  for (const id of ['print-width', 'print-height']) field(id).addEventListener('input', () => { field('print-size').value = 'custom'; });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', event => { event.preventDefault(); update(); });
  update();
})();
