import { Telegraf, Markup } from 'telegraf';
import * as db from './database.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.BASE_URL;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
const DEFAULT_PRICE = parseInt(process.env.SUBSCRIPTION_PRICE || '9700000');
const PREMIUM_CHANNEL_ID = process.env.PREMIUM_CHANNEL_ID; // e.g., -1001234567890
const CHAT_MONITOR_ENABLED = process.env.CHAT_MONITOR_ENABLED !== 'false';
const CHAT_MONITOR_NOTIFY_ADMINS = process.env.CHAT_MONITOR_NOTIFY_ADMINS === 'true';

if (!BOT_TOKEN) throw new Error('BOT_TOKEN kerak');

export const bot = new Telegraf(BOT_TOKEN);

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const isAdmin = (id) => ADMIN_IDS.includes(id);
const formatMoney = (t) => (t / 100).toLocaleString('uz-UZ') + " so'm";

function isTrackableUserChat(chatId) {
  const id = Number(chatId);
  return Number.isFinite(id) && id > 0 && !isAdmin(id);
}

async function logBotOutgoing(chatId, messageType, textContent = null, meta = null, result = null) {
  if (!CHAT_MONITOR_ENABLED || !isTrackableUserChat(chatId)) return;
  try {
    await db.logUserMessage(chatId, messageType, textContent, {
      ...(meta || {}),
      direction: 'bot_to_user',
      message_id: result?.message_id || null
    });
  } catch (e) {
    console.error('logBotOutgoing error:', e.message);
  }
}

function installOutgoingMessageLogger() {
  const telegram = bot.telegram;

  const wrap = (methodName, mapper) => {
    const original = telegram[methodName].bind(telegram);
    telegram[methodName] = async (...args) => {
      const result = await original(...args);
      try {
        const mapped = mapper(...args);
        await logBotOutgoing(mapped.chatId, mapped.messageType, mapped.textContent, mapped.meta, result);
      } catch (e) {
        console.error(`Outgoing logger (${methodName}) error:`, e.message);
      }
      return result;
    };
  };

  wrap('sendMessage', (chatId, text) => ({
    chatId,
    messageType: 'bot_outgoing_text',
    textContent: text || '',
    meta: { method: 'sendMessage' }
  }));

  wrap('sendVideo', (chatId, video, extra = {}) => ({
    chatId,
    messageType: 'bot_outgoing_video',
    textContent: extra?.caption || '[VIDEO yuborildi]',
    meta: { method: 'sendVideo', file_ref: typeof video === 'string' ? video : null }
  }));

  wrap('sendPhoto', (chatId, photo, extra = {}) => ({
    chatId,
    messageType: 'bot_outgoing_photo',
    textContent: extra?.caption || '[RASM yuborildi]',
    meta: { method: 'sendPhoto', file_ref: typeof photo === 'string' ? photo : null }
  }));

  wrap('sendVoice', (chatId, voice, extra = {}) => ({
    chatId,
    messageType: 'bot_outgoing_voice',
    textContent: extra?.caption || '[OVOZLI xabar yuborildi]',
    meta: { method: 'sendVoice', file_ref: typeof voice === 'string' ? voice : null }
  }));

  wrap('sendAudio', (chatId, audio, extra = {}) => ({
    chatId,
    messageType: 'bot_outgoing_audio',
    textContent: extra?.caption || '[AUDIO yuborildi]',
    meta: { method: 'sendAudio', file_ref: typeof audio === 'string' ? audio : null }
  }));

  wrap('sendVideoNote', (chatId, videoNote) => ({
    chatId,
    messageType: 'bot_outgoing_video_note',
    textContent: '[VIDEO NOTE yuborildi]',
    meta: { method: 'sendVideoNote', file_ref: typeof videoNote === 'string' ? videoNote : null }
  }));

  wrap('sendDocument', (chatId, document, extra = {}) => ({
    chatId,
    messageType: 'bot_outgoing_document',
    textContent: extra?.caption || '[HUJJAT yuborildi]',
    meta: { method: 'sendDocument', file_ref: typeof document === 'string' ? document : null }
  }));

  wrap('sendSticker', (chatId, sticker) => ({
    chatId,
    messageType: 'bot_outgoing_sticker',
    textContent: '[STICKER yuborildi]',
    meta: { method: 'sendSticker', sticker_file_id: typeof sticker === 'string' ? sticker : null }
  }));
}

installOutgoingMessageLogger();

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

function extractIncomingMessage(message) {
  if (!message) return null;
  if (message.text) return { type: 'text', text: message.text, meta: null };
  if (message.contact) return { type: 'contact', text: message.contact.phone_number || null, meta: { first_name: message.contact.first_name, user_id: message.contact.user_id } };
  if (message.photo) return { type: 'photo', text: message.caption || null, meta: { file_id: message.photo[message.photo.length - 1]?.file_id || null } };
  if (message.video) return { type: 'video', text: message.caption || null, meta: { file_id: message.video.file_id, file_name: message.video.file_name || null } };
  if (message.voice) return { type: 'voice', text: message.caption || null, meta: { file_id: message.voice.file_id } };
  if (message.audio) return { type: 'audio', text: message.caption || null, meta: { file_id: message.audio.file_id, file_name: message.audio.file_name || null } };
  if (message.video_note) return { type: 'video_note', text: null, meta: { file_id: message.video_note.file_id } };
  if (message.document) return { type: 'document', text: message.caption || null, meta: { file_id: message.document.file_id, file_name: message.document.file_name || null } };
  return { type: 'other', text: null, meta: null };
}

function extractCustomEmojiEntities(message) {
  if (!message) return [];
  const results = [];

  const entities = [
    ...(Array.isArray(message.entities) ? message.entities : []),
    ...(Array.isArray(message.caption_entities) ? message.caption_entities : [])
  ];

  for (const e of entities) {
    if (e?.type === 'custom_emoji' && e?.custom_emoji_id) {
      results.push({
        custom_emoji_id: String(e.custom_emoji_id),
        emoji_char: null
      });
    }
  }

  // Telegram ba'zida custom emoji/sticker alohida sticker message bo'lib keladi
  if (message.sticker?.custom_emoji_id) {
    results.push({
      custom_emoji_id: String(message.sticker.custom_emoji_id),
      emoji_char: message.sticker.emoji || null
    });
  }

  // Dublikatlarni olib tashlash
  const seen = new Set();
  return results.filter((item) => {
    const normalizedId = String(item.custom_emoji_id || '').replace(/\D/g, '');
    if (!normalizedId) return false;
    if (seen.has(normalizedId)) return false;
    item.custom_emoji_id = normalizedId;
    seen.add(normalizedId);
    return true;
  });
}

async function persistCustomEmojisFromMessage(ctx) {
  try {
    const message = ctx?.message;
    const telegramId = ctx?.from?.id;
    if (!message || !telegramId) return;

    const emojis = extractCustomEmojiEntities(message);
    if (!emojis.length) return;

    for (const item of emojis) {
      await db.upsertCustomEmoji(item.custom_emoji_id, {
        emoji_char: item.emoji_char,
        last_used_by: telegramId
      });
    }
  } catch (e) {
    console.error('persistCustomEmojisFromMessage error:', e.message);
  }
}

