/**
 * routes/movies.js
 * Presenter untuk data film (Model: tabel movies)
 */

const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

// GET /api/movies — ambil semua film
router.get('/', (req, res) => {
  const movies = db.prepare('SELECT * FROM movies ORDER BY id ASC').all();
  res.json(movies);
});

// GET /api/movies/:id — detail satu film
router.get('/:id', (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Film tidak ditemukan' });
  res.json(movie);
});

module.exports = router;
