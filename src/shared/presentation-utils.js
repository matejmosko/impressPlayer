import markdownIt from 'markdown-it';

var md = markdownIt({
  html: true,
  linkify: true,
  typographer: false
});

export function wrapMarkdownForImpress(markdown) {
  var lines = markdown.split(/^-----$/m);
  var slidesHtml = lines.map(function(slide, i) {
    var id = i === 0 ? 'id="step-slide-1"' : '';
    return '<div class="step slide" ' + id + ' data-rel-x="0" data-rel-y="1080" data-rotate="0" data-scale="1">' +
           '<div class="markdown-content">' + md.render(slide.trim()) + '</div></div>';
  }).join('\n');
  return '<div id="impress">' + slidesHtml + '</div>';
}

export function markdownToHtml(text) {
  return md.render(text);
}

export function extractImpressContent(html) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');
  var impress = doc.getElementById('impress');
  return impress ? impress.outerHTML : '<div id="impress"><div class="step" data-rel-x="0" data-rel-y="0"><h1>Presentation</h1></div></div>';
}
