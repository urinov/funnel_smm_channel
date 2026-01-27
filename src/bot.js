import { Telegraf, Markup } from 'telegraf';
import * as db from './database.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.BASE_URL;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
const DEFAULT_PRICE = parseInt(process.env.SUBSCRIPTION_PRICE || '9700000');
const PREMIUM_CHANNEL_ID = process.env.PREMIUM_CHANNEL_ID; // e.g., -1001234567890

if (!BOT_TOKEN) throw new Error('BOT_TOKEN kerak');

export const bot = new Telegraf(BOT_TOKEN);

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const isAdmin = (id) => ADMIN_IDS.includes(id);
const formatMoney = (t) => (t / 100).toLocaleString('uz-UZ') + " so'm";

// Get subscription price from database (legacy - for default)
async function getSubscriptionPrice() {
  try {
    const priceStr = await db.getBotMessage('subscription_price');
    return priceStr ? parseInt(priceStr) : DEFAULT_PRICE;
  } catch (e) {
    return DEFAULT_PRICE;
  }
}

// Create one-time invite link for premium channel
export async function createInviteLink(telegramId, daysValid = 1, subscriptionId = null) {
  // Try dashboard setting first, then env var
  const channelId = await db.getSetting('premium_channel_id') || PREMIUM_CHANNEL_ID || await db.getBotMessage('premium_channel_id');
  
  if (!channelId) {
    console.log('❌ PREMIUM_CHANNEL_ID not set (check Dashboard > Kanal sozlamalari)');
    return null;
  }
  
  try {
    const expireDate = Math.floor(Date.now() / 1000) + (daysValid * 24 * 60 * 60);
    
    const inviteLink = await bot.telegram.createChatInviteLink(channelId, {
      member_limit: 1,
      expire_date: expireDate,
      name: `User_${telegramId}_${Date.now()}`
    });
    
    // Save invite link to database for tracking
    await db.saveInviteLink(telegramId, inviteLink.invite_link, subscriptionId);
    
    console.log('✅ Created invite link for', telegramId, ':', inviteLink.invite_link);
    return inviteLink.invite_link;
  } catch (e) {
    console.error('❌ Failed to create invite link:', e.message);
    // Fallback to saved static link
    const fallbackLink = await db.getSetting('premium_channel_link') || await db.getBotMessage('premium_channel_link');
    return fallbackLink;
  }
}

// Kick user from channel (when subscription expires)
export async function kickFromChannel(telegramId) {
  const channelId = await db.getSetting('premium_channel_id') || PREMIUM_CHANNEL_ID || await db.getBotMessage('premium_channel_id');
  
  if (!channelId) {
    console.log('❌ Cannot kick - channel ID not set');
    return false;
  }
  
  try {
    await bot.telegram.banChatMember(channelId, telegramId);
    // Immediately unban so they can rejoin later
    await bot.telegram.unbanChatMember(channelId, telegramId);
    console.log('✅ Kicked user from channel:', telegramId);
    return true;
  } catch (e) {
    console.error('❌ Failed to kick user:', e.message);
    return false;
  }
}

async function replaceVars(text, user) {
  if (!text) return '';
  const price = await getSubscriptionPrice();
  return text
    .replace(/\{\{fio\}\}/gi, user?.full_name || "do'st")
    .replace(/\{\{ism\}\}/gi, user?.full_name?.split(' ')[0] || "do'st")
    .replace(/\{\{telefon\}\}/gi, user?.phone || '')
    .replace(/\{\{username\}\}/gi, user?.username ? '@' + user.username : '')
    .replace(/\{\{yosh\}\}/gi, user?.age_group || '')
    .replace(/\{\{kasb\}\}/gi, user?.occupation || '')
    .replace(/\{\{daromad\}\}/gi, user?.income_level || '')
    .replace(/\{\{dars\}\}/gi, String(user?.current_lesson || 0))
    .replace(/\{\{price\}\}/gi, formatMoney(price));
}

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Admin huquqi yoq');
  await ctx.reply(`🔐 Admin Panel\n\n/stats - Statistika\n/resetme - Reset qilish\n/testpitch - Pitch ni test qilish\n/testsales - To'lov tugmalarini test qilish\n\n📊 Dashboard: ${BASE_URL}/admin.html`, { parse_mode: 'HTML' });
});

bot.command('testpitch', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.reply('📤 Pitch yuborilmoqda...');
  await sendVideoPitch(ctx.from.id);
});

