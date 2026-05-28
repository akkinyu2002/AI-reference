// ── Main App Controller ───────────────────────────────────────────
// Orchestrates UI, events, rendering, and all module interactions.

import { initStorage, getAllExpenses, getExpenseById, addExpense, updateExpense, deleteExpense, getSettings, updateSettings, exportData, clearAllData } from './storage.js';
import { parseNaturalLanguage, generateInsights, getRecommendations, getQuickStats } from './ai-engine.js';
import { renderCategoryChart, renderTrendChart } from './charts.js';
import { CATEGORIES, getCategoryById, formatCurrency, formatDate, toISODate, animateCounter, debounce, generateId } from './utils.js';

// ── State ─────────────────────────────────────────────────────────

let currentFilter = { search: '', category: 'all', sort: 'date-desc' };
let editingId = null;

function getInitials(name) {
  if (!name) return '';
  return name
    .split(/\s+/)
    .filter(w => /[A-Za-z]/.test(w))
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .slice(0,2)
    .join('')
    .toUpperCase();
}

// ── Initialisation ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initCategoryPicker();
  initCategoryFilter();
  bindEvents();
  refreshAll();
  seedDemoDataIfEmpty();
});

// Auto-detect currency by user locale on first run
document.addEventListener('DOMContentLoaded', () => {
  const settings = getSettings();
  if (!settings.currency || settings.currency === 'USD') {
    try {
      const locale = navigator.language || 'en-US';
      const map = {
        'en-US': 'USD', 'en-GB': 'GBP', 'de-DE': 'EUR', 'fr-FR': 'EUR', 'ja-JP': 'JPY',
        'en-CA': 'CAD', 'en-AU': 'AUD', 'hi-IN': 'INR', 'zh-CN': 'CNY', 'es-ES': 'EUR',
        'ne-NP': 'NPR', 'np-NP': 'NPR'
      };
      const detected = map[locale] || map[locale.split('-')[0]] || settings.currency;
      if (detected && detected !== settings.currency) updateSettings({ currency: detected });
    } catch (e) {
      // ignore
    }
  }
});

// Debug: enable mobile preview when URL contains ?mobile=1
document.addEventListener('DOMContentLoaded', () => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') === '1') document.body.classList.add('mobile-preview');
  } catch (e) {}
});

// ── Demo Data ─────────────────────────────────────────────────────

