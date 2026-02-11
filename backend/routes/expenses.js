const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const XLSX = require('xlsx');

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

    const wb = XLSX.utils.book_new();
    const wsData = [
      ['التاريخ', 'المبلغ', 'العملة', 'الفئة', 'الوصف']
    ];

    expenses.forEach(exp => {
      const currency = exp.currency || { symbol: '€', name: 'يورو' };
      wsData.push([
        new Date(exp.date).toLocaleDateString('en-GB'),
        exp.amount,
        `${currency.symbol} ${currency.name}`,
        exp.category,
        exp.description || '-'
      ]);
    });

    // ✅ حساب الإجمالي حسب كل عملة
    const totalsByCurrency = {};
    expenses.forEach(exp => {
      const currency = exp.currency || { symbol: '€', name: 'يورو', code: 'EUR' };
      const key = currency.code || 'EUR';
      
      if (!totalsByCurrency[key]) {
        totalsByCurrency[key] = {
          total: 0,
          symbol: currency.symbol,
          name: currency.name
        };
      }
      totalsByCurrency[key].total += exp.amount;
    });

    wsData.push([]);
    wsData.push(['الإجمالي حسب العملة:']);
    
    Object.values(totalsByCurrency).forEach(curr => {
      wsData.push(['', curr.total, `${curr.symbol} ${curr.name}`]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    ws['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
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

    const wb = XLSX.utils.book_new();
    const wsData = [
      ['التاريخ', 'المبلغ', 'الفئة', 'الوصف']
    ];

    expenses.forEach(exp => {
      wsData.push([
        new Date(exp.date).toLocaleDateString('en-GB'),
        `${exp.amount} يورو`,
        exp.category,
        exp.description || '-'
      ]);
    });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    wsData.push([]);
    wsData.push(['المجموع الكلي:', `${total} يورو`]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    ws['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
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