bot.command('testsales', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.reply('📤 To\'lov tugmalari yuborilmoqda...');
  await sendSalesPitch(ctx.from.id);
});

bot.command('resetme', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  try {
    await db.deleteUser(ctx.from.id);
    await ctx.reply('✅ Reset qilindi. /start bosing.');
  } catch (e) {
    console.error('Reset error:', e.message);
    await ctx.reply('❌ Xatolik: ' + e.message);
  }
});

bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const s = await db.getFullStats();
  await ctx.reply(`Statistika\n\nJami: ${s.total_users}\nPremium: ${s.paid_users}\nBugun: +${s.today_users}\n\nOylik: ${formatMoney(parseInt(s.monthly_revenue) || 0)}`, { parse_mode: 'HTML' });
});

bot.start(async (ctx) => {
  try {
    const tgUser = ctx.from;
    const telegramId = tgUser.id;
    let user = await db.getUser(telegramId);

    if (!user) {
      user = await db.createUser(telegramId, tgUser.username, null);
      const welcome = await db.getBotMessage('welcome') || 'Assalomu alaykum! SMM kursga xush kelibsiz!';
      await ctx.reply(welcome, { parse_mode: 'HTML' });
      await delay(500);
      const askName = await db.getBotMessage('ask_name') || 'Ism-familiyangizni kiriting:';
      await ctx.reply(askName, { parse_mode: 'HTML' });
      await db.updateUser(telegramId, { custdev_step: -1, funnel_step: 0 });
      return;
    }

    if (user.custdev_step === -1) {
      const askName = await db.getBotMessage('ask_name') || 'Ism-familiyangizni kiriting:';
      return ctx.reply(askName, { parse_mode: 'HTML' });
    }

    if (user.custdev_step === -2) {
      const askPhone = await db.getBotMessage('ask_phone') || 'Telefon raqamingizni yuboring:';
      return ctx.reply(askPhone, {
        parse_mode: 'HTML',
        ...Markup.keyboard([[Markup.button.contactRequest('Telefon yuborish')]]).resize().oneTime()
      });
    }

    if (user.funnel_step > 0) {
      return ctx.reply(`Qaytganingiz bilan, ${user.full_name || "do'st"}!\n\nSiz ${user.current_lesson || 0}-darsdasiz.\nDavom etish: /continue`);
    }

    await startLessons(telegramId);
  } catch (e) {
    console.error('Start error:', e);
    await ctx.reply('Xatolik. /start bosing.');
  }
});

bot.on('contact', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const user = await db.getUser(telegramId);
    if (!user || user.custdev_step !== -2) return;

    const phone = ctx.message.contact.phone_number;
    await db.updateUser(telegramId, { phone, custdev_step: 0, funnel_step: 1 });

    let msg = await db.getBotMessage('registration_done') || 'Rahmat! Dars yuborilmoqda...';
    msg = await replaceVars(msg, { ...user, phone });
    await ctx.reply(msg, { parse_mode: 'HTML', ...Markup.removeKeyboard() });

    await delay(2000);
    await sendLesson(telegramId, 1);
  } catch (e) {
    console.error('Contact error:', e);
  }
});

