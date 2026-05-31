// =====================================================
//  carga.js — Lógica de la página de carga académica
//  Depende de: app.js (API_URL, requireAuth, showToast,
//              icon, renderWeekGrid, goSection,
//              colorByClave, fillShell, escapeHtml)
// =====================================================

// ── Estado global ────────────────────────────────────
let PERIODO    = '—';
let CARGA_MAX  = 7;       // 7 regular · 4 irregular
let oferta     = [];      // materias con grupos del API
let inscritas  = {};      // { id_materia: grupoObj }
let alumnoInfo = {};      // { tipo_alumno, carrera }
let usuario    = {};      // sesión del sessionStorage

// =====================================================
//  CARGA INICIAL DESDE EL API
// =====================================================
async function cargarOferta() {
  try {
    const res  = await fetch(`${API_URL}/api/alumno/grupos?id_alumno=${usuario.id}`);
    const data = await res.json();

    if (!res.ok) {
      showToast('Error', data.error || 'No se pudo cargar la oferta.', 'bad');
      return;
    }

    PERIODO    = data.periodo  || '—';
    oferta     = data.materias || [];
    alumnoInfo = data.alumno   || {};
    CARGA_MAX  = alumnoInfo.tipo_alumno === 'irregular' ? 4 : 7;

    document.getElementById('header-period-text').textContent  = PERIODO;
    document.getElementById('sidebar-period-name').textContent = PERIODO;

    renderInfoEscolar();
    renderCatalogo();
    renderCarga();

  } catch {
    showToast('Error de conexión', 'No se pudo conectar con el servidor.', 'bad');
  }
}

// =====================================================
//  UTILIDADES
// =====================================================
function fmtHora(t) {
  return String(t).slice(0, 5);
}

function fmtHorario(grupo) {
  return `${grupo.horario.dias} · ${fmtHora(grupo.horario.hora_inicio)}–${fmtHora(grupo.horario.hora_fin)}`;
}

function horaANum(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h + (m || 0) / 60;
}

function chocan(a, b) {
  const diasA = a.horario.dias.split(/[,\-\s]+/).map(d => d.trim());
  const diasB = b.horario.dias.split(/[,\-\s]+/).map(d => d.trim());
  if (!diasA.some(d => diasB.includes(d))) return false;
  const iniA = horaANum(a.horario.hora_inicio), finA = horaANum(a.horario.hora_fin);
  const iniB = horaANum(b.horario.hora_inicio), finB = horaANum(b.horario.hora_fin);
  return iniA < finB && iniB < finA;
}

function tieneEmpalme(id_materia, id_grupo) {
  for (const [id_mat, grInscrito] of Object.entries(inscritas)) {
    if (Number(id_mat) === id_materia) continue;
    const matOferta = oferta.find(m => m.id_materia === Number(id_mat));
    if (!matOferta) continue;
    const grOferta = matOferta.grupos.find(g => g.id_grupo === grInscrito.id_grupo);
    const grNuevo  = oferta.find(m => m.id_materia === id_materia)?.grupos.find(g => g.id_grupo === id_grupo);
    if (grOferta && grNuevo && chocan(grNuevo, grOferta)) return true;
  }
  return false;
}

function creditosInscritos() {
  return Object.keys(inscritas).reduce((sum, id_mat) => {
    const mat = oferta.find(m => m.id_materia === Number(id_mat));
    return sum + (mat ? mat.creditos : 0);
  }, 0);
}

function inscritasToClases() {
  return Object.entries(inscritas).map(([id_mat, gr]) => {
    const mat  = oferta.find(m => m.id_materia === Number(id_mat));
    const dias = gr.horario.dias.split(/[,\-\s]+/).map(d => d.trim()).filter(Boolean);
    return {
      dias,
      ini:   horaANum(gr.horario.hora_inicio),
      fin:   horaANum(gr.horario.hora_fin),
      label: mat?.clave || '—',
      sub:   `${(mat?.nombre || '').slice(0, 18)} · ${gr.aula}`,
      color: colorByClave(mat?.clave || String(id_mat))
    };
  });
}

