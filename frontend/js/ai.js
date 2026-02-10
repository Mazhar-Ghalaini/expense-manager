// ===================================
// 🤖 AI Chat System - Intelligent Assistant
// ===================================

console.log('🚀 تحميل نظام الذكاء الاصطناعي...');

// متغيرات عامة
let isRecording = false;
let recognition = null;

// ===================================
// 🎤 إعداد التعرف على الصوت
// ===================================

function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.lang = 'ar-SA';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('aiMessageInput').value = transcript;
            console.log('📝 النص المسجل:', transcript);
            showMessage('bot', '✅ تم التعرف على: ' + transcript);
        };
        
        recognition.onerror = function(event) {
            console.error('❌ خطأ في التسجيل:', event.error);
            stopRecording();
            
            if (event.error === 'not-allowed') {
                alert('⚠️ يرجى السماح بالوصول للميكروفون من إعدادات المتصفح');
            }
        };
        
        recognition.onend = function() {
            stopRecording();
        };
        
        console.log('✅ نظام التعرف على الصوت جاهز');
    } else {
        console.warn('⚠️ المتصفح لا يدعم التعرف على الصوت');
    }
}

// ===================================
// 🎙️ بدء/إيقاف التسجيل
// ===================================

function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    if (!recognition) {
        alert('⚠️ التسجيل الصوتي غير مدعوم في هذا المتصفح');
        return;
    }
    
    const voiceBtn = document.getElementById('aiVoiceBtn');
    voiceBtn.classList.add('recording');
    isRecording = true;
    
    try {
        recognition.start();
        console.log('🎤 بدء التسجيل...');
        showMessage('bot', '🎤 جاري الاستماع... تحدث الآن');
    } catch (error) {
        console.error('❌ خطأ في بدء التسجيل:', error);
        stopRecording();
    }
}

function stopRecording() {
    const voiceBtn = document.getElementById('aiVoiceBtn');
    if (voiceBtn) {
        voiceBtn.classList.remove('recording');
    }
    isRecording = false;
    
    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.error('خطأ في إيقاف التسجيل:', error);
        }
    }
}

// ===================================
// 💬 إرسال الرسائل
// ===================================

function sendMessage() {
    const input = document.getElementById('aiMessageInput');
    const message = input.value.trim();
    
    if (!message) {
        alert('⚠️ الرجاء كتابة رسالة');
        return;
    }
    
    const welcomeMsg = document.querySelector('.ai-welcome-msg');
    if (welcomeMsg) {
        welcomeMsg.style.display = 'none';
    }
    
    showMessage('user', message);
    input.value = '';
    
    // التحقق من انتظار البريد الإلكتروني
    if (window.waitingForEmail && window.pendingReminder) {
        handleEmailResponse(message);
        return;
    }
    
    // التحقق من اختيار نوع الجدول اليومي
    if (window.waitingForScheduleChoice) {
        window.waitingForScheduleChoice = false;
        const lowerMsg = message.toLowerCase();
        
        if (lowerMsg.includes('excel') || lowerMsg.includes('اكسل') || lowerMsg === '2') {
            exportDailyScheduleExcel();
        } else if (lowerMsg.includes('عرض') || lowerMsg === '1') {
            showDailySchedule();
        } else {
            showMessage('bot', '⚠️ يرجى الاختيار:\n• اكتب "عرض" للعرض في المحادثة\n• اكتب "excel" لتصدير ملف Excel');
            window.waitingForScheduleChoice = true;
        }
        return;
    }
    
    showTypingIndicator();
    
    setTimeout(() => {
        processMessage(message);
        hideTypingIndicator();
    }, 1000);
}// ===================================
// 🧠 معالجة الرسائل
// ===================================

