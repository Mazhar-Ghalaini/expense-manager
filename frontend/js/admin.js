const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;
let currentSettings = {};

// ==========================================
// تبديل التبويبات
// ==========================================
function showTab(tabName) {
    console.log('🔄 تبديل إلى التبويب:', tabName);
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    const selectedTab = document.getElementById('tab-' + tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        console.log('✅ تم إظهار التبويب');
    } else {
        console.error('❌ التبويب غير موجود:', 'tab-' + tabName);
        return;
    }
    
    const activeLink = document.querySelector(`a[onclick*="showTab('${tabName}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    const titles = {
        'overview': 'نظرة عامة',
        'homepage': 'تحرير الصفحة الرئيسية',
        'colors': 'الألوان والتصميم',
        'header-footer': 'Header & Footer',
        'subscriptions': 'خطط الاشتراك',
        'media': 'الوسائط والشعار',
        'users': 'إدارة المستخدمين',
        'account': 'إعدادات الحساب'
    };
    
    document.getElementById('pageTitle').textContent = titles[tabName] || 'لوحة التحكم';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// التحقق من صلاحيات الأدمن
// ==========================================
function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        alert('الرجاء تسجيل الدخول أولاً');
        window.location.href = 'index.html';
        return false;
    }
    
    if (user.role !== 'admin') {
        alert('⛔ هذه الصفحة مخصصة للمدراء فقط');
        window.location.href = 'app.html';
        return false;
    }
    
    if (document.getElementById('adminName')) {
        document.getElementById('adminName').value = user.name;
        document.getElementById('adminEmail').value = user.email;
        document.getElementById('adminPhone').value = user.phone || '';
    }
    
    return true;
}

// ==========================================
// تحميل الإحصائيات
// ==========================================
async function loadStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('statTotalUsers').textContent = data.stats.totalUsers;
            document.getElementById('statActiveSubscriptions').textContent = data.stats.activeSubscriptions;
            document.getElementById('statTotalExpenses').textContent = data.stats.totalExpenses;
            document.getElementById('statTotalAppointments').textContent = data.stats.totalAppointments;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ==========================================
// تحميل الإعدادات
// ==========================================
async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        const data = await response.json();
        
        if (data.success) {
            currentSettings = data.settings;
            
            if (document.getElementById('siteName')) {
                document.getElementById('siteName').value = data.settings.siteName || '';
                document.getElementById('siteDescription').value = data.settings.siteDescription || '';
            }
            
            if (document.getElementById('heroTitle')) {
                document.getElementById('heroTitle').value = data.settings.homepage?.heroTitle || '';
                document.getElementById('heroDescription').value = data.settings.homepage?.heroDescription || '';
                document.getElementById('heroImage').value = data.settings.homepage?.heroImage || '';
                document.getElementById('ctaTitle').value = data.settings.homepage?.ctaTitle || '';
                document.getElementById('ctaDescription').value = data.settings.homepage?.ctaDescription || '';
            }
            
            if (data.settings.colors && document.getElementById('colorPrimary')) {
                document.getElementById('colorPrimary').value = data.settings.colors.primary || '#667eea';
                document.getElementById('colorPrimaryHex').value = data.settings.colors.primary || '#667eea';
                document.getElementById('colorSecondary').value = data.settings.colors.secondary || '#50c878';
                document.getElementById('colorSecondaryHex').value = data.settings.colors.secondary || '#50c878';
                document.getElementById('colorDanger').value = data.settings.colors.danger || '#e74c3c';
                document.getElementById('colorDangerHex').value = data.settings.colors.danger || '#e74c3c';
                document.getElementById('colorWarning').value = data.settings.colors.warning || '#f39c12';
                document.getElementById('colorWarningHex').value = data.settings.colors.warning || '#f39c12';
            }
            
            if (document.getElementById('showLogo')) {
                document.getElementById('showLogo').checked = data.settings.header?.showLogo !== false;
                loadHeaderLinks(data.settings.header?.links || []);
                
                document.getElementById('footerAboutText').value = data.settings.footer?.aboutText || '';
                document.getElementById('footerCopyright').value = data.settings.footer?.copyright || '';
                
                const socialLinks = data.settings.footer?.socialLinks || {};
                document.getElementById('socialFacebook').value = socialLinks.facebook || '';
                document.getElementById('socialTwitter').value = socialLinks.twitter || '';
                document.getElementById('socialInstagram').value = socialLinks.instagram || '';
                document.getElementById('socialLinkedin').value = socialLinks.linkedin || '';
                
                loadFooterLinks(data.settings.footer?.quickLinks || []);
            }
            
            console.log('✅ تم تحميل جميع الإعدادات');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
    }
}

// ==========================================
// تحديث الإعدادات العامة
// ==========================================
async function updateGeneralSettings() {
    const siteName = document.getElementById('siteName').value;
    const siteDescription = document.getElementById('siteDescription').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/settings/general`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ siteName, siteDescription })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ تم تحديث الإعدادات العامة بنجاح', 'success');
        } else {
            showAlert(data.message || 'خطأ في التحديث', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// ==========================================
// تحديث الصفحة الرئيسية
// ==========================================
async function updateHomepage() {
    const homepageData = {
        heroTitle: document.getElementById('heroTitle').value,
        heroDescription: document.getElementById('heroDescription').value,
        heroImage: document.getElementById('heroImage').value,
        ctaTitle: document.getElementById('ctaTitle').value,
        ctaDescription: document.getElementById('ctaDescription').value
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/settings/homepage`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(homepageData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ تم تحديث الصفحة الرئيسية بنجاح', 'success');
        } else {
            showAlert(data.message || 'خطأ في التحديث', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// ==========================================
// تحديث الألوان
// ==========================================
async function updateColors() {
    const colorsData = {
        primary: document.getElementById('colorPrimary').value,
        secondary: document.getElementById('colorSecondary').value,
        danger: document.getElementById('colorDanger').value,
        warning: document.getElementById('colorWarning').value
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/settings/colors`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(colorsData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ تم تحديث الألوان بنجاح!', 'success');
        } else {
            showAlert(data.message || 'خطأ في التحديث', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// ==========================================
// Header Links Management
// ==========================================
let headerLinksCount = 0;

function loadHeaderLinks(links) {
    const container = document.getElementById('headerLinksContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!links || links.length === 0) {
        links = [
            { title: 'الرئيسية', url: '#home' },
            { title: 'المميزات', url: '#features' }
        ];
    }
    
    links.forEach(link => {
        addHeaderLinkField(link.title, link.url);
    });
}

function addHeaderLink() {
    addHeaderLinkField('', '');
}

function addHeaderLinkField(title = '', url = '') {
    const container = document.getElementById('headerLinksContainer');
    if (!container) return;
    
    const linkDiv = document.createElement('div');
    linkDiv.style.cssText = 'background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center; border: 2px solid #e8e8e8;';
    linkDiv.innerHTML = `
        <input type="text" class="header-link-title" value="${title}" placeholder="عنوان الرابط" 
               style="padding: 11px 14px; border: 2px solid #e8e8e8; border-radius: 8px; font-family: 'Cairo', sans-serif;">
        <input type="text" class="header-link-url" value="${url}" placeholder="الرابط" 
               style="padding: 11px 14px; border: 2px solid #e8e8e8; border-radius: 8px; font-family: 'Cairo', sans-serif;">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(linkDiv);
    headerLinksCount++;
}

// ==========================================
// Footer Links Management
// ==========================================
let footerLinksCount = 0;

function loadFooterLinks(links) {
    const container = document.getElementById('footerLinksContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!links || links.length === 0) {
        links = [
            { title: 'من نحن', url: '#about' },
            { title: 'اتصل بنا', url: '#contact' }
        ];
    }
    
    links.forEach(link => {
        addFooterLinkField(link.title, link.url);
    });
}

function addFooterLink() {
    addFooterLinkField('', '');
}

function addFooterLinkField(title = '', url = '') {
    const container = document.getElementById('footerLinksContainer');
    if (!container) return;
    
    const linkDiv = document.createElement('div');
    linkDiv.style.cssText = 'background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center; border: 2px solid #e8e8e8;';
    linkDiv.innerHTML = `
        <input type="text" class="footer-link-title" value="${title}" placeholder="عنوان الرابط" 
               style="padding: 11px 14px; border: 2px solid #e8e8e8; border-radius: 8px; font-family: 'Cairo', sans-serif;">
        <input type="text" class="footer-link-url" value="${url}" placeholder="الرابط" 
               style="padding: 11px 14px; border: 2px solid #e8e8e8; border-radius: 8px; font-family: 'Cairo', sans-serif;">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(linkDiv);
    footerLinksCount++;
}

// ==========================================
// تحديث Header & Footer
// ==========================================
async function updateHeaderFooter() {
    const headerLinks = [];
    document.querySelectorAll('#headerLinksContainer > div').forEach((div, index) => {
        const title = div.querySelector('.header-link-title')?.value;
        const url = div.querySelector('.header-link-url')?.value;
        if (title && url) {
            headerLinks.push({ title, url, order: index });
        }
    });
    
    const footerLinks = [];
    document.querySelectorAll('#footerLinksContainer > div').forEach(div => {
        const title = div.querySelector('.footer-link-title')?.value;
        const url = div.querySelector('.footer-link-url')?.value;
        if (title && url) {
            footerLinks.push({ title, url });
        }
    });
    
    const headerData = {
        showLogo: document.getElementById('showLogo')?.checked !== false,
        links: headerLinks
    };
    
    const footerData = {
        aboutText: document.getElementById('footerAboutText')?.value || '',
        copyright: document.getElementById('footerCopyright')?.value || '',
        socialLinks: {
            facebook: document.getElementById('socialFacebook')?.value || '',
            twitter: document.getElementById('socialTwitter')?.value || '',
            instagram: document.getElementById('socialInstagram')?.value || '',
            linkedin: document.getElementById('socialLinkedin')?.value || ''
        },
        quickLinks: footerLinks
    };
    
    try {
        const token = localStorage.getItem('token');
        
        await fetch(`${API_URL}/settings/header`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(headerData)
        });
        
        await fetch(`${API_URL}/settings/footer`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(footerData)
        });
        
        showAlert('✅ تم تحديث Header & Footer بنجاح!', 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// ==========================================
// رفع الملفات
// ==========================================
async function uploadLogo(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showAlert('الرجاء اختيار صورة فقط', 'danger');
        return;
    }
    
    const formData = new FormData();
    formData.append('logo', file);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/settings/upload-logo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('logoPreview').style.display = 'block';
            document.getElementById('logoPreviewImg').src = data.logoPath;
            showAlert('✅ تم رفع الشعار بنجاح', 'success');
        } else {
            showAlert(data.message || 'خطأ في رفع الشعار', 'danger');
        }
    } catch (error) {
        showAlert('خطأ في رفع الشعار', 'danger');
    }
}

async function uploadImage(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showAlert('الرجاء اختيار صورة فقط', 'danger');
        return;
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/settings/upload-image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const fullUrl = window.location.origin + data.imagePath;
            document.getElementById('imagePreview').style.display = 'block';
            document.getElementById('imagePreviewImg').src = data.imagePath;
            document.getElementById('uploadedImageUrl').value = fullUrl;
            showAlert('✅ تم رفع الصورة بنجاح', 'success');
        } else {
            showAlert(data.message || 'خطأ في رفع الصورة', 'danger');
        }
    } catch (error) {
        showAlert('خطأ في رفع الصورة', 'danger');
    }
}

// ==========================================
// إدارة المستخدمين
// ==========================================
async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayUsers(data.users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px; color:#7f8c8d;">
                    <i class="fas fa-users-slash" style="font-size:2rem;"></i>
                    <p>لا يوجد مستخدمون</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const html = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone || '-'}</td>
            <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? 'مدير' : 'مستخدم'}</span></td>
            <td><span class="badge badge-active">${user.subscription.plan}</span></td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteUser('${user._id}', '${user.name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
}

function searchUsers() {
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

async function deleteUser(userId, userName) {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${userName}"؟`)) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ تم حذف المستخدم بنجاح', 'success');
            loadUsers();
            loadStats();
        }
    } catch (error) {
        showAlert('خطأ في حذف المستخدم', 'danger');
    }
}

