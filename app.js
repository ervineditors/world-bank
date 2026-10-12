const firebaseConfig = {
  apiKey: "PASTE_API_KEY_ASLI_KAMU",
  authDomain: "wcb-sovereign.firebaseapp.com",
  databaseURL: "https://wcb-sovereign-default-rtdb.firebaseio.com",
  projectId: "wcb-sovereign",
  storageBucket: "wcb-sovereign.appspot.com",
  messagingSenderId: "278609307748",
  appId: "1:278609307748:web:cb7be032e60818be765771"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const ADMIN_PIN = "272727";

let activeUser = JSON.parse(localStorage.getItem('wcb_active_user')) || null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('content-bank')) {
    initMemberPortal();
  }
  if (document.getElementById('adminAuthModal')) {
    initAdminVault();
  }
});

// SWITCH 3 KOTAK PORTAL AUTH
function switchAuthBox(boxNum) {
  document.getElementById('authBox1').classList.add('hidden');
  document.getElementById('authBox2').classList.add('hidden');
  document.getElementById('authBox3').classList.add('hidden');

  document.getElementById('box1Btn').className = "py-2.5 rounded-lg text-slate-400 hover:text-white transition";
  document.getElementById('box2Btn').className = "py-2.5 rounded-lg text-slate-400 hover:text-white transition";
  document.getElementById('box3Btn').className = "py-2.5 rounded-lg text-slate-400 hover:text-white transition";

  document.getElementById(`authBox${boxNum}`).classList.remove('hidden');
  if (boxNum === 1) document.getElementById('box1Btn').className = "py-2.5 rounded-lg bg-cyan-600 text-white transition shadow-lg";
  if (boxNum === 2) document.getElementById('box2Btn').className = "py-2.5 rounded-lg bg-blue-600 text-white transition shadow-lg";
  if (boxNum === 3) document.getElementById('box3Btn').className = "py-2.5 rounded-lg bg-amber-600 text-white transition shadow-lg";
}

