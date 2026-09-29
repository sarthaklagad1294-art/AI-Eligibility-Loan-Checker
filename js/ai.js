import { formatCurrency, formatPercent, sleep } from './utils.js';

let latestContext = {};
let chatMessages;

const fallback = (message, context = {}) => {
  const lower = message.toLowerCase();
  if (lower.includes('credit')) return 'Start with the basics: pay every bill on time, keep total credit utilization below 30%, and avoid multiple loan enquiries close together. If your estimate is below 700, give these habits a few billing cycles before applying. This is guidance, not official financial advice.';
  if (lower.includes('emi') || lower.includes('burden')) return 'To reduce EMI pressure, compare a longer tenure against total interest, prepay high-interest balances when your lender allows it, and avoid taking a new loan until your FOIR is comfortably below 50%. This is guidance, not official financial advice.';
  if (lower.includes('loan type')) return 'Choose by purpose: home loans are usually structured for property, car loans for a vehicle, education loans for eligible study costs, and personal loans for flexible needs. Compare the full APR, fees, prepayment rules and total repayment—not just the advertised rate. This is guidance, not official financial advice.';
  if (context.eligibility) return `Your latest estimate is ${context.eligibility.score}/100 with a FOIR of ${formatPercent(context.eligibility.foir)}. A useful next step is to review the factors below 50% before applying. This is guidance, not official financial advice.`;
  return 'A good first step is to write down income, existing EMIs, desired loan amount and tenure. Then compare affordability, total repayment and lender terms side by side. This is guidance, not official financial advice.';
};

async function requestClaude(message, context) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);
  try {
    const response = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: message, context }), signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.text) throw new Error(payload.error || `AI service returned ${response.status}`);
    return payload.text;
  } finally { clearTimeout(timeout); }
}

function addMessage(text, kind = 'ai', meta = kind === 'ai' ? 'ClearPath AI · Guidance only' : 'You') {
  const wrapper = document.createElement('div');
  wrapper.className = `message message-${kind}`;
  wrapper.innerHTML = `<div class="message-avatar">${kind === 'ai' ? '✦' : '↗'}</div><div><p></p><span class="message-time"></span></div>`;
  wrapper.querySelector('p').textContent = text;
  wrapper.querySelector('.message-time').textContent = meta;
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setTyping(show) {
  const existing = chatMessages.querySelector('.typing-message');
  if (show && !existing) {
    const typing = document.createElement('div');
    typing.className = 'message message-ai typing-message';
    typing.innerHTML = '<div class="message-avatar">✦</div><div><p><span class="typing-dots"><i></i><i></i><i></i></span></p><span class="message-time">Thinking through the context…</span></div>';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else if (!show) existing?.remove();
}

function contextSummary() {
  const eligibility = latestContext.eligibility;
  const credit = latestContext.credit;
  const parts = [];
  if (eligibility) parts.push(`Eligibility: ${eligibility.score}/100, ${eligibility.band}, FOIR ${formatPercent(eligibility.foir)}, estimated max ${formatCurrency(eligibility.estimatedAmount || eligibility.maxEligible)}.`);
  if (credit) parts.push(`Credit estimate: ${credit.score}, ${credit.category}, ${credit.risk}.`);
  return parts.join(' ') || 'No calculator results have been shared yet.';
}

async function send(message) {
  const trimmed = message.trim();
  if (!trimmed) return;
  addMessage(trimmed, 'user');
  setTyping(true);
  try { await sleep(420); const text = await requestClaude(trimmed, { ...latestContext, summary: contextSummary() }); setTyping(false); addMessage(text); }
  catch (error) { setTyping(false); console.warn('Claude proxy unavailable:', error); addMessage(fallback(trimmed, latestContext)); }
}

export function initAI() {
  const form = document.querySelector('#chat-form');
  chatMessages = document.querySelector('#chat-messages');
  if (!form || !chatMessages) return;
  form.addEventListener('submit', (event) => { event.preventDefault(); const input = form.querySelector('input'); const message = input.value; input.value = ''; send(message); });
  document.querySelectorAll('.suggestion-chip').forEach((chip) => chip.addEventListener('click', () => send(chip.textContent)));
  window.addEventListener('clearpath:eligibility', (event) => { latestContext.eligibility = event.detail; document.querySelector('#ai-context-status').textContent = `Eligibility ${event.detail.score}/100 · ${event.detail.band}`; });
  window.addEventListener('clearpath:credit', (event) => { latestContext.credit = event.detail; document.querySelector('#ai-context-status').textContent = `${event.detail.category} credit estimate · ${event.detail.score}`; });
}

export async function generateEligibilityInsight(result) {
  try { return await requestClaude(`Explain this eligibility result in two concise sentences and give one practical improvement tip: ${JSON.stringify({ score: result.score, band: result.band, foir: result.foir, maxEligible: result.maxEligible, reasons: result.reasons })}`, { eligibility: result }); }
  catch { return result.insight; }
}