function seedDemoDataIfEmpty() {
  const expenses = getAllExpenses();
  if (expenses.length > 0) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const demoExpenses = [
    { description: 'Coffee at Starbucks',       amount: 5.75,   category: 'food',          date: toISODate(new Date(y, m, now.getDate())) },
    { description: 'Uber ride to office',        amount: 18.50,  category: 'transport',     date: toISODate(new Date(y, m, now.getDate())) },
    { description: 'Weekly groceries at Costco',  amount: 127.30, category: 'groceries',     date: toISODate(new Date(y, m, now.getDate() - 1)) },
    { description: 'Netflix subscription',        amount: 15.99,  category: 'subscriptions', date: toISODate(new Date(y, m, now.getDate() - 2)) },
    { description: 'Dinner with friends',         amount: 64.00,  category: 'food',          date: toISODate(new Date(y, m, now.getDate() - 2)) },
    { description: 'Amazon headphones',           amount: 89.99,  category: 'shopping',      date: toISODate(new Date(y, m, now.getDate() - 3)) },
    { description: 'Gas station fill-up',         amount: 52.40,  category: 'transport',     date: toISODate(new Date(y, m, now.getDate() - 4)) },
    { description: 'Monthly gym membership',      amount: 40.00,  category: 'health',        date: toISODate(new Date(y, m, now.getDate() - 5)) },
    { description: 'Electric bill',               amount: 95.00,  category: 'bills',         date: toISODate(new Date(y, m, now.getDate() - 5)) },
    { description: 'Movie tickets',               amount: 28.00,  category: 'entertainment', date: toISODate(new Date(y, m, now.getDate() - 6)) },
    { description: 'Online Python course',        amount: 49.99,  category: 'education',     date: toISODate(new Date(y, m, now.getDate() - 7)) },
    { description: 'Lunch at Chipotle',           amount: 13.50,  category: 'food',          date: toISODate(new Date(y, m, now.getDate() - 7)) },
    // Previous month data for trend comparison
    { description: 'Groceries at Walmart',        amount: 98.50,  category: 'groceries',     date: toISODate(new Date(y, m - 1, 15)) },
    { description: 'Internet bill',               amount: 79.99,  category: 'bills',         date: toISODate(new Date(y, m - 1, 10)) },
    { description: 'Birthday gift',               amount: 45.00,  category: 'shopping',      date: toISODate(new Date(y, m - 1, 8)) },
    { description: 'Concert tickets',             amount: 120.00, category: 'entertainment', date: toISODate(new Date(y, m - 1, 20)) },
    { description: 'Gas',                         amount: 48.00,  category: 'transport',     date: toISODate(new Date(y, m - 1, 5)) },
    { description: 'Doctor visit',                amount: 35.00,  category: 'health',        date: toISODate(new Date(y, m - 1, 12)) },
    // Even older data for trend
    { description: 'Rent payment',                amount: 1200.00, category: 'bills',        date: toISODate(new Date(y, m - 2, 1)) },
    { description: 'Flight to NYC',               amount: 320.00,  category: 'travel',       date: toISODate(new Date(y, m - 2, 18)) },
    { description: 'Groceries',                   amount: 110.00,  category: 'groceries',    date: toISODate(new Date(y, m - 3, 12)) },
    { description: 'Dinner',                      amount: 55.00,   category: 'food',         date: toISODate(new Date(y, m - 3, 22)) },
    { description: 'Spotify',                     amount: 9.99,    category: 'subscriptions',date: toISODate(new Date(y, m - 4, 1)) },
    { description: 'Uber rides',                  amount: 42.00,   category: 'transport',    date: toISODate(new Date(y, m - 4, 15)) },
    { description: 'Electricity',                 amount: 88.00,   category: 'bills',        date: toISODate(new Date(y, m - 5, 5)) },
    { description: 'Gym',                         amount: 40.00,   category: 'health',       date: toISODate(new Date(y, m - 5, 1)) },
  ];

  demoExpenses.forEach(exp => {
    addExpense({ ...exp, id: generateId() });
  });

  refreshAll();
  showToast('👋 Welcome! We loaded some demo data to get you started.', 'info');
}

// ── Bind All Events ───────────────────────────────────────────────

