const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getCurrency } = require('../config/currencies');

// ==========================================
// إعدادات الحماية
// ==========================================
const MAX_LOGIN_ATTEMPTS_EMAIL = 5;      // 5 محاولات للإيميل
const MAX_LOGIN_ATTEMPTS_IP = 10;        // 10 محاولات للـ IP
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 دقيقة
const CAPTCHA_THRESHOLD = 3;              // بعد 3 محاولات → CAPTCHA

// تخزين مؤقت للمحاولات (في الإنتاج: استخدم Redis)
const loginAttemptsByEmail = {};
const loginAttemptsByIP = {};
const blockedEmails = new Set();
const blockedIPs = new Set();

// ==========================================
// ✅ Rate Limiters (النسخة النهائية - بدون أخطاء)
// ==========================================

// Rate Limiter عام لجميع routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب كحد أقصى
  message: {
    success: false,
    message: 'عدد الطلبات كبير جداً، حاول بعد قليل'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate Limiter خاص بـ Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 20, // 20 محاولة login من نفس الـ IP
  message: {
    success: false,
    message: 'عدد محاولات تسجيل الدخول كبير جداً، حاول بعد 15 دقيقة'
  },
  skipSuccessfulRequests: true, // لا تحسب المحاولات الناجحة
  standardHeaders: true,
  legacyHeaders: false
});

// Rate Limiter خاص بـ Forgot Password
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة واحدة
  max: 3, // 3 محاولات فقط
  message: {
    success: false,
    message: 'لقد تجاوزت الحد المسموح، حاول بعد ساعة'
  },
  standardHeaders: true,
  legacyHeaders: false
  // ✅ لا يوجد keyGenerator - يستخدم الافتراضي
});

// ==========================================
// دالة تنظيف البيانات القديمة (كل 30 دقيقة)
// ==========================================
setInterval(() => {
  const now = Date.now();
  
  // تنظيف Email attempts
  Object.keys(loginAttemptsByEmail).forEach(email => {
    if (now - loginAttemptsByEmail[email].firstAttempt > BLOCK_DURATION_MS) {
      delete loginAttemptsByEmail[email];
      blockedEmails.delete(email);
    }
  });
  
  // تنظيف IP attempts
  Object.keys(loginAttemptsByIP).forEach(ip => {
    if (now - loginAttemptsByIP[ip].firstAttempt > BLOCK_DURATION_MS) {
      delete loginAttemptsByIP[ip];
      blockedIPs.delete(ip);
    }
  });
  
  console.log('🧹 تم تنظيف بيانات الحماية القديمة');
}, 30 * 60 * 1000);

// ==========================================
// دالة للتحقق من وجود المستخدم
// ==========================================
const userExists = async (email) => {
  if (!email) return false;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    return !!user;
  } catch (error) {
    return false;
  }
};

