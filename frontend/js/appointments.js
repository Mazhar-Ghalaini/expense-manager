// API URL
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;

let currentDate = new Date();
let selectedDate = null;
let appointments = [];

// الأشهر بالعربي
const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// تهيئة التقويم
function initCalendar() {
    renderCalendar();
}

// رسم التقويم
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // تحديث عنوان الشهر
    document.getElementById('currentMonthYear').textContent = `${arabicMonths[month]} ${year}`;
    
    // أول يوم في الشهر
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // اليوم الأول من الأسبوع (0 = أحد)
    const firstDayOfWeek = firstDay.getDay();
    
    // عدد الأيام في الشهر
    const daysInMonth = lastDay.getDate();
    
    // عدد الأيام في الشهر السابق
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // أيام الشهر السابق
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const dayElement = createDayElement(day, 'other-month');
        calendarDays.appendChild(dayElement);
    }
    
    // أيام الشهر الحالي
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayElement = createDayElement(day);
        
        // تحديد اليوم الحالي
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // تحديد الأيام التي بها مواعيد
        const hasAppointment = appointments.some(apt => {
            const aptDate = new Date(apt.date);
            return aptDate.toDateString() === date.toDateString();
        });
        
        if (hasAppointment) {
            dayElement.classList.add('has-appointment');
        }
        
        // إضافة حدث النقر
        dayElement.addEventListener('click', () => selectDate(date));
        
        calendarDays.appendChild(dayElement);
    }
    
    // أيام الشهر التالي
    const remainingDays = 42 - calendarDays.children.length; // 6 أسابيع × 7 أيام
    for (let day = 1; day <= remainingDays; day++) {
        const dayElement = createDayElement(day, 'other-month');
        calendarDays.appendChild(dayElement);
    }
}

// إنشاء عنصر يوم
function createDayElement(day, className = '') {
    const dayElement = document.createElement('div');
    dayElement.className = `calendar-day ${className}`;
    dayElement.textContent = day;
    return dayElement;
}

// اختيار تاريخ
function selectDate(date) {
    selectedDate = date;
    
    // إزالة التحديد السابق
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    // تحديد اليوم المختار
    event.target.classList.add('selected');
    
    // عرض المواعيد لهذا اليوم
    showAppointmentsForDate(date);
}

// عرض المواعيد لتاريخ معين
function showAppointmentsForDate(date) {
    const dateAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === date.toDateString();
    });
    
    if (dateAppointments.length > 0) {
        console.log(`مواعيد يوم ${date.toLocaleDateString('ar-SA')}:`, dateAppointments);
        // يمكن إضافة modal أو قسم لعرض المواعيد
    }
}

// التنقل بين الأشهر
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

function todayMonth() {
    currentDate = new Date();
    renderCalendar();
}

// تحميل المواعيد
async function loadAppointments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            appointments = data.appointments;
            displayAppointments(appointments);
            displayUpcoming(appointments);
            renderCalendar(); // إعادة رسم التقويم لإظهار الأيام التي بها مواعيد
        } else {
            showAlert(data.message || 'خطأ في تحميل المواعيد', 'danger');
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        showAlert('خطأ في تحميل المواعيد', 'danger');
    }
}

