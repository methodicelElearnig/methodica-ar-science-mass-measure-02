/* Headless verification of the report layer against the REAL index.html +
   script.js + unit-js/*.js of all six components.

   Scripts are executed by injecting real <script> elements, NOT via eval():
   every one of these files starts with 'use strict', and declarations inside a
   strict-mode eval stay in the eval's own scope instead of becoming globals.
   Real script tags put top-level function/var on window, which is what the
   production page relies on.  `let`/`const` at top level (currentScreen,
   TOTAL_SCREENS) never reach window even in a real page, so those are read
   through an injected expression script.

   Stubs only what the browser/CDN would provide: fetch. No ?slxapi is given —
   this doubles as the regression-gate run. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE = process.argv[2] || path.join(__dirname, "..");
const COMPONENTS = ['01', '02', '03', '04', '05', '06'];

/* Which screen each component is linked INTO via #screen=N by the "חזרה"
   button of the next component, per the cross-part navigation sites.
   Component 06 is absent on purpose: nothing links into it with a hash. */
const INBOUND_HASH = { '01': 19, '02': 8, '03': 1, '04': 1, '05': 3 };

let pass = 0, fail = 0;
const failures = [];
function ok(c, name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(c + ': ' + name + (extra ? '  -> ' + extra : '')); }
}

function makeRunner(w) {
  // Execute a snippet as a real classic script, in global scope.
  const exec = (code) => {
    const s = w.document.createElement('script');
    s.textContent = code;
    w.document.body.appendChild(s);
    s.remove();
  };
  // Evaluate an expression in global scope and bring the value back.
  const val = (expr) => {
    exec('window.__V = (function(){ try { return (' + expr + '); } catch (e) { return "__THREW__" + e.message; } })();');
    return w.__V;
  };
  return { exec, val };
}

