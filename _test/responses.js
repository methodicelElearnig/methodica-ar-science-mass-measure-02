/* result.response = Kata's correctXapiResponsesPattern, character by character (MOE runbook checks
   10.11.26, QA/2026-11-10_moe-runbook-checks/REPORT.md; Phase 6 lane 3).

   Live (11.11) this unit sent multi-selects in click order joined with ', ', 'dd8-1=ברוטו | …',
   'dqA-target-1=41 | …', 'bruto: … | neto: …', 's18-input-1=750 | …', the glossary tooltip glued into
   06 q3, and 05-001 q3, which Hebrew Kata no longer has.

   Every graded question of every component is answered here through its real check function, in a
   fresh jsdom page:
     1. the correct answer → one answered.last per question, success:true, response ∈ the pattern in
        metadata/ (Kata's, or the proposal for a question Kata has none for — see DEPLOY.md);
        multi-selects also in the reverse click order;
     2. a wrong answer → still metadata text in the xAPI form (no DOM id, no ' | '), not the pattern;
     3. no '[xAPI]' warning on a correct answer, no page error;
   and every metadata question is walked, and no answered goes to a question metadata/ does not have.

     NODE_PATH=/tmp/lomda-test/node_modules node _test/responses.js [package dir]
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE = process.argv[2] || path.join(__dirname, '..');
const UNIT_SLUG = fs.readdirSync(path.join(BASE, 'metadata')).find((f) => f.endsWith('_unit.json')).replace('_unit.json', '');
const COMPONENTS = ['01', '02', '04', '05', '06'];
const read = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
const q = JSON.stringify;

let pass = 0;
const failures = [];
function ok(scope, name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push('  [' + scope + '] ' + name + (detail ? '\n      -> ' + detail : ''));
}

const META = {};
for (const c of COMPONENTS) META[c] = JSON.parse(read(path.join(BASE, 'metadata', UNIT_SLUG + '-' + c + '.json')));
const metaQ = (c, key) => {
  for (const it of META[c].subContent) for (const qq of it.questions || []) if (qq.questionId.replace(/\/+$/, '').endsWith('-' + key)) return qq;
  return null;
};

function boot(c) {
  const dir = path.join(BASE, UNIT_SLUG + '-' + c);
  const dom = new JSDOM(read(path.join(dir, 'index.html')), {
    url: 'http://localhost:8777/' + UNIT_SLUG + '-' + c + '/index.html', runScripts: 'dangerously', pretendToBeVisual: true,
  });
  const w = dom.window;
  const errors = [], warns = [];
  w.console.error = (...a) => errors.push(a.map(String).join(' '));
  w.console.warn = (...a) => warns.push(a.map(String).join(' '));
  w.console.log = () => {};
  w.fetch = () => Promise.resolve({ ok: true });
  w.HTMLMediaElement.prototype.load = function () {};
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};
  const exec = (code) => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); s.remove(); };
  for (const src of [...w.document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'))) {
    const p = path.resolve(dir, src.split('?')[0]);
    if (fs.existsSync(p)) { try { exec(read(p)); } catch (e) { errors.push(e.message); } }
  }
  w.__log = [];
  w.sendStatement720 = function (verb, type, result, opts) { w.__log.push({ verb, result, opts }); };
  w.XAPI_USING_G = true;
  w.METADATA = META[c];
  w.__stores = {};
  w.loadState720 = (id) => (w.__stores[id] ? JSON.parse(w.__stores[id]) : null);
  w.saveState720 = (id, doc) => { w.__stores[id] = JSON.stringify(doc); return true; };
  w.saveState720Debounced = (id, doc) => { w.__stores[id] = JSON.stringify(doc); };
  exec('_resumeReady = true; _unitState = emptyUnitState();');
  const val = (expr) => { exec('window.__V = (function(){ try { return (' + expr + '); } catch (e) { return "__THREW__" + e.message; } })();'); return w.__V; };
  const run = (code) => exec('try { ' + code + ' } catch (e) { console.error("harness: " + e.message); }');
  return { w, val, run, errors, warns, close: () => w.close() };
}

/* ── drivers: (P, which) puts the 'correct' / 'wrong' answer on the page and checks it ── */
const scq = (v, cfg) => (P, which) => {
  const correct = P.val(cfg + '.correctId');
  const ids = P.val('[].slice.call(document.querySelectorAll(".scq-opt[data-id]")).filter(function (e) { return ' + v + 'OptEl(e.getAttribute("data-id")) === e; }).map(function (e) { return e.getAttribute("data-id"); })');
  const pick = which === 'correct' ? correct : ids.find((x) => x !== correct);
  P.run(v + 'Selected = ' + q(pick) + '; ' + v + 'Check();');
};
const mcq = (v, cfg, order) => (P, which) => {
  const correct = P.val(cfg + '.correctIds.slice()');
  let set = which === 'correct' ? correct.slice() : [correct[0], ['a', 'b', 'c', 'd'].find((x) => !correct.includes(x))];
  if (order === 'reverse') set = set.reverse();
  P.run(v + 'Selected = ' + q(set) + '; ' + v + 'Check();');
};
const zones = (prefix, check) => (P, which) => {
  P.run('(function(){ var items = [].slice.call(document.querySelectorAll("[data-correct]")).filter(function (e) { return e.id.indexOf(' + q(prefix) + ') === 0; });' +
    ' var dest = items.map(function (e) { return e.getAttribute("data-correct"); });' +
    (which === 'wrong' ? ' var j = dest.findIndex(function (d) { return d !== dest[0]; }); var t = dest[0]; dest[0] = dest[j]; dest[j] = t;' : '') +
    ' items.forEach(function (e, i) { document.getElementById(' + q(prefix + '-zone-') + ' + dest[i]).appendChild(e); }); })();' + check + '();');
};
const dropdowns = (values, correct, check) => (P, which) => {
  P.run(values + ' = Object.assign({}, ' + correct + ');' +
    (which === 'wrong' ? ' (function(){ var k = Object.keys(' + values + '); var t = ' + values + '[k[0]]; ' + values + '[k[0]] = ' + values + '[k[1]] === t ? ' + values + '[k[2]] : ' + values + '[k[1]]; })();' : '') +
    check + '();');
};
const inputs = (answers, check) => (P, which) => {
  P.run('Object.keys(' + answers + ').forEach(function (id, i) { document.getElementById(id).value = (i === 0 && ' + q(which === 'wrong') + ') ? String(Number(' + answers + '[id]) + 1) : ' + answers + '[id]; });' + check + '();');
};
const factory = (c, inst) => {
  const src = read(path.join(BASE, UNIT_SLUG + '-' + c, 'script.js'));
  const m = new RegExp('const ' + inst + ' = makeDragQuestion\\(\\{[\\s\\S]*?checkBtnId: \'([^\']+)\'[\\s\\S]*?correctMap: \\{([\\s\\S]*?)\\}').exec(src);
  const pairs = [...m[2].matchAll(/'([^']+)':\s*'([^']+)'/g)].map((x) => [x[1], x[2]]);   // target -> drag
  return (P, which) => {
    const place = {};
    pairs.forEach(([t, d], i) => { place[d] = t; });
    if (which === 'wrong') { const [t0, d0] = pairs[0], [t1, d1] = pairs[1]; place[d0] = t1; place[d1] = t0; }
    P.run(inst + '.reset(); ' + inst + '.setState({ placement: ' + q(place) + ' }); ' + inst + '.restoreUI(); document.getElementById(' + q(m[1]) + ').onclick();');
  };
};

