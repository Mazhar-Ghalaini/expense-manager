const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');
const Settings = require('./models/Settings');
require('dotenv').config();

const app = express();

// Connect to database
connectDB();

// Middleware
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-render-url.onrender.com', 'https://www.your-domain.com']
        : ['http://localhost:5000', 'http://127.0.0.1:5000'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Create uploads folder if not exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ تم إنشاء مجلد uploads');
}

// ==========================================
// إنشاء حساب أدمن افتراضي - تعريف الدالة أولاً
// ==========================================
const createDefaultAdmin = async () => {
  try {
    // حذف جميع حسابات الأدمن القديمة
   // await User.deleteMany({ email: 'admin@admin.com' });
    
    // إنشاء أدمن جديد
    const admin = await User.create({
      name: 'المدير العام',
      email: 'admin@admin.com',
      password: 'admin123',
      role: 'admin',
      phone: '0500000000',
      currency: {
        code: 'SAR',
        symbol: 'ر.س',
        name: 'Saudi Riyal',
        nameAr: 'ريال'
      },
      subscription: {
        plan: 'premium',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });
    
    console.log('✅ ═══════════════════════════════════════');
    console.log('✅ تم إنشاء حساب الأدمن بنجاح!');
    console.log('✅ ═══════════════════════════════════════');
    console.log('📧 Email: admin@admin.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role:', admin.role);
    console.log('✅ ═══════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء الأدمن:', error.message);
  }
};

// ==========================================
// إنشاء إعدادات افتراضية - تعريف الدالة أولاً
// ==========================================
const createDefaultSettings = async () => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({
        siteName: 'مدير المصروفات الذكي',
        siteDescription: 'تطبيق إدارة المصروفات والمواعيد بالذكاء الاصطناعي',
        logo: '',
        favicon: '',
        homepage: {
          heroTitle: 'إدارة مصروفاتك بذكاء اصطناعي',
          heroDescription: 'تتبع مصروفاتك، نظم مواعيدك، واحصل على تقارير تفصيلية بكل سهولة باستخدام الذكاء الاصطناعي والأوامر الصوتية',
          heroImage: 'https://via.placeholder.com/500x400/4a90e2/ffffff?text=Smart+Expense+Manager',
          ctaTitle: 'جاهز للبدء؟',
          ctaDescription: 'انضم لآلاف المستخدمين الذين يديرون مصروفاتهم بذكاء'
        },
        colors: {
          primary: '#667eea',
          secondary: '#50c878',
          danger: '#e74c3c',
          warning: '#f39c12',
          dark: '#2c3e50',
          light: '#ecf0f1'
        },
        header: {
          showLogo: true,
          links: [
            { title: 'الرئيسية', url: '#home', order: 0 },
            { title: 'المميزات', url: '#features', order: 1 },
            { title: 'الاشتراكات', url: 'subscription.html', order: 2 }
          ]
        },
        footer: {
          aboutText: 'مدير المصروفات الذكي - حلك الأمثل لإدارة مصروفاتك ومواعيدك',
          copyright: '© 2024 مدير المصروفات الذكي. جميع الحقوق محفوظة.',
          socialLinks: {
            facebook: '',
            twitter: '',
            instagram: '',
            linkedin: ''
          },
          quickLinks: [
            { title: 'من نحن', url: '#about' },
            { title: 'اتصل بنا', url: '#contact' }
          ]
        },
        subscriptionPlans: [
          {
            name: 'مجاني',
            nameEn: 'free',
            price: 0,
            currency: 'SAR',
            duration: 30,
            features: [
              'تتبع المصروفات الأساسي',
              '10 مصروفات شهرياً',
              'دعم بريد إلكتروني'
            ],
            isActive: true,
            isFeatured: false
          },
          {
            name: 'أساسي',
            nameEn: 'basic',
            price: 29,
            currency: 'SAR',
            duration: 30,
            features: [
              'تتبع مصروفات غير محدود',
              'تقارير Excel',
              'مواعيد غير محدودة',
              'دعم أولوية'
            ],
            isActive: true,
            isFeatured: false
          },
          {
            name: 'مميز',
            nameEn: 'premium',
            price: 49,
            currency: 'SAR',
            duration: 30,
            features: [
              'كل مميزات الأساسي',
              'ذكاء اصطناعي متقدم',
              'تذكيرات واتساب',
              'تحليلات متقدمة',
              'دعم 24/7'
            ],
            isActive: true,
            isFeatured: true
          }
        ]
      });
      
      console.log('✅ تم إنشاء الإعدادات الافتراضية');
    } else {
      console.log('ℹ️  الإعدادات موجودة مسبقاً');
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء الإعدادات:', error.message);
  }
};

// ==========================================
// استدعاء الدوال بعد تعريفها
// ==========================================
setTimeout(createDefaultAdmin, 2000);
setTimeout(createDefaultSettings, 3000);

// ==========================================
// API Routes
// ==========================================
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api', dashboardRoutes);


// ==========================================
// Health check
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    time: new Date().toLocaleString('ar-SA'),
    nodeVersion: process.version
  });
});

// ==========================================
// Test route
// ==========================================
app.get('/test', (req, res) => {
  res.send(`
    <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .card {
            background: white;
            color: #333;
            padding: 40px;
            border-radius: 15px;
            max-width: 600px;
            margin: 0 auto;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          }
          h1 { color: #667eea; margin-bottom: 20px; }
          .success { 
            color: #50c878; 
            font-size: 4rem; 
            margin-bottom: 20px;
          }
          a {
            display: inline-block;
            margin-top: 20px;
            padding: 15px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            transition: all 0.3s;
          }
          a:hover { 
            background: #764ba2; 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          }
          .info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: right;
          }
          .info p {
            margin: 8px 0;
            color: #555;
          }
          .info strong {
            color: #667eea;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="success">✅</div>
          <h1>السيرفر يعمل بنجاح!</h1>
          <p style="color: #666; font-size: 1.1rem;">تطبيق مدير المصروفات الذكي</p>
          
          <div class="info">
            <p><strong>الوقت:</strong> ${new Date().toLocaleString('ar-SA')}</p>
            <p><strong>Node Version:</strong> ${process.version}</p>
            <p><strong>الحالة:</strong> نشط 🟢</p>
          </div>
          
          <a href="/">الذهاب للصفحة الرئيسية</a>
          <a href="/admin.html" style="background: #e74c3c; margin-right: 10px;">لوحة الأدمن</a>
        </div>
      </body>
    </html>
  `);
});

// ==========================================
// Catch all route
// ==========================================
app.get('*', (req, res) => {
  // تجاهل طلبات API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  
  // إرسال الصفحة الرئيسية لأي طلب آخر
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==========================================
// Error handler
// ==========================================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'حدث خطأ في الخادم',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==========================================
// Start Server
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('🚀 ═══════════════════════════════════════');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 URL: http://localhost:${PORT}`);
  console.log(`🚀 Test: http://localhost:${PORT}/test`);
  console.log(`🚀 Admin: http://localhost:${PORT}/admin.html`);
  console.log(`🚀 Node: ${process.version}`);
  console.log('🚀 ═══════════════════════════════════════');
});

// ==========================================
// Graceful shutdown
// ==========================================
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// ==========================================
// Unhandled errors
// ==========================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});