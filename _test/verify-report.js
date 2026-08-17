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
  const dir = path.join(BASE, 'methodica-science-mass-measure-02-' + c);
  const file = path.join(dir, 'index.html');
  const loadErrors = [];
  const consoleErrors = [];

  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {
    url: 'http://localhost:8777/methodica-science-mass-measure-02-' + c + '/index.html',
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
                    'initResumeResetHatch', 'currentPartSlug',
                    /* resume, shared (unit-js/40-resume.js) */
                    'readUnitState', 'captureUnitState', 'persistUnitState',
                    'emptyUnitState', 'applyExecutionState', 'writeForwardState',
                    'recordForwardEdge', 'previousPartHref', 'goBackToPreviousPart',
                    'scheduleResumeSave', 'flushResumeSave', 'initResumeLeaveHandlers',
                    /* resume, per-part hooks (this component's script.js) */
                    'capturePartPayload', 'applyResumeVars', 'applyResumeDom',
                    'restoreScreenUI']) {
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

  /* ── 10. The 'completed' ledger ──────────────────────────────────────
     Since 2026-08-17 the ledger lives in the xAPI State document (done /
     doneItems in unit-js/40-resume.js) rather than in sessionStorage, so it
     survives a tab close — the gap the sessionStorage version documented.

     In this run the CDN library is never fetched (jsdom is constructed without
     `resources`, so the injected <script> neither loads nor errors), which
     means bootXAPI stops before readUnitState and there is no document at all.
     That makes this the natural place to assert the fail-open guarantee. */
  exec('window.__calls = []; window.sendStatement720 = function(){ window.__calls.push([].slice.call(arguments)); };');

  // (a) No document → FAIL OPEN. A missing document must never suppress a real statement.
  ok(c, 'no state document in this run (library never loaded)',
    val('_unitState') === null, String(val('_unitState')));
  exec("sendCompletedOnce('done','P','onlinelesson',{success:true})");
  exec("sendCompletedOnce('done','P','onlinelesson',{success:true})");
  ok(c, 'ledger fails OPEN with no document: both sends go out',
    w.__calls.length === 2, 'n=' + w.__calls.length);
  ok(c, 'completed verb used', w.__calls[0][0] === 'completed', String(w.__calls[0][0]));

  // (b) With a document the same calls dedupe — what stops a second 'completed'
  //     once the back button makes a finished component re-enterable.
  exec('_unitState = emptyUnitState(); window.__calls = [];');
  exec("sendCompletedOnce('done','P','onlinelesson',{success:true})");
  ok(c, 'ledger sends the first completed', w.__calls.length === 1, 'n=' + w.__calls.length);
  exec("sendCompletedOnce('done','P','onlinelesson',{success:true})");
  ok(c, 'ledger dedupes a repeat completed', w.__calls.length === 1, 'n=' + w.__calls.length);
  exec("sendCompletedOnce('doneItems','P#001','question',null)");
  ok(c, 'a different ledger key still sends', w.__calls.length === 2, 'n=' + w.__calls.length);
  ok(c, 'the mark landed in the document',
    val('JSON.stringify(_unitState.done)') === '{"P":true}',
    String(val('JSON.stringify(_unitState.done)')));
  ok(c, 'item marks are namespaced per component',
    val('JSON.stringify(_unitState.doneItems)') === '{"P#001":true}',
    String(val('JSON.stringify(_unitState.doneItems)')));

  /* (c) During a restore: neither send NOR mark. applyExecutionState stubs the
     sender, so a mark taken there would permanently suppress a statement that
     never actually left — this is how the unit 'completed' would go missing for
     a learner resumed straight onto a finish screen. */
  exec('_unitState = emptyUnitState(); window.__calls = []; _restoring = true;');
  exec("sendCompletedOnce('done','Q','onlinelesson',null)");
  exec('_restoring = false;');
  ok(c, 'nothing sent while restoring', w.__calls.length === 0, 'n=' + w.__calls.length);
  ok(c, 'nothing marked while restoring',
    val('JSON.stringify(_unitState.done)') === '{}',
    String(val('JSON.stringify(_unitState.done)')));

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
  const dir = path.join(BASE, 'methodica-science-mass-measure-02-' + c);
  const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), {
    url: 'http://localhost:8777/methodica-science-mass-measure-02-' + c +
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
    const js = fs.readFileSync(path.join(BASE, 'methodica-science-mass-measure-02-' + c, 'script.js'), 'utf8');

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
    const html = fs.readFileSync(path.join(BASE, 'methodica-science-mass-measure-02-' + c, 'index.html'), 'utf8');
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

/* ── Resume: the document, the handoff, the back edge, the restore ───────
   The real transport is the CDN library (or _test/xapi-720-k.js for the browser
   walkthrough). Here it is replaced by an in-memory store the harness can read
   synchronously, so each invariant can be asserted rather than eyeballed.

   Everything below is Phase 1 scope: the screen pointer, the ledger and the
   cross-part pointer. Answer state is deliberately not restored yet, so there
   is nothing here about repainted answers. */
async function runResume(c) {
  const dir = path.join(BASE, 'methodica-science-mass-measure-02-' + c);
  const slug = 'methodica-science-mass-measure-02-' + c;
  const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), {
    url: 'http://localhost:8777/' + slug + '/index.html?slxapi=1&registration=r1',
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
    if (fs.existsSync(p)) { try { exec(fs.readFileSync(p, 'utf8')); } catch (e) { /* reported elsewhere */ } }
  }

  /* Inspectable State transport + statement log, then open the write paths. */
  exec(`
    window.__store = null; window.__fail = false; window.__stmts = [];
    window.loadState720 = function () { return window.__store ? JSON.parse(window.__store) : null; };
    window.saveState720 = function (id, doc) {
      if (window.__fail) return false;
      window.__store = JSON.stringify(doc); return true;
    };
    window.saveState720Debounced = function (id, doc) { window.__pending = JSON.stringify(doc); };
    window.sendStatement720 = function (v, t, r, o) { window.__stmts.push(v + ':' + t + ':' + ((o && o.objectId) || '')); };
    _resumeReady = true;
    _unitState = emptyUnitState();
  `);

  ok(c, 'currentPartSlug is the lowercase folder name',
    val('currentPartSlug()') === slug, String(val('currentPartSlug()')));

  // ── The payload follows goTo ───────────────────────────────────────────
  const last = val('TOTAL_SCREENS') - 1;
  exec('goTo(' + last + ');');
  ok(c, 'capturePartPayload records the current screen',
    val('capturePartPayload().currentScreen') === last,
    String(val('capturePartPayload().currentScreen')));
  ok(c, 'goTo armed a debounced save',
    typeof val('window.__pending') === 'string', String(val('typeof window.__pending')));

  /* captureUnitState replaces this part's slot but must NOT move `part` — only
     writeForwardState and goBackToPreviousPart may. A save that reset it would
     undo the pointer they just wrote, and the debounced timer from the last
     goTo would fire mid-navigation and bounce the learner back. */
  exec("_unitState.part = 'sentinel'; captureUnitState();");
  ok(c, 'captureUnitState writes this part\'s slot',
    val('_unitState.parts["' + slug + '"].currentScreen') === last,
    String(val('_unitState.parts["' + slug + '"].currentScreen')));
  ok(c, 'captureUnitState leaves the landing pointer alone',
    val('_unitState.part') === 'sentinel', String(val('_unitState.part')));

  // ── The forward handoff ────────────────────────────────────────────────
  exec("_unitState = emptyUnitState(); writeForwardState('dest-part', '#screen=7');");
  ok(c, 'writeForwardState moves the landing pointer to the destination',
    val('_unitState.part') === 'dest-part', String(val('_unitState.part')));
  ok(c, 'writeForwardState records the back edge with its return hash',
    val('_unitState.prev["dest-part"].from') === slug &&
    val('_unitState.prev["dest-part"].hash') === '#screen=7',
    JSON.stringify(val('JSON.stringify(_unitState.prev)')));
  ok(c, 'writeForwardState keeps the departing part\'s payload',
    typeof val('_unitState.parts["' + slug + '"]') === 'object',
    String(val('typeof _unitState.parts["' + slug + '"]')));
  ok(c, 'an unvisited destination is seeded at screen 0',
    val('_unitState.parts["dest-part"].currentScreen') === 0,
    String(val('_unitState.parts["dest-part"].currentScreen')));
  ok(c, 'the forward write landed synchronously',
    val('JSON.parse(window.__store).part') === 'dest-part',
    String(val('JSON.parse(window.__store).part')));

  /* A destination already visited keeps its screen — going forward again must
     resume where the learner left off, not replay from screen 0. */
  exec("_unitState.parts['dest-part'] = { currentScreen: 4 }; writeForwardState('dest-part', '#screen=7');");
  ok(c, 'a visited destination is not reset to screen 0',
    val('_unitState.parts["dest-part"].currentScreen') === 4,
    String(val('_unitState.parts["dest-part"].currentScreen')));

  // ── The back edge ──────────────────────────────────────────────────────
  /* The document is authoritative; the sessionStorage edge map is the
     synchronously-available fallback for the window before the document
     arrives; the hardcoded arguments are the last resort. */
  exec("_unitState = emptyUnitState(); _unitState.prev['" + slug + "'] = { from: 'from-doc', hash: '#screen=2' };");
  exec("try { sessionStorage.setItem('lomda_nav_edges::methodica-science-mass-measure-02', JSON.stringify({'" + slug + "': { from: 'from-session', hash: '#screen=3' } })); } catch (e) {}");
  ok(c, 'previousPartHref prefers the document over sessionStorage',
    /\.\.\/from-doc\/index\.html.*#screen=2$/.test(String(val("previousPartHref('fallback','#screen=9')"))),
    String(val("previousPartHref('fallback','#screen=9')")));
  exec("_unitState.prev = {};");
  ok(c, 'previousPartHref falls back to the sessionStorage edge',
    /\.\.\/from-session\/index\.html.*#screen=3$/.test(String(val("previousPartHref('fallback','#screen=9')"))),
    String(val("previousPartHref('fallback','#screen=9')")));
  exec("try { sessionStorage.removeItem('lomda_nav_edges::methodica-science-mass-measure-02'); } catch (e) {}");
  ok(c, 'previousPartHref falls back to the hardcoded argument',
    /\.\.\/fallback\/index\.html.*#screen=9$/.test(String(val("previousPartHref('fallback','#screen=9')"))),
    String(val("previousPartHref('fallback','#screen=9')")));
  ok(c, 'previousPartHref puts the query string before the hash',
    /\?slxapi=1&registration=r1#screen=9$/.test(String(val("previousPartHref('fallback','#screen=9')"))),
    String(val("previousPartHref('fallback','#screen=9')")));

  /* A failed write must leave the pointer where it was. Navigating on a failed
     write is what reintroduces the ping-pong that re-sends 'completed' every
     cycle, so goBackToPreviousPart retries once and then stays put. */
  exec("_unitState = emptyUnitState(); _unitState.part = 'here'; window.__fail = true;");
  exec("try { goBackToPreviousPart('fallback', '#screen=9'); } catch (e) {}");
  ok(c, 'a failed back-write rolls the landing pointer back',
    val('_unitState.part') === 'here', String(val('_unitState.part')));
  exec('window.__fail = false;');

  // ── The restore ────────────────────────────────────────────────────────
  /* Exactly one item 'initialized' for the landing screen, and nothing else:
     the no-op stub holds across goTo, then xapiCurrentItem is cleared so the
     latch cannot swallow the one statement that is owed. */
  exec("window.__stmts = []; applyExecutionState({ currentScreen: " + last + " });");
  ok(c, 'restore lands on the saved screen',
    val('currentScreen') === last, String(val('currentScreen')));
  ok(c, 'restore leaves _restoring off', val('_restoring') === false, String(val('_restoring')));
  ok(c, 'restore re-installed the real sender',
    val('window.sendStatement720.toString().indexOf("__stmts") > -1') === true);
  const stmts = val('JSON.stringify(window.__stmts)');
  const parsed = JSON.parse(stmts || '[]');
  ok(c, 'restore emits no completed and no answered',
    parsed.every(s => !/^completed:|^answered/.test(s)), stmts);
  ok(c, 'restore emits at most one item initialized',
    parsed.filter(s => s.startsWith('initialized:question')).length <= 1, stmts);

  /* ── Phase 2a: the scoring / branching round-trip ─────────────────────
     Phase 1 restored only the screen pointer, so a resumed learner carried an
     empty score map and the forward routers scored them 0 — a learner who had
     passed got sent into remediation they had already skipped. Each block below
     proves the mis-route is real (by asserting it on a wiped map) and then that
     the restore fixes it, so the assertion cannot pass vacuously. */
  exec("XAPI_Q_RESULTS['001/q1'] = true; window.__snap = capturePartPayload();");
  exec("Object.keys(XAPI_Q_RESULTS).forEach(function(k){ delete XAPI_Q_RESULTS[k]; });");
  ok(c, 'qResults is empty after a simulated reload',
    val("JSON.stringify(XAPI_Q_RESULTS)") === '{}', String(val("JSON.stringify(XAPI_Q_RESULTS)")));
  exec('applyResumeVars(window.__snap);');
  ok(c, 'restore brings XAPI_Q_RESULTS back',
    val("XAPI_Q_RESULTS['001/q1']") === true, String(val("XAPI_Q_RESULTS['001/q1']")));

  /* ── Phase 2b: the answer round-trip, part 01 ─────────────────────────
     Screen 1 stands in for all seven single-choice screens: they go through one
     shared painter, so a defect in it shows up here. */
  if (c === '01') {
    exec(`window.__wipeScq = function () {
      scqSelected = null; scqAttempts = 0; scqDone = false; scqPhase = 'before';
      document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
        el.classList.remove('selected', 'wrong', 'correct', 'disabled');
        el.setAttribute('aria-checked', 'false');
      });
      document.getElementById('scq-feedbox').classList.remove('visible');
      var h = document.getElementById('scq-hint'); if (h) h.hidden = true;
      var b = document.getElementById('scq-check');
      if (b) { b.textContent = 'צדקתי?'; b.disabled = true; }
    };`);

    exec('goTo(1); window.__wipeScq();');
    exec("window.__badScq = [].slice.call(document.querySelectorAll('#s1 .scq-opt'))" +
         "  .map(function(el){ return el.dataset.id; })" +
         "  .filter(function(id){ return id !== SCQ.correctId; })[0];");

    /* Interim wrong: one wrong attempt. scqSelected SURVIVES here (unlike the
       multi-choice screens), so this path is variable-driven. */
    exec('scqSelect(window.__badScq); scqCheck();');
    ok(c, 'one wrong single-choice attempt leaves it answerable',
      val('scqAttempts') === 1 && val('scqDone') === false && val('scqPhase') === 'wrong1',
      val('scqAttempts') + ' / ' + val('scqDone') + ' / ' + val('scqPhase'));
    exec('window.__snapScqI = capturePartPayload(); window.__wipeScq();');
    exec('applyResumeVars(window.__snapScqI); restoreScreenUI(1);');
    ok(c, 'interim restore re-marks the wrong pick and shows feedback',
      val("scqOptEl(window.__badScq).classList.contains('wrong')") === true &&
      val("document.getElementById('scq-feedbox').classList.contains('visible')") === true);
    ok(c, 'interim restore reveals the hint, as the live wrong branch does',
      val("document.getElementById('scq-hint').hidden") === false);
    ok(c, 'interim restore keeps the screen re-answerable (a click re-enables)',
      val("(function(){ scqSelect(SCQ.correctId); var b=document.getElementById('scq-check'); return b.disabled === false; })()") === true);

    /* Wrong-final: both marks must show — the learner's pick AND the answer. */
    exec('window.__wipeScq(); scqSelect(window.__badScq); scqCheck(); scqSelect(window.__badScq); scqCheck();');
    ok(c, 'two wrong attempts reach wrong-final',
      val('scqDone') === true && val('scqPhase') === 'wrong-final',
      val('scqDone') + ' / ' + val('scqPhase'));
    exec('window.__snapScqF = capturePartPayload(); window.__wipeScq();');
    exec('applyResumeVars(window.__snapScqF); restoreScreenUI(1);');
    ok(c, 'wrong-final restore marks the correct answer',
      val("scqOptEl(SCQ.correctId).classList.contains('correct')") === true);
    ok(c, "wrong-final restore also shows what the learner got wrong",
      val("scqOptEl(window.__badScq).classList.contains('wrong')") === true);
    ok(c, 'wrong-final restore locks the options and lets the learner continue',
      val("scqOptEl(SCQ.correctId).classList.contains('disabled')") === true &&
      val("document.getElementById('scq-check').disabled") === false &&
      val("document.getElementById('scq-check').textContent") === 'המשך',
      val("document.getElementById('scq-check').textContent"));

    /* Correct path. */
    exec('window.__wipeScq(); scqSelect(SCQ.correctId); scqCheck();');
    exec('window.__snapScqC = capturePartPayload(); window.__wipeScq();');
    exec('applyResumeVars(window.__snapScqC); restoreScreenUI(1);');
    ok(c, 'solved restore shows the correct mark and no wrong mark',
      val("scqOptEl(SCQ.correctId).classList.contains('correct')") === true &&
      val("scqOptEl(window.__badScq).classList.contains('wrong')") === false);

    /* An untouched screen stays pristine — painters now run on every navigation. */
    exec('window.__wipeScq(); restoreScreenUI(1);');
    ok(c, 'a never-answered single-choice screen is left pristine',
      val("document.getElementById('scq-feedbox').classList.contains('visible')") === false &&
      val("scqOptEl(SCQ.correctId).classList.contains('correct')") === false);

    /* ── The memory game (screen 10) ────────────────────────────────────
       The board is Fisher-Yates shuffled inside s11Init(), so re-running init
       deals a DIFFERENT board. The payload must carry the deal itself. */
    exec('goTo(10); s11Init();');
    exec("window.__deal = s11Cards.map(function(c){ return c.pairId + ':' + c.text; }).join('|');");
    /* Mark one pair as matched directly rather than through s11CardClick: the
       live handler confirms a match inside a setTimeout, which never fires in a
       synchronous jsdom run. What is under test here is the RESUME contract for
       a shuffled board — that the deal survives and matched cards come back —
       not the game's matching logic, which the existing goTo sweep covers. */
    exec(`(function(){
      var i1 = 0, i2 = -1;
      for (var j = 1; j < s11Cards.length; j++) {
        if (s11Cards[j].pairId === s11Cards[0].pairId) { i2 = j; break; }
      }
      window.__pairIdx = [i1, i2];
      s11Cards[i1].matched = true; s11Cards[i2].matched = true;
      s11Matches = 1;
    })();`);
    ok(c, 'one pair is marked matched, mid-game',
      val('s11Matches') === 1 && val('s11Cards[window.__pairIdx[0]].matched') === true,
      'matches=' + val('s11Matches'));

    exec('window.__snapS11 = capturePartPayload();');
    /* A fresh page load: variables gone AND the board markup empty, which is
       exactly what happens because resetScreenState10 early-returns when
       s11Matches > 0 and therefore never calls s11RenderBoard. */
    exec("s11Cards = []; s11Matches = 0; s11Done = false;" +
         "document.getElementById('s11-board').innerHTML = '';");
    ok(c, 'the wipe left the board empty (the real post-reload state)',
      val("document.querySelectorAll('#s11-board .s11-card').length") === 0);

    exec('applyResumeVars(window.__snapS11); restoreScreenUI(10);');
    ok(c, 'restore re-deals the SAME board, not a new shuffle',
      val("s11Cards.map(function(c){ return c.pairId + ':' + c.text; }).join('|')") === val('window.__deal'),
      'restored deal differs from the original');
    ok(c, 'restore rebuilt the board markup',
      val("document.querySelectorAll('#s11-board .s11-card').length") === val('s11Cards.length'),
      val("document.querySelectorAll('#s11-board .s11-card').length") + ' cards');
    ok(c, 'restore keeps the already-matched pair flipped and matched',
      val(`(function(){ return window.__pairIdx.every(function(i){
            var el = document.querySelector('#s11-board .s11-card[data-idx="' + i + '"]');
            return el && el.classList.contains('s11-flipped') && el.classList.contains('s11-matched');
          }); })()`) === true);
    ok(c, 'restore keeps continue disabled until all three pairs are found',
      val("document.getElementById('s11-btn-continue').disabled") === true);

    /* ── The shared drag painter (screens 4 / 8 / 19) ───────────────────
       Placement is DOM parentage; screen 4 stands in for all three. */
    exec('goTo(4);');
    exec("window.__s5item = S5_ITEM_IDS[0];" +
         "var __z = document.getElementById('s5-zone-bruto');" +
         "var __e = document.getElementById(window.__s5item);" +
         "if (__e.parentElement) __e.parentElement.removeChild(__e); __z.appendChild(__e);" +
         "s5Attempts = 1;");
    exec('window.__snapS5 = capturePartPayload();');
    ok(c, 'capture read the drag placement out of the DOM',
      val("window.__snapS5.s5.place[window.__s5item]") === 'bruto',
      String(val("window.__snapS5.s5.place[window.__s5item]")));
    exec("var __e2 = document.getElementById(window.__s5item);" +
         "__e2.parentElement.removeChild(__e2);" +
         "document.getElementById('s5-source-bank').appendChild(__e2);" +
         "s5Attempts = 0;");
    exec('applyResumeVars(window.__snapS5); applyResumeDom(window.__snapS5); restoreScreenUI(4);');
    ok(c, 'restore physically re-places the drag item in its zone',
      val("document.getElementById(window.__s5item).parentElement.id") === 's5-zone-bruto',
      String(val("document.getElementById(window.__s5item).parentElement.id")));
    ok(c, 'the interim drag restore never strands the learner',
      val("(function(){ var b=document.getElementById('s5-check'); return b ? typeof b.disabled === 'boolean' : false; })()") === true &&
      val("document.getElementById('s5-feedbox').classList.contains('visible')") === true);
  }

  if (c === '01') {
    exec("stationProgress.q16='success'; stationProgress.q17='success';" +
         "stationProgress.q18='success'; stationProgress.q19='success'; stationProgress.q20='fail';");
    ok(c, 'score reads 4/5 before capture', val('getPracticeScore()') === 4, String(val('getPracticeScore()')));
    exec('window.__snap = capturePartPayload();');
    exec("Object.keys(stationProgress).forEach(function(k){ stationProgress[k] = null; });");
    ok(c, 'the regression is real: wiped score routes to remediation',
      val('getPracticeScore()') === 0 &&
      val('practiceDestinationSlug()') === 'methodica-science-mass-measure-02-02',
      val('getPracticeScore()') + ' / ' + val('practiceDestinationSlug()'));
    exec('applyResumeVars(window.__snap);');
    ok(c, 'restore returns the score', val('getPracticeScore()') === 4, String(val('getPracticeScore()')));
    ok(c, 'restore returns the skip-branch destination',
      val('practiceDestinationSlug()') === 'methodica-science-mass-measure-02-03',
      String(val('practiceDestinationSlug()')));
  }

  /* ── Phase 2b: the answer round-trip, part 02 ─────────────────────────
     Two things here are not covered anywhere else: the shared MCQ painter
     (four screens, one helper) and drag9, whose placement lives only as DOM
     parentage rather than in any variable. */
  if (c === '02') {
    /* A fresh page load for screen 1, without resetScreenState1's progress guard. */
    exec(`window.__wipeSq2 = function () {
      sq2Selected = []; sq2Attempts = 0; sq2Done = false; sq2Phase = 'before';
      __mcqWrong.sq2 = [];
      document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
        el.classList.remove('selected', 'wrong', 'correct', 'disabled');
        el.setAttribute('aria-checked', 'false');
      });
      document.getElementById('sq2-feedbox').classList.remove('visible');
      var b = document.getElementById('sq2-check');
      if (b) { b.textContent = 'צדקתי?'; b.disabled = true; }
    };`);

    /* Answer wrong twice → wrong-final, where sqNSelected is cleared to [] and
       the learner's wrong pick survives ONLY as a DOM class. */
    exec('goTo(1); window.__wipeSq2();');
    /* MCQ_SQ2 carries only correctIds; the option ids live in the markup as
       data-id, so pick a wrong one from there. */
    exec("var __ids = [].slice.call(document.querySelectorAll('#s1 .scq-opt'))" +
         "  .map(function(el){ return el.dataset.id; });" +
         "window.__badId = __ids.filter(function(id){ return MCQ_SQ2.correctIds.indexOf(id) === -1; })[0];" +
         "sq2Toggle(window.__badId); sq2Check(); sq2Toggle(window.__badId); sq2Check();");
    ok(c, 'two wrong MCQ attempts reach wrong-final',
      val('sq2Done') === true && val('sq2Phase') === 'wrong-final',
      val('sq2Done') + ' / ' + val('sq2Phase'));
    ok(c, "the learner's wrong pick exists only in the DOM by now",
      val('sq2Selected.length') === 0 &&
      val("sq2OptEl(window.__badId).classList.contains('wrong')") === true,
      'selected=' + val('sq2Selected.length'));

    exec('window.__snapSq2 = capturePartPayload();');
    ok(c, 'capture recovered the wrong pick from the DOM',
      val("JSON.stringify(window.__snapSq2.mcq.sq2.wrong)") === JSON.stringify([val('window.__badId')]),
      String(val("JSON.stringify(window.__snapSq2.mcq.sq2.wrong)")));

    exec('window.__wipeSq2();');
    ok(c, 'the wipe cleared screen 1',
      val('sq2Done') === false &&
      val("sq2OptEl(window.__badId).classList.contains('wrong')") === false);

    exec('applyResumeVars(window.__snapSq2); applyResumeDom(window.__snapSq2); restoreScreenUI(1);');
    ok(c, 'MCQ restore marks the correct answer',
      val("MCQ_SQ2.correctIds.every(function(id){ return sq2OptEl(id).classList.contains('correct'); })") === true);
    ok(c, "MCQ restore also shows the learner what they got wrong",
      val("sq2OptEl(window.__badId).classList.contains('wrong')") === true);
    ok(c, 'MCQ restore locks the options',
      val("sq2OptEl(window.__badId).classList.contains('disabled')") === true);
    ok(c, 'MCQ restore shows the feedback and lets the learner continue',
      val("document.getElementById('sq2-feedbox').classList.contains('visible')") === true &&
      val("document.getElementById('sq2-check').disabled") === false &&
      val("document.getElementById('sq2-check').textContent") === 'המשך',
      val("document.getElementById('sq2-check').textContent"));

    /* An untouched screen must stay pristine — the painter early-returns. */
    exec('window.__wipeSq2(); restoreScreenUI(1);');
    ok(c, 'a never-answered MCQ screen is left pristine by the painter',
      val("document.getElementById('sq2-feedbox').classList.contains('visible')") === false &&
      val("MCQ_SQ2.correctIds.every(function(id){ return !sq2OptEl(id).classList.contains('correct'); })") === true);

    /* drag9: placement is DOM parentage, so capture/restore must move nodes. */
    exec('goTo(8);');
    exec("var __it = DRAG9_ITEM_IDS[0]; window.__it = __it;" +
         "var __z = document.getElementById('drag9-zone-' + DRAG9_ZONES[0]);" +
         "var __el = document.getElementById(__it);" +
         "if (__el.parentElement) __el.parentElement.removeChild(__el); __z.appendChild(__el);");
    ok(c, 'an item was moved into a zone in the DOM',
      val("document.getElementById(window.__it).parentElement.id") === 'drag9-zone-' + val('DRAG9_ZONES[0]'),
      String(val("document.getElementById(window.__it).parentElement.id")));
    exec('window.__snapD9 = capturePartPayload();');
    ok(c, 'capture read the placement out of the DOM',
      val("window.__snapD9.drag9.place[window.__it]") === val('DRAG9_ZONES[0]'),
      String(val("window.__snapD9.drag9.place[window.__it]")));
    // Send it back to the bank, as a fresh page load would.
    exec("var __el2 = document.getElementById(window.__it);" +
         "__el2.parentElement.removeChild(__el2);" +
         "document.getElementById('drag9-source-bank').appendChild(__el2);");
    ok(c, 'the wipe returned the item to the source bank',
      val("document.getElementById(window.__it).parentElement.id") === 'drag9-source-bank');
    exec('applyResumeVars(window.__snapD9); applyResumeDom(window.__snapD9);');
    ok(c, 'restore physically re-places the item in its zone',
      val("document.getElementById(window.__it).parentElement.id") === 'drag9-zone-' + val('DRAG9_ZONES[0]'),
      String(val("document.getElementById(window.__it).parentElement.id")));
  }

  if (c === '02') {
    exec("stationProgress2.q2='success'; stationProgress2.q3='success';" +
         "stationProgress2.q4='success'; stationProgress2.q5='success';" +
         "stationProgress3.q8='success'; stationProgress3.q9='success';");
    ok(c, 'both scores read before capture',
      val('getBasicPracticeScore()') === 4 && val('getStandardPracticeScore()') === 2,
      val('getBasicPracticeScore()') + ' / ' + val('getStandardPracticeScore()'));
    exec('window.__snap = capturePartPayload();');
    exec("Object.keys(stationProgress2).forEach(function(k){ stationProgress2[k] = null; });" +
         "Object.keys(stationProgress3).forEach(function(k){ stationProgress3[k] = null; });");
    ok(c, 'the regression is real: both scores wipe to 0',
      val('getBasicPracticeScore()') === 0 && val('getStandardPracticeScore()') === 0,
      val('getBasicPracticeScore()') + ' / ' + val('getStandardPracticeScore()'));
    exec('applyResumeVars(window.__snap);');
    ok(c, 'restore returns both scores (the 02 gate needs BOTH)',
      val('getBasicPracticeScore()') === 4 && val('getStandardPracticeScore()') === 2,
      val('getBasicPracticeScore()') + ' / ' + val('getStandardPracticeScore()'));
  }

  /* ── Phase 2b: the answer round-trip, part 04 ─────────────────────────
     Answer the table wrong twice to reach the reveal-toggle state, then prove
     a simulated reload comes back locked, marked and never stranded — and that
     the toggle survives with the learner's own answer intact. */
  if (c === '04') {
    // A fresh page load, expressed as resetScreenState1's body without its guard.
    exec(`window.__wipe04 = function () {
      tblDone = false; tblAttempts = 0; tblPhase = 'before';
      tblLastAnswer = null; tblShowingCorrect = false;
      TBL_DD_IDS.forEach(function (id) {
        tblDdValues[id] = '';
        var v = document.getElementById(id + '-val'); if (v) v.textContent = '';
        var b = document.getElementById(id + '-btn'); if (b) { b.disabled = false; b.className = 'tbl-dd-btn'; }
      });
      TBL_INPUT_IDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.value = ''; el.disabled = false; el.className = 'tbl-input'; }
      });
      tblHideFeedback();
      var rb = document.getElementById('tbl-reveal-btn');
      if (rb) { rb.hidden = true; rb.textContent = 'התשובה הנכונה'; }
      tblSetBtnCheck('צדקתי?', false, 'check');
    };`);

    exec('goTo(1);');

    /* First the INTERIM wrong state: one wrong attempt, not yet solved. This is
       the branch that needs tblOnInput() to recompute enablement — tblCheck
       disables the button after a wrong answer and only tblOnInput re-enables
       it, so a restore that skipped it would strand a learner whose fields are
       all still filled. The done-path button is set by tblSetBtnCheck instead,
       which is why that case cannot cover this one. */
    exec("window.__wipe04();" +
         "TBL_DD_IDS.forEach(function(id){ tblDdValues[id] = 'לא-נכון'; });" +
         "TBL_INPUT_IDS.forEach(function(id){ var el=document.getElementById(id); if(el) el.value='999'; });" +
         "tblCheck();");
    ok(c, 'one wrong attempt leaves the question answerable',
      val('tblAttempts') === 1 && val('tblDone') === false,
      val('tblAttempts') + ' / ' + val('tblDone'));
    ok(c, 'the live code disables the check button after a wrong answer',
      val("document.getElementById('tbl-check').disabled") === true);
    exec('window.__snapInterim = capturePartPayload(); window.__wipe04();');
    exec('applyResumeVars(window.__snapInterim); applyResumeDom(window.__snapInterim); restoreScreenUI(1);');
    ok(c, 'interim restore keeps the retry state (attempts, not done)',
      val('tblAttempts') === 1 && val('tblDone') === false,
      val('tblAttempts') + ' / ' + val('tblDone'));
    ok(c, 'interim restore reveals the hint, as the wrong branch did',
      val("document.getElementById('tbl-hint').hidden") === false);
    ok(c, 'interim restore leaves the learner able to RETRY (not stranded)',
      val("document.getElementById('tbl-check').disabled") === false &&
      val("document.getElementById('tbl-check').textContent") === 'צדקתי?',
      val("document.getElementById('tbl-check').textContent") + ' disabled=' +
      val("document.getElementById('tbl-check').disabled"));

    // Now burn the second attempt to land on wrong-final.
    exec("tblCheck();");
    ok(c, 'two wrong attempts reach the locked wrong-final state',
      val('tblDone') === true && val('tblPhase') === 'wrong-final',
      val('tblDone') + ' / ' + val('tblPhase'));
    ok(c, 'the learner\'s own answer was snapshotted before any reveal',
      val("tblLastAnswer && tblLastAnswer.dd['tblA-dd-1']") === 'לא-נכון',
      String(val("tblLastAnswer && tblLastAnswer.dd['tblA-dd-1']")));

    exec('window.__snap04 = capturePartPayload(); window.__wipe04();');
    ok(c, 'the wipe really cleared the screen',
      val('tblDone') === false && val("tblDdValues['tblA-dd-1']") === '',
      val('tblDone') + ' / "' + val("tblDdValues['tblA-dd-1']") + '"');

    exec('applyResumeVars(window.__snap04); applyResumeDom(window.__snap04); restoreScreenUI(1);');
    ok(c, 'restore brings back the locked state',
      val('tblDone') === true && val("document.getElementById('tblA-input-2').disabled") === true,
      val('tblDone') + ' / ' + val("document.getElementById('tblA-input-2').disabled"));
    ok(c, 'restore re-marks the wrong dropdown',
      val("document.getElementById('tblA-dd-1-btn').classList.contains('wrong')") === true);
    ok(c, 'restore shows the feedback popup',
      val("document.getElementById('tbl-feedbox').classList.contains('visible')") === true);
    ok(c, 'restore reveals the toggle button labelled for "show me the answer"',
      val("document.getElementById('tbl-reveal-btn').hidden") === false &&
      val("document.getElementById('tbl-reveal-btn').textContent") === 'התשובה הנכונה',
      val("document.getElementById('tbl-reveal-btn').textContent"));
    ok(c, 'restore leaves the learner able to continue (never stranded)',
      val("document.getElementById('tbl-check').disabled") === false &&
      val("document.getElementById('tbl-check').textContent") === 'המשך',
      val("document.getElementById('tbl-check').textContent") + ' disabled=' +
      val("document.getElementById('tbl-check').disabled"));

    /* CLAUDE.md rule 4: with the solution on screen, tblDdValues holds the
       CORRECT answers and only tblLastAnswer still holds the learner's. A
       round-trip in that state must not promote the solution to "their answer". */
    exec('tblReveal();');
    ok(c, 'toggling shows the solution and relabels',
      val('tblShowingCorrect') === true &&
      val("document.getElementById('tbl-reveal-btn').textContent") === 'התשובה שלי',
      val('tblShowingCorrect') + ' / ' + val("document.getElementById('tbl-reveal-btn').textContent"));
    exec('window.__snap04b = capturePartPayload(); window.__wipe04();');
    exec('applyResumeVars(window.__snap04b); applyResumeDom(window.__snap04b); restoreScreenUI(1);');
    ok(c, 'the toggle state survives the round-trip',
      val('tblShowingCorrect') === true &&
      val("document.getElementById('tbl-reveal-btn').textContent") === 'התשובה שלי',
      val('tblShowingCorrect') + ' / ' + val("document.getElementById('tbl-reveal-btn').textContent"));
    ok(c, 'the learner\'s own answer is still recoverable, not overwritten by the solution',
      val("tblLastAnswer && tblLastAnswer.dd['tblA-dd-1']") === 'לא-נכון' &&
      val("tblDdValues['tblA-dd-1']") === val("TBL_DD_CORRECT['tblA-dd-1']"),
      'mine=' + val("tblLastAnswer && tblLastAnswer.dd['tblA-dd-1']") +
      ' shown=' + val("tblDdValues['tblA-dd-1']"));
    exec('tblReveal();');
    ok(c, 'toggling back restores the learner\'s own answer',
      val("tblDdValues['tblA-dd-1']") === 'לא-נכון' &&
      val("document.getElementById('tbl-reveal-btn').textContent") === 'התשובה הנכונה',
      val("tblDdValues['tblA-dd-1']"));
  }

  /* ── Phase 2b: the drag-question round-trip, parts 05 / 06 ────────────
     These live in makeDragQuestion's closure, reachable only through the
     getState/setState seam added for resume. Both the solved and the
     reveal-toggle paths are exercised. */
  if (c === '05' || c === '06') {
    const inst = (c === '05') ? 'dqA' : 'tbl9Q';
    const screen = 2;
    exec('goTo(' + screen + ');');

    exec(`window.__snapA = ${inst}.getState();`);
    ok(c, inst + ' exposes its closure state through the resume seam',
      val(`typeof window.__snapA === 'object' && window.__snapA !== null &&
           typeof window.__snapA.placement === 'object' &&
           'attempts' in window.__snapA && 'done' in window.__snapA &&
           'showingCorrect' in window.__snapA && 'passed' in window.__snapA`) === true,
      String(val('JSON.stringify(Object.keys(window.__snapA || {}))')));

    /* Force the wrong-final state: two attempts with nothing placed correctly.
       window[P+'Check'] is the live entry point the markup calls. */
    exec(`${inst}.setState({ placement: {}, attempts: 1, done: false, checked: false,
                             lastWrongPlacement: null, showingCorrect: false, passed: false });`);
    exec(`window['${c === '05' ? 'dqA' : 'tbl9'}Check']();`);
    ok(c, inst + ' reaches wrong-final after the second attempt',
      val(`${inst}.getState().done`) === true && val(`${inst}.getState().passed`) === false,
      val(`${inst}.getState().done`) + ' / ' + val(`${inst}.getState().passed`));
    ok(c, inst + ' snapshotted the learner\'s answer before any reveal',
      val(`${inst}.getState().lastWrongPlacement !== null`) === true);

    /* Round-trip through the part-level hooks, as a real reload would. */
    exec('window.__snapP = capturePartPayload();');
    /* A real page load resets the DOM too, not just the closure vars. reset()
       calls resetInitial() once the state says "no progress", which is what
       repaints the board pristine — without it the button would keep the label
       the live check() left behind and the painter would not be under test. */
    exec(`${inst}.setState({ placement: {}, attempts: 0, done: false, checked: false,
                             lastWrongPlacement: null, showingCorrect: false, passed: false });
          ${inst}.reset();`);
    ok(c, 'the wipe cleared ' + inst, val(`${inst}.getState().done`) === false);
    ok(c, 'the wipe also reset the check button in the DOM (so the painter is under test)',
      val(`(function(){ var b=document.getElementById('${c === '05' ? 'dqA-btn-check' : 'tbl9-check'}');
            return b ? b.textContent.indexOf('המשך') === -1 : 'no-btn'; })()`) === true,
      String(val(`(function(){ var b=document.getElementById('${c === '05' ? 'dqA-btn-check' : 'tbl9-check'}');
            return b ? b.textContent : 'no-btn'; })()`)));
    exec('applyResumeVars(window.__snapP); restoreScreenUI(' + screen + ');');
    ok(c, inst + ' restores the done/failed state',
      val(`${inst}.getState().done`) === true && val(`${inst}.getState().passed`) === false,
      val(`${inst}.getState().done`) + ' / ' + val(`${inst}.getState().passed`));
    ok(c, inst + ' restore leaves the learner able to continue (never stranded)',
      val(`(function(){ var b=document.getElementById('${c === '05' ? 'dqA-btn-check' : 'tbl9-check'}');
            return b ? (b.disabled === false && b.textContent === 'המשך') : 'no-btn'; })()`) === true,
      String(val(`(function(){ var b=document.getElementById('${c === '05' ? 'dqA-btn-check' : 'tbl9-check'}');
            return b ? b.textContent + ' disabled=' + b.disabled : 'no-btn'; })()`)));

    /* CLAUDE.md rule 4 through the factory: with the solution displayed,
       placement holds the SOLUTION and only lastWrongPlacement holds the
       learner's. A round-trip must keep the two distinct. */
    exec(`window['${c === '05' ? 'dqA' : 'tbl9'}Reveal']();`);
    ok(c, inst + ' toggle shows the solution',
      val(`${inst}.getState().showingCorrect`) === true);
    exec('window.__snapR = capturePartPayload();');
    exec(`${inst}.setState({ placement: {}, attempts: 0, done: false, checked: false,
                             lastWrongPlacement: null, showingCorrect: false, passed: false });`);
    exec('applyResumeVars(window.__snapR); restoreScreenUI(' + screen + ');');
    ok(c, inst + ' toggle state survives the round-trip',
      val(`${inst}.getState().showingCorrect`) === true);
    ok(c, inst + ' keeps the learner\'s answer distinct from the displayed solution',
      val(`(function(){ var s=${inst}.getState();
            return s.lastWrongPlacement !== null &&
                   JSON.stringify(s.placement) !== JSON.stringify(s.lastWrongPlacement); })()`) === true,
      String(val(`JSON.stringify(${inst}.getState())`)).slice(0, 200));
  }

  if (c === '06') {
    exec("XAPI_Q_RESULTS['001/q1']=true; XAPI_Q_RESULTS['001/q2']=true; XAPI_Q_RESULTS['001/q3']=true;");
    ok(c, 'moed-B score reads 3 before capture', val('getMoedBScore()') === 3, String(val('getMoedBScore()')));
    exec('window.__snap = capturePartPayload();');
    exec("Object.keys(XAPI_Q_RESULTS).forEach(function(k){ delete XAPI_Q_RESULTS[k]; });");
    ok(c, 'the regression is real: moed-B score wipes to 0',
      val('getMoedBScore()') === 0, String(val('getMoedBScore()')));
    exec('applyResumeVars(window.__snap);');
    ok(c, 'restore returns the moed-B score', val('getMoedBScore()') === 3, String(val('getMoedBScore()')));
  }

  dom.window.close();
}