bot.on('text', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    const user = await db.getUser(telegramId);
    if (!user) return;

    // Check if waiting for feedback
    if (user.waiting_feedback) {
      // Save feedback
      await db.saveFeedback(telegramId, 'disliked', text);
      await db.updateUser(telegramId, { waiting_feedback: false });
      
      await ctx.reply(
`✅ Rahmat fikringiz uchun!

Biz sizning fikringizni inobatga olamiz va yaxshilanishga harakat qilamiz.

Agar keyinchalik fikringiz o'zgarsa, kurslarimizga qaytishingiz mumkin! 🙌`,
        { parse_mode: 'HTML' }
      );
      
      console.log(`📝 Feedback saved from ${telegramId}: ${text}`);
      return;
    }

    const step = user.custdev_step;

    if (step === -1) {
      if (text.length < 2) return ctx.reply('Toliq ismingizni kiriting.');
      await db.updateUser(telegramId, { full_name: text, custdev_step: -2 });
      const askPhone = await db.getBotMessage('ask_phone') || 'Rahmat! Telefon raqamingizni yuboring:';
      await ctx.reply(await replaceVars(askPhone, { full_name: text }), {
        parse_mode: 'HTML',
        ...Markup.keyboard([[Markup.button.contactRequest('Telefon yuborish')]]).resize().oneTime()
      });
      return;
    }

    if (step === -2) {
      const clean = text.replace(/[\s\-\(\)]/g, '');
      if (!/^[\+]?[0-9]{9,15}$/.test(clean)) {
        return ctx.reply('Telefon formatini tekshiring.', Markup.keyboard([[Markup.button.contactRequest('Telefon yuborish')]]).resize().oneTime());
      }
      await db.updateUser(telegramId, { phone: clean, custdev_step: 0, funnel_step: 1 });
      let msg = await db.getBotMessage('registration_done') || 'Rahmat! Dars yuborilmoqda...';
      await ctx.reply(await replaceVars(msg, user), { parse_mode: 'HTML', ...Markup.removeKeyboard() });
      await delay(2000);
      await sendLesson(telegramId, 1);
      return;
    }

    if (step > 0) {
      const q = await db.getCustDevQuestion(step);
      if (q && q.question_type === 'text') {
        if (q.field_name) await db.updateUser(telegramId, { [q.field_name]: text });
        await db.saveCustDevAnswer(telegramId, q.id, text);
        await ctx.reply('Rahmat!');
        await delay(500);
        await askNextQuestion(telegramId, step);
        return;
      }
    }

    if (user.funnel_step > 0 && user.funnel_step < 10 && !isAdmin(telegramId)) {
      await ctx.reply('Darslar davom etmoqda...');
    }
  } catch (e) {
    console.error('Text error:', e);
  }
});

async function startLessons(telegramId) {
  await db.updateUser(telegramId, { funnel_step: 1 });
  await delay(1000);
  await sendLesson(telegramId, 1);
}

export async function sendLesson(telegramId, lessonNumber) {
  const lesson = await db.getLesson(lessonNumber);
  if (!lesson) {
    console.log('Lesson not found:', lessonNumber);
    return;
  }

  const header = lessonNumber + '-DARS: ' + lesson.title + '\n\n';
  const content = lesson.content || '';
  const caption = header + content;

  try {
    if (lesson.video_file_id) {
      await bot.telegram.sendVideo(telegramId, lesson.video_file_id, { caption, parse_mode: 'HTML' });
    } else if (lesson.image_file_id) {
      await bot.telegram.sendPhoto(telegramId, lesson.image_file_id, { caption, parse_mode: 'HTML' });
    } else if (lesson.audio_file_id) {
      await bot.telegram.sendVoice(telegramId, lesson.audio_file_id, { caption, parse_mode: 'HTML' });
    } else {
      await bot.telegram.sendMessage(telegramId, caption, { parse_mode: 'HTML' });
    }
  } catch (e) {
    console.error('Send lesson error:', e);
    await bot.telegram.sendMessage(telegramId, caption, { parse_mode: 'HTML' });
  }

  await db.updateUser(telegramId, { current_lesson: lessonNumber, funnel_step: lessonNumber + 1, custdev_step: 0 });

  if (lesson.show_watched_button !== false) {
    await delay(1000);
    const btnText = lesson.watched_button_text || 'Videoni korib boldim';
    const msg = lesson.watched_message || 'Videoni korib bolganingizdan keyin tugmani bosing:';
    await bot.telegram.sendMessage(telegramId, msg, {
      ...Markup.inlineKeyboard([[Markup.button.callback(btnText, 'watched_' + lessonNumber)]])
    });
  } else {
    const totalLessons = await db.getLessonsCount();
    await delay(3000);
    if (lessonNumber < totalLessons) await startCustDev(telegramId, lessonNumber);
    else await schedulePostLesson(telegramId);
  }
}

bot.action(/^watched_(\d+)$/, async (ctx) => {
  try {
    const lessonNumber = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id;
    const totalLessons = await db.getLessonsCount();

    await ctx.answerCbQuery('Ajoyib!');
    await ctx.editMessageReplyMarkup(undefined);

    if (lessonNumber < totalLessons) {
      await delay(1000);
      await startCustDev(telegramId, lessonNumber);
    } else {
      await schedulePostLesson(telegramId);
    }
  } catch (e) {
    console.error('Watched error:', e);
  }
});

