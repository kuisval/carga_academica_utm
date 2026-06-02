// =====================================================
//  grupos.js — Lógica de gestión de grupos (coordinador)
//  Depende de: app.js (API_URL, requireAuth, showToast,
//              icon, goSection, fillShell, escapeHtml)
// =====================================================

// ── Estado global ────────────────────────────────────
let usuario     = {};
let catalogo    = {};   // { materias, aulas, horarios, docentes }
let grupos      = [];   // grupos ya creados en la oferta
let oferta      = null; // { id_oferta, periodo, estado }
let coordInfo   = {};   // { nombre, carrera, id_carrera }

// =====================================================
//  CARGA INICIAL
// =====================================================
async function cargarDatos() {
  try {
    const res  = await fetch(`${API_URL}/api/coordinador/materias?id_coordinador=${usuario.id}`);
    const data = await res.json();

    if (!res.ok) {
      showToast('Error', data.error || 'No se pudo cargar la información.', 'bad');
      return;
    }

    coordInfo = data.coordinador || {};
    catalogo  = data.catalogo    || {};
    grupos    = data.grupos      || [];
    oferta    = data.oferta      || null;

    const periodo = oferta?.periodo || '—';
    document.getElementById('header-period-text').textContent  = periodo;
    document.getElementById('sidebar-period-name').textContent = periodo;
    document.getElementById('grupos-subtitulo').textContent    = `${coordInfo.carrera || '—'} · ${periodo}`;
    document.getElementById('oferta-subtitulo').textContent    = `${coordInfo.carrera || '—'} · ${periodo}`;

    actualizarSidebarEstado();
    llenarSelects();
    renderGrupos();
    renderOferta();

  } catch (err) {
    console.error('cargarDatos:', err);
    showToast('Error de conexión', 'No se pudo conectar con el servidor.', 'bad');
  }
}

// =====================================================
//  SIDEBAR — estado de la oferta
// =====================================================
function actualizarSidebarEstado() {
  const el = document.getElementById('sidebar-oferta-status');
  const badge = document.getElementById('oferta-estado-badge');

  if (!oferta) {
    el.textContent        = 'Sin oferta';
    badge.className       = 'badge badge--gray badge--lg';
    badge.textContent     = 'Sin oferta';
    return;
  }

  if (oferta.estado === 'publicada') {
    el.textContent        = 'Publicada';
    badge.className       = 'badge badge--ok badge--lg';
    badge.textContent     = 'Publicada';
  } else {
    el.textContent        = 'Borrador';
    badge.className       = 'badge badge--warn badge--lg';
    badge.textContent     = 'Borrador';
  }
}

// =====================================================
//  FORMULARIO — llenar selects con catálogo
// =====================================================
function llenarSelects() {
  const fMat     = document.getElementById('f-materia');
  const fDocente = document.getElementById('f-docente');
  const fAula    = document.getElementById('f-aula');
  const fHorario = document.getElementById('f-horario');

  fMat.innerHTML = `<option value="">Selecciona una materia</option>` +
    (catalogo.materias || []).map(m =>
      `<option value="${m.id_materia}">${escapeHtml(m.clave)} — ${escapeHtml(m.nombre)} (${m.creditos} créd.)</option>`
    ).join('');

  fDocente.innerHTML = `<option value="">Selecciona un docente</option>` +
    (catalogo.docentes || []).map(d =>
      `<option value="${d.id_docente}">${escapeHtml(d.nombre)} · ${escapeHtml(d.especialidad)}</option>`
    ).join('');

  fAula.innerHTML = `<option value="">Selecciona un aula</option>` +
    (catalogo.aulas || []).map(a =>
      `<option value="${a.id_aula}">Aula ${a.numero} — Edificio ${escapeHtml(a.edificio)} (cap. ${a.capacidad})</option>`
    ).join('');

  fHorario.innerHTML = `<option value="">Selecciona un horario</option>` +
    (catalogo.horarios || []).map(h =>
      `<option value="${h.id_horario}">${escapeHtml(h.dias)} · ${h.hora_inicio}–${h.hora_fin}</option>`
    ).join('');
}

