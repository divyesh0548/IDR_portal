const crypto = require('crypto');
const cron = require('cron');
const { pool } = require('../config/db');  // Import your db connection pool
const { transporter } = require('../config/mail');  // Import the transporter from mail.js

// Function to generate a temporary password
const generateTempPassword = () => {
  return crypto.randomBytes(5).toString('hex'); // 10 characters
};

// Function to send email
const sendEmail = async (email, tempPassword) => {
  try {
    const emailBody = `
Dear User,

Your IDR Portal login credentials have been created. Please use the following details to log in:

Email ID: ${email}
Temporary Password: ${tempPassword}

Please log in to the IDR Portal using the above credentials and change your temporary password immediately after your first login for security purposes.

If you have any issues logging in or need assistance, please contact the administrator.

Best regards,
Sharp and Tannan Associates
    `.trim();

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,  // Email from .env
      to: email,
      subject: 'IDR portal login credentials',
      text: emailBody,
    });
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Function to check users and update them
const checkAndUpdateUsers = async () => {
  const client = await pool.connect();  // Get a client from the pool

  try {
    // Query to get users where login_email_sent is false
    const res = await client.query("SELECT id, email_id, login_email_sent FROM users WHERE login_email_sent = false");

    if (res.rows.length > 0) {
      for (let user of res.rows) {
        const tempPassword = generateTempPassword();

        // Update the password column with the generated temporary password
        await client.query('UPDATE users SET password = $1 WHERE id = $2', [tempPassword, user.id]);

        // Send email with temporary password
        await sendEmail(user.email_id, tempPassword);

        // Update the login_email_sent column to true
        await client.query('UPDATE users SET login_email_sent = true WHERE id = $1', [user.id]);
      }
    }
  } catch (err) {
    console.error('Error in database operation:', err);
  } finally {
    client.release();  // Release the client back to the pool
  }
};

// Run the script every 60 seconds
const job = new cron.CronJob('*/1 * * * *', checkAndUpdateUsers); // Cron job runs every 1 minute

module.exports = {
  sendLoginEmail: () => {
    job.start();  // Start the cron job
  }
};
