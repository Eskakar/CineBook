/**
 * routes/auth.js
 * Endpoint autentikasi: Register, Login, Get current user
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const db       = require('../database/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const TOKEN_EXPIRES = '7d'; // token berlaku 7 hari

// ---------------------------------------------------------------
// POST /api/auth/register — daftar akun baru
// Body: { name, email, password }
// ---------------------------------------------------------------
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  // Cek email sudah terdaftar
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email sudah terdaftar.' });
  }

  // Hash password
  const hashed = await bcrypt.hash(password, 10);

  // Simpan user
  const result = db.prepare(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
  ).run(name.trim(), email.trim().toLowerCase(), hashed);

  // Buat token
  const token = jwt.sign(
    { id: result.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase() },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES }
  );

  res.status(201).json({
    message: 'Registrasi berhasil.',
    token,
    user: { id: result.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase() },
  });
});

// ---------------------------------------------------------------
// POST /api/auth/login — login
// Body: { email, password }
// ---------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  // Cari user
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }

  // Verifikasi password
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }

  // Buat token
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES }
  );

  res.json({
    message: 'Login berhasil.',
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// ---------------------------------------------------------------
// GET /api/auth/me — ambil data user yang sedang login
// Header: Authorization: Bearer <token>
// ---------------------------------------------------------------
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  res.json(user);
});

module.exports = router;
