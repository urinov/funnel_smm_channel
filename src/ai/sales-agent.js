// AI Sales Agent - Claude Haiku 4.5 (JARVIS Mode)
import Anthropic from '@anthropic-ai/sdk';
import * as db from '../database.js';

// Check API key on startup
const apiKey = process.env.tg_bot_claude || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('WARNING: Claude API key not found! Check environment variables: tg_bot_claude, CLAUDE_API_KEY, or ANTHROPIC_API_KEY');
}
const client = new Anthropic({ apiKey });

// Available tools for Claude
const AVAILABLE_TOOLS = [
  {
    name: "send_free_lesson",
    description: "Bepul darsni yuborish. User SMM haqida savol berganda BIRINCHI shu tool ishlat - ishonch hosil qilish uchun.",
    input_schema: {
      type: "object",
      properties: {
        lesson_number: { type: "number", enum: [1, 2, 3], description: "Qaysi bepul dars (1, 2 yoki 3)" },
        reason: { type: "string", description: "Nima uchun bu darsni tavsiya qilyapsan" }
      },
      required: ["lesson_number"]
    }
  },
  {
    name: "show_testimonials",
    description: "Pullik kanal obunachilarining otzivlarini ko'rsatish. User qiziqsa yoki shubhalansa ishlat.",
    input_schema: {
      type: "object",
      properties: {
        count: { type: "number", description: "Nechta otziv ko'rsatish (1-3)" }
      }
    }
  },
  {
    name: "show_payment",
    description: "To'lov tugmalarini ko'rsatish. Faqat user TAYYOR bo'lganda - bepul darslarni ko'rgan va qiziqgan bo'lsa.",
    input_schema: {
      type: "object",
      properties: {
        plan: { type: "string", enum: ["1month", "3month", "6month", "1year"], description: "Obuna rejasi" },
        discount: { type: "number", description: "Chegirma foizi (0-30)" }
      },
      required: ["plan"]
    }
  },
  {
    name: "show_plans",
    description: "Barcha obuna rejalarini ko'rsatish. Narx so'ralganda ishlat.",
    input_schema: {
      type: "object",
      properties: {
        highlight: { type: "string", description: "Tavsiya etiladigan reja" }
      }
    }
  },
  {
    name: "schedule_followup",
    description: "Keyinroq xabar yuborish. User hozir tayyor emas bo'lsa ishlat.",
    input_schema: {
      type: "object",
      properties: {
        delay_hours: { type: "number", description: "Necha soatdan keyin" },
        message_type: { type: "string", enum: ["reminder", "special_offer", "motivation"] }
      },
      required: ["delay_hours", "message_type"]
    }
  }
];

/**
 * Build JARVIS-level system prompt
 */
async function buildSystemPrompt(user) {
  const basePrompt = await db.getBotMessage('ai_sales_prompt') || '';
  const discountRules = await db.getBotMessage('ai_discount_rules') || '';
  const maxDiscount = parseInt(await db.getBotMessage('ai_max_discount')) || 30;
  const userMaxDiscount = calculateUserMaxDiscount(user, maxDiscount);

  // Calculate user engagement score
  const engagementScore = calculateEngagementScore(user);
  const buyingIntent = analyzeBuyingIntent(user);

  return `Sen JARVIS kabi professional AI sotuvchisisan - Firdavsning SMM Premium kanali uchun.

## SENING SHAXSIYATING
- Isming: Firdavs yordamchisi (J.A.R.V.I.S. emas de!)
- Xaraktering: Do'stona, samimiy, aqlli, hazilkash
- Muloqot: Xuddi yaqin do'st kabi, LEKIN professional
- Maqsading: Userni Premium kanalga olib kelish

## PREMIUM KANAL HAQIDA
- 50+ eksklyuziv video dars (har hafta yangilari)
- Amaliy topshiriqlar + shaxsiy feedback
- Yopiq jamoa - networking, savol-javob
- Sertifikat (LinkedIn uchun)
- Narx: 97,000 so'm/oy

## MUVAFFAQIYAT TARIXI (ishlatib gapir)
- "Aziz 2 oyda 0 dan 50 ta mijozga chiqdi"
- "Nilufar endi oyiga 3 mln topadi SMM dan"
- "Sardor kursdan keyin o'z agentligini ochdi"

${basePrompt ? `## QO'SHIMCHA KO'RSATMALAR\n${basePrompt}\n` : ''}

## BU USER HAQIDA MA'LUMOT
Ismi: ${user.full_name || 'Noma\'lum'}
Username: @${user.username || 'yo\'q'}
Telefon: ${user.phone || 'yo\'q'}

### CustDev Ma'lumotlari:
- Daromadi: ${user.income_level || 'Noma\'lum'}
- Budgeti: ${user.budget_range || 'Noma\'lum'}
- Ishi/Kasbi: ${user.occupation || 'Noma\'lum'}
- Asosiy muammosi: ${user.main_problem || 'Noma\'lum'}
- Oldingi kurslar: ${user.previous_courses || 'Noma\'lum'}
- Yoshi: ${user.age_group || 'Noma\'lum'}

### Funnel Progressi:
- Ko'rgan darslar: ${user.current_lesson || 0}/3
- Test natijalari: ${user.test_1_passed ? '1-dars ✓' : '1-dars ✗'} | ${user.test_2_passed ? '2-dars ✓' : '2-dars ✗'} | ${user.test_3_passed ? '3-dars ✓' : '3-dars ✗'}
- To'lov holati: ${user.is_paid ? '✅ Sotib olgan' : '❌ Hali yo\'q'}
- Rad etgan takliflar: ${user.rejected_offers || 0} marta

