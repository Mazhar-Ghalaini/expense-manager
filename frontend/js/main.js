// ==========================================
// Configuration
// ==========================================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;

// ==========================================
// Modal Functions
// ==========================================
function showLoginModal() {
    console.log('🔓 فتح نموذج تسجيل الدخول');
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        console.error('❌ لم يتم العثور على loginModal');
    }
}

function showRegisterModal() {
    console.log('📝 فتح نموذج التسجيل');
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        console.error('❌ لم يتم العثور على registerModal');
    }
}

function closeModal(modalId) {
    console.log('❌ إغلاق النموذج:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        if (modalId === 'forgotPasswordModal') {
            const form = document.getElementById('forgotPasswordForm');
            const success = document.getElementById('forgotPasswordSuccess');
            const btn = document.getElementById('forgotPasswordBtn');
            
            if (form) form.style.display = 'block';
            if (success) success.style.display = 'none';
            if (btn) {
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رابط الاستعادة';
                btn.disabled = false;
            }
        }
    }
}

// ==========================================
// Authentication Functions
// ==========================================

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('🔐 محاولة تسجيل الدخول:', email);
    
    if (!email || !password) {
        showAlert('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'danger');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
    submitBtn.disabled = true;
    
    try {
        // ✅ التحقق من وجود reCAPTCHA
        if (typeof grecaptcha === 'undefined') {
            showAlert('⚠️ جاري تحميل نظام الحماية...', 'warning');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // الحصول على reCAPTCHA token
        let recaptchaResponse;
        try {
            recaptchaResponse = grecaptcha.getResponse();
        } catch (error) {
            console.error('❌ خطأ في reCAPTCHA:', error);
            showAlert('⚠️ الرجاء إعادة تحميل الصفحة', 'danger');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        if (!recaptchaResponse || recaptchaResponse === '') {
            showAlert('⚠️ الرجاء التحقق من أنك لست روبوت', 'warning');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        console.log('✅ reCAPTCHA Token:', recaptchaResponse.substring(0, 20) + '...');
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email, 
                password,
                recaptchaToken: recaptchaResponse 
            })
        });
        
        const data = await response.json();
        
        console.log('📥 استجابة تسجيل الدخول:', data);
        
        if (data.success && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log('✅ تم حفظ التوكن');
            
            showAlert('✅ تم تسجيل الدخول بنجاح!', 'success');
            
            // إعادة تعيين reCAPTCHA
            try {
                grecaptcha.reset();
            } catch (e) {}
            
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'app.html';
                }
            }, 1000);
            
        } else {
            showAlert(data.message || 'خطأ في تسجيل الدخول', 'danger');
            
            // إعادة تعيين reCAPTCHA
            try {
                grecaptcha.reset();
            } catch (e) {}
            
            // إظهار زر إعادة الإرسال إذا كان الحساب غير مفعّل
            if (data.needsVerification) {
                console.log('⚠️ الحساب غير مفعّل');
                
                const verificationAlert = document.getElementById('verificationAlert');
                if (verificationAlert) {
                    verificationAlert.style.display = 'block';
                    sessionStorage.setItem('pendingEmail', data.email || email);
                }
            }
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        showAlert('حدث خطأ في الاتصال بالخادم', 'danger');
        
        // إعادة تعيين reCAPTCHA
        try {
            grecaptcha.reset();
        } catch (e) {}
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ==========================================
// Handle Register
// ==========================================
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName')?.value.trim();
    const email = document.getElementById('registerEmail')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;
    const phone = document.getElementById('registerPhone')?.value.trim();
    const currencyCode = document.getElementById('registerCurrency')?.value || 'SAR';
    
    console.log('📝 محاولة التسجيل:', { name, email, phone, currencyCode });
    
    if (!name || !email || !password || !phone) {
        showAlert('الرجاء ملء جميع الحقول المطلوبة', 'danger');
        return;
    }
    
    // ✅ التحقق من reCAPTCHA
    if (typeof grecaptcha === 'undefined') {
        showAlert('⚠️ جاري تحميل نظام الحماية...', 'warning');
        return;
    }
    
    let recaptchaResponse;
    try {
        recaptchaResponse = grecaptcha.getResponse();
    } catch (error) {
        console.error('❌ خطأ في reCAPTCHA:', error);
        showAlert('⚠️ الرجاء إعادة تحميل الصفحة', 'danger');
        return;
    }
    
    if (!recaptchaResponse || recaptchaResponse === '') {
        showAlert('⚠️ الرجاء التحقق من أنك لست روبوت', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password,
                phone,
                currencyCode,
                recaptchaToken: recaptchaResponse
            })
        });
        
        const data = await response.json();
        
        console.log('📥 استجابة التسجيل:', data);
        
        if (data.success) {
            showAlert('✅ ' + data.message, 'success');
            
            // إعادة تعيين reCAPTCHA
            try {
                grecaptcha.reset();
            } catch (e) {}
            
            // إعادة تعيين الـ form
            event.target.reset();
            
            // الانتقال لتسجيل الدخول بعد 3 ثواني
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
            
        } else {
            showAlert(data.message || 'خطأ في التسجيل', 'danger');
            
            // إعادة تعيين reCAPTCHA
            try {
                grecaptcha.reset();
            } catch (e) {}
        }
        
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        showAlert('حدث خطأ في الاتصال بالخادم', 'danger');
        
        // إعادة تعيين reCAPTCHA
        try {
            grecaptcha.reset();
        } catch (e) {}
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
        min-width: 300px;
        max-width: 500px;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        font-size: 1rem;
    `;
    
    const colors = {
        success: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
        danger: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' },
        info: { bg: '#d1ecf1', text: '#0c5460', border: '#bee5eb' },
        warning: { bg: '#fff3cd', text: '#856404', border: '#ffeeba' }
    };
    
    const color = colors[type] || colors.info;
    alert.style.background = color.bg;
    alert.style.color = color.text;
    alert.style.border = `2px solid ${color.border}`;
    
    const icon = type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    alert.innerHTML = `
        <i class="fas fa-${icon}" style="font-size: 1.2rem;"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// ==========================================
