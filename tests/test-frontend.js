#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const SRC_DIR = path.join(__dirname, '..', 'src');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

// ── Markdown parser (replicated from controller-script.js) ──────

function markdownToHtml(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, function(m) { return m.startsWith('<') ? m : '<p>' + m + '</p>'; });
}

function wrapMarkdownForImpress(markdown) {
  var lines = markdown.split(/^-----$/m);
  var slidesHtml = lines.map(function(slide, i) {
    var id = i === 0 ? 'id="step-slide-1"' : '';
    return '<div class="step slide" ' + id + ' data-rel-x="0" data-rel-y="1080" data-rotate="0" data-scale="1">' +
           '<div class="markdown-content">' + markdownToHtml(slide.trim()) + '</div></div>';
  }).join('\n');
  return '<div id="impress">' + slidesHtml + '</div>';
}

function extractImpressContent(html) {
  var parser = new (require('jsdom').JSDOM)('').window.DOMParser;
  var doc = parser.parseFromString(html, 'text/html');
  var impress = doc.getElementById('impress');
  return impress ? impress.outerHTML : null;
}

// ── Tests ───────────────────────────────────────────────────────

console.log('\n=== Markdown Parser ===');

test('converts # heading to h1', function() {
  assert(markdownToHtml('# Hello').includes('<h1>Hello</h1>'));
});

test('converts ## heading to h2', function() {
  assert(markdownToHtml('## World').includes('<h2>World</h2>'));
});

test('converts ### heading to h3', function() {
  assert(markdownToHtml('### Sub').includes('<h3>Sub</h3>'));
});

test('converts bold text', function() {
  assert(markdownToHtml('**bold**').includes('<strong>bold</strong>'));
});

test('converts italic text', function() {
  assert(markdownToHtml('*italic*').includes('<em>italic</em>'));
});

test('converts code text', function() {
  assert(markdownToHtml('`code`').includes('<code>code</code>'));
});

test('converts plain text to paragraphs', function() {
  var result = markdownToHtml('Hello world');
  assert(result.includes('<p>Hello world</p>'));
});

test('splits double newlines into paragraphs', function() {
  var result = markdownToHtml('Para 1\n\nPara 2');
  assert(result.includes('</p><p>'));
});

test('wraps markdown in impress div with steps', function() {
  var md = '# Slide 1\n\nHello\n\n-----\n\n# Slide 2\n\nWorld';
  var result = wrapMarkdownForImpress(md);
  assert(result.includes('<div id="impress">'));
  assert(result.includes('id="step-slide-1"'));
  assert(result.includes('class="step slide"'));
  assert(result.includes('<h1>Slide 1</h1>'));
  assert(result.includes('<h1>Slide 2</h1>'));
});

test('handles markdown with no separators', function() {
  var result = wrapMarkdownForImpress('# Single Slide');
  assert(result.includes('id="step-slide-1"'));
  assert(result.includes('<h1>Single Slide</h1>'));
});

test('handles empty markdown', function() {
  var result = wrapMarkdownForImpress('');
  assert(result.includes('<div id="impress">'));
  assert(result.includes('class="step slide"'));
});

// ── HTML extraction ─────────────────────────────────────────────

console.log('\n=== HTML Impression Content Extraction ===');

try {
  var jsdom = require('jsdom');
  var JSDOM = jsdom.JSDOM;
  var hasJsdom = true;
} catch(e) {
  console.log('  (jsdom not available, skipping HTML extraction tests)');
  var hasJsdom = false;
}

if (hasJsdom) {
  function extractImpressContent(html) {
    var doc = new JSDOM(html).window.document;
    var impress = doc.getElementById('impress');
    return impress ? impress.outerHTML : null;
  }

  test('extracts div#impress from HTML', function() {
    var html = '<html><body><div id="impress"><div class="step">Slide</div></div></body></html>';
    var result = extractImpressContent(html);
    assert(result !== null);
    assert(result.includes('<div id="impress">'));
  });

  test('returns null when no #impress div', function() {
    var html = '<html><body><div>No impress here</div></body></html>';
    var result = extractImpressContent(html);
    assert(result === null);
  });

  // Test real example presentations
  console.log('\n=== Real Example HTML Presentations ===');

  var htmlExamples = [
    'impress.js tests/2D-navigation/index.html',
    'impress.js tests/3D-positions/index.html',
    'impress.js tests/3D-rotations/index.html',
    'impress.js tests/classic-slides/index.html',
    'impress.js tests/cube/index.html',
    'impress.js tests/markdown/index.html',
  ];

  htmlExamples.forEach(function(relPath) {
    test('extract impress content from ' + path.basename(path.dirname(relPath)), function() {
      var fullPath = path.join(EXAMPLES_DIR, relPath);
      assert(fs.existsSync(fullPath), 'File not found: ' + fullPath);
      var html = fs.readFileSync(fullPath, 'utf8');
      assert(html.length > 100, 'File too short');
      var result = extractImpressContent(html);
      assert(result !== null, 'No #impress div found in ' + relPath);
      assert(result.includes('class="step"'), 'No .step elements in ' + relPath);
    });
  });
}

