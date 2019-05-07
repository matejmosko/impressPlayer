const ipc = require('electron').ipcRenderer;
const BrowserWindow = require('electron').remote.BrowserWindow;
const fs = require('fs'); // Access to filesystem

const ms = require('mustache'); // We use Mustache to work with templates
const i18n = remote.getGlobal('globalObject').i18n;

let userPath = app.getPath('userData');

ipc.on('loadUI', (_event) => {
  console.log("Here we are");
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
  fs.readFile(path.resolve(__dirname, '../templates/controller.tpl'), 'utf8', (err, tplController) => { // Read controller.tpl (main controller interface) asynchronously
   if (err) throw err;
   let localeController = ms.render(tplController, mustacheOptions);
   fs.writeFile(userPath+'/controller.html', localeController, (err) => {
    if (err) throw err;
    ipc.send('uiReady', 'controller');
   });
  });

    /* Render projector template (async) and create a window after that */
    fs.readFile(path.resolve(__dirname, '../templates/projector.tpl'), 'utf8', (err, tplProjector) => {
      let localeProjector = ms.render(tplProjector, mustacheOptions);
      if (err) throw err;
      fs.writeFile(userPath + '/projector.html', localeProjector, (err) => {
        if (err) throw err;
        ipc.send('uiReady', 'projector');
      });
    });

    /* Render a fake viewer.html to be used on first run */
    fs.readFile(path.resolve(__dirname, '../templates/viewer-fake.tpl'), 'utf8', (err, tplViewerFake) => {
      localeViewerFake = ms.render(tplViewerFake, mustacheOptions);
      if (err) throw err;
      fs.writeFile(path.resolve(app.getPath('userData'), userPath + '/viewer.html'), localeViewerFake, (err) => {
        if (err) throw err;
      });
      fs.writeFile(path.resolve(app.getPath('userData'), userPath + '/previewer.html'), localeViewerFake, (err) => {
        if (err) throw err;
      });
    });
});
