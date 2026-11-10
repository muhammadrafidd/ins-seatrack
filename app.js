const app = document.getElementById('app');
const state = { user: null, token: null, dashboard: null, view: 'overview', selectedShipmentId: '', attentionType: '', editShipmentId: '', returnToAttention: false, returnToDashboard: false, returnToShipments: false, presentationMode: false };
const dashboardFilters = { route: 'Semua rute', status: 'Semua status' };
const analysisFilters = { route: 'Semua rute', stage: 'Semua tahapan' };
const shipmentProcessLabels = { DRAFT: 'Persiapan dokumen', BOOKED: 'Booking / Pickup', EXPORT_CLEARED: 'Dokumen ekspor selesai', IN_TRANSIT: 'Dalam pelayaran', ARRIVED: 'Tiba di tujuan', CUSTOMS: 'Proses customs', OUT_FOR_DELIVERY: 'Pengantaran lokal', DELIVERED: 'Delivered / POD' };
const shipmentProcessFlow = (type) => type === 'OI' ? ['DRAFT', 'BOOKED', 'IN_TRANSIT', 'CUSTOMS', 'OUT_FOR_DELIVERY', 'DELIVERED'] : ['DRAFT', 'BOOKED', 'EXPORT_CLEARED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'];
const roleKey = () => state.user?.role === 'sales' ? 'operasional' : state.user?.role;
const canOperate = () => ['admin', 'operasional'].includes(roleKey());
const canManage = () => ['admin', 'manager'].includes(roleKey());
const roleLabel = () => ({ admin: 'Administrator', operasional: 'Operasional', sales: 'Operasional', manager: 'Manager' }[state.user?.role] || 'Pengguna');

const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const formatNumber = new Intl.NumberFormat('id-ID');
const formatWeight = (value) => `${formatNumber.format(value)} kg`;
const dateInputValue = (value) => { const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || ''); };