async function sendAdmins(text) {
  for (const adminId of ADMIN_IDS) {
    try {
      await bot.telegram.sendMessage(adminId, text, { parse_mode: 'HTML' });
    } catch (e) {
      console.error(`Admin notify error (${adminId}):`, e.message);
    }
  }
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function buildUserSnapshot(telegramId) {
  const [user, userFunnel] = await Promise.all([
    db.getUser(telegramId),
    db.getUserActiveFunnel(telegramId)
  ]);

  return {
    current_lesson: userFunnel?.current_lesson ?? user?.current_lesson ?? 0,
    funnel_step: user?.funnel_step ?? 0,
    custdev_step: userFunnel?.custdev_step ?? user?.custdev_step ?? 0,
    active_funnel_id: userFunnel?.funnel_id ?? null
  };
}

async function logAndNotifyUserActivity(ctx, activityType, textContent = null, meta = null) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const snapshot = await buildUserSnapshot(telegramId);
  const mergedMeta = { ...(meta || {}), ...snapshot };

  await db.logUserMessage(telegramId, activityType, textContent, mergedMeta);

  if (!CHAT_MONITOR_NOTIFY_ADMINS) {
    return;
  }

  const userName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ').trim() || 'Nomalum';
  const username = ctx.from.username ? '@' + ctx.from.username : 'username yoq';
  const preview = textContent ? String(textContent).slice(0, 500) : `(event: ${activityType})`;

  await sendAdmins(
    `💬 <b>User faolligi</b>\n` +
    `🆔 <code>${telegramId}</code>\n` +
    `👤 ${escapeHtml(userName)}\n` +
    `🔗 ${escapeHtml(username)}\n` +
    `🏷 ${escapeHtml(activityType)}\n` +
    `📚 dars=${snapshot.current_lesson} | funnel_step=${snapshot.funnel_step}\n` +
    `📝 ${escapeHtml(preview)}`
  );
}

function isUserMilestone(totalUsers) {
  return totalUsers === 100 || (totalUsers >= 500 && totalUsers % 500 === 0);
}

async function maybeNotifyUserMilestone(tgUser) {
  try {
    const totalUsers = await db.getTotalUsersCount();
    if (!isUserMilestone(totalUsers)) return;

    const mention = tgUser.username ? '@' + tgUser.username : 'username yoq';
    const msg =
      `🎯 <b>User milestone</b>\n` +
      `Jami user: <b>${totalUsers}</b>\n\n` +
      `🆔 <code>${tgUser.id}</code>\n` +
      `👤 ${tgUser.first_name || ''} ${tgUser.last_name || ''}\n` +
      `🔗 ${mention}`;
    await sendAdmins(msg);
  } catch (e) {
    console.error('Milestone notify error:', e.message);
  }
}

bot.use(async (ctx, next) => {
  try {
    if (ctx.message) {
      await persistCustomEmojisFromMessage(ctx);
    }

    if (CHAT_MONITOR_ENABLED && ctx.from) {
      if (ctx.message) {
        const payload = extractIncomingMessage(ctx.message);
        if (payload) {
          await logAndNotifyUserActivity(ctx, payload.type, payload.text, {
            ...(payload.meta || {}),
            message_id: ctx.message.message_id || null,
            reply_to_message_id: ctx.message.reply_to_message?.message_id || null
          });
        }
      }

      if (ctx.callbackQuery?.data) {
        await logAndNotifyUserActivity(ctx, 'callback', ctx.callbackQuery.data, {
          callback_message_id: ctx.callbackQuery.message?.message_id || null
        });
      }
    }
  } catch (e) {
    console.error('Chat monitor error:', e.message);
  }

  return next();
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Admin huquqi yoq');
  await ctx.reply(`🔐 Admin Panel\n\n/stats - Statistika\n/resetme - Reset qilish\n/testfeedback - Feedback savolini test qilish\n/testpitch - Pitch ni test qilish\n/testsales - To'lov tugmalarini test qilish\n\n📊 Dashboard: ${BASE_URL}/admin.html\n🛰 Chat monitor: ${CHAT_MONITOR_ENABLED ? 'yoqilgan' : 'o\'chirilgan'}\n🔔 Realtime admin notify: ${CHAT_MONITOR_NOTIFY_ADMINS ? 'yoqilgan' : 'o\'chirilgan'} (ENV: CHAT_MONITOR_NOTIFY_ADMINS)`, { parse_mode: 'HTML' });
});

bot.command('testpitch', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.reply('📤 Feedback savoli yuborilmoqda...');
  await sendFeedbackQuestion(ctx.from.id);
});

bot.command('testfeedback', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  // Reset feedback flags first so we can test again
  await db.updateUser(ctx.from.id, { feedback_given: false, waiting_feedback: false, feedback_type: null });
  await ctx.reply('📤 Feedback savoli yuborilmoqda (flaglar reset qilindi)...');
  await sendFeedbackQuestion(ctx.from.id);
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
  await ctx.reply(
    `Statistika\n\nJami: ${s.totalUsers}\nPremium: ${s.paidUsers}\nBugun: +${s.todayUsers}\n\nOylik: ${formatMoney(parseInt(s.monthRevenue) || 0)}`,
    { parse_mode: 'HTML' }
  );
});

bot.start(async (ctx) => {
  try {
    const tgUser = ctx.from;
    const telegramId = tgUser.id;
    
    // Parse deep link - t.me/bot?start=SLUG
    const startPayload = ctx.startPayload; // e.g., "test", "smm-pro"
    
    // Find funnel by slug or get default
    let funnel = null;
    if (startPayload && startPayload.length > 0) {
      funnel = await db.getFunnelBySlug(startPayload);
      console.log('🎯 Deep link funnel:', startPayload, funnel ? '✅ Found' : '❌ Not found');
    }
    
    // If no funnel found by slug, get default
    if (!funnel) {
      funnel = await db.getDefaultFunnel();
      console.log('🎯 Using default funnel:', funnel?.name);
    }
    
    // If still no funnel, fallback to old behavior
    if (!funnel) {
      console.log('⚠️ No funnels configured, using legacy mode');
      return handleLegacyStart(ctx, telegramId, tgUser);
    }
    
    let user = await db.getUser(telegramId);

    if (!user) {
      user = await db.createUser(telegramId, tgUser.username, null);
      await maybeNotifyUserMilestone(tgUser);
      
      // Start user in this funnel
      await db.startUserInFunnel(telegramId, funnel.id);
      console.log('👤 New user started in funnel:', funnel.name);
      
      const welcome = await db.getBotMessage('welcome') || 'Assalomu alaykum! SMM kursga xush kelibsiz!';
      await ctx.reply(welcome, { parse_mode: 'HTML' });
      await delay(500);
      const askName = await db.getBotMessage('ask_name') || 'Ism-familiyangizni kiriting:';
      await ctx.reply(askName, { parse_mode: 'HTML' });
      await db.updateUser(telegramId, { custdev_step: -1, funnel_step: 0 });
      return;
    }

    // Check if user clicked different funnel link
    const userFunnel = await db.getUserActiveFunnel(telegramId);
    if (!userFunnel || userFunnel.funnel_id !== funnel.id) {
      // Start user in new funnel
      await db.startUserInFunnel(telegramId, funnel.id);
      console.log('🔄 User switched to funnel:', funnel.name);
      
      await ctx.reply(`🎯 Yangi kursga xush kelibsiz: ${funnel.name}\n\nDarslar tez orada boshlanadi!`, { parse_mode: 'HTML' });
      await delay(1000);
      await sendFunnelLesson(telegramId, funnel.id, 1);
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
      const currentLesson = userFunnel?.current_lesson ?? user.current_lesson ?? 0;
      return ctx.reply(`Qaytganingiz bilan, ${user.full_name || "do'st"}!\n\nSiz ${currentLesson}-darsdasiz.\nDavom etish: /continue`);
    }

    await startLessons(telegramId);
  } catch (e) {
    console.error('Start error:', e);
    await ctx.reply('Xatolik. /start bosing.');
  }
});

