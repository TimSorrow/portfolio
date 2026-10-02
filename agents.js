import { initI18n, onLangChange, getLang, t } from './i18n.js';

const PRESET_NAMES = {
    salon: 'Lumière Nail & Beauty Studio',
    rental: 'DriveEasy Car Rental',
    restaurant: 'Casa Verde Bistro',
};

const MAX_CHARS = 500;
const MAX_HISTORY = 12;

const chat = document.querySelector('.chat');
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

function addMessage(role, text, variant) {
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg--${role}`;
    if (variant) msg.classList.add(`chat-msg--${variant}`);
    msg.textContent = text;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
}

function addTyping() {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg--agent chat-typing';
    msg.setAttribute('aria-hidden', 'true');
    msg.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
}

function renderSuggestions() {
    suggestionsEl.replaceChildren();
    t(`sugg.${preset}`).forEach((q) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chat-chip';
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

function selectPreset(id, focus = false) {
    if (loading) return;
    preset = id;
    tabs.forEach((tab) => {
        const active = tab.dataset.preset === id;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
    });
    reset();
}

async function send(text, fromInput = false) {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || loading) return;

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
        typing.remove();
        if (res.ok && data.reply) {
            history.push({ role: 'assistant', content: data.reply });
            addMessage('agent', data.reply);
        } else {
            history.pop();
            addMessage('agent', t(res.status === 429 ? 'chat.error.rate' : 'chat.error.generic'), 'error');
        }
    } catch {
        typing.remove();
        history.pop();
        addMessage('agent', t('chat.error.generic'), 'error');
    } finally {
        loading = false;
        updateControls();
        if (fromInput) input.focus();
    }
}

initI18n();

if (chat) {
    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => selectPreset(tab.dataset.preset));
        tab.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            selectPreset(tabs[next].dataset.preset, true);
        });
    });

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

    selectPreset(preset);
}
