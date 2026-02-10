// ==========================================
// متغيرات عامة
// ==========================================
let recognition = null;
let isRecording = false;
let recordingTimeout = null;
let timerInterval = null;
let recordingSeconds = 0;

// ==========================================
// التهيئة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    loadAppointments();
    initializeEventListeners();
});

// ==========================================
// Event Listeners
// ==========================================
function initializeEventListeners() {
    // نموذج إضافة موعد
    const form = document.getElementById('appointmentForm');
    if (form) {
        form.addEventListener('submit', handleAppointmentSubmit);
    }
    
    // زر التسجيل الصوتي
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceAppointment);
    }
    
    // checkbox التذكير
    const reminderCheckbox = document.getElementById('enableReminder');
    if (reminderCheckbox) {
        reminderCheckbox.addEventListener('change', toggleReminderEmail);
    }
    
    // إغلاق Sidebar على الموبايل
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
        
        // ملء الإيميل تلقائياً من الحساب
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
    
    const html = appointments.map(apt => `
        <div class="appointment-item">
            <div class="appointment-info">
                <h3>${apt.title}</h3>
                <div class="appointment-date">
                    <i class="fas fa-calendar"></i> ${new Date(apt.date).toLocaleDateString('ar-SA')}
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
    `).join('');
    
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
// التسجيل الصوتي - Toggle
// ==========================================
function toggleVoiceAppointment() {
    // التحقق من دعم المتصفح
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('❌ المتصفح لا يدعم التسجيل الصوتي\nاستخدم Chrome أو Edge');
        return;
    }
    
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// ==========================================
// بدء التسجيل
// ==========================================
function startRecording() {
    // إنشاء كائن جديد في كل مرة
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            console.log('Cleaning up old recognition');
        }
        recognition = null;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // عند بدء التسجيل
    recognition.onstart = () => {
        isRecording = true;
        recordingSeconds = 0;
        
        console.log('🎤 بدأ التسجيل الصوتي');
        
        // تحديث UI
        updateRecordingUI(true);
        
        // بدء العداد
        startTimer();
        
        // إيقاف تلقائي بعد 15 ثانية
        recordingTimeout = setTimeout(() => {
            console.log('⏱️ انتهى وقت التسجيل (15 ثانية)');
            stopRecording();
            alert('⏱️ تم إيقاف التسجيل تلقائياً بعد 15 ثانية');
        }, 15000);
    };
    
    // عند التعرف على الصوت
    recognition.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        console.log('✅ تم التعرف على:', text);
        
        // إيقاف التسجيل
        stopRecording();
        
        // إضافة الموعد
        await addVoiceAppointment(text);
    };
    
    // عند حدوث خطأ
    recognition.onerror = (event) => {
        console.error('❌ خطأ في التسجيل:', event.error);
        
        let errorMsg = 'خطأ في التسجيل';
        switch(event.error) {
            case 'no-speech':
                errorMsg = 'لم يتم اكتشاف صوت. حاول مرة أخرى.';
                break;
            case 'audio-capture':
                errorMsg = 'لا يمكن الوصول للميكروفون.';
                break;
            case 'not-allowed':
                errorMsg = 'يجب السماح باستخدام الميكروفون.';
                break;
            case 'network':
                errorMsg = 'مشكلة في الاتصال بالإنترنت.';
                break;
        }
        
        alert('❌ ' + errorMsg);
        stopRecording();
    };
    
    // عند انتهاء التسجيل
    recognition.onend = () => {
        if (isRecording) {
            console.log('🛑 انتهى التسجيل تلقائياً');
            stopRecording();
        }
    };
    
    // بدء التسجيل
    try {
        recognition.start();
    } catch (error) {
        console.error('❌ فشل بدء التسجيل:', error);
        alert('❌ لا يمكن بدء التسجيل. حاول مرة أخرى.');
        stopRecording();
    }
}

// ==========================================
// إيقاف التسجيل
// ==========================================
function stopRecording() {
    isRecording = false;
    
    // إيقاف العداد
    stopTimer();
    
    // إيقاف المؤقت التلقائي
    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
    }
    
    // تحديث UI
    updateRecordingUI(false);
    
    // إيقاف التسجيل
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            console.log('Recognition already stopped');
        }
        recognition = null;
    }
    
    recordingSeconds = 0;
}