async function processMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // تحليل نوع الطلب
    if (lowerMessage.includes('مصروف') || lowerMessage.includes('صرفت') || lowerMessage.includes('دفعت') || 
        lowerMessage.includes('اشتريت') || lowerMessage.includes('دفع')) {
        await handleExpenseRequest(message);
    } 
    else if (lowerMessage.includes('موعد') || lowerMessage.includes('اجتماع') || lowerMessage.includes('لقاء')) {
        await handleAppointmentRequest(message);
    } 
    else if (lowerMessage.includes('تذكير') || lowerMessage.includes('ذكرني') || lowerMessage.includes('نبهني')) {
        await handleReminderRequest(message);
    } 
    else if (lowerMessage.includes('excel') || lowerMessage.includes('اكسل') || lowerMessage.includes('تقرير') || 
             lowerMessage.includes('صدر') || lowerMessage.includes('تصدير')) {
        await handleExcelRequest();
    } 
    else if (lowerMessage.includes('جدول') || lowerMessage.includes('خطة') || lowerMessage.includes('يومي')) {
        await handleScheduleRequest();
    }
    else if (lowerMessage.includes('مرحبا') || lowerMessage.includes('هلا') || lowerMessage.includes('السلام')) {
        showMessage('bot', `مرحباً بك! 👋\n\nأنا مساعدك الذكي. يمكنني مساعدتك في:\n• إضافة المصروفات 💰\n• جدولة المواعيد 📅\n• إنشاء التذكيرات 🔔\n• تصدير تقرير Excel 📊\n\nمثال: "صرفت 50 يورو على الطعام"`);
    }
    else {
        showMessage('bot', `📝 رسالتك: "${message}"\n\n💡 أمثلة للاستخدام:\n• "صرفت 50 يورو على الطعام"\n• "موعد مع الطبيب غداً الساعة 3"\n• "ذكرني بدفع الفاتورة"\n• "صدّر لي تقرير Excel"`);
    }
}

// ===================================
// 💰 معالجة المصروفات
// ===================================

async function handleExpenseRequest(message) {
    const amount = extractAmount(message);
    const category = extractCategory(message);
    const description = message;
    
    if (!amount) {
        showMessage('bot', '⚠️ لم أتمكن من تحديد المبلغ.\n\nمثال صحيح:\n• "صرفت 50 يورو على الطعام"\n• "دفعت 100 دولار للمواصلات"');
        return;
    }
    
    const confirmMsg = `✅ هل تريد إضافة مصروف؟\n\n💰 المبلغ: ${amount} يورو\n📁 الفئة: ${category}\n📝 الوصف: ${description}`;
    showMessage('bot', confirmMsg);
    
    showConfirmButtons('expense', { amount, category, description });
}

// ===================================
// 📅 معالجة المواعيد
// ===================================

async function handleAppointmentRequest(message) {
    const title = extractTitle(message, 'appointment');
    const date = extractDate(message);
    const time = extractTime(message);
    
    if (!title) {
        showMessage('bot', '⚠️ لم أتمكن من تحديد عنوان الموعد.\n\nمثال صحيح:\n• "موعد مع الطبيب غداً الساعة 3"\n• "اجتماع عمل يوم الأحد"');
        return;
    }
    
    const confirmMsg = `✅ هل تريد إضافة موعد؟\n\n📌 العنوان: ${title}\n📅 التاريخ: ${formatDate(date)}\n🕐 الوقت: ${time}`;
    showMessage('bot', confirmMsg);
    
    showConfirmButtons('appointment', { title, date, time, description: message });
}

// ===================================
// 🔔 معالجة التذكيرات
// ===================================

async function handleReminderRequest(message) {
    const title = extractTitle(message, 'reminder');
    const date = extractDate(message);
    const time = extractTime(message);
    
    if (!title) {
        showMessage('bot', '⚠️ لم أتمكن من تحديد التذكير.\n\nمثال صحيح:\n• "ذكرني بدفع الفاتورة غداً"\n• "نبهني بالاتصال بأمي الساعة 8"');
        return;
    }
    
    // سؤال عن البريد الإلكتروني
    showMessage('bot', '📧 هل تريد تفعيل التذكير بالبريد الإلكتروني؟\n\nأدخل بريدك الإلكتروني أو اكتب "لا" للتخطي:');
    
    // تخزين البيانات مؤقتاً
    window.pendingReminder = { title, date, time, description: message };
    window.waitingForEmail = true;
}

