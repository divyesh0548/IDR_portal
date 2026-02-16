const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { encryptToken, decryptToken } = require('../utils/tokenEncryption');

const router = express.Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Auth router is working' });
});

/**
 * POST /api/auth/login
 * Login endpoint - authenticates user and sets HttpOnly cookie with encrypted JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email_id, password } = req.body;

    // Validate input
    if (!email_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Query user from database
    const result = await pool.query(
      'SELECT id, name, email_id, password, role, designation, mob_no, user_code, temp_login, plaza_name FROM users WHERE email_id = $1',
      [email_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    // Verify password (plain text comparison)
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Create JWT token payload
    const tokenPayload = {
      id: user.id,
      email_id: user.email_id,
      role: user.role,
      name: user.name,
    };

    // Generate JWT token
    const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Encrypt the JWT token with additional encryption layer
    const encryptedToken = encryptToken(jwtToken);

    // Set HttpOnly cookie with encrypted token
    res.cookie('sessionToken', encryptedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      path: '/',
    });

    // Return user data (excluding password) along with the token
    if (user.temp_login) {
      // If the user needs to change their temporary password, send a specific response
      return res.status(200).json({
        success: true,
        message: 'Please change your temporary password.',
        tempLogin: true, // This indicates the user needs to change their password
        temp_login: user.temp_login,
        token: encryptedToken, // Return the token even if temp_login is true
        user: {
          id: user.id,
          name: user.name,
          email_id: user.email_id,
          role: user.role,
          designation: user.designation,
          mob_no: user.mob_no,
          user_code: user.user_code,
          temp_login: user.temp_login,
          plaza_name: user.plaza_name,
        },
      });
    }

    // If the user does not need to change the password, just return the usual response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: encryptedToken, // Return the token
      user: {
        id: user.id,
        name: user.name,
        email_id: user.email_id,
        role: user.role,
        designation: user.designation,
        mob_no: user.mob_no,
        user_code: user.user_code,
        temp_login: user.temp_login,
        plaza_name: user.plaza_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});


router.post('/update-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'User ID and new password are required',
      });
    }

    // Update the password and set temp_login to false
    await pool.query(
      'UPDATE users SET password = $1, temp_login = false WHERE id = $2',
      [newPassword, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});



/**
 * POST /api/auth/logout
 * Logout endpoint - clears the session cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('sessionToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * GET /api/auth/verify
 * Verify token endpoint - validates the session token
 */
router.get('/verify', async (req, res) => {
  try {
    const encryptedToken = req.cookies.sessionToken;

    if (!encryptedToken) {
      return res.status(401).json({
        success: false,
        message: 'No session token found',
      });
    }

    // Decrypt the token
    const jwtToken = decryptToken(encryptedToken);

    // Verify JWT token
    const decoded = jwt.verify(jwtToken, JWT_SECRET);

    // Optionally fetch fresh user data
    const result = await pool.query(
      'SELECT id, name, email_id, role, designation, mob_no, user_code, temp_login, plaza_name FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      // Clear the invalid/expired cookie
      res.clearCookie('sessionToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    console.error('Token verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;

