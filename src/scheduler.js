// src/scheduler.js - Cron jobs: darslar, eslatmalar, obuna tekshirish
import cron from 'node-cron';
import * as db from './database.js';
import { bot, sendLesson, sendVideoPitch, sendSalesPitch, sendSoftAttack } from './bot.js';
import { sendRenewalReminder, handleExpiredSubscription } from './payments/paymentHandler.js';

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
const REPORT_TIMEZONE = 'Asia/Tashkent';
const BASE_URL = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/+$/, '') : '';
const SCHEDULER_VERBOSE = process.env.SCHEDULER_VERBOSE === 'true';

function isExpectedDeliveryError(message = '') {
  const m = String(message || '').toLowerCase();
  return m.includes('chat not found')
    || m.includes('bot was blocked by the user')
    || m.includes('user is deactivated')
    || m.includes('forbidden');
}

function formatMoney(t) {
  return (Number(t || 0) / 100).toLocaleString('uz-UZ') + " so'm";
}

async function sendDailyAdminReport() {
  try {
    const stats = await db.getDailyReportStats();
    const day = new Date().toLocaleDateString('uz-UZ', { timeZone: REPORT_TIMEZONE });

    // Calculate changes from yesterday
    const userChange = stats.newUsersToday - stats.newUsersYesterday;
    const userChangeIcon = userChange > 0 ? '📈' : userChange < 0 ? '📉' : '➡️';
    const revenueChange = stats.revenueToday - stats.revenueYesterday;
    const revenueChangeIcon = revenueChange > 0 ? '📈' : revenueChange < 0 ? '📉' : '➡️';

    // Conversion rate
    const conversionRate = stats.totalUsers > 0 ? ((stats.totalPaid / stats.totalUsers) * 100).toFixed(1) : 0;

    const latestUsersText = stats.recentNewUsers.length
      ? stats.recentNewUsers
          .slice(0, 5)
          .map((u, i) => {
            const name = u.full_name || u.username || String(u.telegram_id);
            return `${i + 1}. ${name}`;
          })
          .join('\n')
      : 'Bugun yangi user yo\'q';

    const report =
      `📊 <b>Kunlik hisobot (${day})</b>\n\n` +
      `<b>👥 USERLAR</b>\n` +
      `├ Bugun yangi: <b>${stats.newUsersToday}</b> ${userChangeIcon}\n` +
      `├ Jami: <b>${stats.totalUsers}</b>\n` +
      `├ Pullik: <b>${stats.totalPaid}</b>\n` +
      `└ Konversiya: <b>${conversionRate}%</b>\n\n` +
      `<b>📚 FUNNEL</b>\n` +
      `├ 1-dars: <b>${stats.funnel.lesson1}</b>\n` +
      `├ 2-dars: <b>${stats.funnel.lesson2}</b>\n` +
      `├ 3-dars: <b>${stats.funnel.lesson3}</b>\n` +
      `└ Pitch: <b>${stats.funnel.pitchSeen}</b>\n\n` +
      `<b>💰 DAROMAD</b>\n` +
      `├ Bugun: <b>${formatMoney(stats.revenueToday)}</b> ${revenueChangeIcon}\n` +
      `├ To'lovlar: <b>${stats.successfulPaymentsToday}</b>\n` +
      `└ Yangi obunalar: <b>${stats.newSubscriptionsToday}</b>\n\n` +
      `<b>📈 FAOLLIK</b>\n` +
      `├ Aktiv userlar: <b>${stats.activeUsersToday}</b>\n` +
      `├ Xabarlar: <b>${stats.messagesToday}</b>\n` +
      `├ Referallar: <b>${stats.referrals.today}</b>/${stats.referrals.total}\n` +
      `└ Feedback: ✅${stats.feedbackPositiveToday} / ❌${stats.feedbackNegativeToday}\n\n` +
      `<b>🆕 Yangi userlar:</b>\n${latestUsersText}`;

    for (const adminId of ADMIN_IDS) {
      try {
        await bot.telegram.sendMessage(adminId, report, { parse_mode: 'HTML' });
      } catch (e) {
        console.error(`Daily report send error (${adminId}):`, e.message);
      }
    }
  } catch (e) {
    console.error('sendDailyAdminReport error:', e);
  }
}

