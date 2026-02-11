// expenses.js - إدارة المصروفات

if (typeof API_URL === 'undefined') {
    console.error('❌ API_URL غير معرّف! تأكد من تحميل app.js أولاً');
}

// ==========================================
// متغيرات عامة
// ==========================================
let currentFilter = 'all';
let recognition = null;
let isRecording = false;
let recordingTimeout = null;
let timerInterval = null;
let recordingSeconds = 0;
let isProcessing = false;
let pressTimer = null;
let isLongPress = false;

// ==========================================
// الحصول على العملة الحالية
// ==========================================
function getCurrentCurrency() {
    const savedCurrency = localStorage.getItem('userCurrency');
    if (savedCurrency) {
        return JSON.parse(savedCurrency);
    }
    return { code: 'EUR', symbol: '€', name: 'يورو' };
}

// ==========================================
// التهيئة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ تم تحميل صفحة المصروفات');
    
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    
    if (document.getElementById('expensesList')) {
        loadExpenses('all');
    }
    
    initVoiceButton();
});

// ==========================================
// 🎤 تفعيل نظام الضغط المطول
// ==========================================
function initVoiceButton() {
    const voiceBtn = document.querySelector('.btn-success');
    
    if (!voiceBtn) {
        console.error('❌ لم يتم العثور على زر التسجيل');
        return;
    }
    
    console.log('🎤 تفعيل زر التسجيل...');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error('❌ المتصفح لا يدعم التسجيل');
        voiceBtn.style.display = 'none';
        return;
    }

    console.log('✅ المتصفح يدعم التسجيل');

    voiceBtn.onclick = null;
    voiceBtn.removeAttribute('onclick');

    voiceBtn.addEventListener('touchstart', handlePressStart, { passive: false });
    voiceBtn.addEventListener('touchend', handlePressEnd, { passive: false });
    voiceBtn.addEventListener('touchcancel', handlePressEnd, { passive: false });

    voiceBtn.addEventListener('mousedown', handlePressStart);
    voiceBtn.addEventListener('mouseup', handlePressEnd);
    voiceBtn.addEventListener('mouseleave', handlePressEnd);

    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> اضغط مطولاً للتسجيل';

    console.log('✅ تم تفعيل نظام الضغط المطول');
}

// ==========================================
// بداية الضغط
// ==========================================
function handlePressStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('👆 بدأ الضغط');
    
    isLongPress = false;
    
    const btn = e.currentTarget;
    if (btn) {
        btn.style.background = '#ff9800';
        btn.style.transform = 'scale(0.95)';
    }
    
    pressTimer = setTimeout(() => {
        isLongPress = true;
        console.log('✅ ضغط مطول - بدء التسجيل');
        startRecordingLongPress();
    }, 200);
}

// ==========================================
// نهاية الضغط
// ==========================================
function handlePressEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('👆 انتهى الضغط');
    
    if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
    }
    
    const btn = e.currentTarget;
    if (btn) {
        btn.style.transform = 'scale(1)';
    }
    
    if (isLongPress && isRecording) {
        console.log('🛑 إيقاف التسجيل (رفع الإصبع)');
        stopRecordingLongPress();
    } else if (!isRecording) {
        if (btn) {
            btn.style.background = '#4caf50';
        }
    }
    
    isLongPress = false;
}

