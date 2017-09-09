// Mixing jQuery and Node.js code in the same file? Yes please!

$(function() {
  var impProjector = (function() {
    const ipc = require('electron').ipcRenderer;

    const settings = require('electron').remote.require('electron-settings');
    const webview = document.querySelector('#impressCurrent');

    // renderer process

    ipc.on('loadProjection', (event) => {
      webview.reload();

    });

    ipc.on('gotoSlide', (event, current) => {
      webview.send('gotoSlide', current);
    });

    webview.addEventListener('did-finish-load', function() {
      webview.send('setupEventHandlers', 'projector');
    });

  })();
});