async function run(c) {
  const dir = path.join(BASE, 'Methodica-science-mass-measure-02-' + c);
  const file = path.join(dir, 'index.html');
  const loadErrors = [];
  const consoleErrors = [];

  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {
    url: 'http://localhost:8777/Methodica-science-mass-measure-02-' + c + '/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  const { exec, val } = makeRunner(w);

  w.addEventListener('error', e => loadErrors.push(String(e.error || e.message)));
  w.console.error = function (...a) { consoleErrors.push(a.map(String).join(' ')); };
  w.console.warn = function () {};
  w.console.log = function () {};

  const sent = [];
  w.fetch = function (url, opts) { sent.push({ url, opts }); return Promise.resolve({ ok: true }); };

  /* jsdom does not implement HTMLMediaElement load()/play(); play() returns
     undefined, so the project's `video.play().catch(...)` throws. That is a
     jsdom gap, not a defect in the lomda — stub them to the browser contract
     so the harness exercises the real code path. */
  w.HTMLMediaElement.prototype.load = function () {};
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};

  // Load the page's own script tags, in document order, from disk.
  const tags = [...w.document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
  for (const src of tags) {
    const p = path.resolve(dir, src.split('?')[0]);
    if (!fs.existsSync(p)) { loadErrors.push('missing script file: ' + src); continue; }
    const before = consoleErrors.length;
    try { exec(fs.readFileSync(p, 'utf8')); }
    catch (e) { loadErrors.push(src + ': ' + e.message); }
    // jsdom reports script-tag exceptions via the error event, collected above.
    void before;
  }

  const d = w.document;

  /* The CDN library never loads off-platform, so getXAPIParameters never
     populates window.METADATA. Stand it in from the real file: the report body
     reads the unit and component slug from it, and with a SHARED response sheet
     an empty slug means an unattributable row. (REPORT-ISSUE.md §6 documents
     the degraded behaviour: missing METADATA falls back to {} and posts empty
     slugs — the report still arrives, just without location context.) */
  w.METADATA = JSON.parse(fs.readFileSync(
    path.join(BASE, 'metadata', 'methodica-science-mass-measure-02-' + c + '.json'),
    'utf8').replace(/^﻿/, ''));

  // ── 1. Page loaded clean ────────────────────────────────────────────
  ok(c, 'no load errors', loadErrors.length === 0, loadErrors.join(' | '));
  ok(c, 'all 5 unit-js tags + script.js + 90-boot present', tags.length === 7, 'tags=' + tags.length);

  // ── 2. Shared layer reachable ───────────────────────────────────────
  for (const fn of ['shortId', 'initReportModal', 'bootXAPI', 'sendCompletedOnce',
                    'xapiOnScreen', 'xapiFinishItems', 'xapiQ', 'submitReport',
                    'initLedgerResetHatch', 'currentPartSlug']) {
    ok(c, fn + ' defined', val('typeof ' + fn) === 'function', 'typeof=' + val('typeof ' + fn));
  }

  /* ── 3. REGRESSION GATE ─────────────────────────────────────────────
     The guarantee is NOT that XAPI_USING_G stays false — it is legitimately
     true, because it only records that the selected library letter supports
     item-level statements. The guarantee is that no statement can actually
     flow: every send path is additionally gated on sendStatement720 being a
     function, and that only exists once the CDN library has loaded, which
     needs a real ?slxapi launch. So the lomda must behave exactly as it did
     before instrumentation. */
  ok(c, 'sendStatement720 absent (CDN never loaded off-platform)',
    val('typeof sendStatement720') === 'undefined');
  ok(c, 'xapiOnScreen is a silent no-op with no library',
    val('(function(){ xapiOnScreen(0); xapiOnScreen(1); return "no-throw"; })()') === 'no-throw');
  ok(c, 'xapiFinishItems is a silent no-op with no library',
    val('(function(){ xapiFinishItems(); return "no-throw"; })()') === 'no-throw');
  ok(c, 'xapiAnswered does not throw and still records the score',
    val("(function(){ xapiAnswered('001','q1',true,true,'x'); return XAPI_Q_RESULTS['001/q1']; })()") === true);
  ok(c, 'xapiRequestedHint is a silent no-op with no library',
    val("(function(){ xapiRequestedHint('001','q1'); return 'no-throw'; })()") === 'no-throw');
  ok(c, 'no statement reached the network', sent.length === 0, 'sent=' + sent.length);

  // ── 4. Modal markup ─────────────────────────────────────────────────
  for (const id of ['report-modal', 'report-thanks-modal', 'report-confirm-modal']) {
    const el = d.getElementById(id);
    ok(c, id + ' exists', !!el);
    ok(c, id + ' starts hidden', el && el.hasAttribute('hidden'));
  }
  for (const id of ['report-type', 'report-text', 'report-text-error',
                    'report-char-count', 'report-type-error', 'report-type-wrapper']) {
    ok(c, id + ' exists', !!d.getElementById(id));
  }
  ok(c, '3 select options', d.querySelectorAll('.report-select-option').length === 3);
  const app = d.getElementById('app');
  ok(c, 'modal inside #app', app && app.contains(d.getElementById('report-modal')));
  ok(c, 'modal outside every .screen', d.querySelectorAll('.screen #report-modal').length === 0);
  ok(c, 'shared CSS linked', !!d.querySelector('link[href*="unit-css/25-report.css"]'));

  // ── 5. Flag-button delegation across EVERY instance ─────────────────
  const flags = [...d.querySelectorAll('.flag-btn')];
  ok(c, 'flag-btn instances found', flags.length >= 1, 'count=' + flags.length);
  let openedFromAll = true, whichFailed = -1;
  flags.forEach((btn, i) => {
    exec('forceCloseReportModal()');
    // click the innermost child, to prove closest() delegation rather than a direct handler
    const target = btn.querySelector('.flag-btn-label') || btn;
    target.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    if (d.getElementById('report-modal').hasAttribute('hidden')) {
      openedFromAll = false; if (whichFailed < 0) whichFailed = i;
    }
  });
  ok(c, 'all ' + flags.length + ' flag-btn instances open the modal',
    openedFromAll, 'first failing index=' + whichFailed);

  // ── 6. Validation gating ────────────────────────────────────────────
  exec('openReportModal()');
  const submit = d.querySelector('#report-modal .report-submit-btn');
  ok(c, 'submit starts disabled', submit.disabled);
  d.getElementById('report-type').value = 'technical';
  exec('reportCheckSubmit()');
  ok(c, 'submit still disabled with type only', submit.disabled);
  d.getElementById('report-text').value = 'הכפתור לא מגיב';
  exec('reportCheckSubmit()');
  ok(c, 'submit enabled once both filled', !submit.disabled);

  // ── 7. Custom select writes the hidden input and the visible label ──
  exec('resetReportForm()');
  ok(c, 'reset clears the hidden input', d.getElementById('report-type').value === '');
  d.querySelector('.report-select-option[data-value="unclear"]')
    .dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok(c, 'option click sets hidden input', d.getElementById('report-type').value === 'unclear');
  ok(c, 'option click sets visible Hebrew label',
    d.querySelector('.report-select-value').textContent === 'משהו לא ברור לי',
    d.querySelector('.report-select-value').textContent);

  // ── 8. Abandon-confirm is a distinct dialog from the thank-you ──────
  d.getElementById('report-text').value = 'טקסט חלקי';
  exec('tryCloseReportModal()');
  ok(c, 'abandon-confirm shown when input is unsent',
    !d.getElementById('report-confirm-modal').hasAttribute('hidden'));
  ok(c, 'form hidden behind abandon-confirm',
    d.getElementById('report-modal').hasAttribute('hidden'));
  ok(c, 'thank-you NOT shown (different dialog)',
    d.getElementById('report-thanks-modal').hasAttribute('hidden'));
  exec('backToReportForm()');
  ok(c, '"אני רוצה לדווח" returns to the form',
    !d.getElementById('report-modal').hasAttribute('hidden'));
  exec('forceCloseReportModal()');
  ok(c, 'clean close with no input leaves everything hidden',
    d.getElementById('report-modal').hasAttribute('hidden') &&
    d.getElementById('report-confirm-modal').hasAttribute('hidden'));

  /* ── 9. submitReport actually posts, to the shared 720 form ──────────
     The endpoint is deliberately shared across all 720 units (see
     unit-js/25-report.js). What makes that safe is that every submission
     carries the unit and component slug, so the shared response sheet stays
     attributable. These assertions exist to prove those two fields are really
     populated — a shared form with an empty unit slug would be exactly the
     silent mis-filing REPORT-ISSUE.md §3 warns about. */
  exec('openReportModal()');
  d.getElementById('report-type').value = 'other';
  d.getElementById('report-text').value = 'משהו אחר';
  consoleErrors.length = 0;
  sent.length = 0;
  exec('submitReport()');
  ok(c, 'the report is POSTed', sent.length === 1, 'sent=' + sent.length);
  const posted = sent[0];
  ok(c, 'posted to the shared 720 form /formResponse endpoint',
    posted && /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/formResponse$/.test(posted.url),
    posted && posted.url);
  ok(c, 'posted with mode:no-cors (Google Forms returns an opaque response)',
    posted && posted.opts && posted.opts.mode === 'no-cors');
  ok(c, 'body is form-encoded, not JSON',
    posted && posted.opts && posted.opts.body instanceof w.URLSearchParams);

  const body = posted && posted.opts && posted.opts.body;
  const slug = 'methodica-science-mass-measure-02';
  ok(c, 'unit slug is populated and correct',
    body && body.get('entry.1933069481') === slug, body && body.get('entry.1933069481'));
  ok(c, 'component slug is populated and correct',
    body && body.get('entry.2070680092') === slug + '-' + c,
    body && body.get('entry.2070680092'));
  ok(c, 'problem type arrives as the Hebrew label, not the internal key',
    body && body.get('entry.1179822443') === 'אחר', body && body.get('entry.1179822443'));
  ok(c, 'free text arrives verbatim',
    body && body.get('entry.806447525') === 'משהו אחר');
  ok(c, 'date and time are populated',
    body && /^\d{4}$/.test(body.get('entry.301404029_year')) &&
    body.get('entry.2066097581_hour') !== null);
  ok(c, 'no console.error on a successful send', consoleErrors.length === 0,
    consoleErrors.join(' | '));
  ok(c, 'thank-you shown', !d.getElementById('report-thanks-modal').hasAttribute('hidden'));
  exec('closeReportThanks()');
  ok(c, 'thank-you closes', d.getElementById('report-thanks-modal').hasAttribute('hidden'));

  /* A forced network failure must not block the learner. */
  w.fetch = function () { return Promise.reject(new Error('offline')); };
  exec('openReportModal()');
  d.getElementById('report-type').value = 'technical';
  d.getElementById('report-text').value = 'נפילה מדומה';
  exec('submitReport()');
  ok(c, 'a failed send still shows the thank-you (learner never blocked)',
    !d.getElementById('report-thanks-modal').hasAttribute('hidden'));
  exec('closeReportThanks()');

  // ── 10. Ledger: fail-open then dedupe ──────────────────────────────
  exec('window.__calls = []; window.sendStatement720 = function(){ window.__calls.push([].slice.call(arguments)); };');
  exec("sendCompletedOnce('done','P','onlinelesson',{success:true})");
  ok(c, 'ledger fail-open: first completed is sent', w.__calls.length === 1, 'n=' + w.__calls.length);
  exec("sendCompletedOnce('done','P','onlinelesson',{success:true})");
  ok(c, 'ledger dedupes a repeat completed', w.__calls.length === 1, 'n=' + w.__calls.length);
  exec("sendCompletedOnce('doneItems','P#001','question',null)");
  ok(c, 'a different ledger key still sends', w.__calls.length === 2, 'n=' + w.__calls.length);
  ok(c, 'completed verb used', w.__calls[0][0] === 'completed', String(w.__calls[0][0]));
  // dedupe must survive a "page load" — that is the whole point of sessionStorage
  ok(c, 'ledger persisted to sessionStorage',
    !!w.sessionStorage.getItem('lomda_completed_ledger::Methodica-science-mass-measure-02'));

  // ── 11. goTo sweep over every screen ───────────────────────────────
  const total = val('TOTAL_SCREENS');
  ok(c, 'TOTAL_SCREENS readable', typeof total === 'number', String(total));
  let sweepOk = true, sweepErr = '';
  for (let n = 0; n < total; n++) {
    const r = val('(function(){ goTo(' + n + '); return currentScreen; })()');
    if (r !== n) { sweepOk = false; sweepErr = 'goTo(' + n + ') -> ' + r; break; }
  }
  ok(c, 'goTo sweep across all ' + total + ' screens', sweepOk, sweepErr);
  ok(c, 'screen count in DOM matches TOTAL_SCREENS',
    d.querySelectorAll('.screen[data-screen]').length === total,
    'dom=' + d.querySelectorAll('.screen[data-screen]').length + ' total=' + total);

  // ── 12. No unexpected console.error anywhere in the run ────────────
  const unexpected = consoleErrors.filter(m => !m.includes('REPORT_FORM_ACTION'));
  ok(c, 'no unexpected console.error', unexpected.length === 0, unexpected.slice(0, 3).join(' | '));

  w.close();
}

/* Landing via #screen=N — the "חזרה" button of the next component. A component
   that is linked into with a hash but does not read it silently drops the
   learner on screen 0, which also makes bootXAPI report the wrong item. */
async function runHashLanding(c, screen) {
  const dir = path.join(BASE, 'Methodica-science-mass-measure-02-' + c);
  const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), {
    url: 'http://localhost:8777/Methodica-science-mass-measure-02-' + c +
         '/index.html?slxapi=x#screen=' + screen,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  const { exec, val } = makeRunner(w);
  w.console.error = function () {}; w.console.warn = function () {}; w.console.log = function () {};
  w.fetch = function () { return Promise.resolve({ ok: true }); };
  w.HTMLMediaElement.prototype.load = function () {};
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};

  for (const src of [...w.document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'))) {
    const p = path.resolve(dir, src.split('?')[0]);
    if (fs.existsSync(p)) { try { exec(fs.readFileSync(p, 'utf8')); } catch (e) {} }
  }
  const landed = val('currentScreen');
  ok(c, 'landing on #screen=' + screen + ' reaches that screen (not 0)',
    landed === screen, 'currentScreen=' + landed);
  const activeAttr = w.document.querySelector('.screen.active');
  ok(c, 'the active .screen matches the hash',
    activeAttr && activeAttr.getAttribute('data-screen') === String(screen),
    'active=' + (activeAttr && activeAttr.getAttribute('data-screen')));
  w.close();
}

/* ── Metadata integrity, checked statically ──────────────────────────────
   metadata/ is the single source of truth for every id the lomda emits. A
   mismatch of one trailing slash or one capital letter means every statement
   the component sends names an object that does not exist in the catalog —
   and it fails completely silently: the library sends the wrong id happily and
   Kata accepts it. So this is enforced here rather than eyeballed. */
function checkMetadata() {
  const C = 'meta';
  const idFile = fs.readFileSync(path.join(BASE, 'unit-js', '10-identity.js'), 'utf8');
  const PREFIX = /var XAPI_ID_PREFIX = '([^']+)'/.exec(idFile)[1];
  const UNIT = /window\.XAPI_UNIT_ID = XAPI_ID_PREFIX \+ '([^']+)'/.exec(idFile)[1];

  const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
  const mdDir = path.join(BASE, 'metadata');
  ok(C, 'metadata/ exists', fs.existsSync(mdDir));
  if (!fs.existsSync(mdDir)) return;

  const unit = readJson(path.join(mdDir, 'methodica-science-mass-measure-02_unit.json'));
  ok(C, 'unit id matches XAPI_UNIT_ID byte-for-byte', PREFIX + UNIT === unit.id,
    '\n      code: ' + PREFIX + UNIT + '\n      meta: ' + unit.id);

  let items = 0, questions = 0;
  for (const c of COMPONENTS) {
    const slug = 'methodica-science-mass-measure-02-' + c;
    const md = readJson(path.join(mdDir, slug + '.json'));
    const js = fs.readFileSync(path.join(BASE, 'Methodica-science-mass-measure-02-' + c, 'script.js'), 'utf8');

    // The values the code will actually build, mirroring 20-xapi.js exactly.
    const compId = PREFIX + slug + '/';
    ok(c, 'component id matches metadata', compId === md.id,
      '\n      code: ' + compId + '\n      meta: ' + md.id);
    ok(c, 'XAPI_COMP_SLUG matches the metadata slug',
      (/var XAPI_COMP_SLUG = '([^']+)'/.exec(js) || [])[1] === md.id.replace(/\/+$/, '').split('/').pop());
    ok(c, 'XAPI_METADATA_FILE points at the real file',
      fs.existsSync(path.join(mdDir, slug + '.json')) &&
      (/var XAPI_METADATA_FILE = '\.\.\/metadata\/([^']+)'/.exec(js) || [])[1] === slug + '.json');

    // Screen map: exactly TOTAL_SCREENS keys, 0..N-1, no gaps.
    const total = parseInt(/const TOTAL_SCREENS = (\d+);/.exec(js)[1], 10);
    const block = /var SCREEN_TO_SUBCONTENT = \{([\s\S]*?)\n\};/.exec(js)[1];
    const keys = [...block.matchAll(/^\s*(\d+):/gm)].map(m => +m[1]);
    ok(c, 'screen map has exactly TOTAL_SCREENS keys',
      keys.length === total, 'keys=' + keys.length + ' TOTAL_SCREENS=' + total);
    ok(c, 'screen map keys are exactly 0..' + (total - 1),
      keys.slice().sort((a, b) => a - b).join(',') ===
      Array.from({ length: total }, (_, i) => i).join(','));

    // Coverage both ways: no phantom items, no orphan catalog items.
    const mapped = new Set([...block.matchAll(/'(\d{3})'/g)].map(m => m[1]));
    const meta = new Set(md.subContent.map(s => s.id.replace(/\/+$/, '').split('-').pop()));
    const phantom = [...mapped].filter(i => !meta.has(i));
    const orphan = [...meta].filter(i => !mapped.has(i));
    ok(c, 'every mapped item exists in metadata', phantom.length === 0, phantom.join(','));
    ok(c, 'every metadata item has a screen', orphan.length === 0, orphan.join(','));

    // Item and question ids, built the way xapiItemId()/xapiQ() build them.
    for (const s of md.subContent) {
      const suf = s.id.replace(/\/+$/, '').split('-').pop();
      const built = compId + slug + '-' + suf + '/';
      ok(c, 'item ' + suf + ' id matches metadata', built === s.id,
        '\n      code: ' + built + '\n      meta: ' + s.id);
      items++;
      for (const q of (s.questions || [])) {
        questions++;
        ok(c, 'question ' + suf + '/' + q.questionId.split('/').pop() + ' sits under its item',
          q.questionId.startsWith(built) && /^https?:\/\//.test(q.questionId), q.questionId);
      }
    }

    // XAPI_EVAL_ITEMS must be a subset of the catalog's items.
    const ev = new Set([...(/var XAPI_EVAL_ITEMS = \{([^}]*)\}/.exec(js)[1])
      .matchAll(/'(\d{3})'/g)].map(m => m[1]));
    ok(c, 'XAPI_EVAL_ITEMS is a subset of metadata items',
      [...ev].every(i => meta.has(i)), [...ev].filter(i => !meta.has(i)).join(','));
  }
  ok(C, 'covered 6 components / 25 items / 31 questions',
    items === 25 && questions === 31, 'items=' + items + ' questions=' + questions);
}