// ==========================================
// تحديث الحساب
// ==========================================
async function updateAdminProfile() {
    const name = document.getElementById('adminName').value.trim();
    const email = document.getElementById('adminEmail').value.trim();
    const phone = document.getElementById('adminPhone').value.trim();
    
    if (!name || !email) {
        showAlert('الرجاء ملء الاسم والبريد الإلكتروني', 'danger');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const user = JSON.parse(localStorage.getItem('user'));
            user.name = name;
            user.email = email;
            user.phone = phone;
            localStorage.setItem('user', JSON.stringify(user));
            
            showAlert('✅ تم تحديث معلومات الحساب بنجاح', 'success');
        } else {
            showAlert(data.message || 'خطأ في التحديث', 'danger');
        }
    } catch (error) {
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showAlert('الرجاء ملء جميع الحقول', 'danger');
        return;
    }
    
    if (newPassword.length < 6) {
        showAlert('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'danger');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        showAlert('كلمة المرور الجديدة غير متطابقة', 'danger');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ تم تغيير كلمة المرور بنجاح', 'success');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
        } else {
            showAlert(data.message || 'خطأ في تغيير كلمة المرور', 'danger');
        }
    } catch (error) {
        showAlert('خطأ في تغيير كلمة المرور', 'danger');
    }
}

