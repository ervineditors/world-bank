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
const ADMIN_PIN = "272727"; // RAHASIA DI BACKEND

let activeUser = JSON.parse(localStorage.getItem('wcb_active_user')) || null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('content-bank')) {
    initMemberPortal();
  }
  if (document.getElementById('adminAuthModal')) {
    initAdminVault();
  }
});

function switchAuthBox(boxNum) {
  document.getElementById('authBox1').classList.add('hidden');
  document.getElementById('authBox2').classList.add('hidden');
  document.getElementById('authBox3').classList.add('hidden');

  document.getElementById('box1Btn').className = "py-2.5 rounded-lg text-slate-400 hover:text-white transition";
  document.getElementById('box2Btn').className = "py-2.5 rounded-lg text-slate-400 hover:text-white transition";
  document.getElementById('box3Btn').className = "py-2.5 rounded-lg text-slate-400 hover:text-white transition";

  document.getElementById(`authBox${boxNum}`).classList.remove('hidden');
  if (boxNum === 1) document.getElementById('box1Btn').className = "py-2.5 rounded-lg bg-cyan-600 text-white shadow-lg";
  if (boxNum === 2) document.getElementById('box2Btn').className = "py-2.5 rounded-lg bg-blue-600 text-white shadow-lg";
  if (boxNum === 3) document.getElementById('box3Btn').className = "py-2.5 rounded-lg bg-amber-600 text-white shadow-lg";
}

function initMemberPortal() {
  if (activeUser) {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('activeCountryBadge').textContent = activeUser.country;
    if (activeUser.community) document.getElementById('communityBadge').textContent = `Server: ${activeUser.community}`;
    if (activeUser.flag) document.getElementById('countryFlagBox').innerHTML = `<img src="${activeUser.flag}" class="w-full h-full object-cover rounded-lg">`;
  }

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

  const regForm = document.getElementById('authBox2');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const country = document.getElementById('regCountry').value.trim();
      const leader = document.getElementById('regLeader').value.trim();
      const currency = document.getElementById('regCurrency').value.trim();
      const flag = document.getElementById('regFlag').value.trim();
      const community = document.getElementById('regCommunity').value.trim();
      const pop = Number(document.getElementById('regPopulation').value);
      const pin = document.getElementById('regPin').value.trim();

      if (pop > 10000000) {
        if ("vibrate" in navigator) navigator.vibrate([300, 100, 300]);
        return alert("⚠️ Batas populasi maksimal 10.000.000 Jiwa!");
      }

      const newRef = db.ref('monetary_data').push();
      const newAccount = {
        country, leader, currency, flag, community, population: pop, pin,
        devisa: 50000, kasLokal: 50000000, stock: 0, maxStorage: 100000
      };
      newRef.set(newAccount).then(() => {
        activeUser = { key: newRef.key, ...newAccount };
        localStorage.setItem('wcb_active_user', JSON.stringify(activeUser));
        location.reload();
      });
    });
  }

  // PENDIRIAN PERUSAHAAN
  const compForm = document.getElementById('companyForm');
  if (compForm) {
    compForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeUser) return;
      const name = document.getElementById('compName').value.trim();
      const sector = document.getElementById('compSector').value.trim();

      db.ref('global_companies').push({
        country: activeUser.country, name, sector, status: 'Maju', valuation: 200000, timestamp: Date.now()
      }).then(() => {
        alert("Perusahaan berhasil didirikan dan terdaftar di bursa!");
        compForm.reset();
      });
    });
  }

  // GENERATE INVOICE & NOTA RESI
  const invForm = document.getElementById('invoiceForm');
  if (invForm) {
    invForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeUser) return;
      const nominal = document.getElementById('invNominal').value;
      const title = document.getElementById('invTitle').value;
      const resiCode = `WCB-RESI-${Math.floor(100000 + Math.random() * 900000)}`;

      alert(`Invoice Berhasil Diterbitkan!\nKode Resi: ${resiCode}`);
      invForm.reset();
    });
  }

  startPopulationTicker();
}

function logoutMember() {
  localStorage.removeItem('wcb_active_user');
  window.location.href = 'index.html';
}

function startPopulationTicker() {
  setInterval(() => {
    if (activeUser && activeUser.key) {
      db.ref(`monetary_data/${activeUser.key}/population`).transaction(cur => (cur || 0) + 20);
    }
  }, 60000);
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
  db.ref('global_companies').on('value', snap => {
    const comps = snap.val() || {};
    const c = document.getElementById('adminCompanyList');
    if (!c) return;
    c.innerHTML = '';
    Object.keys(comps).forEach(k => {
      const comp = comps[k];
      c.innerHTML += `
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
          <div><strong class="text-white">${comp.name}</strong> (${comp.country}) - Sektor: ${comp.sector} | Status: <span class="text-emerald-400">${comp.status}</span></div>
          <div class="flex gap-2">
            <button onclick="updateCompanyStatus('${k}', 'Bangkrut')" class="px-3 py-1 bg-rose-600 text-white rounded-lg">Bangkrutkan</button>
            <button onclick="deleteCompany('${k}')" class="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg">Hapus</button>
          </div>
        </div>`;
    });
  });
}

function updateCompanyStatus(key, status) {
  db.ref(`global_companies/${key}/status`).set(status);
  alert(`Status perusahaan diubah menjadi ${status}`);
}

function deleteCompany(key) {
  db.ref(`global_companies/${key}`).remove();
}

function triggerCrisis(type) {
  alert(`Krisis ${type.toUpperCase()} Berhasil Dipicu!`);
}
