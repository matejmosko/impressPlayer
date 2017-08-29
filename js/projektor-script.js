// Mixing jQuery and Node.js code in the same file? Yes please!

$(function() {
  var ipc = require('electron').ipcRenderer,
    params = {},
    current,
    timer,
    running = false;

  const path = require('path');
  const url = require('url');
  const settings = require('electron').remote.require('electron-settings');
  const webview = document.querySelector('#impressCurrent');

  // renderer process

  ipc.on('loadProjection', (event, data, css) => {
    // TEMPORARY SOLUTION. Nefunguje dobre, keď už je raz inicializovaný impress.js. Treba zistiť, ako ho viem zabiť.
      webview.send('loadProjection', data, css, 'current');
/*      var root = document.getElementById("container");
      var style = document.getElementsByTagName("style")[0];
      root.innerHTML = loadedFile;
      style.innerHTML = css;
      impress().init();
      running = true;
      //var root = document.getElementById("impress");
      root.addEventListener('impress:stepleave', onStepLeave);
    }*/
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

  webview.openDevTools();
});
