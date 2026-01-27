// src/scheduler.js - Cron jobs: darslar, eslatmalar, obuna tekshirish
import cron from 'node-cron';
import * as db from './database.js';
import { bot, sendLesson, sendVideoPitch, sendSalesPitch, sendSoftAttack } from './bot.js';
import { sendRenewalReminder, handleExpiredSubscription } from './payments/paymentHandler.js';

// ==================== PROCESS SCHEDULED MESSAGES ====================
async function processScheduledMessages() {
  try {
    const messages = await db.getPendingScheduledMessages();
    
    for (const msg of messages) {
      try {
        const { telegram_id, message_type, data } = msg;
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        console.log(`Processing scheduled message: ${message_type} for ${telegram_id}`);

        switch (message_type) {
          case 'lesson':
            const lessonNumber = parsedData?.lesson_number;
            if (lessonNumber) {
              await sendLesson(telegram_id, lessonNumber);
            }
            break;

          case 'video_pitch':
            await sendVideoPitch(telegram_id);
            break;

          case 'sales_pitch':
            await sendSalesPitch(telegram_id);
            break;

          case 'soft_attack':
            await sendSoftAttack(telegram_id);
            break;

          default:
            console.log(`Unknown message type: ${message_type}`);
        }

        await db.markScheduledMessageSent(msg.id);
        await new Promise(r => setTimeout(r, 100));
        
      } catch (e) {
        console.error(`Error processing scheduled message ${msg.id}:`, e.message);
        await db.markScheduledMessageSent(msg.id);
      }
    }
  } catch (e) {
    console.error('processScheduledMessages error:', e);
  }
}

// ==================== CHECK SUBSCRIPTION REMINDERS ====================
async function checkSubscriptionReminders() {
  try {
    // 5 days reminder
    const expiring5Days = await db.getExpiringSubscriptions(5);
    for (const sub of expiring5Days) {
      try {
        await sendRenewalReminder(sub.telegram_id, 5, sub.id);
        await db.markReminderSent(sub.id, '5d');
        console.log(`Sent 5-day reminder to ${sub.telegram_id}`);
      } catch (e) {
        console.error(`5-day reminder error for ${sub.telegram_id}:`, e.message);
      }
    }

    // 3 days reminder
    const expiring3Days = await db.getExpiringSubscriptions(3);
    for (const sub of expiring3Days) {
      try {
        await sendRenewalReminder(sub.telegram_id, 3, sub.id);
        await db.markReminderSent(sub.id, '3d');
        console.log(`Sent 3-day reminder to ${sub.telegram_id}`);
      } catch (e) {
        console.error(`3-day reminder error for ${sub.telegram_id}:`, e.message);
      }
    }

    // 1 day reminder
    const expiring1Day = await db.getExpiringSubscriptions(1);
    for (const sub of expiring1Day) {
      try {
        await sendRenewalReminder(sub.telegram_id, 1, sub.id);
        await db.markReminderSent(sub.id, '1d');
        console.log(`Sent 1-day reminder to ${sub.telegram_id}`);
      } catch (e) {
        console.error(`1-day reminder error for ${sub.telegram_id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('checkSubscriptionReminders error:', e);
  }
}

// ==================== CHECK EXPIRED SUBSCRIPTIONS ====================
async function checkExpiredSubscriptions() {
  try {
    const expired = await db.getExpiredSubscriptions();
    
    for (const sub of expired) {
      try {
        await handleExpiredSubscription(sub);
        console.log(`Handled expired subscription for ${sub.telegram_id}`);
      } catch (e) {
        console.error(`Expired subscription error for ${sub.telegram_id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('checkExpiredSubscriptions error:', e);
  }
}

// ==================== START SCHEDULER ====================
export function startScheduler() {
  console.log('🕐 Starting scheduler...');

  // Har daqiqada scheduled messages ni tekshirish
  cron.schedule('* * * * *', () => {
    processScheduledMessages();
  });

  // Har kuni ertalab 9:00 da obuna eslatmalarini tekshirish
  cron.schedule('0 9 * * *', () => {
    console.log('Running subscription reminders check...');
    checkSubscriptionReminders();
  });

  // Har kuni yarim tunda muddati o'tganlarni tekshirish
  cron.schedule('0 0 * * *', () => {
    console.log('Running expired subscriptions check...');
    checkExpiredSubscriptions();
  });

  // Har 5 daqiqada ham muddati o'tganlarni tekshirish (real-time uchun)
  cron.schedule('*/5 * * * *', () => {
    checkExpiredSubscriptions();
  });

  console.log('✅ Scheduler started:');
  console.log('   - Scheduled messages: every minute');
  console.log('   - Subscription reminders: daily at 9:00');
  console.log('   - Expired subscriptions: every 5 minutes');
}

export { processScheduledMessages, checkSubscriptionReminders, checkExpiredSubscriptions };
