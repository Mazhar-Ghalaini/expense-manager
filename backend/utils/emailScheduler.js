const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Appointment = require('../models/Appointment');
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

// دالة لدمج التاريخ والوقت حسب المنطقة الزمنية
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

// دالة إرسال التذكيرات للمواعيد
async function sendScheduledReminders() {
    try {
        const appointments = await Appointment.find({
            reminderEnabled: true,
            reminderEmail: { $exists: true, $ne: null, $ne: '' }
        }).populate('user');

        if (appointments.length === 0) {
            return;
        }

        let sentCount = 0;

        for (const appointment of appointments) {
            try {
                const timezone = appointment.timezone || 'Europe/Berlin';
                const nowInUserTimezone = getTimeInTimezone(timezone);
                const appointmentDateTime = combineDateTimeWithTimezone(
                    appointment.date,
                    appointment.time,
                    timezone
                );
                
                const diffMinutes = Math.floor((appointmentDateTime - nowInUserTimezone) / (1000 * 60));
                
                if (diffMinutes >= 0 && diffMinutes <= 1) {
                    
                    const recentReminder = await Reminder.findOne({
                        relatedId: appointment._id,
                        type: 'appointment',
                        completed: true,
                        email: appointment.reminderEmail,
                        createdAt: { 
                            $gte: new Date(Date.now() - 2 * 60 * 1000)
                        }
                    });

                    if (recentReminder) {
                        console.log(`⏭️  تم تخطي "${appointment.title}" - تم الإرسال مسبقاً`);
                        continue;
                    }

                    console.log(`⏰ حان موعد: "${appointment.title}" - إرسال الآن...`);

                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: appointment.reminderEmail,
                        subject: `🔔 موعدك الآن: ${appointment.title}`,
                        messageId: `${appointment._id}-${Date.now()}@yourapp.com`,
                        html: `
                            <div dir="rtl" style="font-family: Arial; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <div style="background: white; padding: 40px; border-radius: 15px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                                    <h2 style="color: #667eea; text-align: center; margin-bottom: 30px;">🔔 تذكير بموعدك</h2>
                                    <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); padding: 30px; border-radius: 12px; border-right: 6px solid #ffc107; margin: 20px 0;">
                                        <p style="margin: 15px 0; font-size: 19px; color: #333;"><strong>📌 العنوان:</strong> ${appointment.title}</p>
                                        <p style="margin: 15px 0; font-size: 19px; color: #333;"><strong>📅 التاريخ:</strong> ${appointmentDateTime.toLocaleDateString('ar-SA')}</p>
                                        <p style="margin: 15px 0; font-size: 19px; color: #333;"><strong>🕐 الوقت:</strong> ${appointment.time}</p>
                                        ${appointment.description ? `<p style="margin: 15px 0; font-size: 16px; color: #555;"><strong>📝 الوصف:</strong> ${appointment.description}</p>` : ''}
                                        <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%); border-radius: 10px; text-align: center;">
                                            <p style="margin: 0; color: white; font-size: 26px; font-weight: bold;">⏰ موعدك الآن!</p>
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
                    
                    console.log(`✅ تم إرسال تذكير: "${appointment.title}" → ${appointment.reminderEmail}`);

                    await Reminder.create({
                        user: appointment.user,
                        title: `📧 تذكير تلقائي: ${appointment.title}`,
                        date: new Date(),
                        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                        type: 'appointment',
                        relatedId: appointment._id,
                        email: appointment.reminderEmail,
                        completed: true
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (emailError) {
                console.error(`❌ خطأ في "${appointment.title}":`, emailError.message);
            }
        }

        if (sentCount > 0) {
            console.log(`📧 تم إرسال ${sentCount} تذكير\n`);
        }

    } catch (error) {
        console.error('❌ خطأ في الجدولة:', error.message);
    }
}

// متغير لمنع التنفيذ المتعدد
let isRunning = false;

// جدولة المهمة
function startEmailScheduler() {
    cron.schedule('* * * * *', async () => {
        if (isRunning) {
            console.log('⏭️  تم تخطي الفحص - المهمة السابقة مازالت تعمل');
            return;
        }

        isRunning = true;
        try {
            await sendScheduledReminders();
        } catch (error) {
            console.error('❌ خطأ في التذكيرات:', error);
        } finally {
            isRunning = false;
        }
    }, {
        scheduled: true,
        timezone: "Europe/Berlin"
    });

    console.log('✅ نظام التذكيرات مفعّل (كل دقيقة) - مع حماية من التكرار\n');
}

module.exports = { startEmailScheduler, sendScheduledReminders };