// ==========================================
// Subscriptions (قيد التطوير)
// ==========================================
function addSubscriptionPlan() {
    showAlert('ميزة خطط الاشتراك قيد التطوير', 'info');
}

function updateSubscriptionPlans() {
    showAlert('ميزة خطط الاشتراك قيد التطوير', 'info');
}

// ==========================================
// حفظ جميع الإعدادات
// ==========================================
async function saveAllSettings() {
    showAlert('⏳ جاري حفظ الإعدادات...', 'info');
    
    try {
        await updateGeneralSettings();
        await new Promise(resolve => setTimeout(resolve, 500));
        await updateHomepage();
        await new Promise(resolve => setTimeout(resolve, 500));
        await updateColors();
        
        showAlert('✅ تم حفظ جميع الإعدادات بنجاح!', 'success');
    } catch (error) {
        showAlert('حدث خطأ أثناء الحفظ', 'danger');
    }
}

function previewChanges() {
    window.open('/', '_blank');
    showAlert('💡 تم فتح الصفحة الرئيسية', 'info');
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
// Alert System
// ==========================================
function showAlert(message, type = 'success') {
    const existingAlerts = document.querySelectorAll('.alert-custom');
    existingAlerts.forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = 'alert-custom';
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        min-width: 350px;
        max-width: 500px;
        padding: 18px 25px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 600;
        font-size: 1rem;
        font-family: Cairo, sans-serif;
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
    
    const icon = type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle';
    
    alert.innerHTML = `
        <i class="fas fa-${icon}" style="font-size: 1.4rem;"></i>
        <span>${message}</span>
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
    console.log('📄 تحميل صفحة الأدمن...');
    
    if (checkAdminAuth()) {
        console.log('✅ بدء تحميل البيانات');
        loadSettings();
        loadStats();
        loadUsers();
    }
});

// Animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
`;
document.head.appendChild(style);