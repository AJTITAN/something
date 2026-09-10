/* Simulates two browsers talking to a fake Worker + D1, to prove:
   1. device 2 opening the #cf link adopts device 1's progress
   2. an empty device can never overwrite a store that has progress
   3. pressing "Connect backend" on device 2 reuses the id instead of forking
*/
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { webcrypto } = require('crypto');

const html = fs.readFileSync('index.html', 'utf8');
const DB = new Map();                     // the fake D1 table
const PINNED = '32fb0a92-1d40-42b7-b9b9-47ff6d363535';
let calls = { post: 0, put: 0, get: 0 };

function fakeFetch(url, opt = {}) {
  const u = String(url);
  const m = u.match(/\/blob(?:\/([^/?]+))?$/);
  const method = (opt.method || 'GET').toUpperCase();
  const ok = (body, status = 200) =>
    Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body), headers: { get: () => null } });
  if (!m) return ok({ error: 'not found' }, 404);
  const id = m[1];
  if (method === 'POST') { calls.post++; const nid = webcrypto.randomUUID(); DB.set(nid, opt.body); return ok({ id: nid }, 201); }
  if (method === 'GET') { calls.get++; if (!DB.has(id)) return ok({ error: 'nf' }, 404); return ok(JSON.parse(DB.get(id))); }
  if (method === 'PUT') { calls.put++; DB.set(id, opt.body); return ok({ ok: true }); }
  return ok({ error: 'bad' }, 405);
}

function boot(name, hash) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) console.log('  [' + name + ' error]', e.message); });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://ajtitan.github.io/something/' + (hash || ''),
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window;
  w.crypto = webcrypto;
  w.fetch = fakeFetch;
  return dom;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let pass = true;
  const check = (label, cond) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + label); if (!cond) pass = false; };

  // ---------- device 1: fresh, unlocks, connects, does work ----------
  const d1 = boot('d1');
  const w1 = d1.window;
  await wait(120);
  w1.document.querySelector('#pw').value = '1432';
  w1.document.querySelector('#pwGo').click();
  await wait(150);
  check('device 1 unlocked with the passcode', w1.document.querySelector('#app').hidden === false);

  const storeId = w1.eval('CF_STORE');
  w1.document.querySelector('#btnSync').click();
  await wait(80);
  const labels = [...w1.document.querySelectorAll('#dBody button')].map(b => b.textContent);
  check('no connect/disconnect controls exist', !labels.some(l => /Connect|Disconnect|gist/i.test(l)));
  check('URL carries no store hash', w1.location.hash === '');

  // do some work: complete a day
  await w1.eval(`
    const first = Object.keys(SCH.byDay || {})[0];
    (function(){
      const s = st(Object.keys(state.tasks||{})[0] || 'seed');
      state.tasks['t-demo'] = { s:'completed', p:0, done:'2026-09-10' };
      state.hol.push(3);
      reschedule();
    })();
  `);
  await wait(2200);
  const blob = JSON.parse(DB.get(storeId));
  check('progress uploaded', DB.size === 1 && !!(blob.d || blob.plain));
  console.log('        (payload is ' + (blob.d ? 'AES-GCM ciphertext' : 'plaintext — jsdom has no crypto.subtle; real browsers encrypt') + ')');

  // ---------- device 2: opens the link, empty local state ----------
  const d2 = boot('d2');   // plain URL, no hash
  const w2 = d2.window;
  await wait(120);
  w2.document.querySelector('#pw').value = '1432';
  w2.document.querySelector('#pwGo').click();
  await wait(700);
  const got = await w2.eval("JSON.stringify({t: Object.keys(state.tasks||{}), h: state.hol})");
  const g = JSON.parse(got);
  check('device 2 adopted the plan from a plain URL', g.t.includes('t-demo') && g.h.includes(3));
  check('device 2 did not fork the store', DB.size === 1);

  // ---------- device 2 empty-state overwrite attempt ----------
  const before = DB.get(storeId);
  await w2.eval("state.tasks = {}; state.hol = []; state.dayNote = {}; Sync.push();");
  await wait(500);
  check('an emptied device cannot wipe the store', DB.get(storeId) === before);

  // ---------- pressing Connect on device 2 reuses the id ----------
  const d3 = boot('d3');
  const w3 = d3.window;
  await wait(120);
  w3.document.querySelector('#pw').value = '1432';
  w3.document.querySelector('#pwGo').click();
  await wait(400);
  w3.document.querySelector('#btnSync').click();
  await wait(80);
  [...w3.document.querySelectorAll('#dBody button')].forEach(b => { if (/Sync now/.test(b.textContent)) b.click(); });
  await wait(500);
  check('no device can ever create a second store', DB.size === 1 && calls.post === 0);

  // ---------- log out ----------
  const d4 = boot('d4');
  const w4 = d4.window;
  await wait(120);
  w4.document.querySelector('#pw').value = '1432';
  w4.document.querySelector('#pwGo').click();
  await wait(700);
  const beforeLogout = DB.get(storeId);
  w4.document.querySelector('#btnLock').click();
  await wait(600);
  check('log out clears the unlocked flag', w4.localStorage.getItem('ej.open') === null);
  check('log out does not touch stored progress', DB.get(storeId) === beforeLogout);
  const back = boot('d5');
  await wait(200);
  check('the gate returns after logging out', back.window.document.querySelector('#app').hidden === true);
  back.window.crypto = webcrypto; back.window.fetch = fakeFetch;
  back.window.document.querySelector('#pw').value = '1432';
  back.window.document.querySelector('#pwGo').click();
  await wait(700);
  const after = JSON.parse(await back.window.eval("JSON.stringify(Object.keys(state.tasks||{}))"));
  check('logging back in restores the plan', after.includes('t-demo'));

  console.log(pass ? '\nALL PASS' : '\nFAILURES ABOVE');
  process.exit(pass ? 0 : 1);
})();
