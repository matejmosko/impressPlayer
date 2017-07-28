// Mixing jQuery and Node.js code in the same file? Yes please!

$(function() {
  const path = require('path');
  const url = require('url');
  const fs = require('fs');
  const settings = require('electron').remote.require('electron-settings');
  var ipc = require('electron').ipcRenderer,
    currentGame,
    Datastore = require('nedb'),
    db = {},
    params = {},
    sort = 99,
    newgame = false,
    started = false,
    dialog = document.querySelector("x-dialog");

  renderSelectGame();
  setupSettings();
  //saveSettings();

  // renderer process

  function renderSelectGame() {
    dir = fs.readdirSync('./savegame');
    var selectSavegame = "<x-select id='selectLoad'><x-menu>";
    for (var i = 0, path; path = dir[i]; i++) {
      if (path.match(".db")) { selectSavegame += "<x-menuitem name='loadGameSelect' value='" + path + "' selected='true'><x-label>" + path + "</x-label></x-menuitem>"; }
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
    db.games.insert(params, function(err, newDoc) { loadGameSettings() });
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
    renderOptions();
    checkEmptyCountries();
    displayPhase();
  }

  function checkEmptyCountries() {
    var text = "<x-menu>",
      first = true;
    if (params.countryList.length > 0) {
      for (k of params.countryList) {

        text += "<x-menuitem value=" + k;
        if (params.countryCodes[k].playing) {
          text += " disabled";
        }
        if (first && !params.countryCodes[k].playing) {
          first = false;
          text += " selected='true'";
        }
        text += " class=" + k + "><x-label>" + params.countryCodes[k].country + "</x-label></x-menuitem>";

      }
    }
    text += "</x-menu>";
    $('#krajiny').html(text);
  }
  // Nová hra

  $("#submitGame").click(function() {
    $('.noGameName').hide();
    $('#novaHra').removeClass("has-error");
    if ($('#newgame').val() == "") {
      $('#novaHra').addClass("has-error");
      $('.noGameName').show();
    } else {
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
    if (newgame) { saveGameSettings(); } else {
      loadGameSettings();

    };
    displayTeamSelect();
  }

  function displayTeamSelect() {

    //createMenu();
    //displayTeamSelect();
    displayGameSetup();
    readGame();
    $("#infobox").append("<div>Hra: <strong>" + currentGame + "</strong></div><div class='year'></div><div class='phase'></div>");
    //if (!newgame) { $("#startGame").text("Pokračuj v hre") }; // TODO Toto sa bude dať ešte opraviť

    $("#gameControls").show();
    $("#newGameBox").hide();
  };

  function startGame(country) {
    $('.noTeam').hide();
    if ($('#tabulkatimov').find("tr").length === 0) {
      $('.teamname').addClass("has-error");
      $('.noTeam').show();
    } else {
      $('#pridajTim').hide();
      $('.quest-box').show();
      $('.points-box').show();
      $('#admin-table').find('.tools').hide();
      $('.plus').show();
      $('.minus').show();
      $('#nextPhase').show();
      $('#newsBox').show(0);
      $("#startGame").hide();
      started = true;
      let d = document.body;
      d.className += " started";
      readGame();
      createLog("SYSTEM: The Game of Worlds has started" + "\r\n");
    }
  }

  function sortGame(docs) {
    docs.sort(function(b, a) {
      return a['body'] - b['body'] || a['poradie'] - b['poradie'];
    });
    /*    let x = docs.length - 1;
    if (docs.length != 0) {
      sort = docs[x]['poradie'];
    }*/
    return docs;
  }

  function readGame() {
    db.games.find({
      game: currentGame
    }, function(err, docs) {
      var text = "";

      docs = sortGame(docs);
      ipc.send('transferCurrentGame', docs, params);
      for (var i = 0, k; k = docs[i]; i++) {
        if (k['body'] == null) {
          k['body'] = 0;
        }
        if (k['ulohy'] == null) {
          k['ulohy'] = 0;
        }
        if (k['poradie'] == null) {
          k['poradie'] = 0;
        }
        if (k['krajina'] == null || k['krajina'] == "") {
          continue; // TODO Problém s tým, ak je undefined krajina regnutá ako hrajúca
        }
        text += "<tr id=" + k['krajina'] + "><td class='nazovkrajiny'>" + params.countryCodes[k['krajina']].country + "</td><td class='tim'>" + k['tim'] + "</td><td class='body'>" + k['body'] + "</td><td class='ulohy'>" + k['ulohy'] + "</td>";
        if (started) {
          text += "<td class='points-box'><x-numberinput value='0' class='year-variable rozdiel'><x-stepper></x-stepper></x-numberinput></td>";
          //text += "<td class='points-box'><x-buttons tracking='-1'><x-button class='plus'><x-icon name='add-circle'></x-icon></x-button><span class='year-variable rozdiel'>0</span><x-button class='minus'><x-icon name='remove-circle'></x-icon></x-button></x-buttons></td>";
          //text += "<td class='quest-box'><x-buttons tracking='-1'><x-button class='quest-add'><x-icon name='add-circle-outline'></x-icon></x-button><span class='year-variable noveulohy'>0</span><x-button class='quest-remove'><x-icon name='remove-circle-outline'></x-icon></x-button></x-buttons></td>";
          text += "<td class='quest-box'><x-numberinput value='0' class='year-variable noveulohy'><x-stepper></x-stepper></x-numberinput></td>";
        } else {
          text += "<td class='tools delete'><x-button class='delete danger'><x-box><x-icon name='delete-forever'></x-icon><x-label>Vymaž</x-label></x-box></x-button></td>";
        }
        text += "<td class='tools sort'><x-numberinput class='sortinput' value='" + k['poradie'] + "'></x-numberinput></td>";
        text += "</tr>";
      }
      $("#tabulkatimov").html(text);

    });
    if (!started) { db.games.update({ name: 'gow-settings' }, { $set: { countryList: params.countryList } }, { multi: true }, function(err, numReplaced) {}); }
    displayStats();
  }

  function displayGameSetup() {
    $('#pridajTim').show(0);
    $('#gameTables').show(0);
  }

  // Pridávanie bodov
  /* DEPRECATED AFTER MIGRATION TO XEL

    $("table").delegate(".minus", "click", function() {
      var rozdiel = parseInt($(this).closest('td').find('.rozdiel').text(), 10);
      --rozdiel;
      $(this).closest('td').find('.rozdiel').text(rozdiel);
    });
    $("table").delegate(".plus", "click", function() {
      var rozdiel = parseInt($(this).closest('td').find('.rozdiel').text(), 10);
      ++rozdiel;
      $(this).closest('td').find('.rozdiel').text(rozdiel);
    });

    // Pridávanie splnených úloh

    $("table").delegate(".quest-remove", "click", function() {
      var rozdiel = parseInt($(this).closest('td').find('.noveulohy').text(), 10);
      --rozdiel;
      $(this).closest('td').find('.noveulohy').text(rozdiel);
    });
    $("table").delegate(".quest-add", "click", function() {
      var rozdiel = parseInt($(this).closest('td').find('.noveulohy').text(), 10);
      ++rozdiel;
      $(this).closest('td').find('.noveulohy').text(rozdiel);
    });
  */
  // Odoberanie tímov

  $("table").delegate(".delete", "click", function() {
    let k = $(this).closest('tr').attr('id');
    db.games.remove({
      krajina: k
    }, {}, function(err, numRemoved) {});

    let index = params.countryList.indexOf(k);
    if (index > -1) {
      params.countryCodes[k].playing = 0;

      //params.countryList.push(k)
    }
    checkEmptyCountries();
    readGame();
  });

  // Pridávanie tímov

  $("#submitTim").click(function() {
    if ($('#krajiny').val() != null) {
      submitAddTeam();
    }
  });

  function submitAddTeam() {
    $('.noTeamName').hide();
    $('.teamname').removeClass("has-error");
    if ($('#tim').val() == "") {
      $('.noTeamName').show();
      $('.teamname').addClass("has-error");
    } else {
      --sort;
      addTeam($('#krajiny').val(), $('#tim').val(), sort);

      let index = params.countryList.indexOf($('#krajiny').val());
      if (index > -1) {
        params.countryCodes[$('#krajiny').val()].playing = 1;
        //params.countryList.splice(index, 1);
      }
      checkEmptyCountries();
      readGame();
    }
  }



  function addTeam(country, team, rank) {
    var doc = {
      datum: new Date(),
      game: currentGame,
      krajina: country,
      tim: team,
      poradie: rank,
      body: 0,
      kola: []
    };
    db.games.insert(doc, function(err, newDocs) {});
  }

  // Posúvanie herných fáz

  $("#nextPhase").click(function() {
    changePhase();
  });
  $("#startGame").click(function() {
    startGame();
  });

  function savePoints() {
    $('#admin-table > tbody  > tr').each(function() {
      let curr = parseInt($(this).children('.body').text(), 10);
      let next = parseInt($(this).children('.points-box').find('.rozdiel').val(), 10);
      let ulohy = parseInt($(this).children('.ulohy').text(), 10);
      let noveulohy = parseInt($(this).children('.quest-box').find('.noveulohy').val(), 10);
      let varporadie = parseFloat($(this).find('.sortinput').val());
      updateTeam($(this).attr('id'), curr, next, ulohy, noveulohy, varporadie);
    });
  };

  function updateTeam(country, points, rozdiel, quests, noveulohy, varporadie) {
    //  if (params.year == 0) {x = rozdiel + (varporadie / 100); } else { x = rozdiel + (varporadie / 100); }

    x = rozdiel + (varporadie / 100);
    spolubody = points + rozdiel;
    spolumisie = quests + noveulohy;
    db.games.update({ krajina: country }, { $set: { body: spolubody, ulohy: spolumisie, poradie: x }, $push: { kola: rozdiel } }, { multi: true }, function(err, numReplaced) {

      createLog("POINTS CHANGED: Points " + points + " + " + rozdiel + " = " + spolubody + " Missions " + quests + " + " + noveulohy + " = " + spolumisie + " (" + country + ")\r\n");
      readGame();
    });
    //endRound(country, points, rozdiel);                                       // SLEDOVAŤ ČI TO NEPRINIESLO NEJAKÝ PROBLÉM
  }

  function endRound(country, points, rozdiel) {
    //db.games.update({ krajina: country }, { $push: { kola: rozdiel } }, {}, function() {});
  }

  function changePhase() {

    if (params.year > 8) { displayPhase() } else {
      let y = params.yearCount - 1;
      let n = params.phases.length - 1;
      /*let year = params.year;
      let phase = params.phase;*/
      if (params.phase == n - 1) { savePoints(); }
      if (params.phase == n) {
        params.phase = 0;
        params.year += 1;

      } else { params.phase++; }
      db.games.update({ name: 'gow-settings' }, { $set: { year: params.year, phase: params.phase } }, { multi: true }, function(err, numReplaced) {});
      displayPhase();
      displaySpravy();
      createLog("PHASE CHANGED: Year = " + params.year + ", Phase = " + params.phase + "\r\n");
    }
  }

  function displaySpravy() {
    let curr, past, future;
    let year = params.year;
    let phase = params.phase;
    curr = "<div class='newsArticle'><h4>" + params.worldEvents[year].title + "</h4><p>" + params.worldEvents[year].text + "</p></div><div class='newsArticle'><h4>" + params.ufoEvents[year].title + "</h4><p>" + params.ufoEvents[year].text + "</p></div>";
    if (year != 0) { past = "<div class='newsArticle'><h4>" + params.worldEvents[year - 1].title + "</h4><p>" + params.worldEvents[year - 1].text + "</p></div><div class='newsArticle'><h4>" + params.ufoEvents[year - 1].title + "</h4><p>" + params.ufoEvents[year - 1].text + "</p></div>"; }
    if (year < params.yearCount - 1) { future = "<div class='newsArticle'><h4>" + params.worldEvents[year + 1].title + "</h4><p>" + params.worldEvents[year + 1].text + "</p></div><div class='newsArticle'><h4>" + params.ufoEvents[year + 1].title + "</h4><p>" + params.ufoEvents[year + 1].text + "</p></div>"; }
    $('.currNews').html(curr);
    $('.pastNews').html(past);
    $('.futNews').html(future);
    ipc.send('transferNews', curr);
  }

  function displayPhase() {
    let n = params.yearCount - 1;
    let y = params.year + 1;
    let p = params.phase;
    if (p == -1) {} else {
      ipc.send('transferPhase', y, params.phases[p], params.yearCount);
      $('.year').html("Rok " + y);
      $('.phase').html(params.phases[p].title);
      if (params.year > n) { endGame(); }
    }
  }

  function displayStats() {
    db.games.find({
      game: currentGame
    }, function(err, docs) {
      var text = "";

      docs = sortGame(docs);
      for (var i = 0, k; k = docs[i]; i++) {
        if (k['body'] == null) {
          k['body'] = 0;
        }
        if (k['ulohy'] == null) {
          k['ulohy'] = 0;
        }
        if (k['poradie'] == null) {
          k['poradie'] = 0;
        }
        text += "<tr id=" + k['krajina'] + "><td class='nazovkrajiny'>" + k['krajina'] + "</td><td class='tim'>" + k['tim'] + "</td>"
        for (n = 0; n < params.yearCount; n++) {
          text += "<td class='" + n + "'>"
          if (k['kola'][n] != null) { text += k['kola'][n] };
          text += "</td>";
        }
        text += "<td class='body'>" + k['body'] + "</td><td class='ulohy'>" + k['ulohy'] + "</td>";
        text += "</tr>";
      }
      $("#statistikatimov").html(text);

    });
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

  /* Krok späť */

  function stepBack() {
    if (params.year > params.yearCount) { displayPhase() } else {
      let y = params.yearCount - 1;
      let n = params.phases.length - 1;
      /*let year = params.year;
      let phase = params.phase;*/
      if (params.phase == 3) { revertPoints(); } // Not working yet
      if (params.phase == 0) {
        params.phase = 3;
        params.year -= 1;

      } else { params.phase--; }
      db.games.update({ name: 'gow-settings' }, { $set: { year: params.year, phase: params.phase } }, { multi: true }, function(err, numReplaced) {});
      displayPhase();
      displaySpravy();
      createLog("PHASE CHANGED: Year = " + params.year + ", Phase = " + params.phase + "\r\n");
    }
  }

  function revertPoints() {
    /* $('#stats-table > tbody  > tr').each(function() {
      let curr = parseInt($(this).children('.body').text(), 10);
      let next = parseInt($(this).children('.'+(params.year-1)).children('.rozdiel').text(), 10);
      updateTeam($(this).attr('id'), curr, (0-next), 0,0,0);
    }); */
  }

  $("#statsTab").click(function() {
    displayStats();
    $('#admin-table').hide();
    $('#gow-options').hide();
    $('#stats-table').show();
  });
  $("#gameTab").click(function() {
    displayStats();
    $('#admin-table').show();
    $('#gow-options').hide();
    $('#stats-table').hide();
  });
  $("#optionsTab").click(function() {
    displayStats();
    $('#admin-table').hide();
    $('#gow-options').show();
    $('#stats-table').hide();
  });
  $("#stepBack").click(function() {
    stepBack();
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
  ipc.on('quitModal', (event) => {
    //renderTable(arg);
    dialog.opened = true;
  });
  $("#reallyQuit").click(function() {
    ipc.send('reallyQuit');
  });
  $("#doNotQuit").click(function() {
    dialog.opened = false;
  });

  ipc.on('projectorSwitch', (event, x) => {
    //if (x) { $("#projectorBtn").text('Vypni projekciu') } else $("#projectorBtn").text('Spusti projekciu')
    // Opraviť Toggle pri manuálnom vypnutí projekcie
  });

  // Options Module
  function renderOptions() {
    var text = "",
      i = 0,
      n = 0;
    text += "<h2>Herné nastavenia</h2>"

    // baseGame Settings

    text += "<x-box vertical>"
    text += "<x-box><x-label>Počet herných rokov</x-label>"
    text += "<x-numberinput id='yearCountOpt' skin='flat' min='1' value='" + params.yearCount + "'>"
    text += "<x-label>Počet rokov</x-label>"
    text += "<x-stepper></x-stepper>"
    text += "</x-numberinput></x-box>"
    text += "<x-box><x-label>Krátke časovače (min)</x-label>"
    text += "<x-numberinput id='shortPauseOpt' skin='flat' min='0' step='0.50' value='" + params.shortPause + "'>"
    text += "<x-label>Krátke časovače</x-label>"
    text += "<x-stepper></x-stepper>"
    text += "</x-numberinput></x-box>"
    text += "<x-box><x-label>Dlhé časovače (min)</x-label>"
    text += "<x-numberinput id='longPauseOpt' skin='flat' min='0' step='0.50' value='" + params.longPause + "'>"
    text += "<x-label>Dlhé časovače</x-label>"
    text += "<x-stepper></x-stepper>"
    text += "</x-numberinput></x-box>"
    text += "</x-box>"

// ufoEvents block

    text += "<h3>Mimozemské udalosti</h3>";
    text += "<x-box vertical id='ufoEventsOpt'>";
    text += "<x-box class='optHorizontalBox tableHeader'><x-label name='ufoEventsOpt' class='title'>Názov</x-label><x-label name='ufoEventsOpt' class='text'>Text na projekciu</x-label><x-label name='ufoEventsOpt' class='secret'>Text pre nás</x-label></x-box>";
    for (k of params.ufoEvents) {
      i++;
      text += "<x-box id='ufoEvent-" + i + "' class='optHorizontalBox'>";
      //text += "<x-label>"+i+"</x-label>";
      text += "<x-label>"+i+"</x-label><x-textarea name='ufoEventsOpt' id='ufoTitle-" + i + "' class='title tableInput' value='" + k.title + "'></x-textarea>";
      text += "<x-textarea name='ufoEventsOpt' id='ufoText-" + i + "' class='text tableInput' value='" + k.text + "'></x-textarea>";
      text += "<x-textarea name='ufoEventsOpt' id='ufoSecret-" + i + "' class='secret tableInput' value='" + k.secret + "'></x-textarea>";
      text += "</x-box>";
    }
    text += "</x-box>";

// worldEvents block

    text += "<h3>Hlavné udalosti</h3>";
    text += "<x-box vertical id='worldEventsOpt'>"
    text += "<x-box class='optHorizontalBox tableHeader'><x-label name='ufoEventsOpt' class='title'>Názov</x-label><x-label name='ufoEventsOpt' class='text'>Text na projekciu</x-label><x-label name='ufoEventsOpt' class='secret'>Text pre nás</x-label></x-box>";
    for (k of params.worldEvents) {
      n++;
      text += "<x-box  id='worldEvent-" + n + "' class='optHorizontalBox'>";
      //text += "<x-label>"+i+"</x-label>";
      text += "<x-label class='tableLabel'>"+n+"</x-label><x-textarea name='worldEventsOpt' id='worldTitle-" + n + "' class='title tableInput' value='" + k.title + "'></x-textarea>";
      text += "<x-textarea name='worldEventsOpt' id='worldText-" + n + "' class='text tableInput' value='" + k.text + "'></x-textarea>";
      text += "<x-textarea name='worldEventsOpt' id='worldSecret-" + n + "' class='secret tableInput' value='" + k.secret + "'></x-textarea>";
      text += "</x-box>";
    }
    text += "</x-box>";

// phases block

    text += "<h3>Fázy kola</h3>";
    text += "<x-box vertical id='phasesOpt'>"
    text += "<x-box class='optHorizontalBox tableHeader'><x-label name='ufoEventsOpt' class='title'>Názov</x-label><x-label name='ufoEventsOpt' class='text'>Text na projekciu</x-label></x-box>";
    for (k of params.phases) {
      n++;
      text += "<x-box id='phase-" + n + "' class='optHorizontalBox'>";
      //text += "<x-label>"+i+"</x-label>";
      text += "<x-label class='title tableLabel'>"+k.title+"</x-label>";
      text += "<x-textarea name='phaseOpt' id='phaseText-" + n + "' class='text tableInput' value='" + k.text + "'></x-textarea>";
      text += "</x-box>";
    }
    text += "</x-box>";

    $("#gow-options").children("#tableOpt").html(text);
  }


  // TODO - ukladanie nastavení - aj Predvolených (checkbox)
  function saveOptions() {
    params.yearCount = $("#yearCountOpt").val();
    params.shortPause = $("#shortPauseOpt").val();
    params.longPause = $("#longPauseOpt").val();
    $("#ufoEventsOpt").find("x-box[id^='ufoEvent']").each(function(index) {
      params.ufoEvents[index].title = $(this).children("[id^='ufoTitle']").val();
      params.ufoEvents[index].text = $(this).children("[id^='ufoText']").val();
      params.ufoEvents[index].secret = $(this).children("[id^='ufoSecret']").val();
    });
    $("#worldEventsOpt").find("x-box[id^='worldEvent']").each(function(index) {
      params.worldEvents[index].title = $(this).children("[id^='worldTitle']").val();
      params.worldEvents[index].text = $(this).children("[id^='worldText']").val();
      params.worldEvents[index].secret = $(this).children("[id^='worldSecret']").val();
    });
    $("#phasesOpt").find("x-box[id^='phase']").each(function(index) {
      params.phases[index].text = $(this).children("[id^='phaseText']").val();
    /*  params.worldEvents[index].title = $(this).children("[id^='worldTitle']").val();
      params.worldEvents[index].text = $(this).children("[id^='worldText']").val();
      params.worldEvents[index].secret = $(this).children("[id^='worldSecret']").val();*/
    });
    db.games.remove({ name: 'gow-settings' }, {}, function(err, numRemoved) {});
    db.games.insert(params, function(err, newDoc) { loadGameSettings() });
    console.log($("#saveDefaultCheck"));
    if ($("#saveDefaultCheck").is(':checked')){
      console.log("Heureka");
      settings.setAll(params);
    }
  }

  $("#saveOpts").click(function() {
    saveOptions();
  });
  $("#reloadOpts").click(function() {
    renderOptions();
  });
  $("#setDefaultOpts").click(function() {
    loadSettings(settings.getAll());
  });

  // Display Top Menu
  function createMenu() {
    var text = "";
    for (i = 1; i <= params.yearCount; i++) {
      text = "<li class='dropdown'>";
      text += "<a href='#' class='dropdown-toggle' data-toggle='dropdown'>Rok " + i + "<span class='caret'></span></a>";
      text += "<ul class='dropdown-menu'><li><a href='#'>Stratégia" + i + "</a></li><li><a href='#'>Diplomacia" + i + "</a></li><li><a href='#'>Boj" + i + "</a></li><li><a href='#'>Správy" + i + "</a></li></ul>";
      text += "</li>";
      $('.nav').append(text);
    }
  }
});
