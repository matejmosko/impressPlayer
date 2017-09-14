  let impConsole = (function() {
    const remote = require('electron').remote;
    const app = remote.app;
    const path = require('path');
    const url = require('url');
    const fs = require('fs');
    const ms = require('mustache');
    const markpress = require('markpress');
    const mousetrap = require('mousetrap');
    const DecompressZip = require('decompress-zip');
    const webview1 = document.querySelector('#nextImpress-1'),
      webview2 = document.querySelector('#nextImpress-2'),
      webview0 = document.querySelector('#impressCurrent');
    const {
      dialog
    } = require('electron').remote;
    const settings = remote.require('electron-settings');

    const i18n = remote.getGlobal('globalObject').i18n;
    const arguments = remote.getGlobal('globalObject').arguments;

    const ipc = require('electron').ipcRenderer;
    let slidesList = [],
      opts = {},
      running = false,
      exitDialog = document.getElementById("exitDialog"),
      totalSeconds = 0,
      debugMode = false;
    setupSettings();

    if (arguments[0] == "debug"){
      debugMode = true;
    }

    // Load impress-viewer template
    // TODO Move this to async function inside the part, where we generate viewer.html
    // TODO Move all tmp files (viewer.html, console.html) to userData.

    tplViewerHTML = fs.readFileSync(path.resolve(app.getAppPath(), './templates/viewer.tpl'), 'utf8');
    let parser = new DOMParser(),
      viewerDOM = parser.parseFromString(tplViewerHTML, "text/html");

    // Setup Settings Database

    function setupSettings() {
      if (!settings.has("name")) {
        ipc.send('saveDefaultSettings');
      }
      loadSettings(settings.getAll());
    }

    function loadSettings(p) {
      opts = p;
    }

    /* Logs */

    function saveLogs(text) {
      console.log(text);
      ipc.send('saveLogs', text);
    }

    function loadFile(loadedFile) { // load file
      file = fs.openSync(loadedFile[0], 'a');
      fs.readFile(loadedFile[0]);
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

    document.getElementById("projectorBtn").addEventListener("click", function() { // Toggle visibility og Projector Window
      ipc.send('toggleProjector');
    });

    ipc.on('buttonSwitch', (event, btn, x) => { // Toggle "toggled" state of top buttons when non-click event change status
      if (x) {
        document.getElementById(btn).toggled = true;
      } else {
        document.getElementById(btn).toggled = false;
      }
    });

    ipc.on('quitModal', (event) => { // Show "Really Quit" dialog
      exitDialog.opened = true;
    });

    document.getElementById("reallyQuit").addEventListener("click", function() { // "Really Quit"  confirmed. We are leaving the ship.
      ipc.send('reallyQuit');
    });

    document.getElementById("doNotQuit").addEventListener("click", function() { // "Really Quit" refused. The show must go on...
      exitDialog.opened = false;
    });

    document.getElementById("openFile").addEventListener("click", function() {
      dialog.showOpenDialog({
        filters: [
          { name: 'impress.js presentations', extensions: ['md', 'mkd', 'markdown', 'html', 'htm', 'zip'] },
          { name: 'All Files', extensions: ['*'] }
      ]
      }, function(fileNames) {
        if (fileNames === undefined) {
          console.log(i18n.__("No file selected"));
          return;
        }
        loadProjectionFile(fileNames[0]);
      });
    });
    /* Main Software Part */

    function parseMarkdown(file) {
      const options = {
        theme: 'light',
        autoSplit: true,
        allowHtml: false,
        verbose: false,
        embed: false,
        title: 'Optional title for output HTML'
      };

      markpress(file, options).then(({
        html,
        md
      }) => {
        let parser = new DOMParser();
        let el = parser.parseFromString(html, "text/html");
        parseProjection(el, file);
      });
    }

    function loadProjectionFile(file) {
      fs.readFile(file, 'utf-8', (err, data) => {
        if (err) {
          alert(i18n.__("An error ocurred reading the file :") + err.message);
          return;
        }
        let el;
        switch (path.extname(file)) {
          case ".md":
          case ".mkd":
          case ".markdown":
            parseMarkdown(file);
            break;
          case ".html":
          case ".htm":
            let parser = new DOMParser();
            el = parser.parseFromString(data, "text/html");
            parseProjection(el, file);
            break;
          case ".zip":
            let destinationPath = app.getPath('userData');
            let unzipper = new DecompressZip(file);

            // Add the error event listener
            unzipper.on('error', function(err) {
              console.log(i18n.__('Unzip with decompress-zip failed'), err);
            });

            // Notify when everything is extracted
            unzipper.on('extract', function(log) {
              subfile = path.resolve(destinationPath, log[0].folder, 'impress.md');
              parseMarkdown(subfile);
            });

            // Start extraction of the content
            unzipper.extract({
              path: destinationPath
            });
            break;
          default:
            console.log(i18n.__("Something went wrong. Wrong file is loaded."));
        }
      });

    }

    function parseProjection(el, file) {
      /* We parse the impress presentation file into own template.
      It is to make sure the stylesheets are loaded in proper order
      and no additional javascript is loaded (such as custom impress.js).*/
      let css = "",
        printcss = "",
        extcss = "",
        styles;
      styles = el.getElementsByTagName("style");
      for (let i = 0; i < styles.length; i++) { // This loads inline stylesheets from html / css file
        if (styles[i].media == "print") {
          printcss += styles[i].innerHTML;
        } else {
          css += styles[i].innerHTML;
        }
      }

      if (fs.existsSync(path.dirname(file) + "/style.css")) { // This is the external stylesheet. We look for style.css placed in the same folder as the presentation file is.
        extcss = path.dirname(file) + "/style.css";
      }
      try {
        html = el.getElementById("impress").outerHTML; // Grab <div id="impress">...</div> and place it inside our template.
      } catch (err) {
        console.log("There is a problem with a file you selected");
        return;
      }
      let dataPath = path.dirname(file) + "/"; // Baseurl for the presentation (for relative links to work inside presentation)
      let impressPath = path.resolve(__dirname, "impress.js"); // We load impress.js separately (with absolute path)
      let viewerPath = path.resolve(__dirname, "viewer-script.js"); // This is the script for impressPlayer console to work.

      viewerDOM.getElementById("baseTag").setAttribute("href", dataPath);
      viewerDOM.getElementById("container").innerHTML = html;
      viewerDOM.getElementById("defaultStyleBox").innerHTML = css;
      viewerDOM.getElementById("printStyleBox").innerHTML = printcss;
      viewerDOM.getElementById("projectionStyleLink").setAttribute('href', extcss);
      viewerDOM.getElementById("impressScript").setAttribute('src', impressPath);
      viewerDOM.getElementById("bottomScript").innerHTML = "impress().init(); require(" + JSON.stringify(viewerPath) + ");";

      loadProjection(); // Finally put it all into the template and loadProjection. I am considering migration of this function to mustache. It is probably much faster.

    }

    function saveViewer() {
      let serializer = new XMLSerializer();
      fs.writeFile(path.resolve(app.getPath('userData'), './viewer.html'), serializer.serializeToString(viewerDOM), (err) => {

        if (err) throw err;
        ipc.send('loadProjection');
        webview0.reload();
        webview1.reload();
        webview2.reload();
      });
    }

    function loadProjection() {
      saveViewer();
      showTimer('projection');
      totalSeconds = 0;
      document.getElementById("projectionTimer").addEventListener("click", function() { totalSeconds = 0; });
      running = true;
      document.body.classList.add('running');
      mousetrap.bind(['space'], function() {
        webview0.send('nextSlide');
      });
      mousetrap.bind(['ctrl+backspace'], function() {
        webview0.send('prevSlide');
      });
      if (debugMode) {
        webview0.openDevTools();
        webview0.addEventListener('console-message', (e) => {
          console.log('Guest page logged a message:', e.message);
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
            <x-card id='{{step}}' class='grid-item {{isCurrent}}'><span>{{stepName}}<span></x-card>
          {{/slides}}
        </div>
      `;
      let rendered = ms.render(tplSlideList, {
        "slides": slideList,
        "isCurrent": function() { if (this.step == current) { return "current"; } else { return "future"; } }
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
          //renderNextSlide(event.args[1]);
          displaySlideList(event.args[1]);
          break;
        case 'multimedia':
          let mediaControls = document.getElementById("audiovideoControls");
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
          let playPauseMediaBtn = document.getElementById("playPauseMediaBtn"),
            icon = playPauseMediaBtn.getElementsByTagName("x-icon")[0];
          switch (event.args[0]) {
            case 'on':
              icon.setAttribute("name", "pause");
              break;
            case 'off':
              icon.setAttribute("name", "play-arrow");
              break;
          }
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
          console.log(i18n.__("There is something new coming from impress.js."));
      }
    });

    document.getElementById("prevSlideBtn").addEventListener("click", function() {
      webview0.send('prevSlide');
    }, false);

    document.getElementById("nextSlideBtn").addEventListener("click", function() {
      webview0.send('nextSlide');
    }, false);

    document.getElementById("reloadBtn").addEventListener("click", function() {
      ipc.send('reloadWindows');
    }, false);


    document.getElementById("playPauseMediaBtn").addEventListener("click", function() {
      webview0.send('audioVideoControls', 'playPause');
      ipc.send('audioVideoControls', 'playPause');
    }, false);

    document.getElementById("restartMediaBtn").addEventListener("click", function() {
      webview0.send('audioVideoControls', 'restart');
      ipc.send('audioVideoControls', 'restart');
    }, false);


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
