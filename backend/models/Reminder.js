const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: String, // ✅ تغيير إلى String لتجنب مشاكل التاريخ
    required: true
  },
  time: {
    type: String,
    required: true
  },
  timezone: {
    type: String,
    default: 'Europe/Berlin'
  },
  priority: {
    type: String,
    enum: ['منخفض', 'متوسط', 'عالي'],
    default: 'متوسط'
  },
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  reminderEmail: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['appointment', 'custom'],
    default: 'custom'
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  completed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ✅ Index للأداء
reminderSchema.index({ user: 1, date: -1 });
reminderSchema.index({ user: 1, completed: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);