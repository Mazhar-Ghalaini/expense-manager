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
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        console.log('📥 استجابة تسجيل الدخول:', data);
        
        if (data.success && data.token) {
            // ✅ الإصلاح: حفظ التوكن والمستخدم بشكل صحيح
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log('✅ تم حفظ التوكن:', data.token.substring(0, 20) + '...');
            console.log('✅ تم حفظ بيانات المستخدم:', data.user);
            
            showAlert('✅ تم تسجيل الدخول بنجاح!', 'success');
            
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'app.html';
                }
            }, 1000);
            
        } else {
            showAlert(data.message || 'خطأ في تسجيل الدخول', 'danger');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        showAlert('حدث خطأ في الاتصال بالخادم', 'danger');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Register
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const currencyCode = document.getElementById('registerCurrency').value;
    
    console.log('📝 محاولة التسجيل:', { name, email, phone, currencyCode });
    
    // التحقق من البيانات
    if (name.length < 3) {
        showAlert('الاسم يجب أن يكون 3 أحرف على الأقل', 'danger');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('الرجاء إدخال بريد إلكتروني صحيح', 'danger');
        return;
    }
    
    const phoneRegex = /^05\d{8}$/;
    if (!phoneRegex.test(phone)) {
        showAlert('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام', 'danger');
        return;
    }
    
    if (password.length < 6) {
        showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'danger');
        return;
    }
    
    if (password !== passwordConfirm) {
        showAlert('كلمتا المرور غير متطابقتين', 'danger');
        return;
    }
    
    if (!document.getElementById('registerTerms').checked) {
        showAlert('يجب الموافقة على الشروط والأحكام', 'danger');
        return;
    }
    
    const submitBtn = document.getElementById('registerBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إنشاء الحساب...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                name, 
                email, 
                phone, 
                password,
                currencyCode
            })
        });
        
        const data = await response.json();
        
        console.log('📥 استجابة التسجيل:', data);
        
        if (data.success && data.token) {
            // ✅ الإصلاح: حفظ التوكن والمستخدم بشكل صحيح
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log('✅ تم حفظ التوكن:', data.token.substring(0, 20) + '...');
            console.log('✅ تم حفظ بيانات المستخدم:', data.user);
            
            showAlert(`✅ تم إنشاء حسابك بنجاح! جاري تحويلك...`, 'success');
            
            closeModal('registerModal');
            
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 1500);
            
        } else {
            showAlert(data.message || 'خطأ في التسجيل', 'danger');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
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
        info: { bg: '#d1ecf1', text: '#0c5460', border: '#bee5eb' }
    };
    
    const color = colors[type] || colors.info;
    alert.style.background = color.bg;
    alert.style.color = color.text;
    alert.style.border = `2px solid ${color.border}`;
    
    const icon = type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle';
    
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
// Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ الصفحة جاهزة');
    
    loadSiteSettings();
    
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
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
        
        if (href !== '#' && href !== '#!') {
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
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