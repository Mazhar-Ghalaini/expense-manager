const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { getCurrency } = require('../config/currencies');

// Register - مع دعم العملات
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

// Login - مع إرجاع العملة
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        currency: user.currency, // إرجاع العملة
        subscription: user.subscription
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تسجيل الدخول', error: error.message });
  }
});

const { protect } = require('../middleware/auth');

// Update user currency
router.patch('/update-currency', protect, async (req, res) => {
  try {
    const { currencyCode } = req.body;
    
    if (!currencyCode) {
      return res.status(400).json({ message: 'الرجاء تحديد رمز العملة' });
    }
    
    const { getCurrency } = require('../config/currencies');
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
    
    res.json({
      success: true,
      message: `تم تغيير العملة إلى ${currencyInfo.nameAr}`,
      currency: user.currency
    });
    
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث العملة', error: error.message });
  }
});

// Get all currencies
router.get('/currencies', (req, res) => {
  const { getAllCurrencies } = require('../config/currencies');
  res.json({
    success: true,
    currencies: getAllCurrencies()
  });
});

// Change Password
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
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
    
    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'خطأ في تغيير كلمة المرور',
      error: error.message 
    });
  }
});

module.exports = router;