// =====================================================
//  RENDER — Lista de grupos
// =====================================================
function renderGrupos() {
  const loading = document.getElementById('grupos-loading');
  const content = document.getElementById('grupos-content');
  const empty   = document.getElementById('grupos-empty');
  const tbody   = document.getElementById('grupos-tbody');

  loading.style.display = 'none';

  // Stats
  const totalLugares  = grupos.reduce((s, g) => s + g.cupo_max, 0);
  const materiasUnicas = new Set(grupos.map(g => g.materia_clave)).size;
  const docentesUnicos = new Set(grupos.map(g => g.docente)).size;

  document.getElementById('stat-grupos').textContent   = grupos.length;
  document.getElementById('stat-materias').textContent = materiasUnicas;
  document.getElementById('stat-lugares').textContent  = totalLugares;
  document.getElementById('stat-docentes').textContent = docentesUnicos;

  if (grupos.length === 0) {
    content.style.display = 'none';
    empty.style.display   = 'block';
    return;
  }

  content.style.display = 'block';
  empty.style.display   = 'none';

  const puedeEliminar = oferta?.estado !== 'publicada';

  tbody.innerHTML = grupos.map(gr => {
    const estadoBadge = gr.estado === 'disponible'
      ? `<span class="badge badge--ok">Disponible</span>`
      : gr.estado === 'lleno'
        ? `<span class="badge badge--bad">Lleno</span>`
        : `<span class="badge badge--gray">Cancelado</span>`;

    const btnEliminar = puedeEliminar
      ? `<button class="btn btn--danger" style="padding:6px 12px;font-size:12px;"
           data-action="eliminar" data-id="${gr.id_grupo}" title="Eliminar grupo">
           ${icon('x', 13)} Eliminar
         </button>`
      : `<span style="font-size:12px;color:var(--muted);">—</span>`;

    return `<tr>
      <td><span style="font-weight:800;color:var(--tinto-700);">${escapeHtml(gr.clave)}</span></td>
      <td>
        <span style="font-size:11px;font-weight:800;color:var(--tinto-600);">${escapeHtml(gr.materia_clave)}</span><br>
        <span style="font-size:13px;">${escapeHtml(gr.materia)}</span>
      </td>
      <td style="font-size:13px;color:var(--muted);">${escapeHtml(gr.docente)}</td>
      <td style="font-size:13px;color:var(--muted);">${escapeHtml(gr.horario)}</td>
      <td style="font-size:13px;color:var(--muted);">${escapeHtml(gr.aula)}</td>
      <td style="text-align:center;font-weight:700;">${gr.cupo_disponible}/${gr.cupo_max}</td>
      <td style="text-align:center;">${estadoBadge}</td>
      <td>${btnEliminar}</td>
    </tr>`;
  }).join('');

  // Deshabilitar form si la oferta ya está publicada
  const formWrap = document.getElementById('form-wrap');
  if (oferta?.estado === 'publicada') {
    formWrap.style.opacity      = '.5';
    formWrap.style.pointerEvents = 'none';
    formWrap.title              = 'La oferta ya fue publicada. No se pueden agregar más grupos.';
  } else {
    formWrap.style.opacity      = '1';
    formWrap.style.pointerEvents = 'auto';
    formWrap.title              = '';
  }
}

