const cron = require('cron');
const { pool } = require('../config/db');
const { transporter } = require('../config/mail');

// Helper to format dates as DD-MM-YYYY
const formatDate = (dateInput) => {
  const d = new Date(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Main worker: find pending IDR emails and send them
const processPendingIdrEmails = async () => {
  const client = await pool.connect();

  try {
    // Find IDR master rows where email has not been sent yet
    const idrRes = await client.query(
      `SELECT id, plaza_name, scope_name, from_date, to_date, due_date
       FROM idr_master
       WHERE (email_sent IS NULL OR email_sent = '')`
    );

    if (idrRes.rows.length === 0) {
      return;
    }

    // Preload month-independent values
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const fullLoginUrl = `${loginUrl}/login`;

    for (const row of idrRes.rows) {
      const { id, plaza_name, scope_name, from_date, to_date, due_date } = row;

      if (!plaza_name || !scope_name) {
        console.error(`Skipping IDR row ${id}: missing plaza_name or scope_name`);
        // Mark as sent to avoid repeated attempts for invalid data
        await client.query('UPDATE idr_master SET email_sent = $1 WHERE id = $2', ['sent', id]);
        continue;
      }

      try {
        // Get required documents for this scope
        const scopeRes = await client.query(
          'SELECT required_documents FROM scope WHERE scope_name = $1',
          [scope_name]
        );

        if (scopeRes.rows.length === 0) {
          console.error(`Scope not found for IDR row ${id}, scope_name: ${scope_name}`);
          await client.query('UPDATE idr_master SET email_sent = $1 WHERE id = $2', ['sent', id]);
          continue;
        }

        const requiredDocumentsStr = scopeRes.rows[0].required_documents || '';
        const requiredDocuments = requiredDocumentsStr
          .split(',')
          .map((doc) => doc.trim())
          .filter((doc) => doc.length > 0);

        const documentList =
          requiredDocuments.length > 0
            ? requiredDocuments.map((doc) => `- ${doc}`).join('\n')
            : '- No specific document types configured.';

        // Get all emails linked to this plaza
        const userRes = await client.query(
          'SELECT email_id FROM users WHERE plaza_name = $1 AND email_id IS NOT NULL',
          [plaza_name]
        );

        if (userRes.rows.length === 0) {
          console.error(`No email IDs found for plaza: ${plaza_name} (IDR row ${id})`);
          // Mark as sent to avoid infinite retry loop
          await client.query('UPDATE idr_master SET email_sent = $1 WHERE id = $2', ['sent', id]);
          continue;
        }

        const toAddresses = userRes.rows.map((u) => u.email_id).join(',');

        const fromDateStr = formatDate(from_date);
        const toDateStr = formatDate(to_date);
        const dueDateStr = formatDate(due_date);

        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: toAddresses,
          subject: `New IDR Request: ${scope_name}`,
          text: `Dear User,

A new IDR request has been created for your plaza (${plaza_name}).

Scope: ${scope_name}
From: ${fromDateStr}
To: ${toDateStr}
Due Date: ${dueDateStr}

Required Document Types:
${documentList}

Please log in to the portal and upload the requested documents before the due date.

Login: ${fullLoginUrl}

Regards,
SNTA Team`,
        };

        await transporter.sendMail(mailOptions);
        console.log(
          `IDR request email sent for row ${id} to plaza ${plaza_name} (${toAddresses})`
        );

        // Mark as sent so it won't be reprocessed
        await client.query('UPDATE idr_master SET email_sent = $1 WHERE id = $2', ['sent', id]);
      } catch (emailErr) {
        console.error(`Error processing IDR email for row ${id}:`, emailErr);
        // Do not mark as sent so it will be retried on next cron run
      }
    }
  } catch (err) {
    console.error('Error in IDR email cron job:', err);
  } finally {
    client.release();
  }
};

// Run the script every 60 seconds
const job = new cron.CronJob('*/1 * * * *', processPendingIdrEmails);

module.exports = {
  startIdrEmailJob: () => {
    job.start();
  },
};


