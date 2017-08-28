const electron = require('electron');
// Module to control application life.
const app = electron.app;
const {
 dialog, webContents
} = require('electron');
//const fs = electron.remote.require('fs')
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

const {
 ipcMain
} = require('electron');
const settings = require('electron-settings');

console.log(app.getPath('userData'));

var fs = require('fs');

ipcMain.on('toggleRules', (event) => {
 projektorWindow.webContents.send('transferRules');
});
ipcMain.on('toggleFullscreen', (event) => {
 if (projektorWindow.isFullScreen()) {
  projektorWindow.setFullScreen(false);
 }
 else {
  projektorWindow.setFullScreen(true);
 }
});
ipcMain.on('toggleProjector', (event) => {
 if (projektorWindow.isVisible()) {
  projektorWindow.hide();
  mainWindow.webContents.send('buttonSwitch', "#projectorBtn", false);
 }
 else {
  projektorWindow.show();
  mainWindow.webContents.send('buttonSwitch', "#projectorBtn", true);
 }
});

ipcMain.on('projectionGoToSlide', (event, arg) => {
 projektorWindow.webContents.send('gotoSlide', arg);
});
ipcMain.on('consoleGoToSlide', (event, arg) => {
 mainWindow.webContents.send('gotoSlide', arg);
});

ipcMain.on('loadProjection', (event, arg1, arg2) => {
 projektorWindow.webContents.send('loadProjection', arg1, arg2); // Nefunguje dobre, keď už je raz inicializovaný impress.js. Treba zistiť, ako ho viem zabiť.
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let projektorWindow;

// main process

function createWindow() {
 // Create the browser window.
 mainWindow = new BrowserWindow({
  width: 800,
  height: 600,
  icon: path.join(__dirname, 'img/icon.png'),
  title: 'GOW Admin',
  backgroundColor: '#13132A'
});

 // and load the index.html of the app.
 mainWindow.loadURL(url.format({
  pathname: path.join(__dirname, 'console.html'),
  protocol: 'file:',
  slashes: true
}));

 // Open the DevTools.
 //  mainWindow.webContents.openDevTools()

 mainWindow.on('close', event => {
  event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
  mainWindow.webContents.send('quitModal');
  /* DEPRECATED BY USING XEL MODALS
  let child = new BrowserWindow({parent: mainWindow, modal: true, resizable: false, width: 440, height: 180, show: false})
  child.loadURL(url.format({
      pathname: path.join(__dirname, 'quit.html'),
      protocol: 'file:',
      slashes: true
  }))*/
  ipcMain.on('reallyQuit', (event) => {
   app.exit();
 });
  /* DEPRECATED BY USING XEL MODALS
      ipcMain.on('doNotQuit', (event) => {
        child.hide();
      })
      child.on('closed', function() {
          child.hide();
      })
      child.once('ready-to-show', () => {
      child.show()
})
*/
  //app.exit();
});
 // Emitted when the window is closed.
 mainWindow.on('closed', function() {
  // Dereference the window object, usually you would store windows
  // in an array if your app supports multi windows, this is the time
  // when you should delete the corresponding element.
  mainWindow = null;
});
}



function createProjektor() {
 // Create the browser window.
 projektorWindow = new BrowserWindow({
  width: 640,
  height: 480,
  icon: path.join(__dirname, 'img/icon.png'),
  title: 'GOW',
  backgroundColor: '#13132A',
  show: false
});

 // and load the index.html of the app.
 projektorWindow.loadURL(url.format({
  pathname: path.join(__dirname, 'projector.html'),
  protocol: 'file:',
  slashes: true,
  fullscreenable: true
}));

 // Open the DevTools.
 //    projektorWindow.webContents.openDevTools()

 // Emitted when the window is closed.
 projektorWindow.on('closed', function() {
  // Dereference the window object, usually you would store windows
  // in an array if your app supports multi windows, this is the time
  // when you should delete the corresponding element.
  projektorWindow = null;
});
 projektorWindow.on('close', event => {
  event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
  mainWindow.webContents.send('buttonSwitch', "#projectorBtn", false);
  mainWindow.webContents.send('buttonSwitch', "#fullscreenBtn", false);
  projektorWindow.hide();
});
 projektorWindow.on('leave-full-screen', () => {
   mainWindow.webContents.send('buttonSwitch', "#fullscreenBtn", false);
 });
 projektorWindow.on('enter-full-screen', () => {
   mainWindow.webContents.send('buttonSwitch', "#fullscreenBtn", true);
 });
 projektorWindow.webContents.on('did-finish-load', () => {

 });
 projektorWindow.on('resize', () => {
   const [width, height] = projektorWindow.getContentSize();
   for (let wc of webContents.getAllWebContents()) {
     // Check if `wc` belongs to a webview in the `win` window.
     if (wc.hostWebContents &&
         wc.hostWebContents.id === projektorWindow.webContents.id) {
       wc.setSize({
         normal: {
           width: width,
           height: height
         }
       });
     }
   }
 });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);
app.on('ready', createProjektor);
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
 if (mainWindow === null) {
  createWindow();
 }
});

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
 var file = fs.openSync(app.gatPath('userData') + "log-" + currentDate() +".log", 'a');
 fs.writeFile(file, text, function(err) {
  if (err) {
   return console.log(err);
  }
  console.log("The log was saved!");
 });
}

ipcMain.on('saveLogs', (event, text) => {
 createLog(text);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// Game Worlds scripts
app.on('ready', function() {
 //dialog.showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']})
});