function handleEmailResponse(response) {
    const lowerResponse = response.toLowerCase();
    const data = window.pendingReminder;
    
    let reminderEmail = null;
    let reminderEnabled = false;
    
    if (lowerResponse === 'لا' || lowerResponse === 'no' || lowerResponse === 'تخطي') {
        showMessage('bot', '✅ سيتم إضافة التذكير بدون بريد إلكتروني');
    } else if (response.includes('@')) {
        reminderEmail = response;
        reminderEnabled = true;
        showMessage('bot', `✅ تم تفعيل التذكير للبريد: ${reminderEmail}`);
    } else {
        showMessage('bot', '❌ بريد إلكتروني غير صحيح. سيتم إضافة التذكير بدون تنبيه.');
    }
    
    // إضافة البريد للبيانات
    data.reminderEmail = reminderEmail;
    data.reminderEnabled = reminderEnabled;
    
    const confirmMsg = `✅ هل تريد إضافة تذكير؟\n\n📌 العنوان: ${data.title}\n📅 التاريخ: ${formatDate(data.date)}\n🕐 الوقت: ${data.time}\n📧 البريد: ${reminderEmail || 'غير مفعل'}`;
    showMessage('bot', confirmMsg);
    
    showConfirmButtons('reminder', data);
    
    // إعادة تعيين
    window.waitingForEmail = false;
    window.pendingReminder = null;
}
// ===================================
// 📊 تصدير Excel
// ===================================

