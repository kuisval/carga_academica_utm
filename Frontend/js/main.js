// =====================================================
//  main.js — Lógica del Login
//  POST /api/auth/login → { rol, id, nombre }
// =====================================================

// API_URL se define en app.js (cargado antes que este script)
// para configurarla sin tocar el código: window.APP_CONFIG = { API_URL: '...' }

const form      = document.getElementById('loginForm');
const btnLogin  = document.getElementById('btnLogin');
const btnText   = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const errBox    = document.getElementById('loginError');
const errMsg    = document.getElementById('loginErrorMsg');

function setLoading(on) {
  btnLogin.disabled = on;
  btnText.textContent = on ? 'Verificando...' : 'Ingresar';
  btnLoader.classList.toggle('hidden', !on);
}

function showError(msg) {
  // errIco ya tiene el SVG pre-renderizado en index.html
  errMsg.textContent = msg;
  errBox.classList.remove('hidden');
  document.getElementById('email').classList.add('field__input--error');
  document.getElementById('password').classList.add('field__input--error');
}

function clearError() {
  errBox.classList.add('hidden');
  errMsg.textContent = '';
  document.getElementById('email').classList.remove('field__input--error');
  document.getElementById('password').classList.remove('field__input--error');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showError('Ingresa tu correo y contraseña para continuar.');
    return;
  }

  setLoading(true);

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
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
