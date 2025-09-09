import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

const form = document.getElementById('cfg-form');
const titleEl = document.getElementById('cfg-title');
const countEl = document.getElementById('cfg-count');
const tbody = document.getElementById('cfg-splits');
const cancelBtn = document.getElementById('cfg-cancel');

function renderRows(n, names=[]) {
  tbody.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td><input type="text" value="${names[i] || `Split ${i+1}`}" /></td>`;
    tbody.appendChild(tr);
  }
}

countEl.addEventListener('change', () => {
  const n = Math.max(1, Math.min(50, Number(countEl.value) || 1));
  countEl.value = String(n);
  renderRows(n);
});

// Load current config from main window
(async () => {
  const unlisten = await listen('config:prefill', (e) => {
    const { title, splits } = e.payload;
    titleEl.value = title || 'Run Title';
    countEl.value = String(splits?.length || 3);
    renderRows(Number(countEl.value), splits || []);
  });
  // Ask main to send current settings
  await emit('config:request');
  window.addEventListener('beforeunload', () => unlisten());
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const n = Number(countEl.value) || 1;
  const names = Array.from(tbody.querySelectorAll('input')).map((i) => i.value.trim() || 'Split');
  await emit('config:save', { title: titleEl.value.trim() || 'Run Title', splits: names.slice(0, n) });
  await getCurrentWindow().close();
});

cancelBtn.addEventListener('click', async () => {
  await getCurrentWindow().close();
});
