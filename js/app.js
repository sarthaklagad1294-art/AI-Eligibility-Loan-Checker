import { initEligibility } from './eligibility.js';
import { initCreditScore } from './creditScore.js';
import { initEMI } from './emi.js';
import { initAI, generateEligibilityInsight } from './ai.js';
import { saveRecord, loadLocalHistory, clearLocalHistory, retrieveHistory } from './sheets.js';
import { formatCurrency, formatDate } from './utils.js';

window.APP_CONFIG = window.APP_CONFIG || { sheetsUrl: '' };
let currentEligibility;
let currentCredit;

const toast = (message) => {
  const node = document.querySelector('#toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('is-visible');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove('is-visible'), 3400);
};

function setupNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  toggle?.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', String(open)); });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { nav.classList.remove('is-open'); toggle?.setAttribute('aria-expanded', 'false'); }));
}

function setupReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach((item) => item.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver((entries, obs) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); } }), { threshold: .08 });
  items.forEach((item) => observer.observe(item));
}

function renderHistory(history) {
  const empty = document.querySelector('#history-empty');
  const wrap = document.querySelector('#history-table-wrap');
  const body = document.querySelector('#history-body');
  document.querySelector('#history-count').textContent = history.length;
  if (!history.length) { empty.classList.remove('is-hidden'); wrap.classList.add('is-hidden'); return; }
  empty.classList.add('is-hidden'); wrap.classList.remove('is-hidden');
  body.innerHTML = history.map((record) => {
    const loanLabel = record.loanLabel || record.loanType || 'Loan';
    const band = record.band || record.eligibilityResult || 'not-eligible';
    const tone = band === 'eligible' ? 'success' : band === 'partial' ? 'warning' : 'danger';
    const decision = band === 'eligible' ? 'Eligible' : band === 'partial' ? 'Partial' : 'Not eligible';
    const amount = band === 'not-eligible' ? 0 : Number(record.maxEligible) || 0;
    return `<tr><td>${formatDate(record.timestamp)}</td><td>${record.name}</td><td>${loanLabel}</td><td><span class="decision-chip ${tone}">${decision}</span></td><td>${record.score}/100</td><td>${formatCurrency(amount, true)}</td></tr>`;
  }).join('');
}

async function saveEligibilityRecord(result, consent) {
  currentEligibility = result;
  if (!consent) { toast('Estimate ready. Tick consent if you want to save it.'); return; }
  const record = { timestamp: new Date().toISOString(), name: result.input.fullName, email: result.input.email, age: result.input.age, employment: result.input.employment, income: result.input.income, existingEmi: result.input.existingEmi, creditScore: result.input.creditScore, loanType: result.input.loanType, loanLabel: result.loanLabel, loanAmount: result.input.loanAmount, tenure: result.input.tenure, band: result.band, eligibilityResult: result.band, score: result.score, maxEligible: result.band === 'not-eligible' ? 0 : result.estimatedAmount || result.maxEligible, estimatedCreditScore: currentCredit?.score || null };
  const saved = await saveRecord(record);
  renderHistory(saved.history);
  toast(saved.synced ? 'Estimate saved and synced to your connected sheet.' : 'Estimate saved locally in this browser.');
}

async function enhanceEligibilityInsight(result) {
  const target = document.querySelector('#eligibility-insight');
  if (!target) return;
  const original = target.textContent;
  target.textContent = 'Preparing a concise AI explanation…';
  const text = await generateEligibilityInsight(result);
  target.textContent = text || original;
}

function setupClearHistory() {
  document.querySelector('#clear-history')?.addEventListener('click', () => { clearLocalHistory(); renderHistory([]); toast('Local history cleared.'); });
}

function init() {
  setupNavigation();
  setupReveal();
  initAI();
  initEMI();
  initCreditScore({ onResult: (result) => { currentCredit = result; } });
  initEligibility({ onResult: (result, consent) => { saveEligibilityRecord(result, consent); enhanceEligibilityInsight(result); } });
  setupClearHistory();
  renderHistory(loadLocalHistory());
  retrieveHistory().then((history) => { if (history.length) renderHistory(history); });
}

document.addEventListener('DOMContentLoaded', init);
