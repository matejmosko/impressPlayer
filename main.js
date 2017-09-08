const electron = require('electron');
// Module to control application life.
const app = electron.app;
const {
  dialog,
  webContents
} = require('electron');
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const ms = require('mustache');


const {
  ipcMain
} = require('electron');
const settings = require('electron-settings');

const fs = require('fs');

const i18n = new(require('i18n-2'))({
  locales: ['en', 'sk']
});
global.i18n = i18n;
i18n.setLocaleFromEnvironmentVariable();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let impWindows = {};
let windowState = {};
let viewerFakeLocalized = "";

let tplConsole = `
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <title>impPlayer</title>
  <link rel="import" href="./node_modules/xel/xel.min.html">
  <link rel="stylesheet" href="./node_modules/xel/stylesheets/material.theme.css">
  <link rel="stylesheet" href="./css/styles-console.css">
  <link href="css/impress-admin.css" rel="stylesheet" />
</head>

<body>
  <div id="container">
    <div id="topbox">
      <x-card id="infobox">
        <x-buttons tracking="2" id="projectorControls">
          <x-button id="reloadBtn" class="danger">
            <x-icon name="power-settings-new"></x-icon>
          </x-button>
          <x-button id="projectorBtn">
            <x-icon name="airplay"></x-icon>
          </x-button>
          <x-button id="fullscreenBtn">
            <x-icon name="fullscreen"></x-icon>
          </x-button>
          <x-button id="rulesBtn">
            <x-icon name="assignment"></x-icon>
          </x-button>
        </x-buttons>
        <x-button id="openFile">{{#i18n}}Load Presentation{{/i18n}}</x-button>
        <x-buttons tracking="-1" id="gameControls" class="impressControlBtns">
          <x-button id="nextSlideBtn">
            <x-box>
              <x-icon name="skip-next"></x-icon>
              <x-label id="nextSlideLabel">{{#i18n}}Next Slide{{/i18n}}</x-label>
            </x-box>
          </x-button>
          <x-button id="prevSlideBtn" class="danger">
            <x-icon name="backspace"></x-icon>
          </x-button>
        </x-buttons>
      </x-card>


    </div>

    <div id="main">
      <div id="content">
        <div id="gameTables">

          <x-card id="contentCard">
            <x-tabs centered>
              <x-tab selected id="currentSlideTab">
                <x-box>
                  <x-icon name="list"></x-icon>
                  <x-label id="tabLabelCurrentSlide">{{#i18n}}Presentation{{/i18n}}</x-label>
                </x-box>
              </x-tab>

              <x-tab id="allSlidesTab">
                <x-box>
                  <x-icon name="sort"></x-icon>
                  <x-label id="tabLabelAllSlides">{{#i18n}}Slides List{{/i18n}}</x-label>
                </x-box>
              </x-tab>
              <x-tab id="teamsTableTab">
                <x-box>
                  <x-icon name="settings"></x-icon>
                  <x-label id="tabLabelRemoteSources">{{#i18n}}Remote Sources{{/i18n}}</x-label>
                </x-box>
              </x-tab>

              <x-tab id="optionsTab">
                <x-box>
                  <x-icon name="settings"></x-icon>
                  <x-label id="tabLabelSettings">{{#i18n}}Options{{/i18n}}</x-label>
                </x-box>
              </x-tab>
            </x-tabs>

            <div id="currentSlideDiv" class="content-table slidesPreview">
              <webview id="impressCurrent" autosize src="./viewer.html" style="display:flex;" nodeintegration></webview>
            </div>
            <div id="allSlidesDiv" class="content-table slidesPreview" style="display:none">
              <div id="impressOverview"></div>
            </div>
            <div id="teamsTableDiv" class="content-table" style="display:none">
              <webview id="drivePage" src="https://docs.google.com/spreadsheets/d/1jbzbHWI7JSi-hwx8cz1LE3TiI8RRRVj86UxyEc1iomo/edit?usp=drive_web" autosize style="display:flex;" nodeintegration></webview>
            </div>
            <div id="optionsDiv" class="content-table" style="display:none">
              Placeholder for options
            </div>
          </x-card>
        </div>
      </div>

      <div id="sidebar">
        <div id="sideCards">
          <x-card class="nextSlide nextSlide-1">
            <webview id="nextImpress-1" class="slidesPreview" src="./viewer.html" autosize style="display:flex;" nodeintegration></webview>
          </x-card>
          <x-card class="nextSlide nextSlide-2">
            <webview id="nextImpress-2" class="slidesPreview" src="./viewer.html" autosize style="display:flex;" nodeintegration></webview>
          </x-card>
          <x-card class="nextSlide sideInfo">
            <div id="bigTimer"><span id="projectionTimer">00:00:00</span></div>
            <div id="smallTimer"><span id="currentTime">00:00:00</span></div>
            <div id="currentSlideName"></div>
          </x-card>
        </div>
      </div>
    </div>
  </div>
  <x-dialog id="exitDialog">
    <h4 id="exitTitle">{{#i18n}}Are you sure about exiting impressPlayer?{{/i18n}}</h4>
    <p  id="exitText">{{#i18n}}Actually nothing bad could happen if you exit now, but still. <br />Do you really want to do it?{{/i18n}}</p>
    <x-buttons tracking="-1" id="windowControls">
      <x-button id="reallyQuit" class="danger">
        <x-box>
          <x-icon name="exit-to-app"></x-icon>
          <x-label  id="exitAgree">{{#i18n}}Yes, get me out of here!{{/i18n}}</x-label>
        </x-box>
      </x-button>
      <x-button id="doNotQuit">
        <x-box>
          <x-icon name="replay"></x-icon>
          <x-label  id="exitDisagree">{{#i18n}}No, I haven't finished yet{{/i18n}}</x-label>
        </x-box>
      </x-button>
    </x-buttons>
  </x-dialog>
  </body>
  <script>
    // You can also require other files to run in this process
    window.$ = window.jQuery = require('jquery');
    require('./renderer.js');
    require('./js/console-script.js');
    require('./js/impress.js');
  </script>

  </html>
`,
  tplViewerFake = `
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <title>Load Presentation</title>
  <style>
  body{font-family:sans-serif;background:#111;color:#DDD;padding:0px;margin:0px;height:100vh;overflow:hidden}
  #container{height: 100%;overflow:hidden;display:flex;justify-content: center; align-items: center;}
  #content{width:50vw;text-align:center}
  </style>
</head>

<body>
<div id="container"><div id="content">{{#i18n}}The presentation you load will be displayed here.{{/i18n}}</div></div>
</body>
</html>
`;

