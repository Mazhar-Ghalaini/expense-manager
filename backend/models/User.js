const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  phone: String,
  
  // ==========================================
  // إعدادات العملة - NEW
  // ==========================================
  currency: {
    code: {
      type: String,
      default: 'SAR',
      enum: ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'BHD', 'OMR', 'QAR', 'EGP', 'JOD', 'LBP', 'SYP', 'IQD', 'YER', 'MAD', 'TND', 'DZD', 'LYD', 'SDG', 'MRO']
    },
    symbol: {
      type: String,
      default: 'ر.س'
    },
    name: {
      type: String,
      default: 'ريال سعودي'
    },
    nameAr: {
      type: String,
      default: 'ريال'
    }
  },
  
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
