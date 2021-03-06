//$(function() { // No jQuery needed
let impViewer = (function() {
  const ipc = require('electron').ipcRenderer;
  let impressRoot = document.getElementById("impress"),
    current;

        getStepList();

  impressRoot.addEventListener('impress:stepleave', function() {
    sendCurrentSlide();
    getStepList();
    ipc.sendToHost('controlsEnabled', false);
  });

  impressRoot.addEventListener('impress:stepenter', function() {
    ipc.sendToHost('controlsEnabled', true);
  });

  ipc.on('setupEventHandlers', (_event, webview) => {
    switch (webview) {
      case 'current':
      case 'projector':
        mediaEventListeners();
        break;
      default:
        console.log('There was a call for webview that does not exist.');
    }
  });

  ipc.on('nextSlide', (_event) => {
    impress().next();
  });

  ipc.on('prevSlide', (_event) => {
    impress().prev();
  });

  ipc.on('gotoSlide', (_event, arg) => {
    impress().goto(arg);
  });

  ipc.on('audioVideoControls', (_event, command, data) => {
    let currentEL = document.getElementsByClassName("present")[0];
    let media;
    if (currentEL.classList.contains("hasVideo")) {
      media = currentEL.getElementsByTagName("video")[0];
    } else if (currentEL.classList.contains("hasAudio")) {
      media = currentEL.getElementsByTagName("audio")[0];
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

  function getStepList() {
    let stepList = document.getElementsByClassName("step");
    current = getCurrentSlide();
    let ids = [].map.call(stepList, function(elem) {
      return {
        "step": elem.id,
        "stepName": elem.getElementsByTagName("h1")[0] && elem.getElementsByTagName("h1")[0].innerHTML || ""
      };
    });
    ipc.sendToHost('stepList', ids, current);
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

        media.addEventListener("timeupdate", function() { // Calculate the slider value
          let value = (100 / media.duration) * media.currentTime; // Update the slider value
          ipc.sendToHost('mediaTime', value);
        });

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

  function sendCurrentSlide(){
    current = getCurrentSlide();
    ipc.sendToHost('gotoSlide', current);
  }



})();