/* component → [ name, metadata keys, driver, multi-select? ] */
const QUESTIONS = {
  '01': [
    ['scq', ['001/q1'], scq('scq', 'SCQ')], ['scq4', ['002/q1'], scq('scq4', 'SCQ4')],
    ['s5 zones', ['003/q1'], zones('s5', 's5Check')], ['scq8', ['004/q1'], scq('scq8', 'SCQ8')],
    ['s9 zones', ['005/q1'], zones('s9', 's9Check')], ['scq10', ['006/q1'], scq('scq10', 'SCQ10')],
    ['scq13', ['008/q1'], scq('scq13', 'SCQ13')], ['scq14 multi', ['009/q1'], mcq('scq14', 'MCQ14'), 'scq14/MCQ14'],
    ['scq16', ['010/q1'], scq('scq16', 'SCQ16')], ['scq17', ['011/q1'], scq('scq17', 'SCQ17')],
    ['s18 fields', ['012/q1'], inputs('S18_ANSWERS', 's18Check')], ['s19 dropdowns', ['013/q1'], dropdowns('s19DdValues', 'S19_CORRECT', 's19Check')],
    ['s20 zones', ['014/q1'], zones('s20', 's20Check')],
  ],
  '02': [
    ['sq2 multi', ['001/q1'], mcq('sq2', 'MCQ_SQ2'), 'sq2/MCQ_SQ2'], ['sq3 multi', ['002/q1'], mcq('sq3', 'MCQ_SQ3'), 'sq3/MCQ_SQ3'],
    ['sq4 multi', ['003/q1'], mcq('sq4', 'MCQ_SQ4'), 'sq4/MCQ_SQ4'],
    ['sq5 true/false', ['004/q1', '004/q2', '004/q3', '004/q4'], (P, which) => P.run(
      "['r1','r2','r3','r4'].forEach(function (r, i) { var v = TF_SQ5_CORRECT[r]; if (" + q(which === 'wrong') + " && i === 0) v = v === 'true' ? 'false' : 'true'; sq5Select(i + 1, v); }); sq5Check();")],
    ['sq6 multi', ['005/q1'], mcq('sq6', 'MCQ_SQ6'), 'sq6/MCQ_SQ6'],
    ['dd8 dropdowns', ['006/q1'], dropdowns('dd8Values', 'DD8_CORRECT', 'dd8Check')],
    ['drag9 zones', ['007/q1'], zones('drag9', 'drag9Check')],
  ],
  '04': [
    ['tbl table', ['001/q1'], (P, which) => P.run('tblDdValues = Object.assign({}, TBL_DD_CORRECT);' +
      'Object.keys(TBL_INPUT_CORRECT).forEach(function (id) { document.getElementById(id).value = TBL_INPUT_CORRECT[id]; });' +
      (which === 'wrong' ? "tblDdValues['tblA-dd-1'] = tblDdValues['tblA-dd-3'];" : '') + 'tblCheck();')],
  ],
  '05': [],    // filled below: the questions dqA / dqB answer depend on the language's metadata
  '06': [
    ['tbl9Q drag', ['001/q1'], factory('06', 'tbl9Q')], ['para10Q drag', ['001/q2'], factory('06', 'para10Q')],
    ['s12 choice', ['001/q3'], (P, which) => P.run('s12Selected = ' + (which === 'correct' ? 'S12_CORRECT_ID' : "(S12_CORRECT_ID === 's12-opt-a' ? 's12-opt-b' : 's12-opt-a')") + '; s12Check();')],
  ],
};
QUESTIONS['05'] = [['dqA drag', ['001/q1'], factory('05', 'dqA')],
  ['dqB drag', metaQ('05', '001/q3') ? ['001/q2', '001/q3'] : ['001/q2'], factory('05', 'dqB')]];

