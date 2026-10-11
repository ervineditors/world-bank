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

// TAB SWITCH AUTH (LOGIN / REGISTER / SEWA SERVER)
function switchAuthTab(type) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const serverForm = document.getElementById('serverForm');
  const btnLogin = document.getElementById('authTabLoginBtn');
  const btnReg = document.getElementById('authTabRegisterBtn');
  const btnSrv = document.getElementById('authTabServerBtn');

  loginForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  serverForm.classList.add('hidden');

  btnLogin.className = "py-2.5 px-2 rounded-lg text-slate-400 hover:text-white transition text-center";
  btnReg.className = "py-2.5 px-2 rounded-lg text-slate-400 hover:text-white transition text-center";
  btnSrv.className = "py-2.5 px-2 rounded-lg text-rose-400 hover:text-rose-200 transition text-center border border-rose-500/30";

  if (type === 'login') {
    loginForm.classList.remove('hidden');
    btnLogin.className = "py-2.5 px-2 rounded-lg bg-blue-600 text-white transition text-center";
  } else if (type === 'register') {
    registerForm.classList.remove('hidden');
    btnReg.className = "py-2.5 px-2 rounded-lg bg-cyan-600 text-white transition text-center";
  } else if (type === 'server') {
    serverForm.classList.remove('hidden');
    btnSrv.className = "py-2.5 px-2 rounded-lg bg-rose-600 text-white transition text-center";
  }
}

