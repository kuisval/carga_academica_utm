// =====================================================
//  main.js — Lógica del Login
//  POST /api/auth/login → { rol, id, nombre }
// =====================================================

const API_URL = 'http://localhost:3000';

const form      = document.getElementById('loginForm');
const btnLogin  = document.getElementById('btnLogin');
const btnText   = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const errBox    = document.getElementById('loginError');
const errMsg    = document.getElementById('loginErrorMsg');
const errIco    = document.getElementById('loginErrorIcon');

function setLoading(on) {
  btnLogin.disabled = on;
  btnText.textContent = on ? 'Verificando...' : 'Ingresar';
  btnLoader.classList.toggle('hidden', !on);
}

function showError(msg) {
  errIco.innerHTML = icon('alert', 16, 2);
  errMsg.textContent = msg;
  errBox.classList.remove('hidden');
  document.getElementById('matricula').classList.add('field__input--error');
  document.getElementById('password').classList.add('field__input--error');
}

function clearError() {
  errBox.classList.add('hidden');
  errMsg.textContent = '';
  document.getElementById('matricula').classList.remove('field__input--error');
  document.getElementById('password').classList.remove('field__input--error');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const matricula = document.getElementById('matricula').value.trim();
  const password  = document.getElementById('password').value;

  // Validación local
  if (!matricula || !password) {
    showError('Ingresa tu matrícula y contraseña para continuar.');
    return;
  }

  setLoading(true);

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ matricula, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Credenciales incorrectas.');
      return;
    }

    // Guardar sesión
    sessionStorage.setItem('usuario', JSON.stringify(data));

    // Redirigir según rol
    switch (data.rol) {
      case 'alumno':
        window.location.href = 'pages/alumno/carga.html';
        break;
      case 'coordinador':
        window.location.href = 'pages/coordinador/grupos.html';
        break;
      case 'docente':
        window.location.href = 'pages/docente/horario.html';
        break;
      default:
        showError('Rol no reconocido. Contacta a soporte.');
    }

  } catch {
    showError('No se pudo conectar con el servidor. Intenta más tarde.');
  } finally {
    setLoading(false);
  }
});
