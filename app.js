// Konfigurasi Firebase Realtime Database
const firebaseConfig = {
  apiKey: "PASTE_API_KEY_ASLI_KAMU",
  authDomain: "wcb-sovereign.firebaseapp.com",
  databaseURL: "https://wcb-sovereign-default-rtdb.firebaseio.com",
  projectId: "wcb-sovereign",
  storageBucket: "wcb-sovereign.appspot.com",
  messagingSenderId: "278609307748",
  appId: "1:278609307748:web:cb7be032e60818be765771"
};

// Inisialisasi Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// PIN Akses Admin
const ADMIN_PIN = "123456";

let liquidityChartInstance = null;

// Deteksi halaman saat dimuat
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('publicTableBody')) {
    initPublicPortal();
  }
  if (document.getElementById('adminAuthModal')) {
    initAdminPanel();
  }
});

// ==========================================
// 1. PORTAL PUBLIK & MEMBER (index.html)
// ==========================================
function initPublicPortal() {
  const regForm = document.getElementById('memberRegisterForm');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const country = document.getElementById('regCountryName').value.trim();
      const currency = document.getElementById('regCurrency').value.trim();
      const leader = document.getElementById('regLeader').value.trim();
      const flag = document.getElementById('regFlag').value.trim();

      const pendingRef = db.ref('pending_members').push();
      pendingRef.set({
        country,
        currency,
        leader,
        flag,
        timestamp: Date.now()
      }).then(() => {
        alert(`Pengajuan integrasi untuk negara ${country} berhasil dikirim! Menunggu ACC Pengurus WCB.`);
        regForm.reset();
      }).catch(err => alert("Gagal mengirim pengajuan: " + err.message));
    });
  }

  db.ref('monetary_data').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    updateGlobalMetrics(data);
    renderPublicTable(data);
    renderLiquidityChart(data);
  });
}

function updateGlobalMetrics(data) {
  const keys = Object.keys(data);
  let totalLiquidity = 0;
  let totalWarehouse = 0;
  let totalInflation = 0;

  keys.forEach(key => {
    const item = data[key];
    totalLiquidity += Number(item.kurs || 0) * Number(item.stock || 0);
    totalWarehouse += Number(item.stock || 0);
    totalInflation += Number(item.inflation || 0);
  });

  const avgInflation = keys.length > 0 ? (totalInflation / keys.length).toFixed(1) : 0;

  document.getElementById('statTotalCountries').textContent = keys.length;
  document.getElementById('statTotalLiquidity').textContent = totalLiquidity.toLocaleString() + ' EUPH';
  document.getElementById('statAvgInflation').textContent = avgInflation + '%';
  document.getElementById('statTotalWarehouse').textContent = totalWarehouse.toLocaleString() + ' Unit';
}

