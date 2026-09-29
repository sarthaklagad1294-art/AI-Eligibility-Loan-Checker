import assert from 'node:assert/strict';
import { calculateEMI } from '../js/emi.js';
import { evaluateEligibility } from '../js/eligibility.js';
import { estimateCreditScore } from '../js/creditScore.js';

const approx = (actual, expected, tolerance) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not within ${tolerance} of ${expected}`);

approx(calculateEMI(500000, 10, 60), 10624, 2);
assert.equal(calculateEMI(100000, 0, 10), 10000);

const base = { fullName: 'Aditi Sharma', email: 'aditi@example.com', age: 30, experience: 5, income: 100000, existingEmi: 10000, creditScore: 760, loanAmount: 1000000, tenure: 60, employment: 'salaried', loanType: 'personal' };
assert.equal(evaluateEligibility({ ...base, age: 20 }).band, 'not-eligible');
assert.equal(evaluateEligibility({ ...base, age: 61 }).band, 'not-eligible');
assert.equal(evaluateEligibility({ ...base, creditScore: 599 }).band, 'not-eligible');
assert.equal(evaluateEligibility({ ...base, creditScore: 599 }).estimatedEmi, 0);
assert.equal(evaluateEligibility({ ...base, creditScore: 599 }).adjustedAmount, 0);
assert.equal(evaluateEligibility({ ...base, creditScore: 600 }).hardRules.some((rule) => rule.includes('below 600')), false);
assert.equal(evaluateEligibility({ ...base, employment: 'unemployed' }).band, 'not-eligible');
assert.ok(evaluateEligibility({ ...base, income: 100000, existingEmi: 10000 }).foir < 50);
assert.ok(evaluateEligibility({ ...base, income: 30000, existingEmi: 14000, loanAmount: 1000000 }).foir > 50);

const credit = estimateCreditScore({ paymentHistory: 'always', utilization: 10, historyLength: 8, activeAccounts: 3, recentEnquiries: 0 });
assert.ok(credit.score >= 300 && credit.score <= 900);
assert.ok(estimateCreditScore({ paymentHistory: 'frequent', utilization: 90, historyLength: 0, activeAccounts: 0, recentEnquiries: 8 }).score < credit.score);

console.log('Validation checks passed: EMI, eligibility edge cases, FOIR boundaries, and credit score range.');
