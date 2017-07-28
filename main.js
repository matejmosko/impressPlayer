const electron = require('electron');
// Module to control application life.
const app = electron.app;
//const fs = electron.remote.require('fs')
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

const { ipcMain } = require('electron');
const settings = require('electron-settings');

global.params = {};

var fs = require('fs');

ipcMain.on('transferCurrentGame', (event, arg1, arg2) => {
  projektorWindow.webContents.send('readCurrentGame', arg1, arg2);
})
ipcMain.on('transferNews', (event, arg) => {
  projektorWindow.webContents.send('readNews', arg);
})
ipcMain.on('transferPhase', (event, arg1, arg2, arg3) => {
  projektorWindow.webContents.send('readPhase', arg1, arg2, arg3);
})
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
    pathname: path.join(__dirname, 'index.html'),
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
    pathname: path.join(__dirname, 'thegame.html'),
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

//app.on('ready', defaultSettings);
ipcMain.on('saveDefaultSettings', (event) => {
  defaultSettings();
})

function defaultSettings() {
  settings.setAll({
    year: 0,
    phase: 0,
    longPause: 7,
    shortPause: 0.5,
    name: 'gow-settings',
    countryCount: 15,
    yearCount: 5,
    countryCodes: {
      'SVK': {country: 'Slovensko', playing: 0},
      'RUS': {country: 'Rusko', playing: 0},
      'USA': {country: 'USA', playing: 0},
      'JAR': {country: 'JAR', playing: 0},
      'AUS': {country: 'Austrália', playing: 0},
      'CHN': {country: 'Čína', playing: 0},
      'JPN': {country: 'Japonsko', playing: 0},
      'GBR': {country: 'Veľká Británia', playing: 0},
      'CAN': {country: 'Kanada', playing: 0},
      'BRA': {country: 'Brazília', playing: 0},
      'MEX': {country: 'Mexiko', playing: 0},
      'IND': {country: 'India', playing: 0},
      'IRN': {country: 'Irán', playing: 0},
      'VEN': {country: 'Venezuela', playing: 0},
      'FRA': {country: 'Francúzsko', playing: 0}
    },
    countryList: [
      'SVK',
      'RUS',
      'USA',
      'JAR',
      'AUS',
      'CHN',
      'JPN',
      'GBR',
      'CAN',
      'BRA',
      'MEX',
      'IND',
      'IRN',
      'VEN',
      'FRA'
    ],
    phases: [{
      title: 'Pomoc štvrtému svetu',
      text: 'Nastal čas splniť svoje sľuby a pomocť krajinám, ktoré vašu pomoc potrebujú.'
    }, {
      title: 'Správy zo sveta',
      text: 'Usaďte sa pri svojich domovských stoloch a vypočujte si, čo o vašich vládach hovoria zmanipulované médiá.'
    }, {
      title: 'Čas na strategické rozhodnutia',
      text: 'Teraz sa môžu generáli, diplomati a prezidenti dohodnúť na ďalšej stratégii. Využite tento čas dobre.'
    }, {
      title: 'Rozkladanie armád',
      text: 'Generáli, presuňte sa k strategickej mape, budete rozkladať svoje armády.'
    }, {
      title: 'Diplomacia',
      text: 'Je čas vyjednávať s ostatnými krajinami a ukladať na mapu akčné karty.'
    }, {
      title: 'Vyhodnotenie bojov',
      text: 'Generáli, presuňte sa naspäť k strategickej mape. Teraz sa rozhodne o budúcnosti sveta.'
    }, {
      title: 'Pauza',
      text: 'Vypočujte si, čo o svojej vláde píšu v zapredaných médiách, dohodnite sa na ďalšej stratégii a užite si pauzu.'
    }],
    ufoEvents: [{
      title: 'Vpád mimozemšťanov',
      text: 'Nad niektorými územiami sa objavili mimozemské taniere a pustošia ľudské obydlia.',
      secret: 'Objavili sa mimozemské lode a drancujú tieto územia: Ekvádor / Etiópia / Mongolsko. Na každom území je 5 ich armády a 2 mimozemské AK'
    }, {
      title: 'Mimozemská základňa',
      text: 'Tajný agent v službách jej veličenstva odhalil v Poľsku základňu mimozemšťanov. Rolex uviedol na trh novú kolekciu náramkových hodiniek.',
      secret: 'V Poľsku sa objavila základňa mimozemšťanov. Je tam 24 mimozemských armád a 6 mimozemských AK.'
    }, {
      title: 'Pád UFO a Mimozemské útoky',
      text: 'V Egypte sa zrútilo mimozemské UFO. Podľa zaručených zdrojov túto haváriu spôsobili Chemtrails. Mimozemšťania menia taktiku a útočia priamo na armády jednotlivých krajín.',
      secret: 'V Egypte budú k dispozícii 4 mimozemské AK. Kto (tím alebo aliancia) tam dá najviac armád získa tie karty (+ hodnota AK)'
    }, {
      title: 'Vpád mimozemšťanov',
      text: 'Nad niektorými trvalými územiami sa objavili mimozemské taniere a pustošia ľudské obydlia.',
      secret: 'Objavili sa mimozemské lode a drancujú tieto trvalé územia: Aljaška / Madagaskar / Pakistan. Na každom území je 10 ich armády a 2 mimozemské AK'
    }, {
      title: 'Zem je plochá',
      text: 'Vďaka tajným technológiám mimozemšťanov sa podarilo zistiť, že Zem je vlastné plochá. Už sa necestuje po trojuholníkoch, cestuje sa zdarma.',
      secret: 'Cestovanie medzi kontinentmi je zdarma.'
    }],
    worldEvents: [{
      title: 'Kongres OSN',
      text: 'V ponuke sú 3 AK typu Gastráče',
      secret: ''
    }, {
      title: 'Únik plánov stíhačky ALT-F4',
      text: 'V hlavnej udalosti je možné získať 4 žetóny armády',
      secret: ''
    }, {
      title: 'Nové ložiská za Uralom',
      text: 'V hlavnej udalosti je možné získať 8 ks kovu',
      secret: ''
    }, {
      title: 'Výpredaje na svetových trhoch',
      text: 'V hlavnej udalosti je možné získať 8 náhodných AK',
      secret: ''
    }, {
      title: 'Olympijske hry',
      text: 'V hlavnej udalosti je možné získať 6 AK',
      secret: ''
    }]
  });
}
