const remote = require('electron').remote,
  ipc = require('electron').ipcRenderer,
  path = remote.require('path'),
  fs = remote.require('fs'),
  DecompressZip = require('decompress-zip'),
  ms = require('mustache'),
  userPath = app.getPath('userData'),
  i18n = remote.getGlobal('globalObject').i18n;

var md = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true
});

/*
var MarkdownIt = require('markdown-it'),
  md = new MarkdownIt();
md.set({
  html: true,
  breaks: false
});*/

ipc.on('loadUI', (_event) => {
  loadUI();
});

ipc.on('loadFile', (_event, file) => {
  loadProjectionFile(file);
});

function loadUI() {
  mustacheOptions = {
    "dirname": __dirname,
    "usrPath": app.getPath('userData'),
    "appPath": app.getAppPath(),
    "jsPath": path.resolve(app.getAppPath(), "./js"),
    "controllerPath": JSON.stringify(path.resolve(app.getAppPath(), "./js/controller-script.js")),
    "projectorPath": JSON.stringify(path.resolve(app.getAppPath(), "./js/projector-script.js")),
    "i18n": function() { // This is a function that translates {{{i18n}}} strings found in templates.
      return function(text, render) {
        return render(i18n.__(text));
      };
    }
  };

  fs.readFile(path.resolve(__dirname, '../templates/controller.tpl'), 'utf8', (err, tplController) => { // Read controller.tpl (main controller interface) asynchronously
    if (err) throw err;
    let localeController = ms.render(tplController, mustacheOptions);
    fs.writeFile(userPath + '/controller.html', localeController, (err) => {
      if (err) throw err;
      ipc.send('uiReady', 'controller');
    });
  });

  /* Render projector template (async) and create a window after that */
  fs.readFile(path.resolve(__dirname, '../templates/projector.tpl'), 'utf8', (err, tplProjector) => {
    let localeProjector = ms.render(tplProjector, mustacheOptions);
    if (err) throw err;
    fs.writeFile(userPath + '/projector.html', localeProjector, (err) => {
      if (err) throw err;
      ipc.send('uiReady', 'projector');
    });
  });

  /* Render a fake viewer.html to be used on first run */
  fs.readFile(path.resolve(__dirname, '../templates/viewer-fake.tpl'), 'utf8', (err, tplViewerFake) => {
    localeViewerFake = ms.render(tplViewerFake, mustacheOptions);
    if (err) throw err;
    fs.writeFile(path.resolve(app.getPath('userData'), userPath + '/viewer.html'), localeViewerFake, (err) => {
      if (err) throw err;
    });
    fs.writeFile(path.resolve(app.getPath('userData'), userPath + '/previewer.html'), localeViewerFake, (err) => {
      if (err) throw err;
    });
  });
}

function loadProjectionFile(file) {
  fs.readFile(file, 'utf-8', (err, data) => {
    if (err) {
      alert(i18n.__("An error ocurred reading the file :") + err.message);
      return;
    }
    let el;
    switch (path.extname(file)) {
      case ".md":
      case ".mkd":
      case ".markdown":
        parseProjection(encapsulateMarkdown(data), file);
        break;
      case ".html":
      case ".htm":
        let parser = new DOMParser();
        el = parser.parseFromString(data, "text/html");
        parseProjection(el, file);
        break;
      case ".zip":
        let destinationPath = app.getPath('userData');
        let unzipper = new DecompressZip(file);

        // Add the error event listener
        unzipper.on('error', function(err) {
          ipc.send('saveLogs', i18n.__('Unzip with decompress-zip failed'), err);
        });

        // Notify when everything is extracted
        unzipper.on('extract', function(log) {
          subfile = path.resolve(destinationPath, log[0].folder, 'impress.md');
          subdata = fs.readFileSync(subfile, 'utf8');
          parseProjection(encapsulateMarkdown(subdata), file);
        });

        // Start extraction of the content
        unzipper.extract({
          path: destinationPath
        });
        break;
      default:
        ipc.send('saveLogs', i18n.__("Something went wrong. Wrong file is loaded."));
    }
  });

}

function encapsulateMarkdown(data) {
  let div = "<div id='impress'><div id='markdown' class='step slide markdown' data-rel-x='0' data-rel-y='1080'></div></div>", //
    parser = new DOMParser(),
    dom = parser.parseFromString(div, "text/html");
  dom.getElementById("markdown").innerHTML = data;

  return dom;
}