function initMemberPortal() {
  if (activeUser) {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('activeCountryBadge').textContent = activeUser.country;
    if (activeUser.community) document.getElementById('communityBadge').textContent = `Server: ${activeUser.community}`;
    if (activeUser.flag) document.getElementById('countryFlagBox').innerHTML = `<img src="${activeUser.flag}" class="w-full h-full object-cover rounded-lg">`;
  }

  // KOTAK 1: LOGIN MEMBER FORM
  const loginForm = document.getElementById('authBox1');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const country = document.getElementById('loginCountry').value.trim();
      const pin = document.getElementById('loginPin').value.trim();

      db.ref('monetary_data').once('value').then(snap => {
        const data = snap.val() || {};
        let foundKey = null;
        Object.keys(data).forEach(k => {
          if (data[k].country.toLowerCase() === country.toLowerCase() && String(data[k].pin) === String(pin)) {
            foundKey = k;
          }
        });
        if (foundKey) {
          if (data[foundKey].status === 'Frozen') return alert("⚠️ AKUN DIBEKUKAN ADMIN!");
          activeUser = { key: foundKey, ...data[foundKey] };
          localStorage.setItem('wcb_active_user', JSON.stringify(activeUser));
          document.getElementById('authModal').classList.add('hidden');
          location.reload();
        } else {
          alert("Nama Negara atau PIN Salah!");
        }
      });
    });
  }

  // KOTAK 2: REGISTRASI AKUN NEGARA FORM
  const regForm = document.getElementById('authBox2');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const country = document.getElementById('regCountry').value.trim();
      const leader = document.getElementById('regLeader').value.trim();
      const currency = document.getElementById('regCurrency').value.trim();
      const flag = document.getElementById('regFlag').value.trim();
      const community = document.getElementById('regCommunity').value.trim();
      const popInput = document.getElementById('regPopulation');
      const pop = Number(popInput.value);
      const pin = document.getElementById('regPin').value.trim();

      if (pop > 10000000) {
        if ("vibrate" in navigator) navigator.vibrate([300, 100, 300, 100, 500]);
        popInput.classList.add('border-rose-500', 'bg-rose-950/40');
        alert("⚠️ BATAS POPULASI MAKSIMAL 10.000.000 JIWA! HP Bergetar.");
        return;
      }

      const newRef = db.ref('monetary_data').push();
      const newAccount = {
        country, leader, currency, flag, community, population: pop, pin,
        kurs: 1.00, stock: 0, maxStorage: 100000, devisa: 50000, kasLokal: 50000000,
        status: 'Active', warnings: 0, embargo: false, createdTime: Date.now()
      };
      newRef.set(newAccount).then(() => {
        activeUser = { key: newRef.key, ...newAccount };
        localStorage.setItem('wcb_active_user', JSON.stringify(activeUser));
        addAuditLog(`Registrasi negara baru: ${country}`);
        location.reload();
      });
    });
  }

  // KOTAK 3: SEWA SERVER KOMUNITAS LUAR FORM
  const serverForm = document.getElementById('authBox3');
  if (serverForm) {
    serverForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const serverName = document.getElementById('serverName').value.trim();
      const serverProof = document.getElementById('serverProof').value.trim();
      const serverTheme = document.getElementById('serverTheme').value;
      const accessCode = document.getElementById('serverAccessCode').value.trim();

      if (accessCode === "2026") {
        alert("Kode Akses Valid! Masuk ke Server Komunitas.");
        document.getElementById('authModal').classList.add('hidden');
        return;
      }

      db.ref('server_requests').push({
        serverName, serverProof, serverTheme, timestamp: Date.now()
      }).then(() => {
        alert("Pengajuan sewa server berhasil dikirim ke Admin Guill!");
      });
    });
  }

  startPopulationTicker();
  initBursaChart();

  db.ref('monetary_data').on('value', snap => {
    const data = snap.val() || {};
    populateSelects(data);
    updateMemberStats(data);
    renderPopulationRank(data);
  });

  db.ref('audit_ledger').on('value', snap => {
    const logs = snap.val() || {};
    const c = document.getElementById('auditLedgerListMember');
    if (!c) return;
    c.innerHTML = '';
    Object.values(logs).reverse().forEach(l => {
      c.innerHTML += `<p>• [${new Date(l.timestamp).toLocaleTimeString()}] ${l.text}</p>`;
    });
  });

  // INPUT DATA SDA FORM
  const sdaForm = document.getElementById('sdaInputForm');
  if (sdaForm) {
    sdaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeUser) return;
      const name = document.getElementById('sdaName').value.trim();
      const qty = Number(document.getElementById('sdaQty').value);
      const unit = document.getElementById('sdaUnit').value.trim();

      db.ref(`monetary_data/${activeUser.key}`).once('value').then(snap => {
        const val = snap.val() || {};
        const currentStock = val.stock || 0;
        const maxCap = val.maxStorage || 100000;

        if (currentStock + qty > maxCap) {
          return alert(`⚠️ Melebihi kapasitas gudang! (${currentStock + qty} / ${maxCap} Unit)`);
        }

        db.ref(`monetary_data/${activeUser.key}/stock`).set(currentStock + qty);
        db.ref(`monetary_data/${activeUser.key}/inventory`).push({ name, qty, unit });
        alert(`Berhasil menyimpan ${qty} ${unit} ${name} ke gudang!`);
        sdaForm.reset();
      });
    });
  }
}

// LOGOUT FUNCTION FIX TOTAL
function logoutMember() {
  localStorage.removeItem('wcb_active_user');
  window.location.href = 'index.html';
}

// TICKER POPULASI DENGAN PERSENTASE KESEJAHTERAAN
function startPopulationTicker() {
  setInterval(() => {
    if (activeUser && activeUser.key) {
      db.ref(`monetary_data/${activeUser.key}/population`).transaction(cur => (cur || 0) + 20);
    }
  }, 60000);

  setInterval(() => {
    if (activeUser && activeUser.key) {
      db.ref(`monetary_data/${activeUser.key}/population`).transaction(cur => Math.max(0, (cur || 0) - 35));
    }
  }, 3600000);
}

function updateMemberStats(data) {
  if (activeUser && data[activeUser.key]) {
    const my = data[activeUser.key];
    document.getElementById('statPdb').textContent = ((my.devisa || 0) * 2.5).toLocaleString() + ' EUPH';
    document.getElementById('statDevisa').textContent = (my.devisa || 0).toLocaleString() + ' EUPH';
    document.getElementById('statKasLokal').textContent = (my.kasLokal || 0).toLocaleString();
    document.getElementById('popMyCountry').textContent = (my.population || 0).toLocaleString() + ' Jiwa';

    const welfare = Math.min(99, Math.max(10, Math.floor(((my.devisa || 0) / (my.population || 1)) * 1000)));
    const unemp = (Math.max(1.5, 12 - (welfare / 10))).toFixed(1);
    document.getElementById('statWelfare').textContent = `${welfare}%`;
    document.getElementById('statUnemployment').textContent = `${unemp}%`;

    const storageLabel = document.getElementById('storageCapacityLabel');
    if (storageLabel) {
      storageLabel.textContent = `${(my.stock || 0).toLocaleString()} / ${(my.maxStorage || 100000).toLocaleString()} Unit`;
    }

    const rakContainer = document.getElementById('sdaRakList');
    if (rakContainer && my.inventory) {
      rakContainer.innerHTML = '';
      Object.values(my.inventory).forEach(item => {
        rakContainer.innerHTML += `<div class="p-3 bg-slate-950 rounded-xl border border-slate-800"><span class="text-cyan-400 font-bold">${item.name}</span><p class="text-slate-400">${item.qty} ${item.unit}</p></div>`;
      });
    }
  }
}

