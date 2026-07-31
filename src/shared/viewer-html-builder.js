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

export function rewriteAssetsToServer(html, serverUrl) {
  if (!serverUrl) return html;
  var base = serverUrl.replace(/\/+$/, '') + '/media/';
  return html
    .replace(/((?:src|poster)=["'])(?!https?:\/\/|mailto:|tel:|data:|blob:|asset:\/\/|file:\/\/|\/)([^"']+)(["'])/g, function(m, pre, url, post) {
      return pre + base + url + post;
    })
    .replace(/((?:href|src)=["'])(?!https?:\/\/|mailto:|tel:|data:|blob:|asset:\/\/|file:\/\/|\/)([^"']+)(["'])/g, function(m, pre, url, post) {
      return pre + base + url + post;
    })
    .replace(/(url\(["']?)(?!https?:\/\/|data:|blob:|asset:\/\/|file:\/\/|\/)([^)"']+)(["']?\))/g, function(m, pre, url, post) {
      return pre + base + url + post;
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
    var isProjector = window.location.hash === '#projector';
    var isBrowser = window.parent === window;
    impress().init();
    if (isThumbnail || isProjector) {
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
        if (window.parent === window) return;
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
            if (!isProjector && !isBrowser) handleMediaCommand(event.data.payload);
            break;
          case 'mediaSync':
            applyMediaSync(event.data.payload);
            break;
        }
      });

      if (isBrowser) {
        var projectorRev = 0; /*__PROJECTOR_REV__*/
        setupMediaEventListeners();
        function pollProjectorState() {
          fetch('/state', { cache: 'no-store' })
            .then(function(r) { return r.json(); })
            .then(function(state) {
              if (!state) return;
              if (typeof state.rev === 'number' && state.rev !== projectorRev) {
                projectorRev = state.rev;
                location.reload();
                return;
              }
              if (state.slide && state.slide !== getCurrentSlide()) {
                impress().goto(state.slide);
              }
              applyMediaSync(state.media);
            })
            .catch(function(err) {
              console.log('[impressPlayer] Projector state poll failed: ' + err.message);
            })
            .then(function() {
              setTimeout(pollProjectorState, 250);
            });
        }
        pollProjectorState();
      }

      var mediaListenersAttached = false;

      function startMediaStep(mediaStep, media) {
        if (isProjector || isBrowser) return;
        sendEvent('multimedia', 'on');
        sendEvent('mediaSync', { time: media.currentTime, playing: !media.paused });
        safePlay(media);
        if (mediaStep._syncTimer) clearInterval(mediaStep._syncTimer);
        mediaStep._syncTimer = setInterval(function() {
          sendEvent('mediaSync', { time: media.currentTime, playing: !media.paused });
        }, 1000);
      }

      function stopMediaStep(mediaStep, media) {
        media.pause();
        if (mediaStep._syncTimer) {
          clearInterval(mediaStep._syncTimer);
          mediaStep._syncTimer = null;
        }
        if (!isProjector) sendEvent('multimedia', 'off');
      }

      function setupMediaEventListeners() {
        if (mediaListenersAttached) return;
        mediaListenersAttached = true;
        if (isProjector) {
          Array.prototype.forEach.call(document.querySelectorAll('video, audio'), function(media) { media.muted = true; });
        }
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
        var present = document.querySelector('.present');
        if (present) {
          var media = present.querySelector('video') || present.querySelector('audio');
          if (media) startMediaStep(present, media);
        }
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
          startMediaStep(mediaStep, media);
        });
        mediaStep.addEventListener('impress:stepleave', function() {
          stopMediaStep(mediaStep, media);
        });
        media.addEventListener('timeupdate', function() {
          if (media.duration && isFinite(media.duration)) {
            sendEvent('mediaTime', (100 / media.duration) * media.currentTime);
          }
          sendEvent('mediaSync', { time: media.currentTime, playing: !media.paused });
        });
        media.addEventListener('playing', function() {
          sendEvent('audioVideoPlaying', 'on');
          sendEvent('mediaSync', { time: media.currentTime, playing: true });
        });
        media.addEventListener('pause', function() {
          sendEvent('audioVideoPlaying', 'off');
          sendEvent('mediaSync', { time: media.currentTime, playing: false });
        });
        media.addEventListener('ended', function() {
          sendEvent('audioVideoPlaying', 'off');
          sendEvent('mediaSync', { time: media.currentTime, playing: false });
        });
        media.addEventListener('seeked', function() {
          sendEvent('mediaSync', { time: media.currentTime, playing: !media.paused });
        });
        media.addEventListener('loadedmetadata', function() {
          console.log('[impressPlayer] Media loaded: ' + (media.currentSrc || media.src) + ' duration=' + media.duration);
        });
        console.log('[impressPlayer] Media registered: ' + (media.currentSrc || media.src) + ' autoplay=' + media.autoplay);
      }

      function applyMediaSync(sync) {
        if (!sync) return;
        var present = document.querySelector('.present');
        if (!present) return;
        var media = present.querySelector('video') || present.querySelector('audio');
        if (!media) return;
        if (sync.playing && media.paused) {
          media.play().catch(function(err) {
            console.log('[impressPlayer] Sync play failed: ' + err.message);
          });
        } else if (sync.playing === false && !media.paused) {
          media.pause();
        }
        if (typeof sync.time === 'number' && Math.abs(media.currentTime - sync.time) > 0.75) {
          media.currentTime = sync.time;
        }
      }

      function handleMediaCommand(payload) {
        if (isProjector) return;
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
          case 'restart':
            media.pause();
            media.currentTime = 0;
            sendEvent('mediaTime', 0);
            sendEvent('audioVideoPlaying', 'off');
            sendEvent('mediaSync', { time: 0, playing: false });
            var onSeeked = function() {
              media.removeEventListener('seeked', onSeeked);
              safePlay(media);
            };
            media.addEventListener('seeked', onSeeked);
            setTimeout(function() {
              media.removeEventListener('seeked', onSeeked);
              safePlay(media);
            }, 150);
            break;
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
  var css = normalizeCssSource + '\n' + 'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;}' + '\n' + (styleContent || '') + '\n.step{padding:20px;width:100%;height:100%;box-sizing:border-box;}';
  Array.prototype.forEach.call(steps, function(step, i) {
    var id = step.id || 'step-' + (i + 1);
    thumbnails[id] = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<style>\n' + css + '\n</style>\n</head>\n<body>\n<div class="step">' + step.innerHTML + '</div>\n</body>\n</html>';
  });
  return thumbnails;
}
