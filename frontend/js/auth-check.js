// ==========================================
// Auth Check - فحص تلقائي لحالة تسجيل الدخول
// يُستخدم في جميع الصفحات المحمية
// ==========================================

(function() {
    'use strict';

    // ==========================================
    // قائمة الصفحات المحمية
    // ==========================================
    const protectedPages = [
        'app.html',
        'expenses.html',
        'appointments.html',
        'reminders.html',
        'ai.html',
        'settings.html',
        'admin.html'
    ];

    // ==========================================
    // الصفحات العامة (لا تحتاج تسجيل دخول)
    // ==========================================
    const publicPages = [
        'index.html',
        'login.html',
        'subscription.html'
    ];

    // ==========================================
    // التحقق من حالة تسجيل الدخول
    // ==========================================
    function checkAuth() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        console.log('🔍 Auth Check:', {
            page: currentPage,
            hasToken: !!token,
            user: user.name || 'غير مسجل'
        });

        // ==========================================
        // إذا الصفحة محمية
        // ==========================================
        if (protectedPages.includes(currentPage)) {
            if (!token || !user.name) {
                console.log('❌ غير مسجل دخول - تحويل إلى login.html');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
                return false;
            }

            // ✅ مسجل دخول - عرض بيانات المستخدم
            displayUserInfo(user);
            return true;
        }

        // ==========================================
        // إذا الصفحة login.html والمستخدم مسجل دخول
        // ==========================================
        if (currentPage === 'login.html' && token && user.name) {
            console.log('✅ مسجل دخول مسبقاً - تحويل إلى app.html');
            
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'app.html';
            }
            return true;
        }

        // ==========================================
        // إذا الصفحة index.html والمستخدم مسجل دخول
        // ==========================================
        if (currentPage === 'index.html' && token && user.name) {
            console.log('✅ مسجل دخول - عرض زر "لوحة التحكم" بدلاً من "تسجيل الدخول"');
            updateIndexPageForLoggedInUser(user);
        }

        return true;
    }

    // ==========================================
    // عرض معلومات المستخدم في الصفحات المحمية
    // ==========================================
    function displayUserInfo(user) {
        // Update user name
        const userNameElements = document.querySelectorAll('#userName, .user-name');
        userNameElements.forEach(el => {
            if (el) el.textContent = user.name;
        });

        // Update user avatar
        const userAvatarElements = document.querySelectorAll('#userAvatar, .user-avatar');
        userAvatarElements.forEach(el => {
            if (el) {
                el.textContent = user.name.charAt(0).toUpperCase();
            }
        });

        // Update currency
        if (user.currency) {
            const currencyElements = document.querySelectorAll('#currentCurrency, .current-currency');
            currencyElements.forEach(el => {
                if (el) el.textContent = user.currency.code || 'SAR';
            });

            const currencySymbolElements = document.querySelectorAll('.currency-symbol');
            currencySymbolElements.forEach(el => {
                if (el) el.textContent = user.currency.symbol || 'ر.س';
            });
        }

        console.log('✅ تم عرض معلومات المستخدم');
    }

    // ==========================================
    // تحديث صفحة index.html للمستخدم المسجل دخول
    // ==========================================
    function updateIndexPageForLoggedInUser(user) {
        // تغيير زر "تسجيل الدخول" إلى "لوحة التحكم"
        const loginLinks = document.querySelectorAll('a[onclick*="showLoginModal"]');
        loginLinks.forEach(link => {
            link.textContent = 'لوحة التحكم';
            link.removeAttribute('onclick');
            link.href = 'app.html';
        });

        // تغيير أزرار "ابدأ الآن" إلى "لوحة التحكم"
        const startButtons = document.querySelectorAll('button[onclick*="showRegisterModal"]');
        startButtons.forEach(btn => {
            btn.innerHTML = '<i class="fas fa-tachometer-alt"></i> لوحة التحكم';
            btn.removeAttribute('onclick');
            btn.onclick = () => window.location.href = 'app.html';
        });

        console.log('✅ تم تحديث index.html للمستخدم المسجل');
    }

    // ==========================================
    // Logout Function
    // ==========================================
    window.handleLogout = function() {
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            console.log('👋 تسجيل خروج...');
            
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Show alert
            if (typeof showAlert === 'function') {
                showAlert('✅ تم تسجيل الخروج بنجاح', 'success');
            }
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);
        }
    };

    // ==========================================
    // Run auth check on page load
    // ==========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }

    // ==========================================
    // Re-check auth when window regains focus
    // ==========================================
    window.addEventListener('focus', function() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (protectedPages.includes(currentPage)) {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
            }
        }
    });

})();