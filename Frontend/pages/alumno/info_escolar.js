// =====================================================
//  info_escolar.js — Lógica de Información Escolar
//  Depende de: app.js (API_URL, requireAuth, showToast,
//              icon, renderWeekGrid, goSection,
//              colorByClave, fillShell, escapeHtml)
//  Endpoints:
//    GET /api/alumno/info?id_alumno=
//    GET /api/alumno/reticula?id_alumno=
// =====================================================

// ── Estado global ─────────────────────────────────
let usuario  = {};
let infoData = null;   // respuesta de getInfo
let retData  = null;   // respuesta de getReticula
const PERIODO_LABEL = 'Enero – Junio 2026';

// =====================================================
//  HELPERS
// =====================================================
function fmtHora(t) {
  return String(t).slice(0, 5);
}

function fmtHorario(h) {
  return `${h.dias} · ${fmtHora(h.hora_inicio)}–${fmtHora(h.hora_fin)}`;
}

function horaANum(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h + (m || 0) / 60;
}

function grupos2Clases(grupos) {
  return grupos.map(g => ({
    dias:  g.horario.dias.split(/[,\-\s]+/).map(d => d.trim()).filter(Boolean),
    ini:   horaANum(g.horario.hora_inicio),
    fin:   horaANum(g.horario.hora_fin),
    label: g.materia_clave,
    sub:   `${g.materia.slice(0, 18)} · ${g.aula}`,
    color: colorByClave(g.materia_clave)
  }));
}

function showSection(loadingId, contentId, emptyId, hasData) {
  document.getElementById(loadingId).style.display  = 'none';
  document.getElementById(contentId).style.display  = hasData ? 'block' : 'none';
  if (emptyId) document.getElementById(emptyId).style.display = hasData ? 'none' : 'block';
}

// =====================================================
//  FETCH — Información del alumno
// =====================================================
async function fetchInfo() {
  try {
    const res  = await fetch(`${API_URL}/api/alumno/info?id_alumno=${usuario.id}`);
    const data = await res.json();
    if (!res.ok) { showToast('Error', data.error || 'No se pudo cargar la información.', 'bad'); return null; }
    return data;
  } catch {
    showToast('Error de conexión', 'No se pudo conectar con el servidor.', 'bad');
    return null;
  }
}

// =====================================================
//  FETCH — Retícula
// =====================================================
async function fetchReticula() {
  try {
    const res  = await fetch(`${API_URL}/api/alumno/reticula?id_alumno=${usuario.id}`);
    const data = await res.json();
    if (!res.ok) { showToast('Error', data.error || 'No se pudo cargar la retícula.', 'bad'); return null; }
    return data;
  } catch {
    showToast('Error de conexión', 'No se pudo conectar con el servidor.', 'bad');
    return null;
  }
}

// =====================================================
//  RENDER — Perfil escolar
// =====================================================
function renderPerfil() {
  if (!infoData) return;
  const { alumno, carga, grupos } = infoData;

  document.getElementById('perfil-subtitulo').textContent = `${alumno.carrera} · ${alumno.matricula}`;
  document.getElementById('p-nombre').textContent         = alumno.nombre;
  document.getElementById('p-email').textContent          = alumno.email;
  document.getElementById('p-matricula').textContent      = alumno.matricula;
  document.getElementById('p-carrera').textContent        = alumno.carrera;
  document.getElementById('p-semestre').textContent       = `${alumno.semestre}° semestre`;
  document.getElementById('p-tipo').textContent           = alumno.tipo_alumno === 'irregular' ? 'Irregular' : 'Regular';
  document.getElementById('ico-nav-addbook').innerHTML = icon('addbook', 21);

  // Badge estado pago
  const estadoEl = document.getElementById('p-estado');
  if (alumno.estado_pago === 'vigente') {
    estadoEl.className   = 'badge badge--ok';
    estadoEl.innerHTML   = `${icon('check', 12, 2.5)} Vigente`;
  } else {
    estadoEl.className   = 'badge badge--bad';
    estadoEl.innerHTML   = `${icon('alert', 12, 2.5)} Adeudo`;
  }

  // Stats de carga
  document.getElementById('p-stat-materias').textContent = carga ? carga.total_grupos  : '0';
  document.getElementById('p-stat-creditos').textContent = grupos.reduce((s, g) => s + g.creditos, 0);
  document.getElementById('p-stat-periodo').textContent  = carga ? carga.periodo        : '—';
  document.getElementById('p-stat-estado').textContent   = carga ? carga.estado.replace('_', ' ') : '—';
  

  showSection('perfil-loading', 'perfil-content', null, true);
}

