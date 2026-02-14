const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
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

    // إنشاء Workbook
    const workbook = new ExcelJS.Workbook();

    // ===================================
    // Sheet 1: الملخص
    // ===================================
    const summarySheet = workbook.addWorksheet('الملخص');
    
    summarySheet.columns = [
      { header: 'العنصر', key: 'label', width: 25 },
      { header: 'القيمة', key: 'value', width: 20 }
    ];

    // البيانات
    summarySheet.addRow({ label: '📊 ملخص الجدول اليومي', value: '' });
    summarySheet.addRow({ label: 'التاريخ:', value: new Date().toLocaleDateString('ar-SA') });
    summarySheet.addRow({ label: 'الوقت:', value: new Date().toLocaleTimeString('ar-SA') });
    summarySheet.addRow({ label: '', value: '' });
    summarySheet.addRow({ label: '📈 الإحصائيات:', value: '' });
    summarySheet.addRow({ label: 'عدد المصروفات:', value: expenses.length });
    summarySheet.addRow({ label: 'عدد المواعيد:', value: appointments.length });
    summarySheet.addRow({ label: 'عدد التذكيرات:', value: reminders.length });
    summarySheet.addRow({ label: '', value: '' });
    summarySheet.addRow({ label: '💰 المصروفات:', value: '' });
    summarySheet.addRow({ label: 'المجموع الكلي:', value: `${expenses.reduce((sum, e) => sum + e.amount, 0)} يورو` });
    summarySheet.addRow({ label: '', value: '' });
    summarySheet.addRow({ label: '📌 الحالة:', value: '' });
    summarySheet.addRow({ label: 'التذكيرات المكتملة:', value: reminders.filter(r => r.completed).length });
    summarySheet.addRow({ label: 'التذكيرات القادمة:', value: reminders.filter(r => !r.completed).length });

    // تنسيق الرأس
    summarySheet.getRow(1).font = { bold: true, size: 16 };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };

    // ===================================
    // Sheet 2: المصروفات
    // ===================================
    const expensesSheet = workbook.addWorksheet('المصروفات');
    
    if (expenses.length > 0) {
      expensesSheet.columns = [
        { header: 'التاريخ', key: 'date', width: 15 },
        { header: 'الوقت', key: 'time', width: 10 },
        { header: 'المبلغ', key: 'amount', width: 12 },
        { header: 'الفئة', key: 'category', width: 15 },
        { header: 'الوصف', key: 'description', width: 30 }
      ];

      // تنسيق الرأس
      expensesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      expensesSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' }
      };

      expenses.forEach(exp => {
        expensesSheet.addRow({
          date: new Date(exp.date).toLocaleDateString('ar-SA'),
          time: new Date(exp.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          amount: `${exp.amount} يورو`,
          category: exp.category,
          description: exp.description || '-'
        });
      });

      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      expensesSheet.addRow({});
      const totalRow = expensesSheet.addRow({
        date: '',
        time: '',
        amount: `المجموع: ${total} يورو`,
        category: '',
        description: ''
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB3B' }
      };
    } else {
      expensesSheet.addRow({ message: 'لا توجد مصروفات لهذا اليوم' });
    }

    // ===================================
    // Sheet 3: المواعيد
    // ===================================
    const appointmentsSheet = workbook.addWorksheet('المواعيد');
    
    if (appointments.length > 0) {
      appointmentsSheet.columns = [
        { header: 'التاريخ', key: 'date', width: 15 },
        { header: 'الوقت', key: 'time', width: 10 },
        { header: 'العنوان', key: 'title', width: 25 },
        { header: 'الوصف', key: 'description', width: 30 },
        { header: 'المنطقة الزمنية', key: 'timezone', width: 20 }
      ];

      // تنسيق الرأس
      appointmentsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      appointmentsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2196F3' }
      };

      appointments.forEach(apt => {
        appointmentsSheet.addRow({
          date: new Date(apt.date).toLocaleDateString('ar-SA'),
          time: apt.time,
          title: apt.title,
          description: apt.description || '-',
          timezone: apt.timezone || 'Europe/Berlin'
        });
      });
    } else {
      appointmentsSheet.addRow({ message: 'لا توجد مواعيد لهذا اليوم' });
    }

    // ===================================
    // Sheet 4: التذكيرات
    // ===================================
    const remindersSheet = workbook.addWorksheet('التذكيرات');
    
    if (reminders.length > 0) {
      remindersSheet.columns = [
        { header: 'التاريخ', key: 'date', width: 15 },
        { header: 'الوقت', key: 'time', width: 10 },
        { header: 'العنوان', key: 'title', width: 25 },
        { header: 'الوصف', key: 'description', width: 30 },
        { header: 'الحالة', key: 'status', width: 15 },
        { header: 'البريد الإلكتروني', key: 'email', width: 25 }
      ];

      // تنسيق الرأس
      remindersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      remindersSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF9800' }
      };

      reminders.forEach(rem => {
        remindersSheet.addRow({
          date: new Date(rem.date).toLocaleDateString('ar-SA'),
          time: rem.time,
          title: rem.title,
          description: rem.description || '-',
          status: rem.completed ? '✅ مكتمل' : '⏳ قيد الانتظار',
          email: rem.reminderEnabled && rem.reminderEmail ? rem.reminderEmail : '-'
        });
      });
    } else {
      remindersSheet.addRow({ message: 'لا توجد تذكيرات لهذا اليوم' });
    }

    // ===================================
    // Sheet 5: الجدول الزمني (Timeline)
    // ===================================
    const timelineSheet = workbook.addWorksheet('الجدول الزمني');
    
    timelineSheet.columns = [
      { header: 'الوقت', key: 'time', width: 10 },
      { header: 'النوع', key: 'type', width: 12 },
      { header: 'العنوان', key: 'title', width: 30 },
      { header: 'التفاصيل', key: 'details', width: 35 }
    ];

    // تنسيق الرأس
    timelineSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    timelineSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9C27B0' }
    };

    // دمج جميع الأحداث
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
    
    if (allEvents.length > 0) {
      allEvents.forEach(event => {
        timelineSheet.addRow(event);
      });
    } else {
      timelineSheet.addRow({ time: '', type: '', title: 'لا توجد أحداث لهذا اليوم', details: '' });
    }

    // إنشاء الملف وإرساله
    const buffer = await workbook.xlsx.writeBuffer();
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