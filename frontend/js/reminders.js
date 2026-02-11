// reminders.js - إدارة التذكيرات

if (typeof API_URL === 'undefined') {
    console.error('❌ API_URL غير معرّف! تأكد من تحميل app.js أولاً');
}

// ==========================================
// متغيرات عامة
// ==========================================
let currentFilter = 'all';
let recognition = null;
let isRecording = false;
let recordingTimeout = null;
let isProcessing = false;
let pressTimer = null;
let isLongPress = false;

// ==========================================
// التهيئة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ تم تحميل صفحة التذكيرات');
    
    // تعيين التاريخ والوقت الافتراضي
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // بعد 5 دقائق
    
    const dateInput = document.getElementById('reminderDate');
    const timeInput = document.getElementById('reminderTime');
    
    if (dateInput) {
        dateInput.valueAsDate = now;
    }
    
    if (timeInput) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }
    
    // تحميل التذكيرات
    if (document.getElementById('remindersList')) {
        loadReminders('all');
    }
    
    // تفعيل نظام الضغط المطول
    initVoiceButton();
});

// ==========================================
// 🎤 تفعيل نظام الضغط المطول
// ==========================================
function initVoiceButton() {
    const voiceBtn = document.querySelector('.btn-success');
    
    if (!voiceBtn) {
        console.error('❌ لم يتم العثور على زر التسجيل');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error('❌ المتصفح لا يدعم التسجيل');
        voiceBtn.style.display = 'none';
        return;
    }

    voiceBtn.onclick = null;
    voiceBtn.removeAttribute('onclick');

    voiceBtn.addEventListener('touchstart', handlePressStart, { passive: false });
    voiceBtn.addEventListener('touchend', handlePressEnd, { passive: false });
    voiceBtn.addEventListener('touchcancel', handlePressEnd, { passive: false });

    voiceBtn.addEventListener('mousedown', handlePressStart);
    voiceBtn.addEventListener('mouseup', handlePressEnd);
    voiceBtn.addEventListener('mouseleave', handlePressEnd);

    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> اضغط مطولاً للتسجيل';
}

function handlePressStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isLongPress = false;
    
    const btn = e.currentTarget;
    if (btn) {
        btn.style.background = '#ff9800';
        btn.style.transform = 'scale(0.95)';
    }
    
    pressTimer = setTimeout(() => {
        isLongPress = true;
        startRecordingLongPress();
    }, 200);
}

function handlePressEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
    }
    
    const btn = e.currentTarget;
    if (btn) {
        btn.style.transform = 'scale(1)';
    }
    
    if (isLongPress && isRecording) {
        stopRecordingLongPress();
    } else if (!isRecording) {
        if (btn) {
            btn.style.background = '#4caf50';
        }
    }
    
    isLongPress = false;
}

function startRecordingLongPress() {
    if (isRecording) return;

    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.lang = 'ar-SA';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        let finalText = '';
        
        recognition.onstart = () => {
            isRecording = true;
            isProcessing = false;
            finalText = '';
            
            updateRecordingUI(true);
            
            recordingTimeout = setTimeout(() => {
                stopRecordingLongPress();
            }, 5000);
        };
        
        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript;
                    finalText += ' ' + text;
                }
            }
        };
        
        recognition.onerror = (event) => {
            if (event.error !== 'aborted') {
                stopRecordingLongPress();
                
                if (event.error === 'no-speech') {
                    alert('🎤 لم يتم اكتشاف صوت\nحاول مرة أخرى');
                }
            }
        };
        
        recognition.onend = () => {
            isRecording = false;
            isProcessing = false;
            updateRecordingUI(false);
            
            if (recordingTimeout) {
                clearTimeout(recordingTimeout);
                recordingTimeout = null;
            }
            
            if (finalText && finalText.trim()) {
                setTimeout(() => {
                    processVoiceInput(finalText.trim());
                }, 100);
            } else {
                setTimeout(() => {
                    alert('🎤 لم يتم التعرف على أي كلام\nحاول مرة أخرى');
                }, 100);
            }
        };
        
        recognition.start();
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        alert('❌ خطأ: ' + error.message);
        stopRecordingLongPress();
    }
}