async function startCustDev(telegramId, afterLesson) {
  const questions = await db.getCustDevQuestionsForLesson(afterLesson);
  if (!questions || !questions.length) {
    await scheduleNextLesson(telegramId);
    return;
  }

  const intro = await db.getBotMessage('custdev_intro_' + afterLesson);
  if (intro) {
    await bot.telegram.sendMessage(telegramId, intro);
    await delay(1000);
  }

  await askQuestion(telegramId, questions[0].step);
}

async function askQuestion(telegramId, step) {
  const q = await db.getCustDevQuestion(step);
  if (!q) {
    await scheduleNextLesson(telegramId);
    return;
  }

  await db.updateUser(telegramId, { custdev_step: step });

  if (q.question_type === 'buttons' && q.options) {
    const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
    const buttons = opts.map(opt => [Markup.button.callback(opt, 'cd_' + step + '_' + opt)]);
    await bot.telegram.sendMessage(telegramId, q.question_text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  } else {
    await bot.telegram.sendMessage(telegramId, q.question_text, { parse_mode: 'HTML' });
  }
}

async function askNextQuestion(telegramId, currentStep) {
  const user = await db.getUser(telegramId);
  const questions = await db.getCustDevQuestionsForLesson(user.current_lesson);
  if (!questions) {
    await scheduleNextLesson(telegramId);
    return;
  }

  const idx = questions.findIndex(q => q.step === currentStep);
  const next = questions[idx + 1];
  if (next) await askQuestion(telegramId, next.step);
  else await scheduleNextLesson(telegramId);
}

bot.action(/^cd_(\d+)_(.+)$/, async (ctx) => {
  try {
    const step = parseInt(ctx.match[1]);
    const answer = ctx.match[2];
    const telegramId = ctx.from.id;

    const q = await db.getCustDevQuestion(step);
    if (q) {
      if (q.field_name) await db.updateUser(telegramId, { [q.field_name]: answer });
      await db.saveCustDevAnswer(telegramId, q.id, answer);
    }

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);
    await delay(500);
    await askNextQuestion(telegramId, step);
  } catch (e) {
    console.error('CustDev callback error:', e);
  }
});

async function scheduleNextLesson(telegramId) {
  const user = await db.getUser(telegramId);
  const next = (user.current_lesson || 0) + 1;
  const total = await db.getLessonsCount();

  if (next > total) {
    await schedulePostLesson(telegramId);
    return;
  }

  const lesson = await db.getLesson(next);
  const hours = lesson?.delay_hours !== undefined ? lesson.delay_hours : 24;
  
  if (hours === 0) {
    // Darhol yuborish
    await db.updateUser(telegramId, { custdev_step: 0 });
    await sendLesson(telegramId, next);
    return;
  }
  
  const scheduledAt = new Date();
  scheduledAt.setHours(scheduledAt.getHours() + hours);

  await db.scheduleMessage(telegramId, 'lesson', scheduledAt, { lesson_number: next });
  await db.updateUser(telegramId, { custdev_step: 0 });

  const timeText = hours >= 24 ? 'ertaga' : hours + ' soatdan keyin';
  let msg = await db.getBotMessage('lesson_scheduled') || 'Javoblaringiz uchun rahmat!\n\n{{next_lesson}}-dars {{time}} yuboriladi.';
  msg = msg.replace(/\{\{next_lesson\}\}/gi, String(next)).replace(/\{\{time\}\}/gi, timeText);
  msg = await replaceVars(msg, user);
  await bot.telegram.sendMessage(telegramId, msg, { parse_mode: 'HTML' });
}