/* ── The library letter, and the state diagnostics it carries ─────────────
   The unit moved from xapi-720-j.js to -k.js. Two things must hold, and one of
   them fails SILENTLY, which is why it is asserted here rather than trusted:

   1. The letter gate regex must know the new letter. `XAPI_USING_G` is derived
      from a regex on the library filename and guards ALL item-level statements
      and video reporting — a letter missing from it silences them with no error
      whatsoever. This is the single most dangerous part of a letter migration.
   2. The diagnostic surface -k adds must actually be reachable, and every
      `reason` branch must be produced by the status it claims to describe. -j
      collapsed 404/401/412/413/422/0 into one bit, which is what made a failed
      platform run uninterpretable; a mapping that is wrong here would recreate
      that problem while looking like it had been fixed. */
function checkLibraryLetter() {
  const loader = fs.readFileSync(path.join(BASE, 'unit-js', '50-loader.js'), 'utf8');

  const libMatch = loader.match(/RESUME_ENABLED \? '(xapi-720-[a-z]\.js)'/);
  ok('lib', 'the loader names a resume-capable library build', !!libMatch,
    libMatch ? libMatch[1] : 'LIB720 selection not found');
  const letter = libMatch ? libMatch[1].match(/xapi-720-([a-z])\.js/)[1] : null;

  const gateMatch = loader.match(/\/xapi-720-\[([a-z]+)\]\\\.js\//);
  ok('lib', 'the letter gate regex is present', !!gateMatch,
    gateMatch ? gateMatch[1] : 'XAPI_USING_G regex not found');

  /* The failure this catches: bumping LIB720 without extending the gate. */
  ok('lib', 'the loaded letter is INSIDE the gate regex (else item statements go silent)',
    !!(letter && gateMatch && gateMatch[1].includes(letter)),
    'letter=' + letter + ' gate=[' + (gateMatch ? gateMatch[1] : '?') + ']');

  /* The stub filename is what the gate tests during a browser walk, so it must
     carry a letter the gate accepts too. */
  const stubs = fs.readdirSync(path.join(BASE, '_test')).filter(f => /^xapi-720-[a-z]\.js$/.test(f));
  ok('lib', 'exactly one local stub library exists', stubs.length === 1, stubs.join(','));
  const stubLetter = stubs.length === 1 ? stubs[0].match(/xapi-720-([a-z])\.js/)[1] : null;
  ok('lib', 'the stub letter is also inside the gate regex',
    !!(stubLetter && gateMatch && gateMatch[1].includes(stubLetter)),
    'stub=' + stubLetter);
  ok('lib', 'the stub letter matches the library the unit loads', stubLetter === letter,
    'stub=' + stubLetter + ' lib=' + letter);

  /* No lingering reference to the previous letter's stub path. */
  for (const rel of ['_test/README.md', 'docs-and-tools/RESUME.md', 'unit-js/50-loader.js']) {
    const txt = fs.readFileSync(path.join(BASE, rel), 'utf8');
    const stale = [...txt.matchAll(/_test\/xapi-720-([a-z])\.js/g)].map(m => m[1]).filter(l => l !== letter);
    ok('lib', rel + ' has no stale stub-path letter', stale.length === 0, stale.join(','));
  }
}

/* Every reason branch, driven through the stub's forced-status hook. Asserted
   against the SAME mapping the real library uses, so a green run here describes
   what will happen against Kata rather than something adjacent. */
async function checkStateDiagnostics() {
  const c = '01';
  const dir = path.join(BASE, 'methodica-science-mass-measure-02-' + c);
  const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), {
    url: 'http://localhost:8777/methodica-science-mass-measure-02-' + c +
         '/index.html?slxapi=1&registration=r1&xapiLib=../_test/xapi-720-k.js',
    runScripts: 'dangerously', pretendToBeVisual: true,
  });
  const w = dom.window;
  const { exec, val } = makeRunner(w);
  w.console.error = w.console.warn = w.console.log = function () {};
  w.fetch = function () { return Promise.resolve({ ok: true }); };
  w.HTMLMediaElement.prototype.load = function () {};
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};
  for (const src of [...w.document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'))) {
    const p = path.resolve(dir, src.split('?')[0]);
    if (fs.existsSync(p)) { try { exec(fs.readFileSync(p, 'utf8')); } catch (e) {} }
  }
  // Load the stub the way the loader would on localhost.
  exec(fs.readFileSync(path.join(BASE, '_test', 'xapi-720-k.js'), 'utf8'));

  ok('diag', 'stateLastResult720 is exposed',
    val('typeof window.stateLastResult720') === 'function');

  exec("_resumeReady = true; _unitState = emptyUnitState(); window.__reset();");

  /* A first read with nothing stored is `absent` and is SUCCESS, not failure.
     This is the case -j could not distinguish from a broken deployment. */
  exec('window.loadState720("execution-state");');
  ok('diag', 'a first read reports absent, and absent counts as ok',
    val("window.stateLastResult720().reason") === 'absent' &&
    val("window.stateLastResult720().ok") === true,
    JSON.stringify(val("JSON.stringify(window.stateLastResult720())")));

  exec('window.saveState720("execution-state", { v: 3 });');
  ok('diag', 'a successful write reports ok with a 2xx status',
    val("window.stateLastResult720().reason") === 'ok' &&
    val("window.stateLastResult720().status") >= 200 &&
    val("window.stateLastResult720().status") < 300);

  exec('window.loadState720("execution-state");');
  ok('diag', 'a read of a stored document reports ok',
    val("window.stateLastResult720().reason") === 'ok');

  /* Each documented status maps to its own name — the whole point of the change. */
  for (const [status, reason] of [[401, 'auth'], [413, 'too-large'], [412, 'stale'],
                                  [400, 'bad-address'], [422, 'validation'], [500, 'http-500']]) {
    exec('window.__failWrites(' + status + '); window.saveState720("execution-state", {});');
    ok('diag', 'status ' + status + ' reports reason "' + reason + '"',
      val("window.stateLastResult720().reason") === reason &&
      val("window.stateLastResult720().ok") === false,
      String(val("window.stateLastResult720().reason")));
  }
  exec('window.__failWrites(false);');

  dom.window.close();
}

