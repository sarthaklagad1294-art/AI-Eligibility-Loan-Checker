import { calculateEMI, principalFromEMI } from './emi.js';
import { clamp, formatCurrency, formatPercent, getValue, isValidEmail, setFieldError, clearFieldErrors, validateRange } from './utils.js';

const MIN_INCOME = { personal: 15000, home: 25000, car: 20000, education: 10000 };
const LOAN_LABELS = { personal: 'Personal loan', home: 'Home loan', car: 'Car loan', education: 'Education loan' };

const getRate = (score) => score >= 75 ? 11.25 : score >= 50 ? 14 : 15;

export function evaluateEligibility(input) {
  const age = Number(input.age);
  const income = Number(input.income);
  const existingEmi = Number(input.existingEmi);
  const requestedAmount = Number(input.loanAmount);
  const tenure = Number(input.tenure);
  const creditScore = Number(input.creditScore);
  const rate = getRate(creditScore >= 750 ? 80 : creditScore >= 700 ? 70 : creditScore >= 650 ? 55 : 40);
  const requestedEmi = calculateEMI(requestedAmount, rate, tenure);
  const foir = income > 0 ? ((existingEmi + requestedEmi) / income) * 100 : 100;

  const creditPoints = creditScore >= 750 ? 40 : creditScore >= 700 ? 30 : creditScore >= 650 ? 15 : 0;
  const foirPoints = foir < 30 ? 30 : foir <= 50 ? 15 : 0;
  const employmentPoints = input.employment === 'salaried' && Number(input.experience) >= 2 ? 20 : ['self-employed', 'business'].includes(input.employment) ? 15 : 5;
  const agePoints = age >= 25 && age <= 45 ? 10 : 5;
  let score = creditPoints + foirPoints + employmentPoints + agePoints;

  const hardRules = [];
  if (age < 21 || age > 60) hardRules.push('Age must be between 21 and 60 for this estimate.');
  if (creditScore < 600) hardRules.push('A credit score below 600 does not meet the minimum estimate threshold.');
  if (input.employment === 'unemployed') hardRules.push('Unemployed profiles are not eligible under this estimate model.');
  if (income < (MIN_INCOME[input.loanType] || Infinity)) hardRules.push(`${LOAN_LABELS[input.loanType] || 'This loan'} needs monthly income of at least ${formatCurrency(MIN_INCOME[input.loanType] || 0)}.`);
  if (income <= 0) hardRules.push('Monthly income must be greater than zero.');
  if (existingEmi > income) hardRules.push('Existing EMIs cannot be higher than monthly income.');

  const affordableEmi = Math.max(0, income * 0.5 - existingEmi);
  const maxEligible = principalFromEMI(affordableEmi, rate, tenure);
  if (hardRules.length) score = Math.min(score, 49);
  score = clamp(score, 0, 100);
  const band = score >= 75 ? 'eligible' : score >= 50 ? 'partial' : 'not-eligible';
  const estimatedAmount = band === 'eligible' ? maxEligible : band === 'partial' ? maxEligible * 0.7 : 0;
  const adjustedAmount = band === 'not-eligible' ? 0 : requestedAmount > 0 ? Math.min(requestedAmount, estimatedAmount) : estimatedAmount;
  const estimatedEmi = adjustedAmount > 0 ? calculateEMI(adjustedAmount, rate, tenure) : 0;

  const reasons = [
    { label: 'Credit score', points: creditPoints, max: 40, detail: creditScore >= 750 ? '750+ is a strong signal' : creditScore >= 700 ? 'Good foundation' : creditScore >= 650 ? 'Room to strengthen' : 'Needs improvement' },
    { label: 'FOIR / EMI load', points: foirPoints, max: 30, detail: foir < 30 ? 'Comfortably below 30%' : foir <= 50 ? 'Within the 50% guardrail' : 'Above the 50% guardrail' },
    { label: 'Employment stability', points: employmentPoints, max: 20, detail: input.employment === 'salaried' && Number(input.experience) >= 2 ? 'Salaried, 2+ years' : 'Profile-based points' },
    { label: 'Age band', points: agePoints, max: 10, detail: age >= 25 && age <= 45 ? 'Within preferred 25–45 band' : 'Outside preferred band' }
  ];
  const insight = hardRules[0] || (band === 'eligible'
    ? `Your profile scores ${score}/100 with an estimated FOIR of ${formatPercent(foir)}. Keep existing obligations stable before applying.`
    : band === 'partial'
      ? `A smaller loan or lower monthly obligations could improve this estimate. Your current FOIR is ${formatPercent(foir)}.`
      : `Focus first on lowering your EMI burden and strengthening your credit score. Your current FOIR is ${formatPercent(foir)}.`);

  return { input, age, income, existingEmi, requestedAmount, tenure, creditScore, requestedEmi, foir, score, band, rate, maxEligible, estimatedAmount, adjustedAmount, estimatedEmi, reasons, hardRules, insight, loanLabel: LOAN_LABELS[input.loanType] || 'Loan' };
}

