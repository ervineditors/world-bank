// Konfigurasi Firebase Realtime Database
const firebaseConfig = {
  apiKey: "PASTE_API_KEY_LU",
  authDomain: "PASTE_AUTH_DOMAIN_LU",
  databaseURL: "PASTE_DATABASE_URL_LU",
  projectId: "PASTE_PROJECT_ID_LU",
  storageBucket: "PASTE_STORAGE_BUCKET_LU",
  messagingSenderId: "PASTE_SENDER_ID_LU",
  appId: "PASTE_APP_ID_LU"
};

// Inisialisasi Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// DOM References
const wcbForm = document.getElementById('wcbForm');
const countryTableBody = document.getElementById('countryTableBody');
const auditLog = document.getElementById('auditLog');
const tableSearch = document.getElementById('tableSearch');

// Global Analytics State
let globalChartLiquidity = null;
let globalChartStatus = null;
let currentCountriesData = {};

// Live Clock UTC
setInterval(() => {
  const now = new Date();
  document.getElementById('liveClock').textContent = now.toUTCString().replace('GMT', 'UTC');
}, 1000);

// Log System Function
function addLog(message, type = 'INFO') {
  const time = new Date().toLocaleTimeString();
  const color = type === 'WARN' ? 'text-amber-400' : (type === 'DANGER' ? 'text-red-400' : 'text-cyan-400');
  
  const logEntry = document.createElement('p');
  logEntry.innerHTML = `<span class="text-slate-600">[${time}]</span> <span class="${color}">[${type}]</span> ${message}`;
  
  auditLog.prepend(logEntry);
}

// Initialize Charts
function initCharts() {
  const ctxLiquidity = document.getElementById('liquidityChart').getContext('2d');
  globalChartLiquidity = new Chart(ctxLiquidity, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Kurs EUPH',
        data: [],
        backgroundColor: 'rgba(6, 182, 212, 0.4)',
        borderColor: '#06b6d4',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
      }
    }
  });

  const ctxStatus = document.getElementById('statusChart').getContext('2d');
  globalChartStatus = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Aktif', 'Frozen'],
      datasets: [{
        data: [0, 0],
        backgroundColor: ['#10b981', '#f43f5e'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
    }
  });
}

// Submit Data Form
wcbForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const countryName = document.getElementById('countryName').value.trim();
  const localCurrency = document.getElementById('localCurrency').value.trim();
  const euphRate = parseFloat(document.getElementById('euphRate').value);
  const warehouseSupply = parseInt(document.getElementById('warehouseSupply').value);
  const inflationRate = parseFloat(document.getElementById('inflationRate').value);

  if (!countryName) return;

  const countryRef = db.ref('countries/' + countryName);
  
  countryRef.set({
    name: countryName,
    currency: localCurrency,
    euphRate: euphRate,
    warehouse: warehouseSupply,
    inflation: inflationRate,
    status: 'Active',
    updatedAt: Date.now()
  })
  .then(() => {
    addLog(`Data moneter negara ${countryName} berhasil diperbarui.`, 'INFO');
    wcbForm.reset();
  })
  .catch((err) => {
    addLog(`Gagal menyimpan data ${countryName}: ${err.message}`, 'DANGER');
  });
});

// Realtime Listener Firebase Database
db.ref('countries').on('value', (snapshot) => {
  const data = snapshot.val() || {};
  currentCountriesData = data;
  renderTableAndStats(data);
});

