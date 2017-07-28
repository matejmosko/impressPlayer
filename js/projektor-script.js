// Mixing jQuery and Node.js code in the same file? Yes please!

$(function() {
  var ipc = require('electron').ipcRenderer,
  params = {},
  current,
  timer;

  const path = require('path');
  const url = require('url');
  const settings = require('electron').remote.require('electron-settings');
  // renderer process

  ipc.on('readCurrentGame', (event, arg1, arg2) => {
    renderTable(arg1);
    params = arg2;
  });
  ipc.on('readNews', (event, arg) => {
    renderNews(arg);
  });
  ipc.on('transferRules', (event) => {
    $('.rules').toggle();
  });
  ipc.on('readPhase', (event, year, phase, pocetrokov) => {
    renderPhase(year, phase, pocetrokov);
  });

  function resetView() {
    $('body').removeClass("timeisup");
    $('.overlay').hide();
  }

  function renderNews(curr) {
    resetView()
    $('.currNews').html(curr);
  }

  function renderTable(docs) {
    resetView();
    var text = "";
    for (var i = 0, k; k = docs[i]; i++) {
      if (k['body'] == null) {
        k['body'] = 0;
      }
      text += "<tr id=" + k['krajina'] + "><td class='nazovkrajiny'>" + k['krajina'] + "</td><td class='tim'>" + k['tim'] + "</td><td class='body'>" + k['body'] + "</td>";
      text += "</tr>";
    }
    $("#tabulkatimov").html(text);
    let last = $("tbody tr:last-child").attr('id');
    let first = $("tbody tr:first-child").attr('id');

    let curr = "<div class='newsArticle'><h4>Pomoc krajine štvrtého sveta</h4><p>Dobročinné organizácie WHO, OSN, UNICEF a TV JOJ vyhlásili, že krajinou, ktorá si zaslúži pomoc je <strong>" + last + "</strong> a pomôže jej nádej našej civilizácie, <strong>" + first + "</strong>.</p></div>";
// <div class='sprava'><h4>Plány krajín sa podarilo prekročiť o " + Math.floor((Math.random() * 100) + 101) + " %</h4><p>Zástupcovia jednotlivých krajín si teraz vyberú plody práce svojho pracovitého ľudu. <br /> Inými slovami: Choďte za organizátorom po zdroje.</p></div>
    $('.endNews').html(curr);
  }

  function renderPhase(year, phase, pocetrokov) {
    resetView()
    if (year > pocetrokov) {
      $('#spravy').hide();
      $('#currYear').html("<h2 class='year'>Rok " + (year + 2035) + "</h2>");
      $('#currPhase').html("<h3>Koniec sveta</h3>");
      $('#currPhaseText').html("");
      $('#infobox').show();
      if (timer != undefined) timer.running = false;
      $('#timerdiv').hide();
    } else {
      year = year + 2037;
      $('#currYear').html("<h2 class='year'>Rok " + year + "</h2>");
      $('#currPhase').html("<h2 class='phase'>" + phase.title + " </h2>");
      $('#currPhaseText').html("<span class='phasetext'>" + phase.text + "</span>");
      $('#infobox').show();


      switch (phase.title) {
        case "Pomoc štvrtému svetu":
          $('#timerdiv').hide();
          $('.endNews').show();
          if (timer != undefined) timer.running = false;
          break;
        case "Správy zo sveta":
          $('#spravy').show();
          $('.endNews').hide();
          $('.currNews').show();
          if (timer != undefined) timer.running = false;
          break;
        case "Čas na strategické rozhodnutia":
        $('#spravy').show();
        $('#timerdiv').show();
        //displayCounter(settings.get("shortPause") * 60);
        console.log(params.shortPause);
        displayCounter(params.shortPause * 60);
          break;
        case "Rozkladanie armád":
          $('#timerdiv').hide();
          if (timer != undefined) timer.running = false;
          break;
        case "Diplomacia":
          $('#spravy').show();
          $('#timerdiv').show();
          displayCounter(settings.get("longPause") * 60);
          break;
        case "Vyhodnotenie bojov":
          $('#timerdiv').hide();
          $('#spravy').show();
          if (timer != undefined) timer.running = false;
          break;
        case "Pauza":
          $('#timerdiv').show();
          $('.currNews').hide();
          console.log(settings.get("longPause"));
          displayCounter(settings.get("longPause") * 60);
          break;
      }
    }

  }

  // COUNTDOWN TIMER

  function CountDownTimer(duration, granularity) {
    this.duration = duration;
    this.granularity = granularity || 1000;
    this.tickFtns = [];
    this.running = false;
  }

  CountDownTimer.prototype.start = function() {
    if (this.running) {
      return;
    }
    this.running = true;
    var start = Date.now(),
      that = this,
      diff, obj;

    (function timer() {
      diff = that.duration - (((Date.now() - start) / 1000) | 0);

      if (that.running) {
        if (diff > 0) {
          setTimeout(timer, that.granularity);
        } else {
          diff = 0;
          that.running = false;
        }

        obj = CountDownTimer.parse(diff);
        that.tickFtns.forEach(function(ftn) {
          ftn.call(this, obj.minutes, obj.seconds);
        }, that);
      }
    }());
  };

  CountDownTimer.prototype.onTick = function(ftn) {
    if (typeof ftn === 'function') {
      this.tickFtns.push(ftn);
    }
    return this;
  };

  CountDownTimer.prototype.expired = function() {
    return !this.running;
  };

  CountDownTimer.parse = function(seconds) {
    return {
      'minutes': (seconds / 60) | 0,
      'seconds': (seconds % 60) | 0
    };
  };

  function displayCounter(duration) {
    var display = document.querySelector('#timerdiv');
    timer = new CountDownTimer(duration);
    timer.onTick(format(display)).onTick(restart).start();



    function restart() {
      if (this.expired()) {
        //setTimeout(function () { timer.start(); }, 1000);
        var element = document.getElementsByTagName("body");
        element[0].classList.add("timeisup");
        //display.innerHTML = "Čas vypršal!";
        $('.overlay').show();
      }
    }

    function format(display) {
      return function(minutes, seconds) {
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        display.textContent = minutes + ':' + seconds;
      };
    }
  }
});
