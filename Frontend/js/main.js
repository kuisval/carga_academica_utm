// =====================================================
//  main.js – Lógica del login
//  Llama a POST /api/auth/login en el backend
// =====================================================

const form       = document.getElementById('loginForm');
const btnLogin   = document.getElementById('btnLogin');
const btnText    = document.getElementById('btnText');
const btnLoader  = document.getElementById('btnLoader');
const API_URL = 'http://localhost:3000';

// --- Helpers UI ---

function setLoading(on) {
  btnLogin.disabled = on;
  btnText.textContent = on ? 'Verificando...' : 'Entrar';
  btnLoader.classList.toggle('hidden', !on);
}

function clearErrors() {
  document.getElementById('err-matricula').textContent = '';
  document.getElementById('err-password').textContent  = '';
  document.getElementById('err-global').textContent    = '';
  document.getElementById('matricula').classList.remove('input-error');
  document.getElementById('password').classList.remove('input-error');
}

function showFieldError(fieldId, msg) {
  document.getElementById('err-' + fieldId).textContent = msg;
  document.getElementById(fieldId).classList.add('input-error');
}

function showGlobalError(msg) {
  document.getElementById('err-global').textContent = msg;
}

// --- Validación local ---

function validate(matricula, password) {
  let ok = true;
  if (!matricula.trim()) {
    showFieldError('matricula', 'Ingresa tu matrícula.');
    ok = false;
  }
  if (!password) {
    showFieldError('password', 'Ingresa tu contraseña.');
    ok = false;
  }
  return ok;
}

// --- Submit ---

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const matricula = document.getElementById('matricula').value.trim();
  const password  = document.getElementById('password').value;

  if (!validate(matricula, password)) return;

  setLoading(true);

  try {
const res = await fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ matricula, password })
});

// Agrega esto temporalmente:
const texto = await res.text();
console.log('Respuesta del servidor:', texto);

    const data = await res.json();

    if (!res.ok) {
      // El backend devuelve { error: 'mensaje' }
      showGlobalError(data.error || 'Credenciales incorrectas.');
      return;
    }

    // Login exitoso – data contiene { rol, id, nombre }
    // Guardamos info mínima en sessionStorage para usarla en otras páginas
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
        showGlobalError('Rol no reconocido. Contacta a soporte.');
    }

  } catch (err) {
  console.log('Error completo:', err);  // agrega esta línea
  showGlobalError('No se pudo conectar con el servidor. Intenta más tarde.');
} finally {
    setLoading(false);
  }
});