async function schedulePostLesson(telegramId) {
  const user = await db.getUser(telegramId);
  
  // Get pitch settings
  const pitch = await db.getPitchMedia();
  const pitchDelayMinutes = pitch?.delay_minutes ?? (pitch?.delay_hours ? pitch.delay_hours * 60 : 0);
  
  // Get configurable delays from database (in minutes for precision)
  const salesDelayStr = await db.getBotMessage('sales_delay_minutes') || await db.getBotMessage('sales_delay');
  const softDelayStr = await db.getBotMessage('soft_attack_delay_minutes') || await db.getBotMessage('soft_attack_delay');
  const softDisabledStr = await db.getBotMessage('soft_attack_disabled');
  
  // Convert to minutes (if old format was hours, multiply by 60)
  let salesDelayMinutes = parseInt(salesDelayStr) || 5; // default 5 minutes
  let softAttackDelayMinutes = parseInt(softDelayStr) || 1440; // default 24 hours
  
  // Check if old hour-based format (small numbers like 1, 2, 24)
  if (salesDelayMinutes <= 24) salesDelayMinutes = salesDelayMinutes * 60; // assume hours
  if (softAttackDelayMinutes <= 48) softAttackDelayMinutes = softAttackDelayMinutes * 60; // assume hours
  
  const softAttackDisabled = softDisabledStr === 'true';

  console.log(`📊 Progrev settings for ${telegramId}:`);
  console.log(`   Pitch delay: ${pitchDelayMinutes} min`);
  console.log(`   Sales delay: ${salesDelayMinutes} min`);
  console.log(`   Soft attack delay: ${softAttackDelayMinutes} min (disabled: ${softAttackDisabled})`);

  // ============ STEP 1: CONGRATULATIONS ============
  const congratsMsg = await db.getBotMessage('post_lesson_congrats') || 
    '🎉 <b>Tabriklayman, {{ism}}!</b>\n\nBarcha bepul darslarni tugatdingiz!\n\n⏳ Tez orada siz uchun maxsus taklif tayyorlayman...';
  const personalizedCongrats = await replaceVars(congratsMsg, user);
  
  await bot.telegram.sendMessage(telegramId, personalizedCongrats, { parse_mode: 'HTML' });
  await db.updateUser(telegramId, { funnel_step: 8 });
  
  console.log(`✅ Step 1: Congrats sent to ${telegramId}`);

  // ============ STEP 2: VIDEO PITCH ============
  if (pitchDelayMinutes === 0) {
    // Send immediately with small delay for better UX
    await delay(3000); // 3 seconds
    await sendVideoPitch(telegramId);
    console.log(`✅ Step 2: Video pitch sent immediately to ${telegramId}`);
  } else {
    const pitchTime = new Date(Date.now() + pitchDelayMinutes * 60 * 1000);
    await db.scheduleMessage(telegramId, 'video_pitch', pitchTime, {});
    console.log(`📅 Step 2: Video pitch scheduled for ${pitchTime.toISOString()}`);
  }

  // ============ STEP 3: SALES PITCH ============
  const totalSalesDelay = pitchDelayMinutes + salesDelayMinutes;
  
  if (totalSalesDelay === 0) {
    // Send immediately after pitch
    await delay(5000); // 5 seconds after pitch
    await sendSalesPitch(telegramId);
    console.log(`✅ Step 3: Sales pitch sent immediately to ${telegramId}`);
  } else {
    const salesTime = new Date(Date.now() + totalSalesDelay * 60 * 1000);
    await db.scheduleMessage(telegramId, 'sales_pitch', salesTime, {});
    console.log(`📅 Step 3: Sales pitch scheduled for ${salesTime.toISOString()}`);
  }

  // ============ STEP 4: SOFT ATTACK (Follow-up) ============
  if (!softAttackDisabled && softAttackDelayMinutes > 0) {
    const totalSoftDelay = totalSalesDelay + softAttackDelayMinutes;
    const softAttackTime = new Date(Date.now() + totalSoftDelay * 60 * 1000);
    await db.scheduleMessage(telegramId, 'soft_attack', softAttackTime, {});
    console.log(`📅 Step 4: Soft attack scheduled for ${softAttackTime.toISOString()}`);
  }
}

export async function sendVideoPitch(telegramId, forceTest = false) {
  const user = await db.getUser(telegramId);
  
  // Skip if already paid (unless force test)
  if (!forceTest && user?.is_paid) {
    console.log(`User ${telegramId} already paid, skipping video pitch`);
    return;
  }
  
  const pitch = await db.getPitchMedia();
  
  // Default pitch text if not set
  const defaultPitchText = `🎬 <b>Maxsus video xabar!</b>

Bepul darslar yoqdimi? 👇`;

  let text = await replaceVars(pitch?.text || defaultPitchText, user);

  console.log(`📤 Sending video pitch to ${telegramId}`);

  // Ha/Yo'q tugmalari
  const feedbackButtons = Markup.inlineKeyboard([
    [
      Markup.button.callback('👍 Ha, yoqdi!', 'feedback_yes'),
      Markup.button.callback('👎 Yo\'q', 'feedback_no')
    ]
  ]);

  try {
    if (pitch?.video_file_id) {
      await bot.telegram.sendVideo(telegramId, pitch.video_file_id, { 
        caption: text, 
        parse_mode: 'HTML',
        ...feedbackButtons
      });
    } else if (pitch?.audio_file_id) {
      await bot.telegram.sendVoice(telegramId, pitch.audio_file_id, { 
        caption: text, 
        parse_mode: 'HTML',
        ...feedbackButtons
      });
    } else if (pitch?.image_file_id) {
      await bot.telegram.sendPhoto(telegramId, pitch.image_file_id, { 
        caption: text, 
        parse_mode: 'HTML',
        ...feedbackButtons
      });
    } else {
      await bot.telegram.sendMessage(telegramId, text, { 
        parse_mode: 'HTML',
        ...feedbackButtons
      });
    }
    console.log(`✅ Pitch sent to ${telegramId}`);
  } catch (e) {
    console.error(`❌ Error sending pitch to ${telegramId}:`, e.message);
  }

  await db.updateUser(telegramId, { funnel_step: 9 });
}

