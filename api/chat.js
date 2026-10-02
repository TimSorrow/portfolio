import { PRESETS, buildSystemPrompt } from './_presets.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';
const MAX_MESSAGES = 12;
const MAX_CHARS = 500;
const RATE_LIMIT = 20; // requests per IP per window, best effort per warm instance
const RATE_WINDOW_MS = 60_000;

const hits = new Map();

function rateLimited(ip) {
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now - entry.start > RATE_WINDOW_MS) {
        hits.set(ip, { start: now, count: 1 });
        return false;
    }
    entry.count += 1;
    return entry.count > RATE_LIMIT;
}

function allowedOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return false;
    try {
        const { hostname, host } = new URL(origin);
        return host === req.headers.host || hostname === 'localhost' || hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

function cleanMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return null;
    const recent = messages.slice(-MAX_MESSAGES);
    const cleaned = [];
    for (const m of recent) {
        if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null;
        if (typeof m.content !== 'string') return null;
        const content = m.content.trim();
        if (!content || content.length > MAX_CHARS) return null;
        cleaned.push({ role: m.role, content });
    }
    if (cleaned[cleaned.length - 1].role !== 'user') return null;
    return cleaned;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'method_not_allowed' });
    }
    if (!allowedOrigin(req)) {
        return res.status(403).json({ error: 'forbidden' });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (rateLimited(ip)) {
        return res.status(429).json({ error: 'rate_limited' });
    }

    const { preset: presetId, lang, messages } = req.body || {};
    const preset = PRESETS[presetId];
    const history = cleanMessages(messages);
    if (!preset || !history) {
        return res.status(400).json({ error: 'bad_request' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'not_configured' });
    }

    try {
        const groqRes = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: 0.3,
                // gpt-oss is a reasoning model: keep reasoning short and leave room for the answer
                reasoning_effort: 'low',
                max_completion_tokens: 1024,
                messages: [
                    { role: 'system', content: buildSystemPrompt(preset, lang) },
                    ...history,
                ],
            }),
        });

        if (groqRes.status === 429) {
            return res.status(429).json({ error: 'rate_limited' });
        }
        if (!groqRes.ok) {
            console.error('Groq error', groqRes.status, await groqRes.text());
            return res.status(502).json({ error: 'upstream' });
        }

        const data = await groqRes.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (!reply) {
            return res.status(502).json({ error: 'upstream' });
        }
        return res.status(200).json({ reply });
    } catch (err) {
        console.error('Groq request failed', err);
        return res.status(502).json({ error: 'upstream' });
    }
}
