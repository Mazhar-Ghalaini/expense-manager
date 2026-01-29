let userCurrency = { code: 'SAR', symbol: 'ر.س', nameAr: 'ريال' };

// تحديث عرض العملة
function updateCurrencyDisplay() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.currency) {
        userCurrency = user.currency;
        document.getElementById('currentCurrency').textContent = user.currency.code;
        
        // تحديث جميع عروض العملة في الصفحة
        document.querySelectorAll('.currency-symbol').forEach(el => {
            el.textContent = user.currency.symbol;
        });
    }
}

// إظهار إعدادات العملة
function showCurrencySettings() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.currency) {
        document.getElementById('newCurrency').value = user.currency.code;
    }
    document.getElementById('currencyModal').classList.add('active');
}

function closeCurrencyModal() {
    document.getElementById('currencyModal').classList.remove('active');
}

// تحديث العملة
async function updateCurrency(event) {
    event.preventDefault();
    
    const currencyCode = document.getElementById('newCurrency').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/update-currency`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currencyCode })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // تحديث بيانات المستخدم
            const user = JSON.parse(localStorage.getItem('user'));
            user.currency = data.currency;
            localStorage.setItem('user', JSON.stringify(user));
            
            userCurrency = data.currency;
            
            showAlert(`✅ تم تغيير العملة إلى ${data.currency.nameAr}`, 'success');
            closeCurrencyModal();
            
            // إعادة تحميل الصفحة لتحديث العملة
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            showAlert(data.message || 'خطأ في تحديث العملة', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('خطأ في تحديث العملة', 'danger');
    }
}

const API_URL = 'http://localhost:5000/api';
let recognition;
let isRecording = false;

// ==========================================
// التحقق من تسجيل الدخول
// ==========================================
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }
    
    // عرض معلومات المستخدم
    document.getElementById('userName').textContent = `مرحباً، ${user.name}`;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
    
    // تحديث العملة
    if (user.currency) {
        userCurrency = user.currency;
        document.getElementById('currentCurrency').textContent = user.currency.code;
    }
    
    // تحميل البيانات
    loadExpenses();
    loadAppointments();
    loadStats();
}

// ==========================================
// تحميل الإحصائيات
// ==========================================
async function loadStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/expenses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalExpenses').textContent = data.total.toFixed(2);
            document.getElementById('expenseCount').textContent = data.count;
            
            // حساب مصروفات الشهر الحالي
            const currentMonth = new Date().getMonth();
            const monthlyTotal = data.expenses
                .filter(exp => new Date(exp.date).getMonth() === currentMonth)
                .reduce((sum, exp) => sum + exp.amount, 0);
            
            document.getElementById('monthlyExpenses').textContent = monthlyTotal.toFixed(2);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ==========================================
// تحميل المصروفات
// ==========================================
async function loadExpenses() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/expenses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.expenses.length > 0) {
            const listHtml = data.expenses.slice(0, 10).map(expense => `
                <div class="expense-item">
                    <div class="expense-info">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <span class="expense-category">${expense.category}</span>
                                <div style="margin-top: 5px; color: #2c3e50; font-weight: 500;">
                                    ${expense.description || 'بدون وصف'}
                                </div>
                                <div class="expense-date">
                                    <i class="fas fa-calendar"></i>
                                    ${new Date(expense.date).toLocaleDateString('ar-SA')}
                                </div>
                            </div>
                           
<div class="expense-amount">${expense.amount} ${userCurrency.symbol}</div>
                        </div>
                    </div>
                    <div class="expense-actions">
                        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteExpense('${expense._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('expenseList').innerHTML = listHtml;
        } else {
            document.getElementById('expenseList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>لا توجد مصروفات حتى الآن</p>
                    <small>ابدأ بإضافة مصروفك الأول!</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
        showAlert('خطأ في تحميل المصروفات', 'danger');
    }
}

// ==========================================
// إضافة مصروف
// ==========================================
async function addExpense(event) {
    event.preventDefault();
    
    const expenseData = {
        amount: parseFloat(document.getElementById('expenseAmount').value),
        category: document.getElementById('expenseCategory').value,
        description: document.getElementById('expenseDescription').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        date: document.getElementById('expenseDate').value,
        addedVia: 'manual'
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(expenseData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم إضافة المصروف بنجاح! ✅', 'success');
            event.target.reset();
            document.getElementById('expenseDate').valueAsDate = new Date();
            loadExpenses();
            loadStats();
        } else {
            showAlert(data.message || 'خطأ في إضافة المصروف', 'danger');
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// ==========================================
// حذف مصروف
// ==========================================
async function deleteExpense(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/expenses/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم حذف المصروف بنجاح', 'success');
            loadExpenses();
            loadStats();
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showAlert('خطأ في حذف المصروف', 'danger');
    }
}

// ==========================================
// معالجة الشات
// ==========================================
function handleChatEnter(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}
// في ملف frontend/js/app.js
// استبدل دالة sendChatMessage بهذه النسخة المحدثة:

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // عرض رسالة المستخدم
    addChatMessage(message, 'user');
    input.value = '';
    
    // تحديد نوع الرسالة (موعد أم مصروف)
    const isAppointment = message.includes('موعد') || 
                          message.includes('اجتماع') || 
                          message.includes('الساعة') ||
                          message.includes('غدا') ||
                          message.includes('بكرة');
    
    const endpoint = isAppointment ? '/appointments/ai-process' : '/expenses/ai-process';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (isAppointment) {
                addChatMessage(`✅ تم إضافة الموعد: ${data.appointment.title} في ${data.appointment.time}`, 'ai');
                loadAppointments();
            } else {
                addChatMessage(`✅ تم إضافة المصروف: ${data.expense.amount} ريال - ${data.expense.category}`, 'ai');
                loadExpenses();
                loadStats();
            }
        } else {
            addChatMessage('❌ ' + (data.message || 'لم أستطع فهم الرسالة. حاول مرة أخرى'), 'ai');
        }
    } catch (error) {
        console.error('Error processing chat:', error);
        addChatMessage('❌ حدث خطأ في معالجة الرسالة', 'ai');
    }
}

