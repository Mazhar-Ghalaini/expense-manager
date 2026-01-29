const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  location: String,
  reminder: {
    whatsapp: {
      type: Boolean,
      default: false
    },
    email: {
      type: Boolean,
      default: false
    },
    reminderTime: {
      type: Number, // minutes before
      default: 30
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
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

module.exports = mongoose.model('Appointment', appointmentSchema);