function stopRecordingLongPress() {
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            console.log('Already stopped');
        }
    }
    
    isRecording = false;
    isProcessing = false;
    
    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
    }
    
    updateRecordingUI(false);
}

function updateRecordingUI(recording) {
    const btn = document.querySelector('.btn-success');
    
    if (!btn) return;
    
    if (recording) {
        btn.style.background = '#f44336';
        btn.innerHTML = '<i class="fas fa-circle" style="animation: pulse 1s infinite;"></i> ارفع إصبعك للإيقاف';
    } else {
        btn.style.background = '#4caf50';
        btn.style.transform = 'scale(1)';
        btn.innerHTML = '<i class="fas fa-microphone"></i> اضغط مطولاً للتسجيل';
    }
}

function processVoiceInput(text) {
    console.log('🔄 معالجة النص:', text);
    
    const extractedData = parseVoiceToReminder(text);
    
    if (extractedData) {
        showReminderConfirmModal(extractedData, text);
    } else {
        alert('❌ لم أفهم التذكير\n\n✅ مثال صحيح:\n"ذكرني بالاجتماع بعد ساعة"');
    }
}

// ==========================================
// استخراج البيانات من النص - ذكي جداً
// ==========================================
function parseVoiceToReminder(text) {
    console.log('🔍 تحليل:', text);
    
    const result = {
        title: text,
        description: '',
        reminderDate: new Date(),
        priority: 'متوسط'
    };
    
    const now = new Date();
    let targetDate = new Date(now);
    
    // ==========================================
    // 1. استخراج الأولوية
    // ==========================================
    if (text.includes('مهم') || text.includes('عاجل') || text.includes('ضروري')) {
        result.priority = 'عالي';
    } else if (text.includes('عادي')) {
        result.priority = 'منخفض';
    }
    
    // ==========================================
    // 2. استخراج التاريخ
    // ==========================================
    let dateFound = false;
    
    // غداً
    if (text.includes('غداً') || text.includes('غدا') || text.includes('بكرة')) {
        targetDate.setDate(targetDate.getDate() + 1);
        dateFound = true;
        console.log('📅 غداً:', targetDate);
    }
    // بعد غد
    else if (text.includes('بعد غد') || text.includes('بعد غدا')) {
        targetDate.setDate(targetDate.getDate() + 2);
        dateFound = true;
        console.log('📅 بعد غد:', targetDate);
    }
    // الأسبوع القادم
    else if (text.includes('الأسبوع القادم') || text.includes('الاسبوع الجاي')) {
        targetDate.setDate(targetDate.getDate() + 7);
        dateFound = true;
        console.log('📅 الأسبوع القادم:', targetDate);
    }
    // الشهر القادم
    else if (text.includes('الشهر القادم') || text.includes('الشهر الجاي')) {
        targetDate.setMonth(targetDate.getMonth() + 1);
        dateFound = true;
        console.log('📅 الشهر القادم:', targetDate);
    }
    // بعد X أيام
    else {
        const daysMatch = text.match(/بعد (\d+) يوم|بعد (\d+) ايام/);
        if (daysMatch) {
            const days = parseInt(daysMatch[1] || daysMatch[2]);
            targetDate.setDate(targetDate.getDate() + days);
            dateFound = true;
            console.log(`📅 بعد ${days} أيام:`, targetDate);
        }
    }
    
    // ==========================================
    // 3. استخراج الوقت
    // ==========================================
    let timeFound = false;
    let hours = now.getHours();
    let minutes = now.getMinutes();
    
    // الساعة X (بالأرقام)
    const timeMatch1 = text.match(/الساعة (\d+)/);
    if (timeMatch1) {
        hours = parseInt(timeMatch1[1]);
        minutes = 0;
        timeFound = true;
        console.log('🕐 الساعة (رقم):', hours);
    }
    
    // X صباحاً / مساءً
    const timeMatch2 = text.match(/(\d+)\s*(صباحا|صباحاً|مساء|مساءا|مساءً)/);
    if (timeMatch2) {
        let hour = parseInt(timeMatch2[1]);
        const period = timeMatch2[2];
        
        if ((period.includes('مساء') || period.includes('مساءً')) && hour < 12) {
            hour += 12;
        } else if ((period.includes('صباح') || period.includes('صباحاً')) && hour === 12) {
            hour = 0;
        }
        
        hours = hour;
        minutes = 0;
        timeFound = true;
        console.log('🕐 الوقت (صباحاً/مساءً):', hours);
    }
    
    // الساعة X والنصف
    const timeMatch3 = text.match(/الساعة (\d+) والنصف/);
    if (timeMatch3) {
        hours = parseInt(timeMatch3[1]);
        minutes = 30;
        timeFound = true;
        console.log('🕐 الساعة والنصف:', hours, ':', minutes);
    }
    
    // الساعة X:XX (بصيغة رقمية)
    const timeMatch4 = text.match(/(\d+):(\d+)/);
    if (timeMatch4) {
        hours = parseInt(timeMatch4[1]);
        minutes = parseInt(timeMatch4[2]);
        timeFound = true;
        console.log('🕐 الوقت (XX:XX):', hours, ':', minutes);
    }
    
    // بعد X ساعات
    const hoursMatch = text.match(/بعد (\d+) ساعة|بعد (\d+) ساعه/);
    if (hoursMatch) {
        const hoursToAdd = parseInt(hoursMatch[1] || hoursMatch[2]);
        targetDate.setHours(targetDate.getHours() + hoursToAdd);
        timeFound = true;
        console.log(`🕐 بعد ${hoursToAdd} ساعات`);
    }
    
    // بعد X دقيقة
    const minutesMatch = text.match(/بعد (\d+) دقيقة|بعد (\d+) دقائق/);
    if (minutesMatch) {
        const minutesToAdd = parseInt(minutesMatch[1] || minutesMatch[2]);
        targetDate.setMinutes(targetDate.getMinutes() + minutesToAdd);
        timeFound = true;
        console.log(`🕐 بعد ${minutesToAdd} دقيقة`);
    }
    
    // ==========================================
    // 4. تطبيق الوقت على التاريخ
    // ==========================================
    if (timeFound) {
        targetDate.setHours(hours);
        targetDate.setMinutes(minutes);
        targetDate.setSeconds(0);
        targetDate.setMilliseconds(0);
    } else if (!dateFound) {
        // إذا لم يتم تحديد تاريخ أو وقت، افتراضي بعد ساعة
        targetDate.setHours(targetDate.getHours() + 1);
        targetDate.setMinutes(0);
    }
    
    result.reminderDate = targetDate;
    
    // ==========================================
    // 5. تنظيف العنوان
    // ==========================================
    let title = text;
    
    // إزالة الكلمات المفتاحية
    const removeWords = [
        'ذكرني', 'ذكرني ب', 'تذكير', 'موعد', 'مهم', 'عاجل', 'عادي',
        'غداً', 'غدا', 'بكرة', 'بعد غد', 'بعد غدا',
        'الساعة', 'صباحاً', 'صباحا', 'مساءً', 'مساءا', 'مساء',
        'والنصف', 'بعد \\d+ يوم', 'بعد \\d+ ايام',
        'بعد \\d+ ساعة', 'بعد \\d+ ساعه',
        'بعد \\d+ دقيقة', 'بعد \\d+ دقائق',
        'الأسبوع القادم', 'الاسبوع الجاي',
        'الشهر القادم', 'الشهر الجاي'
    ];
    
    removeWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        title = title.replace(regex, '').trim();
    });
    
    // إزالة الأرقام المنفردة
    title = title.replace(/\b\d+\b/g, '').trim();
    
    // إزالة المسافات الزائدة
    title = title.replace(/\s+/g, ' ').trim();
    
    result.title = title || text;
    
    console.log('✅ النتيجة النهائية:', {
        title: result.title,
        date: result.reminderDate.toLocaleDateString('ar-SA'),
        time: result.reminderDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        priority: result.priority
    });
    
    return result;
}
// ==========================================
// نافذة التأكيد - مع جلب البريد تلقائياً
// ==========================================
function showReminderConfirmModal(reminderData, originalText) {
    const dateStr = new Date(reminderData.reminderDate).toISOString().split('T')[0];
    const timeStr = new Date(reminderData.reminderDate).toTimeString().split(' ')[0].substring(0, 5);
    
    // ✅ جلب البريد الإلكتروني من localStorage
    let userEmail = '';
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        userEmail = user?.email || '';
        console.log('📧 البريد المُسترجع:', userEmail);
    } catch (e) {
        console.error('❌ فشل جلب البريد:', e);
    }
    
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:999999;padding:15px;overflow-y:auto;';
    
    modal.innerHTML = `
        <div style="background:white;padding:25px;border-radius:20px;max-width:600px;width:100%;max-height:95vh;overflow-y:auto;box-shadow:0 10px 50px rgba(0,0,0,0.3);">
            
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:70px;height:70px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:50%;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;font-size:35px;color:white;">🎤</div>
                <h2 style="margin:0;color:#2c3e50;font-size:22px;">تأكيد التذكير</h2>
                <p style="color:#999;font-size:13px;margin-top:8px;padding:10px;background:#f8f9fa;border-radius:8px;font-style:italic;word-wrap:break-word;">"${originalText}"</p>
            </div>
            
            <form id="confirmForm">
                
                <div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-bottom:15px;">
                    <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-heading"></i> العنوان *</label>
                    <input type="text" id="confirmTitle" value="${reminderData.title||''}" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:15px;box-sizing:border-box;">
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
                    <div style="background:#f8f9fa;padding:12px;border-radius:10px;">
                        <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-calendar"></i> التاريخ *</label>
                        <input type="date" id="confirmDate" value="${dateStr}" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                    </div>
                    <div style="background:#f8f9fa;padding:12px;border-radius:10px;">
                        <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-clock"></i> الوقت *</label>
                        <input type="time" id="confirmTime" value="${timeStr}" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                    </div>
                </div>
                
                <div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-bottom:15px;">
                    <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-flag"></i> الأولوية *</label>
                    <select id="confirmPriority" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                        <option value="منخفض" ${reminderData.priority==='منخفض'?'selected':''}>منخفض</option>
                        <option value="متوسط" ${reminderData.priority==='متوسط'?'selected':''}>متوسط</option>
                        <option value="عالي" ${reminderData.priority==='عالي'?'selected':''}>عالي</option>
                    </select>
                </div>
                
                <div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-bottom:15px;">
                    <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-align-right"></i> ملاحظات</label>
                    <textarea id="confirmDescription" rows="2" style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;">${reminderData.description||''}</textarea>
                </div>
                
                <div style="background:#fff3cd;padding:12px;border-radius:10px;margin-bottom:15px;border:1px solid #ffc107;">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:10px;">
                        <input type="checkbox" id="confirmEnableEmail" style="width:18px;height:18px;cursor:pointer;">
                        <span style="color:#856404;font-weight:600;font-size:14px;">
                            <i class="fas fa-envelope"></i> تفعيل التذكير بالبريد الإلكتروني
                        </span>
                    </label>
                    <div id="confirmEmailField" style="display:none;margin-top:10px;">
                        <input type="email" id="confirmEmail" value="${userEmail}" placeholder="example@email.com" style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <button type="submit" style="padding:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:600;">✅ تأكيد</button>
                    <button type="button" id="cancelConfirmBtn" style="padding:12px;background:#e0e0e0;color:#666;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:600;">❌ إلغاء</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Toggle email field
    modal.querySelector('#confirmEnableEmail').onchange = (e) => {
        const emailField = modal.querySelector('#confirmEmailField');
        const emailInput = modal.querySelector('#confirmEmail');
        if (e.target.checked) {
            emailField.style.display = 'block';
            emailInput.required = true;
        } else {
            emailField.style.display = 'none';
            emailInput.required = false;
        }
    };
    
    modal.querySelector('#cancelConfirmBtn').onclick = () => {
        modal.remove();
        document.body.style.overflow = '';
    };
    
    modal.querySelector('#confirmForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveConfirmedReminder(modal);
    };
}
async function saveConfirmedReminder(modal) {
    const dateStr = modal.querySelector('#confirmDate').value;
    const timeStr = modal.querySelector('#confirmTime').value;
    const enableEmail = modal.querySelector('#confirmEnableEmail').checked;
    const email = modal.querySelector('#confirmEmail').value;
    
    const finalData = {
        title: modal.querySelector('#confirmTitle').value,
        description: modal.querySelector('#confirmDescription').value,
        reminderDate: new Date(`${dateStr}T${timeStr}`),
        priority: modal.querySelector('#confirmPriority').value,
        reminderEnabled: enableEmail,
        reminderEmail: enableEmail ? email : null
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reminders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(finalData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            modal.remove();
            document.body.style.overflow = '';
            alert('✅ تم إضافة التذكير بنجاح!');
            await loadReminders(currentFilter);
        } else {
            alert('❌ ' + (data.message || 'خطأ في إضافة التذكير'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ في حفظ التذكير');
    }
}

// ==========================================
// إضافة تذكير (من النموذج)
// ==========================================
document.getElementById('reminderForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const dateStr = document.getElementById('reminderDate').value;
    const timeStr = document.getElementById('reminderTime').value;
    
    const reminderData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        reminderDate: new Date(`${dateStr}T${timeStr}`),
        priority: document.getElementById('priority').value
    };
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('❌ الرجاء تسجيل الدخول');
            window.location.href = 'index.html';
            return;
        }
        
        const response = await fetch(`${API_URL}/reminders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reminderData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ تم إضافة التذكير بنجاح');
            this.reset();
            
            const now = new Date();
            now.setMinutes(now.getMinutes() + 5);
            document.getElementById('reminderDate').valueAsDate = now;
            document.getElementById('reminderTime').value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            
            loadReminders(currentFilter);
        } else {
            alert(data.message || 'خطأ في إضافة التذكير');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('خطأ في إضافة التذكير');
    }
});