// ==========================================
// Middleware حماية تسجيل الدخول
// ==========================================
const loginProtection = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال البريد الإلكتروني'
      });
    }

    // ===== 1. فحص IP المحظور =====
    if (blockedIPs.has(ip)) {
      const ipData = loginAttemptsByIP[ip];
      if (ipData && now - ipData.firstAttempt < BLOCK_DURATION_MS) {
        const remainingTime = Math.ceil((BLOCK_DURATION_MS - (now - ipData.firstAttempt)) / 60000);
        console.log(`🚫 IP محظور: ${ip} - المتبقي: ${remainingTime} دقيقة`);
        
        return res.status(429).json({
          success: false,
          message: `تم حظر شبكتك مؤقتاً. حاول بعد ${remainingTime} دقيقة`,
          remainingTime
        });
      } else {
        // انتهت مدة الحظر
        blockedIPs.delete(ip);
        delete loginAttemptsByIP[ip];
      }
    }

    // ===== 2. فحص Email المحظور =====
    if (blockedEmails.has(email)) {
      const emailData = loginAttemptsByEmail[email];
      if (emailData && now - emailData.firstAttempt < BLOCK_DURATION_MS) {
        const remainingTime = Math.ceil((BLOCK_DURATION_MS - (now - emailData.firstAttempt)) / 60000);
        console.log(`🚫 Email محظور: ${email} - المتبقي: ${remainingTime} دقيقة`);
        
        return res.status(429).json({
          success: false,
          message: `هذا الحساب محظور مؤقتاً. حاول بعد ${remainingTime} دقيقة`,
          remainingTime
        });
      } else {
        // انتهت مدة الحظر
        blockedEmails.delete(email);
        delete loginAttemptsByEmail[email];
      }
    }

    // ===== 3. تهيئة العدادات =====
    if (!loginAttemptsByEmail[email]) {
      loginAttemptsByEmail[email] = { 
        count: 0, 
        firstAttempt: now,
        lastAttempt: now 
      };
    }

    if (!loginAttemptsByIP[ip]) {
      loginAttemptsByIP[ip] = { 
        count: 0, 
        firstAttempt: now,
        lastAttempt: now 
      };
    }

    // ===== 4. إعادة تعيين العدادات بعد انتهاء المدة =====
    const emailAttempt = loginAttemptsByEmail[email];
    const ipAttempt = loginAttemptsByIP[ip];

    if (now - emailAttempt.firstAttempt > BLOCK_DURATION_MS) {
      emailAttempt.count = 0;
      emailAttempt.firstAttempt = now;
    }

    if (now - ipAttempt.firstAttempt > BLOCK_DURATION_MS) {
      ipAttempt.count = 0;
      ipAttempt.firstAttempt = now;
    }

    // ===== 5. التحقق من العدادات =====
    if (emailAttempt.count >= MAX_LOGIN_ATTEMPTS_EMAIL) {
      blockedEmails.add(email);
      console.log(`🚫 Email محظور: ${email} (${emailAttempt.count} محاولات)`);
      
      return res.status(429).json({
        success: false,
        message: 'تم حظر هذا الحساب مؤقتاً بسبب محاولات تسجيل دخول فاشلة متكررة',
        remainingTime: 15
      });
    }

    if (ipAttempt.count >= MAX_LOGIN_ATTEMPTS_IP) {
      blockedIPs.add(ip);
      console.log(`🚫 IP محظور: ${ip} (${ipAttempt.count} محاولات)`);
      
      return res.status(429).json({
        success: false,
        message: 'تم حظر شبكتك مؤقتاً بسبب محاولات تسجيل دخول فاشلة متكررة',
        remainingTime: 15
      });
    }

    // ===== 6. تخزين بيانات المحاولة في req =====
    req.loginAttemptData = {
      email,
      ip,
      emailAttempt,
      ipAttempt,
      userExists: await userExists(email)
    };

    next();
    
  } catch (error) {
    console.error('❌ خطأ في loginProtection:', error);
    next(); // السماح بالمرور في حالة الخطأ
  }
};

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

// Register - مع إرسال بريد التحقق
router.post('/register', generalLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, currencyCode } = req.body;
    
    console.log('📝 طلب تسجيل جديد:', { name, email, phone, currencyCode });
    
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'الرجاء ملء جميع الحقول المطلوبة' 
      });
    }
    
    // التحقق من البريد المستخدم
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل' 
      });
    }
    
    const currencyInfo = getCurrency(currencyCode || 'SAR');
    
    // إنشاء المستخدم (غير مفعّل)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      role: 'user',
      emailVerified: false, // ✅ غير مفعّل
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
    
    console.log('✅ تم إنشاء المستخدم:', user.email);
    
    // ✅ إنشاء Token للتحقق
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ساعة
    await user.save();
    
    // ✅ إرسال بريد التحقق
    const frontendURL = process.env.FRONTEND_URL 
        || (req.get('origin')) 
        || (req.protocol + '://' + req.get('host'))
        || 'http://localhost:3000';
    
    const verificationLink = `${frontendURL}/verify-email.html?token=${verificationToken}`;
    
    const { sendVerificationEmail } = require('../utils/emailService');
    const emailResult = await sendVerificationEmail(user.email, user.name, verificationLink);
    
    if (!emailResult.success) {
      console.log('⚠️ فشل إرسال بريد التحقق، لكن المستخدم تم إنشاؤه');
    }
    
    // ✅ لا نعطي Token مباشرة - يجب التحقق أولاً
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب! الرجاء التحقق من بريدك الإلكتروني لتفعيل الحساب',
      emailSent: emailResult.success,
      email: user.email
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

