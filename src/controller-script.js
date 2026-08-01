const { invoke } = window.__TAURI__.core;
const { emit, listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;
const { open } = window.__TAURI__.dialog;
import { getViewerHtml, rewriteMediaToHttp, rewriteAssetsToServer, generateSlideThumbnails } from './shared/viewer-html-builder.js';
import { detectLocale, applyTranslations, __ } from './shared/i18n.js';
import { wrapMarkdownForImpress, extractImpressContent } from './shared/presentation-utils.js';

let loadedFile = null;
let projectorWindow = null;
let slideList = [];
let totalSeconds = 0;
let timerPaused = false;
let timerStarted = false;
let timerRunning = false;
let currentBlobUrl = null;
let currentSlideId = null;
let overviewVisible = false;
let keyboardEnabled = true;
let overviewBuilt = false;
let sidebarBuilt = false;
let slideThumbnails = {};
let thumbnailBlobUrls = {};
let placeholderThumbUrl = null;
let projectorServerUrl = null;
let seekDragging = false;
let mediaPlaying = false;

document.addEventListener('DOMContentLoaded', async () => {
  detectLocale();
  applyTranslations();
  setupEventListeners();
  showTimer('current');
  loadInitialSettings();
  restoreWindowState();
  try { getCurrentWindow().setTheme('Dark'); } catch(e) {}
  listen('projector-ready', async function() {
    if (loadedFile) {
      await emit('loadProjection', { file: loadedFile, slide: currentSlideId });
    }
  });
  listen('controller-slide-changed', async function(event) {
    var slide = event.payload;
    if (slide === currentSlideId) return;
    renderNextSlide(slide);
  });
  buildSidebarDom();
});

async function loadInitialSettings() {
  try {
    const settings = await invoke('load_settings');
    if (settings.defaultPath) {
      console.log('Default path:', settings.defaultPath);
    }
    if (settings.impressVersion) {
      document.getElementById('impressVersionSelect').value = settings.impressVersion;
    }
    if (typeof settings.autoplayMedia === 'boolean') {
      document.getElementById('autoplayMediaCheck').checked = settings.autoplayMedia;
    }
  } catch (e) {
    console.warn('Could not load settings:', e);
  }
}

function isAutoplayMediaEnabled() {
  var check = document.getElementById('autoplayMediaCheck');
  return check ? check.checked : true;
}

async function restoreWindowState() {
  try {
    var ws = await invoke('get_window_state', { windowLabel: 'controller' });
    if (ws && ws.bounds) {
      var win = getCurrentWindow();
      await win.setPosition({ type: 'Physical', x: ws.bounds.x, y: ws.bounds.y });
      await win.setSize({ type: 'Physical', width: ws.bounds.width, height: ws.bounds.height });
      if (ws.is_maximized) await win.maximize();
    }
  } catch (e) {
    console.warn('Could not restore window state:', e);
  }
}

var saveWindowTimer = null;
async function saveWindowState() {
  if (saveWindowTimer) return;
  saveWindowTimer = setTimeout(function() { saveWindowTimer = null; }, 500);
  try {
    var win = getCurrentWindow();
    var pos = await win.outerPosition();
    var size = await win.outerSize();
    var isMax = await win.isMaximized();
    await invoke('update_window_state', {
      windowLabel: 'controller',
      x: pos.x, y: pos.y,
      width: size.width, height: size.height,
      isMaximized: isMax
    });
  } catch (e) {}
}

function setupEventListeners() {
  document.getElementById('openFile').addEventListener('click', selectFile);
  document.getElementById('refreshBtn').addEventListener('click', refreshPresentation);
  document.getElementById('projectorBtn').addEventListener('click', toggleProjector);
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
  document.getElementById('nextSlideBtn').addEventListener('click', function() {
    sendToViewer('nextSlide');
  });
  document.getElementById('prevSlideBtn').addEventListener('click', function() {
    sendToViewer('prevSlide');
  });
  document.getElementById('reallyQuit').addEventListener('click', async function() {
    document.getElementById('exitDialog').close();
    try {
      await invoke('quit_app');
    } catch (e) {
      console.error('Quit failed:', e);
      getCurrentWindow().destroy();
    }
  });
  document.getElementById('doNotQuit').addEventListener('click', function() {
    document.getElementById('exitDialog').close();
  });

  document.getElementById('resetTimerBtn').addEventListener('click', function() {
    totalSeconds = 0;
    updateTimerDisplay();
  });
  document.getElementById('pauseTimerBtn').addEventListener('click', function() {
    timerPaused = !timerPaused;
    var icon = this.querySelector('i');
    if (timerPaused) {
      icon.className = 'fa fa-play';
      this.title = 'Resume timer';
    } else {
      icon.className = 'fa fa-pause';
      this.title = 'Pause timer';
    }
  });

  document.getElementById('playPauseMediaBtn').addEventListener('click', function() {
    sendToViewer('audioVideoControls', { command: 'playPause' });
  });
  document.getElementById('restartMediaBtn').addEventListener('click', function() {
    sendToViewer('audioVideoControls', { command: 'restart' });
  });
  var projectorUrlLink = document.getElementById('projectorUrlLabel');
  projectorUrlLink.addEventListener('click', function(e) {
    if (!projectorServerUrl) return;
    e.preventDefault();
    openProjectorUrl(projectorServerUrl);
  });
  var copyUrlBtn = document.getElementById('copyProjectorUrlBtn');
  copyUrlBtn.addEventListener('click', function() {
    if (!projectorServerUrl) return;
    var icon = copyUrlBtn.querySelector('i');
    copyToClipboard(projectorServerUrl).then(function() {
      if (icon) {
        var old = icon.className;
        icon.className = 'fa fa-check';
        setTimeout(function() { icon.className = old; }, 1200);
      }
    });
  });
  var seekBar = document.getElementById('audioVideoSlider');
  function endSeek() {
    if (!seekDragging) return;
    seekDragging = false;
    sendToViewer('audioVideoControls', { command: 'seek', data: seekBar.value });
    if (mediaPlaying) sendToViewer('audioVideoControls', { command: 'play' });
  }
  seekBar.addEventListener('input', function() {
    sendToViewer('audioVideoControls', { command: 'seek', data: seekBar.value });
  });
  seekBar.addEventListener('pointerdown', function() {
    seekDragging = true;
    sendToViewer('audioVideoControls', { command: 'pause' });
  });
  seekBar.addEventListener('pointerup', endSeek);
  seekBar.addEventListener('pointercancel', endSeek);

  document.getElementById('currentSlideTab').addEventListener('click', function() {
    document.getElementById('currentSlideDiv').classList.remove('hidden');
    document.getElementById('allSlidesDiv').classList.add('hidden');
    document.getElementById('currentSlidePreview').classList.add('hidden');
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    this.classList.add('active');
    overviewVisible = false;
    updateSidebarThumbnails();
  });
  document.getElementById('allSlidesTab').addEventListener('click', function() {
    document.getElementById('currentSlideDiv').classList.add('hidden');
    document.getElementById('allSlidesDiv').classList.remove('hidden');
    document.getElementById('currentSlidePreview').classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    this.classList.add('active');
    overviewVisible = true;
    updateOverviewThumbnails();
    updateSidebarThumbnails();
    updateCurrentSlidePreview();
  });

  var versionSelect = document.getElementById('impressVersionSelect');
  versionSelect.addEventListener('change', async function() {
    var version = this.value;
    await invoke('set_impress_version', { version: version });
    await invoke('save_settings');
    if (loadedFile) {
      await loadPresentation(loadedFile);
      if (projectorWindow) {
        await emit('loadProjection', { file: loadedFile, slide: currentSlideId });
      }
    }
  });

  var autoplayCheck = document.getElementById('autoplayMediaCheck');
  if (autoplayCheck) {
    autoplayCheck.addEventListener('change', async function() {
      await invoke('set_autoplay_media', { autoplay: this.checked });
      await invoke('save_settings');
      if (loadedFile) {
        await loadPresentation(loadedFile);
        if (projectorWindow) {
          await emit('loadProjection', { file: loadedFile, slide: currentSlideId });
        }
      }
    });
  }

  getCurrentWindow().onCloseRequested(async function(event) {
    event.preventDefault();
    await saveWindowState();
    document.getElementById('exitDialog').showModal();
  });

  getCurrentWindow().onResized(function() { saveWindowState(); });
  getCurrentWindow().onMoved(function() { saveWindowState(); });

  listen('menu-event', async function(event) {
    switch (event.payload) {
      case 'menu-load':
        selectFile();
        break;
      case 'menu-refresh':
        refreshPresentation();
        break;
      case 'menu-devtools':
        getCurrentWindow().toggleDevtools();
        break;
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.keyCode === 32 && e.target === document.body) {
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', setupKeyboardControls);

  var viewerFrame = document.getElementById('impressCurrent');
  viewerFrame.addEventListener('load', function() {
    sendToViewer('setupEventHandlers');
  });
}

function setupKeyboardControls(e) {
  if (e.keyCode === 116) {
    e.preventDefault();
    refreshPresentation();
    return;
  }
  if (!keyboardEnabled) return;
  if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.keyCode === 9 ||
      (e.keyCode >= 32 && e.keyCode <= 34) ||
      (e.keyCode >= 37 && e.keyCode <= 40)) {
    switch (e.keyCode) {
      case 33: case 37: case 38:
        sendToViewer('prevSlide');
        break;
      case 9: case 32: case 34: case 39: case 40:
        sendToViewer('nextSlide');
        break;
    }
    e.preventDefault();
  }
}

async function selectFile() {
  try {
    var settings = await invoke('load_settings');
    var defaultPath = settings.defaultPath || '';
    var selected = await open({
      multiple: false,
      defaultPath: defaultPath || undefined,
      filters: [{
        name: 'impress.js presentations',
        extensions: ['md', 'mkd', 'markdown', 'html', 'htm', 'zip']
      }, {
        name: 'All Files',
        extensions: ['*']
      }]
    });
    if (selected) {
      loadedFile = selected;
      var dir = selected.replace(/[/\\][^/\\]+$/, '');
      await invoke('save_default_path', { path: dir });
      await loadPresentation(selected);
      if (projectorWindow) {
        await emit('loadProjection', { file: selected });
      }
    }
  } catch (e) {
    console.error('File selection error:', e);
  }
}

async function refreshPresentation() {
  if (!loadedFile) return;
  try {
    await loadPresentation(loadedFile);
    if (projectorWindow) {
      await emit('loadProjection', { file: loadedFile });
    }
  } catch (e) {
    console.error('Refresh error:', e);
  }
}

async function loadPresentation(filePath) {
  try {
    var ext = filePath.split('.').pop().toLowerCase();
    var content, impressContent;

    if (ext === 'md' || ext === 'mkd' || ext === 'markdown') {
      content = await invoke('read_file', { path: filePath });
      impressContent = wrapMarkdownForImpress(content);
    } else if (ext === 'html' || ext === 'htm') {
      content = await invoke('read_file', { path: filePath });
      impressContent = extractImpressContent(content);
    } else if (ext === 'zip') {
      var userData = await invoke('get_user_data_path');
      var extracted = await invoke('extract_zip', { zipPath: filePath, destDir: userData });
      var impressMd = extracted.find(function(p) { return p.endsWith('impress.md'); });
      if (impressMd) {
        var mdContent = await invoke('read_file', { path: impressMd });
        impressContent = wrapMarkdownForImpress(mdContent);
      }
    }

    if (impressContent) {
      var dir = filePath.replace(/[/\\][^/\\]+$/, '/');
      var styleContent = '';
      var hasStyle = await invoke('check_style_css', { filePath: dir });
      if (hasStyle) {
        try {
          styleContent = await invoke('read_file', { path: dir + 'style.css' });
        } catch(e) {}
      }
      var impressVersion = await invoke('get_impress_version');
      var mediaServerUrl = await invoke('start_media_server', { dir: dir });
      console.log('[impressPlayer] Media server started at ' + mediaServerUrl);
      var autoplayMedia = isAutoplayMediaEnabled();
      var rawImpressContent = impressContent;
      impressContent = rewriteMediaToHttp(rawImpressContent, mediaServerUrl);
      var viewerHtml = getViewerHtml(impressContent, styleContent, impressVersion, dir, autoplayMedia);

      try {
        projectorServerUrl = await invoke('start_projector_server', { dir: dir });
        console.log('[impressPlayer] Projector server at ' + projectorServerUrl);
        var projContent = rewriteAssetsToServer(rawImpressContent, projectorServerUrl);
        var projStyle = rewriteAssetsToServer(styleContent, projectorServerUrl);
        var projHtml = getViewerHtml(projContent, projStyle, impressVersion, null, autoplayMedia);
        await invoke('set_projector_page', { html: projHtml, dir: dir });
      } catch (e) {
        projectorServerUrl = null;
        console.error('[impressPlayer] Projector server error:', e);
      }
      updateProjectorUrlDisplay();
      pushProjectorState(currentSlideId);

      slideThumbnails = generateSlideThumbnails(impressContent, styleContent, dir);
      clearThumbnailUrls();
      var viewerFrame = document.getElementById('impressCurrent');
      var blob = new Blob([viewerHtml], { type: 'text/html' });
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = URL.createObjectURL(blob);
      viewerFrame.src = currentBlobUrl;
      var sidebarLiveFrame = document.getElementById('impressSidebarLive');
      if (sidebarLiveFrame) sidebarLiveFrame.src = currentBlobUrl + '#sidebar-live';
      document.body.classList.add('running');
      overviewBuilt = false;
      sidebarBuilt = false;
      var overviewContainer = document.getElementById('impressOverview');
      if (overviewContainer) overviewContainer.innerHTML = '';
      resetTimer();
      if (projectorWindow) {
        try {
          var vis = await projectorWindow.isVisible();
          if (vis) {
            await emit('loadProjection', { file: filePath, slide: currentSlideId });
          }
        } catch(e) {}
      }
    }
  } catch (e) {
    console.error('Load presentation error:', e);
  }
}

function sendToViewer(command, payload) {
  var viewerFrame = document.getElementById('impressCurrent');
  if (viewerFrame && viewerFrame.contentWindow) {
    viewerFrame.contentWindow.postMessage({ command: command, payload: payload }, '*');
  }
}

function sendToSidebarLive(command, payload) {
  var frame = document.getElementById('impressSidebarLive');
  if (frame && frame.contentWindow) {
    frame.contentWindow.postMessage({ command: command, payload: payload }, '*');
  }
}

function pushProjectorState(slide, media) {
  if (!projectorServerUrl) return;
  invoke('update_projection_state', {
    slide: slide || '',
    time: media && typeof media.time === 'number' ? media.time : null,
    playing: media ? !!media.playing : null
  }).catch(function(err) {
    console.error('[impressPlayer] update_projection_state failed:', err);
  });
}

function updateProjectorUrlDisplay() {
  var el = document.getElementById('projectorUrlLabel');
  var wrap = document.getElementById('projectorUrlWrap');
  if (!el || !wrap) return;
  if (projectorServerUrl) {
    el.textContent = 'Projector: ' + projectorServerUrl;
    el.href = projectorServerUrl;
    wrap.classList.remove('hidden');
  } else {
    el.textContent = '';
    el.href = '#';
    wrap.classList.add('hidden');
  }
}

function openProjectorUrl(url) {
  var opener = window.__TAURI__ && window.__TAURI__.opener;
  if (opener && opener.openUrl) {
    opener.openUrl(url).catch(function(err) {
      console.error('[impressPlayer] Failed to open URL:', err);
    });
  } else if (window.open) {
    window.open(url, '_blank');
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(function() {
      legacyCopyToClipboard(text);
    });
  }
  legacyCopyToClipboard(text);
  return Promise.resolve();
}

function legacyCopyToClipboard(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
}

function getThumbnailUrl(slideId) {
  var html = slideThumbnails[slideId];
  if (!html) return null;
  if (!thumbnailBlobUrls[slideId]) {
    thumbnailBlobUrls[slideId] = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  }
  return thumbnailBlobUrls[slideId];
}

function getPlaceholderThumbUrl() {
  if (!placeholderThumbUrl) {
    placeholderThumbUrl = URL.createObjectURL(new Blob(
      ['<html><body style="background:#333;display:flex;align-items:center;justify-content:center;color:#666;font-family:sans-serif;font-size:12px;">Loading...</body></html>'],
      { type: 'text/html' }));
  }
  return placeholderThumbUrl;
}

function clearThumbnailUrls() {
  Object.keys(thumbnailBlobUrls).forEach(function(key) { URL.revokeObjectURL(thumbnailBlobUrls[key]); });
  thumbnailBlobUrls = {};
}

function sendToThumbnail(iframeId, slideId) {
  var iframe = document.getElementById(iframeId);
  if (!iframe) return;
  if (iframe.getAttribute('data-slide') === slideId) return;

  var url = getThumbnailUrl(slideId);
  if (!url) {
    iframe.src = getPlaceholderThumbUrl();
    return;
  }
  iframe.src = url;
  iframe.setAttribute('data-slide', slideId);
}

function buildSidebarDom() {
  var container = document.getElementById('sidebarThumbs');
  container.innerHTML = '';

  var editArea = document.createElement('div');
  editArea.id = 'editButtonsPlaceholder';
  editArea.className = 'editButtonsArea';
  editArea.textContent = 'Edit slides';
  container.appendChild(editArea);

  for (var i = 0; i < 2; i++) {
    var card = document.createElement('div');
    card.className = 'card nextSlide sidebarCard';

    var inner = document.createElement('div');
    inner.className = 'nextSlideInner';

    var iframe = document.createElement('iframe');
    iframe.id = 'sidebar-thumb-' + i;
    iframe.className = 'thumbnailFrame';
    iframe.setAttribute('data-slide', '');
    iframe.setAttribute('muted', '');

    var curtain = document.createElement('div');
    curtain.className = 'impressCurtain';

    inner.appendChild(iframe);
    inner.appendChild(curtain);

    var label = document.createElement('div');
    label.className = 'slideLabel';
    label.textContent = '---';

    card.appendChild(inner);
    card.appendChild(label);
    container.appendChild(card);
  }
}

function updateSidebarThumbnails() {
  if (slideList.length < 1) return;

  if (!sidebarBuilt) {
    buildSidebarDom();
    sidebarBuilt = true;
  }

  var idx = slideList.findIndex(function(s) { return s.step === currentSlideId; });
  if (idx < 0) idx = 0;

  var startIdx = idx + 1;
  var count = overviewVisible ? 1 : 2;

  var items = document.querySelectorAll('#sidebarThumbs .sidebarCard');
  Array.prototype.forEach.call(items, function(card, i) {
    var slideIdx = startIdx + i;
    if (i < count && slideIdx < slideList.length) {
      card.style.display = '';
      var label = card.querySelector('.slideLabel');
      if (label) label.textContent = slideList[slideIdx].stepName || ('Slide ' + (slideIdx + 1));
      sendToThumbnail('sidebar-thumb-' + i, slideList[slideIdx].step);
    } else {
      card.style.display = 'none';
    }
  });
}

function updateCurrentSlidePreview() {
  if (!currentSlideId) return;
  sendToSidebarLive('gotoSlide', currentSlideId);
  var idx = slideList.findIndex(function(s) { return s.step === currentSlideId; });
  var label = document.getElementById('thumb-label-current');
  if (label && idx >= 0) {
    label.textContent = slideList[idx].stepName || ('Slide ' + (idx + 1));
  }
}

function updateOverviewThumbnails() {
  if (slideList.length === 0) return;

  if (!overviewBuilt) {
    buildOverviewDom();
    overviewBuilt = true;
    loadOverviewThumb(0);
  }

  highlightOverviewSlide();
  updateLabels();
}

function buildOverviewDom() {
  var container = document.getElementById('impressOverview');
  container.innerHTML = '';

  slideList.forEach(function(s, i) {
    var frameId = 'overview-thumb-' + i;
    var item = document.createElement('div');
    item.className = 'grid-item';

    var wrapper = document.createElement('div');
    wrapper.className = 'overview-thumb-wrapper';

    var iframe = document.createElement('iframe');
    iframe.id = frameId;
    iframe.className = 'overview-thumb-frame';
    iframe.setAttribute('data-slide', '');

    var curtain = document.createElement('div');
    curtain.className = 'impressCurtain';

    wrapper.appendChild(iframe);
    wrapper.appendChild(curtain);

    var label = document.createElement('div');
    label.className = 'overview-thumb-label';
    label.textContent = s.stepName || ('Slide ' + (i + 1));

    item.appendChild(wrapper);
    item.appendChild(label);
    container.appendChild(item);

    item.addEventListener('click', function() {
      sendToViewer('gotoSlide', s.step);
    });

    item.setAttribute('data-slide-id', s.step);
  });
}

function updateLabels() {
  var items = document.querySelectorAll('#impressOverview .grid-item');
  Array.prototype.forEach.call(items, function(item, i) {
    if (i < slideList.length) {
      var label = item.querySelector('.overview-thumb-label');
      if (label) label.textContent = slideList[i].stepName || ('Slide ' + (i + 1));
    }
  });
}

function loadOverviewThumb(index) {
  if (index >= slideList.length) return;
  var frameId = 'overview-thumb-' + index;
  var iframe = document.getElementById(frameId);
  if (!iframe) return;

  var url = getThumbnailUrl(slideList[index].step);
  if (url) {
    iframe.src = url;
    iframe.setAttribute('data-slide', slideList[index].step);
  }
  loadOverviewThumb(index + 1);
}

function highlightOverviewSlide() {
  var items = document.querySelectorAll('#impressOverview .grid-item');
  Array.prototype.forEach.call(items, function(item) {
    if (item.getAttribute('data-slide-id') === currentSlideId) {
      item.classList.add('current');
      item.classList.remove('future');
    } else {
      item.classList.remove('current');
      item.classList.add('future');
    }
  });
}

async function toggleProjector() {
  try {
    if (projectorWindow) {
      var visible = await projectorWindow.isVisible();
      if (visible) {
        await projectorWindow.hide();
      } else {
        await projectorWindow.show();
        if (loadedFile) {
          await emit('loadProjection', { file: loadedFile, slide: currentSlideId });
        }
      }
    } else {
      var { WebviewWindow } = window.__TAURI__.webviewWindow;
      var existing = await WebviewWindow.getByLabel('projector');
      if (existing) {
        projectorWindow = existing;
        await projectorWindow.show();
        if (loadedFile) {
          await emit('loadProjection', { file: loadedFile, slide: currentSlideId });
        }
        projectorWindow.onCloseRequested(function(event) {
          event.preventDefault();
          projectorWindow.hide();
        });
        projectorWindow.onResized(function() { updateProjectorButtons(); });
      } else {
        projectorWindow = new WebviewWindow('projector', {
          url: 'projector.html',
          title: 'impressPlayer Projector',
          width: 1920,
          height: 1080,
          backgroundColor: '#000000',
          visible: true,
        });
        projectorWindow.once('tauri://created', function() {
          console.log('Projector opened');
          projectorWindow.onCloseRequested(function(event) {
            event.preventDefault();
            projectorWindow.hide();
          });
          projectorWindow.onResized(function() { updateProjectorButtons(); });
        });
        projectorWindow.once('tauri://error', function(e) {
          console.error('Projector error:', e);
          projectorWindow = null;
        });
      }
    }
    await updateProjectorButtons();
  } catch (e) {
    console.error('Projector toggle error:', e);
    projectorWindow = null;
  }
}

async function updateProjectorButtons() {
  try {
    var btn = document.getElementById('projectorBtn');
    var fsBtn = document.getElementById('fullscreenBtn');
    if (projectorWindow) {
      var visible = await projectorWindow.isVisible();
      var fullscreen = await projectorWindow.isFullscreen();
      btn.classList.toggle('active', visible);
      fsBtn.classList.toggle('active', fullscreen);
    } else {
      btn.classList.remove('active');
      fsBtn.classList.remove('active');
    }
  } catch (e) {}
}

async function toggleFullscreen() {
  try {
    if (projectorWindow) {
      var isFullscreen = await projectorWindow.isFullscreen();
      await projectorWindow.setFullscreen(!isFullscreen);
      await updateProjectorButtons();
    }
  } catch (e) {
    console.error('Fullscreen error:', e);
  }
}

function resetTimer() {
  totalSeconds = 0;
  timerPaused = false;
  timerStarted = true;
  updateTimerDisplay();
  document.getElementById('pauseTimerBtn').style.display = '';
  document.getElementById('resetTimerBtn').style.display = '';
  var icon = document.querySelector('#pauseTimerBtn i');
  if (icon) { icon.className = 'fa fa-pause'; }
  document.getElementById('pauseTimerBtn').title = 'Pause timer';
  if (!timerRunning) {
    timerRunning = true;
    showTimer('projection');
  }
}

function updateTimerDisplay() {
  var hour = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  var minute = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  var seconds = String(totalSeconds % 60).padStart(2, '0');
  document.getElementById('projectionTimer').textContent = hour + ':' + minute + ':' + seconds;
}

function showTimer(type) {
  if (type === 'current') {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('currentTime').textContent = h + ':' + m + ':' + s;
    setTimeout(function() { showTimer('current'); }, 1000);
  } else if (type === 'projection') {
    if (timerStarted && !timerPaused) {
      ++totalSeconds;
      updateTimerDisplay();
    }
    setTimeout(function() { showTimer('projection'); }, 1000);
  }
}

window.addEventListener('message', function(event) {
  if (!event.data || !event.data.event) return;
  switch (event.data.event) {
    case 'gotoSlide':
      renderNextSlide(event.data.payload);
      emit('gotoSlide', event.data.payload);
      break;
    case 'stepList':
      slideList = event.data.payload.slides;
      if (!currentSlideId && event.data.payload.current) {
        currentSlideId = event.data.payload.current;
      }
      displaySlideList(event.data.payload.current);
      updateSidebarThumbnails();
      sendToViewer('setupEventHandlers');
      if (currentSlideId) {
        sendToSidebarLive('gotoSlide', currentSlideId);
        pushProjectorState(currentSlideId);
      }
      break;
    case 'multimedia':
      var mediaControls = document.getElementById('mediaControlsDiv');
      if (event.data.payload === 'on') {
        mediaControls.classList.remove('hidden');
      } else {
        mediaControls.classList.add('hidden');
      }
      break;
    case 'audioVideoPlaying':
      mediaPlaying = event.data.payload === 'on';
      var playButton = document.querySelector('.playButton');
      var pauseButton = document.querySelector('.pauseButton');
      if (event.data.payload === 'on') {
        playButton.style.display = 'none';
        pauseButton.style.display = 'block';
      } else {
        playButton.style.display = 'block';
        pauseButton.style.display = 'none';
      }
      break;
    case 'mediaTime':
      var mediaPct = parseFloat(event.data.payload);
      if (isNaN(mediaPct) || seekDragging) break;
      document.getElementById('audioVideoSlider').value = mediaPct;
      break;
    case 'mediaSync':
      emit('mediaSync', event.data.payload);
      pushProjectorState(currentSlideId, event.data.payload);
      break;
    case 'controlsEnabled':
      var nextBtn = document.getElementById('nextSlideBtn');
      var prevBtn = document.getElementById('prevSlideBtn');
      keyboardEnabled = !!event.data.payload;
      if (event.data.payload) {
        nextBtn.removeAttribute('disabled');
        prevBtn.removeAttribute('disabled');
      } else {
        nextBtn.setAttribute('disabled', true);
        prevBtn.setAttribute('disabled', true);
      }
      break;
  }
});

function renderNextSlide(current) {
  if (current === currentSlideId) return;
  currentSlideId = current;
  sendToViewer('gotoSlide', current);
  sendToSidebarLive('gotoSlide', current);
  pushProjectorState(current);
  updateSidebarThumbnails();
  updateSlideInfo(current);
  if (overviewVisible) {
    highlightOverviewSlide();
    updateCurrentSlidePreview();
  }
}

function updateSlideInfo(current) {
  var slideName = slideList.find(function(x) { return x.step === current; });
  document.getElementById('currentSlideName').innerHTML = slideName ? slideName.stepName : '---';

  var idx = slideList.map(function(el) { return el.step; }).indexOf(current);
  document.getElementById('slidesCount').innerHTML = __('Slide %s of %s', (idx + 1), slideList.length);
}

function displaySlideList(current) {
  updateSlideInfo(current);
  if (overviewVisible) {
    updateOverviewThumbnails();
    updateCurrentSlidePreview();
  }
}
