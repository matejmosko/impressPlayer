$(function() {
 const ipc = require('electron').ipcRenderer;
 var presentation = impress(),
  running;

 ipc.on('loadProjection', (event, loadedFile, projection) => {
  if (!running) { // TEMPORARY SOLUTION. Nefunguje dobre, keď už je raz inicializovaný impress.js. Treba zistiť, ako ho viem zabiť.
   $('#impress').html(loadedFile);
   presentation.init();
   running = true;

   if (projection == 'current') {
    var root = document.getElementById("impress");
    root.addEventListener('impress:stepleave', function() {
      current = getCurrentSlide();
      future = getFutureSlides();
      ipc.sendToHost('gotoSlide',current);
});
      var vehicles = document.querySelectorAll(".step");
      var ids = [].map.call(vehicles, function(elem) {
        return elem.id;
      });
      ipc.sendToHost('slideList',ids, getCurrentSlide());

   }
  }
 });

   function getCurrentSlide() {
     var currentSlide = $('.active').attr('id');
     return currentSlide;
   }

    function getFutureSlides() {
     var futureSlide = $('.future');
     return futureSlide;
    }

/*
   function onStepLeave() {
     var next = getCurrentSlide();
     console.log(next);
     ipc.send('consoleGoToSlide', next);
   }
 */

 ipc.on('nextSlide', (event) => {
  presentation.next();
 });

 ipc.on('prevSlide', (event) => {
  presentation.prev();
 });

 ipc.on('gotoSlide', (event, arg) => {
  presentation.goto(arg);
 });

});