// ==================== PROCESS SCHEDULED MESSAGES ====================
async function processScheduledMessages() {
  try {
    const messages = await db.getPendingScheduledMessages();
    
    for (const msg of messages) {
      try {
        const { telegram_id, message_type, data } = msg;
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        if (SCHEDULER_VERBOSE) {
          console.log(`Processing scheduled message: ${message_type} for ${telegram_id}`);
        }

        if (message_type.startsWith('payment_reminder_')) {
          const orderId = parsedData?.order_id;
          if (!orderId) {
            await db.markScheduledMessageSent(msg.id);
            continue;
          }

          const payment = await db.getPaymentByOrderId(orderId);
          if (!payment || ['performed', '2', 'cancelled', '-1', '-2'].includes(String(payment.state))) {
            await db.cancelPaymentReminders(telegram_id, orderId);
            await db.markScheduledMessageSent(msg.id);
            continue;
          }

          const user = await db.getUser(telegram_id);
          const userName = user?.full_name?.split(' ')[0] || "do'st";
          const textTemplate = parsedData?.text || "To'lovni yakunlash uchun quyidagi tugmani bosing.";
          const text = textTemplate
            .replace(/\{\{ism\}\}/gi, userName)
            .replace(/\{\{tg\}\}/gi, String(telegram_id));

          const paymeUrl = BASE_URL
            ? `${BASE_URL}/payme/api/checkout-url?order_id=${encodeURIComponent(orderId)}&amount=${payment.amount}&plan=${encodeURIComponent(payment.plan_id || '1month')}&redirect=1`
            : null;
          const clickUrl = BASE_URL
            ? `${BASE_URL}/click/api/checkout-url?order_id=${encodeURIComponent(orderId)}&amount=${payment.amount}&plan=${encodeURIComponent(payment.plan_id || '1month')}&redirect=1`
            : null;

          const inlineKeyboard = [];
          if (paymeUrl) inlineKeyboard.push({ text: "💳 Payme orqali to'lash", url: paymeUrl });
          if (clickUrl) inlineKeyboard.push({ text: "💠 Click orqali to'lash", url: clickUrl });

          try {
            await bot.telegram.sendMessage(telegram_id, text, {
              parse_mode: 'HTML',
              ...(inlineKeyboard.length > 0
                ? { reply_markup: { inline_keyboard: [inlineKeyboard] } }
                : {})
            });
          } catch (e) {
            if (isExpectedDeliveryError(e.message)) {
              console.warn(`payment reminder skipped for ${telegram_id}: ${e.message}`);
              await db.cancelPaymentReminders(telegram_id, orderId);
            } else {
              throw e;
            }
          }

          await db.markScheduledMessageSent(msg.id);
          await new Promise(r => setTimeout(r, 100));
          continue;
        }

        switch (message_type) {
          case 'lesson':
            const lessonNumber = parsedData?.lesson_number;
            if (lessonNumber) {
              await sendLesson(telegram_id, lessonNumber);
            }
            break;

          case 'broadcast_delete':
            if (parsedData?.message_id) {
              try {
                if (parsedData?.delete_if_unpaid) {
                  const u = await db.getUser(telegram_id);
                  if (u?.is_paid) break;
                }
                await bot.telegram.deleteMessage(telegram_id, parsedData.message_id);
              } catch (e) {
                console.log(`broadcast_delete skip for ${telegram_id}:`, e.message);
              }
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
    // 10 days reminder
    const expiring10Days = await db.getExpiringSubscriptions(10);
    for (const sub of expiring10Days) {
      try {
        await sendRenewalReminder(sub.telegram_id, 10, sub.id);
        await db.markReminderSent(sub.id, '10d');
        console.log(`Sent 10-day reminder to ${sub.telegram_id}`);
      } catch (e) {
        console.error(`10-day reminder error for ${sub.telegram_id}:`, e.message);
      }
    }

    // 7 days reminder (o'zgartirdim: 5 -> 7)
    const expiring7Days = await db.getExpiringSubscriptions(7);
    for (const sub of expiring7Days) {
      try {
        await sendRenewalReminder(sub.telegram_id, 7, sub.id);
        await db.markReminderSent(sub.id, '7d');
        console.log(`Sent 7-day reminder to ${sub.telegram_id}`);
      } catch (e) {
        console.error(`7-day reminder error for ${sub.telegram_id}:`, e.message);
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

// ==================== CHECK UNWATCHED LESSONS (Inactivity Reminders) ====================
async function checkUnwatchedLessons() {
  try {
    // Check if feature is enabled
    const enabled = await db.getSetting('inactivity_reminder_enabled');
    if (enabled !== 'true') return;

    // 1-eslatma: 60 daqiqadan keyin (1 soat)
    const unwatched1h = await db.getUnwatchedLessons(60, 1);
    for (const delivery of unwatched1h) {
      try {
        const reminderText = await db.getBotMessage('inactivity_reminder_1') ||
          "👋 Hey! Darsni hali ko'rmadingizmi? Davom eting, siz zo'rsiz!";

        await bot.telegram.sendMessage(delivery.telegram_id, reminderText, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: "▶️ Davom etish", callback_data: `resume_lesson_${delivery.funnel_id}_${delivery.lesson_number}` }
            ]]
          }
        });
        await db.markLessonReminder1Sent(delivery.id);
        console.log(`Sent 1h inactivity reminder to ${delivery.telegram_id} for lesson ${delivery.lesson_number}`);
      } catch (e) {
        console.error(`1h reminder error for ${delivery.telegram_id}:`, e.message);
        // Still mark as sent to avoid spam
        await db.markLessonReminder1Sent(delivery.id);
      }
    }

    // 2-eslatma: 180 daqiqadan keyin (3 soat)
    const unwatched3h = await db.getUnwatchedLessons(180, 2);
    for (const delivery of unwatched3h) {
      try {
        const reminderText = await db.getBotMessage('inactivity_reminder_2') ||
          "📚 Dars sizni kutmoqda! Nimaga to'xtab qoldingiz? Davom eting!";

        await bot.telegram.sendMessage(delivery.telegram_id, reminderText, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: "▶️ Davom etish", callback_data: `resume_lesson_${delivery.funnel_id}_${delivery.lesson_number}` }
            ]]
          }
        });
        await db.markLessonReminder2Sent(delivery.id);
        console.log(`Sent 3h inactivity reminder to ${delivery.telegram_id} for lesson ${delivery.lesson_number}`);
      } catch (e) {
        console.error(`3h reminder error for ${delivery.telegram_id}:`, e.message);
        await db.markLessonReminder2Sent(delivery.id);
      }
    }
  } catch (e) {
    console.error('checkUnwatchedLessons error:', e);
  }
}

