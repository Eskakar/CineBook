/**
 * script/main.js — Presenter halaman index.html
 * Fetch daftar film dari API, render ke DOM, tampilkan modal jadwal
 */

// API_BASE tersedia dari auth.js (window.API_BASE)

// ============================================================
// Elemen DOM
// ============================================================
const movieGrid       = document.getElementById('movieGrid');
const loadingMovies   = document.getElementById('loadingMovies');
const errorMovies     = document.getElementById('errorMovies');
const movieModal      = document.getElementById('movieModal');
const closeModalBtn   = document.getElementById('closeModal');
const scheduleList    = document.getElementById('scheduleList');
const loadingSchedules = document.getElementById('loadingSchedules');
const noSchedule      = document.getElementById('noSchedule');

// ============================================================
// Utilitas
// ============================================================

/** Format harga ke format Rupiah */
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID').format(amount);
}

/** Format ISO datetime ke tampilan lokal */
function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Tampilkan toast notifikasi */
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show ${type}`;
  setTimeout(() => { toast.className = ''; }, 3000);
}

// ============================================================
// Fetch & Render Film
// ============================================================

async function loadMovies() {
  try {
    const res = await fetch(`${API_BASE}/movies`);
    if (!res.ok) throw new Error('API error');
    const movies = await res.json();

    loadingMovies.style.display = 'none';

    if (movies.length === 0) {
      errorMovies.textContent = 'Belum ada film tersedia.';
      errorMovies.classList.remove('hidden');
      return;
    }

    movieGrid.classList.remove('hidden');
    movies.forEach(movie => {
      const card = createMovieCard(movie);
      movieGrid.appendChild(card);
    });
  } catch (err) {
    loadingMovies.style.display = 'none';
    errorMovies.classList.remove('hidden');
    console.error('Gagal memuat film:', err);
  }
}

/**
 * Buat elemen card film.
 * @param {Object} movie
 * @returns {HTMLElement}
 */
function createMovieCard(movie) {
  const div = document.createElement('div');
  div.classList.add('movie-card');
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.setAttribute('aria-label', `Lihat detail ${movie.title}`);

  div.innerHTML = `
    <img src="${movie.poster_url}" alt="${movie.title}" loading="lazy"
         onerror="this.src='https://placehold.co/300x450/1a1a2e/555?text=No+Image'" />
    <div class="p-3">
      <h3 class="text-white font-semibold text-sm leading-tight mb-1 line-clamp-2">${movie.title}</h3>
      <span class="genre-badge">${movie.genre}</span>
      <p class="text-slate-500 text-xs mt-2">⏱ ${movie.duration} mnt</p>
    </div>
  `;

  // Klik atau tekan Enter untuk buka modal
  div.addEventListener('click', () => openMovieModal(movie));
  div.addEventListener('keydown', e => { if (e.key === 'Enter') openMovieModal(movie); });

  return div;
}

// ============================================================
// Modal Detail Film & Jadwal
// ============================================================

async function openMovieModal(movie) {
  // Isi data film ke modal
  document.getElementById('modalPoster').src    = movie.poster_url;
  document.getElementById('modalPoster').alt    = movie.title;
  document.getElementById('modalTitle').textContent    = movie.title;
  document.getElementById('modalGenre').textContent    = movie.genre;
  document.getElementById('modalDuration').textContent = movie.duration;
  document.getElementById('modalSynopsis').textContent = movie.synopsis;

  // Reset jadwal
  scheduleList.classList.add('hidden');
  scheduleList.innerHTML = '';
  noSchedule.classList.add('hidden');
  loadingSchedules.style.display = 'block';

  // Buka modal
  movieModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Fetch jadwal film
  try {
    const res = await fetch(`${API_BASE}/schedules?movie_id=${movie.id}`);
    if (!res.ok) throw new Error();
    const schedules = await res.json();

    loadingSchedules.style.display = 'none';

    if (schedules.length === 0) {
      noSchedule.classList.remove('hidden');
      return;
    }

    scheduleList.classList.remove('hidden');
    schedules.forEach(schedule => {
      const btn = document.createElement('button');
      btn.classList.add('schedule-btn');
      btn.innerHTML = `
        📅 ${formatDateTime(schedule.show_time)}<br/>
        <small>${schedule.studio} · Rp ${formatRupiah(schedule.price)}</small>
      `;
      btn.addEventListener('click', () => {
        // Simpan info jadwal ke sessionStorage agar booking.js bisa membacanya
        sessionStorage.setItem('selectedSchedule', JSON.stringify(schedule));
        // Navigasi ke halaman booking
        window.location.href = `booking.html?schedule_id=${schedule.id}`;
      });
      scheduleList.appendChild(btn);
    });
  } catch (err) {
    loadingSchedules.style.display = 'none';
    noSchedule.textContent = 'Gagal memuat jadwal.';
    noSchedule.classList.remove('hidden');
  }
}

function closeModal() {
  movieModal.classList.remove('open');
  document.body.style.overflow = '';
}

// Tutup modal via tombol & klik backdrop
closeModalBtn.addEventListener('click', closeModal);
movieModal.addEventListener('click', (e) => {
  if (e.target === movieModal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ============================================================
// Init
// ============================================================
loadMovies();
