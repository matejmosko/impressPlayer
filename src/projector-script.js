const { invoke } = window.__TAURI__.core;
const { emit, listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;
import { getViewerHtml, rewriteMediaToHttp } from './shared/viewer-html-builder.js';
import { wrapMarkdownForImpress, extractImpressContent } from './shared/presentation-utils.js';

let currentFile = null;

document.addEventListener('DOMContentLoaded', async function() {
  emit('projector-ready', {});

  listen('loadProjection', async function(event) {
    if (event.payload && event.payload.file) {
      currentFile = event.payload.file;
      await loadPresentation(event.payload.file);
      if (event.payload.slide) {
        setTimeout(function() { sendToViewer('gotoSlide', event.payload.slide); }, 200);
      }
    }
  });

  listen('gotoSlide', function(event) {
    sendToViewer('gotoSlide', event.payload);
  });

  listen('mediaSync', function(event) {
    sendToViewer('mediaSync', event.payload);
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      sendToViewer('nextSlide');
    } else if (e.key === 'ArrowLeft') {
      sendToViewer('prevSlide');
    } else if (e.key === 'f' || e.key === 'F' || e.key === 'Escape') {
      toggleFullscreen();
    }
  });

  var viewerFrame = document.getElementById('impressCurrent');
  viewerFrame.addEventListener('load', function() {
    sendToViewer('setupEventHandlers');
  });

  window.addEventListener('message', function(event) {
    if (!event.data || !event.data.event) return;
    if (event.data.event === 'gotoSlide') {
      emit('controller-slide-changed', event.data.payload);
    }
  });
});

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
      impressContent = rewriteMediaToHttp(impressContent, mediaServerUrl);
      var viewerHtml = getViewerHtml(impressContent, styleContent, impressVersion, dir);
      var viewerFrame = document.getElementById('impressCurrent');
      var blob = new Blob([viewerHtml], { type: 'text/html' });
      viewerFrame.src = URL.createObjectURL(blob) + '#projector';
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

async function toggleFullscreen() {
  try {
    var win = getCurrentWindow();
    var isFullscreen = await win.isFullscreen();
    await win.setFullscreen(!isFullscreen);
  } catch (e) {
    console.error('Fullscreen error:', e);
  }
}
