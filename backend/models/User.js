const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'الاسم مطلوب'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'البريد الإلكتروني غير صحيح']
  },
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل']
  },
  phone: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // ✅ حقول التحقق من البريد
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  
  // العملة
  currency: {
    code: {
      type: String,
      default: 'SAR'
    },
    symbol: {
      type: String,
      default: 'ر.س'
    },
    name: {
      type: String,
      default: 'Saudi Riyal'
    },
    nameAr: {
      type: String,
      default: 'ريال سعودي'
    }
  },
  
  // الاشتراك
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    }
  },
  
  // 2FA (للمستقبل)
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ==========================================
// Middleware: تشفير الباسورد قبل الحفظ
// ==========================================
userSchema.pre('save', async function(next) {
  // إذا لم يتم تعديل الباسورد، لا نفعل شيء
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // تشفير الباسورد
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Method: مقارنة الباسورد
// ==========================================
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('خطأ في التحقق من كلمة المرور');
  }
};

// ==========================================
// Method: إخفاء الباسورد في JSON
// ==========================================
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.twoFactorSecret;
  delete user.emailVerificationToken;
  return user;
};

// ==========================================
// Index: تسريع البحث
// ==========================================
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);