<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <title>impressPlayer Controller</title>
  <base href="{{{dirname}}}" />
  <!--<link rel="stylesheet" href="./node_modules/xel/stylesheets/material.theme.css">-->
  <link rel="stylesheet" href="{{{appPath}}}/node_modules/xel/themes/material.css">
  <link rel="stylesheet" href="{{{appPath}}}/css/styles-controller.css">
  <script src="{{{appPath}}}/node_modules/xel/xel.min.js"></script>

</head>

<body>
  <div id="container">
    <div id="topbox">
      <x-card id="infobox">
        <x-buttons tracking="2" id="projectorControls" class="topButtons">
          <x-button id="reloadBtn" class="danger btn" title="Click to reload the application">
            <x-icon name="power-settings-new" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
          </x-button>
          <x-button id="disclamerBtn" class="hidden btn">
            <x-icon name="assignment" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
          </x-button>
          <x-button id="projectorBtn" title="Click to open projection window" class="btn">
            <x-icon name="airplay" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
          </x-button>
          <x-button id="fullscreenBtn" title="Click to make projection window fullscreen" class="btn">
            <x-icon name="fullscreen" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
          </x-button>



        </x-buttons>
        <div id="mediaControlsDiv" class="hidden">
        <x-buttons tracking="-1" id="audiovideoControls" class="topButtons audiovideoControls">
          <x-button id="playPauseMediaBtn" class="btn">
            <x-icon name="play-arrow" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
          </x-button>
          <x-slider id="audioVideoSlider" value="1"></x-slider>
          <x-button id="restartMediaBtn" class="btn">
            <x-icon name="replay" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
          </x-button>
        </x-buttons>
      </div>
        <x-buttons tracking="-1" id="gameControls" class="topButtons">
          <x-buttons>
            <x-buttons tracking="-1" id="gameControls" class="topButtons">
              <x-button id="nextSlideBtn" class="impressControlBtns btn">
                <x-box>
                  <x-icon name="skip-next" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
                  <x-label id="nextSlideLabel" class="label">{{#i18n}}Next Slide{{/i18n}}</x-label>
                </x-box>
              </x-button>
              <x-button id="prevSlideBtn" class="danger impressControlBtns btn">
                <x-icon name="backspace" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
              </x-button>
            </x-buttons>
      </x-card>


    </div>

    <div id="main">
      <div id="content">
        <x-tabs class="tabs" centered>
          <x-tab selected id="currentSlideTab" class="tab">
            <x-box>
              <x-icon name="list" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
              <x-label id="tabLabelCurrentSlide" class="label">{{#i18n}}Presentation{{/i18n}}</x-label>
            </x-box>
          </x-tab>


          <x-tab id="remoteSourcesTab" class="hidden" class="tab">
            <x-box>
              <x-icon name="settings" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
              <x-label id="tabLabelRemoteSources" class="label">{{#i18n}}Remote Sources{{/i18n}}</x-label>
            </x-box>
          </x-tab>

          <x-tab id="optionsTab" class="hidden" class="tab">
            <x-box>
              <x-icon name="settings" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
              <x-label id="tabLabelSettings" class="label">{{#i18n}}Options{{/i18n}}</x-label>
            </x-box>
          </x-tab>
          <x-tab id="allSlidesTab" class="tab">
            <x-box>
              <x-icon name="sort" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
              <x-label id="tabLabelAllSlides" class="label">{{#i18n}}Slides List{{/i18n}}</x-label>
            </x-box>
          </x-tab>
        </x-tabs>
        <x-card id="contentCard">

          <div id="currentSlideDiv" class="content-table slidesPreview">
            <webview id="impressCurrent" autosize src="{{{usrPath}}}/viewer.html" style="display:flex;" nodeintegration></webview>
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
        </x-card>
      </div>

      <div id="sidebar">
          <x-card class="nextSlide nextSlide-1">
            <webview id="nextImpress-1" class="slidesPreview" src="{{{usrPath}}}/previewer.html" autosize="on" minwidth="320px" minheight="180px" style="display:flex;" nodeintegration></webview>
            <div class="impressCurtain">
              <!-- The curtain preventing focusing webview element -->
            </div>
          </x-card>
          <x-card class="nextSlide nextSlide-2">
            <webview id="nextImpress-2" class="slidesPreview" src="{{{usrPath}}}/previewer.html" autosize="on" minwidth="320px" minheight="180px" style="display:flex;" nodeintegration></webview>
            <div class="impressCurtain">
              <!-- The curtain preventing focusing webview element -->
            </div>
          </x-card>
          <x-card class="additionalControls">
            <x-button id="refreshBtn" class="additionalBtns btn">
              <x-box>
                <x-icon name="refresh" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
                <x-label id="refreshLabel" class="label">{{#i18n}}Refresh presentation{{/i18n}}</x-label>
              </x-box>
            </x-button>
            <x-button id="openFile" class="additionalBtns btn">
              <x-box>
                <x-icon name="folder-open" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
                <x-label id="refreshLabel" class="label">{{#i18n}}Load Presentation{{/i18n}}</x-label>
              </x-box>
            </x-button>
          </x-card>
      </div>
    </div>
    <div id="footer">
      <x-card class="presentationInfo">
        <div id="smallTimer"><span id="currentTime">00:00:00</span></div>
        <div id="bigTimer"><span id="projectionTimer" title="Click to reset timer">00:00:00</span></div>
        <div id="currentSlideName">---</div>
        <div id="slidesCount">-/-</div>
      </x-card>
    </div>
  </div>
  <dialog id="exitDialog">
    <h4 id="exitTitle">{{#i18n}}Are you sure about exiting impressPlayer?{{/i18n}}</h4>
    <p id="exitText">{{#i18n}}Actually nothing bad could happen if you exit now, but still. <br />Do you really want to do it?{{/i18n}}</p>
    <x-buttons tracking="-1" id="windowControls" class="exitBtns">
      <x-button id="reallyQuit" class="danger btn">
        <x-box>
          <x-icon name="exit-to-app" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
          <x-label id="exitAgree" class="label">{{#i18n}}Yes, get me out of here!{{/i18n}}</x-label>
        </x-box>
      </x-button>
      <x-button id="doNotQuit" class="btn">
        <x-box>
          <x-icon name="replay" iconset="{{{appPath}}}/node_modules/xel/images/icons.svg"></x-icon>
          <x-label id="exitDisagree" class="label">{{#i18n}}No, I haven't finished yet{{/i18n}}</x-label>
        </x-box>
      </x-button>
    </x-buttons>
  </dialog>
</body>

<script id="require">
  <!--// You can also require other files to run in this process
  require({{{controllerPath}}});
  //require("controllerPathPlaceHolder");
</script>

</html>