function bindEvents() {
  // AI input
  const aiInput = document.getElementById('ai-input');
  const aiSubmit = document.getElementById('ai-submit');

  aiInput.addEventListener('input', debounce(handleAIPreview, 200));
  aiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAISubmit(); }
  });
  aiSubmit.addEventListener('click', handleAISubmit);

  // Filters
  document.getElementById('search-input').addEventListener('input', debounce(handleFilterChange, 200));
  document.getElementById('filter-category').addEventListener('change', handleFilterChange);
  document.getElementById('filter-sort').addEventListener('change', handleFilterChange);

  // Modal
  document.getElementById('btn-add-manual').addEventListener('click', () => openModal());
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('expense-form').addEventListener('submit', handleFormSubmit);
  // Sync modal amount display as user types
  const formAmount = document.getElementById('form-amount');
  if (formAmount) {
    formAmount.addEventListener('input', () => {
      const val = parseFloat(formAmount.value) || 0;
      const settings = getSettings();
      const disp = document.getElementById('modal-amount-display');
      if (disp) disp.textContent = formatCurrency(val, settings.currency);
    });
  }
  // Bottom add CTA opens modal on mobile
  const bottomAdd = document.getElementById('bottom-add');
  if (bottomAdd) bottomAdd.addEventListener('click', () => openModal());

  // Bottom nav buttons (mobile): dashboard, activity, settings
  const navDashboard = document.getElementById('btn-nav-dashboard');
  if (navDashboard) navDashboard.addEventListener('click', () => {
    // close modals if open then scroll
    closeModal(); closeSettings();
    const el = document.getElementById('dashboard-grid');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const navActivity = document.getElementById('btn-nav-activity');
  if (navActivity) navActivity.addEventListener('click', () => {
    closeModal(); closeSettings();
    const el = document.getElementById('transactions-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const navSettings = document.getElementById('btn-nav-settings');
  if (navSettings) navSettings.addEventListener('click', () => openSettings());
  if (navSettings) navSettings.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSettings(); } });

  // Touch fallback: ensure taps on bottom nav trigger same handlers on mobile devices
  document.addEventListener('touchend', (e) => {
    const btn = e.target.closest && e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'btn-nav-dashboard') { closeModal(); closeSettings(); const el = document.getElementById('dashboard-grid'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (btn.id === 'btn-nav-activity') { closeModal(); closeSettings(); const el = document.getElementById('transactions-section'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (btn.id === 'bottom-add') { openModal(); }
    if (btn.id === 'btn-nav-settings') { openSettings(); }
  }, { passive: true });

  // Settings
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('settings-close').addEventListener('click', closeSettings);
  document.getElementById('settings-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });
  document.getElementById('settings-save').addEventListener('click', saveSettings);
  document.getElementById('btn-clear-data').addEventListener('click', handleClearData);

  // Export
  document.getElementById('btn-export').addEventListener('click', handleExport);

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeSettings();
    }
    // Focus AI input with /
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      aiInput.focus();
    }
  });

  // Global click delegation as a robust fallback for action buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('button');
    if (!btn) return;

    // Edit button fallback
    if (btn.classList.contains('edit')) {
      const id = btn.dataset.id;
      if (id) {
        const exp = getExpenseById(id);
        if (exp) openModal(exp);
      }
      return;
    }

    // Delete button fallback
    if (btn.classList.contains('delete')) {
      const id = btn.dataset.id;
      if (id) handleDelete(id);
      return;
    }

    // Header / nav buttons fallback
    if (btn.id === 'btn-export') { handleExport(); return; }
    if (btn.id === 'btn-settings') { openSettings(); return; }
    if (btn.id === 'btn-add-manual' || btn.id === 'bottom-add') { openModal(); return; }
  });
}

// ── AI Input Handling ─────────────────────────────────────────────

function handleAIPreview() {
  const input = document.getElementById('ai-input').value.trim();
  const preview = document.getElementById('ai-preview');

  if (!input) {
    preview.classList.remove('visible');
    return;
  }

  const parsed = parseNaturalLanguage(input);
  const settings = getSettings();

  document.getElementById('preview-amount-val').textContent = parsed.amount ? formatCurrency(parsed.amount, settings.currency) : '—';
  document.getElementById('preview-category-val').textContent = getCategoryById(parsed.category).name;
  document.getElementById('preview-date-val').textContent = formatDate(parsed.date, 'short');
  document.getElementById('preview-desc-val').textContent = parsed.description || '—';

  const confidence = Math.round((parsed.confidence || 0) * 100);
  document.getElementById('confidence-text').textContent = confidence + '%';
  document.getElementById('confidence-fill').style.width = confidence + '%';

  preview.classList.add('visible');
}

function handleAISubmit() {
  const input = document.getElementById('ai-input').value.trim();
  if (!input) return;

  const parsed = parseNaturalLanguage(input);

  if (!parsed.amount || parsed.amount <= 0) {
    showToast("I couldn't find an amount in that message. Try: \"$25 on lunch\"", 'warning');
    return;
  }

  const expense = {
    id: generateId(),
    amount: parsed.amount,
    description: parsed.description,
    category: parsed.category,
    date: parsed.date,
    notes: '',
  };

  addExpense(expense);
  document.getElementById('ai-input').value = '';
  document.getElementById('ai-preview').classList.remove('visible');

  const settings = getSettings();
  const catInfo = getCategoryById(parsed.category);
  showToast(`✅ Added ${formatCurrency(expense.amount, settings.currency)} — ${catInfo.icon} ${catInfo.name}`, 'success');

  refreshAll();
}

// ── Refresh All UI ────────────────────────────────────────────────

function refreshAll() {
  const expenses = getAllExpenses();
  const settings = getSettings();

  renderStats(expenses, settings);
  renderBudget(expenses, settings);
  renderTransactions(expenses);
  renderCharts(expenses, settings.currency);
  renderInsights(expenses, settings);
}