function addChatMessage(text, sender) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ==========================================
// التسجيل الصوتي
// ==========================================
function toggleVoiceRecording() {
    const voiceBtn = document.getElementById('voiceBtn');
    
    if (!isRecording) {
        startVoiceRecording();
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        isRecording = true;
    } else {
        stopVoiceRecording();
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        isRecording = false;
    }
}

function startVoiceRecording() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.continuous = false;
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chatInput').value = transcript;
            sendChatMessage();
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            showAlert('خطأ في التعرف على الصوت', 'danger');
        };
        
        recognition.start();
        addChatMessage('🎤 جاري الاستماع...', 'ai');
    } else {
        showAlert('المتصفح لا يدعم التعرف على الصوت', 'danger');
    }
}

function stopVoiceRecording() {
    if (recognition) {
        recognition.stop();
    }
}

// ==========================================
// المواعيد
// ==========================================
async function loadAppointments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.appointments.length > 0) {
            document.getElementById('appointmentCount').textContent = data.appointments.length;
            
            const listHtml = data.appointments.slice(0, 5).map(appointment => `
                <div class="expense-item">
                    <div class="expense-info">
                        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 5px;">
                            ${appointment.title}
                        </div>
                        <div style="color: #7f8c8d; font-size: 0.9rem;">
                            <i class="fas fa-calendar"></i>
                            ${new Date(appointment.date).toLocaleDateString('ar-SA')}
                            <i class="fas fa-clock" style="margin-right: 10px;"></i>
                            ${appointment.time}
                        </div>
                    </div>
                    <div class="expense-actions">
                        <button class="btn btn-success btn-icon btn-sm" onclick="sendWhatsAppReminder('${appointment._id}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteAppointment('${appointment._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('appointmentList').innerHTML = listHtml;
        } else {
            document.getElementById('appointmentCount').textContent = '0';
            document.getElementById('appointmentList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>لا توجد مواعيد</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

function showAddAppointment() {
    document.getElementById('appointmentModal').classList.add('active');
}

function closeAppointmentModal() {
    document.getElementById('appointmentModal').classList.remove('active');
}

async function addAppointment(event) {
    event.preventDefault();
    
    const appointmentData = {
        title: document.getElementById('appointmentTitle').value,
        description: document.getElementById('appointmentDescription').value,
        date: document.getElementById('appointmentDate').value,
        time: document.getElementById('appointmentTime').value,
        reminder: {
            whatsapp: document.getElementById('whatsappReminder').checked
        }
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
            showAlert('تم إضافة الموعد بنجاح! ✅', 'success');
            closeAppointmentModal();
            event.target.reset();
            loadAppointments();
        }
    } catch (error) {
        console.error('Error adding appointment:', error);
        showAlert('خطأ في إضافة الموعد', 'danger');
    }
}

async function deleteAppointment(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم حذف الموعد بنجاح', 'success');
            loadAppointments();
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
    }
}

async function sendWhatsAppReminder(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${id}/remind`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم إرسال التذكير عبر واتساب ✅', 'success');
        }
    } catch (error) {
        console.error('Error sending reminder:', error);
        showAlert('خطأ في إرسال التذكير', 'danger');
    }
}

