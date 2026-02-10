const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Expense = require('../models/Expense');
const Appointment = require('../models/Appointment');
const Reminder = require('../models/Reminder');

// استيراد auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'الرجاء تسجيل الدخول' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'anySecretKey');
    
    const User = require('../models/User');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'التوكن غير صالح' });
  }
};

// Export Daily Schedule - جدول يومي شامل
router.get('/export', auth, async (req, res) => {
  try {
    console.log('📊 بدء تصدير الجدول اليومي...');
    
    // تحديد نطاق اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📅 النطاق الزمني:', today, 'إلى', tomorrow);

    // جلب البيانات من جميع المصادر
    const [expenses, appointments, reminders] = await Promise.all([
      Expense.find({ 
        user: req.user._id,
        date: { $gte: today, $lt: tomorrow }
      }).sort('date'),
      
      Appointment.find({ 
        user: req.user._id,
        date: { $gte: today, $lt: tomorrow }
      }).sort('time'),
      
      Reminder.find({ 
        user: req.user._id,
        date: { $gte: today, $lt: tomorrow }
      }).sort('time')
    ]);

    console.log(`📈 تم جلب: ${expenses.length} مصروف، ${appointments.length} موعد، ${reminders.length} تذكير`);

    // إنشاء ملف Excel
    const wb = XLSX.utils.book_new();

    // ===================================
    // Sheet 1: الملخص
    // ===================================
    const summaryData = [
      ['📊 ملخص الجدول اليومي', ''],
      ['التاريخ:', new Date().toLocaleDateString('ar-SA')],
      ['الوقت:', new Date().toLocaleTimeString('ar-SA')],
      [],
      ['📈 الإحصائيات:', ''],
      ['عدد المصروفات:', expenses.length],
      ['عدد المواعيد:', appointments.length],
      ['عدد التذكيرات:', reminders.length],
      [],
      ['💰 المصروفات:', ''],
      ['المجموع الكلي:', `${expenses.reduce((sum, e) => sum + e.amount, 0)} يورو`],
      [],
      ['📌 الحالة:', ''],
      ['التذكيرات المكتملة:', reminders.filter(r => r.completed).length],
      ['التذكيرات القادمة:', reminders.filter(r => !r.completed).length]
    ];
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
    
    // تنسيق الخلايا
    wsSummary['A1'].s = { font: { bold: true, sz: 16 } };
    
    XLSX.utils.book_append_sheet(wb, wsSummary, 'الملخص');

    // ===================================
    // Sheet 2: المصروفات
    // ===================================
    if (expenses.length > 0) {
      const expData = [['التاريخ', 'الوقت', 'المبلغ', 'الفئة', 'الوصف']];
      
      expenses.forEach(exp => {
        expData.push([
          new Date(exp.date).toLocaleDateString('ar-SA'),
          new Date(exp.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          `${exp.amount} يورو`,
          exp.category,
          exp.description || '-'
        ]);
      });
      
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      expData.push([]);
      expData.push(['', '', `المجموع: ${total} يورو`, '', '']);
      
      const wsExp = XLSX.utils.aoa_to_sheet(expData);
      wsExp['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsExp, 'المصروفات');
    } else {
      const wsExp = XLSX.utils.aoa_to_sheet([['لا توجد مصروفات لهذا اليوم']]);
      XLSX.utils.book_append_sheet(wb, wsExp, 'المصروفات');
    }

    // ===================================
    // Sheet 3: المواعيد
    // ===================================
    if (appointments.length > 0) {
      const aptData = [['التاريخ', 'الوقت', 'العنوان', 'الوصف', 'المنطقة الزمنية']];
      
      appointments.forEach(apt => {
        aptData.push([
          new Date(apt.date).toLocaleDateString('ar-SA'),
          apt.time,
          apt.title,
          apt.description || '-',
          apt.timezone || 'Europe/Berlin'
        ]);
      });
      
      const wsApt = XLSX.utils.aoa_to_sheet(aptData);
      wsApt['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsApt, 'المواعيد');
    } else {
      const wsApt = XLSX.utils.aoa_to_sheet([['لا توجد مواعيد لهذا اليوم']]);
      XLSX.utils.book_append_sheet(wb, wsApt, 'المواعيد');
    }

    // ===================================
    // Sheet 4: التذكيرات
    // ===================================
    if (reminders.length > 0) {
      const remData = [['التاريخ', 'الوقت', 'العنوان', 'الوصف', 'الحالة', 'البريد الإلكتروني']];
      
      reminders.forEach(rem => {
        remData.push([
          new Date(rem.date).toLocaleDateString('ar-SA'),
          rem.time,
          rem.title,
          rem.description || '-',
          rem.completed ? '✅ مكتمل' : '⏳ قيد الانتظار',
          rem.reminderEnabled && rem.reminderEmail ? rem.reminderEmail : '-'
        ]);
      });
      
      const wsRem = XLSX.utils.aoa_to_sheet(remData);
      wsRem['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsRem, 'التذكيرات');
    } else {
      const wsRem = XLSX.utils.aoa_to_sheet([['لا توجد تذكيرات لهذا اليوم']]);
      XLSX.utils.book_append_sheet(wb, wsRem, 'التذكيرات');
    }

    // ===================================
    // Sheet 5: الجدول الزمني (Timeline)
    // ===================================
    const timelineData = [['الوقت', 'النوع', 'العنوان', 'التفاصيل']];
    
    // دمج جميع الأحداث مع أوقاتها
    const allEvents = [];
    
    expenses.forEach(exp => {
      allEvents.push({
        time: new Date(exp.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        type: '💰 مصروف',
        title: `${exp.amount} يورو - ${exp.category}`,
        details: exp.description || '-'
      });
    });
    
    appointments.forEach(apt => {
      allEvents.push({
        time: apt.time,
        type: '📅 موعد',
        title: apt.title,
        details: apt.description || '-'
      });
    });
    
    reminders.forEach(rem => {
      allEvents.push({
        time: rem.time,
        type: rem.completed ? '✅ تذكير' : '🔔 تذكير',
        title: rem.title,
        details: rem.description || '-'
      });
    });
    
    // ترتيب حسب الوقت
    allEvents.sort((a, b) => a.time.localeCompare(b.time));
    
    allEvents.forEach(event => {
      timelineData.push([event.time, event.type, event.title, event.details]);
    });
    
    if (allEvents.length === 0) {
      timelineData.push(['', '', 'لا توجد أحداث لهذا اليوم', '']);
    }
    
    const wsTimeline = XLSX.utils.aoa_to_sheet(timelineData);
    wsTimeline['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsTimeline, 'الجدول الزمني');

    // إنشاء الملف وإرساله
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `daily_schedule_${new Date().toISOString().split('T')[0]}.xlsx`;

    console.log('✅ تم إنشاء الملف:', filename);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('❌ خطأ في تصدير الجدول:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في تصدير الجدول اليومي',
      error: error.message 
    });
  }
});

module.exports = router;