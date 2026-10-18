'use strict';
/* Heros NoteBook — Python kernel sandbox.
   Runs in a manifest-sandboxed iframe (unique origin, no access to extension
   APIs or your files). Loads Pyodide (Python + micropip + matplotlib) from
   CDN on first Run only. Parent (viewer) talks to us via postMessage.
   Protocol:
     parent -> { id, type:'run', code }
     us     -> { id, type:'result', stdout, stderr, display:[{mime,data}], error }
     parent -> { type:'ping' }  / us -> { type:'ready' | 'loading' }
     parent -> { type:'restart' } (parent reloads this iframe) */

var pyodide = null;
var loading = null;
var PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';

function post(msg) {
  try { parent.postMessage(msg, '*'); } catch (e) {}
}

function loadScript(src) {
  return new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { res(); };
    s.onerror = function () { rej(new Error('kernel download failed')); };
    document.head.appendChild(s);
  });
}

async function ensurePyodide() {
  if (pyodide) return pyodide;
  if (loading) return loading;
  loading = (async function () {
    post({ type: 'loading' });
    await loadScript(PYODIDE_URL);
    var opts = {};
    try {
      pyodide = await window.loadPyodide(opts);
    } catch (e) {
      // offline / blocked: report once
      throw new Error('Python kernel needs internet once (CDN). Viewing, editing and exporting work fully offline.');
    }
    // matplotlib: quiet inline backend so figures can be captured as PNG
    try {
      await pyodide.runPythonAsync(
        'import sys\n' +
        'try:\n    import matplotlib\n    matplotlib.use("Agg")\nexcept Exception:\n    pass\n'
      );
    } catch (e) {}
    post({ type: 'ready' });
    return pyodide;
  })();
  try {
    return await loading;
  } catch (e) {
    loading = null;
    throw e;
  }
}

/* Split shell/magic lines from real python. Returns {py, pip:[], notes:[]} */
function preprocess(src) {
  var lines = String(src == null ? '' : src).split('\n');
  var py = [], pip = [], notes = [];
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i], t = ln.trim();
    if (/^!/.test(t)) {
      var cmd = t.slice(1).trim();
      var m = cmd.match(/^(?:pip(?:3)?\s+install\s+)(.+)$/);
      if (m) {
        m[1].split(/\s+/).forEach(function (p) {
          p = p.trim().replace(/[,;]$/, '');
          if (p && pip.indexOf(p) === -1) pip.push(p);
        });
      } else {
        notes.push('! shell skipped: ' + cmd.slice(0, 80));
      }
    } else if (/^%%?matplotlib\s+inline/.test(t)) {
      notes.push('matplotlib inline backend active');
    } else if (/^%/.test(t) || /^%%/.test(t)) {
      notes.push('magic skipped: ' + t.slice(0, 80));
    } else {
      py.push(ln);
    }
  }
  return { py: py.join('\n'), pip: pip, notes: notes };
}

