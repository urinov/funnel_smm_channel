// AI Sales Advisor - Gemini Integration
// Analyzes funnel data and provides actionable sales recommendations

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.gemini_api);

// Available models - try in order of preference
const MODELS = ['gemini-pro', 'gemini-1.0-pro', 'gemini-1.5-flash-latest'];

async function getWorkingModel() {
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      // Test with a simple prompt
      await model.generateContent('test');
      console.log(`Using Gemini model: ${modelName}`);
      return model;
    } catch (e) {
      console.log(`Model ${modelName} not available, trying next...`);
    }
  }
  // Fallback to gemini-pro
  return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

let cachedModel = null;
async function getModel() {
  if (!cachedModel) {
    cachedModel = await getWorkingModel();
  }
  return cachedModel;
}

const SYSTEM_PROMPT = `Sen professional sotish va marketing bo'yicha mutaxassissan. Sening vazifang - Telegram bot orqali kurs sotayotgan biznes uchun sotuvni oshirish bo'yicha aniq, amaliy tavsiyalar berish.

Sening tahliling quyidagilarga asoslanadi:
- Voronka konversiya ko'rsatkichlari (har bir bosqichda necha foiz o'tib ketayotgani)
- Foydalanuvchi faolligi va harakatlari
- To'lov statistikasi
- Vaqt bo'yicha trendlar

Tavsiyalaringda:
1. Aniq raqamlar va foizlarga asoslan
2. Birinchi navbatda eng katta ta'sir ko'rsatadigan o'zgarishlarni taklif qil
3. Har bir tavsiya uchun kutilgan natijani ko'rsat
4. Amaliy qadamlarni batafsil yoz
5. Muammoli joylarni aniq ko'rsat

Javoblaringni O'zbek tilida ber. Qisqa va aniq bo'l. Emoji ishlatishdan qo'rqma.`;

/**
 * Generate AI sales recommendations based on funnel data
 */
