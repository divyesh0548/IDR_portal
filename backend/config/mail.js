const nodemailer = require('nodemailer');
require('dotenv').config();  // Ensure environment variables are loaded

// Create Nodemailer transporter using SMTP from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // False for TLS (port 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports = { transporter };
