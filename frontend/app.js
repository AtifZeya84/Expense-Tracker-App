

const BACKEND = 'https://expense-tracker-app-su6d.onrender.com';
const API_URL = `${BACKEND}/api/expenses`;

// Keep-alive ping — stops Render from sleeping
setInterval(async () => {
  try { await fetch(API_URL); } catch (e) {}
}, 9 * 60 * 1000);

// ── State ──────────────────────────────────────────────────────
let allExpenses    = [];
let filteredExpenses = [];
let editingId      = null;
let currentFilter  = 'all';
let currentSort    = 'date-desc';
let searchQuery    = '';
let budgetEditCat  = null;
let deletedExpense = null;
let undoTimer      = null;

// budgets stored in localStorage so they persist without backend changes
const BUDGETS_KEY = 'spendlog_budgets';
let budgets = JSON.parse(localStorage.getItem(BUDGETS_KEY) || '{}');

// Chart instances
let chartTrend = null, chartPie = null, chartMonthly = null, chartPie2 = null;

// Category meta
const CAT_META = {
  Food:          { emoji: '🍔', color: '#f0a500' },
  Transport:     { emoji: '🚗', color: '#4ecdc4' },
  Shopping:      { emoji: '🛍', color: '#b48ead' },
  Health:        { emoji: '💊', color: '#ff5f5f' },
  Entertainment: { emoji: '🎬', color: '#4ea8de' },
  Other:         { emoji: '📦', color: '#3dd68c' },
};

// Bootstrap modal handles
let expenseModalEl, budgetModalEl;

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  expenseModalEl = new bootstrap.Modal(document.getElementById('expense-modal'));
  budgetModalEl  = new bootstrap.Modal(document.getElementById('budget-modal'));

  // Set today's date as default
  document.getElementById('input-date').valueAsDate = new Date();

  // Init theme from localStorage
  const saved = localStorage.getItem('spendlog_theme') || 'dark';
  applyTheme(saved);

  loadExpenses();
});

// ── Theme ──────────────────────────────────────────────────────
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-bs-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('spendlog_theme', next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (theme === 'dark') {
    icon.className = 'bi bi-moon-stars-fill';
  } else {
    icon.className = 'bi bi-sun-fill';
  }
  // Rebuild charts so they pick up new CSS variable colours
  if (allExpenses.length) rebuildCharts();
}

function isDark() {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark';
}

// Resolve CSS variables for Chart.js (which can't read them directly)
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ── Navigation ─────────────────────────────────────────────────
function showView(name, triggerBtn) {
  document.querySelectorAll('.sl-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');

  document.querySelectorAll('.sl-nav-item').forEach(b => b.classList.remove('active'));
  if (triggerBtn) triggerBtn.classList.add('active');

  // Lazy-build analytics charts when that tab opens
  if (name === 'analytics') buildAnalyticsCharts();
  if (name === 'budget')    buildBudgetView();
}

// ── API Calls ──────────────────────────────────────────────────
async function loadExpenses() {
  document.getElementById('recent-list').innerHTML = `
    <div style="text-align:center;padding:2rem;opacity:0.6">
      <div class="spinner-border spinner-border-sm me-2"></div>
      Connecting to server...
    </div>`;
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Server error');
    allExpenses = await res.json();
    applyFiltersAndRender();
    updateStats();
    buildDashboardCharts();
    buildBudgetView();
  } catch (e) {
    document.getElementById('recent-list').innerHTML = `
      <div style="text-align:center;padding:2rem">
        <p style="font-size:1.1rem">⏳ Server is waking up...</p>
        <p style="font-size:.85rem;opacity:0.6">Takes ~50 sec on free hosting.<br>Wait then click Try Again.</p>
        <button class="btn sl-btn-primary mt-3" onclick="loadExpenses()">🔄 Try Again</button>
      </div>`;
    showToast('⏳ Server waking up — wait 50 sec then retry', false);
  }
}