// ============ FEEDBACK HANDLERS ============

// Ha - yoqdi
bot.action('feedback_yes', async (ctx) => {
  await ctx.answerCbQuery('Rahmat! 🎉');
  
  // Save feedback
  await db.saveFeedback(ctx.from.id, 'liked', 'Bepul darslar yoqdi');
  
  // Edit message to remove buttons
  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  } catch (e) {}
  
  // Send SMM channel info
  const smmChannelInfo = await db.getBotMessage('smm_channel_info') || 
`🎯 <b>Ajoyib!</b>

Bizda bepul SMM kanal ham bor!

📢 Kanalda:
• Kunlik SMM bo'yicha maslahatlar
• Case study'lar
• Bepul materiallar
• Yangiliklar va trendlar

Qo'shiling va rivojlaning! 👇`;

  const channelLink = await db.getSetting('free_smm_channel') || await db.getBotMessage('free_smm_channel') || 'https://t.me/your_smm_channel';

  await ctx.reply(smmChannelInfo, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📢 Kanalga qo\'shilish', channelLink)],
      [Markup.button.callback('💰 Kurs narxlarini ko\'rish', 'show_prices')]
    ])
  });
});

// Yo'q - yoqmadi
bot.action('feedback_no', async (ctx) => {
  await ctx.answerCbQuery();
  
  // Edit message to remove buttons
  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  } catch (e) {}
  
  // Ask for reason
  await ctx.reply(
`😔 Afsuski yoqmadi...

Iltimos, sababini yozing - bu bizga yaxshilanishga yordam beradi!

<i>Oddiy xabar yozing (masalan: "tushunarsiz", "qiziq emas", "vaqtim yo'q" va h.k.)</i>`, 
    { parse_mode: 'HTML' }
  );
  
  // Set user state to waiting for feedback
  await db.updateUser(ctx.from.id, { waiting_feedback: true });
});

// Show prices after channel join
bot.action('show_prices', async (ctx) => {
  await ctx.answerCbQuery();
  await sendSalesPitch(ctx.from.id);
});

export async function sendSalesPitch(telegramId) {
  const user = await db.getUser(telegramId);
  const plans = await db.getSubscriptionPlans(true);
  
  let text = await db.getBotMessage('sales_pitch') || '🎓 <b>SMM PRO KURSGA TAKLIF!</b>\n\nObuna turini tanlang:';
  text = await replaceVars(text, user);
  
  // Create plan selection buttons
  const planButtons = plans.map(plan => {
    const priceFormatted = formatMoney(plan.price);
    const label = plan.discount_percent > 0 
      ? `${plan.name} - ${priceFormatted} (-${plan.discount_percent}%)`
      : `${plan.name} - ${priceFormatted}`;
    return [Markup.button.callback(label, `plan_${plan.id}`)];
  });
  
  // Add info about plans
  let plansInfo = '\n\n📋 <b>Obuna turlari:</b>\n';
  for (const plan of plans) {
    const priceFormatted = formatMoney(plan.price);
    const discount = plan.discount_percent > 0 ? ` <i>(-${plan.discount_percent}% chegirma)</i>` : '';
    plansInfo += `• ${plan.name}: <b>${priceFormatted}</b>${discount}\n`;
  }
  
  await bot.telegram.sendMessage(telegramId, text + plansInfo, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      ...planButtons,
      [Markup.button.callback('❓ Savolim bor', 'question')]
    ])
  });
  await db.updateUser(telegramId, { funnel_step: 10 });
}

