/**
 * script/my-tickets.js — Presenter halaman my-tickets.html
 * Cari semua tiket berdasarkan email, tampilkan daftar & modal detail
 * API_BASE tersedia dari auth.js (window.API_BASE)
 */

// ============================================================
// Elemen DOM
// ============================================================
const searchForm     = document.getElementById('searchForm');
const emailInput     = document.getElementById('emailInput');
const formError      = document.getElementById('formError');
const loadingEl      = document.getElementById('loadingTickets');
const emptyStateEl   = document.getElementById('emptyState');
const noResultsEl    = document.getElementById('noResults');
const ticketListEl   = document.getElementById('ticketList');

// Modal
const ticketModal     = document.getElementById('ticketModal');
const closeModalBtn   = document.getElementById('closeTicketModal');

// ============================================================
// Utilitas
// ============================================================
function formatRupiah(amount) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount);
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show ${type}`;
  setTimeout(() => { toast.className = ''; }, 3000);
}

/** Menentukan apakah jadwal sudah lewat */
function isPast(isoTime) {
  return new Date(isoTime) < new Date();
}

// ============================================================
// Fetch tiket — pakai JWT jika sudah login, fallback email query
// ============================================================
async function searchTickets(email) {
  emptyStateEl.classList.add('hidden');
  noResultsEl.classList.add('hidden');
  ticketListEl.classList.add('hidden');
  ticketListEl.innerHTML = '';
  loadingEl.classList.remove('hidden');

  try {
    let res;
    if (isLoggedIn()) {
      // User login: gunakan JWT, endpoint tanpa parameter email
      res = await fetch(`${API_BASE}/bookings`, { headers: authHeaders() });
    } else {
      // Fallback: cari berdasarkan email (untuk user yang belum login)
      res = await fetch(`${API_BASE}/bookings?email=${encodeURIComponent(email)}`);
    }

    if (res.status === 401) {
      clearSession();
      loadingEl.classList.add('hidden');
      noResultsEl.classList.remove('hidden');
      return;
    }
    if (!res.ok) throw new Error('API error');
    const tickets = await res.json();

    loadingEl.classList.add('hidden');

    if (tickets.length === 0) {
      noResultsEl.classList.remove('hidden');
      return;
    }

    // Render daftar tiket
    ticketListEl.classList.remove('hidden');
    tickets.forEach(ticket => {
      const card = createTicketCard(ticket);
      ticketListEl.appendChild(card);
    });

    showToast(`${tickets.length} tiket ditemukan`, 'success');
  } catch (err) {
    loadingEl.classList.add('hidden');
    noResultsEl.classList.remove('hidden');
    console.error('Gagal memuat tiket:', err);
  }
}

// ============================================================
// Buat elemen card tiket
// ============================================================
/**
 * @param {Object} ticket - Data booking dari API
 * @returns {HTMLElement}
 */
function createTicketCard(ticket) {
  const past = isPast(ticket.show_time);

  const li = document.createElement('div');
  li.className = `
    bg-[#1a1a2e] border rounded-xl overflow-hidden
    transition-all duration-200 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-900/20
    ${past ? 'border-white/5 opacity-70' : 'border-white/10'}
  `.trim().replace(/\s+/g, ' ');

  li.innerHTML = `
    <div class="flex gap-4 p-4">
      <!-- Poster -->
      <img
        src="${ticket.poster_url}"
        alt="${ticket.movie_title}"
        class="w-16 rounded-lg object-cover flex-shrink-0 ${past ? 'grayscale' : ''}"
        style="aspect-ratio:2/3;"
        onerror="this.src='https://placehold.co/300x450/1a1a2e/555?text=No+Image'"
      />

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2 mb-1">
          <h3 class="text-white font-bold text-base leading-tight truncate">${ticket.movie_title}</h3>
          ${past
            ? '<span class="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Selesai</span>'
            : '<span class="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900/60 text-green-400 border border-green-700">Aktif</span>'
          }
        </div>
        <p class="genre-badge mb-2">${ticket.genre}</p>
        <p class="text-slate-400 text-xs">📅 ${formatDateTime(ticket.show_time)}</p>
        <p class="text-slate-400 text-xs">🏠 ${ticket.studio}</p>

        <!-- Kursi & harga -->
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <div class="flex flex-wrap gap-1">
            ${ticket.seats.map(s =>
              `<span class="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">${s}</span>`
            ).join('')}
          </div>
          <span class="text-yellow-400 font-bold text-sm flex-shrink-0">${formatRupiah(ticket.total_price)}</span>
        </div>
      </div>
    </div>

    <!-- Footer card -->
    <div class="border-t border-white/5 px-4 py-2 flex items-center justify-between bg-black/20">
      <span class="text-slate-500 text-xs font-mono">${ticket.booking_code}</span>
      <button
        class="text-red-400 hover:text-red-300 text-xs font-semibold transition detail-btn"
        data-ticket='${JSON.stringify(ticket)}'
      >
        Lihat Detail →
      </button>
    </div>
  `;

  // Klik tombol detail
  li.querySelector('.detail-btn').addEventListener('click', (e) => {
    const data = JSON.parse(e.currentTarget.dataset.ticket);
    openTicketModal(data);
  });

  return li;
}

// ============================================================
// Modal Detail Tiket
// ============================================================
function openTicketModal(ticket) {
  document.getElementById('modalBookingCode').textContent  = ticket.booking_code;
  document.getElementById('modalTicketTitle').textContent  = ticket.movie_title;
  document.getElementById('modalTicketGenre').textContent  = ticket.genre;
  document.getElementById('modalTicketPoster').src         = ticket.poster_url;
  document.getElementById('modalTicketPoster').alt         = ticket.movie_title;
  document.getElementById('modalTicketShowTime').textContent = formatDateTime(ticket.show_time);
  document.getElementById('modalTicketStudio').textContent = ticket.studio;
  document.getElementById('modalTicketName').textContent   = ticket.customer_name;
  document.getElementById('modalTicketDate').textContent   = formatDateShort(ticket.created_at);
  document.getElementById('modalTicketTotal').textContent  = formatRupiah(ticket.total_price);

  // Link ke halaman konfirmasi
  document.getElementById('modalConfirmLink').href = `confirmation.html?code=${ticket.booking_code}`;

  // Kursi
  const seatsEl = document.getElementById('modalTicketSeats');
  seatsEl.innerHTML = ticket.seats.map(s =>
    `<span class="inline-block bg-green-900/50 border border-green-600 text-green-300 text-sm font-bold px-3 py-1 rounded-lg">${s}</span>`
  ).join('');

  ticketModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeTicketModal() {
  ticketModal.classList.remove('open');
  document.body.style.overflow = '';
}

closeModalBtn.addEventListener('click', closeTicketModal);
ticketModal.addEventListener('click', (e) => {
  if (e.target === ticketModal) closeTicketModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeTicketModal();
});

// ============================================================
// Submit form cari
// ============================================================
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailValid) {
    formError.classList.remove('hidden');
    emailInput.focus();
    return;
  }

  formError.classList.add('hidden');
  searchTickets(email);
});

emailInput.addEventListener('input', () => {
  formError.classList.add('hidden');
});

// ============================================================
// Init — wajib login, redirect ke login.html jika belum
// ============================================================
(function init() {
  if (!isLoggedIn()) {
    // Belum login → redirect ke login, simpan URL saat ini sebagai redirect target
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return;
  }

  // Sudah login: sembunyikan form email, auto-load tiket milik user
  const user = getUser();
  const searchSection = document.querySelector('.max-w-md');
  if (searchSection) searchSection.classList.add('hidden');

  // Update hero subtitle
  const heroDesc = document.querySelector('section p');
  if (heroDesc && user) heroDesc.textContent = `Tiket yang dipesan oleh ${user.name}`;

  searchTickets(); // ambil tiket via JWT token
})();
