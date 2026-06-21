/**
 * aiClient.js — Shared LLM helper
 *
 * Strategy:
 *   1. Try Gemini (Google Generative AI) first — it's the primary model.
 *   2. If Gemini fails (quota exceeded, 429, 503, network error) fall back to Groq.
 *   3. If Groq also fails (e.g. tokens-per-minute 429) fall back to Ollama Cloud.
 *   4. If all three fail, throw so callers can surface the error gracefully.
 *
 * Models used:
 *   Gemini : gemini-2.0-flash       (fast, generous free quota)
 *   Groq   : llama-3.3-70b-versatile (backup)
 *   Ollama : gemma3:27b             (Ollama Cloud — final backup, fast non-reasoning model)
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY   = process.env.GROQ_API_KEY || process.env.groq_api_key;
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

const GEMINI_MODEL = process.env.GEMINI_MODEL   || 'gemini-2.0-flash';
const GROQ_MODEL   = process.env.GROQ_API_MODEL || process.env.NEXT_PUBLIC_GROQ_MODEL || process.env.groq_api_model || 'llama-3.3-70b-versatile';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL   || 'gemma3:27b';

// HTTP status codes that should trigger a Groq fallback
const FALLBACK_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Call Gemini via the REST API (no extra SDK needed — uses the same key
 * already used for models-list in check_api.py).
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>} text response
 */
async function callGemini(systemPrompt, userPrompt) {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = err?.error?.message || `HTTP ${status}`;

        // Mark as fallback-eligible if it's a quota / server error
        if (FALLBACK_STATUSES.has(status)) {
            const e = new Error(`Gemini quota/server error (${status}): ${msg}`);
            e.fallback = true;
            throw e;
        }
        throw new Error(`Gemini API error (${status}): ${msg}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned an empty response');
    return text;
}

/**
 * Call Groq (OpenAI-compatible endpoint).
 */
async function callGroq(systemPrompt, userPrompt) {
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set — Groq fallback unavailable');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt   }
            ],
            max_tokens: 4096,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = err?.error?.message || 'Unknown';
        // Rate-limit / server errors should cascade to the next provider (Ollama)
        if (FALLBACK_STATUSES.has(status)) {
            const e = new Error(`Groq API error (${status}): ${msg}`);
            e.fallback = true;
            throw e;
        }
        throw new Error(`Groq API error (${status}): ${msg}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq returned an empty response');
    return text;
}

/**
 * Call Ollama Cloud (OpenAI-compatible endpoint). Final fallback.
 */
async function callOllama(systemPrompt, userPrompt) {
    if (!OLLAMA_API_KEY) throw new Error('OLLAMA_API_KEY not set — Ollama fallback unavailable');

    const response = await fetch('https://ollama.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OLLAMA_API_KEY}`
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt   }
            ],
            max_tokens: 4096,
            temperature: 0.7,
            stream: false
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Ollama API error (${response.status}): ${err?.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Ollama returned an empty response');
    return text;
}

/**
 * Primary export — call Gemini, fall back to Groq automatically.
 *
 * @param {string} systemPrompt  — system / context instructions
 * @param {string} userPrompt    — user message / task
 * @returns {{ text: string, provider: 'gemini'|'groq'|'ollama' }}
 */
export async function callAI(systemPrompt, userPrompt) {
    // ── 1. Try Gemini ─────────────────────────────────────────────────────────
    try {
        const text = await callGemini(systemPrompt, userPrompt);
        console.log('[aiClient] Gemini responded OK');
        return { text, provider: 'gemini' };
    } catch (geminiErr) {
        if (geminiErr.fallback) {
            console.warn('[aiClient] Gemini quota/error — falling back to Groq:', geminiErr.message);
        } else {
            // Hard error (bad key, malformed request) — don't silently swallow
            console.error('[aiClient] Gemini hard error:', geminiErr.message);
            throw geminiErr;
        }
    }

    // ── 2. Fall back to Groq ──────────────────────────────────────────────────
    try {
        const text = await callGroq(systemPrompt, userPrompt);
        console.log('[aiClient] Groq fallback responded OK');
        return { text, provider: 'groq' };
    } catch (groqErr) {
        // Continue to Ollama on any Groq failure (rate limit, missing key, etc.)
        console.warn('[aiClient] Groq fallback failed — falling back to Ollama:', groqErr.message);
    }

    // ── 3. Fall back to Ollama Cloud ──────────────────────────────────────────
    try {
        const text = await callOllama(systemPrompt, userPrompt);
        console.log('[aiClient] Ollama Cloud fallback responded OK');
        return { text, provider: 'ollama' };
    } catch (ollamaErr) {
        console.error('[aiClient] Ollama fallback also failed:', ollamaErr.message);
        throw new Error(`All AI providers (Gemini, Groq, Ollama) failed. Last error: ${ollamaErr.message}`);
    }
}