function confirmSave(onConfirm) {
  document.querySelector('.save-confirmation')?.remove();
  const modal = document.createElement('div');
  modal.className = 'save-confirmation';
  modal.innerHTML = `<section class="save-confirmation-card" role="dialog" aria-modal="true" aria-labelledby="save-confirmation-title"><span class="save-confirmation-icon">✓</span><div><p class="eyebrow">KONFIRMASI DATA</p><h2 id="save-confirmation-title">Apakah data sudah benar?</h2><p>Periksa kembali informasi yang diisi. Data hanya akan diperbarui setelah Anda memilih <strong>Ya, simpan</strong>.</p></div><div class="save-confirmation-actions"><button type="button" class="secondary check-again">Cek lagi</button><button type="button" class="primary confirm-save">Ya, simpan</button></div></section>`;
  const close = () => modal.remove();
  modal.querySelector('.check-again').addEventListener('click', close);
  modal.querySelector('.confirm-save').addEventListener('click', () => { close(); onConfirm(); });
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.body.appendChild(modal);
  modal.querySelector('.confirm-save').focus();
}

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.matches('.login-form, [data-no-save-confirmation]')) return;
  if (form.dataset.saveConfirmed === 'yes') { delete form.dataset.saveConfirmed; return; }
  event.preventDefault();
  event.stopImmediatePropagation();
  confirmSave(() => { form.dataset.saveConfirmed = 'yes'; form.requestSubmit(); });
}, true);

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...options.headers, ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) } });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const result = response.status === 204 ? null : (isJson ? await response.json() : null);
  if (!response.ok) { const error = new Error(result?.message || `Permintaan gagal (${response.status})`); error.status = response.status; throw error; }
  return result;
}
async function loadDashboard() { state.dashboard = await request('/api/dashboard'); }
async function login(email, password) {
  const result = await request('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  state.token = result.token; state.user = result.user; localStorage.setItem('ins-seatrack-session', JSON.stringify({ token: state.token, user: state.user })); await loadDashboard(); renderApp();
}
function createLogin() {
  const root = document.createElement('main'); root.className = 'login-page';
  root.innerHTML = `<section class="login-intro"><div class="brand logo-on-dark"><img src="ins-logo.svg" alt="INS Corporation"><small>SHIPMENT INTELLIGENCE</small></div><div><p class="eyebrow">SEA FREIGHT MONITORING</p><h1>Setiap pelayaran,<br><em>lebih terkendali.</em></h1><p class="intro-copy">Pantau shipment laut, catat kendala, dan tentukan faktor prioritas dalam satu dashboard operasional.</p></div><p class="intro-foot">PT Intisarana Persada · Dashboard Operasional</p></section><section class="login-panel"><form class="login-form" autocomplete="off"><img class="login-logo" src="ins-logo.svg" alt="INS Corporation"><p class="eyebrow">SELAMAT DATANG</p><h2>Masuk ke dashboard</h2><p class="muted">Gunakan akun Anda untuk melanjutkan.</p><label>Email kerja<input id="email" type="email" autocomplete="off" placeholder="Masukkan email kerja" required></label><label>Password<input id="password" type="password" autocomplete="new-password" placeholder="Masukkan password" required></label><button class="primary" type="submit">Masuk ke dashboard <span>→</span></button><p class="form-message" role="alert"></p></form></section>`;
  root.querySelectorAll('.logo-on-dark').forEach((brand) => { brand.innerHTML = '<span class="company-lockup"><i>PT.</i><span><b>INTISARANA</b><strong>PERSADA</strong></span></span><small>FREIGHT FORWARDING · OPERATIONS</small>'; });
  root.querySelector('.login-logo')?.remove();
  root.querySelector('.demo-note')?.remove();
  root.classList.add('seatrack-login');
  const intro = root.querySelector('.login-intro');
  intro.classList.add('seatrack-intro');
  intro.querySelector('.company-lockup').innerHTML = '<i>PT.</i><span><b>INTISARANA</b><strong>PERSADA</strong></span>';
  intro.querySelector('.logo-on-dark small').textContent = 'INS SEATRACK';
  intro.querySelector('.eyebrow').textContent = 'MONITORING PENGIRIMAN LAUT';
  intro.querySelector('h1').innerHTML = 'INS SeaTrack<small>Monitoring Pengiriman Laut &amp;<br>Prioritas Penanganan Keterlambatan</small>';
  intro.querySelector('.intro-copy').remove();
  root.querySelector('.login-form .eyebrow').textContent = 'PT INTISARANA PERSADA';
  root.querySelector('.login-form h2').textContent = 'Masuk ke INS SeaTrack';
  root.querySelector('.login-form > .muted').textContent = 'Gunakan akun operasional Anda untuk melanjutkan.';
  root.querySelector('.login-form label').firstChild.textContent = 'Email / Username';
  root.querySelector('.login-form .primary').innerHTML = 'Masuk';
  root.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); const message = root.querySelector('.form-message'); const submit = root.querySelector('.login-form .primary'); try { submit.disabled = true; message.textContent = 'Memuat dashboard…'; await login(root.querySelector('#email').value, root.querySelector('#password').value); } catch (error) { message.textContent = error.message; submit.disabled = false; } });
  return root;
}
function navIcon(view) { const icons = { overview: '⌂', shipments: '▣', delays: '✎', analysis: '◔', ahp: '◆', recommendations: '✓', reports: '▤' }; return `<span class="nav-icon">${icons[view] || '•'}</span>`; }
function navIcon(view) {
  const paths = {
    overview: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 21V9"></path>',
    shipments: '<path d="M3 7h18M3 12h18M3 17h18"></path><path d="M6 5v14"></path>',
    delays: '<path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.3 3.9 2.7 18a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path>',
    analysis: '<path d="M5 20V10M12 20V4M19 20v-7"></path><path d="M3 20h18"></path>',
    ahp: '<path d="m12 3 2.75 5.57 6.15.9-4.45 4.34 1.05 6.14L12 17.06 6.5 19.95l1.05-6.14L3.1 9.47l6.15-.9L12 3Z"></path>',
    recommendations: '<path d="m5 12 4 4L19 6"></path>',
    reports: '<path d="M6 3h9l3 3v15H6z"></path><path d="M15 3v4h4M9 12h6M9 16h6"></path>',
    manual: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5A2.5 2.5 0 0 0 17.5 17H4z"></path><path d="M4 4.5V20a2 2 0 0 0 2 2h13.5M8 6h8M8 10h8"></path>'
  };
  return `<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[view] || paths.overview}</svg></span>`;
}
function createShell() {
  const root = document.createElement('div'); root.className = 'shell';
  root.innerHTML = `<aside class="sidebar"><a class="brand logo-on-dark" href="#overview"><img src="ins-logo.svg" alt="INS Corporation"><small>SHIPMENT INTELLIGENCE</small></a><p class="nav-label">MENU UTAMA</p><nav><button data-view="overview">${navIcon('▦')} Overview</button><button data-view="shipments">${navIcon('≡')} Data shipment</button><button data-view="delays">${navIcon('!')} Input kendala</button><button data-view="ahp">${navIcon('◈')} Prioritas AHP</button><button data-view="reports">${navIcon('↗')} Laporan</button></nav><div class="data-source"><span class="eyebrow">SUMBER DATA</span><strong>Inbound &amp; Outbound</strong><small>140 shipment valid · Excel</small></div></aside><div class="content"><header><div class="profile"><span class="avatar">${escapeHTML(state.user.name[0])}</span><span><strong>${escapeHTML(state.user.name)}</strong><small>${escapeHTML(state.user.role)}</small></span><button class="logout" title="Keluar" aria-label="Keluar">↪</button></div></header><main class="workspace"></main></div>`;
  root.querySelectorAll('.logo-on-dark').forEach((brand) => { brand.innerHTML = '<span class="company-lockup"><i>PT.</i><span><b>INTISARANA</b><strong>PERSADA</strong></span></span><small>FREIGHT FORWARDING · OPERATIONS</small>'; });
  const navigation = { overview: ['▦', '1. Dashboard'], shipments: ['≡', '2. Data shipment'], delays: ['!', '3. Catat kendala'], ahp: ['◈', '4. Analisis AHP'], reports: ['↗', '5. Laporan'] };
  const sidebarFooter = root.querySelector('.data-source');
  sidebarFooter.classList.add('sidebar-footer');
  sidebarFooter.innerHTML = '<strong>INS SeaTrack</strong><span>Shipment Intelligence</span><small>© 2026 PT Intisarana Persada</small>';
  const nav = root.querySelector('nav');
  nav.querySelector('[data-view="reports"]').insertAdjacentHTML('afterend', `<button data-view="manual">${navIcon('manual')} Panduan penggunaan</button>`);
  nav.querySelector('[data-view="delays"]').insertAdjacentHTML('afterend', `<button data-view="analysis">${navIcon('≋')} Analisis kendala</button>`);
  nav.querySelector('[data-view="ahp"]').insertAdjacentHTML('afterend', `<button data-view="recommendations">${navIcon('✓')} Rekomendasi perbaikan</button>`);
  Object.assign(navigation, { overview: ['▦', '1. Dashboard'], shipments: ['≡', '2. Data shipment'], delays: ['!', '3. Input kendala'], analysis: ['≋', '4. Analisis kendala'], ahp: ['◈', '5. Prioritas AHP'], recommendations: ['✓', '6. Rekomendasi perbaikan'], reports: ['↗', '7. Laporan'] });
  navigation.manual = ['8. Panduan penggunaan'];
  root.querySelectorAll('[data-view]').forEach((button) => { const label = navigation[button.dataset.view]?.[1] || button.textContent || 'Halaman'; button.innerHTML = navIcon(button.dataset.view) + String(label).replace(/^\d+\.\s*/, ''); button.addEventListener('click', () => { state.view = button.dataset.view; renderApp(); }); });
  const menuNames = { overview: 'Dashboard', shipments: 'Data shipment', delays: 'Catat kendala', analysis: 'Analisis kendala', ahp: 'Prioritas AHP', recommendations: 'Rekomendasi perbaikan', reports: 'Laporan', manual: 'Panduan penggunaan' };
  root.querySelectorAll('[data-view]').forEach((button) => { button.innerHTML = navIcon(button.dataset.view) + menuNames[button.dataset.view]; });
  root.querySelector('.nav-label').textContent = 'NAVIGASI';
  nav.querySelector('[data-view="shipments"]').insertAdjacentHTML('beforebegin', '<p class="nav-group">OPERASIONAL</p>');
  nav.querySelector('[data-view="analysis"]').insertAdjacentHTML('beforebegin', '<p class="nav-group">ANALISIS</p>');
  nav.querySelector('[data-view="reports"]').insertAdjacentHTML('beforebegin', '<p class="nav-group">RINGKASAN</p>');
  nav.querySelector('[data-view="manual"]').insertAdjacentHTML('beforebegin', '<p class="nav-group">BANTUAN</p>');
  if (!canOperate()) nav.querySelector('[data-view="delays"]')?.remove();
  if (!canManage()) ['analysis', 'ahp', 'recommendations', 'reports'].forEach((view) => nav.querySelector(`[data-view="${view}"]`)?.remove());
  root.querySelector(`[data-view="${state.view}"]`)?.classList.add('active');
  const profile = root.querySelector('.profile');
  const profileAccount = document.createElement('button');
  profileAccount.className = 'profile-account'; profileAccount.type = 'button'; profileAccount.title = 'Buka pengaturan akun';
  profileAccount.append(profile.querySelector('.avatar'), profile.querySelector('.avatar + span'));
  profile.prepend(profileAccount);
  profileAccount.addEventListener('click', () => { state.view = 'settings'; renderApp(); });
  root.querySelector('.logout').addEventListener('click', async () => { await request('/api/logout', { method: 'POST' }); localStorage.removeItem('ins-seatrack-session'); localStorage.removeItem('ins-seatrack-view'); state.user = null; state.token = null; state.dashboard = null; renderApp(); });
  return root;
}
function viewTitle() { return ({ overview: 'Dashboard overview', shipments: 'Data shipment', attention: 'Perlu tindakan', detail: 'Detail shipment', delays: 'Input kendala', analysis: 'Analisis kendala', ahp: 'Analisis prioritas AHP', recommendations: 'Rekomendasi perbaikan', reports: 'Laporan operasional', manual: 'Panduan penggunaan', settings: 'Pengaturan' })[state.view]; }
function createKpi(label, value, note, tone) { return `<article class="kpi ${tone || ''}"><p>${label}</p><strong>${value}</strong><span>${note}</span></article>`; }
function barList(title, subtitle, list) {
  const maximum = Math.max(...list.map((item) => item.value), 1);
  return `<section class="panel"><div class="panel-title"><div><h2>${title}</h2><p>${subtitle}</p></div></div><div class="bars">${list.map((item) => `<div class="bar-row"><span title="${escapeHTML(item.label)}">${escapeHTML(item.label)}</span><div><i style="width:${item.value / maximum * 100}%"></i></div><b>${item.value}</b></div>`).join('')}</div></section>`;
}
function overview() {
  const { summary, routes, carriers, delays } = state.dashboard;
  const page = document.createElement('div'); page.innerHTML = `<section class="hero"><div><p class="eyebrow">SEA FREIGHT CONTROL CENTER</p><h1>Gambaran operasional <em>hari ini.</em></h1><p>Monitoring shipment laut dari data inbound dan outbound yang tersedia.</p></div><button class="primary go-delay">+ Catat kendala</button></section><section class="kpis">${createKpi('Total shipment', formatNumber.format(summary.totalShipments), 'Data valid dari Excel', 'teal')}${createKpi('LCL', formatNumber.format(summary.lcl), '81% dari total shipment')}${createKpi('FCL', formatNumber.format(summary.fcl), '19% dari total shipment')}${createKpi('Total berat kargo', formatWeight(summary.totalWeight), 'Tercatat pada data sumber', 'mint')}</section><section class="notice"><strong>Catatan kualitas data</strong><span>Actual arrival dan status tepat waktu belum ada pada file sumber. Status delay hanya muncul setelah kendala dicatat oleh operasional.</span><b>${summary.pendingEvaluation} belum dievaluasi</b></section><section class="dashboard-grid">${barList('Rute terbanyak', 'Berdasarkan origin dan destination', routes)}${barList('Carrier terbanyak', 'Berdasarkan data carrier pengiriman', carriers)}<section class="panel delay-summary"><div class="panel-title"><div><h2>Kendala tercatat</h2><p>Input keterlambatan oleh operasional</p></div><span class="pill">${delays.length} kendala</span></div>${delays.length ? delays.slice(0, 4).map((delay) => { const shipment = state.dashboard.shipments.find((item) => item.id === delay.shipmentId); return `<div class="delay-line"><span>${escapeHTML(shipment?.shipmentNo)}</span><div><strong>${escapeHTML(delay.factor)}</strong><small>${escapeHTML(delay.processStage)} · ${escapeHTML(delay.incidentDate)}</small></div></div>`; }).join('') : '<div class="empty">Belum ada kendala yang dicatat.</div>'}</section></section>`;
  page.querySelector('.dashboard-grid').insertAdjacentHTML('beforebegin', '<section class="monitoring-flow"><div><p class="eyebrow">ALUR MONITORING</p><h2>Dari shipment hingga laporan prioritas.</h2><p>Dashboard ini difokuskan pada pemantauan keterlambatan pengiriman laut, bukan sistem forwarding menyeluruh.</p></div><div class="flow-steps"><button class="flow-step" data-flow-view="shipments"><b>01 · Data shipment</b><span>ETD, ETA, rute, customer</span></button><span class="flow-arrow">→</span><button class="flow-step" data-flow-view="delays"><b>02 · Input kendala</b><span>Delay dan tindakan</span></button><span class="flow-arrow">→</span><button class="flow-step" data-flow-view="ahp"><b>03 · Prioritas AHP</b><span>9 faktor penyebab</span></button><span class="flow-arrow">→</span><button class="flow-step" data-flow-view="reports"><b>04 · Laporan</b><span>Ringkasan operasional</span></button></div><p class="flow-note"><strong>Catatan data:</strong> status tepat waktu dan persentase delay akan aktif setelah actual arrival tersedia pada sumber data.</p></section>');
  page.querySelectorAll('[data-flow-view]').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.flowView; renderApp(); }));
  page.querySelector('.go-delay').addEventListener('click', () => { state.view = 'delays'; renderApp(); }); return page;
}
function shipments() {
  const page = document.createElement('div'); const shipments = state.dashboard.shipments;
  page.innerHTML = `<section class="page-title"><p class="eyebrow">DATA SUMBER</p><h1>Data shipment laut</h1><p>${shipments.length} data valid yang disinkronkan dari file inbound &amp; outbound.</p></section><section class="panel table-panel"><div class="table-tools"><label class="search">⌕ <input type="search" placeholder="Cari shipment, customer, rute…"></label><span>${shipments.length} shipment</span></div><div class="table-wrap"><table><thead><tr><th>Shipment</th><th>Jenis</th><th>Shipper / Consignee</th><th>Rute</th><th>ETD</th><th>ETA</th><th>Carrier</th><th>Status</th></tr></thead><tbody>${shipments.map((item) => `<tr><td><strong>${escapeHTML(item.shipmentNo)}</strong><small>${escapeHTML(item.invoiceNo)}</small></td><td><span class="tag">${escapeHTML(item.productService)}</span><small>${escapeHTML(item.shipmentType)}</small></td><td><strong>${escapeHTML(item.shipper)}</strong><small>${escapeHTML(item.consignee)}</small></td><td>${escapeHTML(item.origin)} <span class="route-arrow">→</span> ${escapeHTML(item.destination)}</td><td>${escapeHTML(item.etd || '-')}</td><td>${escapeHTML(item.eta || '-')}</td><td>${escapeHTML(item.carrier)}</td><td><span class="status ${item.status === 'Delay' ? 'delay' : 'pending'}">${escapeHTML(item.status)}</span></td></tr>`).join('')}</tbody></table></div></section>`;
  page.querySelector('.table-tools').insertAdjacentHTML('afterend', '<div class="shipment-guide"><span class="guide-step">LANGKAH 2</span><strong>Pilih shipment yang mengalami kendala</strong><p>Klik baris shipment untuk langsung membuka form pencatatan kendala.</p></div>');
  page.querySelectorAll('tbody tr').forEach((row, index) => row.addEventListener('click', () => { state.selectedShipmentId = shipments[index].id; state.view = 'detail'; renderApp(); }));
  page.querySelector('input').addEventListener('input', (event) => { const query = event.target.value.toLowerCase(); page.querySelectorAll('tbody tr').forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); }); }); return page;
}
function attention() {
  const processMap = state.dashboard.shipmentProcesses || {};
  const isDelay = state.attentionType === 'delay';
  const items = state.dashboard.shipments.filter((shipment) => isDelay ? shipment.status === 'Delay' && processMap[String(shipment.id)]?.at(-1)?.status !== 'DELIVERED' : shipment.status === 'Belum dievaluasi');
  const title = isDelay ? 'Shipment terlambat aktif' : 'Shipment perlu evaluasi';
  const description = isDelay ? 'Daftar shipment berstatus delay yang proses pengirimannya masih berjalan dan perlu ditindaklanjuti.' : 'Daftar shipment yang membutuhkan kelengkapan actual arrival atau evaluasi status.';
  const page = document.createElement('div');
  page.innerHTML = `<section class="attention-heading"><div><p class="eyebrow">FOKUS OPERASIONAL</p><h1>${title}</h1><p>${description}</p></div><button class="secondary back-dashboard" type="button">← Kembali ke dashboard</button></section><section class="panel attention-list"><div class="attention-list-top"><strong>${items.length} shipment perlu ditinjau</strong><label>⌕ <input type="search" placeholder="Cari Shipment ID, customer, atau rute…"></label></div><div class="shipment-table-wrap"><table><thead><tr><th>No.</th><th>Shipment ID</th><th>Customer</th><th>Rute</th><th>ETA</th><th>Actual arrival</th><th>Status</th><th>Proses pengiriman</th><th>Aksi</th></tr></thead><tbody>${items.map((item, index) => { const current = processMap[String(item.id)]?.at(-1)?.status; return `<tr><td>${index + 1}</td><td><strong>${escapeHTML(item.shipmentNo)}</strong><small>${escapeHTML(item.productService)} · ${escapeHTML(item.shipmentType)}</small></td><td>${escapeHTML(item.shipper)}</td><td>${escapeHTML(item.origin)} → ${escapeHTML(item.destination)}</td><td>${escapeHTML(item.eta || '-')}</td><td>${escapeHTML(item.actualArrival || '-')}</td><td><span class="status ${item.status === 'Delay' ? 'delay' : 'pending'}">${escapeHTML(item.status)}</span></td><td><span class="process-status ${current ? 'started' : 'waiting'}">${escapeHTML(current ? shipmentProcessLabels[current] : 'Belum dimulai')}</span></td><td><button class="table-edit" data-edit="${item.id}">Edit</button><button class="table-detail" data-detail="${item.id}">Detail</button></td></tr>`; }).join('')}</tbody></table></div>${items.length ? '' : '<p class="empty attention-empty">Tidak ada shipment yang perlu ditinjau pada kategori ini.</p>'}</section>`;
  page.querySelector('.back-dashboard').addEventListener('click', () => { state.view = 'overview'; renderApp(); });
  page.querySelector('input').addEventListener('input', (event) => { const query = event.target.value.toLowerCase(); page.querySelectorAll('tbody tr').forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); }); });
  const rows = [...page.querySelectorAll('tbody tr')];
  const pager = document.createElement('nav'); pager.className = 'shipment-pagination attention-pagination';
  page.querySelector('.attention-list').insertAdjacentElement('afterend', pager);
  let currentPage = 1; let searchQuery = '';
  const renderRows = () => {
    const matching = rows.filter((row) => row.textContent.toLowerCase().includes(searchQuery));
    const pageSize = 8; const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    rows.forEach((row) => { row.hidden = true; });
    matching.slice((currentPage - 1) * pageSize, currentPage * pageSize).forEach((row) => { row.hidden = false; });
    const first = matching.length ? (currentPage - 1) * pageSize + 1 : 0; const last = Math.min(currentPage * pageSize, matching.length);
    const start = Math.min(Math.max(currentPage - 1, 1), Math.max(1, pageCount - 2));
    const numbers = Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index);
    pager.innerHTML = `<span>${first}–${last} dari ${matching.length} shipment</span><button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>${numbers.map((number) => `<button class="${number === currentPage ? 'active' : ''}" data-page="${number}">${number}</button>`).join('')}<button ${currentPage === pageCount ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;
    pager.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => { currentPage = Number(button.dataset.page); renderRows(); }));
  };
  page.querySelector('input').addEventListener('input', (event) => { searchQuery = event.target.value.toLowerCase(); currentPage = 1; renderRows(); });
  if (rows.length) renderRows(); else pager.remove();
  page.querySelectorAll('[data-detail]').forEach((button) => button.addEventListener('click', () => { state.selectedShipmentId = Number(button.dataset.detail); state.returnToAttention = true; state.returnToDashboard = false; state.returnToShipments = false; state.view = 'detail'; renderApp(); }));
  page.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => {
    const shipment = items.find((item) => item.id === Number(button.dataset.edit));
    if (!shipment) return;
    const modal = document.createElement('div'); modal.className = 'shipment-modal attention-edit-modal';
    modal.innerHTML = `<section class="shipment-editor" role="dialog" aria-modal="true"><button class="close-editor" type="button" aria-label="Tutup">×</button><div class="panel-title"><div><p class="eyebrow">EDIT SHIPMENT</p><h2>${escapeHTML(shipment.shipmentNo)}</h2><p>Perbarui data pengiriman tanpa meninggalkan daftar tindakan.</p></div></div><form><div class="shipment-form-grid"><label>Shipment ID<input name="shipmentNo" value="${escapeHTML(shipment.shipmentNo)}" required></label><label>Customer / Shipper<input name="shipper" value="${escapeHTML(shipment.shipper)}" required></label><label>Origin<input name="origin" value="${escapeHTML(shipment.origin)}" required></label><label>Destination<input name="destination" value="${escapeHTML(shipment.destination)}" required></label><label>ETD<input name="etd" type="date" value="${escapeHTML(dateInputValue(shipment.etd))}" required></label><label>ETA<input name="eta" type="date" value="${escapeHTML(dateInputValue(shipment.eta))}" required></label><label>Actual arrival<input name="actualArrival" type="date" value="${escapeHTML(dateInputValue(shipment.actualArrival))}"></label><label>Status<select name="status"><option ${shipment.status === 'Belum dievaluasi' ? 'selected' : ''}>Belum dievaluasi</option><option ${shipment.status === 'On Time' ? 'selected' : ''}>On Time</option><option ${shipment.status === 'Delay' ? 'selected' : ''}>Delay</option></select></label><label>Jenis layanan<select name="productService"><option ${shipment.productService === 'LCL' ? 'selected' : ''}>LCL</option><option ${shipment.productService === 'FCL' ? 'selected' : ''}>FCL</option></select></label><label>Arus shipment<select name="shipmentType"><option ${shipment.shipmentType === 'OE' ? 'selected' : ''}>OE</option><option ${shipment.shipmentType === 'OI' ? 'selected' : ''}>OI</option></select></label></div><div class="editor-actions"><button class="primary" type="submit">Simpan perubahan</button><p class="form-message"></p></div></form></section>`;
    page.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.close-editor').addEventListener('click', close);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    modal.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const message = form.querySelector('.form-message');
      try {
        await request(`/api/shipments/${shipment.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        await loadDashboard(); renderApp();
      } catch (error) { message.textContent = error.message; }
    });
  }));
  return page;
}

