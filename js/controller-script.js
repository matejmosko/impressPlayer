  let impController = (function() {
    const remote = require('electron').remote;
    const app = remote.app;
    const path = require('path');
    const fs = require('fs');
    const ms = require('mustache');
  //  const markpress = require('markpress');
  //  const mousetrap = require('mousetrap');
  //  const DecompressZip = require('decompress-zip');
    const fontawesome = require('@fortawesome/fontawesome');
    const faFreeSolid = require('@fortawesome/fontawesome-free-solid');
    const webview1 = document.querySelector('#nextImpress-1'),
      webview2 = document.querySelector('#nextImpress-2'),
      webview0 = document.querySelector('#impressCurrent');
    const {
      dialog
    } = require('electron').remote;
    const settings = remote.require('electron-settings');

    const i18n = remote.getGlobal('globalObject').i18n;
    const debugMode = remote.getGlobal('globalObject').debugMode;

    const ipc = require('electron').ipcRenderer;
    let exitDialog = document.getElementById("exitDialog"),
      totalSeconds = 0,
      loadedFile,
      seekBar = document.getElementById("audioVideoSlider");
    setupSettings();

    // Load impress-viewer template
    // TODO Move this to async function inside the part, where we generate viewer.html
    // TODO Move all tmp files (viewer.html, controller.html) to userData.

    tplViewerHTML = fs.readFileSync(path.resolve(app.getAppPath(), './templates/viewer.tpl'), 'utf8');
    let parser = new DOMParser(),
      viewerDOM = parser.parseFromString(tplViewerHTML, "text/html");

    // Setup Settings Database

    ipc.on('windowResized', (_event) => { // Resize window according to aspectRatio of a device
      //setupWebviewSizes();
    });

    function setupSettings() {
      if (!settings.has("name")) {
        ipc.send('saveDefaultSettings');
      }
    }

    /* Logs */

    function saveLogs(text) {
      console.log(text);
      ipc.send('saveLogs', text);
    }

    /* UI part - all buttons tabs, radios etc. */
    let currentSlideDiv = document.getElementById("currentSlideDiv"),
      allSlidesDiv = document.getElementById("allSlidesDiv"),
      remoteSourcesDiv = document.getElementById("remoteSourcesDiv"),
      optionsDiv = document.getElementById("optionsDiv");

    document.getElementById("currentSlideTab").addEventListener("click", function() {
      currentSlideDiv.classList.remove("hidden");
      allSlidesDiv.classList.add("hidden");
      remoteSourcesDiv.classList.add("hidden");
      optionsDiv.classList.add("hidden");
    }, false);
    document.getElementById("allSlidesTab").addEventListener("click", function() {
      currentSlideDiv.classList.add("hidden");
      allSlidesDiv.classList.remove("hidden");
      remoteSourcesDiv.classList.add("hidden");
      optionsDiv.classList.add("hidden");
    }, false);
    document.getElementById("remoteSourcesTab").addEventListener("click", function() {
      currentSlideDiv.classList.add("hidden");
      allSlidesDiv.classList.add("hidden");
      remoteSourcesDiv.classList.remove("hidden");
      optionsDiv.classList.add("hidden");
    }, false);
    document.getElementById("optionsTab").addEventListener("click", function() {
      currentSlideDiv.classList.add("hidden");
      allSlidesDiv.classList.add("hidden");
      remoteSourcesDiv.classList.add("hidden");
      optionsDiv.classList.remove("hidden");
    }, false);

    document.getElementById("fullscreenBtn").addEventListener("click", function() { // Toggle Projector Window fullscreen
      ipc.send('toggleFullscreen');
    });

    document.getElementById("disclamerBtn").addEventListener("click", function() { // Toggle visibility of Rules div
      ipc.send('toggleRules');
    });

    document.getElementById("projectorBtn").addEventListener("click", function() { // Toggle visibility of Projector Window
      ipc.send('toggleProjector');
    });

    ipc.on('buttonSwitch', (_event, btn, x) => { // Toggle "toggled" state of top buttons when non-click event change status
      if (x) {
        document.getElementById(btn).toggled = true;
      } else {
        document.getElementById(btn).toggled = false;
      }
    });

    ipc.on('selectFile', (_event) => {
      selectFile();
    });

    ipc.on('refreshFile', (_event) => {
      loadProjectionFile(loadedFile);
    });

    ipc.on('quitModal', (_event) => { // Show "Really Quit" dialog
      exitDialog.showModal();
    });

    document.getElementById("reallyQuit").addEventListener("click", function() { // "Really Quit"  confirmed. We are leaving the ship.
      ipc.send('reallyQuit');
    });

    document.getElementById("doNotQuit").addEventListener("click", function() { // "Really Quit" refused. The show must go on...
      exitDialog.close();
    });

    function selectFile() {
      dialog.showOpenDialog({
        defaultPath: settings.get("defaultPath") || app.getPath("home"),
        filters: [{
            name: 'impress.js presentations',
            extensions: ['md', 'mkd', 'markdown', 'html', 'htm', 'zip']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      }, function(fileNames) {
        settings.set("defaultPath", path.dirname(fileNames[0]))
        if (fileNames === undefined) {
          saveLogs(i18n.__("No file selected"));
          return;
        }
        loadedFile = fileNames[0];
        //loadProjectionFile(fileNames[0]);
        ipc.send('loadFile', fileNames[0]);
      });
    }

    document.getElementById("openFile").addEventListener("click", function() {
      selectFile();
    });
    ipc.on('loadProjection', (_event) => { // Resize window according to aspectRatio of a device
      webview0.reload();
      loadProjection();
    });
    ipc.on('loadPreviews', (_event) => { // Resize window according to aspectRatio of a device
      webview1.reload();
      webview2.reload();
    });

    /* Main Software Part */

    function loadProjection() {
      //saveViewer();
      showTimer('projection');
      totalSeconds = 0;
      document.getElementById("projectionTimer").addEventListener("click", function() {
        totalSeconds = 0;
      });
      document.body.classList.add('running');
      mousetrap.bind(['space'], function() {
        webview0.send('nextSlide');
      });
      mousetrap.bind(['ctrl+backspace'], function() {
        webview0.send('prevSlide');
      });
      if (debugMode) {
        webview1.openDevTools();
        webview1.addEventListener('console-message', (e) => {
          saveLogs('Guest page logged a message:', e.message);
        })
      }
    }

    function getFutureSlides(current, offset) {
      //let i = slideList.indexOf(current);
      let i = slideList.findIndex(x => x.step === current);
      let n = slideList.length;
      if (n - i > 2) {
        return slideList[i + offset].step;
      }
      if (n - i == 2 && offset == 1) {
        return slideList[i + offset].step;
      }
      if (n - i == 2 && offset == 2) {
        return slideList[0].step;
      }
      if (n - i == 1 && offset == 1) {
        return slideList[0].step;
      }
      if (n - i == 1 && offset == 2) {
        return slideList[1].step;
      }
    }

    webview0.addEventListener('did-finish-load', function() {
      webview0.setAudioMuted(true);
      webview1.setAudioMuted(true);
      webview2.setAudioMuted(true);
      webview0.send('setupEventHandlers', 'current');
    });

    function renderNextSlide(current) {
      ipc.send('projectionGoToSlide', current);
      webview0.send('gotoSlide', current);
      webview1.send('gotoSlide', getFutureSlides(current, 1));
      webview2.send('gotoSlide', getFutureSlides(current, 2));
      displaySlideList(current);
    }

    function displaySlideList(current) {
      /* Render clickable flexbox grid of all slides */
      let tplSlideList = `
        <div id='slideList' class="grid">
          {{#slides}}
            <button id='{{step}}' class='grid-item btn {{isCurrent}}'><span>{{stepName}}<span></button>
          {{/slides}}
        </div>
      `;
      let rendered = ms.render(tplSlideList, {
        "slides": slideList,
        "isCurrent": function() {
          if (this.step == current) {
            return "current";
          } else {
            return "future";
          }
        }
      });
      document.getElementById("impressOverview").innerHTML = rendered;

      /* Display current Slide Name in bottom-right infobox */
      let x = slideList.find(x => x.step === current).stepName;
      document.getElementById("currentSlideName").innerHTML = x;

      /* Display current Slide Number in bottom-right infobox */
      i = slideList.map((el) => el.step).indexOf(current);
      document.getElementById("slidesCount").innerHTML = i18n.__("Slide %s of %s", (i + 1), slideList.length);

      /* Add click event listeners to all grid-items = Going to slide*/
      let div = document.getElementById("slideList");
      let items = div.getElementsByClassName("grid-item");
      Array.prototype.forEach.call(items, function(item) {
        item.addEventListener("click", function() {
          renderNextSlide(this.id);
        }, false);
      });
    }

    function checkTime(i) {
      return (i < 10) ? "0" + i : i;
    }

    function showTimer(type) {
      switch (type) {
        case "current":
          let today = new Date(),
            h = checkTime(today.getHours()),
            m = checkTime(today.getMinutes()),
            s = checkTime(today.getSeconds());
          document.getElementById('currentTime').innerHTML = h + ":" + m + ":" + s;
          break;
        case "projection":
          ++totalSeconds;
          let hour = checkTime(Math.floor(totalSeconds / 3600));
          let minute = checkTime(Math.floor((totalSeconds - hour * 3600) / 60));
          let seconds = checkTime(totalSeconds - (hour * 3600 + minute * 60));

          document.getElementById("projectionTimer").innerHTML = hour + ":" + minute + ":" + seconds;


          break;
      }
      t = setTimeout(function() {
        showTimer(type);
      }, 1000);
    }

    showTimer('current');

    webview0.addEventListener('ipc-message', (event) => {
      switch (event.channel) {
        case 'gotoSlide':
          renderNextSlide(event.args[0]);
          break;
        case 'slideList':
          slideList = event.args[0];
          displaySlideList(event.args[1]);
          break;
        case 'multimedia':
          let mediaControls = document.getElementById("mediaControlsDiv");
          switch (event.args[0]) {
            case 'on':
              mediaControls.classList.remove("hidden");
              break;
            case 'off':
              mediaControls.classList.add("hidden");
              break;
          }
          break;
        case "audioVideoPlaying":
          let playPauseMediaBtn = document.getElementById("playPauseMediaBtn");
          let playButton = document.getElementsByClassName("playButton")[0];
          let pauseButton = document.getElementsByClassName("pauseButton")[0];
          switch (event.args[0]) {
            case 'on':
              playButton.style.display = "none";
              pauseButton.style.display = "block";
              break;
            case 'off':
              playButton.style.display = "block";
              pauseButton.style.display = "none";
              break;
          }
          break;
        case "mediaTime":
          seekBar.value = event.args[0];
          break;
        case "controlsEnabled":
          let nextSlideBtn = document.getElementById("nextSlideBtn");
          let prevSlideBtn = document.getElementById("prevSlideBtn");
          switch (event.args[0]) {
            case true:
              document.removeEventListener("keyup", setupKeyboardControls, false);
              document.addEventListener("keyup", setupKeyboardControls, false);
              nextSlideBtn.removeAttribute("disabled");
              prevSlideBtn.removeAttribute("disabled");
              /*TODO Apply for button as well */
              break;
            case false:
              document.removeEventListener("keyup", setupKeyboardControls, false);
              nextSlideBtn.setAttribute("disabled", true);
              prevSlideBtn.setAttribute("disabled", true);
              break;
          }
          break;
        default:
          saveLogs(i18n.__("There is something new coming from impress.js."));
      }
    });

    document.getElementById("prevSlideBtn").addEventListener("click", function() {
      webview0.send('prevSlide');
    }, false);

    document.getElementById("nextSlideBtn").addEventListener("click", function() {
      webview0.send('nextSlide');
    }, false);

    document.getElementById("playPauseMediaBtn").addEventListener("click", function() {
      webview0.send('audioVideoControls', 'playPause');
      ipc.send('audioVideoControls', 'playPause');
    }, false);

    document.getElementById("restartMediaBtn").addEventListener("click", function() {
      webview0.send('audioVideoControls', 'restart');
      ipc.send('audioVideoControls', 'restart');
    }, false);

    // Event listener for the seek bar
    seekBar.addEventListener("change", function() {
      webview0.send('audioVideoControls', 'seek', seekBar.value);
      ipc.send('audioVideoControls', 'seek', seekBar.value);
    });

    seekBar.addEventListener("mousedown", function() {
      webview0.send('audioVideoControls', 'pause');
      ipc.send('audioVideoControls', 'pause');
    });

    seekBar.addEventListener("mouseup", function() {
      webview0.send('audioVideoControls', 'play');
      ipc.send('audioVideoControls', 'play');
    });

    window.addEventListener('keydown', function(e) {
      if (e.keyCode == 32 && e.target == document.body) {
        e.preventDefault();
      }
    });

    document.addEventListener("keydown", function(event) {
      if (event.keyCode === 9 ||
        (event.keyCode >= 32 && event.keyCode <= 34) ||
        (event.keyCode >= 37 && event.keyCode <= 40)) {
        event.preventDefault();
      }
    }, false);

    document.addEventListener("keyup", setupKeyboardControls, false);

    function setupKeyboardControls() {
      if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.keyCode === 9 ||
        (event.keyCode >= 32 && event.keyCode <= 34) ||
        (event.keyCode >= 37 && event.keyCode <= 40)) {
        switch (event.keyCode) {
          case 33: // Page up
          case 37: // Left
          case 38: // Up
            webview0.send('prevSlide');
            break;
          case 9: // Tab
          case 32: // Space
          case 34: // Page down
          case 39: // Right
          case 40: // Down
            webview0.send('nextSlide');
            break;
        }

        event.preventDefault();
      }
    }

  })();
