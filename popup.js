'use strict';
/* Heros NoteBook — popup control center (same contract as Heros PDF popup). */
const DEFAULTS = { autoFile: true, autoWeb: true };

async function load() {
  let s = { ...DEFAULTS };
  try { s = { ...DEFAULTS, ...await chrome.storage.local.get(DEFAULTS) }; } catch (e) {}
  document.getElementById('autoFile').checked = s.autoFile !== false;
  document.getElementById('autoWeb').checked = s.autoWeb !== false;
  try {
    const isFileBlocked = false;
    document.getElementById('fileNote').hidden = !isFileBlocked && s.autoFile === false ? false : true;
    if (s.autoFile !== false) document.getElementById('fileNote').hidden = false;
  } catch (e) {}
}

async function save() {
  const prefs = {
    autoFile: document.getElementById('autoFile').checked,
    autoWeb: document.getElementById('autoWeb').checked
  };
  try { await chrome.storage.local.set(prefs); } catch (e) {}
}

document.getElementById('autoFile').addEventListener('change', save);
document.getElementById('autoWeb').addEventListener('change', save);
document.getElementById('btnOpen').addEventListener('click', () => {
  try {
    chrome.runtime.sendMessage({ type: 'herosnb-open', query: '' });
  } catch (e) {
    chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
  }
  window.close();
});
load();
