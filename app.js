/* ==========================================================================
   HEROS NOTEBOOK 1.0.0 — Jupyter viewer + runner. Fast, local, free.
   Design copied from Heros PDF studio. Zero frameworks, zero build step.
   Part 1: helpers, state, shell (toast/modal/menu/palette), theme, IDB,
           markdown-lite, sanitize, code tint, output renderers.
   ========================================================================== */
(function () {
'use strict';

/* ---------------- 0. helpers ---------------- */
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
function fmtBytes(b) {
  if (b == null) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}
function timeAgo(ts) {
  var s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(ts).toLocaleDateString();
}
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  function p(n) { return String(n).padStart(2, '0'); }
  return h > 0 ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
}
function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function joinSrc(src) {
  if (src == null) return '';
  if (Array.isArray(src)) return src.join('');
  return String(src);
}
function splitSrc(s) {
  s = String(s == null ? '' : s);
  if (s === '') return [];
  var lines = s.split('\n');
  var out = [];
  for (var i = 0; i < lines.length; i++) out.push(lines[i] + (i < lines.length - 1 ? '\n' : ''));
  return out;
}
function oneLine(s, n) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return s.length > (n || 90) ? s.slice(0, n || 90) + '…' : s;
}
function inEditable() {
  var el = document.activeElement;
  if (!el) return false;
  var t = (el.tagName || '').toLowerCase();
  return t === 'input' || t === 'textarea' || t === 'select' || el.isContentEditable;
}

window.addEventListener('error', function (e) {
  try {
    var f = String(e.filename || '');
    if (f.indexOf('app.js') === -1 && f.indexOf('viewer.html') === -1) return;
    var msg = String(e.message || 'unknown error').slice(0, 160);
    if (typeof toast === 'function') toast('Error: ' + msg, 'err', 5000);
  } catch (_) {}
});
window.addEventListener('unhandledrejection', function (e) {
  try {
    var msg = String((e.reason && e.reason.message) || e.reason || 'unknown').slice(0, 160);
    if (/ResizeObserver|AbortError/i.test(msg)) return;
    if (typeof toast === 'function') toast('Action failed: ' + msg, 'err', 5000);
  } catch (_) {}
});

/* ---------------- 1. DOM refs ---------------- */
var D = {
  viewer: $('#viewer'), nbScroll: $('#nbScroll'), nbMeta: $('#nbMeta'),
  trustBar: $('#trustBar'), trustText: $('#trustText'), btnTrust: $('#btnTrust'),
  cells: $('#cells'), empty: $('#empty'),
  sidebar: $('#sidebar'), sideBackdrop: $('#sideBackdrop'),
  cellNav: $('#cellNav'), cellsCountPill: $('#cellsCountPill'),
  swShowCode: $('#swShowCode'), swShowOut: $('#swShowOut'), swLineNums: $('#swLineNums'),
  outlineList: $('#outlineList'), outlineCount: $('#outlineCount'),
  searchBox: $('#searchBox'), searchInput: $('#searchInput'), searchClear: $('#searchClear'),
  swCase: $('#swCase'), swWhole: $('#swWhole'), btnSearchExport: $('#btnSearchExport'),
  searchMeta: $('#searchMeta'), searchCount: $('#searchCount'),
  searchResults: $('#searchResults'), searchPrev: $('#searchPrev'), searchNext: $('#searchNext'),
  recentList: $('#recentList'), btnClearRecent: $('#btnClearRecent'),
  swDisplay: $('#swDisplay'), btnSwStart: $('#btnSwStart'), btnSwLap: $('#btnSwLap'),
  btnSwReset: $('#btnSwReset'), swLaps: $('#swLaps'),
  counterName: $('#counterName'), counterStep: $('#counterStep'), btnCounterAdd: $('#btnCounterAdd'),
  counterList: $('#counterList'),
  todoSeg: $('#todoSeg'), todoInput: $('#todoInput'), todoPrio: $('#todoPrio'),
  btnTodoAdd: $('#btnTodoAdd'), todoList: $('#todoList'),
  btnTodoExport: $('#btnTodoExport'), btnTodoClearDone: $('#btnTodoClearDone'),
  habitName: $('#habitName'), btnHabitAdd: $('#btnHabitAdd'), habitList: $('#habitList'),
  btnLint: $('#btnLint'), btnSummary: $('#btnSummary'), btnKeywords: $('#btnKeywords'),
  btnReadability: $('#btnReadability'), btnCopyOutline: $('#btnCopyOutline'),
  btnCopyStats: $('#btnCopyStats'), labResults: $('#labResults'),
  avatar: $('#avatar'), profileName: $('#profileName'), profileSub: $('#profileSub'),
  btnProfile: $('#btnProfile'),
  stDocs: $('#stDocs'), stCells: $('#stCells'), stStreak: $('#stStreak'), stRender: $('#stRender'),
  fontSize: $('#fontSize'), fontSizeLbl: $('#fontSizeLbl'),
  swResume: $('#swResume'), swAutoFile: $('#swAutoFile'), swAutoWeb: $('#swAutoWeb'),
  accentRow: $('#accentRow'), bmList: $('#bmList'),
  noteInput: $('#noteInput'), btnNoteAdd: $('#btnNoteAdd'), notesList: $('#notesList'),
  btnBackup: $('#btnBackup'), btnRestore: $('#btnRestore'),
  kvSaved: $('#kvSaved'), kvRenderMs: $('#kvRenderMs'),
  btnSidebar: $('#btnSidebar'), btnOpen: $('#btnOpen'),
  fileTag: $('#fileTag'), fileTagName: $('#fileTagName'),
  cellInput: $('#cellInput'), cellTotal: $('#cellTotal'),
  btnCellPrev: $('#btnCellPrev'), btnCellNext: $('#btnCellNext'),
  btnRun: $('#btnRun'), btnRunAll: $('#btnRunAll'), btnAddCode: $('#btnAddCode'), btnAddMd: $('#btnAddMd'),
  kernelPill: $('#kernelPill'), kernelLabel: $('#kernelLabel'),
  btnSearch: $('#btnSearch'), btnPalette: $('#btnPalette'),
  btnTheme: $('#btnTheme'), themeIcon: $('#themeIcon'), btnMenu: $('#btnMenu'),
  btnCellAddTop: $('#btnCellAddTop'), btnCellAddMd: $('#btnCellAddMd'),
  filePermTip: $('#filePermTip'),
  statusDot: $('#statusDot'), statusText: $('#statusText'),
  sbCells: $('#sbCells'), sbExec: $('#sbExec'), sbFile: $('#sbFile'),
  sbRun: $('#sbRun'), sbAdd: $('#sbAdd'), sbPalette: $('#sbPalette'),
  sbPresent: $('#sbPresent'), sbTheme: $('#sbTheme'), sbTop: $('#sbTop'),
  dropOverlay: $('#dropOverlay'), progress: $('#progress'), progressBar: $('#progressBar'),
  menu: $('#menu'), toasts: $('#toasts'),
  modalBackdrop: $('#modalBackdrop'), modal: $('#modal'),
  selBar: $('#selBar'),
  btnVarsRefresh: $('#btnVarsRefresh'), varsList: $('#varsList'),
  pySnips: $('#pySnips'), mdSnips: $('#mdSnips'), snipCount: $('#snipCount'),
  btnTableBuilder: $('#btnTableBuilder'), btnChartWizard: $('#btnChartWizard'),
  btnPipManager: $('#btnPipManager'), btnPlotGallery: $('#btnPlotGallery'),
  profileColorRow: $('#profileColorRow'), swMotion: $('#swMotion'), runHist: $('#runHist'),
  fileInput: $('#fileInput'), restoreInput: $('#restoreInput'),
  kernelFrame: null
};

/* ---------------- 2. prefs + state ---------------- */
var PREF_KEY = 'herosnb-prefs-v1';
var defaults = {
  theme: 'dark', accent: '#f59e0b', sideW: 308,
  fontSize: 15, docW: 'comfort',
  pageMode: 'off', resume: true, showCode: true, showOut: true, lineNums: true,
  autoFile: true, autoWeb: true, trusted: {},
  profileName: 'My Studio', profileColor: '#f59e0b',
  motion: true, showVars: true,
  goalDaily: 5
};
var P = {};
try { P = Object.assign({}, defaults, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); }
catch (e) { P = Object.assign({}, defaults); }
if (!P.trusted || typeof P.trusted !== 'object') P.trusted = {};
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(P)); } catch (e) {} }

var S = {
  nb: null, fileName: '', fileSize: 0, docId: null,
  active: 0, execCounter: 0, dirty: false,
  headings: [], navItems: [],
  searchResults: [], searchCursor: -1, searchCase: false, searchWhole: false,
  bookmarks: {}, notes: {}, marks: {},
  readSecs: {}, readTick: null,
  stats: { docs: 0, cellsRun: 0, streak: 0, lastDay: '' },
  undoStack: [], redoStack: [], cellClip: null,
  vars: [], runHist: [],
  kernel: { state: 'off', pending: {}, seq: 0, ready: false },
  todos: [], counters: [], habits: {},
  sw: { running: false, base: 0, startTs: 0, laps: [] },
  todoFilter: 'open'
};
try { S.bookmarks = JSON.parse(localStorage.getItem('herosnb-bm-v1') || '{}'); } catch (e) { S.bookmarks = {}; }
try { S.notes = JSON.parse(localStorage.getItem('herosnb-notes-v1') || '{}'); } catch (e) { S.notes = {}; }
try { S.marks = JSON.parse(localStorage.getItem('herosnb-marks-v1') || '{}'); } catch (e) { S.marks = {}; }
try { S.readSecs = JSON.parse(localStorage.getItem('herosnb-read-v1') || '{}'); } catch (e) { S.readSecs = {}; }
try { S.stats = Object.assign(S.stats, JSON.parse(localStorage.getItem('herosnb-stats-v1') || '{}')); } catch (e) {}
try { S.todos = JSON.parse(localStorage.getItem('herosnb-todos-v1') || '[]'); if (!Array.isArray(S.todos)) S.todos = []; } catch (e) { S.todos = []; }
try { S.counters = JSON.parse(localStorage.getItem('herosnb-counters-v1') || '[]'); if (!Array.isArray(S.counters)) S.counters = []; } catch (e) { S.counters = []; }
try { S.habits = JSON.parse(localStorage.getItem('herosnb-habits-v1') || '{}'); } catch (e) { S.habits = {}; }
try {
  var sw0 = JSON.parse(localStorage.getItem('herosnb-sw-v1') || 'null');
  if (sw0 && Array.isArray(sw0.laps)) S.sw = { running: false, base: sw0.base || 0, startTs: 0, laps: sw0.laps.slice(-50) };
} catch (e) {}
function saveStats() { try { localStorage.setItem('herosnb-stats-v1', JSON.stringify(S.stats)); } catch (e) {} }
function saveMarks() {
  try { localStorage.setItem('herosnb-bm-v1', JSON.stringify(S.bookmarks)); } catch (e) {}
  try { localStorage.setItem('herosnb-notes-v1', JSON.stringify(S.notes)); } catch (e) {}
  try { localStorage.setItem('herosnb-marks-v1', JSON.stringify(S.marks)); } catch (e) {}
  try { localStorage.setItem('herosnb-read-v1', JSON.stringify(S.readSecs)); } catch (e) {}
}
function savePower() {
  try { localStorage.setItem('herosnb-todos-v1', JSON.stringify(S.todos.slice(-500))); } catch (e) {}
  try { localStorage.setItem('herosnb-counters-v1', JSON.stringify(S.counters.slice(-60))); } catch (e) {}
  try { localStorage.setItem('herosnb-habits-v1', JSON.stringify(S.habits)); } catch (e) {}
  try { localStorage.setItem('herosnb-sw-v1', JSON.stringify({ base: swElapsed(), laps: S.sw.laps.slice(-50) })); } catch (e) {}
  try { if (D.kvSaved) D.kvSaved.textContent = new Date().toLocaleTimeString(); } catch (e2) {}
}

/* ---------------- 3. toast / status / progress ---------------- */
function toast(msg, type, ms) {
  var el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  var ic = type === 'err' ? 'i-alert' : type === 'ok' ? 'i-check' : 'i-info';
  el.innerHTML = '<svg class="ic"><use href="#' + ic + '"/></svg><span>' + esc(msg) + '</span>';
  D.toasts.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0'; el.style.transform = 'translateY(6px)';
    setTimeout(function () { el.remove(); }, 260);
  }, ms || 2600);
}
function setStatus(text, kind) {
  D.statusText.textContent = text;
  D.statusDot.className = 'dot' + (kind ? ' ' + kind : '');
}
var progressTimer = null;
function showProgress(pct) {
  D.progress.classList.remove('done');
  D.progressBar.style.width = clamp(pct, 0, 100) + '%';
  clearTimeout(progressTimer);
}
function hideProgress() {
  D.progressBar.style.width = '100%';
  D.progress.classList.add('done');
  clearTimeout(progressTimer);
  progressTimer = setTimeout(function () { D.progressBar.style.width = '0%'; }, 350);
}

/* ---------------- 4. modal + menu + palette ---------------- */
var modalCloseCb = null;
function openModal(opts) {
  D.modal.className = 'modal' + (opts.wide ? ' features-win' : '') + (opts.palette ? ' palette' : '');
  D.modal.innerHTML =
    '<div class="modal-head"><svg class="ic ic-lg"><use href="#' + (opts.icon || 'i-info') + '"/></svg>' +
    '<h3>' + esc(opts.title || '') + '</h3>' +
    '<button class="ibtn" data-close="1" title="Close (Esc)"><svg class="ic"><use href="#i-x"/></svg></button></div>' +
    '<div class="modal-body">' + (opts.html || '') + '</div>' +
    (opts.footer === false ? '' : '<div class="modal-foot">' + (opts.footer || '<button class="btn" data-close="1">Close</button>') + '</div>');
  D.modalBackdrop.classList.add('show');
  modalCloseCb = opts.onClose || null;
  $$('[data-close]', D.modal).forEach(function (b) { b.addEventListener('click', closeModal); });
  if (opts.onMount) opts.onMount(D.modal);
  var f = D.modal.querySelector('input,textarea');
  if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 30);
}
function closeModal() {
  D.modalBackdrop.classList.remove('show');
  D.modal.innerHTML = '';
  if (modalCloseCb) { var cb = modalCloseCb; modalCloseCb = null; cb(); }
}
D.modalBackdrop.addEventListener('mousedown', function (e) { if (e.target === D.modalBackdrop) closeModal(); });

var menuOpen = false;
function openMenu(anchor, items) {
  var html = '';
  items.forEach(function (it, idx) {
    if (it.sep) { html += '<div class="menu-sep"></div>'; return; }
    if (it.label) { html += '<div class="menu-label">' + esc(it.label) + '</div>'; return; }
    html += '<button class="menu-item" data-idx="' + idx + '"' + (it.disabled ? ' disabled' : '') + '>' +
      '<svg class="ic"><use href="#' + (it.icon || 'i-info') + '"/></svg>' +
      '<span class="lbl">' + esc(it.text) + '</span>' +
      (it.checked ? '<svg class="ic tick"><use href="#i-check"/></svg>' : '') +
      (it.kbd ? '<span class="kbd">' + esc(it.kbd) + '</span>' : '') + '</button>';
  });
  D.menu.innerHTML = html;
  D.menu.classList.add('show');
  menuOpen = true;
  var r = anchor.getBoundingClientRect();
  var mw = D.menu.offsetWidth || 250, mh = D.menu.offsetHeight || 300;
  var left = r.right - mw, top = r.bottom + 6;
  if (left < 8) left = 8;
  if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  D.menu.style.left = left + 'px';
  D.menu.style.top = top + 'px';
  $$('.menu-item:not([disabled])', D.menu).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = items[parseInt(btn.dataset.idx, 10)];
      closeMenu();
      if (item && item.action) item.action();
    });
  });
}
function closeMenu() {
  if (!menuOpen) return;
  D.menu.classList.remove('show');
  D.menu.innerHTML = '';
  menuOpen = false;
}
document.addEventListener('mousedown', function (e) { if (menuOpen && !D.menu.contains(e.target)) closeMenu(); }, true);

