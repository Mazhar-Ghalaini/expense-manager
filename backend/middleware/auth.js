const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware للتحقق من صحة التوكن
const auth = async (req, res, next) => {
    try {
        // الحصول على التوكن من الهيدر
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'لا يوجد توكن، الوصول مرفوض'
            });
        }

        // التحقق من التوكن
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'anySecretKey');


        // البحث عن المستخدم
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // إضافة المستخدم إلى الـ request
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(401).json({
            success: false,
            message: 'التوكن غير صالح'
        });
    }
};

// Middleware للتحقق من صلاحية الأدمن
const adminOnly = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'يجب تسجيل الدخول أولاً'
            });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالوصول لهذه الصفحة'
            });
        }

        next();
    } catch (error) {
        console.error('Admin Auth Error:', error);
        res.status(403).json({
            success: false,
            message: 'خطأ في التحقق من الصلاحيات'
        });
    }
};

// للتوافق مع الكود القديم
const protect = auth;

module.exports = { auth, protect, adminOnly };