async function handleExcelRequest() {
    showMessage('bot', '📊 جاري إنشاء ملف Excel...');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/expenses/export`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            showMessage('bot', '✅ تم تصدير ملف Excel بنجاح! 📥\n\nتحقق من مجلد التنزيلات.');
        } else {
            showMessage('bot', '❌ حدث خطأ في تصدير الملف.\n\nالسبب: قد لا توجد مصروفات مسجلة.');
        }
    } catch (error) {
        console.error('خطأ في تصدير Excel:', error);
        showMessage('bot', '❌ حدث خطأ في الاتصال بالخادم.\n\nتأكد من تشغيل Backend.');
    }
}

// ===================================
// 📆 الجدول اليومي
// ===================================

async function handleScheduleRequest() {
    showMessage('bot', '📆 هل تريد:\n\n1️⃣ عرض الجدول في المحادثة\n2️⃣ تصدير جدول Excel شامل\n\nاكتب: "عرض" أو "excel"');
    
    window.waitingForScheduleChoice = true;
}

async function showDailySchedule() {
    showMessage('bot', '📆 جاري جلب جدولك اليومي...');
    
    try {
        const token = localStorage.getItem('token');
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        console.log('🔍 البحث عن تاريخ:', todayStr);
        console.log('📅 التاريخ الفعلي:', `${day}/${month}/${year}`);
        
        const [appointmentsRes, remindersRes, expensesRes] = await Promise.all([
            fetch(`${API_URL}/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/reminders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/expenses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        if (appointmentsRes.ok && remindersRes.ok && expensesRes.ok) {
            const appointments = await appointmentsRes.json();
            const reminders = await remindersRes.json();
            const expenses = await expensesRes.json();
            
            console.log('📦 الاستجابة الكاملة:');
            console.log('- appointments:', appointments);
            console.log('- reminders:', reminders);
            console.log('- expenses:', expenses);
            
            // تحديد المصدر الصحيح للبيانات
            const appointmentsData = appointments.appointments || appointments.data || (Array.isArray(appointments) ? appointments : []);
            const remindersData = reminders.reminders || reminders.data || (Array.isArray(reminders) ? reminders : []);
            const expensesData = expenses.expenses || expenses.data || (Array.isArray(expenses) ? expenses : []);
            
            console.log('📊 البيانات المستخرجة:');
            console.log('- المواعيد:', appointmentsData.length);
            console.log('- التذكيرات:', remindersData.length);
            console.log('- المصاريف:', expensesData.length);
            
            let scheduleText = `📅 **جدولك ليوم ${now.toLocaleDateString('ar-SA')}:**\n\n`;
            let hasItems = false;
            
            // المواعيد
            if (appointmentsData && appointmentsData.length > 0) {
                console.log('🔍 فحص المواعيد...');
                           const todayAppts = appointmentsData.filter(a => {                    const aptDate = new Date(a.date);
                    const aptDateStr = aptDate.toISOString().split('T')[0];
                    const aptYear = aptDate.getFullYear();
                    const aptMonth = String(aptDate.getMonth() + 1).padStart(2, '0');
                    const aptDay = String(aptDate.getDate()).padStart(2, '0');
                    const aptDateStr2 = `${aptYear}-${aptMonth}-${aptDay}`;
                    
                    console.log(`  - موعد: ${a.title} | تاريخه: ${aptDateStr2}`);
                    return aptDateStr === todayStr || aptDateStr2 === todayStr || a.date.startsWith(todayStr);
                });
                
                console.log(`✅ مواعيد اليوم: ${todayAppts.length}`);
                
                if (todayAppts.length > 0) {
                    scheduleText += '📌 **المواعيد:**\n';
                    todayAppts.forEach(apt => {
                        scheduleText += `• ${apt.time} - ${apt.title}\n`;
                    });
                    scheduleText += '\n';
                    hasItems = true;
                }
            }
            
            // التذكيرات
            if (remindersData && remindersData.length > 0) {
                console.log('🔍 فحص التذكيرات...');
                           const todayRems = remindersData.filter(r => {                    const remDate = new Date(r.date);
                    const remDateStr = remDate.toISOString().split('T')[0];
                    const remYear = remDate.getFullYear();
                    const remMonth = String(remDate.getMonth() + 1).padStart(2, '0');
                    const remDay = String(remDate.getDate()).padStart(2, '0');
                    const remDateStr2 = `${remYear}-${remMonth}-${remDay}`;
                    
                    console.log(`  - تذكير: ${r.title} | تاريخه: ${remDateStr2}`);
                    return (remDateStr === todayStr || remDateStr2 === todayStr || r.date.startsWith(todayStr)) && !r.completed;
                });
                
                console.log(`✅ تذكيرات اليوم: ${todayRems.length}`);
                
                if (todayRems.length > 0) {
                    scheduleText += '🔔 **التذكيرات:**\n';
                    todayRems.forEach(rem => {
                        scheduleText += `• ${rem.time} - ${rem.title}\n`;
                    });
                    scheduleText += '\n';
                    hasItems = true;
                }
            }
            
            // المصاريف
            if (expensesData && expensesData.length > 0) {
                console.log('🔍 فحص المصاريف...');
                           const todayExp = expensesData.filter(e => {                    const expDate = new Date(e.date);
                    const expDateStr = expDate.toISOString().split('T')[0];
                    const expYear = expDate.getFullYear();
                    const expMonth = String(expDate.getMonth() + 1).padStart(2, '0');
                    const expDay = String(expDate.getDate()).padStart(2, '0');
                    const expDateStr2 = `${expYear}-${expMonth}-${expDay}`;
                    
                    console.log(`  - مصروف: ${e.amount} يورو | تاريخه: ${expDateStr2}`);
                    return expDateStr === todayStr || expDateStr2 === todayStr || e.date.startsWith(todayStr);
                });
                
                console.log(`✅ مصاريف اليوم: ${todayExp.length}`);
                
                if (todayExp.length > 0) {
                    const total = todayExp.reduce((sum, e) => sum + e.amount, 0);
                    scheduleText += '💰 **المصاريف:**\n';
                    todayExp.forEach(exp => {
                        scheduleText += `• ${exp.amount} يورو - ${exp.category}\n`;
                    });
                    scheduleText += `\n**المجموع:** ${total} يورو\n`;
                    hasItems = true;
                }
            }
            
            if (!hasItems) {
                scheduleText = '✨ لا توجد مواعيد أو تذكيرات أو مصاريف لليوم.\n\nيومك خالٍ! 😊';
            }
            
            showMessage('bot', scheduleText);
        } else {
            showMessage('bot', '❌ حدث خطأ في جلب البيانات.');
        }
    } catch (error) {
        console.error('❌ خطأ في جلب الجدول:', error);
        showMessage('bot', '❌ حدث خطأ في الاتصال بالخادم.');
    }
}