/* ---------------- 5. theme ---------------- */
var Theme = (function () {
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function resolved() { return P.theme === 'system' ? (mq.matches ? 'dark' : 'light') : P.theme; }
  function hexA(hex, a) {
    try {
      var h = String(hex).replace('#', '');
      var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    } catch (e) { return hex; }
  }
  function apply() {
    var r = resolved();
    document.documentElement.setAttribute('data-theme', r);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', r === 'dark' ? '#0e1014' : '#e9ecf1');
    if (D.themeIcon) D.themeIcon.innerHTML = '<use href="#' + (r === 'dark' ? 'i-sun' : 'i-moon') + '"/>';
    $$('#themeSeg button, #pageModeSeg button, #docWidthSeg button').forEach(function () {});
    $$('#themeSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.th === P.theme); });
    document.documentElement.style.setProperty('--accent', P.accent);
    document.documentElement.style.setProperty('--accent-soft', hexA(P.accent, r === 'light' ? 0.12 : 0.15));
    document.documentElement.style.setProperty('--accent-ring', hexA(P.accent, r === 'light' ? 0.30 : 0.40));
  }
  function set(t) { P.theme = t; savePrefs(); apply(); applyReadingPrefs(); }
  function toggle() { set(resolved() === 'dark' ? 'light' : 'dark'); }
  if (mq.addEventListener) mq.addEventListener('change', function () { if (P.theme === 'system') { apply(); applyReadingPrefs(); } });
  return { apply: apply, set: set, toggle: toggle, resolved: resolved };
})();

var ACCENTS = ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
function applyReadingPrefs() {
  document.documentElement.style.setProperty('--doc-fs', P.fontSize + 'px');
  document.body.classList.remove('doc-narrow', 'doc-comfort', 'doc-wide', 'doc-full');
  document.body.classList.add('doc-' + (P.docW || 'comfort'));
  document.body.classList.remove('pm-night', 'pm-sepia', 'pm-dim');
  if (P.pageMode && P.pageMode !== 'off') document.body.classList.add('pm-' + P.pageMode);
  document.body.classList.toggle('hide-code', !P.showCode);
  document.body.classList.toggle('reduce-motion', !P.motion);
  if (D.swMotion) D.swMotion.checked = !P.motion;
  if (D.fontSize) D.fontSize.value = P.fontSize;
  if (D.fontSizeLbl) D.fontSizeLbl.textContent = P.fontSize + 'px';
  $$('#pageModeSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.pm === P.pageMode); });
  $$('#docWidthSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.dw === P.docW); });
  if (D.swShowCode) D.swShowCode.checked = !!P.showCode;
  if (D.swShowOut) D.swShowOut.checked = !!P.showOut;
  if (D.swLineNums) D.swLineNums.checked = !!P.lineNums;
  if (D.swResume) D.swResume.checked = !!P.resume;
  if (D.swAutoFile) D.swAutoFile.checked = !!P.autoFile;
  if (D.swAutoWeb) D.swAutoWeb.checked = !!P.autoWeb;
  if (D.accentRow) {
    D.accentRow.innerHTML = '';
    ACCENTS.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'swatch' + (P.accent === c ? ' on' : '');
      b.title = c;
      b.style.cssText = 'width:28px;height:28px;border-radius:50%;border:2px solid ' + (P.accent === c ? P.accent : 'var(--border-2)') + ';background:' + c + (P.accent === c ? ';box-shadow:0 0 0 3px var(--accent-ring)' : '');
      b.addEventListener('click', function () { P.accent = c; savePrefs(); Theme.apply(); applyReadingPrefs(); });
      D.accentRow.appendChild(b);
    });
    var custom = document.createElement('input');
    custom.type = 'color'; custom.value = P.accent; custom.title = 'Custom accent';
    custom.style.cssText = 'width:28px;height:28px;border-radius:50%;border:2px solid var(--border-2);padding:0;background:none';
    custom.addEventListener('input', function () { P.accent = custom.value; savePrefs(); Theme.apply(); });
    D.accentRow.appendChild(custom);
  }
  Theme.apply();
}

/* ---------------- 6. IndexedDB (recents + autosave) ---------------- */
var IDB = (function () {
  var dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no-idb'));
      var r = indexedDB.open('herosnb', 1);
      r.onupgradeneeded = function () {
        var db = r.result;
        if (!db.objectStoreNames.contains('recent')) db.createObjectStore('recent', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('autosave')) db.createObjectStore('autosave', { keyPath: 'id' });
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(store, mode) { return open().then(function (db) { return db.transaction(store, mode).objectStore(store); }); }
  function wrap(p, fn) {
    return p.then(function (st) {
      return new Promise(function (res, rej) {
        var q = fn(st);
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    });
  }
  return {
    putRecent: function (rec) { return wrap(tx('recent', 'readwrite'), function (st) { return st.put(rec); }); },
    allRecent: function () { return wrap(tx('recent', 'readonly'), function (st) { return st.getAll(); }); },
    delRecent: function (id) { return wrap(tx('recent', 'readwrite'), function (st) { return st.delete(id); }); },
    clearRecent: function () { return wrap(tx('recent', 'readwrite'), function (st) { return st.clear(); }); },
    putAuto: function (rec) { return wrap(tx('autosave', 'readwrite'), function (st) { return st.put(rec); }); },
    getAuto: function (id) { return wrap(tx('autosave', 'readonly'), function (st) { return st.get(id); }); }
  };
})();

/* ---------------- 7. markdown-lite (offline, fast) ---------------- */
function protectBlocks(src, stash) {
  src = String(src == null ? '' : src).replace(/\r\n/g, '\n');
  src = src.replace(/^([ ]{0,3})(```|~~~)([^\n]*)\n([\s\S]*?)^\1?\2[ \t]*$/gm, function (m, ind, fence, lang, code) {
    var i = stash.code.length;
    stash.code.push({ lang: (lang || '').trim(), code: code.replace(/\n$/, '') });
    return '\nZZCB' + i + 'ZZ\n';
  });
  src = src.replace(/`([^`\n]+)`/g, function (m, code) {
    var i = stash.inline.length;
    stash.inline.push(code);
    return 'ZZIN' + i + 'ZZ';
  });
  // display math $$..$$ then inline $..$ (currency-safe)
  src = src.replace(/\$\$([\s\S]+?)\$\$/g, function (m, tex) {
    var i = stash.math.length;
    stash.math.push({ tex: tex.trim(), display: true });
    return '\nZZMA' + i + 'ZZ\n';
  });
  src = src.replace(/(^|[^$\\\w])\$([^$\n][^$\n]*?[^$\\\s\n])\$(?![0-9\w])/g, function (m, pre, tex) {
    if (/^\d+([.,]\d+)*$/.test(tex.trim())) return m;
    if (tex.trim().length > 300) return m;
    var i = stash.math.length;
    stash.math.push({ tex: tex.trim(), display: false });
    return pre + 'ZZMA' + i + 'ZZ';
  });
  return src;
}

function inlineMd(t) {
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (m, alt, url) {
    if (/^javascript:/i.test(url)) return esc(alt);
    return '<img loading="lazy" alt="' + esc(alt) + '" src="' + esc(url) + '">';
  });
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (m, txt, url) {
    if (/^javascript:/i.test(url)) return esc(txt);
    var ext = /^https?:/i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return '<a href="' + esc(url) + '"' + ext + '>' + esc(txt) + '</a>';
  });
  t = t.replace(/(^|\s)(https?:\/\/[^\s<>"']+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  t = t.replace(/\*\*([^*<>]+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/__([^_<>]+?)__/g, '<strong>$1</strong>');
  t = t.replace(/\*([^*<>]+?)\*/g, '<em>$1</em>');
  t = t.replace(/(^|[^A-Za-z0-9_])_([^_<>]+?)_([^A-Za-z0-9_]|$)/g, '$1<em>$2</em>$3');
  t = t.replace(/~~([^~<>]+?)~~/g, '<del>$1</del>');
  t = t.replace(/==([^=<>]+?)==/g, '<mark class="src-mark">$1</mark>');
  return t;
}

function mdLite(src) {
  var stash = { code: [], inline: [], math: [], html: [], htag: [] };
  var work = protectBlocks(src, stash);
  // block-level raw HTML passthrough (Jupyter renders it): full-line
  // <div>…</div> / <table>…</table> / <section>… etc. Code fences already
  // stashed above, so this never touches code samples.
  work = work.replace(/^[ \t]*<(div|section|article|aside|figure|figcaption|table|details)(?=[\s>])[\s\S]*?<\/\1[ \t]*>[ \t]*$/gm, function (m) {
    stash.html.push(m);
    return '\nZZHTML' + (stash.html.length - 1) + 'ZZ\n';
  });
  // lone void-element lines (<br>, <hr>, <img …>)
  work = work.replace(/^[ \t]*<(br|hr|img)(\s[^<>]*)?\/?>[ \t]*$/gm, function (m) {
    stash.html.push(m);
    return '\nZZHTML' + (stash.html.length - 1) + 'ZZ\n';
  });
  // inline raw HTML for known tags only (prose like a < b is untouched)
  work = work.replace(/<\/?(a|abbr|b|big|blockquote|br|cite|code|del|dfn|div|em|h[1-6]|hr|i|img|ins|kbd|li|mark|ol|p|pre|q|samp|small|span|strong|sub|sup|table|tbody|td|th|thead|tr|u|ul|var)(\s[^<>]*)?\/?>/g, function (m) {
    stash.htag.push(m);
    return 'ZZHI' + (stash.htag.length - 1) + 'ZZ';
  });
  var lines = work.split('\n');
  var html = '', i = 0, inList = null, para = [];
  function restoreInline(s) {
    return String(s).replace(/ZZHI(\d+)ZZ/g, function (mm, ix) {
      var raw = stash.htag[+ix] || '';
      return isTrusted() ? raw : sanitizeHtml(raw);
    });
  }
  function paraHtml(t) {
    // restore inline tags first: a paragraph that resolves to block-level
    // HTML must NOT be wrapped in <p> (browsers would shred the nesting)
    var inner = restoreInline(inlineMd(esc(t)));
    if (/<(div|section|article|aside|figure|figcaption|table|details|blockquote|pre|h[1-6]|ul|ol|dl|hr)([\s>\/]|$)/i.test(inner)) return inner;
    return '<p>' + inner.replace(/\n/g, '<br>') + '</p>';
  }
  function flushPara() {
    if (!para.length) return;
    var t = para.join('\n');
    para = [];
    if (/^\s*$/.test(t)) return;
    if (/^ZZ(CB|MA|HTML)\d+ZZ$/.test(t.trim())) { html += '<p>' + t.trim() + '</p>'; return; }
    // task list item
    var tm = t.match(/^\s*[-*+]\s+\[([ xX])\]\s+([\s\S]+)$/);
    if (tm) {
      html += '<ul><li class="task"><input type="checkbox" disabled' + (tm[1] === ' ' ? '' : ' checked') + '> ' + restoreInline(inlineMd(esc(tm[2]))) + '</li></ul>';
      return;
    }
    html += paraHtml(t);
  }
  function closeList() {
    if (inList) { html += inList === 'ul' ? '</ul>' : '</ol>'; inList = null; }
  }
  function quoteHtml(t) {
    var inner = restoreInline(inlineMd(escRestore(t)));
    if (/<(div|section|article|aside|figure|table|details|blockquote|pre|h[1-6]|ul|ol|dl|hr)([\s>\/]|$)/i.test(inner)) return inner;
    return '<p>' + inner.replace(/\n/g, '<br>') + '</p>';
  }
  function escRestore(s) { return esc(s); }
  while (i < lines.length) {
    var ln = lines[i];
    var m;
    if ((m = ln.match(/^(#{1,6})\s+(.*)$/))) {
      flushPara(); closeList();
      var lv = m[1].length;
      html += '<h' + lv + '>' + inlineMd(escRestore(m[2])) + '</h' + lv + '>';
      i++; continue;
    }
    if (/^\s*---+\s*$/.test(ln) || /^\s*\*\*\*+\s*$/.test(ln)) { flushPara(); closeList(); html += '<hr>'; i++; continue; }
    if ((m = ln.match(/^\s*>\s?\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*$/i))) {
      flushPara(); closeList();
      var kind = m[1].toLowerCase(), buf = [];
      i++;
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      html += '<blockquote class="callout callout-' + kind + '"><p class="callout-title">' + esc(m[1]) + '</p>' + quoteHtml(buf.join('\n')) + '</blockquote>';
      continue;
    }
    if (/^\s*>\s?/.test(ln)) {
      flushPara(); closeList();
      var bq = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { bq.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      html += '<blockquote>' + quoteHtml(bq.join('\n')) + '</blockquote>';
      continue;
    }
    if ((m = ln.match(/^\s*([-*+])\s+(.*)$/)) && !/^\s*[-*+]\s+\[[ xX]\]/.test(ln)) {
      flushPara();
      if (inList !== 'ul') { closeList(); html += '<ul>'; inList = 'ul'; }
      html += '<li>' + inlineMd(escRestore(m[2])) + '</li>';
      i++; continue;
    }
    if ((m = ln.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      flushPara();
      if (inList !== 'ol') { closeList(); html += '<ol>'; inList = 'ol'; }
      html += '<li>' + inlineMd(escRestore(m[2])) + '</li>';
      i++; continue;
    }
    // GFM table: header | --- row
    if (/\|/.test(ln) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?[\s:|-]*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
      flushPara(); closeList();
      var heads = ln.split('|').map(function (c) { return c.trim(); }).filter(function (c, ix, a) { return !(ix === 0 && c === '') && !(ix === a.length - 1 && c === ''); });
      i += 2;
      var rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') { rows.push(lines[i]); i++; }
      html += '<table><thead><tr>' + heads.map(function (h) { return '<th>' + inlineMd(escRestore(h)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) {
          var cells = r.split('|').map(function (c) { return c.trim(); }).filter(function (c, ix, a) { return !(ix === 0 && c === '') && !(ix === a.length - 1 && c === ''); });
          return '<tr>' + cells.map(function (c) { return '<td>' + inlineMd(escRestore(c)) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
      continue;
    }
    if (/^\s*$/.test(ln)) { flushPara(); closeList(); i++; continue; }
    if (/^(ZZCB\d+ZZ|ZZMA\d+ZZ|ZZHTML\d+ZZ)$/.test(ln.trim())) { flushPara(); closeList(); html += '<p>' + ln.trim() + '</p>'; i++; continue; }
    para.push(ln);
    i++;
  }
  flushPara(); closeList();
  // restore code + math placeholders
  html = html.replace(/ZZIN(\d+)ZZ/g, function (mm, ix) { return '<code>' + esc(stash.inline[+ix] || '') + '</code>'; });
  html = html.replace(/<p>ZZCB(\d+)ZZ<\/p>/g, function (mm, ix) { return fenceHtml(stash.code[+ix]); });
  html = html.replace(/ZZCB(\d+)ZZ/g, function (mm, ix) { return fenceHtml(stash.code[+ix]); });
  html = html.replace(/<p>ZZMA(\d+)ZZ<\/p>/g, function (mm, ix) { return mathHtml(stash.math[+ix]); });
  html = html.replace(/ZZMA(\d+)ZZ/g, function (mm, ix) { return mathHtml(stash.math[+ix]); });
  // restore raw HTML: trusted notebooks render fully, untrusted get sanitized
  html = html.replace(/<p>ZZHTML(\d+)ZZ<\/p>/g, function (mm, ix) { return htmlBlockHtml(stash.html[+ix]); });
  html = html.replace(/ZZHTML(\d+)ZZ/g, function (mm, ix) { return htmlBlockHtml(stash.html[+ix]); });
  html = html.replace(/ZZHI(\d+)ZZ/g, function (mm, ix) {
    var raw = stash.htag[+ix] || '';
    return isTrusted() ? raw : sanitizeHtml(raw);
  });
  return html;
}
function htmlBlockHtml(b) {
  if (b == null) return '';
  return '<div class="raw-html">' + (isTrusted() ? b : sanitizeHtml(b)) + '</div>';
}
function fenceHtml(b) {
  b = b || { lang: '', code: '' };
  var lang = (b.lang || '').trim() || 'code';
  return '<pre><code class="lang-' + esc(lang.toLowerCase()) + '">' + esc(b.code) + '</code></pre>';
}
function mathHtml(mt) {
  if (!mt) return '';
  if (mt.display) return '<span class="katex-display">' + esc(mt.tex) + '</span>';
  return '<span class="katex-inline">' + esc(mt.tex) + '</span>';
}

/* ---------------- 8. sanitize (untrusted notebooks) ---------------- */
function sanitizeHtml(html) {
  var tmp = document.createElement('div');
  tmp.innerHTML = String(html == null ? '' : html);
  var bad = tmp.querySelectorAll('script,iframe,object,embed,link,meta,base,form,video,audio');
  for (var i = bad.length - 1; i >= 0; i--) bad[i].parentNode.removeChild(bad[i]);
  var all = tmp.querySelectorAll('*');
  for (var j = 0; j < all.length; j++) {
    var n = all[j];
    var attrs = n.attributes;
    for (var k = attrs.length - 1; k >= 0; k--) {
      var a = attrs[k], nm = a.name.toLowerCase(), v = String(a.value || '');
      if (/^on/i.test(nm)) { n.removeAttribute(a.name); continue; }
      if ((nm === 'href' || nm === 'src' || nm === 'xlink:href') && /^\s*javascript:/i.test(v)) { n.removeAttribute(a.name); continue; }
      if (nm === 'srcdoc') { n.removeAttribute(a.name); continue; }
    }
    if (/^https?:/i.test(n.getAttribute && n.getAttribute('src') || '') === false) {}
    var tag = (n.tagName || '').toLowerCase();
    if (tag === 'a') { var h = n.getAttribute('href') || ''; if (/^https?:/i.test(h)) { n.target = '_blank'; n.rel = 'noopener noreferrer'; } }
    if (tag === 'img') { n.setAttribute('loading', 'lazy'); }
  }
  return tmp.innerHTML;
}
function isTrusted() { return !!(S.docId && P.trusted[S.docId]); }

/* ---------------- 9. python code tint (offline regex) ---------------- */
var PY_KW = 'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' ');
function subTextOnly(s, re, rep) {
  // apply a replacement to text only — never inside our own <span> tags
  return String(s).split(/(<\/?span[^>]*>)/g).map(function (part, ix) {
    if (ix % 2 === 1) return part;
    return part.replace(re, rep);
  }).join('');
}
function tintLine(line) {
  // extract strings first
  var parts = [], out = '';
  var re = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g;
  var last = 0, m, idx = 0;
  var tmp = [];
  while ((m = re.exec(line))) {
    tmp.push({ t: 'code', s: line.slice(last, m.index) });
    tmp.push({ t: 'str', s: m[0] });
    last = m.index + m[0].length;
  }
  tmp.push({ t: 'code', s: line.slice(last) });
  // comment: # outside strings — check first code chunk
  var html = '';
  tmp.forEach(function (p) {
    if (p.t === 'str') { html += '<span class="tok-s">' + esc(p.s) + '</span>'; return; }
    var s = p.s;
    var ci = s.indexOf('#');
    var code = ci === -1 ? s : s.slice(0, ci), comment = ci === -1 ? '' : s.slice(ci);
    code = esc(code);
    code = subTextOnly(code, /\b(\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?j?)\b/gi, '<span class="tok-n">$1</span>');
    code = subTextOnly(code, new RegExp('\\b(' + PY_KW.join('|') + ')\\b', 'g'), '<span class="tok-k">$1</span>');
    code = subTextOnly(code, /\b([A-Za-z_]\w*)(\s*\()/g, '<span class="tok-f">$1</span>$2');
    code = subTextOnly(code, /(@[\w.]+)/g, '<span class="tok-d">$1</span>');
    html += code;
    if (comment) html += '<span class="tok-c">' + esc(comment) + '</span>';
  });
  return html;
}
function tintCode(src) {
  return String(src == null ? '' : src).split('\n').map(function (ln) {
    var t = tintLine(ln);
    return '<span class="cl">' + (t === '' ? ' ' : t) + '</span>';
  }).join('');
}

/* ---------------- 10. output renderers ---------------- */
var MIME_ORDER = ['text/html', 'image/svg+xml', 'image/png', 'image/jpeg', 'text/markdown', 'text/latex', 'application/json', 'text/plain'];
function pickMime(data) {
  for (var i = 0; i < MIME_ORDER.length; i++) {
    if (data && data[MIME_ORDER[i]] !== undefined) return MIME_ORDER[i];
  }
  var ks = data ? Object.keys(data) : [];
  return ks.length ? ks[0] : 'text/plain';
}
function dataText(v) { return Array.isArray(v) ? v.join('') : String(v == null ? '' : v); }

function renderMime(mime, raw) {
  var txt = dataText(raw);
  if (mime === 'text/html') {
    var html = isTrusted() ? txt : sanitizeHtml(txt);
    return '<div class="rich-html" data-mime="text/html">' + html + '</div>';
  }
  if (mime === 'image/svg+xml') {
    var svg = isTrusted() ? txt : sanitizeHtml(txt);
    return '<img class="out-img svg" loading="lazy" alt="svg output" src="data:image/svg+xml;utf8,' + encodeURIComponent(txt.slice(0, 400000)) + '">';
  }
  if (mime === 'image/png') {
    var b64 = txt.replace(/\s+/g, '');
    return '<img class="out-img" loading="lazy" alt="png output" src="data:image/png;base64,' + b64 + '" data-dl="out.png">';
  }
  if (mime === 'image/jpeg') {
    var b642 = txt.replace(/\s+/g, '');
    return '<img class="out-img" loading="lazy" alt="jpeg output" src="data:image/jpeg;base64,' + b642 + '" data-dl="out.jpg">';
  }
  if (mime === 'text/markdown') return '<div class="rich-html" data-mime="text/markdown">' + mdLite(txt) + '</div>';
  if (mime === 'text/latex') return '<div class="rich-html"><span class="katex-display">' + esc(txt.slice(0, 4000)) + '</span></div>';
  if (mime === 'application/json') {
    var pretty = txt;
    try { pretty = JSON.stringify(JSON.parse(txt), null, 2); } catch (e) {}
    return '<pre class="plain">' + esc(pretty.slice(0, 20000)) + '</pre>';
  }
  return '<pre class="plain">' + esc(txt.slice(0, 50000)) + '</pre>';
}

function renderOutput(out) {
  if (!out || typeof out !== 'object') return '';
  var t = out.output_type || '';
  if (t === 'stream') {
    var cls = out.name === 'stderr' ? 'stream stderr' : 'stream';
    var txt = dataText(out.text);
    var long = txt.split('\n').length > 30;
    return '<pre class="' + cls + (long ? ' collapsed-stream' : '') + '" data-full="0">' + esc(txt.slice(0, 60000)) + '</pre>';
  }
  if (t === 'display_data' || t === 'execute_result') {
    var data = out.data || {};
    var mime = pickMime(data);
    var badge = t === 'execute_result' && out.execution_count != null ? '<span class="execbadge">Out[' + esc(String(out.execution_count)) + ']</span>' : '';
    return badge + renderMime(mime, data[mime]);
  }
  if (t === 'error') {
    var tb = ((out.traceback || []).map(dataText).join('\n') || ((out.ename || 'Error') + ': ' + (out.evalue || '')));
    // strip ANSI colors
    tb = tb.replace(/\u001b\[[0-9;]*m/g, '');
    return '<pre class="errblock"><span class="ename">' + esc(out.ename || 'Error') + '</span>: ' + esc(out.evalue || '') + '\n' + esc(tb.slice(0, 20000)) + '</pre>';
  }
  return '<pre class="plain">' + esc(JSON.stringify(out).slice(0, 4000)) + '</pre>';
}

/* ---------------- 11. notebook model ---------------- */
function blankCell(type, source) {
  return {
    id: uid().slice(0, 8),
    cell_type: type || 'code',
    metadata: {},
    source: source == null ? '' : String(source),
    outputs: [],
    execution_count: null,
    _runMs: 0, _running: false, _editing: false, _collapsedSrc: false, _collapsedOut: false
  };
}
function normalizeNb(raw) {
  var nb;
  if (typeof raw === 'string') {
    // strip possible BOM
    raw = raw.replace(/^\uFEFF/, '');
    nb = JSON.parse(raw);
  } else { nb = raw; }
  if (!nb || typeof nb !== 'object') throw new Error('Not a notebook (bad JSON)');
  var cells = nb.cells;
  if (!Array.isArray(cells)) {
    // maybe a single cell or nbformat 3 worksheets
    if (nb.worksheets && nb.worksheets[0] && Array.isArray(nb.worksheets[0].cells)) cells = nb.worksheets[0].cells;
    else throw new Error('No cells[] — not a .ipynb notebook');
  }
  cells = cells.map(function (c) {
    var type = c.cell_type === 'markdown' ? 'markdown' : (c.cell_type === 'raw' ? 'raw' : 'code');
    var cell = blankCell(type, joinSrc(c.source));
    cell.id = String(c.id || c.cell_id || uid().slice(0, 8));
    cell.metadata = c.metadata || {};
    if (type === 'code') {
      cell.outputs = Array.isArray(c.outputs) ? c.outputs : [];
      cell.execution_count = (c.execution_count === null || c.execution_count === undefined) ? null : c.execution_count;
    }
    if (cell.metadata.collapsed) cell._collapsedOut = true;
    if (cell.metadata.jupyter && cell.metadata.jupyter.source_hidden) cell._collapsedSrc = true;
    return cell;
  });
  return {
    nbformat: nb.nbformat || 4, nbformat_minor: nb.nbformat_minor || 0,
    metadata: nb.metadata || {},
    cells: cells
  };
}
function toIpynb(nb) {
  return {
    nbformat: 4, nbformat_minor: 5,
    metadata: nb.metadata || { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python' } },
    cells: nb.cells.map(function (c) {
      var base = { id: c.id, cell_type: c.cell_type, metadata: c.metadata || {}, source: splitSrc(c.source) };
      if (c.cell_type === 'code') { base.outputs = c.outputs || []; base.execution_count = c.execution_count; }
      return base;
    })
  };
}

function demoNotebook() {
  return {
    nbformat: 4, nbformat_minor: 5,
    metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python', version: '3.x' } },
    cells: [
      { id: 'a1', cell_type: 'markdown', metadata: {}, source: splitSrc('# Heros NoteBook — Magic Demo\n\nFast · Private · Free & unlimited. Press **Shift+Enter** on a code cell to run real Python in your browser.\n\n- [x] Open any `.ipynb` instantly\n- [x] Run cells free, no server\n- [x] Export `.py` `.md` `.html`\n\nInline math `$E=mc^2$` and display:\n\n$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$\n\n| Feature | Status |\n| --- | :---: |\n| Run Python | yes |\n| Plots | yes |\n\n> [!TIP]\n> Select any rendered text and press **H** to highlight it.') },
      { id: 'a2', cell_type: 'code', metadata: {}, execution_count: 1, outputs: [{ output_type: 'execute_result', execution_count: 1, data: { 'text/plain': '55' }, metadata: {} }], source: splitSrc('# Fibonacci in one line\nfib = lambda n: n if n < 2 else fib(n-1) + fib(n-2)\nfib(10)') },
      { id: 'a3', cell_type: 'code', metadata: {}, execution_count: 2, outputs: [{ output_type: 'stream', name: 'stdout', text: ['squares: [0, 1, 4, 9, 16]\n'] }], source: splitSrc('print("squares:", [i*i for i in range(5)])\n\n# Try: !pip install numpy  then  import numpy') },
      { id: 'a4', cell_type: 'markdown', metadata: {}, source: splitSrc('## 2. Rich outputs\n\nRun the next cell — it draws a **matplotlib** chart right here, free and offline after the kernel loads.\n\n```python\nimport matplotlib.pyplot as plt\nplt.plot([1, 2, 3, 4])\n```') },
      { id: 'a5', cell_type: 'code', metadata: {}, execution_count: null, outputs: [], source: splitSrc('import matplotlib.pyplot as plt\n\nxs = [x / 10 for x in range(63)]\nys = [__import__("math").sin(x) for x in xs]\nplt.figure()\nplt.plot(xs, ys)\nplt.title("sine wave — rendered free in your browser")') },
      { id: 'a6', cell_type: 'code', metadata: {}, execution_count: 3, outputs: [{ output_type: 'error', ename: 'ZeroDivisionError', evalue: 'division by zero', traceback: ['ZeroDivisionError: division by zero'] }], source: splitSrc('# Errors render beautifully\n1 / 0') },
      { id: 'a7', cell_type: 'markdown', metadata: {}, source: splitSrc('## 3. Your turn\n\n- Press **B** for a new code cell, **M** for markdown\n- **F** opens all 160 features · **Ctrl+K** commands · **?** shortcuts\n- Everything you run is saved back into the `.ipynb` on export.') }
    ]
  };
}

/* ---------------- 12. open flows ---------------- */
function docIdFor(name, size, head) {
  var s = String(name) + '|' + String(size) + '|' + String(head || '').slice(0, 4000);
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return [name, size, (h >>> 0).toString(16)].join('|');
}
function normUrl(u) {
  var s = String(u == null ? '' : u).trim();
  try { if (/%25[0-9A-Fa-f]{2}/.test(s)) s = decodeURIComponent(s); } catch (e) {}
  return s;
}
function fileNameFromUrl(url) {
  var last = String(url).split('?')[0].split('#')[0].split('/').pop() || 'notebook.ipynb';
  try { return decodeURIComponent(last) || 'notebook.ipynb'; } catch (e) { return last || 'notebook.ipynb'; }
}
function pickFile() { D.fileInput.click(); }
D.fileInput.addEventListener('change', function (e) {
  var f = e.target.files && e.target.files[0];
  if (f) loadFromFile(f);
  e.target.value = '';
});

function loadFromFile(file) {
  if (!file) return;
  var rd = new FileReader();
  setStatus('Reading…', 'busy'); showProgress(25);
  rd.onload = function () {
    try {
      var text = String(rd.result || '');
      if (/\.pdf$/i.test(file.name)) { toast('This is a PDF — Heros NoteBook opens .ipynb', 'err'); setStatus('Ready'); hideProgress(); return; }
      openNotebook(text, file.name, file.size);
      saveRecent(file.name, file.size, text, 0);
    } catch (err) { toast('Could not open: ' + (err.message || err), 'err', 5000); setStatus('Ready'); hideProgress(); }
  };
  rd.onerror = function () { toast('Could not read file', 'err'); setStatus('Ready'); hideProgress(); };
  rd.readAsText(file);
}
function fileFetch(url) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  }).catch(function () {
    return new Promise(function (res, rej) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = function () { (xhr.status === 200 || xhr.status === 0) ? res(xhr.responseText) : rej(new Error('HTTP ' + xhr.status)); };
      xhr.onerror = function () { rej(new Error('network')); };
      xhr.send();
    });
  });
}
function loadFromUrl(rawUrl) {
  var url = normUrl(rawUrl);
  if (!url) return;
  setStatus('Downloading…', 'busy'); showProgress(20);
  fileFetch(url).then(function (text) {
    showProgress(70);
    var fname = fileNameFromUrl(url);
    if (!/\.ipynb$/i.test(fname)) fname += '.ipynb';
    openNotebook(text, fname, text.length);
    saveRecent(fname, text.length, text, 0);
    hideProgress();
  }).catch(function () {
    hideProgress(); setStatus('Ready');
    if (/^file:/i.test(url)) {
      if (D.filePermTip) D.filePermTip.hidden = false;
      toast('Cannot read local file — enable "Allow access to file URLs" in chrome://extensions, or use Open / drag & drop', 'err', 7000);
    } else {
      toast('Could not fetch URL (CORS or network error) — download it and drag & drop instead', 'err', 5000);
    }
  });
}
function askUrl() {
  openModal({
    title: 'Open from URL', icon: 'i-globe',
    html: '<div class="field-label">Raw .ipynb address (GitHub raw, gist, nbviewer…)</div>' +
      '<input class="field" id="mUrl" placeholder="https://raw.githubusercontent.com/…/notebook.ipynb" style="margin-top:8px">' +
      '<div class="field-label" style="margin-top:6px;color:var(--muted);font-size:12px">Tip: ?nb=URL also opens directly.</div>',
    footer: '<button class="btn ghost" data-close="1">Cancel</button><button class="btn accent" id="mGo">Open</button>',
    onMount: function (root) {
      var inp = $('#mUrl', root);
      function go() { var v = inp.value.trim(); if (v) { closeModal(); loadFromUrl(v); } }
      $('#mGo', root).addEventListener('click', go);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    }
  });
}
function askPaste() {
  openModal({
    title: 'Paste notebook JSON', icon: 'i-upload-cloud',
    html: '<div class="field-label">Paste .ipynb source, then Open</div>' +
      '<textarea class="field code-field" id="mPaste" rows="8" placeholder=\'{"nbformat":4,…}\' style="margin-top:8px;font-family:var(--mono)"></textarea>',
    footer: '<button class="btn ghost" data-close="1">Cancel</button><button class="btn accent" id="mGo">Open pasted</button>',
    onMount: function (root) {
      $('#mGo', root).addEventListener('click', function () {
        var v = $('#mPaste', root).value;
        if (!v.trim()) return;
        closeModal();
        try { openNotebook(v, 'pasted.ipynb', v.length); saveRecent('pasted.ipynb', v.length, v, 0); }
        catch (err) { toast('Invalid notebook JSON: ' + (err.message || err), 'err', 5000); }
      });
    }
  });
}

function openNotebook(text, name, size) {
  var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  setStatus('Rendering…', 'busy'); showProgress(40);
  var raw = normalizeNb(text);
  S.nb = raw;
  S.fileName = name || 'notebook.ipynb';
  S.fileSize = size || text.length;
  S.docId = docIdFor(S.fileName, S.fileSize, text.slice(0, 8000));
  S.active = 0; S.undoStack = []; S.redoStack = [];
  S.vars = []; renderVars();
  S.execCounter = 0;
  raw.cells.forEach(function (c) {
    if (c.execution_count != null && c.execution_count > S.execCounter) S.execCounter = c.execution_count;
  });
  D.empty.hidden = true;
  D.fileTag.hidden = false;
  D.fileTagName.textContent = S.fileName + (S.dirty ? ' •' : '');
  D.sbFile.textContent = S.fileName;
  D.btnSearch.disabled = false;
  document.title = S.fileName.replace(/\.ipynb$/i, '') + ' — Heros NoteBook';
  // trust bar
  var trusted = isTrusted();
  D.trustBar.hidden = false;
  D.trustBar.className = 'trustbar ' + (trusted ? 'trusted' : 'untrusted');
  D.trustText.textContent = trusted ? 'Trusted — rich HTML outputs render fully.' : 'Untrusted — HTML outputs sanitized (scripts stripped).';
  D.btnTrust.textContent = trusted ? 'Untrust' : 'Trust';
  renderAll();
  buildOutline();
  resetSearch();
  renderCellNav();
  renderBookmarks();
  renderNotes();
  updateStatsBar();
  refreshHub();
  var t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  S.lastRenderMs = Math.round(t1 - t0);
  try { if (D.kvRenderMs) D.kvRenderMs.textContent = S.lastRenderMs + 'ms'; } catch (e) {}
  try { if (D.stRender) D.stRender.textContent = S.lastRenderMs + 'ms'; } catch (e2) {}
  // resume
  IDB.allRecent().then(function (all) {
    var rec = null;
    (all || []).forEach(function (r) { if (r.id === S.docId) rec = r; });
    if (P.resume && rec && rec.cell > 0) {
      setTimeout(function () { goToCell(Math.min(rec.cell, S.nb.cells.length - 1), false); toast('Resumed at cell ' + (S.active + 1), null, 1600); }, 250);
    }
  }).catch(function () {});
  // deep link #cell-N
  if (location.hash && /^#cell-\d+$/i.test(location.hash)) {
    setTimeout(function () { goToCell(parseInt(location.hash.slice(6), 10) - 1, false); }, 350);
  }
  S.stats.docs++;
  bumpStreak();
  saveStats(); refreshHub();
  startReadClock();
  setStatus('Ready — ' + S.nb.cells.length + ' cells', 'ok');
  hideProgress();
  toast('Loaded ' + S.nb.cells.length + ' cells', 'ok', 2000);
  autosaveSoon();
}

function saveRecent(name, size, text, cell) {
  try {
    IDB.putRecent({
      id: S.docId || docIdFor(name, size, String(text).slice(0, 8000)),
      name: name, size: size, openedAt: Date.now(), cell: cell || 0,
      text: String(text).slice(0, 2000000)
    }).then(renderRecent).catch(function () {});
  } catch (e) {}
  renderRecent();
}
var autosaveSoon = debounce(function () {
  if (!S.nb || !S.docId) return;
  try { IDB.putAuto({ id: S.docId, json: JSON.stringify(toIpynb(S.nb)), at: Date.now() }).catch(function () {}); } catch (e) {}
  try { IDB.allRecent().then(function (all) {
    var rec = null; (all || []).forEach(function (r) { if (r.id === S.docId) rec = r; });
    if (rec) { rec.cell = S.active; rec.openedAt = Date.now(); IDB.putRecent(rec).catch(function () {}); }
  }).catch(function () {}); } catch (e2) {}
}, 1200);
function markDirty() {
  S.dirty = true;
  try { D.fileTagName.textContent = S.fileName + ' •'; } catch (e) {}
  autosaveSoon();
}

/* ---------------- 13. render cells ---------------- */
function cellPreview(c) {
  var s = oneLine(String(c.source == null ? '' : c.source).replace(/<[^>]+>/g, ' '), 80);
  return s || (c.cell_type === 'code' ? 'empty code cell' : 'empty ' + c.cell_type + ' cell');
}
function renderAll() {
  if (!S.nb) return;
  var frag = document.createDocumentFragment();
  S.nb.cells.forEach(function (c, i) { frag.appendChild(cellEl(c, i)); });
  D.cells.innerHTML = '';
  D.cells.appendChild(frag);
  // insert bars between cells
  insertBars();
  renderMeta();
  applyMarks();
  updateStatsBar();
  renderCellNav();
}
function insertBars() {
  // one compact insert row at the end (fast, no per-cell DOM bloat)
  var bar = document.createElement('div');
  bar.className = 'insert-bar';
  bar.innerHTML = '<button class="btn ghost" data-ins="code"><svg class="ic ic-sm"><use href="#i-plus"/></svg>Code cell</button>' +
    '<button class="btn ghost" data-ins="markdown"><svg class="ic ic-sm"><use href="#i-text"/></svg>Markdown cell</button>';
  D.cells.appendChild(bar);
  $('[data-ins="code"]', bar).addEventListener('click', function () { addCell(S.nb.cells.length, 'code'); });
  $('[data-ins="markdown"]', bar).addEventListener('click', function () { addCell(S.nb.cells.length, 'markdown'); });
}
function renderMeta() {
  if (!S.nb) { D.nbMeta.innerHTML = ''; return; }
  var ks = (S.nb.metadata.kernelspec || {}).display_name || 'Python 3';
  var lang = ((S.nb.metadata.language_info || {}).name || 'python');
  var nCode = 0, nMd = 0, nOut = 0, nErr = 0;
  S.nb.cells.forEach(function (c) {
    if (c.cell_type === 'code') { nCode++; nOut += (c.outputs || []).length; }
    else if (c.cell_type === 'markdown') nMd++;
    (c.outputs || []).forEach(function (o) { if (o.output_type === 'error') nErr++; });
  });
  var words = 0;
  S.nb.cells.forEach(function (c) { if (c.cell_type === 'markdown') words += wordCountOf(c.source); });
  D.nbMeta.innerHTML =
    '<span class="pill"><svg class="ic"><use href="#i-book"/></svg>' + esc(S.fileName) + '</span>' +
    '<span class="pill"><svg class="ic"><use href="#i-terminal"/></svg>' + esc(ks) + ' · ' + esc(lang) + '</span>' +
    '<span class="pill"><svg class="ic"><use href="#i-grid"/></svg>' + S.nb.cells.length + ' cells (' + nCode + ' code · ' + nMd + ' md)</span>' +
    '<span class="pill"><svg class="ic"><use href="#i-play"/></svg>' + nOut + ' outputs' + (nErr ? ' · ' + nErr + ' errors' : '') + '</span>' +
    '<span class="pill"><svg class="ic"><use href="#i-text"/></svg>' + words.toLocaleString() + ' md words</span>' +
    (S.dirty ? '<span class="pill">unsaved changes</span>' : '');
}
function wordCountOf(text) {
  var s = String(text || '').trim();
  if (!s) return 0;
  var cjk = (s.match(/[぀-ヿ一-鿿가-힯]/g) || []).length;
  var noCjk = s.replace(/[぀-ヿ一-鿿가-힯]/g, ' ');
  return noCjk.split(/\s+/).filter(Boolean).length + cjk;
}

function cellEl(c, i) {
  var el = document.createElement('article');
  el.className = 'cell ' + (c.cell_type === 'code' ? 'code' : 'md') + (i === S.active ? ' active' : '') + (c._running ? ' running' : '') +
    (c._collapsedSrc ? ' collapsed-src' : '') + (c._collapsedOut ? ' collapsed-out' : '');
  el.id = 'cell-' + (i + 1);
  el.dataset.idx = i;
  var execBadge = c.cell_type === 'code'
    ? (c._running ? '[*]' : (c.execution_count == null ? '[ ]' : '[' + c.execution_count + ']'))
    : (c.cell_type === 'markdown' ? 'MD' : 'RAW');
  var html = '<div class="cell-head">' +
    '<span class="drag" title="Drag to reorder (coming: use ↑↓ buttons)"><svg class="ic ic-sm"><use href="#i-list"/></svg></span>' +
    '<span class="cnum exec">' + esc(execBadge) + '</span>' +
    '<span class="ctype">' + (i + 1) + ' · ' + esc(c.cell_type) + '</span>' +
    '<span class="cprev">' + esc(cellPreview(c)) + '</span>' +
    '<span class="cact">' +
    (c.cell_type === 'code' ? '<button class="ibtn runbtn" data-a="run" title="Run cell (Shift+Enter)"><svg class="ic"><use href="#i-play"/></svg></button>' : '') +
    '<button class="ibtn" data-a="up" title="Move up"><svg class="ic"><use href="#i-up"/></svg></button>' +
    '<button class="ibtn" data-a="down" title="Move down"><svg class="ic"><use href="#i-down"/></svg></button>' +
    '<button class="ibtn" data-a="more" title="Cell actions"><svg class="ic"><use href="#i-more"/></svg></button>' +
    '</span></div>';
  // source area
  if (c.cell_type === 'markdown' && !c._editing) {
    html += '<div class="mdrender" data-md="1">' + mdLite(c.source) + '</div>';
  } else if (c.cell_type === 'raw' && !c._editing) {
    html += '<div class="mdrender"><pre class="plain">' + esc(c.source) + '</pre></div>';
  } else if (c._editing || c.cell_type === 'code' && P.showCode) {
    if (c._editing || P.showCode) {
      if (c.cell_type === 'code') {
        if (c._editing) {
          html += '<div class="cell-src"><textarea class="code" placeholder="# write Python, Shift+Enter to run" rows="' + clamp(c.source.split('\n').length + 1, 3, 24) + '" spellcheck="false">' + esc(c.source) + '</textarea></div>';
        } else {
          html += '<div class="codeview"' + (P.lineNums ? '' : ' data-nonums="1"') + '><pre>' + tintCode(c.source) + '</pre></div>';
        }
      } else {
        if (c._editing) {
          html += mdToolbarHtml() + '<div class="cell-src"><textarea class="code" placeholder="Write markdown… (live preview below)" rows="' + clamp(c.source.split('\n').length + 1, 4, 24) + '" spellcheck="true">' + esc(c.source) + '</textarea></div>' +
            '<div class="mdrender" data-preview="1">' + mdLite(c.source) + '</div>';
        } else {
          html += '<div class="cell-src"><textarea class="code" placeholder="Write markdown…" rows="2" spellcheck="true" style="min-height:44px">' + esc(c.source) + '</textarea></div>';
        }
      }
    }
  } else if (c.cell_type === 'code' && !P.showCode) {
    html += '<div class="mdrender" style="color:var(--muted);font-size:13px">code hidden — toggle “Show code” in Cells pane</div>';
  }
  // outputs
  if (c.cell_type === 'code' && (c.outputs || []).length) {
    var outs = '';
    if (P.showOut) {
      outs = c.outputs.map(renderOutput).join('');
    } else {
      outs = '<div class="mdrender" style="color:var(--muted);font-size:12.5px">' + c.outputs.length + ' output(s) hidden</div>';
    }
    html += '<div class="out"><div class="out-head" data-a="toggle-out"><svg class="ic ic-sm"><use href="#i-chev-down"/></svg>Outputs · ' + c.outputs.length +
      (c._runMs ? '<span class="otime">' + c._runMs + 'ms</span>' : '') + '<span class="sp"></span><span class="otime">tap to collapse</span></div>' +
      '<div class="out-body">' + outs + '</div></div>';
  } else if (c.cell_type === 'code' && c._running) {
    html += '<div class="out"><div class="out-head"><svg class="ic ic-sm"><use href="#i-play"/></svg>Running…</div><div class="out-body"><pre class="stream">[*] executing…</pre></div></div>';
  }
  el.innerHTML = html;
  wireCell(el, c, i);
  return el;
}
function mdToolbarHtml() {
  return '<div class="mdedit-toolbar">' +
    '<button class="ibtn" data-md="bold" title="Bold"><svg class="ic"><use href="#i-text"/></svg></button>' +
    '<button class="ibtn" data-md="h" title="Heading"><svg class="ic"><use href="#i-list"/></svg></button>' +
    '<button class="ibtn" data-md="code" title="Code"><svg class="ic"><use href="#i-code"/></svg></button>' +
    '<button class="ibtn" data-md="math" title="Math"><svg class="ic"><use href="#i-sparkle"/></svg></button>' +
    '<button class="ibtn" data-md="table" title="Table"><svg class="ic"><use href="#i-grid"/></svg></button>' +
    '<button class="ibtn" data-md="done" title="Done editing (preview)"><svg class="ic"><use href="#i-check"/></svg></button>' +
    '</div>';
}
function wireCell(el, c, i) {
  el.addEventListener('click', function (e) {
    if (S.active !== i) { S.active = i; paintActive(); }
  });
  // double-click markdown to edit, code gutter to edit
  var md = $('[data-md]', el);
  if (md && !c._editing) {
    md.addEventListener('dblclick', function () { editCell(i, true); });
  }
  var cv = $('.codeview', el);
  if (cv) cv.addEventListener('dblclick', function () { editCell(i, true); });
  // action buttons
  $$('[data-a]', el).forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      S.active = i; paintActive();
      cellAction(i, btn.dataset.a, btn);
    });
  });
  // md toolbar
  $$('[data-md]', el).forEach(function (btn) {
    if (btn.classList.contains('ibtn') === false) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      mdTool(i, btn.dataset.md);
    });
  });
  // textarea: live sync + Tab indent + apply on blur
  var ta = $('textarea.code', el);
  if (ta) {
    ta.addEventListener('input', function () {
      c.source = ta.value;
      ta.style.height = 'auto';
      var pv = $('[data-preview]', el);
      if (pv && c.cell_type !== 'code') pv.innerHTML = mdLite(c.source);
      var prev = $('.cprev', el);
      if (prev) prev.textContent = cellPreview(c);
      markDirty();
    });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
        ta.value = v.slice(0, s) + '    ' + v.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 4;
        ta.dispatchEvent(new Event('input'));
        e.stopPropagation();
      } else if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey)) {
        e.preventDefault(); e.stopPropagation();
        applyEdit(i);
        if (c.cell_type === 'code') runCell(i, e.shiftKey);
        else { editCell(i, false); if (e.shiftKey) goToCell(i + 1, true); }
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        applyEdit(i); editCell(i, false);
      }
    });
    ta.addEventListener('blur', function () { applyEdit(i); });
  }
  // images: click to download
  $$('.out-img[data-dl]', el).forEach(function (img) {
    img.addEventListener('click', function () {
      var a = document.createElement('a');
      a.href = img.src; a.download = img.dataset.dl || 'output.png';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Image downloading', 'ok', 1500);
    });
  });
  // long streams: tap to expand
  $$('.stream.collapsed-stream', el).forEach(function (s) {
    s.style.cursor = 'pointer'; s.title = 'Tap to expand';
    s.addEventListener('click', function () { s.classList.remove('collapsed-stream'); });
  });
}
function paintActive() {
  $$('.cell', D.cells).forEach(function (el) {
    el.classList.toggle('active', parseInt(el.dataset.idx, 10) === S.active);
  });
  D.cellInput.value = S.nb ? (S.active + 1) : '—';
  renderCellNavActive();
}
function refreshCell(i) {
  if (!S.nb || !S.nb.cells[i]) return;
  var old = $('#cell-' + (i + 1));
  var fresh = cellEl(S.nb.cells[i], i);
  if (old) old.replaceWith(fresh);
  else renderAll();
  renderMeta(); updateStatsBar();
}

/* ---------------- 14. cell ops ---------------- */
function pushUndo() {
  if (!S.nb) return;
  try {
    S.undoStack.push(JSON.stringify(S.nb.cells));
    if (S.undoStack.length > 50) S.undoStack.shift();
    S.redoStack = [];
  } catch (e) {}
}
function undo() {
  if (!S.undoStack.length) { toast('Nothing to undo'); return; }
  S.redoStack.push(JSON.stringify(S.nb.cells));
  S.nb.cells = JSON.parse(S.undoStack.pop()).map(reviveCell);
  S.active = clamp(S.active, 0, S.nb.cells.length - 1);
  renderAll(); buildOutline(); markDirty();
  toast('Undone', 'ok', 1200);
}
function redo() {
  if (!S.redoStack.length) { toast('Nothing to redo'); return; }
  S.undoStack.push(JSON.stringify(S.nb.cells));
  S.nb.cells = JSON.parse(S.redoStack.pop()).map(reviveCell);
  renderAll(); buildOutline(); markDirty();
  toast('Redone', 'ok', 1200);
}
function reviveCell(c) {
  var n = blankCell(c.cell_type, c.source);
  Object.assign(n, c);
  n._running = false; n._editing = false;
  return n;
}
function addCell(at, type, source) {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  pushUndo();
  var c = blankCell(type || 'code', source || '');
  if (type !== 'markdown' && (source == null)) c._editing = true;
  if (type === 'markdown') c._editing = true;
  S.nb.cells.splice(clamp(at, 0, S.nb.cells.length), 0, c);
  S.active = clamp(at, 0, S.nb.cells.length - 1);
  renderAll(); buildOutline(); markDirty();
  setTimeout(function () {
    goToCell(S.active, false);
    var ta = $('#cell-' + (S.active + 1) + ' textarea.code');
    if (ta) { ta.focus(); }
  }, 60);
}
function deleteCell(i) {
  if (!S.nb || !S.nb.cells[i]) return;
  pushUndo();
  S.nb.cells.splice(i, 1);
  if (!S.nb.cells.length) S.nb.cells.push(blankCell('code', ''));
  S.active = clamp(i, 0, S.nb.cells.length - 1);
  renderAll(); buildOutline(); markDirty();
  toast('Cell deleted', null, 1500);
}
function duplicateCell(i) {
  if (!S.nb || !S.nb.cells[i]) return;
  pushUndo();
  var copy = JSON.parse(JSON.stringify(S.nb.cells[i]));
  copy.id = uid().slice(0, 8);
  copy._editing = false; copy._running = false;
  S.nb.cells.splice(i + 1, 0, reviveCell(copy));
  S.active = i + 1;
  renderAll(); buildOutline(); markDirty();
  goToCell(S.active, false);
}
function moveCell(i, dir) {
  if (!S.nb) return;
  var j = i + dir;
  if (j < 0 || j >= S.nb.cells.length) return;
  pushUndo();
  var tmp = S.nb.cells[i];
  S.nb.cells[i] = S.nb.cells[j];
  S.nb.cells[j] = tmp;
  S.active = j;
  renderAll(); markDirty();
  goToCell(j, false);
}
function splitCell(i) {
  var c = S.nb.cells[i];
  if (!c) return;
  var ta = $('#cell-' + (i + 1) + ' textarea.code');
  var pos = ta ? ta.selectionStart : Math.floor(c.source.length / 2);
  pushUndo();
  var a = c.source.slice(0, pos).replace(/\n$/, ''), b = c.source.slice(pos).replace(/^\n/, '');
  c.source = a;
  var n = blankCell(c.cell_type, b);
  S.nb.cells.splice(i + 1, 0, n);
  S.active = i + 1;
  renderAll(); buildOutline(); markDirty();
  goToCell(S.active, false);
}
function setCellType(i, type) {
  var c = S.nb.cells[i];
  if (!c || c.cell_type === type) return;
  pushUndo();
  c.cell_type = type;
  if (type === 'code') { c.outputs = c.outputs || []; }
  c._editing = true;
  renderAll(); buildOutline(); markDirty();
}
function editCell(i, on) {
  var c = S.nb.cells[i];
  if (!c) return;
  applyEdit(S.active);
  c._editing = !!on;
  refreshCell(i);
  if (on) setTimeout(function () {
    var ta = $('#cell-' + (i + 1) + ' textarea.code');
    if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; }
  }, 40);
}
function applyEdit(i) {
  var c = S.nb.cells[i];
  if (!c) return;
  var ta = $('#cell-' + (i + 1) + ' textarea.code');
  if (ta && document.contains(ta)) c.source = ta.value;
}
function clearOutputs(i) {
  var c = S.nb.cells[i];
  if (!c || c.cell_type !== 'code') return;
  c.outputs = []; c.execution_count = null; c._runMs = 0;
  refreshCell(i); markDirty();
}
function clearAllOutputs() {
  if (!S.nb) return;
  S.nb.cells.forEach(function (c) { if (c.cell_type === 'code') { c.outputs = []; c.execution_count = null; c._runMs = 0; } });
  S.execCounter = 0;
  renderAll(); markDirty();
  toast('All outputs cleared', 'ok', 1600);
}
function mdTool(i, kind) {
  var ta = $('#cell-' + (i + 1) + ' textarea.code');
  if (!ta) return;
  var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
  var sel = v.slice(s, e) || 'text';
  var rep = sel, pos = 0;
  if (kind === 'bold') { rep = '**' + sel + '**'; pos = 2; }
  else if (kind === 'h') { rep = '## ' + sel; pos = 3; }
  else if (kind === 'code') { rep = '`' + sel + '`'; pos = 1; }
  else if (kind === 'math') { rep = '$' + sel + '$'; pos = 1; }
  else if (kind === 'table') {
    rep = v.slice(0, s) + '\n| A | B |\n| --- | --- |\n| 1 | 2 |\n' + v.slice(e);
    ta.value = rep; ta.dispatchEvent(new Event('input')); return;
  }
  else if (kind === 'done') { applyEdit(i); editCell(i, false); return; }
  ta.value = v.slice(0, s) + rep + v.slice(e);
  ta.selectionStart = s + pos; ta.selectionEnd = s + pos + sel.length;
  ta.focus();
  ta.dispatchEvent(new Event('input'));
}
function cellAction(i, a, anchor) {
  var c = S.nb.cells[i];
  if (!c) return;
  if (a === 'run') { applyEdit(i); runCell(i, true); return; }
  if (a === 'up') { moveCell(i, -1); return; }
  if (a === 'down') { moveCell(i, 1); return; }
  if (a === 'toggle-out') { c._collapsedOut = !c._collapsedOut; refreshCell(i); return; }
  var items = [
    { text: c._editing ? 'Done editing' : 'Edit cell', icon: 'i-edit', kbd: 'E', action: function () { editCell(i, !c._editing); } },
    { text: 'Run cell', icon: 'i-play', kbd: 'Shift+Enter', disabled: c.cell_type !== 'code', action: function () { applyEdit(i); runCell(i, true); } },
    { text: 'Run cell, stay', icon: 'i-play', kbd: 'Ctrl+Enter', disabled: c.cell_type !== 'code', action: function () { applyEdit(i); runCell(i, false); } },
    { text: 'Add code below', icon: 'i-code', kbd: 'B', action: function () { addCell(i + 1, 'code'); } },
    { text: 'Add markdown below', icon: 'i-text', kbd: 'M', action: function () { addCell(i + 1, 'markdown'); } },
    { sep: true },
    { text: 'Duplicate', icon: 'i-copy', action: function () { duplicateCell(i); } },
    { text: 'Split at cursor', icon: 'i-split', action: function () { splitCell(i); } },
    { text: 'Cut', icon: 'i-scissors', action: function () { S.cellClip = { mode: 'cut', cell: JSON.parse(JSON.stringify(c)), from: i }; pushUndo(); S.nb.cells.splice(i, 1); renderAll(); buildOutline(); markDirty(); toast('Cell cut — paste with V', null, 1600); } },
    { text: 'Copy', icon: 'i-copy', action: function () { S.cellClip = { mode: 'copy', cell: JSON.parse(JSON.stringify(c)) }; toast('Cell copied — paste with V', 'ok', 1500); } },
    { text: 'Paste below', icon: 'i-plus', kbd: 'V', disabled: !S.cellClip, action: function () { pasteCell(i + 1); } },
    { sep: true },
    { text: 'To code', icon: 'i-code', checked: c.cell_type === 'code', action: function () { setCellType(i, 'code'); } },
    { text: 'To markdown', icon: 'i-text', checked: c.cell_type === 'markdown', action: function () { setCellType(i, 'markdown'); } },
    { text: 'To raw', icon: 'i-file', checked: c.cell_type === 'raw', action: function () { setCellType(i, 'raw'); } },
    { sep: true },
    { text: c._collapsedSrc ? 'Expand source' : 'Collapse source', icon: 'i-eye-dim', action: function () { c._collapsedSrc = !c._collapsedSrc; refreshCell(i); } },
    { text: 'Clear outputs', icon: 'i-x', disabled: c.cell_type !== 'code', action: function () { clearOutputs(i); } },
    { text: isBookmarked(i) ? 'Remove bookmark' : 'Bookmark cell', icon: 'i-bookmark', action: function () { toggleBookmark(i); } },
    { text: 'Copy cell link', icon: 'i-share', action: function () { copyText(location.href.split('#')[0] + '#cell-' + (i + 1)); toast('Cell link copied', 'ok', 1500); } },
    { text: 'Copy source', icon: 'i-copy', action: function () { copyText(c.source); } },
    { sep: true },
    { text: 'Delete cell', icon: 'i-trash', action: function () { deleteCell(i); } }
  ];
  openMenu(anchor, items);
}
function pasteCell(at) {
  if (!S.cellClip || !S.nb) { toast('Clipboard empty — copy a cell first'); return; }
  pushUndo();
  var copy = reviveCell(JSON.parse(JSON.stringify(S.cellClip.cell)));
  copy.id = uid().slice(0, 8);
  if (S.cellClip.mode === 'cut' && S.cellClip.from != null && S.cellClip.from < at) at = at - 1;
  S.nb.cells.splice(clamp(at, 0, S.nb.cells.length), 0, copy);
  S.active = clamp(at, 0, S.nb.cells.length - 1);
  renderAll(); buildOutline(); markDirty();
  goToCell(S.active, false);
}
function goToCell(i, smooth) {
  if (!S.nb || !S.nb.cells.length) return;
  i = clamp(i, 0, S.nb.cells.length - 1);
  S.active = i;
  paintActive();
  var el = $('#cell-' + (i + 1));
  if (el) {
    try { el.scrollIntoView({ behavior: smooth === false ? 'auto' : 'smooth', block: 'start' }); }
    catch (e) { el.scrollIntoView(); }
  }
  D.cellInput.value = i + 1;
}
function copyText(t) {
  var s = String(t == null ? '' : t);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(s).then(function () { toast('Copied to clipboard', 'ok', 1400); }).catch(function () { fallbackCopy(s); });
  } else fallbackCopy(s);
}
function fallbackCopy(s) {
  try {
    var ta = document.createElement('textarea');
    ta.value = s; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    toast('Copied to clipboard', 'ok', 1400);
  } catch (e) { toast('Could not copy', 'err'); }
}

/* ---------------- 15. kernel bridge (sandboxed Pyodide) ---------------- */
function ensureKernelFrame() {
  if (D.kernelFrame && document.contains(D.kernelFrame)) return D.kernelFrame;
  var f = document.createElement('iframe');
  f.src = 'sandbox.html';
  f.title = 'Python kernel (isolated)';
  f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:absolute;width:2px;height:2px;left:-10px;top:-10px;border:0;visibility:hidden;';
  document.body.appendChild(f);
  D.kernelFrame = f;
  return f;
}
function setKernel(state, label) {
  S.kernel.state = state;
  var pill = D.kernelPill;
  pill.className = 'kernelpill ' + (state === 'idle' ? 'idle' : state === 'busy' ? 'busy' : state === 'loading' ? 'loading' : 'off');
  D.kernelLabel.textContent = label || (state === 'idle' ? 'idle' : state === 'busy' ? 'busy…' : state === 'loading' ? 'loading…' : 'no kernel');
}
function kernelPost(msg) {
  var f = ensureKernelFrame();
  try { f.contentWindow.postMessage(msg, '*'); } catch (e) { toast('Kernel unreachable', 'err'); }
}
window.addEventListener('message', function (ev) {
  try {
    if (D.kernelFrame && ev.source !== D.kernelFrame.contentWindow) return;
  } catch (e) { return; }
  var msg = ev.data || {};
  if (msg.type === 'ready') {
    S.kernel.ready = true;
    if (S.kernel.state === 'loading') setKernel('idle');
    flushKernelQueue();
  } else if (msg.type === 'loading') {
    setKernel('loading');
  } else if (msg.type === 'idle') {
    if (!S.kernel.ready && S.kernel.state === 'loading') { /* still waiting for pyodide */ }
  } else if (msg.type === 'kernel-error') {
    S.kernel.ready = false;
    setKernel('off');
    toast('Python kernel failed: ' + (msg.message || 'offline?') + ' — viewing & editing still work', 'err', 6000);
    if (S.nb) S.nb.cells.forEach(function (c) {
      if (c._running) {
        c._running = false;
        c.outputs = [{ output_type: 'error', ename: 'KernelError', evalue: String(msg.message || 'could not load'), traceback: [] }];
      }
    });
    if (S.nb) renderAll();
    setStatus('Kernel offline', 'busy');
  } else if (msg.type === 'result' && msg.id != null) {
    // self-heal: a result proves the kernel is alive even if 'ready' was missed
    if (!S.kernel.ready) { S.kernel.ready = true; setKernel('idle'); flushKernelQueue(); }
    var p = S.kernel.pending[msg.id];
    if (p) { delete S.kernel.pending[msg.id]; p(msg); }
  }
});
var kernelQueue = [];
function flushKernelQueue() {
  while (kernelQueue.length && S.kernel.ready) {
    var job = kernelQueue.shift();
    kernelRun(job.code).then(job.res, job.rej);
  }
}
function kernelRun(code) {
  return new Promise(function (res, rej) {
    if (!S.kernel.ready) {
      kernelQueue.push({ code: code, res: res, rej: rej });
      ensureKernelFrame();
      setKernel('loading');
      // nudge sandbox
      setTimeout(function () { try { D.kernelFrame.contentWindow.postMessage({ type: 'ping' }, '*'); } catch (e) {} }, 400);
      toast('Loading Python kernel (once, from CDN)…', null, 3000);
      return;
    }
    var id = ++S.kernel.seq;
    S.kernel.pending[id] = function (msg) { res(msg); };
    setKernel('busy');
    kernelPost({ id: id, type: 'run', code: code });
    // safety timeout: 5 min per cell
    setTimeout(function () {
      if (S.kernel.pending[id]) { delete S.kernel.pending[id]; res({ stdout: '', stderr: '', display: [], error: { ename: 'TimeoutError', evalue: 'cell took over 5 minutes', traceback: ['TimeoutError: cell took over 5 minutes'] } }); }
    }, 300000);
  });
}
function updateKernelIdle() {
  var anyRunning = S.nb && S.nb.cells.some(function (c) { return c._running; });
  if (!anyRunning && S.kernel.ready) setKernel('idle');
  else if (!anyRunning && !S.kernel.ready && S.kernel.state === 'busy') setKernel(S.kernel.ready ? 'idle' : 'off');
}
function runCell(i, advance) {
  var c = S.nb && S.nb.cells[i];
  if (!c) return;
  if (c.cell_type !== 'code') { if (advance) goToCell(i + 1, true); return; }
  applyEdit(i);
  if (!c.source.trim()) { if (advance) goToCell(i + 1, true); return; }
  if (c._running) { toast('Cell already running'); return; }
  c._running = true;
  refreshCell(i);
  setKernel(S.kernel.ready ? 'busy' : 'loading');
  setStatus('Running cell ' + (i + 1) + '…', 'busy');
  var t0 = Date.now();
  kernelRun(c.source).then(function (msg) {
    c._running = false;
    c._runMs = Date.now() - t0;
    S.execCounter++;
    c.execution_count = S.execCounter;
    var outs = [];
    if (msg.stdout) outs.push({ output_type: 'stream', name: 'stdout', text: splitSrc(msg.stdout) });
    if (msg.stderr) outs.push({ output_type: 'stream', name: 'stderr', text: splitSrc(msg.stderr) });
    (msg.display || []).forEach(function (d) {
      var data = {};
      data[d.mime] = d.data;
      outs.push({ output_type: 'execute_result', execution_count: c.execution_count, data: data, metadata: {} });
    });
    if (msg.error) outs.push({ output_type: 'error', ename: msg.error.ename, evalue: msg.error.evalue, traceback: msg.error.traceback });
    c.outputs = outs;
    S.stats.cellsRun++;
    saveStats(); refreshHub();
    refreshCell(i); buildOutline(); markDirty();
    pushRunHist(i, c._runMs, !msg.error);
    refreshVars(true);
    updateKernelIdle();
    setStatus(msg.error ? 'Cell ' + (i + 1) + ' raised ' + msg.error.ename : 'Cell ' + (i + 1) + ' done in ' + c._runMs + 'ms', msg.error ? 'busy' : 'ok');
    if (advance) goToCell(i + 1, true);
  }).catch(function (err) {
    c._running = false;
    c.outputs = [{ output_type: 'error', ename: 'KernelError', evalue: String((err && err.message) || err), traceback: [] }];
    refreshCell(i); updateKernelIdle();
    setStatus('Kernel error', 'busy');
  });
}
function runAll() {
  if (!S.nb) return;
  var idx = [];
  S.nb.cells.forEach(function (c, i) { if (c.cell_type === 'code' && c.source.trim()) idx.push(i); });
  if (!idx.length) { toast('No code cells to run'); return; }
  toast('Running ' + idx.length + ' cells… (kernel loads once)', null, 2500);
  ensureKernelFrame();
  (function next(k) {
    if (k >= idx.length) { updateKernelIdle(); setStatus('Run-all finished', 'ok'); toast('Run-all finished', 'ok', 2000); refreshVars(true); return; }
    var i = idx[k];
    var c = S.nb.cells[i];
    S.active = i; paintActive();
    c._running = true; refreshCell(i);
    var t0 = Date.now();
    kernelRun(c.source).then(function (msg) {
      c._running = false;
      c._runMs = Date.now() - t0;
      S.execCounter++;
      c.execution_count = S.execCounter;
      var outs = [];
      if (msg.stdout) outs.push({ output_type: 'stream', name: 'stdout', text: splitSrc(msg.stdout) });
      if (msg.stderr) outs.push({ output_type: 'stream', name: 'stderr', text: splitSrc(msg.stderr) });
      (msg.display || []).forEach(function (d) { var data = {}; data[d.mime] = d.data; outs.push({ output_type: 'execute_result', execution_count: c.execution_count, data: data, metadata: {} }); });
      if (msg.error) outs.push({ output_type: 'error', ename: msg.error.ename, evalue: msg.error.evalue, traceback: msg.error.traceback });
      c.outputs = outs;
      S.stats.cellsRun++;
      pushRunHist(i, c._runMs, !msg.error);
      refreshCell(i); markDirty();
      next(k + 1);
    });
  })(0);
  saveStats(); refreshHub();
}
function runAbove(i) {
  if (!S.nb) return;
  var idx = [];
  for (var k = 0; k < i; k++) { var c = S.nb.cells[k]; if (c.cell_type === 'code' && c.source.trim()) idx.push(k); }
  if (!idx.length) { toast('No code cells above'); return; }
  toast('Running ' + idx.length + ' cells above…', null, 2000);
  (function next(k) {
    if (k >= idx.length) { updateKernelIdle(); setStatus('Done', 'ok'); refreshVars(true); return; }
    var ci = idx[k], cell = S.nb.cells[ci];
    S.active = ci; paintActive();
    var t0 = Date.now();
    kernelRun(cell.source).then(function (msg) {
      S.execCounter++; cell.execution_count = S.execCounter;
      cell._runMs = Date.now() - t0;
      var outs = [];
      if (msg.stdout) outs.push({ output_type: 'stream', name: 'stdout', text: splitSrc(msg.stdout) });
      if (msg.stderr) outs.push({ output_type: 'stream', name: 'stderr', text: splitSrc(msg.stderr) });
      (msg.display || []).forEach(function (d) { var data = {}; data[d.mime] = d.data; outs.push({ output_type: 'execute_result', execution_count: cell.execution_count, data: data, metadata: {} }); });
      if (msg.error) outs.push({ output_type: 'error', ename: msg.error.ename, evalue: msg.error.evalue, traceback: msg.error.traceback });
      cell.outputs = outs; S.stats.cellsRun++;
      pushRunHist(ci, cell._runMs, !msg.error);
      refreshCell(ci); markDirty();
      next(k + 1);
    });
  })(0);
  saveStats(); refreshHub();
}
function restartKernel() {
  try { if (D.kernelFrame) { D.kernelFrame.remove(); D.kernelFrame = null; } } catch (e) {}
  S.kernel = { state: 'off', pending: {}, seq: 0, ready: false };
  kernelQueue = [];
  setKernel('off');
  toast('Kernel restarted — variables cleared', 'ok', 2200);
}

/* ---------------- 16. search ---------------- */
function resetSearch() {
  S.searchResults = []; S.searchCursor = -1;
  D.searchInput.value = '';
  D.searchBox.classList.remove('has');
  D.searchMeta.textContent = 'No search yet';
  D.searchCount.textContent = '';
  D.searchResults.innerHTML = '<div class="placeholder"><svg class="ic"><use href="#i-search"/></svg>Type to search the whole notebook.</div>';
}
function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function runSearch() {
  var q = D.searchInput.value;
  D.searchBox.classList.toggle('has', !!q);
  if (!S.nb || !q.trim()) { resetSearchKeep(q); return; }
  var flags = S.searchCase ? 'g' : 'gi';
  var pattern = escRe(q);
  if (S.searchWhole) pattern = '(^|[^\\p{L}\\p{N}_])(' + pattern + ')(?![\\p{L}\\p{N}_])';
  var re;
  try { re = new RegExp(pattern, flags + 'u'); }
  catch (e) { try { re = new RegExp(escRe(q), flags); } catch (e2) { D.searchMeta.textContent = 'Bad pattern'; return; } }
  var results = [];
  S.nb.cells.forEach(function (c, i) {
    var hay = [c.source];
    (c.outputs || []).forEach(function (o) {
      if (o.output_type === 'stream') hay.push(dataText(o.text));
      else if (o.output_type === 'error') hay.push((o.ename || '') + ': ' + (o.evalue || '') + '\n' + (o.traceback || []).join('\n'));
      else if (o.data) Object.keys(o.data).forEach(function (k) { if (/text|json/.test(k)) hay.push(dataText(o.data[k])); });
    });
    var text = hay.join('\n');
    var m, count = 0;
    re.lastIndex = 0;
    while ((m = re.exec(text)) && results.length < 800) {
      count++;
      var hit = m[2] !== undefined ? m[2] : m[0];
      var at = m.index + (m[2] !== undefined ? m[0].indexOf(m[2]) : 0);
      var before = text.slice(Math.max(0, at - 45), at).replace(/\n/g, ' ');
      var after = text.slice(at + hit.length, at + hit.length + 65).replace(/\n/g, ' ');
      results.push({ cell: i, before: before, hit: hit.slice(0, 120), after: after });
      if (m[0] === '') re.lastIndex++;
      if (count > 60) break; // per-cell cap
    }
  });
  S.searchResults = results;
  S.searchCursor = results.length ? 0 : -1;
  D.searchMeta.textContent = results.length ? results.length + ' result' + (results.length === 1 ? '' : 's') : 'No matches';
  D.searchCount.textContent = results.length ? '1 / ' + Math.min(results.length, 300) : '';
  renderSearchList();
  if (results.length) jumpSearch(0);
}
function resetSearchKeep(q) {
  S.searchResults = []; S.searchCursor = -1;
  D.searchMeta.textContent = q ? 'No matches' : 'No search yet';
  D.searchCount.textContent = '';
  D.searchResults.innerHTML = '<div class="placeholder"><svg class="ic"><use href="#i-search"/></svg>' + (q ? 'No matches for this query.' : 'Type to search the whole notebook.') + '</div>';
}
function renderSearchList() {
  var list = S.searchResults.slice(0, 300);
  if (!list.length) { D.searchResults.innerHTML = '<div class="placeholder"><svg class="ic"><use href="#i-search"/></svg>No matches.</div>'; return; }
  D.searchResults.innerHTML = list.map(function (r, ix) {
    var c = S.nb.cells[r.cell];
    var ctype = c ? c.cell_type : '?';
    return '<div class="result' + (ix === S.searchCursor ? ' active' : '') + '" data-ix="' + ix + '">' +
      '<div class="r-top"><span class="badge">cell ' + (r.cell + 1) + '</span><span class="badge">' + esc(ctype) + '</span></div>' +
      '<div class="r-txt">' + esc(r.before) + '<em>' + esc(r.hit) + '</em>' + esc(r.after) + '</div></div>';
  }).join('') + (S.searchResults.length > 300 ? '<div class="placeholder">+' + (S.searchResults.length - 300) + ' more counted (list capped at 300)</div>' : '');
  $$('.result', D.searchResults).forEach(function (el) {
    el.addEventListener('click', function () { jumpSearch(parseInt(el.dataset.ix, 10)); });
  });
}
function jumpSearch(ix) {
  if (!S.searchResults.length) return;
  S.searchCursor = (ix + S.searchResults.length) % S.searchResults.length;
  var r = S.searchResults[S.searchCursor];
  D.searchCount.textContent = (S.searchCursor + 1) + ' / ' + Math.min(S.searchResults.length, 300);
  $$('.result', D.searchResults).forEach(function (el) {
    el.classList.toggle('active', parseInt(el.dataset.ix, 10) === S.searchCursor);
  });
  var active = $('.result.active', D.searchResults);
  if (active) { try { active.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
  goToCell(r.cell, true);
}
function exportSearch() {
  if (!S.searchResults.length) { toast('Nothing to export — search first'); return; }
  var txt = 'Search: ' + D.searchInput.value + ' — ' + S.searchResults.length + ' results in ' + S.fileName + '\n\n' +
    S.searchResults.map(function (r) { return '[cell ' + (r.cell + 1) + '] …' + r.before + ' >>> ' + r.hit + ' <<< ' + r.after; }).join('\n');
  downloadFile(txt, S.fileName.replace(/\.ipynb$/i, '') + '-search.txt', 'text/plain');
}

/* ---------------- 17. outline + cell nav ---------------- */
function buildOutline() {
  S.headings = [];
  S.navItems = [];
  if (!S.nb) { D.outlineList.innerHTML = '<div class="placeholder">No headings yet.</div>'; D.outlineCount.textContent = '0'; return; }
  S.nb.cells.forEach(function (c, i) {
    var first = oneLine(c.source, 60);
    S.navItems.push({ cell: i, type: c.cell_type, text: first || ('cell ' + (i + 1)) });
    if (c.cell_type === 'markdown') {
      c.source.split('\n').forEach(function (ln) {
        var m = ln.match(/^(#{1,4})\s+(.*)$/);
        if (m) { S.headings.push({ level: m[1].length, text: m[2].replace(/<[^>]+>/g, '').trim().slice(0, 100), cell: i }); return; }
        var mh = ln.match(/<h([1-4])[^>]*>(.*?)<\/h\1>/i);
        if (mh) S.headings.push({ level: +mh[1], text: mh[2].replace(/<[^>]+>/g, '').trim().slice(0, 100), cell: i });
      });
    } else if (c.cell_type === 'code') {
      c.source.split('\n').forEach(function (ln) {
        var m = ln.match(/^\s*(def|class)\s+([A-Za-z_]\w*)/);
        if (m) S.headings.push({ level: m[1] === 'class' ? 2 : 3, text: (m[1] + ' ' + m[2]), cell: i });
      });
    }
  });
  D.outlineCount.textContent = String(S.headings.length);
  if (!S.headings.length) {
    D.outlineList.innerHTML = '<div class="placeholder"><svg class="ic"><use href="#i-list"/></svg>No headings or def/class yet.</div>';
    return;
  }
  D.outlineList.innerHTML = '<ul class="outline-list">' + S.headings.slice(0, 200).map(function (h, ix) {
    return '<li class="outline-item" data-cell="' + h.cell + '"><span class="lv">H' + h.level + '</span><span>' + esc(h.text) + '</span></li>';
  }).join('') + '</ul>';
  $$('.outline-item', D.outlineList).forEach(function (el) {
    el.addEventListener('click', function () { goToCell(parseInt(el.dataset.cell, 10), true); });
  });
}
function renderCellNav() {
  if (!S.nb || !S.nb.cells.length) {
    D.cellNav.innerHTML = '<div class="placeholder"><svg class="ic"><use href="#i-grid"/></svg>Open a notebook to navigate cells.</div>';
    D.cellsCountPill.textContent = '0 cells';
    return;
  }
  D.cellsCountPill.textContent = S.nb.cells.length + ' cells';
  D.cellNav.innerHTML = S.navItems.map(function (n) {
    return '<div class="cellnav-item ' + (n.type === 'code' ? 'code' : 'md') + (n.cell === S.active ? ' active' : '') + '" data-cell="' + n.cell + '">' +
      '<span class="cn-badge">' + (n.cell + 1) + '</span><span class="cn-txt">' + esc(n.text) + '</span></div>';
  }).join('');
  $$('.cellnav-item', D.cellNav).forEach(function (el) {
    el.addEventListener('click', function () { goToCell(parseInt(el.dataset.cell, 10), true); });
  });
}
function renderCellNavActive() {
  $$('.cellnav-item', D.cellNav).forEach(function (el) {
    el.classList.toggle('active', parseInt(el.dataset.cell, 10) === S.active);
  });
}
function updateStatsBar() {
  if (!S.nb) {
    D.sbCells.textContent = '— cells'; D.sbExec.textContent = '— run';
    D.cellTotal.textContent = '/ —'; D.cellInput.value = '—';
    return;
  }
  D.sbCells.textContent = S.nb.cells.length + ' cells';
  var nExec = S.nb.cells.filter(function (c) { return c.execution_count != null; }).length;
  D.sbExec.textContent = nExec + ' run';
  D.cellTotal.textContent = '/ ' + S.nb.cells.length;
  D.cellInput.value = S.active + 1;
}

/* ---------------- 18. selection mini-bar + marks ---------------- */
function selText() { var s = window.getSelection(); return s.rangeCount ? s.toString() : ''; }
function positionSelBar() {
  var sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) { D.selBar.hidden = true; return; }
  var txt = sel.toString();
  if (!txt || txt.length < 1 || txt.length > 2000) { D.selBar.hidden = true; return; }
  var node = sel.anchorNode;
  var host = node && node.parentElement ? node.parentElement.closest('.mdrender,.rich-html,.plain') : null;
  if (!host || !D.cells.contains(host)) { D.selBar.hidden = true; return; }
  var r;
  try { r = sel.getRangeAt(0).getBoundingClientRect(); } catch (e) { return; }
  D.selBar.hidden = false;
  var w = D.selBar.offsetWidth || 220;
  var left = clamp(r.left + r.width / 2 - w / 2, 8, window.innerWidth - w - 8);
  var top = r.top - 52;
  if (top < 70) top = r.bottom + 10;
  D.selBar.style.left = left + 'px';
  D.selBar.style.top = top + 'px';
}
document.addEventListener('mouseup', function () { setTimeout(positionSelBar, 30); });
document.addEventListener('scroll', function () { if (!D.selBar.hidden) positionSelBar(); }, true);
function hideSelBar() { D.selBar.hidden = true; }
function applyMark(tool) {
  var sel = window.getSelection();
  if (!sel.rangeCount) return;
  var txt = sel.toString();
  if (!txt.trim()) return;
  if (tool === 'copy') { copyText(txt); hideSelBar(); return; }
  if (tool === 'note') {
    openModal({
      title: 'Note from selection', icon: 'i-edit',
      html: '<div class="field-label">Quoted text</div><div class="rich-html" style="margin:8px 0">' + esc(txt.slice(0, 400)) + '</div>' +
        '<div class="field-label">Your note</div><textarea class="field" id="mNote" rows="3" style="margin-top:8px"></textarea>',
      footer: '<button class="btn ghost" data-close="1">Cancel</button><button class="btn accent" id="mSave">Save note</button>',
      onMount: function (root) {
        $('#mSave', root).addEventListener('click', function () {
          var v = $('#mNote', root).value.trim();
          addNote((v ? v + ' — ' : '') + '“' + txt.slice(0, 200) + '”');
          closeModal();
        });
      }
    });
    hideSelBar();
    return;
  }
  try {
    var range = sel.getRangeAt(0);
    var span = document.createElement('span');
    span.className = 'user-mark ' + (tool === 'highlight' ? 'mark-highlight' : tool === 'underline' ? 'mark-underline' : 'mark-strike');
    span.title = 'Marked in Heros NoteBook (tap to remove)';
    range.surroundContents(span);
    span.addEventListener('click', function () {
      var t = document.createTextNode(span.textContent);
      span.replaceWith(t);
      saveMarksList();
    });
    saveMarksList();
    toast('Marked — saved with this notebook', 'ok', 1500);
  } catch (e) { toast('Could not mark here — try a smaller selection', 'err'); }
  hideSelBar();
}
function saveMarksList() {
  if (!S.docId) return;
  var arr = [];
  $$('#cells .user-mark').forEach(function (m) {
    arr.push({ tool: m.className.indexOf('mark-underline') !== -1 ? 'underline' : m.className.indexOf('mark-strike') !== -1 ? 'strike' : 'highlight', text: m.textContent.slice(0, 300) });
  });
  S.marks[S.docId] = arr.slice(-400);
  saveMarks();
}
function applyMarks() {
  if (!S.docId || !S.marks[S.docId] || !S.marks[S.docId].length) return;
  // re-apply by first-occurrence text wrap in rendered markdown/html
  S.marks[S.docId].forEach(function (mk) {
    if (!mk.text || mk.text.length < 3) return;
    var walker = document.createTreeWalker(D.cells, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.parentElement && (n.parentElement.closest('.codeview,textarea,pre.stream,pre.plain,pre.errblock'))) continue;
      var at = n.nodeValue.indexOf(mk.text);
      if (at !== -1) {
        try {
          var range = document.createRange();
          range.setStart(n, at); range.setEnd(n, at + mk.text.length);
          var span = document.createElement('span');
          span.className = 'user-mark ' + (mk.tool === 'underline' ? 'mark-underline' : mk.tool === 'strike' ? 'mark-strike' : 'mark-highlight');
          range.surroundContents(span);
        } catch (e) {}
        break;
      }
    }
  });
}

/* ---------------- 19. bookmarks / notes / profile / recent ---------------- */
function isBookmarked(i) {
  if (!S.docId) return false;
  return (S.bookmarks[S.docId] || []).indexOf(i) !== -1;
}
function toggleBookmark(i) {
  if (!S.docId) return;
  var arr = S.bookmarks[S.docId] || (S.bookmarks[S.docId] = []);
  var at = arr.indexOf(i);
  if (at === -1) { arr.push(i); toast('Bookmarked cell ' + (i + 1), 'ok', 1500); }
  else { arr.splice(at, 1); toast('Bookmark removed', null, 1500); }
  saveMarks(); renderBookmarks();
}
function renderBookmarks() {
  var arr = (S.docId && S.bookmarks[S.docId]) || [];
  if (!arr.length) { D.bmList.innerHTML = '<div class="placeholder">Star any cell to bookmark it.</div>'; return; }
  D.bmList.innerHTML = arr.slice().sort(function (a, b) { return a - b; }).map(function (i) {
    var c = S.nb && S.nb.cells[i];
    return '<div class="bm-item" data-cell="' + i + '"><div class="n">' + (i + 1) + '</div>' +
      '<div class="meta"><div class="tt">Cell ' + (i + 1) + ' · ' + esc(c ? c.cell_type : '') + '</div><div class="ss">' + esc(c ? cellPreview(c) : '') + '</div></div>' +
      '<button class="x" data-del="' + i + '"><svg class="ic ic-sm"><use href="#i-x"/></svg></button></div>';
  }).join('');
  $$('.bm-item', D.bmList).forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-del]')) {
        var arr2 = S.bookmarks[S.docId] || [];
        arr2.splice(arr2.indexOf(parseInt(e.target.closest('[data-del]').dataset.del, 10)), 1);
        saveMarks(); renderBookmarks();
        return;
      }
      goToCell(parseInt(el.dataset.cell, 10), true);
    });
  });
}
function addNote(text) {
  if (!S.docId || !text.trim()) return;
  var arr = S.notes[S.docId] || (S.notes[S.docId] = []);
  arr.unshift({ id: uid().slice(0, 8), text: text.slice(0, 1000), at: Date.now(), cell: S.active });
  S.notes[S.docId] = arr.slice(-200);
  saveMarks(); renderNotes();
  toast('Note saved', 'ok', 1500);
}
function renderNotes() {
  var arr = (S.docId && S.notes[S.docId]) || [];
  if (!arr.length) { D.notesList.innerHTML = '<div class="placeholder">No notes yet.</div>'; return; }
  D.notesList.innerHTML = arr.map(function (n) {
    return '<div class="note-item" data-id="' + n.id + '"><div class="n"><svg class="ic ic-sm"><use href="#i-edit"/></svg></div>' +
      '<div class="meta"><div class="tt">Cell ' + ((n.cell || 0) + 1) + ' · ' + timeAgo(n.at) + '</div><div class="ss">' + esc(n.text) + '</div></div>' +
      '<button class="x" data-del="' + n.id + '"><svg class="ic ic-sm"><use href="#i-x"/></svg></button></div>';
  }).join('');
  $$('.note-item', D.notesList).forEach(function (el) {
    el.addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]');
      if (del) {
        var arr2 = S.notes[S.docId] || [];
        S.notes[S.docId] = arr2.filter(function (n) { return n.id !== del.dataset.del; });
        saveMarks(); renderNotes();
        return;
      }
      var found = (S.notes[S.docId] || []).filter(function (n) { return n.id === el.dataset.id; })[0];
      if (found) goToCell(found.cell || 0, true);
    });
  });
}
function bumpStreak() {
  var today = new Date().toDateString();
  if (S.stats.lastDay !== today) {
    var y = new Date(Date.now() - 86400000).toDateString();
    S.stats.streak = (S.stats.lastDay === y) ? (S.stats.streak || 0) + 1 : 1;
    S.stats.lastDay = today;
    saveStats();
  }
}
function refreshHub() {
  D.stDocs.textContent = S.stats.docs || 0;
  D.stCells.textContent = S.stats.cellsRun || 0;
  D.stStreak.textContent = S.stats.streak || 0;
  D.profileName.textContent = P.profileName || 'My Studio';
  var secs = S.docId ? (S.readSecs[S.docId] || 0) : 0;
  D.profileSub.textContent = (S.stats.docs || 0) + ' notebooks · ' + (S.stats.cellsRun || 0) + ' cells run' + (S.nb ? ' · ' + fmtClock(secs) + ' here' : '');
  try { D.avatar.textContent = (P.profileName || 'H').trim().charAt(0).toUpperCase() || 'H'; } catch (e) {}
  try { D.avatar.style.background = 'linear-gradient(140deg,' + P.profileColor + ',' + P.accent + ')'; } catch (e2) {}
  if (D.profileColorRow) {
    D.profileColorRow.innerHTML = '';
    ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'].forEach(function (c) {
      var b = document.createElement('button');
      b.title = c;
      b.style.cssText = 'width:28px;height:28px;border-radius:50%;border:2px solid ' + (P.profileColor === c ? P.accent : 'var(--border-2)') + ';background:' + c + (P.profileColor === c ? ';box-shadow:0 0 0 3px var(--accent-ring)' : '');
      b.addEventListener('click', function () { P.profileColor = c; savePrefs(); refreshHub(); });
      D.profileColorRow.appendChild(b);
    });
  }
}
function startReadClock() {
  try { if (S.readTick) clearInterval(S.readTick); } catch (e) {}
  S.readTick = setInterval(function () {
    if (!S.docId || !S.nb || document.hidden) return;
    S.readSecs[S.docId] = (S.readSecs[S.docId] || 0) + 5;
    saveMarks();
    if (Math.floor(Date.now() / 1000) % 30 < 6) refreshHub();
  }, 5000);
}
function renderRecent() {
  IDB.allRecent().then(function (all) {
    all = (all || []).sort(function (a, b) { return b.openedAt - a.openedAt; }).slice(0, 25);
    if (!all.length) { D.recentList.innerHTML = '<div class="placeholder"><svg class="ic"><use href="#i-history"/></svg>No recent notebooks.</div>'; return; }
    D.recentList.innerHTML = all.map(function (r) {
      return '<div class="recent-item" data-id="' + esc(r.id) + '"><div class="ico"><svg class="ic"><use href="#i-book"/></svg></div>' +
        '<div class="meta"><div class="nm">' + esc(r.name) + '</div><div class="sub">' + fmtBytes(r.size) + ' · ' + timeAgo(r.openedAt) + '</div></div>' +
        '<button class="del" data-del="' + esc(r.id) + '"><svg class="ic ic-sm"><use href="#i-trash"/></svg></button></div>';
    }).join('');
    $$('.recent-item', D.recentList).forEach(function (el) {
      el.addEventListener('click', function (e) {
        var del = e.target.closest('[data-del]');
        var id = el.dataset.id;
        if (del) { e.stopPropagation(); IDB.delRecent(id).then(renderRecent).catch(function () {}); return; }
        IDB.allRecent().then(function (all2) {
          var rec = null;
          (all2 || []).forEach(function (r) { if (r.id === id) rec = r; });
          if (rec && rec.text) {
            try { openNotebook(rec.text, rec.name, rec.size); } catch (err) { toast('Could not reopen: ' + (err.message || err), 'err'); }
          } else toast('Original text expired — open the file again', 'err');
        }).catch(function () {});
      });
    });
  }).catch(function () {
    D.recentList.innerHTML = '<div class="placeholder">Recent unavailable (private mode?).</div>';
  });
}