// Legacy start handler (for backward compatibility)
async function handleLegacyStart(ctx, telegramId, tgUser) {
  let user = await db.getUser(telegramId);

  if (!user) {
    user = await db.createUser(telegramId, tgUser.username, null);
    await maybeNotifyUserMilestone(tgUser);
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
}

// Send lesson from specific funnel
async function sendFunnelLesson(telegramId, funnelId, lessonNumber, opts = {}) {
  try {
    const lesson = await db.getFunnelLesson(funnelId, lessonNumber);
    if (!lesson) {
      console.log('❌ Funnel lesson not found:', funnelId, lessonNumber);
      // Fallback to regular lessons
      return sendLesson(telegramId, lessonNumber, opts);
    }
    
    const user = await db.getUser(telegramId);
    let content = await replaceVars(lesson.content || '', user || {});
    
    // Send video if exists
    if (lesson.video_file_id) {
      try {
        await bot.telegram.sendVideo(telegramId, lesson.video_file_id, {
          caption: `<b>📚 ${lesson.lesson_number}-dars: ${lesson.title}</b>\n\n${content}`.slice(0, 1024),
          parse_mode: 'HTML'
        });
      } catch (e) {
        await bot.telegram.sendMessage(telegramId, `<b>📚 ${lesson.lesson_number}-dars: ${lesson.title}</b>\n\n${content}`, { parse_mode: 'HTML' });
      }
    } else if (lesson.image_file_id) {
      try {
        await bot.telegram.sendPhoto(telegramId, lesson.image_file_id, {
          caption: `<b>📚 ${lesson.lesson_number}-dars: ${lesson.title}</b>\n\n${content}`.slice(0, 1024),
          parse_mode: 'HTML'
        });
      } catch (e) {
        await bot.telegram.sendMessage(telegramId, `<b>📚 ${lesson.lesson_number}-dars: ${lesson.title}</b>\n\n${content}`, { parse_mode: 'HTML' });
      }
    } else {
      await bot.telegram.sendMessage(telegramId, `<b>📚 ${lesson.lesson_number}-dars: ${lesson.title}</b>\n\n${content}`, { parse_mode: 'HTML' });
    }
    
    // Update user progress (skip if replay)
    if (!opts.replay) {
      await db.updateUser(telegramId, { current_lesson: lessonNumber, funnel_step: lessonNumber });
      await db.updateUserFunnelProgress(telegramId, funnelId, lessonNumber, 0);
    }
    
    // Show watched button if enabled
    if (lesson.show_watched_button !== false) {
      const btnText = lesson.watched_button_text || 'Videoni ko\'rib bo\'ldim ✅';
      await delay(1000);
      if (opts.replay && opts.resumeLesson) {
        await bot.telegram.sendMessage(telegramId, 'Dars tugagach, davom etish uchun bosing:', {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('Davom etish ▶️', `resume_f:${funnelId}:${opts.resumeLesson}`)]
          ])
        });
      } else {
        await bot.telegram.sendMessage(telegramId, 'Videoni ko\'rib bo\'lgach, tugmani bosing:', {
          ...Markup.inlineKeyboard([
            [Markup.button.callback(btnText, `watched_funnel_${funnelId}_${lessonNumber}`)]
          ])
        });
      }
    }
    
    console.log('✅ Sent funnel lesson:', funnelId, lessonNumber, 'to', telegramId);
  } catch (e) {
    console.error('sendFunnelLesson error:', e);
  }
}

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

bot.on('text', async (ctx, next) => {
  try {
    const telegramId = ctx.from.id;
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    const user = await db.getUser(telegramId);
    if (!user) return;

    // Check if waiting for feedback
    if (user.waiting_feedback) {
      // Save feedback with the reason
      await db.saveFeedback(telegramId, 'disliked_reason', text);
      await db.updateUser(telegramId, { waiting_feedback: false, feedback_type: null });

      // Get configurable follow-up message
      let followupMsg = await db.getSetting('feedback_followup') ||
        '✅ Rahmat fikringiz uchun! 🙏\n\nBiz doimo yaxshilanib boramiz. Shunday bo\'lsa ham, to\'liq kursda professional darajada tayyorlangan materiallar mavjud...';

      const personalizedFollowup = await replaceVars(followupMsg, user);
      await ctx.reply(personalizedFollowup, { parse_mode: 'HTML' });

      console.log(`📝 Negative feedback reason saved from ${telegramId}: ${text}`);

      // Check if should show prices after follow-up
      const showPricesStr = await db.getSetting('feedback_followup_show_prices');
      const showPrices = showPricesStr !== 'false' && showPricesStr !== false;

      if (showPrices) {
        await delay(2000);

        // Check for special offer with automatic 20% discount
        const specialOfferEnabled = await db.getSetting('feedback_special_offer_enabled');
        if (specialOfferEnabled === 'true' || specialOfferEnabled === true) {
          const specialOffer = await db.getSetting('feedback_special_offer') ||
            '🎁 Sizga maxsus taklif! Chegirma bilan kursga qo\'shiling...';
          const personalizedOffer = await replaceVars(specialOffer, user);
          await ctx.reply(personalizedOffer, { parse_mode: 'HTML' });
          await delay(1500);

          // Send prices with 20% discount
          await sendSalesPitch(telegramId, 20);
          console.log(`✅ Sales pitch with 20% discount sent after negative feedback from ${telegramId}`);
        } else {
          // Send regular prices
          await sendSalesPitch(telegramId);
          console.log(`✅ Sales pitch sent after negative feedback from ${telegramId}`);
        }

        // Cancel any scheduled sales pitch since we already sent it
        try {
          await db.cancelPendingMessages(telegramId, 'sales_pitch');
        } catch (e) {}
      }

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

export async function sendLesson(telegramId, lessonNumber, opts = {}) {
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

  if (!opts.replay) {
    await db.updateUser(telegramId, { current_lesson: lessonNumber, funnel_step: lessonNumber + 1, custdev_step: 0 });
  }

  if (lesson.show_watched_button !== false) {
    await delay(1000);
    // Get default values from settings, then fall back to lesson-specific, then hardcoded defaults
    const defaultBtnText = await db.getBotMessage('watched_button_default') || '✅ Videoni ko\'rib bo\'ldim';
    const defaultMsg = await db.getBotMessage('watched_message_default') || 'Videoni ko\'rib bo\'lganingizdan keyin tugmani bosing:';

    const btnText = lesson.watched_button_text || defaultBtnText;
    const msg = lesson.watched_message || defaultMsg;
    if (opts.replay && opts.resumeLesson) {
      await bot.telegram.sendMessage(telegramId, 'Dars tugagach, davom etish uchun bosing:', {
        ...Markup.inlineKeyboard([[Markup.button.callback('Davom etish ▶️', `resume_l:${opts.resumeLesson}`)]])
      });
    } else {
      await bot.telegram.sendMessage(telegramId, msg, {
        ...Markup.inlineKeyboard([[Markup.button.callback(btnText, 'watched_' + lessonNumber)]])
      });
    }
  } else {
    const totalLessons = await db.getLessonsCount();
    await delay(3000);
    if (!opts.replay) {
      if (lessonNumber < totalLessons) await startCustDev(telegramId, lessonNumber);
      else await schedulePostLesson(telegramId);
    }
  }
}

bot.action(/^watched_(\d+)$/, async (ctx) => {
  try {
    const lessonNumber = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id;
    const totalLessons = await db.getLessonsCount();
    const user = await db.getUser(telegramId);

    await ctx.answerCbQuery('Ajoyib!');
    await ctx.editMessageReplyMarkup(undefined);

    if (lessonNumber < totalLessons) {
      // Check if subscription required before next lesson
      const requireSubLesson = parseInt(await db.getBotMessage('require_subscription_before_lesson')) || 3;
      const nextLesson = lessonNumber + 1;
      
      if (nextLesson === requireSubLesson) {
        // Check subscription status
        const isSubscribed = await checkFreeChannelSubscription(telegramId);
        
        if (isSubscribed) {
          // Already subscribed - say thank you!
          if (!user?.subscribed_free_channel) {
            await db.updateUser(telegramId, { subscribed_free_channel: true });
            await ctx.reply('🎉 Rahmat kanalimizga obuna bo\'lganingiz uchun! Siz bilan davom etamiz...');
            await delay(1500);
          }
        } else {
          // Not subscribed - ask for subscription
          await askForSubscription(telegramId, nextLesson);
          return;
        }
      }
      
      await delay(1000);
      await startCustDev(telegramId, lessonNumber);
    } else {
      await schedulePostLesson(telegramId);
    }
  } catch (e) {
    console.error('Watched error:', e);
  }
});

// Funnel watched callback - watched_funnel_FUNNELID_LESSONNUM
bot.action(/^watched_funnel_(\d+)_(\d+)$/, async (ctx) => {
  try {
    const funnelId = parseInt(ctx.match[1]);
    const lessonNumber = parseInt(ctx.match[2]);
    const telegramId = ctx.from.id;
    
    await ctx.answerCbQuery('Ajoyib!');
    await ctx.editMessageReplyMarkup(undefined);
    
    // Get funnel info
    const funnel = await db.getFunnelById(funnelId);
    if (!funnel) {
      console.log('❌ Funnel not found:', funnelId);
      return;
    }
    
    // Get funnel lessons count
    const funnelLessons = await db.getFunnelLessons(funnelId);
    const totalLessons = funnelLessons.length;
    
    console.log('👆 Funnel watched:', funnelId, 'lesson', lessonNumber, '/', totalLessons);
    
    if (lessonNumber < totalLessons) {
      // Check if subscription required before next lesson (funnel specific)
      const requireSubLesson = funnel.require_subscription_before_lesson || 0;
      const nextLesson = lessonNumber + 1;
      
      if (requireSubLesson > 0 && nextLesson === requireSubLesson && funnel.free_channel_id) {
        const isSubscribed = await checkFunnelChannelSubscription(telegramId, funnel);
        
        if (!isSubscribed) {
          await askForFunnelSubscription(telegramId, funnel, nextLesson);
          return;
        }
      }
      
      // Check for CustDev questions after this lesson
      const custdevQuestions = await db.getFunnelCustDev(funnelId);
      const questionsAfterThis = custdevQuestions.filter(q => q.after_lesson === lessonNumber);
      
      if (questionsAfterThis.length > 0) {
        await startFunnelCustDev(telegramId, funnelId, lessonNumber, 0);
      } else {
        // Schedule next lesson
        await scheduleFunnelNextLesson(telegramId, funnelId, nextLesson);
      }
    } else {
      // Course completed - send pitch
      await scheduleFunnelPitch(telegramId, funnelId);
    }
  } catch (e) {
    console.error('Funnel watched error:', e);
  }
});

// Check funnel specific channel subscription
async function checkFunnelChannelSubscription(telegramId, funnel) {
  if (!funnel.free_channel_id) return true;
  
  try {
    const member = await bot.telegram.getChatMember(funnel.free_channel_id, telegramId);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch (e) {
    console.log('checkFunnelChannelSubscription error:', e.message);
    return true; // Assume subscribed if can't check
  }
}

// Ask for funnel subscription
async function askForFunnelSubscription(telegramId, funnel, pendingLesson) {
  const channelLink = funnel.free_channel_link || 'https://t.me/channel';
  const msg = `📢 Davom etish uchun kanalimizga obuna bo'ling!\n\nObuna bo'lgach "Tekshirish" tugmasini bosing.`;
  
  await db.updateUser(telegramId, { pending_lesson: pendingLesson, waiting_subscription: true });
  
  await bot.telegram.sendMessage(telegramId, msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📢 Kanalga o\'tish', channelLink)],
      [Markup.button.callback('✅ Tekshirish', `check_funnel_sub_${funnel.id}_${pendingLesson}`)]
    ])
  });
}

