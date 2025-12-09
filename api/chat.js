// Vercel Serverless Function - Proxy for OpenAI API
// This keeps the API key secure on the server

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { messages, temperature = 0.8, max_tokens = 100 } = req.body;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages,
                temperature,
                max_tokens
            })
        });

        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('OpenAI API error:', error);
        return res.status(500).json({
            error: 'Failed to call OpenAI API',
            details: error.message,
            stack: error.stack,
            hasFetch: typeof fetch !== 'undefined'
        });
    }
}