function renderPublicTable(data) {
  const tbody = document.getElementById('publicTableBody');
  tbody.innerHTML = '';

  const keys = Object.keys(data);
  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-500 italic">Belum ada negara anggota yang terverifikasi.</td></tr>';
    return;
  }

  keys.forEach(key => {
    const item = data[key];
    const statusClass = item.status === 'Frozen' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition';
    tr.innerHTML = `
      <td class="py-3 px-3 font-semibold text-white flex items-center gap-2">
        ${item.flag ? `<img src="${item.flag}" class="w-5 h-4 object-cover rounded shadow">` : '<i class="fa-solid fa-flag text-cyan-400"></i>'}
        ${item.country}
      </td>
      <td class="py-3 px-3 font-mono text-cyan-300">${item.currency}</td>
      <td class="py-3 px-3 font-mono">${parseFloat(item.kurs).toFixed(2)} EUPH</td>
      <td class="py-3 px-3 font-mono">${Number(item.stock).toLocaleString()}</td>
      <td class="py-3 px-3 font-mono text-amber-400">${item.inflation}%</td>
      <td class="py-3 px-3"><span class="px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClass}">${item.status || 'Active'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLiquidityChart(data) {
  const ctx = document.getElementById('liquidityChart');
  if (!ctx) return;

  const labels = [];
  const values = [];

  Object.values(data).forEach(item => {
    labels.push(item.country);
    values.push(item.stock);
  });

  if (liquidityChartInstance) liquidityChartInstance.destroy();

  liquidityChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Cadangan Gudang (Unit)',
        data: values,
        backgroundColor: '#06b6d4',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }
      }
    }
  });
}

// ==========================================
// 2. PANEL ADMIN WCB (admin.html)
// ==========================================
function initAdminPanel() {
  const modal = document.getElementById('adminAuthModal');
  const content = document.getElementById('adminDashboardContent');
  const btnLogin = document.getElementById('btnLoginAdmin');
  const pinInput = document.getElementById('adminPinInput');
  const errorMsg = document.getElementById('authError');

  btnLogin.addEventListener('click', () => {
    if (pinInput.value === ADMIN_PIN) {
      modal.classList.add('hidden');
      content.classList.remove('hidden');
      loadAdminBackend();
    } else {
      errorMsg.textContent = "PIN Keamanan Salah! Akses Ditolak.";
    }
  });

  pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnLogin.click();
  });
}

function loadAdminBackend() {
  db.ref('pending_members').on('value', (snapshot) => {
    renderPendingTable(snapshot.val() || {});
  });

  db.ref('monetary_data').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    const select = document.getElementById('adminSelectCountry');
    select.innerHTML = '<option value="">-- Pilih Negara Anggota --</option>';

    Object.keys(data).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${data[key].country} (${data[key].currency})`;
      select.appendChild(opt);
    });
  });

  const updateForm = document.getElementById('adminUpdateForm');
  updateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const key = document.getElementById('adminSelectCountry').value;
    const kurs = document.getElementById('adminKurs').value;
    const stock = document.getElementById('adminStock').value;
    const inflation = document.getElementById('adminInflation').value;
    const status = document.getElementById('adminStatus').value;

    if (!key) return alert("Pilih negara terlebih dahulu!");

    db.ref(`monetary_data/${key}`).update({
      kurs: parseFloat(kurs),
      stock: parseInt(stock),
      inflation: parseFloat(inflation),
      status: status
    }).then(() => {
      logAdminAction(`Kebijakan Moneter diperbarui untuk [${key}]: Kurs ${kurs}, Stok ${stock}, Status ${status}`);
      alert("Kebijakan Moneter Berhasil Diterbitkan!");
      updateForm.reset();
    });
  });
}

function renderPendingTable(pendingData) {
  const tbody = document.getElementById('adminPendingTable');
  tbody.innerHTML = '';

  const keys = Object.keys(pendingData);
  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-slate-500 italic">Tidak ada antrean pengajuan member.</td></tr>';
    return;
  }

  keys.forEach(key => {
    const item = pendingData[key];
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition';
    tr.innerHTML = `
      <td class="py-3 px-2 font-semibold text-white">${item.country}</td>
      <td class="py-3 px-2 font-mono text-cyan-300">${item.currency}</td>
      <td class="py-3 px-2">${item.leader}</td>
      <td class="py-3 px-2 text-right space-x-1">
        <button onclick="approveMember('${key}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition">ACC</button>
        <button onclick="rejectMember('${key}')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs transition">Tolak</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.approveMember = function(key) {
  db.ref(`pending_members/${key}`).once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const newRef = db.ref('monetary_data').push();
    newRef.set({
      country: data.country,
      currency: data.currency,
      leader: data.leader,
      flag: data.flag || '',
      kurs: 1.00,
      stock: 1000,
      inflation: 2.5,
      status: 'Active'
    }).then(() => {
      db.ref(`pending_members/${key}`).remove();
      logAdminAction(`Negara ${data.country} disahkan sebagai Member Resmi WCB!`);
      alert(`Negara ${data.country} Berhasil Disahkan!`);
    });
  });
};

window.rejectMember = function(key) {
  if (confirm("Yakin ingin menolak pengajuan negara ini?")) {
    db.ref(`pending_members/${key}`).remove();
    logAdminAction(`Pengajuan member ID ${key} ditolak.`);
  }
};

function logAdminAction(text) {
  const logRef = db.ref('admin_logs').push();
  logRef.set({
    action: text,
    timestamp: Date.now()
  });

  const auditBox = document.getElementById('adminAuditLog');
  if (auditBox) {
    const p = document.createElement('p');
    p.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    auditBox.prepend(p);
  }
}
