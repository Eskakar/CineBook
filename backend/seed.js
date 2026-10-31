/**
 * seed.js
 * Mengisi database dengan data awal: film, jadwal, dan kursi.
 * Jalankan sekali: node seed.js
 */

const db = require('./database/db');

// ============================================================
// Bersihkan data lama agar seed bisa dijalankan ulang
// ============================================================
db.exec(`
  DELETE FROM bookings;
  DELETE FROM seats;
  DELETE FROM schedules;
  DELETE FROM movies;
  DELETE FROM sqlite_sequence WHERE name IN ('bookings','seats','schedules','movies');
`);

// ============================================================
// Data Film
// ============================================================
const movies = [
  {
    title: 'Galaksi Terakhir',
    genre: 'Sci-Fi',
    duration: 148,
    poster_url: '../assets/galaksi-terakhir.jpg',
    synopsis: 'Sebuah tim astronot nekat menjelajahi lubang hitam terbesar yang pernah ditemukan demi menyelamatkan Bumi dari kepunahan.',
  },
  {
    title: 'Bayang Rimba',
    genre: 'Thriller',
    duration: 112,
    poster_url: '../assets/bayang-rimba.jpg',
    synopsis: 'Seorang ranger hutan menemukan kenyataan gelap di balik proyek pertambangan yang misterius di pedalaman Kalimantan.',
  },
  {
    title: 'Cinta di Atas Awan',
    genre: 'Romance',
    duration: 105,
    poster_url: '../assets/cinta-di-atas-awan.jpg',
    synopsis: 'Dua pilot lintas benua yang bertemu secara tak sengaja harus memilih antara karir impian dan cinta yang baru tumbuh.',
  },
  {
    title: 'Naga Besi',
    genre: 'Action',
    duration: 132,
    poster_url: '../assets/naga-besi.jpg',
    synopsis: 'Seorang mantan tentara elite kembali bertugas ketika sebuah sindikat senjata mengancam keamanan Asia Tenggara.',
  },
  {
    title: 'Mimpi Setengah Jaga',
    genre: 'Horror',
    duration: 95,
    poster_url: '../assets/mimpi-setengah-jaga.jpg',
    synopsis: 'Keluarga muda yang pindah ke rumah tua di desa terpencil mulai mengalami teror yang terjadi tepat di batas antara tidur dan terjaga.',
  },
];

const insertMovie = db.prepare(`
  INSERT INTO movies (title, genre, duration, poster_url, synopsis)
  VALUES (@title, @genre, @duration, @poster_url, @synopsis)
`);

const movieIds = [];
for (const m of movies) {
  const result = insertMovie.run(m);
  movieIds.push(result.lastInsertRowid);
}
console.log(`✅ ${movies.length} film berhasil di-seed.`);

// ============================================================
// Data Jadwal (2 jadwal per film)
// ============================================================
const insertSchedule = db.prepare(`
  INSERT INTO schedules (movie_id, studio, show_time, price)
  VALUES (@movie_id, @studio, @show_time, @price)
`);

const scheduleData = [];
const dates   = ['2026-11-01', '2026-11-02'];
const times   = ['10:00', '14:30', '19:00'];
const studios = ['Studio 1', 'Studio 2', 'Studio 3'];
const prices  = [50000, 65000, 75000]; // harga berbeda per waktu

movieIds.forEach((movie_id, idx) => {
  // 2 jadwal per film
  for (let i = 0; i < 2; i++) {
    const dateIdx  = i % dates.length;
    const timeIdx  = (idx + i) % times.length;
    const studioIdx = (idx + i) % studios.length;
    const show_time = `${dates[dateIdx]}T${times[timeIdx]}:00`;
    const schedule  = {
      movie_id,
      studio: studios[studioIdx],
      show_time,
      price: prices[timeIdx],
    };
    const result = insertSchedule.run(schedule);
    scheduleData.push({ id: result.lastInsertRowid });
  }
});
console.log(`✅ ${scheduleData.length} jadwal berhasil di-seed.`);

// ============================================================
// Data Kursi (5 baris x 6 kolom = 30 kursi per jadwal)
// ============================================================
const insertSeat = db.prepare(`
  INSERT INTO seats (schedule_id, seat_code, is_booked)
  VALUES (@schedule_id, @seat_code, @is_booked)
`);

const rows    = ['A', 'B', 'C', 'D', 'E'];
const columns = [1, 2, 3, 4, 5, 6];

const insertAllSeats = db.transaction(() => {
  for (const schedule of scheduleData) {
    for (const row of rows) {
      for (const col of columns) {
        insertSeat.run({
          schedule_id: schedule.id,
          seat_code: `${row}${col}`,
          is_booked: 0,
        });
      }
    }
  }
});

insertAllSeats();
console.log(`✅ ${scheduleData.length * rows.length * columns.length} kursi berhasil di-seed.`);
console.log('\n🎬 Seed selesai. Jalankan: node server.js');
