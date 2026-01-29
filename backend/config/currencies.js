// قائمة العملات المدعومة مع أسمائها بالعربية
const CURRENCIES = {
  // دول الخليج
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    name: 'Saudi Riyal',
    nameAr: 'ريال',
    country: 'السعودية',
    keywords: ['ريال', 'سعودي', 'رس', 'sar']
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    nameAr: 'درهم',
    country: 'الإمارات',
    keywords: ['درهم', 'إماراتي', 'دإ', 'aed']
  },
  KWD: {
    code: 'KWD',
    symbol: 'د.ك',
    name: 'Kuwaiti Dinar',
    nameAr: 'دينار',
    country: 'الكويت',
    keywords: ['دينار', 'كويتي', 'دك', 'kwd']
  },
  BHD: {
    code: 'BHD',
    symbol: 'د.ب',
    name: 'Bahraini Dinar',
    nameAr: 'دينار',
    country: 'البحرين',
    keywords: ['دينار', 'بحريني', 'دب', 'bhd']
  },
  OMR: {
    code: 'OMR',
    symbol: 'ر.ع',
    name: 'Omani Rial',
    nameAr: 'ريال',
    country: 'عمان',
    keywords: ['ريال', 'عماني', 'رع', 'omr']
  },
  QAR: {
    code: 'QAR',
    symbol: 'ر.ق',
    name: 'Qatari Riyal',
    nameAr: 'ريال',
    country: 'قطر',
    keywords: ['ريال', 'قطري', 'رق', 'qar']
  },
  
  // دول عربية أخرى
  EGP: {
    code: 'EGP',
    symbol: 'ج.م',
    name: 'Egyptian Pound',
    nameAr: 'جنيه',
    country: 'مصر',
    keywords: ['جنيه', 'مصري', 'جم', 'egp']
  },
  JOD: {
    code: 'JOD',
    symbol: 'د.أ',
    name: 'Jordanian Dinar',
    nameAr: 'دينار',
    country: 'الأردن',
    keywords: ['دينار', 'أردني', 'دأ', 'jod']
  },
  LBP: {
    code: 'LBP',
    symbol: 'ل.ل',
    name: 'Lebanese Pound',
    nameAr: 'ليرة',
    country: 'لبنان',
    keywords: ['ليرة', 'لبناني', 'لل', 'lbp']
  },
  IQD: {
    code: 'IQD',
    symbol: 'د.ع',
    name: 'Iraqi Dinar',
    nameAr: 'دينار',
    country: 'العراق',
    keywords: ['دينار', 'عراقي', 'دع', 'iqd']
  },
  SYP: {
    code: 'SYP',
    symbol: 'ل.س',
    name: 'Syrian Pound',
    nameAr: 'ليرة',
    country: 'سوريا',
    keywords: ['ليرة', 'سوري', 'لس', 'syp']
  },
  YER: {
    code: 'YER',
    symbol: 'ر.ي',
    name: 'Yemeni Rial',
    nameAr: 'ريال',
    country: 'اليمن',
    keywords: ['ريال', 'يمني', 'ري', 'yer']
  },
  MAD: {
    code: 'MAD',
    symbol: 'د.م',
    name: 'Moroccan Dirham',
    nameAr: 'درهم',
    country: 'المغرب',
    keywords: ['درهم', 'مغربي', 'دم', 'mad']
  },
  TND: {
    code: 'TND',
    symbol: 'د.ت',
    name: 'Tunisian Dinar',
    nameAr: 'دينار',
    country: 'تونس',
    keywords: ['دينار', 'تونسي', 'دت', 'tnd']
  },
  DZD: {
    code: 'DZD',
    symbol: 'د.ج',
    name: 'Algerian Dinar',
    nameAr: 'دينار',
    country: 'الجزائر',
    keywords: ['دينار', 'جزائري', 'دج', 'dzd']
  },
  LYD: {
    code: 'LYD',
    symbol: 'د.ل',
    name: 'Libyan Dinar',
    nameAr: 'دينار',
    country: 'ليبيا',
    keywords: ['دينار', 'ليبي', 'دل', 'lyd']
  },
  SDG: {
    code: 'SDG',
    symbol: 'ج.س',
    name: 'Sudanese Pound',
    nameAr: 'جنيه',
    country: 'السودان',
    keywords: ['جنيه', 'سوداني', 'جس', 'sdg']
  },
  
  // عملات عالمية شائعة
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    nameAr: 'دولار',
    country: 'أمريكا',
    keywords: ['دولار', 'أمريكي', 'usd', 'dollar']
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    nameAr: 'يورو',
    country: 'أوروبا',
    keywords: ['يورو', 'euro', 'eur']
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    nameAr: 'جنيه استرليني',
    country: 'بريطانيا',
    keywords: ['جنيه', 'استرليني', 'gbp', 'pound']
  }
};

// دالة للحصول على العملة من النص
function detectCurrencyFromText(text) {
  const lowerText = text.toLowerCase();
  
  for (const [code, currency] of Object.entries(CURRENCIES)) {
    // البحث في الكلمات المفتاحية
    for (const keyword of currency.keywords) {
      if (lowerText.includes(keyword)) {
        return currency;
      }
    }
  }
  
  return null; // لم يتم العثور على عملة
}

// دالة للحصول على معلومات العملة
function getCurrency(code) {
  return CURRENCIES[code] || CURRENCIES.SAR;
}

// دالة للحصول على جميع العملات
function getAllCurrencies() {
  return Object.values(CURRENCIES);
}

module.exports = {
  CURRENCIES,
  detectCurrencyFromText,
  getCurrency,
  getAllCurrencies
};