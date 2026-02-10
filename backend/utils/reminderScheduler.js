const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Reminder = require('../models/Reminder');

// إعداد البريد الإلكتروني
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// دالة للحصول على الوقت حسب المنطقة الزمنية
function getTimeInTimezone(timezone) {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone || 'Europe/Berlin' }));
}

// دالة لدمج التاريخ والوقت
function combineDateTimeWithTimezone(dateStr, timeStr, timezone) {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(dateStr);
    
    const combined = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        parseInt(hours),
        parseInt(minutes),
        0
    );
    
    return combined;
}

// دالة إرسال تذكيرات مخصصة
async function sendScheduledCustomReminders() {
    try {
        const reminders = await Reminder.find({
            type: 'custom',
            reminderEnabled: true,
            reminderEmail: { $exists: true, $ne: null, $ne: '' },
            completed: false
        }).populate('user');

        if (reminders.length === 0) {
            return;
        }

        let sentCount = 0;

        for (const reminder of reminders) {
            try {
                const timezone = reminder.timezone || 'Europe/Berlin';
                const nowInUserTimezone = getTimeInTimezone(timezone);
                const reminderDateTime = combineDateTimeWithTimezone(
                    reminder.date,
                    reminder.time,
                    timezone
                );
                
                const diffMinutes = Math.floor((reminderDateTime - nowInUserTimezone) / (1000 * 60));
                
                if (diffMinutes >= 0 && diffMinutes <= 1) {
                    
                    // التحقق من عدم الإرسال المسبق
                    const alreadySent = await Reminder.findOne({
                        relatedId: reminder._id,
                        type: 'custom',
                        completed: true,
                        title: /تم إرسال/,
                        createdAt: { 
                            $gte: new Date(Date.now() - 2 * 60 * 1000)
                        }
                    });

                    if (alreadySent) {
                        console.log(`⏭️  تم تخطي "${reminder.title}" - تم الإرسال مسبقاً`);
                        continue;
                    }

                    console.log(`⏰ حان موعد التذكير: "${reminder.title}" - إرسال الآن...`);

                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: reminder.reminderEmail,
                        subject: `🔔 تذكير: ${reminder.title}`,
                        messageId: `${reminder._id}-${Date.now()}@yourapp.com`,
                        html: `
                            <div dir="rtl" style="font-family: Arial; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <div style="background: white; padding: 40px; border-radius: 15px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                                    <h2 style="color: #667eea; text-align: center; margin-bottom: 30px;">🔔 تذكير مهم</h2>
                                    <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 30px; border-radius: 12px; border-right: 6px solid #2196F3; margin: 20px 0;">
                                        <p style="margin: 15px 0; font-size: 19px; color: #333;"><strong>📌 التذكير:</strong> ${reminder.title}</p>
                                        ${reminder.description ? `<p style="margin: 15px 0; font-size: 16px; color: #555;"><strong>📝 التفاصيل:</strong> ${reminder.description}</p>` : ''}
                                        <p style="margin: 15px 0; font-size: 19px; color: #333;"><strong>📅 التاريخ:</strong> ${reminderDateTime.toLocaleDateString('ar-SA')}</p>
                                        <p style="margin: 15px 0; font-size: 19px; color: #333;"><strong>🕐 الوقت:</strong> ${reminder.time}</p>
                                        <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); border-radius: 10px; text-align: center;">
                                            <p style="margin: 0; color: white; font-size: 26px; font-weight: bold;">⏰ حان وقت التذكير!</p>
                                        </div>
                                    </div>
                                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                                        <p style="color: #999; font-size: 14px; margin: 5px 0;">🌍 المنطقة الزمنية: ${timezone}</p>
                                        <p style="color: #999; font-size: 14px; margin: 5px 0;">📧 هذا تذكير تلقائي من</p>
                                        <p style="color: #667eea; font-size: 18px; font-weight: bold; margin: 5px 0;">مديرك الشخصي</p>
                                        <p style="color: #ccc; font-size: 12px; margin-top: 15px;">تم الإرسال: ${nowInUserTimezone.toLocaleString('ar-SA')}</p>
                                    </div>
                                </div>
                            </div>
                        `
                    };

                    await transporter.sendMail(mailOptions);
                    sentCount++;
                    
                    console.log(`✅ تم إرسال التذكير: "${reminder.title}" → ${reminder.reminderEmail}`);

                    // تحديث كمكتمل
                    reminder.completed = true;
                    await reminder.save();

                    // إنشاء سجل الإرسال
                    await Reminder.create({
                        user: reminder.user,
                        title: `✅ تم إرسال: ${reminder.title}`,
                        description: `تم إرسال التذكير بنجاح إلى ${reminder.reminderEmail}`,
                        date: new Date(),
                        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                        timezone: timezone,
                        type: 'custom',
                        relatedId: reminder._id,
                        completed: true
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (emailError) {
                console.error(`❌ خطأ في "${reminder.title}":`, emailError.message);
            }
        }

        if (sentCount > 0) {
            console.log(`📧 تم إرسال ${sentCount} تذكير مخصص\n`);
        }

    } catch (error) {
        console.error('❌ خطأ في جدولة التذكيرات المخصصة:', error.message);
    }
}

// متغير لمنع التنفيذ المتعدد
let isRunning = false;

// جدولة المهمة
function startReminderScheduler() {
    cron.schedule('* * * * *', async () => {
        if (isRunning) {
            console.log('⏭️  تم تخطي فحص التذكيرات - المهمة السابقة مازالت تعمل');
            return;
        }

        isRunning = true;
        try {
            await sendScheduledCustomReminders();
        } catch (error) {
            console.error('❌ خطأ في التذكيرات المخصصة:', error);
        } finally {
            isRunning = false;
        }
    }, {
        scheduled: true,
        timezone: "Europe/Berlin"
    });

    console.log('✅ نظام التذكيرات المخصصة مفعّل (كل دقيقة)\n');
}

module.exports = { startReminderScheduler, sendScheduledCustomReminders };