// Check funnel subscription callback
bot.action(/^check_funnel_sub_(\d+)_(\d+)$/, async (ctx) => {
  try {
    const funnelId = parseInt(ctx.match[1]);
    const pendingLesson = parseInt(ctx.match[2]);
    const telegramId = ctx.from.id;
    
    const funnel = await db.getFunnelById(funnelId);
    if (!funnel) return;
    
    const isSubscribed = await checkFunnelChannelSubscription(telegramId, funnel);
    
    if (isSubscribed) {
      await ctx.answerCbQuery('✅ Obuna tasdiqlandi!');
      await ctx.editMessageReplyMarkup(undefined);
      await ctx.reply('🎉 Rahmat! Davom etamiz...');
      await db.updateUser(telegramId, { waiting_subscription: false, subscribed_free_channel: true });
      await delay(1500);
      await sendFunnelLesson(telegramId, funnelId, pendingLesson);
    } else {
      await ctx.answerCbQuery('❌ Obuna topilmadi. Kanalga obuna bo\'ling!', { show_alert: true });
    }
  } catch (e) {
    console.error('check_funnel_sub error:', e);
  }
});

// Start funnel CustDev
async function startFunnelCustDev(telegramId, funnelId, afterLesson, questionIndex) {
  const questions = await db.getFunnelCustDev(funnelId);
  const relevantQuestions = questions.filter(q => q.after_lesson === afterLesson);
  
  if (questionIndex >= relevantQuestions.length) {
    // All questions answered, proceed to next lesson
    await scheduleFunnelNextLesson(telegramId, funnelId, afterLesson + 1);
    return;
  }
  
  const q = relevantQuestions[questionIndex];
  
  // Save current state
  await db.updateUser(telegramId, { custdev_step: q.step || questionIndex });
  
  if (q.question_type === 'buttons' && q.options) {
    const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
    const buttons = opts.map(opt => [Markup.button.callback(opt, `fcd_${funnelId}_${afterLesson}_${questionIndex}_${opt}`)]);
    await bot.telegram.sendMessage(telegramId, q.question_text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  } else {
    await bot.telegram.sendMessage(telegramId, q.question_text, { parse_mode: 'HTML' });
    // Store state for text answer
    await db.updateUser(telegramId, { custdev_step: `fcd_${funnelId}_${afterLesson}_${questionIndex}` });
  }
}

// Funnel CustDev button callback
bot.action(/^fcd_(\d+)_(\d+)_(\d+)_(.+)$/, async (ctx) => {
  try {
    const funnelId = parseInt(ctx.match[1]);
    const afterLesson = parseInt(ctx.match[2]);
    const questionIndex = parseInt(ctx.match[3]);
    const answer = ctx.match[4];
    const telegramId = ctx.from.id;
    
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);
    
    // Save answer (optional - can add to database)
    console.log('📝 Funnel CustDev answer:', funnelId, afterLesson, questionIndex, answer);
    
    // Next question or proceed
    await startFunnelCustDev(telegramId, funnelId, afterLesson, questionIndex + 1);
  } catch (e) {
    console.error('fcd callback error:', e);
  }
});

// Schedule funnel next lesson
async function scheduleFunnelNextLesson(telegramId, funnelId, lessonNumber) {
  const lesson = await db.getFunnelLesson(funnelId, lessonNumber);
  if (!lesson) {
    console.log('No more funnel lessons, sending pitch');
    await scheduleFunnelPitch(telegramId, funnelId);
    return;
  }
  
  const delayHours = lesson.delay_hours || 0;
  
  if (delayHours === 0) {
    // Send immediately
    await sendFunnelLesson(telegramId, funnelId, lessonNumber);
  } else {
    // Schedule for later
    const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
    await db.scheduleMessage(telegramId, 'funnel_lesson', scheduledAt, { funnel_id: funnelId, lesson_number: lessonNumber });
    
    const msg = delayHours >= 24 
      ? `⏰ Keyingi dars ${Math.floor(delayHours / 24)} kundan keyin yuboriladi!`
      : `⏰ Keyingi dars ${delayHours} soatdan keyin yuboriladi!`;
    await bot.telegram.sendMessage(telegramId, msg);
  }
}

// Schedule funnel pitch (after last lesson)
async function scheduleFunnelPitch(telegramId, funnelId) {
  const funnel = await db.getFunnelById(funnelId);
  if (!funnel) return;
  
  // Send congrats
  const congratsText = funnel.congrats_text || '🎉 Tabriklayman! Barcha bepul darslarni tugatdingiz!';
  await bot.telegram.sendMessage(telegramId, congratsText, { parse_mode: 'HTML' });
  
  // Schedule pitch
  const pitchDelay = funnel.pitch_delay_hours || 2;
  
  if (pitchDelay === 0) {
    await sendFunnelPitch(telegramId, funnelId);
  } else {
    const scheduledAt = new Date(Date.now() + pitchDelay * 60 * 60 * 1000);
    await db.scheduleMessage(telegramId, 'funnel_pitch', scheduledAt, { funnel_id: funnelId });
    console.log('📅 Scheduled funnel pitch for', telegramId, 'in', pitchDelay, 'hours');
  }
}

