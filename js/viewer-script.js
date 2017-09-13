//$(function() { // No jQuery needed
  let impViewer = (function() {
    const ipc = require('electron').ipcRenderer;
    let running;

    consoleControls();
    running = true;

    function consoleControls() {
      let impressRoot = document.getElementById("impress");
      impressRoot.addEventListener('impress:stepleave', function() {
        current = getCurrentSlide();
        ipc.sendToHost('gotoSlide', current);
      });
      let stepList = document.querySelectorAll(".step");
      let ids = [].map.call(stepList, function(elem) {
        return { "step": elem.id, "stepName": elem.getElementsByTagName("h1")[0].innerHTML };
      });
      ipc.sendToHost('slideList', ids, getCurrentSlide());
    }

    function mediaEventListeners() {
      /* HTML5 Video tags */
      let videos = document.getElementsByTagName("video");
      Array.prototype.forEach.call(videos, function(video) {
        let videoStep = video.closest(".step");
        videoStep.classList.add("hasVideo");
        videoStep.addEventListener("impress:stepenter", function() {
          video.play();
          ipc.sendToHost('multimedia', 'on');
        }, false);
        videoStep.addEventListener("impress:stepleave", function() {
          video.pause();
          ipc.sendToHost('multimedia', 'off');
        }, false);
        video.addEventListener("playing", function() {
          ipc.sendToHost('audioVideoPlaying', 'on');
        }, false);
        video.addEventListener("pause", function() {
          ipc.sendToHost('audioVideoPlaying', 'off');
        }, false);
      });

      /* HTML5 Audio tags */
      let audios = document.getElementsByTagName("audio");
      Array.prototype.forEach.call(audios, function(audio) {
        let audioStep = audio.closest(".step");
        audioStep.classList.add("hasAudio");
        audioStep.addEventListener("impress:stepenter", function() {
          audio.play();
          ipc.sendToHost('multimedia', 'on');
        }, false);
        audioStep.addEventListener("impress:stepleave", function() {
          audio.pause();
          ipc.sendToHost('multimedia', 'off');
        }, false);
        audio.addEventListener("playing", function() {
          ipc.sendToHost('audioVideoPlaying', 'on');
        }, false);
        audio.addEventListener("pause", function() {
          ipc.sendToHost('audioVideoPlaying', 'off');
        }, false);
      });
    }

    function getCurrentSlide() {
      let currentSlide = document.getElementsByClassName("active")[0].id;
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
      let current = document.getElementsByClassName("present")[0];
      let media;
      if (current.classList.contains("hasVideo")) {
        media = document.getElementsByTagName("video")[0];
      } else if (current.classList.contains("hasAudio")) {
        media = document.getElementsByTagName("audio")[0];
      }

      switch (command) {
        case 'playPause':
          if (media.paused) {
            media.play();
          } else {
            media.pause();
          }
          break;
        case 'restart':
          media.load();
          break;
        default:
      }
    });

  })();
//});
