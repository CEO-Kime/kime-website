// /api/chat.js — runs on Vercel's server, never in the browser.
// Keeps GEMINI_API_KEY and SUPABASE_SERVICE_ROLE_KEY completely hidden from visitors.

const SUPABASE_URL = 'https://ryfueewhyuooalnyuhhk.supabase.co';
const DAILY_LIMIT = parseInt(process.env.DAILY_AI_LIMIT || '100', 10);
const PER_VISITOR_DAILY_LIMIT = parseInt(process.env.DAILY_AI_LIMIT_PER_VISITOR || '15', 10);

const SYSTEM_PROMPT = `You are KimeBot, the friendly assistant on the KIME karate website (kimeworld.com).
KIME brings Seigo-Kai Karate-Do (a heritage karate style, part of the Seigo-Kai Karate-Do Association of India, running since 1969) to schools, residential societies and corporates across India, through on-site training programs.
Answer only questions related to KIME, karate, Seigo-Kai, martial arts training, the programs, events, or how to get in touch.
If asked something unrelated (general knowledge, coding, other topics), politely decline and redirect to KIME-related topics.
Keep answers short — 2-4 sentences, friendly and clear. If you don't know a specific detail (like exact prices or dates), tell the user to contact contact@kimeworld.com or use the enquiry form on the site, rather than guessing.
Never invent specific facts (like prices, dates, or names) you aren't given.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kimeworld.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || message.length > 500) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!GEMINI_API_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const visitorId = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Check today's global usage
    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chatbot_usage?day=eq.${today}&select=count`,
      { headers }
    );
    const rows = await getRes.json();
    const currentCount = rows.length ? rows[0].count : 0;

    if (currentCount >= DAILY_LIMIT) {
      return res.status(200).json({ limited: true });
    }

    // 2. Check this visitor's own daily usage
    const visitorRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chatbot_usage_by_visitor?day=eq.${today}&visitor_id=eq.${encodeURIComponent(visitorId)}&select=count`,
      { headers }
    );
    const visitorRows = await visitorRes.json();
    const visitorCount = visitorRows.length ? visitorRows[0].count : 0;

    if (visitorCount >= PER_VISITOR_DAILY_LIMIT) {
      return res.status(200).json({ limited: true, visitorLimited: true });
    }

    // 3. Call Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.6 },
        }),
      }
    );

    if (!geminiRes.ok) {
      return res.status(200).json({ error: true, reply: "KimeBot is having trouble right now. Please reach out at contact@kimeworld.com and we'll help directly." });
    }

    const geminiData = await geminiRes.json();
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
      || "I'm not sure about that one — please reach out at contact@kimeworld.com and we'll help directly.";

    // 4. Update usage counts (global and per-visitor)
    await fetch(`${SUPABASE_URL}/rest/v1/chatbot_usage`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ day: today, count: currentCount + 1 }),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/chatbot_usage_by_visitor`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ day: today, visitor_id: visitorId, count: visitorCount + 1 }),
    });

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(200).json({ error: true, reply: "KimeBot is having trouble right now. Please reach out at contact@kimeworld.com and we'll help directly." });
  }
}