function saveTemplates() {
  let consoleLocalized = ms.render(tplConsole, {
    i18n: function() {
      return function(text, render) {
        return render(i18n.__(text));
      };
    }
  });
  viewerFakeLocalized = ms.render(tplViewerFake, {
    i18n: function() {
      return function(text, render) {
        return render(i18n.__(text));
      };
    }
  });
  fs.writeFile('viewer.html', viewerFakeLocalized, (err) => {
    if (err) throw err;
    fs.writeFile('console.html', consoleLocalized, (err) => {
      if (err) throw err;
      createWindow();
      createProjector();
    });
  });
}

try {
  windowState = settings.get('windowstate', {
    "main": {
      "bounds": {
        "x": 0,
        "y": 0,
        "width": 800,
        "height": 600
      },
      "isMaximized": false
    },
    "projector": {
      "bounds": {
        "x": 100,
        "y": 100,
        "width": 800,
        "height": 600
      },
      "isMaximized": false
    }
  });
} catch (err) {
  // the file is there, but corrupt. Handle appropriately.
}

let storeWindowState = function() {
  windowState.main.isMaximized = impWindows.main.isMaximized();
  windowState.projector.isMaximized = impWindows.projector.isMaximized();
  if (!windowState.main.isMaximized) {
    // only update bounds if the window isn't currently maximized
    windowState.main.bounds = impWindows.main.getBounds();
  }
  if (!windowState.projector.isMaximized) {
    // only update bounds if the window isn't currently maximized
    windowState.projector.bounds = impWindows.projector.getBounds();
  }
  settings.set('windowstate', windowState);
};

// main process

function createWindow() {
  // Create the browser window.
  impWindows.main = new BrowserWindow({
    x: windowState.main.bounds && windowState.main.bounds.x || undefined,
    y: windowState.main.bounds && windowState.main.bounds.y || undefined,
    width: windowState.main.bounds && windowState.main.bounds.width || 800,
    height: windowState.main.bounds && windowState.main.bounds.height || 600,
    icon: path.join(__dirname, 'img/icon.png'),
    title: 'imp Console',
    backgroundColor: '#13132A'
  });

  if (windowState.main.isMaximized) {
    impWindows.main.maximize();
  }

  // and load the index.html of the app.
  impWindows.main.loadURL(url.format({
    pathname: path.join(__dirname, 'console.html'),
    protocol: 'file:',
    slashes: true
  }));

  impWindows.main.on('close', event => {
    storeWindowState();
    event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
    impWindows.main.webContents.send('quitModal');

    ipcMain.on('reallyQuit', (event) => {
      app.exit();
    });
  });
  // Emitted when the window is closed.
  impWindows.main.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    impWindows.main = null;
  });
  impWindows.main.on('resize', function() {
    storeWindowState();
  });
  impWindows.main.on('move', function() {
    storeWindowState();
  });
}