/* Last top-level expression for implicit display (a + b  ->  Out[n]). */
function lastExpr(py) {
  var lines = py.split('\n');
  // walk back past blanks/comments
  var j = lines.length - 1;
  while (j >= 0 && /^\s*(#|$)/.test(lines[j])) j--;
  if (j < 0) return null;
  // must be single-line, not indented, not a statement keyword
  var ln = lines[j];
  if (/^\s/.test(ln) && ln.trim() !== '') return null; // indented block
  var t = ln.trim();
  if (/^(import|from|def|class|for|while|if|elif|else|with|try|except|finally|return|raise|assert|del|global|nonlocal|pass|break|continue|async|await)\b/.test(t)) return null;
  if (/=$/.test(t) || /^(.*[^=!<>])=([^=].*)?$/.test(t) && !/==/.test(t) && /=/.test(t)) {
    // assignment (but not ==). crude but effective
    return null;
  }
  return { line: j, expr: t };
}

function escHtml(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

async function runCode(id, code) {
  var stdout = '', stderr = '', display = [], error = null, notes = [];
  try {
    var pp = preprocess(code);
    notes = pp.notes;
    var pyd = await ensurePyodide();
    // micropip installs
    if (pp.pip.length) {
      try {
        await pyd.loadPackage('micropip');
        var mp = pyd.pyimport('micropip');
        for (var k = 0; k < pp.pip.length; k++) {
          stdout += '[pip] installing ' + pp.pip[k] + ' …\n';
          try { await mp.install(pp.pip[k]); stdout += '[pip] ' + pp.pip[k] + ' installed\n'; }
          catch (e2) { stderr += '[pip] failed: ' + pp.pip[k] + ' (' + (e2 && e2.message || e2) + ')\n'; }
        }
      } catch (e3) {
        stderr += '[pip] micropip unavailable (' + (e3 && e3.message || e3) + ')\n';
      }
    }
    var src = pp.py;
    // auto-fetch known packages (numpy, matplotlib, …) from imports
    try {
      if (pyd.loadPackagesFromImports) await pyd.loadPackagesFromImports(src);
    } catch (ePkg) { /* continue; import will report the real error */ }
    pyd.setStdout({ batched: function (s) { stdout += s + '\n'; } });
    pyd.setStderr({ batched: function (s) { stderr += s + '\n'; } });
    // input() -> synchronous prompt (allow-modals)
    try {
      pyd.globals.set('__heros_input_js', function (promptText) {
        try { var v = prompt(String(promptText || '')); return v == null ? '' : String(v); }
        catch (e) { return ''; }
      });
      await pyd.runPythonAsync('import builtins\nbuiltins.input = lambda *a: __heros_input_js(a[0] if a else "")\n');
    } catch (e) {}
    notes.forEach(function (n) { stdout += '[' + n + ']\n'; });
    if (src.trim()) {
      var lx = lastExpr(src);
      var body = src, tailExpr = null;
      if (lx) {
        var arr = src.split('\n');
        arr.splice(lx.line, 1);
        body = arr.join('\n');
        tailExpr = lx.expr;
      }
      if (body.trim()) await pyd.runPythonAsync(body);
      if (tailExpr) {
        var val = undefined, ok = true;
        try { val = await pyd.runPythonAsync(tailExpr); }
        catch (eTail) {
          // not an expression after all (e.g. print()) — run as statement
          try { await pyd.runPythonAsync(tailExpr); ok = false; }
          catch (eTail2) { throw eTail2; }
        }
        if (ok && val !== undefined) {
          var added = false;
          try {
            var proxy = val;
            if (proxy && typeof proxy.get === 'function') {
              // PyProxy: prefer rich representations
              var html = null, png = null, svg = null, md = null;
              try { var r = proxy.get('_repr_html_'); if (typeof r === 'function') { var h = r(); html = (h && h.toString) ? h.toString() : String(h); } } catch (e4) {}
              if (!html) { try { var r2 = proxy.get('_repr_svg_'); if (typeof r2 === 'function') { var s2 = r2(); svg = (s2 && s2.toString) ? s2.toString() : String(s2); } } catch (e5) {} }
              if (!html && !svg) { try { var r3 = proxy.get('_repr_png_'); if (typeof r3 === 'function') { var p3 = r3(); png = (p3 && p3.toString) ? p3.toString() : String(p3); } } catch (e6) {} }
              if (!html && !svg && !png) { try { var r4 = proxy.get('_repr_markdown_'); if (typeof r4 === 'function') { var m4 = r4(); md = (m4 && m4.toString) ? m4.toString() : String(m4); } } catch (e7) {} }
              if (html) { display.push({ mime: 'text/html', data: html }); added = true; }
              else if (svg) { display.push({ mime: 'image/svg+xml', data: svg }); added = true; }
              else if (png) { display.push({ mime: 'image/png', data: png }); added = true; }
              else if (md) { display.push({ mime: 'text/markdown', data: md }); added = true; }
              else {
                var rep = null;
                try { rep = proxy.toString(); } catch (e8) { rep = String(proxy); }
                if (rep !== 'undefined' && rep !== 'None' || true) {
                  if (rep !== undefined && rep !== 'None' || rep === 'None') {
                    if (rep !== undefined) { display.push({ mime: 'text/plain', data: String(rep) }); added = true; }
                  }
                }
              }
              try { if (proxy.destroy) proxy.destroy(); } catch (e9) {}
            } else {
              if (val !== null && val !== undefined) { display.push({ mime: 'text/plain', data: String(val) }); added = true; }
            }
          } catch (e10) {
            display.push({ mime: 'text/plain', data: String(val) }); added = true;
          }
          if (!added) { /* None -> no output, like Jupyter */ }
        }
      }
      // matplotlib open figures -> PNG (one robust python block)
      try {
        var pyFigs =
          'import io, base64\n' +
          '__out = []\n' +
          'try:\n' +
          '    import matplotlib.pyplot as __plt\n' +
          '    from matplotlib._pylab_helpers import Gcf\n' +
          '    __managers = Gcf.get_all_fig_managers()\n' +
          '    __nums = [m.num for m in __managers] if __managers else list(__plt.get_fignums())\n' +
          '    for __n in __nums:\n' +
          '        __fig = __plt.figure(__n)\n' +
          '        __buf = io.BytesIO()\n' +
          '        __fig.savefig(__buf, format="png", bbox_inches="tight")\n' +
          '        __out.append(base64.b64encode(__buf.getvalue()).decode("ascii"))\n' +
          '    __plt.close("all")\n' +
          'except Exception:\n' +
          '    pass\n' +
          '__out';
        var res = await pyd.runPythonAsync(pyFigs);
        var arr2 = null;
        try { arr2 = res.toJs({ create_proxies: false }); } catch (e14) { arr2 = null; }
        if (arr2 && arr2.length) {
          for (var q = 0; q < arr2.length; q++) display.push({ mime: 'image/png', data: String(arr2[q]) });
        }
        try { if (res && res.destroy) res.destroy(); } catch (e15) {}
      } catch (e16) {}
    } else if (!notes.length && !pp.pip.length) {
      stdout += '';
    }
  } catch (err) {
    var msg = String((err && err.message) || err || 'error');
    // Pyodide PythonError carries the traceback
    error = { ename: 'Error', evalue: msg.slice(0, 500), traceback: [msg] };
  }
  post({ id: id, type: 'result', stdout: stdout, stderr: stderr, display: display, error: error });
}

window.addEventListener('message', function (ev) {
  var msg = ev.data || {};
  if (msg.type === 'run') {
    // make sure the kernel is (at least) starting, then run
    ensurePyodide().then(function () { runCode(msg.id, msg.code); }, function (err) {
      post({ id: msg.id, type: 'result', stdout: '', stderr: '', display: [],
        error: { ename: 'KernelError', evalue: String((err && err.message) || err).slice(0, 300), traceback: [] } });
    });
  } else if (msg.type === 'ping') {
    ensurePyodide().catch(function () {});
    post({ type: pyodide ? 'ready' : (loading ? 'loading' : 'idle') });
  }
});

// announce presence + START PRELOADING immediately (parent only sends
// 'run' after 'ready', so the kernel must boot itself — no deadlock)
post({ type: 'idle' });
ensurePyodide().catch(function (err) {
  post({ type: 'kernel-error', message: String((err && err.message) || err).slice(0, 300) });
});
