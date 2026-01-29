const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['طعام', 'مواصلات', 'ترفيه', 'صحة', 'تعليم', 'فواتير', 'تسوق', 'أخرى']
  },
  description: String,
  date: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['نقدي', 'بطاقة', 'تحويل بنكي'],
    default: 'نقدي'
  },
  addedVia: {
    type: String,
    enum: ['manual', 'voice', 'ai-chat'],
    default: 'manual'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Expense', expenseSchema);