// ==================== REFERRAL OFFER (24h after sales pitch) ====================
async function sendReferralOffers() {
  try {
    const enabled = await db.getSetting('referral_enabled');
    if (enabled !== 'true') return;

    const referralOfferEnabled = await db.getSetting('referral_offer_enabled');
    if (referralOfferEnabled === 'false') return;

    const hoursDelay = parseInt(await db.getSetting('referral_offer_delay_hours') || '24');
    const users = await db.getUsersForReferralOffer(hoursDelay);

    if (users.length === 0) return;

    const discountPercent = parseInt(await db.getSetting('referral_discount_percent') || '50');
    const requiredCount = parseInt(await db.getSetting('referral_required_count') || '3');

    let offerMessage = await db.getBotMessage('referral_offer_message');
    if (!offerMessage) {
      offerMessage = `🎁 <b>Sizga maxsus taklif!</b>\n\n` +
        `Hozirgi tariflarni <b>${discountPercent}% chegirmada</b> olishingiz mumkin!\n\n` +
        `Buning uchun <b>${requiredCount} ta do'stingizni</b> quyidagi referal havolangiz orqali chaqiring.\n\n` +
        `Ular botdan ro'yxatdan o'tib, birinchi darsni ko'rishni boshlashganda siz chegirmaga ega bo'lasiz! 🎉`;
    }

    const botInfo = await bot.telegram.getMe();

    for (const user of users) {
      try {
        // Generate referral code for user
        const code = await db.generateReferralCode(user.telegram_id);
        const refLink = `https://t.me/${botInfo.username}?start=ref_${code}`;

        const personalMessage = offerMessage
          .replace(/\{\{ism\}\}/gi, user.full_name?.split(' ')[0] || "do'st")
          .replace(/\{\{chegirma\}\}/gi, discountPercent)
          .replace(/\{\{kerakli_odam\}\}/gi, requiredCount);

        await bot.telegram.sendMessage(user.telegram_id,
          personalMessage + `\n\n🔗 <b>Sizning referal havolangiz:</b>\n<code>${refLink}</code>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📊 Statistikam', callback_data: 'check_my_referrals' }],
                [{ text: '💳 Sotib olish', callback_data: 'buy_now' }]
              ]
            }
          }
        );

        await db.markReferralOfferSent(user.telegram_id);
        console.log(`Referral offer sent to ${user.telegram_id}`);

        // Small delay between messages
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Referral offer error for ${user.telegram_id}:`, e.message);
        // Still mark as sent to avoid spam
        await db.markReferralOfferSent(user.telegram_id);
      }
    }
  } catch (e) {
    console.error('sendReferralOffers error:', e);
  }
}

// ==================== START SCHEDULER ====================
export function startScheduler() {
  console.log('🕐 Starting scheduler...');

  db.cleanupStalePaymentReminders(14)
    .then((n) => {
      if (n > 0) console.log(`🧹 Cleaned stale payment reminders: ${n}`);
    })
    .catch((e) => console.error('cleanupStalePaymentReminders error:', e.message));

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

  // Har 10 daqiqada dars ko'rmagan userlarga eslatma yuborish
  cron.schedule('*/10 * * * *', () => {
    checkUnwatchedLessons();
  });

  // Har soatda referral takliflarini tekshirish (24 soatdan keyin)
  cron.schedule('0 * * * *', () => {
    console.log('Running referral offers check...');
    sendReferralOffers();
  });

  // Har kuni 23:00 da adminlarga kunlik to'liq otchot
  cron.schedule('0 23 * * *', () => {
    console.log('Running daily admin report...');
    sendDailyAdminReport();
  }, { timezone: REPORT_TIMEZONE });

  console.log('✅ Scheduler started:');
  console.log('   - Scheduled messages: every minute');
  console.log('   - Subscription reminders: daily at 9:00');
  console.log('   - Expired subscriptions: every 5 minutes');
  console.log('   - Inactivity reminders: every 10 minutes');
  console.log('   - Referral offers: every hour');
  console.log(`   - Daily admin report: 23:00 (${REPORT_TIMEZONE})`);
}

export { processScheduledMessages, checkSubscriptionReminders, checkExpiredSubscriptions, checkUnwatchedLessons, sendDailyAdminReport, sendReferralOffers };