// =====================================================
//  RENDER — Información escolar
// =====================================================
function renderInfoEscolar() {
  const sel  = Object.keys(inscritas).length;
  const cred = creditosInscritos();

  document.getElementById('info-nombre').textContent       = usuario.nombre || '—';
  document.getElementById('info-carrera').textContent      = alumnoInfo.carrera || '—';
  document.getElementById('info-tipo').textContent         = alumnoInfo.tipo_alumno === 'irregular' ? 'Irregular' : 'Regular';
  document.getElementById('info-materias-sel').textContent = sel;
  document.getElementById('info-creditos-sel').textContent = cred;
  document.getElementById('info-carga-max').textContent    = `${CARGA_MAX} materias`;
  document.getElementById('info-estatus').innerHTML        = `${icon('check', 12, 2.5)} Activo`;
  document.getElementById('info-subtitulo').textContent    = `${alumnoInfo.carrera || '—'} · ${PERIODO}`;

  renderWeekGrid(document.getElementById('weekgrid-info'), inscritasToClases());
}

// =====================================================
//  RENDER — Catálogo de materias
// =====================================================
function renderCatalogo() {
  const sel  = Object.keys(inscritas).length;
  const cred = creditosInscritos();

  document.getElementById('sel-count').textContent      = sel;
  document.getElementById('sel-creditos').textContent   = cred;
  document.getElementById('sel-subtitulo').textContent  = `${alumnoInfo.carrera || '—'} · ${PERIODO}`;
  document.getElementById('sel-status-badge').innerHTML = `${icon('clock', 14)} Inscripciones abiertas`;
  document.getElementById('sel-prog-bar').style.width   = Math.min(100, sel / CARGA_MAX * 100) + '%';
  document.getElementById('btn-confirmar').disabled     = sel === 0;

  const cont = document.getElementById('catalogo-container');

  if (oferta.length === 0) {
    cont.innerHTML = `<div style="color:var(--muted);padding:40px 0;font-size:15px;">No hay grupos disponibles para este periodo.</div>`;
    return;
  }

  cont.innerHTML = oferta.map(mat => {
    const grupos = mat.grupos.map(gr => {
      const inscrito = inscritas[mat.id_materia]?.id_grupo === gr.id_grupo;
      const lleno    = gr.cupo_disponible <= 0;
      const empalme  = !inscrito && tieneEmpalme(mat.id_materia, gr.id_grupo);
      const pct      = Math.round((gr.cupo_max - gr.cupo_disponible) / gr.cupo_max * 100);

      let btnHtml;
      if (inscrito)
        btnHtml = `<button class="btn btn--ghost" style="padding:10px 14px;"
                     data-id-materia="${mat.id_materia}" data-id-grupo="${gr.id_grupo}"
                     data-action="toggle">${icon('check', 16, 2)} Inscrito</button>`;
      else if (lleno)
        btnHtml = `<button class="btn btn--default" style="padding:10px 14px;" disabled>Lleno</button>`;
      else if (empalme)
        btnHtml = `<button class="btn btn--danger" style="padding:10px 14px;"
                     data-action="empalme">${icon('alert', 15, 2)} Empalme</button>`;
      else
        btnHtml = `<button class="btn btn--primary" style="padding:10px 14px;"
                     data-id-materia="${mat.id_materia}" data-id-grupo="${gr.id_grupo}"
                     data-action="toggle">${icon('plus', 16, 2)} Agregar</button>`;

      return `<div class="grupo-row ${inscrito ? 'selected' : ''}">
        <span class="grupo-row__name">Grupo ${escapeHtml(gr.clave)}</span>
        <div class="grupo-row__info">
          <div class="grupo-row__docente">${escapeHtml(gr.docente)}</div>
          <div class="grupo-row__meta">
            <span>${icon('clock', 13)} ${escapeHtml(fmtHorario(gr))}</span>
            <span>${icon('pin', 13)} ${escapeHtml(gr.aula)}</span>
          </div>
        </div>
        <div class="grupo-row__cupo">
          <div class="grupo-row__cupo-txt ${lleno ? 'full' : ''}">${gr.cupo_disponible}/${gr.cupo_max} lugares</div>
          <div class="grupo-row__bar">
            <div class="grupo-row__bar-fill ${lleno ? 'full' : ''}" style="width:${pct}%"></div>
          </div>
        </div>
        ${btnHtml}
      </div>`;
    }).join('');

    return `<div class="card materia-card">
      <div class="materia-card__header">
        <span class="clave">${escapeHtml(mat.clave)}</span>
        <div class="flex-1">
          <div class="materia-card__name">${escapeHtml(mat.nombre)}</div>
          <div class="materia-card__sub">${mat.creditos} créditos</div>
        </div>
      </div>
      <div class="materia-card__grupos">${grupos}</div>
    </div>`;
  }).join('');

  // Event delegation — un solo listener en el contenedor
  cont.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action    = btn.dataset.action;
    const id_materia = Number(btn.dataset.idMateria || btn.dataset['id-materia']);
    const id_grupo   = Number(btn.dataset.idGrupo   || btn.dataset['id-grupo']);
    if (action === 'toggle')  toggleGrupo(id_materia, id_grupo);
    if (action === 'empalme') showToast('Empalme de horario', 'Este grupo se traslapa con otra materia seleccionada.', 'bad');
  });

  renderSelPanel();
}

