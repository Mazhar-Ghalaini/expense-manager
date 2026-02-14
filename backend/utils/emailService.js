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

// إرسال بريد تأكيد التسجيل
const sendVerificationEmail = async (email, name, verificationLink) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Expense Manager'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'تأكيد بريدك الإلكتروني - Expense Manager',
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #333; font-size: 22px; margin-bottom: 20px; }
          .content p { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0; }
          .button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4); }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 14px; }
          .warning { background: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .icon { font-size: 50px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">✉️</div>
            <h1>مرحباً بك في Expense Manager!</h1>
          </div>
          
          <div class="content">
            <h2>مرحباً ${name}،</h2>
            
            <p>شكراً لتسجيلك معنا! نحن سعداء بانضمامك إلى عائلة Expense Manager.</p>
            
            <p>للبدء في استخدام حسابك، الرجاء تأكيد بريدك الإلكتروني بالنقر على الزر أدناه:</p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">✅ تأكيد البريد الإلكتروني</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ ملاحظة مهمة:</strong><br>
              هذا الرابط صالح لمدة 24 ساعة فقط.
            </div>
            
            <p>إذا لم تقم بالتسجيل، يمكنك تجاهل هذه الرسالة.</p>
            
            <p style="margin-top: 30px; color: #999; font-size: 14px;">
              إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:<br>
              <a href="${verificationLink}" style="color: #667eea; word-break: break-all;">${verificationLink}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Expense Manager. جميع الحقوق محفوظة.</p>
            <p style="margin-top: 10px;">
              🌐 <a href="https://your-website.com" style="color: #667eea; text-decoration: none;">الموقع الإلكتروني</a> | 
              📧 <a href="mailto:support@your-website.com" style="color: #667eea; text-decoration: none;">الدعم الفني</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ تم إرسال بريد التحقق إلى:', email);
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في إرسال بريد التحقق:', error);
    return { success: false, error: error.message };
  }
};

// ✅ تصدير الدالة
module.exports = {
  transporter,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendVerificationEmail // ← أضف هذا
};