function delays() {
  const { shipments, delayFactors, processStages } = state.dashboard; const today = new Date().toISOString().slice(0, 10);
  const page = document.createElement('div'); page.innerHTML = `<section class="page-title"><p class="eyebrow">PENCATATAN OPERASIONAL</p><h1>Input kendala keterlambatan</h1><p>Catat satu kendala untuk setiap shipment. Pencatatan ulang akan memperbarui kendala sebelumnya.</p></section><section class="form-layout"><form class="panel delay-form"><h2>Detail kendala</h2><div class="field full"><label>Shipment <select name="shipmentId" required><option value="">Pilih nomor shipment</option>${shipments.map((item) => `<option value="${item.id}">${escapeHTML(item.shipmentNo)} · ${escapeHTML(item.origin)} → ${escapeHTML(item.destination)}</option>`).join('')}</select></label></div><div class="field"><label>Tanggal kendala<input type="date" name="incidentDate" value="${today}" required></label></div><div class="field"><label>Tahapan proses<select name="processStage" required>${processStages.map((item) => `<option>${escapeHTML(item)}</option>`).join('')}</select></label></div><div class="field full"><label>Faktor penyebab<select name="factor" required>${delayFactors.map((item) => `<option>${escapeHTML(item)}</option>`).join('')}</select></label></div><div class="field full"><label>Deskripsi kendala<textarea name="description" maxlength="2000" required placeholder="Jelaskan kendala yang terjadi…"></textarea></label></div><div class="field full"><label>Tindakan yang dilakukan<textarea name="action" maxlength="2000" placeholder="Tindakan atau tindak lanjut yang sudah dilakukan…"></textarea></label></div><button class="primary" type="submit">Simpan kendala</button><p class="form-message" role="alert"></p></form><aside class="factor-guide"><p class="eyebrow">9 KRITERIA PENELITIAN</p><h2>Gunakan kategori yang konsisten.</h2><ol>${delayFactors.map((factor) => `<li>${escapeHTML(factor)}</li>`).join('')}</ol></aside></section>`;
  if (state.selectedShipmentId) page.querySelector('[name="shipmentId"]').value = state.selectedShipmentId;
  const shipmentField = page.querySelector('[name="shipmentId"]').closest('.field');
  shipmentField.querySelector('label').childNodes[0].textContent = 'Nomor shipment / referensi pengiriman ';
  const shipmentSelect = shipmentField.querySelector('select');
  shipmentSelect.hidden = true;
  shipmentSelect.setAttribute('aria-hidden', 'true');
  shipmentSelect.style.display = 'none';
  const picker = document.createElement('div');
  picker.className = 'shipment-picker';
  picker.dataset.label = 'nomor-shipment';
  picker.innerHTML = '<span class="picker-label">Cari shipment</span><input class="shipment-picker-input" type="search" autocomplete="off" placeholder="Ketik Shipment ID, customer, atau rute…"><div class="shipment-picker-results" hidden></div><small>Pilih shipment dari hasil pencarian untuk melanjutkan.</small>';
  picker.innerHTML = '<span class="picker-label">Cari nomor shipment</span><input class="shipment-picker-input" type="search" autocomplete="off" placeholder="Ketik nomor shipment, customer, atau rute..."><div class="shipment-picker-results" hidden></div><small>Pilih nomor shipment dari hasil pencarian untuk melanjutkan.</small>';
  picker.innerHTML = '<input class="shipment-picker-input" type="search" autocomplete="off" placeholder="Cari nomor shipment, customer, atau rute..."><div class="shipment-picker-results" hidden></div><small>Ketik untuk mencari, lalu pilih nomor shipment dari daftar.</small>';
  shipmentField.querySelector('label').appendChild(picker);
  const pickerInput = picker.querySelector('input');
  const pickerResults = picker.querySelector('.shipment-picker-results');
  const chooseShipment = (item) => { shipmentSelect.value = item.id; pickerInput.value = `${item.shipmentNo} · ${item.origin} → ${item.destination}`; pickerResults.hidden = true; };
  if (state.selectedShipmentId) { const selected = shipments.find((item) => item.id === Number(state.selectedShipmentId)); if (selected) chooseShipment(selected); }
  const showShipmentResults = () => { const query = pickerInput.value.trim().toLowerCase(); const matches = shipments.filter((item) => `${item.shipmentNo} ${item.shipper} ${item.origin} ${item.destination}`.toLowerCase().includes(query)).slice(0, 8); pickerResults.innerHTML = matches.length ? matches.map((item) => `<button type="button" data-shipment-id="${item.id}"><strong>${escapeHTML(item.shipmentNo)}</strong><span>${escapeHTML(item.shipper)} · ${escapeHTML(item.origin)} → ${escapeHTML(item.destination)}</span></button>`).join('') : '<p>Shipment tidak ditemukan.</p>'; pickerResults.hidden = false; pickerResults.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => chooseShipment(shipments.find((item) => item.id === Number(button.dataset.shipmentId))))); };
  pickerInput.addEventListener('focus', showShipmentResults); pickerInput.addEventListener('input', showShipmentResults);
  const renderAllShipmentResults = () => { const query = pickerInput.value.trim().toLowerCase(); const matches = shipments.filter((item) => `${item.shipmentNo} ${item.shipper} ${item.origin} ${item.destination}`.toLowerCase().includes(query)); pickerResults.innerHTML = matches.length ? matches.map((item) => `<button type="button" data-shipment-id="${item.id}"><strong>${escapeHTML(item.shipmentNo)}</strong><span>${escapeHTML(item.shipper)} · ${escapeHTML(item.origin)} → ${escapeHTML(item.destination)}</span></button>`).join('') : '<p>Nomor shipment tidak ditemukan.</p>'; pickerResults.hidden = false; pickerResults.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => chooseShipment(shipments.find((item) => item.id === Number(button.dataset.shipmentId))))); };
  pickerInput.addEventListener('focus', renderAllShipmentResults); pickerInput.addEventListener('input', renderAllShipmentResults);
  pickerInput.addEventListener('keydown', (event) => { if (event.key === 'Escape') pickerResults.hidden = true; });
  document.addEventListener('click', (event) => { if (!picker.contains(event.target)) pickerResults.hidden = true; }, { once: true });
  const guide = page.querySelector('.factor-guide');
  guide.innerHTML = `<details><summary><span>Referensi</span> 9 kriteria penelitian</summary><ol>${delayFactors.map((factor) => `<li>${escapeHTML(factor)}</li>`).join('')}</ol><p class="factor-note"><strong>Controllable:</strong> dapat diperbaiki internal. <strong>Uncontrollable:</strong> perlu mitigasi dan komunikasi proaktif.</p></details>`;
  const actionField = page.querySelector('[name="action"]').closest('.field');
  const actionInput = actionField.querySelector('textarea');
  actionField.innerHTML = '<details class="optional-action"><summary>Tindakan lanjutan <small>(opsional)</small></summary></details>';
  const actionDetails = actionField.querySelector('details');
  const actionLabel = document.createElement('label'); actionLabel.textContent = 'Tindakan yang dilakukan'; actionLabel.appendChild(actionInput); actionDetails.appendChild(actionLabel);
  page.querySelector('form').insertAdjacentHTML('afterbegin', '<div class="form-guide"><span>LANGKAH 3</span><p>Pilih shipment, isi kendala yang benar-benar terjadi, lalu simpan.</p></div>');
  page.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const message = form.querySelector('.form-message'); try { await request('/api/delays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }); await loadDashboard(); state.selectedShipmentId = ''; message.textContent = 'Kendala berhasil disimpan.'; form.reset(); } catch (error) { message.textContent = error.message; } }); return page;
}
function ahp() {
  const page = document.createElement('div'); const { ahp } = state.dashboard;
  page.innerHTML = `<section class="page-title"><p class="eyebrow">HASIL PENELITIAN</p><h1>Analisis prioritas AHP</h1><p>Kerangka sembilan faktor penyebab keterlambatan sesuai persiapan data penelitian.</p></section><section class="ahp-intro"><strong>Belum ada bobot AHP final pada file sumber.</strong><span>Masukkan hasil pengolahan kuesioner dan nilai Consistency Ratio (CR) untuk mengaktifkan ranking prioritas.</span></section><section class="panel ahp-table"><div class="panel-title"><div><h2>Daftar kriteria</h2><p>Urutan di bawah ini adalah daftar kriteria, belum merupakan ranking hasil AHP.</p></div><span class="pill neutral">CR: belum tersedia</span></div>${ahp.map((item) => `<div class="ahp-row"><b>${String(item.rank).padStart(2, '0')}</b><strong>${escapeHTML(item.factor)}</strong><span>${escapeHTML(item.status)}</span><i>—</i></div>`).join('')}</section>`; return page;
}
function detail() {
  const shipment = state.dashboard.shipments.find((item) => item.id === Number(state.selectedShipmentId)) || state.dashboard.shipments[0];
  const records = state.dashboard.delays.filter((item) => item.shipmentId === shipment.id);
  const page = document.createElement('div');
  page.innerHTML = `<section class="page-title"><p class="eyebrow">DETAIL SHIPMENT</p><h1>${escapeHTML(shipment.shipmentNo)}</h1><p>${escapeHTML(shipment.origin)} &rarr; ${escapeHTML(shipment.destination)} · ${escapeHTML(shipment.productService)} ${escapeHTML(shipment.shipmentType)}</p></section><section class="detail-layout"><section class="panel detail-card"><h2>Informasi pengiriman</h2><dl><div><dt>Shipper</dt><dd>${escapeHTML(shipment.shipper)}</dd></div><div><dt>Consignee</dt><dd>${escapeHTML(shipment.consignee)}</dd></div><div><dt>Carrier / voyage</dt><dd>${escapeHTML(shipment.carrier)} · ${escapeHTML(shipment.vesselVoyage)}</dd></div><div><dt>ETD / ETA</dt><dd>${escapeHTML(shipment.etd)} / ${escapeHTML(shipment.eta)}</dd></div><div><dt>Actual arrival</dt><dd>${escapeHTML(shipment.actualArrival || 'Belum diisi')}</dd></div><div><dt>Durasi delay</dt><dd>${shipment.delayDays === null || shipment.delayDays === undefined ? 'Belum dihitung' : `${shipment.delayDays} hari`}</dd></div></dl></section><section class="panel history-card"><div class="panel-title"><div><h2>Riwayat kendala</h2><p>Kendala yang tercatat untuk shipment ini.</p></div></div>${records.length ? records.map((record) => `<article class="history-item"><strong>${escapeHTML(record.factor)}</strong><span>${escapeHTML(record.processStage)} · ${escapeHTML(record.incidentDate)}</span><p>${escapeHTML(record.description)}</p><small>${escapeHTML(record.controllability || 'Sifat kendala belum diisi')}</small></article>`).join('') : '<div class="empty">Belum ada kendala yang tercatat.</div>'}</section></section><button class="primary add-delay">+ Tambah kendala</button>`;
  const processHistory = state.dashboard.shipmentProcesses?.[String(shipment.id)] || [];
  const processFlow = shipmentProcessFlow(shipment.shipmentType);
  const currentIndex = processHistory.length - 1;
  const nextStatus = processFlow[currentIndex + 1];
  const processPanel = document.createElement('section');
  processPanel.className = 'panel shipment-process-panel';
  processPanel.innerHTML = `<div class="process-heading"><div><p class="eyebrow">PROSES PENGIRIMAN</p><h2>${processHistory.length ? shipmentProcessLabels[processHistory[currentIndex].status] : 'Belum dimulai'}</h2><p>${shipment.shipmentType === 'OI' ? 'Alur inbound dengan tahapan customs bila diperlukan.' : 'Alur outbound dari persiapan hingga bukti penerimaan.'}</p></div>${nextStatus ? `<button class="primary update-process" type="button">Update proses</button>` : '<span class="process-complete">Proses selesai</span>'}</div><ol class="process-timeline">${processFlow.map((status, index) => { const event = processHistory[index]; return `<li class="${event ? 'done' : ''} ${index === currentIndex ? 'current' : ''}"><i></i><div><strong>${shipmentProcessLabels[status]}</strong><span>${event ? `${escapeHTML(event.note)} · ${new Date(event.timestamp).toLocaleString('id-ID')}` : 'Menunggu pembaruan'}</span></div></li>`; }).join('')}</ol>`;
  processPanel.querySelectorAll('.process-timeline li').forEach((line, index) => { const document = processHistory[index]?.document; if (!document) return; if (document.number) line.querySelector('div').insertAdjacentHTML('beforeend', `<small class="process-document-number">Dok: ${escapeHTML(document.number)}</small>`); if (document.filePath) line.querySelector('div').insertAdjacentHTML('beforeend', `<a class="process-document-link" href="/api/shipments/${shipment.id}/process-documents/${index}">Unduh lampiran</a>`); });
  page.querySelector('.detail-layout').insertAdjacentElement('afterend', processPanel);
  if (!canOperate()) {
    processPanel.querySelector('.update-process')?.remove();
    page.querySelector('.add-delay')?.remove();
  }
  processPanel.querySelector('.update-process')?.addEventListener('click', () => {
    const modal = document.createElement('div'); modal.className = 'shipment-modal process-modal';
    modal.innerHTML = `<section class="shipment-editor" role="dialog" aria-modal="true"><button class="close-editor" type="button" aria-label="Tutup">×</button><div class="panel-title"><div><p class="eyebrow">UPDATE PROSES</p><h2>${shipmentProcessLabels[nextStatus]}</h2><p>Catat proses berikutnya untuk membangun riwayat shipment.</p></div></div><form><label>Catatan proses<textarea name="note" maxlength="500" required placeholder="Contoh: Booking telah dikonfirmasi oleh shipping line."></textarea></label><div class="editor-actions"><button class="primary" type="submit">Simpan proses</button><p class="form-message"></p></div></form></section>`;
    page.appendChild(modal); const processForm = modal.querySelector('form'); processForm.querySelector('label').insertAdjacentHTML('afterend', '<div class="process-document-fields"><label>Nomor dokumen <small>(opsional)</small><input name="documentNo" maxlength="100" placeholder="Contoh: BL-2026-001"></label><label>Lampiran dokumen <small>(opsional)</small><input name="documentFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.doc,.docx"></label><p>PDF, gambar, Excel, atau Word.</p></div>'); const close = () => modal.remove(); modal.querySelector('.close-editor').addEventListener('click', close); modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    processForm.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const message = form.querySelector('.form-message'); try { const data = new FormData(form); data.append('status', nextStatus); await request(`/api/shipments/${shipment.id}/process`, { method: 'POST', body: data }); await loadDashboard(); renderApp(); } catch (error) { message.textContent = error.message; } });
  });
  const detailHeading = page.querySelector('.page-title');
  detailHeading.classList.add('detail-heading');
  if (state.returnToAttention) {
    const label = state.attentionType === 'delay' ? 'Kembali ke shipment terlambat' : 'Kembali ke shipment evaluasi';
    const backButton = document.createElement('button'); backButton.className = 'secondary detail-return'; backButton.type = 'button'; backButton.textContent = `← ${label}`;
    detailHeading.appendChild(backButton);
    backButton.addEventListener('click', () => { state.returnToAttention = false; state.view = 'attention'; renderApp(); });
  }
  if (state.returnToDashboard) {
    const backButton = document.createElement('button'); backButton.className = 'secondary detail-return'; backButton.type = 'button'; backButton.textContent = '← Kembali ke dashboard';
    detailHeading.appendChild(backButton);
    backButton.addEventListener('click', () => { state.returnToDashboard = false; state.view = 'overview'; renderApp(); });
  }
  if (state.returnToShipments) {
    const backButton = document.createElement('button'); backButton.className = 'secondary detail-return'; backButton.type = 'button'; backButton.textContent = '← Kembali ke Data Shipment';
    detailHeading.appendChild(backButton);
    backButton.addEventListener('click', () => { state.returnToShipments = false; state.view = 'shipments'; renderApp(); });
  }
  const addDelayButton = page.querySelector('.add-delay');
  if (addDelayButton) {
    detailHeading.appendChild(addDelayButton);
    addDelayButton.addEventListener('click', () => { state.view = 'delays'; renderApp(); });
  }
  return page;
}

