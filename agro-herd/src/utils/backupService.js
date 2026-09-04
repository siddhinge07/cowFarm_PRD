import { formatDate, formatDateTime, formatCurrency, downloadCSV, downloadJSON } from './helpers';

export async function downloadOverallHistoryCSV(api) {
  const [cowsRes, cyclesRes, milkRes, healthRes, expensesRes] = await Promise.all([
    api.get('/cows?limit=5000').catch(() => ({ data: [] })),
    api.get('/cycles').catch(() => ({ data: [] })),
    api.get('/milk?limit=10000').catch(() => ({ data: [] })),
    api.get('/health?limit=5000').catch(() => ({ data: [] })),
    api.get('/expenses?limit=5000').catch(() => ({ data: [] }))
  ]);

  const cows = Array.isArray(cowsRes?.data) ? cowsRes.data : [];
  const cowMap = {};
  cows.forEach(c => { cowMap[c.id] = c; });

  const cycles = Array.isArray(cyclesRes?.data) ? cyclesRes.data : [];
  const milk = Array.isArray(milkRes?.data) ? milkRes.data : [];
  const health = Array.isArray(healthRes?.data) ? healthRes.data : [];
  const expenses = Array.isArray(expensesRes?.data) ? expensesRes.data : [];

  const timeline = [];

  // 1. Cycles
  cycles.forEach(c => {
    const cow = cowMap[c.cow_id] || {};
    timeline.push({
      dateRaw: c.last_cycle_date || c.created_at,
      'Date': formatDate(c.last_cycle_date),
      'Record Type': 'Heat / Estrus Cycle',
      'Cow Tag': c.tag_number || cow.tag_number || c.cow_id || '—',
      'Cow Name': c.name || cow.name || '—',
      'Details / Action': `Status: ${String(c.cycle_status || '').replace(/_/g, ' ')}${c.notes ? ` | Notes: ${c.notes}` : ''}`,
      'Quantity / Cost': '—',
      'Recorded On': formatDateTime(c.created_at)
    });
  });

  // 2. Milk Records
  milk.forEach(m => {
    const cow = cowMap[m.cow_id] || m.cows || {};
    const totalIncome = (Number(m.quantity_liters) * Number(m.price_per_liter || 0)).toFixed(2);
    timeline.push({
      dateRaw: m.record_date || m.created_at,
      'Date': formatDate(m.record_date),
      'Record Type': 'Milk Production',
      'Cow Tag': m.tag_number || cow.tag_number || m.cow_id || '—',
      'Cow Name': cow.name || '—',
      'Details / Action': `Session: ${m.session || '—'} | Grade: ${m.quality_grade || '—'} | Rate: ₹${m.price_per_liter || 0}/L`,
      'Quantity / Cost': `${m.quantity_liters} L (₹${totalIncome})`,
      'Recorded On': formatDateTime(m.created_at)
    });
  });

  // 3. Health Records
  health.forEach(h => {
    const cow = cowMap[h.cow_id] || h.cows || {};
    timeline.push({
      dateRaw: h.record_date || h.created_at,
      'Date': formatDate(h.record_date),
      'Record Type': 'Health & Vet',
      'Cow Tag': h.tag_number || cow.tag_number || h.cow_id || '—',
      'Cow Name': cow.name || '—',
      'Details / Action': `Type: ${h.record_type || '—'} | Diagnosis: ${h.diagnosis || '—'} | Vet: ${h.vet_name || '—'}${h.notes ? ` | Notes: ${h.notes}` : ''}`,
      'Quantity / Cost': h.cost ? `₹${h.cost}` : '—',
      'Recorded On': formatDateTime(h.created_at)
    });
  });

  // 4. Expenses
  expenses.forEach(e => {
    const cow = cowMap[e.cow_id] || e.cows || {};
    timeline.push({
      dateRaw: e.expense_date || e.created_at,
      'Date': formatDate(e.expense_date),
      'Record Type': 'Expense',
      'Cow Tag': e.cow_id ? (cow.tag_number || e.cow_id) : 'Farm-wide',
      'Cow Name': cow.name || 'All Cows',
      'Details / Action': `Category: ${e.category || '—'}${e.sub_category ? ` (${e.sub_category})` : ''} | Vendor: ${e.vendor || '—'}${e.notes ? ` | Notes: ${e.notes}` : ''}`,
      'Quantity / Cost': `₹${e.amount}`,
      'Recorded On': formatDateTime(e.created_at)
    });
  });

  // 5. Cow Registration Events
  cows.forEach(c => {
    timeline.push({
      dateRaw: c.purchase_date || c.date_of_birth || c.created_at,
      'Date': formatDate(c.purchase_date || c.date_of_birth || c.created_at),
      'Record Type': 'Cow Registration',
      'Cow Tag': c.tag_number,
      'Cow Name': c.name || '—',
      'Details / Action': `Breed: ${c.breed} | Status: ${c.health_status} | Milking: ${c.is_milking ? 'Yes' : 'No'} | Weight: ${c.weight_kg ? `${c.weight_kg}kg` : '—'}`,
      'Quantity / Cost': c.purchase_price ? `₹${c.purchase_price}` : '—',
      'Recorded On': formatDateTime(c.created_at)
    });
  });

  // Sort descending by date
  timeline.sort((a, b) => new Date(b.dateRaw) - new Date(a.dateRaw));

  // Strip temporary sorting key
  const finalData = timeline.map(({ dateRaw, ...rest }) => rest);

  downloadCSV(finalData, 'farm_overall_history_backup');
  recordBackupCompleted();
  return finalData.length;
}

