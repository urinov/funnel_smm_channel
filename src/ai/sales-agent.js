// AI Sales Agent - GPT-4o-mini with Function Calling
import OpenAI from 'openai';
import * as db from '../database.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Available actions AI can take
const AVAILABLE_TOOLS = [
  {
    type: "function",
    function: {
      name: "show_payment",
      description: "Show payment buttons with optional discount",
      parameters: {
        type: "object",
        properties: {
          plan: { type: "string", enum: ["1month", "3month", "6month", "1year"], description: "Subscription plan" },
          discount: { type: "number", description: "Discount percentage (0-30)" }
        },
        required: ["plan"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_plans",
      description: "Show all available subscription plans",
      parameters: {
        type: "object",
        properties: {
          highlight: { type: "string", description: "Which plan to highlight as recommended" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_lesson_info",
      description: "Send information about a specific lesson",
      parameters: {
        type: "object",
        properties: {
          lesson_number: { type: "number", description: "Lesson number (1-3)" }
        },
        required: ["lesson_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_followup",
      description: "Schedule a follow-up message for later",
      parameters: {
        type: "object",
        properties: {
          delay_hours: { type: "number", description: "Hours to wait before follow-up" },
          message_type: { type: "string", enum: ["reminder", "special_offer", "motivation"] }
        },
        required: ["delay_hours", "message_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "end_conversation",
      description: "Politely end the conversation without sales push",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Why ending conversation" }
        }
      }
    }
  }
];

/**
 * Build system prompt with user context and rules
 */
async function buildSystemPrompt(user) {
  // Get customizable prompt from database
  const basePrompt = await db.getBotMessage('ai_sales_prompt') || getDefaultPrompt();
  const discountRules = await db.getBotMessage('ai_discount_rules') || getDefaultDiscountRules();
  const maxDiscount = parseInt(await db.getBotMessage('ai_max_discount')) || 30;

  // Calculate max discount for this user based on their data
  const userMaxDiscount = calculateUserMaxDiscount(user, maxDiscount);

  return `${basePrompt}

=== USER MA'LUMOTLARI ===
Ismi: ${user.full_name || 'Noma\'lum'}
Telegram: @${user.username || 'yo\'q'}
Daromadi: ${user.income_level || 'Noma\'lum'}
Budgeti: ${user.budget_range || 'Noma\'lum'}
Ishi: ${user.occupation || 'Noma\'lum'}
Muammosi: ${user.main_problem || 'Noma\'lum'}
Oldingi kurslar: ${user.previous_courses || 'Noma\'lum'}
Ko'rgan darslar: ${user.current_lesson || 0}/3
Test natijalari: ${user.test_1_passed ? '1✓' : '1✗'} ${user.test_2_passed ? '2✓' : '2✗'} ${user.test_3_passed ? '3✓' : '3✗'}
To'lov: ${user.is_paid ? 'Sotib olgan' : 'Hali yo\'q'}
Rad etganmi: ${user.rejected_offers || 0} marta

=== CHEGIRMA QOIDALARI ===
${discountRules}

Bu user uchun MAKSIMUM chegirma: ${userMaxDiscount}%
Birinchi taklif: 0% (chegirmasiz)
Har bir rad etishda: +10% (max gacha)

=== MUHIM ===
- Faqat O'ZBEK tilida gapir
- "Siz" ishlatasan (hurmatli)
- Qisqa javoblar (3-4 qator max)
- Emoji kam (1-2 ta)
- Hech qachon ${userMaxDiscount}% dan ortiq chegirma BERMA`;
}

/**
 * Default sales prompt
 */
function getDefaultPrompt() {
  return `Sen professional SMM kurs sotuvchisisisan. Sening ismingni so'rashsa, Firdavs yordamchisi ekaningni ayt.

SENING VAZIFANG:
1. Userlar bilan do'stona muloqot qilish
2. Kurs haqida savollarga javob berish
3. E'tirozlarni yumshoq bartaraf qilish
4. To'g'ri vaqtda sotish taklif qilish

KURS HAQIDA:
- SMM (Social Media Marketing) kursi
- 50+ video dars
- Amaliy topshiriqlar
- Sertifikat
- Premium kanalga kirish
- Narx: 97,000 so'm/oy

MULOQOT QOIDALARI:
- Natural gapir, robot kabi emas
- Userning muammosini tushun
- Juda ko'p savol berma
- Agressiv sotma
- User tayyor bo'lganda taklif qil`;
}

/**
 * Default discount rules
 */
function getDefaultDiscountRules() {
  return `Daromad bo'yicha:
- "1 mln gacha" → max 30%
- "1-3 mln" → max 25%
- "3-7 mln" → max 15%
- "7+ mln" → max 10%

Budget bo'yicha:
- "50-100 ming" → max 30%
- "100-300 ming" → max 20%
- "300+ ming" → max 15%`;
}

/**
 * Calculate max discount for specific user
 */
function calculateUserMaxDiscount(user, globalMax) {
  let maxDiscount = globalMax;

  // Adjust based on income
  if (user.income_level === '7-15 mln' || user.income_level === '15+ mln') {
    maxDiscount = Math.min(maxDiscount, 10);
  } else if (user.income_level === '3-7 mln') {
    maxDiscount = Math.min(maxDiscount, 15);
  } else if (user.income_level === '1-3 mln') {
    maxDiscount = Math.min(maxDiscount, 25);
  }

  // Adjust based on budget
  if (user.budget_range === '500+ ming') {
    maxDiscount = Math.min(maxDiscount, 10);
  } else if (user.budget_range === '300-500 ming') {
    maxDiscount = Math.min(maxDiscount, 15);
  }

  return maxDiscount;
}

/**
 * Get conversation history from database
 */
async function getConversationHistory(telegramId, limit = 10) {
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
 * Save message to conversation history
 */
async function saveMessage(telegramId, role, content) {
  try {
    await db.saveAIConversation(telegramId, role, content);
  } catch (e) {
    console.error('Failed to save AI conversation:', e.message);
  }
}

/**
 * Main function - chat with AI sales agent
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

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];

    // Call OpenAI
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      tools: AVAILABLE_TOOLS,
      tool_choice: 'auto',
      max_tokens: 500,
      temperature: 0.7
    });

    const choice = response.choices[0];
    let aiMessage = choice.message.content || '';
    let action = null;
    let actionParams = {};

    // Check if AI called a function
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      action = toolCall.function.name;
      try {
        actionParams = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        actionParams = {};
      }

      // If no message but has action, generate a message
      if (!aiMessage && action) {
        aiMessage = await generateActionMessage(action, actionParams, user);
      }
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
    console.error('AI Sales Agent error:', error);
    return {
      success: false,
      message: "Uzr, texnik nosozlik. Birozdan keyin qaytadan yozing.",
      action: null
    };
  }
}

/**
 * Generate message for action if AI didn't provide one
 */
async function generateActionMessage(action, params, user) {
  switch (action) {
    case 'show_payment':
      if (params.discount > 0) {
        return `Sizga maxsus ${params.discount}% chegirma taqdim etaman! Quyidan to'lov qiling:`;
      }
      return "Mana to'lov havolasi:";

    case 'show_plans':
      return "Bizda quyidagi tariflar mavjud:";

    case 'send_lesson_info':
      return `${params.lesson_number}-dars haqida:`;

    case 'schedule_followup':
      return "Yaxshi, keyinroq yana gaplashamiz!";

    case 'end_conversation':
      return "Savollaringiz bo'lsa, bemalol yozing. Omad!";

    default:
      return "";
  }
}

/**
 * Quick response for common questions (without full AI call)
 */
export async function quickResponse(userMessage) {
  const lower = userMessage.toLowerCase();

  // Price questions
  if (lower.includes('narx') || lower.includes('qancha') || lower.includes('pul')) {
    return {
      quickMatch: true,
      suggestedAction: 'show_plans',
      suggestedMessage: "Kursimiz narxlari:"
    };
  }

  // Discount questions
  if (lower.includes('chegirma') || lower.includes('skidka') || lower.includes('aksiya')) {
    return {
      quickMatch: true,
      suggestedAction: 'check_discount_eligibility'
    };
  }

  return { quickMatch: false };
}

export default {
  chatWithSalesAgent,
  quickResponse
};
