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
  // renderer process

  ipc.on('loadProjection', (event, loadedFile) => {
    if (!running) {                                                             // TEMPORARY SOLUTION. Nefunguje dobre, keď už je raz inicializovaný impress.js. Treba zistiť, ako ho viem zabiť.
      $('#impress').html(loadedFile);
      impress().init();
      running = true;
      var root = document.getElementById("impress");
      root.addEventListener('impress:stepleave', onStepLeave);
    }
  });

  ipc.on('gotoSlide', (event, arg) => {
    impress().goto(arg);
  });

  function getCurrentSlide() {
    var currentSlide = $('.active').attr('id');
    return currentSlide;
  }

  function onStepLeave() {
    var next = getCurrentSlide();
    console.log(next);
    ipc.send('consoleGoToSlide', next);
  }

});
