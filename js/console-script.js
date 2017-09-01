// Mixing jQuery and Node.js code in the same file? Yes please!

$(function() {
  var impConsole = (function() {
    const path = require('path');
    const url = require('url');
    const fs = require('fs');
    const ms = require('mustache');
    const markpress = require('markpress');
    const webview1 = document.querySelector('#nextImpress-1'),
      webview2 = document.querySelector('#nextImpress-2'),
      webview0 = document.querySelector('#impressCurrent');
    const {
      dialog
    } = require('electron').remote;
    const settings = require('electron').remote.require('electron-settings');
    let ipc = require('electron').ipcRenderer,
      slidesList = [],
      opts = {},
      running = false,
      exitDialog = document.querySelector("x-dialog"),
     totalSeconds = 0;
    setupSettings();

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
      dialog.showOpenDialog((fileNames) => {
        if (fileNames === undefined) {
          console.log("No file selected");
          return;
        }
        parseProjection(fileNames[0]);
      });
    });

    /* Main Software Part */

    function parseProjection(file) {
      fs.readFile(file, 'utf-8', (err, data) => {
        if (err) {
          alert("An error ocurred reading the file :" + err.message);
          return;
        }
        let css = "";

        if (path.extname(file) == ".md") {
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
            html = html.substr(15);
            var parser = new DOMParser();
            var el = parser.parseFromString(html, "text/html");

            var styles = el.getElementsByTagName("style");
            /*for (var i = 0; i < styles.length; i++) { // TODO Find better way to get rid of print.css
              css += styles[i].innerHTML;
            }*/
            let extcss = "";
            if (fs.existsSync(path.dirname(file) + "/style.css")) {
              extcss = path.dirname(file) + "/style.css";
            }
            css += styles[0].innerHTML;
            css += fs.readFileSync(extcss, 'utf8');
            html = el.getElementById("impress").outerHTML;
            loadProjection(html, css);
          });
        }

        if (path.extname(file) == ".html" || path.extname(file) == ".htm") {
          var parser = new DOMParser();
          var el = parser.parseFromString(data, "text/html");
          var styles = el.getElementsByTagName("style");

          css += styles[0].innerHTML;
          data = el.getElementById('impress');
          loadProjection(data.outerHTML, css);
        }
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


    function renderNextSlide(current) {
      ipc.send('projectionGoToSlide', current);
      webview0.send('gotoSlide', current);
      webview1.send('gotoSlide', getFutureSlides(current, 1));
      webview2.send('gotoSlide', getFutureSlides(current, 2));
      let x = slideList.find(x => x.step === current).stepName;
      document.getElementById("currentSlideName").innerHTML = x;
    }

    function loadProjection(data, css) {
      if (!running) {
        let impressPath = path.join(__dirname, "impress.js");
        ipc.send('loadProjection', impressPath, data, css, 'projektor');
        webview0.send('loadProjection', impressPath, data, css, 'current');
        webview1.send('loadProjection', impressPath, data, css, 'next1');
        webview2.send('loadProjection', impressPath, data, css, 'next2');
        webview0.setAudioMuted(true);
        webview1.setAudioMuted(true);
        webview2.setAudioMuted(true);

        //var timerVar = setInterval(countTimer, 1000);
        showTimer('projection');
        running = true;
        document.body.classList.add('running');
      }
    }

    function displaySlideList() {
      var tplSlideList = "<ul id='slideList'>{{#slides}}<li id='{{step}}'>{{stepName}}</li>{{/slides}}</ul>";
      var rendered = ms.render(tplSlideList, { slides: slideList });
      document.getElementById("impressOverview").innerHTML = rendered;
      $('ul#slideList li').click(function() {
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

    webview0.addEventListener('ipc-message', (event) => {
      switch (event.channel) {
        case 'gotoSlide':
          renderNextSlide(event.args[0]);
          break;
        case 'slideList':
          slideList = event.args[0];
          renderNextSlide(event.args[1]);
          displaySlideList();
          break;
        default:
          console.log("There is something new coming from impress.js.");
      }
    });

    $("#prevSlideBtn").click(function() {
      webview0.send('prevSlide');
    });
    $("#nextSlideBtn").click(function() {
      webview0.send('nextSlide');
    });
    ipc.on('gotoSlide', (event, next) => {

    });
    $("#reloadBtn").click(function() {
      ipc.send('reloadWindows');
    });
    /* Uncomment for debugging */
    /*
 webview1.addEventListener('console-message', (e) => {
  console.log('Guest page logged a message:', e.message)
 })
*/
        webview1.openDevTools();
  })();
});
