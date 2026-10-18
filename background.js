'use strict';

/* Heros NoteBook — background service worker (MV3).
   Same contract as Heros PDF: auto-open file:// + https:// notebook links,
   right-click "Open with Heros NoteBook", popup open-button bus. */

const VIEWER = 'viewer.html';
const NB_RE = /\.ipynb($|[?#])/i;
const DEFAULTS = { autoFile: true, autoWeb: true };

/* tabId -> { url, at } — loop guard so we never bounce a tab twice */
const recentRedirects = new Map();

async function settings() {
  try {
    const s = await chrome.storage.local.get(DEFAULTS);
    return { autoFile: s.autoFile !== false, autoWeb: s.autoWeb !== false };
  } catch (e) {
    return { autoFile: true, autoWeb: true };
  }
}

function viewerUrl(nbUrl) {
  return VIEWER + '?nb=' + encodeURIComponent(nbUrl);
}

function openViewer(query) {
  chrome.tabs.create({ url: VIEWER + query });
}

async function maybeRedirect(details, stage) {
  try {
    if (!details || details.frameId !== 0) return; // top frame only
    const url = details.url || '';
    if (url.startsWith('chrome-extension://') ||
        url.startsWith('chrome://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:')) return;
    if (url.indexOf('/' + VIEWER) !== -1) return; // already our viewer

    const isFile = url.startsWith('file://');
    const isWeb = url.startsWith('http://') || url.startsWith('https://');
    if (!isFile && !isWeb) return;
    if (!NB_RE.test(url)) return;

    const s = await settings();
    if (isFile && !s.autoFile) return;
    if (isWeb && !s.autoWeb) return;

    const prev = recentRedirects.get(details.tabId);
    const now = Date.now();
    if (prev && prev.url === url && (now - prev.at) < 5000) return;
    recentRedirects.set(details.tabId, { url, at: now });
    if (recentRedirects.size > 50) {
      for (const [k, v] of recentRedirects) {
        if (now - v.at > 30000) recentRedirects.delete(k);
      }
    }
    await chrome.tabs.update(details.tabId, { url: viewerUrl(url) });
  } catch (e) {
    console.warn('[HerosNoteBook] auto-open redirect failed:', (e && e.message) || e);
  }
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  maybeRedirect(details, 'navigate');
});
chrome.webNavigation.onCommitted.addListener((details) => {
  maybeRedirect(details, 'committed');
});

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: 'herosnb-open',
      title: 'Open with Heros NoteBook',
      contexts: ['link', 'page']
    });
  } catch (e) {}
});

chrome.contextMenus.onClicked.addListener((info) => {
  let url = null;
  if (info.linkUrl && NB_RE.test(info.linkUrl)) url = info.linkUrl;
  else if (info.pageUrl && NB_RE.test(info.pageUrl)) url = info.pageUrl;
  if (url) openViewer('?nb=' + encodeURIComponent(url));
  else openViewer('');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'herosnb-open') {
    openViewer(msg.query || '');
    sendResponse({ ok: true });
    return true;
  }
});
