const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { transporter } = require('../config/mail');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * POST /api/idr/master
 * Create IDR master records
 */
router.post('/master', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { plazas, due_date, from_date, to_date, scope_name } = req.body;

    // Validate input
    if (!plazas || !Array.isArray(plazas) || plazas.length === 0 || !due_date || !from_date || !to_date || !scope_name) {
      client.release();
      return res.status(400).json({
        success: false,
        message: 'Plazas array, due date, from date, to date, and scope name are required',
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Get current datetime in Mumbai timezone
    const requestDatetimeResult = await client.query(
      "SELECT NOW() AT TIME ZONE 'Asia/Kolkata' as current_time"
    );
    const requestDatetime = requestDatetimeResult.rows[0].current_time;
    const modifiedTime = requestDatetimeResult.rows[0].current_time;

    // Fetch scope details to get required_documents
    const scopeResult = await client.query(
      'SELECT required_documents FROM scope WHERE scope_name = $1',
      [scope_name]
    );

    if (scopeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({
        success: false,
        message: 'Scope not found',
      });
    }

    // Parse required_documents (comma-separated string)
    const requiredDocumentsStr = scopeResult.rows[0].required_documents || '';
    const requiredDocuments = requiredDocumentsStr
      .split(',')
      .map(doc => doc.trim())
      .filter(doc => doc.length > 0);

    // Insert records for each plaza
    const insertedRecords = [];
    
    for (const plaza of plazas) {
      // Each plaza should have plaza_name and req_id
      const plazaName = typeof plaza === 'string' ? plaza : plaza.plaza_name;
      const reqId = typeof plaza === 'string' ? null : plaza.req_id;
      
      // Insert into idr_master
      const result = await client.query(
        `INSERT INTO idr_master (
          plaza_name, 
          request_datetime, 
          due_date, 
          from_date,
          to_date,
          scope_name,
          req_id,
          reminder_email_datetime
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, plaza_name, request_datetime, due_date, from_date, to_date, scope_name, req_id`,
        [
          plazaName,
          requestDatetime,
          due_date,
          from_date,
          to_date,
          scope_name,
          reqId,
          null // reminder_email_datetime - keep empty
        ]
      );
      
      insertedRecords.push(result.rows[0]);

      // Insert rows into document_master for each required document and each month in the range
      if (reqId && requiredDocuments.length > 0) {
        // Generate all months between from_date and to_date
        const startDate = new Date(from_date);
        const endDate = new Date(to_date);
        const months = [];
        
        const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        
        while (current <= end) {
          const year = current.getFullYear().toString();
          const month = String(current.getMonth() + 1).padStart(2, '0'); // 1-12, padded to 01-12
          months.push({ year, month });
          current.setMonth(current.getMonth() + 1);
        }
        
        // For each document type, create a row for each month
        for (const documentType of requiredDocuments) {
          for (const { year, month } of months) {
            await client.query(
              `INSERT INTO document_master (
                req_id,
                document_type,
                document_url,
                modified_time,
                year,
                month
              )
              VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                reqId,
                documentType,
                null, // document_url - empty for now
                modifiedTime,
                year,
                month
              ]
            );
          }
        }
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    // Emails for these new requests will be sent by a background cron job
    // that checks idr_master.email_sent every minute.

    return res.status(201).json({
      success: true,
      message: `Successfully created ${insertedRecords.length} IDR master record(s)`,
      records: insertedRecords,
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK').catch(rollbackError => {
      console.error('Error rolling back transaction:', rollbackError);
    });
    
    console.error('Error creating IDR master records:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/idr/unique-scopes
 * Get all unique scope names from idr_master table
 */
router.get('/unique-scopes', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT scope_name FROM idr_master WHERE scope_name IS NOT NULL ORDER BY scope_name'
    );

    return res.status(200).json({
      success: true,
      scopes: result.rows.map(row => row.scope_name),
    });
  } catch (error) {
    console.error('Get unique scopes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/idr/submitted-requests
 * Get submitted requests filtered by scope_name
 */
router.get('/submitted-requests', requireAuth, async (req, res) => {
  try {
    const { scope_name } = req.query;

    if (!scope_name) {
      return res.status(400).json({
        success: false,
        message: 'Scope name is required',
      });
    }

    // If scope_name is "all", return all records; otherwise filter by scope_name
    let result;
    if (scope_name === 'all') {
      result = await pool.query(
        `SELECT 
          id,
          plaza_name,
          request_datetime,
          due_date,
          from_date,
          to_date,
          scope_name,
          req_id,
          done
        FROM idr_master 
        ORDER BY from_date, to_date, due_date, plaza_name`
      );
    } else {
      result = await pool.query(
        `SELECT 
          id,
          plaza_name,
          request_datetime,
          due_date,
          from_date,
          to_date,
          scope_name,
          req_id,
          done
        FROM idr_master 
        WHERE scope_name = $1
        ORDER BY from_date, to_date, due_date, plaza_name`,
        [scope_name]
      );
    }

    return res.status(200).json({
      success: true,
      records: result.rows,
    });
  } catch (error) {
    console.error('Get submitted requests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/idr/client-requests
 * Get document requests for the logged-in client (both pending and done)
 */
router.get('/client-requests', requireAuth, async (req, res) => {
  try {
    // Get user's plaza_name from the database
    const userResult = await pool.query(
      'SELECT plaza_name FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const plazaName = userResult.rows[0].plaza_name;

    // If user doesn't have a plaza_name, return empty array
    if (!plazaName) {
      return res.status(200).json({
        success: true,
        requests: [],
      });
    }

    // Get all requests for this plaza (both pending and done)
    const result = await pool.query(
      `SELECT 
        id,
        plaza_name,
        request_datetime,
        due_date,
        from_date,
        to_date,
        scope_name,
        req_id,
        done
      FROM idr_master 
      WHERE plaza_name = $1
      ORDER BY 
        CASE WHEN done = 'Done' THEN 1 ELSE 0 END,
        request_datetime DESC`,
      [plazaName]
    );

    return res.status(200).json({
      success: true,
      requests: result.rows,
    });
  } catch (error) {
    console.error('Get client requests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/idr/documents/:req_id
 * Get all document_master rows for a specific req_id and scope_name
 */
router.get('/documents/:req_id', requireAuth, async (req, res) => {
  try {
    const { req_id } = req.params;

    if (!req_id) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required',
      });
    }

    // Get scope_name from idr_master
    const idrResult = await pool.query(
      `SELECT scope_name FROM idr_master WHERE req_id = $1 LIMIT 1`,
      [req_id]
    );

    const scope_name = idrResult.rows.length > 0 ? idrResult.rows[0].scope_name : null;

    // Get all documents for this req_id (implicitly for its scope via idr_master)
    const result = await pool.query(
      `SELECT 
        id,
        req_id,
        document_type,
        document_url,
        modified_time,
        year,
        month,
        is_rejected,
        reason
      FROM document_master 
      WHERE req_id = $1
      ORDER BY year, month, document_type`,
      [req_id]
    );

    return res.status(200).json({
      success: true,
      documents: result.rows,
      scope_name: scope_name,
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/idr/upload-document
 * Upload a document to S3 and update document_master table
 */
router.post('/upload-document', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { req_id, document_type, year, month } = req.body;

    // Validate input
    if (!req_id || !document_type || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Request ID, document type, year, and month are required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required',
      });
    }

    // Get plaza_name and scope_name from idr_master
    const idrResult = await pool.query(
      'SELECT plaza_name, scope_name FROM idr_master WHERE req_id = $1 LIMIT 1',
      [req_id]
    );

    if (idrResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    const { plaza_name, scope_name } = idrResult.rows[0];

    if (!plaza_name || !scope_name) {
      return res.status(400).json({
        success: false,
        message: 'Plaza name or scope name not found for this request',
      });
    }

    // Get original filename
    const originalFileName = req.file.originalname;
    
    // Construct S3 key: IDR/plaza_name/scope/document_type/month-year/filename
    const s3Key = `IDR/${plaza_name}/${scope_name}/${document_type}/${month}-${year}/${originalFileName}`;

    // Upload to S3
    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Construct S3 URL
    const s3Url = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    // Get current datetime in Mumbai timezone
    const modifiedTimeResult = await pool.query(
      "SELECT NOW() AT TIME ZONE 'Asia/Kolkata' as current_time"
    );
    const modifiedTime = modifiedTimeResult.rows[0].current_time;

    // Check if any row exists with a document_url for this req_id, document_type, year, month
    const existingRowWithUrl = await pool.query(
      `SELECT id FROM document_master 
       WHERE req_id = $1 AND document_type = $2 AND year = $3 AND month = $4 AND document_url IS NOT NULL
       LIMIT 1`,
      [req_id, document_type, year, month]
    );

    let insertResult;
    if (existingRowWithUrl.rows.length > 0) {
      // If a row with document_url exists, create a new row for the additional file
      insertResult = await pool.query(
        `INSERT INTO document_master (req_id, document_type, document_url, modified_time, year, month)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, req_id, document_type, document_url, modified_time, year, month`,
        [req_id, document_type, s3Url, modifiedTime, year, month]
      );
    } else {
      // If no row with document_url exists, check for empty row or create new one
      const emptyRow = await pool.query(
        `SELECT id FROM document_master 
         WHERE req_id = $1 AND document_type = $2 AND year = $3 AND month = $4 AND document_url IS NULL
         LIMIT 1`,
        [req_id, document_type, year, month]
      );

      if (emptyRow.rows.length > 0) {
        // Update the empty row
        insertResult = await pool.query(
          `UPDATE document_master 
           SET document_url = $1, modified_time = $2
           WHERE id = $3
           RETURNING id, req_id, document_type, document_url, modified_time, year, month`,
          [s3Url, modifiedTime, emptyRow.rows[0].id]
        );
      } else {
        // Create a new row (shouldn't happen normally, but handle edge case)
        insertResult = await pool.query(
          `INSERT INTO document_master (req_id, document_type, document_url, modified_time, year, month)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, req_id, document_type, document_url, modified_time, year, month`,
          [req_id, document_type, s3Url, modifiedTime, year, month]
        );
      }
    }

    // Check if all documents for this req_id are uploaded and not rejected
    // If so, mark the request as 'Done' in idr_master
    const allDocumentsCheck = await pool.query(
      `SELECT 
        COUNT(*) as total_rows,
        COUNT(CASE WHEN document_url IS NOT NULL THEN 1 END) as rows_with_url,
        COUNT(CASE WHEN is_rejected = TRUE THEN 1 END) as rejected_rows
      FROM document_master 
      WHERE req_id = $1`,
      [req_id]
    );

    const { total_rows, rows_with_url, rejected_rows } = allDocumentsCheck.rows[0];
    const totalRows = parseInt(total_rows, 10);
    const rowsWithUrl = parseInt(rows_with_url, 10);
    const rejectedRows = parseInt(rejected_rows, 10);

    // If all rows have document_url and none are rejected, mark as Done
    if (totalRows > 0 && totalRows === rowsWithUrl && rejectedRows === 0) {
      await pool.query(
        `UPDATE idr_master 
         SET done = 'Done' 
         WHERE req_id = $1`,
        [req_id]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      document: insertResult.rows[0],
      url: s3Url,
    });
  } catch (error) {
    console.error('Upload document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/idr/delete-document
 * Delete a document from S3 and update/remove row from document_master table
 * - If last document: Delete from S3, set document_url to NULL (keep row)
 * - If multiple documents: Delete from S3, delete the entire row
 */
router.delete('/delete-document', requireAuth, async (req, res) => {
  try {
    const { document_id, req_id, document_type, year, month } = req.query;

    // Validate input
    if (!document_id || !req_id || !document_type || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Document ID, request ID, document type, year, and month are required',
      });
    }

    // Get document URL from document_master by ID
    const docResult = await pool.query(
      `SELECT document_url FROM document_master 
       WHERE id = $1`,
      [document_id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const documentUrl = docResult.rows[0].document_url;

    if (!documentUrl) {
      return res.status(400).json({
        success: false,
        message: 'Document URL not found',
      });
    }

    // Count how many rows with document_url exist for this req_id, document_type, year, month
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM document_master 
       WHERE req_id = $1 AND document_type = $2 AND year = $3 AND month = $4 AND document_url IS NOT NULL`,
      [req_id, document_type, year, month]
    );

    const documentCount = parseInt(countResult.rows[0].count, 10);

    // Delete from S3
    try {
      // Extract S3 key from URL
      // URL format: https://bucket-name.s3.region.amazonaws.com/key
      const urlParts = documentUrl.split('.amazonaws.com/');
      if (urlParts.length === 2) {
        const s3Key = urlParts[1];
        const deleteParams = {
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      }
    } catch (s3Error) {
      console.error('S3 delete error:', s3Error);
      // Continue to update database even if S3 delete fails
    }

    let result;
    if (documentCount === 1) {
      // Last document: Set document_url to NULL but keep the row
      const updateResult = await pool.query(
        `UPDATE document_master 
         SET document_url = NULL, modified_time = NOW() AT TIME ZONE 'Asia/Kolkata'
         WHERE id = $1
         RETURNING id, req_id, document_type, document_url, modified_time, year, month`,
        [document_id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      result = updateResult.rows[0];
    } else {
      // Multiple documents: Delete the entire row
      const deleteResult = await pool.query(
        `DELETE FROM document_master 
         WHERE id = $1
         RETURNING id, req_id, document_type, document_url, modified_time, year, month`,
        [document_id]
      );

      if (deleteResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      result = deleteResult.rows[0];
    }

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
      document: result,
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * POST /api/idr/replace-document
 * Replace a rejected document with a new upload in the same row
 */
router.post('/replace-document', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { document_id } = req.body;

    if (!document_id) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required',
      });
    }

    // Get existing document row (to know req_id, type, year, month and current URL)
    const docResult = await pool.query(
      `SELECT dm.id, dm.req_id, dm.document_type, dm.document_url, dm.year, dm.month, im.plaza_name, im.scope_name
       FROM document_master dm
       JOIN idr_master im ON dm.req_id = im.req_id
       WHERE dm.id = $1`,
      [document_id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const existing = docResult.rows[0];
    const { req_id, document_type, document_url, year, month, plaza_name, scope_name } = existing;

    if (!plaza_name || !scope_name) {
      return res.status(400).json({
        success: false,
        message: 'Plaza name or scope name not found for this request',
      });
    }

    // Upload new file to S3
    const originalFileName = req.file.originalname;
    const s3Key = `IDR/${plaza_name}/${scope_name}/${document_type}/${month}-${year}/${originalFileName}`;

    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const s3Url = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    // Delete old file from S3 if it exists
    if (document_url) {
      try {
        const urlParts = document_url.split('.amazonaws.com/');
        if (urlParts.length === 2) {
          const oldKey = urlParts[1];
          const deleteParams = {
            Bucket: S3_BUCKET_NAME,
            Key: oldKey,
          };
          await s3Client.send(new DeleteObjectCommand(deleteParams));
        }
      } catch (s3Error) {
        console.error('S3 delete (replace) error:', s3Error);
        // continue even if old delete fails
      }
    }

    // Get current datetime in Mumbai timezone
    const modifiedTimeResult = await pool.query(
      "SELECT NOW() AT TIME ZONE 'Asia/Kolkata' as current_time"
    );
    const modifiedTime = modifiedTimeResult.rows[0].current_time;

    // Update same row with new URL and clear rejection
    const updateResult = await pool.query(
      `UPDATE document_master
       SET document_url = $1,
           modified_time = $2,
           is_rejected = FALSE,
           reason = NULL
       WHERE id = $3
       RETURNING id, req_id, document_type, document_url, modified_time, year, month, is_rejected, reason`,
      [s3Url, modifiedTime, document_id]
    );

    // Check if all documents for this req_id are uploaded and not rejected
    // If so, mark the request as 'Done' in idr_master
    const allDocumentsCheck = await pool.query(
      `SELECT 
        COUNT(*) as total_rows,
        COUNT(CASE WHEN document_url IS NOT NULL THEN 1 END) as rows_with_url,
        COUNT(CASE WHEN is_rejected = TRUE THEN 1 END) as rejected_rows
      FROM document_master 
      WHERE req_id = $1`,
      [req_id]
    );

    const { total_rows, rows_with_url, rejected_rows } = allDocumentsCheck.rows[0];
    const totalRows = parseInt(total_rows, 10);
    const rowsWithUrl = parseInt(rows_with_url, 10);
    const rejectedRows = parseInt(rejected_rows, 10);

    // If all rows have document_url and none are rejected, mark as Done
    if (totalRows > 0 && totalRows === rowsWithUrl && rejectedRows === 0) {
      await pool.query(
        `UPDATE idr_master 
         SET done = 'Done' 
         WHERE req_id = $1`,
        [req_id]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Document replaced successfully',
      document: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Replace document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/idr/document-counts
 * Get document counts for plaza/month combinations
 * Returns counts grouped by req_id, plaza_name, year, month
 */
router.get('/document-counts', requireAuth, async (req, res) => {
  try {
    const { req_ids } = req.query;

    if (!req_ids) {
      return res.status(400).json({
        success: false,
        message: 'Request IDs are required',
      });
    }

    // Parse req_ids (comma-separated string)
    const reqIdArray = Array.isArray(req_ids) ? req_ids : req_ids.split(',').map(id => id.trim());

    // Get document counts for each req_id, year, month combination
    const result = await pool.query(
      `SELECT 
        dm.req_id,
        im.plaza_name,
        dm.year,
        dm.month,
        COUNT(*) as document_count
      FROM document_master dm
      INNER JOIN idr_master im ON dm.req_id = im.req_id
      WHERE dm.req_id = ANY($1::text[]) 
        AND dm.document_url IS NOT NULL
      GROUP BY dm.req_id, im.plaza_name, dm.year, dm.month`,
      [reqIdArray]
    );

    return res.status(200).json({
      success: true,
      counts: result.rows,
    });
  } catch (error) {
    console.error('Get document counts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/idr/plaza-documents
 * Get all documents for a specific plaza/month/req_id combination
 */
router.get('/plaza-documents', requireAuth, async (req, res) => {
  try {
    const { req_id, year, month } = req.query;

    if (!req_id || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Request ID, year, and month are required',
      });
    }

    // Get all documents for this req_id, year, month
    const result = await pool.query(
      `SELECT 
        id,
        req_id,
        document_type,
        document_url,
        modified_time,
        year,
        month,
        is_rejected,
        reason
      FROM document_master 
      WHERE req_id = $1 AND year = $2 AND month = $3 AND document_url IS NOT NULL
      ORDER BY document_type, modified_time`,
      [req_id, year, month]
    );

    return res.status(200).json({
      success: true,
      documents: result.rows,
    });
  } catch (error) {
    console.error('Get plaza documents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/idr/reject-documents
 * Reject selected documents by updating is_rejected and reason columns
 */
router.post('/reject-documents', requireAuth, async (req, res) => {
  try {
    const { document_ids, reason } = req.body;

    // Validate input
    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Document IDs array is required',
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Reason is required',
      });
    }

    // Get current datetime in Mumbai timezone
    const modifiedTimeResult = await pool.query(
      "SELECT NOW() AT TIME ZONE 'Asia/Kolkata' as current_time"
    );
    const modifiedTime = modifiedTimeResult.rows[0].current_time;

    // Update all selected documents
    const updateResult = await pool.query(
      `UPDATE document_master 
       SET is_rejected = TRUE, reason = $1, modified_time = $2
       WHERE id = ANY($3::int[])
       RETURNING id, req_id, document_type, document_url, is_rejected, reason, modified_time, year, month`,
      [reason.trim(), modifiedTime, document_ids]
    );

    // Get unique req_ids from rejected documents
    const uniqueReqIds = [...new Set(updateResult.rows.map(doc => doc.req_id))];

    // For each req_id, check if it's marked as 'Done' and clear it if so
    for (const reqId of uniqueReqIds) {
      const idrCheck = await pool.query(
        `SELECT done FROM idr_master WHERE req_id = $1`,
        [reqId]
      );

      if (idrCheck.rows.length > 0 && idrCheck.rows[0].done === 'Done') {
        // Clear the done status since documents are now rejected
        await pool.query(
          `UPDATE idr_master SET done = NULL WHERE req_id = $1`,
          [reqId]
        );
      }
    }

    // Send rejection emails
    try {
      // Group rejected documents by req_id to send one email per plaza
      const documentsByReqId = new Map();
      updateResult.rows.forEach(doc => {
        if (!documentsByReqId.has(doc.req_id)) {
          documentsByReqId.set(doc.req_id, []);
        }
        documentsByReqId.get(doc.req_id).push(doc);
      });

      // Send email for each unique req_id (plaza)
      for (const [reqId, docs] of documentsByReqId.entries()) {
        // Get plaza_name from idr_master
        const idrResult = await pool.query(
          `SELECT plaza_name FROM idr_master WHERE req_id = $1 LIMIT 1`,
          [reqId]
        );

        if (idrResult.rows.length === 0 || !idrResult.rows[0].plaza_name) {
          console.error(`Plaza name not found for req_id: ${reqId}`);
          continue;
        }

        const plazaName = idrResult.rows[0].plaza_name;

        // Get email_id from users table using plaza_name
        const userResult = await pool.query(
          `SELECT email_id FROM users WHERE plaza_name = $1 LIMIT 1`,
          [plazaName]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].email_id) {
          console.error(`Email ID not found for plaza: ${plazaName}`);
          continue;
        }

        const emailId = userResult.rows[0].email_id;

        // Format month names
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];

        // Build document list
        const documentList = docs.map(doc => {
          const monthName = monthNames[parseInt(doc.month) - 1] || doc.month;
          return `- ${doc.document_type} (${monthName} ${doc.year})`;
        }).join('\n');

        // Get login URL from environment or use default
        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        const fullLoginUrl = `${loginUrl}/login`;

        // Create email body
        const emailBody = `
Dear User,

Your documents have been rejected. Please review the details below and replace them.

Reason for Rejection:
${reason.trim()}

Rejected Documents:
${documentList}

Please log in to the IDR Portal using the link below and replace the rejected documents:
${fullLoginUrl}

After logging in, navigate to your document requests and replace the rejected documents with corrected versions.

If you have any questions or need assistance, please contact the administrator.

Best regards,
Sharp and Tannan Associates
        `.trim();

        // Send email
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: emailId,
          subject: 'Document Rejection Notification - IDR Portal',
          text: emailBody,
        });

        console.log(`Rejection email sent to ${emailId} for plaza ${plazaName}`);
      }
    } catch (emailError) {
      console.error('Error sending rejection emails:', emailError);
      // Don't fail the request if email fails, just log the error
    }

    return res.status(200).json({
      success: true,
      message: `Successfully rejected ${updateResult.rows.length} document(s)`,
      documents: updateResult.rows,
    });
  } catch (error) {
    console.error('Reject documents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/idr/request
 * Delete a request completely: delete all documents from S3, then delete from document_master and idr_master
 * Filters by scope_name, from_date, and to_date to get all related req_ids
 */
router.delete('/request', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { scope_name, from_date, to_date } = req.query;

    if (!scope_name || !from_date || !to_date) {
      client.release();
      return res.status(400).json({
        success: false,
        message: 'Scope name, from date, and to date are required',
      });
    }

    // Parse dates and extract just the date part (YYYY-MM-DD)
    // Handle both ISO timestamp format and date-only format
    const parseDate = (dateString) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const fromDateOnly = parseDate(from_date);
    const toDateOnly = parseDate(to_date);

    // Start transaction
    await client.query('BEGIN');

    // Get all req_ids that match the filter criteria
    // Use CAST to ensure proper date comparison
    const idrResult = await client.query(
      `SELECT req_id FROM idr_master 
       WHERE scope_name = $1 AND from_date = $2::DATE AND to_date = $3::DATE`,
      [scope_name, fromDateOnly, toDateOnly]
    );

    if (idrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({
        success: false,
        message: 'No requests found matching the criteria',
      });
    }

    const reqIds = idrResult.rows.map(row => row.req_id);

    // Get all document_master rows for all these req_ids
    const documentsResult = await client.query(
      `SELECT id, document_url FROM document_master 
       WHERE req_id = ANY($1::text[]) AND document_url IS NOT NULL`,
      [reqIds]
    );

    const documents = documentsResult.rows;

    // Delete all documents from S3 first
    const s3DeleteErrors = [];
    for (const doc of documents) {
      if (doc.document_url) {
        try {
          // Extract S3 key from URL
          // URL format: https://bucket-name.s3.region.amazonaws.com/key
          const urlParts = doc.document_url.split('.amazonaws.com/');
          if (urlParts.length === 2) {
            const s3Key = urlParts[1];
            const deleteParams = {
              Bucket: S3_BUCKET_NAME,
              Key: s3Key,
            };
            await s3Client.send(new DeleteObjectCommand(deleteParams));
            console.log(`Deleted S3 object: ${s3Key}`);
          }
        } catch (s3Error) {
          console.error(`Error deleting S3 object for document ${doc.id}:`, s3Error);
          s3DeleteErrors.push({ document_id: doc.id, error: s3Error.message });
          // Continue with other deletions even if one fails
        }
      }
    }

    // If there were S3 deletion errors, log them but continue with database deletion
    if (s3DeleteErrors.length > 0) {
      console.error('Some S3 deletions failed:', s3DeleteErrors);
    }

    // Delete all rows from document_master for all these req_ids
    await client.query(
      'DELETE FROM document_master WHERE req_id = ANY($1::text[])',
      [reqIds]
    );

    // Delete all rows from idr_master matching the filter (after document_master deletion)
    await client.query(
      `DELETE FROM idr_master 
       WHERE scope_name = $1 AND from_date = $2::DATE AND to_date = $3::DATE`,
      [scope_name, fromDateOnly, toDateOnly]
    );

    // Commit transaction
    await client.query('COMMIT');
    client.release();

    return res.status(200).json({
      success: true,
      message: `Request and all associated documents deleted successfully`,
      deletedRequests: reqIds.length,
      deletedDocuments: documents.length,
      s3Errors: s3DeleteErrors.length > 0 ? s3DeleteErrors : undefined,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Delete request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;

