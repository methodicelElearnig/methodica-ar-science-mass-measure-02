/* Statement-flow probe — drives real learner actions against the REAL
   index.html + script.js + unit-js/*.js and asserts the statements that
   actually fire, with their ids and scores.

   This is the difference between "the code parses" and "the code reports".
   verify-report.js covers structure and the regression gate; this covers flow.

   Run:  NODE_PATH=<where jsdom is> node _test/statement-flow.js
   See _test/README.md — jsdom must NOT be installed inside this OneDrive tree. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE = process.argv[2] || path.join(__dirname, '..');
const PREFIX = 'https://lomdot.education.gov.il/metodica/720active/science/mass-measure/02/';

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) pass++;
  else { fail++; failures.push(name + (extra ? '  -> ' + extra : '')); }
}

function boot(comp) {
  const dir = path.join(BASE, 'methodica-science-mass-measure-02-' + comp);
  const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), {
    url: 'http://localhost:8777/methodica-science-mass-measure-02-' + comp + '/index.html',
    runScripts: 'dangerously', pretendToBeVisual: true,
  });
  const w = dom.window;
  w.console.error = w.console.warn = w.console.log = function () {};
  w.fetch = () => Promise.resolve({ ok: true });
  // jsdom does not implement these; the project calls video.play().catch(...)
  w.HTMLMediaElement.prototype.load = function () {};
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};

  const exec = (c) => {
    const s = w.document.createElement('script');
    s.textContent = c; w.document.body.appendChild(s); s.remove();
  };
  for (const src of [...w.document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'))) {
    const p = path.resolve(dir, src.split('?')[0]);
    if (fs.existsSync(p)) { try { exec(fs.readFileSync(p, 'utf8')); } catch (e) {} }
  }

  // Stand in for the CDN library, plus the metadata it would have fetched.
  w.__log = [];
  w.sendStatement720 = function (verb, type, result, opts) {
    w.__log.push({ verb, type, result, opts });
  };
  w.XAPI_USING_G = true;
  w.METADATA = JSON.parse(fs.readFileSync(
    path.join(BASE, 'metadata', 'methodica-science-mass-measure-02-' + comp + '.json'),
    'utf8').replace(/^﻿/, ''));

  /* Since 2026-08-17 the 'completed' ledger lives in the xAPI State document
     (unit-js/40-resume.js) rather than sessionStorage, so the dedupe assertions
     below need a document to exist. With no document the ledger deliberately
     fails OPEN and every repeat 'completed' goes out — that guarantee is
     asserted separately in verify-report.js §10(a). An in-memory store is enough
     here; the real transport is the CDN library, or _test/xapi-720-k.js for the
     browser walkthrough. */
  w.__store = null;
  w.loadState720 = function () { return w.__store ? JSON.parse(w.__store) : null; };
  w.saveState720 = function (id, doc) { w.__store = JSON.stringify(doc); return true; };
  w.saveState720Debounced = function (id, doc) { w.__store = JSON.stringify(doc); };
  exec('_resumeReady = true; _unitState = emptyUnitState();');

  const run = (code) => {
    w.__log = [];
    exec('try { ' + code + ' } catch (e) { window.__err = e && e.message; }');
    const err = w.__err; delete w.__err;
    return { log: w.__log.slice(), err };
  };
  /* Evaluate an expression in global scope and bring the value back. Needed for
     `let`/`const` file-scope bindings and for the routing helpers, which are not
     reachable as window properties. */
  const val = (expr) => {
    exec('window.__V = (function(){ try { return (' + expr + '); } ' +
         'catch (e) { return "__THREW__" + e.message; } })();');
    return w.__V;
  };
  return { w, exec, run, val, dir };
}