// Send funnel pitch
async function sendFunnelPitch(telegramId, funnelId) {
  const funnel = await db.getFunnelById(funnelId);
  if (!funnel) return;
  
  const pitchText = funnel.pitch_text || funnel.sales_pitch || 'To\'liq kursga qo\'shiling!';
  
  // Build payment buttons based on funnel settings
  const buttons = [];
  const baseUrl = process.env.BASE_URL || '';
  
  // Use funnel prices or defaults
  const price = funnel.price_1m || await getSubscriptionPrice();
  
  if (funnel.payme_enabled !== false) {
    buttons.push([Markup.button.url('💳 Payme orqali to\'lash', `${baseUrl}/pay/payme?tg=${telegramId}&funnel=${funnelId}`)]);
  }
  if (funnel.click_enabled !== false) {
    buttons.push([Markup.button.url('💠 Click orqali to\'lash', `${baseUrl}/pay/click?tg=${telegramId}&funnel=${funnelId}`)]);
  }
  
  if (funnel.pitch_video_file_id) {
    await bot.telegram.sendVideo(telegramId, funnel.pitch_video_file_id, {
      caption: pitchText.slice(0, 1024),
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  } else {
    await bot.telegram.sendMessage(telegramId, pitchText, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  }
  
  console.log('📣 Sent funnel pitch to', telegramId);
}

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

// ============ MANDATORY SUBSCRIPTION CHECK ============
const FREE_CHANNEL_ID = process.env.FREE_CHANNEL_ID; // Bepul kanal ID

async function checkFreeChannelSubscription(telegramId) {
  // Get free channel ID from dashboard (bot_messages) or env
  const channelId = await db.getBotMessage('free_channel_id') || FREE_CHANNEL_ID;

  console.log(`🔍 Checking subscription: user=${telegramId}, channel=${channelId}`);

  if (!channelId) {
    console.log('⚠️ FREE_CHANNEL_ID not set, skipping subscription check');
    return true; // Agar kanal ID yo'q bo'lsa, tekshirmasdan o'tkazib yuboramiz
  }

  try {
    const member = await bot.telegram.getChatMember(channelId, telegramId);
    const isSubscribed = ['member', 'administrator', 'creator'].includes(member.status);
    console.log(`📢 Subscription check for ${telegramId} in ${channelId}: ${isSubscribed ? '✅ Subscribed' : '❌ Not subscribed'} (status: ${member.status})`);
    return isSubscribed;
  } catch (e) {
    console.error(`❌ Subscription check error for user ${telegramId} in channel ${channelId}:`, e.message);
    console.error('💡 Possible causes: 1) Bot is not admin in channel, 2) Wrong channel ID, 3) Channel is private');
    return false;
  }
}

async function askForSubscription(telegramId, nextLesson = 3) {
  const channelLink = await db.getBotMessage('free_channel_link') || 'https://t.me/your_channel';
  
  const msg = await db.getBotMessage('subscribe_required') || 
`🔒 <b>${nextLesson}-darsga o'tish uchun kanalimizga obuna bo'ling!</b>

Kanalda siz uchun foydali:
📚 Qo'shimcha materiallar
💡 Maslahatlar va lifehacklar
🎁 Maxsus bonuslar

Obuna bo'lgandan keyin "✅ Obuna bo'ldim" tugmasini bosing.`;

  await bot.telegram.sendMessage(telegramId, msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📢 Kanalga o\'tish', channelLink)],
      [Markup.button.callback('✅ Obuna bo\'ldim', 'check_subscription_' + nextLesson)]
    ])
  });
  
  // Mark user as waiting for subscription
  await db.updateUser(telegramId, { waiting_subscription: true, pending_lesson: nextLesson });
}

