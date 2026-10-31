/**
 * script/auth.js — Helper autentikasi bersama (dipakai semua halaman)
 * Simpan/hapus/baca token dari localStorage, update navbar
 * Didefinisikan di window agar tidak konflik saat multi-script di-load
 */

const AUTH_KEY  = 'cinebook_token';
const USER_KEY  = 'cinebook_user';
// API_BASE didefinisikan sebagai window property agar bisa diakses semua script
// tanpa redeclaration error
window.API_BASE = 'http://localhost:3000/api';

// ============================================================
// Token & Session helpers
// ============================================================

/** Simpan token dan data user ke localStorage */
function saveSession(token, user) {
  localStorage.setItem(AUTH_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Hapus session (logout) */
function clearSession() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Ambil token dari localStorage */
function getToken() {
  return localStorage.getItem(AUTH_KEY);
}

/** Ambil data user dari localStorage */
function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Cek apakah user sedang login */
function isLoggedIn() {
  return !!getToken();
}

/**
 * Buat header Authorization untuk fetch API.
 * @returns {Object} headers object
 */
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

// ============================================================
// Redirect helpers
// ============================================================

/** Redirect ke login jika belum login */
function requireLogin(redirectBack = true) {
  if (!isLoggedIn()) {
    const current = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = redirectBack
      ? `login.html?redirect=${current}`
      : 'login.html';
  }
}

// ============================================================
// Navbar — render dinamis berdasarkan status login
// ============================================================

/**
 * Panggil di setiap halaman. Inject elemen auth ke #navAuth.
 * HTML harus punya <div id="navAuth"></div> di dalam navbar.
 */
function renderNavAuth() {
  const navAuth = document.getElementById('navAuth');
  if (!navAuth) return;

  const user = getUser();

  if (user) {
    navAuth.innerHTML = `
      <span class="text-slate-300 text-sm hidden sm:inline">👋 ${escapeHtml(user.name)}</span>
      <a href="my-tickets.html" class="text-slate-300 hover:text-red-400 text-sm font-medium transition flex items-center gap-1">
        🎟️ <span>Tiket Saya</span>
      </a>
      <button id="logoutBtn" class="text-slate-400 hover:text-white text-sm transition">Keluar</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => {
      clearSession();
      window.location.href = 'index.html';
    });
  } else {
    navAuth.innerHTML = `
      <a href="my-tickets.html" class="text-slate-300 hover:text-red-400 text-sm font-medium transition flex items-center gap-1">
        🎟️ <span class="hidden sm:inline">Tiket Saya</span>
      </a>
      <a href="login.html" class="text-slate-300 hover:text-white text-sm transition">Masuk</a>
      <a href="register.html" class="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">Daftar</a>
    `;
  }
}

/** Escape HTML sederhana */
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Jalankan renderNavAuth saat DOM siap
document.addEventListener('DOMContentLoaded', renderNavAuth);
