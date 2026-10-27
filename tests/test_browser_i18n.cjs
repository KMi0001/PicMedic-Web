const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const root = path.resolve(__dirname, '../browser');
  const server = http.createServer((req, res) => {
    const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(`${base}/index.html`);
    await page.evaluate(() => localStorage.setItem('picmedic-lang', 'en'));
    for (const name of ['index', 'diagnose', 'convert', 'live-photo', 'faq', 'guide', 'privacy-policy', 'desktop']) {
      await page.goto(`${base}/${name}.html`);
      assert.equal(await page.getAttribute('html', 'lang'), 'en');
      const korean = await page.evaluate(() => {
        const copy = document.body.cloneNode(true);
        copy.querySelectorAll('script, style, #lang-toggle').forEach(node => node.remove());
        return copy.textContent.split('\n').filter(line => /[가-힣]/.test(line));
      });
      assert.deepEqual(korean, [], `${name}: untranslated text`);
      assert.ok(!/[가-힣]/.test(await page.title()), `${name}: title`);
      await page.click('#lang-toggle');
      assert.equal(await page.getAttribute('html', 'lang'), 'ko');
      await page.click('#lang-toggle');
      assert.equal(await page.getAttribute('html', 'lang'), 'en');
      console.log(`${name}: English, Korean, and English again passed`);
    }
    // The released desktop page must link to the published Store product in both markets.
    await page.goto(`${base}/desktop.html`);
    assert.equal(await page.locator('meta[name="robots"][content*="noindex"]').count(), 0);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://picmedic.try-cat.com/desktop.html');
    assert.equal(await page.locator('nav a[href="desktop.html"]').getAttribute('aria-current'), 'page');
    for (const [language, market] of [['en', 'US'], ['ko', 'KR']]) {
      await page.evaluate(value => PicMedicI18n.applyLanguage(value), language);
      await page.waitForFunction(value => new URL(document.querySelector('[data-store-link]').href).searchParams.get('gl') === value, market);
      const store = new URL(await page.locator('[data-store-link]').getAttribute('href'));
      assert.equal(store.hostname, 'apps.microsoft.com');
      assert.equal(store.pathname, '/store/detail/9NZLC53SV4R4');
      assert.equal(store.searchParams.get('cid'), 'DevShareMCLPCS');
      assert.equal(await page.locator('.store-button[disabled]').count(), 0);
      assert.ok(!/출시 예정|출시를 준비|Coming to Microsoft Store|approx\./i.test(await page.locator('main').innerText()));
      assert.ok(!/US\$|USD/.test(await page.locator('main').innerText()));
      if (language === 'en') assert.equal(await page.locator('.price').innerText(), 'KRW 3,900');
    }
    await page.goto(`${base}/index.html`);
    assert.equal(await page.locator('.tools a.tool[href="desktop.html"]').count(), 1);
    assert.equal(await page.locator('nav a[href="desktop.html"]').count(), 1);
    console.log('Desktop launch navigation, indexing, market-specific Store links and release copy passed');
    await page.evaluate(() => PicMedicI18n.applyLanguage('en'));
    await page.goto(`${base}/diagnose.html`);
    await page.evaluate(() => renderResult({ filename: '정상 사진.jpg', extension: '.jpg', detectedFormat: 'JPEG', severity: '정상', message: '정상적으로 열리는 사진입니다. 스크린샷, 저해상도 특징도 함께 보여요.', width: 320, height: 240, fileSize: 2000, isLowResolution: true, qualityIssues: ['블러 추정'], printSizes: [{size: '4x6', level: '권장안함'}], certification: {tier: '주의', label: '주의 필요', icon: '⚠️'} }));
    assert.equal(await page.textContent('#result-filename'), '정상 사진.jpg');
    assert.equal(await page.textContent('#result-badge'), 'Normal');
    assert.ok(!/[가-힣]/.test(await page.textContent('#result-message')));
    assert.ok(!/[가-힣]/.test(await page.textContent('#result-details')));
    await page.click('#lang-toggle');
    assert.equal(await page.textContent('#result-badge'), '정상');
    await page.click('#lang-toggle');
    assert.equal(await page.textContent('#result-badge'), 'Normal');
    await page.goto(`${base}/live-photo.html`);
    await page.evaluate(() => { renderImageOnlyResult({name: '사진.heic'}, new Set(['uuid'])); renderBulkResult([]); });
    assert.equal(await page.textContent('#result-badge'), 'Possible Live Photo');
    assert.equal(await page.textContent('#bulk-result-title'), 'Found 0 Live Photo pairs');
    await page.evaluate(() => renderFinalResult({matched: false}, {name: '사진.heic'}, {name: '동영상.mov'}));
    await page.click('#lang-toggle');
    await page.click('#lang-toggle');
    assert.equal(await page.textContent('#video-filename'), '동영상.mov');
    assert.equal(await page.textContent('#result-badge'), 'Not a match');
    for (const message of [
      "'TIFF' 형식은 이 브라우저에서 지원하지 않습니다.",
      'MP4로 변환하지 못했어요. 동영상 파일이 너무 작아요. 위의 동영상 파일 다운로드로는 원본을 그대로 받을 수 있어요.',
      'MP4로 변환해서 저장했어요. 소리도 함께 담았어요.',
    ]) {
      assert.ok(!/[가-힣]/.test(await page.evaluate(text => PicMedicI18n.english(text), message)));
    }
    for (const name of ['heic-to-jpg', 'live-photo-to-mp4', 'photo-print-resolution']) {
      await page.evaluate(() => localStorage.setItem('picmedic-lang', 'ko'));
      await page.goto(`${base}/${name}-en.html`);
      await page.click('.article .cta');
      await page.waitForLoadState('load');
      assert.equal(await page.getAttribute('html', 'lang'), 'en');
    }
    assert.deepEqual(errors, [], 'Browser script errors');
    console.log('Dynamic results, language switching, and original file names passed');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