// ── component 01: the full item-scope + answered + scoring path ──────────
function probe01() {
  const C = '01';
  const { w, run } = boot(C);
  const item = (n) => PREFIX + 'methodica-science-mass-measure-02-01/' +
                      'methodica-science-mass-measure-02-01-' + n + '/';

  let r = run('goTo(1);');
  ok(C + ' entering screen 1 opens item 001',
    r.log.length === 1 && r.log[0].verb === 'initialized' &&
    r.log[0].opts.objectId === item('001'),
    JSON.stringify(r.log.map(s => s.verb + ':' + (s.opts && s.opts.objectId))));

  r = run('scqOpenHint();');
  ok(C + ' hint emits requested.1 under item 001',
    r.log.length === 1 && r.log[0].verb === 'requested.1' &&
    r.log[0].opts.parentId === item('001') &&
    r.log[0].opts.questionId === item('001') + 'q1');

  /* Once per question. The overlay closes via its button, a backdrop click and
     Escape, and every route leaves the hint button live — so before the dedup
     in xapiRequestedHint a learner who re-opened the hint sent requested.1
     again for the same (item, q). Closing first is what makes this the real
     re-open path rather than a no-op double call. */
  r = run('scqCloseHint(); scqOpenHint();');
  ok(C + ' re-opening the same hint emits nothing',
    r.log.length === 0,
    JSON.stringify(r.log.map(s => s.verb)));

  /* ...but a different question still reports. */
  r = run("xapiRequestedHint('002', 'q1');");
  ok(C + ' a different question still emits its own requested.1',
    r.log.length === 1 && r.log[0].verb === 'requested.1' &&
    r.log[0].opts.questionId === item('002') + 'q1',
    JSON.stringify(r.log.map(s => s.verb + ':' + (s.opts && s.opts.questionId))));

  /* ── companion video must not report ─────────────────────────────────────
     Every .mp4 in this unit is an avatar-* companion clip. xapiWireVideos used
     to wire EVERY <video>, and each avatar screen re-sources its clip on entry
     (video.load() + play()), which fires a pause then a play — i.e. a spurious
     paused/played pair on every entry, including "back" and resume. Only
     elements that opt in via data-xapi-report are wired now.
     currentTime is forced non-zero on purpose: the listeners bail when it is 0,
     so without this the assertion would pass on the guard rather than on the
     allowlist, and would keep passing if the allowlist were removed. */
  ok(C + ' the unit does have companion <video> elements',
    w.document.querySelectorAll('video').length > 0,
    String(w.document.querySelectorAll('video').length));
  ok(C + ' none of them opts into xAPI video reporting',
    w.document.querySelectorAll('video[data-xapi-report]').length === 0,
    String(w.document.querySelectorAll('video[data-xapi-report]').length));

  r = run("var _v = document.querySelector('video');" +
          "Object.defineProperty(_v, 'currentTime', { value: 5, configurable: true });" +
          "xapiWireVideos();" +
          "_v.dispatchEvent(new Event('pause'));" +
          "_v.dispatchEvent(new Event('play'));");
  ok(C + ' a companion video emits no paused/played',
    r.log.length === 0,
    JSON.stringify(r.log.map(s => s.verb)));

  /* A genuine content video, explicitly marked, still reports — and now
     carries the question ids the old objectId-less payload never had. */
  r = run("var _cv = document.createElement('video');" +
          "_cv.setAttribute('data-xapi-report', '002');" +
          "_cv.setAttribute('data-xapi-q', 'q1');" +
          "Object.defineProperty(_cv, 'currentTime', { value: 7, configurable: true });" +
          "document.body.appendChild(_cv);" +
          "xapiWireVideos();" +
          "_cv.dispatchEvent(new Event('pause'));" +
          "_cv.dispatchEvent(new Event('play'));");
  ok(C + ' a marked content video emits paused+played, with question ids',
    r.log.length === 2 && r.log[0].verb === 'paused' && r.log[1].verb === 'played' &&
    r.log[0].opts.questionId === item('002') + 'q1' &&
    r.log[0].opts.parentId === item('002'),
    JSON.stringify(r.log.map(s => s.verb + ':' + (s.opts && s.opts.questionId))));

  r = run('scqSelected = "b"; scqDone = false; scqAttempts = 0; scqCheck();');
  const wrong = r.log.find(s => s.verb.startsWith('answered'));
  ok(C + ' first wrong answer is "answered" (not .last)',
    wrong && wrong.verb === 'answered' && wrong.result.success === false,
    wrong && wrong.verb);
  ok(C + ' wrong answer carries the real Hebrew answer text',
    wrong && /[֐-׿]/.test(String(wrong.result.extensions.student_answer[0])),
    wrong && JSON.stringify(wrong.result.extensions));

  r = run('scqSelected = SCQ.correctId; scqDone = false; scqAttempts = 0; scqCheck();');
  const right = r.log.find(s => s.verb.startsWith('answered'));
  ok(C + ' correct answer is "answered.last" with scaled 1',
    right && right.verb === 'answered.last' && right.result.success === true &&
    right.result.score.scaled === 1, right && right.verb);

  r = run('goTo(2);');
  ok(C + ' leaving item 001 closes it and opens item 002',
    r.log.length === 2 && r.log[0].verb === 'completed' &&
    r.log[0].opts.objectId === item('001') &&
    r.log[1].verb === 'initialized' && r.log[1].opts.objectId === item('002'),
    JSON.stringify(r.log.map(s => s.verb)));

  r = run('goTo(3);');
  ok(C + ' paging INSIDE item 002 emits nothing', r.log.length === 0,
    JSON.stringify(r.log.map(s => s.verb)));

  r = run("stationProgress.q16='success'; stationProgress.q17='success';" +
          "stationProgress.q18='success'; stationProgress.q19='success';" +
          "stationProgress.q20='fail'; s20Continue();");
  const comp = r.log.find(s => s.type === 'onlinelesson');
  ok(C + ' component completed at 4 of 5 -> success, scaled 0.8',
    comp && comp.result.success === true && comp.result.score.scaled === 0.8,
    comp && JSON.stringify(comp.result));

  r = run('s20Continue();');
  ok(C + ' the ledger suppresses a repeat component completed',
    r.log.length === 0, JSON.stringify(r.log.map(s => s.verb)));
  w.close();
}

