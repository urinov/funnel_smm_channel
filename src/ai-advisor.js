// AI Sales Advisor - OpenAI Integration
// Analyzes funnel data and provides actionable sales recommendations

import OpenAI from 'openai';

// Support both OpenAI and Gemini keys
const openaiKey = process.env.OPENAI_API_KEY || process.env.gpt_bot_api;
const geminiKey = process.env.GEMINI_API_KEY || process.env.gemini_api;

let client = null;
let provider = null;

if (openaiKey) {
  client = new OpenAI({ apiKey: openaiKey });
  provider = 'openai';
  console.log('AI Provider: OpenAI (GPT)');
} else if (geminiKey) {
  // Fallback to Gemini if available
  console.log('AI Provider: Gemini (fallback)');
  provider = 'gemini';
} else {
  console.warn('WARNING: No AI API key found. Set OPENAI_API_KEY or GEMINI_API_KEY.');
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
 * Call OpenAI API
 */
async function callOpenAI(prompt, systemPrompt = SYSTEM_PROMPT) {
  if (!client) {
    throw new Error('OpenAI API key topilmadi. OPENAI_API_KEY ni sozlang.');
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini', // Cost-effective and fast
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    max_tokens: 1500,
    temperature: 0.7
  });

  return completion.choices[0]?.message?.content || '';
}

/**
 * Generate AI sales recommendations based on funnel data
 */
export async function generateSalesAdvice(funnelData, additionalContext = {}) {
  try {
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

    const advice = await callOpenAI(dataPrompt);

    return {
      success: true,
      advice,
      generatedAt: new Date().toISOString(),
      provider: 'OpenAI GPT-4o-mini'
    };
  } catch (error) {
    console.error('AI Advice error:', error);
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
    const prompt = `Ko'rsatkich: ${metric}
Qiymat: ${value}
Kontekst: ${context}

Bu ko'rsatkich haqida 1-2 qator qisqa insight ber. Yaxshi yoki yomon ekanligini va nima qilish kerakligini ayt.`;

    const insight = await callOpenAI(prompt);

    return {
      success: true,
      insight
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
    const prompt = `Segment: ${segmentName}
Foydalanuvchilar soni: ${users}
Statistika: ${JSON.stringify(stats)}

Bu segment uchun qanday xabar yuborish kerak? Qanday taklif qilish kerak? 2-3 qator tavsiya ber.`;

    const recommendation = await callOpenAI(prompt);

    return {
      success: true,
      recommendation
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
    const prompt = `Maqsadli auditoriya: ${targetAudience}
Xabar maqsadi: ${goal}
Ton: ${tone}

Telegram uchun samarali xabar matni yoz. Emoji ishlatishingiz mumkin. HTML formatda (<b>, <i>, <a href="">).
Xabar 500 belgidan oshmasin.`;

    const message = await callOpenAI(prompt);

    return {
      success: true,
      message
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
    const prompt = `Bugungi biznes statistikasi:
- Yangi foydalanuvchilar: ${stats.newUsers || 0}
- Faol foydalanuvchilar: ${stats.activeUsers || 0}
- Bugungi to'lovlar: ${stats.todayPayments || 0} ta (${stats.todayRevenue || 0} so'm)
- Konversiya: ${stats.conversionRate || 0}%
- Faol suhbatlar: ${stats.activeConversations || 0}

Qisqa (3-4 qator) kunlik brifing yoz. Asosiy e'tibor qaratish kerak bo'lgan narsani ko'rsat.`;

    const briefing = await callOpenAI(prompt);

    return {
      success: true,
      briefing
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
    const prompt = `Foydalanuvchi ma'lumotlari:
- Ism: ${user.name || 'Noma\'lum'}
- Ro'yxatdan o'tgan: ${user.createdAt || 'Noma\'lum'}
- Joriy bosqich: ${user.currentStep || 0}
- Jami darslar: ${user.lessonsCompleted || 0}
- To'lov holati: ${user.isPaid ? 'To\'lagan' : 'To\'lamagan'}
- Oxirgi faollik: ${user.lastActivity || 'Noma\'lum'}
- Manba: ${user.source || 'Noma\'lum'}

Bu foydalanuvchiga nima qilish kerak? Qanday xabar yuborish kerak? 2-3 qator tavsiya.`;

    const analysis = await callOpenAI(prompt);

    return {
      success: true,
      analysis
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
    const prompt = `To'lov statistikasi:
- Jami checkout ochganlar: ${paymentData.totalCheckouts || 0}
- To'lov qilganlar: ${paymentData.completedPayments || 0}
- Tashlab ketganlar: ${paymentData.abandonedPayments || 0}
- O'rtacha vaqt (checkout -> to'lov): ${paymentData.avgTimeToPayment || 'Noma\'lum'}
- Eng ko'p ishlatiladigan to'lov tizimi: ${paymentData.topPaymentMethod || 'Noma\'lum'}
- Stuck to'lovlar: ${paymentData.stuckPayments || 0}

To'lov konversiyasini oshirish uchun TOP 3 tavsiya ber. Har biri uchun aniq qadamlar.`;

    const advice = await callOpenAI(prompt);

    return {
      success: true,
      advice
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
    const prompt = `Darslar statistikasi:
- Jami darslar: ${lessonStats.totalLessons || 0}
- Eng ko'p ko'rilgan dars: ${lessonStats.mostViewedLesson || 'Noma\'lum'}
- Eng kam ko'rilgan dars: ${lessonStats.leastViewedLesson || 'Noma\'lum'}
- O'rtacha dars ko'rish vaqti: ${lessonStats.avgViewTime || 'Noma\'lum'}
- Drop-off eng ko'p bo'lgan dars: ${lessonStats.highestDropoffLesson || 'Noma\'lum'}

Kontent va darslarni yaxshilash uchun TOP 3 tavsiya ber.`;

    const advice = await callOpenAI(prompt);

    return {
      success: true,
      advice
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
    const prompt = `Referal dasturi statistikasi:
- Jami referallar: ${referralData.totalReferrals || 0}
- Muvaffaqiyatli referallar: ${referralData.successfulReferrals || 0}
- Top referer: ${referralData.topReferer || 'Noma\'lum'}
- O'rtacha referal per user: ${referralData.avgReferralsPerUser || 0}
- Referal orqali to'lovlar: ${referralData.referralPayments || 0}

Referal dasturini yaxshilash uchun 2-3 ta tavsiya ber.`;

    const analysis = await callOpenAI(prompt);

    return {
      success: true,
      analysis
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