// عرض جميع المواعيد
function displayAppointments(appointmentsList) {
    const container = document.getElementById('appointmentsList');
    
    if (!appointmentsList || appointmentsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>لا توجد مواعيد</p>
                <small>ابدأ بإضافة موعدك الأول!</small>
            </div>`;
        return;
    }
    
    const html = appointmentsList.map(appointment => `
        <div class="appointment-item">
            <div class="appointment-info">
                <div class="appointment-title">${appointment.title}</div>
                <div class="appointment-details">
                    <span>
                        <i class="fas fa-calendar"></i>
                        ${new Date(appointment.date).toLocaleDateString('ar-SA')}
                    </span>
                    <span>
                        <i class="fas fa-clock"></i>
                        ${appointment.time}
                    </span>
                    ${appointment.location ? `
                        <span>
                            <i class="fas fa-map-marker-alt"></i>
                            ${appointment.location}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="appointment-actions">
                ${appointment.whatsapp ? `
                    <button class="btn-icon btn-whatsapp" onclick="sendWhatsAppReminder('${appointment._id}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                ` : ''}
                <button class="btn-icon btn-edit" onclick="editAppointment('${appointment._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteAppointment('${appointment._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// عرض المواعيد القادمة
function displayUpcoming(appointmentsList) {
    const container = document.getElementById('upcomingList');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // فلترة المواعيد القادمة فقط
    const upcoming = appointmentsList.filter(apt => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= today;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (upcoming.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>لا توجد مواعيد قادمة</p>
            </div>`;
        return;
    }
    
    const html = upcoming.slice(0, 5).map(appointment => `
        <div class="upcoming-item">
            <div class="upcoming-date">
                ${new Date(appointment.date).toLocaleDateString('ar-SA')}
            </div>
            <div class="upcoming-title">${appointment.title}</div>
            <div class="upcoming-time">
                <i class="fas fa-clock"></i> ${appointment.time}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// إظهار نافذة الإضافة
function showAddModal() {
    document.getElementById('modalTitle').textContent = 'إضافة موعد جديد';
    document.getElementById('appointmentForm').reset();
    document.getElementById('appointmentId').value = '';
    
    // تعيين التاريخ المحدد أو تاريخ اليوم
    if (selectedDate) {
        document.getElementById('date').valueAsDate = selectedDate;
    } else {
        document.getElementById('date').valueAsDate = new Date();
    }
    
    document.getElementById('appointmentModal').classList.add('active');
}

// إغلاق النافذة
function closeModal() {
    document.getElementById('appointmentModal').classList.remove('active');
}

// إضافة/تعديل موعد
document.getElementById('appointmentForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const appointmentId = document.getElementById('appointmentId').value;
    const appointmentData = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        location: document.getElementById('location').value,
        whatsapp: document.getElementById('whatsapp').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        const token = localStorage.getItem('token');
        const url = appointmentId 
            ? `${API_URL}/appointments/${appointmentId}`
            : `${API_URL}/appointments`;
        
        const method = appointmentId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(appointmentData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(appointmentId ? '✅ تم تحديث الموعد بنجاح' : '✅ تم إضافة الموعد بنجاح', 'success');
            closeModal();
            loadAppointments();
        } else {
            showAlert(data.message || 'خطأ في حفظ الموعد', 'danger');
        }
    } catch (error) {
        console.error('Error saving appointment:', error);
        showAlert('خطأ في حفظ الموعد', 'danger');
    }
});

// تعديل موعد
async function editAppointment(id) {
    const appointment = appointments.find(apt => apt._id === id);
    if (!appointment) return;
    
    document.getElementById('modalTitle').textContent = 'تعديل الموعد';
    document.getElementById('appointmentId').value = id;
    document.getElementById('title').value = appointment.title;
    document.getElementById('date').value = appointment.date.split('T')[0];
    document.getElementById('time').value = appointment.time;
    document.getElementById('location').value = appointment.location || '';
    document.getElementById('whatsapp').value = appointment.whatsapp || '';
    document.getElementById('notes').value = appointment.notes || '';
    
    document.getElementById('appointmentModal').classList.add('active');
}

// حذف موعد
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
            showAlert('✅ تم حذف الموعد بنجاح', 'success');
            loadAppointments();
        } else {
            showAlert(data.message || 'خطأ في حذف الموعد', 'danger');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showAlert('خطأ في حذف الموعد', 'danger');
    }
}

// إرسال تذكير واتساب
async function sendWhatsAppReminder(id) {
    const appointment = appointments.find(apt => apt._id === id);
    if (!appointment || !appointment.whatsapp) {
        showAlert('لا يوجد رقم واتساب لهذا الموعد', 'danger');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${id}/reminder`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ تم إرسال التذكير بنجاح', 'success');
        } else {
            showAlert(data.message || 'خطأ في إرسال التذكير', 'danger');
        }
    } catch (error) {
        console.error('Error sending reminder:', error);
        
        // فتح واتساب مباشرة كخيار بديل
        const message = `تذكير: لديك موعد "${appointment.title}" في ${new Date(appointment.date).toLocaleDateString('ar-SA')} الساعة ${appointment.time}`;
        const whatsappUrl = `https://wa.me/${appointment.whatsapp}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
}