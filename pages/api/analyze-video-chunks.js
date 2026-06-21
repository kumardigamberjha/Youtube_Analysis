/**
 * /api/analyze-video-chunks
 * Accepts video chunk data from the compare page and runs AI analysis server-side.
 * Uses Gemini first, falls back to Groq.
 */
import { callAI } from '../../lib/aiClient';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, systemPrompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'prompt is required' });
    }

    try {
        const system = systemPrompt || 'You are a YouTube channel analyst.';
        const { text, provider } = await callAI(system, prompt);
        return res.status(200).json({ result: text, provider });
    } catch (error) {
        console.error('[analyze-video-chunks] error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
