// العملة الافتراضية
let userCurrency = { code: 'SAR', symbol: 'ر.س', nameAr: 'ريال' };

// تحديث عرض العملة
function updateCurrencyDisplay() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.currency) {
        userCurrency = user.currency;
        
        const currencyEl = document.getElementById('currentCurrency');
        if (currencyEl) {
            currencyEl.textContent = user.currency.code;
        }
        
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
            const user = JSON.parse(localStorage.getItem('user'));
            user.currency = data.currency;
            localStorage.setItem('user', JSON.stringify(user));
            
            userCurrency = data.currency;
            
            showAlert(`✅ تم تغيير العملة إلى ${data.currency.nameAr}`, 'success');
            closeCurrencyModal();
            
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

// API URL
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;

// التحقق من تسجيل الدخول
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = `مرحباً، ${user.name}`;
    }
    
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
        userEmailEl.textContent = user.email || '';
    }
    
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) {
        userAvatarEl.textContent = user.name.charAt(0).toUpperCase();
    }
    
    if (user.currency) {
        userCurrency = user.currency;
        const currencyEl = document.getElementById('currentCurrency');
        if (currencyEl) {
            currencyEl.textContent = user.currency.code;
        }
    }
    
    loadDashboardData();
}

// تحميل بيانات لوحة التحكم
async function loadDashboardData() {
    const statTotal = document.getElementById('statTotal');
    const statMonthly = document.getElementById('statMonthly');
    const statAppointments = document.getElementById('statAppointments');
    const statReminders = document.getElementById('statReminders');
    
    if (!statTotal && !statMonthly && !statAppointments && !statReminders) {
        console.log('ℹ️ ليست صفحة Dashboard، تخطي تحميل البيانات');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/dashboard-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (statTotal) statTotal.textContent = data.totalExpenses.toFixed(0);
            if (statMonthly) statMonthly.textContent = data.monthlyExpenses.toFixed(0);
            if (statAppointments) statAppointments.textContent = data.appointmentCount;
            
            // ✅ تحديث عدد التذكيرات (فقط غير المكتملة)
            if (statReminders) {
                loadRemindersCount();
            }

            if (typeof updateExpenseList === 'function') {
                updateExpenseList(data.recentExpenses);
            }
            if (typeof updateAppointmentList === 'function') {
                updateAppointmentList(data.recentAppointments);
            }

            if (typeof updateCharts === 'function') {
                updateCharts(data.expenseChartData, data.incomeExpenseDonutData);
            }
        } else {
            console.warn('⚠️ لم يتم تحميل بيانات Dashboard:', data.message);
        }
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
}

// ✅ جلب عدد التذكيرات (فقط غير المكتملة)
async function loadRemindersCount() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reminders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // فلترة: عرض فقط التذكيرات الصالحة
            const validReminders = data.reminders.filter(reminder => {
                if (reminder.type === 'appointment') {
                    return reminder.email !== null && reminder.email !== '';
                }
                return true;
            });
            
            // عد التذكيرات غير المكتملة فقط
            const pendingCount = validReminders.filter(r => !r.completed).length;
            
            const statReminders = document.getElementById('statReminders');
            if (statReminders) {
                statReminders.textContent = pendingCount;
            }
            
            console.log('✅ عدد التذكيرات النشطة:', pendingCount);
        }
    } catch (error) {
        console.error('❌ خطأ في جلب التذكيرات:', error);
    }
}

