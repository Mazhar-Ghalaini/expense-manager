// reminders.js - إدارة التذكيرات

async function loadReminders() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reminders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ تم جلب التذكيرات:', data.reminders.length);
            
            // فلترة: عرض فقط التذكيرات التي لها بريد إلكتروني (من المواعيد المفعّل فيها التذكير)
            // أو التذكيرات المخصصة
            const validReminders = data.reminders.filter(reminder => {
                // إذا كان من نوع appointment، تحقق من وجود email
                if (reminder.type === 'appointment') {
                    return reminder.email !== null && reminder.email !== '';
                }
                // إذا كان custom، اعرضه دائماً
                return true;
            });
            
            console.log('✅ التذكيرات الصالحة للعرض:', validReminders.length);
            
            displayReminders(validReminders);
            updateStats(validReminders);
        } else {
            console.error('❌ فشل جلب التذكيرات:', data.message);
        }
    } catch (error) {
        console.error('❌ خطأ:', error);
        const container = document.getElementById('remindersList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>خطأ في التحميل</p>
                </div>`;
        }
    }
}

function updateStats(reminders) {
    const total = reminders.length;
    const completed = reminders.filter(r => r.completed).length;
    const pending = total - completed;
    
    const totalEl = document.getElementById('totalReminders');
    const pendingEl = document.getElementById('pendingReminders');
    const completedEl = document.getElementById('completedReminders');
    
    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (completedEl) completedEl.textContent = completed;
}

function displayReminders(reminders) {
    const container = document.getElementById('remindersList');
    
    if (!container) {
        console.error('❌ لا يوجد element: remindersList');
        return;
    }
    
    if (!reminders || reminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>لا توجد تذكيرات</p>
                <small>قم بإضافة تذكير جديد أو أضف موعد مع تفعيل التذكير بالبريد</small>
            </div>`;
        return;
    }
    
    const html = reminders.map(reminder => `
        <div class="reminder-item ${reminder.completed ? 'completed' : ''}">
            <div class="reminder-info">
                <h3>${reminder.title}</h3>
                ${reminder.description ? `<p>${reminder.description}</p>` : ''}
                <div class="reminder-meta">
                    <span><i class="fas fa-calendar"></i> ${new Date(reminder.date).toLocaleDateString('ar-SA')}</span>
                    <span><i class="fas fa-clock"></i> ${reminder.time}</span>
                    ${reminder.email ? `<span><i class="fas fa-envelope"></i> ${reminder.email}</span>` : ''}
                    <span><i class="fas fa-tag"></i> ${reminder.type === 'appointment' ? 'من موعد' : 'مخصص'}</span>
                </div>
            </div>
            <div class="reminder-actions">
                <button class="btn btn-sm ${reminder.completed ? 'btn-secondary' : 'btn-success'}" 
                        onclick="toggleReminder('${reminder._id}')"
                        title="${reminder.completed ? 'إلغاء الاكتمال' : 'تحديد كمكتمل'}">
                    <i class="fas fa-${reminder.completed ? 'undo' : 'check'}"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteReminder('${reminder._id}')" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

async function toggleReminder(id) {
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
            await loadReminders();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ في التحديث');
    }
}

async function deleteReminder(id) {
    if (!confirm('هل تريد حذف هذا التذكير؟')) return;
    
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
            alert('✅ تم الحذف');
            await loadReminders();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ في الحذف');
    }
}

// تحميل عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 تحميل التذكيرات...');
    loadReminders();
});