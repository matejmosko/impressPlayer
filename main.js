const electron = require('electron');
// Module to control application life.
const app = electron.app;
const {dialog} = require('electron');
//const fs = electron.remote.require('fs')
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

const { ipcMain } = require('electron');
const settings = require('electron-settings');

global.params = {};

var fs = require('fs');

ipcMain.on('toggleRules', (event) => {
  projektorWindow.webContents.send('transferRules');
})
ipcMain.on('toggleFullscreen', (event) => {
  if (projektorWindow.isFullScreen()) { projektorWindow.setFullScreen(false) } else projektorWindow.setFullScreen(true);
})
ipcMain.on('toggleProjector', (event) => {
  if (projektorWindow.isVisible()) {
    projektorWindow.hide();
    x = false;
    mainWindow.webContents.send('projectorSwitch', x);
  } else {
    projektorWindow.show();
    x = true;
    mainWindow.webContents.send('projectorSwitch', x);
  }
})

ipcMain.on('projectionGoToSlide', (event, arg) => {
  projektorWindow.webContents.send('gotoSlide', arg);
})
ipcMain.on('consoleGoToSlide', (event, arg) => {
  mainWindow.webContents.send('gotoSlide', arg);
})

ipcMain.on('loadProjection', (event, arg) => {
    projektorWindow.webContents.send('loadProjection', arg);     // Nefunguje dobre, keď už je raz inicializovaný impress.js. Treba zistiť, ako ho viem zabiť.
})

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let projektorWindow

// main process

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 800, height: 600, icon: path.join(__dirname, 'img/icon.png'), title: 'GOW Admin', backgroundColor: '#13132A' })

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'toolbox.html'),
    protocol: 'file:',
    slashes: true
  }))

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
    })
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
  })
  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}



function createProjektor() {
  // Create the browser window.
  projektorWindow = new BrowserWindow({ width: 640, height: 480, icon: path.join(__dirname, 'img/icon.png'), title: 'GOW', backgroundColor: '#13132A', show: false })

  // and load the index.html of the app.
  projektorWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'projector.html'),
    protocol: 'file:',
    slashes: true,
    fullscreenable: true
  }))

  // Open the DevTools.
  //    projektorWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  projektorWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    projektorWindow = null
  })
  projektorWindow.on('close', event => {
    event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
    projektorWindow.hide();
  })
  projektorWindow.webContents.on('did-finish-load', () => {

  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)
app.on('ready', createProjektor)
// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})



app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

var dir = './savegame';

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// Game Worlds scripts
app.on('ready', function() {
//dialog.showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']})
})