async function saveExpense() {
  const title    = document.getElementById('input-title').value.trim();
  const amount   = parseFloat(document.getElementById('input-amount').value);
  const date     = document.getElementById('input-date').value;
  const category = document.getElementById('input-category').value;
  const note     = document.getElementById('input-note').value.trim();

  if (!title || isNaN(amount) || amount <= 0 || !date) {
    showToast('Please fill in all required fields.', false);
    return;
  }

  const payload = { title, amount, date, category, note };

  try {
    let res;
    if (editingId) {
      res = await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) throw new Error();
    expenseModalEl.hide();
    showToast(editingId ? '✅ Expense updated!' : '✅ Expense added!', false);
    editingId = null;
    await loadExpenses();
  } catch {
    showToast('❌ Failed to save. Check backend.', false);
  }
}

async function deleteExpense(id) {
  // Optimistic UI — remove immediately, give undo window
  deletedExpense = allExpenses.find(e => e.id === id);
  allExpenses = allExpenses.filter(e => e.id !== id);
  applyFiltersAndRender();
  updateStats();
  buildDashboardCharts();

  showToast('🗑 Expense deleted', true);

  // Actually delete after 4s unless undone
  clearTimeout(undoTimer);
  undoTimer = setTimeout(async () => {
    deletedExpense = null;
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    } catch {
      showToast('❌ Delete failed on server.', false);
      await loadExpenses();
    }
  }, 4000);
}

async function undoDelete() {
  if (!deletedExpense) return;
  clearTimeout(undoTimer);
  try {
    const { id, ...payload } = deletedExpense;
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    deletedExpense = null;
    showToast('↩️ Undo successful!', false);
    await loadExpenses();
  } catch {
    showToast('❌ Could not undo.', false);
  }
}

// ── Render ─────────────────────────────────────────────────────
function applyFiltersAndRender() {
  let list = [...allExpenses];

  // Category filter
  if (currentFilter !== 'all') {
    list = list.filter(e => e.category === currentFilter);
  }

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.note  || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    );
  }

  // Sort
  list.sort((a, b) => {
    if (currentSort === 'date-desc')   return new Date(b.date) - new Date(a.date);
    if (currentSort === 'date-asc')    return new Date(a.date) - new Date(b.date);
    if (currentSort === 'amount-desc') return b.amount - a.amount;
    if (currentSort === 'amount-asc')  return a.amount - b.amount;
    return 0;
  });

  filteredExpenses = list;

  renderExpenseList('expense-list', list, true);
  renderExpenseList('recent-list', allExpenses.slice(0, 5), false);
}

function renderExpenseList(containerId, list, showEmpty) {
  const el = document.getElementById(containerId);
  if (!list.length) {
    if (showEmpty) {
      el.innerHTML = `
        <div class="sl-empty-state">
          <i class="bi bi-receipt sl-empty-icon"></i>
          <p>No expenses found. ${searchQuery ? 'Try a different search.' : 'Hit <strong>Add Expense</strong> to get started.'}</p>
        </div>`;
    } else {
      el.innerHTML = `<p class="text-muted" style="font-size:.84rem">No recent expenses.</p>`;
    }
    return;
  }

  el.innerHTML = list.map((e, i) => {
    const meta  = CAT_META[e.category] || CAT_META.Other;
    const dateStr = formatDate(e.date);
    return `
      <div class="sl-expense-card" data-cat="${escHtml(e.category)}" style="animation-delay:${i * 0.04}s">
        <div class="sl-expense-emoji">${meta.emoji}</div>
        <div class="sl-expense-info">
          <div class="sl-expense-title">${escHtml(e.title)}</div>
          <div class="sl-expense-meta">
            <span>${dateStr}</span>
            <span class="sl-badge sl-badge-${escHtml(e.category)}">${escHtml(e.category)}</span>
            ${e.note ? `<span class="sl-expense-note">${escHtml(e.note)}</span>` : ''}
          </div>
        </div>
        <div class="sl-expense-amount">₹${Number(e.amount).toFixed(2)}</div>
        <div class="sl-expense-actions">
          <button class="sl-btn-icon edit" onclick="openEditModal(${e.id})" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="sl-btn-icon del"  onclick="deleteExpense(${e.id})"  title="Delete"><i class="bi bi-trash3"></i></button>
        </div>
      </div>`;
  }).join('');
}

