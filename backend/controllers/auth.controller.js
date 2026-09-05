const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { sendEmail } = require('../utils/email.util');

const normalizePhone = (phone = '') => String(phone).replace(/\D/g, '');

// ── Generate Tokens ───────────────────────────────────────────
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return { accessToken };
};

// ── Register ──────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, phone } = req.body;
    const normalizedEmail = email?.trim().toLowerCase() || null;
    const normalizedPhone = phone?.trim() || null;

    if (!normalizedEmail && !normalizedPhone) {
      return res.status(422).json({ success: false, message: 'Email address or phone number is required.' });
    }

    // Check existing user
    const [existingEmail] = normalizedEmail
      ? await db.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail])
      : [[]];
    if (existingEmail.length) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    const [existingPhone] = normalizedPhone
      ? await db.execute('SELECT id FROM users WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, "+", ""), " ", ""), "-", ""), "(", ""), ")", "") = ?', [normalizePhone(normalizedPhone)])
      : [[]];
    if (existingPhone.length) {
      return res.status(409).json({ success: false, message: 'Phone number already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, phone, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
      [name, normalizedEmail, hashedPassword, normalizedPhone, 'customer', true]
    );

    const userId = result.insertId;
    const { accessToken } = generateTokens(userId, 'customer');

    // Welcome email (non-blocking)
    if (normalizedEmail) {
      sendEmail({
        to: normalizedEmail,
        subject: 'Welcome to VoltCart!',
        template: 'welcome',
        data: { name },
      }).catch(console.error);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: {
        user: { id: userId, name, email: normalizedEmail, phone: normalizedPhone, role: 'customer' },
        accessToken,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ── Login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, phone, password, loginMethod } = req.body;
    const method = loginMethod === 'phone' || (!email && phone) ? 'phone' : 'email';
    const identifier = method === 'phone' ? normalizePhone(phone) : email?.trim().toLowerCase();

    if (!identifier) {
      return res.status(422).json({ success: false, message: 'Email address or phone number is required.' });
    }

    const [rows] = method === 'phone'
      ? await db.execute(
        'SELECT id, name, email, phone, password, role, is_active, avatar FROM users WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, "+", ""), " ", ""), "-", ""), "(", ""), ")", "") = ?',
        [identifier]
      )
      : await db.execute(
        'SELECT id, name, email, phone, password, role, is_active, avatar FROM users WHERE email = ?',
        [identifier]
      );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Contact support.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const { accessToken } = generateTokens(user.id, user.role);

    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar },
        accessToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ── Get Me ────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, avatar, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user.' });
  }
};

// ── Update Profile ────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

    const fields = [];
    const values = [];

    if (name) { fields.push('name = ?'); values.push(name); }
    if (phone) { fields.push('phone = ?'); values.push(phone); }
    if (avatar) { fields.push('avatar = ?'); values.push(avatar); }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    values.push(req.user.id);
    await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await db.execute(
      'SELECT id, name, email, phone, avatar, role FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ success: true, message: 'Profile updated!', data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed.' });
  }
};

// ── Change Password ───────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, rows[0].password);

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Password change failed.' });
  }
};