// ==========================================
// بدء التسجيل - 5 ثوان
// ==========================================
function startRecordingLongPress() {
    if (isRecording) {
        console.log('⚠️ التسجيل نشط بالفعل');
        return;
    }

    try {
        console.log('🎤 إنشاء كائن التسجيل...');
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.lang = 'ar-SA';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        let finalText = '';
        
        recognition.onstart = () => {
            console.log('✅ بدأ التسجيل!');
            isRecording = true;
            isProcessing = false;
            recordingSeconds = 0;
            finalText = '';
            
            updateRecordingUI(true);
            
            recordingTimeout = setTimeout(() => {
                console.log('⏱️ انتهى الوقت (5 ثوان)');
                stopRecordingLongPress();
            }, 5000);
        };
        
        recognition.onresult = (event) => {
            console.log('📝 تلقي نتيجة...');
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript;
                    console.log('✅ نص نهائي:', text);
                    finalText += ' ' + text;
                }
            }
        };
        
        recognition.onerror = (event) => {
            console.error('❌ خطأ:', event.error);
            
            if (event.error === 'aborted') {
                console.log('ℹ️ تم الإلغاء');
                return;
            }
            
            stopRecordingLongPress();
            
            if (event.error === 'no-speech') {
                alert('🎤 لم يتم اكتشاف صوت\nحاول مرة أخرى');
                return;
            }
            
            let msg = '';
            switch(event.error) {
                case 'not-allowed':
                    msg = '🚫 يجب السماح باستخدام الميكروفون';
                    break;
                case 'audio-capture':
                    msg = '🎤 لا يمكن الوصول للميكروفون';
                    break;
                case 'network':
                    msg = '📡 مشكلة في الاتصال';
                    break;
                default:
                    msg = '❌ خطأ: ' + event.error;
            }
            
            if (msg) alert(msg);
        };
        
        recognition.onend = () => {
            console.log('🔚 انتهى التسجيل');
            console.log('📝 النص الكامل:', finalText);
            
            isRecording = false;
            isProcessing = false;
            updateRecordingUI(false);
            
            if (recordingTimeout) {
                clearTimeout(recordingTimeout);
                recordingTimeout = null;
            }
            
            if (finalText && finalText.trim()) {
                setTimeout(() => {
                    processVoiceInput(finalText.trim());
                }, 100);
            } else {
                setTimeout(() => {
                    alert('🎤 لم يتم التعرف على أي كلام\nحاول مرة أخرى');
                }, 100);
            }
        };
        
        console.log('🚀 بدء التسجيل...');
        recognition.start();
        
    } catch (error) {
        console.error('❌ خطأ في الإنشاء:', error);
        alert('❌ خطأ: ' + error.message);
        stopRecordingLongPress();
    }
}

// ==========================================
// إيقاف التسجيل
// ==========================================
function stopRecordingLongPress() {
    console.log('🛑 إيقاف التسجيل...');
    
    if (recognition) {
        try {
            recognition.stop();
            console.log('✅ تم إيقاف recognition');
        } catch (e) {
            console.log('Already stopped:', e.message);
        }
    }
    
    isRecording = false;
    isProcessing = false;
    
    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
    }
    
    updateRecordingUI(false);
}

// ==========================================
// تحديث الواجهة
// ==========================================
function updateRecordingUI(recording) {
    const btn = document.querySelector('.btn-success');
    
    if (!btn) {
        console.error('❌ لم يتم العثور على الزر');
        return;
    }
    
    console.log('🎨 تحديث الواجهة - recording:', recording);
    
    if (recording) {
        btn.style.background = '#f44336';
        btn.style.transition = 'all 0.2s ease';
        btn.innerHTML = '<i class="fas fa-circle" style="animation: pulse 1s infinite;"></i> ارفع إصبعك للإيقاف';
    } else {
        btn.style.background = '#4caf50';
        btn.style.transition = 'all 0.2s ease';
        btn.style.transform = 'scale(1)';
        btn.innerHTML = '<i class="fas fa-microphone"></i> اضغط مطولاً للتسجيل';
    }
}

// ==========================================
// معالجة النص المُدخل
// ==========================================
function processVoiceInput(text) {
    console.log('🔄 معالجة النص:', text);
    
    const extractedData = parseVoiceToExpense(text);
    
    if (extractedData) {
        showExpenseConfirmModal(extractedData, text);
    } else {
        alert('❌ لم أفهم المصروف\n\n✅ مثال صحيح:\n"دفعت 50 يورو للطعام"');
    }
}

