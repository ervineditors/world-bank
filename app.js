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
let bursaChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('content-bank')) {
    initMemberPortal();
  }
  if (document.getElementById('adminAuthModal')) {
    initAdminVault();
  }
});

function initMemberPortal() {
  if (activeUser) {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('activeCountryBadge').textContent = `${activeUser.country} (#${activeUser.serverCode || '1001'})`;
    if (activeUser.flag) {
      document.getElementById('countryFlagBox').innerHTML = `<img src="${activeUser.flag}" class="w-full h-full object-cover rounded-lg">`;
    }
  }

  // Handle Login Member (Kotak 1)
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const sCode = document.getElementById('loginServerCode').value.trim();
      const country = document.getElementById('loginCountry').value.trim();
      const pin = document.getElementById('loginPin').value.trim();

      db.ref('monetary_data').once('value').then(snapshot => {
        const data = snapshot.val() || {};
        let foundKey = null;

        Object.keys(data).forEach(key => {
          if (
            (data[key].serverCode === sCode || !data[key].serverCode) &&
            data[key].country.toLowerCase() === country.toLowerCase() &&
            String(data[key].pin) === String(pin)
          ) {
            foundKey = key;
          }
        });

        if (foundKey) {
          if (data[foundKey].status === 'Frozen') {
            return alert("⚠️ AKUN NEGARA DIBEKUKAN OLEH OTORITAS CENTRAL VAULT!");
          }
          activeUser = { key: foundKey, ...data[foundKey] };
          localStorage.setItem('wcb_active_user', JSON.stringify(activeUser));
          document.getElementById('authModal').classList.add('hidden');
          alert(`Selamat Datang Kembali, ${activeUser.leader} (${activeUser.country})!`);
          location.reload();
        } else {
          alert("Kode Server, Nama Negara, atau PIN Keamanan Salah!");
        }
      });
    });
  }

  // Handle Register (Kotak 2)
  const regForm = document.getElementById('registerForm');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const sCode = document.getElementById('regServerCode').value.trim();
      const country = document.getElementById('regCountry').value.trim();
      const leader = document.getElementById('regLeader').value.trim();
      const currency = document.getElementById('regCurrency').value.trim();
      const flag = document.getElementById('regFlag').value.trim();
      const popInput = document.getElementById('regPopulation');
      const pop = Number(popInput.value);
      const pin = document.getElementById('regPin').value.trim();

      if (pop > 10000000) {
        if ("vibrate" in navigator) {
          navigator.vibrate([300, 100, 300, 100, 500]);
        }
        popInput.classList.add('border-rose-500', 'bg-rose-950/40');
        alert("⚠️ PERINGATAN OTORITAS WCB!\nPopulasi awal negara tidak boleh melebihi 10.000.000 Jiwa! HP bergetar karena pelanggaran aturan.");
        return;
      }

      const newRef = db.ref('monetary_data').push();
      const newAccount = {
        serverCode: sCode, country, leader, currency, flag: flag || '',
        population: pop, pin, kurs: 1.00, stock: 1000, maxStorage: 100000, devisa: 50000, kasLokal: 50000000,
        status: 'Active', warnings: 0, embargo: false, createdTime: Date.now()
      };

      newRef.set(newAccount).then(() => {
        activeUser = { key: newRef.key, ...newAccount };
        localStorage.setItem('wcb_active_user', JSON.stringify(activeUser));
        addAuditLog(`Registrasi Akun Negara Baru: ${country} (Server ${sCode})`);
        document.getElementById('authModal').classList.add('hidden');
        alert(`Rekening Negara ${country} Berhasil Didaftarkan!`);
        location.reload();
      });
    });
  }

  // Handle Rent Server (Kotak 3)
  const rentForm = document.getElementById('serverRentForm');
  if (rentForm) {
    rentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const cName = document.getElementById('rentCommunityName').value.trim();
      const oName = document.getElementById('rentOwnerName').value.trim();
      const theme = document.getElementById('rentTheme').value;
      const proof = document.getElementById('rentPaymentProof').value.trim();
      const generatedCode = String(Math.floor(Math.random() * 8999 + 1000));

      db.ref('server_requests').push({
        communityName: cName, ownerName: oName, theme, proof,
        serverCode: generatedCode, status: 'Pending', timestamp: Date.now()
      }).then(() => {
        alert(`Pengajuan Sewa Server Berhasil!\nKode Server Anda: ${generatedCode}\nTunggu persetujuan Admin di Vault.`);
        rentForm.reset();
      });
    });
  }

  // Handle Loan Request
  const loanForm = document.getElementById('loanForm');
  if (loanForm) {
    loanForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeUser) return alert("Silakan login terlebih dahulu!");
      const amount = Number(document.getElementById('loanAmount').value);
      const reason = document.getElementById('loanReason').value.trim();

      db.ref('loan_requests').push({
        countryKey: activeUser.key, countryName: activeUser.country,
        amount, reason, status: 'Pending', timestamp: Date.now()
      }).then(() => {
        alert("Pengajuan Pinjaman (WCB Loan) Berhasil Dikirim ke Vault Admin!");
        loanForm.reset();
      });
    });
  }

  startPopulationTicker();
  initBursaChart();

  db.ref('monetary_data').on('value', snapshot => {
    const data = snapshot.val() || {};
    populateSelects(data);
    updateMemberStats(data);
    renderPopulationRank(data);
  });

  db.ref('audit_ledger').on('value', snap => {
    const logs = snap.val() || {};
    const container = document.getElementById('auditLedgerListMember');
    if (!container) return;
    container.innerHTML = '';
    Object.values(logs).reverse().forEach(log => {
      container.innerHTML += `<p>• [${new Date(log.timestamp).toLocaleTimeString()}] ${log.text}</p>`;
    });
  });
}