/* ---------------- 20. productivity: stopwatch / counters / todo / habits ---------------- */
function swElapsed() {
  return S.sw.base + (S.sw.running ? (Date.now() - S.sw.startTs) / 1000 : 0);
}
function renderStopwatch() {
  D.swDisplay.textContent = fmtClock(swElapsed());
  D.btnSwStart.textContent = S.sw.running ? 'Pause' : 'Start';
  D.swLaps.innerHTML = S.sw.laps.length ? S.sw.laps.slice().reverse().slice(0, 12).map(function (l, ix) {
    return '<div class="kv"><span>Lap ' + (S.sw.laps.length - ix) + '</span><b>' + fmtClock(l.t) + ' <span style="color:var(--muted)">+' + fmtClock(l.d) + '</span></b></div>';
  }).join('') : '';
}
setInterval(function () { if (S.sw.running) D.swDisplay.textContent = fmtClock(swElapsed()); }, 500);
function renderCounters() {
  if (!S.counters.length) { D.counterList.innerHTML = '<div class="placeholder">No counters.</div>'; return; }
  D.counterList.innerHTML = S.counters.map(function (c, ix) {
    return '<div class="counter-row" data-ix="' + ix + '"><span class="nm">' + esc(c.name) + '</span>' +
      '<button class="ibtn" data-c="dec" title="- step"><svg class="ic ic-sm"><use href="#i-chev-left"/></svg></button>' +
      '<span class="ct">' + c.value + '</span>' +
      '<button class="ibtn" data-c="inc" title="+ step"><svg class="ic ic-sm"><use href="#i-chev-right"/></svg></button>' +
      '<button class="ibtn" data-c="del" title="Delete"><svg class="ic ic-sm"><use href="#i-x"/></svg></button></div>';
  }).join('');
  $$('.counter-row', D.counterList).forEach(function (el) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      var c = S.counters[parseInt(el.dataset.ix, 10)];
      var step = parseInt(c.step, 10) || 1;
      if (b.dataset.c === 'inc') c.value += step;
      else if (b.dataset.c === 'dec') c.value -= step;
      else S.counters.splice(parseInt(el.dataset.ix, 10), 1);
      savePower(); renderCounters();
    });
  });
}
function renderTodos() {
  var list = S.todos.filter(function (t) {
    if (S.todoFilter === 'open') return !t.done;
    if (S.todoFilter === 'done') return !!t.done;
    return true;
  }).slice(-120).reverse();
  var open = S.todos.filter(function (t) { return !t.done; }).length;
  D.todoList.innerHTML = (list.length ? '' : '<div class="placeholder">No tasks. Add one above.</div>') + list.map(function (t) {
    return '<div class="todo-item' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
      '<span class="box" data-t="tg">' + (t.done ? '<svg class="ic ic-sm"><use href="#i-check"/></svg>' : '') + '</span>' +
      '<span class="meta"><span class="tt">' + esc(t.text) + '</span>' +
      '<span class="ss"><span class="prio ' + t.prio + '">' + t.prio + '</span><span>' + (t.scope === 'file' ? esc(t.file || '') : 'global') + '</span></span></span>' +
      '<button class="x" data-t="del"><svg class="ic ic-sm"><use href="#i-x"/></svg></button></div>';
  }).join('') + '<div class="kv"><span>Open</span><b>' + open + ' / ' + S.todos.length + '</b></div>';
  $$('#todoSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.f === S.todoFilter); });
  $$('.todo-item', D.todoList).forEach(function (el) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]');
      if (!b) return;
      var t = S.todos.filter(function (x) { return x.id === el.dataset.id; })[0];
      if (!t) return;
      if (b.dataset.t === 'tg') t.done = !t.done;
      else S.todos = S.todos.filter(function (x) { return x.id !== el.dataset.id; });
      savePower(); renderTodos();
    });
  });
}
function addTodo() {
  var v = D.todoInput.value.trim();
  if (!v) return;
  S.todos.push({ id: uid().slice(0, 8), text: v.slice(0, 300), prio: D.todoPrio.value || 'med', done: false, scope: S.docId ? 'file' : 'global', file: S.fileName || '', at: Date.now() });
  D.todoInput.value = '';
  S.todos = S.todos.slice(-500);
  savePower(); renderTodos();
  toast('Task added', 'ok', 1200);
}
function dayKey(offset) {
  var d = new Date(Date.now() - offset * 86400000);
  return d.toISOString().slice(0, 10);
}
function renderHabits() {
  var keys = Object.keys(S.habits);
  if (!keys.length) { D.habitList.innerHTML = '<div class="placeholder">No habits.</div>'; return; }
  D.habitList.innerHTML = keys.map(function (name) {
    var h = S.habits[name];
    var streak = 0;
    for (var o = 0; o < 60; o++) { if (h[dayKey(o)]) streak++; else if (o > 0) break; else break; }
    var cells = '';
    for (var d = 13; d >= 0; d--) {
      var k = dayKey(d);
      cells += '<span class="habit-day' + (h[k] ? ' on' : '') + (d === 0 ? ' today' : '') + '" data-h="' + esc(name) + '" data-d="' + k + '" title="' + k + '"></span>';
    }
    return '<div class="habit-card"><div class="hh"><span class="hn">' + esc(name) + '</span><span class="st">' + streak + ' day streak</span></div>' +
      '<div class="habit-grid">' + cells + '</div></div>';
  }).join('');
  $$('.habit-day', D.habitList).forEach(function (el) {
    el.addEventListener('click', function () {
      var h = S.habits[el.dataset.h];
      if (!h) return;
      if (h[el.dataset.d]) delete h[el.dataset.d]; else h[el.dataset.d] = 1;
      savePower(); renderHabits();
    });
  });
}

