const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Appointment = require('../models/Appointment');

// ==========================================
// Middleware بسيط للـ auth
// ==========================================
const jwt = require('jsonwebtoken');

const simpleAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'الرجاء تسجيل الدخول' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'anySecretKey');
        
        const User = require('../models/User');
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'المستخدم غير موجود' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'التوكن غير صالح' 
        });
    }
};

// ==========================================
// GET /api/dashboard-stats
// جلب جميع الإحصائيات للوحة التحكم
// ==========================================
router.get('/dashboard-stats', simpleAuth, async (req, res) => {
    try {
        const userId = req.user._id;

        // ==========================================
        // 1. حساب إجمالي المصروفات
        // ==========================================
        const totalExpensesResult = await Expense.aggregate([
            { $match: { user: userId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].total : 0;

        // ==========================================
        // 2. حساب مصروفات الشهر الحالي
        // ==========================================
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const monthlyExpensesResult = await Expense.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const monthlyExpenses = monthlyExpensesResult.length > 0 ? monthlyExpensesResult[0].total : 0;

        // ==========================================
        // 3. حساب مصروفات الأسبوع الحالي
        // ==========================================
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const weeklyExpensesResult = await Expense.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: startOfWeek }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const weeklyExpenses = weeklyExpensesResult.length > 0 ? weeklyExpensesResult[0].total : 0;

        // ==========================================
        // 4. حساب عدد المواعيد
        // ==========================================
        const appointmentCount = await Appointment.countDocuments({ 
            user: userId 
        });

        // ==========================================
        // 5. حساب عدد التذكيرات (المواعيد القادمة)
        // ==========================================
        const reminderCount = await Appointment.countDocuments({
            user: userId,
            date: { $gte: now }
        });

        // ==========================================
        // 6. جلب آخر 10 مصروفات
        // ==========================================
        const recentExpenses = await Expense.find({ user: userId })
            .sort({ date: -1 })
            .limit(10)
            .lean();

        // ==========================================
        // 7. جلب المواعيد القادمة
        // ==========================================
        const recentAppointments = await Appointment.find({ 
            user: userId,
            date: { $gte: now }
        })
            .sort({ date: 1 })
            .limit(5)
            .lean();

        // ==========================================
        // 8. بيانات الرسم البياني الخطي (آخر 12 شهر)
        // ==========================================
        const expenseChartData = await generateMonthlyChart(userId);

        // ==========================================
        // 9. بيانات الرسم البياني الدائري (حسب الفئة)
        // ==========================================
        const incomeExpenseDonutData = await generateCategoryChart(userId);

        // ==========================================
        // 10. إرجاع جميع البيانات
        // ==========================================
        res.json({
            success: true,
            totalExpenses,
            monthlyExpenses,
            weeklyExpenses,
            appointmentCount,
            reminderCount,
            recentExpenses,
            recentAppointments,
            expenseChartData,
            incomeExpenseDonutData
        });

    } catch (error) {
        console.error('Error in dashboard-stats:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب بيانات لوحة التحكم',
            error: error.message
        });
    }
});

// ==========================================
// دالة مساعدة: توليد بيانات الرسم البياني الشهري
// ==========================================
async function generateMonthlyChart(userId) {
    const months = [];
    const data = [];
    const now = new Date();

    // جلب آخر 12 شهر
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        // اسم الشهر بالعربي
        const monthName = monthStart.toLocaleDateString('ar-SA', { month: 'short' });
        months.push(monthName);

        // حساب المصروفات لهذا الشهر
        const result = await Expense.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: monthStart, $lte: monthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        data.push(result.length > 0 ? result[0].total : 0);
    }

    return {
        labels: months,
        datasets: [{
            label: 'المصروفات',
            data: data,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };
}

// ==========================================
// دالة مساعدة: توليد بيانات الرسم البياني حسب الفئة
// ==========================================
async function generateCategoryChart(userId) {
    const categoryData = await Expense.aggregate([
        { $match: { user: userId } },
        {
            $group: {
                _id: '$category',
                total: { $sum: '$amount' }
            }
        },
        { $sort: { total: -1 } }
    ]);

    const labels = categoryData.map(item => item._id || 'أخرى');
    const data = categoryData.map(item => item.total);
    const colors = [
        '#e74c3c', // أحمر
        '#3498db', // أزرق
        '#2ecc71', // أخضر
        '#f39c12', // برتقالي
        '#9b59b6', // بنفسجي
        '#1abc9c', // تركواز
        '#34495e', // رمادي
        '#e67e22'  // برتقالي داكن
    ];

    return {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 0
        }]
    };
}

module.exports = router;