// ── Stats Cards ───────────────────────────────────────────────────

function renderStats(expenses, settings) {
  const stats = getQuickStats(expenses);

  animateCounter(document.getElementById('stat-monthly-total'), stats.totalThisMonth, 800, settings.currency);
  animateCounter(document.getElementById('stat-today-total'), stats.totalToday, 600, settings.currency);

  document.getElementById('stat-tx-count').textContent = stats.transactionCount;

  const topCatEl = document.getElementById('stat-top-category');
  if (stats.topCategory) {
    topCatEl.textContent = `${stats.topCategory.icon} ${stats.topCategory.name}`;
  } else {
    topCatEl.textContent = '—';
  }
}

// ── Budget Bar ────────────────────────────────────────────────────

function renderBudget(expenses, settings) {
  const stats = getQuickStats(expenses);
  const budget = settings.monthlyBudget || 2000;
  const spent = stats.totalThisMonth;
  const pct = Math.min((spent / budget) * 100, 100);

  document.getElementById('budget-label').textContent = `${formatCurrency(spent, settings.currency)} of ${formatCurrency(budget, settings.currency)} spent`;
  document.getElementById('budget-pct').textContent = `${pct.toFixed(0)}%`;

  const fill = document.getElementById('budget-fill');
  fill.style.width = pct + '%';
  fill.className = 'budget-fill';
  if (pct > 80) fill.classList.add('danger');
  else if (pct > 60) fill.classList.add('warning');
}

// ── Charts ────────────────────────────────────────────────────────

function renderCharts(expenses) {
  const now = new Date();
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const settings = getSettings();
  renderCategoryChart('chart-category', thisMonthExpenses, settings.currency);
  renderTrendChart('chart-trend', expenses, settings.currency);
}

// ── AI Insights ───────────────────────────────────────────────────