// ── Stats ──────────────────────────────────────────────────────
function updateStats() {
  const total = allExpenses.reduce((s, e) => s + e.amount, 0);
  document.getElementById('total-amount').textContent  = `₹${total.toFixed(2)}`;
  document.getElementById('stat-sub-total').textContent = `${allExpenses.length} transaction${allExpenses.length !== 1 ? 's' : ''}`;

  // Avg per day
  const uniqueDays = new Set(allExpenses.map(e => e.date)).size || 1;
  document.getElementById('avg-per-day').textContent = `₹${(total / uniqueDays).toFixed(2)}`;
  document.getElementById('stat-sub-days').textContent = `over ${uniqueDays} day${uniqueDays !== 1 ? 's' : ''}`;

  // Top category
  const catTotals = {};
  allExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const meta = CAT_META[topCat[0]] || CAT_META.Other;
    document.getElementById('top-category').textContent  = `${meta.emoji} ${topCat[0]}`;
    document.getElementById('stat-sub-cat').textContent  = `₹${topCat[1].toFixed(2)} spent`;
  } else {
    document.getElementById('top-category').textContent  = '—';
    document.getElementById('stat-sub-cat').textContent  = 'no data yet';
  }

  // Budget used (sum across all categories that have budgets set)
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  if (totalBudget > 0) {
    const pct = Math.round((total / totalBudget) * 100);
    document.getElementById('budget-used-pct').textContent  = `${pct}%`;
    document.getElementById('stat-sub-budget').textContent  = `of ₹${totalBudget.toFixed(0)} budget`;
  } else {
    document.getElementById('budget-used-pct').textContent  = '—';
    document.getElementById('stat-sub-budget').textContent  = 'no budget set';
  }
}

// ── Charts ─────────────────────────────────────────────────────
function buildDashboardCharts() {
  buildTrendChart(7);
  buildPieChart('chart-pie', 'pie-legend');
}

function rebuildCharts() {
  // Destroy existing chart instances and rebuild
  [chartTrend, chartPie, chartMonthly, chartPie2].forEach(c => { if (c) c.destroy(); });
  chartTrend = chartPie = chartMonthly = chartPie2 = null;
  buildDashboardCharts();
  // If analytics view is visible, rebuild those too
  if (document.getElementById('view-analytics').classList.contains('active')) {
    buildAnalyticsCharts();
  }
}

function switchTrend(days, btn) {
  document.querySelectorAll('.sl-ctab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  buildTrendChart(parseInt(days));
}

function buildTrendChart(days) {
  const ctx = document.getElementById('chart-trend');
  if (chartTrend) { chartTrend.destroy(); chartTrend = null; }

  const labels = [], data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const total = allExpenses.filter(e => e.date === key).reduce((s, e) => s + e.amount, 0);
    labels.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    data.push(total);
  }

  const accent = isDark() ? '#3dd68c' : '#0f9e5e';
  const gridColor = isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark() ? '#5d7290' : '#6b7ea0';

  chartTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: accent,
        backgroundColor: isDark() ? 'rgba(61,214,140,0.08)' : 'rgba(15,158,94,0.08)',
        borderWidth: 2,
        pointBackgroundColor: accent,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => `  ₹${ctx.parsed.y.toFixed(2)}`
      }}},
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'DM Mono', size: 10 }, maxTicksLimit: 8 }},
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'DM Mono', size: 10 }, callback: v => `₹${v}` }},
      }
    }
  });
}

