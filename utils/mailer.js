const nodemailer = require('nodemailer');

// ── transporter ───────────────────────────────────────────────────────────────
// Uses Gmail SMTP. EMAIL_USER and EMAIL_PASS must be set in .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,  // use a Gmail App Password, not your account password
  },
});

// ── status labels for the email body ─────────────────────────────────────────
const STATUS_LABEL = {
  pending:   'Pending',
  ongoing:   'Ongoing',
  completed: 'Completed',
};

/**
 * Sends a task status change notification email.
 * @param {string} toEmail    recipient email address (the logged-in user)
 * @param {string} taskTitle  title of the task that was updated
 * @param {string} oldStatus  previous status
 * @param {string} newStatus  new status
 */
async function sendStatusChangeEmail(toEmail, taskTitle, oldStatus, newStatus) {
  const mailOptions = {
    from: `"Task Manager" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Task status updated: ${taskTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1f2937; margin-bottom: 8px;">Task Status Updated</h2>
        <p style="color: #6b7280; margin-bottom: 20px;">One of your tasks has been updated.</p>
        <div style="background: #fff; border-radius: 6px; padding: 16px; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 0 0 10px;"><strong>Previous status:</strong> ${STATUS_LABEL[oldStatus] || oldStatus}</p>
          <p style="margin: 0;"><strong>New status:</strong> ${STATUS_LABEL[newStatus] || newStatus}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">This is an automated notification from your Task Manager.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Sends a password reset email with a reset link.
 * @param {string} toEmail    recipient email address
 * @param {string} resetLink  full URL with reset token
 */
async function sendPasswordResetEmail(toEmail, resetLink) {
  const mailOptions = {
    from: `"Task Manager" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1f2937; margin-bottom: 8px;">Reset Your Password</h2>
        <p style="color: #6b7280; margin-bottom: 20px;">We received a request to reset your password. Click the button below to set a new one.</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #c8813a; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-bottom: 20px;">
          Reset Password
        </a>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">This is an automated notification from your Task Manager.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendStatusChangeEmail, sendPasswordResetEmail };