// ✅ Route التحقق من البريد
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق مطلوب'
      });
    }
    
    console.log('🔍 محاولة التحقق من البريد بـ Token:', token.substring(0, 10) + '...');
    
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });
    
    if (!user) {
      console.log('❌ Token غير صالح أو منتهي');
      return res.status(400).json({
        success: false,
        message: 'رابط التحقق غير صالح أو منتهي الصلاحية'
      });
    }
    
    // ✅ تفعيل الحساب
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    
    console.log('✅ تم تفعيل الحساب:', user.email);
    
    // ✅ الآن نعطي Token للدخول
    const jwtToken = generateToken(user._id);
    
    res.json({
      success: true,
      message: 'تم تفعيل حسابك بنجاح! يمكنك الآن تسجيل الدخول',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: true
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في verify-email:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في التحقق',
      error: error.message
    });
  }
});

// ✅ إعادة إرسال بريد التحقق
router.post('/resend-verification', generalLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مطلوب'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'البريد الإلكتروني غير موجود'
      });
    }
    
    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'الحساب مفعّل بالفعل'
      });
    }
    
    // إنشاء Token جديد
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    
    // إرسال البريد
    const frontendURL = process.env.FRONTEND_URL 
        || (req.get('origin')) 
        || (req.protocol + '://' + req.get('host'))
        || 'http://localhost:3000';
    
    const verificationLink = `${frontendURL}/verify-email.html?token=${verificationToken}`;
    
    const { sendVerificationEmail } = require('../utils/emailService');
    const emailResult = await sendVerificationEmail(user.email, user.name, verificationLink);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ في إرسال البريد'
      });
    }
    
    console.log('✅ تم إعادة إرسال بريد التحقق:', user.email);
    
    res.json({
      success: true,
      message: 'تم إرسال رابط التحقق إلى بريدك الإلكتروني'
    });
    
  } catch (error) {
    console.error('❌ خطأ في resend-verification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message
    });
  }
});
// ==========================================
// Login - مع الحماية الكاملة
router.post('/login', loginLimiter, loginProtection, async (req, res) => {
  try {
    console.log('🔐 محاولة تسجيل دخول:', req.body.email);
    
    const { email, password } = req.body;
    const attemptData = req.loginAttemptData;

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
    
    if (!isMatch) {
      // زيادة العدادات فقط عند كلمة مرور خاطئة
      attemptData.emailAttempt.count += 1;
      attemptData.emailAttempt.lastAttempt = Date.now();
      
      attemptData.ipAttempt.count += 1;
      attemptData.ipAttempt.lastAttempt = Date.now();
      
      const remainingEmailAttempts = MAX_LOGIN_ATTEMPTS_EMAIL - attemptData.emailAttempt.count;
      
      console.log(`❌ كلمة مرور خاطئة - المتبقي: ${remainingEmailAttempts}`);
      
      let message = 'بيانات الدخول غير صحيحة';
      
      if (remainingEmailAttempts <= 2) {
        message += `. المتبقي ${remainingEmailAttempts} محاولات قبل الحظر`;
      }
      
      return res.status(401).json({ 
        success: false,
        message,
        remainingAttempts: remainingEmailAttempts
      });
    }

    // ✅✅✅ كلمة المرور صحيحة - فحص التفعيل ✅✅✅
    
    // 1️⃣ إذا لم يكن الحقل موجود أصلاً (حسابات قديمة) → فعّل تلقائياً
    if (user.emailVerified === undefined || user.emailVerified === null) {
      console.log('🔄 حساب قديم - تفعيل تلقائي:', user.email);
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
    }
    
    // 2️⃣ إذا كان الحساب غير مفعّل (حساب جديد)
    else if (user.emailVerified === false) {
      console.log('⚠️ حساب غير مفعّل:', user.email);
      
      // فحص: هل يحتاج Token جديد؟
      let needsNewToken = false;
      
      if (!user.emailVerificationToken || !user.emailVerificationExpires) {
        needsNewToken = true;
        console.log('📝 لا يوجد Token - إنشاء جديد');
      } else if (new Date(user.emailVerificationExpires) < new Date()) {
        needsNewToken = true;
        console.log('⏰ Token منتهي - إنشاء جديد');
      } else {
        console.log('✅ Token موجود وصالح');
      }
      
      // إرسال Token جديد إذا لزم الأمر
      if (needsNewToken) {
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ساعة
        await user.save();
        
        // إرسال البريد
        const frontendURL = process.env.FRONTEND_URL 
            || (req.get('origin')) 
            || (req.protocol + '://' + req.get('host'))
            || 'http://localhost:3000';
        
        const verificationLink = `${frontendURL}/verify-email.html?token=${verificationToken}`;
        
        console.log('🔗 رابط التفعيل:', verificationLink);
        
        const { sendVerificationEmail } = require('../utils/emailService');
        const emailResult = await sendVerificationEmail(user.email, user.name, verificationLink);
        
        if (emailResult.success) {
          console.log('✅ تم إرسال بريد التفعيل');
        } else {
          console.log('❌ فشل إرسال البريد');
        }
      }
      
      // منع تسجيل الدخول
      return res.status(403).json({
        success: false,
        message: 'الرجاء تفعيل بريدك الإلكتروني أولاً. ' + (needsNewToken ? 'تم إرسال رابط جديد' : 'تحقق من بريدك'),
        needsVerification: true,
        email: user.email,
        verificationSent: needsNewToken
      });
    }

    // 3️⃣ الحساب مفعّل ✅ - السماح بالدخول
    console.log('✅ الحساب مفعّل - السماح بالدخول');

    // إعادة تعيين عدادات المحاولات
    if (loginAttemptsByEmail[email]) {
      delete loginAttemptsByEmail[email];
    }
    blockedEmails.delete(email);

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
        emailVerified: user.emailVerified,
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
// Forgot Password - مع حماية
// ==========================================
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'الرجاء إدخال البريد الإلكتروني' 
      });
    }
    
    console.log('📧 طلب إعادة تعيين كلمة المرور:', email);
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('⚠️ البريد غير موجود - لكن سنرسل رسالة عامة');
      return res.json({
        success: true,
        message: 'إذا كان البريد الإلكتروني مسجلاً لدينا، سيتم إرسال رابط إعادة التعيين'
      });
    }
    
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    const PasswordReset = require('../models/PasswordReset');
    await PasswordReset.create({
      userId: user._id,
      email: user.email,
      token,
      expiresAt
    });
    
    const frontendURL = process.env.FRONTEND_URL 
        || (req.get('origin')) 
        || (req.protocol + '://' + req.get('host'))
        || 'http://localhost:5000';
    
    const resetLink = `${frontendURL}/reset-password.html?token=${token}`;
    
    console.log('🔗 رابط إعادة التعيين:', resetLink);
    
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
// Reset Password
// ==========================================
router.post('/reset-password', generalLimiter, async (req, res) => {
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
    
    const user = await User.findById(resetRequest.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    resetRequest.used = true;
    await resetRequest.save();
    
    // ✅ إعادة تعيين عدادات المحاولات للحساب
    if (loginAttemptsByEmail[user.email]) {
      delete loginAttemptsByEmail[user.email];
    }
    blockedEmails.delete(user.email);
    
    console.log('✅ تم تغيير كلمة المرور بنجاح');
    
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

// ==========================================
// Get Profile
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
// Update Email
// ==========================================
router.put('/update-email', protect, async (req, res) => {
  try {
    const { email } = req.body;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني غير صحيح' 
      });
    }
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني مستخدم بالفعل' 
      });
    }
    
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

module.exports = router;