function analysis() {
  const { delays, delayFactors } = state.dashboard;
  const totalBy = (key, choices) => choices.map((label) => ({ label, value: delays.filter((item) => item[key] === label).length })).filter((item) => item.value);
  const byFactor = totalBy('factor', delayFactors);
  const stages = [...new Set(delays.map((item) => item.processStage))];
  const byStage = totalBy('processStage', stages);
  const page = document.createElement('div');
  page.innerHTML = `<section class="page-title"><p class="eyebrow">ANALISIS KENDALA</p><h1>Pola kendala pengiriman</h1><p>Distribusi hanya dihitung dari kendala yang benar-benar telah dicatat di sistem.</p></section><section class="analysis-summary"><article><strong>${delays.length}</strong><span>kendala tercatat</span></article><article><strong>${byFactor[0]?.label || '—'}</strong><span>faktor paling sering</span></article><article><strong>${byStage[0]?.label || '—'}</strong><span>tahap paling terdampak</span></article></section><section class="dashboard-grid">${byFactor.length ? barList('Frekuensi kendala per kriteria', 'Dasar evaluasi operasional, bukan bobot AHP', byFactor) : '<section class="panel empty">Belum ada data kendala untuk dianalisis.</section>'}${byStage.length ? barList('Kendala per tahapan proses', 'Menunjukkan lokasi proses yang perlu ditinjau', byStage) : '<section class="panel empty">Belum ada tahap proses yang tercatat.</section>'}</section>`;
  return page;
}

function recommendations() {
  const actions = { 'Dokumen Kepabeanan': 'Perkuat kontrol kelengkapan dan verifikasi dokumen sebelum pengiriman.', 'Koordinasi dan Komunikasi': 'Tegakkan koordinasi dan pembaruan informasi dengan shipping line, terminal, serta pihak terkait.', 'Pelabuhan dan Terminal': 'Pantau antrean dan kapasitas terminal serta antisipasi keterlambatan.', 'Kapal dan Jadwal Pelayaran': 'Pantau perubahan jadwal kapal dan siapkan opsi carrier atau jadwal alternatif.', 'Peralatan dan Armada': 'Buat jadwal kesiapan armada dan pemeliharaan preventif.', 'Kesiapan Barang': 'Konfirmasi kesiapan barang sebelum booking dan batas waktu cut-off.', 'Sumber Daya Manusia': 'Perkuat pelatihan SOP dan pembagian beban kerja.', 'Proses Operasional': 'Tinjau SOP pada titik proses yang berulang mengalami kendala.', 'Kondisi Cuaca dan Lingkungan': 'Gunakan buffer waktu dan komunikasi proaktif untuk mitigasi risiko eksternal.' };
  const owners = { 'Dokumen Kepabeanan': 'Tim Dokumen', 'Koordinasi dan Komunikasi': 'Operasional', 'Pelabuhan dan Terminal': 'Operasional', 'Kapal dan Jadwal Pelayaran': 'Operasional', 'Peralatan dan Armada': 'Operasional', 'Kesiapan Barang': 'Customer Service', 'Sumber Daya Manusia': 'Manajer Operasional', 'Proses Operasional': 'Operasional', 'Kondisi Cuaca dan Lingkungan': 'Operasional' };
  const progress = [['Belum Dimulai', 'not-started'], ['Dalam Proses', 'in-progress'], ['Selesai', 'complete']];
  const ranked = state.dashboard.ahp.filter((item) => item.weight !== null && item.weight !== undefined).sort((a, b) => b.weight - a.weight);
  // Rekomendasi hanya boleh muncul dari bobot AHP yang telah disimpan.
  // Data kendala tetap menjadi bahan analisis, bukan pengganti hasil AHP.
  const candidates = ranked.slice(0, 3);
  const page = document.createElement('div');
  page.innerHTML = `<section class="recommendation-heading"><div><p class="eyebrow">INS SEATRACK · TINDAK LANJUT</p><h1>Rekomendasi Perbaikan</h1><p>Tindak lanjut berdasarkan prioritas AHP.</p></div><span class="recommendation-count">${candidates.length} prioritas utama</span></section><section class="panel recommendation-table-panel">${candidates.length ? `<div class="recommendation-table-wrap"><table class="recommendation-table"><thead><tr><th>No.</th><th>Kriteria prioritas</th><th>Rekomendasi tindakan</th><th>Penanggung jawab</th><th>Status</th></tr></thead><tbody>${candidates.map((item, index) => { const [label, tone] = progress[index] || progress[0]; return `<tr><td><b class="recommendation-rank">${index + 1}</b></td><td><strong>${escapeHTML(item.factor)}</strong><small>Bobot ${item.weight !== undefined ? Number(item.weight).toFixed(3).replace('.', ',') : 'belum tersedia'}</small></td><td>${escapeHTML(actions[item.factor])}</td><td>${escapeHTML(owners[item.factor] || 'Operasional')}</td><td><span class="recommendation-status ${tone}">${label}</span></td></tr>`; }).join('')}</tbody></table></div><p class="recommendation-footnote">Urutan rekomendasi mengikuti bobot AHP yang tersimpan. Status tindak lanjut dapat menjadi dasar evaluasi manajerial berikutnya.</p>` : '<div class="empty">Masukkan hasil AHP untuk menampilkan rekomendasi perbaikan.</div>'}</section>`;
  if (candidates.length) {
    page.querySelector('.recommendation-table thead tr').insertAdjacentHTML('beforeend', '<th>Aksi</th>');
    const savedActions = state.dashboard.recommendationActions || {};
    page.querySelectorAll('.recommendation-table tbody tr').forEach((row, index) => { const item = candidates[index]; const saved = savedActions[item.factor] || {}; const defaultProgress = progress[index] || progress[0]; const status = saved.status || defaultProgress[0]; const tone = status === 'Selesai' ? 'complete' : status === 'Dalam Proses' ? 'in-progress' : 'not-started'; row.children[3].innerHTML = `<strong>${escapeHTML(saved.owner || owners[item.factor] || 'Operasional')}</strong>${saved.targetDate ? `<small>Target: ${escapeHTML(saved.targetDate)}</small>` : ''}`; row.children[4].innerHTML = `<span class="recommendation-status ${tone}">${escapeHTML(status)}</span>${saved.note ? `<small class="recommendation-note">${escapeHTML(saved.note)}</small>` : ''}`; row.insertAdjacentHTML('beforeend', `<td><button class="recommendation-edit" data-factor="${escapeHTML(item.factor)}">Update</button></td>`); });
    if (!canManage()) page.querySelectorAll('.recommendation-edit').forEach((button) => button.remove());
    page.querySelectorAll('.recommendation-edit').forEach((button) => {
      button.addEventListener('click', () => {
        const factor = button.dataset.factor;
        const saved = savedActions[factor] || {};
        const modal = document.createElement('div');
        modal.className = 'recommendation-modal';
        modal.innerHTML = `<section class="recommendation-editor" role="dialog" aria-modal="true"><button class="close-recommendation" type="button" aria-label="Tutup">×</button><p class="eyebrow">TINDAK LANJUT REKOMENDASI</p><h2>${escapeHTML(factor)}</h2><p>${escapeHTML(actions[factor])}</p><form><label>PIC / Penanggung jawab<input name="owner" value="${escapeHTML(saved.owner || owners[factor] || 'Operasional')}" required></label><label>Status<select name="status"><option ${saved.status === 'Belum Dimulai' ? 'selected' : ''}>Belum Dimulai</option><option ${saved.status === 'Dalam Proses' ? 'selected' : ''}>Dalam Proses</option><option ${saved.status === 'Selesai' ? 'selected' : ''}>Selesai</option></select></label><label>Target selesai<input name="targetDate" type="date" value="${escapeHTML(saved.targetDate || '')}"></label><label>Tanggal selesai<input name="completedDate" type="date" value="${escapeHTML(saved.completedDate || '')}"></label><label class="full">Catatan tindak lanjut<textarea name="note" maxlength="1000" placeholder="Perkembangan atau tindakan yang telah dilakukan">${escapeHTML(saved.note || '')}</textarea></label><button class="primary" type="submit">Simpan tindak lanjut</button><p class="form-message"></p></form></section>`;
        page.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelector('.close-recommendation').addEventListener('click', close);
        modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
        modal.querySelector('form').addEventListener('submit', async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const message = form.querySelector('.form-message');
          try {
            const endpoint = '/api/recommendations/' + encodeURIComponent(factor);
            await request(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
            await loadDashboard();
            renderApp();
          } catch (error) {
            message.textContent = error.message;
          }
        });
      });
    });
  }
  return page;
}

