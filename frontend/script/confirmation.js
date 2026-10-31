/**
 * script/confirmation.js — Presenter halaman confirmation.html
 * Fetch detail booking berdasarkan kode dari URL, render ke tiket
 * API_BASE tersedia dari auth.js (window.API_BASE)
 */

// ============================================================
// Baca parameter URL: ?code=CB-XXXXXXXX
// ============================================================
const params      = new URLSearchParams(window.location.search);
const bookingCode = params.get('code');

// ============================================================
// Elemen DOM
// ============================================================
const loadingEl    = document.getElementById('loadingConfirmation');
const contentEl    = document.getElementById('confirmationContent');
const errorEl      = document.getElementById('confirmationError');

// ============================================================
// Utilitas
// ============================================================

function formatRupiah(amount) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount);
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ============================================================
// Fetch & Render Booking
// ============================================================

async function loadBooking() {
  if (!bookingCode) {
    showError();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/bookings/${bookingCode}`);
    if (!res.ok) { showError(); return; }

    const booking = await res.json();
    renderTicket(booking);
  } catch (err) {
    showError();
    console.error('Gagal memuat booking:', err);
  }
}

/**
 * Render semua informasi tiket ke DOM.
 * @param {Object} booking - Data booking dari API
 */
function renderTicket(booking) {
  const { schedule } = booking;

  // Kode booking
  document.getElementById('confBookingCode').textContent = booking.booking_code;

  // Film
  document.getElementById('confMovieTitle').textContent = schedule.movie_title;
  document.getElementById('confGenre').textContent      = schedule.genre;
  document.getElementById('confDuration').textContent   = schedule.duration;
  document.getElementById('confPoster').src             = schedule.poster_url;
  document.getElementById('confPoster').alt             = schedule.movie_title;

  // Jadwal
  document.getElementById('confShowTime').textContent = formatDateTime(schedule.show_time);
  document.getElementById('confStudio').textContent   = schedule.studio;

  // Kursi — render sebagai badge
  const seatsContainer = document.getElementById('confSeats');
  seatsContainer.innerHTML = '';
  booking.seats.forEach(seatCode => {
    const badge = document.createElement('span');
    badge.className = 'inline-block bg-green-900/50 border border-green-600 text-green-300 text-sm font-bold px-3 py-1 rounded-lg';
    badge.textContent = seatCode;
    seatsContainer.appendChild(badge);
  });

  // Data pemesan
  document.getElementById('confName').textContent  = booking.customer_name;
  document.getElementById('confEmail').textContent = booking.customer_email;

  // Total harga
  document.getElementById('confTotal').textContent = formatRupiah(booking.total_price);

  // Tampilkan konten
  loadingEl.style.display = 'none';
  contentEl.classList.remove('hidden');

  // Update judul halaman
  document.title = `Tiket ${booking.booking_code} — CineBook`;

  // Update link "Tiket Saya" di navbar agar pre-fill email
  const myTicketsLinks = document.querySelectorAll('a[href="my-tickets.html"]');
  myTicketsLinks.forEach(link => {
    link.href = `my-tickets.html?email=${encodeURIComponent(booking.customer_email)}`;
  });
}

// ============================================================
// Error state
// ============================================================
function showError() {
  loadingEl.style.display = 'none';
  errorEl.classList.remove('hidden');
}

// ============================================================
// Init
// ============================================================
loadBooking();