export async function downloadFullBackupJSON(api) {
  const [cowsRes, cyclesRes, milkRes, healthRes, expensesRes] = await Promise.all([
    api.get('/cows?limit=5000').catch(() => ({ data: [] })),
    api.get('/cycles').catch(() => ({ data: [] })),
    api.get('/milk?limit=10000').catch(() => ({ data: [] })),
    api.get('/health?limit=5000').catch(() => ({ data: [] })),
    api.get('/expenses?limit=5000').catch(() => ({ data: [] }))
  ]);

  const cows = Array.isArray(cowsRes?.data) ? cowsRes.data : [];
  const cycles = Array.isArray(cyclesRes?.data) ? cyclesRes.data : [];
  const milk = Array.isArray(milkRes?.data) ? milkRes.data : [];
  const health = Array.isArray(healthRes?.data) ? healthRes.data : [];
  const expenses = Array.isArray(expensesRes?.data) ? expensesRes.data : [];

  const fullBackup = {
    backup_type: 'AGROHERD_FULL_FARM_BACKUP',
    version: '1.0',
    exported_at: new Date().toISOString(),
    counts: {
      total_cows: cows.length,
      total_cycles: cycles.length,
      total_milk_records: milk.length,
      total_health_records: health.length,
      total_expenses: expenses.length
    },
    cows,
    cycles,
    milk_records: milk,
    health_records: health,
    expenses
  };

  downloadJSON(fullBackup, 'agroherd_complete_farm_backup');
  recordBackupCompleted();
  return fullBackup.counts;
}

export function recordBackupCompleted() {
  localStorage.setItem('agroherd_last_backup_date', new Date().toISOString());
  localStorage.removeItem('agroherd_backup_dismissed_until');
}

export function getLastBackupDate() {
  return localStorage.getItem('agroherd_last_backup_date');
}

export function getDaysSinceLastBackup() {
  const last = localStorage.getItem('agroherd_last_backup_date');
  if (!last) return null; // Never backed up
  const d = new Date(last);
  if (isNaN(d.getTime())) return null;
  const diffMs = new Date() - d;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isBackupDue() {
  const dismissedUntil = localStorage.getItem('agroherd_backup_dismissed_until');
  if (dismissedUntil && dismissedUntil === new Date().toDateString()) {
    return false;
  }
  const days = getDaysSinceLastBackup();
  // If never backed up, or >= 7 days
  return days === null || days >= 7;
}

export function dismissBackupForToday() {
  localStorage.setItem('agroherd_backup_dismissed_until', new Date().toDateString());
}
