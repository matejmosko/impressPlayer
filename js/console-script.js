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

    let tplViewerHTML = `
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
    `;

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

      html = el.getElementById("impress").outerHTML; // Grab <div id="impress">...</div> and place it inside our template.

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
      webview0.setAudioMuted(true);
      webview1.setAudioMuted(true);
      webview2.setAudioMuted(true);
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

    /* Uncomment for debugging */
    /*
 webview1.addEventListener('console-message', (e) => {
  console.log('Guest page logged a message:', e.message)
 })
*/
//    webview1.openDevTools();

    window.addEventListener('keydown', function(e) {
      if (e.keyCode == 32 && e.target == document.body) {
        e.preventDefault();
      }
    });

  })();
});