function buildPieChart(canvasId, legendId) {
  const ctx = document.getElementById(canvasId);
  const existingChart = canvasId === 'chart-pie' ? chartPie : chartPie2;
  if (existingChart) { existingChart.destroy(); }

  const catTotals = {};
  allExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const labels = Object.keys(catTotals);
  const values = labels.map(l => catTotals[l]);
  const colors = labels.map(l => (CAT_META[l] || CAT_META.Other).color);
  const total  = values.reduce((a, b) => a + b, 0);

  // Center text plugin — draws total inside the donut
  const centerTextPlugin = {
    id: 'centerText_' + canvasId,
    afterDraw(chart) {
      const { ctx, chartArea: { top, bottom, left, right } } = chart;
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      const isDarkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
      const textColor  = isDarkMode ? '#dce4ef' : '#1a2535';
      const muteColor  = isDarkMode ? '#5d7290' : '#6b7ea0';

      ctx.save();

      // Amount
      ctx.font = '800 20px Syne, sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`\u20B9${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, cx, cy - 10);

      // "TOTAL" label
      ctx.font = '700 11px DM Mono, monospace';
      ctx.fillStyle = muteColor;
      ctx.fillText('TOTAL', cx, cy + 13);

      ctx.restore();
    }
  };

  const instance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#161d27' : '#ffffff',
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      cutout: '78%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return `  ₹${ctx.parsed.toFixed(2)}  (${pct}%)`;
            }
          }
        }
      }
    },
    plugins: [centerTextPlugin]
  });

  if (canvasId === 'chart-pie') chartPie = instance;
  else chartPie2 = instance;

  // Legend — with percentage like Image 1
  if (legendId) {
    const legendEl = document.getElementById(legendId);
    legendEl.innerHTML = labels.map((l, i) => {
      const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0';
      return `
        <div class="sl-pie-legend-item">
          <span class="sl-pie-dot" style="background:${colors[i]}"></span>
          <span class="sl-pie-label">${(CAT_META[l]||CAT_META.Other).emoji} ${l}</span>
          <span class="sl-pie-val">${pct}%</span>
        </div>`;
    }).join('');
  }
}

function buildAnalyticsCharts() {
  buildMonthlyChart();
  buildPieChart('chart-pie2', null);
  buildCatTotals();
}