// ==========================================
// استخراج البيانات من النص
// ==========================================
function parseVoiceToExpense(text) {
    console.log('🔍 تحليل:', text);
    
    const result = {
        amount: 0,
        currency: getCurrentCurrency(),
        category: '',
        description: text,
        date: new Date().toISOString().split('T')[0]
    };
    
    // استخراج المبلغ
    const numberMatch = text.match(/(\d+\.?\d*)/);
    if (numberMatch) {
        result.amount = parseFloat(numberMatch[1]);
    }
    
    // استخراج العملة
    const currencies = {
        'EUR': ['يورو', 'euro'],
        'USD': ['دولار', 'dollar'],
        'SAR': ['ريال', 'riyal'],
        'AED': ['درهم', 'dirham'],
        'EGP': ['جنيه', 'pound']
    };
    
    for (const [code, keywords] of Object.entries(currencies)) {
        for (const keyword of keywords) {
            if (text.toLowerCase().includes(keyword)) {
                result.currency = {
                    code: code,
                    symbol: code === 'EUR' ? '€' : code === 'USD' ? '$' : code === 'SAR' ? 'ر.س' : code === 'AED' ? 'د.إ' : 'ج.م',
                    name: keyword
                };
                break;
            }
        }
    }
    
    // استخراج الفئة
    const categories = {
        'طعام': ['طعام', 'أكل', 'غداء', 'عشاء', 'فطور', 'مطعم'],
        'مواصلات': ['مواصلات', 'تاكسي', 'أوبر', 'باص', 'قطار', 'بنزين', 'وقود'],
        'تسوق': ['تسوق', 'شراء', 'ملابس', 'سوق'],
        'فواتير': ['فواتير', 'فاتورة', 'كهرباء', 'ماء', 'إنترنت'],
        'ترفيه': ['ترفيه', 'سينما', 'ألعاب', 'رحلة'],
        'صحة': ['صحة', 'دواء', 'طبيب', 'مستشفى', 'صيدلية']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                result.category = category;
                break;
            }
        }
        if (result.category) break;
    }
    
    if (!result.category) {
        result.category = 'أخرى';
    }
    
    // استخراج الوصف
    let description = text;
    if (numberMatch) {
        description = description.replace(numberMatch[0], '').trim();
    }
    description = description.replace(/دفعت|صرفت|يورو|ريال|دينار|درهم|دولار/gi, '').trim();
    
    result.description = description || text;
    
    if (!result.amount || result.amount <= 0) {
        console.error('❌ فشل استخراج المبلغ');
        return null;
    }
    
    console.log('✅ النتيجة:', result);
    return result;
}