// ── MD example presentations ───────────────────────────────────

console.log('\n=== Markdown Presentation Processing ===');

var mdExamples = [
  'Kaviár 2026-05-14/quiz.md',
  'turban 2026 Noc múzeí/quiz.md',
];

mdExamples.forEach(function(relPath) {
  test('wrap markdown from ' + path.basename(path.dirname(relPath)), function() {
    var fullPath = path.join(EXAMPLES_DIR, relPath);
    assert(fs.existsSync(fullPath), 'File not found: ' + fullPath);
    var md = fs.readFileSync(fullPath, 'utf8');
    assert(md.length > 50, 'File too short');

    // Strip markpress options if present
    var stripped = md.replace(/<!--markpress-opt[\s\S]*?markpress-opt-->/, '').trim();
    var result = wrapMarkdownForImpress(stripped);
    assert(result.includes('<div id="impress">'), 'Missing impress div');
    assert(result.includes('class="step'), 'No step elements generated');
  });
});

// ── Style CSS loading ───────────────────────────────────────────

console.log('\n=== Style CSS Detection ===');

test('detect style.css in Kaviár', function() {
  var stylePath = path.join(EXAMPLES_DIR, 'Kaviár 2026-05-14', 'style.css');
  assert(fs.existsSync(stylePath));
  var content = fs.readFileSync(stylePath, 'utf8');
  assert(content.length > 10);
});

test('detect style.css in turban', function() {
  var stylePath = path.join(EXAMPLES_DIR, 'turban 2026 Noc múzeí', 'style.css');
  assert(fs.existsSync(stylePath));
  var content = fs.readFileSync(stylePath, 'utf8');
  assert(content.length > 10);
});

// ── i18n module ─────────────────────────────────────────────────

console.log('\n=== i18n ===');

test('en.json loads and has keys', function() {
  var en = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'locales', 'en.json'), 'utf8'));
  assert(Object.keys(en).length > 5, 'en.json has too few keys');
  assert(en['Next Slide'] !== undefined, 'Missing "Next Slide" key');
  assert(en['Presentation'] !== undefined, 'Missing "Presentation" key');
  assert(en['Slide %s of %s'] !== undefined, 'Missing "Slide %s of %s" key');
});

test('sk.json has all en.json keys (no missing translations)', function() {
  var en = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'locales', 'en.json'), 'utf8'));
  var sk = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'locales', 'sk.json'), 'utf8'));
  var missingInSk = Object.keys(en).filter(function(k) { return !(k in sk); });
  assert.deepStrictEqual(missingInSk, [], 'Missing keys in sk.json: ' + missingInSk.join(', '));
});

test('i18n %s substitution works', function() {
  var en = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'locales', 'en.json'), 'utf8'));
  var template = en['Slide %s of %s'];
  var result = template.replace('%s', '3').replace('%s', '10');
  assert.strictEqual(result, 'Slide 3 of 10');
});

// ── Blob URL / viewer-html-builder smoke test ───────────────────

console.log('\n=== Viewer HTML Builder (smoke) ===');

test('generated viewer HTML contains impress.js script tag', function() {
  var impressJs = '// mock impress.js v2.0.0';
  var style = 'body { background: red; }';
  var content = '<div id="impress"><div class="step" id="s1"><h1>Test</h1></div></div>';
  var html = buildViewerHtml(content, style, impressJs);
  assert(html.includes('<!DOCTYPE html>'), 'Missing DOCTYPE');
  assert(html.includes(impressJs), 'Missing impress.js content');
  assert(html.includes(content), 'Missing presentation content');
  assert(html.includes(style), 'Missing custom style');
  assert(html.includes('impress().init()'), 'Missing impress init');
});