// =====================================================
//  RENDER — Oferta académica
// =====================================================
function renderOferta() {
  const loading = document.getElementById('oferta-loading');
  const content = document.getElementById('oferta-content');
  const empty   = document.getElementById('oferta-empty');
  const btnPub  = document.getElementById('btn-publicar');

  loading.style.display = 'none';

  if (!oferta) {
    content.style.display = 'none';
    empty.style.display   = 'block';
    return;
  }

  content.style.display = 'block';
  empty.style.display   = 'none';

  // Badge y textos
  const badgeEl = document.getElementById('oferta-badge-estado');
  const infoEl  = document.getElementById('oferta-info-txt');
  document.getElementById('oferta-periodo-txt').textContent = `Periodo ${oferta.periodo}`;

  if (oferta.estado === 'publicada') {
    badgeEl.className   = 'badge badge--ok badge--lg';
    badgeEl.textContent = 'Publicada';
    infoEl.textContent  = 'La oferta está visible para los alumnos. Ya no se pueden agregar ni eliminar grupos.';
    btnPub.disabled     = true;
    btnPub.textContent  = 'Ya publicada';
  } else {
    badgeEl.className   = 'badge badge--warn badge--lg';
    badgeEl.textContent = 'Borrador';
    infoEl.textContent  = `${grupos.length} grupo(s) registrado(s). Revisa y publica cuando estés listo.`;
    btnPub.disabled     = grupos.length === 0;
    btnPub.innerHTML    = `${icon('check', 16, 2)} Publicar oferta`;
  }

  // Filas de grupos
  const rowsEl = document.getElementById('oferta-rows');
  if (grupos.length === 0) {
    rowsEl.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:14px;">Sin grupos registrados.</div>`;
    return;
  }

  rowsEl.innerHTML = grupos.map(gr => {
    const estadoBadge = gr.estado === 'disponible'
      ? `<span class="badge badge--ok">Disponible</span>`
      : gr.estado === 'lleno'
        ? `<span class="badge badge--bad">Lleno</span>`
        : `<span class="badge badge--gray">Cancelado</span>`;

    return `<div class="oferta-table__row" style="display:grid;grid-template-columns:90px 1fr 1fr 1fr 100px 80px 100px;align-items:center;padding:12px 16px;gap:12px;">
      <span style="font-weight:800;color:var(--tinto-700);">${escapeHtml(gr.clave)}</span>
      <span style="font-size:13px;">${escapeHtml(gr.materia)}</span>
      <span style="font-size:13px;color:var(--muted);">${escapeHtml(gr.docente)}</span>
      <span style="font-size:13px;color:var(--muted);">${escapeHtml(gr.horario)}</span>
      <span style="font-size:13px;color:var(--muted);">${escapeHtml(gr.aula)}</span>
      <span style="font-size:13px;font-weight:700;text-align:center;">${gr.cupo_disponible}/${gr.cupo_max}</span>
      <span>${estadoBadge}</span>
    </div>`;
  }).join('');
}

// =====================================================
//  ACCIÓN — Crear grupo
// =====================================================
async function crearGrupo() {
  const btn       = document.getElementById('btn-crear');
  const errorEl   = document.getElementById('form-error');
  const id_materia = Number(document.getElementById('f-materia').value);
  const id_docente = Number(document.getElementById('f-docente').value);
  const id_aula    = Number(document.getElementById('f-aula').value);
  const id_horario = Number(document.getElementById('f-horario').value);
  const clave      = document.getElementById('f-clave').value.trim();
  const cupo_max   = Number(document.getElementById('f-cupo').value);

  errorEl.style.display = 'none';

  // Validación client-side
  if (!id_materia || !id_docente || !id_aula || !id_horario || !clave || !cupo_max) {
    errorEl.textContent   = 'Todos los campos son obligatorios.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled  = true;
  btn.innerHTML = `<span class="loader loader--tinto"></span> Creando...`;

  try {
    const res  = await fetch(`${API_URL}/api/coordinador/grupos`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        id_coordinador: usuario.id,
        id_materia, id_docente, id_aula, id_horario,
        clave, cupo_max
      })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent   = data.error || 'Error al crear el grupo.';
      errorEl.style.display = 'block';
    } else {
      showToast('Grupo creado', `El grupo ${clave} fue registrado correctamente.`, 'ok');
      limpiarFormulario();
      await cargarDatos();
    }

  } catch (err) {
    console.error('crearGrupo:', err);
    errorEl.textContent   = 'Error de conexión con el servidor.';
    errorEl.style.display = 'block';
  }

  btn.disabled  = false;
  btn.innerHTML = `${icon('plus', 16, 2)} Crear grupo`;
}

// =====================================================
//  ACCIÓN — Eliminar grupo
// =====================================================
async function eliminarGrupo(id_grupo) {
  if (!confirm('¿Seguro que deseas eliminar este grupo? Esta acción no se puede deshacer.')) return;

  try {
    const res  = await fetch(`${API_URL}/api/coordinador/grupos/${id_grupo}`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id_coordinador: usuario.id })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast('Error', data.error || 'No se pudo eliminar el grupo.', 'bad');
    } else {
      showToast('Grupo eliminado', data.mensaje || 'Grupo eliminado correctamente.', 'ok');
      await cargarDatos();
    }
  } catch (err) {
    console.error('eliminarGrupo:', err);
    showToast('Error de conexión', 'No se pudo conectar con el servidor.', 'bad');
  }
}

