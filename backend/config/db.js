const { Pool } = require('pg');
require('dotenv').config();

// SSL configuration for PostgreSQL
// For remote connections, enable SSL and allow self-signed certificates by default
const sslConfig = process.env.DB_SSL === 'true' || process.env.DB_HOST !== 'localhost' 
  ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
    }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'plaza_web',
  ssl: sslConfig,
});

// Set timezone to IST for all connections
pool.on('connect', (client) => {
  client.query("SET timezone = 'Asia/Kolkata'");
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

module.exports = { pool };

