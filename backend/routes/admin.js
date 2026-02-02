const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Expense = require('../models/Expense');
const Appointment = require('../models/Appointment');
const { auth, protect, adminOnly } = require('../middleware/auth');

// Get all users (Admin only)
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب المستخدمين', error: error.message });
  }
});

// Get dashboard statistics
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSubscriptions = await User.countDocuments({ 'subscription.isActive': true });
    const totalExpenses = await Expense.countDocuments();
    const totalAppointments = await Appointment.countDocuments();

    const recentUsers = await User.find().sort('-createdAt').limit(5).select('-password');

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeSubscriptions,
        totalExpenses,
        totalAppointments
      },
      recentUsers
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب الإحصائيات', error: error.message });
  }
});

// Update admin profile
router.patch('/profile', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    // التحقق من البريد الإلكتروني إذا تم تغييره
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل' 
        });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, phone },
      { new: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: 'تم تحديث معلومات الحساب بنجاح',
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'خطأ في تحديث المعلومات',
      error: error.message 
    });
  }
});

// Update user subscription
router.patch('/users/:id/subscription', protect, adminOnly, async (req, res) => {
  try {
    const { plan, endDate } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        'subscription.plan': plan,
        'subscription.startDate': new Date(),
        'subscription.endDate': endDate,
        'subscription.isActive': true
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث الاشتراك', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    // Delete user's data
    await Expense.deleteMany({ user: req.params.id });
    await Appointment.deleteMany({ user: req.params.id });

    res.json({ success: true, message: 'تم حذف المستخدم وجميع بياناته' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في حذف المستخدم', error: error.message });
  }
});

module.exports = router;