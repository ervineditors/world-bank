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
const ADMIN_PIN = "272727"; // Password Admin FIX 272727

let activeUser = JSON.parse(localStorage.getItem('wcb_active_user')) || null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('content-bank')) {
    initMemberPortal();
  }
  if (document.getElementById('adminAuthModal')) {
    initAdminVault();
  }
});

function switchAuthTab(type) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const btnLogin = document.getElementById('authTabLoginBtn');
  const btnReg = document.getElementById('authTabRegisterBtn');

  if (type === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    btnLogin.className = "py-2.5 rounded-lg bg-cyan-600 text-white transition";
    btnReg.className = "py-2.5 rounded-lg text-slate-400 hover:text-white transition";
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    btnLogin.className = "py-2.5 rounded-lg text-slate-400 hover:text-white transition";
    btnReg.className = "py-2.5 rounded-lg bg-cyan-600 text-white transition";
  }
}

function initMemberPortal() {
  if (activeUser) {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('activeCountryBadge').textContent = activeUser.country;
    if (activeUser.community) document.getElementById('communityBadge').textContent = `Server RP: ${activeUser.community}`;
    if (activeUser.flag) document.getElementById('countryFlagBox').innerHTML = `<img src="${activeUser.flag}" class="w-full h-full object-cover rounded-lg">`;
  }

  // Handle Login
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const country = document.getElementById('loginCountry').value.trim();
    const pin = document.getElementById('loginPin').value.trim();

    db.ref('monetary_data').once('value').then(snapshot => {
      const data = snapshot.val() || {};
      let foundKey = null;

      Object.keys(data).forEach(key => {
        if (data[key].country.toLowerCase() === country.toLowerCase() && String(data[key].pin) === String(pin)) {
          foundKey = key;
        }
      });

      if (foundKey) {
        activeUser = { key: foundKey, ...data[foundKey] };
        localStorage.setItem('wcb_active_user', JSON.stringify(activeUser));
        document.getElementById('authModal').classList.add('hidden');
        alert(`Selamat Datang Kembali, ${activeUser.leader} (${activeUser.country})!`);
        location.reload();
      } else {
        alert("Nama Negara atau PIN Keamanan Salah!");
      }
    });
  });

  // Handle Register (Max Pop 10M + Getar Perangkat + Audit)
  document.getElementById('registerForm').addEventListener('submit', (e) => {
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
      if ("vibrate" in navigator) {
        navigator.vibrate([300, 100, 300, 100, 500]);
      }
      popInput.classList.add('border-rose-500', 'bg-rose-950/40');
      alert("⚠️ PERINGATAN OTORITAS WCB!\nPopulasi awal negara tidak boleh melebihi 10.000.000 (10 Juta) Jiwa! Perangkat bergetar karena pelanggaran aturan.");
      return;
    }

    const newRef = db.ref('monetary_data').push();
    const newAccount = {
      country, leader, currency, flag: flag || '', community: community || 'Umum',
      population: pop, pin, kurs: 1.00, stock: 1000, devisa: 50000, kasLokal: 50000000,
      embargo: false, createdTime: Date.now()
    };

    newRef.set(newAccount).then(() => {
      activeUser = { key: newRef.key, ...newAccount };
      localStorage.setItem('wcb_active_user', JSON.stringify(activeUser));
      addAuditLog(`Registrasi akun negara baru: ${country} (${community})`);
      document.getElementById('authModal').classList.add('hidden');
      alert(`Rekening Negara ${country} Berhasil Didaftarkan di Server ${community}!`);
      location.reload();
    });
  });

  startPopulationTicker();

  // Listen Krisis Global & State Changes
  db.ref('crisis_status').on('value', snap => {
    const crisis = snap.val();
    const banner = document.getElementById('crisisAlertBanner');
    if (crisis && crisis.active) {
      banner.classList.remove('hidden');
      document.getElementById('crisisBannerTitle').textContent = `PENGUMUMAN KRISIS: ${crisis.title}`;
      document.getElementById('crisisBannerDesc').textContent = crisis.desc;
    } else {
      banner.classList.add('hidden');
    }
  });

  db.ref('monetary_data').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    populateSelects(data);
    updateMemberStats(data);
    renderPopulationRank(data);
  });
}

