const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const XLSX = require('xlsx');
const { pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', async (req, res) => {
  try {
    const { name, designation, email_id, mob_no, user_code, role } = req.body;

    if (!name || !email_id || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and role are required',
      });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email_id = $1', [email_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const tempPassword = crypto.randomBytes(12).toString('hex');

    const result = await pool.query(
      `INSERT INTO users (name, designation, email_id, mob_no, user_code, role, password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, designation, email_id, mob_no, user_code, role, temp_login, login_email_sent, created_at`,
      [name, designation || null, email_id, mob_no || null, user_code || null, role, tempPassword]
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email_id, role, designation, mob_no, user_code, temp_login, plaza_name FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, email_id, designation, mob_no, user_code } = req.body;

    if (!name || !email_id) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    const currentUser = await pool.query(
      'SELECT email_id, user_code FROM users WHERE id = $1',
      [req.user.id]
    );
    if (currentUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const existingEmail = currentUser.rows[0].email_id;
    const existingUserCode = currentUser.rows[0].user_code;

    if (email_id !== existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email cannot be changed',
      });
    }

    if ((user_code || null) !== (existingUserCode || null)) {
      return res.status(400).json({
        success: false,
        message: 'User Code cannot be changed',
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           designation = $2,
           mob_no = $3
       WHERE id = $4
       RETURNING id, name, email_id, role, designation, mob_no, user_code, temp_login`,
      [name, designation || null, mob_no || null, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/bulk', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required',
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: 'Excel file has no sheets',
      });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty',
      });
    }

    const headerRow = rows[0].map((h) => String(h || '').trim());
    const headerIndex = headerRow.reduce((acc, header, idx) => {
      if (header) acc[header.toLowerCase()] = idx;
      return acc;
    }, {});

    const requiredHeaders = [
      'name',
      'email',
      'designation',
      'mobile',
      'user code',
      'user type',
    ];

    const missingHeaders = requiredHeaders.filter((h) => headerIndex[h] === undefined);
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing columns: ${missingHeaders.join(', ')}`,
      });
    }

    let inserted = 0;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      const values = (idx) => String(row[idx] || '').trim();

      const name = values(headerIndex['name']);
      const email_id = values(headerIndex['email']);
      const designation = values(headerIndex['designation']);
      const mob_no = values(headerIndex['mobile']);
      const user_code = values(headerIndex['user code']);
      const role = values(headerIndex['user type']);

      const isRowEmpty = [name, email_id, designation, mob_no, user_code, role].every(
        (v) => !v
      );
      if (isRowEmpty) {
        continue;
      }

      if (!name || !email_id || !role) {
        return res.status(400).json({
          success: false,
          message: `Row ${i + 1}: Name, Email, and User Type are required`,
        });
      }

      const tempPassword = crypto.randomBytes(12).toString('hex');

      try {
        await pool.query(
          `INSERT INTO users (name, designation, email_id, mob_no, user_code, role, password)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [name, designation || null, email_id, mob_no || null, user_code || null, role, tempPassword]
        );
        inserted += 1;
      } catch (error) {
        if (error.code === '23505') {
          return res.status(409).json({
            success: false,
            message: `Row ${i + 1}: User with email '${email_id}' already exists`,
          });
        }

        console.error('Bulk create error:', error);
        return res.status(500).json({
          success: false,
          message: `Row ${i + 1}: Internal server error`,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Users created successfully',
      inserted,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/users/clients
 * Get all client email addresses that don't have a plaza_name assigned
 */
router.get('/clients', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email_id, name FROM users WHERE LOWER(role) = LOWER($1) AND (plaza_name IS NULL OR plaza_name = \'\') ORDER BY email_id',
      ['client']
    );

    return res.status(200).json({
      success: true,
      clients: result.rows,
    });
  } catch (error) {
    console.error('Get clients error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/users/plazas
 * Get all unique plaza names from users table where plaza_name is not null
 */
router.get('/plazas', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT plaza_name FROM users WHERE plaza_name IS NOT NULL AND plaza_name != \'\' ORDER BY plaza_name',
      []
    );

    return res.status(200).json({
      success: true,
      plazas: result.rows.map(row => row.plaza_name),
    });
  } catch (error) {
    console.error('Get plazas error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/users/statistics
 * Get statistics: total plaza count and total users count
 */
router.get('/statistics', requireAuth, async (req, res) => {
  try {
    // Get total unique plaza count
    const plazaResult = await pool.query(
      'SELECT COUNT(DISTINCT plaza_name) as total FROM users WHERE plaza_name IS NOT NULL AND plaza_name != \'\''
    );
    const totalPlazas = parseInt(plazaResult.rows[0].total, 10);

    // Get total users count
    const userResult = await pool.query(
      'SELECT COUNT(*) as total FROM users'
    );
    const totalUsers = parseInt(userResult.rows[0].total, 10);

    return res.status(200).json({
      success: true,
      statistics: {
        totalPlazas,
        totalUsers,
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/users/all
 * Get all users
 */
router.get('/all', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        email_id,
        designation,
        mob_no,
        user_code,
        role,
        plaza_name,
        created_at
      FROM users 
      ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/users/plaza-assignments
 * Get all plaza assignments with email_id and created_at, ordered by created_at ascending
 */
router.get('/plaza-assignments', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        plaza_name,
        email_id,
        created_at
      FROM users 
      WHERE plaza_name IS NOT NULL AND plaza_name != ''
      ORDER BY created_at ASC`
    );

    return res.status(200).json({
      success: true,
      assignments: result.rows,
    });
  } catch (error) {
    console.error('Get plaza assignments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/users/assign-plaza
 * Assign plaza name to a client user
 */
router.post('/assign-plaza', requireAuth, async (req, res) => {
  try {
    const { plaza_name, email_id } = req.body;

    if (!plaza_name || !email_id) {
      return res.status(400).json({
        success: false,
        message: 'Plaza name and email ID are required',
      });
    }

    // Check if user exists and is a client
    const userCheck = await pool.query(
      'SELECT id, role FROM users WHERE email_id = $1',
      [email_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (userCheck.rows[0].role?.toLowerCase() !== 'client') {
      return res.status(400).json({
        success: false,
        message: 'Can only assign plaza to client users',
      });
    }

    // Update plaza_name for the user (convert to lowercase)
    const result = await pool.query(
      'UPDATE users SET plaza_name = LOWER($1) WHERE email_id = $2 RETURNING id, email_id, plaza_name',
      [plaza_name, email_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Plaza assigned successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Assign plaza error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * PUT /api/users/update-plaza-assignment
 * Update plaza assignment: remove plaza_name from old email_id and assign to new email_id
 */
router.put('/update-plaza-assignment', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { plaza_name, old_email_id, new_email_id } = req.body;

    if (!plaza_name || !old_email_id || !new_email_id) {
      client.release();
      return res.status(400).json({
        success: false,
        message: 'Plaza name, old email ID, and new email ID are required',
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Check if new user exists and is a client
    const newUserCheck = await client.query(
      'SELECT id, role, plaza_name FROM users WHERE email_id = $1',
      [new_email_id]
    );

    if (newUserCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({
        success: false,
        message: 'New user not found',
      });
    }

    if (newUserCheck.rows[0].role?.toLowerCase() !== 'client') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({
        success: false,
        message: 'Can only assign plaza to client users',
      });
    }

    if (newUserCheck.rows[0].plaza_name && newUserCheck.rows[0].plaza_name !== '') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({
        success: false,
        message: 'New user already has a plaza assigned',
      });
    }

    // Check if old user exists
    const oldUserCheck = await client.query(
      'SELECT id FROM users WHERE email_id = $1',
      [old_email_id]
    );

    if (oldUserCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({
        success: false,
        message: 'Old user not found',
      });
    }

    // Remove plaza_name from old user
    await client.query(
      'UPDATE users SET plaza_name = NULL WHERE email_id = $1',
      [old_email_id]
    );

    // Assign plaza_name to new user (convert to lowercase)
    await client.query(
      'UPDATE users SET plaza_name = LOWER($1) WHERE email_id = $2',
      [plaza_name, new_email_id]
    );

    // Commit transaction
    await client.query('COMMIT');
    client.release();

    return res.status(200).json({
      success: true,
      message: 'Plaza assignment updated successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Update plaza assignment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;
