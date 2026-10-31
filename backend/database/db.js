/**
 * database/db.js
 * Inisialisasi koneksi SQLite dan pembuatan tabel jika belum ada.
 */

const Database = require('better-sqlite3');
const path = require('path');

// File database disimpan di folder database/
const DB_PATH = path.join(__dirname, 'cinebook.db');

const db = new Database(DB_PATH);

// Aktifkan WAL mode untuk performa lebih baik
db.pragma('journal_mode = WAL');

// ============================================================
// Buat tabel jika belum ada (idempotent)
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS movies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    genre       TEXT    NOT NULL,
    duration    INTEGER NOT NULL,   -- dalam menit
    poster_url  TEXT    NOT NULL,
    synopsis    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id    INTEGER NOT NULL,
    studio      TEXT    NOT NULL,
    show_time   TEXT    NOT NULL,   -- format ISO 8601: "2026-11-01T14:00:00"
    price       INTEGER NOT NULL,   -- dalam Rupiah
    FOREIGN KEY (movie_id) REFERENCES movies(id)
  );

  CREATE TABLE IF NOT EXISTS seats (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    seat_code   TEXT    NOT NULL,   -- contoh: "A1", "B3"
    is_booked   INTEGER NOT NULL DEFAULT 0,  -- 0 = tersedia, 1 = terisi
    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id    INTEGER NOT NULL,
    customer_name  TEXT    NOT NULL,
    customer_email TEXT    NOT NULL,
    seats          TEXT    NOT NULL,   -- JSON array kursi, e.g. '["A1","A2"]'
    total_price    INTEGER NOT NULL,
    booking_code   TEXT    NOT NULL UNIQUE,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
  );
`);

// Tambah tabel users untuk autentikasi
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,   -- bcrypt hash
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

module.exports = db;