function parseProjection(el, file) {
  /* We parse the impress presentation file into own template.
  It is to make sure the stylesheets are loaded in proper order
  and no additional javascript is loaded (such as custom impress.js).*/
  let css = "",
    printcss = "",
    extcss = "",
    styles,
    viewerDOM = loadViewerDOM();
  /*
    styles = el.getElementsByTagName("style");
    for (let i = 0; i < styles.length; i++) { // This loads inline stylesheets from html / css file
      if (styles[i].media == "print") {
        printcss += styles[i].innerHTML;
      } else {
        css += styles[i].innerHTML;
      }
    }*/
  if (fs.existsSync(path.dirname(file) + "/style.css")) { // This is the external stylesheet. We look for style.css placed in the same folder as the presentation file is.
    extcss = path.dirname(file) + "/style.css";
  }

  if (fs.existsSync(path.resolve(app.getAppPath(), './css/impress-normalize.css'))) { // This is the external stylesheet. We look for style.css placed in the same folder as the presentation file is.
    normcss = path.resolve(app.getAppPath(), './css/impress-normalize.css');
  }
  /*extcss = "";
  normcss = "";
*/
  try {
    html = el.getElementById("impress").outerHTML; // Grab <div id="impress">...</div> and place it inside our template.
  } catch (err) {
    ipc.send('saveLogs', "There is a problem with a file you selected");
    return;
  }
  let dataPath = path.dirname(file) + "/"; // Baseurl for the presentation (for relative links to work inside presentation)
  let impressPath = path.resolve(__dirname, "impressjs/impress.js"); // We load impress.js separately (with absolute path)
  let viewerPath = path.resolve(__dirname, "viewer-script.js"); // This is the script for impressPlayer Controller to work.

  viewerDOM.getElementById("baseTag").setAttribute("href", dataPath);
  viewerDOM.getElementById("container").innerHTML = html;
  viewerDOM.getElementById("defaultStyleBox").innerHTML = css;
  viewerDOM.getElementById("printStyleBox").innerHTML = printcss;
  viewerDOM.getElementById("projectionStyleLink").setAttribute('href', extcss);
  viewerDOM.getElementById("normalizeStyleLink").setAttribute('href', normcss);
  viewerDOM.getElementById("impressScript").setAttribute('src', impressPath);
  viewerDOM.getElementById("bottomScript").innerHTML = "window.markdown = false; impress().init(); require(" + JSON.stringify(viewerPath) + ");";

  saveViewer(viewerDOM); // Finally put it all into the template and loadProjection. I am considering migration of this function to mustache. It is probably much faster.

}

function loadViewerDOM() {
  let tplViewerHTML = fs.readFileSync(path.resolve(app.getAppPath(), './templates/viewer.tpl'), 'utf8'),
    parser = new DOMParser(),
    viewerDOM = parser.parseFromString(tplViewerHTML, "text/html");
  return viewerDOM;
}


function parseMarkdown(viewerDOM) {

  var markdownDivs = viewerDOM.querySelectorAll(".markdown");

  for (var idx = 0; idx < markdownDivs.length; idx++) {
    var element = markdownDivs[idx];
    var slides = element.innerHTML.split(/^-----$/m);
    var i = slides.length - 1;
    element.innerHTML = md.render(slides[i]);

    //element.innerHTML = element.innerHTML.replace(/<p>\s*<\/p>/g, "")

    // If there's an id, unset it for last, and all other, elements,
    // and then set it for the first.
    var id = null;
    if (element.id) {
      id = element.id;
      element.id = "";
    }
    i--;
    while (i >= 0) {
      var newElement = element.cloneNode(false);
      newElement.innerHTML = md.render(slides[i]);
      //    newElement.innerHTML = newElement.innerHTML.replace(/<p>\s*<\/p>/g, "")
      element.parentNode.insertBefore(newElement, element);
      element = newElement;
      i--;
    }
    if (id !== null) {
      element.id = id;
    }
  }

  return viewerDOM
} // Markdown

function removeMultimedia(domData) { // Removes multimedia from previewer.html for previewers to spend less ram.
  let videoPreview = domData.createElement('div');
  videoPreview.classList.add("videoPreview");
  videoPreview.innerHTML += "Video";
  videos = domData.getElementsByTagName("video");
  for (i = 0; i < videos.length; i++) {
    videos[i].parentNode.replaceChild(videoPreview, videos[i]);
  }
  return domData;
}

function saveViewer(viewerDOM) {
  viewerDOM = parseMarkdown(viewerDOM);
  let serializer = new XMLSerializer();
  fs.writeFile(path.resolve(app.getPath('userData'), './viewer.html'), serializer.serializeToString(viewerDOM), (err) => {
    if (err) throw err;
    ipc.send('loadProjection');
  });
  let previewerDOM = removeMultimedia(viewerDOM);
  fs.writeFile(path.resolve(app.getPath('userData'), './previewer.html'), serializer.serializeToString(previewerDOM), (err) => {
    if (err) throw err;
    ipc.send('loadPreviews');
  });

}