// =====================================================
//  ACCIÓN — Publicar oferta
// =====================================================
async function publicarOferta() {
  const btn = document.getElementById('btn-publicar');
  btn.disabled  = true;
  btn.innerHTML = `<span class="loader"></span> Publicando...`;

  try {
    const res  = await fetch(`${API_URL}/api/coordinador/oferta/publicar`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id_coordinador: usuario.id })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast('Error', data.error || 'No se pudo publicar la oferta.', 'bad');
      btn.disabled  = false;
      btn.innerHTML = `${icon('check', 16, 2)} Publicar oferta`;
    } else {
      showToast('¡Oferta publicada!', data.mensaje, 'ok');
      await cargarDatos();
    }
  } catch (err) {
    console.error('publicarOferta:', err);
    showToast('Error de conexión', 'No se pudo conectar con el servidor.', 'bad');
    btn.disabled  = false;
    btn.innerHTML = `${icon('check', 16, 2)} Publicar oferta`;
  }
}

// =====================================================
//  UTILIDADES
// =====================================================
function limpiarFormulario() {
  document.getElementById('f-materia').value  = '';
  document.getElementById('f-docente').value  = '';
  document.getElementById('f-aula').value     = '';
  document.getElementById('f-horario').value  = '';
  document.getElementById('f-clave').value    = '';
  document.getElementById('f-cupo').value     = '';
  document.getElementById('form-error').style.display = 'none';
}

// =====================================================
//  INICIALIZACIÓN
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
  usuario = requireAuth('../../index.html');
  if (!usuario) return;

  // Verificar que sea coordinador
  if (usuario.rol !== 'coordinador') {
    window.location.href = '../../index.html';
    return;
  }

  // Íconos del shell
  fillShell(usuario, '—');
  document.getElementById('header-user-role').textContent = 'Coordinador';
  document.getElementById('header-period-icon').innerHTML = icon('clock',    17);
  document.getElementById('ico-bell').innerHTML           = icon('bell',     20);
  document.getElementById('ico-logout').innerHTML         = icon('logout',   16, 2);
  document.getElementById('ico-nav-users').innerHTML      = icon('users',    21);
  document.getElementById('ico-nav-doc').innerHTML        = icon('doc',      21);
  document.getElementById('ico-btn-plus').innerHTML       = icon('plus',     16, 2);
  document.getElementById('ico-btn-publicar').innerHTML   = icon('check',    16, 2);

  // Cargar datos
  await cargarDatos();

  // Navegación
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.getAttribute('data-section');
      goSection(sec);
      if (sec === 'sec-oferta') renderOferta();
    });
  });

  // Crear grupo
  document.getElementById('btn-crear').addEventListener('click', crearGrupo);

  // ← AQUÍ — Clave automática al seleccionar materia
  document.getElementById('f-materia').addEventListener('change', () => {
  const id_materia = Number(document.getElementById('f-materia').value);
  if (!id_materia) {
    document.getElementById('f-clave').value = '';
    return;
  }
  const mat = catalogo.materias.find(m => m.id_materia === id_materia);
  const existentes = grupos.filter(g => g.materia_clave === mat?.clave).length;
  const letra = String.fromCharCode(65 + existentes);
  document.getElementById('f-clave').value = `${mat.clave}-${letra}`;
  });

// Publicar oferta
  document.getElementById('btn-publicar').addEventListener('click', publicarOferta);

  // Eliminar grupo — event delegation en la tabla
  document.getElementById('grupos-tbody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="eliminar"]');
    if (btn) eliminarGrupo(Number(btn.dataset.id));
  });

  // Link ir a grupos desde oferta vacía
  document.getElementById('link-ir-grupos').addEventListener('click', e => {
    e.preventDefault();
    goSection('sec-grupos');
  });

  // Cerrar sesión
  document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem('usuario');
    window.location.href = '../../index.html';
  });
});