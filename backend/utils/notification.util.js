// notification.util.js
const db = require('../config/database');

exports.createNotification = async (userId, title, message, type = 'system', data = null) => {
  try {
    await db.execute(
      'INSERT INTO notifications (user_id, title, message, type, data) VALUES (?, ?, ?, ?, ?)',
      [userId, title, message, type, data ? JSON.stringify(data) : null]
    );
  } catch (err) {
    console.error('Notification error:', err);
  }
};
