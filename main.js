/* Initial settings */

const electron = require('electron');
/* Module to control application life. */
const app = electron.app;
/* Module to create native browser window. */
const BrowserWindow = electron.BrowserWindow;
/* Modules to serve webcontents and modal dialogs */
const {
  dialog,
  webContents
} = require('electron');
/* IPC system to communicate between main and renderer processes */
const {
  ipcMain
} = require('electron');

/* Various necessary modules */
const path = require('path'); // System paths
const fs = require('fs'); // Access to filesystem
const url = require('url'); // Access to web urls
const ms = require('mustache'); // We use Mustache to work with templates
const settings = require('electron-settings'); // Electron-settings stores application settings between sessions
const i18n = new(require('i18n-2'))({ // i18n helps with translations
  locales: ['en', 'sk'], // TODO This has to be enhanced after other translations are available.
  directory: path.resolve(__dirname, './locales'),
  extension: ".json"
});

/* GLOBAL VARIABLES that have to be accessible through whole application */
global.globalObject = {
  "i18n": i18n,
  "arguments": process.argv,
};

/* DEBUG mode settings */
let debugMode = false;
if (arguments[0] == "debug") {
  debugMode = true;
}

/* Window management */
let impWindows = {}; // Keeps a global reference of the window object, if you don't, the window will be closed automatically when the JavaScript object is garbage collected.
let windowState = {}; // Keeps a global reference to window position and size.
let localeViewerFake = ""; // This a hack that helps us flush previously loaded presentation on app restart.


/* Get system languages and change the app's language accoridngly. If there is no such lang in locales, fallback (english) will be used. */
i18n.setLocaleFromEnvironmentVariable();

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

/* END Initial settings*/

/* START Real application */
function saveTemplates() {
  mustacheOptions = {
    "dirname": __dirname,
    "usrPath": app.getPath('userData'),
    "appPath": app.getAppPath(),
    "jsPath": path.resolve(app.getAppPath(), "./js"),
    "consolePath": JSON.stringify(path.resolve(app.getAppPath(), "./js/console-script.js")),
    "projectorPath": JSON.stringify(path.resolve(app.getAppPath(), "./js/projector-script.js")),
    "i18n": function() { // This is a function that translates {{{i18n}}} strings found in templates.
      return function(text, render) {
        return render(i18n.__(text));
      };
    }
  }
  fs.readFile(path.resolve(__dirname, './templates/viewer-fake.tpl'), 'utf8', (err, tplViewerFake) => {
    localeViewerFake = ms.render(tplViewerFake, mustacheOptions);
    fs.writeFile(path.resolve(app.getPath('userData'), './viewer.html'), localeViewerFake, (err) => {
      if (err) throw err;
    });
  });
  fs.readFile(path.resolve(__dirname, './templates/console.tpl'), 'utf8', (err, tplConsole) => { // Read console.tpl (main console interface) asynchronously
    if (err) throw err;
    let localeConsole = ms.render(tplConsole, mustacheOptions);
    fs.writeFile(path.resolve(app.getPath('userData'), './console.html'), localeConsole, (err) => {
      if (err) throw err;
    });
  });
  fs.readFile(path.resolve(__dirname, './templates/projector.tpl'), 'utf8', (err, tplProjector) => {
    let localeProjector = ms.render(tplProjector, mustacheOptions);
    fs.writeFile(path.resolve(app.getPath('userData'), './projector.html'), localeProjector, (err) => {
      if (err) throw err;
    });
  });
}

function storeWindowState() {
  if (typeof(impWindows.main) === "object") {
    if (typeof(windowState.main) !== "object"){
      windowState.main = {};
    }
    windowState.main.isMaximized = impWindows.main.isMaximized();
    if (!windowState.main.isMaximized) {
      // only update bounds if the window isn't currently maximized
      windowState.main.bounds = impWindows.main.getBounds();
    }
  }
  if (typeof(impWindows.projector) === "object") {
    if (typeof(windowState.projector) !== "object"){
      windowState.projector = {};
    }
    windowState.projector.isMaximized = impWindows.projector.isMaximized();
    if (!windowState.projector.isMaximized) {
      // only update bounds if the window isn't currently maximized
      windowState.projector.bounds = impWindows.projector.getBounds();
    }
  }

  settings.set('windowstate', windowState);
};

// main process