// =====================================================
//  RENDER — Kardex
// =====================================================
function renderKardex() {
  if (!infoData) return;
  const { alumno, carga, grupos } = infoData;
  const tieneGrupos = grupos.length > 0;

  document.getElementById('kardex-subtitulo').textContent = `${alumno.carrera} · ${carga?.periodo || '—'}`;

  const totalCred = grupos.reduce((s, g) => s + g.creditos, 0);
  document.getElementById('kardex-creditos-badge').innerHTML = `${icon('book', 14)} ${totalCred} créditos`;

  showSection('kardex-loading', 'kardex-content', 'kardex-empty', tieneGrupos);

  if (!tieneGrupos) return;

  document.getElementById('kardex-total-mat').textContent  = grupos.length;
  document.getElementById('kardex-total-cred').textContent = totalCred;

  document.getElementById('kardex-tbody').innerHTML = grupos.map((g, i) => `
    <tr style="border-bottom:1px solid var(--line);${i % 2 === 0 ? '' : 'background:var(--tinto-50);'}">
      <td style="padding:12px 16px;">
        <span class="clave" style="font-size:12px;padding:5px 9px;">${escapeHtml(g.materia_clave)}</span>
      </td>
      <td style="padding:12px 16px;font-weight:600;font-size:14px;color:var(--ink);">${escapeHtml(g.materia)}</td>
      <td style="padding:12px 16px;font-size:13px;color:var(--ink-2);">Grupo ${escapeHtml(g.clave)}</td>
      <td style="padding:12px 16px;font-size:13px;color:var(--ink-2);">${escapeHtml(g.docente)}</td>
      <td style="padding:12px 16px;font-size:13px;color:var(--ink-2);">${escapeHtml(fmtHorario(g.horario))}</td>
      <td style="padding:12px 16px;font-size:13px;color:var(--ink-2);">${escapeHtml(g.aula)}</td>
      <td style="padding:12px 8px;text-align:center;">
        <span class="badge badge--tinto">${g.creditos}</span>
      </td>
    </tr>
  `).join('');
}

// =====================================================
//  RENDER — Retícula
// =====================================================
function renderReticula() {
  if (!retData) return;
  const { carrera, semestre_actual, semestres } = retData;

  const totalMaterias  = semestres.reduce((s, sem) => s + sem.materias.length, 0);
  const totalInscritas = semestres.reduce((s, sem) => s + sem.materias.filter(m => m.inscrita).length, 0);

  document.getElementById('reticula-subtitulo').textContent = carrera;
  document.getElementById('reticula-badge').innerHTML       = `${icon('book', 14)} ${totalInscritas} / ${totalMaterias} materias`;

  showSection('reticula-loading', 'reticula-content', null, true);

  document.getElementById('reticula-grid').innerHTML = semestres.map(sem => {
    const esActual = sem.semestre === semestre_actual;
    const materias = sem.materias.map(m => `
      <div class="reticula-materia">
        <div class="reticula-materia__dot ${m.inscrita ? 'inscrita' : ''}"></div>
        <div class="reticula-materia__body">
          <div class="reticula-materia__nombre" title="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre)}</div>
          <div class="reticula-materia__clave">${escapeHtml(m.clave)}</div>
        </div>
        <div class="reticula-materia__cred">${m.creditos} cr</div>
      </div>
    `).join('');

    return `<div class="card" style="padding:0;overflow:hidden;">
      <div class="reticula-semestre__titulo ${esActual ? 'activo' : ''}">
        ${esActual ? icon('check', 13, 2.5) + ' ' : ''}${sem.semestre}° Semestre
        ${esActual ? '<span style="opacity:.7;font-weight:500;font-size:10px;"> · Actual</span>' : ''}
      </div>
      <div style="padding:8px 10px 10px;">
        ${materias}
      </div>
    </div>`;
  }).join('');
}

