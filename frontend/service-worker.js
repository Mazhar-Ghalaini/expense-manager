// ==========================================
// إعدادات Service Worker
// ==========================================
const CACHE_VERSION = 'expenses-pwa-v1.0.0';
const CACHE_NAME = `expenses-app-${CACHE_VERSION}`;

// الملفات الأساسية (تُخزّن فوراً)
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/expenses.html',
  '/appointments.html',
  '/reminders.html',
  '/ai.html',
  '/settings.html',
  '/css/style.css',
  '/css/mobile.css',
  '/js/app.js',
  '/js/expenses.js',
  '/js/appointments.js',
  '/js/reminders.js',
  '/manifest.json'
];

// الملفات الخارجية (CDN)
const EXTERNAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// جميع الملفات للتخزين
const urlsToCache = [...CORE_ASSETS, ...EXTERNAL_ASSETS];

// ==========================================
// 1. التثبيت - Install Event
// ==========================================
self.addEventListener('install', (event) => {
  console.log('🔧 [Service Worker] تثبيت Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 [Service Worker] تخزين الملفات الأساسية...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ [Service Worker] تم التثبيت بنجاح');
        return self.skipWaiting(); // تفعيل فوري
      })
      .catch((error) => {
        console.error('❌ [Service Worker] خطأ في التثبيت:', error);
      })
  );
});

// ==========================================
// 2. التفعيل - Activate Event
// ==========================================
self.addEventListener('activate', (event) => {
  console.log('✅ [Service Worker] تفعيل Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            // حذف الـ Cache القديم
            if (cache !== CACHE_NAME) {
              console.log('🗑️ [Service Worker] حذف Cache قديم:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ [Service Worker] تم التفعيل بنجاح');
        return self.clients.claim(); // السيطرة على جميع الصفحات
      })
  );
});

// ==========================================
// 3. جلب الملفات - Fetch Event
// ==========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تخطي طلبات API (نريدها دائماً من السيرفر)
  if (url.pathname.startsWith('/api/')) {
    console.log('🌐 [Service Worker] طلب API:', url.pathname);
    return; // لا تخزين
  }
  
  // تخطي Chrome Extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // استراتيجية: Cache First (للسرعة)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('📂 [Cache] تم جلب من Cache:', url.pathname);
          
          // جلب نسخة جديدة في الخلفية (Update Cache)
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response.clone());
              });
            }
          }).catch(() => {
            // لا مشكلة، النسخة المخزنة موجودة
          });
          
          return cachedResponse;
        }
        
        // إذا غير موجود في Cache → جلب من الإنترنت
        console.log('🌐 [Network] جلب من الإنترنت:', url.pathname);
        return fetch(request)
          .then((response) => {
            // التحقق من الاستجابة
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // حفظ نسخة في Cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            
            return response;
          })
          .catch(() => {
            // فشل الجلب (لا إنترنت)
            console.log('❌ [Offline] لا يوجد اتصال');
            
            // إذا كان طلب صفحة HTML → أرسل صفحة Offline
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // إذا كان صورة → أرسل صورة placeholder
            if (request.destination === 'image') {
              return new Response(
                '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#ddd"/><text x="50%" y="50%" text-anchor="middle" fill="#999">⚠️</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
          });
      })
  );
});

// ==========================================
// 4. إشعارات Push Notifications
// ==========================================
self.addEventListener('push', (event) => {
  console.log('🔔 [Push] تلقي إشعار جديد');
  
  let notificationData = {
    title: 'تذكير',
    body: 'لديك تذكير جديد',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png'
  };
  
  // إذا كان هناك بيانات من السيرفر
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {}
      };
    } catch (e) {
      console.error('❌ خطأ في معالجة بيانات الإشعار:', e);
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200, 100, 200],
    data: notificationData.data,
    requireInteraction: true,
    actions: [
      { action: 'open', title: '✅ فتح', icon: '/icons/icon-72x72.png' },
      { action: 'close', title: '❌ إغلاق', icon: '/icons/icon-72x72.png' }
    ],
    tag: 'reminder-notification',
    renotify: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// ==========================================
// 5. النقر على الإشعار
// ==========================================
self.addEventListener('notificationclick', (event) => {
  console.log('👆 [Notification] تم النقر على الإشعار');
  
  event.notification.close();
  
  if (event.action === 'open') {
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // البحث عن نافذة مفتوحة
          for (let client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // فتح نافذة جديدة
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// ==========================================
// 6. مزامنة في الخلفية (Background Sync)
// ==========================================
self.addEventListener('sync', (event) => {
  console.log('🔄 [Sync] مزامنة في الخلفية');
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // يمكنك إضافة منطق المزامنة هنا
      Promise.resolve()
    );
  }
});

// ==========================================
// 7. رسائل من الصفحة
// ==========================================
self.addEventListener('message', (event) => {
  console.log('💬 [Message] رسالة من الصفحة:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});

console.log('🚀 [Service Worker] تم تحميل Service Worker بنجاح!');