function createProjector() {
  // Create the browser window.
  impWindows.projector = new BrowserWindow({
    x: windowState.projector.bounds && windowState.projector.bounds.x || undefined,
    y: windowState.projector.bounds && windowState.projector.bounds.y || undefined,
    width: windowState.projector.bounds && windowState.projector.bounds.width || 800,
    height: windowState.projector.bounds && windowState.projector.bounds.height || 600,
    icon: path.join(__dirname, 'img/icon.png'),
    title: 'imp Projector',
    backgroundColor: '#13132A',
    show: false
  });

  if (windowState.projector.isMaximized) {
    impWindows.projector.maximize();
  }

  // and load the index.html of the app.
  impWindows.projector.loadURL(url.format({
    pathname: path.join(__dirname, 'projector.html'),
    protocol: 'file:',
    slashes: true,
    fullscreenable: true
  }));

  // Emitted when the window is closed.
  impWindows.projector.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    impWindows.projector = null;
  });
  impWindows.projector.on('close', event => {
    event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
    impWindows.main.webContents.send('buttonSwitch', "#projectorBtn", false);
    impWindows.main.webContents.send('buttonSwitch', "#fullscreenBtn", false);
    impWindows.projector.hide();
  });
  impWindows.projector.on('leave-full-screen', () => {
    impWindows.main.webContents.send('buttonSwitch', "#fullscreenBtn", false);
  });
  impWindows.projector.on('enter-full-screen', () => {
    impWindows.main.webContents.send('buttonSwitch', "#fullscreenBtn", true);
  });
  impWindows.projector.webContents.on('did-finish-load', () => {

  });
  impWindows.projector.on('resize', () => {
    storeWindowState();
    const [width, height] = impWindows.projector.getContentSize();
    for (let wc of webContents.getAllWebContents()) {
      // Check if `wc` belongs to a webview in the `win` window.
      if (wc.hostWebContents &&
        wc.hostWebContents.id === impWindows.projector.webContents.id) {
        wc.setSize({
          normal: {
            width: width,
            height: height
          }
        });
      }
    }
  });
  impWindows.projector.on('move', function() {
    storeWindowState();
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', saveTemplates);
//app.on('ready', );

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});



app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (impWindows.main === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// Game Worlds scripts

var dir = './savegame';

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// Logs generating

function currentDate() {
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();

  if (dd < 10) {
    dd = '0' + dd;
  }

  if (mm < 10) {
    mm = '0' + mm;
  }

  today = yyyy + '-' + mm + '-' + dd;
  return today;
}

function createLog(text) {
  var file = fs.openSync(app.gatPath('userData') + "log-" + currentDate() + ".log", 'a');
  fs.writeFile(file, text, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log("The log was saved!");
  });
}

/* Event listeners and IPC listeners */

ipcMain.on('saveLogs', (event, text) => {
  createLog(text);
});

ipcMain.on('toggleRules', (event) => {
  impWindows.projector.webContents.send('transferRules');
});

ipcMain.on('toggleFullscreen', (event) => {
  if (impWindows.projector.isFullScreen()) {
    impWindows.projector.setFullScreen(false);
  } else {
    impWindows.projector.setFullScreen(true);
  }
});

ipcMain.on('toggleProjector', (event) => {
  if (impWindows.projector.isVisible()) {
    impWindows.projector.hide();
    impWindows.main.webContents.send('buttonSwitch', "#projectorBtn", false);
  } else {
    impWindows.projector.show();
    impWindows.main.webContents.send('buttonSwitch', "#projectorBtn", true);
  }
});

ipcMain.on('projectionGoToSlide', (event, arg) => {
  impWindows.projector.webContents.send('gotoSlide', arg);
});

ipcMain.on('consoleGoToSlide', (event, arg) => {
  impWindows.main.webContents.send('gotoSlide', arg);
});

ipcMain.on('loadProjection', (event) => {
  impWindows.projector.webContents.send('loadProjection');
});

ipcMain.on('reloadWindows', (event) => {
  fs.writeFile('viewer.html', viewerFakeLocalized, (err) => {
    if (err) throw err;
    impWindows.projector.webContents.reload();
    impWindows.main.webContents.reload();
  });
});
