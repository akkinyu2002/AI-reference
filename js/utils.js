// ── Utility Functions ──────────────────────────────────────────────

export const CATEGORIES = [
  { id: 'food',          name: 'Food & Dining',   icon: 'FD', color: '#f97316' },
  { id: 'transport',     name: 'Transport',        icon: 'TR', color: '#3b82f6' },
  { id: 'shopping',      name: 'Shopping',          icon: 'SH', color: '#ec4899' },
  { id: 'bills',         name: 'Bills & Utilities', icon: 'BL', color: '#eab308' },
  { id: 'entertainment', name: 'Entertainment',     icon: 'EN', color: '#8b5cf6' },
  { id: 'health',        name: 'Health',            icon: 'HL', color: '#10b981' },
  { id: 'education',     name: 'Education',         icon: 'ED', color: '#06b6d4' },
  { id: 'travel',        name: 'Travel',            icon: 'TV', color: '#f43f5e' },
  { id: 'groceries',     name: 'Groceries',         icon: 'GR', color: '#22c55e' },
  { id: 'subscriptions', name: 'Subscriptions',     icon: 'SU', color: '#a855f7' },
  { id: 'other',         name: 'Other',             icon: 'OT', color: '#64748b' },
];

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

// ── Currency ──────────────────────────────────────────────────────

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Date Helpers ──────────────────────────────────────────────────

export function formatDate(date, style = 'medium') {
  const d = new Date(date);
  if (style === 'relative') return getRelativeTime(d);
  if (style === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function getRelativeTime(date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function toISODate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function getMonthName(monthIndex) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[monthIndex];
}

export function getStartOfMonth(date = new Date()) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function getEndOfMonth(date = new Date()) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

export function getDaysInMonth(date = new Date()) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// ── Relative Date Parsing (for NLP) ──────────────────────────────

export function parseRelativeDate(text) {
  const lower = text.toLowerCase().trim();
  const now = new Date();

  if (/\btoday\b/.test(lower)) return toISODate(now);
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() - 1); return toISODate(d);
  }

  // "last monday", "last friday", etc.
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const lastDayMatch = lower.match(/\blast\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (lastDayMatch) {
    const targetDay = dayNames.indexOf(lastDayMatch[1]);
    const d = new Date(now);
    const currentDay = d.getDay();
    let diff = currentDay - targetDay;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() - diff);
    return toISODate(d);
  }

  // "X days ago"
  const daysAgoMatch = lower.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1]));
    return toISODate(d);
  }

  // "last week"
  if (/\blast\s+week\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() - 7); return toISODate(d);
  }

  // Try parsing an explicit date
  const explicitMatch = lower.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (explicitMatch) {
    const month = parseInt(explicitMatch[1]) - 1;
    const day = parseInt(explicitMatch[2]);
    let year = explicitMatch[3] ? parseInt(explicitMatch[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    return toISODate(new Date(year, month, day));
  }

  // Month + day: "May 15", "Jan 3"
  const monthDayMatch = lower.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})/);
  if (monthDayMatch) {
    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const month = monthNames.indexOf(monthDayMatch[1].substring(0, 3));
    const day = parseInt(monthDayMatch[2]);
    return toISODate(new Date(now.getFullYear(), month, day));
  }

  return null; // couldn't parse
}

// ── Animation Helpers ─────────────────────────────────────────────

export function animateCounter(element, target, duration = 1200, currency = 'USD') {
  const start = parseFloat(element.dataset.currentValue) || 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    element.textContent = formatCurrency(current, currency);
    element.dataset.currentValue = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = formatCurrency(target, currency);
      element.dataset.currentValue = target;
    }
  }

  requestAnimationFrame(update);
}

// ── Debounce / Throttle ───────────────────────────────────────────

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── ID Generator ──────────────────────────────────────────────────

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ── Misc ──────────────────────────────────────────────────────────

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

export function sumBy(arr, key) {
  return arr.reduce((sum, item) => sum + (typeof key === 'function' ? key(item) : item[key]), 0);
}
