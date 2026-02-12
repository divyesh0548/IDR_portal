const crypto = require('crypto');

// Get encryption key from environment or use a default (should be set in production)
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a JWT token with an additional encryption layer
 * @param {string} token - The JWT token to encrypt
 * @returns {string} - Encrypted token (iv:encrypted:authTag)
 */
function encryptToken(token) {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:encrypted:authTag (all in hex)
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  } catch (error) {
    throw new Error('Token encryption failed: ' + error.message);
  }
}

/**
 * Decrypts an encrypted token
 * @param {string} encryptedToken - The encrypted token
 * @returns {string} - Decrypted JWT token
 */
function decryptToken(encryptedToken) {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const parts = encryptedToken.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, encrypted, authTagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Token decryption failed: ' + error.message);
  }
}

module.exports = {
  encryptToken,
  decryptToken,
};