function settings() {
  const page = document.createElement('div');
  page.innerHTML = `<section class="page-title"><p class="eyebrow">AKUN SAYA</p><h1>Pengaturan Akun</h1><p>Kelola keamanan akun yang sedang digunakan.</p></section><section class="account-settings"><section class="panel setting-card"><p class="eyebrow">AKUN AKTIF</p><h2>${escapeHTML(state.user.name)}</h2><p>${escapeHTML(state.user.email)} · ${escapeHTML(state.user.role)}</p><span>Hak akses akun dikelola oleh administrator.</span></section><form class="panel setting-card password-form"><p class="eyebrow">KEAMANAN</p><h2>Ganti password</h2><label>Password saat ini<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>Password baru<input name="newPassword" type="password" autocomplete="new-password" minlength="8" required></label><label>Konfirmasi password baru<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label><button class="primary" type="submit">Simpan password baru</button><p class="form-message" role="alert"></p></form></section>`;
  page.querySelector('.password-form').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const message = form.querySelector('.form-message'); if (values.newPassword !== values.confirmPassword) { message.textContent = 'Konfirmasi password baru belum sama.'; return; } try { const result = await request('/api/account/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); message.textContent = result.message; form.reset(); } catch (error) { message.textContent = error.message; } });
  return page;
}

function buildShipmentDirectory(page) {
  if (state.view !== 'shipments') return;
  const shipments = state.dashboard.shipments;
  const routes = [...new Set(shipments.map((item) => `${item.origin} → ${item.destination}`))].sort();
  const form = (item = {}, isNew = true) => `<section class="panel shipment-editor"><div class="panel-title"><div><p class="eyebrow">${isNew ? 'TAMBAH SHIPMENT' : 'EDIT SHIPMENT'}</p><h2>${isNew ? 'Data shipment baru' : escapeHTML(item.shipmentNo)}</h2></div><button class="close-editor" type="button">×</button></div><form data-id="${item.id || ''}" data-new="${isNew}"><div class="shipment-form-grid"><label>Shipment ID<input name="shipmentNo" value="${escapeHTML(item.shipmentNo || '')}" required></label><label>Customer / Shipper<input name="shipper" value="${escapeHTML(item.shipper || '')}" required></label><label>Origin<input name="origin" value="${escapeHTML(item.origin || '')}" required></label><label>Destination<input name="destination" value="${escapeHTML(item.destination || '')}" required></label><label>ETD<input type="date" name="etd" value="${escapeHTML(item.etd || '')}" required></label><label>ETA<input type="date" name="eta" value="${escapeHTML(item.eta || '')}" required></label><label>Actual arrival<input type="date" name="actualArrival" value="${escapeHTML(item.actualArrival || '')}"></label><label>Status<select name="status"><option ${item.status === 'Belum dievaluasi' ? 'selected' : ''}>Belum dievaluasi</option><option ${item.status === 'On Time' ? 'selected' : ''}>On Time</option><option ${item.status === 'Delay' ? 'selected' : ''}>Delay</option></select></label><label>Jenis layanan<select name="productService"><option ${item.productService === 'LCL' ? 'selected' : ''}>LCL</option><option ${item.productService === 'FCL' ? 'selected' : ''}>FCL</option></select></label><label>Arus shipment<select name="shipmentType"><option ${item.shipmentType === 'OE' ? 'selected' : ''}>OE</option><option ${item.shipmentType === 'OI' ? 'selected' : ''}>OI</option></select></label></div><div class="editor-actions"><button class="primary" type="submit">${isNew ? 'Simpan shipment' : 'Simpan perubahan'}</button><p class="form-message"></p></div></form></section>`;
  page.innerHTML = `<section class="shipment-heading"><div><p class="eyebrow">DATA OPERASIONAL</p><h1>Data Shipment</h1><p>Daftar pengiriman laut yang dapat ditinjau, ditambah, dan diperbarui.</p></div><button class="primary add-shipment">+ Tambah shipment</button></section><section class="shipment-controls"><label>Rute<select class="route-filter"><option>Semua rute</option>${routes.map((route) => `<option>${escapeHTML(route)}</option>`).join('')}</select></label><label class="shipment-search">⌕ <input placeholder="Cari Shipment ID atau Customer…"></label></section><section class="panel shipment-list"><div class="shipment-table-wrap"><table><thead><tr><th>No.</th><th>Shipment ID</th><th>Customer</th><th>Rute</th><th>ETD</th><th>ETA</th><th>Actual arrival</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${shipments.map((item, index) => `<tr data-id="${item.id}" data-route="${escapeHTML(item.origin)} → ${escapeHTML(item.destination)}"><td>${index + 1}</td><td><strong>${escapeHTML(item.shipmentNo)}</strong><small>${escapeHTML(item.productService)} · ${escapeHTML(item.shipmentType)}</small></td><td>${escapeHTML(item.shipper)}</td><td>${escapeHTML(item.origin)} → ${escapeHTML(item.destination)}</td><td>${escapeHTML(item.etd || '-')}</td><td>${escapeHTML(item.eta || '-')}</td><td>${escapeHTML(item.actualArrival || '-')}</td><td><span class="status ${item.status === 'Delay' ? 'delay' : item.status === 'On Time' ? 'on-time' : 'pending'}">${escapeHTML(item.status)}</span></td><td><button class="table-edit" data-edit="${item.id}" title="Edit shipment">Edit</button></td></tr>`).join('')}</tbody></table></div></section><div class="editor-host"></div>`;
  const processHeader = document.createElement('th'); processHeader.textContent = 'Proses pengiriman';
  const headers = page.querySelector('thead tr'); headers.insertBefore(processHeader, headers.children[7]);
  page.querySelectorAll('tbody tr').forEach((row, index) => { const history = state.dashboard.shipmentProcesses?.[String(shipments[index].id)] || []; const current = history.at(-1)?.status; const cell = document.createElement('td'); cell.innerHTML = `<span class="process-status ${current ? 'started' : 'waiting'}">${escapeHTML(current ? shipmentProcessLabels[current] : 'Belum dimulai')}</span>`; row.insertBefore(cell, row.children[7]); });
  page.querySelector('.shipment-controls').insertAdjacentHTML('afterbegin', `<label>Proses<select class="process-filter"><option value="">Semua proses</option><option value="waiting">Belum dimulai</option>${Object.entries(shipmentProcessLabels).map(([code, label]) => `<option value="${code}">${escapeHTML(label)}</option>`).join('')}</select></label>`);
  const rows = [...page.querySelectorAll('tbody tr')];
  const pager = document.createElement('nav'); pager.className = 'shipment-pagination';
  const pageSize = 10; let currentPage = 1; const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const showPage = (number) => { currentPage = Math.min(Math.max(number, 1), pageCount); rows.forEach((row, index) => { row.hidden = index < (currentPage - 1) * pageSize || index >= currentPage * pageSize; }); const firstVisible = Math.min(Math.max(currentPage - 1, 1), Math.max(1, pageCount - 2)); const visiblePages = Array.from({ length: Math.min(3, pageCount) }, (_, index) => firstVisible + index); pager.innerHTML = `<span>${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, rows.length)} dari ${rows.length} shipment</span><button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>${visiblePages.map((number) => `<button class="${number === currentPage ? 'active' : ''}" data-page="${number}">${number}</button>`).join('')}<button ${currentPage === pageCount ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`; pager.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => showPage(Number(button.dataset.page)))); };
  page.querySelector('.shipment-list').insertAdjacentElement('afterend', pager); showPage(1);
  const host = page.querySelector('.editor-host');
  const openEditor = (item, isNew) => { host.innerHTML = form(item, isNew); const editor = host.querySelector('.shipment-editor'); editor.querySelector('[name="etd"]').value = dateInputValue(item.etd); editor.querySelector('[name="eta"]').value = dateInputValue(item.eta); editor.querySelector('[name="actualArrival"]').value = dateInputValue(item.actualArrival); const eta = editor.querySelector('[name="eta"]'); const actual = editor.querySelector('[name="actualArrival"]'); const status = editor.querySelector('[name="status"]'); const statusNote = document.createElement('small'); statusNote.className = 'status-calculation'; status.parentElement.append(statusNote); const syncStatus = () => { if (!eta.value || !actual.value) { status.disabled = false; statusNote.textContent = 'Isi actual arrival untuk menghitung status otomatis.'; return; } const days = Math.round((new Date(`${actual.value}T00:00:00`) - new Date(`${eta.value}T00:00:00`)) / 86400000); status.value = days >= 1 ? 'Delay' : 'On Time'; status.disabled = true; statusNote.textContent = days >= 1 ? `Status otomatis: Delay (${days} hari setelah ETA).` : 'Status otomatis: On Time (tiba sesuai atau sebelum ETA).'; }; eta.addEventListener('change', syncStatus); actual.addEventListener('change', syncStatus); syncStatus(); const close = () => host.replaceChildren(); editor.querySelector('.close-editor').addEventListener('click', close); host.addEventListener('click', (event) => { if (event.target === host) close(); }); editor.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); const target = event.currentTarget; const data = Object.fromEntries(new FormData(target)); if (status.disabled) data.status = status.value; const message = target.querySelector('.form-message'); try { await request(target.dataset.new === 'true' ? '/api/shipments' : `/api/shipments/${target.dataset.id}`, { method: target.dataset.new === 'true' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); await loadDashboard(); renderApp(); } catch (error) { message.textContent = error.message; } }); };
  if (!canOperate()) page.querySelector('.add-shipment')?.remove();
  page.querySelector('.add-shipment')?.addEventListener('click', () => openEditor({}, true));
  page.querySelectorAll('[data-edit]').forEach((button) => { button.insertAdjacentHTML('afterend', `<button class="table-detail" data-detail="${button.dataset.edit}" title="Lihat detail shipment">Detail</button>`); button.addEventListener('click', () => openEditor(shipments.find((item) => item.id === Number(button.dataset.edit)), false)); });
  page.querySelectorAll('[data-detail]').forEach((button) => button.addEventListener('click', () => { state.selectedShipmentId = Number(button.dataset.detail); state.returnToAttention = false; state.returnToDashboard = false; state.returnToShipments = true; state.view = 'detail'; renderApp(); }));
  if (!canOperate()) page.querySelectorAll('[data-edit]').forEach((button) => button.remove());
  if (canOperate()) {
    page.querySelectorAll('[data-edit]').forEach((button) => button.insertAdjacentHTML('afterend', `<button class="table-edit table-delete" data-delete="${button.dataset.edit}" title="Hapus shipment">Hapus</button>`));
    page.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => {
      const shipment = shipments.find((item) => item.id === Number(button.dataset.delete));
      if (!shipment || !window.confirm(`Hapus shipment ${shipment.shipmentNo}? Data riwayat proses dan kendala terkait juga akan dihapus.`)) return;
      request(`/api/shipments/${shipment.id}`, { method: 'DELETE' }).then(loadDashboard).then(renderApp).catch((error) => window.alert(error.message));
    }));
  }
  if (state.editShipmentId) { const editItem = shipments.find((item) => item.id === Number(state.editShipmentId)); state.editShipmentId = ''; if (editItem) openEditor(editItem, false); }
  page.querySelector('.shipment-search input').addEventListener('input', (event) => { const query = event.target.value.toLowerCase(); page.querySelectorAll('tbody tr').forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); }); });
  page.querySelector('.route-filter').addEventListener('change', (event) => { page.querySelectorAll('tbody tr').forEach((row) => { row.hidden = event.target.value !== 'Semua rute' && row.dataset.route !== event.target.value; }); });
  page.querySelector('.process-filter').addEventListener('change', (event) => { const value = event.target.value; page.querySelectorAll('tbody tr').forEach((row, index) => { const history = state.dashboard.shipmentProcesses?.[String(shipments[index].id)] || []; const current = history.at(-1)?.status; row.hidden = Boolean(value) && (value === 'waiting' ? Boolean(current) : current !== value); }); });
}