function logoutMember() {
  localStorage.removeItem('wcb_active_user');
  location.reload();
}

// SIMULASI POPULASI LIVE REAL-TIME (+20 LAHIR / MENIT, WAFAT BERDASARKAN KESEJAHTERAAN)
function startPopulationTicker() {
  setInterval(() => {
    if (activeUser && activeUser.key) {
      db.ref(`monetary_data/${activeUser.key}/population`).transaction(current => (current || 0) + 20);
    }
  }, 60000);

  setInterval(() => {
    if (activeUser && activeUser.key) {
      const welfare = Math.min(99, Math.max(10, Math.floor(((activeUser.devisa || 0) / (activeUser.population || 1)) * 1000)));
      // Jika Kesejahteraan tinggi -> Kematian berkurang (misal -15), jika krisis -> kematian naik (misal -50)
      const deathRate = Math.max(15, Math.floor(50 - (welfare / 2.5)));
      db.ref(`monetary_data/${activeUser.key}/population`).transaction(current => Math.max(0, (current || 0) - deathRate));
    }
  }, 3600000);
}

function updateMemberStats(data) {
  if (activeUser && data[activeUser.key]) {
    const my = data[activeUser.key];
    activeUser = { key: activeUser.key, ...my };

    document.getElementById('statPdb').textContent = ((my.devisa || 0) * 2.5).toLocaleString() + ' EUPH';
    document.getElementById('statDevisa').textContent = (my.devisa || 0).toLocaleString() + ' EUPH';
    document.getElementById('statKasLokal').textContent = (my.kasLokal || 0).toLocaleString();
    document.getElementById('popMyCountry').textContent = (my.population || 0).toLocaleString() + ' Jiwa';

    const welfare = Math.min(99, Math.max(10, Math.floor(((my.devisa || 0) / (my.population || 1)) * 1000)));
    const unemp = (Math.max(1.5, 12 - (welfare / 10))).toFixed(1);
    const deathRate = Math.max(15, Math.floor(50 - (welfare / 2.5)));

    document.getElementById('statWelfare').textContent = `${welfare}%`;
    document.getElementById('statUnemployment').textContent = `${unemp}%`;
    document.getElementById('popDeathRate').textContent = `-${deathRate}`;
  }
}

