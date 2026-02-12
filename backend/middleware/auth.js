const jwt = require('jsonwebtoken');
const { decryptToken } = require('../utils/tokenEncryption');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function requireAuth(req, res, next) {
  const encryptedToken = req.cookies.sessionToken;

  if (!encryptedToken) {
    return res.status(401).json({
      success: false,
      message: 'No session token found',
    });
  }

  try {
    const jwtToken = decryptToken(encryptedToken);
    const decoded = jwt.verify(jwtToken, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
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
}

module.exports = { requireAuth };
