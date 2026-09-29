import { clamp, getValue, setFieldError, clearFieldErrors, validateRange } from './utils.js';

export function estimateCreditScore(input) {
  const payment = { always: 35, occasional: 21, frequent: 6 }[input.paymentHistory] ?? 0;
  const utilization = Number(input.utilization);
  const utilizationPoints = utilization <= 10 ? 30 : utilization <= 30 ? 25 : utilization <= 50 ? 16 : utilization <= 75 ? 8 : 0;
  const historyPoints = Math.min(15, Number(input.historyLength) * 1.8 + (Number(input.historyLength) >= 5 ? 6 : 0));
  const active = Number(input.activeAccounts);
  const mixPoints = active === 0 ? 3 : active <= 2 ? 7 : active <= 5 ? 10 : 8;
  const enquiries = Number(input.recentEnquiries);
  const enquiryPoints = enquiries === 0 ? 10 : enquiries === 1 ? 8 : enquiries === 2 ? 6 : enquiries === 3 ? 4 : enquiries === 4 ? 2 : 0;
  const points = clamp(payment + utilizationPoints + historyPoints + mixPoints + enquiryPoints, 0, 100);
  const score = Math.round(300 + points * 6);
  const category = score >= 800 ? 'Excellent' : score >= 730 ? 'Very good' : score >= 650 ? 'Good' : score >= 580 ? 'Fair' : 'Poor';
  const risk = score >= 800 ? 'Very low risk' : score >= 730 ? 'Low risk' : score >= 650 ? 'Moderate risk' : 'High risk';
  const insight = payment < 30 ? 'Payment history is your biggest lever. Set every bill to autopay or reminders before the due date.' : utilization > 30 ? 'Try to keep utilization below 30% across cards. Lower balances can help your score breathe.' : historyPoints < 10 ? 'A longer, steady credit history helps. Keep older, well-managed accounts open where appropriate.' : 'Your credit signals are balanced. Keep enquiries measured and continue paying on time.';
  return { input, score, points, category, risk, insight, factors: { payment, utilization: utilizationPoints, history: historyPoints, mix: mixPoints, enquiries: enquiryPoints } };
}

function validate(form) {
  clearFieldErrors(form);
  let valid = true;
  const paymentHistory = getValue(form, 'paymentHistory');
  if (!paymentHistory) { setFieldError(form, 'paymentHistory', 'Choose your payment pattern.'); valid = false; }
  const utilization = Number(getValue(form, 'utilization'));
  const historyLength = validateRange(form, 'historyLength', 'History length', 0, 60);
  const activeAccounts = validateRange(form, 'activeAccounts', 'Active accounts', 0, 50, { integer: true });
  const recentEnquiries = validateRange(form, 'recentEnquiries', 'Recent enquiries', 0, 30, { integer: true });
  if (!Number.isFinite(utilization) || utilization < 0 || utilization > 100) { setFieldError(form, 'utilization', 'Utilization must be between 0 and 100%.'); valid = false; }
  if ([historyLength, activeAccounts, recentEnquiries].some((value) => value === null)) valid = false;
  return valid ? { paymentHistory, utilization, historyLength, activeAccounts, recentEnquiries } : null;
}

function renderResult(root, result) {
  root.querySelector('.result-empty').classList.add('is-hidden');
  root.querySelector('.result-content').classList.remove('is-hidden');
  root.querySelector('#credit-category').textContent = result.category;
  root.querySelector('#credit-risk').textContent = result.risk;
  root.querySelector('#credit-risk').className = `status-badge ${result.score >= 730 ? 'status-success' : result.score >= 650 ? 'status-warning' : 'status-danger'}`;
  root.querySelector('#estimated-score').textContent = result.score;
  const percent = (result.score - 300) / 6;
  root.querySelector('#credit-gauge-fill').style.transform = `translateX(-50%) rotate(${-62 + percent * 1.24}deg)`;
  root.querySelector('#credit-insight').textContent = result.insight;
}

export function initCreditScore({ onResult } = {}) {
  const form = document.querySelector('#credit-form');
  const root = document.querySelector('#credit-result');
  const utilization = document.querySelector('#utilization');
  const utilizationOutput = document.querySelector('#utilization-output');
  if (!form || !root) return;
  utilization.addEventListener('input', () => { utilizationOutput.textContent = `${utilization.value}%`; });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = validate(form);
    if (!input) return;
    const result = estimateCreditScore(input);
    renderResult(root, result);
    window.dispatchEvent(new CustomEvent('clearpath:credit', { detail: result }));
    onResult?.(result);
  });
}