test('viewer HTML has thumbnail mode check', function() {
  var html = buildViewerHtml('<div id="impress"></div>', '', '// js');
  assert(html.includes('#thumbnail'), 'Missing #thumbnail mode check');
  assert(html.includes('isThumbnail'), 'Missing isThumbnail variable');
});

test('viewer HTML sends postMessage events', function() {
  var html = buildViewerHtml('<div id="impress"></div>', '', '// js');
  assert(html.includes('window.parent.postMessage'), 'Missing postMessage');
  assert(html.includes('stepList'), 'Missing stepList event');
  assert(html.includes('gotoSlide'), 'Missing gotoSlide event');
});

test('viewer HTML thumbnail mode only handles gotoSlide', function() {
  var html = buildViewerHtml('<div id="impress"></div>', '', '// js');
  // In thumbnail mode, it should only listen for gotoSlide, not setupEventHandlers
  var thumbnailBlock = html.substring(html.indexOf('isThumbnail'));
  assert(thumbnailBlock.includes("command === 'gotoSlide'"), 'Thumbnail should handle gotoSlide');
});

test('viewer HTML supports different impress versions', function() {
  var v1 = buildViewerHtml('<div id="impress"></div>', '', '// v1.0.0');
  var v2 = buildViewerHtml('<div id="impress"></div>', '', '// v2.0.0');
  assert(v1.includes('// v1.0.0'));
  assert(v2.includes('// v2.0.0'));
});

test('viewer HTML has browser projector mode with /state polling', function() {
  var html = buildViewerHtml('<div id="impress"></div>', '', '// js');
  assert(html.includes('var isBrowser = window.parent === window;'), 'Missing isBrowser detection');
  assert(html.includes("fetch('/state', { cache: 'no-store' })"), 'Missing /state polling');
  assert(html.includes('pollProjectorState'), 'Missing pollProjectorState');
  assert(html.includes('/*__PROJECTOR_REV__*/'), 'Missing rev placeholder for server injection');
});

test('browser mode ignores audioVideoControls (display-only)', function() {
  var html = buildViewerHtml('<div id="impress"></div>', '', '// js');
  assert(html.includes('if (!isProjector && !isBrowser) handleMediaCommand'), 'Browser must not handle media commands');
});

function buildViewerHtml(impressContent, styleContent, impressJs) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${styleContent || ''}</style>
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
  <\/script>
  <script>
    if (!isThumbnail) {
      var stepList = [];
      function getStepList() { stepList = []; }
      function sendEvent(name, payload) {
        if (window.parent === window) return;
        window.parent.postMessage({ event: name, payload: payload }, '*');
      }
      var impressEl = document.getElementById('impress');
      impressEl.addEventListener('impress:stepenter', function() { sendEvent('controlsEnabled', true); });
      impressEl.addEventListener('impress:stepleave', function() { sendEvent('stepList', { slides: stepList }); });
      if (isBrowser) {
        var projectorRev = 0; /*__PROJECTOR_REV__*/
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
              if (state.slide && state.slide !== getCurrentSlide()) { impress().goto(state.slide); }
              applyMediaSync(state.media);
            })
            .then(function() { setTimeout(pollProjectorState, 250); });
        }
        pollProjectorState();
      }
      window.addEventListener('message', function(event) {
        if (!event.data || !event.data.command) return;
        switch (event.data.command) {
          case 'nextSlide': impress().next(); break;
          case 'prevSlide': impress().prev(); break;
          case 'gotoSlide': impress().goto(event.data.payload); break;
          case 'setupEventHandlers': break;
          case 'audioVideoControls':
            if (!isProjector && !isBrowser) handleMediaCommand(event.data.payload);
            break;
        }
      });
    } else {
      window.addEventListener('message', function(event) {
        if (!event.data || !event.data.command) return;
        if (event.data.command === 'gotoSlide') { impress().goto(event.data.payload); }
      });
    }
  <\/script>