// Check subscription button handler
bot.action(/^check_subscription_?(\d*)$/, async (ctx) => {
  const telegramId = ctx.from.id;
  const user = await db.getUser(telegramId);
  
  // Get next lesson from callback or user data
  let nextLesson = ctx.match[1] ? parseInt(ctx.match[1]) : (user?.pending_lesson || 3);
  
  const isSubscribed = await checkFreeChannelSubscription(telegramId);
  
  if (isSubscribed) {
    await ctx.answerCbQuery('✅ Rahmat! Obuna tasdiqlandi!');
    await ctx.editMessageReplyMarkup(undefined);
    
    // Update user and continue to next lesson
    await db.updateUser(telegramId, { 
      waiting_subscription: false, 
      subscribed_free_channel: true,
      pending_lesson: null 
    });
    
    await ctx.reply('🎉 Ajoyib! Endi davom etamiz...');
    await delay(1000);
    
    // Continue with CustDev or send lesson
    const prevLesson = nextLesson - 1;
    const questions = await db.getCustDevQuestionsForLesson(prevLesson);
    
    if (questions && questions.length > 0) {
      // Has CustDev questions for previous lesson
      await startCustDev(telegramId, prevLesson);
    } else {
      // No CustDev, send next lesson directly
      await sendLesson(telegramId, nextLesson);
    }
  } else {
    await ctx.answerCbQuery('❌ Siz hali obuna bo\'lmagansiz! Avval kanalga obuna bo\'ling.', { show_alert: true });
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

  // ============ CHECK SUBSCRIPTION BEFORE LESSON 3 ============
  const requireSubLesson = parseInt(await db.getBotMessage('require_subscription_before_lesson')) || 3;
  
  if (next === requireSubLesson && !user.subscribed_free_channel) {
    // Check if already subscribed
    const isSubscribed = await checkFreeChannelSubscription(telegramId);
    
    if (!isSubscribed) {
      // Ask for subscription
      await askForSubscription(telegramId);
      return; // Don't continue until subscribed
    } else {
      // Already subscribed, mark it
      await db.updateUser(telegramId, { subscribed_free_channel: true });
    }
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

  // Check if feedback flow is enabled
  const feedbackEnabledStr = await db.getSetting('feedback_enabled');
  const feedbackEnabled = feedbackEnabledStr !== 'false';

  // Get pitch delay from dashboard settings (stored in minutes)
  const pitchDelayStr = await db.getSetting('pitch_delay_minutes') || await db.getBotMessage('pitch_delay_minutes');
  let pitchDelayMinutes = parseFloat(pitchDelayStr) || 0;

  // Get sales delay from dashboard settings (stored in minutes)
  const salesDelayStr = await db.getSetting('sales_delay_minutes') || await db.getBotMessage('sales_delay_minutes');
  let salesDelayMinutes = parseFloat(salesDelayStr) || 0;

  // Get soft attack delay from dashboard settings (stored in minutes)
  const softDelayStr = await db.getSetting('soft_attack_delay_minutes') || await db.getBotMessage('soft_attack_delay_minutes');
  let softAttackDelayMinutes = parseFloat(softDelayStr) || 1440; // default 24 hours

  // Check if soft attack is disabled
  const softDisabledStr = await db.getSetting('soft_attack_disabled') || await db.getBotMessage('soft_attack_disabled');
  const softAttackDisabled = softDisabledStr === 'true' || softDisabledStr === true;

  console.log(`📊 Progrev settings for ${telegramId}:`);
  console.log(`   Feedback enabled: ${feedbackEnabled}`);
  console.log(`   Pitch delay: ${pitchDelayMinutes} min`);
  console.log(`   Sales delay: ${salesDelayMinutes} min`);
  console.log(`   Soft attack delay: ${softAttackDelayMinutes} min (disabled: ${softAttackDisabled})`);

  // ============ STEP 1: CONGRATULATIONS ============
  // Read from bot_messages first (where dashboard saves), then fall back
  const congratsMsg = await db.getBotMessage('congrats_text') || await db.getBotMessage('post_lesson_congrats') ||
    '🎉 <b>Tabriklayman, {{ism}}!</b>\n\nBarcha bepul darslarni tugatdingiz!';
  const personalizedCongrats = await replaceVars(congratsMsg, user);

  await bot.telegram.sendMessage(telegramId, personalizedCongrats, { parse_mode: 'HTML' });
  await db.updateUser(telegramId, { funnel_step: 8 });

  console.log(`✅ Step 1: Congrats sent to ${telegramId}`);

  // ============ STEP 2: FEEDBACK / VIDEO PITCH ============
  // Send immediately with small delay for better UX
  await delay(2000);

  if (feedbackEnabled) {
    // Send feedback question immediately
    await sendFeedbackQuestion(telegramId);
    console.log(`✅ Step 2: Feedback question sent immediately to ${telegramId}`);
    // Sales pitch will be triggered by feedback response
  } else {
    // Old flow - send video pitch
    if (pitchDelayMinutes <= 0) {
      await sendVideoPitch(telegramId);
      console.log(`✅ Step 2: Video pitch sent immediately to ${telegramId}`);
    } else {
      const pitchTime = new Date(Date.now() + pitchDelayMinutes * 60 * 1000);
      await db.scheduleMessage(telegramId, 'video_pitch', pitchTime, {});
      console.log(`📅 Step 2: Video pitch scheduled for ${pitchTime.toISOString()}`);
    }

    // ============ STEP 3: SALES PITCH (only if feedback disabled) ============
    const totalSalesDelay = pitchDelayMinutes + salesDelayMinutes;

    if (totalSalesDelay <= 0) {
      await delay(3000);
      await sendSalesPitch(telegramId);
      console.log(`✅ Step 3: Sales pitch sent immediately to ${telegramId}`);
    } else {
      const salesTime = new Date(Date.now() + totalSalesDelay * 60 * 1000);
      await db.scheduleMessage(telegramId, 'sales_pitch', salesTime, {});
      console.log(`📅 Step 3: Sales pitch scheduled for ${salesTime.toISOString()}`);
    }
  }

  // ============ STEP 4: SOFT ATTACK (Follow-up) ============
  if (!softAttackDisabled && softAttackDelayMinutes > 0) {
    const softAttackTime = new Date(Date.now() + softAttackDelayMinutes * 60 * 1000);
    await db.scheduleMessage(telegramId, 'soft_attack', softAttackTime, {});
    console.log(`📅 Step 4: Soft attack scheduled for ${softAttackTime.toISOString()}`);
  }
}

// ============ FEEDBACK QUESTION ============
async function sendFeedbackQuestion(telegramId) {
  const user = await db.getUser(telegramId);

  // Reset feedback_given flag for new feedback flow
  await db.updateUser(telegramId, { feedback_given: false, waiting_feedback: false });

  // Get configurable texts from dashboard
  const feedbackQuestion = await db.getSetting('feedback_question') || 'Bepul darslar yoqdimi? 🤔';
  const yesBtn = await db.getSetting('feedback_yes_btn') || '👍 Ha, juda yoqdi!';
  const noBtn = await db.getSetting('feedback_no_btn') || '😐 Unchalik emas';

  // Get pitch media (video/audio/image) but use dashboard text for caption
  const pitch = await db.getPitchMedia();

  // ALWAYS use dashboard feedback_question setting for the text
  // pitch.text is for old video pitch flow, not feedback flow
  let text = await replaceVars(feedbackQuestion, user);

  const feedbackButtons = Markup.inlineKeyboard([
    [
      Markup.button.callback(yesBtn, 'feedback_yes'),
      Markup.button.callback(noBtn, 'feedback_no')
    ]
  ]);

  console.log(`📤 Sending feedback question to ${telegramId}: "${text.substring(0, 50)}..."`);
  console.log(`   Buttons: "${yesBtn}" / "${noBtn}"`);

  try {
    if (pitch?.video_file_id) {
      await bot.telegram.sendVideo(telegramId, pitch.video_file_id, {
        caption: text,
        parse_mode: 'HTML',
        ...feedbackButtons
      });
    } else if (pitch?.video_note_file_id) {
      // Video notes can't have captions with buttons, so send separately
      await bot.telegram.sendVideoNote(telegramId, pitch.video_note_file_id);
      await delay(500);
      await bot.telegram.sendMessage(telegramId, text, {
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
    console.log(`✅ Feedback question sent to ${telegramId}`);
  } catch (e) {
    console.error(`❌ Error sending feedback to ${telegramId}:`, e.message);
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

// Ha - yoqdi → Pullik kanal haqida info + tugma
bot.action('feedback_yes', async (ctx) => {
  const telegramId = ctx.from.id;
  console.log(`🔘 feedback_yes clicked by ${telegramId}`);

  try {
    // Prevent duplicate processing
    const user = await db.getUser(telegramId);
    console.log(`📋 User state: feedback_given=${user?.feedback_given}, waiting_feedback=${user?.waiting_feedback}`);

    if (user?.feedback_given) {
      console.log(`⚠️ Duplicate feedback_yes from ${telegramId}, ignoring`);
      await ctx.answerCbQuery('Allaqachon javob berdingiz');
      return;
    }

    await ctx.answerCbQuery('Ajoyib! 🎉');

    // Mark feedback as given FIRST to prevent duplicates
    await db.updateUser(telegramId, { feedback_given: true, feedback_type: 'positive' });
    console.log(`✅ Updated user flags for ${telegramId}`);

    // Save feedback
    try {
      await db.saveFeedback(telegramId, 'liked', 'Bepul darslar yoqdi');
      console.log(`✅ Saved feedback for ${telegramId}`);
    } catch (e) {
      console.error(`saveFeedback error:`, e.message);
    }

    // Edit message to remove buttons
    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
      console.log(`Could not remove buttons: ${e.message}`);
    }

    await delay(500);

    // Send pitch info with media and button
    await sendPitchInfo(telegramId);
    console.log(`✅ Positive feedback from ${telegramId} → Pitch info sent`);
  } catch (error) {
    console.error(`❌ Error in feedback_yes handler for ${telegramId}:`, error);
    console.error(`Error stack:`, error.stack);
    try {
      await ctx.reply('❌ Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
    } catch (e) {}
    try {
      await ctx.answerCbQuery('Xatolik yuz berdi');
    } catch (e) {}
  }
});

// Send pitch info with media and "Kursga yozilish" button
async function sendPitchInfo(telegramId) {
  const user = await db.getUser(telegramId);

  // Get pitch info text
  const pitchInfoText = await db.getSetting('pitch_info_text') ||
    '🎉 Ajoyib tanlov!\n\nTo\'liq kursda sizni kutmoqda:\n✅ 50+ dars\n✅ Amaliy topshiriqlar\n✅ Sertifikat\n\nHoziroq ro\'yxatdan o\'ting! 👇';

  // Get button text
  const pitchBtnText = await db.getSetting('pitch_info_btn') || '🚀 Kursga yozilish';

  // Get pitch media
  const pitchMedia = await db.getPitchMedia();

  const personalizedText = await replaceVars(pitchInfoText, user || {});

  const button = Markup.inlineKeyboard([
    [Markup.button.callback(pitchBtnText, 'show_sales_pitch')]
  ]);

  console.log(`📤 Sending pitch info to ${telegramId}`);

  try {
    if (pitchMedia?.video_file_id) {
      await bot.telegram.sendVideo(telegramId, pitchMedia.video_file_id, {
        caption: personalizedText,
        parse_mode: 'HTML',
        ...button
      });
    } else if (pitchMedia?.video_note_file_id) {
      // Video notes can't have captions, send separately
      await bot.telegram.sendVideoNote(telegramId, pitchMedia.video_note_file_id);
      await delay(500);
      await bot.telegram.sendMessage(telegramId, personalizedText, {
        parse_mode: 'HTML',
        ...button
      });
    } else if (pitchMedia?.audio_file_id) {
      await bot.telegram.sendVoice(telegramId, pitchMedia.audio_file_id, {
        caption: personalizedText,
        parse_mode: 'HTML',
        ...button
      });
    } else if (pitchMedia?.image_file_id) {
      await bot.telegram.sendPhoto(telegramId, pitchMedia.image_file_id, {
        caption: personalizedText,
        parse_mode: 'HTML',
        ...button
      });
    } else {
      // Just text with button
      await bot.telegram.sendMessage(telegramId, personalizedText, {
        parse_mode: 'HTML',
        ...button
      });
    }
    console.log(`✅ Pitch info sent to ${telegramId}`);
  } catch (e) {
    console.error(`❌ Error sending pitch info to ${telegramId}:`, e.message);
    // Fallback to just text
    await bot.telegram.sendMessage(telegramId, personalizedText, {
      parse_mode: 'HTML',
      ...button
    });
  }
}

// Yo'q - yoqmadi → sabab so'rash
bot.action('feedback_no', async (ctx) => {
  const telegramId = ctx.from.id;
  console.log(`🔘 feedback_no clicked by ${telegramId}`);

  try {
    // Prevent duplicate processing
    const user = await db.getUser(telegramId);
    console.log(`📋 User state: feedback_given=${user?.feedback_given}, waiting_feedback=${user?.waiting_feedback}`);

    if (user?.feedback_given || user?.waiting_feedback) {
      console.log(`⚠️ Duplicate feedback_no from ${telegramId}, ignoring`);
      await ctx.answerCbQuery('Allaqachon javob berdingiz');
      return;
    }

    await ctx.answerCbQuery('Tushundim');

    // Mark feedback as given FIRST to prevent duplicates
    await db.updateUser(telegramId, { feedback_given: true, waiting_feedback: true, feedback_type: 'negative' });
    console.log(`✅ Updated user flags for ${telegramId}`);

    // Save feedback
    try {
      await db.saveFeedback(telegramId, 'not_liked', 'Bepul darslar yoqmadi');
      console.log(`✅ Saved feedback for ${telegramId}`);
    } catch (e) {
      console.error(`saveFeedback error:`, e.message);
    }

    // Edit message to remove buttons
    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
      console.log(`Could not remove buttons: ${e.message}`);
    }

    // Get configurable response
    const noResponse = await db.getSetting('feedback_no_response') ||
      '😔 Tushunaman. Iltimos, nimada kamchilik borligini yozing - bu bizga yaxshilanishga yordam beradi!\n\n<i>(Oddiy xabar yozing)</i>';
    console.log(`📝 Sending response: "${noResponse.substring(0, 50)}..."`);

    const personalizedResponse = await replaceVars(noResponse, user || {});

    await ctx.reply(personalizedResponse, { parse_mode: 'HTML' });
    console.log(`✅ Reply sent to ${telegramId}`);

    // Schedule sales pitch anyway after delay (backup)
    const salesDelay = parseInt(await db.getSetting('feedback_no_sales_delay')) || 30;
    if (salesDelay > 0) {
      const salesTime = new Date(Date.now() + salesDelay * 60 * 1000);
      await db.scheduleMessage(telegramId, 'sales_pitch', salesTime, { from_negative_feedback: true });
      console.log(`📅 Negative feedback from ${telegramId} → Sales pitch scheduled in ${salesDelay} min`);
    }
  } catch (error) {
    console.error(`❌ Error in feedback_no handler for ${telegramId}:`, error);
    console.error(`Error stack:`, error.stack);
    // Try to send error message to user
    try {
      await ctx.reply('❌ Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
    } catch (e) {}
    try {
      await ctx.answerCbQuery('Xatolik yuz berdi');
    } catch (e) {}
  }
});

// Show prices button (agar kerak bo'lsa)
bot.action('show_prices', async (ctx) => {
  await ctx.answerCbQuery();
  await sendSalesPitch(ctx.from.id);
});

export async function sendSalesPitch(telegramId, extraDiscount = 0) {
  const user = await db.getUser(telegramId);
  const plans = await db.getSubscriptionPlans(true);

  let text = await db.getBotMessage('sales_pitch') || '🎓 <b>SMM PRO KURSGA TAKLIF!</b>\n\nObuna turini tanlang:';
  text = await replaceVars(text, user);

  // Create plan selection buttons with optional extra discount
  const planButtons = plans.map(plan => {
    let finalPrice = plan.price;
    let totalDiscount = plan.discount_percent || 0;

    // Apply extra discount if provided (e.g., 20% for special offer)
    if (extraDiscount > 0) {
      finalPrice = Math.round(plan.price * (100 - extraDiscount) / 100);
      totalDiscount = extraDiscount + (plan.discount_percent || 0);
    }

    const priceFormatted = formatMoney(finalPrice);
    const label = totalDiscount > 0
      ? `${plan.name} - ${priceFormatted} (-${totalDiscount}%)`
      : `${plan.name} - ${priceFormatted}`;
    // Store both original plan and discount info in callback
    const callbackData = extraDiscount > 0 ? `discount_plan_${extraDiscount}_${plan.id}` : `plan_${plan.id}`;
    return [Markup.button.callback(label, callbackData)];
  });

  // Add info about plans
  let plansInfo = '\n\n📋 <b>Obuna turlari:</b>\n';
  for (const plan of plans) {
    let finalPrice = plan.price;
    let totalDiscount = plan.discount_percent || 0;

    if (extraDiscount > 0) {
      finalPrice = Math.round(plan.price * (100 - extraDiscount) / 100);
      totalDiscount = extraDiscount + (plan.discount_percent || 0);
    }

    const priceFormatted = formatMoney(finalPrice);
    const originalPrice = extraDiscount > 0 ? ` <s>${formatMoney(plan.price)}</s>` : '';
    const discountText = totalDiscount > 0 ? ` <i>(-${totalDiscount}% chegirma)</i>` : '';
    plansInfo += `• ${plan.name}:${originalPrice} <b>${priceFormatted}</b>${discountText}\n`;
  }

  // Add special badge for discounted offers
  if (extraDiscount > 0) {
    text = `🎁 <b>MAXSUS ${extraDiscount}% CHEGIRMA!</b>\n\n` + text;
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

// Handle discounted plan selection (special offer)
bot.action(/^discount_plan_(\d+)_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const discountPercent = parseInt(ctx.match[1]);
  const planId = ctx.match[2];
  const telegramId = ctx.from.id;

  const plan = await db.getSubscriptionPlan(planId);
  if (!plan) {
    return ctx.reply('❌ Bunday obuna turi topilmadi');
  }

  // Calculate discounted price
  const discountedPrice = Math.round(plan.price * (100 - discountPercent) / 100);

  const orderId = ('DSC' + Date.now() + telegramId).slice(0, 20);
  await db.createPayment(orderId, telegramId, discountedPrice, planId);

  const paymeUrl = BASE_URL + '/payme/api/checkout-url?order_id=' + orderId + '&amount=' + discountedPrice + '&plan=' + planId + '&discount=' + discountPercent + '&redirect=1';
  const clickUrl = BASE_URL + '/click/api/checkout-url?order_id=' + orderId + '&amount=' + discountedPrice + '&plan=' + planId + '&discount=' + discountPercent + '&redirect=1';

  // Check which payment systems are enabled
  const paymeEnabledStr = await db.getSetting('payme_enabled') || await db.getBotMessage('payme_enabled');
  const clickEnabledStr = await db.getSetting('click_enabled') || await db.getBotMessage('click_enabled');

  const paymeEnabled = paymeEnabledStr !== 'false' && paymeEnabledStr !== false;
  const clickEnabled = clickEnabledStr !== 'false' && clickEnabledStr !== false;

  // Build payment buttons based on settings
  const paymentButtons = [];
  if (paymeEnabled) paymentButtons.push(Markup.button.url('💳 Payme', paymeUrl));
  if (clickEnabled) paymentButtons.push(Markup.button.url('💠 Click', clickUrl));

  if (paymentButtons.length === 0) {
    return ctx.reply('❌ Hozircha to\'lov tizimlari mavjud emas. Keyinroq urinib ko\'ring.');
  }

  const text = `🎁 <b>${plan.name} obuna tanlandi (${discountPercent}% chegirma!)</b>\n\n` +
    `💰 Asl narx: <s>${formatMoney(plan.price)}</s>\n` +
    `🔥 Chegirmali narx: <b>${formatMoney(discountedPrice)}</b>\n` +
    `📅 Muddat: <b>${plan.duration_days} kun</b>\n\n` +
    `To'lov usulini tanlang:`;

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      paymentButtons,
      [Markup.button.callback('⬅️ Orqaga', 'back_to_plans')]
    ])
  });
});

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

  // Check which payment systems are enabled
  const paymeEnabledStr = await db.getSetting('payme_enabled') || await db.getBotMessage('payme_enabled');
  const clickEnabledStr = await db.getSetting('click_enabled') || await db.getBotMessage('click_enabled');

  const paymeEnabled = paymeEnabledStr !== 'false' && paymeEnabledStr !== false;
  const clickEnabled = clickEnabledStr !== 'false' && clickEnabledStr !== false;

  // Build payment buttons based on settings
  const paymentButtons = [];
  if (paymeEnabled) paymentButtons.push(Markup.button.url('💳 Payme', paymeUrl));
  if (clickEnabled) paymentButtons.push(Markup.button.url('💠 Click', clickUrl));

  // If no payment systems enabled, show error
  if (paymentButtons.length === 0) {
    return ctx.reply('❌ Hozircha to\'lov tizimlari mavjud emas. Keyinroq urinib ko\'ring.');
  }

  const text = `✅ <b>${plan.name} obuna tanlandi</b>\n\n` +
    `💰 Narx: <b>${formatMoney(plan.price)}</b>\n` +
    `📅 Muddat: <b>${plan.duration_days} kun</b>\n\n` +
    `To'lov usulini tanlang:`;

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      paymentButtons,
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

  // Check which payment systems are enabled
  const paymeEnabledStr = await db.getSetting('payme_enabled') || await db.getBotMessage('payme_enabled');
  const clickEnabledStr = await db.getSetting('click_enabled') || await db.getBotMessage('click_enabled');

  const paymeEnabled = paymeEnabledStr !== 'false' && paymeEnabledStr !== false;
  const clickEnabled = clickEnabledStr !== 'false' && clickEnabledStr !== false;

  // Build payment buttons based on settings
  const paymentButtons = [];
  if (paymeEnabled) paymentButtons.push(Markup.button.url('💳 Payme', paymeUrl));
  if (clickEnabled) paymentButtons.push(Markup.button.url('💠 Click', clickUrl));

  if (paymentButtons.length === 0) {
    return ctx.reply('❌ Hozircha to\'lov tizimlari mavjud emas. Keyinroq urinib ko\'ring.');
  }

  const text = `🔄 <b>Obunani uzaytirish</b>\n\n` +
    `📦 Reja: <b>${plan.name}</b>\n` +
    `💰 Narx: <b>${formatMoney(plan.price)}</b>\n` +
    `📅 Qo'shiladigan muddat: <b>${plan.duration_days} kun</b>\n\n` +
    `To'lov usulini tanlang:`;

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      paymentButtons,
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

bot.action(/^rf:(\d+):(\d+):(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const telegramId = ctx.from.id;
    const funnelId = parseInt(ctx.match[1]);
    const lesson = parseInt(ctx.match[2]);
    const resume = parseInt(ctx.match[3]);
    await ctx.reply(`Tanlangan dars: ${lesson}-dars. Tugagach, davom etamiz.`);
    await sendFunnelLesson(telegramId, funnelId, lesson, { replay: true, resumeLesson: resume });
  } catch (e) {
    console.error('Replay funnel error:', e);
    await ctx.reply('Xatolik. Birozdan keyin urinib ko\'ring.');
  }
});

bot.action(/^rl:(\d+):(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const telegramId = ctx.from.id;
    const lesson = parseInt(ctx.match[1]);
    const resume = parseInt(ctx.match[2]);
    await ctx.reply(`Tanlangan dars: ${lesson}-dars. Tugagach, davom etamiz.`);
    await sendLesson(telegramId, lesson, { replay: true, resumeLesson: resume });
  } catch (e) {
    console.error('Replay lesson error:', e);
    await ctx.reply('Xatolik. Birozdan keyin urinib ko\'ring.');
  }
});

bot.action(/^resume_f:(\d+):(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const telegramId = ctx.from.id;
    const funnelId = parseInt(ctx.match[1]);
    const resume = parseInt(ctx.match[2]);
    await sendFunnelLesson(telegramId, funnelId, resume);
  } catch (e) {
    console.error('Resume funnel error:', e);
    await ctx.reply('Xatolik. Birozdan keyin urinib ko\'ring.');
  }
});

bot.action(/^resume_l:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const telegramId = ctx.from.id;
    const resume = parseInt(ctx.match[1]);
    await sendLesson(telegramId, resume);
  } catch (e) {
    console.error('Resume lesson error:', e);
    await ctx.reply('Xatolik. Birozdan keyin urinib ko\'ring.');
  }
});

