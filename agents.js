import { initI18n, onLangChange, getLang, t } from './i18n.js';
import { initAsciiField } from './ascii-field.js';

const PRESET_NAMES = {
    salon: 'Lumière Nail & Beauty Studio',
    rental: 'DriveEasy Car Rental',
    restaurant: 'Casa Verde Bistro',
};

const MAX_CHARS = 500;
const MAX_HISTORY = 12;

// Motion — mirrors the tokens in style.css
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';
const DUR_FAST = 150;
const DUR_BASE = 300;
const WORD_STEP_MS = 35; // reveal speed for agent replies
const MAX_REVEAL_MS = 1400; // long replies speed up so they never drag

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const chat = document.querySelector('.chat');
const tabList = document.querySelector('.preset-tabs');
const tabs = Array.from(document.querySelectorAll('.preset-tab'));
const log = document.querySelector('.chat-log');
const nameEl = document.querySelector('.chat-business');
const suggestionsEl = document.querySelector('.chat-suggestions');
const form = document.querySelector('.chat-form');
const input = document.querySelector('.chat-input');
const sendBtn = document.querySelector('.chat-send');

let preset = 'salon';
let history = [];
let loading = false;
let indicator;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function animate(el, keyframes, options) {
    if (reducedMotion.matches || !el.animate) return Promise.resolve();
    return el.animate(keyframes, { fill: 'both', ...options }).finished.catch(() => {});
}

function scrollToEnd() {
    log.scrollTop = log.scrollHeight;
}

function addMessage(role, text, variant) {
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg--${role} chat-msg--enter`;
    if (variant) msg.classList.add(`chat-msg--${variant}`);
    msg.textContent = text;
    log.appendChild(msg);
    scrollToEnd();
    return msg;
}

// Agent reply appears word by word. Screen readers get the full text at once
// via the sr-only copy; the animated copy is hidden from them.
async function revealMessage(text) {
    if (reducedMotion.matches) return addMessage('agent', text);

    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg--agent chat-msg--enter';
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = text;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    msg.append(srText, visual);
    log.appendChild(msg);

    const parts = text.split(/(\s+)/);
    const words = parts.filter((p) => p.trim()).length;
    const step = Math.min(WORD_STEP_MS, MAX_REVEAL_MS / Math.max(words, 1));

    for (const part of parts) {
        if (!part) continue;
        if (!part.trim()) {
            visual.append(part);
            continue;
        }
        const word = document.createElement('span');
        word.className = 'chat-word';
        word.textContent = part;
        visual.appendChild(word);
        scrollToEnd();
        await wait(step);
    }
    return msg;
}

function addTyping() {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg--agent chat-msg--enter chat-typing';
    msg.setAttribute('aria-hidden', 'true');
    msg.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(msg);
    scrollToEnd();
    return msg;
}

async function removeTyping(el) {
    await animate(el, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.9)' }], {
        duration: DUR_FAST,
        easing: EASE_IN,
    });
    el.remove();
}

function renderSuggestions() {
    suggestionsEl.replaceChildren();
    t(`sugg.${preset}`).forEach((q, i) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chat-chip chat-chip--enter';
        chip.style.setProperty('--i', i);
        chip.textContent = q;
        chip.disabled = loading;
        chip.addEventListener('click', () => send(q));
        suggestionsEl.appendChild(chip);
    });
}

function updateControls() {
    sendBtn.disabled = loading || input.value.trim() === '';
    suggestionsEl.querySelectorAll('button').forEach((b) => (b.disabled = loading));
    chat.setAttribute('aria-busy', String(loading));
}

function reset() {
    history = [];
    log.replaceChildren();
    nameEl.textContent = PRESET_NAMES[preset];
    addMessage('agent', t(`greet.${preset}`));
    renderSuggestions();
    updateControls();
}

// Sliding pill behind the active tab
function moveIndicator(instant = false) {
    const active = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    if (!indicator || !active) return;
    indicator.classList.toggle('preset-indicator--instant', instant);
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.height = `${active.offsetHeight}px`;
    indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
}

async function selectPreset(id, focus = false) {
    if (loading || id === preset) return;
    preset = id;
    tabs.forEach((tab) => {
        const active = tab.dataset.preset === id;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
    });
    moveIndicator();

    const out = [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }];
    const into = [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }];
    await Promise.all([
        animate(log, out, { duration: DUR_FAST, easing: EASE_IN }),
        animate(nameEl, out, { duration: DUR_FAST, easing: EASE_IN }),
    ]);
    reset();
    animate(log, into, { duration: DUR_BASE, easing: EASE_OUT });
    animate(nameEl, into, { duration: DUR_BASE, easing: EASE_OUT });
}

function flySendIcon() {
    const icon = sendBtn.querySelector('svg');
    animate(
        icon,
        [
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(16px)', opacity: 0, offset: 0.45 },
            { transform: 'translateX(-16px)', opacity: 0, offset: 0.46 },
            { transform: 'translateX(0)', opacity: 1 },
        ],
        { duration: 520, easing: EASE_OUT },
    );
}

async function send(text, fromInput = false) {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || loading) return;

    flySendIcon();
    addMessage('user', content);
    history.push({ role: 'user', content });
    input.value = '';
    loading = true;
    updateControls();
    const typing = addTyping();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preset, lang: getLang(), messages: history.slice(-MAX_HISTORY) }),
        });
        const data = await res.json().catch(() => ({}));
        await removeTyping(typing);
        if (res.ok && data.reply) {
            history.push({ role: 'assistant', content: data.reply });
            await revealMessage(data.reply);
        } else {
            history.pop();
            addMessage('agent', t(res.status === 429 ? 'chat.error.rate' : 'chat.error.generic'), 'error');
        }
    } catch {
        await removeTyping(typing);
        history.pop();
        addMessage('agent', t('chat.error.generic'), 'error');
    } finally {
        loading = false;
        updateControls();
        if (fromInput) input.focus();
    }
}

initI18n();

const startField = () => initAsciiField(document.getElementById('field'), { stones: ['faq', 'booking', 'leads'], seed: 13 });
if (typeof requestIdleCallback === 'function') requestIdleCallback(startField, { timeout: 1200 });
else setTimeout(startField, 200);

if (chat) {
    indicator = document.createElement('span');
    indicator.className = 'preset-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    tabList.prepend(indicator);
    tabList.classList.add('preset-tabs--animated');

    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => selectPreset(tab.dataset.preset));
        tab.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            selectPreset(tabs[next].dataset.preset, true);
        });
    });

    // Tab labels change width with language and wrap on small screens
    const resizeObserver = new ResizeObserver(() => moveIndicator(true));
    [tabList, ...tabs].forEach((el) => resizeObserver.observe(el));

    input.addEventListener('input', updateControls);
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        send(input.value, true);
    });

    onLangChange(() => {
        // Greeting and chips follow the language; an ongoing conversation keeps its messages.
        if (history.length === 0) reset();
        else renderSuggestions();
    });

    reset();
    moveIndicator(true);
}
