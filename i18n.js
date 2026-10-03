// Site-wide EN/ES/RU i18n.
// data-i18n="key"            → textContent
// data-i18n-html="key"       → innerHTML (trusted dictionary strings only)
// data-i18n-attr="attr:key;…" → attributes
// The initial language is picked by the inline script in each page's <head>
// (?lang= → saved choice → browser language → en) and stored on <html lang>.

import en from './locales/en.js';
import es from './locales/es.js';
import ru from './locales/ru.js';

const STORAGE_KEY = 'ts-lang';
const dict = { en, es, ru };
export const LANGS = Object.keys(dict);

const listeners = new Set();
let current = detectLang();

function detectLang() {
    const fromHead = document.documentElement.lang;
    if (dict[fromHead]) return fromHead;
    const short = (navigator.language || '').slice(0, 2).toLowerCase();
    return dict[short] ? short : 'en';
}

function persist(lang) {
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch {
        // storage unavailable — the choice just won't persist
    }
}

export function getLang() {
    return current;
}

export function t(key) {
    return dict[current][key] ?? dict.en[key] ?? key;
}

export function applyI18n(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-html]').forEach((el) => {
        el.innerHTML = t(el.dataset.i18nHtml);
    });
    root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
        el.dataset.i18nAttr.split(';').forEach((pair) => {
            const [attr, key] = pair.split(':').map((s) => s.trim());
            if (attr && key) el.setAttribute(attr, t(key));
        });
    });
    root.querySelectorAll('.lang-switch button[data-lang]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.lang === current));
    });
    document.documentElement.lang = current;
    document.documentElement.classList.remove('i18n-pending');
}

export function setLang(lang) {
    if (!dict[lang] || lang === current) return;
    current = lang;
    persist(lang);
    // Drop ?lang= so the URL doesn't override the new choice on reload
    const url = new URL(location.href);
    if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        history.replaceState(null, '', url);
    }
    applyI18n();
    listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
    listeners.add(fn);
}

export function initI18n() {
    if (new URLSearchParams(location.search).has('lang')) persist(current);
    document.querySelectorAll('.lang-switch button[data-lang]').forEach((btn) => {
        btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
    applyI18n();
}