// ── component 02: the 4-part true/false item, and the two-set score ──────
function probe02() {
  const C = '02';
  const { w, run } = boot(C);

  let r = run("sq5Selected = {r1:'true', r2:'true', r3:'false', r4:'false'};" +
              "sq5Done = false; sq5Attempts = 0; sq5Check();");
  const qs = r.log.filter(s => s.verb.startsWith('answered'));
  ok(C + ' item 004 reports all four sub-questions separately',
    qs.length === 4, 'got ' + qs.length);
  ok(C + ' q1..q4 are distinct question ids',
    new Set(qs.map(s => s.opts.questionId)).size === 4);
  ok(C + ' each sub-question carries its OWN correctness (r3 wrong, rest right)',
    qs.length === 4 && qs[0].result.success === true && qs[1].result.success === true &&
    qs[2].result.success === false && qs[3].result.success === true,
    qs.map(s => s.result.success).join(','));

  /* success requires BOTH stated gates — basic >= 4/5 AND standard 2/2. That is
     the rule the source unit uses (methodica-math-scale-01-02:
     `getBasicPracticeScore() >= 3 && getAdvancedPracticeScore() >= 2`), and
     REPORT-XAPI.md §5 there states it explicitly. Three cases pin it: passing
     only the basic gate, only the standard gate, and both. */
  const setProgress = (basicPass, standardPass) =>
    "stationProgress2.q2='success'; stationProgress2.q3='success';" +
    "stationProgress2.q4='success'; stationProgress2.q5=" +
      (basicPass ? "'success'" : "'fail'") + ";" +
    "stationProgress2.q6='fail';" +
    "stationProgress3.q8='success'; stationProgress3.q9=" +
      (standardPass ? "'success'" : "'fail'") + ";";

  // basic 4/5, standard 1/2 -> the standard gate blocks it
  r = run(setProgress(true, false) + 'drag9Continue();');
  let comp = r.log.find(s => s.type === 'onlinelesson');
  ok(C + ' basic gate alone is NOT enough for success',
    comp && comp.result.success === false, comp && JSON.stringify(comp.result));
  ok(C + ' score spans all 7 exercises (5 of 7)',
    comp && Math.abs(comp.result.score.scaled - 5 / 7) < 1e-9,
    comp && String(comp.result.score.scaled));

  // basic 3/5, standard 2/2 -> the basic gate blocks it
  const b = boot(C);
  r = b.run(setProgress(false, true) + 'drag9Continue();');
  comp = r.log.find(s => s.type === 'onlinelesson');
  ok(C + ' standard gate alone is NOT enough for success',
    comp && comp.result.success === false, comp && JSON.stringify(comp.result));

  // both gates met -> success
  const b2 = boot(C);
  r = b2.run(setProgress(true, true) + 'drag9Continue();');
  comp = r.log.find(s => s.type === 'onlinelesson');
  ok(C + ' both gates met -> success, 6 of 7',
    comp && comp.result.success === true &&
    Math.abs(comp.result.score.scaled - 6 / 7) < 1e-9,
    comp && JSON.stringify(comp.result));

  w.close(); b.w.close(); b2.w.close();
}

