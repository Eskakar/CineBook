/**
 * script/login.js — Presenter halaman login.html
 * API_BASE tersedia dari auth.js (window.API_BASE)
 */

// Jika sudah login, redirect langsung
if (isLoggedIn()) {
  const params   = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect') || 'index.html';
  window.location.href = redirect;
}

// ============================================================
// Elemen DOM
// ============================================================
const loginForm     = document.getElementById('loginForm');
const emailInput    = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginError    = document.getElementById('loginError');
const submitBtn     = document.getElementById('submitBtn');
const togglePwdBtn  = document.getElementById('togglePassword');

// ============================================================
// Toggle tampilkan/sembunyikan password
// ============================================================
togglePwdBtn.addEventListener('click', () => {
  const isText = passwordInput.type === 'text';
  passwordInput.type = isText ? 'password' : 'text';
  togglePwdBtn.textContent = isText ? '👁' : '🙈';
});

// ============================================================
// Submit Login
// ============================================================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  // Validasi sisi klien
  if (!email || !password) {
    showError('Email dan password wajib diisi.');
    return;
  }

  setLoading(true);
  hideError();

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Login gagal.');
      setLoading(false);
      return;
    }

    // Simpan session
    saveSession(data.token, data.user);

    // Redirect ke halaman asal, tapi jangan ke register.html atau login.html sendiri
    const params   = new URLSearchParams(window.location.search);
    let redirect   = params.get('redirect') || 'index.html';
    const blocked  = ['register.html', 'login.html'];
    if (blocked.some(p => redirect.includes(p))) redirect = 'index.html';
    window.location.href = redirect;

  } catch (err) {
    showError('Gagal terhubung ke server.');
    setLoading(false);
    console.error(err);
  }
});

// ============================================================
// Helpers
// ============================================================
function showError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
}

function hideError() {
  loginError.classList.add('hidden');
}

function setLoading(loading) {
  submitBtn.disabled     = loading;
  submitBtn.textContent  = loading ? 'Memproses...' : 'Masuk';
}
