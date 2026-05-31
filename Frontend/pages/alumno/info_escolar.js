// =====================================================
//  info_escolar.js — lógica de la página
//  Depende de: app.js (requireAuth, fillShell, showToast,
//              icon, escapeHtml, renderWeekGrid, goSection,
//              colorByClave, API_URL)
// =====================================================

let usuario  = {};
let infoData = {};   // { alumno, carga, grupos, periodo }

// ── Utilidades ───────────────────────────────────────
function fmtHora(t) { return String(t).slice(0, 5); }

function fmtHorario(gr) {
  return `${gr.horario.dias} · ${fmtHora(gr.horario.hora_inicio)}–${fmtHora(gr.horario.hora_fin)}`;
}

function horaANum(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h + (m || 0) / 60;
}

function gruposToClases(grupos) {
  return grupos.map(gr => {
    const dias = gr.horario.dias.split(/[,\-\s]+/).map(d => d.trim()).filter(Boolean);
    return {
      dias,
      ini:   horaANum(gr.horario.hora_inicio),
      fin:   horaANum(gr.horario.hora_fin),
      label: gr.materia_clave || gr.materia,
      sub:   `${gr.materia.slice(0, 18)} · ${gr.aula}`,
      color: colorByClave(gr.materia_clave || gr.materia)
    };
  });
}

// ── Carga de datos desde el API ───────────────────────
async function cargarInfo() {
  try {
    const res  = await fetch(`${API_URL}/api/alumno/info?id_alumno=${usuario.id}`);
    const data = await res.json();

    if (!res.ok) {
      showToast('Error', data.error || 'No se pudo cargar la información.', 'bad');
      return;
    }

    infoData = data;

    if (data.periodo) {
      document.getElementById('header-period-text').textContent  = data.periodo;
      document.getElementById('sidebar-period-name').textContent = data.periodo;
    }

    renderPerfil();
    renderKardex();
    renderHorario();

  } catch {
    showToast('Error de conexión', 'No se pudo conectar con el servidor.', 'bad');
  }
}

// ── Render: Perfil escolar ────────────────────────────
function renderPerfil() {
  const { alumno, carga, grupos } = infoData;

  document.getElementById('perfil-loading').style.display = 'none';
  document.getElementById('perfil-content').style.display = 'block';

  document.getElementById('perfil-subtitulo').textContent = `${alumno.carrera} · Semestre ${alumno.semestre}`;
  document.getElementById('p-nombre').textContent         = alumno.nombre;
  document.getElementById('p-email').textContent          = alumno.email;
  document.getElementById('p-matricula').textContent      = alumno.matricula;
  document.getElementById('p-carrera').textContent        = alumno.carrera;
  document.getElementById('p-semestre').textContent       = `${alumno.semestre}°`;
  document.getElementById('p-tipo').textContent           = alumno.tipo_alumno === 'irregular' ? 'Irregular' : 'Regular';

  const estadoBadge = document.getElementById('p-estado');
  if (alumno.estado_pago === 'vigente') {
    estadoBadge.className   = 'badge badge--ok';
    estadoBadge.textContent = 'Pago vigente';
  } else {
    estadoBadge.className   = 'badge badge--bad';
    estadoBadge.textContent = 'Adeudo pendiente';
  }

  const totalCreditos = (grupos || []).reduce((s, g) => s + (g.creditos || 0), 0);

  document.getElementById('p-stat-materias').textContent = grupos?.length ?? 0;
  document.getElementById('p-stat-creditos').textContent = totalCreditos;
  document.getElementById('p-stat-periodo').textContent  = infoData.periodo || '—';
  document.getElementById('p-stat-estado').textContent   = carga
    ? (carga.estado === 'finalizada' ? 'Finalizada' : 'En proceso')
    : 'Sin carga';
}