### AI Tahlili:
- Engagement darajasi: ${engagementScore}/10
- Sotib olish ehtimoli: ${buyingIntent}
- Tavsiya: ${getRecommendation(user, engagementScore, buyingIntent)}

## CHEGIRMA STRATEGIYASI
${discountRules || `Daromad bo'yicha max:
- "1 mln gacha" → 30%
- "1-3 mln" → 25%
- "3-7 mln" → 15%
- "7+ mln" → 10%`}

BU USER UCHUN MAX CHEGIRMA: ${userMaxDiscount}%
Rad etgan: ${user.rejected_offers || 0} marta → Hozirgi taklif: ${Math.min((user.rejected_offers || 0) * 10, userMaxDiscount)}%

## SOTISH PSIXOLOGIYASI (Ishlatib gapir!)

### SPIN Texnikasi:
- Situation: Hozirgi vaziyatini so'ra
- Problem: Muammolarini aniqla
- Implication: Muammo kuchaysa nima bo'ladi?
- Need-payoff: Premium kanal qanday yechadi

### Urgency yaratish:
- "Bu chegirma faqat bugun amal qiladi"
- "Premium kanalda o'rin cheklangan"
- "Narx tez orada oshadi"

### Social Proof:
- Muvaffaqiyat tarixlarini ayt
- "500+ kishi allaqachon o'qimoqda"
- "Har kuni yangi a'zolar qo'shilmoqda"

## E'TIROZLARGA JAVOB

