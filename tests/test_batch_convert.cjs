const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const root = path.resolve(__dirname, '../browser');
  const server = http.createServer((req, res) => {
    const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'picmedic-batch-'));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage();
    const errors = [], outgoing = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      if (route.request().url().startsWith('http://127.0.0.1:')) return route.continue();
      if (process.env.HEIF_SCRIPT && route.request().url().includes('libheif-bundle.js')) return route.fulfill({ path: process.env.HEIF_SCRIPT, contentType: 'text/javascript' });
      outgoing.push(route.request().url()); return route.abort();
    });
    const url = `http://127.0.0.1:${server.address().port}/convert.html`;
    await page.goto(url);
    const png = Buffer.from(await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 32; c.height = 24;
      c.getContext('2d').fillRect(0, 0, 32, 24); return c.toDataURL().split(',')[1];
    }), 'base64');
    const image = name => ({ name, mimeType: 'image/png', buffer: png });
    const networkBefore = outgoing.length;
    await page.setInputFiles('#file-input', [image('사진.png'), image('사진.webp'), { name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('broken') }]);
    await page.click('#batch-start');
    await page.waitForFunction(() => document.querySelector('#batch-download').hasAttribute('href'));
    assert.match(await page.textContent('#batch-status'), /성공 2장 · 실패 1장/);
    assert.equal(await page.textContent('#batch-list li:first-child > span:first-child'), '사진.png');
    await page.click('#lang-toggle');
    assert.match(await page.textContent('#batch-status'), /2 succeeded, 1 failed/);
    assert.equal(await page.textContent('#batch-list li:first-child > span:first-child'), '사진.png');
    const downloadPromise = page.waitForEvent('download'); await page.click('#batch-download');
    const download = await downloadPromise, zipPath = path.join(temp, 'photos.zip');
    await download.saveAs(zipPath);
    execFileSync(process.env.PYTHON_EXE || 'python', ['-c', 'import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1])\nassert z.testzip() is None\nassert z.namelist()==["사진.jpg","사진 (2).jpg"]\nassert all(z.read(n).startswith(bytes.fromhex("ffd8")) for n in z.namelist())', zipPath]);
    assert.equal(outgoing.length, networkBefore, 'Conversion must not make network requests');
    console.log('Mixed success, unique UTF-8 names, ZIP CRC/extraction, language switching and no uploads passed');

    for (const format of ['png', 'webp']) {
      await page.selectOption('#batch-format', format); await page.click('#batch-start');
      await page.waitForFunction(() => document.querySelector('#batch-download').hasAttribute('href'));
      assert.match(await page.textContent('#batch-status'), /2 succeeded/);
    }
    await page.click('#batch-retry');
    await page.setInputFiles('#file-input', Array.from({ length: 21 }, (_, i) => image(`${i}.png`)));
    assert.equal(await page.isDisabled('#batch-start'), true);
    assert.match(await page.textContent('#batch-status'), /Selection too large/);
    for (const sizes of [[21 * 1024 ** 2, 1], Array(6).fill(20 * 1024 ** 2)]) {
      await page.evaluate(values => preparePhotoBatch(values.map((size, i) => ({size, name: `${i}.png`}))), sizes);
      assert.equal(await page.isDisabled('#batch-start'), true);
    }
    await page.click('#batch-retry');
    await page.setInputFiles('#file-input', ['bad1.jpg', 'bad2.jpg'].map(name => ({name, mimeType: 'image/jpeg', buffer: Buffer.from('bad')})));
    await page.click('#batch-start');
    await page.waitForFunction(() => !document.querySelector('#batch-start').disabled);
    assert.match(await page.textContent('#batch-status'), /No photos could be converted/);
    assert.equal(await page.getAttribute('#batch-download', 'href'), null);
    await page.click('#batch-retry');
    await page.setInputFiles('#file-input', [image('one.png'), image('two.png')]);
    await page.evaluate(() => {
      const decode = decodeToCanvas;
      window.originalDecode = decode;
      decodeToCanvas = async (...args) => { await new Promise(r => setTimeout(r, 250)); return decode(...args); };
    });
    await page.click('#batch-start'); await page.click('#batch-cancel');
    await page.waitForFunction(() => !document.querySelector('#batch-start').disabled);
    assert.match(await page.textContent('#batch-status'), /Cancelled/);
    assert.equal(await page.getAttribute('#batch-download', 'href'), null);
    await page.evaluate(() => { decodeToCanvas = originalDecode; });
    await page.click('#batch-start');
    await page.waitForFunction(() => document.querySelector('#batch-download').hasAttribute('href'));
    console.log('PNG/WebP, selection cap, cancellation and retry passed');
    await page.click('#batch-retry');
    await page.setInputFiles('#file-input', image('single.png'));
    await page.waitForFunction(() => !document.querySelector('#result').classList.contains('hidden'));
    const singlePromise = page.waitForEvent('download'); await page.click('#convert-btn');
    assert.equal((await singlePromise).suggestedFilename(), 'single.jpg');
    assert.equal(await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 10; c.height = 10;
      const b = await new Promise(r => c.toBlob(r));
      try { await decodeToCanvas(new File([b], 'large.png'), 'PNG', 99); return false; }
      catch (e) { return e.message === 'pixel-limit'; }
    }), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('#retry-btn');
    await page.setInputFiles('#file-input', [image('long-name-'.repeat(20) + '.png'), image('second.png')]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: path.join(temp, 'mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Single-photo regression, pixel cap and mobile overflow passed');
    console.log('Preview:', path.join(temp, 'mobile.png'));
    if (process.env.HEIC_FIXTURE) {
      await page.click('#batch-retry');
      const heic = fs.readFileSync(process.env.HEIC_FIXTURE);
      await page.setInputFiles('#file-input', Array.from({length: 5}, (_, i) => ({name: `sample-${i}.heic`, mimeType: 'image/heic', buffer: heic})));
      await page.selectOption('#batch-format', 'jpeg');
      await page.click('#batch-start');
      await page.waitForFunction(() => document.querySelector('#batch-download').hasAttribute('href'), { timeout: 60000 });
      assert.match(await page.textContent('#batch-status'), /5 succeeded, 0 failed/);
      const heap = await page.evaluate(async () => (await getLibheifModule()).HEAPU8.length);
      await page.click('#batch-start');
      await page.waitForFunction(() => document.querySelector('#batch-download').hasAttribute('href'), { timeout: 60000 });
      assert.match(await page.textContent('#batch-status'), /5 succeeded, 0 failed/);
      assert.equal(await page.evaluate(async () => (await getLibheifModule()).HEAPU8.length), heap);
      assert.deepEqual(errors, []);
      console.log('Actual HEIC: two batches of 5, image/context cleanup and stable WASM heap passed');
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