function startPopulationTicker() {
  setInterval(() => {
    if (activeUser && activeUser.key) {
      db.ref(`monetary_data/${activeUser.key}/population`).transaction(current => (current || 0) + 20);
    }
  }, 60000);

  setInterval(() => {
    if (activeUser && activeUser.key) {
      db.ref(`monetary_data/${activeUser.key}/population`).transaction(current => Math.max(0, (current || 0) - 23));
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

    // Economic Health Calculation
    const welfare = Math.min(99, Math.max(10, Math.floor(((my.devisa || 0) / (my.population || 1)) * 1000)));
    const unemp = (Math.max(1.5, 12 - (welfare / 10))).toFixed(1);
    document.getElementById('statWelfare').textContent = `${welfare}%`;
    document.getElementById('statUnemployment').textContent = `${unemp}%`;
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
      <td class="py-3 px-3 text-slate-400 text-xs">${item.community || 'Umum'}</td>
      <td class="py-3 px-3 font-mono text-emerald-400 font-bold">${(item.population || 0).toLocaleString()} Jiwa</td>
      <td class="py-3 px-3 font-mono">${embargoBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

function showReceipt(title, amount, sender, receiver) {
  const modal = document.getElementById('receiptModal');
  const details = document.getElementById('receiptDetails');
  details.innerHTML = `
    <p>ID NOTA: <span class="text-cyan-400">WCB-${Math.floor(Math.random()*899999+100000)}</span></p>
    <p>TANGGAL: ${new Date().toLocaleString()}</p>
    <p>JENIS: ${title}</p>
    <p>NOMINAL: <span class="text-emerald-400 font-bold">${amount} EUPH</span></p>
    <p>PENGIRIM: ${sender}</p>
    <p>PENERIMA: ${receiver}</p>
    <p class="pt-2 text-[9px] text-slate-500">STAMP: OTORITAS SENTRAL MONETER WCB (AUTHENTICATED)</p>
  `;
  modal.classList.remove('hidden');
}

function closeReceipt() {
  document.getElementById('receiptModal').classList.add('hidden');
}

function addAuditLog(text) {
  db.ref('audit_ledger').push({ text, timestamp: Date.now() });
}

// ADMIN VAULT FUNCTIONS
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

  db.ref('audit_ledger').on('value', snap => {
    const logs = snap.val() || {};
    const container = document.getElementById('auditLedgerList');
    container.innerHTML = '';
    Object.values(logs).reverse().forEach(log => {
      container.innerHTML += `<p>• [${new Date(log.timestamp).toLocaleTimeString()}] ${log.text}</p>`;
    });
  });
}

function triggerCrisis(type) {
  let title = "", desc = "";
  if (type === 'minyak') { title = "KRISIS MINYAK GLOBAL"; desc = "Stok minyak bumi melorot tajam, harga komoditas melambung +50%."; }
  if (type === 'pangan') { title = "BENCANA PANGAN GLOBAL"; desc = "Kelangkaan panen massal memicu kenaikan kebutuhan pangan 2x lipat."; }
  if (type === 'deflasi') { title = "BULL RUN / DEFLASI EUPH"; desc = "Nilai tukar Devisa EUPH menguat ekstrem di bursa internasional."; }

  db.ref('crisis_status').set({ active: true, title, desc, timestamp: Date.now() });
  addAuditLog(`ADMIN INTERVENTION: Memicu ${title}`);
  alert(`Skenario ${title} Berhasil Diaktifkan!`);
}

function resetCrisis() {
  db.ref('crisis_status').set({ active: false });
  addAuditLog(`ADMIN INTERVENTION: Hentikan status krisis global`);
  alert("Status krisis global dinormalisasi.");
}

function populateAdminSelects(data) {
  const embSelect = document.getElementById('embargoCountrySelect');
  const kursSelect = document.getElementById('kursCountrySelect');
  if (embSelect) embSelect.innerHTML = '<option value="">-- Pilih Negara --</option>';
  if (kursSelect) kursSelect.innerHTML = '<option value="">-- Pilih Negara --</option>';

  Object.keys(data).forEach(key => {
    if (embSelect) embSelect.innerHTML += `<option value="${key}">${data[key].country}</option>`;
    if (kursSelect) kursSelect.innerHTML += `<option value="${key}">${data[key].country}</option>`;
  });
}

function renderAdminAccounts(data) {
  const container = document.getElementById('adminAccountList');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(data).forEach(key => {
    const item = data[key];
    container.innerHTML += `
      <div class="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
        <div>
          <h4 class="text-sm font-bold text-white">${item.country} <span class="text-cyan-400 font-mono">(${item.currency})</span></h4>
          <p class="text-xs text-slate-400 font-mono">Server: ${item.community} | Devisa: ${item.devisa} EUPH</p>
        </div>
        <button onclick="toggleEmbargo('${key}', ${!item.embargo})" class="px-3 py-1.5 ${item.embargo ? 'bg-emerald-600' : 'bg-rose-600'} text-white text-xs font-semibold rounded-xl transition">
          ${item.embargo ? 'Cabut Embargo' : 'Embargo'}
        </button>
      </div>
    `;
  });
}

function toggleEmbargo(key, status) {
  db.ref(`monetary_data/${key}/embargo`).set(status);
  addAuditLog(`ADMIN SANKSI: Status Embargo diganti menjadi ${status}`);
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
