// routes/traveler.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { checkRole } = require('../middleware/roleCheck');
const { encrypt } = require('../utils/crypto');

// Create booking (traveler use case)
router.post('/v1/bookings', checkRole('traveler'), (req, res) => {
  const { userId, hotelId, check_in, check_out, special_requests } = req.body;
  if (!userId || !hotelId || !check_in || !check_out) {
    return res.status(400).json({ error: 'Missing fields are required', status: 400 });
  }
  db.run(
    'INSERT INTO bookings (user_id, hotel_id, check_in, check_out, special_requests) VALUES (?,?,?,?,?)',
    [userId, hotelId, check_in, check_out, special_requests || null],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Booking created', bookingId: this.lastID });
    }
  );
});

// View booking history
router.get('/v1/bookings/:userId', checkRole('traveler'), (req, res) => {
  db.all('SELECT * FROM bookings WHERE user_id=?', [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Make payment (encrypt method)
router.post('/v1/payments', checkRole('traveler'), (req, res) => {
  const { userId, bookingId, method, amount, discountCode } = req.body;
  if (!userId || !bookingId || !method || amount == null) {
    return res.status(400).json({ error: 'Missing fields are required', status: 400 });
  }

  function insertPayment(finalAmount) {
    db.run(
      'INSERT INTO payments (user_id, booking_id, method, amount, status) VALUES (?,?,?,?,?)',
      [userId, bookingId, encrypt(method), finalAmount, 'confirmed'],
      function (err) {
        if (err) return res.status(402).json({ error: 'declined payment', status: 402 });
        res.json({ message: 'Payment processed', bookingId });
      }
    );
  }

  if (discountCode) {
    db.get('SELECT discount_percent, expires_at FROM offers WHERE code=?', [discountCode], (err, offer) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!offer) return res.status(409).json({ error: 'Discount code is invalid or has already expired', status: 409 });
      const discounted = Number((Number(amount) * (100 - Number(offer.discount_percent))) / 100).toFixed(2);
      insertPayment(discounted);
    });
  } else {
    insertPayment(amount);
  }
});

// Cancel booking
router.patch('/v1/bookings/:id/cancel', checkRole('traveler'), (req, res) => {
  db.run('UPDATE bookings SET status="cancelled" WHERE id=?', [req.params.id], function (err) {
    if (err || this.changes === 0) return res.status(404).json({ error: 'Booking not found', status: 404 });
    res.json({ message: 'Booking cancelled', bookingId: req.params.id });
  });
});

// View offers
router.get('/v1/offers', checkRole('traveler'), (req, res) => {
  db.all('SELECT code, discount_percent, expires_at FROM offers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Apply discount code (attach to existing booking)
router.post('/v1/offers/apply', checkRole('traveler'), (req, res) => {
  const { bookingId, discountCode } = req.body;
  if (!bookingId || !discountCode) {
    return res.status(400).json({ error: 'Missing fields are required', status: 400 });
  }
  db.get('SELECT * FROM offers WHERE code=?', [discountCode], (err, offer) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!offer) return res.status(409).json({ error: 'Discount code is invalid or has already expired', status: 409 });
    res.json({ message: 'Discount applied', bookingId, discountCode });
  });
});

// Search flight status
router.get('/v1/flights/status', checkRole('traveler'), (req, res) => {
  const { origin, destination } = req.query;
  if (!origin || !destination) return res.status(400).json({ error: 'origin and destination are required', status: 400 });
  db.all(
    'SELECT id, origin, destination, status, departure_time, arrival_time FROM flights WHERE origin=? AND destination=?',
    [origin, destination],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Filter flights (price range, status)
router.get('/v1/filter/flights', checkRole('traveler'), (req, res) => {
  const { origin, destination, minPrice, maxPrice, status } = req.query;
  const params = [];
  const where = [];

  if (origin) { where.push('origin=?'); params.push(origin); }
  if (destination) { where.push('destination=?'); params.push(destination); }
  if (status) { where.push('status=?'); params.push(status); }
  if (minPrice != null) { where.push('price >= ?'); params.push(Number(minPrice)); }
  if (maxPrice != null) { where.push('price <= ?'); params.push(Number(maxPrice)); }

  const sql = `SELECT id, origin, destination, status, departure_time, arrival_time, price, seats_available FROM flights ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

module.exports = router;