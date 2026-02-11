// ==========================================
// متغيرات عامة
// ==========================================
let recognition = null;
let isRecording = false;
let recordingTimeout = null;
let timerInterval = null;
let recordingSeconds = 0;
let isProcessing = false;
let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// ==========================================
// التهيئة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 الجهاز:', isIOS ? 'iOS' : 'Other');
    console.log('🌐 المتصفح:', isSafari ? 'Safari' : 'Other');
    loadAppointments();
    initializeEventListeners();
});

// ==========================================
// Event Listeners
// ==========================================
function initializeEventListeners() {
    const form = document.getElementById('appointmentForm');
    if (form) {
        form.addEventListener('submit', handleAppointmentSubmit);
    }
    
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceAppointment);
    }
    
    const reminderCheckbox = document.getElementById('enableReminder');
    if (reminderCheckbox) {
        reminderCheckbox.addEventListener('change', toggleReminderEmail);
    }
    
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    });
}

// ==========================================
// Toggle Sidebar
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

// ==========================================
// Logout
// ==========================================
function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

// ==========================================
// تبديل حقل البريد الإلكتروني
// ==========================================
async function toggleReminderEmail() {
    const checkbox = document.getElementById('enableReminder');
    const emailField = document.getElementById('emailField');
    const emailInput = document.getElementById('reminderEmail');
    
    if (checkbox.checked) {
        emailField.style.display = 'block';
        emailInput.required = true;
        
        if (!emailInput.value) {
            const userEmail = await getUserEmail();
            if (userEmail) {
                emailInput.value = userEmail;
            }
        }
    } else {
        emailField.style.display = 'none';
        emailInput.required = false;
        emailInput.value = '';
    }
}

