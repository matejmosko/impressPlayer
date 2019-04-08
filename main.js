/* Initial settings */

const electron = require('electron');
/* Module to control application life. */
const app = electron.app;
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // Disable new security feature of chrome 66. Not working right now. Necesary for video.play

/* Module to create native browser window. */
const BrowserWindow = electron.BrowserWindow;
/* Modules to serve webcontents and modal dialogs */
const {
 webContents
} = require('electron');
/* IPC system to communicate between main and renderer processes */
const {
 ipcMain
} = require('electron');

/* Various necessary modules */
const path = require('path'); // System paths
const fs = require('fs'); // Access to filesystem
//const url = require('url'); // Access to web urls
const ms = require('mustache'); // We use Mustache to work with templates
const settings = require('electron-settings'); // Electron-settings stores application settings between sessions
const i18n = new(require('i18n-2'))({ // i18n helps with translations
 locales: ['en', 'sk'], // TODO This has to be enhanced after other translations are available.
 directory: path.resolve(__dirname, './locales'),
 extension: ".json"
});

let debugMode = false,
 userPath = app.getPath('userData');

process.argv.forEach(function(argv) {
 if (argv == "debug") {
  debugMode = true;
 }
});

/* GLOBAL VARIABLES that have to be accessible through whole application */
global.globalObject = {
 "i18n": i18n,
 "debugMode": debugMode
};

/* DEBUG mode settings */


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
}
catch (err) {
 // the file is there, but corrupt. Handle appropriately.
}

/* END Initial settings*/

/* START Real application */
function initializeWindows() {


 impWindows.controller = createControllerWindow();
 impWindows.projector = createProjectorWindow();

 // setup initial settings for Windows
 mustacheOptions = {
  "dirname": __dirname,
  "usrPath": app.getPath('userData'),
  "appPath": app.getAppPath(),
  "jsPath": path.resolve(app.getAppPath(), "./js"),
  "controllerPath": JSON.stringify(path.resolve(app.getAppPath(), "./js/controller-script.js")),
  "projectorPath": JSON.stringify(path.resolve(app.getAppPath(), "./js/projector-script.js")),
  "i18n": function() { // This is a function that translates {{{i18n}}} strings found in templates.
   return function(text, render) {
    return render(i18n.__(text));
   };
  }
 }

 /* Render controller template (async) and create a window after that */
 fs.readFile(path.resolve(__dirname, './templates/controller.tpl'), 'utf8', (err, tplController) => { // Read controller.tpl (main controller interface) asynchronously
  if (err) throw err;
  let localeController = ms.render(tplController, mustacheOptions);
  fs.writeFile('./controller.html', localeController, (err) => {
   if (err) throw err;
   setupControllerWindow();
  });
 });


 /* Render projector template (async) and create a window after that */
 fs.readFile(path.resolve(__dirname, './templates/projector.tpl'), 'utf8', (err, tplProjector) => {
  let localeProjector = ms.render(tplProjector, mustacheOptions);
  if (err) throw err;
 impWindows.controller = createControllerWindow();
 impWindows.projector = createProjectorWindow();
  fs.writeFile('./projector.html', localeProjector, (err) => {
   if (err) throw err;
   setupProjectorWindow();
  });
 });

 /* Render a fake viewer.html to be used on first run */
 fs.readFile(path.resolve(__dirname, './templates/viewer-fake.tpl'), 'utf8', (err, tplViewerFake) => {
  localeViewerFake = ms.render(tplViewerFake, mustacheOptions);
  if (err) throw err;
  fs.writeFile(path.resolve(app.getPath('userData'), './viewer.html'), localeViewerFake, (err) => {
   if (err) throw err;
  });
 });

}

function storeWindowState(window) {
 /* Get saved dimensions of windows and set them up as current ones */
 switch (window) {
  case "controller":
   if (typeof(impWindows.controller) === "object") {
    if (typeof(windowState.controller) !== "object") {
     windowState.controller = {};
    }
    windowState.controller.isMaximized = impWindows.controller.isMaximized();
    if (!windowState.controller.isMaximized) {
     // only update bounds if the window isn't currently maximized
     windowState.controller.bounds = impWindows.controller.getBounds();
    }
   }
   break;
  case "projector":
   if (typeof(impWindows.projector) === "object") {
    if (typeof(windowState.projector) !== "object") {
     windowState.projector = {};
    }
    windowState.projector.isMaximized = impWindows.projector.isMaximized();
    if (!windowState.projector.isMaximized) {
     // only update bounds if the window isn't currently maximized
     windowState.projector.bounds = impWindows.projector.getBounds();
    }
   }
   break;
  default:

 }

 settings.set('windowstate', windowState);
 /* Save windows' dimmensions to electron settings */
};

function createControllerWindow() {
 /* Create a promised Controller Window and set it up after it's created */
 let controller = new BrowserWindow({ // Create the browser window.
  x: windowState.controller && windowState.controller.bounds && windowState.controller.bounds.x || undefined,
  y: windowState.controller && windowState.controller.bounds && windowState.controller.bounds.y || undefined,
  width: windowState.controller && windowState.controller.bounds && windowState.controller.bounds.width || 800,
  height: windowState.controller && windowState.controller.bounds && windowState.controller.bounds.height || 600,
  icon: path.resolve(__dirname, 'img/icon.png'),
  title: 'impressPlayer Controller',
  show: false,
  backgroundColor: '#13132A'
 });
 // and load the index.html of the app.
 return controller;
}

