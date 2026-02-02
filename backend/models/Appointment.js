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
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  reminderEmail: {
    type: String
  },
  addedVia: {
    type: String,
    default: 'manual'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema);