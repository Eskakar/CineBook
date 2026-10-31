/**
 * server.js
 * Entry point Express — CineBook REST API
 * Jalankan: node server.js
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const moviesRouter    = require('./routes/movies');
const schedulesRouter = require('./routes/schedules');
const bookingsRouter  = require('./routes/bookings');
const authRouter      = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Middleware
// ============================================================
app.use(cors());                           // Izinkan request dari frontend (berbeda origin)
app.use(express.json());                   // Parse body JSON
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static frontend

// ============================================================
// Routes API
// ============================================================
app.use('/api/auth',      authRouter);
app.use('/api/movies',    moviesRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/bookings',  bookingsRouter);

// ============================================================
// Fallback: serve index.html untuk semua route non-API
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================================
// Start server
// ============================================================
app.listen(PORT, () => {
  console.log(`🎬 CineBook server berjalan di http://localhost:${PORT}`);
});
