// =====================================================
//  app.js — Utilidades compartidas del frontend
//  Íconos SVG, Toast, WeekGrid, Auth check
// =====================================================

/* ---------- Íconos ---------- */
const ICONS = {
  addbook:  'M5 4.5A1.5 1.5 0 0 1 6.5 3H13v7l-2.2-1.4L8.6 10V3M14 13H6.5A1.5 1.5 0 0 0 5 14.5V19.5A1.5 1.5 0 0 0 6.5 21H14M18 13v8M14 17h8',
  doc:      'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  id:       'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4M6 16a3 3 0 0 1 6 0M14 9h4M14 13h4M14 16h2',
  grid:     'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  users:    'M16 19a4 4 0 0 0-8 0M12 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4M20.5 18.2a3.3 3.3 0 0 0-3-2.2M18.2 10.6a2.6 2.6 0 0 0 0-4.2',
  calendar: 'M4 8h16M7 3v3m10-3v3M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1m3 9h2m3 0h2m-7 3.5h2m3 0h2',
  logout:   'M15 17l5-5-5-5M20 12H9M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7',
  check:    'm5 12 5 5 9-11',
  info:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 11v5m0-8h.01',
  x:        'M6 6l12 12M18 6 6 18',
  plus:     'M12 5v14M5 12h14',
  minus:    'M5 12h14',
  clock:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
  alert:    'M12 9v4m0 4h.01M10.3 4 3 17a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0',
  user:     'M16 19a4 4 0 0 0-8 0M12 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4',
  pin:      'M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  download: 'M12 4v10m0 0 4-4m-4 4-4-4M5 19h14',
  bell:     'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  seats:    'M5 18v-5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5M7 11V8a3 3 0 0 1 6 0M5 18h14M8 18v2m8-2v2',
  book:     'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z',
  search:   'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
  edit:     'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
};

/**
 * Genera HTML de un ícono SVG inline.
 * @param {string} name - clave del ícono
 * @param {number} size - tamaño en px
 * @param {number} sw   - stroke-width
 */
function icon(name, size = 20, sw = 1.7) {
  const d = ICONS[name] || ICONS.info;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="${sw}" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true"
    style="display:inline-block;vertical-align:middle;flex-shrink:0;">
    <path d="${d}"/>
  </svg>`;
}

/* ---------- Auth ---------- */
/**
 * Verifica que haya una sesión activa.
 * Si no, redirige al login.
 * @param {string} loginPath - ruta relativa al index.html desde la página actual
 * @returns {object|null} datos del usuario
 */
function requireAuth(loginPath = '../../index.html') {
  const raw = sessionStorage.getItem('usuario');
  if (!raw) {
    window.location.href = loginPath;
    return null;
  }
  return JSON.parse(raw);
}

/* ---------- Toast ---------- */
let _toastContainer = null;

function _getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.className = 'toast-container';
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

/**
 * Muestra una notificación toast.
 * @param {string} title
 * @param {string} body
 * @param {'ok'|'bad'|'info'} kind
 */
function showToast(title, body = '', kind = 'info') {
  const container = _getToastContainer();
  const iconName  = kind === 'ok' ? 'check' : kind === 'bad' ? 'alert' : 'info';
  const color     = kind === 'ok' ? 'var(--green)' : kind === 'bad' ? 'var(--red)' : 'var(--tinto-700)';

  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="toast__icon" style="color:${color}">${icon(iconName, 19, 2.2)}</div>
    <div class="toast__body">
      <div class="toast__title">${title}</div>
      ${body ? `<div class="toast__desc">${body}</div>` : ''}
    </div>
    <button class="toast__close" aria-label="Cerrar">${icon('x', 17)}</button>
  `;

  el.querySelector('.toast__close').addEventListener('click', () => el.remove());
  container.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 3600);
}

/* ---------- WeekGrid ---------- */
const DIAS_SEM = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

/**
 * Renderiza el horario semanal dentro de un contenedor.
 * @param {HTMLElement} container - el div donde se inyecta
 * @param {Array} clases - [{ dias:[], ini:7, fin:9, label:'', sub:'', color:'' }]
 * @param {object} opts  - { h0:7, h1:15, rowH:58 }
 */
function renderWeekGrid(container, clases, { h0 = 7, h1 = 15, rowH = 58 } = {}) {
  const hours = [];
  for (let h = h0; h < h1; h++) hours.push(h);
  const fmt = n => String(n).padStart(2, '0') + ':00';

  let html = `<div class="week-grid"><div class="week-grid__table">`;

  // Encabezado: esquina + días
  html += `<div class="week-grid__corner"></div>`;
  DIAS_SEM.forEach(d => {
    html += `<div class="week-grid__day">${d}</div>`;
  });

  // Filas de horas
  hours.forEach(h => {
    html += `<div class="week-grid__time">${fmt(h)}</div>`;
    DIAS_SEM.forEach(d => {
      const cls = clases.find(c => c.dias.includes(d) && c.ini === h);
      if (cls) {
        const span  = cls.fin - cls.ini;
        const height = span * rowH - 8;
        const bg    = cls.color || 'var(--tinto-700)';
        html += `<div class="week-grid__slot">
          <div class="week-grid__event" style="height:${height}px;background:${bg};">
            <div class="week-grid__event-label">${cls.label}</div>
            <div class="week-grid__event-sub">${cls.sub}</div>
          </div>
        </div>`;
      } else {
        html += `<div class="week-grid__slot"></div>`;
      }
    });
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

/* ---------- Navegación por secciones ---------- */
/**
 * Muestra una sección y actualiza el nav activo.
 * @param {string} sectionId - id del elemento section
 * @param {string} [navBtnAttr='data-section'] - atributo en los botones de nav
 */
function goSection(sectionId, navBtnAttr = 'data-section') {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const sec = document.getElementById(sectionId);
  if (sec) sec.classList.add('active');

  const btn = document.querySelector(`.nav-btn[${navBtnAttr}="${sectionId}"]`);
  if (btn) btn.classList.add('active');
}

/* ---------- Colores por clave de materia ---------- */
const _COLORES = ['#6E1423','#9C2A4E','#85203D','#B5536C','#B98A3E','#7A2233','#A83A5B'];
function colorByClave(clave) {
  let h = 0;
  for (const ch of clave) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return _COLORES[h % _COLORES.length];
}

/* ---------- Shell helpers ---------- */
/**
 * Rellena los datos del usuario en el shell (header y sidebar).
 */
function fillShell(usuario, periodo = 'Enero – Junio 2026') {
  const nameEl = document.getElementById('header-user-name');
  const roleEl = document.getElementById('header-user-role');
  const perEl  = document.getElementById('header-period-text');
  if (nameEl) nameEl.textContent = usuario.nombre || '';
  if (roleEl) roleEl.textContent = usuario.rol    || '';
  if (perEl)  perEl.textContent  = periodo;

  // Sidebar periodo
  const sidePerEl = document.getElementById('sidebar-period-name');
  if (sidePerEl) sidePerEl.textContent = periodo;
}