function renderInsights(expenses, settings) {
  const insights = generateInsights(expenses, settings.currency);
  const recommendations = getRecommendations(expenses, settings.monthlyBudget || 2000, settings.currency);
  const allInsights = [...insights, ...recommendations.map(r => ({ ...r, type: 'info' }))];

  const grid = document.getElementById('insights-grid');
  grid.innerHTML = '';

  allInsights.forEach((insight, i) => {
    const card = document.createElement('div');
    card.className = `insight-card ${insight.type || 'info'}`;
    card.style.animationDelay = `${i * 0.08}s`;
    card.innerHTML = `
      <div class="insight-icon" aria-hidden="true"></div>
      <div class="insight-content">
        <div class="insight-title">${insight.title}</div>
        <div class="insight-message">${insight.message}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ── Transactions List ─────────────────────────────────────────────

function renderTransactions(expenses) {
  let filtered = [...expenses];
  const settings = getSettings();

  // Apply search
  if (currentFilter.search) {
    const q = currentFilter.search.toLowerCase();
    filtered = filtered.filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.notes && e.notes.toLowerCase().includes(q))
    );
  }

  // Apply category filter
  if (currentFilter.category !== 'all') {
    filtered = filtered.filter(e => e.category === currentFilter.category);
  }

  // Apply sort
  switch (currentFilter.sort) {
    case 'date-asc':
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'date-desc':
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'amount-desc':
      filtered.sort((a, b) => b.amount - a.amount);
      break;
    case 'amount-asc':
      filtered.sort((a, b) => a.amount - b.amount);
      break;
  }

  const list = document.getElementById('transactions-list');
  document.getElementById('tx-count-badge').textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-title">You're all set — no expenses yet</div>
        <div class="empty-state-desc">Try typing something like "$8.50 coffee today" in the AI input above, or click + to add one manually.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  filtered.forEach((expense, i) => {
    const catInfo = getCategoryById(expense.category);
    const item = document.createElement('div');
    item.className = 'transaction-item';
    item.style.animationDelay = `${i * 0.04}s`;
    const initials = getInitials(catInfo.name) || catInfo.icon;
    item.innerHTML = `
      <div class="transaction-icon" style="background: ${catInfo.color}20">
        <span class="cat-initial" style="color:${catInfo.color}">${initials}</span>
      </div>
      <div class="transaction-info">
        <div class="transaction-desc">${escapeHtml(expense.description)}</div>
        <div class="transaction-meta">
          <span class="transaction-category-tag" style="background: ${catInfo.color}18; color: ${catInfo.color}">
            ${catInfo.name}
          </span>
          <span>${formatDate(expense.date, 'relative')}</span>
          <span>·</span>
          <span>${formatDate(expense.date, 'short')}</span>
        </div>
      </div>
      <div class="transaction-amount">-${formatCurrency(expense.amount, settings.currency)}</div>
      <div class="transaction-actions">
          <button class="btn-action edit" data-id="${expense.id}" title="Edit" aria-label="Edit expense">E</button>
          <button class="btn-action delete" data-id="${expense.id}" title="Delete" aria-label="Delete expense">D</button>
      </div>
    `;

    // Event listeners
    item.querySelector('.edit').addEventListener('click', () => openModal(expense));
    item.querySelector('.delete').addEventListener('click', () => handleDelete(expense.id));

    list.appendChild(item);
  });
}

// ── Filter Handling ───────────────────────────────────────────────

function handleFilterChange() {
  currentFilter.search = document.getElementById('search-input').value.trim();
  currentFilter.category = document.getElementById('filter-category').value;
  currentFilter.sort = document.getElementById('filter-sort').value;
  renderTransactions(getAllExpenses());
}

// ── Modal (Add/Edit) ──────────────────────────────────────────────

function openModal(expense = null) {
  editingId = expense ? expense.id : null;
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const submitBtn = document.getElementById('modal-submit');

  // Use mobile-friendly wording when in mobile-preview
  const isMobilePreview = document.body.classList.contains('mobile-preview');
  title.textContent = expense ? (isMobilePreview ? 'Edit Entry' : 'Edit Expense') : (isMobilePreview ? 'New Entry' : 'Add Expense');
  submitBtn.textContent = expense ? (isMobilePreview ? 'Save' : 'Save Changes') : (isMobilePreview ? '+ Add Transaction' : 'Add Expense');

  // Populate form
  document.getElementById('form-id').value = expense ? expense.id : '';
  document.getElementById('form-amount').value = expense ? expense.amount : '';
  document.getElementById('form-date').value = expense ? expense.date : toISODate(new Date());
  document.getElementById('form-description').value = expense ? expense.description : '';
  document.getElementById('form-notes').value = expense ? expense.notes || '' : '';

  // Set category
  const selectedCat = expense ? expense.category : 'food';
  document.querySelectorAll('.category-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.category === selectedCat);
  });

  overlay.classList.add('active');
  document.getElementById('form-amount').focus();

  // Sync large mobile amount display
  const amt = parseFloat(document.getElementById('form-amount').value) || 0;
  const settings = getSettings();
  const disp = document.getElementById('modal-amount-display');
  if (disp) disp.textContent = formatCurrency(amt, settings.currency);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  editingId = null;
  document.getElementById('expense-form').reset();
}

function handleFormSubmit(e) {
  e.preventDefault();

  const amount = parseFloat(document.getElementById('form-amount').value);
  const date = document.getElementById('form-date').value;
  const description = document.getElementById('form-description').value.trim();
  const notes = document.getElementById('form-notes').value.trim();

  const selectedCat = document.querySelector('.category-option.selected');
  const category = selectedCat ? selectedCat.dataset.category : 'other';

  if (!amount || amount <= 0 || !description) {
    showToast('Please fill in all required fields.', 'warning');
    return;
  }

  if (editingId) {
    updateExpense(editingId, { amount, date, description, category, notes });
    showToast('✅ Expense updated!', 'success');
  } else {
    addExpense({ id: generateId(), amount, date, description, category, notes });
    const settings = getSettings();
    showToast(`✅ Added ${formatCurrency(amount, settings.currency)}!`, 'success');
  }

  closeModal();
  refreshAll();
}

// ── Delete ────────────────────────────────────────────────────────

function handleDelete(id) {
  const expense = getExpenseById(id);
  if (!expense) return;
  const settings = getSettings();
  openConfirm(`Delete "${expense.description}" for ${formatCurrency(expense.amount, settings.currency)}? This cannot be undone.`, () => {
    deleteExpense(id);
    showToast(`Deleted ${formatCurrency(expense.amount, settings.currency)} — ${expense.description}`, 'info');
    refreshAll();
  });
}

// ── Category Picker (Modal) ───────────────────────────────────────

function initCategoryPicker() {
  const picker = document.getElementById('category-picker');
  picker.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-option';
    btn.dataset.category = cat.id;
    btn.innerHTML = `<span class="cat-icon">${cat.icon}</span>${cat.name}`;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
      btn.classList.add('selected');
    });

    picker.appendChild(btn);
  });
}

// ── Category Filter Dropdown ──────────────────────────────────────

function initCategoryFilter() {
  const select = document.getElementById('filter-category');
  CATEGORIES.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

// ── Settings ──────────────────────────────────────────────────────

function openSettings() {
  const settings = getSettings();
  document.getElementById('settings-budget').value = settings.monthlyBudget || 2000;
  document.getElementById('settings-currency').value = settings.currency || 'USD';
  document.getElementById('settings-overlay').classList.add('active');
}

function closeSettings() {
  document.getElementById('settings-overlay').classList.remove('active');
}

function saveSettings() {
  const budget = parseFloat(document.getElementById('settings-budget').value) || 2000;
  const currency = document.getElementById('settings-currency').value;
  updateSettings({ monthlyBudget: budget, currency });
  closeSettings();
  showToast('⚙️ Settings saved!', 'success');
  refreshAll();
  // Update modal amount display if open
  const disp = document.getElementById('modal-amount-display');
  if (disp && document.getElementById('modal-overlay').classList.contains('active')) {
    const val = parseFloat(document.getElementById('form-amount').value) || 0;
    disp.textContent = formatCurrency(val, currency);
  }
}

function handleClearData() {
  openConfirm('⚠️ This will permanently delete all your expense data. Are you sure?', () => {
    clearAllData();
    closeSettings();
    showToast('🗑️ All data cleared.', 'info');
    refreshAll();
  });
}

// ── In-app confirmation modal ─────────────────────────────────
let __confirmCallback = null;
function openConfirm(message, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  const msg = document.getElementById('confirm-message');
  const yes = document.getElementById('confirm-yes');
  const no = document.getElementById('confirm-no');
  const closeBtn = document.getElementById('confirm-close');

  if (!overlay || !msg) {
    // fallback to native confirm
    if (window.confirm(message)) onConfirm && onConfirm();
    return;
  }

  msg.textContent = message;
  overlay.classList.add('active');
  __confirmCallback = onConfirm;

  function cleanup() {
    overlay.classList.remove('active');
    yes.removeEventListener('click', onYes);
    no.removeEventListener('click', onNo);
    closeBtn.removeEventListener('click', onNo);
    __confirmCallback = null;
  }

  function onYes(e) { e.preventDefault(); if (__confirmCallback) __confirmCallback(); cleanup(); }
  function onNo(e) { e && e.preventDefault(); cleanup(); }

  yes.addEventListener('click', onYes);
  no.addEventListener('click', onNo);
  closeBtn.addEventListener('click', onNo);
}


// ── Export ─────────────────────────────────────────────────────────

function handleExport() {
  const data = exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense-ai-export-${toISODate(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Data exported successfully!', 'success');
}

// ── Toast Notifications ───────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✅', warning: '⚠️', error: '❌', info: '💬' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Utilities ─────────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Robust global click handler: ensures action buttons work even if other bindings fail
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('button');
  if (!btn) return;

  if (btn.classList.contains('edit')) {
    const id = btn.dataset.id;
    if (id) {
      const exp = getExpenseById(id);
      if (exp) openModal(exp);
    }
    return;
  }

  if (btn.classList.contains('delete')) {
    const id = btn.dataset.id;
    if (id) handleDelete(id);
    return;
  }

  if (btn.id === 'btn-export') { handleExport(); return; }
  if (btn.id === 'btn-settings') { openSettings(); return; }
  if (btn.id === 'btn-add-manual' || btn.id === 'bottom-add') { openModal(); return; }
});
