const electron = require('electron');
// Module to control application life.
const app = electron.app;
const {
  dialog,
  webContents
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

const fs = require('fs');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let impWindows = {};
let windowState = {};

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

  // Open the DevTools.
  //  impWindows.main.webContents.openDevTools()

  impWindows.main.on('close', event => {
    storeWindowState();
    event.preventDefault(); //this prevents it from closing. The `closed` event will not fire now
    impWindows.main.webContents.send('quitModal');
    /* DEPRECATED BY USING XEL MODALS
    let child = new BrowserWindow({parent: impWindows.main, modal: true, resizable: false, width: 440, height: 180, show: false})
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

  // Open the DevTools.
  //    impWindows.projector.webContents.openDevTools()

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
app.on('ready', createWindow);
app.on('ready', createProjector);
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

ipcMain.on('saveLogs', (event, text) => {
  createLog(text);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// Game Worlds scripts
app.on('ready', function() {
  //dialog.showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']})
});

/* Event listeners and IPC listeners */

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

ipcMain.on('loadProjection', (event, arg1, arg2, arg3, arg4) => {
  impWindows.projector.webContents.send('loadProjection', arg1, arg2, arg3, arg4); // Nefunguje dobre, keď už je raz inicializovaný impress.js. Treba zistiť, ako ho viem zabiť.
});
ipcMain.on('reloadWindows', (event) => {
  impWindows.projector.webContents.reload();
  impWindows.main.webContents.reload();
});