/* ── The slug-case invariant ─────────────────────────────────────────────
   Every folder on disk is lowercase, and so is every reported id. Until
   2026-08-17 the cross-part navigation paths were not: they carried a capital
   first letter, which cost two distinct bugs.

   1. On a case-sensitive host (production is one; Windows is not, which is
      exactly why this suite passed over it for so long) every cross-part hop
      404s.
   2. currentPartSlug() derives the slug from location.pathname, so the case
      follows however the learner arrived. A capitalised URL yields a second
      key for the same component, splitting the resume document's parts[] and
      the completed-ledger — and a ledger that misses means a duplicate
      'completed' reaches the LRS.

   The check is a blunt whole-file scan rather than anything comment-aware, so
   prose in these files must describe the old spelling instead of quoting it. */
function checkSlugCase() {
  const files = [];
  for (const f of fs.readdirSync(path.join(BASE, 'unit-js'))) {
    if (f.endsWith('.js')) files.push(path.join('unit-js', f));
  }
  for (const c of COMPONENTS) {
    files.push(path.join('methodica-science-mass-measure-02-' + c, 'script.js'));
    files.push(path.join('methodica-science-mass-measure-02-' + c, 'index.html'));
  }
  for (const rel of files) {
    const txt = fs.readFileSync(path.join(BASE, rel), 'utf8');
    const hits = [...txt.matchAll(/Methodica/g)].length;
    ok('case', rel + ' has no capitalised unit slug', hits === 0, hits + ' occurrence(s)');
  }
}

(async () => {
  checkMetadata();
  checkVersionQueries();
  checkSlugCase();
  checkLibraryLetter();
  await checkStateDiagnostics();
  for (const c of COMPONENTS) await run(c);
  for (const [c, screen] of Object.entries(INBOUND_HASH)) await runHashLanding(c, screen);
  for (const c of COMPONENTS) await runResume(c);
  if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log('  ' + f)); }
  console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
