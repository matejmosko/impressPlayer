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

    let viewerHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <base id="baseTag" href=".">
        <title>impViewer</title>
        <style id="defaultStyleBox"></style>
        <link id="projectionStyleLink" rel="stylesheet" type="text/css" href="style.css">
        <style id="printStyleBox" media="print"></style>
      </head>
      <body class="impress-not-supported">
        <div id="container">
          <div id="impress"></div>
        </div>
      </body>
      <script id="impressScript" src="."></script>
      <script id="bottomScript">
      </script>
    </html>
    `,
      parser = new DOMParser(),
      viewerDOM = parser.parseFromString(viewerHTML, "text/html");



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
            //html = html.substr(15);
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
            //css += fs.readFileSync(extcss, 'utf8');
            html = el.getElementById("impress").outerHTML;

            let dataPath = path.dirname(file) + "/";
            let impressPath = path.join(__dirname, "impress.js");
            let viewerPath = path.join(__dirname, "viewer-script.js");

            viewerDOM.getElementById("baseTag").setAttribute("href", dataPath);
            viewerDOM.getElementById("container").innerHTML = html;
            viewerDOM.getElementById("defaultStyleBox").innerHTML = css;
            viewerDOM.getElementById("projectionStyleLink").setAttribute('href', extcss);
            viewerDOM.getElementById("impressScript").setAttribute('src', impressPath);
            viewerDOM.getElementById("bottomScript").innerHTML = "impress().init(); window.$ = window.jQuery = require('jquery'); require('" + viewerPath + "');";

            loadProjection();
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
      document.getElementById("projectionTimer").addEventListener("click", function(){totalSeconds = 0;});
      running = true;
      document.body.classList.add('running');
      webview0.setAudioMuted(true);
      webview1.setAudioMuted(true);
      webview2.setAudioMuted(true);
      /*

        ipc.send('loadProjection', impressPath, data, css, 'projektor');


        */
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
      displaySlideList(current);
    }

    function displaySlideList(current) {
      var tplSlideList = "<ul id='slideList'>{{#slides}}<li id='{{step}}' class='{{isCurrent}}'>{{stepName}}</li>{{/slides}}</ul>";
      var rendered = ms.render(tplSlideList, {
        "slides": slideList,
        "isCurrent": function() { if (this.step == current) { return "current"; } else { return "future"; } }
      });
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
          displaySlideList(event.args[1]);
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
    $("#reloadBtn").click(function() {
      ipc.send('reloadWindows');
    });

    /* Uncomment for debugging */
    /*
 webview1.addEventListener('console-message', (e) => {
  console.log('Guest page logged a message:', e.message)
 })
*/



  })();
});