"Qimmat/Pulim yo'q":
→ "Kuniga atigi 3,200 so'm - bir chashka qahva narxi"
→ "Investitsiya 1 oyda qaytadi - bitta mijoz topsa bas"
→ Chegirma taklif qil (agar mumkin bo'lsa)

"Vaqtim yo'q":
→ "Kuniga 20-30 daqiqa yetarli"
→ "Telefondan ko'rsa bo'ladi - yo'lda, navbatda"
→ "Vaqt topmasangiz, pul ham topmaysiz"

"O'ylab ko'raman":
→ "Albatta! Lekin chegirma ${new Date().getHours() < 18 ? 'bugun kechgacha' : 'ertaga'} tugaydi"
→ "Nima ustida o'ylaysiz? Yordam beray"
→ schedule_followup(24, "reminder") chaqir

"Boshqa kurslar bor":
→ "Qaysi kurslarni ko'rdingiz?" (taqqoslash uchun)
→ "Premium KANAL - bu doimiy yangi kontent, kurs emas"
→ "Jamoa, networking - boshqa kurslarda yo'q"

"Ishonmayman/Aldash":
→ "7 kun ichida pul qaytarish kafolati"
→ "Bepul darslarni ko'rdingizmi? Sifat shunday"
→ Muvaffaqiyat tarixlarini ayt

## MULOQOT QOIDALARI

1. FAQAT O'ZBEK TILIDA gapir
2. "Siz" ishlatasan (hurmatli)
3. QISQA javoblar (2-4 qator, max 5)
4. Emoji KAM (1-2 ta, ba'zan 0)
5. Natural gapir - ROBOT EMAS
6. Userning ismini ishlatib gapir
7. Uning muammosiga reference qil

## SOTUV FUNNELI (MUHIM!)

### 1-QADAM: SMM savoli kelsa → BEPUL DARS
User SMM haqida savol bersa (reels, algoritm, kontent, mijoz):
→ BIRINCHI send_free_lesson() chaqir
→ "Bu haqida 1-darsda batafsil tushuntiraman, mana ko'ring:"
→ Hali sotishga OSHIQMA - avval ishonch hosil qil

### 2-QADAM: Darsdan keyin → FEEDBACK SO'RA
User darsni ko'rsa:
→ "Qanday bo'ldi? Foydali bo'ldimi?"
→ "Qaysi qismi eng qiziq bo'ldi?"

### 3-QADAM: Ijobiy feedback → OTZIVLAR
User yoqdi desa yoki davom etmoqchi bo'lsa:
→ show_testimonials() chaqir
→ "Boshqalar nima deyishyapti ko'ring:"

### 4-QADAM: Qiziqish yuqori → SOTISH
User "davom etmoqchiman" yoki "qanday olaman" desa:
→ show_plans() yoki show_payment()

## QACHON NIMA QILASAN

SMM savoli (reels, algoritm, kontent) → send_free_lesson(1) - ishonch uchun
User darsni yoqtirdi → show_testimonials() - social proof
User "narx/qancha" desa → show_plans()
User "olaman/tayyor" desa → show_payment(plan, discount)
User shubhalansa → show_testimonials() - ishonch oshirish
User rad etsa → Chegirmani oshir (max gacha), show_payment()
User qiziqmasa → schedule_followup(24, "special_offer")
User "keyinroq" desa → schedule_followup(48, "reminder")

## MUHIM QOIDALAR

❌ QILMA:
- Agressiv sotma
- Yolg'on gapirma
- ${userMaxDiscount}% dan ortiq chegirma BERMA
- Bir xabar ichida ko'p savol berma
- Uzun matnlar yozma

✅ QIL:
- Userning muammosini tushun
- Empatiya ko'rsat
- Qiymat haqida gapir (narx emas)
- O'z vaqtida taklif qil
- Hazil qil (o'rinli bo'lsa)`;
}

/**
 * Calculate user engagement score (0-10)
 */
function calculateEngagementScore(user) {
  let score = 0;

  // Lessons watched
  score += (user.current_lesson || 0) * 2; // max 6

  // Tests passed
  if (user.test_1_passed) score += 1;
  if (user.test_2_passed) score += 1;
  if (user.test_3_passed) score += 1;

  // CustDev completed
  if (user.occupation) score += 0.5;
  if (user.income_level) score += 0.5;
  if (user.main_problem) score += 0.5;

  return Math.min(10, Math.round(score));
}

/**
 * Analyze buying intent
 */
function analyzeBuyingIntent(user) {
  const score = calculateEngagementScore(user);

  if (user.is_paid) return "SOTIB OLGAN";
  if (score >= 8) return "JUDA YUQORI - hozir taklif qil!";
  if (score >= 6) return "YUQORI - taklif qilish vaqti";
  if (score >= 4) return "O'RTA - qiziqtir, keyin taklif qil";
  if (score >= 2) return "PAST - avval qiymat ko'rsat";
  return "JUDA PAST - darslarni ko'rishga undash kerak";
}

/**
 * Get recommendation based on analysis
 */
function getRecommendation(user, engagement, intent) {
  if (user.is_paid) return "Upsell yoki referral so'ra";
  if (engagement >= 8) return "Hoziroq to'lov taklif qil, chegirma bilan";
  if (engagement >= 6) return "Narxlarni ko'rsat, qiziqishini tekshir";
  if (engagement >= 4) return "Muammosini so'ra, qiymat ko'rsat";
  return "Bepul darslarni ko'rishga undash";
}

/**
 * Calculate max discount for user
 */
function calculateUserMaxDiscount(user, globalMax) {
  let maxDiscount = globalMax;

  // Income-based adjustment
  if (user.income_level === '7-15 mln' || user.income_level === '15+ mln') {
    maxDiscount = Math.min(maxDiscount, 10);
  } else if (user.income_level === '3-7 mln') {
    maxDiscount = Math.min(maxDiscount, 15);
  } else if (user.income_level === '1-3 mln') {
    maxDiscount = Math.min(maxDiscount, 25);
  }

  // Budget-based adjustment
  if (user.budget_range === '500+ ming') {
    maxDiscount = Math.min(maxDiscount, 10);
  } else if (user.budget_range === '300-500 ming') {
    maxDiscount = Math.min(maxDiscount, 15);
  }

  return maxDiscount;
}

/**
 * Get conversation history
 */
async function getConversationHistory(telegramId, limit = 20) {
  try {
    const history = await db.getAIConversationHistory(telegramId, limit);
    return history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Save message to history
 */
async function saveMessage(telegramId, role, content) {
  try {
    await db.saveAIConversation(telegramId, role, content);
  } catch (e) {
    console.error('Failed to save AI conversation:', e.message);
  }
}

/**
 * Main function - chat with JARVIS
 */
export async function chatWithSalesAgent(telegramId, userMessage) {
  try {
    const user = await db.getUser(telegramId);
    if (!user) {
      return {
        success: false,
        message: "Iltimos, avval /start bosing.",
        action: null
      };
    }

    // Check if AI is enabled
    const aiEnabled = await db.getBotMessage('ai_sales_enabled');
    if (aiEnabled === 'false') {
      return {
        success: false,
        message: null,
        action: 'ai_disabled'
      };
    }

    // Build system prompt
    const systemPrompt = await buildSystemPrompt(user);

    // Get conversation history
    const history = await getConversationHistory(telegramId);

    // Save user message
    await saveMessage(telegramId, 'user', userMessage);

    // Build messages for Claude
    const messages = [
      ...history,
      { role: 'user', content: userMessage }
    ];

    // Call Claude
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      tools: AVAILABLE_TOOLS,
      messages: messages
    });

    // Process response
    let aiMessage = '';
    let action = null;
    let actionParams = {};

    for (const block of response.content) {
      if (block.type === 'text') {
        aiMessage += block.text;
      } else if (block.type === 'tool_use') {
        action = block.name;
        actionParams = block.input || {};
      }
    }

    // If no message but has action, generate one
    if (!aiMessage && action) {
      aiMessage = generateActionMessage(action, actionParams, user);
    }

    // Save AI response
    await saveMessage(telegramId, 'assistant', aiMessage);

    // Track offer if discount was given
    if (action === 'show_payment' && actionParams.discount > 0) {
      await db.updateUser(telegramId, {
        last_discount_offered: actionParams.discount,
        last_offer_at: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: aiMessage,
      action: action,
      params: actionParams
    };

  } catch (error) {
    console.error('JARVIS error:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.error('API Key exists:', !!process.env.tg_bot_claude);
    return {
      success: false,
      message: "Uzr, texnik nosozlik. Birozdan keyin qaytadan yozing.",
      action: null
    };
  }
}

/**
 * Generate message for action
 */
function generateActionMessage(action, params, user) {
  const name = user.full_name ? user.full_name.split(' ')[0] : '';

  switch (action) {
    case 'show_payment':
      if (params.discount > 0) {
        return `${name ? name + ', ' : ''}Sizga maxsus ${params.discount}% chegirma! Faqat bugun amal qiladi:`;
      }
      return "Mana to'lov havolasi:";

    case 'show_plans':
      return "Bizda quyidagi tariflar mavjud. Eng mashhuri - 3 oylik (15% tejaysiz):";

    case 'schedule_followup':
      return "Yaxshi, keyinroq yana gaplashamiz! Maxsus taklif tayyorlab qo'yaman.";

    default:
      return "";
  }
}

/**
 * Quick response check
 */
export async function quickResponse(userMessage) {
  const lower = userMessage.toLowerCase();

  if (lower.includes('narx') || lower.includes('qancha') || lower.includes('pul')) {
    return { quickMatch: true, suggestedAction: 'show_plans' };
  }

  if (lower.includes('chegirma') || lower.includes('skidka') || lower.includes('aksiya')) {
    return { quickMatch: true, suggestedAction: 'check_discount_eligibility' };
  }

  return { quickMatch: false };
}

export default {
  chatWithSalesAgent,
  quickResponse
};
