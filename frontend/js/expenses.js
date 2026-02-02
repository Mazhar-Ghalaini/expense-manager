// expenses.js - إدارة المصروفات

// التحقق من وجود API_URL
if (typeof API_URL === 'undefined') {
    console.error('❌ API_URL غير معرّف! تأكد من تحميل app.js أولاً');
}

// المتغيرات العامة
let currentFilter = 'all';
let recognition;
let isRecording = false;

// ==========================================
// إضافة مصروف
// ==========================================
document.getElementById('expenseForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const expenseData = {
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value
    };
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            showAlert('❌ الرجاء تسجيل الدخول', 'danger');
            window.location.href = 'index.html';
            return;
        }
        
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
            showAlert('✅ تم إضافة المصروف بنجاح', 'success');
            this.reset();
            document.getElementById('date').valueAsDate = new Date();
            loadExpenses(currentFilter);
            
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            showAlert(data.message || 'خطأ في إضافة المصروف', 'danger');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('خطأ في إضافة المصروف', 'danger');
    }
});

// ==========================================
// تحميل المصروفات
// ==========================================
async function loadExpenses(filter = 'all') {
    currentFilter = filter;
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
        
        let url = `${API_URL}/expenses`;
        const params = new URLSearchParams();
        
        if (filter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            params.append('startDate', today);
            params.append('endDate', today);
        } else if (filter === 'week') {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            params.append('startDate', weekAgo.toISOString().split('T')[0]);
            params.append('endDate', today.toISOString().split('T')[0]);
        } else if (filter === 'month') {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            params.append('startDate', firstDay.toISOString().split('T')[0]);
            params.append('endDate', today.toISOString().split('T')[0]);
        } else if (filter === 'year') {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), 0, 1);
            params.append('startDate', firstDay.toISOString().split('T')[0]);
            params.append('endDate', today.toISOString().split('T')[0]);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayExpenses(data.expenses);
            
            const total = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const totalEl = document.getElementById('totalExpenses');
            if (totalEl) {
                totalEl.textContent = total.toFixed(2) + ' ' + userCurrency.symbol;
            }
        } else {
            showAlert(data.message || 'خطأ في تحميل المصروفات', 'danger');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('خطأ في تحميل المصروفات', 'danger');
    }
}

// ==========================================
// عرض المصروفات
// ==========================================
function displayExpenses(expenses) {
    const container = document.getElementById('expensesList');
    
    if (!container) return;
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>لا توجد مصروفات</p>
            </div>
        `;
        return;
    }
    
    const html = expenses.map(expense => `
        <div class="expense-item">
            <div class="expense-info">
                <span class="expense-category">${expense.category}</span>
                <div class="expense-description">${expense.description || 'بدون وصف'}</div>
                <div class="expense-date">
                    <i class="fas fa-calendar"></i> 
                    ${new Date(expense.date).toLocaleDateString('ar-SA')}
                </div>
            </div>
            <div class="expense-amount">${expense.amount} ${userCurrency.symbol}</div>
            <div class="expense-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteExpense('${expense._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
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
            showAlert('✅ تم حذف المصروف', 'success');
            loadExpenses(currentFilter);
            
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            showAlert(data.message || 'خطأ في الحذف', 'danger');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('خطأ في حذف المصروف', 'danger');
    }
}

// ==========================================
// فلترة المصروفات
// ==========================================
function filterExpenses(period) {
    currentFilter = period;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="filterExpenses('${period}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    loadExpenses(period);
}

// ==========================================
// تصدير Excel
// ==========================================
async function exportExpenses() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            showAlert('❌ الرجاء تسجيل الدخول', 'danger');
            return;
        }
        
        showAlert('⏳ جاري تحميل الملف...', 'info');
        
        // إنشاء رابط مؤقت مع Token في الـ header
        const response = await fetch(`${API_URL}/expenses/export-excel`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            showAlert(error.message || 'خطأ في تحميل الملف', 'danger');
            return;
        }
        
        // تحويل إلى Blob
        const blob = await response.blob();
        
        // إنشاء رابط تحميل
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        
        // تنظيف
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
        
        showAlert('✅ تم تحميل الملف بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('خطأ في تحميل الملف', 'danger');
    }
}

// ==========================================
// التسجيل الصوتي
// ==========================================
function toggleRecording() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showAlert('❌ المتصفح لا يدعم التسجيل الصوتي. استخدم Chrome', 'danger');
        return;
    }
    
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = function() {
        isRecording = true;
        const btn = document.getElementById('recordBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-stop"></i> إيقاف';
            btn.classList.add('recording');
        }
        showAlert('🎤 جاري التسجيل...', 'info');
    };
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        console.log('📝 النص:', transcript);
        processVoiceCommand(transcript);
    };
    
    recognition.onerror = function(event) {
        console.error('❌ خطأ:', event.error);
        showAlert('❌ خطأ في التسجيل', 'danger');
        stopRecording();
    };
    
    recognition.onend = function() {
        stopRecording();
    };
    
    recognition.start();
}

function stopRecording() {
    isRecording = false;
    
    if (recognition) {
        recognition.stop();
    }
    
    const btn = document.getElementById('recordBtn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-microphone"></i> تسجيل صوتي';
        btn.classList.remove('recording');
    }
}

async function processVoiceCommand(text) {
    showAlert('⏳ جاري التحليل...', 'info');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/expenses/voice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ تم إضافة المصروف', 'success');
            
            if (data.expense.amount) {
                document.getElementById('amount').value = data.expense.amount;
            }
            if (data.expense.category) {
                document.getElementById('category').value = data.expense.category;
            }
            if (data.expense.description) {
                document.getElementById('description').value = data.expense.description;
            }
            
            loadExpenses(currentFilter);
        } else {
            showAlert(data.message || 'لم أفهم الأمر', 'danger');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('خطأ في معالجة الأمر', 'danger');
    }
}

// ==========================================
// تحميل المصروفات عند فتح الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('expensesList')) {
        loadExpenses('all');
    }
});

// ==========================================
// Modal Functions
// ==========================================
function showVoiceModal() {
    const modal = document.getElementById('voiceModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeVoiceModal() {
    const modal = document.getElementById('voiceModal');
    if (modal) {
        modal.classList.remove('active');
    }
    if (isRecording) {
        stopRecording();
    }
}

function showExcelModal() {
    const modal = document.getElementById('excelModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeExcelModal() {
    const modal = document.getElementById('excelModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ==========================================
// تعيين تاريخ اليوم
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
});