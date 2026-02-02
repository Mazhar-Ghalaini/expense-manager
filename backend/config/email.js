const nodemailer = require('nodemailer');

// إعدادات البريد الإلكتروني
// 🔴 ضع معلوماتك هنا 🔴
const transporter = nodemailer.createTransporter({
    service: 'gmail', // أو 'hotmail', 'yahoo', إلخ
    auth: {
        user: 'tektakshopp@gmail.com',  // 👈 ضع بريدك هنا
        pass: '214933'       // 👈 ضع App Password هنا
    }
});

// وظيفة إرسال البريد
async function sendReminderEmail(to, subject, html) {
    try {
        const mailOptions = {
            from: '"نظام التذكيرات" <YOUR_EMAIL@gmail.com>', // 👈 ضع بريدك هنا
            to: to,
            subject: subject,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return { success: false, error: error.message };
    }
}

// قالب البريد الإلكتروني
function getReminderEmailTemplate(title, description, date) {
    return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
            .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 تذكير مهم</h1>
            </div>
            <div class="content">
                <h2>${title}</h2>
                <p>${description || 'لا يوجد وصف'}</p>
                <p><strong>📅 الموعد:</strong> ${new Date(date).toLocaleString('ar-SA')}</p>
            </div>
            <div class="footer">
                <p>تم إرسال هذا التذكير من نظام إدارة المصروفات</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    sendReminderEmail,
    getReminderEmailTemplate
};