function renderSelPanel() {
  const sel  = Object.entries(inscritas);
  const list = document.getElementById('sel-list');

  if (sel.length === 0) {
    list.innerHTML = `<div class="sel-panel__empty">Aún no has seleccionado materias.<br>Agrégalas desde el catálogo.</div>`;
    return;
  }

  list.innerHTML = sel.map(([id_mat, gr]) => {
    const mat = oferta.find(m => m.id_materia === Number(id_mat));
    return `<div class="sel-item">
      <span class="sel-item__dot" style="background:${escapeHtml(colorByClave(mat?.clave || id_mat))};"></span>
      <div class="sel-item__info">
        <div class="sel-item__name">${escapeHtml(mat?.nombre || '—')}</div>
        <div class="sel-item__sub">${escapeHtml(mat?.clave || '—')} · Grupo ${escapeHtml(gr.clave)} · ${escapeHtml(fmtHorario(gr))}</div>
      </div>
      <button class="sel-item__remove" data-action="quitar" data-id-mat="${id_mat}" title="Quitar">
        ${icon('x', 15)}
      </button>
    </div>`;
  }).join('');

  list.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="quitar"]');
    if (btn) quitarMateria(Number(btn.dataset.idMat || btn.dataset['id-mat']));
  });
}

// =====================================================
//  RENDER — Carga académica confirmada
// =====================================================
function renderCarga() {
  const sel  = Object.entries(inscritas);
  const cred = creditosInscritos();

  document.getElementById('carga-subtitulo').textContent = `${usuario.nombre || '—'} · ${PERIODO}`;
  document.getElementById('carga-badges').innerHTML = `
    <span class="badge badge--gray badge--lg">${escapeHtml(PERIODO)}</span>
    <span class="badge badge--tinto badge--lg">${sel.length} materias</span>
    <span class="badge badge--tinto badge--lg">${cred} créditos</span>
    ${sel.length > 0 ? `<span class="badge badge--ok badge--lg">${icon('check', 13, 2.5)} Inscrito</span>` : ''}
  `;

  const listEl = document.getElementById('carga-list');
  if (sel.length === 0) {
    listEl.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:20px 0;">No tienes materias inscritas aún.</div>`;
  } else {
    listEl.innerHTML = sel.map(([id_mat, gr]) => {
      const mat = oferta.find(m => m.id_materia === Number(id_mat));
      return `<div class="list-item">
        <span class="clave">${escapeHtml(mat?.clave || '—')}</span>
        <div class="list-item__body">
          <div class="list-item__title">${escapeHtml(mat?.nombre || '—')}</div>
          <div class="list-item__meta">
            <span class="list-item__meta-item">${icon('user', 13)} ${escapeHtml(gr.docente)}</span>
            <span class="list-item__meta-item">${icon('pin', 13)} ${escapeHtml(gr.aula)}</span>
            <span class="list-item__meta-item">${icon('clock', 13)} ${escapeHtml(fmtHorario(gr))}</span>
          </div>
        </div>
        <span style="font-size:13px;font-weight:700;color:var(--tinto-700);">${mat?.creditos || 0} créd.</span>
      </div>`;
    }).join('');
  }

  renderWeekGrid(document.getElementById('weekgrid-carga'), inscritasToClases());
}