// Navigation Functions
// ==========================================
function scrollToFeatures() {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
        featuresSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// ==========================================
// تحميل إعدادات الموقع من السيرفر
// ==========================================
async function loadSiteSettings() {
    try {
        console.log('📥 تحميل إعدادات الموقع...');
        
        const response = await fetch(`${API_URL}/settings`);
        const data = await response.json();
        
        if (data.success && data.settings) {
            const settings = data.settings;
            
            console.log('✅ تم تحميل الإعدادات:', settings);
            
            if (settings.siteName) {
                document.title = settings.siteName;
                const siteNameElements = document.querySelectorAll('#siteName, .logo span');
                siteNameElements.forEach(el => {
                    if (el) el.textContent = settings.siteName;
                });
            }
            
            if (settings.siteDescription) {
                const metaDescription = document.querySelector('meta[name="description"]');
                if (metaDescription) {
                    metaDescription.setAttribute('content', settings.siteDescription);
                }
            }
            
            if (settings.homepage) {
                const heroTitle = document.getElementById('heroTitle');
                const heroDescription = document.getElementById('heroDescription');
                const heroImage = document.getElementById('heroImage');
                
                if (heroTitle && settings.homepage.heroTitle) {
                    heroTitle.textContent = settings.homepage.heroTitle;
                }
                
                if (heroDescription && settings.homepage.heroDescription) {
                    heroDescription.textContent = settings.homepage.heroDescription;
                }
                
                if (heroImage && settings.homepage.heroImage) {
                    heroImage.src = settings.homepage.heroImage;
                }
                
                const ctaTitle = document.getElementById('ctaTitle');
                const ctaDescription = document.getElementById('ctaDescription');
                
                if (ctaTitle && settings.homepage.ctaTitle) {
                    ctaTitle.textContent = settings.homepage.ctaTitle;
                }
                
                if (ctaDescription && settings.homepage.ctaDescription) {
                    ctaDescription.textContent = settings.homepage.ctaDescription;
                }
            }
            
            if (settings.footer) {
                const footerAbout = document.getElementById('footerAbout');
                const footerCopyright = document.getElementById('footerCopyright');
                
                if (footerAbout && settings.footer.aboutText) {
                    footerAbout.textContent = settings.footer.aboutText;
                }
                
                if (footerCopyright && settings.footer.copyright) {
                    footerCopyright.textContent = settings.footer.copyright;
                }
                
                if (settings.footer.socialLinks) {
                    updateSocialLinks(settings.footer.socialLinks);
                }
                
                if (settings.footer.quickLinks) {
                    updateFooterLinks(settings.footer.quickLinks);
                }
            }
            
            if (settings.header?.links) {
                updateHeaderLinks(settings.header.links);
            }
            
            if (settings.colors) {
                applyColors(settings.colors);
            }
            
            console.log('✅ تم تطبيق جميع الإعدادات على الصفحة');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل إعدادات الموقع:', error);
    }
}

function updateHeaderLinks(links) {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu || !links || links.length === 0) return;
    
    const loginButton = `<li><a href="javascript:void(0)" onclick="showLoginModal(); return false;">تسجيل الدخول</a></li>`;
    
    let menuHTML = '';
    links.forEach((link, index) => {
        const activeClass = index === 0 ? 'active' : '';
        menuHTML += `<li><a href="${link.url}" class="${activeClass}">${link.title}</a></li>`;
    });
    
    menuHTML += loginButton;
    navMenu.innerHTML = menuHTML;
    
    console.log('✅ تم تحميل روابط Header');
}

function updateFooterLinks(links) {
    const footerLinksContainer = document.getElementById('footerLinks');
    if (!footerLinksContainer || !links || links.length === 0) return;
    
    footerLinksContainer.innerHTML = '';
    
    links.forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.title;
        li.appendChild(a);
        footerLinksContainer.appendChild(li);
    });
    
    console.log('✅ تم تحديث روابط Footer');
}