// ==========================================
// إضافة موعد (من النموذج)
// ==========================================
async function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    const enableReminder = document.getElementById('enableReminder').checked;
    const appointmentData = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        description: document.getElementById('description').value,
        reminderEnabled: enableReminder,
        reminderEmail: enableReminder ? document.getElementById('reminderEmail').value : null,
        timezone: document.getElementById('timezone').value || 'Europe/Berlin'
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(appointmentData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ تم إضافة الموعد بنجاح!');
            document.getElementById('appointmentForm').reset();
            document.getElementById('enableReminder').checked = false;
            toggleReminderEmail();
            await loadAppointments();
        } else {
            alert('❌ ' + (data.message || 'خطأ في إضافة الموعد'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ في إضافة الموعد');
    }
}

// ==========================================
// تحميل المواعيد
// ==========================================
async function loadAppointments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            displayAppointments(data.appointments);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// ==========================================
// عرض المواعيد
// ==========================================
function displayAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>لا توجد مواعيد</p>
                <small>ابدأ بإضافة موعدك الأول!</small>
            </div>
        `;
        return;
    }
    
    const html = appointments.map(apt => {
        const dateObj = new Date(apt.date);
        const formattedDate = dateObj.toLocaleDateString('en-GB');
        
        return `
            <div class="appointment-item">
                <div class="appointment-info">
                    <h3>${apt.title}</h3>
                    <div class="appointment-date">
                        <i class="fas fa-calendar"></i> ${formattedDate}
                        <i class="fas fa-clock" style="margin-right: 15px;"></i> ${apt.time}
                        ${apt.reminderEnabled ? '<i class="fas fa-envelope" style="margin-right: 15px; color: #4caf50;" title="التذكير مفعّل"></i>' : ''}
                    </div>
                    ${apt.description ? `<p style="margin-top: 5px; color: #666;">${apt.description}</p>` : ''}
                    ${apt.reminderEnabled && apt.reminderEmail ? `<p style="margin-top: 5px; color: #4caf50; font-size: 13px;"><i class="fas fa-envelope"></i> ${apt.reminderEmail}</p>` : ''}
                </div>
                <div class="appointment-actions">
                    <button class="btn btn-primary btn-sm" onclick="editAppointment('${apt._id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${apt.reminderEnabled && apt.reminderEmail ? `
                        <button class="btn btn-success btn-sm" onclick="sendEmailReminder('${apt._id}')" title="إرسال تذكير">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteAppointment('${apt._id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// ==========================================
// حذف موعد
// ==========================================
async function deleteAppointment(id) {
    if (!confirm('هل تريد حذف هذا الموعد؟')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            alert('✅ تم الحذف بنجاح');
            await loadAppointments();
        } else {
            alert('❌ ' + (data.message || 'خطأ في الحذف'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ في الحذف');
    }
}

// ==========================================
// إرسال تذكير بالبريد
// ==========================================
async function sendEmailReminder(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${id}/email-reminder`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            alert('✅ تم إرسال التذكير بنجاح');
        } else {
            alert('❌ ' + (data.message || 'خطأ في إرسال التذكير'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ في إرسال التذكير');
    }
}

// ==========================================
// 🎤 التسجيل الصوتي - iPhone Compatible
// ==========================================
function toggleVoiceAppointment() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        let msg = '❌ المتصفح لا يدعم التسجيل الصوتي';
        if (isIOS) {
            msg += '\n\n✅ تأكد من:\n- استخدام Safari\n- iOS 14.5+\n- تفعيل Siri في الإعدادات';
        }
        alert(msg);
        return;
    }
    
    if (isRecording) {
        console.log('🛑 إيقاف يدوي');
        forceStopRecording();
    } else {
        console.log('🎤 بدء التسجيل...');
        startRecordingIOS();
    }
}

// ==========================================
// بدء التسجيل - iOS Compatible
// ==========================================
function startRecordingIOS() {
    forceStopRecording();
    
    setTimeout(() => {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            
            recognition.lang = 'ar-SA';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            
            let hasResult = false;
            
            recognition.onstart = () => {
                console.log('✅ بدأ التسجيل');
                isRecording = true;
                isProcessing = false;
                hasResult = false;
                recordingSeconds = 0;
                
                updateRecordingUI(true);
                startTimer();
                
                recordingTimeout = setTimeout(() => {
                    console.log('⏱️ انتهى الوقت');
                    if (!hasResult) {
                        forceStopRecording();
                        alert('⏱️ انتهى وقت التسجيل (20 ثانية)');
                    }
                }, 20000);
            };
            
            recognition.onresult = (event) => {
                if (hasResult || isProcessing) {
                    console.log('⚠️ تجاهل نتيجة مكررة');
                    return;
                }
                
                hasResult = true;
                isProcessing = true;
                
                const text = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;
                
                console.log('✅ النص:', text);
                console.log('📊 الثقة:', (confidence * 100).toFixed(1) + '%');
                
                forceStopRecording();
                
                setTimeout(() => {
                    processVoiceInput(text);
                    isProcessing = false;
                }, isIOS ? 200 : 100);
            };
            
            recognition.onerror = (event) => {
                console.error('❌ خطأ:', event.error);
                
                forceStopRecording();
                
                if (event.error === 'aborted') {
                    console.log('ℹ️ تم الإلغاء');
                    return;
                }
                
                if (event.error === 'no-speech') {
                    console.log('ℹ️ لم يتم اكتشاف صوت');
                    alert('🎤 لم يتم اكتشاف صوت\nحاول مرة أخرى');
                    return;
                }
                
                let errorMsg = '';
                switch(event.error) {
                    case 'not-allowed':
                        if (isIOS) {
                            errorMsg = '🚫 يجب السماح بالميكروفون\n\nالإعدادات → Safari → الميكروفون';
                        } else {
                            errorMsg = '🚫 يجب السماح باستخدام الميكروفون';
                        }
                        break;
                    case 'audio-capture':
                        errorMsg = '🎤 لا يمكن الوصول للميكروفون';
                        break;
                    case 'network':
                        errorMsg = '📡 مشكلة في الاتصال بالإنترنت';
                        break;
                    case 'service-not-allowed':
                        errorMsg = '🚫 خدمة التعرف غير مفعلة\n\nتأكد من تفعيل Siri';
                        break;
                    default:
                        errorMsg = '❌ خطأ: ' + event.error;
                }
                
                if (errorMsg) {
                    alert(errorMsg);
                }
            };
            
            recognition.onend = () => {
                console.log('🔚 انتهى التسجيل');
                setTimeout(() => {
                    if (isRecording) {
                        forceStopRecording();
                    }
                }, 100);
            };
            
            console.log('🚀 بدء التسجيل...');
            recognition.start();
            
        } catch (error) {
            console.error('❌ خطأ:', error);
            forceStopRecording();
            alert('❌ خطأ: ' + error.message);
        }
    }, isIOS ? 50 : 100);
}

// ==========================================
// إيقاف قسري
// ==========================================
function forceStopRecording() {
    console.log('🛑 إيقاف كامل');
    
    isRecording = false;
    isProcessing = false;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
    }
    
    if (recognition) {
        try {
            recognition.abort();
            recognition.onstart = null;
            recognition.onend = null;
            recognition.onresult = null;
            recognition.onerror = null;
        } catch (e) {
            console.log('Already stopped');
        }
        recognition = null;
    }
    
    recordingSeconds = 0;
    updateRecordingUI(false);
}

// ==========================================
// تحديث الواجهة
// ==========================================
function updateRecordingUI(recording) {
    const btn = document.getElementById('voiceBtn');
    const indicator = document.getElementById('recordingIndicator');
    
    if (!btn) return;
    
    if (recording) {
        btn.style.background = '#f44336';
        btn.innerHTML = '<i class="fas fa-stop"></i> <span>إيقاف</span>';
        if (indicator) indicator.style.display = 'flex';
    } else {
        btn.style.background = '#4caf50';
        btn.innerHTML = '<i class="fas fa-microphone"></i> <span>تسجيل صوتي</span>';
        if (indicator) indicator.style.display = 'none';
    }
}

// ==========================================
// العداد
// ==========================================
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        recordingSeconds++;
        const timerEl = document.getElementById('recordingTimer');
        if (timerEl) {
            timerEl.textContent = recordingSeconds;
        }
    }, 1000);
}

// ==========================================
// معالجة النص
// ==========================================
function processVoiceInput(text) {
    console.log('🔄 معالجة:', text);
    
    const extractedData = parseVoiceToAppointment(text);
    
    if (extractedData) {
        showAppointmentConfirmModal(extractedData, text);
    } else {
        alert('❌ لم أفهم الموعد\n\n✅ مثال:\n"موعد غداً الساعة 3 ظهراً مع أحمد"');
    }
}

// ==========================================
// استخراج البيانات من النص
// ==========================================
function parseVoiceToAppointment(text) {
    console.log('🔍 تحليل:', text);
    
    const result = {
        title: '',
        date: '',
        time: '',
        description: 'تم الإضافة بالتسجيل الصوتي'
    };
    
    const today = new Date();
    let targetDate = new Date(today);
    
    // استخراج التاريخ
    if (text.match(/اليوم|الآن/)) {
        targetDate = new Date(today);
    } else if (text.match(/غد|بكرة|غدا/)) {
        targetDate.setDate(today.getDate() + 1);
    } else if (text.match(/بعد غد|بعد بكرة/)) {
        targetDate.setDate(today.getDate() + 2);
    } else if (text.match(/بعد (\d+) (يوم|ايام)/)) {
        const match = text.match(/بعد (\d+) (يوم|ايام)/);
        const days = parseInt(match[1]);
        targetDate.setDate(today.getDate() + days);
    }
    
    const daysMap = {
        'السبت': 6, 'الأحد': 0, 'الإثنين': 1, 'الاثنين': 1,
        'الثلاثاء': 2, 'الأربعاء': 3, 'الخميس': 4, 'الجمعة': 5
    };
    
    for (const [dayName, dayNum] of Object.entries(daysMap)) {
        if (text.includes(dayName)) {
            const currentDay = today.getDay();
            let daysUntil = dayNum - currentDay;
            if (daysUntil <= 0) daysUntil += 7;
            targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysUntil);
            break;
        }
    }
    
    result.date = targetDate.toISOString().split('T')[0];
    
    // استخراج الوقت
    let hour = 12;
    let minute = 0;
    
    const arabicNums = {'٠':0,'١':1,'٢':2,'٣':3,'٤':4,'٥':5,'٦':6,'٧':7,'٨':8,'٩':9};
    let normalizedText = text;
    for (const [ar, en] of Object.entries(arabicNums)) {
        normalizedText = normalizedText.replace(new RegExp(ar, 'g'), en);
    }
    
    const timePatterns = [
        /(\d{1,2}):(\d{2})\s*(ص|صباح|م|مساء|ظهر|ليل)?/,
        /الساعة\s*(\d{1,2})\s*(و|:)?\s*(\d{1,2})?\s*(ص|صباح|م|مساء|ظهر|ليل)?/,
        /(\d{1,2})\s*(ص|صباح|م|مساء|ظهر|ليل)/
    ];
    
    for (const pattern of timePatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
            hour = parseInt(match[1]);
            minute = match[2] ? parseInt(match[2]) : (match[3] ? parseInt(match[3]) : 0);
            
            const period = match[match.length - 1];
            
            if (period) {
                if ((period.includes('م') || period.includes('مساء') || period.includes('ليل')) && hour < 12) {
                    hour += 12;
                } else if ((period.includes('ص') || period.includes('صباح')) && hour === 12) {
                    hour = 0;
                } else if (period.includes('ظهر') && hour < 12) {
                    hour += 12;
                }
            }
            
            break;
        }
    }
    
    result.time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // استخراج العنوان
    let title = text;
    
    const removeWords = [
        'موعد', 'اجتماع', 'مقابلة', 'لقاء',
        'اليوم', 'غداً', 'غدا', 'بكرة', 'بعد غد',
        'السبت', 'الأحد', 'الإثنين', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة',
        'الساعة', 'صباحاً', 'صباحا', 'مساءً', 'مساء', 'ظهراً', 'ظهرا', 'ليلاً', 'ليلا',
        'ص', 'م',
        /\d{1,2}:\d{2}/,
        /\d{1,2}/,
        /يوم/,
        /بعد \d+ (يوم|ايام)/
    ];
    
    removeWords.forEach(word => {
        if (word instanceof RegExp) {
            title = title.replace(word, '');
        } else {
            title = title.replace(new RegExp(word, 'gi'), '');
        }
    });
    
    title = title.trim().replace(/\s+/g, ' ');
    
    if (!title || title.length < 3) {
        title = text.substring(0, 30);
    }
    
    result.title = title;
    
    if (!result.title || result.title.length < 2) {
        console.error('❌ فشل استخراج العنوان');
        return null;
    }
    
    console.log('✅ النتيجة:', result);
    return result;
}

// ==========================================
// نافذة التأكيد
// ==========================================
function showAppointmentConfirmModal(appointmentData, originalText) {
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:999999;padding:15px;overflow-y:auto;';
    
    modal.innerHTML = `
        <div style="background:white;padding:25px;border-radius:20px;max-width:600px;width:100%;max-height:95vh;overflow-y:auto;box-shadow:0 10px 50px rgba(0,0,0,0.3);">
            
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:70px;height:70px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:50%;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;font-size:35px;color:white;">🎤</div>
                <h2 style="margin:0;color:#2c3e50;font-size:22px;">تأكيد الموعد</h2>
                <p style="color:#999;font-size:13px;margin-top:8px;padding:10px;background:#f8f9fa;border-radius:8px;font-style:italic;word-wrap:break-word;">"${originalText}"</p>
            </div>
            
            <form id="confirmForm">
                
                <div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-bottom:15px;">
                    <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-heading"></i> عنوان الموعد *</label>
                    <input type="text" id="confirmTitle" value="${appointmentData.title||''}" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:15px;box-sizing:border-box;">
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
                    <div style="background:#f8f9fa;padding:12px;border-radius:10px;">
                        <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-calendar"></i> التاريخ *</label>
                        <input type="date" id="confirmDate" value="${appointmentData.date||''}" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                    </div>
                    <div style="background:#f8f9fa;padding:12px;border-radius:10px;">
                        <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-clock"></i> الوقت *</label>
                        <input type="time" id="confirmTime" value="${appointmentData.time||''}" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                    </div>
                </div>
                
                <div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-bottom:15px;">
                    <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-align-right"></i> الوصف</label>
                    <textarea id="confirmDescription" rows="2" style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;">${appointmentData.description||'تم الإضافة بالتسجيل الصوتي'}</textarea>
                </div>
                
                <div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-bottom:15px;">
                    <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-globe"></i> المنطقة الزمنية</label>
                    <select id="confirmTimezone" style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                        <option value="Europe/Berlin" selected>برلين (GMT+1)</option>
                        <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                        <option value="Asia/Dubai">دبي (GMT+4)</option>
                        <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                        <option value="Asia/Kuwait">الكويت (GMT+3)</option>
                    </select>
                </div>
                
                <div style="background:#e8f5e9;padding:12px;border-radius:10px;margin-bottom:15px;border:2px dashed #4caf50;">
                    <label style="display:flex;align-items:center;cursor:pointer;">
                        <input type="checkbox" id="confirmReminder" style="width:18px;height:18px;margin-left:8px;cursor:pointer;">
                        <span style="color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-bell"></i> تفعيل التذكير بالبريد</span>
                    </label>
                    <div id="confirmEmailField" style="display:none;margin-top:12px;">
                        <input type="email" id="confirmEmail" placeholder="example@email.com" style="width:100%;padding:10px;border:2px solid #4caf50;border-radius:8px;font-size:14px;box-sizing:border-box;">
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
    
    const checkbox = modal.querySelector('#confirmReminder');
    const emailField = modal.querySelector('#confirmEmailField');
    const emailInput = modal.querySelector('#confirmEmail');
    
    checkbox.onchange = async function() {
        if (this.checked) {
            emailField.style.display = 'block';
            if (!emailInput.value) {
                const userEmail = await getUserEmail();
                if (userEmail) emailInput.value = userEmail;
            }
        } else {
            emailField.style.display = 'none';
        }
    };
    
    modal.querySelector('#cancelConfirmBtn').onclick = () => {
        modal.remove();
        document.body.style.overflow = '';
    };
    
    modal.querySelector('#confirmForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveConfirmedAppointment(modal);
    };
}

// ==========================================
// حفظ الموعد
// ==========================================
async function saveConfirmedAppointment(modal) {
    const finalData = {
        title: modal.querySelector('#confirmTitle').value,
        date: modal.querySelector('#confirmDate').value,
        time: modal.querySelector('#confirmTime').value,
        description: modal.querySelector('#confirmDescription').value,
        timezone: modal.querySelector('#confirmTimezone').value,
        reminderEnabled: modal.querySelector('#confirmReminder').checked,
        reminderEmail: modal.querySelector('#confirmReminder').checked ? modal.querySelector('#confirmEmail').value : null
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments`, {
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
            alert('✅ تم إضافة الموعد بنجاح!');
            document.getElementById('appointmentForm').reset();
            await loadAppointments();
        } else {
            alert('❌ ' + (data.message || 'خطأ في إضافة الموعد'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ في حفظ الموعد');
    }
}

// ==========================================
// تعديل موعد
// ==========================================
async function editAppointment(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            alert('❌ فشل تحميل بيانات الموعد');
            return;
        }

        const data = await response.json();
        const appointment = data.appointment || data;
        
        const date = new Date(appointment.date);
        const dateStr = date.toISOString().split('T')[0];
        
        let defaultEmail = appointment.reminderEmail || '';
        if (!defaultEmail && appointment.reminderEnabled) {
            defaultEmail = await getUserEmail();
        }
        
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;">
                <div style="background:white;padding:30px;border-radius:15px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;">
                    <h2 style="margin:0 0 20px 0;color:#2c3e50;">✏️ تعديل الموعد</h2>
                    <form id="editForm">
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">📝 العنوان:</label>
                        <input type="text" id="editTitle" value="${appointment.title}" required style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">📅 التاريخ:</label>
                        <input type="date" id="editDate" value="${dateStr}" required style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">⏰ الوقت:</label>
                        <input type="time" id="editTime" value="${appointment.time}" required style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">📄 الوصف:</label>
                        <textarea id="editDescription" rows="3" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">${appointment.description||''}</textarea>
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">🌍 المنطقة الزمنية:</label>
                        <select id="editTimezone" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                            <option value="Europe/Berlin" ${(appointment.timezone||'Europe/Berlin')==='Europe/Berlin'?'selected':''}>برلين</option>
                            <option value="Asia/Riyadh" ${appointment.timezone==='Asia/Riyadh'?'selected':''}>الرياض</option>
                            <option value="Asia/Dubai" ${appointment.timezone==='Asia/Dubai'?'selected':''}>دبي</option>
                            <option value="Africa/Cairo" ${appointment.timezone==='Africa/Cairo'?'selected':''}>القاهرة</option>
                        </select>
                        <label style="display:block;margin-bottom:10px;">
                            <input type="checkbox" id="editReminderEnabled" ${appointment.reminderEnabled?'checked':''}>
                            🔔 تفعيل التذكير بالبريد
                        </label>
                        <div id="editEmailField" style="display:${appointment.reminderEnabled?'block':'none'};margin-bottom:15px;">
                            <label style="display:block;margin-bottom:5px;font-weight:bold;">📧 البريد الإلكتروني:</label>
                            <input type="email" id="editReminderEmail" value="${defaultEmail}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
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
        
        const checkbox = modal.querySelector('#editReminderEnabled');
        const emailField = modal.querySelector('#editEmailField');
        const emailInput = modal.querySelector('#editReminderEmail');
        
        checkbox.onchange = async function() {
            if (this.checked) {
                emailField.style.display = 'block';
                if (!emailInput.value) {
                    emailInput.value = await getUserEmail();
                }
            } else {
                emailField.style.display = 'none';
            }
        };
        
        modal.querySelector('#cancelBtn').onclick = () => modal.remove();
        
        modal.querySelector('#editForm').onsubmit = async (e) => {
            e.preventDefault();
            
            const updatedData = {
                title: modal.querySelector('#editTitle').value,
                description: modal.querySelector('#editDescription').value,
                date: modal.querySelector('#editDate').value,
                time: modal.querySelector('#editTime').value,
                timezone: modal.querySelector('#editTimezone').value,
                reminderEnabled: checkbox.checked,
                reminderEmail: checkbox.checked ? emailInput.value : null
            };
            
            const updateResponse = await fetch(`${API_URL}/appointments/${id}`, {
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
                loadAppointments();
            } else {
                alert('❌ ' + (result.message || 'فشل التحديث'));
            }
        };
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ حدث خطأ');
    }
}

// ==========================================
// جلب البريد الإلكتروني
// ==========================================
async function getUserEmail() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            return data.user?.email || '';
        }
        return '';
    } catch (error) {
        console.error('Error getting user email:', error);
        return '';
    }
}