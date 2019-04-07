
//$(function() { // No jQuery needed
  let impProjector = (function() {
    const ipc = require('electron').ipcRenderer;

    const settings = require('electron').remote.require('electron-settings');
    const webview = document.querySelector('#impressCurrent');

    // renderer process

    ipc.on('loadProjection', (_event) => {
      webview.reload();
    });

    ipc.on('gotoSlide', (_event, current) => {
      webview.send('gotoSlide', current);
    });

    ipc.on('audioVideoControls', (_event, command, data) => {
      webview.send('audioVideoControls', command, data);
    });

    webview.addEventListener('did-finish-load', function() {
      webview.send('setupEventHandlers', 'projector');
    });

  })();
//});
