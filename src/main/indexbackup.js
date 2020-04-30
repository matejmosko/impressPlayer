'use strict'

import {
  app,
  BrowserWindow,
  Menu
} from 'electron';
import * as path from 'path';
import {
  format as formatUrl
} from 'url';

const isDevelopment = process.env.NODE_ENV !== 'production';

// global reference to controllerWindow (necessary to prevent window from being garbage collected)
let controllerWindow,
  projectorWindow;


function createControllerWindow() {
  const window = new BrowserWindow({
    icon: path.resolve(__dirname, 'img/icon.png'),
    title: 'impressPlayer Controller',
    show: false,
    backgroundColor: '#13132A',
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true
    }
  })

  if (isDevelopment) {
    window.webContents.openDevTools()
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`)
  } else {
    window.loadURL(formatUrl({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true
    }))
  }

  let menu = Menu.buildFromTemplate([{
      label: 'Presentation',
      submenu: [{
          label: 'Load Presentation',
          click() {
            window.webContents.send('selectFile');
          }
        },
        {
          label: 'Refresh Presentation',
          click() {
            window.webContents.send('refreshFile');
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          click() {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'System',
      submenu: [{
          label: 'Restart Application',
          click() {
            reloadApp();
          }
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click() {
            window.toggleDevTools();
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Help',
          click() {
            showHelp();
          }
        }
      ]
    }
  ]);

  window.setMenu(menu);

  window.on('closed', () => {
    controllerWindow = null
  })

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
  })

  return window
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (controllerWindow === null) {
    controllerWindow = createControllerWindow()
  }
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  controllerWindow = createControllerWindow()
})
