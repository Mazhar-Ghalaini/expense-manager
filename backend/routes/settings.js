const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { auth ,protect, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// إعداد رفع الملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|svg/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('الملف يجب أن يكون صورة'));
  }
});

// ==========================================
// Get Settings
// ==========================================
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      // إنشاء إعدادات افتراضية
      settings = await Settings.create({});
    }
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب الإعدادات', error: error.message });
  }
});

// ==========================================
// Update General Settings (Admin Only)
// ==========================================
router.patch('/general', protect, adminOnly, async (req, res) => {
  try {
    const { siteName, siteDescription } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    
    if (siteName) settings.siteName = siteName;
    if (siteDescription) settings.siteDescription = siteDescription;
    
    settings.updatedAt = Date.now();
    await settings.save();
    
    res.json({
      success: true,
      message: 'تم تحديث الإعدادات العامة',
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث الإعدادات', error: error.message });
  }
});

// ==========================================
// Update Homepage Settings
// ==========================================
router.patch('/homepage', protect, adminOnly, async (req, res) => {
  try {
    const { heroTitle, heroDescription, heroImage, ctaTitle, ctaDescription } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    
    if (heroTitle) settings.homepage.heroTitle = heroTitle;
    if (heroDescription) settings.homepage.heroDescription = heroDescription;
    if (heroImage) settings.homepage.heroImage = heroImage;
    if (ctaTitle) settings.homepage.ctaTitle = ctaTitle;
    if (ctaDescription) settings.homepage.ctaDescription = ctaDescription;
    
    settings.updatedAt = Date.now();
    await settings.save();
    
    res.json({
      success: true,
      message: 'تم تحديث إعدادات الصفحة الرئيسية',
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث الصفحة الرئيسية', error: error.message });
  }
});

// ==========================================
// Update Colors
// ==========================================
router.patch('/colors', protect, adminOnly, async (req, res) => {
  try {
    const { primary, secondary, danger, warning, dark, light } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    
    if (primary) settings.colors.primary = primary;
    if (secondary) settings.colors.secondary = secondary;
    if (danger) settings.colors.danger = danger;
    if (warning) settings.colors.warning = warning;
    if (dark) settings.colors.dark = dark;
    if (light) settings.colors.light = light;
    
    settings.updatedAt = Date.now();
    await settings.save();
    
    res.json({
      success: true,
      message: 'تم تحديث الألوان',
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث الألوان', error: error.message });
  }
});

// ==========================================
// Update Header
// ==========================================
router.patch('/header', protect, adminOnly, async (req, res) => {
  try {
    const { showLogo, links } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    
    if (showLogo !== undefined) settings.header.showLogo = showLogo;
    if (links) settings.header.links = links;
    
    settings.updatedAt = Date.now();
    await settings.save();
    
    res.json({
      success: true,
      message: 'تم تحديث إعدادات الـ Header',
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث الـ Header', error: error.message });
  }
});

// ==========================================
// Update Footer
// ==========================================
router.patch('/footer', protect, adminOnly, async (req, res) => {
  try {
    const { aboutText, copyright, socialLinks, quickLinks } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    
    if (aboutText) settings.footer.aboutText = aboutText;
    if (copyright) settings.footer.copyright = copyright;
    if (socialLinks) settings.footer.socialLinks = socialLinks;
    if (quickLinks) settings.footer.quickLinks = quickLinks;
    
    settings.updatedAt = Date.now();
    await settings.save();
    
    res.json({
      success: true,
      message: 'تم تحديث إعدادات الـ Footer',
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث الـ Footer', error: error.message });
  }
});

// ==========================================
// Update Subscription Plans
// ==========================================
router.patch('/subscription-plans', protect, adminOnly, async (req, res) => {
  try {
    const { plans } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    
    if (plans) settings.subscriptionPlans = plans;
    
    settings.updatedAt = Date.now();
    await settings.save();
    
    res.json({
      success: true,
      message: 'تم تحديث خطط الاشتراك',
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث خطط الاشتراك', error: error.message });
  }
});

// ==========================================
// Upload Logo
// ==========================================
router.post('/upload-logo', protect, adminOnly, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم رفع أي ملف' });
    }
    
    const logoPath = '/uploads/' + req.file.filename;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    
    settings.logo = logoPath;
    settings.updatedAt = Date.now();
    await settings.save();
    
    res.json({
      success: true,
      message: 'تم رفع الشعار بنجاح',
      logoPath
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في رفع الشعار', error: error.message });
  }
});

// ==========================================
// Upload Image
// ==========================================
router.post('/upload-image', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم رفع أي ملف' });
    }
    
    const imagePath = '/uploads/' + req.file.filename;
    
    res.json({
      success: true,
      message: 'تم رفع الصورة بنجاح',
      imagePath
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في رفع الصورة', error: error.message });
  }
});

module.exports = router;