/**
 * script/register.js — Presenter halaman register.html
 * API_BASE tersedia dari auth.js (window.API_BASE)
 */

// Jika sudah login, redirect ke beranda
if (isLoggedIn()) {
  window.location.href = 'index.html';
}

// ============================================================
// Elemen DOM
// ============================================================
const registerForm  = document.getElementById('registerForm');
const nameInput     = document.getElementById('nameInput');
const emailInput    = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const registerError = document.getElementById('registerError');
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
// Submit Register
// ============================================================
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name     = nameInput.value.trim();
  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  // Validasi sisi klien
  if (!name || !email || !password) {
    showError('Semua field wajib diisi.');
    return;
  }
  if (password.length < 6) {
    showError('Password minimal 6 karakter.');
    return;
  }

  setLoading(true);
  hideError();

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Registrasi gagal.');
      setLoading(false);
      return;
    }

    // Simpan session langsung setelah register
    saveSession(data.token, data.user);

    // Redirect ke beranda
    window.location.href = 'index.html';

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
  registerError.textContent = msg;
  registerError.classList.remove('hidden');
}

function hideError() {
  registerError.classList.add('hidden');
}

function setLoading(loading) {
  submitBtn.disabled    = loading;
  submitBtn.textContent = loading ? 'Memproses...' : 'Buat Akun';
}
