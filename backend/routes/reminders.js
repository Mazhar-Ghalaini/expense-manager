const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Reminder = require('../models/Reminder');

// ==========================================
// ✅ Routes الخاصة أولاً
// ==========================================

// GET /api/reminders/stats - إحصائيات التذكيرات
router.get('/stats', auth, async (req, res) => {
    try {
        const total = await Reminder.countDocuments({ user: req.user._id });
        const completed = await Reminder.countDocuments({ user: req.user._id, completed: true });
        const pending = await Reminder.countDocuments({ 
            user: req.user._id, 
            completed: false
        });
        
        res.json({
            success: true,
            stats: {
                total,
                completed,
                pending
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الإحصائيات'
        });
    }
});

// GET /api/reminders - جلب جميع التذكيرات
router.get('/', auth, async (req, res) => {
    try {
        const { status } = req.query;
        let query = { user: req.user._id };
        
        if (status && status !== 'all') {
            if (status === 'completed') {
                query.completed = true;
            } else if (status === 'active') {
                query.completed = false;
            }
        }
        
        const reminders = await Reminder.find(query)
            .sort({ date: -1, time: -1 })
            .lean();
        
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

// POST /api/reminders - إضافة تذكير جديد
router.post('/', auth, async (req, res) => {
    try {
        const { 
            title, 
            description, 
            date, 
            time, 
            timezone, 
            reminderEnabled, 
            reminderEmail,
            priority,
            reminderDate // من التسجيل الصوتي
        } = req.body;
        
        // التعامل مع التاريخ من التسجيل الصوتي
        let finalDate = date;
        let finalTime = time;
        
        if (reminderDate) {
            const dateObj = new Date(reminderDate);
            finalDate = dateObj.toISOString().split('T')[0];
            finalTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        }
        
        // التحقق من البيانات الأساسية
        if (!title || !finalDate || !finalTime) {
            return res.status(400).json({
                success: false,
                message: 'العنوان والتاريخ والوقت مطلوبة'
            });
        }
        
        // التحقق من البريد إذا كان التذكير مفعّلاً
        if (reminderEnabled && !reminderEmail) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مطلوب عند تفعيل التذكير'
            });
        }
        
        const newReminder = await Reminder.create({
            user: req.user._id,
            title,
            description: description || '',
            date: finalDate,
            time: finalTime,
            timezone: timezone || 'Europe/Berlin',
            reminderEnabled: reminderEnabled || false,
            reminderEmail: reminderEnabled ? reminderEmail : null,
            priority: priority || 'متوسط',
            type: 'custom',
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
// ✅ Routes مع :id (بعد الـ routes الخاصة)
// ==========================================

// GET /api/reminders/:id - جلب تذكير واحد
router.get('/:id', auth, async (req, res) => {
    try {
        console.log('📥 GET reminder:', req.params.id);
        
        const reminder = await Reminder.findOne({
            _id: req.params.id,
            user: req.user._id
        }).lean();

        if (!reminder) {
            console.log('❌ التذكير غير موجود');
            return res.status(404).json({
                success: false,
                message: 'التذكير غير موجود'
            });
        }

        console.log('✅ تم العثور على التذكير:', reminder);
        
        res.json({
            success: true,
            reminder: reminder
        });
    } catch (error) {
        console.error('❌ Error:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'معرف التذكير غير صحيح'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'خطأ في الخادم',
            error: error.message
        });
    }
});

// PUT /api/reminders/:id - تحديث تذكير
router.put('/:id', auth, async (req, res) => {
    try {
        console.log('📝 UPDATE reminder:', req.params.id);
        console.log('📦 Data:', req.body);
        
        const { 
            title, 
            description, 
            date, 
            time, 
            timezone, 
            reminderEnabled, 
            reminderEmail,
            priority,
            reminderDate // من التسجيل الصوتي
        } = req.body;
        
        const reminder = await Reminder.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!reminder) {
            console.log('❌ التذكير غير موجود');
            return res.status(404).json({
                success: false,
                message: 'التذكير غير موجود'
            });
        }
        
        // التعامل مع التاريخ من التسجيل الصوتي
        let finalDate = date;
        let finalTime = time;
        
        if (reminderDate) {
            const dateObj = new Date(reminderDate);
            finalDate = dateObj.toISOString().split('T')[0];
            finalTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        }
        
        // تحديث الحقول
        if (title !== undefined) reminder.title = title;
        if (description !== undefined) reminder.description = description;
        if (finalDate !== undefined) reminder.date = finalDate;
        if (finalTime !== undefined) reminder.time = finalTime;
        if (timezone !== undefined) reminder.timezone = timezone;
        if (priority !== undefined) reminder.priority = priority;
        if (reminderEnabled !== undefined) reminder.reminderEnabled = reminderEnabled;
        if (reminderEmail !== undefined) reminder.reminderEmail = reminderEmail;
        
        await reminder.save();
        
        console.log('✅ تم التحديث بنجاح');
        
        res.json({
            success: true,
            message: 'تم تحديث التذكير بنجاح',
            reminder
        });
    } catch (error) {
        console.error('❌ Error:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'معرف التذكير غير صحيح'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث التذكير',
            error: error.message
        });
    }
});

// DELETE /api/reminders/:id - حذف تذكير
router.delete('/:id', auth, async (req, res) => {
    try {
        console.log('🗑️ DELETE reminder:', req.params.id);
        
        const reminder = await Reminder.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!reminder) {
            console.log('❌ التذكير غير موجود');
            return res.status(404).json({
                success: false,
                message: 'التذكير غير موجود'
            });
        }
        
        console.log('✅ تم الحذف بنجاح');
        
        res.json({
            success: true,
            message: 'تم حذف التذكير بنجاح'
        });
    } catch (error) {
        console.error('❌ Error:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'معرف التذكير غير صحيح'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف التذكير',
            error: error.message
        });
    }
});

// PATCH /api/reminders/:id/complete - تحديد كمكتمل
router.patch('/:id/complete', auth, async (req, res) => {
    try {
        console.log('✅ COMPLETE reminder:', req.params.id);
        
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
        
        reminder.completed = !reminder.completed;
        await reminder.save();
        
        res.json({
            success: true,
            message: reminder.completed ? 'تم وضع علامة مكتمل' : 'تم إلغاء الاكتمال',
            reminder
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث التذكير',
            error: error.message
        });
    }
});

module.exports = router;