// ── component 03: success, deliberately no score ─────────────────────────
function probe03() {
  const C = '03';
  const { w, run } = boot(C);
  const r = run('s1Continue();');
  const comp = r.log.find(s => s.type === 'onlinelesson');
  ok(C + ' off-computer task reports success with NO score',
    comp && comp.result.success === true && comp.result.score === undefined,
    comp && JSON.stringify(comp.result));
  w.close();
}

// ── component 05: completed on BOTH branches + the unit completed ────────
function probe05() {
  const C = '05';
  const { w, run, exec } = boot(C);

  // failure branch: neither part passed -> must still report the component
  /* Since v4 the moed results live in the state document (doc.results), not
     localStorage — see unit-js/40-resume.js. Seeding localStorage here would
     no longer reach the gate at all: getUnitResult treats an EXISTING
     doc.results as authoritative and never falls back, which is what makes
     ?resetState a real reset. boot() already installs an empty document, so
     the failure branch needs nothing seeded; cleared explicitly so the intent
     is on the page rather than inherited from emptyUnitState(). */
  exec("_unitState.results = {};");
  let r = run('dqB.onContinue();');
  let comp = r.log.find(s => s.type === 'onlinelesson' && s.verb === 'completed');
  ok(C + ' FAILURE path still reports the component completed',
    comp && comp.result.success === false && comp.result.score.scaled === 0,
    comp && JSON.stringify(comp.result));

  const { w: w2, run: run2, exec: exec2, val: val2 } = boot(C);
  exec2("setUnitResult('lomda_moedA_partA_result','pass');" +
        "setUnitResult('lomda_moedA_partB_result','pass');");
  r = run2('dqB.onContinue();');
  comp = r.log.find(s => s.type === 'onlinelesson' && s.verb === 'completed');
  ok(C + ' SUCCESS path reports success with scaled 1',
    comp && comp.result.success === true && comp.result.score.scaled === 1,
    comp && JSON.stringify(comp.result));

  /* The reason v4 exists: a learner continuing the same registration on a
     second computer has an EMPTY localStorage, and before v4 that made
     moedAFullyPassed() return false — routing a learner who passed moed A
     into Sain 06. The document alone must carry the gate. */
  exec2("try { localStorage.clear(); } catch (e) {} _unitState = readUnitState();");
  ok(C + ' moed A gate survives a device switch (document only, empty localStorage)',
    val2('moedAFullyPassed()') === true, String(val2('JSON.stringify(_unitState.results)')));
  ok(C + ' the character survives a device switch too',
    val2("(function(){ _unitState.ui.character = 'green'; " +
         "applyUnitProfile(_unitState); return window.lomdaState.selectedCharacter; })()") === 'green');

  r = run2('s4Finish();');
  const unit = r.log.find(s => s.opts && s.opts.objectId === w2.XAPI_UNIT_ID);
  ok(C + ' "סיימתי" reports the UNIT completed at the unit id',
    unit && unit.verb === 'completed' && unit.result.success === true,
    JSON.stringify(r.log.map(s => s.verb + ':' + (s.opts && s.opts.objectId))));

  r = run2('s4Finish();');
  ok(C + ' the ledger suppresses a repeat unit completed', r.log.length === 0,
    JSON.stringify(r.log.map(s => s.verb)));
  w.close(); w2.close();
}

// ── component 06: three graded questions, two terminal endings ───────────
function probe06() {
  const C = '06';
  const { w, run, exec } = boot(C);

  let r = run("s12Selected = S12_CORRECT_ID; s12Done = false; s12Attempts = 0; s12Check();");
  const a = r.log.find(s => s.verb.startsWith('answered'));
  ok(C + ' s12 reports item 001 / q3',
    a && /-001\/q3$/.test(a.opts.questionId) && a.result.success === true,
    a && a.opts.questionId);

  exec("setUnitResult('lomda_moedB_partA_step1_result','pass');" +
       "setUnitResult('lomda_moedB_partB_result','pass');");
  r = run('s12Continue();');
  const comp = r.log.find(s => s.type === 'onlinelesson' && s.verb === 'completed');
  ok(C + ' component completed fires at the routing decision',
    comp && comp.result.success === true, comp && JSON.stringify(comp.result));

  r = run('s14Finish();');
  const unit = r.log.find(s => s.opts && s.opts.objectId === w.XAPI_UNIT_ID);
  ok(C + ' success ending reports the unit completed (success)',
    unit && unit.result.success === true, JSON.stringify(r.log.map(s => s.verb)));

  // The other ending, in a fresh page, must report success:false.
  const { w: w2, run: run2 } = boot(C);
  const r2 = run2('s13Finish();');
  const unit2 = r2.log.find(s => s.opts && s.opts.objectId === w2.XAPI_UNIT_ID);
  ok(C + ' failure ending reports the unit completed with success:false',
    unit2 && unit2.result.success === false,
    unit2 && JSON.stringify(unit2.result));
  w.close(); w2.close();
}