export async function generateSalesAdvice(funnelData, additionalContext = {}) {
  try {
    const model = await getModel();

    const dataPrompt = `
## Joriy Voronka Ma'lumotlari:

### Asosiy Ko'rsatkichlar:
- Jami ro'yxatdan o'tganlar: ${funnelData.totalUsers || 0}
- Faol foydalanuvchilar (dars boshlagan): ${funnelData.activeUsers || 0} (${funnelData.activePercent || 0}%)
- Pitch ko'rganlar: ${funnelData.pitchViewed || 0} (${funnelData.pitchPercent || 0}%)
- Checkout ochganlar: ${funnelData.checkoutOpened || 0} (${funnelData.checkoutPercent || 0}%)
- To'lov qilganlar: ${funnelData.paidUsers || 0} (${funnelData.paidPercent || 0}%)

### Konversiya Yo'qotishlari:
- Ro'yxatdan → Faol: ${funnelData.dropoff1 || 0}% yo'qotish
- Faol → Pitch: ${funnelData.dropoff2 || 0}% yo'qotish
- Pitch → Checkout: ${funnelData.dropoff3 || 0}% yo'qotish
- Checkout → To'lov: ${funnelData.dropoff4 || 0}% yo'qotish

### Umumiy CR (Conversion Rate): ${funnelData.overallCR || 0}%

${additionalContext.recentPayments ? `### Oxirgi 7 kunda to'lovlar: ${additionalContext.recentPayments}` : ''}
${additionalContext.avgOrderValue ? `### O'rtacha to'lov summasi: ${additionalContext.avgOrderValue} so'm` : ''}
${additionalContext.topSources ? `### Eng yaxshi manbalar: ${additionalContext.topSources}` : ''}
${additionalContext.stuckUsers ? `### "Stuck" foydalanuvchilar (checkout ochib, to'lamagan): ${additionalContext.stuckUsers}` : ''}

## Vazifa:
Yuqoridagi ma'lumotlarni tahlil qilib, sotuvni oshirish uchun TOP 5 ta eng muhim tavsiyani ber.

Har bir tavsiya quyidagi formatda bo'lsin:
**[Raqam]. [Qisqa sarlavha]**
- Muammo: [Aniq muammo]
- Yechim: [Aniq qadamlar]
- Kutilgan natija: [Taxminiy ta'sir]
- Ustuvorlik: [Yuqori/O'rta/Past]
`;

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: dataPrompt }
    ]);

    const response = await result.response;
    return {
      success: true,
      advice: response.text(),
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('AI Advisor error:', error);
    return {
      success: false,
      error: error.message,
      advice: null
    };
  }
}

/**
 * Generate quick insight for a specific metric
 */
export async function generateQuickInsight(metric, value, context = '') {
  try {
    const model = await getModel();

    const prompt = `Ko'rsatkich: ${metric}
Qiymat: ${value}
Kontekst: ${context}

Bu ko'rsatkich haqida 1-2 qator qisqa insight ber. Yaxshi yoki yomon ekanligini va nima qilish kerakligini ayt. O'zbek tilida javob ber.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      success: true,
      insight: response.text()
    };
  } catch (error) {
    return {
      success: false,
      insight: "Insight generatsiya qilib bo'lmadi"
    };
  }
}

/**
 * Analyze user segment and suggest action
 */
export async function analyzeSegment(segmentName, users, stats) {
  try {
    const model = await getModel();

    const prompt = `Segment: ${segmentName}
Foydalanuvchilar soni: ${users}
Statistika: ${JSON.stringify(stats)}

Bu segment uchun qanday xabar yuborish kerak? Qanday taklif qilish kerak? 2-3 qator tavsiya ber. O'zbek tilida.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      success: true,
      recommendation: response.text()
    };
  } catch (error) {
    return {
      success: false,
      recommendation: "Tahlil qilib bo'lmadi"
    };
  }
}

/**
 * Generate broadcast message suggestion
 */
export async function suggestBroadcastMessage(targetAudience, goal, tone = 'friendly') {
  try {
    const model = await getModel();

    const prompt = `Maqsadli auditoriya: ${targetAudience}
Xabar maqsadi: ${goal}
Ton: ${tone}

Telegram uchun samarali xabar matni yoz. Emoji ishlatishingiz mumkin. HTML formatda (<b>, <i>, <a href="">). O'zbek tilida.
Xabar 500 belgidan oshmasin.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      success: true,
      message: response.text()
    };
  } catch (error) {
    return {
      success: false,
      message: "Xabar generatsiya qilib bo'lmadi"
    };
  }
}

/**
 * Generate daily overview/briefing for dashboard
 */
export async function generateDailyBriefing(stats) {
  try {
    const model = await getModel();

    const prompt = `Bugungi biznes statistikasi:
- Yangi foydalanuvchilar: ${stats.newUsers || 0}
- Faol foydalanuvchilar: ${stats.activeUsers || 0}
- Bugungi to'lovlar: ${stats.todayPayments || 0} ta (${stats.todayRevenue || 0} so'm)
- Konversiya: ${stats.conversionRate || 0}%
- Faol suhbatlar: ${stats.activeConversations || 0}

Qisqa (3-4 qator) kunlik brifing yoz. Asosiy e'tibor qaratish kerak bo'lgan narsani ko'rsat. O'zbek tilida.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      success: true,
      briefing: response.text()
    };
  } catch (error) {
    return {
      success: false,
      briefing: "Brifing yuklanmadi"
    };
  }
}

/**
 * Analyze specific user journey and suggest next action
 */
export async function analyzeUserJourney(user) {
  try {
    const model = await getModel();

    const prompt = `Foydalanuvchi ma'lumotlari:
- Ism: ${user.name || 'Noma\'lum'}
- Ro'yxatdan o'tgan: ${user.createdAt || 'Noma\'lum'}
- Joriy bosqich: ${user.currentStep || 0}
- Jami darslar: ${user.lessonsCompleted || 0}
- To'lov holati: ${user.isPaid ? 'To\'lagan' : 'To\'lamagan'}
- Oxirgi faollik: ${user.lastActivity || 'Noma\'lum'}
- Manba: ${user.source || 'Noma\'lum'}

Bu foydalanuvchiga nima qilish kerak? Qanday xabar yuborish kerak? 2-3 qator tavsiya. O'zbek tilida.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      success: true,
      analysis: response.text()
    };
  } catch (error) {
    return {
      success: false,
      analysis: "Tahlil qilib bo'lmadi"
    };
  }
}

