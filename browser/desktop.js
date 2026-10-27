/* Public desktop page: localize app screenshots and the official Microsoft Store link. */
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const screens = {
    scan: { file: '02_scan_results.png', dark: '06_dark_mode.png', ko: '검사 결과와 미리보기를 함께 보면서 필요한 작업을 선택하세요.', en: 'Review inspection results and photo previews before choosing what to do next.', altKo: '픽메딕 사진 검사 결과와 사진 미리보기 화면', altEn: 'PicMedic inspection results and photo preview' },
    duplicates: { file: '03_duplicates.png', ko: '중복 사진을 그룹별로 비교하고 남길 사진을 골라보세요.', en: 'Compare duplicate photos in groups and choose which ones to keep.', altKo: '픽메딕 중복 사진 그룹 비교 화면', altEn: 'PicMedic duplicate photo group comparison' },
    date: { file: '04_date_organization.png', ko: '촬영 날짜별로 정리될 폴더를 미리 확인하세요.', en: 'Preview how photos will be organized into folders by capture date.', altKo: '픽메딕 촬영 날짜별 폴더 정리 화면', altEn: 'PicMedic folder organization by capture date' },
    convert: { file: '05_format_conversion.png', ko: '출력 형식과 저장 방식을 선택하고 여러 사진을 한 번에 변환하세요.', en: 'Choose an output format and save options to convert multiple photos together.', altKo: '픽메딕 사진 형식 일괄 변환 설정 화면', altEn: 'PicMedic batch photo conversion settings' }
  };
  document.querySelectorAll('meta[data-content-en]').forEach(el => el.dataset.contentKo = el.content);
  function sync() {
    const en = root.lang === 'en';
    const dark = root.dataset.theme !== 'light';
    toggle.setAttribute('aria-pressed', String(dark));
    document.querySelectorAll('[data-store-link]').forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('hl', en ? 'en-US' : 'ko-KR');
      url.searchParams.set('gl', en ? 'US' : 'KR');
      link.href = url.href;
    });
    document.querySelectorAll('[data-preview]').forEach(figure => {
      const screen = screens[figure.dataset.preview];
      const preview = figure.querySelector('img');
      const src = 'assets/desktop/' + (en ? 'en-US' : 'ko-KR') + '/' + (dark && screen.dark ? screen.dark : screen.file);
      if (preview.getAttribute('src') !== src) preview.src = src;
      preview.alt = en ? screen.altEn : screen.altKo;
      figure.querySelector('a').href = src;
    });
    document.querySelectorAll('[data-label-en]').forEach(el => {
      if (!el.dataset.labelKo) el.dataset.labelKo = el.getAttribute('aria-label');
      el.setAttribute('aria-label', en ? el.dataset.labelEn : el.dataset.labelKo);
    });
    document.querySelector('nav.top').setAttribute('aria-label', en ? 'Main navigation' : '주 메뉴');
    document.querySelectorAll('meta[data-content-en]').forEach(el => el.content = en ? el.dataset.contentEn : el.dataset.contentKo);
  }
  toggle.addEventListener('click', function () {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('picmedic-theme', root.dataset.theme); } catch (_) {}
    sync();
  });
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['lang', 'data-theme'] });
  sync();
})();
