const nodemailer = require('nodemailer');

// إعداد البريد الإلكتروني (نفس إعدادات التذكيرات)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ==========================================
// إرسال Email لإعادة تعيين كلمة المرور
// ==========================================
async function sendPasswordResetEmail(email, name, resetLink) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: '🔐 طلب إعادة تعيين كلمة المرور',
            html: `
                <div dir="rtl" style="font-family: Arial; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div style="background: white; padding: 40px; border-radius: 15px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px;">
                                🔐
                            </div>
                            <h2 style="color: #2c3e50; margin: 0;">إعادة تعيين كلمة المرور</h2>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0;">
                            <p style="margin: 0 0 15px 0; font-size: 16px; color: #555;">
                                مرحباً <strong style="color: #667eea;">${name}</strong>،
                            </p>
                            <p style="margin: 0 0 15px 0; font-size: 16px; color: #555; line-height: 1.6;">
                                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. 
                                انقر على الزر أدناه لإنشاء كلمة مرور جديدة:
                            </p>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" 
                               style="display: inline-block; 
                                      padding: 15px 40px; 
                                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                      color: white; 
                                      text-decoration: none; 
                                      border-radius: 10px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                🔑 إعادة تعيين كلمة المرور
                            </a>
                        </div>

                        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; border-right: 5px solid #ffc107; margin: 20px 0;">
                            <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.6;">
                                ⏰ <strong>مهم:</strong> هذا الرابط صالح لمدة <strong>5 دقائق فقط</strong> لأسباب أمنية.
                            </p>
                        </div>

                        <div style="background: #f8d7da; padding: 20px; border-radius: 10px; border-right: 5px solid #dc3545; margin: 20px 0;">
                            <p style="margin: 0; font-size: 14px; color: #721c24; line-height: 1.6;">
                                ⚠️ <strong>تحذير:</strong> إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة. 
                                حسابك آمن تماماً.
                            </p>
                        </div>

                        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                                🔗 أو انسخ هذا الرابط في المتصفح:
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999; word-break: break-all; direction: ltr; text-align: left;">
                                ${resetLink}
                            </p>
                        </div>

                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                            <p style="color: #999; font-size: 14px; margin: 5px 0;">
                                📧 رسالة تلقائية من
                            </p>
                            <p style="color: #667eea; font-size: 18px; font-weight: bold; margin: 5px 0;">
                                مدير المصروفات الذكي
                            </p>
                            <p style="color: #ccc; font-size: 12px; margin-top: 15px;">
                                تم الإرسال: ${new Date().toLocaleString('ar-SA')}
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى:', email);
        return { success: true };
    } catch (error) {
        console.error('❌ خطأ في إرسال Email:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// إرسال Email تأكيد تغيير كلمة المرور
// ==========================================
async function sendPasswordChangedEmail(email, name) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: '✅ تم تغيير كلمة المرور بنجاح',
            html: `
                <div dir="rtl" style="font-family: Arial; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div style="background: white; padding: 40px; border-radius: 15px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #50c878 0%, #4caf50 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px;">
                                ✅
                            </div>
                            <h2 style="color: #2c3e50; margin: 0;">تم تغيير كلمة المرور</h2>
                        </div>
                        
                        <div style="background: #d4edda; padding: 25px; border-radius: 10px; border-right: 5px solid #50c878; margin: 20px 0;">
                            <p style="margin: 0 0 15px 0; font-size: 16px; color: #155724;">
                                مرحباً <strong>${name}</strong>،
                            </p>
                            <p style="margin: 0; font-size: 16px; color: #155724; line-height: 1.6;">
                                ✅ تم تغيير كلمة المرور الخاصة بحسابك بنجاح.
                            </p>
                        </div>

                        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; border-right: 5px solid #ffc107; margin: 20px 0;">
                            <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.6;">
                                🕐 <strong>الوقت:</strong> ${new Date().toLocaleString('ar-SA')}
                            </p>
                        </div>

                        <div style="background: #f8d7da; padding: 20px; border-radius: 10px; border-right: 5px solid #dc3545; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #721c24; font-weight: bold;">
                                ⚠️ لم تقم بهذا التغيير؟
                            </p>
                            <p style="margin: 0; font-size: 14px; color: #721c24; line-height: 1.6;">
                                إذا لم تكن أنت من قام بتغيير كلمة المرور، يرجى التواصل معنا فوراً لتأمين حسابك.
                            </p>
                        </div>

                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                            <p style="color: #999; font-size: 14px; margin: 5px 0;">
                                📧 رسالة تلقائية من
                            </p>
                            <p style="color: #667eea; font-size: 18px; font-weight: bold; margin: 5px 0;">
                                مدير المصروفات الذكي
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ تم إرسال تأكيد تغيير كلمة المرور إلى:', email);
        return { success: true };
    } catch (error) {
        console.error('❌ خطأ في إرسال Email:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendPasswordResetEmail,
    sendPasswordChangedEmail
};