// Render Table, Summary Cards, & Charts
function renderTableAndStats(data) {
  countryTableBody.innerHTML = '';
  
  const keys = Object.keys(data);
  const filterQuery = tableSearch.value.toLowerCase();

  let totalCountries = 0;
  let totalLiquidity = 0;
  let totalWarehouse = 0;
  let totalInflationSum = 0;
  let activeCount = 0;
  let frozenCount = 0;

  const chartLabels = [];
  const chartData = [];

  if (keys.length === 0) {
    countryTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-500 italic">
          Belum ada data negara terdaftar di sistem WCB.
        </td>
      </tr>`;
    updateSummaryCards(0, 0, 0, 0);
    return;
  }

  keys.forEach((key) => {
    const item = data[key];

    // Filter Logic
    if (filterQuery && !item.name.toLowerCase().includes(filterQuery) && !item.currency.toLowerCase().includes(filterQuery)) {
      return;
    }

    totalCountries++;
    totalLiquidity += (item.euphRate || 0);
    totalWarehouse += (item.warehouse || 0);
    totalInflationSum += (item.inflation || 0);

    if (item.status === 'Frozen') {
      frozenCount++;
    } else {
      activeCount++;
    }

    chartLabels.push(item.name);
    chartData.push(item.euphRate);

    const isFrozen = item.status === 'Frozen';
    const row = document.createElement('tr');
    row.className = "hover:bg-slate-800/40 transition border-b border-slate-800/40";

    row.innerHTML = `
      <td class="py-3 px-3 font-semibold text-cyan-300 flex items-center gap-2">
        <i class="fa-solid fa-landmark text-slate-500"></i> ${item.name}
      </td>
      <td class="py-3 px-3 font-mono text-slate-300">${item.currency}</td>
      <td class="py-3 px-3 font-mono font-semibold text-emerald-400">${item.euphRate} EUPH</td>
      <td class="py-3 px-3 font-mono text-slate-300">${(item.warehouse || 0).toLocaleString()}</td>
      <td class="py-3 px-3 font-mono text-amber-400">${item.inflation || 0}%</td>
      <td class="py-3 px-3">
        <span class="px-2.5 py-1 text-[10px] font-semibold rounded-full ${isFrozen ? 'bg-red-950/80 text-red-400 border border-red-800' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'}">
          ${item.status || 'Active'}
        </span>
      </td>
      <td class="py-3 px-3 text-right space-x-1">
        <button onclick="toggleFreeze('${item.name}', '${item.status}')" class="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition">
          <i class="fa-solid ${isFrozen ? 'fa-lock-open' : 'fa-lock'}"></i> ${isFrozen ? 'Unfreeze' : 'Freeze'}
        </button>
        <button onclick="deleteCountry('${item.name}')" class="px-2.5 py-1 text-xs bg-red-950/50 hover:bg-red-900 text-red-300 rounded-lg border border-red-800 transition">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    countryTableBody.appendChild(row);
  });

  const avgInflation = totalCountries > 0 ? (totalInflationSum / totalCountries).toFixed(2) : 0;
  updateSummaryCards(totalCountries, totalLiquidity.toFixed(2), avgInflation, totalWarehouse);

  // Update Charts
  if (globalChartLiquidity) {
    globalChartLiquidity.data.labels = chartLabels;
    globalChartLiquidity.data.datasets[0].data = chartData;
    globalChartLiquidity.update();
  }

  if (globalChartStatus) {
    globalChartStatus.data.datasets[0].data = [activeCount, frozenCount];
    globalChartStatus.update();
  }
}

// Update Top Stat Cards
function updateSummaryCards(countries, liquidity, avgInflation, warehouse) {
  document.getElementById('statTotalCountries').textContent = countries;
  document.getElementById('statTotalLiquidity').textContent = liquidity + ' EUPH';
  document.getElementById('statAvgInflation').textContent = avgInflation + '%';
  document.getElementById('statTotalWarehouse').textContent = warehouse.toLocaleString() + ' Unit';
}

// Search Filter Listener
tableSearch.addEventListener('input', () => {
  renderTableAndStats(currentCountriesData);
});

// Admin Actions
window.toggleFreeze = function(countryName, currentStatus) {
  const newStatus = currentStatus === 'Frozen' ? 'Active' : 'Frozen';
  db.ref('countries/' + countryName).update({ status: newStatus })
    .then(() => addLog(`Status moneter ${countryName} diubah ke ${newStatus}.`, 'WARN'));
};

window.deleteCountry = function(countryName) {
  if (confirm(`Apakah Anda yakin ingin menghapus data moneter ${countryName}?`)) {
    db.ref('countries/' + countryName).remove()
      .then(() => addLog(`Data negara ${countryName} dihapus dari sistem.`, 'DANGER'));
  }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  addLog('Sistem Portal World Central Bank siap digerakkan.', 'INFO');
});
