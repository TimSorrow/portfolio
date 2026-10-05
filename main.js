import { initI18n } from './i18n.js';
import { initAsciiField } from './ascii-field.js';

initI18n();

// ASCII "river of data" background. Deferred so the page text paints first (LCP).
function startField() {
    initAsciiField(document.getElementById('field'), {
        ring: true,
        stones: ['semantic-cache', 'text-to-sql', 'doc-crawler', 'risk-ml'],
    });
}

if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(startField, { timeout: 1200 });
} else {
    setTimeout(startField, 200);
}

// Projects Slider Logic
const slides = document.querySelectorAll('.project-slide');
const dots = document.querySelectorAll('.slider-dot');
const prevBtn = document.querySelector('.slider-arrow.prev');
const nextBtn = document.querySelector('.slider-arrow.next');

if (slides.length > 0) {
    let currentSlide = 0;

    function showSlide(index) {
        if (index >= slides.length) index = 0;
        if (index < 0) index = slides.length - 1;

        currentSlide = index;

        slides.forEach((slide, i) => {
            if (i === currentSlide) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });

        dots.forEach((dot, i) => {
            if (i === currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            showSlide(currentSlide - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            showSlide(currentSlide + 1);
        });
    }

    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.getAttribute('data-index'), 10);
            showSlide(index);
        });
    });
}
