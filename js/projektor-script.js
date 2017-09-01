// Mixing jQuery and Node.js code in the same file? Yes please!

$(function() {
  var impProjector = (function() {
    var ipc = require('electron').ipcRenderer,
      params = {},
      current,
      timer,
      running = false;

    const path = require('path');
    const fs = require('fs');
    const url = require('url');
    const settings = require('electron').remote.require('electron-settings');
    const webview = document.querySelector('#impressCurrent');

    // renderer process

    ipc.on('loadProjection', (event, impressPath, data, css, projection) => {
      webview.send('loadProjection', impressPath, data, css, 'current');
      //webview.insertCSS(fs.readFileSync(extcss, 'utf8'));
    });

    ipc.on('gotoSlide', (event, current) => {
      webview.send('gotoSlide', current);
    });

    function getCurrentSlide() {
      var currentSlide = $('.active').attr('id');
      return currentSlide;
    }

    function getFutureSlides() {
      var currentSlide = $('.future').attr('id');
      return currentSlide;
    }

    function onStepLeave() {
      var next = getCurrentSlide();
      console.log(next);
      ipc.send('consoleGoToSlide', next);
    }

//    webview.openDevTools();
  })();
});
