// server.js
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const travelerRoutes = require('./routes/traveler');
const hotelRoutes = require('./routes/hotel');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: 'moontravel_secret_key', // move to env var in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false,
      sameSite: 'Strict'
    }
  })
);

// Mount routes
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', travelerRoutes);
app.use('/', hotelRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'MoonTravel backend is running' });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`MoonTravel backend running on port ${PORT}`);
});