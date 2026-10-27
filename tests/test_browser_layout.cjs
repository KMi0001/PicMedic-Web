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
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    let count = 0;
    for (const lang of ['ko', 'en']) for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500 });
      await context.addInitScript(value => localStorage.setItem('picmedic-lang', value), lang);
      const page = await context.newPage();
      const names = ['index', 'diagnose', 'convert', 'live-photo', 'faq', 'guide', 'privacy-policy', 'desktop', ...['heic-to-jpg', 'live-photo-to-mp4', 'photo-print-resolution', 'png-webp-to-jpg'].map(n => n + (lang === 'en' ? '-en' : ''))];
      for (const name of names) {
        await page.goto(`http://127.0.0.1:${server.address().port}/${name}.html`);
        await page.evaluate(() => document.fonts.ready);
        // Long product pages defer screenshots below the fold until scrolling.
        await page.locator('img[loading="lazy"]').evaluateAll(images => Promise.all(images.map(image => {
          image.loading = 'eager';
          return image.decode();
        })));
        const state = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          viewport: document.querySelectorAll('meta[name="viewport"]').length,
          outside: [...document.querySelectorAll('nav a, nav button')].filter(e => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 1; }).map(e => e.textContent.trim()),
          broken: [...document.images].filter(e => e.getAttribute('src') && e.getClientRects().length && (!e.complete || !e.naturalWidth)).map(e => e.src),
          footer: getComputedStyle(document.querySelector('.site-footer')).position,
          description: document.querySelector('meta[name="description"]').content,
        }));
        const label = `${name} ${lang} ${width}`;
        assert.equal(state.width, width, label);
        assert.equal(state.viewport, 1, label);
        assert.ok(state.scroll <= width + 1, `${label}: horizontal overflow`);
        assert.deepEqual(state.outside, [], `${label}: clipped navigation`);
        assert.deepEqual(state.broken, [], `${label}: broken image`);
        assert.notEqual(state.footer, 'fixed', `${label}: footer covers content`);
        if (lang === 'en') assert.ok(!/[가-힣]/.test(state.description), `${label}: Korean metadata`);
        const links = await page.locator('a[href]').evaluateAll(elements => elements.map(e => e.getAttribute('href')).filter(h => h && !/^(https?:|mailto:|#)/.test(h)));
        for (const link of links) assert.ok(fs.existsSync(path.join(root, link.split(/[?#]/)[0])), `${label}: missing ${link}`);
        count++;
      }
      // Exercise real image previews, including extreme aspect ratios.
      for (const [w, h] of [[1200, 300], [300, 1200], [600, 600]]) {
        await page.goto(`http://127.0.0.1:${server.address().port}/convert.html`);
        const data = await page.evaluate(([w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.fillStyle = '#d9b54a'; ctx.fillRect(0, 0, w, h); return c.toDataURL('image/png').split(',')[1]; }, [w, h]);
        await page.setInputFiles('#file-input', { name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
        await page.waitForSelector('#result:not(.hidden)');
        const preview = await page.locator('#result-preview').evaluate(async e => { await e.decode(); return { ratio: e.naturalWidth / e.naturalHeight, fit: getComputedStyle(e).objectFit }; });
        assert.ok(Math.abs(preview.ratio - w / h) < 0.02);
        assert.equal(preview.fit, 'contain');
      }
      await context.close();
    }
    console.log(`${count} Korean/English page layouts, internal links, metadata and 24 image previews passed`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exit(1); });
