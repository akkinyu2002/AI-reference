// ── Storage Layer ─────────────────────────────────────────────────
// Wraps localStorage with typed CRUD for expenses, budgets, settings.

const KEYS = {
  EXPENSES: 'xpai_expenses',
  BUDGETS:  'xpai_budgets',
  SETTINGS: 'xpai_settings',
  VERSION:  'xpai_version',
};

const CURRENT_VERSION = 1;

// ── Initialisation ────────────────────────────────────────────────

export function initStorage() {
  const version = JSON.parse(localStorage.getItem(KEYS.VERSION) || '0');
  if (version < CURRENT_VERSION) {
    // Future migrations go here
    localStorage.setItem(KEYS.VERSION, JSON.stringify(CURRENT_VERSION));
  }
  // Ensure keys exist
  if (!localStorage.getItem(KEYS.EXPENSES)) localStorage.setItem(KEYS.EXPENSES, '[]');
  if (!localStorage.getItem(KEYS.BUDGETS))  localStorage.setItem(KEYS.BUDGETS, '{}');
  if (!localStorage.getItem(KEYS.SETTINGS)) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify({
      currency: 'USD',
      monthlyBudget: 2000,
    }));
  }
}

// ── Expenses ──────────────────────────────────────────────────────

function readExpenses() {
  return JSON.parse(localStorage.getItem(KEYS.EXPENSES) || '[]');
}

function writeExpenses(expenses) {
  localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
}

export function getAllExpenses() {
  return readExpenses().sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getExpenseById(id) {
  return readExpenses().find(e => e.id === id) || null;
}

export function addExpense(expense) {
  const expenses = readExpenses();
  expenses.push({ ...expense, createdAt: new Date().toISOString() });
  writeExpenses(expenses);
  return expense;
}

export function updateExpense(id, updates) {
  const expenses = readExpenses();
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return null;
  expenses[idx] = { ...expenses[idx], ...updates, updatedAt: new Date().toISOString() };
  writeExpenses(expenses);
  return expenses[idx];
}

export function deleteExpense(id) {
  const expenses = readExpenses();
  const filtered = expenses.filter(e => e.id !== id);
  writeExpenses(filtered);
  return filtered.length < expenses.length;
}

export function getExpensesByDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return getAllExpenses().filter(e => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
}

export function getExpensesByMonth(year, month) {
  return getAllExpenses().filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function getExpensesByCategory(category) {
  return getAllExpenses().filter(e => e.category === category);
}

// ── Budgets ───────────────────────────────────────────────────────

export function getBudgets() {
  return JSON.parse(localStorage.getItem(KEYS.BUDGETS) || '{}');
}

export function setBudget(category, limit) {
  const budgets = getBudgets();
  budgets[category] = limit;
  localStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
}

export function removeBudget(category) {
  const budgets = getBudgets();
  delete budgets[category];
  localStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
}

// ── Settings ──────────────────────────────────────────────────────

export function getSettings() {
  return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
}

export function updateSettings(updates) {
  const settings = getSettings();
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...settings, ...updates }));
}

// ── Export / Import ───────────────────────────────────────────────

export function exportData() {
  return JSON.stringify({
    version: CURRENT_VERSION,
    expenses: readExpenses(),
    budgets: getBudgets(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.expenses) writeExpenses(data.expenses);
    if (data.budgets) localStorage.setItem(KEYS.BUDGETS, JSON.stringify(data.budgets));
    if (data.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
    return { success: true, count: (data.expenses || []).length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Clear All ─────────────────────────────────────────────────────

export function clearAllData() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  initStorage();
}