/**
 * Generate payment optimization advice
 */
export async function generatePaymentAdvice(paymentData) {
  try {
    const model = await getModel();

    const prompt = `To'lov statistikasi:
- Jami checkout ochganlar: ${paymentData.totalCheckouts || 0}
- To'lov qilganlar: ${paymentData.completedPayments || 0}
- Tashlab ketganlar: ${paymentData.abandonedPayments || 0}
- O'rtacha vaqt (checkout -> to'lov): ${paymentData.avgTimeToPayment || 'Noma\'lum'}
- Eng ko'p ishlatiladigan to'lov tizimi: ${paymentData.topPaymentMethod || 'Noma\'lum'}
- Stuck to'lovlar: ${paymentData.stuckPayments || 0}

To'lov konversiyasini oshirish uchun TOP 3 tavsiya ber. Har biri uchun aniq qadamlar. O'zbek tilida.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      success: true,
      advice: response.text()
    };
  } catch (error) {
    return {
      success: false,
      advice: "Tavsiya yuklanmadi"
    };
  }
}

/**
 * Generate content/lesson improvement suggestions
 */
export async function generateContentAdvice(lessonStats) {
  try {
    const model = await getModel();

    const prompt = `Darslar statistikasi:
- Jami darslar: ${lessonStats.totalLessons || 0}
- Eng ko'p ko'rilgan dars: ${lessonStats.mostViewedLesson || 'Noma\'lum'}
- Eng kam ko'rilgan dars: ${lessonStats.leastViewedLesson || 'Noma\'lum'}
- O'rtacha dars ko'rish vaqti: ${lessonStats.avgViewTime || 'Noma\'lum'}
- Drop-off eng ko'p bo'lgan dars: ${lessonStats.highestDropoffLesson || 'Noma\'lum'}

Kontent va darslarni yaxshilash uchun TOP 3 tavsiya ber. O'zbek tilida.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      success: true,
      advice: response.text()
    };
  } catch (error) {
    return {
      success: false,
      advice: "Tavsiya yuklanmadi"
    };
  }
}

/**
 * Analyze referral program performance
 */
export async function analyzeReferralProgram(referralData) {
  try {
    const model = await getModel();

    const prompt = `Referal dasturi statistikasi:
- Jami referallar: ${referralData.totalReferrals || 0}
- Muvaffaqiyatli referallar: ${referralData.successfulReferrals || 0}
- Top referer: ${referralData.topReferer || 'Noma\'lum'}
- O'rtacha referal per user: ${referralData.avgReferralsPerUser || 0}
- Referal orqali to'lovlar: ${referralData.referralPayments || 0}

Referal dasturini yaxshilash uchun 2-3 ta tavsiya ber. O'zbek tilida.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      success: true,
      analysis: response.text()
    };
  } catch (error) {
    return {
      success: false,
      analysis: "Tahlil yuklanmadi"
    };
  }
}

export default {
  generateSalesAdvice,
  generateQuickInsight,
  analyzeSegment,
  suggestBroadcastMessage,
  generateDailyBriefing,
  analyzeUserJourney,
  generatePaymentAdvice,
  generateContentAdvice,
  analyzeReferralProgram
};
