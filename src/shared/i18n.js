import en from '../locales/en.json';
import sk from '../locales/sk.json';

const locales = { en, sk };
let currentLocale = 'en';

export function setLocale(lang) {
  if (locales[lang]) {
    currentLocale = lang;
  }
}

export function getLocale() {
  return currentLocale;
}

export function __(text, ...args) {
  let translated = locales[currentLocale][text] || locales['en'][text] || text;
  if (args.length > 0) {
    args.forEach(function(arg, i) {
      translated = translated.replace('%s', arg);
    });
  }
  return translated;
}

export function detectLocale() {
  var lang = navigator.language || navigator.userLanguage || 'en';
  if (lang.startsWith('sk')) {
    currentLocale = 'sk';
  } else {
    currentLocale = 'en';
  }
  return currentLocale;
}

export function applyTranslations() {
  var elements = document.querySelectorAll('[data-i18n]');
  Array.prototype.forEach.call(elements, function(el) {
    var key = el.getAttribute('data-i18n');
    el.textContent = __(key);
  });
  var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
  Array.prototype.forEach.call(placeholders, function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', __(key));
  });
}
