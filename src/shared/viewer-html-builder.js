import impressV1_0_0 from '../js/impressjs/impress-v1.0.0.js?raw';
import impressV1_1_0 from '../js/impressjs/impress-v1.1.0.js?raw';
import impressV2_0_0 from '../js/impressjs/impress-v2.0.0.js?raw';
import normalizeCssSource from '../css/impress-normalize.css?raw';

const impressVersions = {
  '1.0.0': impressV1_0_0,
  '1.1.0': impressV1_1_0,
  '2.0.0': impressV2_0_0,
};

export function getImpressJsForVersion(version) {
  return impressVersions[version] || impressVersions['2.0.0'];
}

function isAbsoluteUrl(url) {
  return /^(?:https?:\/\/|file:\/\/|asset:\/\/|data:|blob:)/.test(url);
}

export function rewriteMediaToHttp(html, serverUrl) {
  if (!serverUrl) return html;
  return html
    .replace(/(<(?:video|audio|source)[^>]*?\b(?:src|poster)=["'])(?!https?:\/\/|data:|blob:|asset:\/\/|file:\/\/|\/)([^"']+)(["'])/gi, function(m, pre, url, post) {
      var encoded = encodeURI(url);
      return pre + serverUrl + '/' + encoded + post;
    });
}

function rewriteRelativePath(url, baseDir) {
  if (!url || isAbsoluteUrl(url)) return url;
  var normalized = url.replace(/\\/g, '/');
  var fullPath;
  if (normalized.startsWith('/')) fullPath = normalized;
  else fullPath = baseDir + normalized;
  return 'asset://localhost/' + encodeURIComponent(fullPath);
}

export function rewriteRelativePaths(html, baseDir) {
  if (!baseDir) return html;
  return html
    .replace(/((?:src|poster)=["'])([^"']+)(["'])/g, function(m, pre, url, post) {
      return pre + rewriteRelativePath(url, baseDir) + post;
    })
    .replace(/((?:href|src)=["'])([^"']+)(["'])/g, function(m, pre, url, post) {
      return pre + rewriteRelativePath(url, baseDir) + post;
    })
    .replace(/(url\(["']?)([^)"']+)(["']?\))/g, function(m, pre, url, post) {
      return pre + rewriteRelativePath(url, baseDir) + post;
    });
}