function createWindow() {
  // Create the browser window.
  impWindows.main = new BrowserWindow({
    x: windowState.main && windowState.main.bounds && windowState.main.bounds.x || undefined,
    y: windowState.main && windowState.main.bounds && windowState.main.bounds.y || undefined,
    width: windowState.main && windowState.main.bounds && windowState.main.bounds.width || 800,
    height: windowState.main && windowState.main.bounds && windowState.main.bounds.height || 600,
    icon: path.resolve(__dirname, 'img/icon.png'),
    title: 'impressPlayer Console',
    show: false,
    backgroundColor: '#13132A'
  });

  if (typeof(windowState.main) === "object" && windowState.main.isMaximized) {
    impWindows.main.maximize();
  }

  // and load the index.html of the app.
  impWindows.main.loadURL(url.format({
    pathname: path.resolve(app.getPath('userData'), './console.html'),
    protocol: 'file:',
    slashes: true
  }));

  impWindows.main.on('ready-to-show', function() {
    impWindows.main.show();
    impWindows.main.focus();
    impWindows.main.on('resize', function() {
      storeWindowState();
    });
    impWindows.main.on('move', function() {
      storeWindowState();
    });
  });

  impWindows.main.webContents.on('did-frame-finish-load', function() {
    //impWindows.main.webContents.executeJavaScript(require(path.resolve(app.getAppPath(), "./js/console-script.js")));
  });

  impWindows.main.on('close', event => {
    event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
    impWindows.main.webContents.send('quitModal');
    ipcMain.on('reallyQuit', (event) => {
      storeWindowState();
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

  if (debugMode) {
    impWindows.main.webContents.openDevTools()
  }
}



function createProjector() {
  // Create the browser window.
  impWindows.projector = new BrowserWindow({
    x: windowState.projector && windowState.projector.bounds && windowState.projector.bounds.x || undefined,
    y: windowState.projector && windowState.projector.bounds && windowState.projector.bounds.y || undefined,
    width: windowState.projector && windowState.projector.bounds && windowState.projector.bounds.width || 800,
    height: windowState.projector && windowState.projector.bounds && windowState.projector.bounds.height || 600,
    icon: path.resolve(__dirname, 'img/icon.png'),
    title: 'impressPlayer Console',
    backgroundColor: '#13132A',
    show: false
  });

  // and load the index.html of the app.
  impWindows.projector.loadURL(url.format({
    pathname: path.resolve(app.getPath('userData'), './projector.html'),
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
  // Window positioning and size
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

  if (typeof(windowState.projector) === "object" && windowState.projector.isMaximized) {
    impWindows.projector.maximize();
  }

  ipcMain.on('toggleFullscreen', (event) => {
    if (impWindows.projector.isFullScreen()) {
      impWindows.projector.setFullScreen(false);
    } else {
      impWindows.projector.setFullScreen(true);
    }
  });

  impWindows.projector.webContents.on('did-finish-load', () => {
    impWindows.projector.hide();
  });
  if (debugMode) {
    impWindows.projector.webContents.openDevTools()
  }
}

function setupProjectorButtons() {
  // Button events
  impWindows.projector.on('hide', event => {
    impWindows.main.webContents.send('buttonSwitch', "projectorBtn", false);
    impWindows.main.webContents.send('buttonSwitch', "fullscreenBtn", false);
  });

  impWindows.projector.on('show', event => {
    impWindows.main.webContents.send('buttonSwitch', "projectorBtn", true);
  });

  impWindows.projector.on('close', event => {
    event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
    impWindows.projector.hide();
  });
  impWindows.projector.on('leave-full-screen', () => {
    impWindows.main.webContents.send('buttonSwitch', "fullscreenBtn", false);
  });
  impWindows.projector.on('enter-full-screen', () => {
    impWindows.main.webContents.send('buttonSwitch', "fullscreenBtn", true);
    impWindows.main.webContents.send('buttonSwitch', "projectorBtn", true);
  });

  ipcMain.on('toggleProjector', (event) => {
    if (impWindows.projector.isVisible()) {
      impWindows.projector.hide();
    } else {
      impWindows.projector.show();

    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
  saveTemplates();
  createWindow();
  createProjector();
  setupProjectorButtons();
});
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

/* Impress Player scripts */

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
/*
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
    impWindows.main.webContents.send('buttonSwitch', "projectorBtn", false);
  } else {
    impWindows.projector.show();
    impWindows.main.webContents.send('buttonSwitch', "projectorBtn", true);
  }
});*/

ipcMain.on('projectionGoToSlide', (event, arg) => {
  impWindows.projector.webContents.send('gotoSlide', arg);
});

ipcMain.on('consoleGoToSlide', (event, arg) => {
  impWindows.main.webContents.send('gotoSlide', arg);
});

ipcMain.on('loadProjection', (event) => {
  impWindows.projector.webContents.send('loadProjection');
});

ipcMain.on('audioVideoControls', (event, arg) => {
  impWindows.projector.webContents.send('audioVideoControls', arg);
});

ipcMain.on('reloadWindows', (event) => {
  fs.writeFile('viewer.html', localeViewerFake, (err) => {
    if (err) throw err;
    impWindows.projector.webContents.reload();
    impWindows.main.webContents.reload();
  });
});