function reports() {
  const { shipments, delays, delayFactors } = state.dashboard;
  const total = shipments.length, onTime = shipments.filter((item) => item.status === 'On Time').length, delayed = shipments.filter((item) => item.status === 'Delay').length;
  const evaluated = onTime + delayed, pending = total - evaluated;
  const delayDays = shipments.map((item) => item.delayDays).filter((item) => typeof item === 'number' && item > 0);
  const average = delayDays.length ? `${(delayDays.reduce((sum, value) => sum + value, 0) / delayDays.length).toFixed(1).replace('.', ',')} hari` : '—';
  const factors = delayFactors.map((label) => ({ label, value: delays.filter((item) => item.factor === label).length })).filter((item) => item.value).sort((a, b) => b.value - a.value).slice(0, 3);
  const maximum = Math.max(...factors.map((item) => item.value), 1);
  const pct = (value) => evaluated ? ` (${Math.round(value / evaluated * 100)}%)` : '';
  const page = document.createElement('div');
  page.innerHTML = `<section class="report-heading"><div><p class="eyebrow">INS SEATRACK · REKAP OPERASIONAL</p><h1>Laporan</h1><p>Rekapitulasi pengiriman dan kendala.</p></div></section><section class="report-controls"><label>Jenis laporan<select name="reportType"><option>Kinerja Pengiriman</option><option>Analisis Kendala</option><option>Prioritas AHP</option></select></label><label>Periode<select name="period"><option>Seluruh periode data</option><option>Tahun berjalan</option></select></label><button class="primary download-report" type="button">⇩ Download PDF</button></section><section class="report-template-grid"><section class="panel report-summary-card"><h2>Ringkasan Laporan</h2><dl><div><dt>Total shipment</dt><dd>${formatNumber.format(total)}</dd></div><div><dt>On time</dt><dd>${formatNumber.format(onTime)}${pct(onTime)}</dd></div><div><dt>Delay</dt><dd>${formatNumber.format(delayed)}${pct(delayed)}</dd></div><div><dt>Belum dievaluasi</dt><dd>${formatNumber.format(pending)}</dd></div><div><dt>Rata-rata delay</dt><dd>${average}</dd></div></dl><p class="report-data-note">Persentase On Time dan Delay dihitung dari ${formatNumber.format(evaluated)} shipment yang telah dievaluasi.</p></section><section class="panel report-top-factors"><div class="panel-title"><div><h2>Top 3 Kriteria Kendala</h2><p>Berdasarkan kendala yang tercatat pada sistem.</p></div></div><div class="report-bars">${factors.length ? factors.map((item) => `<div><span>${escapeHTML(item.label)}</span><i><b style="width:${item.value / maximum * 100}%"></b></i><strong>${item.value}</strong></div>`).join('') : '<p class="empty">Belum ada kendala yang tercatat.</p>'}</div></section></section>`;
  const processSummary = shipments.reduce((summary, shipment) => { const status = state.dashboard.shipmentProcesses?.[String(shipment.id)]?.at(-1)?.status; if (status === 'DELIVERED') summary.completed += 1; else if (status) summary.active += 1; else summary.waiting += 1; return summary; }, { completed: 0, active: 0, waiting: 0 });
  const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  page.querySelector('.report-heading').insertAdjacentHTML('beforeend', `<section class="print-report-meta"><div><b>PT Intisarana Persada</b><span>INS SeaTrack · Laporan Kinerja Pengiriman</span></div><div><b>Periode</b><span>Seluruh periode data</span></div><div><b>Dicetak</b><span>${printedAt}</span></div></section><section class="print-process-summary"><div><span>Selesai proses</span><b>${processSummary.completed}</b></div><div><span>Sedang diproses</span><b>${processSummary.active}</b></div><div><span>Belum dimulai</span><b>${processSummary.waiting}</b></div></section>`);
  page.querySelector('.download-report').addEventListener('click', () => window.print());
  return page;
}
function attachShipmentStatus(page) {
  const shipments = state.dashboard.shipments;
  const panel = document.createElement('section');
  panel.className = 'panel data-entry';
  panel.innerHTML = `<div class="panel-title"><div><p class="eyebrow">INPUT DATA TAMBAHAN</p><h2>Update status shipment</h2><p>Isi actual arrival dan status setelah informasi operasional tersedia.</p></div></div><form class="status-entry"><label>Shipment<select name="shipmentId" required><option value="">Pilih shipment</option>${shipments.map((item) => `<option value="${item.id}">${escapeHTML(item.shipmentNo)} · ${escapeHTML(item.origin)} → ${escapeHTML(item.destination)}</option>`).join('')}</select></label><label>Actual arrival<input name="actualArrival" type="date"></label><label>Status<select name="status"><option>Belum dievaluasi</option><option>On Time</option><option>Delay</option></select></label><label class="entry-note">Catatan status<input name="statusNote" maxlength="1000" placeholder="Opsional"></label><button class="primary" type="submit">Simpan status</button><p class="form-message" role="alert"></p></form>`;
  page.appendChild(panel);
  const form = panel.querySelector('form');
  form.addEventListener('submit', async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); const message = form.querySelector('.form-message'); try { await request(`/api/shipments/${values.shipmentId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); await loadDashboard(); message.textContent = 'Status shipment berhasil disimpan.'; } catch (error) { message.textContent = error.message; } });
}

function attachAHPEntry(page) {
  const trigger = page.querySelector('.ahp-edit-button');
  const modal = document.createElement('div');
  modal.className = 'shipment-modal ahp-entry-modal';
  modal.hidden = true;
  modal.innerHTML = `<section class="shipment-editor ahp-editor" role="dialog" aria-modal="true" aria-labelledby="ahp-editor-title"><button class="close-editor" type="button" aria-label="Tutup">×</button><div class="panel-title"><div><p class="eyebrow">INPUT HASIL PENELITIAN</p><h2 id="ahp-editor-title">${state.dashboard.ahp.some((item) => typeof item.weight === 'number') ? 'Edit bobot AHP' : 'Input hasil AHP'}</h2><p>Masukkan bobot akhir dari pengolahan AHP. Total seluruh bobot harus sama dengan 1.</p></div></div><form><div class="weight-grid">${state.dashboard.ahp.map((item) => `<label>${escapeHTML(item.factor)}<input name="${escapeHTML(item.factor)}" type="number" min="0" max="1" step="0.0001" value="${item.weight ?? ''}" required></label>`).join('')}</div><div class="ahp-footer"><label>Consistency Ratio (CR)<input name="consistencyRatio" type="number" min="0" max="1" step="0.0001" value="${state.dashboard.consistencyRatio ?? ''}" required></label><button class="primary" type="submit">Simpan perubahan</button><p class="form-message" role="alert"></p></div></form></section>`;
  page.appendChild(modal);
  const close = () => { modal.hidden = true; };
  trigger.addEventListener('click', () => { modal.hidden = false; modal.querySelector('input')?.focus(); });
  modal.querySelector('.close-editor').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  const form = modal.querySelector('form');
  form.addEventListener('submit', async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); const ratio = values.consistencyRatio; delete values.consistencyRatio; const message = form.querySelector('.form-message'); try { await request('/api/ahp', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weights: values, consistencyRatio: ratio }) }); await loadDashboard(); close(); renderApp(); } catch (error) { message.textContent = error.message; } });
}

function attachAHPEntry(page) {
  const trigger = page.querySelector('.ahp-edit-button');
  if (!trigger || !canManage()) return;
  const modal = document.createElement('div');
  modal.className = 'shipment-modal ahp-entry-modal'; modal.hidden = true;
  modal.innerHTML = `<section class="shipment-editor ahp-editor" role="dialog" aria-modal="true"><button class="close-editor" type="button" aria-label="Tutup">×</button><div class="panel-title"><div><p class="eyebrow">HASIL PENELITIAN AHP</p><h2>Edit bobot AHP</h2><p>Masukkan hasil perhitungan final dan sumbernya. Total bobot harus sama dengan 1.</p></div></div><form><div class="weight-grid">${state.dashboard.ahp.map((item) => `<label>${escapeHTML(item.factor)}<input name="${escapeHTML(item.factor)}" type="number" min="0" max="1" step="0.0001" value="${item.weight ?? ''}" required></label>`).join('')}</div><div class="ahp-footer"><label class="full">Sumber hasil AHP<input name="source" maxlength="200" value="${escapeHTML(state.dashboard.ahpMeta?.source || 'Hasil perhitungan AHP penelitian')}" required></label><label>Periode penelitian<input name="period" maxlength="100" value="${escapeHTML(state.dashboard.ahpMeta?.period || '')}"></label><label>Consistency Ratio (CR)<input name="consistencyRatio" type="number" min="0" max="1" step="0.0001" value="${state.dashboard.consistencyRatio ?? ''}" required></label><button class="primary" type="submit">Simpan hasil AHP</button><p class="form-message" role="alert"></p></div></form></section>`;
  page.appendChild(modal);
  const close = () => { modal.hidden = true; };
  trigger.addEventListener('click', () => { modal.hidden = false; modal.querySelector('input')?.focus(); });
  modal.querySelector('.close-editor').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  modal.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    const { consistencyRatio, source, period, ...weights } = values;
    const message = event.currentTarget.querySelector('.form-message');
    try { await request('/api/ahp', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weights, consistencyRatio, source, period }) }); await loadDashboard(); close(); renderApp(); }
    catch (error) { message.textContent = error.message; }
  });
}

function addResearchContext(page) {
  if (state.view === 'overview') {
    page.querySelector('.kpis')?.insertAdjacentHTML('beforebegin', `<section class="research-brief"><div><p class="eyebrow">KONTEKS PENELITIAN 2025</p><h2>39% shipment mengalami keterlambatan.</h2><p>Baseline skripsi mencatat 55 dari 140 shipment laut mengalami delay. Ini konteks penelitian, bukan status live dari file Excel saat ini.</p></div><div class="baseline-stat"><strong>55</strong><span>shipment delay</span></div><div class="baseline-stat"><strong>85</strong><span>shipment on time</span></div><div class="baseline-stat"><strong>9</strong><span>kriteria AHP</span></div></section>`);
    const flow = page.querySelector('.monitoring-flow');
    if (flow) { flow.querySelector('h2').textContent = 'Data kejadian menjadi dasar prioritas perbaikan.'; flow.querySelector('p:not(.eyebrow)').textContent = 'Sistem ini mencatat bukti operasional; ranking AHP hanya aktif sesudah penilaian responden diproses dan lolos uji konsistensi.'; flow.querySelector('.flow-note').innerHTML = '<strong>Batas delay penelitian:</strong> actual arrival melewati ETA atau jadwal booking sedikitnya satu hari kalender.'; }
  }
  if (state.view === 'shipments') {
    const header = page.querySelector('thead tr');
    header?.insertAdjacentHTML('beforeend', '<th>Actual arrival</th><th>Hari delay</th>');
    page.querySelectorAll('tbody tr').forEach((row, index) => {
      const item = state.dashboard.shipments[index];
      row.insertAdjacentHTML('beforeend', `<td>${escapeHTML(item.actualArrival || 'Belum ada')}</td><td>${item.delayDays === null || item.delayDays === undefined ? '—' : `${item.delayDays} hari`}</td>`);
    });
    const statusHelp = page.querySelector('.data-entry .panel-title p:last-child');
    if (statusHelp) statusHelp.textContent = 'Saat actual arrival diisi, sistem otomatis menghitung hari delay dan menentukan status berdasarkan ETA.';
  }
  if (state.view === 'delays') {
    const factorField = page.querySelector('select[name="factor"]')?.closest('.field');
    factorField?.insertAdjacentHTML('afterend', '<div class="field"><label>Sifat kendala<select name="controllability" required><option value="">Pilih sifat kendala</option><option>Controllable</option><option>Sebagian controllable</option><option>Uncontrollable</option></select></label></div>');
    page.querySelector('.factor-guide')?.insertAdjacentHTML('beforeend', '<p class="factor-note"><strong>Controllable:</strong> dapat diperbaiki internal. <strong>Uncontrollable:</strong> perlu mitigasi, buffer waktu, dan komunikasi proaktif.</p>');
  }
  if (state.view === 'ahp') {
    const hasResult = state.dashboard.ahp.some((item) => item.weight !== null && item.weight !== undefined);
    page.querySelector('.page-title p:last-child').textContent = 'Tujuannya menentukan urutan faktor yang perlu ditangani, bukan membuktikan sebab-akibat secara statistik.';
    page.querySelector('.ahp-intro').insertAdjacentHTML('beforebegin', `<section class="ahp-method"><div><p class="eyebrow">METODE SKRIPSI</p><h2>9 kriteria · 36 perbandingan · 10 responden</h2><p>Responden membandingkan pasangan faktor pada skala Saaty 1–9. Penilaian konsisten digabungkan dengan rata-rata geometrik sebelum bobot dihitung.</p></div><div><strong>CR ≤ 0,10</strong><span>syarat hasil dapat dipakai</span></div></section>`);
    const intro = page.querySelector('.ahp-intro');
    intro.querySelector('strong').textContent = hasResult ? 'Hasil AHP telah tersedia.' : 'Belum ada bobot AHP final pada file sumber.';
    intro.querySelector('span').textContent = hasResult ? 'Ranking ditampilkan dari rekap yang disimpan. Tinjau kembali jika CR melebihi 0,10.' : 'Selesaikan kuesioner dan pengolahan 36 perbandingan per responden, lalu masukkan bobot akhir serta CR di bawah.';
    const title = page.querySelector('.ahp-table .panel-title');
    title.querySelector('h2').textContent = hasResult ? 'Ranking prioritas' : 'Daftar kriteria';
    title.querySelector('p').textContent = hasResult ? 'Bobot di atas 0,111 termasuk prioritas tinggi menurut ambang rata-rata sembilan kriteria.' : 'Urutan di bawah adalah kode kriteria, belum merupakan ranking hasil AHP.';
    title.querySelector('.pill').textContent = `CR: ${state.dashboard.consistencyRatio ?? 'belum tersedia'}`;
    if (hasResult) page.querySelectorAll('.ahp-row').forEach((row, index) => { const item = state.dashboard.ahp[index]; row.querySelector('span').textContent = item.weight > 0.111 ? 'Prioritas tinggi' : 'Menengah–rendah'; row.querySelector('i').textContent = Number(item.weight).toFixed(4); });
  }
}

function syncWorkflow(page) {
  if (state.view !== 'overview') return;
  const flow = page.querySelector('.monitoring-flow');
  if (!flow) return;
  flow.classList.add('workflow-final');
  flow.querySelector('h2').textContent = 'Alur kerja operasional hingga keputusan manajerial.';
  flow.querySelector('p:not(.eyebrow)').textContent = 'Mulai dari data shipment yang tervalidasi, bukan dari asumsi status atau ranking prioritas.';
  flow.querySelector('.flow-steps').innerHTML = '<button class="flow-step" data-flow-view="shipments"><b>01. Validasi shipment</b><span>ETA dan actual arrival</span></button><button class="flow-step" data-flow-view="detail"><b>02. Verifikasi status</b><span>On time atau delay</span></button><button class="flow-step" data-flow-view="delays"><b>03. Catat kendala</b><span>Faktor dan tindakan awal</span></button><button class="flow-step" data-flow-view="analysis"><b>04. Analisis pola</b><span>Frekuensi dan tahap proses</span></button><button class="flow-step" data-flow-view="ahp"><b>05. AHP periodik</b><span>Kuesioner dan CR</span></button><button class="flow-step" data-flow-view="recommendations"><b>06. Tindak lanjut</b><span>PIC dan rekomendasi</span></button><button class="flow-step" data-flow-view="reports"><b>07. Laporan manager</b><span>Evaluasi dan keputusan</span></button>';
  flow.querySelector('.flow-note').innerHTML = '<strong>Batas delay penelitian:</strong> actual arrival melewati ETA atau jadwal booking sedikitnya satu hari kalender. AHP dilakukan periodik setelah kuesioner responden diolah.';
  flow.querySelectorAll('[data-flow-view]').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.flowView; renderApp(); }));
}

function buildCleanDashboard(page) {
  if (state.view !== 'overview') return;
  const all = state.dashboard.shipments;
  const routes = [...new Set(all.map((item) => `${item.origin} → ${item.destination}`))].sort();
  const shipments = all.filter((item) => (dashboardFilters.route === 'Semua rute' || `${item.origin} → ${item.destination}` === dashboardFilters.route) && (dashboardFilters.status === 'Semua status' || item.status === dashboardFilters.status));
  const ids = new Set(shipments.map((item) => item.id));
  const delays = state.dashboard.delays.filter((item) => ids.has(item.shipmentId));
  const onTime = shipments.filter((item) => item.status === 'On Time').length;
  const delayed = shipments.filter((item) => item.status === 'Delay').length;
  const pending = shipments.length - onTime - delayed;
  const delayDays = shipments.map((item) => item.delayDays).filter((item) => typeof item === 'number');
  const average = delayDays.length ? `${(delayDays.reduce((sum, value) => sum + value, 0) / delayDays.length).toFixed(1).replace('.', ',')} hari` : '—';
  const onPct = shipments.length ? onTime / shipments.length * 100 : 0;
  const delayPct = shipments.length ? delayed / shipments.length * 100 : 0;
  const factorRows = state.dashboard.delayFactors.map((label) => ({ label, value: delays.filter((item) => item.factor === label).length })).filter((item) => item.value);
  const maxFactor = Math.max(...factorRows.map((item) => item.value), 1);
  page.innerHTML = `<section class="clean-heading"><div><p class="eyebrow">INS SEATRACK</p><h1>Dashboard</h1><p>Monitoring pengiriman laut dan prioritas penanganan keterlambatan.</p></div><span>Data aktif</span></section><section class="dashboard-filter"><label>Rute<select name="route"><option>Semua rute</option>${routes.map((route) => `<option ${route === dashboardFilters.route ? 'selected' : ''}>${escapeHTML(route)}</option>`).join('')}</select></label><label>Status shipment<select name="status"><option>Semua status</option><option ${dashboardFilters.status === 'On Time' ? 'selected' : ''}>On Time</option><option ${dashboardFilters.status === 'Delay' ? 'selected' : ''}>Delay</option><option ${dashboardFilters.status === 'Belum dievaluasi' ? 'selected' : ''}>Belum dievaluasi</option></select></label><button class="primary apply-dashboard">Terapkan</button></section><section class="dashboard-kpis"><article class="dash-kpi blue"><span>▣</span><div><small>Total shipment</small><strong>${formatNumber.format(shipments.length)}</strong></div></article><article class="dash-kpi green"><span>✓</span><div><small>On time</small><strong>${formatNumber.format(onTime)} <em>${shipments.length ? `(${Math.round(onPct)}%)` : ''}</em></strong></div></article><article class="dash-kpi red"><span>!</span><div><small>Delay</small><strong>${formatNumber.format(delayed)} <em>${shipments.length ? `(${Math.round(delayPct)}%)` : ''}</em></strong></div></article><article class="dash-kpi violet"><span>◷</span><div><small>Rata-rata delay</small><strong>${average}</strong></div></article></section><section class="dashboard-visuals"><section class="panel status-panel"><div class="panel-title"><div><h2>Komposisi status shipment</h2><p>Berdasarkan data yang telah dievaluasi.</p></div></div><div class="status-content"><div class="donut" style="background:conic-gradient(#1e68aa 0 ${onPct}%,#df7070 ${onPct}% ${onPct + delayPct}%,#dfe8ec ${onPct + delayPct}% 100%)"><div><b>${formatNumber.format(shipments.length)}</b><span>shipment</span></div></div><div class="status-legend"><p><i class="on"></i>On time <b>${onTime}</b></p><p><i class="delay"></i>Delay <b>${delayed}</b></p><p><i class="pending"></i>Belum dievaluasi <b>${pending}</b></p></div></div></section><section class="panel frequency-panel"><div class="panel-title"><div><h2>Frekuensi kendala per kriteria</h2><p>Dihitung dari kendala yang sudah dicatat.</p></div><span class="pill">${delays.length} kendala</span></div><div class="clean-bars">${factorRows.length ? factorRows.map((item) => `<div><span>${escapeHTML(item.label)}</span><i><b style="width:${item.value / maxFactor * 100}%"></b></i><strong>${item.value}</strong></div>`).join('') : '<p class="empty">Belum ada kendala untuk ditampilkan.</p>'}</div></section></section><section class="dashboard-caption"><span>Catatan:</span> status dan rata-rata delay hanya berubah setelah actual arrival dilengkapi pada Data Shipment.</section>`;
  const headingStatus = page.querySelector('.clean-heading > span');
  if (headingStatus) {
    headingStatus.outerHTML = '<div class="dashboard-heading-actions"><button class="primary dashboard-start" type="button">Mulai evaluasi shipment</button></div>';
    page.querySelector('.dashboard-start').addEventListener('click', () => { state.view = 'shipments'; renderApp(); });
  }
  const processCounts = shipments.reduce((counts, shipment) => { const history = state.dashboard.shipmentProcesses?.[String(shipment.id)] || []; const current = history.at(-1)?.status; if (current === 'DELIVERED') counts.completed += 1; else if (current) counts.active += 1; else counts.waiting += 1; return counts; }, { completed: 0, active: 0, waiting: 0 });
  const processTotal = Math.max(shipments.length, 1); const completedPct = processCounts.completed / processTotal * 100; const activePct = processCounts.active / processTotal * 100;
  const processChart = document.createElement('section'); processChart.className = 'panel dashboard-process-chart';
  processChart.innerHTML = `<div class="panel-title"><div><h2>Progress proses shipment</h2><p>Persentase berdasarkan riwayat proses yang sudah diperbarui oleh operasional.</p></div><span class="pill">${shipments.length} shipment</span></div><div class="process-chart-content"><div class="process-donut" style="background:conic-gradient(#3b9c75 0 ${completedPct}%,#2b7895 ${completedPct}% ${completedPct + activePct}%,#dfe8ec ${completedPct + activePct}% 100%)"><div><b>${Math.round(completedPct)}%</b><span>selesai</span></div></div><div class="process-chart-legend"><p><i class="completed"></i><span>Selesai proses</span><b>${processCounts.completed} (${Math.round(completedPct)}%)</b></p><p><i class="active"></i><span>Sedang diproses</span><b>${processCounts.active} (${Math.round(activePct)}%)</b></p><p><i class="waiting"></i><span>Belum dimulai</span><b>${processCounts.waiting} (${Math.round(processCounts.waiting / processTotal * 100)}%)</b></p></div></div>`;
  page.querySelector('.dashboard-visuals').insertAdjacentElement('afterend', processChart);
  const processMap = state.dashboard.shipmentProcesses || {};
  const activeDelays = shipments.filter((shipment) => shipment.status === 'Delay' && processMap[String(shipment.id)]?.at(-1)?.status !== 'DELIVERED');
  const evaluationNeeded = shipments.filter((shipment) => shipment.status === 'Belum dievaluasi');
  const recommendationActions = state.dashboard.recommendationActions || {};
  const openRecommendations = Object.values(recommendationActions).filter((item) => item.status && item.status !== 'Selesai').length;
  const activity = Object.entries(processMap).flatMap(([shipmentId, history]) => history.map((entry) => ({ ...entry, shipment: shipments.find((item) => String(item.id) === String(shipmentId)) }))).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  const workPanels = document.createElement('section'); workPanels.className = 'dashboard-work-panels';
  workPanels.innerHTML = `<section class="panel action-needed"><div class="panel-title"><div><p class="eyebrow">FOKUS HARI INI</p><h2>Perlu tindakan</h2><p>Prioritas yang perlu ditinjau oleh tim operasional.</p></div></div><div class="action-list"><button type="button" class="action-row" data-action="delay"><i class="danger">!</i><span><strong>Shipment terlambat aktif</strong><small>${activeDelays.length ? `${activeDelays[0].shipmentNo} dan ${activeDelays.length - 1} shipment lainnya` : 'Tidak ada shipment delay yang masih aktif'}</small></span><b>${activeDelays.length}</b><em>›</em></button><button type="button" class="action-row" data-action="evaluation"><i class="warning">?</i><span><strong>Shipment perlu evaluasi</strong><small>Actual arrival atau evaluasi status belum lengkap</small></span><b>${evaluationNeeded.length}</b><em>›</em></button><button type="button" class="action-row" data-action="recommendation"><i class="info">✓</i><span><strong>Tindak lanjut prioritas</strong><small>Rekomendasi AHP yang belum selesai</small></span><b>${openRecommendations}</b><em>›</em></button></div></section><section class="panel recent-activity"><div class="panel-title"><div><p class="eyebrow">PEMBARUAN OPERASIONAL</p><h2>Aktivitas terbaru</h2><p>Riwayat perubahan proses shipment terakhir.</p></div></div><div class="activity-list">${activity.length ? activity.map((entry) => `<button type="button" data-shipment="${entry.shipment?.id || ''}" class="activity-row"><i>●</i><span><strong>${escapeHTML(entry.shipment?.shipmentNo || 'Shipment')}</strong><small>${escapeHTML(shipmentProcessLabels[entry.status] || entry.status)}${entry.note ? ` · ${escapeHTML(entry.note)}` : ''}</small></span><time>${new Date(entry.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</time></button>`).join('') : '<p class="empty dashboard-empty">Belum ada pembaruan proses shipment.</p>'}</div></section>`;
  processChart.insertAdjacentElement('afterend', workPanels);
  workPanels.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'recommendation') state.view = 'recommendations';
    else if (action === 'delay') { state.attentionType = 'delay'; state.view = 'attention'; }
    else if (action === 'evaluation') { state.attentionType = 'evaluation'; state.view = 'attention'; }
    else state.view = 'shipments';
    renderApp();
  }));
  workPanels.querySelectorAll('[data-shipment]').forEach((button) => button.addEventListener('click', () => { if (button.dataset.shipment) { state.selectedShipmentId = Number(button.dataset.shipment); state.returnToAttention = false; state.returnToDashboard = true; state.returnToShipments = false; state.view = 'detail'; renderApp(); } }));
  page.querySelector('.apply-dashboard').addEventListener('click', () => { dashboardFilters.route = page.querySelector('[name="route"]').value; dashboardFilters.status = page.querySelector('[name="status"]').value; renderApp(); });
}

function buildAnalysisTemplate(page) {
  if (state.view !== 'analysis') return;
  const { delays: allDelays, delayFactors, shipments, processStages } = state.dashboard;
  const routes = [...new Set(shipments.map((item) => `${item.origin} → ${item.destination}`))].sort();
  const lookup = new Map(shipments.map((item) => [item.id, item]));
  const delays = allDelays.filter((item) => { const shipment = lookup.get(item.shipmentId); const route = shipment ? `${shipment.origin} → ${shipment.destination}` : ''; return (analysisFilters.route === 'Semua rute' || route === analysisFilters.route) && (analysisFilters.stage === 'Semua tahapan' || item.processStage === analysisFilters.stage); });
  const factors = delayFactors.map((label) => ({ label, value: delays.filter((item) => item.factor === label).length })).filter((item) => item.value);
  const stages = processStages.map((label) => ({ label, value: delays.filter((item) => item.processStage === label).length })).filter((item) => item.value);
  const max = Math.max(...factors.map((item) => item.value), 1); const colors = ['#1c68ab','#7fc7b1','#f3bd57','#69a9d5','#9c89c8','#83bc8b']; let current = 0;
  const slices = stages.map((item,index) => { const start=current; current += delays.length ? item.value / delays.length * 100 : 0; return `${colors[index % colors.length]} ${start}% ${current}%`; }).join(', ') || '#e8eff2 0 100%';
  page.innerHTML = `<section class="analysis-heading"><div><p class="eyebrow">INS SEATRACK</p><h1>Analisis Kendala</h1><p>Analisis frekuensi dan pola keterlambatan pengiriman laut.</p></div><span>${delays.length} kendala</span></section><section class="analysis-filter"><label>Periode<select><option>Seluruh periode</option></select></label><label>Rute<select name="route"><option>Semua rute</option>${routes.map((route) => `<option ${route === analysisFilters.route ? 'selected' : ''}>${escapeHTML(route)}</option>`).join('')}</select></label><label>Tahapan proses<select name="stage"><option>Semua tahapan</option>${processStages.map((stage) => `<option ${stage === analysisFilters.stage ? 'selected' : ''}>${escapeHTML(stage)}</option>`).join('')}</select></label><button class="primary apply-analysis">Terapkan</button></section><section class="analysis-charts"><section class="panel factor-chart"><div class="panel-title"><div><h2>Frekuensi Kendala per Kriteria</h2><p>Berdasarkan kendala yang tercatat pada sistem.</p></div></div><div class="factor-bars">${factors.length ? factors.map((item) => `<div><span>${escapeHTML(item.label)}</span><i><b style="width:${item.value/max*100}%"></b></i><strong>${item.value}</strong></div>`).join('') : '<p class="empty">Belum ada kendala sesuai filter.</p>'}</div></section><section class="panel stage-chart"><div class="panel-title"><div><h2>Kendala per Tahapan Proses</h2><p>Distribusi proses yang terdampak.</p></div></div><div class="stage-content"><div class="stage-donut" style="background:conic-gradient(${slices})"><div><b>${delays.length}</b><span>Kendala</span></div></div><div class="stage-legend">${stages.length ? stages.map((item,index) => `<p><i style="background:${colors[index % colors.length]}"></i><span>${escapeHTML(item.label)}</span><b>${item.value}</b></p>`).join('') : '<p class="muted">Belum ada tahapan proses.</p>'}</div></div></section></section>`;
  page.querySelector('.apply-analysis').addEventListener('click', () => { analysisFilters.route = page.querySelector('[name="route"]').value; analysisFilters.stage = page.querySelector('[name="stage"]').value; renderApp(); });
}

function buildAhpTemplate(page) {
  if (state.view !== 'ahp') return;
  const { ahp, consistencyRatio } = state.dashboard;
  const hasWeights = ahp.some((item) => typeof item.weight === 'number');
  const priorities = hasWeights
    ? [...ahp].sort((a, b) => (b.weight ?? -1) - (a.weight ?? -1))
    : [...ahp];
  const maximum = Math.max(...priorities.map((item) => Number(item.weight) || 0), 1);
  const hasRatio = typeof consistencyRatio === 'number';
  const isConsistent = hasRatio && consistencyRatio <= 0.1;
  const ratioText = hasRatio ? consistencyRatio.toFixed(3).replace('.', ',') : '—';

  page.innerHTML = `<section class="ahp-heading"><div><p class="eyebrow">INS SEATRACK · ANALISIS KEPUTUSAN</p><h1>Prioritas AHP</h1><p>Hasil pembobotan faktor penyebab keterlambatan pengiriman laut.</p></div><div class="ahp-actions"><span class="ahp-state ${hasWeights ? 'ready' : ''}">${hasWeights ? 'Hasil AHP tersedia' : 'Menunggu hasil AHP final'}</span><button class="primary ahp-edit-button" type="button">${hasWeights ? 'Edit bobot AHP' : 'Input hasil penelitian'}</button></div></section><section class="ahp-template-layout"><section class="panel ahp-priority-panel"><div class="ahp-panel-title"><div><h2>Rangking prioritas faktor</h2><p>${hasWeights ? 'Urutan ditampilkan dari bobot tertinggi ke terendah.' : 'Kriteria tersedia; urutan prioritas aktif setelah bobot hasil AHP disimpan.'}</p></div></div><div class="ahp-table-head"><span>Peringkat</span><span>Kriteria</span><span>Bobot</span><span aria-label="Visualisasi bobot"></span></div><div class="ahp-priority-list">${priorities.map((item, index) => { const weight = typeof item.weight === 'number' ? item.weight : null; const width = weight === null ? 0 : weight / maximum * 100; return `<div class="ahp-priority-row"><span class="ahp-rank">${hasWeights ? index + 1 : '—'}</span><strong>${escapeHTML(item.factor)}</strong><b>${weight === null ? '—' : weight.toFixed(3).replace('.', ',')}</b><i class="ahp-weight-track"><em style="width:${width}%"></em></i></div>`; }).join('')}</div></section><aside class="panel consistency-panel"><p class="eyebrow">VALIDASI AHP</p><h2>Uji Konsistensi</h2><div class="consistency-values"><div><span>CI</span><b>0,072</b></div><div><span>CR</span><b>${ratioText}</b></div></div><p class="consistency-note">Hasil perhitungan konsistensi dari pengolahan AHP pada penelitian.</p><div class="consistency-result ${hasRatio ? (isConsistent ? 'consistent' : 'review') : 'waiting'}"><strong>${!hasRatio ? 'Menunggu hasil AHP' : (isConsistent ? 'Konsisten' : 'Perlu ditinjau')}</strong><span>${!hasRatio ? 'Masukkan CR final untuk validasi.' : (isConsistent ? 'CR ≤ 0,10' : 'CR > 0,10')}</span></div></aside></section>`;
  if (!canManage()) page.querySelector('.ahp-edit-button')?.remove();
  if (state.dashboard.ahpMeta?.source) page.querySelector('.ahp-heading > div')?.insertAdjacentHTML('beforeend', `<small class="ahp-source">Sumber: ${escapeHTML(state.dashboard.ahpMeta.source)}${state.dashboard.ahpMeta.period ? ` · ${escapeHTML(state.dashboard.ahpMeta.period)}` : ''}</small>`);
}

function manual() {
  const page = document.createElement('div');
  const steps = [
    ['1', 'Masuk ke sistem', 'Masukkan email dan password akun operasional. Setelah berhasil masuk, Anda berada di Dashboard.', 'overview'],
    ['2', 'Tinjau Dashboard', 'Periksa ringkasan shipment, status On Time/Delay, proses pengiriman, dan bagian Perlu tindakan.', 'overview'],
    ['3', 'Kelola Data Shipment', 'Cari berdasarkan nomor shipment, customer, atau rute. Gunakan Edit untuk memperbarui data dan Detail untuk melihat riwayat.', 'shipments'],
    ['4', 'Perbarui proses shipment', 'Di Detail Shipment, pilih Update proses untuk mencatat tahapan berikutnya. Isi catatan proses; nomor dan lampiran dokumen bersifat opsional.', 'shipments'],
    ['5', 'Catat kendala', 'Gunakan Catat kendala saat ada masalah atau keterlambatan. Cari nomor shipment, pilih tahapan serta faktor penyebab, kemudian simpan.', 'delays'],
    ['6', 'Analisis dan prioritas', 'Analisis Kendala menunjukkan frekuensi masalah. Prioritas AHP menampilkan bobot penelitian untuk menentukan faktor yang perlu didahulukan.', 'analysis'],
    ['7', 'Tindak lanjuti rekomendasi', 'Buka Rekomendasi perbaikan, tentukan penanggung jawab, lalu perbarui status tindak lanjut hingga selesai.', 'recommendations'],
    ['8', 'Buat laporan', 'Gunakan Laporan untuk melihat rekap kinerja, kriteria kendala utama, lalu unduh atau cetak laporan untuk manajemen.', 'reports']
  ];
  page.innerHTML = `<section class="manual-heading"><div><p class="eyebrow">PANDUAN SISTEM</p><h1>Panduan penggunaan INS SeaTrack</h1><p>Alur kerja operasional untuk memantau shipment, mencatat kendala, dan menindaklanjuti perbaikan.</p></div><button class="secondary manual-print" type="button">Cetak panduan</button></section><section class="manual-start"><strong>Alur singkat</strong><span>Data shipment → Proses pengiriman → Kendala → Analisis → Rekomendasi → Laporan</span></section><section class="manual-grid">${steps.map(([number, title, description, view]) => `<article class="manual-step"><span>${number}</span><div><h2>${title}</h2><p>${description}</p><button type="button" data-guide-view="${view}">Buka halaman</button></div></article>`).join('')}</section><section class="manual-notes"><h2>Ketentuan penting</h2><ul><li>Status On Time atau Delay dihitung setelah <strong>actual arrival</strong> diisi.</li><li>Tahapan proses shipment dicatat secara berurutan agar riwayat pengiriman valid.</li><li>Setiap tombol simpan akan meminta konfirmasi sebelum data diperbarui.</li><li>Pengaturan akun tersedia melalui profil di kanan atas untuk mengganti password.</li></ul></section>`;
  page.querySelectorAll('[data-guide-view]').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.guideView; renderApp(); }));
  page.querySelector('.manual-print').addEventListener('click', () => window.print());
  return page;
}
function renderApp() {
  if (state.returnToAttention && state.view === 'shipments' && !state.editShipmentId) { state.returnToAttention = false; state.view = 'attention'; }
  app.replaceChildren();
  if (!state.user) { app.appendChild(createLogin()); return; }
  const pages = { overview, shipments, attention, detail, delays, analysis, ahp, recommendations, reports, manual, settings };
  if (!pages[state.view]) state.view = 'overview';
  const access = { delays: canOperate(), analysis: canManage(), ahp: canManage(), recommendations: canManage(), reports: canManage() };
  if (access[state.view] === false) state.view = 'overview';
  localStorage.setItem('ins-seatrack-view', state.view);
  try {
    const shell = createShell();
    const activePage = pages[state.view]();
    addResearchContext(activePage); syncWorkflow(activePage); buildCleanDashboard(activePage); buildShipmentDirectory(activePage); buildAnalysisTemplate(activePage); buildAhpTemplate(activePage);
    if (state.view === 'ahp') attachAHPEntry(activePage);
    shell.querySelector('.workspace').append(activePage); app.appendChild(shell);
  } catch (error) {
    console.error('Gagal merender halaman:', error);
    app.innerHTML = `<main class="render-error"><h1>Halaman belum dapat dimuat</h1><p>${escapeHTML(error.message || 'Terjadi kesalahan tampilan.')}</p><button class="primary" type="button">Kembali ke Dashboard</button></main>`;
    app.querySelector('button').addEventListener('click', () => { state.view = 'overview'; renderApp(); });
  }
}
async function restoreSession() {
  const saved = localStorage.getItem('ins-seatrack-session');
  if (!saved) { renderApp(); return; }
  try {
    const session = JSON.parse(saved);
    if (!session?.token || !session?.user) throw new Error('Data sesi tidak lengkap');
    state.token = session.token; state.user = session.user;
    state.view = localStorage.getItem('ins-seatrack-view') || 'overview';
    await loadDashboard();
    renderApp();
  } catch (error) {
    console.error('Gagal memulihkan sesi:', error);
    if (error.status === 401) {
      localStorage.removeItem('ins-seatrack-session'); localStorage.removeItem('ins-seatrack-view');
      state.token = null; state.user = null; state.dashboard = null; renderApp();
      return;
    }
    app.innerHTML = `<main class="render-error"><h1>Koneksi sementara bermasalah</h1><p>Sesi Anda tetap tersimpan. Periksa koneksi lalu muat ulang halaman.</p><button class="primary" type="button">Coba lagi</button></main>`;
    app.querySelector('button').addEventListener('click', restoreSession);
  }
}
restoreSession();