function validate(form) {
  clearFieldErrors(form);
  let valid = true;
  const fullName = getValue(form, 'fullName');
  if (fullName.length < 2) { setFieldError(form, 'fullName', 'Please enter your full name.'); valid = false; }
  const email = getValue(form, 'email');
  if (!isValidEmail(email)) { setFieldError(form, 'email', 'Enter a valid email address.'); valid = false; }
  const age = validateRange(form, 'age', 'Age', 18, 100, { integer: true });
  const experience = validateRange(form, 'experience', 'Experience', 0, 60);
  const income = validateRange(form, 'income', 'Income', 1, 100000000);
  const existingEmi = validateRange(form, 'existingEmi', 'Existing EMIs', 0, 100000000);
  const creditScore = validateRange(form, 'creditScore', 'Credit score', 300, 900, { integer: true });
  const loanAmount = validateRange(form, 'loanAmount', 'Loan amount', 10000, 100000000);
  const tenure = validateRange(form, 'tenure', 'Tenure', 6, 360, { integer: true });
  const employment = getValue(form, 'employment');
  const loanType = getValue(form, 'loanType');
  if (!employment) { setFieldError(form, 'employment', 'Select an employment type.'); valid = false; }
  if (!loanType) { setFieldError(form, 'loanType', 'Select a loan type.'); valid = false; }
  if ([age, experience, income, existingEmi, creditScore, loanAmount, tenure].some((value) => value === null)) valid = false;
  if (income !== null && existingEmi !== null && existingEmi > income) { setFieldError(form, 'existingEmi', 'Existing EMIs cannot exceed income.'); valid = false; }
  return valid ? { fullName, email, age, experience, income, existingEmi, creditScore, loanAmount, tenure, employment, loanType } : null;
}

function renderResult(root, result) {
  root.querySelector('.result-empty').classList.add('is-hidden');
  root.querySelector('.result-content').classList.remove('is-hidden');
  const title = root.querySelector('#eligibility-status-title');
  const badge = root.querySelector('#eligibility-status-badge');
  const statusText = result.band === 'eligible' ? 'Likely eligible' : result.band === 'partial' ? 'Partially eligible' : 'Not eligible yet';
  const badgeText = result.band === 'eligible' ? 'Eligible' : result.band === 'partial' ? 'Partial' : 'Not eligible';
  title.textContent = statusText;
  badge.textContent = badgeText;
  badge.className = `status-badge ${result.band === 'eligible' ? 'status-success' : result.band === 'partial' ? 'status-warning' : 'status-danger'}`;
  const ring = root.querySelector('#eligibility-ring');
  ring.style.setProperty('--score', result.score);
  root.querySelector('#eligibility-score').textContent = result.score;
  root.querySelector('#eligibility-summary').textContent = result.insight;
  const displayAmount = result.band === 'not-eligible' ? 0 : result.estimatedAmount || result.maxEligible;
  root.querySelector('#max-eligible').textContent = formatCurrency(displayAmount, true);
  root.querySelector('#estimated-emi').textContent = result.estimatedEmi ? formatCurrency(result.estimatedEmi) : '—';
  root.querySelector('#foir-value').textContent = formatPercent(result.foir);
  root.querySelector('#breakdown-rows').innerHTML = result.reasons.map((reason) => `<div class="breakdown-row"><div><span>${reason.label}</span><div class="breakdown-track"><i style="width:${(reason.points / reason.max) * 100}%"></i></div></div><span>${reason.points}/${reason.max}</span></div>`).join('');
  root.querySelector('#eligibility-insight').textContent = result.insight;
}

export function initEligibility({ onResult } = {}) {
  const form = document.querySelector('#eligibility-form');
  const resultRoot = document.querySelector('#eligibility-result');
  const tenure = document.querySelector('#loan-tenure');
  const tenureOutput = document.querySelector('#tenure-output');
  if (!form || !resultRoot) return;
  tenure.addEventListener('input', () => { tenureOutput.textContent = `${tenure.value} months`; });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = validate(form);
    if (!input) return;
    const result = evaluateEligibility(input);
    renderResult(resultRoot, result);
    window.dispatchEvent(new CustomEvent('clearpath:eligibility', { detail: result }));
    onResult?.(result, form.querySelector('#save-consent')?.checked === true);
  });
}
