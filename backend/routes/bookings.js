/**
 * routes/bookings.js
 * Presenter untuk pemesanan tiket (Model: tabel bookings, seats)
 * Route POST dan GET (daftar tiket) dilindungi middleware verifyToken
 */

const express      = require('express');
const router       = express.Router();
const db           = require('../database/db');
const { verifyToken } = require('../middleware/auth');

// ---------------------------------------------------------------
// Helper: generate kode booking unik (format: CB-XXXXXXXX)
// ---------------------------------------------------------------
function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CB-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ---------------------------------------------------------------
// POST /api/bookings — buat pemesanan baru (wajib login)
// Header: Authorization: Bearer <token>
// Body JSON: { schedule_id, seats: ["A1","A2"] }
// customer_name & customer_email diambil dari token
// ---------------------------------------------------------------
router.post('/', verifyToken, (req, res) => {
  const { schedule_id, seats } = req.body;

  // Nama & email diambil langsung dari JWT (user yang login)
  const customer_name  = req.user.name;
  const customer_email = req.user.email;

  // Validasi input
  if (!schedule_id || !seats || !seats.length) {
    return res.status(400).json({ error: 'Data pemesanan tidak lengkap' });
  }

  // Cek jadwal ada
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule_id);
  if (!schedule) return res.status(404).json({ error: 'Jadwal tidak ditemukan' });

  // Cek semua kursi tersedia (not booked)
  const placeholders = seats.map(() => '?').join(',');
  const seatRows = db.prepare(`
    SELECT * FROM seats
    WHERE schedule_id = ? AND seat_code IN (${placeholders})
  `).all(schedule_id, ...seats);

  if (seatRows.length !== seats.length) {
    return res.status(400).json({ error: 'Beberapa kursi tidak valid' });
  }

  const alreadyBooked = seatRows.filter(s => s.is_booked === 1);
  if (alreadyBooked.length > 0) {
    return res.status(409).json({
      error: 'Kursi sudah dipesan: ' + alreadyBooked.map(s => s.seat_code).join(', ')
    });
  }

  // Hitung total harga
  const total_price = schedule.price * seats.length;

  // Generate kode booking unik
  let booking_code;
  do {
    booking_code = generateBookingCode();
  } while (db.prepare('SELECT id FROM bookings WHERE booking_code = ?').get(booking_code));

  // Jalankan dalam transaksi: insert booking + update kursi
  const insertBooking = db.prepare(`
    INSERT INTO bookings (schedule_id, customer_name, customer_email, seats, total_price, booking_code)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const markBooked = db.prepare(`
    UPDATE seats SET is_booked = 1
    WHERE schedule_id = ? AND seat_code = ?
  `);

  const transaction = db.transaction(() => {
    insertBooking.run(schedule_id, customer_name, customer_email, JSON.stringify(seats), total_price, booking_code);
    for (const seat of seats) {
      markBooked.run(schedule_id, seat);
    }
  });

  transaction();

  res.status(201).json({
    message: 'Pemesanan berhasil',
    booking_code,
    total_price,
  });
});

// ---------------------------------------------------------------
// GET /api/bookings — semua booking milik user yang sedang login (wajib login)
// Header: Authorization: Bearer <token>
// ---------------------------------------------------------------
router.get('/', verifyToken, (req, res) => {
  const email = req.user.email;

  const bookings = db.prepare(`
    SELECT b.*, m.title AS movie_title, m.poster_url, m.genre,
           s.show_time, s.studio, s.price
    FROM bookings b
    JOIN schedules s ON s.id = b.schedule_id
    JOIN movies m ON m.id = s.movie_id
    WHERE LOWER(b.customer_email) = LOWER(?)
    ORDER BY b.created_at DESC
  `).all(email);

  const result = bookings.map(b => ({
    ...b,
    seats: JSON.parse(b.seats),
  }));

  res.json(result);
});

// ---------------------------------------------------------------
// GET /api/bookings/:booking_code — detail booking
// ---------------------------------------------------------------
router.get('/:booking_code', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_code = ?').get(req.params.booking_code);
  if (!booking) return res.status(404).json({ error: 'Kode booking tidak ditemukan' });

  // Ambil detail jadwal & film
  const schedule = db.prepare(`
    SELECT s.*, m.title AS movie_title, m.genre, m.duration, m.poster_url
    FROM schedules s
    JOIN movies m ON m.id = s.movie_id
    WHERE s.id = ?
  `).get(booking.schedule_id);

  res.json({
    ...booking,
    seats: JSON.parse(booking.seats),
    schedule,
  });
});

module.exports = router;