async function exportDailyScheduleExcel() {
    showMessage('bot', '📊 جاري إنشاء ملف Excel الشامل...');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/schedule/export`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `daily_schedule_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            showMessage('bot', '✅ تم تصدير الجدول اليومي بنجاح! 📥');
        } else {
            showMessage('bot', '❌ حدث خطأ في تصدير الجدول.');
        }
    } catch (error) {
        console.error('خطأ في تصدير الجدول:', error);
        showMessage('bot', '❌ حدث خطأ في الاتصال بالخادم.');
    }
}
// ===================================
// ✅ أزرار التأكيد
// ===================================

function showConfirmButtons(type, data) {
    const messagesDiv = document.getElementById('aiChatMessages');
    
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'ai-message bot';
    
    const dataStr = JSON.stringify(data).replace(/"/g, '&quot;');
    
    buttonDiv.innerHTML = `
        <div class="ai-msg-avatar bot">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-msg-content">
            <button onclick='confirmAction("${type}", ${dataStr})' 
                    style="padding: 10px 20px; margin: 5px; background: #4caf50; color: white; border: none; border-radius: 8px; cursor: pointer; font-family: inherit;">
                ✅ تأكيد الإضافة
            </button>
            <button onclick="cancelAction(this)" 
                    style="padding: 10px 20px; margin: 5px; background: #f44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-family: inherit;">
                ❌ إلغاء
            </button>
        </div>
    `;
    
    messagesDiv.appendChild(buttonDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function cancelAction(btn) {
    btn.closest('.ai-message').remove();
    showMessage('bot', '✅ تم الإلغاء');
}

async function confirmAction(type, data) {
    try {
        const token = localStorage.getItem('token');
        let endpoint = '';
        let requestData = {};
        
        if (type === 'expense') {
            endpoint = '/expenses';
            requestData = {
                amount: parseFloat(data.amount),
                category: data.category,
                description: data.description,
                date: new Date().toISOString().split('T')[0]
            };
        } else if (type === 'appointment') {
            endpoint = '/appointments';
            requestData = {
                title: data.title,
                description: data.description,
                date: data.date,
                time: data.time,
                timezone: 'Europe/Berlin'
            };
         } else if (type === 'reminder') {
            endpoint = '/reminders';
            requestData = {
                title: data.title,
                description: data.description,
                date: data.date,
                time: data.time,
                timezone: 'Europe/Berlin',
                reminderEnabled: data.reminderEnabled || false,
                reminderEmail: data.reminderEmail || null
            };
      }        
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('bot', '✅ تم الحفظ بنجاح!\n\nيمكنك رؤيته في القسم المناسب.');
            
            document.querySelectorAll('.ai-message').forEach(msg => {
                if (msg.querySelector('button')) {
                    msg.remove();
                }
            });
        } else {
            showMessage('bot', '❌ حدث خطأ: ' + result.message);
        }
    } catch (error) {
        console.error('خطأ في الحفظ:', error);
        showMessage('bot', '❌ حدث خطأ في الحفظ. تأكد من تشغيل Backend.');
    }
}

// ===================================
// 🔍 دوال استخراج المعلومات
// ===================================

function extractAmount(text) {
    const patterns = [
        /(\d+(?:\.\d+)?)\s*(?:يورو|euro|eur|€)/i,
        /(\d+(?:\.\d+)?)\s*(?:دولار|dollar|usd|\$)/i,
        /(\d+(?:\.\d+)?)\s*(?:ريال|sar)/i,
        /(\d+(?:\.\d+)?)\s*(?:درهم|aed)/i,
        /(\d+(?:\.\d+)?)/
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return parseFloat(match[1]);
        }
    }
    
    return null;
}

function extractCategory(text) {
    const categories = {
        'طعام': ['طعام', 'أكل', 'مطعم', 'غداء', 'عشاء', 'فطور', 'وجبة'],
        'نقل': ['نقل', 'مواصلات', 'تاكسي', 'باص', 'قطار', 'أوبر', 'بنزين'],
        'ترفيه': ['ترفيه', 'سينما', 'لعب', 'رحلة', 'سفر', 'فيلم'],
        'صحة': ['صحة', 'طبيب', 'دواء', 'علاج', 'مستشفى', 'صيدلية'],
        'تسوق': ['تسوق', 'ملابس', 'شراء', 'سوق']
    };
    
    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            return category;
        }
    }
    
    return 'أخرى';
}

