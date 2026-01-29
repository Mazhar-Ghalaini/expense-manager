const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'غير مصرح بالوصول' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ message: 'المستخدم غير موجود' });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'رمز الدخول غير صالح' });
  }
};

// Admin only
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'محظور - مسموح للمدراء فقط' });
  }
  next();
};

// Generate JWT Token
exports.generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d'
  });
};