/* ---------------- 21. notebook lab (offline analysis) ---------------- */
function nbText(includeOut) {
  if (!S.nb) return '';
  var parts = [];
  S.nb.cells.forEach(function (c) {
    if (c.cell_type === 'markdown' || c.cell_type === 'raw') parts.push(c.source);
    else {
      parts.push(c.source);
      if (includeOut !== false) (c.outputs || []).forEach(function (o) {
        if (o.output_type === 'stream') parts.push(dataText(o.text));
        else if (o.output_type === 'error') parts.push((o.ename || '') + ' ' + (o.evalue || ''));
        else if (o.data && o.data['text/plain']) parts.push(dataText(o.data['text/plain']));
      });
    }
  });
  return parts.join('\n');
}
function labCard(title, bodyHtml) {
  D.labResults.innerHTML = '<div class="tool-card" style="margin:0"><h4><svg class="ic"><use href="#i-chart"/></svg>' + esc(title) + '</h4>' + bodyHtml + '</div>';
}
function labLint() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var issues = [];
  S.nb.cells.forEach(function (c, i) {
    var n = i + 1;
    if (!c.source.trim()) issues.push('Cell ' + n + ': empty source');
    if (c.cell_type === 'code') {
      c.source.split('\n').forEach(function (ln, li) {
        if (ln.length > 120) issues.push('Cell ' + n + ' line ' + (li + 1) + ': ' + ln.length + ' chars (long)');
        if (/\t/.test(ln)) issues.push('Cell ' + n + ' line ' + (li + 1) + ': tab indent');
      });
      var opens = (c.source.match(/\(/g) || []).length, closes = (c.source.match(/\)/g) || []).length;
      if (opens !== closes) issues.push('Cell ' + n + ': unbalanced () ' + opens + '/' + closes);
      (c.outputs || []).forEach(function (o) { if (o.output_type === 'error') issues.push('Cell ' + n + ': raises ' + (o.ename || 'error')); });
    }
    if (c.cell_type === 'markdown' && /^#{5,}/m.test(c.source)) issues.push('Cell ' + n + ': heading level 5+ (deep)');
  });
  labCard('Lint — ' + issues.length + ' notes', issues.length
    ? '<div style="font-size:12.5px;line-height:1.7">' + issues.slice(0, 30).map(esc).join('<br>') + (issues.length > 30 ? '<br>…+' + (issues.length - 30) + ' more' : '') + '</div>'
    : '<p>Clean. No issues found.</p>');
  toast('Lint done — ' + issues.length + ' notes', 'ok', 1600);
}
function labSummary() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var text = nbText(false).replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`$|[\]()!-]/g, ' ');
  var sentences = text.split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.split(/\s+/).length >= 5; });
  var freq = {};
  text.toLowerCase().split(/[^a-z0-9_+#]+/).forEach(function (w) {
    if (w.length > 3 && !/^(with|from|that|this|have|will|import|return|print|cell|notebook|python)$/.test(w)) freq[w] = (freq[w] || 0) + 1;
  });
  function score(s) {
    var sc = 0;
    s.toLowerCase().split(/[^a-z0-9_+#]+/).forEach(function (w) { sc += freq[w] || 0; });
    return sc / Math.max(1, s.split(/\s+/).length);
  }
  var top = sentences.sort(function (a, b) { return score(b) - score(a); }).slice(0, 5);
  labCard('Extractive summary', top.length
    ? '<ol style="font-size:12.5px;line-height:1.65;margin:0;padding-left:1.4em">' + top.map(function (s) { return '<li>' + esc(s.slice(0, 280)) + '</li>'; }).join('') + '</ol>'
    : '<p>Not enough prose to summarize.</p>');
}
function labKeywords() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var freq = {};
  nbText(false).toLowerCase().split(/[^a-z0-9_+#]+/).forEach(function (w) {
    if (w.length > 3 && !/^(with|from|that|this|have|will|import|return|print|cell|notebook|python|def|class|none|true|false)$/.test(w)) freq[w] = (freq[w] || 0) + 1;
  });
  var top = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 12);
  var max = top.length ? freq[top[0]] : 1;
  labCard('Keywords', top.length ? top.map(function (w) {
    return '<div class="kv"><span>' + esc(w) + '</span><b>' + freq[w] + '</b></div><div class="lab-bar"><i style="width:' + Math.round(freq[w] / max * 100) + '%"></i></div>';
  }).join('') : '<p>No keywords found.</p>');
}
function labReadability() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var text = nbText(false).replace(/```[\s\S]*?```/g, ' ');
  var words = text.split(/\s+/).filter(Boolean);
  var sents = text.split(/[.!?]+/).filter(function (s) { return s.trim().split(/\s+/).length > 2; });
  var syll = 0;
  words.forEach(function (w) {
    var m = String(w).toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g);
    syll += m ? m.length : 1;
  });
  var wps = words.length / Math.max(1, sents.length), spw = syll / Math.max(1, words.length);
  var ease = Math.round(206.835 - 1.015 * wps - 84.6 * spw);
  var grade = (0.39 * wps + 11.8 * spw - 15.59).toFixed(1);
  labCard('Readability', '<div class="kv"><span>Flesch ease</span><b>' + ease + ' / 100</b></div><div class="lab-bar"><i style="width:' + clamp(ease, 0, 100) + '%"></i></div>' +
    '<div class="kv"><span>Grade level</span><b>' + grade + '</b></div>' +
    '<div class="kv"><span>Words / sentences</span><b>' + words.length.toLocaleString() + ' / ' + sents.length.toLocaleString() + '</b></div>');
}
function copyOutline() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var txt = S.headings.map(function (h) { return new Array(h.level).join('  ') + '- ' + h.text + '  [cell ' + (h.cell + 1) + ']'; }).join('\n') || '(no headings)';
  copyText(txt);
}
function copyStats() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var nCode = S.nb.cells.filter(function (c) { return c.cell_type === 'code'; }).length;
  var nMd = S.nb.cells.filter(function (c) { return c.cell_type === 'markdown'; }).length;
  var nOut = 0, ms = 0;
  S.nb.cells.forEach(function (c) { nOut += (c.outputs || []).length; ms += c._runMs || 0; });
  copyText('Notebook: ' + S.fileName + '\nCells: ' + S.nb.cells.length + ' (' + nCode + ' code · ' + nMd + ' markdown)\nOutputs: ' + nOut + '\nTotal run time: ' + ms + 'ms\nRender: ' + (S.lastRenderMs || 0) + 'ms · Heros NoteBook (free, local)');
}
function validateNb() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var errs = [];
  if (S.nb.nbformat !== 4) errs.push('nbformat is ' + S.nb.nbformat + ' (expected 4)');
  var ids = {};
  S.nb.cells.forEach(function (c, i) {
    if (!c.cell_type) errs.push('Cell ' + (i + 1) + ': missing cell_type');
    if (ids[c.id]) errs.push('Cell ' + (i + 1) + ': duplicate id ' + c.id);
    ids[c.id] = 1;
  });
  openModal({
    title: 'Notebook validation', icon: 'i-shield',
    html: errs.length
      ? '<div class="errblock">' + errs.map(esc).join('\n') + '</div>'
      : '<div class="prop-row"><div class="k">Result</div><div class="v">Valid nbformat 4 notebook · ' + S.nb.cells.length + ' cells · ids unique</div></div>',
    footer: '<button class="btn accent" data-close="1">Done</button>'
  });
}

/* ---------------- 22. exports + backup ---------------- */
function downloadFile(content, name, mime) {
  var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 800);
  toast('Downloading ' + name, 'ok', 2000);
}
function baseName() { return (S.fileName || 'notebook').replace(/\.ipynb$/i, ''); }
function saveIpynb() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  S.nb.cells.forEach(applyEditByRef);
  downloadFile(JSON.stringify(toIpynb(S.nb), null, 1), S.fileName || 'notebook.ipynb', 'application/json');
  S.dirty = false;
  renderMeta();
  try { D.fileTagName.textContent = S.fileName; } catch (e) {}
}
function applyEditByRef(c, i) {
  var ta = $('#cell-' + (i + 1) + ' textarea.code');
  if (ta && document.contains(ta)) c.source = ta.value;
  c._editing = false; c._running = false;
}
function exportPy() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var out = ['#!/usr/bin/env python', '# Exported from ' + S.fileName + ' by Heros NoteBook (free, local)', ''];
  S.nb.cells.forEach(function (c, i) {
    out.push('# ' + '-'.repeat(20) + ' cell ' + (i + 1) + ' [' + c.cell_type + '] ' + '-'.repeat(20));
    if (c.cell_type === 'code') out.push(c.source);
    else if (c.cell_type === 'markdown') c.source.split('\n').forEach(function (ln) { out.push('# ' + ln); });
    else out.push('# raw cell:\n# ' + c.source.split('\n').join('\n# '));
    out.push('');
  });
  downloadFile(out.join('\n'), baseName() + '.py', 'text/x-python');
}
function exportMd() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var out = ['# ' + baseName(), '', '_Exported from ' + S.fileName + ' by Heros NoteBook_', ''];
  S.nb.cells.forEach(function (c, i) {
    if (c.cell_type === 'markdown' || c.cell_type === 'raw') { out.push(c.source); out.push(''); }
    else {
      out.push('```python'); out.push(c.source); out.push('```'); out.push('');
      (c.outputs || []).forEach(function (o) {
        if (o.output_type === 'stream') out.push('    ' + dataText(o.text).split('\n').join('\n    '));
        else if (o.output_type === 'error') out.push('    ' + (o.ename || 'Error') + ': ' + (o.evalue || ''));
        else if (o.data && o.data['text/plain']) out.push('    ' + dataText(o.data['text/plain']).split('\n').join('\n    '));
      });
      out.push('');
    }
  });
  downloadFile(out.join('\n'), baseName() + '.md', 'text/markdown');
}
function exportTxt() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var out = S.nb.cells.map(function (c, i) {
    return '=== cell ' + (i + 1) + ' [' + c.cell_type + '] ===\n' + c.source;
  }).join('\n\n');
  downloadFile(out, baseName() + '.txt', 'text/plain');
}
function exportHtml() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var css = 'body{font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:24px;background:#fff;color:#111}' +
    'pre{background:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:12px;overflow:auto}' +
    '.cell{border:1px solid #e4e4e7;border-radius:14px;margin:14px 0;overflow:hidden}' +
    '.h{background:#f4f4f5;padding:6px 12px;font:12px monospace;color:#555}' +
    '.b{padding:4px 16px 12px}.err{background:#fef2f2;color:#b91c1c}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px 10px}';
  var body = '<h1>' + esc(baseName()) + '</h1><p><em>Exported from ' + esc(S.fileName) + ' by Heros NoteBook</em></p>';
  S.nb.cells.forEach(function (c, i) {
    body += '<div class="cell"><div class="h">cell ' + (i + 1) + ' · ' + esc(c.cell_type) + (c.execution_count != null ? ' · [' + c.execution_count + ']' : '') + '</div><div class="b">';
    if (c.cell_type === 'markdown') body += mdLite(c.source);
    else if (c.cell_type === 'raw') body += '<pre>' + esc(c.source) + '</pre>';
    else {
      body += '<pre>' + esc(c.source) + '</pre>';
      (c.outputs || []).forEach(function (o) {
        if (o.output_type === 'stream') body += '<pre>' + esc(dataText(o.text)) + '</pre>';
        else if (o.output_type === 'error') body += '<pre class="err">' + esc((o.ename || '') + ': ' + (o.evalue || '')) + '</pre>';
        else if (o.data) {
          var m = pickMime(o.data);
          if (m === 'text/html') body += sanitizeHtml(dataText(o.data[m]));
          else if (m === 'image/png') body += '<img src="data:image/png;base64,' + dataText(o.data[m]).replace(/\s+/g, '') + '">';
          else if (m === 'image/jpeg') body += '<img src="data:image/jpeg;base64,' + dataText(o.data[m]).replace(/\s+/g, '') + '">';
          else if (m === 'text/markdown') body += mdLite(dataText(o.data[m]));
          else body += '<pre>' + esc(dataText(o.data[m]).slice(0, 20000)) + '</pre>';
        }
      });
    }
    body += '</div></div>';
  });
  downloadFile('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(baseName()) + '</title><style>' + css + '</style></head><body>' + body + '</body></html>', baseName() + '.html', 'text/html');
}
function backupAll() {
  try {
    var data = {
      app: 'heros-notebook', format: 1, at: Date.now(),
      prefs: P, stats: S.stats,
      bookmarks: S.bookmarks, notes: S.notes, marks: S.marks, readSecs: S.readSecs,
      todos: S.todos, counters: S.counters, habits: S.habits, sw: { base: swElapsed(), laps: S.sw.laps },
      notebook: S.nb ? toIpynb(S.nb) : null, fileName: S.fileName
    };
    downloadFile(JSON.stringify(data), 'heros-notebook-backup.json', 'application/json');
    try { D.kvSaved.textContent = new Date().toLocaleTimeString(); } catch (e) {}
  } catch (e) { toast('Backup failed: ' + (e.message || e), 'err'); }
}
function restoreAll(file) {
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var d = JSON.parse(String(rd.result || ''));
      if (d.prefs) { P = Object.assign({}, defaults, d.prefs); savePrefs(); }
      if (d.stats) { S.stats = Object.assign(S.stats, d.stats); saveStats(); }
      if (d.bookmarks) S.bookmarks = d.bookmarks;
      if (d.notes) S.notes = d.notes;
      if (d.marks) S.marks = d.marks;
      if (d.readSecs) S.readSecs = d.readSecs;
      if (Array.isArray(d.todos)) S.todos = d.todos;
      if (Array.isArray(d.counters)) S.counters = d.counters;
      if (d.habits) S.habits = d.habits;
      if (d.sw) S.sw = { running: false, base: d.sw.base || 0, startTs: 0, laps: d.sw.laps || [] };
      saveMarks(); savePower();
      applyReadingPrefs(); renderStopwatch(); renderCounters(); renderTodos(); renderHabits(); refreshHub();
      if (d.notebook && d.notebook.cells) {
        try { openNotebook(JSON.stringify(d.notebook), d.fileName || 'restored.ipynb', 0); } catch (e2) {}
      }
      toast('Backup restored', 'ok', 2200);
    } catch (err) { toast('Invalid backup file', 'err'); }
  };
  rd.readAsText(file);
}

/* ---------------- 22b. builder studio: snippets + wizards ---------------- */
var PY_SNIPS = [
  { t: 'pandas read_csv', d: 'Load a CSV file', code: 'import pandas as pd\n\ndf = pd.read_csv("data.csv")\nprint(df.shape)\ndf.head()' },
  { t: 'pandas describe', d: 'Stats + missing values', code: 'print(df.describe())\nprint(df.isna().sum())\nprint(df.dtypes)' },
  { t: 'matplotlib line', d: 'Quick line chart', code: 'import matplotlib.pyplot as plt\n\nplt.figure()\nplt.plot(x, y)\nplt.xlabel("x")\nplt.ylabel("y")\nplt.title("title")' },
  { t: 'matplotlib bar', d: 'Bar chart', code: 'import matplotlib.pyplot as plt\n\nplt.figure()\nplt.bar(labels, values)\nplt.xticks(rotation=45)\nplt.title("title")' },
  { t: 'matplotlib hist', d: 'Histogram', code: 'import matplotlib.pyplot as plt\n\nplt.figure()\nplt.hist(data, bins=20)\nplt.title("distribution")' },
  { t: 'matplotlib scatter', d: 'Scatter plot', code: 'import matplotlib.pyplot as plt\n\nplt.figure()\nplt.scatter(x, y, alpha=0.6)\nplt.title("scatter")' },
  { t: 'numpy starter', d: 'Arrays in one go', code: 'import numpy as np\n\na = np.arange(10)\nprint(a, a.mean(), a.std())' },
  { t: 'json load + dump', d: 'Read/write JSON', code: 'import json\n\nwith open("data.json") as f:\n    data = json.load(f)\nprint(type(data), len(data) if hasattr(data, "__len__") else "")' },
  { t: 'function def', d: 'Clean function template', code: 'def solve(x):\n    """What it does."""\n    return x\n\nprint(solve(42))' },
  { t: 'try / except', d: 'Safe block', code: 'try:\n    result = risky()\nexcept Exception as e:\n    print(type(e).__name__, e)' },
  { t: 'input prompt', d: 'Ask the user', code: 'name = input("Your name? ")\nprint(f"Hello, {name}!")' },
  { t: 'f-string demo', d: 'Formatted output', code: 'for i, v in enumerate(values):\n    print(f"{i}: {v:.2f}")' },
  { t: 'pathlib + datetime', d: 'Files and time', code: 'from pathlib import Path\nfrom datetime import datetime\n\nprint(Path.cwd())\nprint(datetime.now().strftime("%Y-%m-%d %H:%M"))' },
  { t: '!pip install', d: 'Add any package', code: '!pip install numpy\n\nimport numpy as np\nprint(np.__version__)' }
];
var MD_SNIPS = [
  { t: 'Callout note', d: 'Colored NOTE box', code: '> [!NOTE]\n> Write the key idea here.' },
  { t: 'Callout tip', d: 'Green TIP box', code: '> [!TIP]\n> A shortcut worth remembering.' },
  { t: 'Callout warning', d: 'Amber WARNING box', code: '> [!WARNING]\n> Danger: check this first.' },
  { t: 'Math block', d: 'Display LaTeX', code: '$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$' },
  { t: 'Task list', d: 'Checkable todos', code: '- [x] Load data\n- [ ] Clean it\n- [ ] Plot it' },
  { t: 'Details fold', d: 'Collapsible answer', code: '<details>\n<summary>Show answer</summary>\n\nThe answer is 42.\n\n</details>' },
  { t: 'Styled banner', d: 'Green exercise box', code: '<div style="background-color:#EDF7EF;color:#183E23;border-left:5px solid #2E8540;padding:16px 20px;border-radius:7px;">\n\n### Exercise 1\n\nDo the thing. Show your outputs.\n\n</div>' },
  { t: 'Mini table', d: '2x2 table', code: '| A | B |\n| --- | --- |\n| 1 | 2 |' }
];
function renderSnips() {
  if (D.snipCount) D.snipCount.textContent = (PY_SNIPS.length + MD_SNIPS.length) + ' snippets';
  if (D.pySnips) {
    D.pySnips.innerHTML = '';
    PY_SNIPS.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'snip';
      el.innerHTML = '<span class="si"><svg class="ic"><use href="#i-code"/></svg></span><span class="st"><b>' + esc(s.t) + '</b><span>' + esc(s.d) + '</span></span>';
      el.addEventListener('click', function () { insertSnippet(s.code, 'code'); });
      D.pySnips.appendChild(el);
    });
  }
  if (D.mdSnips) {
    D.mdSnips.innerHTML = '';
    MD_SNIPS.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'snip';
      el.innerHTML = '<span class="si"><svg class="ic"><use href="#i-text"/></svg></span><span class="st"><b>' + esc(s.t) + '</b><span>' + esc(s.d) + '</span></span>';
      el.addEventListener('click', function () { insertSnippet(s.code, 'md'); });
      D.mdSnips.appendChild(el);
    });
  }
}
function insertSnippet(code, lang) {
  if (!needNb()) return;
  var type = lang === 'md' ? 'markdown' : 'code';
  var ta = $('#cell-' + (S.active + 1) + ' textarea.code');
  var c = S.nb.cells[S.active];
  if (ta && c && ((type === 'code' && c.cell_type === 'code') || (type === 'markdown' && c.cell_type !== 'code'))) {
    var s = ta.selectionStart || ta.value.length, e = ta.selectionEnd || s;
    ta.value = ta.value.slice(0, s) + code + ta.value.slice(e);
    ta.focus();
    ta.dispatchEvent(new Event('input'));
    toast('Snippet inserted', 'ok', 1200);
    return;
  }
  addCell(S.active + 1, type, code);
  toast('Snippet cell added', 'ok', 1400);
}
function tableBuilder() {
  openModal({
    title: 'Table builder', icon: 'i-grid',
    html: '<div class="tool-row"><label class="field-label">Rows</label><input class="field" id="mRows" type="number" value="3" min="1" max="12" style="margin:0;flex:1"><label class="field-label">Cols</label><input class="field" id="mCols" type="number" value="3" min="1" max="8" style="margin:0;flex:1"></div>' +
      '<div class="toggle-row" style="margin-top:10px"><div><div class="t">Header row</div></div><label class="sw"><input type="checkbox" id="mHead" checked><span class="tr"></span></label></div>',
    footer: '<button class="btn ghost" data-close="1">Cancel</button><button class="btn accent" id="mGo">Insert table</button>',
    onMount: function (root) {
      $('#mGo', root).addEventListener('click', function () {
        var r = clamp(parseInt($('#mRows', root).value, 10) || 3, 1, 12);
        var cols = clamp(parseInt($('#mCols', root).value, 10) || 3, 1, 8);
        var head = $('#mHead', root).checked;
        var L = [];
        function row(prefix) {
          var cells = [];
          for (var k = 0; k < cols; k++) cells.push(prefix + ' ' + (k + 1));
          return '| ' + cells.join(' | ') + ' |';
        }
        if (head) { L.push(row('Head')); L.push('| ' + new Array(cols + 1).join('--- |')); }
        for (var i = 0; i < r; i++) {
          var cells = [];
          for (var k = 0; k < cols; k++) cells.push(' ');
          L.push('| ' + cells.join(' | ') + ' |');
        }
        closeModal();
        insertSnippet(L.join('\n'), 'md');
      });
    }
  });
}
function chartWizard() {
  openModal({
    title: 'Chart wizard', icon: 'i-chart',
    html: '<div class="field-label">Chart type</div>' +
      '<div class="seg" id="mCType" style="margin-top:8px"><button data-ct="plot" class="on">Line</button><button data-ct="bar">Bar</button><button data-ct="scatter">Scatter</button><button data-ct="hist">Hist</button></div>' +
      '<div class="field-label">X values (python expression)</div><input class="field" id="mX" value="x" style="margin-top:6px">' +
      '<div class="field-label">Y values (python expression, empty for hist)</div><input class="field" id="mY" value="y" style="margin-top:6px">' +
      '<div class="field-label">Title</div><input class="field" id="mT" value="My chart" style="margin-top:6px">',
    footer: '<button class="btn ghost" data-close="1">Cancel</button><button class="btn accent" id="mGo">Insert chart cell</button>',
    onMount: function (root) {
      var ct = 'plot';
      $$('#mCType button', root).forEach(function (b) {
        b.addEventListener('click', function () {
          ct = b.dataset.ct;
          $$('#mCType button', root).forEach(function (x) { x.classList.toggle('on', x === b); });
        });
      });
      $('#mGo', root).addEventListener('click', function () {
        var x = ($('#mX', root).value || 'x').trim(), y = ($('#mY', root).value || '').trim(), t = ($('#mT', root).value || 'chart').replace(/"/g, '');
        var code = 'import matplotlib.pyplot as plt\n\nplt.figure()\n';
        if (ct === 'hist') code += 'plt.hist(' + (x || 'data') + ', bins=20)\n';
        else if (ct === 'bar') code += 'plt.bar(' + x + (y ? ', ' + y : '') + ')\nplt.xticks(rotation=45)\n';
        else if (ct === 'scatter') code += 'plt.scatter(' + x + (y ? ', ' + y : '') + ', alpha=0.6)\n';
        else code += 'plt.plot(' + x + (y ? ', ' + y : '') + ')\n';
        code += 'plt.title("' + t + '")';
        closeModal();
        insertSnippet(code, 'code');
      });
    }
  });
}

/* ---------------- 22c. data power: vars, pip, plots, history ---------------- */
var VARS_PY =
  'import json as __js, inspect as __insp\n' +
  '__out = []\n' +
  'for __k in list(globals().keys()):\n' +
  '    if __k.startswith("_") or __k in ("In", "Out", "exit", "quit", "get_ipython", "builtins", "io", "base64"): continue\n' +
  '    __v = globals()[__k]\n' +
  '    try:\n' +
  '        __t = type(__v).__name__\n' +
  '        if __insp.ismodule(__v): __t = "module:" + getattr(__v, "__name__", __k)\n' +
  '    except Exception: __t = "?"\n' +
  '    try: __s = repr(__v)\n' +
  '    except Exception: __s = "?"\n' +
  '    __x = ""\n' +
  '    try:\n' +
  '        if hasattr(__v, "shape"): __x = "shape " + str(tuple(__v.shape))\n' +
  '        elif hasattr(__v, "dtypes"): __x = str(len(__v.columns)) + " cols x " + str(len(__v)) + " rows"\n' +
  '        elif hasattr(__v, "__len__") and not isinstance(__v, (str, bytes)): __x = "len " + str(len(__v))\n' +
  '    except Exception: pass\n' +
  '    __out.append({"k": __k, "t": __t, "s": __s[:160], "x": __x})\n' +
  '__out = sorted(__out, key=lambda d: d["k"])[:80]\n' +
  '__js.dumps(__out)';
function refreshVars(silent) {
  if (!S.nb || !S.kernel.ready) {
    if (!silent) toast(S.kernel.ready ? 'Open a notebook first' : 'Run a cell first — kernel starts the inspector', null, 2200);
    return;
  }
  kernelRun(VARS_PY).then(function (msg) {
    var txt = '';
    (msg.display || []).forEach(function (d) { if (d.mime === 'text/plain') txt = String(d.data); });
    try {
      var arr = JSON.parse(txt);
      if (Array.isArray(arr)) { S.vars = arr; renderVars(); return; }
    } catch (e) {}
    if (!silent) toast('Inspector found no variables yet', null, 1800);
  }).catch(function () {});
}
function renderVars() {
  if (!D.varsList) return;
  if (!S.vars.length) { D.varsList.innerHTML = '<div class="placeholder">Run a cell to inspect variables.</div>'; return; }
  D.varsList.innerHTML = S.vars.map(function (v, ix) {
    return '<div class="var-row" data-ix="' + ix + '"><span class="vn">' + esc(v.k) + '</span>' +
      '<span class="vt">' + esc(v.t) + '</span><span class="vv">' + esc(v.s) + '</span>' +
      (v.x ? '<span class="vx">' + esc(v.x) + '</span>' : '') + '</div>';
  }).join('');
  $$('.var-row', D.varsList).forEach(function (el) {
    el.addEventListener('click', function () { varDetail(parseInt(el.dataset.ix, 10)); });
  });
}
function varDetail(ix) {
  var v = S.vars[ix];
  if (!v) return;
  openModal({
    title: v.k + ' : ' + v.t, icon: 'i-eye',
    html: (v.x ? '<div class="kv"><span>Shape</span><b>' + esc(v.x) + '</b></div>' : '') +
      '<div class="field-label">Value preview</div>' +
      '<pre class="plain" style="margin-top:8px;max-height:300px">' + esc(v.s) + '</pre>' +
      '<div class="field-label" style="margin-top:8px">Full value lives in the kernel — print it into a cell:</div>',
    footer: '<button class="btn ghost" data-close="1">Close</button><button class="btn ghost" id="mCopy">Copy repr</button><button class="btn accent" id="mPrint">Print cell</button>',
    onMount: function (root) {
      $('#mCopy', root).addEventListener('click', function () { copyText(v.s); });
      $('#mPrint', root).addEventListener('click', function () {
        closeModal();
        addCell(S.active + 1, 'code', 'print(' + v.k + ')');
      });
    }
  });
}
function pipManager() {
  openModal({
    title: 'Package manager', icon: 'i-plus',
    html: '<div class="field-label">Install into the kernel (micropip, free)</div>' +
      '<div class="tool-row" style="margin:8px 0"><input class="field" id="mPkg" placeholder="numpy, pandas…" style="margin:0;flex:1"><button class="btn accent" id="mInstall">Install</button></div>' +
      '<div class="tool-row" style="margin-bottom:8px"><button class="btn ghost" id="mList">List installed</button></div>' +
      '<pre class="plain" id="mOut" style="min-height:90px;max-height:300px">Ready. Packages persist until kernel restart.</pre>',
    footer: '<button class="btn accent" data-close="1">Done</button>',
    onMount: function (root) {
      function say(t) { var o = $('#mOut', root); o.textContent = t; }
      $('#mInstall', root).addEventListener('click', function () {
        var pkg = $('#mPkg', root).value.trim();
        if (!pkg) return;
        say('Installing ' + pkg + ' …');
        kernelRun('!pip install ' + pkg).then(function (msg) {
          say(((msg.stdout || '') + (msg.stderr || '')).slice(0, 4000) || 'Done.');
        });
      });
      $('#mList', root).addEventListener('click', function () {
        say('Reading package list …');
        kernelRun('try:\n    import micropip as __m\n    __l = __m.list()\n    print(__l if isinstance(__l, str) else "\\n".join(sorted([str(getattr(__d, "name", __d)) for __d in (__l or [])])) or "(no extra packages yet)")\nexcept Exception:\n    print("micropip list unavailable yet - install something first")').then(function (msg) {
          say(((msg.stdout || '') + (msg.stderr || '')).slice(0, 4000) || '(empty)');
        });
      });
    }
  });
}
function plotGallery() {
  if (!needNb()) return;
  var plots = [];
  S.nb.cells.forEach(function (c, i) {
    (c.outputs || []).forEach(function (o) {
      if (!o.data) return;
      ['image/png', 'image/jpeg', 'image/svg+xml'].forEach(function (m) {
        if (o.data[m] !== undefined) plots.push({ cell: i, mime: m, data: dataText(o.data[m]) });
      });
    });
  });
  if (!plots.length) { toast('No plots yet — run a cell that draws'); return; }
  openModal({
    title: 'Plot gallery — ' + plots.length, icon: 'i-eye', wide: true,
    html: '<div class="plot-grid">' + plots.map(function (p, ix) {
      var src = p.mime === 'image/svg+xml' ? 'data:image/svg+xml;utf8,' + encodeURIComponent(p.data.slice(0, 400000))
        : p.mime === 'image/jpeg' ? 'data:image/jpeg;base64,' + p.data.replace(/\s+/g, '')
        : 'data:image/png;base64,' + p.data.replace(/\s+/g, '');
      return '<div class="plot-card" data-ix="' + ix + '"><img loading="lazy" src="' + src.slice(0, 500000) + '" alt="plot"><div class="pc">cell ' + (p.cell + 1) + ' · ' + esc(p.mime) + ' · tap to open</div></div>';
    }).join('') + '</div>',
    footer: '<button class="btn accent" data-close="1">Done</button>',
    onMount: function (root) {
      $$('.plot-card', root).forEach(function (el) {
        el.addEventListener('click', function () {
          var p = plots[parseInt(el.dataset.ix, 10)];
          closeModal();
          goToCell(p.cell, true);
        });
      });
    }
  });
}
function pushRunHist(cellIdx, ms, ok) {
  S.runHist.unshift({ cell: cellIdx, ms: ms, ok: !!ok, at: Date.now() });
  S.runHist = S.runHist.slice(0, 30);
  renderRunHist();
}
function renderRunHist() {
  if (!D.runHist) return;
  if (!S.runHist.length) { D.runHist.innerHTML = '<div class="placeholder">No runs this session.</div>'; return; }
  D.runHist.innerHTML = S.runHist.slice(0, 10).map(function (r) {
    var d = new Date(r.at);
    var hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    return '<div class="run-row' + (r.ok ? '' : ' err') + '" data-cell="' + r.cell + '"><span>cell ' + (r.cell + 1) + '</span><span style="color:var(--muted)">· ' + hh + ':' + mm + '</span><span class="rm">' + r.ms + 'ms</span></div>';
  }).join('');
  $$('.run-row', D.runHist).forEach(function (el) {
    el.addEventListener('click', function () { goToCell(parseInt(el.dataset.cell, 10), true); });
  });
}

/* ---------------- 23. features + actions (160, free & unlimited) ---------------- */
function needNb() { if (!S.nb) { toast('Open a notebook first (Ctrl+O)', 'err'); return false; } return true; }
function switchPane(name) {
  $$('#sideTabs .side-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.pane === name); });
  $$('.side-pane').forEach(function (p) { p.classList.toggle('active', p.id === 'pane-' + name); });
  openSidebar(true);
}
function infoModal(title, text) {
  openModal({ title: title, icon: 'i-info', html: '<div style="font-size:13.5px;line-height:1.7;color:var(--text-2)">' + text + '</div>', footer: '<button class="btn accent" data-close="1">Got it</button>' });
}
function cutCell(i) {
  var c = S.nb.cells[i];
  if (!c) return;
  S.cellClip = { mode: 'cut', cell: JSON.parse(JSON.stringify(c)), from: i };
  pushUndo();
  S.nb.cells.splice(i, 1);
  if (!S.nb.cells.length) S.nb.cells.push(blankCell('code', ''));
  S.active = clamp(i, 0, S.nb.cells.length - 1);
  renderAll(); buildOutline(); markDirty();
  toast('Cell cut — paste with V', null, 1600);
}
function copyCellFn(i) {
  var c = S.nb.cells[i];
  if (!c) return;
  S.cellClip = { mode: 'copy', cell: JSON.parse(JSON.stringify(c)) };
  toast('Cell copied — paste with V', 'ok', 1500);
}
function copyActiveOutputs() {
  var c = S.nb && S.nb.cells[S.active];
  if (!c || !(c.outputs || []).length) { toast('Active cell has no outputs'); return; }
  var parts = [];
  c.outputs.forEach(function (o) {
    if (o.output_type === 'stream') parts.push(dataText(o.text));
    else if (o.output_type === 'error') parts.push((o.ename || '') + ': ' + (o.evalue || ''));
    else if (o.data) { var m = pickMime(o.data); parts.push(dataText(o.data[m]).slice(0, 8000)); }
  });
  copyText(parts.join('\n'));
}
function errJump() {
  if (!needNb()) return;
  for (var i = 0; i < S.nb.cells.length; i++) {
    var outs = S.nb.cells[i].outputs || [];
    for (var k = 0; k < outs.length; k++) if (outs[k].output_type === 'error') { goToCell(i, true); toast('First error at cell ' + (i + 1), null, 1800); return; }
  }
  toast('No errors in this notebook', 'ok', 1600);
}
function execStatsModal() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var ms = 0, n = 0;
  S.nb.cells.forEach(function (c) { if (c._runMs) { ms += c._runMs; n++; } });
  openModal({
    title: 'Execution stats', icon: 'i-chart',
    html: '<div class="prop-row"><div class="k">Cells run (file)</div><div class="v">' + S.nb.cells.filter(function (c) { return c.execution_count != null; }).length + ' / ' + S.nb.cells.length + '</div></div>' +
      '<div class="prop-row"><div class="k">Total run time</div><div class="v">' + ms + ' ms' + (n ? ' across ' + n + ' timed cells' : '') + '</div></div>' +
      '<div class="prop-row"><div class="k">Session runs</div><div class="v">' + S.stats.cellsRun + ' cells executed</div></div>' +
      '<div class="prop-row"><div class="k">Kernel</div><div class="v">' + esc(S.kernel.state) + (S.kernel.ready ? ' (Pyodide ready)' : ' (loads on first Run)') + '</div></div>' +
      (S.runHist.length ? '<div class="mini-label">Last runs</div>' + S.runHist.slice(0, 8).map(function (r) {
        return '<div class="kv"><span>cell ' + (r.cell + 1) + (r.ok ? '' : ' · error') + '</span><b>' + r.ms + 'ms</b></div>';
      }).join('') : ''),
    footer: '<button class="btn accent" data-close="1">Done</button>'
  });
}
function kernelInfoModal() {
  openModal({
    title: 'Kernel', icon: 'i-terminal',
    html: '<div class="prop-row"><div class="k">State</div><div class="v">' + esc(S.kernel.state) + '</div></div>' +
      '<div class="prop-row"><div class="k">Engine</div><div class="v">Pyodide (CPython in WebAssembly), isolated sandbox, micropip + matplotlib capture</div></div>' +
      '<div class="prop-row"><div class="k">Loads</div><div class="v">Only when you Run — needs internet once, then runs fully local in RAM</div></div>' +
      '<div class="prop-row"><div class="k">Tip</div><div class="v">Use <b>!pip install numpy</b> in a cell · <b>input()</b> prompts you · magics are skipped safely</div></div>',
    footer: '<button class="btn ghost" data-close="1">Close</button><button class="btn accent" id="mLoad">Load kernel now</button>',
    onMount: function (root) {
      $('#mLoad', root).addEventListener('click', function () { closeModal(); ensureKernelFrame(); kernelPost({ type: 'ping' }); setKernel('loading'); toast('Loading Python kernel…', null, 2500); });
    }
  });
}
function wcModal() {
  if (!S.nb) { toast('Open a notebook first', 'err'); return; }
  var codeLines = 0, mdWords = 0, outs = 0;
  S.nb.cells.forEach(function (c) {
    if (c.cell_type === 'code') codeLines += c.source.split('\n').length;
    else mdWords += wordCountOf(c.source);
    outs += (c.outputs || []).length;
  });
  openModal({
    title: 'Notebook counts', icon: 'i-text',
    html: '<div class="prop-row"><div class="k">Code lines</div><div class="v">' + codeLines.toLocaleString() + '</div></div>' +
      '<div class="prop-row"><div class="k">Markdown words</div><div class="v">' + mdWords.toLocaleString() + '</div></div>' +
      '<div class="prop-row"><div class="k">Outputs stored</div><div class="v">' + outs.toLocaleString() + '</div></div>' +
      '<div class="prop-row"><div class="k">File</div><div class="v">' + esc(S.fileName) + ' · ' + fmtBytes(S.fileSize) + '</div></div>',
    footer: '<button class="btn accent" data-close="1">Done</button>'
  });
}
function privacyModal() {
  infoModal('Private by design', 'Your <b>.ipynb bytes stay on this device</b> (blob: URLs, memory only). Recents, autosaves, marks, notes and tools live in <b>IndexedDB / localStorage of your browser profile</b> — no server, no analytics, no account. The Python kernel runs <b>isolated in a sandbox iframe</b> and only contacts the CDN once to download itself. Untrusted notebooks get <b>sanitized HTML</b> (scripts stripped) until you Trust them. Uninstalling clears everything — use <b>Backup all</b> first.');
}
function openProfileModal() {
  openModal({
    title: 'Profile', icon: 'i-user',
    html: '<div class="field-label">Display name</div><input class="field" id="mName" value="' + esc(P.profileName || '') + '" style="margin-top:8px">',
    footer: '<button class="btn ghost" data-close="1">Cancel</button><button class="btn accent" id="mSave">Save</button>',
    onMount: function (root) {
      $('#mSave', root).addEventListener('click', function () {
        P.profileName = $('#mName', root).value.trim() || 'My Studio';
        savePrefs(); refreshHub(); closeModal();
      });
    }
  });
}
function shortcutsModal() {
  var rows = [
    ['Ctrl + O', 'Open notebook'], ['Ctrl + S', 'Save .ipynb'], ['Ctrl + F', 'Search notebook'],
    ['Ctrl + K', 'Command palette (all ' + FEATURES.length + ')'], ['Ctrl + B', 'Toggle sidebar'], ['Ctrl + Enter', 'Run cell, stay'],
    ['Shift + Enter', 'Run cell, next'], ['J / K or Ctrl + ↓/↑', 'Next / previous cell'], ['A', 'Code cell above'],
    ['B', 'Code cell below'], ['M', 'Markdown cell below'], ['V', 'Paste cell'], ['E', 'Edit / preview cell'],
    ['T', 'Theme'], ['F', 'All features'], ['?', 'This help'], ['Enter (search)', 'Next match'], ['Shift + Enter (search)', 'Previous match'], ['Esc', 'Close dialog']
  ];
  openModal({
    title: 'Keyboard shortcuts', icon: 'i-keyboard',
    html: '<div class="kbd-grid">' + rows.map(function (r) { return '<div class="k-label">' + esc(r[1]) + '</div><div class="kbd-row"><kbd>' + esc(r[0]) + '</kbd></div>'; }).join('') + '</div>',
    footer: '<button class="btn accent" data-close="1">Done</button>'
  });
}

var ACTIONS = {
  open: function () { pickFile(); },
  url: askUrl, paste: askPaste,
  demo: function () { try { openNotebook(JSON.stringify(demoNotebook()), 'demo.ipynb', 0); saveRecent('demo.ipynb', 0, JSON.stringify(demoNotebook()), 0); } catch (e) { toast('Demo failed', 'err'); } },
  trust: function () {
    if (!S.docId) { toast('Open a notebook first', 'err'); return; }
    if (isTrusted()) delete P.trusted[S.docId]; else P.trusted[S.docId] = 1;
    savePrefs(); renderAll();
    D.trustBar.className = 'trustbar ' + (isTrusted() ? 'trusted' : 'untrusted');
    D.trustText.textContent = isTrusted() ? 'Trusted — rich HTML outputs render fully.' : 'Untrusted — HTML outputs sanitized (scripts stripped).';
    D.btnTrust.textContent = isTrusted() ? 'Untrust' : 'Trust';
  },
  run: function () { if (needNb()) { applyEdit(S.active); runCell(S.active, true); } },
  'run-stay': function () { if (needNb()) { applyEdit(S.active); runCell(S.active, false); } },
  'run-insert': function () { if (!needNb()) return; applyEdit(S.active); runCell(S.active, false); setTimeout(function () { addCell(S.active + 1, 'code'); }, 60); },
  runall: runAll,
  runabove: function () { if (needNb()) runAbove(S.active); },
  restart: restartKernel,
  kernel: function () { ensureKernelFrame(); kernelPost({ type: 'ping' }); setKernel('loading'); toast('Loading Python kernel (once, from CDN)…', null, 3000); },
  execstats: execStatsModal, kinfo: kernelInfoModal,
  addcode: function () { if (needNb()) addCell(S.active + 1, 'code'); },
  addmd: function () { if (needNb()) addCell(S.active + 1, 'markdown'); },
  addabove: function () { if (needNb()) addCell(S.active, 'code'); },
  split: function () { if (needNb()) splitCell(S.active); },
  cut: function () { if (needNb()) cutCell(S.active); },
  copycell: function () { if (needNb()) copyCellFn(S.active); },
  pastecell: function () { if (needNb()) pasteCell(S.active + 1); },
  dup: function () { if (needNb()) duplicateCell(S.active); },
  del: function () { if (needNb()) deleteCell(S.active); },
  up: function () { if (needNb()) moveCell(S.active, -1); },
  down: function () { if (needNb()) moveCell(S.active, 1); },
  tocode: function () { if (needNb()) setCellType(S.active, 'code'); },
  tomd: function () { if (needNb()) setCellType(S.active, 'markdown'); },
  toraw: function () { if (needNb()) setCellType(S.active, 'raw'); },
  mdedit: function () { if (!needNb()) return; var c = S.nb.cells[S.active]; editCell(S.active, !c._editing); },
  collsrc: function () { if (!needNb()) return; var c = S.nb.cells[S.active]; c._collapsedSrc = !c._collapsedSrc; refreshCell(S.active); },
  collout: function () { if (!needNb()) return; var c = S.nb.cells[S.active]; c._collapsedOut = !c._collapsedOut; refreshCell(S.active); },
  'toggle-out': function () { P.showOut = !P.showOut; savePrefs(); applyReadingPrefs(); if (S.nb) renderAll(); toast('Outputs ' + (P.showOut ? 'shown' : 'hidden')); },
  undo: undo, redo: redo,
  search: function () { switchPane('search'); setTimeout(function () { D.searchInput.focus(); }, 80); },
  case: function () { S.searchCase = !S.searchCase; D.swCase.classList.toggle('on', S.searchCase); runSearch(); },
  whole: function () { S.searchWhole = !S.searchWhole; D.swWhole.classList.toggle('on', S.searchWhole); runSearch(); },
  prev: function () { jumpSearch(S.searchCursor - 1); },
  next: function () { jumpSearch(S.searchCursor + 1); },
  expsearch: exportSearch,
  errjump: errJump,
  top: function () { D.viewer.scrollTo({ top: 0, behavior: 'smooth' }); },
  goto: function () {
    openModal({
      title: 'Go to cell', icon: 'i-list',
      html: '<input class="field" id="mCell" type="number" min="1" value="' + ((S.active || 0) + 1) + '">',
      footer: '<button class="btn ghost" data-close="1">Cancel</button><button class="btn accent" id="mGo">Go</button>',
      onMount: function (root) {
        function go() { var v = parseInt($('#mCell', root).value, 10); if (v) { closeModal(); goToCell(v - 1, true); } }
        $('#mGo', root).addEventListener('click', go);
        $('#mCell', root).addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      }
    });
  },
  save: saveIpynb, py: exportPy, md: exportMd, html: exportHtml, txt: exportTxt,
  print: function () { if (needNb()) window.print(); },
  copysrc: function () { if (!needNb()) return; applyEdit(S.active); copyText(S.nb.cells[S.active].source); },
  copyout: copyActiveOutputs,
  dupnb: function () { if (!needNb()) return; S.nb.cells.forEach(applyEditByRef); downloadFile(JSON.stringify(toIpynb(S.nb), null, 1), baseName() + '-copy.ipynb', 'application/json'); },
  share: function () { if (!needNb()) return; copyText(location.href.split('#')[0] + '#cell-' + (S.active + 1)); },
  backup: backupAll, restore: function () { D.restoreInput.click(); },
  theme: function () { Theme.toggle(); },
  light: function () { Theme.set('light'); }, dark: function () { Theme.set('dark'); }, system: function () { Theme.set('system'); },
  accent: function () { var i = ACCENTS.indexOf(P.accent); P.accent = ACCENTS[(i + 1) % ACCENTS.length]; savePrefs(); Theme.apply(); toast('Accent ' + P.accent, null, 1200); },
  night: function () { P.pageMode = 'night'; savePrefs(); applyReadingPrefs(); },
  sepia: function () { P.pageMode = 'sepia'; savePrefs(); applyReadingPrefs(); },
  dim: function () { P.pageMode = 'dim'; savePrefs(); applyReadingPrefs(); },
  width: function () {
    var order = ['narrow', 'comfort', 'wide', 'full'];
    P.docW = order[(order.indexOf(P.docW) + 1) % order.length];
    savePrefs(); applyReadingPrefs(); toast('Width: ' + P.docW, null, 1200);
  },
  fontinc: function () { P.fontSize = clamp(P.fontSize + 1, 12, 22); savePrefs(); applyReadingPrefs(); },
  fontdec: function () { P.fontSize = clamp(P.fontSize - 1, 12, 22); savePrefs(); applyReadingPrefs(); },
  focus: function () { document.body.classList.toggle('focus-mode'); toast(document.body.classList.contains('focus-mode') ? 'Focus mode — sidebar hidden' : 'Focus mode off', null, 1500); },
  full: function () { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} },
  present: function () {
    document.body.classList.toggle('present-doc');
    if (document.body.classList.contains('present-doc')) toast('Presentation — Esc exits', null, 2000);
  },
  markh: function () { applyMark('highlight'); }, marku: function () { applyMark('underline'); },
  marks: function () { applyMark('strike'); }, markcopy: function () { applyMark('copy'); }, marknote: function () { applyMark('note'); },
  bookmark: function () { if (needNb()) toggleBookmark(S.active); },
  noteadd: function () { switchPane('hub'); setTimeout(function () { if (D.noteInput) D.noteInput.focus(); }, 80); },
  swstart: function () {
    if (S.sw.running) { S.sw.base = swElapsed(); S.sw.running = false; }
    else { S.sw.startTs = Date.now(); S.sw.running = true; }
    savePower(); renderStopwatch();
  },
  swlap: function () {
    if (!S.sw.running && S.sw.base === 0 && !S.sw.laps.length) { toast('Start the stopwatch first'); return; }
    var t = swElapsed();
    S.sw.laps.push({ t: t, d: t - (S.sw.laps.length ? S.sw.laps[S.sw.laps.length - 1].t : 0) });
    S.sw.laps = S.sw.laps.slice(-50);
    savePower(); renderStopwatch();
  },
  swreset: function () { S.sw = { running: false, base: 0, startTs: 0, laps: [] }; savePower(); renderStopwatch(); },
  cadd: function () { switchPane('tools'); setTimeout(function () { D.counterName.focus(); }, 80); },
  tadd: function () { switchPane('tools'); setTimeout(function () { D.todoInput.focus(); }, 80); },
  tfilter: function () {
    var order = ['open', 'done', 'all'];
    S.todoFilter = order[(order.indexOf(S.todoFilter) + 1) % order.length];
    renderTodos(); toast('Todo filter: ' + S.todoFilter, null, 1200);
  },
  texp: function () {
    if (!S.todos.length) { toast('No tasks to export'); return; }
    downloadFile(S.todos.map(function (t) { return '- [' + (t.done ? 'x' : ' ') + '] ' + t.text + ' (' + t.prio + ')'; }).join('\n'), 'heros-tasks.md', 'text/markdown');
  },
  tclear: function () { S.todos = S.todos.filter(function (t) { return !t.done; }); savePower(); renderTodos(); toast('Done tasks cleared', 'ok', 1400); },
  hadd: function () { switchPane('tools'); setTimeout(function () { D.habitName.focus(); }, 80); },
  autofile: function () { P.autoFile = !P.autoFile; savePrefs(); syncExtPrefs(); applyReadingPrefs(); toast('Auto-open local: ' + (P.autoFile ? 'ON' : 'OFF')); },
  autoweb: function () { P.autoWeb = !P.autoWeb; savePrefs(); syncExtPrefs(); applyReadingPrefs(); toast('Auto-open web: ' + (P.autoWeb ? 'ON' : 'OFF')); },
  filetip: function () { if (D.filePermTip) { D.filePermTip.hidden = false; D.filePermTip.scrollIntoView({ behavior: 'smooth', block: 'center' }); } },
  privacy: privacyModal,
  lint: function () { switchPane('tools'); labLint(); }, summary: function () { switchPane('tools'); labSummary(); },
  keywords: function () { switchPane('tools'); labKeywords(); }, read: function () { switchPane('tools'); labReadability(); },
  copyoutline: copyOutline, copystats: copyStats, validate: validateNb, wc: wcModal,
  shortcuts: shortcutsModal,
  features: openFeatures,
  palette: openPalette,
  // builder studio
  snips: function () { switchPane('build'); },
  table: function () { if (needNb()) tableBuilder(); },
  chart: function () { if (needNb()) chartWizard(); },
  csv: function () { insertSnippet(PY_SNIPS[0].code, 'code'); },
  plotline: function () { insertSnippet(PY_SNIPS[2].code, 'code'); },
  pipsnip: function () { insertSnippet(PY_SNIPS[13].code, 'code'); },
  jsonsnip: function () { insertSnippet(PY_SNIPS[7].code, 'code'); },
  callout: function () { insertSnippet(MD_SNIPS[0].code, 'md'); },
  mathblock: function () { insertSnippet(MD_SNIPS[3].code, 'md'); },
  details: function () { insertSnippet(MD_SNIPS[5].code, 'md'); },
  banner: function () { insertSnippet(MD_SNIPS[6].code, 'md'); },
  tasklist: function () { insertSnippet(MD_SNIPS[4].code, 'md'); },
  // data power
  vars: function () { switchPane('cells'); refreshVars(false); },
  vardetail: function () {
    if (!S.vars.length) { toast('Run a cell first, then inspect'); switchPane('cells'); return; }
    varDetail(0);
  },
  pip: function () { pipManager(); },
  plots: plotGallery,
  runhist: function () { switchPane('hub'); },
  // design + profile
  motion: function () {
    P.motion = !P.motion; savePrefs(); applyReadingPrefs();
    toast(P.motion ? 'Motion on (subtle)' : 'Silent motion — zero animations', null, 1800);
  },
  profilecolor: function () { switchPane('hub'); },
  profilename: openProfileModal
};
function runAction(a) {
  if (!a) return;
  if (a.indexOf('info:') === 0) { infoModal('Feature', a.slice(5)); return; }
  if (a.indexOf('pane-') === 0) { switchPane(a.slice(5)); return; }
  var fn = ACTIONS[a];
  if (fn) { try { fn(); } catch (e) { toast('Failed: ' + (e.message || e), 'err'); } }
  else toast('Coming soon in this build', null, 1600);
}

var FEATURES = [
  // A. Open & View (18)
  { c: 'Open & View', i: 'i-folder', t: 'Open .ipynb file', d: 'Picker, Ctrl+O, instant parse', a: 'open' },
  { c: 'Open & View', i: 'i-upload-cloud', t: 'Drag & drop anywhere', d: 'Drop a notebook onto the window', a: 'info:Drag any .ipynb file onto the window — it opens instantly, 100% local. No upload, ever.' },
  { c: 'Open & View', i: 'i-globe', t: 'Open from URL', d: 'Raw GitHub, gist, any CORS-open link', a: 'url' },
  { c: 'Open & View', i: 'i-share', t: '?nb= deep open', d: 'viewer.html?nb=URL opens directly', a: 'info:Share links like viewer.html?nb=https://…/notebook.ipynb — the app fetches and renders it on load.' },
  { c: 'Open & View', i: 'i-edit', t: 'Paste notebook JSON', d: 'Paste raw .ipynb source', a: 'paste' },
  { c: 'Open & View', i: 'i-sparkle', t: 'Demo notebook', d: '7-cell tour: markdown, run, plot, error', a: 'demo' },
  { c: 'Open & View', i: 'i-history', t: 'Recent notebooks', d: 'Last 25, one-click reopen, offline', a: 'pane-recent' },
  { c: 'Open & View', i: 'i-check', t: 'Resume at last cell', d: 'Reopens where you left off', a: 'info:Turn on Hub → Resume reading. Each notebook remembers its last active cell.' },
  { c: 'Open & View', i: 'i-book', t: 'Notebook header', d: 'Kernel, counts, outputs, words', a: 'info:The pill header shows file, kernelspec, cell counts, output totals and markdown words at a glance.' },
  { c: 'Open & View', i: 'i-terminal', t: 'Kernelspec badge', d: 'Language + display name shown', a: 'info:The header pill shows the notebook kernelspec (e.g. Python 3) and language.' },
  { c: 'Open & View', i: 'i-shield', t: 'Trust bar', d: 'One-tap trust / untrust per file', a: 'trust' },
  { c: 'Open & View', i: 'i-eye-dim', t: 'HTML sanitizing', d: 'Scripts stripped until trusted', a: 'info:Untrusted notebooks render HTML outputs sanitized: no scripts, no event handlers, no javascript: links.' },
  { c: 'Open & View', i: 'i-eye', t: 'Lazy images', d: 'Outputs decode off-screen cheaply', a: 'info:All output images lazy-load and carry size caps so 500-plot notebooks stay smooth.' },
  { c: 'Open & View', i: 'i-chev-down', t: 'Collapse all outputs', d: 'Read like a book, expand anytime', a: 'toggle-out' },
  { c: 'Open & View', i: 'i-play', t: 'Execution badges', d: '[1] per cell, [*] while running', a: 'info:Every code cell shows its execution count. Running cells pulse [*] until done.' },
  { c: 'Open & View', i: 'i-list', t: 'Auto-collapsed streams', d: '30+ line outputs collapse, tap to open', a: 'info:Long terminal streams collapse automatically — tap to expand, never lose your scroll.' },
  { c: 'Open & View', i: 'i-share', t: 'Cell permalinks', d: '#cell-N links, copy + deep open', a: 'share' },
  { c: 'Open & View', i: 'i-list', t: 'Go to cell number', d: 'Jump box + dialog', a: 'goto' },
  // B. Run Python (14)
  { c: 'Run Python', i: 'i-play', t: 'Run cell', d: 'Shift+Enter — real Python, free', a: 'run' },
  { c: 'Run Python', i: 'i-play', t: 'Run cell, stay', d: 'Ctrl+Enter keeps cursor', a: 'run-stay' },
  { c: 'Run Python', i: 'i-plus', t: 'Run + insert below', d: 'Execute and keep flowing', a: 'run-insert' },
  { c: 'Run Python', i: 'i-play-all', t: 'Run all cells', d: 'Queued top-to-bottom, one kernel', a: 'runall' },
  { c: 'Run Python', i: 'i-up', t: 'Run cells above', d: 'Setup cells first, one tap', a: 'runabove' },
  { c: 'Run Python', i: 'i-refresh', t: 'Restart kernel', d: 'Fresh namespace, variables cleared', a: 'restart' },
  { c: 'Run Python', i: 'i-terminal', t: 'Load kernel now', d: 'Pre-download Python (once)', a: 'kernel' },
  { c: 'Run Python', i: 'i-plus', t: '!pip install support', d: 'micropip installs in-cell', a: 'info:Write !pip install numpy in a cell and run it — micropip installs the package into your kernel.' },
  { c: 'Run Python', i: 'i-text', t: 'input() prompts', d: 'Synchronous ask dialogs', a: 'info:Python input() opens a prompt dialog and feeds your answer back — interactive notebooks work.' },
  { c: 'Run Python', i: 'i-chart', t: 'matplotlib inline', d: 'Figures captured as PNG', a: 'info:plt plots are captured to PNG automatically (Agg backend) and shown under the cell. No setup needed.' },
  { c: 'Run Python', i: 'i-sparkle', t: 'Rich display', d: 'HTML, SVG, PNG, Markdown, JSON', a: 'info:Last-expression values render rich: _repr_html_, SVG, PNG, Markdown, JSON and plain repr — like Jupyter.' },
  { c: 'Run Python', i: 'i-clock', t: 'Per-cell timers', d: 'ms badges + session stats', a: 'execstats' },
  { c: 'Run Python', i: 'i-terminal', t: 'Kernel info', d: 'State, engine, tips', a: 'kinfo' },
  { c: 'Run Python', i: 'i-alert', t: 'Safe magics', d: '% and ! handled gracefully', a: 'info:Shell lines and magics never crash the kernel: pip installs work, the rest become friendly notes in stdout.' },
  // C. Edit (19)
  { c: 'Edit', i: 'i-code', t: 'Add code cell', d: 'B — below the active cell', a: 'addcode' },
  { c: 'Edit', i: 'i-text', t: 'Add markdown cell', d: 'M — with live preview', a: 'addmd' },
  { c: 'Edit', i: 'i-up', t: 'Add cell above', d: 'A — code above active', a: 'addabove' },
  { c: 'Edit', i: 'i-split', t: 'Split at cursor', d: 'One cell becomes two', a: 'split' },
  { c: 'Edit', i: 'i-scissors', t: 'Cut cell', d: 'Move it anywhere with V', a: 'cut' },
  { c: 'Edit', i: 'i-copy', t: 'Copy cell', d: 'Source + outputs + type', a: 'copycell' },
  { c: 'Edit', i: 'i-plus', t: 'Paste cell', d: 'V — below active', a: 'pastecell' },
  { c: 'Edit', i: 'i-copy', t: 'Duplicate cell', d: 'Exact clone below', a: 'dup' },
  { c: 'Edit', i: 'i-trash', t: 'Delete cell', d: 'Undoable, never loses all', a: 'del' },
  { c: 'Edit', i: 'i-up', t: 'Move cell up', d: 'Reorder freely', a: 'up' },
  { c: 'Edit', i: 'i-down', t: 'Move cell down', d: 'Reorder freely', a: 'down' },
  { c: 'Edit', i: 'i-code', t: 'Cell → code', d: 'Type switcher', a: 'tocode' },
  { c: 'Edit', i: 'i-text', t: 'Cell → markdown', d: 'Type switcher', a: 'tomd' },
  { c: 'Edit', i: 'i-file', t: 'Cell → raw', d: 'Type switcher', a: 'toraw' },
  { c: 'Edit', i: 'i-edit', t: 'Edit / preview', d: 'E — markdown + code editors', a: 'mdedit' },
  { c: 'Edit', i: 'i-eye-dim', t: 'Collapse source', d: 'Hide code per cell', a: 'collsrc' },
  { c: 'Edit', i: 'i-chev-down', t: 'Collapse outputs', d: 'Per-cell output fold', a: 'collout' },
  { c: 'Edit', i: 'i-history', t: 'Undo structure', d: '50-step cell history', a: 'undo' },
  { c: 'Edit', i: 'i-refresh', t: 'Redo structure', d: 'Re-apply undone edits', a: 'redo' },
  // D. Search & Navigate (11)
  { c: 'Search', i: 'i-search', t: 'Full-notebook search', d: 'Code + markdown + outputs', a: 'search' },
  { c: 'Search', i: 'i-text', t: 'Case sensitive', d: 'Aa toggle', a: 'case' },
  { c: 'Search', i: 'i-text', t: 'Whole word', d: 'Unicode-aware |ab|', a: 'whole' },
  { c: 'Search', i: 'i-chev-left', t: 'Previous match', d: 'Shift+Enter', a: 'prev' },
  { c: 'Search', i: 'i-chev-right', t: 'Next match', d: 'Enter', a: 'next' },
  { c: 'Search', i: 'i-download', t: 'Export results', d: 'Matches as .txt', a: 'expsearch' },
  { c: 'Search', i: 'i-grid', t: 'Cell navigator', d: 'Every cell, click-to-jump', a: 'pane-cells' },
  { c: 'Search', i: 'i-list', t: 'Outline', d: 'Headings + def/class map', a: 'pane-outline' },
  { c: 'Search', i: 'i-list', t: 'Go to cell', d: 'Number dialog', a: 'goto' },
  { c: 'Search', i: 'i-alert', t: 'Jump to first error', d: 'Find the red cell fast', a: 'errjump' },
  { c: 'Search', i: 'i-up', t: 'Back to top', d: 'One tap', a: 'top' },
  // E. Export & Share (14)
  { c: 'Export', i: 'i-save', t: 'Save .ipynb', d: 'Ctrl+S — with fresh outputs', a: 'save' },
  { c: 'Export', i: 'i-code', t: 'Export .py', d: 'Markdown becomes comments', a: 'py' },
  { c: 'Export', i: 'i-text', t: 'Export .md', d: 'Prose + code + outputs', a: 'md' },
  { c: 'Export', i: 'i-globe', t: 'Export .html', d: 'Standalone styled page', a: 'html' },
  { c: 'Export', i: 'i-file', t: 'Export .txt', d: 'Plain cell dump', a: 'txt' },
  { c: 'Export', i: 'i-printer', t: 'Print / PDF', d: 'Clean print stylesheet', a: 'print' },
  { c: 'Export', i: 'i-copy', t: 'Copy cell source', d: 'Active cell to clipboard', a: 'copysrc' },
  { c: 'Export', i: 'i-copy', t: 'Copy cell outputs', d: 'Text of all outputs', a: 'copyout' },
  { c: 'Export', i: 'i-download', t: 'Download plot images', d: 'Click any output image', a: 'info:Click any PNG/JPEG output image to download it instantly.' },
  { c: 'Export', i: 'i-save', t: 'Backup everything', d: 'One JSON: prefs, tools, notes', a: 'backup' },
  { c: 'Export', i: 'i-upload-cloud', t: 'Restore backup', d: 'Rebuild whole studio', a: 'restore' },
  { c: 'Export', i: 'i-share', t: 'Share cell link', d: 'Copy #cell-N URL', a: 'share' },
  { c: 'Export', i: 'i-copy', t: 'Duplicate notebook', d: 'Save a -copy file', a: 'dupnb' },
  { c: 'Export', i: 'i-check', t: 'Validate notebook', d: 'nbformat + id checks', a: 'validate' },
  // F. Themes & Comfort (13)
  { c: 'Comfort', i: 'i-moon', t: 'Theme toggle', d: 'T — dark / light instant', a: 'theme' },
  { c: 'Comfort', i: 'i-sun', t: 'Light theme', d: 'Crisp studio white', a: 'light' },
  { c: 'Comfort', i: 'i-moon', t: 'Dark theme', d: 'Deep OLED-friendly', a: 'dark' },
  { c: 'Comfort', i: 'i-sliders', t: 'System theme', d: 'Follows your OS', a: 'system' },
  { c: 'Comfort', i: 'i-palette', t: 'Accent colors', d: '6 presets + custom picker', a: 'accent' },
  { c: 'Comfort', i: 'i-moon', t: 'Night pages', d: 'Inverted cells for night', a: 'night' },
  { c: 'Comfort', i: 'i-sun', t: 'Sepia pages', d: 'Warm long-session paper', a: 'sepia' },
  { c: 'Comfort', i: 'i-eye-dim', t: 'Dim pages', d: 'Low-light reading', a: 'dim' },
  { c: 'Comfort', i: 'i-grid', t: 'Reading widths', d: 'Narrow → full viewport', a: 'width' },
  { c: 'Comfort', i: 'i-text', t: 'Font bigger', d: '12–22px scaling', a: 'fontinc' },
  { c: 'Comfort', i: 'i-text', t: 'Font smaller', d: '12–22px scaling', a: 'fontdec' },
  { c: 'Comfort', i: 'i-eye', t: 'Focus mode', d: 'Hides sidebar', a: 'focus' },
  { c: 'Comfort', i: 'i-maximize', t: 'Fullscreen', d: 'Distraction-free', a: 'full' },
  // G. Study & Marks (10)
  { c: 'Study', i: 'i-highlighter', t: 'Highlight selection', d: 'H on any rendered text', a: 'markh' },
  { c: 'Study', i: 'i-underline', t: 'Underline selection', d: 'U on any rendered text', a: 'marku' },
  { c: 'Study', i: 'i-strike', t: 'Strike selection', d: 'S on any rendered text', a: 'marks' },
  { c: 'Study', i: 'i-copy', t: 'Copy selection', d: 'C from the mini-bar', a: 'markcopy' },
  { c: 'Study', i: 'i-edit', t: 'Note from selection', d: 'Quote + comment per file', a: 'marknote' },
  { c: 'Study', i: 'i-check', t: 'Marks auto-saved', d: 'Per notebook, survive reload', a: 'info:Every highlight, underline and strike is saved per notebook and repainted when you reopen it.' },
  { c: 'Study', i: 'i-bookmark', t: 'Cell bookmarks', d: 'Star cells, jump back', a: 'bookmark' },
  { c: 'Study', i: 'i-edit', t: 'Notebook notes', d: 'Per-file persistent notes', a: 'noteadd' },
  { c: 'Study', i: 'i-text', t: 'Callouts + tables', d: 'NOTE/TIP/WARNING render', a: 'info:Markdown cells render GitHub callouts, GFM tables, task lists, footnotes-style refs and math.' },
  { c: 'Study', i: 'i-share', t: 'Clickable links', d: 'Safe external targets', a: 'info:Links in markdown and HTML outputs open in new tabs with noopener; javascript: links are stripped.' },
  // H. Productivity (14)
  { c: 'Productivity', i: 'i-clock', t: 'Stopwatch', d: 'Start / pause, survives reload', a: 'swstart' },
  { c: 'Productivity', i: 'i-clock', t: 'Stopwatch laps', d: '50 saved, deltas shown', a: 'swlap' },
  { c: 'Productivity', i: 'i-x', t: 'Stopwatch reset', d: 'Clear time + laps', a: 'swreset' },
  { c: 'Productivity', i: 'i-plus', t: 'Add counter', d: 'Unlimited named tallies', a: 'cadd' },
  { c: 'Productivity', i: 'i-sliders', t: 'Custom counter steps', d: 'Any step size per counter', a: 'info:Counters accept any step size — count experiments, reps, anything, with +/− per counter.' },
  { c: 'Productivity', i: 'i-check', t: 'Add task', d: 'Todo with priorities', a: 'tadd' },
  { c: 'Productivity', i: 'i-sliders', t: 'Task priorities', d: 'High / med / low badges', a: 'info:Tasks carry high/med/low priority badges and file-or-global scope.' },
  { c: 'Productivity', i: 'i-list', t: 'Task filters', d: 'Open / done / all cycle', a: 'tfilter' },
  { c: 'Productivity', i: 'i-download', t: 'Export tasks', d: 'Markdown checklist file', a: 'texp' },
  { c: 'Productivity', i: 'i-trash', t: 'Clear done tasks', d: 'One-tap tidy', a: 'tclear' },
  { c: 'Productivity', i: 'i-chart', t: 'Habit tracker', d: '14-day grid per habit', a: 'hadd' },
  { c: 'Productivity', i: 'i-check', t: 'Tap-day check-ins', d: 'Streaks counted', a: 'info:Tap any day in the 14-day grid to check in — consecutive-day streaks count automatically.' },
  { c: 'Productivity', i: 'i-zap', t: 'Day streak', d: 'Daily open streak in Hub', a: 'pane-hub' },
  { c: 'Productivity', i: 'i-clock', t: 'Reading timer', d: 'Auto per-notebook time', a: 'pane-hub' },
  // I. Platform (12)
  { c: 'Platform', i: 'i-grid', t: 'Manifest V3', d: 'Service-worker background', a: 'info:Heros NoteBook is a Manifest V3 extension: service-worker background, minimal permissions, toolbar popup.' },
  { c: 'Platform', i: 'i-sliders', t: 'Popup control center', d: 'Auto-open toggles + open', a: 'info:Click the toolbar icon: toggle local/web auto-open and launch the studio.' },
  { c: 'Platform', i: 'i-share', t: 'Right-click open', d: 'Open with Heros NoteBook', a: 'info:Right-click any .ipynb link or page → Open with Heros NoteBook.' },
  { c: 'Platform', i: 'i-folder', t: 'Auto-open local', d: 'file:// .ipynb takeover', a: 'autofile' },
  { c: 'Platform', i: 'i-globe', t: 'Auto-open web', d: 'http(s) .ipynb takeover', a: 'autoweb' },
  { c: 'Platform', i: 'i-alert', t: 'File permission helper', d: 'file:// tip banner', a: 'filetip' },
  { c: 'Platform', i: 'i-shield', t: '100% local viewing', d: 'No server, no account', a: 'privacy' },
  { c: 'Platform', i: 'i-eye-dim', t: 'Zero tracking', d: 'No analytics, no telemetry', a: 'privacy' },
  { c: 'Platform', i: 'i-zap', t: 'Works offline', d: 'View/edit/export, no net', a: 'info:Viewing, editing, search and all exports work fully offline. Only the Python kernel downloads once.' },
  { c: 'Platform', i: 'i-code', t: 'Zero dependencies', d: 'No framework, no build', a: 'info:Vanilla JS, no build step, no npm — the whole studio is viewer.html + app.js + an isolated kernel.' },
  { c: 'Platform', i: 'i-zap', t: 'Silent instant boot', d: 'No animation jank', a: 'info:Boot animations are disabled on first paint — notebooks open instantly.' },
  { c: 'Platform', i: 'i-check', t: 'Free forever (MIT)', d: 'Unlimited cells, runs, exports', a: 'info:No accounts, no paywall, no watermark, no daily quota. Unlimited cells, runs and exports — MIT licensed.' },
  // J. Lab (10)
  { c: 'Lab', i: 'i-alert', t: 'Lint notebook', d: 'Long lines, tabs, errors', a: 'lint' },
  { c: 'Lab', i: 'i-text', t: 'Auto summary', d: 'Top sentences by frequency', a: 'summary' },
  { c: 'Lab', i: 'i-chart', t: 'Keyword extractor', d: 'Terms with bar counts', a: 'keywords' },
  { c: 'Lab', i: 'i-eye', t: 'Readability score', d: 'Flesch ease + grade', a: 'read' },
  { c: 'Lab', i: 'i-list', t: 'Copy outline', d: 'Headings as text', a: 'copyoutline' },
  { c: 'Lab', i: 'i-copy', t: 'Copy stats', d: 'Cells, outputs, timings', a: 'copystats' },
  { c: 'Lab', i: 'i-shield', t: 'Validate notebook', d: 'Format + id audit', a: 'validate' },
  { c: 'Lab', i: 'i-clock', t: 'Execution stats', d: 'Timings + kernel state', a: 'execstats' },
  { c: 'Lab', i: 'i-terminal', t: 'Kernel info', d: 'Engine + pip tips', a: 'kinfo' },
  { c: 'Lab', i: 'i-text', t: 'Word counts', d: 'Code lines + md words', a: 'wc' },
  // Build — snippet studio + wizards (12)
  { c: 'Build', i: 'i-layers', t: 'Snippet gallery', d: 'Tap-to-insert Python + Markdown', a: 'pane-build' },
  { c: 'Build', i: 'i-grid', t: 'Table builder', d: 'Rows, cols, header dialog', a: 'table' },
  { c: 'Build', i: 'i-chart', t: 'Chart wizard', d: 'Line, bar, scatter, hist code', a: 'chart' },
  { c: 'Build', i: 'i-code', t: 'CSV loader', d: 'pandas read_csv in one tap', a: 'csv' },
  { c: 'Build', i: 'i-chart', t: 'Quick line chart', d: 'matplotlib template cell', a: 'plotline' },
  { c: 'Build', i: 'i-plus', t: 'pip installer cell', d: '!pip template, then import', a: 'pipsnip' },
  { c: 'Build', i: 'i-file', t: 'JSON loader', d: 'Read data.json template', a: 'jsonsnip' },
  { c: 'Build', i: 'i-text', t: 'Callout builder', d: 'NOTE box in one tap', a: 'callout' },
  { c: 'Build', i: 'i-sparkle', t: 'Math block', d: 'Display LaTeX template', a: 'mathblock' },
  { c: 'Build', i: 'i-list', t: 'Details fold', d: 'Collapsible answer block', a: 'details' },
  { c: 'Build', i: 'i-sparkle', t: 'Banner box', d: 'Green exercise banner', a: 'banner' },
  { c: 'Build', i: 'i-check', t: 'Task-list block', d: 'Checkable markdown todos', a: 'tasklist' },
  // Data — live kernel power (8)
  { c: 'Data', i: 'i-eye', t: 'Variable inspector', d: 'Name, type, value, shape live', a: 'vars' },
  { c: 'Data', i: 'i-eye', t: 'Variable detail', d: 'Full repr + print-cell button', a: 'vardetail' },
  { c: 'Data', i: 'i-plus', t: 'Package manager', d: 'Install + list, free micropip', a: 'pip' },
  { c: 'Data', i: 'i-plus', t: 'One-tap pip install', d: 'numpy pandas matplotlib…', a: 'pip' },
  { c: 'Data', i: 'i-eye', t: 'Plot gallery', d: 'Every figure, tap to jump', a: 'plots' },
  { c: 'Data', i: 'i-clock', t: 'Run history', d: 'Last 30 runs with timings', a: 'runhist' },
  { c: 'Data', i: 'i-zap', t: 'Auto variable refresh', d: 'Inspector updates each run', a: 'info:After every cell run the variable inspector refreshes itself — names, types, previews and DataFrame shapes, no clicks needed.' },
  { c: 'Data', i: 'i-grid', t: 'Shape + length badges', d: 'DataFrames show rows × cols', a: 'info:Variables carrying .shape or .__len__ get green badges — DataFrames show columns × rows at a glance.' },
  // Design — perfect light + dark (5)
  { c: 'Design', i: 'i-sun', t: 'Studio white', d: 'Crisp perfect light mode', a: 'light' },
  { c: 'Design', i: 'i-moon', t: 'True dark', d: 'Deep OLED-friendly dark', a: 'dark' },
  { c: 'Design', i: 'i-eye-dim', t: 'Reduce motion', d: 'Zero animations app-wide', a: 'motion' },
  { c: 'Design', i: 'i-user', t: 'Profile color', d: 'Avatar gradient, 6 colors', a: 'profilecolor' },
  { c: 'Design', i: 'i-user', t: 'Studio profile', d: 'Name, stats, streak card', a: 'profilename' }
];
var FEAT_CATS = ['All', 'Open & View', 'Run Python', 'Edit', 'Search', 'Export', 'Comfort', 'Study', 'Productivity', 'Platform', 'Lab', 'Build', 'Data', 'Design'];
function openFeatures() {
  var total = FEATURES.length;
  var html = '<div class="search-box" style="margin-bottom:10px"><svg class="ic"><use href="#i-search"/></svg>' +
    '<input id="featQ" class="field" placeholder="Search ' + total + ' features… (try: export, pip, theme)" style="margin:0;padding-left:34px"></div>' +
    '<div class="feat-filter-pills" id="featPills" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">' +
    FEAT_CATS.map(function (c, ix) { return '<button class="feat-pill' + (ix === 0 ? ' on' : '') + '" data-c="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:10px"><b class="feat-count" id="featCount">' + total + '</b> free & unlimited tools — every card runs.</div>' +
    '<div class="feat-win-grid" id="featGrid"></div>';
  openModal({
    title: 'All features — free & unlimited (' + total + ')', icon: 'i-zap', wide: true,
    html: html, footer: '<button class="btn accent" data-close="1">Done</button>',
    onMount: function (root) {
      var cat = 'All';
      function paint() {
        var q = ($('#featQ', root).value || '').toLowerCase();
        var list = FEATURES.filter(function (f) {
          return (cat === 'All' || f.c === cat) && (!q || (f.t + ' ' + f.d).toLowerCase().indexOf(q) !== -1);
        });
        $('#featCount', root).textContent = list.length;
        $('#featGrid', root).innerHTML = list.map(function (f, ix) {
          return '<div class="feat-win-card"><div class="fi"><svg class="ic"><use href="#' + f.i + '"/></svg></div>' +
            '<div style="flex:1;min-width:0"><h4>' + esc(f.t) + '</h4><p>' + esc(f.d) + '</p>' +
            '<button class="feat-run" data-f="' + ix + '">Run</button></div></div>';
        }).join('') || '<div class="placeholder">No features match.</div>';
        $$('[data-f]', root).forEach(function (b) {
          b.addEventListener('click', function () {
            var f = list[parseInt(b.dataset.f, 10)];
            closeModal();
            setTimeout(function () { runAction(f.a); }, 60);
          });
        });
      }
      $$('#featPills .feat-pill', root).forEach(function (b) {
        b.addEventListener('click', function () {
          cat = b.dataset.c;
          $$('#featPills .feat-pill', root).forEach(function (x) { x.classList.toggle('on', x === b); });
          paint();
        });
      });
      $('#featQ', root).addEventListener('input', paint);
      paint();
    }
  });
}
function openPalette() {
  openModal({
    title: 'Command palette', icon: 'i-zap', palette: true,
    html: '<input id="palQ" placeholder="Type a command… (Enter runs first)" autocomplete="off"><div class="palette-list" id="palList"></div>',
    footer: false,
    onMount: function (root) {
      function paint() {
        var q = ($('#palQ', root).value || '').toLowerCase();
        var list = FEATURES.filter(function (f) { return !q || (f.t + ' ' + f.d + ' ' + f.c).toLowerCase().indexOf(q) !== -1; }).slice(0, 40);
        $('#palList', root).innerHTML = list.map(function (f, ix) {
          return '<button class="menu-item" data-p="' + ix + '"><svg class="ic"><use href="#' + f.i + '"/></svg><span class="lbl"><b>' + esc(f.t) + '</b> <span style="color:var(--muted)">· ' + esc(f.c) + '</span></span></button>';
        }).join('') || '<div class="placeholder">No commands match.</div>';
        $$('[data-p]', root).forEach(function (b) {
          b.addEventListener('click', function () {
            var f = list[parseInt(b.dataset.p, 10)];
            closeModal();
            setTimeout(function () { runAction(f.a); }, 60);
          });
        });
        root._palFirst = list[0];
      }
      $('#palQ', root).addEventListener('input', paint);
      $('#palQ', root).addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && root._palFirst) { var f = root._palFirst; closeModal(); setTimeout(function () { runAction(f.a); }, 60); }
      });
      paint();
    }
  });
}

/* ---------------- 24. sidebar + menus ---------------- */
function openSidebar(force) {
  var sb = D.sidebar;
  if (window.innerWidth <= 900) {
    var show = force === true ? true : force === false ? false : !sb.classList.contains('open');
    sb.classList.toggle('open', show);
    D.sideBackdrop.classList.toggle('show', show);
  } else {
    if (force === false) sb.classList.add('collapsed');
    else if (force === true) sb.classList.remove('collapsed');
    else sb.classList.toggle('collapsed');
  }
}
function mainMenu(anchor) {
  var has = !!S.nb;
  openMenu(anchor, [
    { label: 'File' },
    { text: 'Open notebook…', icon: 'i-folder', kbd: 'Ctrl+O', action: function () { pickFile(); } },
    { text: 'Open from URL…', icon: 'i-globe', action: askUrl },
    { text: 'Paste JSON…', icon: 'i-edit', action: askPaste },
    { text: 'Demo notebook', icon: 'i-sparkle', action: function () { ACTIONS.demo(); } },
    { text: 'Save .ipynb', icon: 'i-save', kbd: 'Ctrl+S', disabled: !has, action: saveIpynb },
    { sep: true }, { label: 'Run' },
    { text: 'Run cell', icon: 'i-play', kbd: 'Shift+Enter', disabled: !has, action: function () { ACTIONS.run(); } },
    { text: 'Run all', icon: 'i-play-all', disabled: !has, action: runAll },
    { text: 'Run cells above', icon: 'i-up', disabled: !has, action: function () { ACTIONS.runabove(); } },
    { text: 'Restart kernel', icon: 'i-refresh', action: restartKernel },
    { text: 'Clear all outputs', icon: 'i-x', disabled: !has, action: clearAllOutputs },
    { sep: true }, { label: 'Build' },
    { text: 'Snippet gallery', icon: 'i-layers', action: function () { switchPane('build'); } },
    { text: 'Table builder', icon: 'i-grid', disabled: !has, action: function () { tableBuilder(); } },
    { text: 'Chart wizard', icon: 'i-chart', disabled: !has, action: function () { chartWizard(); } },
    { text: 'Package manager', icon: 'i-plus', action: pipManager },
    { text: 'Plot gallery', icon: 'i-eye', disabled: !has, action: plotGallery },
    { text: 'Variable inspector', icon: 'i-eye', action: function () { ACTIONS.vars(); } },
    { sep: true }, { label: 'Export' },
    { text: 'Export .py', icon: 'i-code', disabled: !has, action: exportPy },
    { text: 'Export .md', icon: 'i-text', disabled: !has, action: exportMd },
    { text: 'Export .html', icon: 'i-globe', disabled: !has, action: exportHtml },
    { text: 'Export .txt', icon: 'i-file', disabled: !has, action: exportTxt },
    { text: 'Print / PDF', icon: 'i-printer', kbd: 'Ctrl+P', disabled: !has, action: function () { window.print(); } },
    { sep: true }, { label: 'View' },
    { text: 'Undo / Redo', icon: 'i-history', kbd: 'Ctrl+Z', disabled: !has, action: undo },
    { text: document.body.classList.contains('focus-mode') ? 'Exit focus mode' : 'Focus mode', icon: 'i-eye', action: function () { ACTIONS.focus(); } },
    { text: document.body.classList.contains('present-doc') ? 'Exit presentation' : 'Presentation', icon: 'i-maximize', disabled: !has, action: function () { ACTIONS.present(); } },
    { text: isTrusted() ? 'Mark untrusted' : 'Trust notebook', icon: 'i-shield', disabled: !has, action: function () { ACTIONS.trust(); } },
    { sep: true }, { label: 'Help' },
    { text: 'All ' + FEATURES.length + ' features', icon: 'i-zap', kbd: 'F', action: openFeatures },
    { text: 'Commands', icon: 'i-zap', kbd: 'Ctrl+K', action: openPalette },
    { text: 'Shortcuts', icon: 'i-keyboard', kbd: '?', action: shortcutsModal },
    { text: 'Validate notebook', icon: 'i-shield', disabled: !has, action: validateNb },
    { text: 'Privacy', icon: 'i-shield', action: privacyModal },
    { sep: true },
    { text: 'Backup all', icon: 'i-save', action: backupAll },
    { text: 'Restore…', icon: 'i-upload-cloud', action: function () { D.restoreInput.click(); } }
  ]);
}

/* ---------------- 25. keyboard ---------------- */
document.addEventListener('keydown', function (e) {
  var k = e.key;
  if (k === 'Escape') {
    if (D.modalBackdrop.classList.contains('show')) { closeModal(); return; }
    if (menuOpen) { closeMenu(); return; }
    if (!D.selBar.hidden) { hideSelBar(); return; }
    if (document.body.classList.contains('present-doc')) { document.body.classList.remove('present-doc'); return; }
    if (window.innerWidth <= 900) openSidebar(false);
    return;
  }
  var mod = e.ctrlKey || e.metaKey;
  if (mod && (k === 'o' || k === 'O')) { e.preventDefault(); pickFile(); return; }
  if (mod && (k === 's' || k === 'S')) { e.preventDefault(); saveIpynb(); return; }
  if (mod && (k === 'f' || k === 'F')) { e.preventDefault(); ACTIONS.search(); return; }
  if (mod && (k === 'k' || k === 'K')) { e.preventDefault(); openPalette(); return; }
  if (mod && (k === 'b' || k === 'B')) { e.preventDefault(); openSidebar(); return; }
  if (mod && (k === 'p' || k === 'P') && !e.shiftKey) { return; /* let print happen */ }
  if (mod && (k === 'z' || k === 'Z') && S.nb && !inEditable()) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'Enter' && S.nb && !inEditable()) { e.preventDefault(); ACTIONS['run-stay'](); return; }
  if (inEditable()) {
    // search-box vim: Enter navigates
    if (document.activeElement === D.searchInput && k === 'Enter') { e.preventDefault(); e.shiftKey ? jumpSearch(S.searchCursor - 1) : jumpSearch(S.searchCursor + 1); return; }
    return;
  }
  if (!S.nb && (k === 'f' || k === 'F')) { openFeatures(); return; }
  if (!S.nb) return;
  if (k === 'Shift') return;
  if (e.shiftKey && k === 'Enter') { e.preventDefault(); ACTIONS.run(); return; }
  switch (k) {
    case 'j': case 'J': goToCell(S.active + 1, true); break;
    case 'k': case 'K': goToCell(S.active - 1, true); break;
    case 'ArrowDown': if (e.ctrlKey) { e.preventDefault(); goToCell(S.active + 1, true); } break;
    case 'ArrowUp': if (e.ctrlKey) { e.preventDefault(); goToCell(S.active - 1, true); } break;
    case 'a': case 'A': addCell(S.active, 'code'); break;
    case 'b': case 'B': addCell(S.active + 1, 'code'); break;
    case 'm': case 'M': addCell(S.active + 1, 'markdown'); break;
    case 'v': case 'V': pasteCell(S.active + 1); break;
    case 'e': case 'E': ACTIONS.mdedit(); break;
    case 't': case 'T': Theme.toggle(); break;
    case 'f': case 'F': openFeatures(); break;
    case '?': shortcutsModal(); break;
    case 'h': case 'H': applyMark('highlight'); break;
    case 'u': case 'U': applyMark('underline'); break;
    case 's': case 'S': applyMark('strike'); break;
    case 'c': case 'C': if (selText().trim()) applyMark('copy'); break;
  }
});

/* ---------------- 26. wiring ---------------- */
function syncExtPrefs() {
  try {
    if (window.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ autoFile: !!P.autoFile, autoWeb: !!P.autoWeb });
    }
  } catch (e) {}
}
function wire() {
  D.btnOpen.addEventListener('click', pickFile);
  D.btnSidebar.addEventListener('click', function () { openSidebar(); });
  D.sideBackdrop.addEventListener('click', function () { openSidebar(false); });
  $$('#sideTabs .side-tab').forEach(function (b) {
    b.addEventListener('click', function () { switchPane(b.dataset.pane); });
  });
  D.btnCellPrev.addEventListener('click', function () { goToCell(S.active - 1, true); });
  D.btnCellNext.addEventListener('click', function () { goToCell(S.active + 1, true); });
  D.cellInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var v = parseInt(D.cellInput.value, 10); if (v) goToCell(v - 1, true); D.cellInput.blur(); }
  });
  D.btnRun.addEventListener('click', function () { ACTIONS.run(); });
  D.btnRunAll.addEventListener('click', runAll);
  D.btnAddCode.addEventListener('click', function () { ACTIONS.addcode(); });
  D.btnAddMd.addEventListener('click', function () { ACTIONS.addmd(); });
  D.btnCellAddTop.addEventListener('click', function () { if (needNb()) addCell(S.active + 1, 'code'); });
  D.btnCellAddMd.addEventListener('click', function () { if (needNb()) addCell(S.active + 1, 'markdown'); });
  D.kernelPill.style.cursor = 'pointer';
  D.kernelPill.addEventListener('click', function () { ACTIONS.kernel(); });
  D.btnSearch.addEventListener('click', function () { ACTIONS.search(); });
  D.btnPalette.addEventListener('click', openPalette);
  D.btnTheme.addEventListener('click', function () { Theme.toggle(); });
  D.btnMenu.addEventListener('click', function () { mainMenu(D.btnMenu); });
  D.btnTrust.addEventListener('click', function () { ACTIONS.trust(); });
  // search
  var debSearch = debounce(runSearch, 260);
  D.searchInput.addEventListener('input', debSearch);
  D.searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? jumpSearch(S.searchCursor - 1) : jumpSearch(S.searchCursor + 1); }
    e.stopPropagation();
  });
  D.searchClear.addEventListener('click', function () { D.searchInput.value = ''; resetSearch(); D.searchInput.focus(); });
  D.searchPrev.addEventListener('click', function () { jumpSearch(S.searchCursor - 1); });
  D.searchNext.addEventListener('click', function () { jumpSearch(S.searchCursor + 1); });
  D.swCase.addEventListener('click', function () { ACTIONS.case(); });
  D.swWhole.addEventListener('click', function () { ACTIONS.whole(); });
  D.btnSearchExport.addEventListener('click', exportSearch);
  // prefs
  $$('#themeSeg button').forEach(function (b) { b.addEventListener('click', function () { Theme.set(b.dataset.th); }); });
  $$('#pageModeSeg button').forEach(function (b) { b.addEventListener('click', function () { P.pageMode = b.dataset.pm; savePrefs(); applyReadingPrefs(); }); });
  $$('#docWidthSeg button').forEach(function (b) { b.addEventListener('click', function () { P.docW = b.dataset.dw; savePrefs(); applyReadingPrefs(); }); });
  D.fontSize.addEventListener('input', function () { P.fontSize = parseInt(D.fontSize.value, 10) || 15; savePrefs(); applyReadingPrefs(); });
  D.swShowCode.addEventListener('change', function () { P.showCode = D.swShowCode.checked; savePrefs(); applyReadingPrefs(); if (S.nb) renderAll(); });
  D.swShowOut.addEventListener('change', function () { P.showOut = D.swShowOut.checked; savePrefs(); if (S.nb) renderAll(); });
  D.swLineNums.addEventListener('change', function () { P.lineNums = D.swLineNums.checked; savePrefs(); if (S.nb) renderAll(); });
  D.swResume.addEventListener('change', function () { P.resume = D.swResume.checked; savePrefs(); });
  D.swAutoFile.addEventListener('change', function () { P.autoFile = D.swAutoFile.checked; savePrefs(); syncExtPrefs(); });
  D.swAutoWeb.addEventListener('change', function () { P.autoWeb = D.swAutoWeb.checked; savePrefs(); syncExtPrefs(); });
  if (D.swMotion) D.swMotion.addEventListener('change', function () { P.motion = !D.swMotion.checked; savePrefs(); applyReadingPrefs(); });
  // builder + data power
  if (D.btnVarsRefresh) D.btnVarsRefresh.addEventListener('click', function () { refreshVars(false); });
  if (D.btnTableBuilder) D.btnTableBuilder.addEventListener('click', function () { if (needNb()) tableBuilder(); });
  if (D.btnChartWizard) D.btnChartWizard.addEventListener('click', function () { if (needNb()) chartWizard(); });
  if (D.btnPipManager) D.btnPipManager.addEventListener('click', pipManager);
  if (D.btnPlotGallery) D.btnPlotGallery.addEventListener('click', plotGallery);
  // hub
  D.btnProfile.addEventListener('click', openProfileModal);
  D.btnNoteAdd.addEventListener('click', function () {
    var v = D.noteInput.value.trim();
    if (!v) { toast('Write a note first'); return; }
    if (!S.docId) { toast('Open a notebook first', 'err'); return; }
    addNote(v);
    D.noteInput.value = '';
  });
  D.noteInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') D.btnNoteAdd.click(); e.stopPropagation(); });
  D.btnBackup.addEventListener('click', backupAll);
  D.btnRestore.addEventListener('click', function () { D.restoreInput.click(); });
  D.restoreInput.addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (f) restoreAll(f);
    e.target.value = '';
  });
  D.btnClearRecent.addEventListener('click', function () { IDB.clearRecent().then(renderRecent).catch(function () {}); });
  // tools
  D.btnSwStart.addEventListener('click', function () { ACTIONS.swstart(); });
  D.btnSwLap.addEventListener('click', function () { ACTIONS.swlap(); });
  D.btnSwReset.addEventListener('click', function () { ACTIONS.swreset(); });
  D.btnCounterAdd.addEventListener('click', function () {
    var v = D.counterName.value.trim() || 'Counter ' + (S.counters.length + 1);
    S.counters.push({ name: v.slice(0, 60), value: 0, step: parseInt(D.counterStep.value, 10) || 1 });
    S.counters = S.counters.slice(-60);
    D.counterName.value = '';
    savePower(); renderCounters();
  });
  $$('#todoSeg button').forEach(function (b) {
    b.addEventListener('click', function () { S.todoFilter = b.dataset.f; renderTodos(); });
  });
  D.btnTodoAdd.addEventListener('click', addTodo);
  D.todoInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') addTodo(); e.stopPropagation(); });
  D.btnTodoExport.addEventListener('click', function () { ACTIONS.texp(); });
  D.btnTodoClearDone.addEventListener('click', function () { ACTIONS.tclear(); });
  D.btnHabitAdd.addEventListener('click', function () {
    var v = D.habitName.value.trim();
    if (!v) { toast('Name the habit first'); return; }
    if (S.habits[v]) { toast('Habit exists — tap its grid', null, 1800); return; }
    S.habits[v] = {};
    var keys = Object.keys(S.habits);
    if (keys.length > 40) delete S.habits[keys[0]];
    D.habitName.value = '';
    savePower(); renderHabits();
    toast('Habit added', 'ok', 1400);
  });
  D.habitName.addEventListener('keydown', function (e) { if (e.key === 'Enter') D.btnHabitAdd.click(); e.stopPropagation(); });
  // lab
  D.btnLint.addEventListener('click', labLint);
  D.btnSummary.addEventListener('click', labSummary);
  D.btnKeywords.addEventListener('click', labKeywords);
  D.btnReadability.addEventListener('click', labReadability);
  D.btnCopyOutline.addEventListener('click', copyOutline);
  D.btnCopyStats.addEventListener('click', copyStats);
  // statusbar
  D.sbRun.addEventListener('click', function () { ACTIONS.run(); });
  D.sbAdd.addEventListener('click', function () { ACTIONS.addcode(); });
  D.sbPalette.addEventListener('click', openPalette);
  D.sbPresent.addEventListener('click', function () { ACTIONS.present(); });
  D.sbTheme.addEventListener('click', function () { Theme.toggle(); });
  D.sbTop.addEventListener('click', function () { D.viewer.scrollTo({ top: 0, behavior: 'smooth' }); });
  // empty
  $('#btnEmptyOpen').addEventListener('click', pickFile);
  $('#btnEmptyUrl').addEventListener('click', askUrl);
  $('#btnEmptyDemo').addEventListener('click', function () { ACTIONS.demo(); });
  $('#btnEmptyFeatures').addEventListener('click', openFeatures);
  $('#btnEmptyPaste').addEventListener('click', askPaste);
  // selection bar
  $('#selHighlight').addEventListener('click', function () { applyMark('highlight'); });
  $('#selUnderline').addEventListener('click', function () { applyMark('underline'); });
  $('#selStrike').addEventListener('click', function () { applyMark('strike'); });
  $('#selCopy').addEventListener('click', function () { applyMark('copy'); });
  $('#selNote').addEventListener('click', function () { applyMark('note'); });
  // drag & drop
  var dragDepth = 0;
  window.addEventListener('dragenter', function (e) {
    if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1) { dragDepth++; D.dropOverlay.classList.add('show'); }
  });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('dragleave', function (e) {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) D.dropOverlay.classList.remove('show');
  });
  window.addEventListener('drop', function (e) {
    e.preventDefault();
    dragDepth = 0;
    D.dropOverlay.classList.remove('show');
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFromFile(f);
  });
  window.addEventListener('resize', debounce(function () {
    if (window.innerWidth > 900) { D.sidebar.classList.remove('open'); D.sideBackdrop.classList.remove('show'); }
  }, 200));
}

/* ---------------- 27. boot ---------------- */
function boot() {
  applyReadingPrefs();
  wire();
  renderSnips();
  renderStopwatch(); renderCounters(); renderTodos(); renderHabits();
  renderVars(); renderRunHist();
  refreshHub(); renderRecent();
  setKernel('off');
  syncExtPrefs();
  updateStatsBar();
  // silent instant boot: drop the boot class after first paint
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.remove('booting'); });
  });
  setTimeout(function () { document.body.classList.remove('booting'); }, 600);
  // open ?nb=URL
  var nbUrl = null;
  try {
    var qs = new URLSearchParams(location.search);
    nbUrl = qs.get('nb') || qs.get('ipynb') || qs.get('url');
  } catch (e) {}
  if (nbUrl) {
    setTimeout(function () { loadFromUrl(nbUrl); }, 120);
  } else {
    setStatus('Ready — open a notebook', null);
  }
  // warn before unload only when kernel busy? keep light: no blocker.
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();