// =====================================================
//  RENDER — Horario
// =====================================================
function renderHorario() {
  if (!infoData) return;
  const { carga, grupos, alumno } = infoData;
  const tieneGrupos = grupos.length > 0;

  document.getElementById('horario-subtitulo').textContent = `${alumno.nombre} · ${carga?.periodo || '—'}`;

  showSection('horario-loading', 'horario-content', 'horario-empty', tieneGrupos);

  if (!tieneGrupos) return;

  // Lista de materias
  document.getElementById('horario-list').innerHTML = grupos.map(g => `
    <div class="list-item">
      <span class="clave" style="font-size:12px;padding:6px 10px;">${escapeHtml(g.materia_clave)}</span>
      <div class="list-item__body">
        <div class="list-item__title">${escapeHtml(g.materia)}</div>
        <div class="list-item__meta">
          <span class="list-item__meta-item">${icon('user', 13)} ${escapeHtml(g.docente)}</span>
          <span class="list-item__meta-item">${icon('pin', 13)} ${escapeHtml(g.aula)}</span>
          <span class="list-item__meta-item">${icon('clock', 13)} ${escapeHtml(fmtHorario(g.horario))}</span>
        </div>
      </div>
      <span style="font-size:13px;font-weight:700;color:var(--tinto-700);">${g.creditos} créd.</span>
    </div>
  `).join('');

  // WeekGrid
  renderWeekGrid(document.getElementById('weekgrid-horario'), grupos2Clases(grupos));
}

// =====================================================
//  INICIALIZACIÓN
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
  usuario = requireAuth('../../index.html');
  if (!usuario) return;

  

  // Íconos del shell
  fillShell(usuario, PERIODO_LABEL);
  document.getElementById('header-user-role').textContent = 'Alumno';
  document.getElementById('header-period-icon').innerHTML = icon('clock', 17);
  document.getElementById('ico-bell').innerHTML           = icon('bell', 20);
  document.getElementById('ico-logout').innerHTML         = icon('logout', 16, 2);
  document.getElementById('ico-nav-id').innerHTML         = icon('id', 21);
  document.getElementById('ico-nav-doc').innerHTML        = icon('doc', 21);
  document.getElementById('ico-nav-grid').innerHTML       = icon('grid', 21);
  document.getElementById('ico-nav-calendar').innerHTML   = icon('calendar', 21);
  document.getElementById('ico-profile-user').innerHTML   = icon('user', 32, 1.5);

  // Fetch paralelo de info y retícula
  [infoData, retData] = await Promise.all([fetchInfo(), fetchReticula()]);

  // Actualizar periodo en header/sidebar
  const periodo = infoData?.periodo || PERIODO_LABEL;
  document.getElementById('header-period-text').textContent  = periodo;
  document.getElementById('sidebar-period-name').textContent = periodo;

  // Render inicial — perfil
  renderPerfil();

  // Navegación
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.getAttribute('data-section');
      goSection(sec);
      if (sec === 'sec-perfil')   renderPerfil();
      if (sec === 'sec-kardex')   renderKardex();
      if (sec === 'sec-reticula') renderReticula();
      if (sec === 'sec-horario')  renderHorario();
    });
  });

  // Cerrar sesión
  document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem('usuario');
    window.location.href = '../../index.html';
  });

  document.getElementById('btn-nav-carga').addEventListener('click', () => {
    window.location.href = 'carga.html';
  });
});