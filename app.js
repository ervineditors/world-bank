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

  // KOTAK 1: LOGIN
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

  // KOTAK 2: REGISTER AKUN NEGARA (MAX 10 JUTA + GETAR HP)
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

  // KOTAK 3: SEWA SERVER
  const serverForm = document.getElementById('authBox3');
  if (serverForm) {
    serverForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const serverName = document.getElementById('serverName').value.trim();
      const serverProof = document.getElementById('serverProof').value.trim();
      const accessCode = document.getElementById('serverAccessCode').value.trim();

      if (accessCode === "2026") {
        alert("Kode Akses Valid! Masuk ke Server Komunitas.");
        document.getElementById('authModal').classList.add('hidden');
        return;
      }

      db.ref('server_requests').push({
        serverName, serverProof, timestamp: Date.now()
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

  // INPUT SDA & GUDANG
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

  // OBLIGASI NEGARA
  const bondForm = document.getElementById('bondForm');
  if (bondForm) {
    bondForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeUser) return;
      const amount = Number(document.getElementById('bondAmount').value);
      const interest = Number(document.getElementById('bondInterest').value);

      db.ref('sovereign_bonds').push({
        country: activeUser.country, amount, interest, timestamp: Date.now()
      }).then(() => {
        addAuditLog(`${activeUser.country} menerbitkan Surat Hutang Senilai ${amount} EUPH (${interest}%)`);
        alert("Obligasi berhasil diterbitkan ke pasar global!");
        bondForm.reset();
      });
    });
  }

  // PROPOSAL KERJASAMA
  const treatyForm = document.getElementById('treatyForm');
  if (treatyForm) {
    treatyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeUser) return;
      const target = document.getElementById('treatyTarget').value;
      const field = document.getElementById('treatyField').value;
      const title = document.getElementById('treatyTitle').value.trim();
      const desc = document.getElementById('treatyDesc').value.trim();

      db.ref(`treaty_proposals/${target}`).push({
        fromCountry: activeUser.country, fromKey: activeUser.key, field, title, desc, status: 'Pending', timestamp: Date.now()
      }).then(() => {
        addAuditLog(`Proposal Kerjasama (${field}) dikirim dari ${activeUser.country}`);
        alert("Proposal Kerjasama berhasil dikirim ke negara tujuan!");
        treatyForm.reset();
      });
    });
  }

  // LIST PROPOSAL MASUK
  if (activeUser) {
    db.ref(`treaty_proposals/${activeUser.key}`).on('value', snap => {
      const data = snap.val() || {};
      const container = document.getElementById('treatyInboxList');
      if (!container) return;
      container.innerHTML = '';
      const keys = Object.keys(data);
      if (keys.length === 0) {
        container.innerHTML = '<p class="text-slate-500 italic">Belum ada proposal kerjasama masuk.</p>';
        return;
      }
      keys.forEach(k => {
        const p = data[k];
        container.innerHTML += `
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <span class="text-cyan-400 font-bold">${p.fromCountry} (${p.field})</span>
              <p class="text-white font-semibold">${p.title}</p>
              <p class="text-slate-400 text-[11px]">${p.desc}</p>
            </div>
            <div>
              ${p.status === 'Pending' ? `<button onclick="accTreaty('${activeUser.key}', '${k}')" class="px-3 py-1 bg-emerald-600 text-white rounded-lg">ACC</button>` : `<span class="text-emerald-400 font-bold">DITERIMA</span>`}
            </div>
          </div>`;
      });
    });
  }
}

function accTreaty(myKey, propKey) {
  db.ref(`treaty_proposals/${myKey}/${propKey}/status`).set('Accepted');
  addAuditLog(`Perjanjian Kerjasama berhasil di-ACC!`);
  alert("Proposal Berhasil Disetujui (ACC)!");
}

// LOGOUT FIX TOTAL
function logoutMember() {
  localStorage.removeItem('wcb_active_user');
  window.location.href = 'index.html';
}