function setupControllerWindow() {
 /* Setup all necesary details on already created window */
 impWindows.controller.loadFile('./controller.html');

 if (typeof(windowState.controller) === "object" && windowState.controller.isMaximized) {
  impWindows.controller.maximize();
 }

 impWindows.controller.on('ready-to-show', function() {
  impWindows.controller.show();
  impWindows.controller.focus();
  impWindows.controller.on('resize', function() {
   impWindows.controller.webContents.send('windowResized');
   storeWindowState("controller");
  });
  impWindows.controller.on('move', function() {
   storeWindowState("controller");
  });
 });

 impWindows.controller.webContents.on('did-frame-finish-load', function() {
  //impWindows.controller.webContents.executeJavaScript(require(path.resolve(app.getAppPath(), "./js/controller-script.js")));
 });

 impWindows.controller.on('close', event => {
  event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
  impWindows.controller.webContents.send('quitModal');
  ipcMain.on('reallyQuit', (_event) => {
   storeWindowState("controller");
   app.exit();
  });
 });
 // Emitted when the window is closed.
 impWindows.controller.on('closed', function() {
  // Dereference the window object, usually you would store windows
  // in an array if your app supports multi windows, this is the time
  // when you should delete the corresponding element.
  impWindows.controller = null;
 });

 if (debugMode) {
  impWindows.controller.webContents.openDevTools()
 }
}

function createProjectorWindow() {
 /* Create a promised Projector Window and set it up after it's created */

 let projector = new BrowserWindow({
  x: windowState.projector && windowState.projector.bounds && windowState.projector.bounds.x || undefined,
  y: windowState.projector && windowState.projector.bounds && windowState.projector.bounds.y || undefined,
  width: windowState.projector && windowState.projector.bounds && windowState.projector.bounds.width || 800,
  height: windowState.projector && windowState.projector.bounds && windowState.projector.bounds.height || 600,
  icon: path.resolve(__dirname, 'img/icon.png'),
  title: 'impressPlayer Controller',
  backgroundColor: '#13132A',
  show: false
 });
 return projector;
}

function setupProjectorWindow() {
 /* Setup all necesary details on already created window */
 impWindows.projector.loadFile('./projector.html');
 // Emitted when the window is closed.
 impWindows.projector.on('closed', function() {
  // Dereference the window object on exit
  impWindows.projector = null;
 });
 // Window positioning and size
 impWindows.projector.on('resize', () => {
  storeWindowState("projector");
 });
 impWindows.projector.on('move', function() {
  storeWindowState("projector");
 });

 if (typeof(windowState.projector) === "object" && windowState.projector.isMaximized) {
  impWindows.projector.maximize();
 }

 ipcMain.on('toggleFullscreen', (_event) => {
  if (impWindows.projector.isFullScreen()) {
   impWindows.projector.setFullScreen(false);
  }
  else {
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
 impWindows.projector.on('hide', _event => {
  impWindows.controller.webContents.send('buttonSwitch', "projectorBtn", false);
  impWindows.controller.webContents.send('buttonSwitch', "fullscreenBtn", false);
 });

 impWindows.projector.on('show', _event => {
  impWindows.controller.webContents.send('buttonSwitch', "projectorBtn", true);
 });

 impWindows.projector.on('close', event => {
  event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
  impWindows.projector.hide();
 });
 impWindows.projector.on('leave-full-screen', () => {
  impWindows.controller.webContents.send('buttonSwitch', "fullscreenBtn", false);
 });
 impWindows.projector.on('enter-full-screen', () => {
  impWindows.controller.webContents.send('buttonSwitch', "fullscreenBtn", true);
  impWindows.controller.webContents.send('buttonSwitch', "projectorBtn", true);
 });

 ipcMain.on('toggleProjector', (_event) => {
  if (impWindows.projector.isVisible()) {
   impWindows.projector.hide();
  }
  else {
   impWindows.projector.show();

  }
 });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

function renderApplication() {
 initializeWindows();
 setupProjectorButtons();
}

app.on('ready', function() {
 renderApplication();
});

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
 if (impWindows.controller === null) {
  createControllerWindow();
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
 var file = fs.openSync(app.getPath('userData') + "log-" + currentDate() + ".log", 'a');
 fs.writeFile(file, text, function(err) {
  if (err) {
   return console.log(err);
  }
  console.log("The log was saved!");
 });
}

/* Event listeners and IPC listeners */

ipcMain.on('saveLogs', (_event, text) => {
 createLog(text);
});

ipcMain.on('toggleRules', (_event) => {
 impWindows.projector.webContents.send('transferRules');
});

ipcMain.on('projectionGoToSlide', (_event, arg) => {
 impWindows.projector.webContents.send('gotoSlide', arg);
});

ipcMain.on('controllerGoToSlide', (_event, arg) => {
 impWindows.controller.webContents.send('gotoSlide', arg);
});

ipcMain.on('loadProjection', (_event) => {
 impWindows.projector.webContents.send('loadProjection');
});

ipcMain.on('audioVideoControls', (_event, command, data) => {
 impWindows.projector.webContents.send('audioVideoControls', command, data);
});

ipcMain.on('reloadWindows', (_event) => {
 fs.writeFile('viewer.html', localeViewerFake, (err) => {
  if (err) throw err;
  impWindows.projector.webContents.reload();
  impWindows.controller.webContents.reload();
 });
});
