const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const XLSX = require('xlsx');

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

// Get all expenses
router.get('/', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort('-date');
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    res.json({
      success: true,
      count: expenses.length,
      total,
      expenses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب المصروفات' });
  }
});

// Add expense
router.post('/', auth, async (req, res) => {
  try {
    const expense = await Expense.create({
      user: req.user._id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      expense
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في إضافة المصروف' });
  }
});

// Export Excel - تحميل مباشر
router.get('/export-excel', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort('-date');

    if (expenses.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'لا توجد مصروفات' 
      });
    }

    const wb = XLSX.utils.book_new();
    const wsData = [
      ['التاريخ', 'المبلغ', 'الفئة', 'الوصف']
    ];

    expenses.forEach(exp => {
      wsData.push([
        new Date(exp.date).toLocaleDateString('ar-SA'),
        exp.amount,
        exp.category,
        exp.description || '-'
      ]);
    });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    wsData.push([]);
    wsData.push(['الإجمالي:', total]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تصدير الملف' });
  }
});

// Voice command
router.post('/voice', auth, async (req, res) => {
  try {
    const { text } = req.body;
    
    const amountMatch = text.match(/\d+/);
    const amount = amountMatch ? parseInt(amountMatch[0]) : 0;
    
    let category = 'أخرى';
    if (text.includes('طعام') || text.includes('أكل')) category = 'طعام';
    if (text.includes('نقل') || text.includes('مواصلات')) category = 'مواصلات';
    if (text.includes('ترفيه')) category = 'ترفيه';
    
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
        message: `تم إضافة ${amount} ريال`,
        expense: {
          amount: expense.amount,
          category: expense.category,
          description: expense.description
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'لم أفهم المبلغ. حاول: صرفت 50 ريال على الطعام'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في معالجة الأمر' });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'المصروف غير موجود' });
    }

    res.json({ success: true, message: 'تم حذف المصروف' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في حذف المصروف' });
  }
});

module.exports = router;