/* ── conditional skip: passing component 01 bypasses the reinforcement part ──
   Screen 15 promises "4 שאלות (80%) לפחות", so passing routes straight to the
   class task in 03 and skips 02. That makes 03 reachable from two places, which
   is why the back edge exists — without it, 03's "חזרה" would send a learner
   who skipped 02 into content they never saw. */
function probeRouting() {
  const C = 'nav';

  /* The routing rule and the back-edge resolution are both split out of the
     navigation itself (practiceDestinationSlug / previousPartHref), precisely
     so they can be asserted without navigating — jsdom will not let
     location.href be stubbed. */
  const EDGE_KEY = 'lomda_nav_edges::methodica-science-mass-measure-02';

  const destAfter01 = (correct) => {
    const { w, exec, val } = boot('01');
    const set = ['q16', 'q17', 'q18', 'q19', 'q20']
      .map((k, i) => "stationProgress." + k + "='" + (i < correct ? 'success' : 'fail') + "';").join('');
    exec(set);
    const score = val('getPracticeScore()');
    const dest = val('practiceDestinationSlug()');
    // record the edge the same way s20Continue would, then read it back
    exec("recordForwardEdge(practiceDestinationSlug(), '#screen=19');");
    let edges = null;
    try { edges = JSON.parse(w.sessionStorage.getItem(EDGE_KEY)); } catch (e) {}
    w.close();
    return { score, dest, edges };
  };

  let r = destAfter01(5);
  ok(C + ' score 5 of 5 is read correctly', r.score === 5, String(r.score));
  ok(C + ' 5 of 5 -> skips 02, goes to 03',
    r.dest === 'methodica-science-mass-measure-02-03', r.dest);

  r = destAfter01(4);
  ok(C + ' 4 of 5 — exactly the promised threshold — skips 02',
    r.dest === 'methodica-science-mass-measure-02-03', r.dest);
  const edge = r.edges && r.edges['methodica-science-mass-measure-02-03'];
  ok(C + ' the back edge records 01 as 03\'s origin, returning to screen 20',
    edge && edge.from === 'methodica-science-mass-measure-02-01' && edge.hash === '#screen=19',
    JSON.stringify(r.edges));

  r = destAfter01(3);
  ok(C + ' 3 of 5 — below the threshold — goes to the reinforcement part 02',
    r.dest === 'methodica-science-mass-measure-02-02', r.dest);

  /* 03's back button must follow the edge, and fall back to 02 without one. */
  const backFrom03 = (edgeDoc) => {
    const { w, exec, val } = boot('03');
    exec(edgeDoc
      ? "try { sessionStorage.setItem('" + EDGE_KEY + "', " +
        JSON.stringify(JSON.stringify(edgeDoc)) + "); } catch (e) {}"
      : "try { sessionStorage.removeItem('" + EDGE_KEY + "'); } catch (e) {}");
    const href = val("previousPartHref('methodica-science-mass-measure-02-02', '#screen=8')");
    w.close();
    return href;
  };

  let href = backFrom03({ 'methodica-science-mass-measure-02-03':
    { from: 'methodica-science-mass-measure-02-01', hash: '#screen=19' } });
  ok(C + ' a learner who skipped 02 goes BACK to 01 screen 20',
    href === '../methodica-science-mass-measure-02-01/index.html#screen=19', href);

  href = backFrom03({ 'methodica-science-mass-measure-02-03':
    { from: 'methodica-science-mass-measure-02-02', hash: '#screen=8' } });
  ok(C + ' a learner who came through 02 goes BACK to 02 screen 9',
    href === '../methodica-science-mass-measure-02-02/index.html#screen=8', href);

  href = backFrom03(null);
  ok(C + ' with no edge recorded it falls back to the pre-change behaviour',
    href === '../methodica-science-mass-measure-02-02/index.html#screen=8', href);
}

probe01(); probe02(); probe03(); probe05(); probe06(); probeRouting();
if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log('  ' + f)); }
console.log('\n=== statement flow: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
