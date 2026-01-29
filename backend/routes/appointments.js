const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { protect } = require('../middleware/auth');
const axios = require('axios');

// ==========================================
// Get all appointments
// ==========================================
router.get('/', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id }).sort('date');
    
    res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب المواعيد', error: error.message });
  }
});

// ==========================================
// Add appointment
// ==========================================
router.post('/', protect, async (req, res) => {
  try {
    const appointment = await Appointment.create({
      user: req.user._id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في إضافة الموعد', error: error.message });
  }
});

// ==========================================
// Process AI Chat for appointment
// ==========================================
router.post('/ai-process', protect, async (req, res) => {
  try {
    const { message } = req.body;
    
    const appointmentData = extractAppointmentFromText(message);
    
    if (appointmentData) {
      const appointment = await Appointment.create({
        user: req.user._id,
        ...appointmentData,
        addedVia: 'ai-chat'
      });

      res.json({
        success: true,
        message: 'تم إضافة الموعد بنجاح',
        appointment
      });
    } else {
      res.status(400).json({ 
        message: 'لم أستطع فهم الموعد. مثال: "موعد غدا الساعة 3 مساءً مع الطبيب"' 
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'خطأ في معالجة الموعد', error: error.message });
  }
});

// ==========================================
// Helper function to extract appointment from text
// ==========================================
function extractAppointmentFromText(text) {
  // Extract time
  const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(ص|م|صباحا|مساء)?/);
  let time = '12:00';
  
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] || '00';
    const period = timeMatch[3];
    
    if (period && (period.includes('م') || period.includes('مساء')) && hour < 12) {
      hour += 12;
    }
    
    time = `${hour.toString().padStart(2, '0')}:${minute}`;
  }
  
  // Extract date
  let date = new Date();
  if (text.includes('غدا') || text.includes('بكرة')) {
    date.setDate(date.getDate() + 1);
  } else if (text.includes('بعد غد')) {
    date.setDate(date.getDate() + 2);
  }
  
  // Extract title
  let title = text.replace(/موعد|اجتماع|الساعة|وقت|غدا|بكرة|اليوم|بعد غد|\d{1,2}:?\d{0,2}\s*(ص|م|صباحا|مساء)?/gi, '').trim();
  
  if (!title || title.length < 3) {
    return null;
  }
  
  return {
    title: title,
    date: date.toISOString().split('T')[0],
    time: time,
    description: text
  };
}

// ==========================================
// Send WhatsApp reminder
// ==========================================
router.post('/:id/remind', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    // WhatsApp API integration placeholder
    const message = `🔔 تذكير: ${appointment.title}\n📅 التاريخ: ${new Date(appointment.date).toLocaleDateString('ar-SA')}\n🕐 الوقت: ${appointment.time}`;

    console.log('WhatsApp Reminder:', message);
    console.log('To:', req.user.phone);

    // TODO: Integrate with actual WhatsApp API (Twilio, etc.)
    
    res.json({
      success: true,
      message: 'تم إرسال التذكير عبر واتساب'
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في إرسال التذكير', error: error.message });
  }
});

// ==========================================
// Update appointment status
// ==========================================
router.patch('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث الموعد', error: error.message });
  }
});

// ==========================================
// Delete appointment
// ==========================================
router.delete('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    res.json({ success: true, message: 'تم حذف الموعد' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في حذف الموعد', error: error.message });
  }
});

module.exports = router;