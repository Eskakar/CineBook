/**
 * routes/schedules.js
 * Presenter untuk jadwal tayang & kursi (Model: tabel schedules, seats)
 */

const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

// GET /api/schedules?movie_id=X — ambil jadwal berdasarkan film
router.get('/', (req, res) => {
  const { movie_id } = req.query;
  if (!movie_id) return res.status(400).json({ error: 'Parameter movie_id diperlukan' });

  const schedules = db.prepare(`
    SELECT s.*, m.title AS movie_title, m.duration
    FROM schedules s
    JOIN movies m ON m.id = s.movie_id
    WHERE s.movie_id = ?
    ORDER BY s.show_time ASC
  `).all(movie_id);

  res.json(schedules);
});

// GET /api/schedules/:id — detail satu jadwal (beserta info film)
router.get('/:id', (req, res) => {
  const schedule = db.prepare(`
    SELECT s.*, m.title AS movie_title, m.genre, m.duration, m.poster_url
    FROM schedules s
    JOIN movies m ON m.id = s.movie_id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!schedule) return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
  res.json(schedule);
});

// GET /api/seats/:schedule_id — ambil status kursi per jadwal
router.get('/seats/:schedule_id', (req, res) => {
  const seats = db.prepare(`
    SELECT * FROM seats WHERE schedule_id = ? ORDER BY seat_code ASC
  `).all(req.params.schedule_id);

  if (seats.length === 0) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan atau belum ada kursi' });
  }
  res.json(seats);
});

module.exports = router;
