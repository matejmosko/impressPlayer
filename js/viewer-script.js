//$(function() { // No jQuery needed
let impViewer = (function() {
  const ipc = require('electron').ipcRenderer;
  let running;

  consoleControls();
  running = true;

  function consoleControls() {
    let impressRoot = document.getElementById("impress");
    impressRoot.addEventListener('impress:stepleave', function() {
      let current = getCurrentSlide();
      ipc.sendToHost('gotoSlide', current);
      ipc.sendToHost('controlsEnabled', false);
    });

    impressRoot.addEventListener('impress:stepenter', function() {
      ipc.sendToHost('controlsEnabled', true);
    });
    let stepList = document.getElementsByClassName("step");
    let ids = [].map.call(stepList, function(elem) {
      return {
        "step": elem.id,
        "stepName": elem.getElementsByTagName("h1")[0] && elem.getElementsByTagName("h1")[0].innerHTML || ""
      };
    });
    ipc.sendToHost('slideList', ids, getCurrentSlide());
  }

  function mediaEventListeners() {
    /* HTML5 Video tags */
    let videos = document.getElementsByTagName("video");
    Array.prototype.forEach.call(videos, function(video) {
      let videoStep = video.closest(".step");
      videoStep.classList.add("hasVideo");
      addEvent(videoStep, video);
    });

    /* HTML5 Audio tags */
    let audios = document.getElementsByTagName("audio");
    Array.prototype.forEach.call(audios, function(audio) {
      let audioStep = audio.closest(".step");
      audioStep.classList.add("hasAudio");
      addEvent(audioStep, audio);
    });

    /* Add event listeners to autoplay and to PlayPause */
    function addEvent(mediaStep, media) {
      mediaStep.addEventListener("impress:stepenter", function autoplay() {
        if (media.autoplay == true) {
          media.play();
        }
        ipc.sendToHost('multimedia', 'on');
      }, false);
      mediaStep.addEventListener("impress:stepleave", function autoplay() {
        media.pause();
        ipc.sendToHost('multimedia', 'off');
      }, false);
      media.addEventListener("playing", function playing() {
        ipc.sendToHost('audioVideoPlaying', 'on');
      }, false);
      media.addEventListener("pause", function playing() {
        ipc.sendToHost('audioVideoPlaying', 'off');
      }, false);
    }
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
  ipc.on('audioVideoControls', (event, command, data) => {
    let current = document.getElementsByClassName("present")[0];
    let media;
    if (current.classList.contains("hasVideo")) {
      media = current.getElementsByTagName("video")[0];
    } else if (current.classList.contains("hasAudio")) {
      media = current.getElementsByTagName("audio")[0];
    }

    media.addEventListener("timeupdate", function() {
      // Calculate the slider value
      let value = (100 / media.duration) * media.currentTime;
      // Update the slider value
      ipc.sendToHost('mediaTime', value);
    });

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
      case 'pause':
        media.pause();
        break;
      case 'play':
        media.play();
        break;
      case 'seek':
        // Calculate the new time
        var time = media.duration * (data / 100);
        // Update the video time
        media.currentTime = time;
        break;
      default:
    }
  });

})();
//});