/* ── The ?v= invariant ───────────────────────────────────────────────────
   All six index.html reference the same shared URLs, so a given shared file's
   ?v= must be identical in all six. A mismatch means one component fetches a
   second copy under a different URL, and two components can execute different
   versions of the same logic inside one learner session. */
function checkVersionQueries() {
  const seen = {};
  for (const c of COMPONENTS) {
    const html = fs.readFileSync(path.join(BASE, 'Methodica-science-mass-measure-02-' + c, 'index.html'), 'utf8');
    for (const m of html.matchAll(/(?:src|href)="\.\.\/(unit-js|unit-css)\/([^"?]+)\?v=([^"]+)"/g)) {
      const file = m[1] + '/' + m[2];
      (seen[file] = seen[file] || []).push(c + ':' + m[3]);
    }
  }
  const files = Object.keys(seen);
  ok('ver', 'shared files are referenced', files.length >= 6, 'found=' + files.length);
  for (const f of files) {
    const versions = new Set(seen[f].map(s => s.split(':')[1]));
    ok('ver', f + ' has one ?v= across all six', versions.size === 1 && seen[f].length === 6,
      seen[f].join(' '));
  }
}

(async () => {
  checkMetadata();
  checkVersionQueries();
  for (const c of COMPONENTS) await run(c);
  for (const [c, screen] of Object.entries(INBOUND_HASH)) await runHashLanding(c, screen);
  if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log('  ' + f)); }
  console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
