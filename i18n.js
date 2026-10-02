// Minimal RU/EN i18n for the AI agents section and the /agents page.
// Usage: data-i18n="key" sets textContent, data-i18n-attr="placeholder:key;aria-label:key2" sets attributes,
// elements with data-i18n-scope get their lang attribute synced.

const STORAGE_KEY = 'ts-lang';

const dict = {
    en: {
        'lang.aria': 'Language',

        'teaser.label': '03 // AI Agents for Business',
        'teaser.title': 'An AI receptionist that never sleeps',
        'teaser.text': 'I build chat agents for local businesses — beauty studios, rentals, restaurants. They answer customers 24/7 using your prices and rules, and hand you bookings ready to confirm.',
        'teaser.f1': 'Answers in seconds, day and night',
        'teaser.f2': 'Collects bookings and leads for you',
        'teaser.f3': "Speaks your customers' languages",
        'teaser.cta': 'Try the live demo',
        'preview.name': 'Lumière Studio · demo',
        'preview.user1': 'Hi! How much is a manicure with gel polish?',
        'preview.agent1': "Hi! It's €35 and takes about 75 minutes. Would you like to book a time?",
        'preview.user2': 'Yes, Saturday morning please',
        'preview.agent2': 'Great — on Saturday we open at 10:00. May I have your name and phone so the administrator can confirm?',

        'page.title': 'AI Receptionist for Local Business — Timur Surov',
        'page.description': 'A 24/7 AI receptionist for salons, rentals and restaurants: answers customers, collects bookings, speaks their language. Try the live demo.',
        'nav.home': 'Portfolio',
        'nav.demo': 'Demo',
        'nav.how': 'How it works',
        'nav.pricing': 'Packages',
        'nav.contact': 'Contact',

        'hero.label': 'AI Agents for Local Business',
        'hero.title': 'Your AI receptionist',
        'hero.text': 'Answers customer questions 24/7 using your prices, hours and rules — and turns chats into bookings you just confirm.',
        'hero.cta': 'Try it live',

        'demo.label': '01 // Live demo',
        'demo.title': 'Ask what your customers ask',
        'demo.tabs': 'Demo business',
        'preset.salon': 'Beauty studio',
        'preset.rental': 'Car rental',
        'preset.restaurant': 'Restaurant',
        'chat.online': 'Online',
        'chat.demo': 'Demo',
        'chat.input': 'Your message',
        'chat.placeholder': 'Type a question…',
        'chat.send': 'Send',
        'chat.suggestions': 'Suggested questions',
        'chat.note': "Fictional businesses for demonstration. Please don't share real personal data.",
        'chat.error.rate': 'Too many messages right now — please try again in a minute.',
        'chat.error.generic': 'Connection hiccup. Please try again.',
        'greet.salon': "Hi! I'm the virtual administrator of Lumière Studio. Ask me about prices, free cancellation or booking a manicure.",
        'greet.rental': "Hi! I'm DriveEasy's assistant. Ask me about cars, prices, insurance or airport delivery.",
        'greet.restaurant': "Hi! Welcome to Casa Verde Bistro. I can help with the menu, opening hours or a table reservation.",
        'sugg.salon': ['How much is gel polish?', 'Are you open on Sunday?', 'I want to book a pedicure'],
        'sugg.rental': ['How much is an SUV in August?', 'Is there a deposit?', 'Can you deliver to the airport?'],
        'sugg.restaurant': ['Do you have vegan dishes?', 'Table for 4 on Friday at 20:00', 'Is there a lunch menu?'],

        'how.label': '02 // How it works',
        'how.title': 'Live in about a week',
        'how.s1.title': 'Your knowledge',
        'how.s1.text': 'You send prices, hours, rules and the questions customers ask most.',
        'how.s2.title': 'Your agent',
        'how.s2.text': 'I set up and test the agent on real scenarios, in your tone and languages.',
        'how.s3.title': 'Your channels',
        'how.s3.text': 'It goes live on your website, Telegram or WhatsApp; bookings come straight to you.',

        'pricing.label': '03 // Packages',
        'pricing.title': 'Pick a starting point',
        'pricing.price': 'On request',
        'pricing.popular': 'Popular',
        'pricing.p1.name': 'Start',
        'pricing.p1.f1': 'FAQ agent on your website',
        'pricing.p1.f2': 'Up to 2 languages',
        'pricing.p1.f3': 'Setup in a few days',
        'pricing.p2.name': 'Business',
        'pricing.p2.f1': 'Website + Telegram or WhatsApp',
        'pricing.p2.f2': 'Bookings sent to you instantly',
        'pricing.p2.f3': 'Monthly tuning on real chats',
        'pricing.p3.name': 'Custom',
        'pricing.p3.f1': 'CRM or booking system integration',
        'pricing.p3.f2': 'Several agents and channels',
        'pricing.p3.f3': 'Priority support',

        'contact.label': '04 // Contact',
        'contact.title': "Let's set up your agent",
        'contact.text': 'Tell me about your business — I will show you a demo built on your own prices.',
        'contact.cta': 'Message on Telegram',
    },
    ru: {
        'lang.aria': 'Язык',

        'teaser.label': '03 // AI-агенты для бизнеса',
        'teaser.title': 'AI-администратор, который не спит',
        'teaser.text': 'Делаю чат-агентов для местного бизнеса — салонов, проката, ресторанов. Они отвечают клиентам 24/7 по вашим ценам и правилам и передают вам готовые заявки.',
        'teaser.f1': 'Отвечает за секунды — днём и ночью',
        'teaser.f2': 'Собирает записи и заявки',
        'teaser.f3': 'Говорит на языках ваших клиентов',
        'teaser.cta': 'Попробовать демо',
        'preview.name': 'Lumière Studio · демо',
        'preview.user1': 'Здравствуйте! Сколько стоит маникюр с покрытием?',
        'preview.agent1': 'Здравствуйте! 35 €, около 75 минут. Записать вас?',
        'preview.user2': 'Да, на субботу утром',
        'preview.agent2': 'Отлично — в субботу мы открываемся в 10:00. Подскажите имя и телефон, администратор подтвердит запись.',

        'page.title': 'AI-администратор для местного бизнеса — Тимур Суров',
        'page.description': 'AI-администратор 24/7 для салонов, проката и ресторанов: отвечает клиентам, собирает записи, говорит на их языке. Попробуйте демо.',
        'nav.home': 'Портфолио',
        'nav.demo': 'Демо',
        'nav.how': 'Как работает',
        'nav.pricing': 'Пакеты',
        'nav.contact': 'Контакты',

        'hero.label': 'AI-агенты для местного бизнеса',
        'hero.title': 'Ваш AI-администратор',
        'hero.text': 'Отвечает клиентам 24/7 по вашим ценам, графику и правилам — и превращает переписку в заявки, которые вам остаётся только подтвердить.',
        'hero.cta': 'Попробовать',

        'demo.label': '01 // Живое демо',
        'demo.title': 'Спросите то, что спрашивают ваши клиенты',
        'demo.tabs': 'Демо-бизнес',
        'preset.salon': 'Салон красоты',
        'preset.rental': 'Прокат авто',
        'preset.restaurant': 'Ресторан',
        'chat.online': 'Онлайн',
        'chat.demo': 'Демо',
        'chat.input': 'Ваше сообщение',
        'chat.placeholder': 'Напишите вопрос…',
        'chat.send': 'Отправить',
        'chat.suggestions': 'Примеры вопросов',
        'chat.note': 'Вымышленные бизнесы для демонстрации. Не указывайте реальные личные данные.',
        'chat.error.rate': 'Слишком много сообщений — попробуйте через минуту.',
        'chat.error.generic': 'Проблема со связью. Попробуйте ещё раз.',
        'greet.salon': 'Здравствуйте! Я виртуальный администратор Lumière Studio. Спросите о ценах, отмене записи или запишитесь на маникюр.',
        'greet.rental': 'Здравствуйте! Я ассистент DriveEasy. Спросите об автомобилях, ценах, страховке или доставке в аэропорт.',
        'greet.restaurant': 'Здравствуйте! Добро пожаловать в Casa Verde Bistro. Помогу с меню, часами работы или бронью столика.',
        'sugg.salon': ['Сколько стоит покрытие гель-лаком?', 'Вы работаете в воскресенье?', 'Хочу записаться на педикюр'],
        'sugg.rental': ['Сколько стоит кроссовер в августе?', 'Нужен ли депозит?', 'Можете пригнать машину в аэропорт?'],
        'sugg.restaurant': ['Есть веганские блюда?', 'Столик на 4 в пятницу в 20:00', 'Есть бизнес-ланч?'],

        'how.label': '02 // Как это работает',
        'how.title': 'Запуск примерно за неделю',
        'how.s1.title': 'Ваши данные',
        'how.s1.text': 'Вы присылаете прайс, график, правила и частые вопросы клиентов.',
        'how.s2.title': 'Ваш агент',
        'how.s2.text': 'Я настраиваю и тестирую агента на реальных сценариях — в вашем тоне и на нужных языках.',
        'how.s3.title': 'Ваши каналы',
        'how.s3.text': 'Агент работает на сайте, в Telegram или WhatsApp, а заявки приходят сразу вам.',

        'pricing.label': '03 // Пакеты',
        'pricing.title': 'С чего начать',
        'pricing.price': 'По запросу',
        'pricing.popular': 'Популярный',
        'pricing.p1.name': 'Старт',
        'pricing.p1.f1': 'FAQ-агент на вашем сайте',
        'pricing.p1.f2': 'До 2 языков',
        'pricing.p1.f3': 'Запуск за несколько дней',
        'pricing.p2.name': 'Бизнес',
        'pricing.p2.f1': 'Сайт + Telegram или WhatsApp',
        'pricing.p2.f2': 'Заявки приходят вам мгновенно',
        'pricing.p2.f3': 'Ежемесячная донастройка по реальным диалогам',
        'pricing.p3.name': 'Под ключ',
        'pricing.p3.f1': 'Интеграция с CRM или системой записи',
        'pricing.p3.f2': 'Несколько агентов и каналов',
        'pricing.p3.f3': 'Приоритетная поддержка',

        'contact.label': '04 // Контакты',
        'contact.title': 'Настроим вашего агента',
        'contact.text': 'Расскажите о своём бизнесе — покажу демо на ваших собственных ценах.',
        'contact.cta': 'Написать в Telegram',
    },
};

const listeners = new Set();
let current = detectLang();

function detectLang() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'ru' || saved === 'en') return saved;
    } catch {
        // storage unavailable — fall through to browser language
    }
    return (navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
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
    root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
        el.dataset.i18nAttr.split(';').forEach((pair) => {
            const [attr, key] = pair.split(':').map((s) => s.trim());
            if (attr && key) el.setAttribute(attr, t(key));
        });
    });
    root.querySelectorAll('[data-i18n-scope]').forEach((el) => {
        el.setAttribute('lang', current);
    });
    root.querySelectorAll('.lang-switch button[data-lang]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.lang === current));
    });
}

export function setLang(lang) {
    if (!dict[lang] || lang === current) return;
    current = lang;
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch {
        // ignore — choice just won't persist
    }
    applyI18n();
    listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
    listeners.add(fn);
}

export function initI18n() {
    document.querySelectorAll('.lang-switch button[data-lang]').forEach((btn) => {
        btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
    applyI18n();
}
