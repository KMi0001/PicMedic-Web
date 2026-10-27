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
    const page = await browser.newPage();
    await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
    let count = 0;
    for (const lang of ['ko', 'en']) for (const theme of ['dark', 'light']) {
      for (const width of [320, 390, 768, 900, 901, 1024, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        for (const name of ['desktop', 'index', 'diagnose', 'live-photo', 'convert']) {
          await page.goto(`http://127.0.0.1:${server.address().port}/${name}.html`);
          await page.evaluate(([language, mode]) => {
            PicMedicI18n.applyLanguage(language);
            document.documentElement.dataset.theme = mode;
          }, [lang, theme]);
          const state = await page.locator('nav').evaluate(nav => {
            const links = nav.querySelector('.navlinks');
            const box = nav.getBoundingClientRect();
            const items = [...nav.querySelectorAll('a, button, .theme-toggle-group')].map(el => {
              const rect = el.getBoundingClientRect();
              return { isLink: el.tagName === 'A', label: el.textContent.trim(), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height, fontSize: parseFloat(getComputedStyle(el).fontSize), wrap: getComputedStyle(el).whiteSpace };
            });
            return { gap: getComputedStyle(links).columnGap, items, top: box.top, bottom: box.bottom };
          });
          const label = `${name} ${lang} ${theme} ${width}`;
          assert.equal(state.gap, width <= 900 ? '18px' : '20px', `${label}: inconsistent menu spacing`);
          for (const item of state.items) {
            assert.ok(item.left >= 0 && item.right <= width + 1, `${label}: clipped ${item.label}`);
            assert.ok(item.top >= state.top && item.bottom <= state.bottom, `${label}: item outside header`);
            if (item.isLink) assert.equal(item.wrap, 'nowrap', `${label}: menu label can break across lines`);
          }
          const links = state.items.slice(1, -2); // The logo and theme controls have their own nested boxes.
          for (let i = 0; i < links.length; i++) for (let j = i + 1; j < links.length; j++) {
            const a = links[i], b = links[j];
            assert.ok(Math.min(a.right, b.right) <= Math.max(a.left, b.left) + 1 || Math.min(a.bottom, b.bottom) <= Math.max(a.top, b.top) + 1, `${label}: overlapping menu labels`);
          }
          count++;
        }
      }
    }
    console.log(`${count} headers passed: consistent spacing, unbroken labels and contained menus in both languages and themes`);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