function updateSocialLinks(socialLinks) {
    const container = document.getElementById('socialLinks');
    if (!container) return;
    
    container.innerHTML = '';
    
    const links = [
        { icon: 'facebook', url: socialLinks.facebook, name: 'Facebook' },
        { icon: 'twitter', url: socialLinks.twitter, name: 'Twitter' },
        { icon: 'instagram', url: socialLinks.instagram, name: 'Instagram' },
        { icon: 'linkedin', url: socialLinks.linkedin, name: 'LinkedIn' }
    ];
    
    let hasLinks = false;
    links.forEach(link => {
        if (link.url && link.url.trim() && link.url !== '#') {
            const a = document.createElement('a');
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.innerHTML = `<i class="fab fa-${link.icon}"></i>`;
            a.title = link.name;
            container.appendChild(a);
            hasLinks = true;
        }
    });
    
    if (!hasLinks) {
        container.innerHTML = `
            <a href="#"><i class="fab fa-facebook"></i></a>
            <a href="#"><i class="fab fa-twitter"></i></a>
            <a href="#"><i class="fab fa-instagram"></i></a>
            <a href="#"><i class="fab fa-linkedin"></i></a>
        `;
    }
}

function applyColors(colors) {
    if (!colors) return;
    
    const root = document.documentElement;
    
    if (colors.primary) root.style.setProperty('--primary-color', colors.primary);
    if (colors.secondary) root.style.setProperty('--secondary-color', colors.secondary);
    if (colors.danger) root.style.setProperty('--danger-color', colors.danger);
    if (colors.warning) root.style.setProperty('--warning-color', colors.warning);
    if (colors.dark) root.style.setProperty('--dark-color', colors.dark);
    if (colors.light) root.style.setProperty('--light-color', colors.light);
    
    console.log('🎨 تم تطبيق الألوان المخصصة');
}

// ==========================================
// Toggle Password Visibility
// ==========================================
function togglePasswordModal(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        button.style.color = '#667eea';
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        button.style.color = '#95a5a6';
    }
}

// ==========================================
// Forgot Password Modal Functions
// ==========================================
function showForgotPasswordModal() {
    console.log('🔑 فتح نموذج استعادة كلمة المرور');
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        document.getElementById('forgotPasswordSuccess').style.display = 'none';
        document.getElementById('forgotPasswordForm').style.display = 'block';
        const emailInput = document.getElementById('forgotEmail');
        if (emailInput) emailInput.value = '';
    } else {
        console.error('❌ لم يتم العثور على forgotPasswordModal');
    }
}

// ==========================================
// Handle Forgot Password Submit
// ==========================================
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value.trim();
    const btn = document.getElementById('forgotPasswordBtn');
    const originalText = btn.innerHTML;
    
    if (!email) {
        showAlert('الرجاء إدخال البريد الإلكتروني', 'danger');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('الرجاء إدخال بريد إلكتروني صحيح', 'danger');
        return;
    }
    
    console.log('📧 إرسال طلب استعادة كلمة المرور:', email);
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        console.log('📥 استجابة forgot-password:', data);
        
        if (data.success) {
            document.getElementById('forgotPasswordForm').style.display = 'none';
            document.getElementById('forgotPasswordSuccess').style.display = 'block';
            document.getElementById('sentToEmail').textContent = email;
            
            console.log('✅ تم إرسال رابط إعادة التعيين بنجاح');
            showAlert('✅ تم إرسال رابط الاستعادة إلى بريدك', 'success');
            
        } else {
            showAlert(data.message || 'حدث خطأ أثناء الإرسال', 'danger');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        
    } catch (error) {
        console.error('❌ خطأ في forgot-password:', error);
        showAlert('حدث خطأ في الاتصال بالخادم', 'danger');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ==========================================
// Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ الصفحة جاهزة');
    
    loadSiteSettings();
    
    // إعادة إرسال رابط التفعيل
    const resendBtn = document.getElementById('resendBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', async function() {
            const email = sessionStorage.getItem('pendingEmail');
            
            if (!email) {
                showAlert('الرجاء إدخال بريدك الإلكتروني أولاً', 'danger');
                return;
            }
            
            const btn = this;
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
            
            try {
                const response = await fetch(`${API_URL}/auth/resend-verification`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showAlert('✅ تم إرسال رابط التفعيل! تحقق من بريدك', 'success');
                    btn.innerHTML = '✅ تم الإرسال';
                    
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }, 30000);
                } else {
                    showAlert(data.message || 'فشل الإرسال', 'danger');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
                
            } catch (error) {
                console.error('خطأ في إعادة الإرسال:', error);
                showAlert('خطأ في الاتصال', 'danger');
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }
    
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            const modalId = event.target.id;
            closeModal(modalId);
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.modal.active');
            modals.forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user) {
        console.log('✅ المستخدم مسجل دخول:', user.name);
    }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '#!') return;
        
        const target = document.querySelector(href);
        
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

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

console.log('%c مدير المصروفات الذكي ', 
    'background: #4a90e2; color: white; font-size: 20px; padding: 10px; border-radius: 5px;');
console.log('%c تطبيق إدارة المصروفات والمواعيد بالذكاء الاصطناعي ', 
    'color: #666; font-size: 14px;');