// تحديث قائمة المصروفات
function updateExpenseList(expenses) {
    if (!Array.isArray(expenses) || expenses.length === 0) {
        document.getElementById('expenseList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>لا توجد مصروفات حتى الآن</p>
                <small>ابدأ بإضافة مصروفك الأول!</small>
            </div>`;
        return;
    }
    const html = expenses.slice(0, 10).map(expense => `
        <div class="expense-item">
            <div class="expense-info">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <span class="expense-category">${expense.category}</span>
                        <div style="margin-top: 5px; color: #2c3e50; font-weight: 500;">
                            ${expense.description || 'بدون وصف'}
                        </div>
                        <div class="expense-date">
                            <i class="fas fa-calendar"></i> ${new Date(expense.date).toLocaleDateString('ar-SA')}
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
    document.getElementById('expenseList').innerHTML = html;
}

// حذف مصروف
async function deleteExpense(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/expenses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            showAlert('تم حذف المصروف بنجاح', 'success');
            loadDashboardData();
        } else {
            showAlert(data.message || 'خطأ في حذف المصروف', 'danger');
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showAlert('خطأ في حذف المصروف', 'danger');
    }
}

// تحديث قائمة المواعيد
function updateAppointmentList(appointments) {
    if (!Array.isArray(appointments) || appointments.length === 0) {
        document.getElementById('appointmentList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>لا توجد مواعيد</p>
            </div>`;
        document.getElementById('statAppointments').textContent = '0';
        return;
    }
    
    document.getElementById('statAppointments').textContent = appointments.length;

    const html = appointments.slice(0, 5).map(appointment => `
        <div class="expense-item">
            <div class="expense-info">
                <div style="font-weight: 600; color: #2c3e50; margin-bottom: 5px;">${appointment.title}</div>
                <div style="color: #7f8c8d; font-size: 0.9rem;">
                    <i class="fas fa-calendar"></i> ${new Date(appointment.date).toLocaleDateString('ar-SA')} 
                    <i class="fas fa-clock" style="margin-right: 10px;"></i> ${appointment.time}
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
    document.getElementById('appointmentList').innerHTML = html;
}

// تحديث الرسومات البيانية
let lineChartInstance = null;
let donutChartInstance = null;

function updateCharts(lineChartData, donutChartData) {
    const lineCtx = document.getElementById('lineChart');
    if (lineCtx) {
        if (lineChartInstance) {
            lineChartInstance.destroy();
        }
        
        lineChartInstance = new Chart(lineCtx, {
            type: 'line',
            data: lineChartData || {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'المصروفات',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#3498db',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    const donutCtx = document.getElementById('pieChart');
    if (donutCtx) {
        if (donutChartInstance) {
            donutChartInstance.destroy();
        }
        
        donutChartInstance = new Chart(donutCtx, {
            type: 'doughnut',
            data: donutChartData || {
                labels: ['طعام', 'نقل', 'ترفيه', 'أخرى'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// حذف موعد
async function deleteAppointment(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            showAlert('تم حذف الموعد بنجاح', 'success');
            loadDashboardData();
        } else {
            showAlert(data.message || 'خطأ في حذف الموعد', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('خطأ في حذف الموعد', 'danger');
    }
}

// إرسال تذكير واتساب
async function sendWhatsAppReminder(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${id}/whatsapp`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            showAlert('تم إرسال التذكير بنجاح', 'success');
        } else {
            showAlert(data.message || 'خطأ في إرسال التذكير', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('خطأ في إرسال التذكير', 'danger');
    }
}

// عرض رسالة تنبيه
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 30px;
        background: ${type === 'success' ? '#2ecc71' : type === 'danger' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

// تسجيل الخروج
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

// التنقل في القائمة الجانبية
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    const currencyEl = document.getElementById('currentCurrency');
    if (currencyEl) {
        updateCurrencyDisplay();
    }
    
    const menuItems = document.querySelectorAll('.menu-item, .sidebar-item, .nav-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const link = this.querySelector('a');
            if (link) {
                e.preventDefault();
            }
            
            const text = this.textContent.trim();
            
            if (text.includes('نظرة عامة') || text.includes('Dashboard') || text.includes('الرئيسية')) {
                window.location.href = 'app.html';
            } 
            else if (text.includes('المصاريف') || text.includes('مصروف')) {
                window.location.href = 'expenses.html';
            } 
            else if (text.includes('المواعيد') || text.includes('موعد')) {
                window.location.href = 'appointments.html';
            } 
            else if (text.includes('تذكير')) {
                window.location.href = 'reminders.html';
            } 
            else if (text.includes('ذكاء') || text.includes('AI')) {
                window.location.href = 'ai-assistant.html';
            } 
            else if (text.includes('إعدادات') || text.includes('Settings')) {
                window.location.href = 'settings.html';
            } 
            else if (text.includes('خروج') || text.includes('Logout')) {
                logout();
            }
        });
    });
});

// تغيير العملة
function showCurrencyModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.currency) {
        document.getElementById('newCurrency').value = user.currency.code;
    }
    document.getElementById('currencyModal').classList.add('active');
}