// ── Render: Kardex ────────────────────────────────────
function renderKardex() {
  const { alumno, grupos, periodo } = infoData;

  document.getElementById('kardex-loading').style.display = 'none';
  document.getElementById('kardex-subtitulo').textContent = `${alumno.carrera} · ${periodo || '—'}`;

  if (!grupos || grupos.length === 0) {
    document.getElementById('kardex-empty').style.display = 'block';
    return;
  }

  document.getElementById('kardex-content').style.display = 'block';

  const totalCred = grupos.reduce((s, g) => s + (g.creditos || 0), 0);
  document.getElementById('kardex-creditos-badge').textContent = `${totalCred} créditos`;
  document.getElementById('kardex-total-mat').textContent      = grupos.length;
  document.getElementById('kardex-total-cred').textContent     = totalCred;

  const tbody = document.getElementById('kardex-tbody');
  tbody.innerHTML = grupos.map((gr, i) => {
    const bg  = i % 2 === 0 ? 'var(--bg)' : '#fff';
    const dot = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                  background:${escapeHtml(colorByClave(gr.materia_clave || gr.materia))};
                  margin-right:8px;vertical-align:middle;"></span>`;
    return `<tr style="background:${bg};font-size:14px;">
      <td style="padding:11px 16px;">
        <span class="clave" style="font-size:11px;">${escapeHtml(gr.materia_clave)}</span>
      </td>
      <td style="padding:11px 16px;font-weight:600;">${dot}${escapeHtml(gr.materia)}</td>
      <td style="padding:11px 16px;color:var(--muted);">${escapeHtml(gr.clave)}</td>
      <td style="padding:11px 16px;color:var(--muted);">${escapeHtml(gr.docente)}</td>
      <td style="padding:11px 16px;color:var(--muted);">${escapeHtml(fmtHorario(gr))}</td>
      <td style="padding:11px 16px;color:var(--muted);">${escapeHtml(gr.aula)}</td>
      <td style="padding:11px 8px;text-align:center;font-weight:800;color:var(--tinto-700);">${gr.creditos}</td>
    </tr>`;
  }).join('');
}

// ── Render: Horario ───────────────────────────────────
function renderHorario() {
  const { alumno, grupos, periodo } = infoData;

  document.getElementById('horario-loading').style.display = 'none';
  document.getElementById('horario-subtitulo').textContent = `${alumno.nombre} · ${periodo || '—'}`;

  if (!grupos || grupos.length === 0) {
    document.getElementById('horario-empty').style.display = 'block';
    return;
  }

  document.getElementById('horario-content').style.display = 'block';

  const listEl = document.getElementById('horario-list');
  listEl.innerHTML = grupos.map(gr => `
    <div class="list-item">
      <span class="clave">${escapeHtml(gr.materia_clave)}</span>
      <div class="list-item__body">
        <div class="list-item__title">${escapeHtml(gr.materia)}</div>
        <div class="list-item__meta">
          <span class="list-item__meta-item">${icon('user',  13)} ${escapeHtml(gr.docente)}</span>
          <span class="list-item__meta-item">${icon('pin',   13)} ${escapeHtml(gr.aula)}</span>
          <span class="list-item__meta-item">${icon('clock', 13)} ${escapeHtml(fmtHorario(gr))}</span>
        </div>
      </div>
      <span style="font-size:13px;font-weight:700;color:var(--tinto-700);">${gr.creditos} créd.</span>
    </div>
  `).join('');

  renderWeekGrid(
    document.getElementById('weekgrid-horario'),
    gruposToClases(grupos)
  );
}

// ── Inicialización ────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  usuario = requireAuth('../../index.html');
  if (!usuario) return;

  fillShell(usuario, '—');
  document.getElementById('header-user-role').textContent  = 'Alumno';
  document.getElementById('header-period-icon').innerHTML  = icon('clock',    17);
  document.getElementById('ico-bell').innerHTML            = icon('bell',     20);
  document.getElementById('ico-logout').innerHTML          = icon('logout',   16, 2);
  document.getElementById('ico-nav-id').innerHTML          = icon('id',       21);
  document.getElementById('ico-nav-doc').innerHTML         = icon('doc',      21);
  document.getElementById('ico-nav-calendar').innerHTML    = icon('calendar', 21);
  document.getElementById('ico-profile-user').innerHTML    = icon('user',     36, 1.4);

  await cargarInfo();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => goSection(btn.dataset.section));
  });

  document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem('usuario');
    window.location.href = '../../index.html';
  });
});