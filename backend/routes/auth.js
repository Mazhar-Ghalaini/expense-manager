const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getCurrency } = require('../config/currencies');

// ==========================================
// دالة توليد Token
// ==========================================
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'anySecretKey',
    { expiresIn: '30d' }
  );
};

// ==========================================
// Register - مع دعم العملات
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, currencyCode } = req.body;
    
    console.log('📝 طلب تسجيل جديد:', { name, email, phone, currencyCode });
    
    // التحقق من البيانات
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'الرجاء ملء جميع الحقول المطلوبة' 
      });
    }
    
    // التحقق من عدم وجود المستخدم
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل' 
      });
    }
    
    // الحصول على معلومات العملة
    const currencyInfo = getCurrency(currencyCode || 'SAR');
    
    // إنشاء المستخدم
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      role: 'user',
      currency: {
        code: currencyInfo.code,
        symbol: currencyInfo.symbol,
        name: currencyInfo.name,
        nameAr: currencyInfo.nameAr
      },
      subscription: {
        plan: 'free',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    console.log('✅ تم إنشاء المستخدم بعملة:', currencyInfo.nameAr);
    
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        currency: user.currency,
        subscription: user.subscription
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في التسجيل:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في إنشاء الحساب',
      error: error.message 
    });
  }
});

// ==========================================
// Login - مع إرجاع العملة
// ==========================================
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 محاولة تسجيل دخول:', req.body.email);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ المستخدم غير موجود');
      return res.status(401).json({ 
        success: false,
        message: 'بيانات الدخول غير صحيحة' 
      });
    }

    console.log('👤 المستخدم موجود، التحقق من كلمة المرور...');
    
    const isMatch = await user.comparePassword(password);
    
    console.log('🔑 نتيجة المقارنة:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'بيانات الدخول غير صحيحة' 
      });
    }

    const token = generateToken(user._id);
    
    console.log('✅ تم تسجيل الدخول بنجاح');

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        currency: user.currency,
        subscription: user.subscription
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في تسجيل الدخول', 
      error: error.message 
    });
  }
});

// ==========================================
// Get User Profile - جديد
// ==========================================
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'المستخدم غير موجود' 
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        currency: user.currency,
        subscription: user.subscription,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب البروفايل:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في الخادم',
      error: error.message 
    });
  }
});

// ==========================================
// Update Email - جديد
// ==========================================
router.put('/update-email', protect, async (req, res) => {
  try {
    const { email } = req.body;
    
    // التحقق من صحة البريد
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني غير صحيح' 
      });
    }
    
    // التحقق من وجود البريد مسبقاً
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني مستخدم بالفعل' 
      });
    }
    
    // تحديث البريد
    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { email: email.toLowerCase().trim() }, 
      { new: true }
    ).select('-password');
    
    console.log('✅ تم تحديث البريد الإلكتروني:', email);
    
    res.json({ 
      success: true, 
      message: 'تم تحديث البريد بنجاح',
      email: user.email
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث البريد:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في الخادم',
      error: error.message 
    });
  }
});

// ==========================================
// Update Currency
// ==========================================
router.patch('/update-currency', protect, async (req, res) => {
  try {
    const { currencyCode } = req.body;
    
    if (!currencyCode) {
      return res.status(400).json({ 
        success: false,
        message: 'الرجاء تحديد رمز العملة' 
      });
    }
    
    const currencyInfo = getCurrency(currencyCode);
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        currency: {
          code: currencyInfo.code,
          symbol: currencyInfo.symbol,
          name: currencyInfo.name,
          nameAr: currencyInfo.nameAr
        }
      },
      { new: true }
    ).select('-password');
    
    console.log('✅ تم تحديث العملة إلى:', currencyInfo.nameAr);
    
    res.json({
      success: true,
      message: `تم تغيير العملة إلى ${currencyInfo.nameAr}`,
      currency: user.currency
    });
    
  } catch (error) {
    console.error('❌ خطأ في تحديث العملة:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في تحديث العملة', 
      error: error.message 
    });
  }
});

// ==========================================
// Get All Currencies
// ==========================================
router.get('/currencies', (req, res) => {
  const { getAllCurrencies } = require('../config/currencies');
  res.json({
    success: true,
    currencies: getAllCurrencies()
  });
});

// ==========================================
// Change Password
// ==========================================
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'الرجاء إدخال كلمة المرور الحالية والجديدة' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' 
      });
    }
    
    const user = await User.findById(req.user._id);
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة' 
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    console.log('✅ تم تغيير كلمة المرور بنجاح');
    
    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('❌ خطأ في تغيير كلمة المرور:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في تغيير كلمة المرور',
      error: error.message 
    });
  }
});

// ==========================================
// Forgot Password - طلب إعادة تعيين
// ==========================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'الرجاء إدخال البريد الإلكتروني' 
      });
    }
    
    console.log('📧 طلب إعادة تعيين كلمة المرور:', email);
    
    // البحث عن المستخدم
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // ✅ نرسل نفس الرسالة سواء الـ Email موجود أو لا (أمان)
    if (!user) {
      console.log('⚠️ البريد غير موجود - لكن سنرسل رسالة عامة');
      return res.json({
        success: true,
        message: 'إذا كان البريد الإلكتروني مسجلاً لدينا، سيتم إرسال رابط إعادة التعيين'
      });
    }
    
    // توليد Token فريد
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // مدة الصلاحية: 5 دقائق
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    // حفظ في قاعدة البيانات
    const PasswordReset = require('../models/PasswordReset');
    await PasswordReset.create({
      userId: user._id,
      email: user.email,
      token,
      expiresAt
    });
    
// تحديد الـ Frontend URL بشكل ديناميكي
const frontendURL = process.env.FRONTEND_URL 
    || (req.get('origin')) 
    || 'http://localhost:5000';

const resetLink = `${frontendURL}/reset-password.html?token=${token}`;

console.log('🔗 رابط إعادة التعيين:', resetLink);
    
    // إرسال Email
    const { sendPasswordResetEmail } = require('../utils/emailService');
    const emailResult = await sendPasswordResetEmail(user.email, user.name, resetLink);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ في إرسال البريد الإلكتروني'
      });
    }
    
    console.log('✅ تم إرسال رابط إعادة التعيين بنجاح');
    
    res.json({
      success: true,
      message: 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني'
    });
    
  } catch (error) {
    console.error('❌ خطأ في forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message
    });
  }
});

// ==========================================
// Reset Password - تنفيذ إعادة التعيين
// ==========================================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال جميع البيانات المطلوبة'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      });
    }
    
    console.log('🔐 محاولة إعادة تعيين كلمة المرور بـ Token');
    
    // البحث عن الـ Token
    const PasswordReset = require('../models/PasswordReset');
    const resetRequest = await PasswordReset.findOne({ 
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!resetRequest) {
      console.log('❌ Token غير صالح أو منتهي');
      return res.status(400).json({
        success: false,
        message: 'الرابط غير صالح أو منتهي الصلاحية'
      });
    }
    
    // البحث عن المستخدم
    const user = await User.findById(resetRequest.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // تحديث كلمة المرور
    user.password = newPassword;
    await user.save();
    
    // تعليم الـ Token كمستخدم
    resetRequest.used = true;
    await resetRequest.save();
    
    console.log('✅ تم تغيير كلمة المرور بنجاح');
    
    // إرسال Email تأكيد
    const { sendPasswordChangedEmail } = require('../utils/emailService');
    await sendPasswordChangedEmail(user.email, user.name);
    
    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول'
    });
    
  } catch (error) {
    console.error('❌ خطأ في reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message
    });
  }
});

module.exports = router;