// ==========================================
// تصدير Excel مع أيقونة تحميل
// ==========================================
async function exportToExcel() {
    const button = event?.target?.closest('button');
    const originalHTML = button ? button.innerHTML : '';
    
    try {
        // تغيير شكل الزر أثناء التحميل
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التجهيز...';
            button.disabled = true;
        }
        
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/expenses/export-excel`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'خطأ في تحميل الملف');
        }
        
        const blob = await response.blob();
        
        // إنشاء رابط تحميل
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // اسم الملف مع التاريخ والوقت
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        a.download = `مصروفاتي_${dateStr}_${timeStr}.xlsx`;
        
        document.body.appendChild(a);
        a.click();
        
        // تنظيف
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
        
        showAlert('✅ تم تحميل ملف Excel بنجاح! افتحه من مجلد التحميلات', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showAlert('❌ ' + error.message, 'danger');
    } finally {
        // إعادة شكل الزر الأصلي
        if (button) {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }
    }
}

function showExportModal() {
    document.getElementById('exportModal').classList.add('active');
    
    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    document.getElementById('exportFromDate').value = firstDayOfMonth;
    document.getElementById('exportToDate').value = today;
}

function closeExportModal() {
    document.getElementById('exportModal').classList.remove('active');
}

async function exportDateRange() {
    const fromDate = document.getElementById('exportFromDate').value;
    const toDate = document.getElementById('exportToDate').value;
    
    if (!fromDate || !toDate) {
        showAlert('الرجاء اختيار الفترة الزمنية', 'danger');
        return;
    }
    
    if (new Date(fromDate) > new Date(toDate)) {
        showAlert('تاريخ البداية يجب أن يكون قبل تاريخ النهاية', 'danger');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        showAlert('⏳ جاري تجهيز الملف...', 'info');
        
        const response = await fetch(`${API_URL}/expenses/export-excel?from=${fromDate}&to=${toDate}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'خطأ في تحميل الملف');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `مصروفات_من_${fromDate}_إلى_${toDate}.xlsx`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
        
        closeExportModal();
        showAlert('✅ تم تحميل ملف Excel بنجاح!', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showAlert('❌ ' + error.message, 'danger');
    }
}

// ==========================================
// تسجيل الخروج
// ==========================================
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

// ==========================================
// رسائل التنبيه
// ==========================================
function showAlert(message, type = 'success') {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        min-width: 300px;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease;
    `;
    
    const colors = {
        success: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
        danger: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' },
        info: { bg: '#d1ecf1', text: '#0c5460', border: '#bee5eb' }
    };
    
    const color = colors[type] || colors.info;
    alert.style.background = color.bg;
    alert.style.color = color.text;
    alert.style.border = `2px solid ${color.border}`;
    
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// ==========================================
// تهيئة الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // تعيين التاريخ الحالي
    document.getElementById('expenseDate').valueAsDate = new Date();
    
    // إغلاق النموذج عند الضغط خارجه
    window.onclick = function(event) {
        const modal = document.getElementById('appointmentModal');
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    };
});

// Animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);