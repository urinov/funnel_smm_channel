// AI Sales Advisor - Gemini Integration
// Analyzes funnel data and provides actionable sales recommendations

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.gemini_api);

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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

export default {
  generateSalesAdvice,
  generateQuickInsight,
  analyzeSegment,
  suggestBroadcastMessage
};