function initMemberPortal() {
  if (activeUser) {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('activeCountryBadge').textContent = activeUser.country;
    if (activeUser.serverCode) document.getElementById('communityBadge').textContent = `Server Access Code: #${activeUser.serverCode}`;
    if (activeUser.flag) document.getElementById('countryFlagBox').innerHTML = `<img src="${activeUser.flag}" class="w-full h-full object-cover rounded-lg">`;
  }

  // Handle Login Member
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const serverCode = document.getElementById('loginServerCode').value.trim();
    const country = document.getElementById('loginCountry').value.trim();
    const pin = document.getElementById('loginPin').value.trim();

    db.ref('monetary_data').once('value').then(snapshot => {
      const data = snapshot.val() || {};
      let foundKey = null;

      Object.keys(data).forEach(key => {
        if (data[key].country.toLowerCase() === country.toLowerCase() && 
            String(data[key].pin) === String(pin) &&
            String(data[key].serverCode || '0000') === String(serverCode)) {
          foundKey = key;
        }
      });

      if (foundKey) {
        if (data[foundKey].status === 'Frozen') {
          return alert("⚠️ AKUN NEGARA ANDA SEDANG DIBEKUKAN OLEH OTORITAS CENTRAL VAULT!");
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

  // Handle Register Member (Max Pop 10M + Getar Perangkat)
  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const country = document.getElementById('regCountry').value.trim();
    const leader = document.getElementById('regLeader').value.trim();
    const currency = document.getElementById('regCurrency').value.trim();
    const serverCode = document.getElementById('regServerCode').value.trim();
    const flag = document.getElementById('regFlag').value.trim();
    const popInput = document.getElementById('regPopulation');
    const pop = Number(popInput.value);
    const pin = document.getElementById('regPin').value.trim();

    if (pop > 10000000) {
      if ("vibrate" in navigator) {
        navigator.vibrate([300, 100, 300, 100, 500]);
      }
      popInput.classList.add('border-rose-500', 'bg-rose-950/40');
      alert("⚠️ PERINGATAN OTORITAS WCB!\nPopulasi awal negara tidak boleh melebihi 10.000.000 (10 Juta) Jiwa! Perangkat bergetar karena pelanggaran aturan.");
      return;
    }

    const newRef = db.ref('monetary_data').push();
    const newAccount = {
      country, leader, currency, serverCode: serverCode || '0000', flag: flag || '',
      population: pop, pin, kurs: 1.00, stock: 1000, maxStorage: 100000, devisa: 50000, kasLokal: 50000000,
      status: 'Active', warnings: 0, embargo: false, lastUpdate: Date.now(), createdTime: Date.now()
    };

    newRef.set(newAccount).then(() => {
      activeUser = { key: newRef.key, ...newAccount };
      localStorage.setItem('wcb_active_user', JSON.stringify(activeUser));
      addAuditLog(`Registrasi akun negara baru: ${country} (Server #${serverCode})`);
      document.getElementById('authModal').classList.add('hidden');
      alert(`Rekening Negara ${country} Berhasil Didaftarkan di Server #${serverCode}!`);
      location.reload();
    });
  });

  // Handle Sewa Server Komunitas
  document.getElementById('serverForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const srvName = document.getElementById('srvName').value.trim();
    const srvTheme = document.getElementById('srvTheme').value;
    const srvProof = document.getElementById('srvProof').value.trim();
    const generatedCode = Math.floor(1000 + Math.random() * 9000);

    db.ref('server_requests').push({
      srvName, srvTheme, srvProof, code: generatedCode, status: 'Pending', timestamp: Date.now()
    }).then(() => {
      alert(`Permohonan Sewa Server Berhasil Dikirim!\nKode Server Akses Anda: #${generatedCode}\nTunggu konfirmasi Admin Vault untuk aktivasi.`);
      location.reload();
    });
  });

  startPopulationTicker();

  // Listen Real-time Database
  db.ref('monetary_data').on('value', (snapshot) => {
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

// LOGOUT / KELUAR SISTEM FIX
function logoutMember() {
  localStorage.removeItem('wcb_active_user');
  location.reload();
}

// SIMULASI POPULASI REAL-TIME DENGAN AKUMULASI WAKTU SERVER & KESEJAHTERAAN
function startPopulationTicker() {
  setInterval(() => {
    if (activeUser && activeUser.key) {
      db.ref(`monetary_data/${activeUser.key}`).once('value').then(snap => {
        const my = snap.val();
        if (!my) return;

        const now = Date.now();
        const last = my.lastUpdate || now;
        const diffMinutes = Math.floor((now - last) / 60000);

        if (diffMinutes >= 1) {
          const welfare = Math.min(99, Math.max(10, Math.floor(((my.devisa || 0) / (my.population || 1)) * 1000)));
          const baseDeathsPerHour = Math.max(10, Math.floor(60 - (welfare / 2))); // Kematian tinggi jika miskin
          
          const newAdditions = diffMinutes * 20; // +20 lahir / menit
          const newDeaths = Math.floor((diffMinutes / 60) * baseDeathsPerHour);

          const newPop = Math.max(0, (my.population || 0) + newAdditions - newDeaths);

          db.ref(`monetary_data/${activeUser.key}`).update({
            population: newPop,
            lastUpdate: now
          });

          document.getElementById('popDeathRate').textContent = `-${baseDeathsPerHour}`;
        }
      });
    }
  }, 10000); // Check setiap 10 detik
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

    const embargoBadge = item.embargo 
      ? `<span class="px-2 py-0.5 bg-rose-900/60 text-rose-300 rounded-full text-[10px] font-bold">EMBARGO</span>`
      : `<span class="px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded-full text-[10px]">BEBAS</span>`;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition';
    tr.innerHTML = `
      <td class="py-3 px-3 font-mono">${rankBadge}</td>
      <td class="py-3 px-3 font-semibold text-white flex items-center gap-2">
        ${flagHtml} ${item.country} <span class="text-slate-400 font-mono text-[10px]">(${item.currency})</span>
      </td>
      <td class="py-3 px-3 text-cyan-400 font-mono text-xs">#${item.serverCode || '0000'}</td>
      <td class="py-3 px-3 font-mono text-emerald-400 font-bold">${(item.population || 0).toLocaleString()} Jiwa</td>
      <td class="py-3 px-3 font-mono">${embargoBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

function addAuditLog(text) {
  db.ref('audit_ledger').push({ text, timestamp: Date.now() });
}

// ADMIN VAULT LOGIC (PASSWORD FIX: 272727)
function initAdminVault() {
  const pinInput = document.getElementById('adminPinInput');
  if (pinInput) {
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyAdminPin();
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

  db.ref('server_requests').on('value', snap => {
    const reqs = snap.val() || {};
    const container = document.getElementById('serverPendingList');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(reqs).forEach(key => {
      const item = reqs[key];
      container.innerHTML += `
        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
          <div>
            <p class="font-bold text-white">${item.srvName} <span class="text-orange-400 font-mono">(Kode: #${item.code})</span></p>
            <a href="${item.srvProof}" target="_blank" class="text-cyan-400 hover:underline">Lihat Bukti Transfer Rp 5.000</a>
          </div>
          <button onclick="approveServer('${key}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg">ACC Server</button>
        </div>
      `;
    });
  });
}

function approveServer(key) {
  db.ref(`server_requests/${key}/status`).set('Approved');
  alert("Server Komunitas Berhasil Di-ACC!");
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
          <p class="text-xs text-slate-400 font-mono">Server: #${item.serverCode || '0000'} | Devisa: ${item.devisa || 0} EUPH | Warning: ${item.warnings || 0}/3</p>
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
  addAuditLog(`ADMIN: Memberikan Warning ke account ID ${key}`);
}

function freezeAccount(key, status) {
  db.ref(`monetary_data/${key}/status`).set(status);
  addAuditLog(`ADMIN: Mengubah status account ID ${key} menjadi ${status}`);
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
  addAuditLog(`ADMIN CRISIS TRIGGER: Hentikan Krisis`);
  alert("Status Krisis Dinormalisasi.");
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
