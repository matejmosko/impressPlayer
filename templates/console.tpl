<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <title>impressPlayer Console</title>
  <base href="{{{dirname}}}/js" />
  <link rel="import" href="{{{appPath}}}/node_modules/xel/xel.min.html">
  <!--<link rel="stylesheet" href="./node_modules/xel/stylesheets/material.theme.css">-->
  <link rel="stylesheet" href="{{{appPath}}}/node_modules/xel/stylesheets/galaxy.theme.css">
  <link rel="stylesheet" href="{{{appPath}}}/css/styles-console.css">
</head>

<body>
  <div id="container">
    <div id="topbox">
      <x-card id="infobox">
        <x-buttons tracking="2" id="projectorControls" class="topButtons">
          <x-button id="reloadBtn" class="danger" title="Click to reload the application">
            <x-icon name="power-settings-new"></x-icon>
          </x-button>
          <x-button id="disclamerBtn" class="hidden">
            <x-icon name="assignment"></x-icon>
          </x-button>
          <x-button id="projectorBtn" title="Click to open projection window">
            <x-icon name="airplay"></x-icon>
          </x-button>
          <x-button id="fullscreenBtn" title="Click to make projection window fullscreen">
            <x-icon name="fullscreen"></x-icon>
          </x-button>



        </x-buttons>
        <x-buttons tracking="-1" id="audiovideoControls" class="topButtons audiovideoControls hidden">
          <x-button id="playPauseMediaBtn">
            <x-icon name="play-arrow"></x-icon>
          </x-button>
          <x-button id="restartMediaBtn">
            <x-icon name="replay"></x-icon>
          </x-button>
        </x-buttons>
        <x-buttons tracking="-1" id="gameControls" class="topButtons">
          <x-button id="openFile">{{#i18n}}Load Presentation{{/i18n}}</x-button>
          <x-buttons>
        <x-buttons tracking="-1" id="gameControls" class="topButtons">
          <x-button id="nextSlideBtn" class="impressControlBtns">
            <x-box>
              <x-icon name="skip-next"></x-icon>
              <x-label id="nextSlideLabel">{{#i18n}}Next Slide{{/i18n}}</x-label>
            </x-box>
          </x-button>
          <x-button id="prevSlideBtn" class="danger impressControlBtns">
            <x-icon name="backspace"></x-icon>
          </x-button>
        </x-buttons>
      </x-card>


    </div>

    <div id="main">
      <div id="content">
        <div id="gameTables">

          <x-card id="contentCard">
            <x-tabs centered>
              <x-tab selected id="currentSlideTab">
                <x-box>
                  <x-icon name="list"></x-icon>
                  <x-label id="tabLabelCurrentSlide">{{#i18n}}Presentation{{/i18n}}</x-label>
                </x-box>
              </x-tab>


              <x-tab id="remoteSourcesTab" class="hidden">
                <x-box>
                  <x-icon name="settings"></x-icon>
                  <x-label id="tabLabelRemoteSources">{{#i18n}}Remote Sources{{/i18n}}</x-label>
                </x-box>
              </x-tab>

              <x-tab id="optionsTab" class="hidden">
                <x-box>
                  <x-icon name="settings"></x-icon>
                  <x-label id="tabLabelSettings">{{#i18n}}Options{{/i18n}}</x-label>
                </x-box>
              </x-tab>
              <x-tab id="allSlidesTab">
                <x-box>
                  <x-icon name="sort"></x-icon>
                  <x-label id="tabLabelAllSlides">{{#i18n}}Slides List{{/i18n}}</x-label>
                </x-box>
              </x-tab>
            </x-tabs>

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
      </div>

      <div id="sidebar">
        <div id="sideCards">
          <x-card class="nextSlide nextSlide-1">
            <webview id="nextImpress-1" class="slidesPreview" src="{{{usrPath}}}/viewer.html" webpreferences="focusable: false" autosize style="display:flex;" nodeintegration></webview>
            <div class="impressCurtain">
              <!-- The curtain preventing focusing webview element -->
            </div>
          </x-card>
          <x-card class="nextSlide nextSlide-2">
            <webview id="nextImpress-2" class="slidesPreview" src="{{{usrPath}}}/viewer.html" autosize style="display:flex;" nodeintegration></webview>
            <div class="impressCurtain">
              <!-- The curtain preventing focusing webview element -->
            </div>
          </x-card>
          <x-card class="nextSlide sideInfo">
            <div id="bigTimer"><span id="projectionTimer" title="Click to reset timer">00:00:00</span></div>
            <div id="smallTimer"><span id="currentTime">00:00:00</span></div>
            <div id="currentSlideName"></div>
            <div id="slidesCount"></div>
          </x-card>
        </div>
      </div>
    </div>
  </div>
  <x-dialog id="exitDialog">
    <h4 id="exitTitle">{{#i18n}}Are you sure about exiting impressPlayer?{{/i18n}}</h4>
    <p id="exitText">{{#i18n}}Actually nothing bad could happen if you exit now, but still. <br />Do you really want to do it?{{/i18n}}</p>
    <x-buttons tracking="-1" id="windowControls">
      <x-button id="reallyQuit" class="danger">
        <x-box>
          <x-icon name="exit-to-app"></x-icon>
          <x-label id="exitAgree">{{#i18n}}Yes, get me out of here!{{/i18n}}</x-label>
        </x-box>
      </x-button>
      <x-button id="doNotQuit">
        <x-box>
          <x-icon name="replay"></x-icon>
          <x-label id="exitDisagree">{{#i18n}}No, I haven't finished yet{{/i18n}}</x-label>
        </x-box>
      </x-button>
    </x-buttons>
  </x-dialog>
</body>

<script id="require">
  <!--// You can also require other files to run in this process
  require({{{consolePath}}});
  //require("consolePathPlaceHolder");
</script>

</html>
