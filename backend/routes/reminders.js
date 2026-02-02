const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Reminder = require('../models/Reminder');

// ==========================================
// GET /api/reminders - جلب جميع التذكيرات
// ==========================================
router.get('/', auth, async (req, res) => {
    try {
        const { status } = req.query;
        let query = { user: req.user._id };
        
        if (status && status !== 'all') {
            if (status === 'completed') {
                query.completed = true;
            } else if (status === 'pending') {
                query.completed = false;
                query.date = { $gte: new Date() };
            } else if (status === 'overdue') {
                query.completed = false;
                query.date = { $lt: new Date() };
            }
        }
        
        const reminders = await Reminder.find(query)
            .sort({ date: 1, time: 1 })
            .populate('relatedId', 'title'); // لجلب عنوان الموعد المرتبط
        
        res.json({
            success: true,
            count: reminders.length,
            reminders
        });
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب التذكيرات',
            error: error.message
        });
    }
});

// ==========================================
// POST /api/reminders - إضافة تذكير جديد
// ==========================================
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, date, time, sendEmail, sendWhatsapp, email, whatsapp, priority } = req.body;
        
        // التحقق من البيانات
        if (!title || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'العنوان والتاريخ والوقت مطلوبة'
            });
        }
        
        if (sendEmail && !email) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مطلوب لإرسال التذكير'
            });
        }
        
        const newReminder = await Reminder.create({
            user: req.user._id,
            title,
            description,
            date,
            time,
            type: 'custom',
            email: sendEmail ? email : null,
            completed: false
        });
        
        res.status(201).json({
            success: true,
            message: 'تم إضافة التذكير بنجاح',
            reminder: newReminder
        });
    } catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إضافة التذكير',
            error: error.message
        });
    }
});

// ==========================================
// PUT /api/reminders/:id - تحديث تذكير
// ==========================================
router.put('/:id', auth, async (req, res) => {
    try {
        const reminder = await Reminder.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'التذكير غير موجود'
            });
        }
        
        const { title, description, date, time, email } = req.body;
        
        reminder.title = title || reminder.title;
        reminder.description = description !== undefined ? description : reminder.description;
        reminder.date = date || reminder.date;
        reminder.time = time || reminder.time;
        reminder.email = email !== undefined ? email : reminder.email;
        
        await reminder.save();
        
        res.json({
            success: true,
            message: 'تم تحديث التذكير بنجاح',
            reminder
        });
    } catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث التذكير',
            error: error.message
        });
    }
});

// ==========================================
// DELETE /api/reminders/:id - حذف تذكير
// ==========================================
router.delete('/:id', auth, async (req, res) => {
    try {
        const reminder = await Reminder.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'التذكير غير موجود'
            });
        }
        
        res.json({
            success: true,
            message: 'تم حذف التذكير بنجاح'
        });
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف التذكير',
            error: error.message
        });
    }
});

// ==========================================
// PATCH /api/reminders/:id/complete - تحديد كمكتمل
// ==========================================
router.patch('/:id/complete', auth, async (req, res) => {
    try {
        const reminder = await Reminder.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'التذكير غير موجود'
            });
        }
        
        reminder.completed = !reminder.completed; // Toggle
        await reminder.save();
        
        res.json({
            success: true,
            message: reminder.completed ? 'تم وضع علامة مكتمل' : 'تم إلغاء الاكتمال',
            reminder
        });
    } catch (error) {
        console.error('Error completing reminder:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث التذكير',
            error: error.message
        });
    }
});

// ==========================================
// POST /api/reminders/:id/send - إرسال تذكير فوراً
// ==========================================
router.post('/:id/send', auth, async (req, res) => {
    try {
        const reminder = await Reminder.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'التذكير غير موجود'
            });
        }
        
        if (!reminder.email) {
            return res.status(400).json({
                success: false,
                message: 'لا يوجد بريد إلكتروني لهذا التذكير'
            });
        }
        
        // إرسال الإيميل (يمكن إضافة nodemailer لاحقاً)
        console.log('📧 إرسال تذكير إلى:', reminder.email);
        console.log('📝 العنوان:', reminder.title);
        console.log('📅 التاريخ:', reminder.date);
        console.log('🕐 الوقت:', reminder.time);
        
        // حفظ سجل الإرسال
        reminder.completed = true;
        await reminder.save();
        
        // إنشاء تذكير جديد بأنه تم الإرسال
        await Reminder.create({
            user: req.user._id,
            title: `✅ تم إرسال: ${reminder.title}`,
            description: `تم إرسال التذكير إلى ${reminder.email}`,
            date: new Date(),
            time: new Date().toTimeString().split(' ')[0].substring(0, 5),
            type: 'custom',
            completed: true
        });
        
        res.json({
            success: true,
            message: `تم إرسال التذكير إلى ${reminder.email}`,
            reminder
        });
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إرسال التذكير',
            error: error.message
        });
    }
});

// ==========================================
// GET /api/reminders/stats - إحصائيات التذكيرات
// ==========================================
router.get('/stats', auth, async (req, res) => {
    try {
        const total = await Reminder.countDocuments({ user: req.user._id });
        const completed = await Reminder.countDocuments({ user: req.user._id, completed: true });
        const pending = await Reminder.countDocuments({ 
            user: req.user._id, 
            completed: false,
            date: { $gte: new Date() }
        });
        const overdue = await Reminder.countDocuments({ 
            user: req.user._id, 
            completed: false,
            date: { $lt: new Date() }
        });
        
        res.json({
            success: true,
            stats: {
                total,
                completed,
                pending,
                overdue
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الإحصائيات'
        });
    }
});

module.exports = router;