// Handle plan selection
bot.action(/^plan_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const planId = ctx.match[1];
  const telegramId = ctx.from.id;
  
  const plan = await db.getSubscriptionPlan(planId);
  if (!plan) {
    return ctx.reply('❌ Bunday obuna turi topilmadi');
  }
  
  const orderId = ('ORD' + Date.now() + telegramId).slice(0, 20);
  await db.createPayment(orderId, telegramId, plan.price, planId);
  
  const paymeUrl = BASE_URL + '/payme/api/checkout-url?order_id=' + orderId + '&amount=' + plan.price + '&plan=' + planId + '&redirect=1';
  const clickUrl = BASE_URL + '/click/api/checkout-url?order_id=' + orderId + '&amount=' + plan.price + '&plan=' + planId + '&redirect=1';
  
  const text = `✅ <b>${plan.name} obuna tanlandi</b>\n\n` +
    `💰 Narx: <b>${formatMoney(plan.price)}</b>\n` +
    `📅 Muddat: <b>${plan.duration_days} kun</b>\n\n` +
    `To'lov usulini tanlang:`;
  
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.url('💳 Payme', paymeUrl), Markup.button.url('💠 Click', clickUrl)],
      [Markup.button.callback('⬅️ Orqaga', 'back_to_plans')]
    ])
  });
});

// Back to plan selection
bot.action('back_to_plans', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  await sendSalesPitch(ctx.from.id);
});

// Handle subscription extension
bot.action(/^extend_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const planId = ctx.match[1];
  const telegramId = ctx.from.id;
  
  const plan = await db.getSubscriptionPlan(planId);
  if (!plan) {
    return ctx.reply('❌ Bunday obuna turi topilmadi');
  }
  
  const orderId = ('EXT' + Date.now() + telegramId).slice(0, 20);
  await db.createPayment(orderId, telegramId, plan.price, planId);
  
  const paymeUrl = BASE_URL + '/payme/api/checkout-url?order_id=' + orderId + '&amount=' + plan.price + '&plan=' + planId + '&extend=1&redirect=1';
  const clickUrl = BASE_URL + '/click/api/checkout-url?order_id=' + orderId + '&amount=' + plan.price + '&plan=' + planId + '&extend=1&redirect=1';
  
  const text = `🔄 <b>Obunani uzaytirish</b>\n\n` +
    `📦 Reja: <b>${plan.name}</b>\n` +
    `💰 Narx: <b>${formatMoney(plan.price)}</b>\n` +
    `📅 Qo'shiladigan muddat: <b>${plan.duration_days} kun</b>\n\n` +
    `To'lov usulini tanlang:`;
  
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.url('💳 Payme', paymeUrl), Markup.button.url('💠 Click', clickUrl)],
      [Markup.button.callback('❌ Bekor qilish', 'cancel_extend')]
    ])
  });
});

bot.action('cancel_extend', async (ctx) => {
  await ctx.answerCbQuery('Bekor qilindi');
  await ctx.deleteMessage();
});

// Show sales pitch from video pitch button
bot.action('show_sales_pitch', async (ctx) => {
  await ctx.answerCbQuery();
  await sendSalesPitch(ctx.from.id);
});

// Show extend options
export async function sendExtendOptions(telegramId, messageText) {
  const user = await db.getUser(telegramId);
  const plans = await db.getSubscriptionPlans(true);
  
  let text = await replaceVars(messageText, user);
  
  const planButtons = plans.map(plan => {
    const priceFormatted = formatMoney(plan.price);
    return [Markup.button.callback(`${plan.name} - ${priceFormatted}`, `extend_${plan.id}`)];
  });
  
  await bot.telegram.sendMessage(telegramId, text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(planButtons)
  });
}

export async function sendSoftAttack(telegramId, forceTest = false) {
  const user = await db.getUser(telegramId);
  if (!forceTest && user?.is_paid) {
    console.log(`User ${telegramId} already paid, skipping soft attack`);
    return;
  }
  
  const plans = await db.getSubscriptionPlans(true);
  
  let text = await db.getBotMessage('soft_attack') || '🤔 Hali qaror qilmadingizmi?\n\nKurs haqida savollaringiz bo\'lsa yozing!\n\nYoki hoziroq ro\'yxatdan o\'ting:';
  text = await replaceVars(text, user);
  
  // Create plan selection buttons
  const planButtons = plans.map(plan => {
    const priceFormatted = formatMoney(plan.price);
    const label = plan.discount_percent > 0 
      ? `${plan.name} - ${priceFormatted} (-${plan.discount_percent}%)`
      : `${plan.name} - ${priceFormatted}`;
    return [Markup.button.callback(label, `plan_${plan.id}`)];
  });
  
  await bot.telegram.sendMessage(telegramId, text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      ...planButtons,
      [Markup.button.callback('❓ Savolim bor', 'question')]
    ])
  });
}