function upgradeGudang() {
  if (!activeUser) return;
  db.ref(`monetary_data/${activeUser.key}`).once('value').then(snap => {
    const val = snap.val() || {};
    const devisa = val.devisa || 0;
    if (devisa < 300000) return alert("⚠️ Cadangan devisa tidak cukup! Butuh 300.000 EUPH.");
    
    db.ref(`monetary_data/${activeUser.key}/devisa`).set(devisa - 300000);
    db.ref(`monetary_data/${activeUser.key}/maxStorage`).set((val.maxStorage || 100000) + 50000);
    alert("Berhasil upgrade kapasitas gudang +50.000 Unit!");
  });
}

function renderPopulationRank(data) {
  const tbody = document.getElementById('populationRankTable');
  if (!tbody) return;
  tbody.innerHTML = '';
  let countries = Object.values(data).sort((a, b) => (b.population || 0) - (a.population || 0));

  countries.forEach((item, idx) => {
    let rank = `#${idx + 1}`;
    if (idx === 0) rank = `👑 #1`;
    const embargo = item.embargo ? `<span class="text-rose-400 font-bold">EMBARGO</span>` : `<span class="text-emerald-400">BEBAS</span>`;
    tbody.innerHTML += `
      <tr class="hover:bg-slate-800/40 font-mono">
        <td class="py-3 px-3">${rank}</td>
        <td class="py-3 px-3 text-white font-bold">${item.country}</td>
        <td class="py-3 px-3 text-slate-400">${item.community || 'Umum'}</td>
        <td class="py-3 px-3 text-emerald-400">${(item.population || 0).toLocaleString()} Jiwa</td>
        <td class="py-3 px-3">${embargo}</td>
      </tr>`;
  });
}

function populateSelects(data) {
  const invSelect = document.getElementById('invTarget');
  const tfSelect = document.getElementById('transferTarget');
  const treatySelect = document.getElementById('treatyTarget');
  const pajakSelect = document.getElementById('pajakTarget');

  if (invSelect) invSelect.innerHTML = '<option value="ALL">SELURUH NEGARA (MASS INVOICE)</option>';
  if (tfSelect) tfSelect.innerHTML = '<option value="">-- Pilih Negara Tujuan --</option>';
  if (treatySelect) treatySelect.innerHTML = '<option value="">-- Pilih Negara Tujuan --</option>';
  if (pajakSelect) pajakSelect.innerHTML = '<option value="">-- Pilih Negara Target --</option>';

  Object.keys(data).forEach(k => {
    const c = data[k].country;
    if (invSelect) invSelect.innerHTML += `<option value="${k}">${c}</option>`;
    if (tfSelect) tfSelect.innerHTML += `<option value="${k}">${c}</option>`;
    if (treatySelect) treatySelect.innerHTML += `<option value="${k}">${c}</option>`;
    if (pajakSelect) pajakSelect.innerHTML += `<option value="${k}">${c}</option>`;
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('bg-cyan-600', 'text-white');
    el.classList.add('bg-slate-800', 'text-slate-300');
  });
  document.getElementById(`content-${tabId}`).classList.remove('hidden');
  const activeBtn = document.getElementById(`nav-${tabId}`);
  activeBtn.classList.remove('bg-slate-800', 'text-slate-300');
  activeBtn.classList.add('bg-cyan-600', 'text-white');
}

function initBursaChart() {
  const ctx = document.getElementById('bursaChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
      datasets: [{
        label: 'Indeks Nilai Pasar Bursa (EUPH)',
        data: [12000, 19000, 15000, 25000, 22000, 30000],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function addAuditLog(text) {
  db.ref('audit_ledger').push({ text, timestamp: Date.now() });
}
