/**
 * script/booking.js — Presenter halaman booking.html
 * Fetch detail jadwal & kursi, render grid kursi, handle pemesanan
 * Halaman ini WAJIB LOGIN — redirect ke login.html jika belum
 * API_BASE tersedia dari auth.js (window.API_BASE)
 */

// ============================================================
// Wajib login untuk memesan tiket
// ============================================================
requireLogin(); // dari auth.js — redirect ke login.html jika belum login

// ============================================================
// Baca parameter URL: ?schedule_id=X
// ============================================================
const params     = new URLSearchParams(window.location.search);
const scheduleId = params.get('schedule_id');

// ============================================================
// Elemen DOM
// ============================================================
const loadingBooking    = document.getElementById('loadingBooking');
const bookingContent    = document.getElementById('bookingContent');
const bookingError404   = document.getElementById('bookingError404');
const seatGrid          = document.getElementById('seatGrid');
const loadingSeats      = document.getElementById('loadingSeats');
const selectedSeatsDisp = document.getElementById('selectedSeatsDisplay');
const totalPriceDisp    = document.getElementById('totalPriceDisplay');
const btnBooking        = document.getElementById('btnBooking');
const bookingErrorMsg   = document.getElementById('bookingError');

// Form nama & email sekarang diisi otomatis dari token
const customerNameInput  = document.getElementById('customerName');
const customerEmailInput = document.getElementById('customerEmail');

// ============================================================
// State lokal
// ============================================================
let selectedSeats = [];
let schedulePrice = 0;

// ============================================================
// Pre-fill form dari data user yang login
// ============================================================
(function prefillUserData() {
  const user = getUser(); // dari auth.js
  if (!user) return;
  if (customerNameInput)  { customerNameInput.value  = user.name;  customerNameInput.readOnly  = true; }
  if (customerEmailInput) { customerEmailInput.value = user.email; customerEmailInput.readOnly = true; }
})();

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

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show ${type}`;
  setTimeout(() => { toast.className = ''; }, 3000);
}

// ============================================================
// Cek state form → aktifkan / nonaktifkan tombol pesan
// ============================================================
function updateBookingButton() {
  btnBooking.disabled = selectedSeats.length === 0;
}

// ============================================================
// Render ringkasan kursi & harga
// ============================================================
function updateSummary() {
  if (selectedSeats.length === 0) {
    selectedSeatsDisp.textContent = 'Belum ada kursi dipilih';
    selectedSeatsDisp.classList.add('italic');
  } else {
    selectedSeatsDisp.innerHTML = selectedSeats
      .map(s => `<span class="inline-block bg-green-900/50 border border-green-600 text-green-300 text-xs font-bold px-2 py-0.5 rounded">${s}</span>`)
      .join(' ');
    selectedSeatsDisp.classList.remove('italic');
  }
  totalPriceDisp.textContent = formatRupiah(schedulePrice * selectedSeats.length);
  updateBookingButton();
}

// ============================================================
// Fetch & Render
// ============================================================

async function loadScheduleInfo() {
  if (!scheduleId) { showError404(); return; }

  try {
    const [scheduleRes, seatsRes] = await Promise.all([
      fetch(`${API_BASE}/schedules/${scheduleId}`),
      fetch(`${API_BASE}/schedules/seats/${scheduleId}`),
    ]);

    if (!scheduleRes.ok || !seatsRes.ok) { showError404(); return; }

    const [schedule, seats] = await Promise.all([
      scheduleRes.json(),
      seatsRes.json(),
    ]);

    renderScheduleInfo(schedule);
    loadingBooking.style.display = 'none';
    bookingContent.classList.remove('hidden');
    renderSeats(seats);
  } catch (err) {
    showError404();
    console.error(err);
  }
}

function renderScheduleInfo(schedule) {
  document.getElementById('bookMovieTitle').textContent  = schedule.movie_title || '—';
  document.getElementById('bookMoviePoster').src          = schedule.poster_url  || '';
  document.getElementById('bookMovieGenre').textContent   = schedule.genre       || '';
  document.getElementById('bookShowTime').textContent     = formatDateTime(schedule.show_time);
  document.getElementById('bookStudio').textContent       = schedule.studio;
  document.getElementById('bookPrice').textContent        = new Intl.NumberFormat('id-ID').format(schedule.price);
  schedulePrice = schedule.price;
}

function renderSeats(seats) {
  loadingSeats.style.display = 'none';
  seatGrid.innerHTML = '';

  seats.forEach(seat => {
    const btn = document.createElement('button');
    btn.classList.add('seat');
    btn.textContent = seat.seat_code;
    btn.dataset.code = seat.seat_code;
    btn.setAttribute('aria-label', `Kursi ${seat.seat_code}`);

    if (seat.is_booked) {
      btn.classList.add('booked');
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    } else {
      btn.classList.add('available');
      btn.addEventListener('click', () => toggleSeat(btn, seat.seat_code));
    }

    seatGrid.appendChild(btn);
  });

  updateSummary();
}

function toggleSeat(btn, seatCode) {
  if (btn.classList.contains('selected')) {
    btn.classList.remove('selected');
    btn.classList.add('available');
    selectedSeats = selectedSeats.filter(s => s !== seatCode);
  } else {
    btn.classList.remove('available');
    btn.classList.add('selected');
    selectedSeats.push(seatCode);
  }
  updateSummary();
}

// ============================================================
// Submit Pemesanan (dengan JWT header)
// ============================================================
btnBooking.addEventListener('click', async () => {
  if (selectedSeats.length === 0) return;

  btnBooking.disabled    = true;
  btnBooking.textContent = 'Memproses...';
  bookingErrorMsg.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: authHeaders(), // dari auth.js: { Content-Type, Authorization: Bearer <token> }
      body: JSON.stringify({
        schedule_id: parseInt(scheduleId),
        seats:       selectedSeats,
      }),
    });

    const data = await res.json();

    if (res.status === 401) {
      // Token kedaluwarsa — arahkan ke login
      clearSession();
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    if (!res.ok) {
      bookingErrorMsg.textContent = data.error || 'Pemesanan gagal, coba lagi.';
      bookingErrorMsg.classList.remove('hidden');
      btnBooking.disabled    = false;
      btnBooking.textContent = 'Pesan Tiket';
      return;
    }

    showToast('Pemesanan berhasil! 🎉', 'success');
    setTimeout(() => {
      window.location.href = `confirmation.html?code=${data.booking_code}`;
    }, 800);

  } catch (err) {
    bookingErrorMsg.textContent = 'Gagal terhubung ke server.';
    bookingErrorMsg.classList.remove('hidden');
    btnBooking.disabled    = false;
    btnBooking.textContent = 'Pesan Tiket';
    console.error(err);
  }
});

// ============================================================
// Tampilkan error 404
// ============================================================
function showError404() {
  loadingBooking.style.display = 'none';
  bookingError404.classList.remove('hidden');
}

// ============================================================
// Init
// ============================================================
loadScheduleInfo();