export async function sendBroadcast(user, text, photo) {
  const personalizedText = await replaceVars(text, user);
  try {
    if (photo) await bot.telegram.sendPhoto(user.telegram_id, photo, { caption: personalizedText, parse_mode: 'HTML' });
    else await bot.telegram.sendMessage(user.telegram_id, personalizedText, { parse_mode: 'HTML' });
    return true;
  } catch (e) {
    console.log('Broadcast failed:', user.telegram_id, e.message);
    return false;
  }
}

bot.action('ready_to_pay', async (ctx) => {
  await ctx.answerCbQuery();
  await sendSalesPitch(ctx.from.id);
});

bot.action('question', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Savollaringiz bolsa: @' + (process.env.ADMIN_USERNAME || 'firdavsurinovs'));
});

bot.command('continue', async (ctx) => {
  const user = await db.getUser(ctx.from.id);
  if (!user) return ctx.reply('/start bosing.');
  const total = await db.getLessonsCount();
  const next = (user.current_lesson || 0) + 1;
  if (next <= total) await sendLesson(ctx.from.id, next);
  else await sendSalesPitch(ctx.from.id);
});

bot.on('video', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const fileId = ctx.message.video.file_id;
  const fileName = ctx.message.video.file_name || 'video_' + Date.now();
  const caption = ctx.message.caption || '';
  
  await db.saveMedia(fileId, 'video', fileName, caption, ctx.from.id);
  await ctx.reply('✅ Video saqlandi!\n\n📝 Izoh: ' + (caption || '❌ Yo\'q') + '\n\n📋 File ID:\n<code>' + fileId + '</code>\n\n💡 Keyingi safar video bilan birga izoh yozing!', { parse_mode: 'HTML' });
});

bot.on('photo', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  const fileName = 'photo_' + Date.now();
  const caption = ctx.message.caption || '';
  
  await db.saveMedia(fileId, 'photo', fileName, caption, ctx.from.id);
  await ctx.reply('✅ Rasm saqlandi!\n\n📝 Izoh: ' + (caption || '❌ Yo\'q') + '\n\n📋 File ID:\n<code>' + fileId + '</code>\n\n💡 Keyingi safar rasm bilan birga izoh yozing!', { parse_mode: 'HTML' });
});

bot.on('voice', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const fileId = ctx.message.voice.file_id;
  const fileName = 'voice_' + Date.now();
  const caption = ctx.message.caption || '';
  
  await db.saveMedia(fileId, 'voice', fileName, caption, ctx.from.id);
  await ctx.reply('✅ Ovozli xabar saqlandi!\n\n📝 Izoh: ' + (caption || '❌ Yo\'q') + '\n\n📋 File ID:\n<code>' + fileId + '</code>\n\n💡 Keyingi safar ovozli xabar bilan birga izoh yozing!', { parse_mode: 'HTML' });
});

bot.on('audio', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const fileId = ctx.message.audio.file_id;
  const fileName = ctx.message.audio.file_name || 'audio_' + Date.now();
  const caption = ctx.message.caption || '';
  
  await db.saveMedia(fileId, 'audio', fileName, caption, ctx.from.id);
  await ctx.reply('✅ Audio saqlandi!\n\n📝 Izoh: ' + (caption || '❌ Yo\'q') + '\n\n📋 File ID:\n<code>' + fileId + '</code>\n\n💡 Keyingi safar audio bilan birga izoh yozing!', { parse_mode: 'HTML' });
});

bot.on('video_note', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const fileId = ctx.message.video_note.file_id;
  const fileName = 'video_note_' + Date.now();
  
  await db.saveMedia(fileId, 'video_note', fileName, '', ctx.from.id);
  await ctx.reply('✅ Video xabar saqlandi!\n\n📋 File ID:\n<code>' + fileId + '</code>\n\n💡 Dashboard > Media > ✏️ orqali izoh qo\'shing', { parse_mode: 'HTML' });
});

export default bot;
