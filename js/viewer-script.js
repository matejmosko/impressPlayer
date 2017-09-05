$(function() {
  var impViewer = (function() {
    const ipc = require('electron').ipcRenderer;
    var running;

    mediaEventListeners();
    consoleControls();
    running = true;

    function consoleControls() {
      let impressRoot = document.getElementById("impress");
      impressRoot.addEventListener('impress:stepleave', function() {
        current = getCurrentSlide();
        ipc.sendToHost('gotoSlide', current);
      });
      let stepList = document.querySelectorAll(".step");
      var ids = [].map.call(stepList, function(elem) {
        return { "step": elem.id, "stepName": elem.getElementsByTagName("h1")[0].innerHTML };
      });
      ipc.sendToHost('slideList', ids, getCurrentSlide());
    }

    function mediaEventListeners() {
      var videos = document.getElementsByTagName("video"); // TODO Add if statement to make sure the video has autoplay attribute.
      Array.prototype.forEach.call(videos, function(video) {
        var videoStep = video.closest(".step");
        videoStep.addEventListener("impress:stepenter", function() {
          video.play();
        }, false);
        videoStep.addEventListener("impress:stepleave", function() {
          video.pause();
        }, false);
      });
    }

    function getCurrentSlide() {
      var currentSlide = $('.active').attr('id');
      return currentSlide;
    }

    ipc.on('nextSlide', (event) => {
      impress().next();
    });

    ipc.on('prevSlide', (event) => {
      impress().prev();
    });

    ipc.on('gotoSlide', (event, arg) => {
      impress().goto(arg);
    });
  })();
});