// =====================================================
//  ACCIONES
// =====================================================
function toggleGrupo(id_materia, id_grupo) {
  if (inscritas[id_materia]?.id_grupo === id_grupo) {
    delete inscritas[id_materia];
  } else {
    if (Object.keys(inscritas).length >= CARGA_MAX) {
      showToast('Carga máxima', `No puedes inscribir más de ${CARGA_MAX} materias.`, 'bad');
      return;
    }
    if (tieneEmpalme(id_materia, id_grupo)) {
      showToast('Empalme de horario', 'Este grupo se traslapa con otra materia seleccionada.', 'bad');
      return;
    }
    const mat = oferta.find(m => m.id_materia === id_materia);
    const gr  = mat?.grupos.find(g => g.id_grupo === id_grupo);
    if (!gr) return;
    inscritas[id_materia] = gr;
  }
  renderCatalogo();
  renderCarga();
  renderWeekGrid(document.getElementById('weekgrid-info'), inscritasToClases());
}

function quitarMateria(id_materia) {
  delete inscritas[id_materia];
  renderCatalogo();
  renderCarga();
  renderWeekGrid(document.getElementById('weekgrid-info'), inscritasToClases());
}

// =====================================================
//  CONFIRMAR INSCRIPCIÓN → POST /api/alumno/carga
// =====================================================
async function confirmarInscripcion() {
  const btn = document.getElementById('btn-confirmar');
  btn.disabled  = true;
  btn.innerHTML = `<span class="loader"></span> Inscribiendo...`;

  const grupos   = Object.values(inscritas);
  let exitosos   = 0;
  const errores  = [];

  for (const gr of grupos) {
    try {
      const res  = await fetch(`${API_URL}/api/alumno/carga`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id_alumno: usuario.id, id_grupo: gr.id_grupo, periodo: PERIODO })
      });
      const data = await res.json();
      if (res.ok) {
        exitosos++;
      } else {
        const mat = oferta.find(m => m.grupos.some(g => g.id_grupo === gr.id_grupo));
        errores.push(`${mat?.clave || gr.id_grupo}: ${data.error}`);
      }
    } catch {
      errores.push(`Grupo ${gr.id_grupo}: error de conexión`);
    }
  }

  btn.disabled  = false;
  btn.innerHTML = `${icon('check', 16, 2)} Confirmar inscripción`;

  if (errores.length === 0) {
    showToast('¡Inscripción completada!', `${exitosos} materias inscritas correctamente.`, 'ok');
    goSection('sec-carga');
    renderCarga();
  } else if (exitosos > 0) {
    showToast('Inscripción parcial', `${exitosos} inscritas. Errores: ${errores.join(' | ')}`, 'bad');
    goSection('sec-carga');
    renderCarga();
  } else {
    showToast('Error en la inscripción', errores.join(' | '), 'bad');
  }

  await cargarOferta();
}

// =====================================================
//  INICIALIZACIÓN
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
  usuario = requireAuth('../../index.html');
  if (!usuario) return;

  // Íconos del shell
  fillShell(usuario, '—');
  document.getElementById('header-user-role').textContent = 'Alumno';
  document.getElementById('header-period-icon').innerHTML = icon('clock', 17);
  document.getElementById('ico-bell').innerHTML           = icon('bell', 20);
  document.getElementById('ico-logout').innerHTML         = icon('logout', 16, 2);
  document.getElementById('ico-nav-id').innerHTML         = icon('id', 21);
  document.getElementById('ico-nav-addbook').innerHTML    = icon('addbook', 21);
  document.getElementById('ico-nav-doc').innerHTML        = icon('doc', 21);
  document.getElementById('ico-btn-check').innerHTML      = icon('check', 16, 2);

  // Cargar oferta desde el API
  await cargarOferta();

  // Navegación entre secciones
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.getAttribute('data-section');
      goSection(sec);
      if (sec === 'sec-info')      renderInfoEscolar();
      if (sec === 'sec-seleccion') renderCatalogo();
      if (sec === 'sec-carga')     renderCarga();
    });
  });

  // Confirmar inscripción
  document.getElementById('btn-confirmar').addEventListener('click', confirmarInscripcion);

  // Cerrar sesión
  document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem('usuario');
    window.location.href = '../../index.html';
  });
});