export function getViewerHtml(impressContent, styleContent, impressVersion, baseDir) {
  var impressJs = getImpressJsForVersion(impressVersion || '2.0.0');
  if (baseDir) {
    impressContent = rewriteRelativePaths(impressContent, baseDir);
    if (styleContent) styleContent = rewriteRelativePaths(styleContent, baseDir);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>impressPlayer Viewer</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; }
    .step { padding: 40px; width: 100vw; height: 100vh; }
    .step h1 { font-size: 2.5em; margin-bottom: 0.5em; }
    .step h2 { font-size: 2em; margin-bottom: 0.5em; }
    .step h3 { font-size: 1.5em; margin-bottom: 0.5em; }
    .step p { font-size: 1.2em; line-height: 1.6; margin-bottom: 0.5em; }
  </style>
  <style>${normalizeCssSource}</style>
  ${styleContent ? `<style>${styleContent}</style>` : ''}
</head>
<body>
  <div id="container">
    ${impressContent}
  </div>
  <script>${impressJs}<\/script>
  <script>
    var isThumbnail = window.location.hash === '#thumbnail';
    impress().init();
    if (isThumbnail) {
      document.querySelectorAll('video, audio').forEach(function(el) { el.muted = true; el.pause(); });
    }
  <\/script>
  <script>
    if (!isThumbnail) {
      var stepList = [];

      function getStepList() {
        var steps = document.querySelectorAll('.step');
        stepList = Array.prototype.map.call(steps, function(el) {
          return {
            step: el.id,
            stepName: (el.querySelector('h1') && el.querySelector('h1').innerHTML) || ''
          };
        });
        return stepList;
      }

      function getCurrentSlide() {
        var active = document.querySelector('.active');
        return active ? active.id : null;
      }

      function sendEvent(name, payload) {
        window.parent.postMessage({ event: name, payload: payload }, '*');
      }

      var impressEl = document.getElementById('impress');

      function setupWebSlides() {
        var steps = document.querySelectorAll('.step[data-url]');
        Array.prototype.forEach.call(steps, function(step) {
          var url = step.getAttribute('data-url');
          if (!url) return;
          step.innerHTML = '';
          var iframe = document.createElement('iframe');
          iframe.src = url;
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
          iframe.style.cssText = 'width:100%;height:100%;border:none;position:absolute;top:0;left:0;';
          iframe.setAttribute('loading', 'lazy');
          step.style.position = 'relative';
          step.appendChild(iframe);
        });
      }

      impressEl.addEventListener('impress:stepenter', function() {
        sendEvent('controlsEnabled', true);
      });

      impressEl.addEventListener('impress:stepleave', function() {
        var current = getCurrentSlide();
        sendEvent('gotoSlide', current);
      });

      setupWebSlides();
      getStepList();
      var initialSlide = getCurrentSlide();
      sendEvent('stepList', { slides: stepList, current: initialSlide });

      window.addEventListener('message', function(event) {
        if (!event.data || !event.data.command) return;
        switch (event.data.command) {
          case 'nextSlide': impress().next(); break;
          case 'prevSlide': impress().prev(); break;
          case 'gotoSlide': impress().goto(event.data.payload); break;
          case 'setupEventHandlers':
            setupMediaEventListeners();
            break;
          case 'audioVideoControls':
            handleMediaCommand(event.data.payload);
            break;
        }
      });

      function setupMediaEventListeners() {
        var videos = document.querySelectorAll('video');
        Array.prototype.forEach.call(videos, function(video) {
          if (!video.getAttribute('preload')) video.setAttribute('preload', 'auto');
          var source = video.querySelector('source');
          if (source && !video.src && source.src) video.load();
          var step = video.closest('.step');
          if (step) {
            step.classList.add('hasVideo');
            addMediaEvent(step, video);
          }
        });
        var audios = document.querySelectorAll('audio');
        Array.prototype.forEach.call(audios, function(audio) {
          if (!audio.getAttribute('preload')) audio.setAttribute('preload', 'auto');
          var step = audio.closest('.step');
          if (step) {
            step.classList.add('hasAudio');
            addMediaEvent(step, audio);
          }
        });
      }

      function safePlay(media) {
        if (!media.paused) return;
        if (media.readyState < 2) {
          console.log('[impressPlayer] Not ready to play (readyState=' + media.readyState + '), waiting for canplay...');
          var onCanPlay = function() {
            media.removeEventListener('canplay', onCanPlay);
            if (media.paused) {
              media.play().catch(function(err) {
                console.log('[impressPlayer] Play after canplay failed: ' + err.message);
              });
            }
          };
          media.addEventListener('canplay', onCanPlay);
          return;
        }
        media.play().catch(function(err) {
          console.log('[impressPlayer] Play failed: ' + err.message);
        });
      }

      function addMediaEvent(mediaStep, media) {
        media.addEventListener('error', function(e) {
          var err = media.error;
          var msg = err ? ('MediaError code=' + err.code + ' message=' + err.message) : 'unknown error';
          console.log('[impressPlayer] Media error on ' + (media.currentSrc || media.src) + ': ' + msg);
        });
        media.addEventListener('stalled', function() {
          console.log('[impressPlayer] Media stalled: ' + (media.currentSrc || media.src));
        });
        media.addEventListener('waiting', function() {
          console.log('[impressPlayer] Media waiting/buffering: ' + (media.currentSrc || media.src));
        });
        mediaStep.addEventListener('impress:stepenter', function() {
          sendEvent('multimedia', 'on');
          safePlay(media);
        });
        mediaStep.addEventListener('impress:stepleave', function() {
          media.pause();
          sendEvent('multimedia', 'off');
        });
        media.addEventListener('timeupdate', function() {
          if (media.duration) sendEvent('mediaTime', (100 / media.duration) * media.currentTime);
        });
        media.addEventListener('playing', function() { sendEvent('audioVideoPlaying', 'on'); });
        media.addEventListener('pause', function() { sendEvent('audioVideoPlaying', 'off'); });
        media.addEventListener('loadedmetadata', function() {
          console.log('[impressPlayer] Media loaded: ' + (media.currentSrc || media.src) + ' duration=' + media.duration);
        });
        console.log('[impressPlayer] Media registered: ' + (media.currentSrc || media.src) + ' autoplay=' + media.autoplay);
      }

      function handleMediaCommand(payload) {
        var present = document.querySelector('.present');
        if (!present) return;
        var media = present.querySelector('video') || present.querySelector('audio');
        if (!media) return;
        var cmd = typeof payload === 'string' ? payload : (payload.command || payload);
        var data = payload.data;
        switch (cmd) {
          case 'playPause':
            if (media.paused) {
              safePlay(media);
            } else {
              media.pause();
            }
            break;
          case 'restart': media.load(); break;
          case 'pause': media.pause(); break;
          case 'play': safePlay(media); break;
          case 'seek': media.currentTime = media.duration * (data / 100); break;
        }
      }
    } else {
      window.addEventListener('message', function(event) {
        if (!event.data || !event.data.command) return;
        if (event.data.command === 'gotoSlide') {
          impress().goto(event.data.payload);
        }
      });
    }
  <\/script>
</body>
</html>`;
}

export function generateSlideThumbnails(impressContent, styleContent, baseDir) {
  if (baseDir) {
    impressContent = rewriteRelativePaths(impressContent, baseDir);
    if (styleContent) styleContent = rewriteRelativePaths(styleContent, baseDir);
  }
  var parser = new DOMParser();
  var doc = parser.parseFromString(impressContent, 'text/html');
  var steps = doc.querySelectorAll('.step');
  var thumbnails = {};
  var css = normalizeCssSource + '\n' + (styleContent || '') + '\nhtml,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;}.step{padding:20px;width:100%;height:100%;box-sizing:border-box;}';
  Array.prototype.forEach.call(steps, function(step) {
    var id = step.id;
    if (!id) return;
    thumbnails[id] = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<style>\n' + css + '\n</style>\n</head>\n<body>\n<div class="step">' + step.innerHTML + '</div>\n</body>\n</html>';
  });
  return thumbnails;
}
