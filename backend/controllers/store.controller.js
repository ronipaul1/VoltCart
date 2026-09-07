const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const fallbackDir = path.join(__dirname, '..', 'data');
const fallbackFile = path.join(fallbackDir, 'store_state.json');

// Ensure fallback data directory exists
if (!fs.existsSync(fallbackDir)) {
  try {
    fs.mkdirSync(fallbackDir, { recursive: true });
  } catch (_) {}
}

let tableChecked = false;
async function ensureStoreTable() {
  if (tableChecked) return;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS store_sync (
        id INT PRIMARY KEY,
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    tableChecked = true;
  } catch (err) {
    console.warn('[Store Sync] Table check warning:', err.message);
  }
}

exports.getStoreState = async (req, res) => {
  try {
    await ensureStoreTable();

    // 1. Try fetching from MySQL database
    try {
      const [rows] = await db.execute('SELECT data FROM store_sync WHERE id = 1');
      if (rows.length && rows[0].data) {
        const parsed = JSON.parse(rows[0].data);
        return res.json({ success: true, source: 'database', data: parsed });
      }
    } catch (dbErr) {
      console.warn('[Store Sync] Could not read from DB:', dbErr.message);
    }

    // 2. Fallback to file storage if database has no row yet
    if (fs.existsSync(fallbackFile)) {
      const fileData = fs.readFileSync(fallbackFile, 'utf8');
      if (fileData) {
        return res.json({ success: true, source: 'file', data: JSON.parse(fileData) });
      }
    }

    return res.json({ success: true, source: 'default', data: null });
  } catch (error) {
    console.error('[Store Sync] Error fetching store state:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.syncStoreState = async (req, res) => {
  try {
    const { store } = req.body;
    if (!store) {
      return res.status(400).json({ success: false, message: 'Store data required.' });
    }

    const jsonStr = typeof store === 'string' ? store : JSON.stringify(store);

    // 1. Persist to MySQL database
    await ensureStoreTable();
    try {
      await db.execute(`
        INSERT INTO store_sync (id, data) VALUES (1, ?)
        ON DUPLICATE KEY UPDATE data = VALUES(data)
      `, [jsonStr]);
    } catch (dbErr) {
      console.warn('[Store Sync] DB persist warning:', dbErr.message);
    }

    // 2. Persist to file backup
    try {
      fs.writeFileSync(fallbackFile, jsonStr, 'utf8');
    } catch (fileErr) {
      console.warn('[Store Sync] File backup warning:', fileErr.message);
    }

    res.json({ success: true, message: 'Store state successfully synchronized.' });
  } catch (error) {
    console.error('[Store Sync] Error synchronizing store state:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