// ==========================================
// تحديث واجهة التسجيل
// ==========================================
function updateRecordingUI(recording) {
    const btn = document.getElementById('voiceBtn');
    const indicator = document.getElementById('recordingIndicator');
    
    if (!btn) return;
    
    if (recording) {
        // وضع التسجيل
        btn.style.background = '#f44336';
        btn.innerHTML = '<i class="fas fa-stop"></i> <span>إيقاف التسجيل</span>';
        
        if (indicator) {
            indicator.style.display = 'flex';
        }
    } else {
        // الوضع الطبيعي
        btn.style.background = '#4caf50';
        btn.innerHTML = '<i class="fas fa-microphone"></i> <span>اضافة موعد من خلال تسجيل صوتي</span>';
        
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
}

// ==========================================
// بدء العداد
// ==========================================
function startTimer() {
    timerInterval = setInterval(() => {
        recordingSeconds++;
        const timerEl = document.getElementById('recordingTimer');
        if (timerEl) {
            timerEl.textContent = recordingSeconds;
        }
    }, 1000);
}

// ==========================================
// إيقاف العداد
// ==========================================
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ==========================================
// إضافة موعد من الصوت
// ==========================================
async function addVoiceAppointment(title) {
    // ملء حقل العنوان
    const titleInput = document.getElementById('title');
    if (titleInput) {
        titleInput.value = title;
    }
    
    // تحضير البيانات الافتراضية
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0].substring(0, 5);
    
    const appointmentData = {
        title: title,
        date: document.getElementById('date').value || today,
        time: document.getElementById('time').value || now,
        description: 'تم الإضافة بالتسجيل الصوتي',
        reminderEnabled: false,
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
            alert('✅ تم إضافة الموعد: ' + title);
            document.getElementById('appointmentForm').reset();
            await loadAppointments();
        } else {
            alert('❌ خطأ: ' + (data.message || 'فشل إضافة الموعد'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ في إضافة الموعد');
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
        
        // تحويل التاريخ
        const date = new Date(appointment.date);
        const dateStr = date.toISOString().split('T')[0];
        
        // جلب الإيميل
        let defaultEmail = appointment.reminderEmail || '';
        if (!defaultEmail && appointment.reminderEnabled) {
            defaultEmail = await getUserEmail();
        }
        
        // إنشاء النافذة
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
                <div style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
                    
                    <h2 style="margin: 0 0 20px 0; color: #2c3e50;">✏️ تعديل الموعد</h2>
                    
                    <form id="editForm">
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">📝 العنوان:</label>
                        <input type="text" id="editTitle" value="${appointment.title}" required 
                            style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">📅 التاريخ:</label>
                        <input type="date" id="editDate" value="${dateStr}" required 
                            style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">⏰ الوقت:</label>
                        <input type="time" id="editTime" value="${appointment.time}" required 
                            style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">📄 الوصف:</label>
                        <textarea id="editDescription" rows="3" 
                            style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">${appointment.description || ''}</textarea>
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">🌍 المنطقة الزمنية:</label>
                        <select id="editTimezone" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
                            <option value="Europe/Berlin" ${(appointment.timezone || 'Europe/Berlin') === 'Europe/Berlin' ? 'selected' : ''}>برلين</option>
                            <option value="Asia/Riyadh" ${appointment.timezone === 'Asia/Riyadh' ? 'selected' : ''}>الرياض</option>
                            <option value="Asia/Dubai" ${appointment.timezone === 'Asia/Dubai' ? 'selected' : ''}>دبي</option>
                            <option value="Africa/Cairo" ${appointment.timezone === 'Africa/Cairo' ? 'selected' : ''}>القاهرة</option>
                        </select>
                        
                        <label style="display: block; margin-bottom: 10px;">
                            <input type="checkbox" id="editReminderEnabled" ${appointment.reminderEnabled ? 'checked' : ''}>
                            🔔 تفعيل التذكير بالبريد
                        </label>
                        
                        <div id="editEmailField" style="display: ${appointment.reminderEnabled ? 'block' : 'none'}; margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">📧 البريد الإلكتروني:</label>
                            <input type="email" id="editReminderEmail" value="${defaultEmail}" 
                                style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button type="submit" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                                💾 حفظ
                            </button>
                            <button type="button" id="cancelBtn" style="flex: 1; padding: 12px; background: #999; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                                ❌ إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Toggle email field
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
        
        // Cancel button
        modal.querySelector('#cancelBtn').onclick = () => modal.remove();
        
        // Submit form
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
// جلب البريد الإلكتروني من الحساب
// ==========================================
async function getUserEmail() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
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