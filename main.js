// Event Horizon Orbit Observatory Canvas Engine
function initOrbitObservatory() {
    var canvas = document.getElementById("orbit");
    if (!canvas) return;
    var ctx = canvas.getContext && canvas.getContext("2d");
    var display = document.getElementById("display");
    var status = document.getElementById("status");
    if (!ctx) {
        if (status) status.textContent = "Canvas is unavailable. The local time remains visible.";
        updateClock();
        setInterval(updateClock, 1000);
        return;
    }

    var motion = matchMedia("(prefers-reduced-motion: reduce)");
    var reduced = motion.matches;
    var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    var TARGET_FPS = isMobile ? 30 : 60;
    var FRAME_MS = 1000 / TARGET_FPS;
    var lastFrameTime = 0;
    var W = 1, H = 1, DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2), raf = 0;
    var yaw = -0.38, pitch = 0.22, targetYaw = yaw, targetPitch = pitch;
    var auto = !reduced;
    var lastMinute = "", clockStamp = "--:--:--";
    var pointer = { down: false, x: 0, y: 0, id: null };
    var TAU = Math.PI * 2;
    var stars = [], dust = [], sparks = [], streamers = [], sortedStars = [];

    function pad(n) { return n < 10 ? "0" + n : String(n); }
    function seeded(i) {
        var x = Math.sin(i * 1297.31 + 23.9) * 43758.5453;
        return x - Math.floor(x);
    }

    function rebuildField() {
        stars = []; dust = []; sparks = []; streamers = []; sortedStars = [];
        var i, u, v, r, a, z, q;

        /* Optimised star count: fewer on mobile for smooth 30fps */
        var starCount = isMobile ? 420 : 750;
        for (i = 0; i < starCount; i += 1) {
            u = seeded(i * 4);
            v = seeded(i * 4 + 1);
            r = 3 + seeded(i * 4 + 2) * 26;
            a = u * TAU;
            z = (v * 2 - 1) * r;
            q = Math.sqrt(Math.max(0, r * r - z * z));
            stars.push({
                x: Math.cos(a) * q,
                y: z,
                z: Math.sin(a) * q,
                s: 0.3 + seeded(i * 4 + 3) * 1.5,
                w: seeded(i * 7) > 0.78,
                c: seeded(i * 11)
            });
        }

        /* Accretion / halo dust particles */
        for (i = 0; i < 420; i += 1) {
            dust.push({
                phase: seeded(i * 3) * TAU,
                radius: 1.15 + seeded(i * 3 + 1) * 2.35,
                speed: 0.35 + seeded(i * 3 + 2) * 1.4,
                size: 0.4 + seeded(i * 5) * 1.8,
                hue: seeded(i * 9),
                tilt: 0.7 + seeded(i * 13) * 0.5
            });
        }

        /* Fast inner sparks */
        for (i = 0; i < 180; i += 1) {
            sparks.push({
                phase: seeded(i * 6 + 1) * TAU,
                radius: 1.05 + seeded(i * 6 + 2) * 0.55,
                speed: 1.8 + seeded(i * 6 + 3) * 3.2,
                size: 0.5 + seeded(i * 6 + 4) * 1.4,
                warm: seeded(i * 8) > 0.45
            });
        }

        /* Long colorful streamer seeds for ambient jets */
        for (i = 0; i < 24; i += 1) {
            streamers.push({
                phase: seeded(i * 17) * TAU,
                length: 0.35 + seeded(i * 17 + 1) * 1.1,
                radius: 1.4 + seeded(i * 17 + 2) * 1.8,
                hue: seeded(i * 17 + 3) * 360,
                speed: 0.08 + seeded(i * 17 + 4) * 0.2
            });
        }
    }

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 1.75);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        rebuildField();
        draw(performance.now());
    }

    function project(x, y, z) {
        var cy = Math.cos(yaw), sy = Math.sin(yaw);
        var cp = Math.cos(pitch), sp = Math.sin(pitch);
        var x1 = x * cy - z * sy;
        var z1 = x * sy + z * cy;
        var y1 = y * cp - z1 * sp;
        var z2 = y * sp + z1 * cp;
        var depth = 28 + z2;
        var scale = Math.min(W, H) * 0.58 / Math.max(8, depth);
        return { x: W / 2 + x1 * scale, y: H / 2 + y1 * scale, s: scale, z: z2 };
    }

    function ellipse(cx, cy, rx, ry, rotation, color, width, blur) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.scale(1, ry / rx);
        ctx.strokeStyle = color;
        ctx.lineWidth = width * rx / ry;
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }

    function lensArc(cx, cy, hole, angle, color, width, length, alpha, weight) {
        weight = weight == null ? 1 : weight;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = width * (3.2 + weight * 1.4);
        var echoes = weight > 0.85 ? 7 : 5;
        for (var echo = 0; echo < echoes; echo += 1) {
            var radius = hole * (1.1 + echo * (0.024 + weight * 0.01));
            var spread = length * (1 + echo * 0.12);
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha * weight / (echo * 0.85 + 1);
            ctx.lineWidth = Math.max(0.7, width * (1 - echo * 0.11) * weight);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, angle - spread, angle + spread * 0.22);
            ctx.stroke();
        }
        ctx.globalAlpha = alpha * (0.32 + weight * 0.18);
        ctx.lineWidth = Math.max(0.5, width * (0.55 + weight * 0.2));
        ctx.beginPath();
        ctx.arc(cx, cy, hole * 1.22, angle + Math.PI - length * 0.4, angle + Math.PI + length * 0.18);
        ctx.stroke();
        if (weight > 0.85) {
            ctx.globalAlpha = alpha * 0.22;
            ctx.lineWidth = Math.max(0.4, width * 0.35);
            ctx.beginPath();
            ctx.arc(cx, cy, hole * 1.34, angle + Math.PI - length * 0.22, angle + Math.PI + length * 0.1);
            ctx.stroke();
        }
        ctx.restore();
    }

    function handSpoke(cx, cy, hole, angle, color, length, width) {
        var yScale = 0.42 + Math.abs(Math.sin(pitch)) * 0.28;
        var r0 = hole * 1.14;
        var r1 = hole * length;
        var x0 = cx + Math.cos(angle) * r0;
        var y0 = cy + Math.sin(angle) * r0 * yScale;
        var x1 = cx + Math.cos(angle) * r1;
        var y1 = cy + Math.sin(angle) * r1 * yScale;
        ctx.save();
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(0,0,4,0.72)";
        ctx.lineWidth = width * 2.4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 3.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.shadowBlur = width * 1.2;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = Math.max(1, width * 0.28);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.restore();
    }

    function beacon(cx, cy, hole, angle, color, size, orbitR) {
        var r = hole * (orbitR == null ? 1.55 : orbitR);
        var yScale = 0.42 + Math.abs(Math.sin(pitch)) * 0.28;
        var x = cx + Math.cos(angle) * r;
        var y = cy + Math.sin(angle) * r * yScale;
        var gx = cx + Math.cos(angle + Math.PI) * hole * 1.18;
        var gy = cy + Math.sin(angle + Math.PI) * hole * 1.18 * yScale;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var ghost = ctx.createRadialGradient(gx, gy, 0, gx, gy, size * 2.2);
        ghost.addColorStop(0, "rgba(255,255,255,0.35)");
        ghost.addColorStop(0.3, color);
        ghost.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = ghost;
        ctx.beginPath();
        ctx.arc(gx, gy, size * 2.2, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        var g = ctx.createRadialGradient(x, y, 0, x, y, size * 5.2);
        g.addColorStop(0, "rgba(255,255,255,0.98)");
        g.addColorStop(0.18, color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, size * 5.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.shadowColor = color;
        ctx.shadowBlur = size * 2.4;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.62, 0, TAU);
        ctx.fill();
        ctx.restore();
    }

    function drawGravitationalLensing(cx, cy, hole, t) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var pulse = reduced ? 0.55 : 0.48 + 0.12 * Math.sin(t * 0.0008);
        var warp = ctx.createRadialGradient(cx, cy, hole * 0.92, cx, cy, hole * 2.85);
        warp.addColorStop(0, "rgba(255,200,255,0)");
        warp.addColorStop(0.18, "rgba(255,120,200," + (0.1 * pulse) + ")");
        warp.addColorStop(0.32, "rgba(120,220,255," + (0.14 * pulse) + ")");
        warp.addColorStop(0.48, "rgba(255,180,90," + (0.08 * pulse) + ")");
        warp.addColorStop(0.7, "rgba(140,100,255,0.04)");
        warp.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = warp;
        ctx.beginPath();
        ctx.arc(cx, cy, hole * 2.85, 0, TAU);
        ctx.fill();

        var rings = [
            { r: 1.32, a: 0.22, w: 2.4, c: "rgba(121,231,255," },
            { r: 1.48, a: 0.16, w: 1.8, c: "rgba(255,79,200," },
            { r: 1.68, a: 0.1, w: 1.3, c: "rgba(255,179,92," },
            { r: 1.95, a: 0.06, w: 1, c: "rgba(141,107,255," }
        ];
        var i, ring, phase, spread;
        for (i = 0; i < rings.length; i += 1) {
            ring = rings[i];
            phase = yaw * (0.35 + i * 0.08) + (reduced ? 0 : t * 0.00015 * (1 - i * 0.15));
            spread = 0.55 + i * 0.12;
            ctx.strokeStyle = ring.c + (ring.a * pulse) + ")";
            ctx.lineWidth = ring.w;
            ctx.shadowColor = ring.c + "0.5)";
            ctx.shadowBlur = 10 - i * 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, hole * ring.r, phase, phase + spread);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, hole * ring.r, phase + Math.PI, phase + Math.PI + spread * 0.85);
            ctx.stroke();
            ctx.strokeStyle = rings[(i + 1) % rings.length].c + (ring.a * 0.45 * pulse) + ")";
            ctx.lineWidth = Math.max(0.6, ring.w * 0.55);
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(cx + 1.2, cy - 0.8, hole * (ring.r + 0.018), phase + 0.08, phase + spread * 0.9);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    function drawDiskParticles(cx, cy, hole, t, tilt, rotation) {
        var time = reduced ? 0 : t * 0.001;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.scale(1, tilt);

        var i, p, ang, rr, px, py, hue, alpha, sz;

        for (i = 0; i < dust.length; i += 1) {
            p = dust[i];
            ang = p.phase + time * p.speed * (p.radius > 2 ? 0.55 : 1.1);
            rr = hole * p.radius;
            px = Math.cos(ang) * rr;
            py = Math.sin(ang) * rr;
            hue = (280 + p.hue * 140 + Math.sin(ang + yaw) * 40) % 360;
            alpha = 0.12 + (1 - (p.radius - 1.15) / 2.35) * 0.38;
            sz = p.size * (0.7 + (1 / p.radius) * 0.5);
            ctx.fillStyle = "hsla(" + hue + ",95%," + (58 + p.hue * 20) + "%," + alpha + ")";
            ctx.beginPath();
            ctx.arc(px, py, sz, 0, TAU);
            ctx.fill();
        }

        for (i = 0; i < sparks.length; i += 1) {
            p = sparks[i];
            ang = p.phase - time * p.speed;
            rr = hole * p.radius;
            px = Math.cos(ang) * rr;
            py = Math.sin(ang) * rr;
            if (p.warm) {
                ctx.fillStyle = "rgba(255," + Math.floor(140 + seeded(i) * 80) + ",80," + (0.45 + Math.sin(time * 4 + i) * 0.2) + ")";
            } else {
                ctx.fillStyle = "rgba(120,220,255," + (0.4 + Math.sin(time * 5 + i) * 0.2) + ")";
            }
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, TAU);
            ctx.fill();
        }

        if (!reduced) {
            for (i = 0; i < streamers.length; i += 1) {
                p = streamers[i];
                ang = p.phase + time * p.speed;
                rr = hole * p.radius;
                ctx.strokeStyle = "hsla(" + ((p.hue + time * 20) % 360) + ",95%,65%," + 0.14 + ")";
                ctx.lineWidth = 1.2 + (3 - p.radius) * 0.8;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.arc(0, 0, rr, ang, ang + p.length);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    function waveParticles(cx, cy, hole, angle, color, count, length, t, seed0) {
        if (reduced) return;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (var i = 0; i < count; i += 1) {
            var u = (i + 0.5) / count;
            var a = angle - length * (1 - u) + Math.sin(t * 0.004 + seed0 + i) * 0.03;
            var r = hole * (1.14 + u * 0.22 + seeded(seed0 + i * 3) * 0.08);
            var x = cx + Math.cos(a) * r;
            var y = cy + Math.sin(a) * r;
            var sz = 0.6 + (1 - u) * 2.2;
            var alpha = 0.15 + (1 - u) * 0.55;
            ctx.fillStyle = color.replace("ALPHA", String(alpha));
            ctx.beginPath();
            ctx.arc(x, y, sz, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawHourTicks(cx, cy, hole, lensTurn) {
        var yScale = 0.55;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (var i = 0; i < 12; i += 1) {
            var a = (i / 12) * TAU - Math.PI / 2 + lensTurn;
            var major = i % 3 === 0;
            var r0 = hole * 1.78;
            var r1 = hole * (major ? 2.05 : 1.9);
            var x0 = cx + Math.cos(a) * r0;
            var y0 = cy + Math.sin(a) * r0 * yScale;
            var x1 = cx + Math.cos(a) * r1;
            var y1 = cy + Math.sin(a) * r1 * yScale;
            ctx.strokeStyle = major ? "rgba(255,220,160,0.55)" : "rgba(190,210,255,0.28)";
            ctx.lineWidth = major ? 2 : 1.1;
            ctx.shadowColor = major ? "rgba(255,180,100,0.7)" : "rgba(160,200,255,0.35)";
            ctx.shadowBlur = major ? 8 : 3;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    function draw(t) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);
        var cx = W / 2, cy = H / 2;
        var unit = Math.min(W, H);
        var hole = unit * 0.36;

        var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
        bg.addColorStop(0, "#2a1450");
        bg.addColorStop(0.14, "#141a48");
        bg.addColorStop(0.36, "#0a0c28");
        bg.addColorStop(0.62, "#050612");
        bg.addColorStop(1, "#010107");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        var n1 = ctx.createRadialGradient(cx - hole * 2.8, cy - hole * 0.8, 0, cx - hole * 2.8, cy - hole * 0.8, unit * 0.62);
        n1.addColorStop(0, "rgba(255,48,183,0.2)");
        n1.addColorStop(0.4, "rgba(90,70,255,0.1)");
        n1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = n1;
        ctx.fillRect(0, 0, W, H);
        var n2 = ctx.createRadialGradient(cx + hole * 2.4, cy + hole * 1.1, 0, cx + hole * 2.4, cy + hole * 1.1, unit * 0.5);
        n2.addColorStop(0, "rgba(80,220,255,0.12)");
        n2.addColorStop(0.45, "rgba(120,255,160,0.05)");
        n2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = n2;
        ctx.fillRect(0, 0, W, H);
        var n3 = ctx.createRadialGradient(cx + hole * 0.5, cy - hole * 2.2, 0, cx + hole * 0.5, cy - hole * 2.2, unit * 0.4);
        n3.addColorStop(0, "rgba(255,180,80,0.1)");
        n3.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = n3;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // Use pre-sorted cache instead of sorting every frame
        if (!sortedStars.length) sortedStars = stars.slice().sort(function (a, b) { return a.z - b.z; });
        sortedStars.forEach(function (star) {
            var p = project(star.x, star.y, star.z);
            var dx = p.x - cx, dy = p.y - cy;
            var d = Math.hypot(dx, dy);
            var angle = Math.atan2(dy, dx);
            var bend = 1 + hole * hole / Math.max(hole * hole * 0.42, d * d) * 0.42;
            var tang = hole * hole / Math.max(hole * hole * 0.9, d * d) * 0.18;
            var x = cx + dx * bend - dy * tang * 0.35;
            var y = cy + dy * bend + dx * tang * 0.35;
            var tw = reduced ? 0.68 : 0.48 + 0.32 * Math.sin(t * 0.0011 + star.x * 4);
            var color;
            if (star.w) color = "255,190,104";
            else if (star.c > 0.85) color = "255,140,200";
            else if (star.c > 0.7) color = "160,255,200";
            else if (star.c > 0.5) color = "170,200,255";
            else color = "156,218,255";

            if (d < hole * 4.2 && d > hole * 0.68) {
                var arc = Math.max(0.022, (hole * 4.2 - d) / (hole * 4.2) * 0.32);
                var lensR = Math.max(hole * 1.06, d * bend);
                ctx.strokeStyle = "rgba(" + color + "," + (tw * 0.82) + ")";
                ctx.lineWidth = Math.max(0.55, star.s * p.s * 0.055);
                ctx.beginPath();
                ctx.arc(cx, cy, lensR, angle - arc, angle + arc);
                ctx.stroke();
                if (d < hole * 2.6) {
                    ctx.strokeStyle = "rgba(255,79,200," + (tw * 0.28) + ")";
                    ctx.lineWidth = Math.max(0.4, star.s * p.s * 0.035);
                    ctx.beginPath();
                    ctx.arc(cx, cy, lensR + 1.1, angle - arc * 0.85, angle + arc * 0.85);
                    ctx.stroke();
                    ctx.strokeStyle = "rgba(121,231,255," + (tw * 0.22) + ")";
                    ctx.beginPath();
                    ctx.arc(cx, cy, lensR - 1.1, angle - arc * 0.7, angle + arc * 0.7);
                    ctx.stroke();
                }
                if (d < hole * 2.4) {
                    ctx.strokeStyle = "rgba(255,79,200," + (tw * 0.32) + ")";
                    ctx.beginPath();
                    ctx.arc(cx, cy, hole * 1.3, angle + Math.PI - arc * 0.85, angle + Math.PI + arc * 0.85);
                    ctx.stroke();
                    ctx.strokeStyle = "rgba(121,231,255," + (tw * 0.18) + ")";
                    ctx.beginPath();
                    ctx.arc(cx, cy, hole * 1.42, angle + Math.PI - arc * 0.55, angle + Math.PI + arc * 0.55);
                    ctx.stroke();
                }
            } else {
                ctx.fillStyle = "rgba(" + color + "," + tw + ")";
                ctx.beginPath();
                ctx.arc(x, y, Math.max(0.35, star.s * p.s * 0.055), 0, TAU);
                ctx.fill();
            }
        });

        drawGravitationalLensing(cx, cy, hole, t);

        var tilt = 0.29 + Math.abs(Math.sin(pitch)) * 0.28;
        var rotation = yaw * 0.22;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (var band = 0; band < 64; band += 1) {
            var q = band / 63;
            var r = hole * (1.16 + q * 2.2);
            var phase = (reduced ? 0 : t * 0.00012) * (1.3 - q * 0.7) + band * 0.61;
            var hue = (300 + band * 5.5 + Math.sin(yaw + band * 0.1) * 36 + t * 0.01) % 360;
            ctx.strokeStyle = "hsla(" + hue + ",96%," + (52 + q * 22) + "%," + (0.04 + (1 - q) * 0.16) + ")";
            ctx.lineWidth = 1 + (1 - q) * 5.5;
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.scale(1, tilt);
            ctx.beginPath();
            ctx.arc(0, 0, r, phase, phase + 0.7 + seeded(band) * 2.6);
            ctx.stroke();
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }
        ctx.restore();

        drawDiskParticles(cx, cy, hole, t, tilt, rotation);

        var date = new Date();
        var ms = reduced ? 0 : date.getMilliseconds();
        var secF = date.getSeconds() + ms / 1000;
        var minF = date.getMinutes() + secF / 60;
        var hourF = (date.getHours() % 12) + minF / 60;
        var second = secF / 60 * TAU - Math.PI / 2;
        var minute = minF / 60 * TAU - Math.PI / 2;
        var hour = hourF / 12 * TAU - Math.PI / 2;
        var lensTurn = yaw * 0.12;

        drawHourTicks(cx, cy, hole, lensTurn);

        var hAng = hour + lensTurn;
        var mAng = minute + lensTurn;
        var sAng = second + lensTurn;

        handSpoke(cx, cy, hole, hAng, "#ffe38a", 1.62, hole * 0.055);
        handSpoke(cx, cy, hole, mAng, "#ff4fc8", 1.72, hole * 0.038);

        lensArc(cx, cy, hole, hAng, "#ffe38a", hole * 0.11, 0.82, 1, 1.15);
        lensArc(cx, cy, hole, mAng, "#ff4fc8", hole * 0.078, 0.62, 0.98, 1.05);
        lensArc(cx, cy, hole, sAng, "#79e7ff", hole * 0.028, 0.3, 0.72, 0.72);

        waveParticles(cx, cy, hole, hAng, "rgba(255,220,120,ALPHA)", 34, 0.82, t, 11);
        waveParticles(cx, cy, hole, mAng, "rgba(255,80,200,ALPHA)", 42, 0.62, t, 29);
        waveParticles(cx, cy, hole, sAng, "rgba(120,230,255,ALPHA)", 40, 0.3, t, 47);

        beacon(cx, cy, hole, hAng, "rgba(255,210,110,0.95)", hole * 0.072, 1.62);
        beacon(cx, cy, hole, mAng, "rgba(255,90,210,0.95)", hole * 0.055, 1.72);
        beacon(cx, cy, hole, sAng, "rgba(120,230,255,0.85)", hole * 0.024, 1.55);

        ellipse(cx, cy, hole * 1.18, hole * 1.18, 0, "rgba(121,231,255,0.55)", 1.3, 16);
        ellipse(cx, cy, hole * 1.1, hole * 1.1, 0, "rgba(255,79,200,0.48)", 2, 14);
        ellipse(cx, cy, hole * 1.09, hole * (0.45 + tilt * 0.35), rotation, "rgba(255,199,100,0.9)", 2.1, 18);
        ellipse(cx, cy, hole * 1.055, hole * (0.43 + tilt * 0.32), rotation, "rgba(121,231,255,0.75)", 1.1, 10);
        ellipse(cx, cy, hole * 1.28, hole * (0.52 + tilt * 0.3), rotation, "rgba(140,255,160,0.12)", 1, 6);

        var shadow = ctx.createRadialGradient(cx - hole * 0.2, cy - hole * 0.18, hole * 0.08, cx, cy, hole);
        shadow.addColorStop(0, "#000");
        shadow.addColorStop(0.68, "#000");
        shadow.addColorStop(0.9, "#020108");
        shadow.addColorStop(1, "rgba(0,0,0,0.82)");
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.arc(cx, cy, hole, 0, TAU);
        ctx.fill();

        var photon = ctx.createLinearGradient(cx - hole * 1.3, cy, cx + hole * 1.3, cy);
        photon.addColorStop(0, "#ff4fc8");
        photon.addColorStop(0.25, "#ffb35c");
        photon.addColorStop(0.5, "#79e7ff");
        photon.addColorStop(0.75, "#b7ff72");
        photon.addColorStop(1, "#8d6bff");
        ctx.strokeStyle = photon;
        ctx.shadowColor = "#79e7ff";
        ctx.shadowBlur = 22;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(cx, cy, hole * 1.105, 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc(cx, cy, hole * 1.105, 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function frame(t) {
        raf = requestAnimationFrame(frame);
        // Throttle to TARGET_FPS to free main thread for interactions (INP fix)
        if (t - lastFrameTime < FRAME_MS) return;
        lastFrameTime = t;
        if (auto) targetYaw += 0.0012;
        yaw += (targetYaw - yaw) * 0.09;
        pitch += (targetPitch - pitch) * 0.09;
        draw(t);
    }

    var heroSection = document.querySelector(".hero");
    var heroVisible = true;
    var animStarted = false;
    if (heroSection && window.IntersectionObserver) {
        var observer = new IntersectionObserver(function (entries) {
            heroVisible = entries[0].isIntersecting;
            if (heroVisible && animStarted) {
                startRender();
            } else {
                cancelAnimationFrame(raf);
                raf = 0;
            }
        }, { threshold: 0.02 });
        observer.observe(heroSection);
    }

    function startRender() {
        cancelAnimationFrame(raf);
        raf = 0;
        if (!document.hidden && !reduced && heroVisible) raf = requestAnimationFrame(frame);
        else draw(performance.now());
    }

    resize();
    draw(performance.now());

    function triggerAnimation() {
        if (animStarted) return;
        animStarted = true;
        if (heroVisible) startRender();
    }

    window.addEventListener("pointermove", triggerAnimation, { passive: true, once: true });
    window.addEventListener("touchstart", triggerAnimation, { passive: true, once: true });
    window.addEventListener("scroll", triggerAnimation, { passive: true, once: true });
    window.addEventListener("mousemove", triggerAnimation, { passive: true, once: true });
}

// Defer canvas init so the page text paints first (LCP fix)
function scheduleInit() {
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(initOrbitObservatory, { timeout: 1500 });
    } else {
        setTimeout(initOrbitObservatory, 200);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleInit);
} else {
    scheduleInit();
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