function buildMonthlyChart() {
  const ctx = document.getElementById('chart-monthly');
  if (chartMonthly) { chartMonthly.destroy(); chartMonthly = null; }

  // Gather last 6 months
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` });
  }

  const catKeys  = Object.keys(CAT_META);
  const gridColor = isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark() ? '#5d7290' : '#6b7ea0';

  const datasets = catKeys.map(cat => ({
    label: cat,
    data: months.map(m => allExpenses.filter(e => e.category === cat && e.date.startsWith(m.key)).reduce((s, e) => s + e.amount, 0)),
    backgroundColor: CAT_META[cat].color + 'cc',
    borderRadius: 4,
  }));

  chartMonthly = new Chart(ctx, {
    type: 'bar',
    data: { labels: months.map(m => m.label), datasets },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: textColor, font: { family: 'DM Mono', size: 10 }, boxWidth: 10 }}},
      scales: {
        x: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'DM Mono', size: 10 }}},
        y: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'DM Mono', size: 10 }, callback: v => `₹${v}` }},
      }
    }
  });
}

function buildCatTotals() {
  const catTotals = {};
  allExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  document.getElementById('cat-totals-list').innerHTML = sorted.map(([cat, amt]) => {
    const meta = CAT_META[cat] || CAT_META.Other;
    const pct  = Math.round((amt / max) * 100);
    return `
      <div class="sl-cat-row">
        <div class="sl-cat-row-top">
          <span>${meta.emoji} ${cat}</span>
          <span class="sl-cat-amt">₹${amt.toFixed(2)}</span>
        </div>
        <div class="sl-progress-bg">
          <div class="sl-progress-fill" style="width:${pct}%;background:${meta.color}"></div>
        </div>
      </div>`;
  }).join('') || '<p class="text-muted" style="font-size:.84rem">No data yet.</p>';
}

// ── Budget ─────────────────────────────────────────────────────
function buildBudgetView() {
  const catTotals = {};
  allExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });

  document.getElementById('budget-grid').innerHTML = Object.entries(CAT_META).map(([cat, meta]) => {
    const spent  = catTotals[cat] || 0;
    const limit  = budgets[cat] || 0;
    const pct    = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const barColor = pct >= 100 ? '#ff5f5f' : pct >= 75 ? '#f0a500' : meta.color;
    const statusClass = pct >= 100 ? 'over' : pct >= 75 ? 'warn' : '';
    const statusText  = !limit ? 'No limit set' : pct >= 100 ? `Over by ₹${(spent - limit).toFixed(2)}` : pct >= 75 ? `${Math.round(pct)}% used — getting close` : `${Math.round(pct)}% used`;

    return `
      <div class="col-12 col-sm-6 col-xl-4">
        <div class="sl-budget-card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="sl-budget-cat-name">${meta.emoji} ${cat}</span>
            <button class="sl-budget-edit-btn" onclick="openBudgetModal('${cat}')">Edit</button>
          </div>
          <div class="d-flex justify-content-between align-items-end">
            <span class="sl-budget-spent" style="color:${meta.color}">₹${spent.toFixed(2)}</span>
            <span class="sl-budget-limit">${limit > 0 ? `/ ₹${limit.toFixed(0)}` : 'No limit'}</span>
          </div>
          <div class="sl-budget-bar-bg">
            <div class="sl-budget-bar-fill" style="width:${limit > 0 ? pct : 0}%;background:${barColor}"></div>
          </div>
          <div class="sl-budget-status ${statusClass}">${statusText}</div>
        </div>
      </div>`;
  }).join('');
}

function openBudgetModal(cat) {
  budgetEditCat = cat;
  document.getElementById('budget-modal-title').textContent = `Budget — ${CAT_META[cat].emoji} ${cat}`;
  document.getElementById('budget-input').value = budgets[cat] || '';
  budgetModalEl.show();
}

function saveBudget() {
  const val = parseFloat(document.getElementById('budget-input').value);
  if (isNaN(val) || val < 0) { showToast('Enter a valid amount.', false); return; }
  if (val === 0) {
    delete budgets[budgetEditCat];
  } else {
    budgets[budgetEditCat] = val;
  }
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
  budgetModalEl.hide();
  buildBudgetView();
  updateStats();
  showToast(`✅ Budget for ${budgetEditCat} saved!`, false);
}

// ── Modal helpers ──────────────────────────────────────────────
function openModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add Expense';
  document.getElementById('input-title').value    = '';
  document.getElementById('input-amount').value   = '';
  document.getElementById('input-date').valueAsDate = new Date();
  document.getElementById('input-category').value = 'Food';
  document.getElementById('input-note').value     = '';
  expenseModalEl.show();
}

function openEditModal(id) {
  const e = allExpenses.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit Expense';
  document.getElementById('input-title').value    = e.title;
  document.getElementById('input-amount').value   = e.amount;
  document.getElementById('input-date').value     = e.date;
  document.getElementById('input-category').value = e.category;
  document.getElementById('input-note').value     = e.note || '';
  expenseModalEl.show();
}

// ── Filters / Sort / Search ────────────────────────────────────
function filterByCategory(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.sl-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyFiltersAndRender();
}

function handleSort() {
  currentSort = document.getElementById('sort-select').value;
  applyFiltersAndRender();
}

function handleSearch() {
  searchQuery = document.getElementById('search-input')?.value || '';
  applyFiltersAndRender();
}

// ── CSV Export ─────────────────────────────────────────────────
function exportCSV() {
  if (!allExpenses.length) { showToast('No expenses to export.', false); return; }
  const header = ['ID', 'Title', 'Amount', 'Category', 'Date', 'Note'];
  const rows   = allExpenses.map(e => [
    e.id,
    `"${(e.title || '').replace(/"/g, '""')}"`,
    e.amount.toFixed(2),
    e.category,
    e.date,
    `"${(e.note || '').replace(/"/g, '""')}"`
  ]);
  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `spendlog_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV exported!', false);
}

// ── Toast ──────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, showUndo) {
  const toast   = document.getElementById('sl-toast');
  const msgEl   = document.getElementById('toast-msg');
  const undoBtn = document.getElementById('toast-undo');

  msgEl.textContent = msg;
  undoBtn.style.display = showUndo ? 'inline-block' : 'none';

  toast.style.removeProperty('display');
  // force reflow
  toast.offsetHeight;
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, showUndo ? 5000 : 2500);
}

// ── Helpers ────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
