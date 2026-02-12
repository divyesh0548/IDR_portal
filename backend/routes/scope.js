const express = require('express');
const { pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/scope
 * Create a new scope
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { scope_name, required_documents } = req.body;

    // Validate input
    if (!scope_name || !required_documents) {
      return res.status(400).json({
        success: false,
        message: 'Scope name and required documents are required',
      });
    }

    // Insert new scope
    const result = await pool.query(
      `INSERT INTO scope (scope_name, required_documents)
       VALUES ($1, $2)
       RETURNING id, scope_name, required_documents`,
      [scope_name, required_documents]
    );

    return res.status(201).json({
      success: true,
      message: 'Scope created successfully',
      scope: result.rows[0],
    });
  } catch (error) {
    console.error('Create scope error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/scope
 * Get all scopes or a specific scope by name
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { scope_name } = req.query;

    if (scope_name) {
      // Get specific scope by name
      const result = await pool.query(
        'SELECT id, scope_name, required_documents FROM scope WHERE scope_name = $1',
        [scope_name]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Scope not found',
        });
      }

      return res.status(200).json({
        success: true,
        scope: result.rows[0],
      });
    } else {
      // Get all scopes
      const result = await pool.query(
        'SELECT id, scope_name, required_documents FROM scope ORDER BY scope_name'
      );

      return res.status(200).json({
        success: true,
        scopes: result.rows,
      });
    }
  } catch (error) {
    console.error('Get scopes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;

