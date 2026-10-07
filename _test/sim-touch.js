/* 02-05 plane-mass simulation: drag by touch, inside a screen that starts hidden.
 *
 * MOE 06.10 (AR, "המשקל של הפריטים על המטוס לא עובד, לא ניתן לאפס ולא ניתן לשקול"):
 * on a tablet the browser took the touch for scrolling and cancelled the pointer after
 * the first move, so no card ever reached the plane. These checks drive real touch
 * events (CDP Input.dispatchTouchEvent on an emulated iPad), not synthetic pointers.
 *
 *   NODE_PATH=/tmp/lomda-test/node_modules node _test/sim-touch.js
 *
 * Needs puppeteer-core and a local Chrome (CHROME env var, or the default Windows path).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const COMP = fs.readdirSync(ROOT).find(d => /-02-05$/.test(d));
const SIM = path.join(ROOT, COMP, 'plane-mass-simulation');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }

// ── static checks ──
const compHtml = fs.readFileSync(path.join(ROOT, COMP, 'index.html'), 'utf8');
const simHtml = fs.readFileSync(path.join(SIM, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(SIM, 'style.css'), 'utf8');
const AR = /<html[^>]*lang="ar"/.test(simHtml);
console.log('static (' + (AR ? 'ar' : 'he') + ')');
ok(!/אל המאזניים|إلى الميزان/.test(compHtml), 's2 instruction no longer says drag "to the scale" (drops count on the plane only)');
ok(AR ? /سحب العناصر الملائمة إلى الطائرة/.test(compHtml) : /גרירת האלמנטים המתאימים אל המטוס/.test(compHtml), 's2 instruction says drag "to the plane"');
const iframes = compHtml.match(/<iframe[^>]*plane-mass-simulation[^>]*>/g) || [];
ok(iframes.length === 3 && iframes.every(s => /index\.html\?v=\d+/.test(s)), 'all 3 sim iframes carry ?v=');
ok(/script\.js\?v=\d+/.test(simHtml) && /style\.css\?v=\d+/.test(simHtml), 'sim script/style carry ?v=');
ok(/\.card\[data-item\][^{]*\{[^}]*touch-action:\s*none/.test(css), '.card has touch-action: none');
if (AR) {
  // Hebrew "איפוס" was baked into the PNG; the Arabic copy must not be the Hebrew bytes.
  const HE_MD5 = '61abe55dec3a3d6f32929553b13a71d1';
  const md5 = require('crypto').createHash('md5').update(fs.readFileSync(path.join(SIM, 'assets/images/restart-button.png'))).digest('hex');
  ok(md5 !== HE_MD5, 'AR reset button image is not the Hebrew one (' + md5 + ')');
}

// ── browser checks ──
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__host.html') {
    // the component's pattern: the sim iframe sits in a screen that starts display:none
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`<!doctype html><body style="margin:0"><div id="scr" style="display:none;width:700px;height:900px">
      <iframe id="f" src="/${COMP}/plane-mass-simulation/index.html" style="width:100%;height:100%;border:0"></iframe></div></body>`);
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function touchDrag(page, frame, item, opts = {}) {
  // geometry in the top page's coordinates (frame offset added when in an iframe)
  const g = await frame.evaluate(item => {
    const c = document.querySelector('.card[data-item="' + item + '"]').getBoundingClientRect();
    const p = document.querySelector('.plane-image').getBoundingClientRect();
    return { sx: c.left + c.width / 2, sy: c.top + c.height / 2, tx: p.left + p.width / 2, ty: p.top + p.height / 2 };
  }, item);
  let ox = 0, oy = 0;
  if (frame !== page.mainFrame()) {
    const r = await page.evaluate(() => { const b = document.getElementById('f').getBoundingClientRect(); return { x: b.left, y: b.top }; });
    ox = r.x; oy = r.y;
  }
  const cdp = await page.target().createCDPSession();
  const t = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x: x + ox, y: y + oy }] });
  await t('touchStart', g.sx, g.sy);
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await t('touchMove', g.sx + (g.tx - g.sx) * i / steps, g.sy + (g.ty - g.sy) * i / steps);
    await sleep(25);
  }
  await t(opts.cancel ? 'touchCancel' : 'touchEnd', g.tx, g.ty);
  await sleep(500);
  await cdp.detach();
}

const read = frame => frame.evaluate(() => ({
  state: Object.assign({}, state),
  weight: document.getElementById('weight-value').textContent.trim(),
  scale: currentScale,
  styles: [...document.querySelectorAll('.card[data-item]')].map(c => c.style.transform || ''),
}));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const IPAD = { viewport: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
  try {
    console.log('touch, standalone sim (emulated iPad)');
    let page = await browser.newPage();
    await page.emulate(IPAD);
    await page.goto(base + '/' + COMP + '/plane-mass-simulation/index.html', { waitUntil: 'networkidle0' });
    let f = page.mainFrame();
    await touchDrag(page, f, 'luggage');
    let s = await read(f);
    ok(s.state.luggage === true && /^47\b/.test(s.weight), 'touch drag of luggage onto the plane loads it (41 -> 47): ' + s.weight);
    await touchDrag(page, f, 'passengers');
    s = await read(f);
    ok(s.state.passengers === true && /^59\b/.test(s.weight), 'second touch drag (passengers) adds up (-> 59): ' + s.weight);
    await f.evaluate(() => document.getElementById('reset-btn').click());
    s = await read(f);
    ok(!s.state.luggage && !s.state.passengers && /^41\b/.test(s.weight), 'reset empties the plane (-> 41)');
    await touchDrag(page, f, 'fuel', { cancel: true });
    s = await read(f);
    ok(!s.state.fuel && /^41\b/.test(s.weight), 'a cancelled touch loads nothing');
    ok(s.styles.every(t => t === '' || /translate\(0(px)?, 0(px)?\)/.test(t)), 'a cancelled touch sends the card back to its slot');
    await touchDrag(page, f, 'fuel');
    s = await read(f);
    ok(s.state.fuel === true && /^61\b/.test(s.weight), 'after a cancel the same card still drags (fuel -> 61): ' + s.weight);
    await page.close();

    console.log('touch, sim in a screen that starts hidden (the component\'s layout)');
    page = await browser.newPage();
    await page.emulate(IPAD);
    await page.goto(base + '/__host.html', { waitUntil: 'networkidle0' });
    f = page.frames().find(x => /plane-mass-simulation/.test(x.url()));
    s = await read(f);
    ok(s.scale > 0, 'while hidden the scale never collapses to 0 (' + s.scale + ')');
    await page.evaluate(() => { document.getElementById('scr').style.display = 'block'; });
    await sleep(400);
    s = await read(f);
    ok(s.scale > 0.5 && s.scale < 2, 'shown: the sim re-measures (' + s.scale.toFixed(3) + ')');
    await touchDrag(page, f, 'luggage');
    s = await read(f);
    ok(s.state.luggage === true && /^47\b/.test(s.weight), 'shown: touch drag loads luggage (-> 47): ' + s.weight);
    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n=== sim touch: ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(2); });
