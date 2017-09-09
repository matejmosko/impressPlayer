// Mixing jQuery and Node.js code in the same file? Yes please!

$(function() {
  var impConsole = (function() {
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

    const i18n = remote.getGlobal('i18n');

    const ipc = require('electron').ipcRenderer;
    let slidesList = [],
      opts = {},
      running = false,
      exitDialog = document.getElementById("exitDialog"),
      totalSeconds = 0;
    setupSettings();

    // Load impress-viewer template
    // TODO Move this to async function inside the part, where we generate viewer.html
    // TODO Move all tmp files (viewer.html, console.html) to userData.

    tplViewerHTML = fs.readFileSync(app.getAppPath() + '/templates/viewer.tpl', 'utf8');
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

    $("#currentSlideTab").click(function() { // Toggle between main view Tabs
      $('#currentSlideDiv').show();
      $('#allSlidesDiv').hide();
      $('#teamsTableDiv').hide();
      $('#optionsDiv').hide();
    });
    $("#allSlidesTab").click(function() {
      $('#currentSlideDiv').hide();
      $('#allSlidesDiv').show();
      $('#teamsTableDiv').hide();
      $('#optionsDiv').hide();
    });
    $("#teamsTableTab").click(function() {
      $('#currentSlideDiv').hide();
      $('#allSlidesDiv').hide();
      $('#teamsTableDiv').show();
      $('#optionsDiv').hide();
    });
    $("#optionsTab").click(function() {
      $('#currentSlideDiv').hide();
      $('#allSlidesDiv').hide();
      $('#teamsTableDiv').hide();
      $('#optionsDiv').show();
    });

    $("#fullscreenBtn").click(function() { // Toggle Projector Window fullscreen
      ipc.send('toggleFullscreen');
    });
    $("#rulesBtn").click(function() { // Toggle visibility of Rules div
      ipc.send('toggleRules');
    });

    $("#projectorBtn").click(function() { // Toggle visibility og Projector Window
      ipc.send('toggleProjector');
    });

    ipc.on('buttonSwitch', (event, btn, x) => { // Toggle "toggled" state of top buttons when non-click event change status
      if (x) {
        $(btn).prop("toggled", true);
      } else $(btn).prop("toggled", false);
    });

    ipc.on('quitModal', (event) => { // Show "Really Quit" dialog
      exitDialog.opened = true;
    });

    $("#reallyQuit").click(function() { // "Really Quit"  confirmed. We are leaving the ship.
      ipc.send('reallyQuit');
    });

    $("#doNotQuit").click(function() { // "Really Quit" refused. The show must go on...
      exitDialog.opened = false;
    });

    $("#openFile").click(function() {
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
        layout: 'horizontal',
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
        var parser = new DOMParser();
        var el = parser.parseFromString(html, "text/html");
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
            var parser = new DOMParser();
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
              subfile = path.join(destinationPath, log[0].folder, 'impress.md');
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
      for (var i = 0; i < styles.length; i++) { // This loads inline stylesheets from html / css file
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
      let impressPath = path.join(__dirname, "impress.js"); // We load impress.js separately (with absolute path)
      let viewerPath = path.join(__dirname, "viewer-script.js"); // This is the script for impressPlayer console to work.

      viewerDOM.getElementById("baseTag").setAttribute("href", dataPath);
      viewerDOM.getElementById("container").innerHTML = html;
      viewerDOM.getElementById("defaultStyleBox").innerHTML = css;
      viewerDOM.getElementById("printStyleBox").innerHTML = printcss;
      viewerDOM.getElementById("projectionStyleLink").setAttribute('href', extcss);
      viewerDOM.getElementById("impressScript").setAttribute('src', impressPath);
      viewerDOM.getElementById("bottomScript").innerHTML = "impress().init(); window.$ = window.jQuery = require('jquery'); require('" + viewerPath + "');";

      loadProjection(); // Finally put it all into the template and loadProjection.

    }

    function saveViewer() {
      let serializer = new XMLSerializer();
      fs.writeFile('viewer.html', serializer.serializeToString(viewerDOM), (err) => {

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
      let x = slideList.find(x => x.step === current).stepName;
      document.getElementById("currentSlideName").innerHTML = x;
      displaySlideList(current);
    }

    function displaySlideList(current) {
      var tplSlideList = `
        <div id='slideList' class="grid">
          {{#slides}}
            <div id='{{step}}' class='grid-item {{isCurrent}}'><span>{{stepName}}<span></div>
          {{/slides}}
        </ul>
      `;
      var rendered = ms.render(tplSlideList, {
        "slides": slideList,
        "isCurrent": function() { if (this.step == current) { return "current"; } else { return "future"; } }
      });
      document.getElementById("impressOverview").innerHTML = rendered;
      $('div#slideList .grid-item').click(function() {
        renderNextSlide($(this).attr("id"));
      });
    }

    function checkTime(i) {
      return (i < 10) ? "0" + i : i;
    }

    function showTimer(type) {
      switch (type) {
        case "current":
          var today = new Date(),
            h = checkTime(today.getHours()),
            m = checkTime(today.getMinutes()),
            s = checkTime(today.getSeconds());
          document.getElementById('currentTime').innerHTML = h + ":" + m + ":" + s;
          break;
        case "projection":
          ++totalSeconds;
          var hour = checkTime(Math.floor(totalSeconds / 3600));
          var minute = checkTime(Math.floor((totalSeconds - hour * 3600) / 60));
          var seconds = checkTime(totalSeconds - (hour * 3600 + minute * 60));

          document.getElementById("projectionTimer").innerHTML = hour + ":" + minute + ":" + seconds;


          break;
      }
      t = setTimeout(function() {
        showTimer(type);
      }, 1000);
    }

    showTimer('current');

    webview0.addEventListener('focus', function(e) {
      e.preventDefault();
    });

    webview0.addEventListener('ipc-message', (event) => {
      switch (event.channel) {
        case 'gotoSlide':
          renderNextSlide(event.args[0]);
          break;
        case 'slideList':
          slideList = event.args[0];
          renderNextSlide(event.args[1]);
          displaySlideList(event.args[1]);
          break;
        case 'multimedia':
          switch (event.args[0]) {
            case 'on':
              $('#audiovideoControls').show();
              break;
            case 'off':
              $('#audiovideoControls').hide();
              break;
          }
          break;
        case "audioVideoPlaying":
          switch (event.args[0]) {
            case 'on':
              // TODO Change icon
              break;
            case 'off':
              // TODO Change icon
              break;
          }
          break;
        default:
          console.log(i18n.__("There is something new coming from impress.js."));
      }
    });

    $("#prevSlideBtn").click(function() {
      webview0.send('prevSlide');
    });
    $("#nextSlideBtn").click(function() {
      webview0.send('nextSlide');
    });
    $("#reloadBtn").click(function() {
      ipc.send('reloadWindows');
    });
    $("#playPauseBtn").click(function() {
      webview0.send('audioVideoControls', 'playPause');
      ipc.send('audioVideoControls', 'playPause');
    });
    $("#reloadBtn").click(function() {
      webview0.send('audioVideoControls', 'reload');
      ipc.send('audioVideoControls', 'reload');
    });

    /* Uncomment for debugging */
    /*
 webview1.addEventListener('console-message', (e) => {
  console.log('Guest page logged a message:', e.message)
 })
*/
    webview0.openDevTools();

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

    document.addEventListener("keyup", function(event) {

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
    }, false);

  })();
});