// ==========================================
// تحميل التذكيرات
// ==========================================
async function loadReminders(filter = 'all') {
    currentFilter = filter;
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
        
        let url = `${API_URL}/reminders`;
        
        if (filter !== 'all') {
            url += `?status=${filter}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayReminders(data.reminders);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('خطأ في تحميل التذكيرات');
    }
}

// ==========================================
// عرض التذكيرات - مع الوقت والإحصائيات
// ==========================================
function displayReminders(reminders) {
    const container = document.getElementById('remindersList');
    
    if (!container) return;
    
    // ✅ تحديث الإحصائيات
    const total = reminders.length;
    const completed = reminders.filter(r => r.completed).length;
    const pending = reminders.filter(r => !r.completed).length;
    
    document.getElementById('totalReminders').textContent = total;
    document.getElementById('completedReminders').textContent = completed;
    document.getElementById('pendingReminders').textContent = pending;
    
    if (!reminders || reminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>لا توجد تذكيرات</p>
            </div>
        `;
        return;
    }
    
    const html = reminders.map(reminder => {
        // ✅ معالجة التاريخ والوقت
        let formattedDate = '';
        let formattedTime = '';
        
        try {
            if (reminder.date) {
                const dateObj = new Date(reminder.date);
                formattedDate = dateObj.toLocaleDateString('ar-SA');
            }
            
            if (reminder.time) {
                formattedTime = reminder.time;
            }
        } catch (e) {
            console.error('خطأ في تنسيق التاريخ:', e);
            formattedDate = reminder.date || '';
            formattedTime = reminder.time || '';
        }
        
        const priority = reminder.priority || 'متوسط';
        const priorityColor = priority === 'عالي' ? '#f44336' : 
                             priority === 'متوسط' ? '#ff9800' : '#4caf50';
        
        const statusBadge = reminder.completed ? 
            '<span style="background:#4caf50;color:white;padding:4px 8px;border-radius:12px;font-size:11px;margin-left:8px;">✓ مكتمل</span>' : '';
        
        return `
            <div class="reminder-item" style="opacity:${reminder.completed?'0.6':'1'}">
                <div class="reminder-info">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
                        <span style="background:${priorityColor};color:white;padding:4px 12px;border-radius:20px;font-size:12px;">${priority}</span>
                        ${statusBadge}
                    </div>
                    <div class="reminder-title">${reminder.title}</div>
                    ${reminder.description ? `<div class="reminder-description">${reminder.description}</div>` : ''}
                    <div class="reminder-date">
                        <i class="fas fa-calendar"></i> ${formattedDate}
                        <i class="fas fa-clock" style="margin-right:10px;"></i> ${formattedTime}
                    </div>
                </div>
                <div class="reminder-actions">
                    ${!reminder.completed ? `
                        <button class="btn btn-primary btn-sm" onclick="editReminder('${reminder._id}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-success btn-sm" onclick="markCompleted('${reminder._id}')" title="إكمال">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteReminder('${reminder._id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}
// ==========================================
// تعديل تذكير - مع جلب البريد تلقائياً
// ==========================================
async function editReminder(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reminders/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            alert('❌ فشل تحميل بيانات التذكير');
            return;
        }

        const data = await response.json();
        const reminder = data.reminder || data;
        
        console.log('📦 Reminder data:', reminder);
        
        // ✅ جلب بريد المستخدم من localStorage
        let userEmail = '';
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            userEmail = user?.email || '';
            console.log('📧 بريد المستخدم:', userEmail);
        } catch (e) {
            console.error('❌ فشل جلب بريد المستخدم:', e);
        }
        
        // ✅ إصلاح معالجة التاريخ والوقت
        let dateStr = '';
        let timeStr = '';
        
        try {
            // معالجة التاريخ
            if (reminder.date) {
                // إزالة الوقت من التاريخ إذا كان موجود
                const datePart = reminder.date.split('T')[0];
                
                // التحقق من الصيغة
                if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                    dateStr = datePart;
                } else {
                    // محاولة تحويل
                    const dateObj = new Date(reminder.date);
                    if (!isNaN(dateObj.getTime())) {
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        dateStr = `${year}-${month}-${day}`;
                    }
                }
            }
            
            // معالجة الوقت
            if (reminder.time) {
                // إذا كان بصيغة HH:MM
                if (/^\d{2}:\d{2}$/.test(reminder.time)) {
                    timeStr = reminder.time;
                } else if (/^\d{2}:\d{2}:\d{2}$/.test(reminder.time)) {
                    // إذا كان بصيغة HH:MM:SS
                    timeStr = reminder.time.substring(0, 5);
                }
            }
            
        } catch (e) {
            console.error('❌ خطأ في معالجة التاريخ:', e);
        }
        
        // التحقق من النتيجة
        if (!dateStr || !timeStr) {
            console.error('❌ فشل استخراج التاريخ أو الوقت');
            console.log('Date:', dateStr, 'Time:', timeStr);
            alert('❌ خطأ في تنسيق التاريخ أو الوقت');
            return;
        }
        
        console.log('✅ Date:', dateStr, 'Time:', timeStr);
        
        // ✅ تحديد قيمة البريد الإلكتروني
        const emailValue = reminder.reminderEmail || userEmail;
        
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;">
                <div style="background:white;padding:30px;border-radius:15px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;">
                    <h2 style="margin:0 0 20px 0;color:#2c3e50;">✏️ تعديل التذكير</h2>
                    <form id="editForm">
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">📝 العنوان:</label>
                        <input type="text" id="editTitle" value="${reminder.title || ''}" required style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                        
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
                            <div>
                                <label style="display:block;margin-bottom:5px;font-weight:bold;">📅 التاريخ:</label>
                                <input type="date" id="editDate" value="${dateStr}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="display:block;margin-bottom:5px;font-weight:bold;">⏰ الوقت:</label>
                                <input type="time" id="editTime" value="${timeStr}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                            </div>
                        </div>
                        
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">🚩 الأولوية:</label>
                        <select id="editPriority" required style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                            <option value="منخفض" ${reminder.priority==='منخفض'?'selected':''}>منخفض</option>
                            <option value="متوسط" ${!reminder.priority || reminder.priority==='متوسط'?'selected':''}>متوسط</option>
                            <option value="عالي" ${reminder.priority==='عالي'?'selected':''}>عالي</option>
                        </select>
                        
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">📄 الوصف:</label>
                        <textarea id="editDescription" rows="3" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">${reminder.description||''}</textarea>
                        
                        <div style="background:#fff3cd;padding:15px;border-radius:10px;margin-bottom:15px;border:1px solid #ffc107;">
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:10px;">
                                <input type="checkbox" id="editEnableEmail" ${reminder.reminderEnabled?'checked':''} style="width:18px;height:18px;cursor:pointer;">
                                <span style="color:#856404;font-weight:600;">
                                    <i class="fas fa-envelope"></i> تفعيل التذكير بالبريد
                                </span>
                            </label>
                            <div id="editEmailField" style="display:${reminder.reminderEnabled?'block':'none'};">
                                <input type="email" id="editEmail" value="${emailValue}" placeholder="example@email.com" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                            </div>
                        </div>
                        
                        <div style="display:flex;gap:10px;margin-top:20px;">
                            <button type="submit" style="flex:1;padding:12px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">💾 حفظ</button>
                            <button type="button" id="cancelBtn" style="flex:1;padding:12px;background:#999;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">❌ إلغاء</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Toggle email field
        modal.querySelector('#editEnableEmail').onchange = (e) => {
            const emailField = modal.querySelector('#editEmailField');
            const emailInput = modal.querySelector('#editEmail');
            if (e.target.checked) {
                emailField.style.display = 'block';
                emailInput.required = true;
            } else {
                emailField.style.display = 'none';
                emailInput.required = false;
            }
        };
        
        modal.querySelector('#cancelBtn').onclick = () => modal.remove();
        
        modal.querySelector('#editForm').onsubmit = async (e) => {
            e.preventDefault();
            
            const finalDate = modal.querySelector('#editDate').value;
            const finalTime = modal.querySelector('#editTime').value;
            const enableEmail = modal.querySelector('#editEnableEmail').checked;
            const email = modal.querySelector('#editEmail').value;
            
            // التحقق من صحة البيانات
            if (!finalDate || !finalTime) {
                alert('❌ التاريخ والوقت مطلوبان');
                return;
            }
            
            const updatedData = {
                title: modal.querySelector('#editTitle').value,
                description: modal.querySelector('#editDescription').value,
                date: finalDate,
                time: finalTime,
                priority: modal.querySelector('#editPriority').value,
                reminderEnabled: enableEmail,
                reminderEmail: enableEmail ? email : null
            };
            
            console.log('📤 Sending update:', updatedData);
            
            try {
                const updateResponse = await fetch(`${API_URL}/reminders/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedData)
                });
                
                const result = await updateResponse.json();
                
                if (result.success) {
                    alert('✅ تم التحديث بنجاح');
                    modal.remove();
                    loadReminders(currentFilter);
                } else {
                    alert('❌ ' + (result.message || 'فشل التحديث'));
                }
            } catch (error) {
                console.error('❌ Error:', error);
                alert('❌ خطأ في التحديث');
            }
        };
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ حدث خطأ في تحميل التذكير');
    }
}

// ==========================================
// تحديد كمكتمل
// ==========================================
async function markCompleted(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reminders/${id}/complete`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ تم تحديد التذكير كمكتمل');
            loadReminders(currentFilter);
        } else {
            alert(data.message || 'خطأ في التحديث');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('خطأ في تحديث التذكير');
    }
}

// ==========================================
// حذف تذكير
// ==========================================
async function deleteReminder(id) {
    if (!confirm('هل أنت متأكد من حذف هذا التذكير؟')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reminders/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ تم حذف التذكير');
            loadReminders(currentFilter);
        } else {
            alert(data.message || 'خطأ في الحذف');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('خطأ في حذف التذكير');
    }
}

// ==========================================
// فلترة التذكيرات
// ==========================================
function filterReminders(status) {
    currentFilter = status;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="filterReminders('${status}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    loadReminders(status);
}

function toggleRecording() {
    alert('💡 استخدم الضغط المطول على زر التسجيل');
}