// ==========================================
// نافذة التأكيد - مع اختيار العملة
// ==========================================
function showExpenseConfirmModal(expenseData, originalText) {
    const currencies = [
        { code: 'EUR', symbol: '€', name: 'يورو' },
        { code: 'USD', symbol: '$', name: 'دولار' },
        { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
        { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
        { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' }
    ];
    
    const currencyOptions = currencies.map(c => 
        `<option value="${c.code}" ${expenseData.currency.code===c.code?'selected':''}>${c.symbol} ${c.name}</option>`
    ).join('');
    
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:999999;padding:15px;overflow-y:auto;';
    
    modal.innerHTML = `
        <div style="background:white;padding:25px;border-radius:20px;max-width:600px;width:100%;max-height:95vh;overflow-y:auto;box-shadow:0 10px 50px rgba(0,0,0,0.3);">
            
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:70px;height:70px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:50%;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;font-size:35px;color:white;">🎤</div>
                <h2 style="margin:0;color:#2c3e50;font-size:22px;">تأكيد المصروف</h2>
                <p style="color:#999;font-size:13px;margin-top:8px;padding:10px;background:#f8f9fa;border-radius:8px;font-style:italic;word-wrap:break-word;">"${originalText}"</p>
            </div>
            
            <form id="confirmForm">
                
                <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:15px;">
                    <div style="background:#f8f9fa;padding:12px;border-radius:10px;">
                        <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-dollar-sign"></i> المبلغ *</label>
                        <input type="number" id="confirmAmount" value="${expenseData.amount||''}" step="0.01" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:15px;box-sizing:border-box;">
                    </div>
                    <div style="background:#f8f9fa;padding:12px;border-radius:10px;">
                        <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-coins"></i> العملة *</label>
                        <select id="confirmCurrency" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                            ${currencyOptions}
                        </select>
                    </div>
                </div>
                
                <div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-bottom:15px;">
                    <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-tags"></i> الفئة *</label>
                    <select id="confirmCategory" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                        <option value="طعام" ${expenseData.category==='طعام'?'selected':''}>طعام</option>
                        <option value="مواصلات" ${expenseData.category==='مواصلات'?'selected':''}>مواصلات</option>
                        <option value="تسوق" ${expenseData.category==='تسوق'?'selected':''}>تسوق</option>
                        <option value="فواتير" ${expenseData.category==='فواتير'?'selected':''}>فواتير</option>
                        <option value="ترفيه" ${expenseData.category==='ترفيه'?'selected':''}>ترفيه</option>
                        <option value="صحة" ${expenseData.category==='صحة'?'selected':''}>صحة</option>
                        <option value="أخرى" ${expenseData.category==='أخرى'?'selected':''}>أخرى</option>
                    </select>
                </div>
                
                <div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-bottom:15px;">
                    <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-calendar"></i> التاريخ *</label>
                    <input type="date" id="confirmDate" value="${expenseData.date||''}" required style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                </div>
                
                <div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-bottom:15px;">
                    <label style="display:block;margin-bottom:6px;color:#2c3e50;font-weight:600;font-size:14px;"><i class="fas fa-align-right"></i> الوصف</label>
                    <textarea id="confirmDescription" rows="2" style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;">${expenseData.description||''}</textarea>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <button type="submit" style="padding:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:600;">✅ تأكيد</button>
                    <button type="button" id="cancelConfirmBtn" style="padding:12px;background:#e0e0e0;color:#666;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:600;">❌ إلغاء</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    modal.querySelector('#cancelConfirmBtn').onclick = () => {
        modal.remove();
        document.body.style.overflow = '';
    };
    
    modal.querySelector('#confirmForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveConfirmedExpense(modal);
    };
}

// ==========================================
// حفظ المصروف المؤكد
// ==========================================
async function saveConfirmedExpense(modal) {
    const currencyCode = modal.querySelector('#confirmCurrency').value;
    const currencies = {
        'EUR': { code: 'EUR', symbol: '€', name: 'يورو' },
        'USD': { code: 'USD', symbol: '$', name: 'دولار' },
        'SAR': { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
        'AED': { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
        'EGP': { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' }
    };
    
    const finalData = {
        amount: parseFloat(modal.querySelector('#confirmAmount').value),
        currency: currencies[currencyCode],
        category: modal.querySelector('#confirmCategory').value,
        date: modal.querySelector('#confirmDate').value,
        description: modal.querySelector('#confirmDescription').value
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(finalData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            modal.remove();
            document.body.style.overflow = '';
            alert('✅ تم إضافة المصروف بنجاح!');
            document.getElementById('expenseForm').reset();
            document.getElementById('date').valueAsDate = new Date();
            await loadExpenses(currentFilter);
        } else {
            alert('❌ ' + (data.message || 'خطأ في إضافة المصروف'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ في حفظ المصروف');
    }
}

// ==========================================
// إضافة مصروف (من النموذج) - مع العملة
// ==========================================
document.getElementById('expenseForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const currencySelect = document.getElementById('currency');
    const currencyCode = currencySelect ? currencySelect.value : 'EUR';
    
    const currencies = {
        'EUR': { code: 'EUR', symbol: '€', name: 'يورو' },
        'USD': { code: 'USD', symbol: '$', name: 'دولار' },
        'SAR': { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
        'AED': { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
        'EGP': { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' }
    };
    
    const expenseData = {
        amount: parseFloat(document.getElementById('amount').value),
        currency: currencies[currencyCode] || getCurrentCurrency(),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value
    };
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('❌ الرجاء تسجيل الدخول');
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
            alert('✅ تم إضافة المصروف بنجاح');
            this.reset();
            document.getElementById('date').valueAsDate = new Date();
            loadExpenses(currentFilter);
        } else {
            alert(data.message || 'خطأ في إضافة المصروف');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('خطأ في إضافة المصروف');
    }
});

// ==========================================
// تحميل المصروفات - FIXED التاريخ
// ==========================================
async function loadExpenses(filter = 'all') {
    currentFilter = filter;
    
    console.log('📥 تحميل المصروفات - الفلتر:', filter);
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
        
        let url = `${API_URL}/expenses`;
        const params = new URLSearchParams();
        
        // ✅ استخدام التاريخ المحلي بدلاً من UTC
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        console.log('📅 تاريخ اليوم:', todayStr);
        
        if (filter === 'today') {
            params.append('startDate', todayStr);
            params.append('endDate', todayStr);
            console.log('✅ فلتر اليوم:', todayStr);
        } 
        else if (filter === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            const weekStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
            
            params.append('startDate', weekStr);
            params.append('endDate', todayStr);
            console.log('✅ فلتر الأسبوع:', weekStr, 'إلى', todayStr);
        } 
        else if (filter === 'month') {
            const firstDayOfMonth = `${year}-${month}-01`;
            
            params.append('startDate', firstDayOfMonth);
            params.append('endDate', todayStr);
            console.log('✅ فلتر الشهر:', firstDayOfMonth, 'إلى', todayStr);
        } 
        else if (filter === 'year') {
            const firstDayOfYear = `${year}-01-01`;
            
            params.append('startDate', firstDayOfYear);
            params.append('endDate', todayStr);
            console.log('✅ فلتر السنة:', firstDayOfYear, 'إلى', todayStr);
        }
        // ✅ إذا كان 'all' لا نضيف فلاتر تاريخ
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        console.log('🌐 URL:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ تم تحميل', data.expenses.length, 'مصروف');
            displayExpenses(data.expenses);
        } else {
            console.error('❌ خطأ:', data.message);
            alert(data.message || 'خطأ في تحميل المصروفات');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('خطأ في تحميل المصروفات');
    }
}

// ==========================================
// عرض المصروفات - مع العملة
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
    
    const html = expenses.map(expense => {
        const dateObj = new Date(expense.date);
        const formattedDate = dateObj.toLocaleDateString('en-GB');
        
        const currency = expense.currency || getCurrentCurrency();
        
        return `
            <div class="expense-item">
                <div class="expense-info">
                    <span class="expense-category">${expense.category}</span>
                    <div class="expense-description">${expense.description || 'بدون وصف'}</div>
                    <div class="expense-date">
                        <i class="fas fa-calendar"></i> 
                        ${formattedDate}
                    </div>
                </div>
                <div class="expense-amount">${expense.amount} ${currency.symbol}</div>
                <div class="expense-actions">
                    <button class="btn btn-primary btn-sm" onclick="editExpense('${expense._id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteExpense('${expense._id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// ==========================================
// تعديل مصروف - مع العملة
// ==========================================
async function editExpense(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/expenses/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            alert('❌ فشل تحميل بيانات المصروف');
            return;
        }

        const data = await response.json();
        const expense = data.expense || data;
        
        const date = new Date(expense.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const currency = expense.currency || getCurrentCurrency();
        
        const currencies = [
            { code: 'EUR', symbol: '€', name: 'يورو' },
            { code: 'USD', symbol: '$', name: 'دولار' },
            { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
            { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
            { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' }
        ];
        
        const currencyOptions = currencies.map(c => 
            `<option value="${c.code}" ${currency.code===c.code?'selected':''}>${c.symbol} ${c.name}</option>`
        ).join('');
        
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;">
                <div style="background:white;padding:30px;border-radius:15px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;">
                    <h2 style="margin:0 0 20px 0;color:#2c3e50;">✏️ تعديل المصروف</h2>
                    <form id="editForm">
                        <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:15px;">
                            <div>
                                <label style="display:block;margin-bottom:5px;font-weight:bold;">💰 المبلغ:</label>
                                <input type="number" id="editAmount" value="${expense.amount}" step="0.01" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="display:block;margin-bottom:5px;font-weight:bold;">💱 العملة:</label>
                                <select id="editCurrency" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                                    ${currencyOptions}
                                </select>
                            </div>
                        </div>
                        
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">🏷️ الفئة:</label>
                        <select id="editCategory" required style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                            <option value="طعام" ${expense.category==='طعام'?'selected':''}>طعام</option>
                            <option value="مواصلات" ${expense.category==='مواصلات'?'selected':''}>مواصلات</option>
                            <option value="تسوق" ${expense.category==='تسوق'?'selected':''}>تسوق</option>
                            <option value="فواتير" ${expense.category==='فواتير'?'selected':''}>فواتير</option>
                            <option value="ترفيه" ${expense.category==='ترفيه'?'selected':''}>ترفيه</option>
                            <option value="صحة" ${expense.category==='صحة'?'selected':''}>صحة</option>
                            <option value="أخرى" ${expense.category==='أخرى'?'selected':''}>أخرى</option>
                        </select>
                        
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">📅 التاريخ:</label>
                        <input type="date" id="editDate" value="${dateStr}" required style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">
                        
                        <label style="display:block;margin-bottom:5px;font-weight:bold;">📄 الوصف:</label>
                        <textarea id="editDescription" rows="3" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;">${expense.description||''}</textarea>
                        
                        <div style="display:flex;gap:10px;margin-top:20px;">
                            <button type="submit" style="flex:1;padding:12px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">💾 حفظ</button>
                            <button type="button" id="cancelBtn" style="flex:1;padding:12px;background:#999;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">❌ إلغاء</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#cancelBtn').onclick = () => modal.remove();
        
        modal.querySelector('#editForm').onsubmit = async (e) => {
            e.preventDefault();
            
            const currencyCode = modal.querySelector('#editCurrency').value;
            const currencies = {
                'EUR': { code: 'EUR', symbol: '€', name: 'يورو' },
                'USD': { code: 'USD', symbol: '$', name: 'دولار' },
                'SAR': { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
                'AED': { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
                'EGP': { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' }
            };
            
            const updatedData = {
                amount: parseFloat(modal.querySelector('#editAmount').value),
                currency: currencies[currencyCode],
                category: modal.querySelector('#editCategory').value,
                date: modal.querySelector('#editDate').value,
                description: modal.querySelector('#editDescription').value
            };
            
            const updateResponse = await fetch(`${API_URL}/expenses/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });
            
            const result = await updateResponse.json();
            
            if (result.success) {
                alert('✅ تم التحديث بنجاح');
                modal.remove();
                loadExpenses(currentFilter);
            } else {
                alert('❌ ' + (result.message || 'فشل التحديث'));
            }
        };
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ حدث خطأ');
    }
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
            alert('✅ تم حذف المصروف');
            loadExpenses(currentFilter);
        } else {
            alert(data.message || 'خطأ في الحذف');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('خطأ في حذف المصروف');
    }
}

// ==========================================
// فلترة المصروفات
// ==========================================
function filterExpenses(period) {
    console.log('🔍 فلترة:', period);
    
    currentFilter = period;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`.filter-btn[onclick="filterExpenses('${period}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        console.log('✅ تم تفعيل زر:', period);
    }
    
    loadExpenses(period);
}

// ==========================================
// تصدير Excel - مع العملات المختلفة
// ==========================================
async function exportExpenses() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('❌ الرجاء تسجيل الدخول');
            return;
        }
        
        alert('⏳ جاري تحميل الملف...');
        
        const response = await fetch(`${API_URL}/expenses/export-excel`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.message || 'خطأ في تحميل الملف');
            return;
        }
        
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
        
        alert('✅ تم تحميل الملف بنجاح');
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('خطأ في تحميل الملف');
    }
}

function toggleRecording() {
    alert('💡 استخدم الضغط المطول على زر التسجيل');
}