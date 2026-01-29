const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // إعدادات الموقع العامة
  siteName: {
    type: String,
    default: 'مدير المصروفات الذكي'
  },
  siteDescription: {
    type: String,
    default: 'تطبيق إدارة المصروفات والمواعيد بالذكاء الاصطناعي'
  },
  logo: {
    type: String,
    default: ''
  },
  favicon: {
    type: String,
    default: ''
  },
  
  // إعدادات الصفحة الرئيسية
  homepage: {
    heroTitle: {
      type: String,
      default: 'إدارة مصروفاتك بذكاء اصطناعي'
    },
    heroDescription: {
      type: String,
      default: 'تتبع مصروفاتك، نظم مواعيدك، واحصل على تقارير تفصيلية بكل سهولة باستخدام الذكاء الاصطناعي والأوامر الصوتية'
    },
    heroImage: {
      type: String,
      default: 'https://via.placeholder.com/500x400/4a90e2/ffffff?text=Smart+Expense+Manager'
    },
    ctaTitle: {
      type: String,
      default: 'جاهز للبدء؟'
    },
    ctaDescription: {
      type: String,
      default: 'انضم لآلاف المستخدمين الذين يديرون مصروفاتهم بذكاء'
    }
  },
  
  // إعدادات الألوان
  colors: {
    primary: {
      type: String,
      default: '#4a90e2'
    },
    secondary: {
      type: String,
      default: '#50c878'
    },
    danger: {
      type: String,
      default: '#e74c3c'
    },
    warning: {
      type: String,
      default: '#f39c12'
    },
    dark: {
      type: String,
      default: '#2c3e50'
    },
    light: {
      type: String,
      default: '#ecf0f1'
    }
  },
  
  // Header و Footer
  header: {
    showLogo: {
      type: Boolean,
      default: true
    },
    links: [{
      title: String,
      url: String,
      order: Number
    }]
  },
  
  footer: {
    aboutText: {
      type: String,
      default: 'مدير المصروفات الذكي - حلك الأمثل لإدارة مصروفاتك ومواعيدك'
    },
    copyright: {
      type: String,
      default: '2024 مدير المصروفات الذكي. جميع الحقوق محفوظة.'
    },
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String
    },
    quickLinks: [{
      title: String,
      url: String
    }]
  },
  
  // إعدادات خطط الاشتراك
  subscriptionPlans: [{
    name: {
      type: String,
      required: true
    },
    nameEn: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'SAR'
    },
    duration: {
      type: Number, // بالأيام
      default: 30
    },
    features: [String],
    isActive: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    }
  }],
  
  // إعدادات البريد الإلكتروني
  email: {
    host: String,
    port: Number,
    user: String,
    pass: String,
    from: String
  },
  
  // إعدادات WhatsApp
  whatsapp: {
    enabled: {
      type: Boolean,
      default: false
    },
    apiKey: String,
    phoneNumber: String
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Settings', settingsSchema);