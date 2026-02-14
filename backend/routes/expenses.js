const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const ExcelJS = require('exceljs');

// ==========================================
// Auth Middleware
// ==========================================
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

// ==========================================
// ✅ Routes الخاصة يجب أن تأتي قبل /:id
// ==========================================

// Export Excel
router.get('/export-excel', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort('-date');

    if (expenses.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'لا توجد مصروفات لتصديرها' 
      });
    }

    // إنشاء Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('المصروفات');

    // تعريف الأعمدة
    worksheet.columns = [
      { header: 'التاريخ', key: 'date', width: 15 },
      { header: 'المبلغ', key: 'amount', width: 12 },
      { header: 'العملة', key: 'currency', width: 15 },
      { header: 'الفئة', key: 'category', width: 15 },
      { header: 'الوصف', key: 'description', width: 30 }
    ];

    // تنسيق الرأس
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // إضافة البيانات
    const totalsByCurrency = {};
    
    expenses.forEach(exp => {
      const currency = exp.currency || { symbol: '€', name: 'يورو', code: 'EUR' };
      const key = currency.code || 'EUR';
      
      // حساب الإجمالي لكل عملة
      if (!totalsByCurrency[key]) {
        totalsByCurrency[key] = {
          total: 0,
          symbol: currency.symbol,
          name: currency.name
        };
      }
      totalsByCurrency[key].total += exp.amount;

      worksheet.addRow({
        date: new Date(exp.date).toLocaleDateString('ar-EG'),
        amount: exp.amount,
        currency: `${currency.symbol} ${currency.name}`,
        category: exp.category,
        description: exp.description || '-'
      });
    });

    // إضافة صف فارغ
    worksheet.addRow({});

    // إضافة الإجمالي حسب العملة
    const totalRow = worksheet.addRow({
      date: 'الإجمالي حسب العملة:',
      amount: '',
      currency: '',
      category: '',
      description: ''
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };

    Object.values(totalsByCurrency).forEach(curr => {
      worksheet.addRow({
        date: '',
        amount: curr.total,
        currency: `${curr.symbol} ${curr.name}`,
        category: '',
        description: ''
      });
    });

    // توليد Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في تصدير الملف',
      error: error.message 
    });
  }
});

// Export Excel - للاستخدام من AI
router.get('/export', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort('-date');

    if (expenses.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'لا توجد مصروفات لتصديرها' 
      });
    }

    // إنشاء Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('المصروفات');

    // تعريف الأعمدة
    worksheet.columns = [
      { header: 'التاريخ', key: 'date', width: 15 },
      { header: 'المبلغ', key: 'amount', width: 12 },
      { header: 'الفئة', key: 'category', width: 15 },
      { header: 'الوصف', key: 'description', width: 30 }
    ];

    // تنسيق الرأس
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    };

    // إضافة البيانات
    let total = 0;
    expenses.forEach(exp => {
      total += exp.amount;
      worksheet.addRow({
        date: new Date(exp.date).toLocaleDateString('ar-EG'),
        amount: `${exp.amount} يورو`,
        category: exp.category,
        description: exp.description || '-'
      });
    });

    // إضافة صف الإجمالي
    worksheet.addRow({});
    const totalRow = worksheet.addRow({
      date: 'المجموع الكلي:',
      amount: `${total} يورو`,
      category: '',
      description: ''
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB3B' }
    };

    // توليد Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في تصدير الملف',
      error: error.message 
    });
  }
});

// Voice command
router.post('/voice', auth, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'النص مطلوب'
      });
    }
    
    const amountMatch = text.match(/\d+\.?\d*/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;
    
    let category = 'أخرى';
    const categories = {
      'طعام': ['طعام', 'أكل', 'غداء', 'عشاء', 'فطور', 'مطعم'],
      'مواصلات': ['مواصلات', 'نقل', 'تاكسي', 'أوبر', 'باص', 'بنزين'],
      'تسوق': ['تسوق', 'شراء', 'ملابس'],
      'فواتير': ['فواتير', 'فاتورة', 'كهرباء', 'ماء'],
      'ترفيه': ['ترفيه', 'سينما', 'ألعاب'],
      'صحة': ['صحة', 'دواء', 'طبيب']
    };
    
    for (const [cat, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          category = cat;
          break;
        }
      }
      if (category !== 'أخرى') break;
    }
    
    if (amount > 0) {
      const expense = await Expense.create({
        user: req.user._id,
        amount,
        category,
        description: text,
        date: new Date()
      });
      
      res.json({
        success: true,
        message: `تم إضافة ${amount} يورو`,
        expense: {
          amount: expense.amount,
          category: expense.category,
          description: expense.description
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'لم أفهم المبلغ. حاول: دفعت 50 يورو للطعام'
      });
    }
  } catch (error) {
    console.error('Error processing voice command:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في معالجة الأمر',
      error: error.message 
    });
  }
});

// ==========================================
// ✅ Routes العامة تأتي بعد الخاصة
// ==========================================

// Get all expenses
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = { user: req.user._id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    
    const expenses = await Expense.find(query).sort('-date');
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    res.json({
      success: true,
      count: expenses.length,
      total,
      expenses
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في جلب المصروفات',
      error: error.message 
    });
  }
});

// Add expense
router.post('/', auth, async (req, res) => {
  try {
    const { amount, category, date, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر'
      });
    }
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'الفئة مطلوبة'
      });
    }
    
    const expense = await Expense.create({
      user: req.user._id,
      amount,
      category,
      date: date || new Date(),
      description: description || ''
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة المصروف بنجاح',
      expense
    });
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في إضافة المصروف',
      error: error.message 
    });
  }
});

// ==========================================
// ✅ Get single expense by ID - يجب أن يكون هنا
// ==========================================
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('📥 طلب الحصول على مصروف:', req.params.id);
    
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!expense) {
      console.log('❌ المصروف غير موجود');
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود'
      });
    }

    console.log('✅ تم العثور على المصروف:', expense);
    
    res.json({
      success: true,
      expense: expense
    });
  } catch (error) {
    console.error('❌ خطأ في الحصول على المصروف:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'معرف المصروف غير صحيح'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// Update expense
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('📝 طلب تحديث مصروف:', req.params.id);
    console.log('📦 البيانات:', req.body);
    
    const { amount, category, date, description } = req.body;
    
    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }
    
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        amount,
        category,
        date,
        description
      },
      { new: true, runValidators: true }
    );

    if (!expense) {
      console.log('❌ المصروف غير موجود');
      return res.status(404).json({ 
        success: false, 
        message: 'المصروف غير موجود' 
      });
    }

    console.log('✅ تم التحديث بنجاح:', expense);
    
    res.json({ 
      success: true,
      message: 'تم تحديث المصروف بنجاح',
      expense 
    });
  } catch (error) {
    console.error('❌ خطأ في التحديث:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'معرف المصروف غير صحيح'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في تحديث المصروف',
      error: error.message 
    });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ طلب حذف مصروف:', req.params.id);
    
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!expense) {
      console.log('❌ المصروف غير موجود');
      return res.status(404).json({ 
        success: false, 
        message: 'المصروف غير موجود' 
      });
    }

    console.log('✅ تم الحذف بنجاح');
    
    res.json({ 
      success: true, 
      message: 'تم حذف المصروف بنجاح',
      deletedExpense: expense
    });
  } catch (error) {
    console.error('❌ خطأ في الحذف:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'معرف المصروف غير صحيح'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'خطأ في حذف المصروف',
      error: error.message 
    });
  }
});

module.exports = router;