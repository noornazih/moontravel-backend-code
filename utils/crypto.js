// utils/crypto.js
const crypto = require('crypto');

// Use env key in production; dev fallback for local testing
const ENC_KEY = process.env.MOONTRAVEL_ENC_KEY || 'dev_key_for_local_testing_only';
const key = crypto.createHash('sha256').update(ENC_KEY).digest();
const iv = Buffer.alloc(16, 0); // static IV for simplicity here

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(String(text), 'utf8', 'hex');
  enc += cipher.final('hex');
  return enc;
}

function decrypt(hex) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let dec = decipher.update(hex, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

module.exports = { encrypt, decrypt };