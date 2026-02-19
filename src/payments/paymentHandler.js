// src/payments/paymentHandler.js - Subscription management
import * as db from '../database.js';
import { bot } from '../bot.js';

const BASE_URL = process.env.BASE_URL;

function formatMoney(tiyin) {
  const sum = tiyin / 100;
  return sum.toLocaleString('uz-UZ') + " so'm";
}

// Replace variables in message
async function replaceVars(text, user) {
  if (!text) return '';
  const sub = await db.getActiveSubscription(user.telegram_id);
  let endDateStr = '';
  if (sub && sub.end_date) {
    const endDate = new Date(sub.end_date);
    endDateStr = endDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  
  return text
    .replace(/\{\{ism\}\}/gi, user?.full_name?.split(' ')[0] || "do'st")
    .replace(/\{\{fio\}\}/gi, user?.full_name || "do'st")
    .replace(/\{\{tugash_sanasi\}\}/gi, endDateStr)
    .replace(/\{\{username\}\}/gi, user?.username ? '@' + user.username : '');
}

// ==================== RENEWAL REMINDER ====================
export async function sendRenewalReminder(telegramId, daysLeft, subscriptionId) {
  try {
    const user = await db.getUser(telegramId);
    if (!user) return;

    // Get message template from database
    const reminderKey = `reminder_${daysLeft}d`;
    let message = await db.getBotMessage(reminderKey);
    
    if (!message) {
      // Default messages
      if (daysLeft === 10) {
        message = `📅 Hurmatli {{ism}}, premium kanaldagi obunangiz tugashiga <b>10 kun</b> qoldi.\n\nObunani uzaytirish uchun quyidagi tugmalardan birini tanlang:`;
      } else if (daysLeft === 5) {
        message = `⏰ Hurmatli {{ism}}, obunangiz tugashiga <b>5 kun</b> qoldi!\n\nObunani uzaytirish uchun quyidagi tugmani bosing:`;
      } else if (daysLeft === 3) {
        message = `⚠️ Hurmatli {{ism}}, obunangiz tugashiga <b>3 kun</b> qoldi!\n\nPremium kanalga kirishni davom ettirish uchun obunani uzaytiring:`;
      } else {
        message = `🚨 Hurmatli {{ism}}, obunangiz <b>ERTAGA</b> tugaydi!\n\nKanaldan chiqarib yuborilmaslik uchun hoziroq uzaytiring:`;
      }
    }
    
    message = await replaceVars(message, user);

    // Get plans for extend buttons
    const plans = await db.getSubscriptionPlans(true);
    const planButtons = plans.map(plan => {
      const priceFormatted = formatMoney(plan.price);
      const discount = plan.discount_percent > 0 ? ` (-${plan.discount_percent}%)` : '';
      return [{ text: `${plan.name} - ${priceFormatted}${discount}`, callback_data: `extend_${plan.id}` }];
    });

    await bot.telegram.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          ...planButtons,
          [{ text: '❓ Yordam', callback_data: 'question' }]
        ]
      }
    });

    console.log(`Renewal reminder (${daysLeft} days) sent to ${telegramId}`);

  } catch (e) {
    console.error(`sendRenewalReminder error for ${telegramId}:`, e);
    throw e;
  }
}

// ==================== HANDLE EXPIRED SUBSCRIPTION ====================
export async function handleExpiredSubscription(subscription) {
  try {
    const telegramId = subscription.telegram_id;

    // Deactivate subscription
    await db.deactivateSubscription(subscription.id);

    // Update user status
    await db.updateUserAdmin(telegramId, { is_paid: false });

    // Kick from channel (dynamic import to avoid circular dependency)
    try {
      const { kickFromChannel } = await import('../bot.js');
      await kickFromChannel(telegramId);
    } catch (e) {
      console.error('Failed to kick from channel:', e.message);
    }

    // Send notification
    const user = await db.getUser(telegramId);
    
    // Get message from database
    let message = await db.getBotMessage('reminder_expired');
    if (!message) {
      message = `❌ Hurmatli {{ism}}, obunangiz tugadi.\n\nPremium kanalga kirish to'xtatildi.\n\nQayta obuna bo'lish uchun:`;
    }
    
    message = await replaceVars(message, user);

    // Get plans for buttons
    const plans = await db.getSubscriptionPlans(true);
    const planButtons = plans.map(plan => {
      const priceFormatted = formatMoney(plan.price);
      return [{ text: `${plan.name} - ${priceFormatted}`, callback_data: `plan_${plan.id}` }];
    });

    await bot.telegram.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          ...planButtons,
          [{ text: '❓ Yordam', callback_data: 'question' }]
        ]
      }
    });

    console.log(`Expired subscription notification sent to ${telegramId}`);

  } catch (e) {
    console.error(`handleExpiredSubscription error:`, e);
    throw e;
  }
}

export default {
  sendRenewalReminder,
  handleExpiredSubscription
};
