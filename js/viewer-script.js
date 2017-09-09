$(function() {
  var impViewer = (function() {
    const ipc = require('electron').ipcRenderer;
    var running;

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
          ipc.sendToHost('multimedia', 'on');
        }, false);
        videoStep.addEventListener("impress:stepleave", function() {
          video.pause();
          ipc.sendToHost('multimedia', 'off');
        }, false);
        video.addEventListener("playing", function(){
          ipc.sendToHost('audioVideoPlaying', 'on');
        }, false);
        video.addEventListener("pause", function(){
          ipc.sendToHost('audioVideoPlaying', 'off');
        }, false);
      });
    }

    function getCurrentSlide() {
      var currentSlide = $('.active').attr('id');
      return currentSlide;
    }

    ipc.on('setupEventHandlers', (event, webview) => {
      switch (webview) {
        case 'current':
        case 'projector':
          mediaEventListeners();
          break;
        default:
          console.log('There was a call for webview that does not exist.');
      }
    });

    ipc.on('nextSlide', (event) => {
      impress().next();
    });

    ipc.on('prevSlide', (event) => {
      impress().prev();
    });

    ipc.on('gotoSlide', (event, arg) => {
      impress().goto(arg);
    });
    ipc.on('audioVideoControls', (event, command) => {
      console.log(command);
      let current = document.getElementsByClassName("present")[0];
      let video = document.getElementsByTagName("video")[0];
      switch (command) {
        case 'playPause':
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
        case 'reload':
          video.load();
          break;
        default:
      }
    });

  })();
});
