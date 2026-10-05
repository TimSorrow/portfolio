// ASCII "river of data" background: a meadow of text glyphs, a river that flows
// down the page and pixel stones (projects) drifting with the current.
//
// Rendering is kept cheap on purpose:
//  - every glyph × colour × brightness is rasterised once into an atlas;
//    frames only copy from it with drawImage (no fillText per frame);
//  - the static meadow lives in an offscreen canvas and is copied in one call;
//  - only the river, twinkling flowers, cursor halo, hero ring and stones are
//    redrawn each frame, at an ambient frame rate that steps down on slow devices.

const ALPHA = [0.1, 0.18, 0.28, 0.4, 0.55, 0.7, 0.85, 1];
const COLORS = {
    ink: '#d9d5c9',
    bank: '#8c8778',
    river: '#7fa2b6',
    leaf: '#6e9862',
    bloom: '#e8b39a',
};
const COLOR_KEYS = Object.keys(COLORS);
const BG = '#0b0b0b';

const GRASS = ["'", '"', ',', '.', '`', "'", ','];
const WATER = ['~', '~', '~', '≈', 'o', '°', '·', '~', 'o'];
const FONT_FAMILY = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';

// Deterministic hash → [0, 1)
function hash(x, y, seed = 0) {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

function smoothNoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed);
    const c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function initAsciiField(canvas, { stones: stoneLabels = [], ring = false, seed = 7 } = {}) {
    const ctx = canvas && canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    const TARGET_FPS = isMobile ? 20 : 30;
    const MIN_FPS = isMobile ? 12 : 18;
    let fpsCap = TARGET_FPS;
    let drawCost = 0;

    let W = 0, H = 0, DPR = 1, cols = 0, rows = 0;
    let cw = 10, ch = 18, fontPx = 13;

    // Glyph atlas
    const atlas = document.createElement('canvas');
    const actx = atlas.getContext('2d');
    const ATLAS_COLS = 64, ATLAS_ROWS = 40;
    let slots = new Map();

    // Static meadow
    const base = document.createElement('canvas');
    const bctx = base.getContext('2d');
    let cellChar, cellColor, cellLevel; // per-cell meadow data, -1 char = empty
    let twinkles = [];

    let riverMid = [], riverHalf = [];
    let stones = [];

    let scrollY = window.scrollY;
    const pointer = { x: -9999, y: -9999, sx: -9999, sy: -9999, strength: 0, active: false };

    let raf = 0, lastFrame = 0, started = false;

    function setupAtlas() {
        slots = new Map();
        atlas.width = Math.ceil(ATLAS_COLS * cw * DPR);
        atlas.height = Math.ceil(ATLAS_ROWS * ch * DPR);
        actx.setTransform(DPR, 0, 0, DPR, 0, 0);
        actx.clearRect(0, 0, ATLAS_COLS * cw, ATLAS_ROWS * ch);
        actx.textAlign = 'center';
        actx.textBaseline = 'middle';
        actx.font = `${fontPx}px ${FONT_FAMILY}`;
    }

    function slotFor(char, color, level) {
        const key = char + '|' + color + '|' + level;
        let slot = slots.get(key);
        if (slot === undefined) {
            slot = slots.size;
            if (slot >= ATLAS_COLS * ATLAS_ROWS) slot = 0; // never expected; keeps drawing safe
            const sx = (slot % ATLAS_COLS) * cw, sy = Math.floor(slot / ATLAS_COLS) * ch;
            actx.globalAlpha = ALPHA[level];
            actx.fillStyle = COLORS[color];
            actx.fillText(char, sx + cw / 2, sy + ch / 2 + 1);
            slots.set(key, slot);
        }
        return slot;
    }

    function glyph(target, char, color, level, x, y) {
        const slot = slotFor(char, color, Math.max(0, Math.min(7, level)));
        const sx = (slot % ATLAS_COLS) * cw * DPR, sy = Math.floor(slot / ATLAS_COLS) * ch * DPR;
        target.drawImage(atlas, sx, sy, cw * DPR, ch * DPR, x, y, cw, ch);
    }

    function buildRiver() {
        riverMid = new Float32Array(rows + 1);
        riverHalf = new Float32Array(rows + 1);
        const amp1 = cols * 0.13, amp2 = cols * 0.07;
        const minHalf = isMobile ? 4 : 6;
        for (let r = 0; r <= rows; r += 1) {
            riverMid[r] = cols * 0.5
                + amp1 * Math.sin(r * 0.055 + seed)
                + amp2 * Math.sin(r * 0.021 + seed * 1.7)
                + (smoothNoise(r * 0.08, 0, seed) - 0.5) * 3;
            riverHalf[r] = Math.max(minHalf, cols * 0.085 + cols * 0.03 * Math.sin(r * 0.037 + seed * 0.5));
        }
    }

    function buildMeadow() {
        const n = cols * rows;
        cellChar = new Int16Array(n).fill(-1);
        cellColor = new Uint8Array(n);
        cellLevel = new Uint8Array(n);
        const chars = [];
        const charIndex = (c) => {
            let i = chars.indexOf(c);
            if (i < 0) { chars.push(c); i = chars.length - 1; }
            return i;
        };
        twinkles = [];

        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const i = r * cols + c;
                const d = Math.abs(c - riverMid[r]) - riverHalf[r];
                if (d < 0) continue; // river
                const h = hash(c, r, seed);
                let char = null, color = 'ink', level = 1;

                if (d < 1.2) {
                    const slope = riverMid[Math.min(rows, r + 1)] - riverMid[r];
                    char = h < 0.5 ? (slope > 0.15 ? '\\' : slope < -0.15 ? '/' : '|') : ':';
                    color = 'bank';
                    level = 2;
                } else if (d < 7 && h < 0.07) {
                    char = '♣';
                    color = 'leaf';
                    level = 3 + (h < 0.03 ? 1 : 0);
                } else {
                    const patch = smoothNoise(c * 0.09, r * 0.09, seed + 3);
                    if (patch > 0.62 && h < 0.2) {
                        char = h < 0.12 ? '✿' : '*';
                        color = 'bloom';
                        level = 3 + Math.floor(h * 20) % 3;
                        if (hash(c, r, seed + 9) < 0.25) {
                            twinkles.push({ c, r, char, level, phase: h * 40 });
                            continue;
                        }
                    } else if (h < 0.42) {
                        char = GRASS[Math.floor(h * 1000) % GRASS.length];
                        level = h < 0.12 ? 2 : 1;
                    }
                }
                if (char) {
                    cellChar[i] = charIndex(char);
                    cellColor[i] = COLOR_KEYS.indexOf(color);
                    cellLevel[i] = level;
                }
            }
        }
        buildMeadow.chars = chars;

        base.width = canvas.width;
        base.height = canvas.height;
        bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        bctx.fillStyle = BG;
        bctx.fillRect(0, 0, W, H);
        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const i = r * cols + c;
                if (cellChar[i] < 0) continue;
                glyph(bctx, chars[cellChar[i]], COLOR_KEYS[cellColor[i]], cellLevel[i], c * cw, r * ch);
            }
        }
    }

    function buildStones() {
        stones = stoneLabels.map((label, i) => ({
            label,
            row: (rows / Math.max(stoneLabels.length, 1)) * i + hash(i, 1, seed) * 6,
            speed: 0.9 + hash(i, 2, seed) * 0.6, // rows per second
            phase: hash(i, 3, seed) * Math.PI * 2,
            rx: (isMobile ? 1.6 : 2.1) + hash(i, 4, seed) * 0.6,
        }));
    }

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 1.5);
        W = window.innerWidth;
        H = window.innerHeight;
        const small = W < 640;
        cw = small ? 11 : 10;
        ch = small ? 20 : 18;
        fontPx = small ? 14 : 13;
        cols = Math.ceil(W / cw);
        rows = Math.ceil(H / ch);
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        setupAtlas();
        buildRiver();
        buildMeadow();
        buildStones();
    }

    function waterGlyph(c, r, t) {
        const flow = t * 3.2; // rows per second
        const fr = r - flow;
        const fi = Math.floor(fr);
        const h = hash(c, fi, seed + 11);
        const edge = riverHalf[r] - Math.abs(c - riverMid[r]);
        if (h < 0.18 && edge > 1) return null; // calm gaps
        const char = WATER[Math.floor(h * 997) % WATER.length];
        let level = 3 + Math.floor(h * 3);
        if (edge < 1.5) level -= 1;
        return { char, color: 'river', level };
    }

    function cellGlyph(c, r, t) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
        if (Math.abs(c - riverMid[r]) < riverHalf[r]) return waterGlyph(c, r, t);
        const i = r * cols + c;
        if (cellChar[i] < 0) return null;
        return { char: buildMeadow.chars[cellChar[i]], color: COLOR_KEYS[cellColor[i]], level: cellLevel[i] };
    }

    function drawRiver(t) {
        for (let r = 0; r < rows; r += 1) {
            const from = Math.ceil(riverMid[r] - riverHalf[r]);
            const to = Math.floor(riverMid[r] + riverHalf[r]);
            for (let c = Math.max(0, from); c <= Math.min(cols - 1, to); c += 1) {
                const g = waterGlyph(c, r, t);
                if (g) glyph(ctx, g.char, g.color, g.level, c * cw, r * ch);
            }
        }
    }

    function drawTwinkles(t) {
        for (const f of twinkles) {
            const lvl = f.level - 1 + Math.round((Math.sin(t * 0.9 + f.phase) + 1) * 1.2);
            glyph(ctx, f.char, 'bloom', lvl, f.c * cw, f.r * ch);
        }
    }

    // Glyphs near the cursor drift away and brighten
    function drawHalo(t) {
        if (pointer.strength < 0.02) return;
        const R = 8;
        const pc = pointer.sx / cw, pr = pointer.sy / ch;
        const c0 = Math.floor(pc - R - 1), c1 = Math.ceil(pc + R + 1);
        const r0 = Math.floor(pr - R - 1), r1 = Math.ceil(pr + R + 1);
        ctx.fillStyle = BG;
        ctx.fillRect(c0 * cw, r0 * ch, (c1 - c0 + 1) * cw, (r1 - r0 + 1) * ch);
        for (let r = r0; r <= r1; r += 1) {
            for (let c = c0; c <= c1; c += 1) {
                let g = cellGlyph(c, r, t);
                if (!g) {
                    if (r >= 0 && r < rows && c >= 0 && c < cols) g = { char: twinkleAt(c, r), color: 'bloom', level: 3 };
                    if (!g || !g.char) continue;
                }
                const dx = c - pc, dy = (r - pr) * (ch / cw);
                const dist = Math.hypot(dx, dy) || 0.001;
                const k = Math.max(0, 1 - dist / R) * pointer.strength;
                const push = k * k * 2.6;
                const x = (c + (dx / dist) * push) * cw;
                const y = (r + (dy / dist) * push * (cw / ch)) * ch;
                glyph(ctx, g.char, g.color, g.level + Math.round(k * 5), x, y);
            }
        }
    }

    function twinkleAt(c, r) {
        for (const f of twinkles) if (f.c === c && f.r === r) return f.char;
        return null;
    }

    // Dotted ring framing the hero text; scrolls away with the first screen
    function drawRing(t) {
        const cy = H / 2 - scrollY;
        const radius = Math.min(W * 0.47, H * 0.36, 360);
        if (cy + radius < 0) return;
        const cx = W / 2;
        ctx.fillStyle = 'rgba(11, 11, 11, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius - ch * 0.6, 0, Math.PI * 2);
        ctx.fill();
        const steps = Math.floor((Math.PI * 2 * radius) / (cw * 1.15));
        for (let i = 0; i < steps; i += 1) {
            const a = (i / steps) * Math.PI * 2;
            const wobble = Math.sin(a * 5 + t * 0.6) * 3;
            const x = cx + Math.cos(a) * (radius + wobble) - cw / 2;
            const y = cy + Math.sin(a) * (radius + wobble) * 0.92 - ch / 2;
            const h = hash(i, 5, seed);
            const char = h < 0.15 ? 'o' : h < 0.55 ? '·' : '.';
            const level = 2 + Math.round((Math.sin(a * 3 - t * 0.8) + 1) * 1.2);
            glyph(ctx, char, 'ink', level, x, y);
        }
    }

    // Pixel stones: banded ovals of square "pixels", like old sprites
    function drawStones(t) {
        const px = isMobile ? 4 : 5;
        ctx.font = `${Math.max(10, fontPx - 2)}px ${FONT_FAMILY}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        for (const s of stones) {
            const row = ((s.row + t * s.speed) % (rows + 8)) - 4;
            const ri = Math.max(0, Math.min(rows, Math.round(row)));
            const col = riverMid[ri] + Math.sin(t * 0.45 + s.phase) * riverHalf[ri] * 0.35;
            const cx = col * cw, cy = row * ch;
            const rx = s.rx * cw, ry = rx * 0.78;
            const bob = Math.sin(t * 1.3 + s.phase) * 1.5;

            for (let y = -ry; y <= ry; y += px) {
                const half = rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2));
                const band = Math.floor((y + ry) / px);
                if (band % 3 === 2) continue; // stripes
                const shade = 0.35 + 0.45 * (1 - (y + ry) / (2 * ry));
                ctx.fillStyle = `rgba(200, 200, 196, ${shade.toFixed(2)})`;
                const w = Math.round(half / px) * px;
                ctx.fillRect(Math.round(cx - w), Math.round(cy + y + bob), w * 2, px - 1);
            }
            // a few bubbles in the wake
            for (let k = 1; k <= 2; k += 1) {
                glyph(ctx, k === 1 ? 'o' : '°', 'river', 4 - k, cx - cw / 2 + Math.sin(t + k + s.phase) * 4, cy - ry - k * ch * 0.9);
            }
            // label on the side with room for it
            const text = `[ ${s.label} ]`;
            const tw = ctx.measureText(text).width;
            const lx = cx + rx + cw + tw < W - 8 ? cx + rx + cw : cx - rx - cw - tw;
            ctx.fillStyle = 'rgba(217, 213, 201, 0.38)';
            ctx.fillText(text, lx, cy + bob);
        }
    }

    function draw(t) {
        ctx.drawImage(base, 0, 0, W, H);
        drawRiver(t);
        drawTwinkles(t);
        drawHalo(t);
        drawStones(t);
        if (ring) drawRing(t); // stones pass under the hero ring
    }

    function updatePointer(dt) {
        const target = pointer.active ? 1 : 0;
        pointer.strength += (target - pointer.strength) * Math.min(1, dt * 4);
        const ease = Math.min(1, dt * 10);
        if (pointer.sx < -999) { pointer.sx = pointer.x; pointer.sy = pointer.y; }
        pointer.sx += (pointer.x - pointer.sx) * ease;
        pointer.sy += (pointer.y - pointer.sy) * ease;
    }

    function frame(now) {
        raf = requestAnimationFrame(frame);
        const frameMs = 1000 / fpsCap;
        if (now - lastFrame < frameMs - 1) return;
        const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
        lastFrame = now;
        updatePointer(dt);

        const start = performance.now();
        draw(now / 1000);
        drawCost = drawCost * 0.9 + (performance.now() - start) * 0.1;
        if (drawCost > frameMs * 0.5 && fpsCap > MIN_FPS) {
            fpsCap = Math.max(MIN_FPS, Math.round(fpsCap * 0.75));
            drawCost = 0;
        }
    }

    function start() {
        cancelAnimationFrame(raf);
        raf = 0;
        lastFrame = 0;
        if (reduced || document.hidden) draw(performance.now() / 1000);
        else raf = requestAnimationFrame(frame);
    }

    resize();
    draw(performance.now() / 1000);
    start();
    started = true;

    // Rebuild once the real font is available (the first pass may use a fallback)
    if (document.fonts && document.fonts.load) {
        document.fonts.load(`${fontPx}px "IBM Plex Mono"`).then(() => {
            setupAtlas();
            buildMeadow();
            if (!raf) draw(performance.now() / 1000);
        }).catch(() => {});
    }

    document.addEventListener('visibilitychange', () => {
        if (!started) return;
        if (document.hidden) {
            cancelAnimationFrame(raf);
            raf = 0;
        } else {
            start();
        }
    });

    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
        if (reduced) draw(performance.now() / 1000);
    }, { passive: true });

    // Small height changes come from the mobile address bar — ignore them
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth === W && Math.abs(window.innerHeight - H) < 120) return;
            resize();
            draw(performance.now() / 1000);
        }, 150);
    }, { passive: true });

    if (canHover && !reduced) {
        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            pointer.active = true;
        }, { passive: true });
        document.addEventListener('pointerleave', () => { pointer.active = false; });
        window.addEventListener('blur', () => { pointer.active = false; });
    }
}
