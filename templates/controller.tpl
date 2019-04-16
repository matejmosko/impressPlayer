<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <title>impressPlayer Controller</title>
  <base href="{{{dirname}}}" />
  <link rel="stylesheet" href="{{{appPath}}}/css/styles-controller.css">
</head>

<body>
  <div id="container">
    <div id="header" class="card">
      <div id="projectorControls" class="topdiv btnRow">
        <button id="openFile" class="btn" skin="flat">
          <i class="fa fa-folder-open"></i>
        </button>
        <button id="disclamerBtn" class="hidden btn" skin="flat">
          <i class="fa fa-clipboard-list"></i>
        </button>
        <button id="projectorBtn" title="Click to open projection window" class="btn" skin="flat">
          <i class="fa fa-desktop"></i>
        </button>
        <button id="fullscreenBtn" title="Click to make projection window fullscreen" class="btn" skin="flat">
          <i class="fa fa-arrows-alt"></i>
        </button>
      </div>
      <div id="mediaControlsDiv" class="hidden">
          <button id="playPauseMediaBtn" class="btn" skin="flat">
            <i class="fa fa-play"></i>
          </button>
          <input type="range" min="1" max="100" value="1" class="slider" id="audioVideoSlider">
          <button id="restartMediaBtn" class="btn" skin="flat">
            <i class="fa fa-redo"></i>
          </button>
      </div>
      <div id="gameControls" class="topdiv btnRow">
        <button id="nextSlideBtn" class="impressControlBtns btn">
            <i class="fa fa-step-forward"></i>
            <label id="nextSlideLabel" class="btnLabel">{{#i18n}}Next Slide{{/i18n}}</label>
        </button>
        <button id="prevSlideBtn" class="danger impressControlBtns btn">
          <i class="fa fa-step-backward"></i>
        </button>
      </div>
    </div>
    <div id="main">
      <div id="content">
        <div class="tabs">
          <button id="currentSlideTab" class="tab"><i class="fa fa-film"></i><span class="btnLabel">{{#i18n}}Presentation{{/i18n}}</span></button>
          <button id="remoteSourcesTab" class="tab hidden"><i class="fa fa-globe-europe"></i><span class="btnLabel">{{#i18n}}Remote Sources{{/i18n}}</span></button>
          <button id="optionsTab" class="tab hidden"><i class="fa fa-cog"></i><span class="btnLabel">{{#i18n}}Options{{/i18n}}</span></button>
          <button id="allSlidesTab" class="tab"><i class="fa fa-th-list"></i><span class="btnLabel">{{#i18n}}Slides List{{/i18n}}</span></button>
        </div>
        <div id="contentCard" class="card">

          <div id="currentSlideDiv" class="content-table slidesPreview">
            <webview id="impressCurrent" src="{{{usrPath}}}/viewer.html" nodeintegration></webview>
            <div class="impressCurtain">
              <!-- The curtain preventing focusing webview element -->
            </div>
          </div>
          <div id="allSlidesDiv" class="content-table hidden">
            <div id="impressOverview"></div>
          </div>
          <div id="remoteSourcesDiv" class="content-table hidden">
            Placeholder for remote sources
          </div>
          <div id="optionsDiv" class="content-table hidden">
            Placeholder for options
          </div>
        </div>
      </div>

      <div id="sidebar">
        <div class="card nextSlide nextSlide-1 sidebarCard">
          <webview id="nextImpress-1" class="slidesPreview" src="{{{usrPath}}}/previewer.html" autosize="on" minwidth="320px" minheight="180px" style="display:flex;" nodeintegration></webview>
          <div class="impressCurtain">
            <!-- The curtain preventing focusing webview element -->
          </div>
        </div>
        <div class="card nextSlide nextSlide-2 sidebarCard">
          <webview id="nextImpress-2" class="slidesPreview" src="{{{usrPath}}}/previewer.html" autosize="on" minwidth="320px" minheight="180px" style="display:flex;" nodeintegration></webview>
          <div class="impressCurtain">
            <!-- The curtain preventing focusing webview element -->
          </div>
        </div>
      </div>
    </div>
    <div id="footer" class="presentationInfo card">
        <div id="smallTimer"><span id="currentTime">00:00:00</span></div>
        <div id="bigTimer"><span id="projectionTimer" title="Click to reset timer">00:00:00</span></div>
        <div id="currentSlideName">---</div>
        <div id="slidesCount">-/-</div>
      </div>
  </div>
  <dialog id="exitDialog">
    <h4 id="exitTitle">{{#i18n}}Are you sure about exiting impressPlayer?{{/i18n}}</h4>
    <p id="exitText">{{#i18n}}Actually nothing bad could happen if you exit now, but still. <br />Do you really want to do it?{{/i18n}}</p>
    <div id="windowControls" class="exitBtns btnRow">
      <button id="reallyQuit" class="danger btn">
        <div>
          <i class="fa fa-power-off"></i>
          <label id="exitAgree" class="btnLabel">{{#i18n}}Yes, get me out of here!{{/i18n}}</label>
        </div>
      </button>
      <button id="doNotQuit" class="btn">
        <div>
          <i class="fa fa-ambulance"></i>
          <label id="exitDisagree" class="btnLabel">{{#i18n}}No, I haven't finished yet{{/i18n}}</label>
        </div>
      </button>
    </div>
  </dialog>
</body>

<script id="require">
  <!--// You can also require other files to run in this process
  /* unibeautify:disable */
  require({{{controllerPath}}});
  /* unibeautify:enable */
  //require("controllerPathPlaceHolder");
</script>

</html>
