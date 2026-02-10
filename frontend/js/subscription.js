// ==========================================
// Subscription Page JavaScript
// ==========================================

// Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;

// ==========================================
// Check Login Status
// ==========================================
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // مسجل دخول → توجيه للتطبيق
        window.location.href = 'app.html';
    } else {
        // غير مسجل دخول → فتح نافذة تسجيل الدخول
        showLoginModal();
    }
}

// ==========================================
// Modal Functions
// ==========================================
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// ==========================================
// Handle Login
// ==========================================
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
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
        
        if (data.success && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            
            // إغلاق المودال
            closeModal('loginModal');
            
            // التحويل حسب نوع المستخدم
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'app.html';
                }
            }, 1000);
            
        } else {
            alert(data.message || 'خطأ في تسجيل الدخول');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        alert('حدث خطأ في الاتصال بالخادم');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ==========================================
// Event Listeners للمودال
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // إغلاق Modal عند الضغط خارجها
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            const modalId = event.target.id;
            closeModal(modalId);
        }
    });
    
    // إغلاق Modal بزر Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.modal.active');
            modals.forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
});


// ==========================================
// Subscribe Function - جاهز لإضافة نظام الدفع
// ==========================================
async function subscribe() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('يجب عليك تسجيل الدخول أولاً');
        window.location.href = 'index.html';
        return;
    }
    
    // عرض رسالة تأكيد
    if (!confirm('هل تريد الاشتراك في الخطة الشهرية بقيمة 5$?\n\n✅ تجربة مجانية 14 يوم\n✅ جميع المميزات مفعّلة\n✅ يمكن الإلغاء في أي وقت')) {
        return;
    }
    
    try {
        // 🔥 هنا سيتم إضافة integration مع بوابة الدفع (Stripe/PayPal)
        const response = await fetch(`${API_URL}/payments/create-checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                planId: 'monthly_5',
                planName: 'اشتراك شهري',
                amount: 5,
                currency: 'USD',
                trialDays: 14
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.checkoutUrl) {
            // توجيه المستخدم لصفحة الدفع
            window.location.href = data.checkoutUrl;
        } else {
            alert(data.message || 'حدث خطأ في إنشاء جلسة الدفع');
        }
        
    } catch (error) {
        console.error('❌ خطأ في الاشتراك:', error);
        
        // للتجربة فقط - قبل دمج بوابة الدفع
        alert('✅ رائع! سيتم توجيهك إلى صفحة الدفع الآمنة...\n\n(سيتم دمج Stripe/PayPal هنا لاحقاً)');
        
        // يمكنك تفعيل هذا السطر عند جاهزية صفحة الدفع
        // window.location.href = 'payment.html';
    }
}

// ==========================================
// Toggle Mobile Menu
// ==========================================
function toggleMobileMenu() {
    const menu = document.getElementById("navMenu");
    const overlay = document.getElementById("navOverlay");
    
    if (menu && overlay) {
        menu.classList.toggle("active");
        overlay.classList.toggle("active");
    }
}

// ==========================================
// Close Menu When Click Outside
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById("navOverlay");
    
    if (overlay) {
        overlay.addEventListener('click', function() {
            toggleMobileMenu();
        });
    }
    
    // إغلاق القائمة عند الضغط على أي رابط
    const menuLinks = document.querySelectorAll('.nav-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            const menu = document.getElementById("navMenu");
            const overlay = document.getElementById("navOverlay");
            
            if (menu && menu.classList.contains('active')) {
                menu.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });
});

console.log('✅ Subscription.js loaded successfully');