function extractTitle(text, type) {
    const patterns = {
        appointment: [
            /موعد\s+(?:مع\s+)?(.+?)(?:\s+في|\s+يوم|\s+غداً|\s+الساعة|$)/i,
            /اجتماع\s+(.+?)(?:\s+في|\s+يوم|\s+غداً|\s+الساعة|$)/i
        ],
        reminder: [
            /ذكرني\s+(?:ب)?(.+?)(?:\s+في|\s+يوم|\s+غداً|\s+الساعة|$)/i,
            /نبهني\s+(?:ب)?(.+?)(?:\s+في|\s+يوم|\s+غداً|\s+الساعة|$)/i,
            /تذكير\s+(.+?)(?:\s+في|\s+يوم|\s+غداً|\s+الساعة|$)/i
        ]
    };
    
    const typePatterns = patterns[type] || patterns.reminder;
    
    for (const pattern of typePatterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 2) {
            return match[1].trim();
        }
    }
    
    return text.substring(0, 50);
}

function extractDate(text) {
    const today = new Date();
    
    if (text.includes('غداً') || text.includes('غدا') || text.includes('بكرة')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
    
    if (text.includes('اليوم') || text.includes('الآن')) {
        return today.toISOString().split('T')[0];
    }
    
    if (text.includes('بعد غد')) {
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);
        return dayAfter.toISOString().split('T')[0];
    }
    
    const dateMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        return dateMatch[0];
    }
    
    return today.toISOString().split('T')[0];
}

function extractTime(text) {
    const timePatterns = [
        /(\d{1,2}):(\d{2})/,
        /الساعة\s+(\d{1,2})/,
        /في\s+(\d{1,2})/
    ];
    
    for (const pattern of timePatterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[2]) {
                return `${match[1].padStart(2, '0')}:${match[2]}`;
            } else {
                return `${match[1].padStart(2, '0')}:00`;
            }
        }
    }
    
    return '12:00';
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
        return 'اليوم';
    } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
        return 'غداً';
    }
    
    return date.toLocaleDateString('ar-SA');
}

// ===================================
// 🎯 الإجراءات السريعة
// ===================================

function aiQuickAction(type) {
    const messages = {
        expense: 'أريد إضافة مصروف جديد',
        appointment: 'أريد إضافة موعد جديد',
        reminder: 'أريد إضافة تذكير جديد',
        excel: 'صدّر لي تقرير Excel',
        schedule: 'أرني جدولي اليومي'
    };
    
    const input = document.getElementById('aiMessageInput');
    if (input) {
        input.value = messages[type] || '';
        sendMessage();
    }
}

// ===================================
// 🎨 عرض الرسائل
// ===================================

function showMessage(type, text) {
    const messagesDiv = document.getElementById('aiChatMessages');
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = `ai-msg-avatar ${type}`;
    avatar.innerHTML = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'ai-msg-content';
    content.innerHTML = text.replace(/\n/g, '<br>');
    
    const time = document.createElement('div');
    time.className = 'ai-msg-time';
    time.textContent = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    content.appendChild(time);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showTypingIndicator() {
    const indicator = document.getElementById('aiTypingIndicator');
    if (indicator) {
        indicator.classList.add('active');
        const messagesDiv = document.getElementById('aiChatMessages');
        if (messagesDiv) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }
}

function hideTypingIndicator() {
    const indicator = document.getElementById('aiTypingIndicator');
    if (indicator) {
        indicator.classList.remove('active');
    }
}

// ===================================
// 🎬 تهيئة الصفحة
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تهيئة نظام الذكاء الاصطناعي...');
    
    // تهيئة التعرف على الصوت
    initSpeechRecognition();
    
    // ربط الأزرار
    const voiceBtn = document.getElementById('aiVoiceBtn');
    const sendBtn = document.getElementById('aiSendBtn');
    const messageInput = document.getElementById('aiMessageInput');
    
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleRecording);
        console.log('✅ زر التسجيل الصوتي متصل');
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        console.log('✅ زر الإرسال متصل');
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        console.log('✅ حقل الإدخال متصل');
    }
    
    console.log('✅ نظام الذكاء الاصطناعي جاهز للعمل!');
});