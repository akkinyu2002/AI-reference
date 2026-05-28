// ── Chart.js Configurations ───────────────────────────────────────
// Creates and manages Chart.js charts for the dashboard.

import { CATEGORIES, getCategoryById, getMonthName, groupBy, sumBy } from './utils.js';

let categoryChart = null;
let trendChart = null;

// ── Category Donut Chart ──────────────────────────────────────────

export function renderCategoryChart(canvasId, expenses, currency = 'USD') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Group by category
  const byCategory = groupBy(expenses, 'category');
  const data = [];
  const labels = [];
  const colors = [];

  // Sort by total descending
  const entries = Object.entries(byCategory)
    .map(([cat, exps]) => ({ cat, total: sumBy(exps, 'amount') }))
    .sort((a, b) => b.total - a.total);

    entries.forEach(({ cat, total }) => {
    const catInfo = getCategoryById(cat);
    labels.push(catInfo.name);
    data.push(total);
    colors.push(catInfo.color);
  });

  if (data.length === 0) {
    labels.push('No data');
    data.push(1);
    colors.push('#2a2a3e');
  }

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: 'rgba(15, 15, 26, 0.8)',
        borderWidth: 3,
        hoverBorderColor: '#fff',
        hoverBorderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#a0a0b8',
            font: { family: 'Inter', size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          titleColor: '#fff',
          bodyColor: '#a0a0b8',
          borderColor: 'rgba(124, 58, 237, 0.3)',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'Inter' },
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((context.raw / total) * 100).toFixed(1);
              const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency });
              return ` ${fmt.format(context.raw)} (${pct}%)`;
            },
          },
        },
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 800,
        easing: 'easeOutQuart',
      },
    },
  });

  return categoryChart;
}

// ── Monthly Trend Bar Chart ───────────────────────────────────────

export function renderTrendChart(canvasId, expenses, currency = 'USD') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Get last 6 months
  const now = new Date();
  const months = [];
  const totals = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthExpenses = expenses.filter(e => {
      const ed = new Date(e.date);
      return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
    });
    months.push(getMonthName(d.getMonth()));
    totals.push(sumBy(monthExpenses, 'amount'));
  }

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(124, 58, 237, 0.6)');
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)');

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Monthly Spending',
        data: totals,
        backgroundColor: gradient,
        borderColor: 'rgba(124, 58, 237, 0.8)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(124, 58, 237, 0.8)',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#a0a0b8',
            font: { family: 'Inter', size: 12 },
          },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
          ticks: {
            color: '#a0a0b8',
            font: { family: 'Inter', size: 12 },
            callback: function(value) { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value); },
          },
          border: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          titleColor: '#fff',
          bodyColor: '#a0a0b8',
          borderColor: 'rgba(124, 58, 237, 0.3)',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'Inter' },
          callbacks: {
              label: function(context) {
                const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency });
                return ` ${fmt.format(context.raw)}`;
              },
            },
        },
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart',
      },
    },
  });

  return trendChart;
}

// ── Destroy Charts (cleanup) ──────────────────────────────────────

export function destroyCharts() {
  if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
  if (trendChart) { trendChart.destroy(); trendChart = null; }
}
