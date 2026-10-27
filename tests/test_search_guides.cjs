const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const root = path.resolve(__dirname, '../browser');
  const server = http.createServer((req, res) => {
    const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
    const base = `http://127.0.0.1:${server.address().port}`;
    // Explicit opt-in generates screenshots from the real converter, never mock UI.
    if (process.env.CAPTURE_GUIDE_IMAGES === '1') for (const lang of ['ko', 'en']) {
      await page.goto(`${base}/convert.html`);
      await page.evaluate(lang => window.PicMedicI18n.applyLanguage(lang), lang);
      const data = await page.evaluate(() => {
        const c = document.createElement('canvas'); c.width = 600; c.height = 260;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#e8ddbc'; ctx.fillRect(0, 0, 600, 260);
        ctx.fillStyle = '#d9b54a'; ctx.beginPath(); ctx.arc(460, 75, 36, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#65744e'; ctx.beginPath(); ctx.moveTo(0, 260); ctx.lineTo(190, 70); ctx.lineTo(390, 260); ctx.fill();
        ctx.fillStyle = '#909d73'; ctx.beginPath(); ctx.moveTo(210, 260); ctx.lineTo(400, 120); ctx.lineTo(600, 260); ctx.fill();
        return c.toDataURL('image/png').split(',')[1];
      });
      await page.setInputFiles('#file-input', { name: 'picmedic-example.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
      await page.waitForSelector('#result:not(.hidden)');
      await page.locator('#result-preview').evaluate(e => e.decode());
      await page.screenshot({ path: path.join(root, `assets/heic-convert-guide${lang === 'en' ? '-en' : ''}.png`) });
    }
    for (const lang of ['ko', 'en']) {
      const suffix = lang === 'en' ? '-en' : '';
      await page.goto(`${base}/photo-print-resolution${suffix}.html`);
      const result = page.locator('#print-result');
      assert.match(await result.innerText(), /1,200 × 1,800/);
      await page.selectOption('#print-size', 'a4');
      assert.match(await result.innerText(), /2,481 × 3,508/);
      await page.selectOption('#print-size', '4x6');
      await page.fill('#photo-width', '4000'); await page.fill('#photo-height', '3000');
      assert.match(await result.innerText(), /11.1%/);
      await page.fill('#photo-width', '0');
      assert.match(await result.innerText(), lang === 'ko' ? /양수/ : /positive/);
      await page.fill('#photo-width', ''); await page.fill('#photo-height', '');
      assert.match(await result.innerText(), /1,200 × 1,800/);
      await page.fill('#print-width', '20');
      assert.equal(await page.inputValue('#print-size'), 'custom');
      await page.fill('#print-height', '');
      assert.doesNotMatch(await result.innerText(), /NaN|Infinity|1,200/);
      for (const width of [320, 390, 768, 1440]) for (const slug of ['heic-to-jpg', 'photo-print-resolution', 'photo-damage-check']) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${base}/${slug}${suffix}.html`);
        await page.locator('img[loading="lazy"]').evaluateAll(images => Promise.all(images.map(i => { i.loading = 'eager'; return i.decode(); })));
        assert.equal(await page.locator('h1').count(), 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${slug}: overflow at ${width}`);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://picmedic.try-cat.com/${slug}${suffix}.html`);
        const links = await page.locator('a[href]').evaluateAll(elements => elements.map(e => e.getAttribute('href')).filter(h => !/^(https?:|mailto:|#)/.test(h)));
        for (const link of links) assert.ok(fs.existsSync(path.join(root, link.split(/[?#]/)[0])), `missing ${link}`);
        if (slug === 'photo-print-resolution' && width === 390 && lang === 'ko') await page.screenshot({ path: path.resolve(__dirname, '../print-calculator-mobile.png'), fullPage: true });
        await page.locator('#theme-toggle').click();
        assert.equal(await page.locator('#theme-toggle').getAttribute('aria-pressed'), await page.evaluate(() => document.documentElement.dataset.theme === 'dark' ? 'true' : 'false'));
      }
    }
    await page.goto(`${base}/index.html`);
    await page.evaluate(() => window.PicMedicI18n.applyLanguage('en'));
    assert.equal(await page.locator('.search-guides a').first().getAttribute('href'), 'photo-damage-check-en.html');
    assert.deepEqual(errors, []);
    console.log('24 guide layouts, bilingual links, calculator interactions and metadata passed');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
