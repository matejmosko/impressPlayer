// Mixing jQuery and Node.js code in the same file? Yes please!

$(function() {
 const path = require('path');
 const url = require('url');
 const fs = require('fs');
 const webview1 = document.querySelector('#nextImpress-1'),
  webview2 = document.querySelector('#nextImpress-2'),
  webview0 = document.querySelector('#impressCurrent');
 const {
  dialog
 } = require('electron').remote;
 const settings = require('electron').remote.require('electron-settings');
 var ipc = require('electron').ipcRenderer,
  currentGame,
  Datastore = require('nedb'),
  db = {},
  params = {},
  slidesList = [],
  running = false,
  exitDialog = document.querySelector("x-dialog");

 renderSelectGame();
 setupSettings();
 //saveSettings();

 // renderer process

 function renderSelectGame() {
  dir = fs.readdirSync('./savegame');
  var selectSavegame = "<x-select id='selectLoad'><x-menu>";
  for (var i = 0, path; path = dir[i]; i++) {
   if (path.match(".db")) {
    selectSavegame += "<x-menuitem name='loadGameSelect' value='" + path + "' selected='true'><x-label>" + path + "</x-label></x-menuitem>";
   }
  }
  selectSavegame += "</x-menu></x-select>";
  selectSavegame += "<x-button id='loadGame'><x-box><x-icon name='file-upload'></x-icon><x-label>Načítaj hru</x-label></x-box></div>";
  $('#oldGame').html(selectSavegame);
 }


 // Setup Database
 function setupSettings() {
  if (!settings.has("name")) {
   ipc.send('saveDefaultSettings');
  }
  loadSettings(settings.getAll());
 }

 function saveGameSettings() {
  db.games.insert(params, function(err, newDoc) {
   loadGameSettings()
  });
 }

 function loadGameSettings() {
  db.games.findOne({
   name: 'gow-settings'
  }, function(err, docs) {

   loadSettings(docs);
  });
 }

 function loadSettings(p) {
  params = p;
 }


 // Nová hra

 $("#submitGame").click(function() {
  $('.noGameName').hide();
  $('#novaHra').removeClass("has-error");
  if ($('#newgame').val() == "") {
   $('#novaHra').addClass("has-error");
   $('.noGameName').show();
  }
  else {
   newgame = true; // TODO Dorobiť overovanie, či hra s takýmto názvom už neexstuje
   currentGame = $("#newgame").val() + ".db";
   addGame();
  }
 });

 $("#loadGame").click(function() {
  if ($("#selectLoad").val() != null) {
   currentGame = $("#selectLoad").val();
   addGame();
  }
 });

 function addGame() {
  db.games = new Datastore({
   //filename: path.join(__dirname, "/savegame/" + currentGame),
   filename: "./savegame/" + currentGame,
   autoload: true
  });
  db.games.ensureIndex({
   fieldName: 'krajina',
   unique: true
  }, function(err) {});
  if (newgame) {
   saveGameSettings();
  }
  else {
   loadGameSettings();

  };
 }

 function endGame() {
  savePoints();
  $('#right-4').html("<h2>Koniec hry</h2>");
  $('#nextPhase').hide();
  $('.year').text("Koniec hry");
  $('.phase').text("");
 }

 /* Logovanie udalostí */

 function createLog(text) {
  var file = fs.openSync("savegame/" + currentGame.slice(0, -3) + ".log", 'a');
  fs.writeFile(file, text, function(err) {
   if (err) {
    return console.log(err);
   }
   console.log("The log was saved!");
  });
 }

 function loadFile(loadedFile) {
  file = fs.openSync(loadedFile[0], 'a');
  fs.readFile(loadedFile[0])
 }

 $("#currentSlideTab").click(function() {
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

 $("#fullscreenBtn").click(function() {
  ipc.send('toggleFullscreen');
 });
 $("#rulesBtn").click(function() {
  ipc.send('toggleRules');
 });
 $("#projectorBtn").click(function() {
  ipc.send('toggleProjector');
 });
 ipc.on('projectorSwitch', (event, x) => {
  //if (x) { $("#projectorBtn").text('Vypni projekciu') } else $("#projectorBtn").text('Spusti projekciu')
  // Opraviť Toggle pri manuálnom vypnutí projekcie
 });
 ipc.on('quitModal', (event) => {
  //renderTable(arg);
  exitDialog.opened = true;
 });
 $("#reallyQuit").click(function() {
  ipc.send('reallyQuit');
 });
 $("#doNotQuit").click(function() {
  exitDialog.opened = false;
 });

 $("#openFile").click(function() {
  dialog.showOpenDialog((fileNames) => {
   if (fileNames === undefined) {
    console.log("No file selected");
    return;
   }
   fs.readFile(fileNames[0], 'utf-8', (err, data) => {
    if (err) {
     alert("An error ocurred reading the file :" + err.message);
     return;
    }

    var parser = new DOMParser()
    var el = parser.parseFromString(data, "text/xml");
    data = el.getElementById('impress');

    loadProjection(data.outerHTML);
   });
  });
 });

 function getFutureSlides(current, offset) {
  let i = slideList.indexOf(current);
  let n = slideList.length;
  if (n - i > 2) {
   return slideList[i + offset];
  }
  if (n - i == 2 && offset == 1) {
   return slideList[i + offset];
  }
  if (n - i == 2 && offset == 2) {
   return slideList[0];
  }
  if (n - i == 1 && offset == 1) {
   return slideList[0];
  }
  if (n - i == 1 && offset == 2) {
   return slideList[1];
  }
 }

 function renderNextSlide(current) {
  ipc.send('projectionGoToSlide', current);
  webview0.send('projectionGoToSlide', current);
  webview1.send('gotoSlide', getFutureSlides(current, 1));
  webview2.send('gotoSlide', getFutureSlides(current, 2));
 }

 function loadProjection(data) {
  if (!running) {
   ipc.send('loadProjection', data, 'projektor');
   webview0.send('loadProjection', data, 'current');
   webview1.send('loadProjection', data, 'next1');
   webview2.send('loadProjection', data, 'next2');
   running = true;
  }
 }

 $("#prevSlideBtn").click(function() {
  webview0.send('prevSlide');
 });
 $("#nextSlideBtn").click(function() {
  webview0.send('nextSlide');
 });
 ipc.on('gotoSlide', (event, next) => {

 });

 webview0.addEventListener('ipc-message', (event) => {
  switch (event.channel) {
   case 'gotoSlide':
    renderNextSlide(event.args[0]);
    break;
   case 'slideList':
    slideList = event.args[0];
    renderNextSlide(event.args[1]);
    break;
   default:
    console.log("There is something new coming from impress.js.");
  }
 })
 /*
 webview1.addEventListener('console-message', (e) => {
  console.log('Guest page logged a message:', e.message)
 })
*/
// webview0.openDevTools();

});