function renderPopulationRank(data) {
  const tbody = document.getElementById('populationRankTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  let countries = Object.values(data).sort((a, b) => (b.population || 0) - (a.population || 0));

  countries.forEach((item, index) => {
    let rankBadge = `<span class="font-bold">#${index + 1}</span>`;
    if (index === 0) rankBadge = `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold">👑 #1</span>`;

    const flagHtml = item.flag 
      ? `<img src="${item.flag}" class="w-6 h-4 object-cover rounded shadow border border-slate-700">`
      : `<i class="fa-solid fa-flag text-cyan-400"></i>`;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition';
    tr.innerHTML = `
      <td class="py-3 px-3 font-mono">${rankBadge}</td>
      <td class="py-3 px-3 font-semibold text-white flex items-center gap-2">
        ${flagHtml} ${item.country} <span class="text-slate-400 font-mono text-[10px]">(${item.currency})</span>
      </td>
      <td class="py-3 px-3 text-slate-400 text-xs">${item.serverCode || '1001'}</td>
      <td class="py-3 px-3 font-mono text-emerald-400 font-bold">${(item.population || 0).toLocaleString()} Jiwa</td>
      <td class="py-3 px-3 font-mono">${item.embargo ? '<span class="text-rose-400 font-bold">EMBARGO</span>' : '<span class="text-emerald-400">BEBAS</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function populateSelects(data) {
  const targets = ['transferTarget', 'treatyTarget', 'pajakTarget'];
  targets.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = '<option value="">-- Pilih Negara Tujuan --</option>';
      Object.keys(data).forEach(key => {
        if (!activeUser || key !== activeUser.key) {
          el.innerHTML += `<option value="${key}">${data[key].country} (${data[key].currency})</option>`;
        }
      });
    }
  });
}

function initBursaChart() {
  const ctx = document.getElementById('bursaChartCanvas');
  if (!ctx) return;
  bursaChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
      datasets: [{
        label: 'Indeks Tren Bursa Global (EUPH)',
        data: [12000, 14500, 13800, 16200, 15900, 18500, 21000],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function addAuditLog(text) {
  db.ref('audit_ledger').push({ text, timestamp: Date.now() });
}

// LOGIKA ADMIN VAULT (NO RELOAD / STUCK FIX)
function initAdminVault() {
  const pinInput = document.getElementById('adminPinInput');
  if (pinInput) {
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyAdminPin();
    });
  }

  // Handle Direct Injection (Admin)
  const injectForm = document.getElementById('injectionForm');
  if (injectForm) {
    injectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const selectKey = document.getElementById('injectCountrySelect').value;
      const manualName = document.getElementById('injectManualCountry').value.trim();
      const amount = Number(document.getElementById('injectAmount').value);

      if (selectKey) {
        db.ref(`monetary_data/${selectKey}/devisa`).transaction(curr => (curr || 0) + amount);
        addAuditLog(`ADMIN INJECTION: +${amount} EUPH disuntikkan ke ID ${selectKey}`);
        alert("Suntik Saldo Berhasil!");
      } else if (manualName) {
        addAuditLog(`ADMIN INJECTION MANUAL: +${amount} EUPH disuntikkan ke ${manualName}`);
        alert(`Suntik Saldo Manual ke ${manualName} Berhasil Recorded!`);
      }
      injectForm.reset();
    });
  }
}

function verifyAdminPin() {
  const pinInput = document.getElementById('adminPinInput');
  const errorMsg = document.getElementById('authError');
  if (pinInput.value.trim() === ADMIN_PIN) {
    document.getElementById('adminAuthModal').classList.add('hidden');
    document.getElementById('adminDashboardContent').classList.remove('hidden');
    loadAdminData();
  } else {
    errorMsg.textContent = "PIN Keamanan Salah! Akses Ditolak.";
  }
}

function loadAdminData() {
  db.ref('monetary_data').on('value', snap => {
    const data = snap.val() || {};
    populateAdminSelects(data);
    renderAdminAccounts(data);
  });

  db.ref('loan_requests').on('value', snap => {
    const loans = snap.val() || {};
    const container = document.getElementById('loanPendingList');
    if (!container) return;
    container.innerHTML = '';

    let keys = Object.keys(loans).filter(k => loans[k].status === 'Pending');
    if (keys.length === 0) {
      container.innerHTML = '<p class="italic text-slate-500">Tidak ada pengajuan pinjaman pending.</p>';
      return;
    }

    keys.forEach(k => {
      const loan = loans[k];
      container.innerHTML += `
        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
          <div>
            <span class="font-bold text-white">${loan.countryName}</span>
            <p class="text-slate-400">Nominal: ${loan.amount} EUPH | Alasan: ${loan.reason}</p>
          </div>
          <div class="flex gap-2">
            <button onclick="accLoan('${k}', '${loan.countryKey}', ${loan.amount})" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold">ACC & Cairkan</button>
            <button onclick="rejectLoan('${k}')" class="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg">Tolak</button>
          </div>
        </div>
      `;
    });
  });

  db.ref('server_requests').on('value', snap => {
    const reqs = snap.val() || {};
    const container = document.getElementById('serverPendingList');
    if (!container) return;
    container.innerHTML = '';

    let keys = Object.keys(reqs).filter(k => reqs[k].status === 'Pending');
    if (keys.length === 0) {
      container.innerHTML = '<p class="italic text-slate-500">Tidak ada pengajuan sewa server pending.</p>';
      return;
    }

    keys.forEach(k => {
      const r = reqs[k];
      container.innerHTML += `
        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
          <div>
            <span class="font-bold text-white">${r.communityName} (Owner: ${r.ownerName})</span>
            <p class="text-cyan-400 font-mono">Kode Server: ${r.serverCode} | Bukti: ${r.proof}</p>
          </div>
          <button onclick="accServer('${k}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold">ACC Server</button>
        </div>
      `;
    });
  });
}

function accLoan(loanKey, countryKey, amount) {
  db.ref(`monetary_data/${countryKey}/devisa`).transaction(curr => (curr || 0) + amount);
  db.ref(`loan_requests/${loanKey}/status`).set('Approved');
  addAuditLog(`ADMIN LOAN ACC: Pinjaman ${amount} EUPH dicairkan ke ID ${countryKey}`);
}

function rejectLoan(loanKey) {
  db.ref(`loan_requests/${loanKey}/status`).set('Rejected');
}

function accServer(reqKey) {
  db.ref(`server_requests/${reqKey}/status`).set('Approved');
  alert("Sewa Server Komunitas Di-ACC!");
}

function populateAdminSelects(data) {
  const sdaSelect = document.getElementById('sdaCountrySelect');
  const kursSelect = document.getElementById('kursCountrySelect');
  const injectSelect = document.getElementById('injectCountrySelect');

  if (sdaSelect) sdaSelect.innerHTML = '<option value="">-- Pilih Negara Target --</option>';
  if (kursSelect) kursSelect.innerHTML = '<option value="">-- Pilih Negara --</option>';
  if (injectSelect) injectSelect.innerHTML = '<option value="">-- Pilih Negara Terdaftar --</option>';

  Object.keys(data).forEach(key => {
    const item = data[key];
    if (sdaSelect) sdaSelect.innerHTML += `<option value="${key}">${item.country}</option>`;
    if (kursSelect) kursSelect.innerHTML += `<option value="${key}">${item.country}</option>`;
    if (injectSelect) injectSelect.innerHTML += `<option value="${key}">${item.country}</option>`;
  });
}

function renderAdminAccounts(data) {
  const container = document.getElementById('adminAccountList');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(data).forEach(key => {
    const item = data[key];
    container.innerHTML += `
      <div class="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h4 class="text-sm font-bold text-white">${item.country} <span class="text-cyan-400 font-mono">(${item.currency})</span></h4>
          <p class="text-xs text-slate-400 font-mono">Kode Server: ${item.serverCode || '1001'} | Devisa: ${item.devisa || 0} EUPH | Warning: ${item.warnings || 0}/3</p>
        </div>
        <div class="flex gap-2 text-xs font-semibold">
          <button onclick="addWarning('${key}', ${(item.warnings || 0) + 1})" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl">+ Warn</button>
          <button onclick="freezeAccount('${key}', '${item.status === 'Frozen' ? 'Active' : 'Frozen'}')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl">${item.status === 'Frozen' ? 'Cairkan' : 'Bekukan'}</button>
          <button onclick="deleteAccount('${key}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl">Hapus</button>
        </div>
      </div>
    `;
  });
}

function addWarning(key, count) {
  db.ref(`monetary_data/${key}/warnings`).set(count);
  addAuditLog(`ADMIN: Warning ID ${key} bertambah menjadi ${count}`);
}

function freezeAccount(key, status) {
  db.ref(`monetary_data/${key}/status`).set(status);
  addAuditLog(`ADMIN: Status ID ${key} diubah menjadi ${status}`);
}

function deleteAccount(key) {
  if (confirm("Hapus akun negara ini secara permanen?")) {
    db.ref(`monetary_data/${key}`).remove();
    addAuditLog(`ADMIN: Menghapus akun negara ID ${key}`);
  }
}

function triggerCrisis(type) {
  let title = "";
  if (type === 'minyak') title = "KRISIS MINYAK GLOBAL";
  if (type === 'pangan') title = "BENCANA PANGAN GLOBAL";
  if (type === 'deflasi') title = "DEFLASI EUPH";
  if (type === 'perang') title = "PERANG ALUTSISTA";
  if (type === 'inflasi') title = "HIPERINFLASI LOKAL";
  if (type === 'pandemi') title = "PANDEMI GLOBAL";

  db.ref('crisis_status').set({ active: true, title, timestamp: Date.now() });
  addAuditLog(`ADMIN CRISIS TRIGGER: ${title}`);
  alert(`Skenario ${title} Berhasil Dipicu!`);
}

function resetCrisis() {
  db.ref('crisis_status').set({ active: false });
  addAuditLog(`ADMIN CRISIS TRIGGER: Normalisasi Krisis`);
  alert("Status Krisis Global Dinormalisasi.");
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('bg-cyan-600', 'text-white');
    el.classList.add('bg-slate-800', 'text-slate-300');
  });

  document.getElementById(`content-${tabId}`).classList.remove('hidden');
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-slate-800', 'text-slate-300');
    activeBtn.classList.add('bg-cyan-600', 'text-white');
  }
}