const answeredFor = (log, key) => log.filter((s) => /^answered/.test(s.verb) && String((s.opts || {}).questionId || '').replace(/\/+$/, '').endsWith('-' + key));
const sent = (s) => (s.result.response != null ? String(s.result.response) : ((s.result.extensions || {}).student_answer || []).join(' | '));
function wellFormed(qq, resp) {
  if (/\S=\S|\s\|\s|->|(dq[AB]|tbl[AB]|dd8|s1[89]|para10|tbl9)-/.test(resp)) return false;
  if (qq.questionType === 'choice') return resp.split('[,]').every((x) => qq.answers.includes(x));
  if (qq.questionType === 'true-false') return resp === 'true' || resp === 'false';
  if (qq.questionType === 'matching') return resp.split('[,]').every((p) => qq.answers.source.includes(p.split('[.]')[0]));
  return true;
}

for (const c of COMPONENTS) {
  for (const [name, keys, drive, multi] of QUESTIONS[c]) {
    const scope = c + ' ' + name;
    const qs = keys.map((k) => metaQ(c, k));
    ok(scope, 'metadata has ' + keys.join(' ') + ' with a pattern', qs.every((x) => x && Array.isArray(x.correctXapiResponsesPattern) && x.correctXapiResponsesPattern.length > 0),
       keys.filter((k, i) => !qs[i] || !(qs[i].correctXapiResponsesPattern || []).length).join(' '));
    if (!qs.every(Boolean)) continue;
    const runs = [['correct', drive]];
    if (multi) { const [v, cfg] = multi.split('/'); runs.push(['correct', mcq(v, cfg, 'reverse'), ' (reverse click order)']); }
    runs.push(['wrong', drive]);
    for (const [which, d, tag] of runs) {
      const P = boot(c);
      const sc = scope + ' ' + which + (tag || '');
      d(P, which);
      const log = P.w.__log;
      keys.forEach((k, i) => {
        const got = answeredFor(log, k);
        const pat = qs[i].correctXapiResponsesPattern;
        if (which === 'correct') {
          ok(sc, k + ': one answered.last, success', got.length === 1 && got[0].verb === 'answered.last' && got[0].result.success === true, q(got.map((s) => [s.verb, s.result.success])));
          ok(sc, k + ': response is the pattern exactly', got.length === 1 && pat.includes(sent(got[0])), q(got.length ? sent(got[0]) : null) + ' vs ' + q(pat));
        } else if (got.length) {
          ok(sc, k + ': response in the xAPI form, metadata text', wellFormed(qs[i], sent(got[0])), q(sent(got[0])));
          if (got[0].result.success === false) ok(sc, k + ': a wrong answer is not the pattern', !pat.includes(sent(got[0])), q(sent(got[0])));
        }
      });
      const known = new Set(); for (const it of META[c].subContent) for (const qq of it.questions || []) known.add(qq.questionId);
      const stray = log.filter((s) => /^answered/.test(s.verb) && !known.has((s.opts || {}).questionId));
      ok(sc, 'no answered to a question metadata/ does not have', stray.length === 0, q(stray.map((s) => (s.opts || {}).questionId)));
      if (which === 'correct') ok(sc, 'no [xAPI] warning', !P.warns.some((s) => /\[xAPI\]/.test(s)), P.warns.filter((s) => /\[xAPI\]/.test(s)).slice(0, 2).join(' | '));
      ok(sc, 'no page error', P.errors.length === 0, P.errors.slice(0, 2).join(' | '));
      P.close();
    }
  }
  /* coverage: every metadata question with a pattern is walked */
  const walked = new Set(QUESTIONS[c].flatMap((x) => x[1]));
  for (const it of META[c].subContent) for (const qq of it.questions || []) {
    const p = qq.questionId.replace(/\/+$/, '').split('/');
    const key = p[p.length - 2].slice(-3) + '/' + p[p.length - 1];
    if (c === '01' && key === '007/q1') continue;   // the memory game: no answered by design (not in XAPI_EVAL_ITEMS)
    ok(c, 'question ' + key + ' is walked', walked.has(key));
  }
}

console.log('\nresponses (' + UNIT_SLUG + '): ' + pass + ' passed, ' + failures.length + ' failed');
if (failures.length) { console.log(failures.join('\n')); process.exitCode = 1; }