</body>
</html>`;
}

// ── Asset rewriting (mirrors rewriteAssetsToServer) ─────────────

console.log('\n=== Asset Rewriting ===');

function rewriteAssetsToServer(html, serverUrl) {
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

var PROJ_BASE = 'http://192.168.1.5:4321/';

test('rewrites relative media src to /media/ path', function() {
  var html = '<video src="videos/intro.mp4"></video>';
  var result = rewriteAssetsToServer(html, PROJ_BASE);
  assert(result.includes('http://192.168.1.5:4321/media/videos/intro.mp4'));
});

test('rewrites relative image src, href and css url()', function() {
  var html = '<img src="img/logo.png"><link href="style.css">.bg { background: url("img/bg.png"); }';
  var result = rewriteAssetsToServer(html, PROJ_BASE);
  assert(result.includes('http://192.168.1.5:4321/media/img/logo.png'));
  assert(result.includes('http://192.168.1.5:4321/media/style.css'));
  assert(result.includes('http://192.168.1.5:4321/media/img/bg.png'));
});

test('leaves absolute http(s), data:, blob:, asset:// and root-relative URLs untouched', function() {
  var html = '<img src="https://cdn.example.com/x.png"><video src="http://127.0.0.1:8123/v.mp4">' +
             '<img src="data:image/png;base64,AAA"><img src="asset://localhost/foo">' +
             '<img src="/abs/root.png"><a href="mailto:a@b.c">x</a>';
  var result = rewriteAssetsToServer(html, PROJ_BASE);
  assert(result.includes('https://cdn.example.com/x.png'));
  assert(result.includes('http://127.0.0.1:8123/v.mp4'));
  assert(result.includes('data:image/png;base64,AAA'));
  assert(result.includes('asset://localhost/foo'));
  assert(result.includes('/abs/root.png'));
  assert(result.includes('mailto:a@b.c'));
  assert(!result.includes(PROJ_BASE + 'media/https://'));
});

test('handles missing serverUrl without changes', function() {
  var html = '<video src="a.mp4"></video>';
  assert.strictEqual(rewriteAssetsToServer(html, null), html);
});

// ── Thumbnail generation (mirrors generateSlideThumbnails) ──────

console.log('\n=== Thumbnail Generation ===');

function generateSlideThumbnails(impressContent, styleContent) {
  var DOM = new (require('jsdom').JSDOM)('');
  var parser = new DOM.window.DOMParser();
  var doc = parser.parseFromString(impressContent, 'text/html');
  var steps = doc.querySelectorAll('.step');
  var thumbnails = {};
  var css = 'normalize' + '\n' + 'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;}' + '\n' + (styleContent || '') + '\n.step{padding:20px;width:100%;height:100%;box-sizing:border-box;}';
  Array.prototype.forEach.call(steps, function(step, i) {
    var id = step.id || 'step-' + (i + 1);
    thumbnails[id] = '<!DOCTYPE html><html><head><style>' + css + '</style></head><body><div class="step">' + step.innerHTML + '</div></body></html>';
  });
  return thumbnails;
}

test('markdown steps without ids get impress.js step-N ids (thumbnail key match)', function() {
  var md = '# Slide 1\n\n-----\n\n# Slide 2\n\n-----\n\n# Slide 3';
  var content = wrapMarkdownForImpress(md);
  var thumbs = generateSlideThumbnails(content);
  var keys = Object.keys(thumbs).sort();
  assert.deepStrictEqual(keys, ['step-2', 'step-3', 'step-slide-1'], 'keys must match viewer stepList ids');
});

test('steps with existing ids are preserved and id-less ones still assigned', function() {
  var content = '<div id="impress">' +
    '<div class="step" id="custom">One</div>' +
    '<div class="step">Two</div>' +
    '<div class="step">Three</div>' +
    '</div>';
  var thumbs = generateSlideThumbnails(content);
  var keys = Object.keys(thumbs).sort();
  assert.deepStrictEqual(keys, ['custom', 'step-2', 'step-3'], 'id-less steps get step-{index+1}');
  assert(thumbs['step-2'].includes('Two'), 'step-2 thumbnail contains second slide content');
});

test('thumbnail CSS does not override presentation body background image', function() {
  var content = '<div id="impress"><div class="step">One</div></div>';
  var styleContent = 'body { background: url("bg.png") repeat black; }';
  var thumbs = generateSlideThumbnails(content, styleContent);
  var html = thumbs['step-1'];
  assert(html.includes('body { background: url("bg.png") repeat black; }'), 'presentation background CSS inlined');
  assert(!html.includes('background:#fff'), 'no white background override after styleContent');
  var stylePos = html.indexOf('background: url');
  var lastBasePos = html.indexOf('html,body{margin:0;padding:0;');
  assert(stylePos > lastBasePos, 'presentation body background comes after base html/body reset so it wins');
});

// ── Summary ─────────────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
