const MODEL = process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-latest';
const MAX_PROMPT = 6000;
const SYSTEM_PROMPT = `You are ClearPath AI, a friendly and practical Indian BFSI financial advisor. Use Indian rupees (₹), explain concepts in concise plain English, and use the user's calculator context when supplied. Do not ask for or encourage sharing PAN, Aadhaar, bank-account numbers, passwords, OTPs or other sensitive identity data. Never claim guaranteed approval or personalized regulated financial advice. Always end with: Guidance only — not official financial advice. Verify terms with your lender.`;

function allowedOrigin(origin) {
  if (!origin) return '*';
  const configured = (process.env.ALLOWED_ORIGINS || process.env.PUBLIC_ORIGIN || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (!configured.length) return ['http://localhost:3000', 'http://127.0.0.1:3000'].includes(origin) ? origin : null;
  return configured.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  const allow = allowedOrigin(origin);
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allow || 'null', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
}

function parseBody(body) {
  const payload = typeof body === 'string' ? JSON.parse(body || '{}') : (body || {});
  const prompt = String(payload.prompt || '').trim();
  if (!prompt || prompt.length > MAX_PROMPT) throw new Error(`Prompt must be between 1 and ${MAX_PROMPT} characters.`);
  return { prompt, context: payload.context || {} };
}

export async function proxyClaude(payload, origin = '') {
  const headers = corsHeaders(origin);
  if (origin && !allowedOrigin(origin)) return { status: 403, headers, body: { error: 'This origin is not allowed.' } };
  let input;
  try { input = parseBody(payload); } catch (error) { return { status: 400, headers, body: { error: error.message } }; }
  if (!process.env.ANTHROPIC_API_KEY) return { status: 503, headers, body: { error: 'AI guidance is not configured yet.' } };

  const contextText = JSON.stringify(input.context).slice(0, 5000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 480, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: `Latest calculator context (may be empty): ${contextText}\n\nQuestion: ${input.prompt}` }] }), signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status >= 500 ? 502 : 502;
      return { status, headers, body: { error: status === 429 ? 'The AI guide is busy. Please try again in a moment.' : 'The AI guide is temporarily unavailable.' } };
    }
    const text = Array.isArray(data.content) ? data.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n').trim() : '';
    if (!text) return { status: 502, headers, body: { error: 'The AI guide returned an empty answer.' } };
    return { status: 200, headers, body: { text, model: MODEL } };
  } catch (error) {
    return { status: error.name === 'AbortError' ? 504 : 502, headers, body: { error: error.name === 'AbortError' ? 'The AI guide took too long to respond.' : 'The AI guide is temporarily unavailable.' } };
  } finally { clearTimeout(timeout); }
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = corsHeaders(origin);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed.' }) };
  const result = await proxyClaude(event.body, origin);
  return { statusCode: result.status, headers: result.headers, body: JSON.stringify(result.body) };
}
