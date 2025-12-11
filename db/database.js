const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config(); // Load .env variables

const DB_PATH = path.join(__dirname, '..', 'moontravel.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new sqlite3.Database(DB_PATH);

// Apply schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema, (err) => {
  if (err) {
    console.error('Error initializing schema:', err);
  } else {
    console.log('Database schema ready');

    // Seed discount code from .env
    const code = process.env.DISCOUNT_CODE;
    const percent = parseInt(process.env.DISCOUNT_PERCENT);
    const expiry = process.env.DISCOUNT_EXPIRY;

    if (code && percent && expiry) {
      db.run(
        'INSERT OR IGNORE INTO offers (code, discount_percent, expires_at) VALUES (?, ?, ?)',
        [code, percent, expiry],
        (err) => {
          if (err) console.error('Error seeding discount code:', err);
          else console.log(`Discount code ${code} seeded`);
        }
      );
    }
  }
});

// Seed test flight for Postman testing
db.run(
  'INSERT OR IGNORE INTO flights (origin, destination, status, departure_time, arrival_time, price, seats_available) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ['Cairo', 'Dubai', 'on_time', '12/11/2025 08:00:00', '12/22/2025 12:00:00', 1500.00, 50],
  (err) => {
    if (err) console.error('Error seeding flight:', err);
    else console.log('Test flight seeded');
  }
);

db.exec(schema, (err) => {
  if (err) {
    console.error('Schema setup failed:', err);
    return;
  }

  // ✅ Seed a test hotel
  db.run(
    'INSERT OR IGNORE INTO hotels (name, location, price, description, roomsAvailable) VALUES (?, ?, ?, ?, ?)',
    ['Emerald Sands Hotel', 'Cairo', 150, 'Initial description', 10],
    (err) => {
      if (err) console.error('Hotel seed failed:', err);
      else console.log('Test hotel seeded');
    }
  );
});

db.run(
  'INSERT OR IGNORE INTO bookings (user_id, hotel_id, check_in, check_out, special_requests, status) VALUES (?, ?, ?, ?, ?, ?)',
  [1, 1, '12/11/2025', '12/22/2025', 'Late check-in, sea view', 'pending'],
  (err) => {
    if (err) console.error('Booking seed failed:', err);
    else console.log('Test booking seeded');
  }
);

module.exports = db;