function formatLessonHistory(lessons, currentLesson, maxItems = 5) {
  const prev = (lessons || [])
    .filter(l => Number(l.lesson_number) < Number(currentLesson))
    .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
  if (!prev.length) return '';
  const recent = prev.slice(-maxItems);
  const lines = recent.map(l => `${l.lesson_number}-dars: ${l.title || ''}`.trim());
  return `Oldingi darslar:\n${lines.join('\n')}`;
}

function buildHistoryButtons(lessons, currentLesson, resumeLesson, funnelId = null, maxItems = 5) {
  const prev = (lessons || [])
    .filter(l => Number(l.lesson_number) < Number(currentLesson))
    .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number))
    .slice(-maxItems);
  if (!prev.length) return null;
  const rows = prev.map(l => {
    const lessonNum = Number(l.lesson_number);
    const data = funnelId
      ? `rf:${funnelId}:${lessonNum}:${resumeLesson}`
      : `rl:${lessonNum}:${resumeLesson}`;
    return [Markup.button.callback(`${lessonNum}-dars`, data)];
  });
  return Markup.inlineKeyboard(rows);
}

bot.command('continue', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const user = await db.getUser(telegramId);
    if (!user) return ctx.reply('/start bosing.');

    const activeFunnel = await db.getUserActiveFunnel(telegramId);
    if (activeFunnel) {
      const current = activeFunnel.current_lesson || user.current_lesson || 0;
      if (current <= 0) {
        await ctx.reply('Darslar qayta boshlanadi. Birinchi darsdan boshlaymiz.');
        await delay(500);
        return sendFunnelLesson(telegramId, activeFunnel.funnel_id, 1);
      }

      const lessons = await db.getFunnelLessons(activeFunnel.funnel_id);
      const history = formatLessonHistory(lessons, current);
      const historyButtons = buildHistoryButtons(lessons, current, current, activeFunnel.funnel_id);
      let msg = `Siz ${current}-darsda to'xtagansiz. Qayta ko'rib chiqamiz.\n`;
      if (history) msg += `\n${history}\n`;
      msg += '\nAgar oldingi darsni ko\'rmoqchi bo\'lsangiz, pastdan tanlang.';
      await ctx.reply(msg, historyButtons ? { ...historyButtons } : undefined);
      await delay(500);
      return sendFunnelLesson(telegramId, activeFunnel.funnel_id, current);
    }

    const current = user.current_lesson || 0;
    if (current <= 0) {
      await ctx.reply('Darslar qayta boshlanadi. Birinchi darsdan boshlaymiz.');
      await delay(500);
      return startLessons(telegramId);
    }

    const lessons = await db.getAllLessons();
    const history = formatLessonHistory(lessons, current);
    const historyButtons = buildHistoryButtons(lessons, current, current);
    let msg = `Siz ${current}-darsda to'xtagansiz. Qayta ko'rib chiqamiz.\n`;
    if (history) msg += `\n${history}\n`;
    msg += '\nAgar oldingi darsni ko\'rmoqchi bo\'lsangiz, pastdan tanlang.';
    await ctx.reply(msg, historyButtons ? { ...historyButtons } : undefined);
    await delay(500);
    await sendLesson(telegramId, current);
  } catch (e) {
    console.error('Continue error:', e);
    await ctx.reply('Xatolik yuz berdi. /start bosing yoki birozdan keyin qayta urinib ko\'ring.');
  }
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
// Last deploy: 2026-02-09 02:30:26
