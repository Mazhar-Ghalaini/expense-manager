const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { auth } = require('../middleware/auth');
const axios = require('axios');
const nodemailer = require('nodemailer');

// إعداد Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ==========================================
// Get all appointments
// ==========================================
router.get('/', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id }).sort('date');
    
    res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'خطأ في جلب المواعيد', 
      error: error.message 
    });
  }
});

// ==========================================
// Add appointment مع دعم التذكيرات
// ==========================================
router.post('/', auth, async (req, res) => {
  try {
    const { title, date, time, description, reminderEnabled, reminderEmail, timezone  } = req.body;
    
    // إنشاء الموعد
    const appointment = await Appointment.create({
      user: req.user._id,
      title,
      date,
      time,
      description,
      reminderEnabled: !!reminderEnabled,
      reminderEmail: reminderEnabled ? reminderEmail : null,
      timezone: timezone || 'UTC' // ← يجب أن تكون هذه آخر خاصية أو تنتهي بفاصلة

    });

    console.log('✅ تم إنشاء موعد:', appointment._id);

    // إذا كان التذكير مفعل - أنشئ التذكير
    if (reminderEnabled && reminderEmail) {
      try {
        const Reminder = require('../models/Reminder');
        
        const newReminder = await Reminder.create({
          user: req.user._id,
          title: `📅 ${title}`,
          description: description || 'تذكير بموعد',
          date: new Date(date),
          time: time,
          type: 'appointment',
          relatedId: appointment._id,
          email: reminderEmail,
          completed: false

        });
        
        console.log('✅ تم إنشاء تذكير:', newReminder._id);
        
        return res.status(201).json({
          success: true,
          message: 'تم إضافة الموعد والتذكير بنجاح',
          appointment,
          reminder: newReminder
        });
        
      } catch (reminderError) {
        console.error('⚠️ خطأ في إنشاء التذكير:', reminderError);
        
        return res.status(201).json({
          success: true,
          message: 'تم إضافة الموعد لكن فشل إنشاء التذكير',
          appointment,
          reminderError: reminderError.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'تم إضافة الموعد بنجاح',
      appointment
    });
    
  } catch (error) {
    console.error('❌ خطأ:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ==========================================
// Process AI Chat for appointment
// ==========================================
router.post('/ai-process', auth, async (req, res) => {
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
        success: false,
        message: 'لم أستطع فهم الموعد. مثال: "موعد غدا الساعة 3 مساءً مع الطبيب"' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'خطأ في معالجة الموعد', 
      error: error.message 
    });
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
// إرسال تذكير بالبريد الإلكتروني
// ==========================================
router.post('/:id/email-reminder', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'الموعد غير موجود' 
      });
    }

    if (!appointment.reminderEmail) {
      return res.status(400).json({ 
        success: false,
        message: 'لا يوجد بريد إلكتروني للتذكير' 
      });
    }

    // حفظ سجل الإرسال في التذكيرات
    try {
      const Reminder = require('../models/Reminder');
      await Reminder.create({
        user: req.user._id,
        title: `📧 تم إرسال تذكير: ${appointment.title}`,
        date: new Date(),
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        type: 'appointment',
        relatedId: appointment._id,
        email: appointment.reminderEmail,
        completed: true
      });
    } catch (err) {
      console.error('خطأ في حفظ سجل الإرسال:', err);
    }

// إرسال البريد الإلكتروني
const mailOptions = {
    from: process.env.EMAIL_USER,
    to: appointment.reminderEmail,
    subject: `تذكير: ${appointment.title}`,
    html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Arial; padding: 20px; background: #f5f5f5;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #667eea; margin-bottom: 20px;">🔔 تذكير بموعدك</h2>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 10px 0;"><strong>📌 العنوان:</strong> ${appointment.title}</p>
                    <p style="margin: 10px 0;"><strong>📅 التاريخ:</strong> ${new Date(appointment.date).toLocaleDateString('ar-SA')}</p>
                    <p style="margin: 10px 0;"><strong>🕐 الوقت:</strong> ${appointment.time}</p>
                    ${appointment.description ? `<p style="margin: 10px 0;"><strong>📝 الوصف:</strong> ${appointment.description}</p>` : ''}
                </div>
                <p style="color: #666; margin-top: 20px;">مع تحياتنا،<br><strong>مديرك الشخصي</strong></p>
            </div>
        </div>
    `
};

await transporter.sendMail(mailOptions);    
    res.json({
      success: true,
      message: `تم حفظ طلب التذكير لـ ${appointment.reminderEmail}`
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في إرسال التذكير',
      error: error.message
    });
  }
});

// ==========================================
// Send WhatsApp reminder
// ==========================================
router.post('/:id/whatsapp', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'الموعد غير موجود' 
      });
    }

    const message = `🔔 تذكير: ${appointment.title}\n📅 التاريخ: ${new Date(appointment.date).toLocaleDateString('ar-SA')}\n🕐 الوقت: ${appointment.time}`;

    console.log('WhatsApp Reminder:', message);
    console.log('To:', req.user.phone);

    // TODO: Integrate with actual WhatsApp API (Twilio, etc.)
    
    res.json({
      success: true,
      message: 'سيتم إرسال التذكير عبر واتساب قريباً'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'خطأ في إرسال التذكير', 
      error: error.message 
    });
  }
});

// ==========================================
// Update appointment status
// ==========================================
router.patch('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'الموعد غير موجود' 
      });
    }

    res.json({ 
      success: true, 
      appointment 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'خطأ في تحديث الموعد', 
      error: error.message 
    });
  }
});

// ==========================================
// Delete appointment
// ==========================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'الموعد غير موجود' 
      });
    }

    // حذف التذكير المرتبط إن وجد
    try {
      const Reminder = require('../models/Reminder');
      await Reminder.deleteMany({ 
        relatedId: req.params.id,
        type: 'appointment' 
      });
    } catch (err) {
      console.error('خطأ في حذف التذكير:', err);
    }

    res.json({ 
      success: true, 
      message: 'تم حذف الموعد' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'خطأ في حذف الموعد', 
      error: error.message 
    });
  }
});

module.exports = router;