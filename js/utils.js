export const formatCurrency = (value, compact = false) => {
  const number = Number(value) || 0;
  if (compact && Math.abs(number) >= 100000) {
    return `₹${(number / 100000).toFixed(number >= 1000000 ? 1 : 2)}L`;
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(number);
};

export const formatNumber = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value) || 0);
export const formatPercent = (value) => `${(Number(value) || 0).toFixed(1)}%`;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
export const safeText = (value, fallback = '') => String(value ?? fallback).replace(/[<>]/g, '').trim();
export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
export const getValue = (form, name) => form.elements[name]?.value?.trim?.() ?? form.elements[name]?.value ?? '';

export function clearFieldErrors(form) {
  form.querySelectorAll('.field').forEach((field) => {
    field.classList.remove('has-error');
    field.querySelector('input, select')?.setAttribute('aria-invalid', 'false');
  });
  form.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
}

export function setFieldError(form, name, message) {
  const field = form.elements[name]?.closest('.field');
  const error = form.querySelector(`[data-error-for="${name}"]`);
  if (field) field.classList.add('has-error');
  const control = form.elements[name];
  if (control) control.setAttribute('aria-invalid', 'true');
  if (error) { error.id = `${name}-error`; error.textContent = message; control?.setAttribute('aria-describedby', error.id); }
}

export function validateRange(form, name, label, min, max, { integer = false, required = true } = {}) {
  const raw = getValue(form, name);
  if (required && raw === '') { setFieldError(form, name, `${label} is required.`); return null; }
  const value = Number(raw);
  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) { setFieldError(form, name, `${label} must be numeric.`); return null; }
  if (value < min || value > max) { setFieldError(form, name, `${label} must be between ${min} and ${max}.`); return null; }
  return value;
}

export const formatDate = (value) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
