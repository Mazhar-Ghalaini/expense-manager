const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');

// ==========================================
// Get all expenses for user
// ==========================================
router.get('/', protect, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort('-date');
    
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    res.json({
      success: true,
      count: expenses.length,
      total,
      expenses
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب المصروفات', error: error.message });
  }
});

// ==========================================
// Add expense
// ==========================================
router.post('/', protect, async (req, res) => {
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
    res.status(500).json({ message: 'خطأ في إضافة المصروف', error: error.message });
  }
});

// ==========================================
// Process AI Chat for expense
// ==========================================
router.post('/ai-process', protect, async (req, res) => {
  try {
    const { message } = req.body;
    
    // Simple AI processing
    const expenseData = extractExpenseFromText(message);
    
    if (expenseData) {
      const expense = await Expense.create({
        user: req.user._id,
        ...expenseData,
        addedVia: 'ai-chat'
      });

      res.json({
        success: true,
        message: 'تم إضافة المصروف بنجاح',
        expense
      });
    } else {
      res.status(400).json({ message: 'لم أستطع فهم المصروف، حاول مرة أخرى' });
    }
  } catch (error) {
    res.status(500).json({ message: 'خطأ في معالجة الرسالة', error: error.message });
  }
});

// ==========================================
// Helper function to extract expense from text
// ==========================================
const { detectCurrencyFromText } = require('../config/currencies');

// Helper function to extract expense from text - مع دعم العملات
function extractExpenseFromText(text, userCurrency) {
  // استخراج المبلغ
  const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
  
  // محاولة اكتشاف العملة من النص
  const detectedCurrency = detectCurrencyFromText(text);
  
  // استخدام العملة المكتشفة أو عملة المستخدم
  const currency = detectedCurrency || userCurrency;
  
  const categories = {
    'طعام': ['طعام', 'أكل', 'مطعم', 'غداء', 'عشاء', 'فطور', 'وجبة'],
    'مواصلات': ['مواصلات', 'تاكسي', 'باص', 'بنزين', 'أوبر', 'كريم', 'نقل'],
    'تسوق': ['تسوق', 'شراء', 'ملابس', 'سوق', 'اشتريت'],
    'فواتير': ['فاتورة', 'كهرباء', 'ماء', 'إنترنت', 'جوال', 'اتصالات'],
    'ترفيه': ['ترفيه', 'سينما', 'لعب', 'رحلة', 'نزهة'],
    'صحة': ['دواء', 'طبيب', 'مستشفى', 'صيدلية', 'علاج']
  };

  let category = 'أخرى';
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      category = cat;
      break;
    }
  }

  if (amountMatch) {
    return {
      amount: parseFloat(amountMatch[1]),
      category,
      description: text,
      date: new Date(),
      currencyUsed: currency ? currency.code : userCurrency.code
    };
  }

  return null;
}

// Process AI Chat for expense - مع دعم العملات
router.post('/ai-process', protect, async (req, res) => {
  try {
    const { message } = req.body;
    
    // الحصول على عملة المستخدم
    const userCurrency = req.user.currency || { code: 'SAR', symbol: 'ر.س', nameAr: 'ريال' };
    
    // معالجة النص
    const expenseData = extractExpenseFromText(message, userCurrency);
    
    if (expenseData) {
      const expense = await Expense.create({
        user: req.user._id,
        ...expenseData,
        addedVia: 'ai-chat'
      });

      // الحصول على معلومات العملة المستخدمة
      const { getCurrency } = require('../config/currencies');
      const currencyInfo = getCurrency(expenseData.currencyUsed);

      res.json({
        success: true,
        message: `تم إضافة المصروف بنجاح: ${expense.amount} ${currencyInfo.symbol}`,
        expense
      });
    } else {
      res.status(400).json({ 
        message: `لم أستطع فهم المصروف. حاول مثلاً: "صرفت 50 ${userCurrency.nameAr} على الطعام"` 
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'خطأ في معالجة الرسالة', error: error.message });
  }
});

// ==========================================
// Export expenses to Excel and download directly
// ==========================================
router.get('/export-excel', protect, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort('-date');

    if (expenses.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'لا توجد مصروفات لتصديرها' 
      });
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['التاريخ', 'المبلغ', 'الفئة', 'الوصف', 'طريقة الدفع']
    ];

    expenses.forEach(exp => {
      wsData.push([
        new Date(exp.date).toLocaleDateString('ar-SA'),
        exp.amount,
        exp.category,
        exp.description || '-',
        exp.paymentMethod
      ]);
    });

    // Add summary row
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    wsData.push([]);
    wsData.push(['', '', '', 'الإجمالي:', total]);
    wsData.push(['', '', '', 'عدد المصروفات:', expenses.length]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 35 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');

    // Write to buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename with date
    const filename = `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Send file as download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في تصدير الملف', 
      error: error.message 
    });
  }
});

// ==========================================
// Delete expense
// ==========================================
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'المصروف غير موجود' });
    }

    res.json({ success: true, message: 'تم حذف المصروف' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في حذف المصروف', error: error.message });
  }
});

module.exports = router;