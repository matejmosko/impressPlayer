$(function() {
 const ipc = require('electron').ipcRenderer;
var running;

 ipc.on('loadProjection', (event, loadedFile, projection) => {
  if (!running) {
    var root = document.getElementById("container");
    root.innerHTML = loadedFile;
   impress().init();
   running = true;

   if (projection == 'current') {
    root.addEventListener('impress:stepleave', function() {
     current = getCurrentSlide();
     future = getFutureSlides();
     ipc.sendToHost('gotoSlide', current);
    });
    var stepList = document.querySelectorAll(".step");
    var ids = [].map.call(stepList, function(elem) {
     return elem.id;
    });
    ipc.sendToHost('slideList', ids, getCurrentSlide());

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
  impress().next();
 });

 ipc.on('prevSlide', (event) => {
  impress().prev();
 });

 ipc.on('gotoSlide', (event, arg) => {
  impress().goto(arg);
 });

});
