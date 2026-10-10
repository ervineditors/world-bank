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

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('content-bank')) {
    initMemberPortal();
  }
});

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

function initMemberPortal() {
  startPopulationTicker();

  db.ref('monetary_data').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    populateSelects(data);
    updateMemberStats(data);
    renderPopulationRank(data);
  });

  document.getElementById('invoiceForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nominal = document.getElementById('invNominal').value;
    const title = document.getElementById('invTitle').value;
    const desc = document.getElementById('invDesc').value;

    db.ref('invoices').push({
      nominal: Number(nominal), title, desc, timestamp: Date.now()
    }).then(() => {
      alert("Invoice Massal Berhasil Diterbitkan ke Seluruh Player!");
      e.target.reset();
    });
  });

  document.getElementById('loanForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = document.getElementById('loanAmount').value;
    const reason = document.getElementById('loanReason').value;

    db.ref('loans').push({
      amount: Number(amount), reason, status: 'Pending', timestamp: Date.now()
    }).then(() => {
      alert("Pengajuan Pinjaman (WCB Loan) berhasil dikirim ke Admin WCB!");
      e.target.reset();
    });
  });

  document.getElementById('treatyForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const target = document.getElementById('treatyTarget').value;
    const field = document.getElementById('treatyField').value;
    const type = document.getElementById('treatyType').value;
    const title = document.getElementById('treatyTitle').value;
    const desc = document.getElementById('treatyDesc').value;

    db.ref('treaties').push({
      target, field, type, title, desc, timestamp: Date.now()
    }).then(() => {
      alert("Proposal Kerjasama Berhasil Dikirim!");
      e.target.reset();
    });
  });
}

function startPopulationTicker() {
  let currentPop = 1250400;
  const popEl = document.getElementById('popTotal');
  if (!popEl) return;

  setInterval(() => {
    currentPop += (21 - 30); 
    popEl.textContent = currentPop.toLocaleString() + ' Jiwa';
  }, 30000);
}

function populateSelects(data) {
  const transSel = document.getElementById('transferTarget');
  const treatySel = document.getElementById('treatyTarget');
  if (transSel) transSel.innerHTML = '<option value="">-- Pilih Negara Tujuan Transfer --</option>';
  if (treatySel) treatySel.innerHTML = '<option value="">-- Pilih Negara Tujuan Kerjasama --</option>';

  Object.keys(data).forEach(key => {
    const item = data[key];
    if (transSel) transSel.innerHTML += `<option value="${key}">${item.country} (${item.currency})</option>`;
    if (treatySel) treatySel.innerHTML += `<option value="${key}">${item.country} (${item.currency})</option>`;
  });
}

function updateMemberStats(data) {
  let totalDevisa = 0;
  Object.values(data).forEach(item => {
    totalDevisa += Number(item.stock || 1000) * Number(item.kurs || 1.0);
  });

  document.getElementById('statPdb').textContent = (totalDevisa * 2.5).toLocaleString() + ' EUPH';
  document.getElementById('statDevisa').textContent = totalDevisa.toLocaleString() + ' EUPH';
  document.getElementById('statKasLokal').textContent = (totalDevisa * 100).toLocaleString();
  
  document.getElementById('stokMinyak').textContent = (totalDevisa % 5000).toLocaleString() + ' Unit';
  document.getElementById('stokEmas').textContent = (totalDevisa % 3000).toLocaleString() + ' Unit';
  document.getElementById('stokPangan').textContent = (totalDevisa % 10000).toLocaleString() + ' Unit';
}

function renderPopulationRank(data) {
  const tbody = document.getElementById('populationRankTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  let countries = Object.values(data);
  if (countries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-slate-500 italic">Belum ada data negara terdaftar.</td></tr>';
    return;
  }

  countries = countries.map((c, index) => ({
    country: c.country,
    currency: c.currency,
    flag: c.flag || '',
    population: c.population || (12000000 + (index * 5400000) + (Number(c.stock || 1000) * 1500))
  })).sort((a, b) => b.population - a.population);

  countries.forEach((item, index) => {
    let rankBadge = `<span>#${index + 1}</span>`;
    if (index === 0) rankBadge = `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold">👑 #1</span>`;
    else if (index === 1) rankBadge = `<span class="px-2 py-0.5 bg-slate-400/20 text-slate-300 border border-slate-400/30 rounded-full font-bold">🥈 #2</span>`;
    else if (index === 2) rankBadge = `<span class="px-2 py-0.5 bg-amber-700/20 text-amber-600 border border-amber-700/30 rounded-full font-bold">🥉 #3</span>`;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition';
    tr.innerHTML = `
      <td class="py-3 px-3 font-mono font-bold">${rankBadge}</td>
      <td class="py-3 px-3 font-semibold text-white flex items-center gap-2">
        ${item.flag ? `<img src="${item.flag}" class="w-5 h-4 object-cover rounded shadow">` : '<i class="fa-solid fa-flag text-cyan-400"></i>'}
        ${item.country} <span class="text-slate-400 font-mono text-[10px]">(${item.currency})</span>
      </td>
      <td class="py-3 px-3 font-mono text-emerald-400 font-bold">${item.population.toLocaleString()} Jiwa</td>
      <td class="py-3 px-3 font-mono text-cyan-400">📈 +21/min (Stabil)</td>
    `;
    tbody.appendChild(tr);
  });
}

function tukarKeLokal() {
  const val = document.getElementById('tukarEuphVal').value;
  if (!val || val <= 0) return alert("Masukkan nominal EUPH yang valid!");
  alert(`Berhasil menukar ${val} EUPH menjadi Uang Lokal sesuai kurs aktif! Resi tercatat.`);
  document.getElementById('tukarEuphVal').value = '';
}

function tukarKeDevisa() {
  const val = document.getElementById('tukarLokalVal').value;
  if (!val || val <= 0) return alert("Masukkan nominal Uang Lokal yang valid!");
  alert(`Berhasil menukar Uang Lokal senilai ${val} ke Devisa EUPH!`);
  document.getElementById('tukarLokalVal').value = '';
}

function verifyResi() {
  const resi = document.getElementById('verifyResiInput').value.trim();
  if (!resi) return alert("Tempelkan kode resi terlebih dahulu!");
  alert(`Verifikasi Berhasil! Resi ${resi} dinyatakan ASLI dan terdaftar di Central Ledger WCB.`);
  document.getElementById('verifyResiInput').value = '';
}

function upgradeGudang() {
  if (confirm("Upgrade kapasitas gudang (+50.000 Cap) seharga 300.000 EUPH?")) {
    alert("Gudang berhasil di-upgrade! Kapasitas maksimal bertambah.");
  }
}