// TICKER POPULASI DENGAN KESEJAHTERAAN & KRISIS VIRUS
function startPopulationTicker() {
  setInterval(() => {
    if (activeUser && activeUser.key) {
      db.ref(`monetary_data/${activeUser.key}/population`).transaction(cur => (cur || 0) + 20);
    }
  }, 60000);

  setInterval(() => {
    if (activeUser && activeUser.key) {
      db.ref('crisis_status').once('value').then(snap => {
        const crisis = snap.val() || {};
        let deathDeduction = 35;
        if (crisis.active && crisis.title === 'PANDEMI VIRUS GLOBAL') {
          deathDeduction = 1500; // Mati massal dalam hitungan jam
        }
        db.ref(`monetary_data/${activeUser.key}/population`).transaction(cur => Math.max(0, (cur || 0) - deathDeduction));
      });
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

// ADMIN VAULT LOGIC (PIN 272727)
function initAdminVault() {
  const pinInput = document.getElementById('adminPinInput');
  if (pinInput) {
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyAdminPin();
    });
  }
}

function verifyAdminPin() {
  const pin = document.getElementById('adminPinInput').value.trim();
  if (pin === ADMIN_PIN) {
    document.getElementById('adminAuthModal').classList.add('hidden');
    document.getElementById('adminDashboardContent').classList.remove('hidden');
    loadAdminVaultData();
  } else {
    document.getElementById('authError').textContent = "PIN SALAH!";
  }
}

function loadAdminVaultData() {
  db.ref('monetary_data').on('value', snap => {
    const data = snap.val() || {};
    populateAdminSelects(data);
    renderAdminAccounts(data);
  });

  db.ref('server_requests').on('value', snap => {
    const reqs = snap.val() || {};
    const container = document.getElementById('serverRequestsList');
    if (!container) return;
    container.innerHTML = '';
    const keys = Object.keys(reqs);
    if (keys.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 italic">Tidak ada permohonan sewa server.</p>';
      return;
    }
    keys.forEach(k => {
      const r = reqs[k];
      container.innerHTML += `
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs font-mono">
          <div>
            <span class="text-white font-bold text-sm">${r.serverName}</span>
            <p class="text-slate-400"><a href="${r.serverProof}" target="_blank" class="text-cyan-400 underline">Bukti Transfer</a></p>
          </div>
          <button onclick="approveServer('${k}', '${r.serverName}')" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg">ACC & Kirim Kode</button>
        </div>`;
    });
  });
}

function approveServer(key, name) {
  const code = Math.floor(1000 + Math.random() * 9000);
  alert(`Server ${name} disetujui! Kode akses 4-angka: ${code}`);
  db.ref(`server_requests/${key}`).remove();
  addAuditLog(`ADMIN: Menyetujui server ${name} (Kode: ${code})`);
}

function populateAdminSelects(data) {
  const sdaSelect = document.getElementById('sdaCountrySelect');
  const kursSelect = document.getElementById('kursCountrySelect');
  const injectSelect = document.getElementById('injectCountrySelect');
  if (sdaSelect) sdaSelect.innerHTML = '<option value="">-- Pilih Negara --</option>';
  if (kursSelect) kursSelect.innerHTML = '<option value="">-- Pilih Negara --</option>';
  if (injectSelect) injectSelect.innerHTML = '<option value="">-- Pilih Negara --</option>';

  Object.keys(data).forEach(k => {
    const c = data[k].country;
    if (sdaSelect) sdaSelect.innerHTML += `<option value="${k}">${c}</option>`;
    if (kursSelect) kursSelect.innerHTML += `<option value="${k}">${c}</option>`;
    if (injectSelect) injectSelect.innerHTML += `<option value="${k}">${c}</option>`;
  });
}

function renderAdminAccounts(data) {
  const c = document.getElementById('adminAccountList');
  if (!c) return;
  c.innerHTML = '';
  Object.keys(data).forEach(k => {
    const item = data[k];
    c.innerHTML += `
      <div class="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
        <div><strong class="text-white">${item.country}</strong> (${item.currency}) - Saldo: ${item.devisa || 0} EUPH | Warn: ${item.warnings || 0}/3</div>
        <div class="flex gap-2">
          <button onclick="addWarning('${k}', ${(item.warnings || 0) + 1})" class="px-3 py-1 bg-amber-600 text-white rounded-lg">+ Warn</button>
          <button onclick="freezeAccount('${k}', '${item.status === 'Frozen' ? 'Active' : 'Frozen'}')" class="px-3 py-1 bg-rose-600 text-white rounded-lg">${item.status === 'Frozen' ? 'Cairkan' : 'Freeze'}</button>
          <button onclick="deleteAccount('${k}')" class="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg">Hapus</button>
        </div>
      </div>`;
  });
}

function addWarning(key, count) {
  db.ref(`monetary_data/${key}/warnings`).set(count);
  addAuditLog(`ADMIN: Beri warning ke account ID ${key}`);
}

function freezeAccount(key, status) {
  db.ref(`monetary_data/${key}/status`).set(status);
  addAuditLog(`ADMIN: Ubah status account ke ${status}`);
}

function deleteAccount(key) {
  if (confirm("Hapus negara ini?")) db.ref(`monetary_data/${key}`).remove();
}

function triggerCrisis(type) {
  let title = type.toUpperCase();
  if (type === 'pandemi') title = 'PANDEMI VIRUS GLOBAL';
  db.ref('crisis_status').set({ active: true, title, timestamp: Date.now() });
  addAuditLog(`ADMIN CRISIS: Memicu ${title}`);
  alert(`Krisis ${title} Berhasil Dipicu!`);
}

function resetCrisis() {
  db.ref('crisis_status').set({ active: false });
  alert("Krisis Dinormalisasi.");
}
