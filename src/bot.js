import { Telegraf, Markup } from 'telegraf';
import * as db from './database.js';
import { logAudit, AuditEvents } from './utils/security.js';
import { chatWithSalesAgent } from './ai/sales-agent.js';

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
const isAdmin = (id) => {
  const numId = Number(id);
  const result = ADMIN_IDS.includes(numId);
  if (!result && ADMIN_IDS.length > 0) {
    console.log(`🔍 isAdmin check: ${id} (type: ${typeof id}) not in [${ADMIN_IDS.join(', ')}]`);
  }
  return result;
};
const formatMoney = (t) => (t / 100).toLocaleString('uz-UZ') + " so'm";

export async function setupAdminWebAppMenu() {
  if (!BASE_URL) {
    console.log('⚠️ BASE_URL yoq, admin WebApp menu o\'rnatilmadi');
    return;
  }

  if (!ADMIN_IDS.length) {
    console.log('⚠️ ADMIN_IDS bo\'sh, admin WebApp menu o\'rnatilmadi');
    return;
  }

  const webAppUrl = `${BASE_URL.replace(/\/+$/, '')}/admin.html`;

  for (const adminId of ADMIN_IDS) {
    try {
      await bot.telegram.setChatMenuButton({
        chatId: adminId,
        menuButton: {
          type: 'web_app',
          text: 'Admin panel',
          web_app: { url: webAppUrl }
        }
      });
      console.log(`✅ Admin menu button o\'rnatildi: ${adminId}`);
    } catch (e) {
      console.error(`❌ Admin menu button error (${adminId}):`, e.message);
    }
  }
}

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
  const channelId = await db.getBotMessage('premium_channel_id') || await db.getSetting('premium_channel_id') || PREMIUM_CHANNEL_ID;
  
  if (!channelId) {
    console.log('❌ PREMIUM_CHANNEL_ID not set (check Dashboard > Kanal sozlamalari)');
    return null;
  }
  
  try {
    const expireDate = Math.floor(Date.now() / 1000) + (daysValid * 24 * 60 * 60);
    
    const inviteLink = await bot.telegram.createChatInviteLink(channelId, {
      member_limit: 2, // 2 clicks allowed in case of error/retry
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
  const channelId = await db.getBotMessage('premium_channel_id') || await db.getSetting('premium_channel_id') || PREMIUM_CHANNEL_ID;
  
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

// ============ PREMIUM CHANNEL JOIN/LEAVE TRACKING ============
bot.on('chat_member', async (ctx) => {
  try {
    const update = ctx.update.chat_member;
    if (!update) return;

    const chat = update.chat;
    const newMember = update.new_chat_member;
    const userId = newMember.user?.id;

    if (!userId) return;

    // Get premium channel ID from settings
    const channelSettings = await db.getChannelSettings();
    const premiumChannelId = channelSettings.channel_id || PREMIUM_CHANNEL_ID;

    if (!premiumChannelId) return;

    // Check if this is the premium channel
    const chatIdStr = String(chat.id);
    const premiumIdStr = String(premiumChannelId).replace(/^@/, '');
    if (chatIdStr !== premiumIdStr && chat.username !== premiumIdStr) return;

    const oldStatus = update.old_chat_member?.status;
    const newStatus = newMember.status;

    // User joined the channel
    if (['member', 'administrator', 'creator'].includes(newStatus) &&
        ['left', 'kicked', 'restricted'].includes(oldStatus)) {
      console.log(`📢 User ${userId} joined premium channel`);
      await db.markUserJoinedPremiumChannel(userId);
    }

    // User left the channel
    if (['left', 'kicked'].includes(newStatus) &&
        ['member', 'administrator', 'creator', 'restricted'].includes(oldStatus)) {
      console.log(`📢 User ${userId} left premium channel`);
      await db.markUserLeftPremiumChannel(userId);
    }
  } catch (e) {
    console.error('Chat member update error:', e.message);
  }
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Admin huquqi yoq');
  const webAppUrl = BASE_URL ? `${BASE_URL.replace(/\/+$/, '')}/admin.html` : null;
  if (webAppUrl) {
    try {
      await bot.telegram.setChatMenuButton({
        chatId: ctx.from.id,
        menuButton: {
          type: 'web_app',
          text: 'Admin panel',
          web_app: { url: webAppUrl }
        }
      });
    } catch (e) {
      console.error('setChatMenuButton (/admin) error:', e.message);
    }
  }
  const webAppButton = webAppUrl
    ? Markup.inlineKeyboard([
        [Markup.button.webApp('📊 Admin panelni ochish', webAppUrl)]
      ])
    : null;

  await ctx.reply(
    `🔐 Admin Panel\n\n/stats - Statistika\n/resetme - Reset qilish\n/testfeedback - Feedback savolini test qilish\n/testpitch - Pitch ni test qilish\n/testsales - To'lov tugmalarini test qilish\n\n📊 Dashboard: ${webAppUrl || 'BASE_URL yo\'q'}\n🛰 Chat monitor: ${CHAT_MONITOR_ENABLED ? 'yoqilgan' : 'o\'chirilgan'}\n🔔 Realtime admin notify: ${CHAT_MONITOR_NOTIFY_ADMINS ? 'yoqilgan' : 'o\'chirilgan'} (ENV: CHAT_MONITOR_NOTIFY_ADMINS)`,
    { parse_mode: 'HTML', ...(webAppButton || {}) }
  );
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

// Referral system - /myref command
bot.command('myref', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const user = await db.getUser(telegramId);
    if (!user) {
      return ctx.reply('Avval /start buyrug\'ini bosing.');
    }

    // Check if referral system is enabled
    const enabled = await db.getSetting('referral_enabled');
    if (enabled !== 'true') {
      return ctx.reply('Referal tizimi hozircha faol emas.');
    }

    // Generate or get existing referral code
    const code = await db.generateReferralCode(telegramId);
    const stats = await db.getReferralStats(telegramId);
    const requiredCount = parseInt(await db.getSetting('referral_required_count') || '3');
    const discountPercent = parseInt(await db.getSetting('referral_discount_percent') || '50');

    const botInfo = await bot.telegram.getMe();
    const refLink = `https://t.me/${botInfo.username}?start=ref_${code}`;

    let statusText = '';
    if (stats.qualified >= requiredCount && !user.referral_discount_used) {
      statusText = `\n\n🎊 <b>Tabriklaymiz!</b> Siz ${discountPercent}% chegirma oldingiz!\n⚠️ <i>Bu chegirma faqat bir marta amal qiladi!</i>\nTo'lov sahifasida chegirmani qo'llashingiz mumkin.`;
    } else if (user.referral_discount_used) {
      statusText = `\n\n✅ Siz chegirmadan allaqachon foydalangansiz.`;
    } else {
      const remaining = requiredCount - stats.qualified;
      statusText = `\n\n💡 Yana ${remaining} ta faol odam olib keling va ${discountPercent}% chegirma oling!\n<i>(Chegirma bir martalik)</i>`;
    }

    await ctx.reply(
      `🔗 <b>Sizning referal havolangiz:</b>\n<code>${refLink}</code>\n\n` +
      `📊 <b>Statistika:</b>\n` +
      `├ Jami taklif qilganlar: ${stats.total}\n` +
      `├ Faol (dars ko'rgan): ${stats.qualified}\n` +
      `└ Kutilmoqda: ${stats.pending}\n` +
      statusText,
      { parse_mode: 'HTML' }
    );
  } catch (e) {
    console.error('myref error:', e);
    await ctx.reply('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
  }
});

// /myid - show user's Telegram ID and admin status
bot.command('myid', async (ctx) => {
  const userId = ctx.from.id;
  const isUserAdmin = isAdmin(userId);
  const adminList = ADMIN_IDS.length > 0 ? ADMIN_IDS.join(', ') : '(bo\'sh)';

  await ctx.reply(
    `🆔 <b>Sizning Telegram ID:</b>\n<code>${userId}</code>\n\n` +
    `👤 Admin: ${isUserAdmin ? '✅ Ha' : '❌ Yo\'q'}\n` +
    `📋 ADMIN_IDS: ${adminList}\n\n` +
    `💡 Agar admin bo'lishingiz kerak bo'lsa, Render.com da ADMIN_IDS ga ${userId} ni qo'shing.`,
    { parse_mode: 'HTML' }
  );
});

bot.start(async (ctx) => {
  try {
    const tgUser = ctx.from;
    const telegramId = tgUser.id;

    // Parse deep link - t.me/bot?start=PAYLOAD
    // Formats:
    //   - "funnel-slug" - just funnel
    //   - "funnel-slug_source" - funnel + source (instagram, telegram, etc.)
    //   - "_source" - default funnel + source
    //   - "ref_CODE" - referral link
    const startPayload = ctx.startPayload;

    let funnelSlug = null;
    let source = null;
    let referralCode = null;

    if (startPayload && startPayload.length > 0) {
      // Check if it's a referral link
      if (startPayload.startsWith('ref_')) {
        referralCode = startPayload.replace('ref_', '');
        console.log('🔗 Referral code detected:', referralCode);
      } else {
        // Parse funnel_source format
        const lastUnderscore = startPayload.lastIndexOf('_');
        if (lastUnderscore > 0) {
          // Has underscore - split into funnel and source
          funnelSlug = startPayload.substring(0, lastUnderscore);
          source = startPayload.substring(lastUnderscore + 1);
          if (funnelSlug === '') funnelSlug = null; // "_source" format
        } else if (startPayload.startsWith('_')) {
          // Just source, no funnel
          source = startPayload.substring(1);
        } else {
          // Just funnel slug, no source
          funnelSlug = startPayload;
        }
        console.log('🎯 Deep link parsed - funnel:', funnelSlug, 'source:', source);
      }
    }

    // Find funnel by slug or get default
    let funnel = null;
    if (funnelSlug) {
      funnel = await db.getFunnelBySlug(funnelSlug);
      console.log('🎯 Deep link funnel:', funnelSlug, funnel ? '✅ Found' : '❌ Not found');
    }

    // If no funnel found by slug, get default
    if (!funnel) {
      funnel = await db.getDefaultFunnel();
      console.log('🎯 Using default funnel:', funnel?.name);
    }

    // If still no funnel, fallback to old behavior
    if (!funnel) {
      console.log('⚠️ No funnels configured, using legacy mode');
      return handleLegacyStart(ctx, telegramId, tgUser, source, referralCode);
    }

    let user = await db.getUser(telegramId);

    if (!user) {
      user = await db.createUser(telegramId, tgUser.username, null, source);
      logAudit(AuditEvents.userCreated(telegramId, source || 'direct'));
      await maybeNotifyUserMilestone(tgUser);

      // Handle referral if code provided
      if (referralCode) {
        const referrer = await db.getUserByReferralCode(referralCode);
        if (referrer && referrer.telegram_id !== telegramId) {
          await db.createReferral(referrer.telegram_id, telegramId, referralCode);
          logAudit(AuditEvents.referralCreated(referrer.telegram_id, telegramId));
          console.log('👥 Referral created:', referrer.telegram_id, '->', telegramId);
        }
      }

      // Start user in this funnel
      await db.startUserInFunnel(telegramId, funnel.id, source);
      console.log('👤 New user started in funnel:', funnel.name, 'source:', source);

      // Get gift name for welcome message
      const giftName = await db.getBotMessage('gift_name') || 'maxsus sovg\'a';
      let welcome = await db.getBotMessage('welcome_with_gift') || await db.getBotMessage('welcome') || 'Assalomu alaykum! SMM kursga xush kelibsiz!';
      welcome = welcome.replace(/\{\{gift_name\}\}/gi, giftName);
      await ctx.reply(welcome, { parse_mode: 'HTML' });
      await delay(500);
      const askName = await db.getBotMessage('ask_name') || 'Ism-familiyangizni kiriting:';
      await ctx.reply(askName, { parse_mode: 'HTML' });
      await db.updateUser(telegramId, { custdev_step: -1, funnel_step: 0 });
      return;
    }

    // Handle referral for existing users too (if not already referred)
    if (referralCode) {
      const referrer = await db.getUserByReferralCode(referralCode);
      if (referrer && referrer.telegram_id !== telegramId) {
        await db.createReferral(referrer.telegram_id, telegramId, referralCode);
        console.log('👥 Referral created (existing user):', referrer.telegram_id, '->', telegramId);
      }
    }

    // Check if user clicked different funnel link
    const userFunnel = await db.getUserActiveFunnel(telegramId);
    if (!userFunnel || userFunnel.funnel_id !== funnel.id) {
      // Start user in new funnel
      await db.startUserInFunnel(telegramId, funnel.id, source);
      console.log('🔄 User switched to funnel:', funnel.name, 'source:', source);
      
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

    if (user.funnel_step > 0 || user.current_lesson > 0) {
      // Returning user - show smart progress and auto-continue
      return handleReturningUser(ctx, telegramId, user);
    }

    await startLessons(telegramId);
  } catch (e) {
    console.error('Start error:', e);
    await ctx.reply('Xatolik. /start bosing.');
  }
});

// Legacy start handler (for backward compatibility)
async function handleLegacyStart(ctx, telegramId, tgUser, source = null, referralCode = null) {
  let user = await db.getUser(telegramId);

  if (!user) {
    user = await db.createUser(telegramId, tgUser.username, null, source);
    logAudit(AuditEvents.userCreated(telegramId, source || 'direct'));
    await maybeNotifyUserMilestone(tgUser);

    // Handle referral if code provided
    if (referralCode) {
      const referrer = await db.getUserByReferralCode(referralCode);
      if (referrer && referrer.telegram_id !== telegramId) {
        await db.createReferral(referrer.telegram_id, telegramId, referralCode);
        logAudit(AuditEvents.referralCreated(referrer.telegram_id, telegramId));
        console.log('👥 Referral created (legacy):', referrer.telegram_id, '->', telegramId);
      }
    }
    // Get gift name for welcome message
    const giftName = await db.getBotMessage('gift_name') || 'maxsus sovg\'a';
    let welcome = await db.getBotMessage('welcome_with_gift') || await db.getBotMessage('welcome') || 'Assalomu alaykum! SMM kursga xush kelibsiz!';
    welcome = welcome.replace(/\{\{gift_name\}\}/gi, giftName);
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

  if (user.funnel_step > 0 || user.current_lesson > 0) {
    // Returning user - show smart progress and auto-continue
    return handleReturningUser(ctx, telegramId, user);
  }

  await startLessons(telegramId);
}

// Handle returning users with smart progress
async function handleReturningUser(ctx, telegramId, user) {
  const totalLessons = 3; // Fixed 3 lessons
  const currentLesson = user.current_lesson || 0;
  const userName = user.full_name || "do'st";

  // Check test progress
  const test1Passed = user.test_1_passed || false;
  const test2Passed = user.test_2_passed || false;
  const test3Passed = user.test_3_passed || false;

  // Check if user is in the middle of a test
  if (user.test_mode && user.current_test_lesson) {
    await ctx.reply(
      `👋 Qaytganingiz bilan, ${userName}!\n\n` +
      `📝 Siz ${user.current_test_lesson}-dars testini yarim qoldirgan edingiz.\n\n` +
      `Testni qaytadan boshlaysizmi?`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🚀 Testni boshlash', `test_start_${user.current_test_lesson}`)],
          [Markup.button.callback('📚 Darsni qayta ko\'rish', `replay_lesson_${user.current_test_lesson}`)]
        ])
      }
    );
    return;
  }

  // Check if user completed all lessons and tests
  if (test1Passed && test2Passed && test3Passed) {
    await ctx.reply(
      `👋 Qaytganingiz bilan, ${userName}!\n\n` +
      `🎉 Siz barcha 3 ta darsni va testlarni muvaffaqiyatli tugatgansiz!\n\n` +
      `${user.is_paid ? '💎 Premium obunangiz faol!' : '🛒 Kursni sotib olish uchun:'}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(
          user.is_paid
            ? [[Markup.button.url('📢 Premium kanalga o\'tish', 'https://t.me/+...')]]
            : [[Markup.button.callback('💳 Kursni sotib olish', 'show_sales_pitch')]]
        )
      }
    );
    return;
  }

  // Build progress display
  let progressText = '📊 <b>Sizning progressingiz:</b>\n\n';
  progressText += `${test1Passed ? '✅' : (currentLesson >= 1 ? '📖' : '⬜')} 1-dars ${test1Passed ? '(Test o\'tdi)' : ''}\n`;
  progressText += `${test2Passed ? '✅' : (currentLesson >= 2 ? '📖' : '⬜')} 2-dars ${test2Passed ? '(Test o\'tdi)' : ''}\n`;
  progressText += `${test3Passed ? '✅' : (currentLesson >= 3 ? '📖' : '⬜')} 3-dars ${test3Passed ? '(Test o\'tdi)' : ''}\n`;

  // Determine what to do next
  let nextAction = '';
  let buttons = [];

  if (currentLesson === 0) {
    nextAction = '\n🎯 1-darsdan boshlaymiz!';
    buttons = [[Markup.button.callback('▶️ 1-darsni boshlash', 'start_lesson_1')]];
  } else if (currentLesson === 1 && !test1Passed) {
    nextAction = '\n🎯 1-dars testini topshiring!';
    buttons = [
      [Markup.button.callback('📝 1-dars testini boshlash', 'test_start_1')],
      [Markup.button.callback('📚 1-darsni qayta ko\'rish', 'replay_lesson_1')]
    ];
  } else if (currentLesson === 1 && test1Passed) {
    nextAction = '\n🎯 2-darsga o\'tamiz!';
    buttons = [[Markup.button.callback('▶️ 2-darsni boshlash', 'start_lesson_2')]];
  } else if (currentLesson === 2 && !test2Passed) {
    nextAction = '\n🎯 2-dars testini topshiring!';
    buttons = [
      [Markup.button.callback('📝 2-dars testini boshlash', 'test_start_2')],
      [Markup.button.callback('📚 2-darsni qayta ko\'rish', 'replay_lesson_2')]
    ];
  } else if (currentLesson === 2 && test2Passed) {
    nextAction = '\n🎯 3-darsga o\'tamiz!';
    buttons = [[Markup.button.callback('▶️ 3-darsni boshlash', 'start_lesson_3')]];
  } else if (currentLesson === 3 && !test3Passed) {
    nextAction = '\n🎯 3-dars testini topshiring!';
    buttons = [
      [Markup.button.callback('📝 3-dars testini boshlash', 'test_start_3')],
      [Markup.button.callback('📚 3-darsni qayta ko\'rish', 'replay_lesson_3')]
    ];
  }

  await ctx.reply(
    `👋 Qaytganingiz bilan, ${userName}!\n\n` +
    progressText + nextAction,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    }
  );
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

      // Track lesson delivery for inactivity reminders
      try {
        await db.trackLessonDelivery(telegramId, funnelId, lessonNumber);
      } catch (e) {
        console.log('Track lesson delivery error:', e.message);
      }
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

    // Check if waiting for promo code
    if (user.waiting_promo_code) {
      const promoCode = text.trim().toUpperCase();
      await db.updateUser(telegramId, { waiting_promo_code: false });

      // Validate promo code
      const validation = await db.validatePromoCode(promoCode, telegramId);

      if (!validation.valid) {
        await ctx.reply(
          `❌ <b>${validation.error}</b>\n\nQaytadan urinib ko'ring yoki oddiy narxda sotib oling.`,
          { parse_mode: 'HTML' }
        );
        await delay(1000);
        await sendSalesPitch(telegramId);
        return;
      }

      // Promo code is valid - show plans with discount
      const discountPercent = validation.discountPercent;
      const plans = await db.getSubscriptionPlans(true);

      let message = `✅ <b>Promo kod qabul qilindi!</b>\n\n` +
        `🎟️ Kod: <code>${promoCode}</code>\n` +
        `🎁 Chegirma: <b>${discountPercent}%</b>\n\n` +
        `📋 Obuna turini tanlang:\n\n`;

      const planButtons = plans.map(plan => {
        const discountedPrice = Math.round(plan.price * (100 - discountPercent) / 100);
        const originalPrice = formatMoney(plan.price);
        const finalPrice = formatMoney(discountedPrice);

        message += `• ${plan.name}: <s>${originalPrice}</s> → <b>${finalPrice}</b>\n`;

        return [Markup.button.callback(
          `${plan.name} - ${finalPrice}`,
          `promo_plan_${promoCode}_${plan.id}`
        )];
      });

      planButtons.push([Markup.button.callback('❌ Bekor qilish', 'cancel_promo')]);

      await ctx.reply(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(planButtons)
      });

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

    // AI Sales Agent - handle all other messages
    if (user.funnel_step > 0 || user.current_lesson > 0) {
      await handleAIChat(ctx, telegramId, text, user);
    }
  } catch (e) {
    console.error('Text error:', e);
  }
});

// AI Chat Handler
async function handleAIChat(ctx, telegramId, text, user) {
  try {
    // Check if AI is enabled
    const aiEnabled = await db.getBotMessage('ai_sales_enabled');
    if (aiEnabled === 'false') {
      // AI disabled - send fallback message
      if (!isAdmin(telegramId)) {
        const fallbackMsg = await db.getBotMessage('ai_fallback_message') || 'Savollaringiz bo\'lsa, yozing - tez orada javob beramiz!';
        await ctx.reply(fallbackMsg);
      }
      return;
    }

    // Show typing indicator
    await ctx.sendChatAction('typing');

    // Get AI response
    const response = await chatWithSalesAgent(telegramId, text);

    if (!response.success) {
      if (response.action === 'ai_disabled') {
        return; // Silently ignore
      }
      await ctx.reply(response.message || 'Uzr, texnik nosozlik.');
      return;
    }

    // Send AI message
    if (response.message) {
      await ctx.reply(response.message, { parse_mode: 'HTML' });
    }

    // Handle AI actions
    if (response.action) {
      await delay(500);
      await handleAIAction(ctx, telegramId, response.action, response.params, user);
    }

  } catch (e) {
    console.error('AI Chat error:', e);
    // Fallback - don't crash
  }
}

// Handle AI-triggered actions
async function handleAIAction(ctx, telegramId, action, params, user) {
  try {
    switch (action) {
      case 'send_free_lesson':
        // Send free lesson to build trust
        const lessonNum = params.lesson_number || 1;
        await sendLesson(telegramId, lessonNum);
        console.log(`📚 AI sent free lesson ${lessonNum} to ${telegramId}`);
        break;

      case 'show_testimonials':
        // Show testimonials from paid subscribers
        const testimonials = await db.getBotMessage('ai_testimonials') ||
          `⭐️ <b>Obunachilarimiz fikrlari:</b>\n\n` +
          `💬 "2 oyda 0 dan 50 ta mijozga chiqdim. Haqiqiy natija!" - Aziz\n\n` +
          `💬 "Endi oyiga 3 mln topaman faqat SMM dan" - Nilufar\n\n` +
          `💬 "Kursdan keyin o'z agentligimni ochdim" - Sardor`;

        await ctx.reply(testimonials, { parse_mode: 'HTML' });
        console.log(`⭐ AI showed testimonials to ${telegramId}`);
        break;

      case 'show_payment':
        await sendSalesPitch(telegramId, params.discount || 0);
        break;

      case 'show_plans':
        await sendSalesPitch(telegramId, 0);
        break;

      case 'send_lesson_info':
        const lesson = await db.getLesson(params.lesson_number || 1);
        if (lesson) {
          await ctx.reply(
            `📚 <b>${params.lesson_number}-dars: ${lesson.title}</b>\n\n${lesson.content || ''}`,
            { parse_mode: 'HTML' }
          );
        }
        break;

      case 'schedule_followup':
        // Log for now - can implement scheduler later
        console.log(`📅 AI scheduled followup for ${telegramId}: ${params.message_type} in ${params.delay_hours}h`);
        break;

      case 'end_conversation':
        // Just log
        console.log(`👋 AI ended conversation with ${telegramId}: ${params.reason}`);
        break;

      default:
        console.log(`⚠️ Unknown AI action: ${action}`);
    }
  } catch (e) {
    console.error('AI Action error:', e);
  }
}

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

  const totalLessonsCount = await db.getLessonsCount();
  const progressBar = generateProgressBar(lessonNumber - 1, totalLessonsCount);
  const progressPercent = Math.round(((lessonNumber - 1) / totalLessonsCount) * 100);

  // Send progress indicator first
  await bot.telegram.sendMessage(telegramId,
    `📚 <b>Kurs progressi</b>\n` +
    `${progressBar} ${progressPercent}%\n\n` +
    `📖 ${lessonNumber}/${totalLessonsCount} dars`,
    { parse_mode: 'HTML' }
  );
  await delay(1000);

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

// Start lesson callback (for returning users)
bot.action(/^start_lesson_(\d+)$/, async (ctx) => {
  try {
    const lessonNumber = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id;
    await ctx.answerCbQuery('Dars yuklanmoqda...');
    await ctx.editMessageReplyMarkup(undefined);
    await sendLesson(telegramId, lessonNumber);
  } catch (e) {
    console.error('Start lesson error:', e);
    await ctx.answerCbQuery('Xatolik yuz berdi');
  }
});

// Replay lesson callback (for returning users)
bot.action(/^replay_lesson_(\d+)$/, async (ctx) => {
  try {
    const lessonNumber = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id;
    await ctx.answerCbQuery('Dars yuklanmoqda...');
    await ctx.editMessageReplyMarkup(undefined);
    await sendLesson(telegramId, lessonNumber, { isReplay: true });
  } catch (e) {
    console.error('Replay lesson error:', e);
    await ctx.answerCbQuery('Xatolik yuz berdi');
  }
});

bot.action(/^watched_(\d+)$/, async (ctx) => {
  try {
    const lessonNumber = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id;
    const totalLessons = await db.getLessonsCount();
    const user = await db.getUser(telegramId);

    await ctx.answerCbQuery('Ajoyib!');
    await ctx.editMessageReplyMarkup(undefined);

    // Qualify referral if this is the first lesson (user becomes active)
    if (lessonNumber === 1) {
      try {
        const referrerTgId = await db.qualifyReferral(telegramId);
        if (referrerTgId) {
          const newCount = (await db.getReferralStats(referrerTgId)).qualified;
          const requiredCount = parseInt(await db.getSetting('referral_required_count') || '3');
          const remaining = requiredCount - newCount;

          if (remaining > 0) {
            await bot.telegram.sendMessage(referrerTgId,
              `🎉 Sizning taklif qilgan odam birinchi darsni ko'rdi!\n\n` +
              `📊 ${newCount}/${requiredCount} - chegirmaga ${remaining} ta qoldi!`
            ).catch(e => console.log('Notify referrer error:', e.message));
          } else {
            await bot.telegram.sendMessage(referrerTgId,
              `🎊 Tabriklaymiz! Siz ${requiredCount} ta odamni taklif qildingiz!\n\n` +
              `🎁 Endi 50% chegirma bilan sotib olishingiz mumkin!\n\n` +
              `/myref - batafsil`
            ).catch(e => console.log('Notify referrer error:', e.message));
          }
        }
      } catch (e) {
        console.log('Qualify referral error:', e.message);
      }
    }

    if (lessonNumber < totalLessons) {
      // Value means: ask subscription AFTER this lesson number
      const requireSubLesson = parseInt(await db.getBotMessage('require_subscription_before_lesson')) || 3;

      if (requireSubLesson > 0 && lessonNumber === requireSubLesson) {
        const nextLesson = lessonNumber + 1;
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
      // Start lesson test instead of custdev (test will call custdev after passing)
      await startLessonTest(telegramId, lessonNumber);
    } else {
      // Last lesson - also start test first
      await delay(1000);
      await startLessonTest(telegramId, lessonNumber);
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

    // Mark lesson as watched for inactivity reminders
    try {
      await db.markLessonWatched(telegramId, funnelId, lessonNumber);
    } catch (e) {
      console.log('Mark lesson watched error:', e.message);
    }

    // Qualify referral if this is the first lesson (user becomes active)
    if (lessonNumber === 1) {
      try {
        const referrerTgId = await db.qualifyReferral(telegramId);
        if (referrerTgId) {
          // Notify referrer
          const newCount = (await db.getReferralStats(referrerTgId)).qualified;
          const requiredCount = parseInt(await db.getSetting('referral_required_count') || '3');
          const remaining = requiredCount - newCount;

          if (remaining > 0) {
            await bot.telegram.sendMessage(referrerTgId,
              `🎉 Sizning taklif qilgan odam birinchi darsni ko'rdi!\n\n` +
              `📊 ${newCount}/${requiredCount} - chegirmaga ${remaining} ta qoldi!`
            ).catch(e => console.log('Notify referrer error:', e.message));
          } else {
            await bot.telegram.sendMessage(referrerTgId,
              `🎊 Tabriklaymiz! Siz ${requiredCount} ta odamni taklif qildingiz!\n\n` +
              `🎁 Endi 50% chegirma bilan sotib olishingiz mumkin!\n\n` +
              `/myref - batafsil`
            ).catch(e => console.log('Notify referrer error:', e.message));
          }
        }
      } catch (e) {
        console.log('Qualify referral error:', e.message);
      }
    }

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
      // Value means: ask subscription AFTER this lesson number
      // First check funnel-specific setting, then fall back to global setting
      let requireSubLesson = funnel.require_subscription_before_lesson || 0;
      if (requireSubLesson === 0) {
        // Fall back to global setting from dashboard
        requireSubLesson = parseInt(await db.getBotMessage('require_subscription_before_lesson')) || 0;
      }

      // Get channel ID from funnel or global settings
      let channelId = funnel.free_channel_id;
      if (!channelId) {
        channelId = await db.getBotMessage('free_channel_id');
      }

      const nextLesson = lessonNumber + 1;

      console.log(`🔍 Subscription check: requireSubLesson=${requireSubLesson}, currentLesson=${lessonNumber}, nextLesson=${nextLesson}, channelId=${channelId}`);

      if (requireSubLesson > 0 && lessonNumber === requireSubLesson && channelId) {
        // Check if user already marked as subscribed
        const user = await db.getUser(telegramId);
        if (user?.subscribed_free_channel) {
          console.log(`✅ User ${telegramId} already marked as subscribed`);
        } else {
          const isSubscribed = await checkFreeChannelSubscription(telegramId);

          if (isSubscribed) {
            // Already subscribed - mark and continue
            await db.updateUser(telegramId, { subscribed_free_channel: true });
            await bot.telegram.sendMessage(telegramId, '🎉 Kanalimizga obuna bo\'lganingiz uchun rahmat! Davom etamiz...', { parse_mode: 'HTML' });
            await delay(1500);
          } else {
            // Not subscribed - ask for subscription
            await askForSubscription(telegramId, nextLesson);
            return;
          }
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
  const channelId = funnel.free_channel_id || await db.getBotMessage('free_channel_id') || FREE_CHANNEL_ID;
  if (!channelId) return true;
  
  try {
    const member = await bot.telegram.getChatMember(channelId, telegramId);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch (e) {
    console.log('checkFunnelChannelSubscription error:', e.message);
    return true; // Assume subscribed if can't check
  }
}

// Ask for funnel subscription
async function askForFunnelSubscription(telegramId, funnel, pendingLesson) {
  const channelLink = funnel.free_channel_link || await db.getBotMessage('free_channel_link') || 'https://t.me/channel';
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
  let channelId = await db.getBotMessage('free_channel_id') || FREE_CHANNEL_ID;

  console.log(`🔍 Checking subscription: user=${telegramId}, channel=${channelId}`);

  if (!channelId) {
    console.log('⚠️ FREE_CHANNEL_ID not set, skipping subscription check');
    return true; // Agar kanal ID yo'q bo'lsa, tekshirmasdan o'tkazib yuboramiz
  }

  // Ensure channel ID is in correct format
  // It should be a number (negative for channels/groups)
  if (typeof channelId === 'string') {
    channelId = channelId.trim();
    // If it's a username like @channel, keep as is
    // If it's a number string, convert to number
    if (/^-?\d+$/.test(channelId)) {
      channelId = parseInt(channelId);
    }
  }

  try {
    const member = await bot.telegram.getChatMember(channelId, telegramId);
    console.log(`📢 getChatMember result for ${telegramId}:`, JSON.stringify(member));

    // 'left' means user was never in channel or left
    // 'kicked' means user was banned
    // 'restricted' could still have access
    const isSubscribed = ['member', 'administrator', 'creator', 'restricted'].includes(member.status);
    console.log(`📢 Subscription check for ${telegramId} in ${channelId}: ${isSubscribed ? '✅ Subscribed' : '❌ Not subscribed'} (status: ${member.status})`);
    return isSubscribed;
  } catch (e) {
    console.error(`❌ Subscription check error for user ${telegramId} in channel ${channelId}:`, e.message);
    console.error('Full error:', e);

    // If error is "user not found" or similar, user is not subscribed
    if (e.message.includes('user not found') || e.message.includes('USER_NOT_PARTICIPANT')) {
      console.log('💡 User is not a participant of the channel');
      return false;
    }

    // For other errors (bot not admin, wrong channel ID), log but allow user to continue
    // to prevent blocking users due to configuration issues
    console.error('💡 Possible causes: 1) Bot is not admin in channel, 2) Wrong channel ID format, 3) Channel is private');
    console.error('⚠️ Allowing user to continue due to configuration error');
    return true; // Changed: allow user to continue if there's a config error
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

  const sentMessage = await bot.telegram.sendMessage(telegramId, msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📢 Kanalga o\'tish', channelLink)],
      [Markup.button.callback('✅ Obuna bo\'ldim', 'check_subscription_' + nextLesson)]
    ])
  });

  // Mark user as waiting for subscription with timestamp
  await db.updateUser(telegramId, {
    waiting_subscription: true,
    pending_lesson: nextLesson,
    subscription_asked_at: new Date().toISOString()
  });

  // Start automatic subscription checking in background
  startSubscriptionCheck(telegramId, nextLesson, sentMessage.message_id);
}

// Automatic subscription checker - runs in background
async function startSubscriptionCheck(telegramId, nextLesson, messageId) {
  const maxChecks = 60; // Check for 5 minutes max (60 * 5 seconds)
  const checkInterval = 5000; // 5 seconds

  for (let i = 0; i < maxChecks; i++) {
    await delay(checkInterval);

    // Get fresh user data
    const user = await db.getUser(telegramId);

    // Stop if user already processed (button pressed or no longer waiting)
    if (!user?.waiting_subscription) {
      console.log(`🔍 Auto-check stopped for ${telegramId}: no longer waiting`);
      return;
    }

    // Check subscription
    const isSubscribed = await checkFreeChannelSubscription(telegramId);

    if (isSubscribed) {
      console.log(`🎉 Auto-detected subscription for ${telegramId}!`);

      // Calculate subscription time
      let celebrationMsg = '🎉 Ajoyib! Obuna uchun rahmat!';
      if (user.subscription_asked_at) {
        const askedAt = new Date(user.subscription_asked_at);
        const now = new Date();
        const seconds = Math.round((now - askedAt) / 1000);

        if (seconds < 60) {
          celebrationMsg = `🚀 Vooow! Atigi ${seconds} soniyada obuna bo'ldingiz! Tezkor ekansiz! 🎉`;
        } else if (seconds < 300) {
          const mins = Math.floor(seconds / 60);
          celebrationMsg = `✨ Zo'r! ${mins} daqiqada obuna bo'ldingiz! Rahmat! 🎉`;
        } else {
          celebrationMsg = '🎉 Kanalimizga obuna bo\'lganingiz uchun katta rahmat!';
        }
      }

      // Update user
      await db.updateUser(telegramId, {
        waiting_subscription: false,
        subscribed_free_channel: true,
        pending_lesson: null,
        subscription_check_attempts: 0,
        subscription_asked_at: null
      });

      // Try to edit the original message to remove buttons
      try {
        await bot.telegram.editMessageReplyMarkup(telegramId, messageId, undefined, { inline_keyboard: [] });
      } catch (e) {
        // Message might be too old or already edited
      }

      // Send celebration and continue
      await bot.telegram.sendMessage(telegramId, celebrationMsg + '\n\nEndi davom etamiz...');
      await delay(1500);

      // Continue with lesson test
      const prevLesson = nextLesson - 1;
      await startLessonTest(telegramId, prevLesson);
      return;
    }
  }

  console.log(`⏰ Auto-check timeout for ${telegramId} after 5 minutes`);
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

    // Calculate subscription time
    let celebrationMsg = '🎉 Ajoyib! Obuna uchun rahmat!';
    if (user?.subscription_asked_at) {
      const askedAt = new Date(user.subscription_asked_at);
      const now = new Date();
      const seconds = Math.round((now - askedAt) / 1000);

      if (seconds < 60) {
        celebrationMsg = `🚀 Vooow! Atigi ${seconds} soniyada obuna bo'ldingiz! Barakalla! 🎉`;
      } else if (seconds < 300) {
        const mins = Math.floor(seconds / 60);
        celebrationMsg = `✨ Zo'r! ${mins} daqiqada obuna bo'ldingiz! Rahmat! 🎉`;
      } else {
        celebrationMsg = '🎉 Kanalimizga obuna bo\'lganingiz uchun katta rahmat!';
      }
    }

    // Update user and continue to next lesson
    await db.updateUser(telegramId, {
      waiting_subscription: false,
      subscribed_free_channel: true,
      pending_lesson: null,
      subscription_check_attempts: 0,
      subscription_asked_at: null
    });

    await ctx.reply(celebrationMsg + '\n\nEndi davom etamiz...');
    await delay(1500);

    // Continue with LESSON TEST first (test will handle custdev after passing)
    const prevLesson = nextLesson - 1;
    await startLessonTest(telegramId, prevLesson);
  } else {
    // Increment failed attempts
    const attempts = (user?.subscription_check_attempts || 0) + 1;
    await db.updateUser(telegramId, { subscription_check_attempts: attempts });

    // Check if bypass is enabled and max attempts reached
    const bypassEnabled = (await db.getBotMessage('subscription_bypass_enabled')) === 'true';
    const maxAttempts = parseInt(await db.getBotMessage('subscription_bypass_attempts')) || 3;

    if (bypassEnabled && attempts >= maxAttempts) {
      // Allow user to skip subscription
      await ctx.answerCbQuery('⚠️ Obuna tasdiqlanmadi, lekin davom etishingiz mumkin.', { show_alert: true });
      await ctx.editMessageReplyMarkup(undefined);

      await db.updateUser(telegramId, {
        waiting_subscription: false,
        subscribed_free_channel: false,
        pending_lesson: null,
        subscription_check_attempts: 0,
        subscription_bypassed: true
      });

      await ctx.reply('⏭️ Davom etamiz...');
      await delay(1000);

      // Continue with LESSON TEST (test will handle custdev after passing)
      const prevLesson = nextLesson - 1;
      await startLessonTest(telegramId, prevLesson);
    } else {
      const remainingAttempts = bypassEnabled ? maxAttempts - attempts : null;
      let message = '❌ Siz hali obuna bo\'lmagansiz! Avval kanalga obuna bo\'ling.';
      if (bypassEnabled && remainingAttempts > 0) {
        message += `\n(Yana ${remainingAttempts} ta urinish qoldi)`;
      }
      await ctx.answerCbQuery(message, { show_alert: true });
    }
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

  // ============ CHECK SUBSCRIPTION AFTER CONFIGURED LESSON ============
  const requireSubLesson = parseInt(await db.getBotMessage('require_subscription_before_lesson')) || 3;
  
  if (requireSubLesson > 0 && next === (requireSubLesson + 1) && !user.subscribed_free_channel) {
    // Check if already subscribed
    const isSubscribed = await checkFreeChannelSubscription(telegramId);
    
    if (!isSubscribed) {
      // Ask for subscription
      await askForSubscription(telegramId, next);
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

  // Check for perfect score bonus
  const isPerfect = user?.perfect_score;
  const discountPercent = isPerfect ?
    parseInt(await db.getSetting('perfect_score_discount_percent') || '30') : 0;

  // Get pitch info text
  let pitchInfoText = await db.getSetting('pitch_info_text') ||
    '🎉 Ajoyib tanlov!\n\nPremium kanalda sizni kutmoqda:\n✅ Har hafta yangi kontent\n✅ Ekskluziv resurslar\n✅ Premium hamjamiyat\n\nHoziroq ro\'yxatdan o\'ting! 👇';

  // Add perfect score bonus message
  if (isPerfect) {
    pitchInfoText = `🏆 <b>MAXSUS BONUS!</b>\n\nSiz barcha testlardan 100% oldingiz!\n🎁 Sizga <b>${discountPercent}% chegirma</b> tayyorlangan!\n\n─────────────────\n\n` + pitchInfoText;
  }

  // Get button text
  const pitchBtnText = await db.getSetting('pitch_info_btn') || '🚀 Kanalga qo\'shilish';

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

  // Track when user first sees sales pitch (for referral offer timing)
  await db.setSalesPitchSeenAt(telegramId);

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

  // Check for referral discount eligibility - only show if user has ALREADY qualified
  let referralButton = null;
  const referralEnabled = await db.getSetting('referral_enabled');
  if (referralEnabled === 'true' && extraDiscount === 0) {
    const canGetDiscount = await db.checkReferralDiscount(telegramId);
    if (canGetDiscount) {
      const referralDiscountPercent = parseInt(await db.getSetting('referral_discount_percent') || '50');
      const requiredCount = parseInt(await db.getSetting('referral_required_count') || '3');
      referralButton = [Markup.button.callback(
        `🎁 ${referralDiscountPercent}% chegirma bilan sotib olish!`,
        `referral_discount_apply`
      )];
      text = `🎊 <b>TABRIKLAYMIZ!</b>\nSiz ${requiredCount} ta odamni taklif qildingiz va ${referralDiscountPercent}% chegirma oldingiz!\n\n⚠️ <i>Bu chegirma faqat bir marta amal qiladi!</i>\n\n` + text;
    }
    // Note: Referral offer is sent separately after 24h if user doesn't pay
  }

  const allButtons = [
    ...planButtons,
    ...(referralButton ? [referralButton] : []),
    [Markup.button.callback('🎟️ Promo kod kiritish', 'enter_promo_code')],
    [Markup.button.callback('❓ Savolim bor', 'question')]
  ];

  await bot.telegram.sendMessage(telegramId, text + plansInfo, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(allButtons)
  });
  await db.updateUser(telegramId, { funnel_step: 10 });
}

// ============ PROMO CODE HANDLERS ============

// Enter promo code button handler
bot.action('enter_promo_code', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;

  await db.updateUser(telegramId, { waiting_promo_code: true });

  await ctx.reply(
    '🎟️ <b>Promo kodni kiriting:</b>\n\n' +
    'Agar sizda promo kod bo\'lsa, uni pastga yozing.\n' +
    '<i>Bekor qilish uchun /cancel buyrug\'ini yuboring.</i>',
    { parse_mode: 'HTML' }
  );
});

// Cancel promo code input
bot.command('cancel', async (ctx) => {
  const telegramId = ctx.from.id;
  const user = await db.getUser(telegramId);

  if (user?.waiting_promo_code) {
    await db.updateUser(telegramId, { waiting_promo_code: false });
    await ctx.reply('❌ Bekor qilindi.');
    await sendSalesPitch(telegramId);
  }
});

// Handle promo code with plan selection
bot.action(/^promo_plan_(.+)_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const promoCode = ctx.match[1];
  const planId = ctx.match[2];
  const telegramId = ctx.from.id;

  // Validate promo code again
  const validation = await db.validatePromoCode(promoCode, telegramId, planId);
  if (!validation.valid) {
    return ctx.reply('❌ ' + validation.error);
  }

  const plan = await db.getSubscriptionPlan(planId);
  if (!plan) {
    return ctx.reply('❌ Bunday obuna turi topilmadi');
  }

  const discountPercent = validation.discountPercent;
  const discountedPrice = Math.round(plan.price * (100 - discountPercent) / 100);

  // Create payment with promo code prefix
  const orderId = ('PRM' + Date.now() + telegramId).slice(0, 20);
  await db.createPayment(orderId, telegramId, discountedPrice, planId);

  // Store promo code info in payment for later use
  await db.pool.query(`
    UPDATE payments SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{promo_code}', $1::jsonb)
    WHERE order_id = $2
  `, [JSON.stringify({ code: promoCode, discount_percent: discountPercent, promo_id: validation.promoCode.id }), orderId]);

  const paymeUrl = BASE_URL + '/payme/api/checkout-url?order_id=' + orderId + '&amount=' + discountedPrice + '&plan=' + planId + '&discount=' + discountPercent + '&redirect=1';
  const clickUrl = BASE_URL + '/click/api/checkout-url?order_id=' + orderId + '&amount=' + discountedPrice + '&plan=' + planId + '&discount=' + discountPercent + '&redirect=1';

  const paymeEnabledStr = await db.getSetting('payme_enabled') || await db.getBotMessage('payme_enabled');
  const clickEnabledStr = await db.getSetting('click_enabled') || await db.getBotMessage('click_enabled');

  const paymeEnabled = paymeEnabledStr !== 'false' && paymeEnabledStr !== false;
  const clickEnabled = clickEnabledStr !== 'false' && clickEnabledStr !== false;

  const paymentButtons = [];
  if (paymeEnabled) paymentButtons.push(Markup.button.url('💳 Payme', paymeUrl));
  if (clickEnabled) paymentButtons.push(Markup.button.url('💠 Click', clickUrl));

  if (paymentButtons.length === 0) {
    return ctx.reply('❌ Hozircha to\'lov tizimlari mavjud emas.');
  }

  const originalPrice = formatMoney(plan.price);
  const finalPrice = formatMoney(discountedPrice);
  const savedAmount = formatMoney(plan.price - discountedPrice);

  await ctx.reply(
    `🎟️ <b>Promo kod qo'llanildi!</b>\n\n` +
    `📦 Obuna: <b>${plan.name}</b>\n` +
    `💰 Asl narx: <s>${originalPrice}</s>\n` +
    `🎁 Chegirma: <b>${discountPercent}%</b>\n` +
    `✅ Yakuniy narx: <b>${finalPrice}</b>\n` +
    `💵 Tejamingiz: <b>${savedAmount}</b>\n\n` +
    `To'lov usulini tanlang:`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([paymentButtons])
    }
  );
});

// Cancel promo code and go back to regular prices
bot.action('cancel_promo', async (ctx) => {
  await ctx.answerCbQuery('Bekor qilindi');
  await ctx.deleteMessage();
  const telegramId = ctx.from.id;
  await sendSalesPitch(telegramId);
});

// Show referral info when user doesn't have enough referrals
bot.action('show_referral_info', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;

  const code = await db.generateReferralCode(telegramId);
  const stats = await db.getReferralStats(telegramId);
  const requiredCount = parseInt(await db.getSetting('referral_required_count') || '3');
  const discountPercent = parseInt(await db.getSetting('referral_discount_percent') || '50');

  const botInfo = await bot.telegram.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=ref_${code}`;

  const remaining = requiredCount - stats.qualified;

  await ctx.editMessageText(
    `🔗 <b>Referal chegirma tizimi</b>\n\n` +
    `${requiredCount} ta yangi odam olib keling va ${discountPercent}% chegirma oling!\n\n` +
    `📊 <b>Hozirgi holat:</b>\n` +
    `├ Jami taklif qilganlar: ${stats.total}\n` +
    `├ Faol (dars ko'rgan): ${stats.qualified}\n` +
    `└ Yana kerak: ${remaining}\n\n` +
    `🔗 <b>Sizning havolangiz:</b>\n` +
    `<code>${refLink}</code>\n\n` +
    `👆 Havolani nusxalab do'stlaringizga yuboring!`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Orqaga', 'back_to_plans')]
      ])
    }
  );
});

// Apply referral discount - show plan selection with discount
bot.action('referral_discount_apply', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;

  const canGetDiscount = await db.checkReferralDiscount(telegramId);
  if (!canGetDiscount) {
    return ctx.reply('❌ Afsuski, siz chegirmaga ega emassiz.');
  }

  const discountPercent = parseInt(await db.getSetting('referral_discount_percent') || '50');
  const plans = await db.getSubscriptionPlans(true);

  const planButtons = plans.map(plan => {
    const discountedPrice = Math.round(plan.price * (100 - discountPercent) / 100);
    const totalDiscount = discountPercent + (plan.discount_percent || 0);
    const label = `${plan.name} - ${formatMoney(discountedPrice)} (-${totalDiscount}%)`;
    return [Markup.button.callback(label, `ref_discount_plan_${plan.id}`)];
  });

  await ctx.editMessageText(
    `🎁 <b>${discountPercent}% REFERAL CHEGIRMASI!</b>\n\n` +
    `⚠️ <i>Bu chegirma faqat bir marta amal qiladi!</i>\n\n` +
    `Obuna turini tanlang:`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        ...planButtons,
        [Markup.button.callback('⬅️ Orqaga', 'back_to_plans')]
      ])
    }
  );
});

// Handle referral discount plan selection
bot.action(/^ref_discount_plan_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const planId = ctx.match[1];
  const telegramId = ctx.from.id;

  const canGetDiscount = await db.checkReferralDiscount(telegramId);
  if (!canGetDiscount) {
    return ctx.reply('❌ Afsuski, siz chegirmaga ega emassiz.');
  }

  const plan = await db.getSubscriptionPlan(planId);
  if (!plan) {
    return ctx.reply('❌ Bunday obuna turi topilmadi');
  }

  const discountPercent = parseInt(await db.getSetting('referral_discount_percent') || '50');
  const discountedPrice = Math.round(plan.price * (100 - discountPercent) / 100);

  const orderId = ('REF' + Date.now() + telegramId).slice(0, 20);
  await db.createPayment(orderId, telegramId, discountedPrice, planId);

  // NOTE: markReferralDiscountUsed is called in payment webhook when payment is confirmed
  // This allows user to retry if payment fails

  const paymeUrl = BASE_URL + '/payme/api/checkout-url?order_id=' + orderId + '&amount=' + discountedPrice + '&plan=' + planId + '&discount=' + discountPercent + '&redirect=1';
  const clickUrl = BASE_URL + '/click/api/checkout-url?order_id=' + orderId + '&amount=' + discountedPrice + '&plan=' + planId + '&discount=' + discountPercent + '&redirect=1';

  const paymeEnabledStr = await db.getSetting('payme_enabled') || await db.getBotMessage('payme_enabled');
  const clickEnabledStr = await db.getSetting('click_enabled') || await db.getBotMessage('click_enabled');

  const paymeEnabled = paymeEnabledStr !== 'false' && paymeEnabledStr !== false;
  const clickEnabled = clickEnabledStr !== 'false' && clickEnabledStr !== false;

  const paymentButtons = [];
  if (paymeEnabled) paymentButtons.push(Markup.button.url('💳 Payme', paymeUrl));
  if (clickEnabled) paymentButtons.push(Markup.button.url('💠 Click', clickUrl));

  if (paymentButtons.length === 0) {
    return ctx.reply('❌ Hozircha to\'lov tizimlari mavjud emas.');
  }

  const text = `🎁 <b>${plan.name} obuna (${discountPercent}% referal chegirma!)</b>\n\n` +
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

// Check my referrals - show referral statistics (from referral offer message)
bot.action('check_my_referrals', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;

  const code = await db.generateReferralCode(telegramId);
  const stats = await db.getReferralStats(telegramId);
  const requiredCount = parseInt(await db.getSetting('referral_required_count') || '3');
  const discountPercent = parseInt(await db.getSetting('referral_discount_percent') || '50');

  const botInfo = await bot.telegram.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=ref_${code}`;

  const remaining = Math.max(0, requiredCount - stats.qualified);
  const canGetDiscount = await db.checkReferralDiscount(telegramId);

  let statusText = '';
  if (canGetDiscount) {
    statusText = `\n\n🎉 <b>Tabriklaymiz! Siz ${discountPercent}% chegirmaga ega bo'ldingiz!</b>\n` +
      `"Sotib olish" tugmasini bosing va chegirmali narxda obuna bo'ling!`;
  } else {
    statusText = `\n\n⏳ Chegirma uchun yana <b>${remaining}</b> ta faol odam kerak.`;
  }

  const buttons = [];
  if (canGetDiscount) {
    buttons.push([Markup.button.callback(`🎁 ${discountPercent}% chegirma bilan sotib olish!`, 'referral_discount_apply')]);
  }
  buttons.push([Markup.button.callback('💳 Oddiy narxda sotib olish', 'buy_now')]);

  await ctx.reply(
    `📊 <b>Sizning referal statistikangiz</b>\n\n` +
    `├ Jami taklif qilganlar: <b>${stats.total}</b>\n` +
    `├ Faol (dars ko'rgan): <b>${stats.qualified}</b>\n` +
    `└ Chegirma uchun kerak: <b>${requiredCount}</b>\n` +
    statusText + `\n\n` +
    `🔗 <b>Sizning havolangiz:</b>\n` +
    `<code>${refLink}</code>`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    }
  );
});

// Buy now button - show payment options (from referral offer message)
bot.action('buy_now', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;
  await sendSalesPitch(telegramId);
});

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
  const telegramId = ctx.from.id;

  // Check if user has perfect score discount
  const user = await db.getUser(telegramId);
  const discountPercent = user?.perfect_score ?
    parseInt(await db.getSetting('perfect_score_discount_percent') || '30') : 0;

  await sendSalesPitch(telegramId, discountPercent);
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

// Resume lesson from inactivity reminder
bot.action(/^resume_lesson_(\d+)_(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery('Darsni yuklayapman...');
    await ctx.editMessageReplyMarkup(undefined);
    const telegramId = ctx.from.id;
    const funnelId = parseInt(ctx.match[1]);
    const lessonNumber = parseInt(ctx.match[2]);

    // Replay the lesson
    await sendFunnelLesson(telegramId, funnelId, lessonNumber, { replay: true });
  } catch (e) {
    console.error('Resume lesson from reminder error:', e);
    await ctx.reply('Xatolik. /continue buyrug\'ini bosing.');
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

    // Use the same smart returning user handler
    return handleReturningUser(ctx, telegramId, user);
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

bot.on('document', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const fileId = ctx.message.document.file_id;
  const fileName = ctx.message.document.file_name || 'document_' + Date.now();
  const mimeType = ctx.message.document.mime_type || 'unknown';
  const caption = ctx.message.caption || '';

  await db.saveMedia(fileId, 'document', fileName, caption, ctx.from.id);
  await ctx.reply(
    '✅ Fayl saqlandi!\n\n' +
    '📄 Fayl: ' + fileName + '\n' +
    '📦 Turi: ' + mimeType + '\n' +
    '📝 Izoh: ' + (caption || '❌ Yo\'q') + '\n\n' +
    '📋 File ID:\n<code>' + fileId + '</code>\n\n' +
    '💡 Bu ID ni Dashboard > Darslar yoki Progrev bo\'limida ishlating',
    { parse_mode: 'HTML' }
  );
});

// ============ BONUS OFFER SYSTEM ============

/**
 * Send pitch/sales offer to user after completing all lessons and receiving gift
 */
async function sendBonusOffer(telegramId, isPerfect) {
  const user = await db.getUser(telegramId);
  const discountPercent = isPerfect ?
    parseInt(await db.getSetting('perfect_score_discount_percent') || '30') : 0;

  // If perfect score, mark discount as available for this user
  if (isPerfect) {
    await db.updateUser(telegramId, { perfect_score_discount_available: discountPercent });
  }

  // PITCH MESSAGE - emotional appeal and benefits
  let pitchMessage = '';

  if (isPerfect) {
    pitchMessage = `🏆🏆🏆 <b>WOW! Siz haqiqiy talantli ekansiz!</b>\n\n` +
      `Barcha testlardan 100% natija - bu kam odamda bor!\n\n` +
      `Sizning bilim olishga bo'lgan ishtiyoqingiz meni hayratda qoldirdi! 🌟\n\n` +
      `Shunday odamlarga biz maxsus <b>${discountPercent}% chegirma</b> beramiz!\n\n` +
      `─────────────────\n\n` +
      `📺 <b>Premium kanalda nimalar bor?</b>\n\n` +
      `✅ Har hafta yangi strategiyalar va taktikalar\n` +
      `✅ Real case-studylar va tahlillar\n` +
      `✅ Ekskluziv shablonlar va resurslar\n` +
      `✅ Savollaringizga tezkor javoblar\n` +
      `✅ Premium hamjamiyat a'zoligi\n\n` +
      `🎯 <b>Bu investitsiya o'zini 1 oyda qaytaradi!</b>`;
  } else {
    pitchMessage = `💼 <b>Keyingi qadam!</b>\n\n` +
      `${user?.full_name || 'Do\'stim'}, siz bepul darslarni muvaffaqiyatli tugatdingiz!\n\n` +
      `Lekin bu faqat boshlanishi... 🚀\n\n` +
      `Haqiqiy natijalar uchun chuqurroq bilim kerak!\n\n` +
      `─────────────────\n\n` +
      `📺 <b>Premium kanalda nimalar bor?</b>\n\n` +
      `✅ Har hafta yangi strategiyalar va taktikalar\n` +
      `✅ Real case-studylar va tahlillar\n` +
      `✅ Ekskluziv shablonlar va resurslar\n` +
      `✅ Savollaringizga tezkor javoblar\n` +
      `✅ Premium hamjamiyat a'zoligi\n\n` +
      `🎯 <b>Bu investitsiya o'zini 1 oyda qaytaradi!</b>`;
  }

  await bot.telegram.sendMessage(telegramId, pitchMessage, { parse_mode: 'HTML' });

  await delay(3000);

  // Now show subscription plans
  await sendSalesPitch(telegramId, discountPercent);
}

// Buy course / subscription - redirect to sales pitch
bot.action('buy_course', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    await ctx.answerCbQuery();

    // Check if user has perfect score discount
    const user = await db.getUser(telegramId);
    const discountPercent = user?.perfect_score ?
      parseInt(await db.getSetting('perfect_score_discount_percent') || '30') : 0;

    await sendSalesPitch(telegramId, discountPercent);
  } catch (e) {
    console.error('Buy course error:', e);
    await ctx.answerCbQuery('Xatolik yuz berdi');
  }
});

// Course info - redirect to question handler
bot.action('course_info', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    // Trigger the question flow
    await ctx.reply(
      `❓ <b>Savollaringiz bormi?</b>\n\n` +
      `Savollaringizni yozing, biz sizga tez orada javob beramiz!\n\n` +
      `Yoki quyidagi tugmani bosing:`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📋 Obuna turlari', 'show_plans')],
          [Markup.button.callback('💬 Admin bilan bog\'lanish', 'contact_admin')]
        ])
      }
    );
  } catch (e) {
    console.error('Course info error:', e);
    await ctx.answerCbQuery('Xatolik yuz berdi');
  }
});

// Show subscription plans
bot.action('show_plans', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await sendSalesPitch(ctx.from.id);
  } catch (e) {
    console.error('Show plans error:', e);
    await ctx.answerCbQuery('Xatolik yuz berdi');
  }
});

// ============ LESSON TEST SYSTEM ============

const TEST_PASS_THRESHOLD = 3; // 5 savoldan kamida 3 ta to'g'ri javob kerak
const QUESTIONS_PER_TEST = 5;

/**
 * Start a test for a specific lesson
 */
async function startLessonTest(telegramId, lessonNumber) {
  const tests = await db.getLessonTests(lessonNumber);

  if (!tests || tests.length === 0) {
    // No tests for this lesson - proceed to custdev
    console.log(`No tests found for lesson ${lessonNumber}`);
    await startCustDev(telegramId, lessonNumber);
    return;
  }

  // Get current attempt number
  const user = await db.getUser(telegramId);
  const attemptField = `test_${lessonNumber}_attempt`;
  const currentAttempt = (user?.[attemptField] || 0) + 1;

  // Reset any previous test results for this lesson
  await db.resetUserLessonTest(telegramId, lessonNumber);

  // Set user to test mode and increment attempt
  await db.updateUser(telegramId, {
    test_mode: true,
    current_test_lesson: lessonNumber,
    current_test_question: 1,
    [attemptField]: currentAttempt
  });

  const attemptText = currentAttempt > 1 ? `\n🔄 ${currentAttempt}-urinish` : '';

  await bot.telegram.sendMessage(telegramId,
    `📝 <b>${lessonNumber}-dars testi</b>${attemptText}\n\n` +
    `Darsni qanchalik tushunganingizni tekshiramiz!\n\n` +
    `📊 ${tests.length} ta savol\n` +
    `✅ O'tish uchun: kamida ${TEST_PASS_THRESHOLD} ta to'g'ri javob\n\n` +
    `Boshlashga tayyormisiz?`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Boshlash', `test_start_${lessonNumber}`)]
      ])
    }
  );
}

/**
 * Generate animated-style progress bar with emoji
 */
function generateProgressBar(current, total, width = 5) {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  // Different styles based on progress
  if (percent === 100) {
    // Completed - celebration style
    return '🟢'.repeat(width) + ' ✨';
  } else if (percent >= 80) {
    // Almost done - green with sparkle
    return '🟩'.repeat(filled) + '⬜'.repeat(empty);
  } else if (percent >= 60) {
    // Good progress - blue/green mix
    return '🟦'.repeat(Math.ceil(filled/2)) + '🟩'.repeat(Math.floor(filled/2)) + '⬜'.repeat(empty);
  } else if (percent >= 40) {
    // Middle - blue
    return '🟦'.repeat(filled) + '⬜'.repeat(empty);
  } else if (percent >= 20) {
    // Starting - purple/blue
    return '🟪'.repeat(Math.ceil(filled/2)) + '🟦'.repeat(Math.floor(filled/2)) + '⬜'.repeat(empty);
  } else {
    // Beginning - purple
    return '🟪'.repeat(filled) + '⬜'.repeat(empty);
  }
}

/**
 * Generate smooth animated progress bar with gradient effect
 */
function generateAnimatedBar(percent, width = 10) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  // Gradient colors based on fill level
  let bar = '';
  for (let i = 0; i < filled; i++) {
    const pos = i / width;
    if (pos < 0.3) bar += '🟪';
    else if (pos < 0.5) bar += '🟦';
    else if (pos < 0.7) bar += '🟩';
    else bar += '🟢';
  }

  // Add "active" indicator at the edge
  if (filled > 0 && empty > 0) {
    bar += '▶️';
    return bar + '⬜'.repeat(empty - 1);
  }

  // Empty slots
  bar += '⬜'.repeat(empty);

  // 100% special
  if (percent >= 100) {
    return '🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢 ✨';
  }

  return bar;
}

/**
 * Send a test question
 */
async function sendTestQuestion(telegramId, lessonNumber, questionOrder) {
  const question = await db.getTestQuestion(lessonNumber, questionOrder);

  if (!question) {
    // No more questions - calculate results
    await finishLessonTest(telegramId, lessonNumber);
    return;
  }

  await db.updateUser(telegramId, { current_test_question: questionOrder });

  // Compact buttons in one row
  const buttons = [
    Markup.button.callback('  A  ', `test_ans_${question.id}_a`),
    Markup.button.callback('  B  ', `test_ans_${question.id}_b`),
    Markup.button.callback('  C  ', `test_ans_${question.id}_c`),
    Markup.button.callback('  D  ', `test_ans_${question.id}_d`)
  ];

  const progressBar = generateProgressBar(questionOrder - 1, QUESTIONS_PER_TEST);

  // Show answers in message text
  const answersText =
    `\n\n<b>A)</b> ${question.option_a}\n` +
    `<b>B)</b> ${question.option_b}\n` +
    `<b>C)</b> ${question.option_c}\n` +
    `<b>D)</b> ${question.option_d}`;

  await bot.telegram.sendMessage(telegramId,
    `📝 <b>Savol ${questionOrder}/${QUESTIONS_PER_TEST}</b>\n` +
    `${progressBar} ${Math.round(((questionOrder - 1) / QUESTIONS_PER_TEST) * 100)}%\n\n` +
    `${question.question_text}` +
    answersText,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([buttons]) // All buttons in one row
    }
  );
}

/**
 * Finish test and show results
 */
async function finishLessonTest(telegramId, lessonNumber) {
  const score = await db.getUserLessonTestScore(telegramId, lessonNumber);
  const correctCount = score.correct_answers;
  const totalQuestions = score.total_questions;
  const passed = correctCount >= TEST_PASS_THRESHOLD;

  // Get user's current attempt number
  const user = await db.getUser(telegramId);
  const attemptField = `test_${lessonNumber}_attempt`;
  const currentAttempt = user?.[attemptField] || 1;

  // Update user scores
  const scoreField = `test_${lessonNumber}_score`;
  const passedField = `test_${lessonNumber}_passed`;

  await db.updateUser(telegramId, {
    [scoreField]: correctCount,
    [passedField]: passed,
    test_mode: false,
    current_test_question: 0
  });

  // Get test results with questions for summary
  const testResults = await db.getUserLessonTestResults(telegramId, lessonNumber);

  // Build summary of answers
  let summaryText = '';
  const wrongAnswers = [];

  for (const result of testResults) {
    if (result.is_correct) {
      summaryText += `✅ ${result.question_order}. To'g'ri\n`;
    } else {
      summaryText += `❌ ${result.question_order}. Noto'g'ri\n`;
      wrongAnswers.push(result);
    }
  }

  // Check for perfect score (all questions across all tests)
  const allResults = await db.getUserAllTestResults(telegramId);
  const totalCorrect = allResults.reduce((sum, r) => sum + r.correct_answers, 0);
  const totalAnswered = allResults.reduce((sum, r) => sum + r.total_questions, 0);

  // Calculate total test score
  await db.updateUser(telegramId, { total_test_score: totalCorrect });

  const totalLessons = await db.getLessonsCount();
  const isLastLesson = lessonNumber >= totalLessons;
  const discountPercent = await db.getSetting('perfect_score_discount_percent') || '30';

  // Check if all tests passed with perfect score
  const isPerfect = isLastLesson && totalAnswered >= (totalLessons * QUESTIONS_PER_TEST) && totalCorrect === totalAnswered;

  // Show completion animation
  await bot.telegram.sendMessage(telegramId,
    `${generateProgressBar(QUESTIONS_PER_TEST, QUESTIONS_PER_TEST)} 100%\n\n` +
    `📊 <b>Test yakunlandi!</b>\n\n` +
    `${summaryText}\n` +
    `<b>Natija: ${correctCount}/${totalQuestions}</b>`,
    { parse_mode: 'HTML' }
  );

  await delay(2000);

  // Check if user HAD perfect score on all previous tests but lost it now
  const previousTestsCount = lessonNumber - 1;
  let hadPerfectStreak = false;
  let lostPerfectStreak = false;

  if (previousTestsCount > 0 && correctCount < totalQuestions) {
    // Check if all previous tests were 100%
    const previousResults = allResults.filter(r => r.lesson_number < lessonNumber);
    const previousCorrect = previousResults.reduce((sum, r) => sum + r.correct_answers, 0);
    const previousTotal = previousResults.reduce((sum, r) => sum + r.total_questions, 0);
    hadPerfectStreak = previousTotal > 0 && previousCorrect === previousTotal;
    lostPerfectStreak = hadPerfectStreak;
  }

  if (passed) {
    let message = '';

    // Perfect score on this test
    if (correctCount === totalQuestions) {
      // Different message based on whether it's the last lesson
      if (isLastLesson) {
        // Last lesson - will show discount in pitch
        message = `🏆 <b>MUKAMMAL!</b>\n\n⭐ Siz barcha savollarga to'g'ri javob berdingiz!\n📊 Natija: ${correctCount}/${totalQuestions} (100%)\n\n🎉 Zo'r natija!`;
      } else {
        // Not last lesson - encourage to continue for a gift
        message = `🏆 <b>MUKAMMAL!</b>\n\n⭐ Siz barcha savollarga to'g'ri javob berdingiz!\n📊 Natija: ${correctCount}/${totalQuestions} (100%)\n\n🎁 <i>Agar shunaqa tempda ketaversangiz, oxirida yana bir sovg'amiz ham bor!</i>`;
      }
    } else {
      // Check if they lost the perfect streak
      if (lostPerfectStreak) {
        // Gentle message about losing the special gift chance
        message = `🎉 <b>Yaxshi natija!</b>\n\n` +
          `✅ Siz testdan o'tdingiz!\n` +
          `📊 Natija: ${correctCount}/${totalQuestions}\n\n` +
          `💭 <i>Afsuski, maxsus sovg'a uchun barcha testlardan 100% kerak edi...</i>\n\n` +
          `😊 <b>Lekin tashvishlanmang!</b> Asosiy sovg'a hali oldinda - davom eting! 💪`;
      } else {
        // Normal passed message
        message = await db.getBotMessage('test_passed') ||
          `🎉 <b>Ajoyib natija!</b>\n\n✅ Siz testdan muvaffaqiyatli o'tdingiz!\n📊 Natija: {{correct}}/{{total}}\n\n💪 Davom etamiz!`;
        message = message.replace(/\{\{correct\}\}/gi, correctCount)
          .replace(/\{\{total\}\}/gi, totalQuestions);
      }
    }

    await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'HTML' });

    // If perfect score across ALL tests - just mark, don't show message (will show in pitch)
    if (isPerfect) {
      await db.updateUser(telegramId, { perfect_score: true });
    }

    await delay(2000);

    // If last lesson completed - send gift and pitch
    if (isLastLesson) {
      await sendGiftAndPitch(telegramId, isPerfect);
    } else {
      await startCustDev(telegramId, lessonNumber);
    }
  } else {
    // User failed
    let failMessage = '';

    // On 2nd+ attempt, show correct answers
    if (currentAttempt >= 2 && wrongAnswers.length > 0) {
      failMessage = `📚 <b>Afsuski, yana o'tmadingiz</b>\n\n` +
        `❌ Natija: ${correctCount}/${totalQuestions}\n\n` +
        `📖 <b>To'g'ri javoblar:</b>\n\n`;

      for (const wrong of wrongAnswers) {
        const correctLetter = wrong.correct_answer?.toUpperCase() || '?';
        const correctOption = wrong[`option_${wrong.correct_answer?.toLowerCase()}`] || '';
        failMessage += `${wrong.question_order}. ${wrong.question_text?.substring(0, 50)}...\n`;
        failMessage += `   ✅ <b>${correctLetter}) ${correctOption}</b>\n\n`;
      }

      failMessage += `💡 Darsni qayta ko'ring va yana urinib ko'ring!`;
    } else {
      // First attempt - don't show correct answers
      failMessage = await db.getBotMessage('test_failed') ||
        `📚 <b>Biroz ko'proq o'rganish kerak</b>\n\n` +
        `❌ Natija: {{correct}}/{{total}}\n` +
        `✅ O'tish uchun: kamida ${TEST_PASS_THRESHOLD} ta to'g'ri javob\n\n` +
        `💡 Darsni qayta ko'ring va testni takrorlang.\n` +
        `Bu bilimlar sizga kelajakda juda kerak bo'ladi!`;

      failMessage = failMessage.replace(/\{\{correct\}\}/gi, correctCount)
        .replace(/\{\{total\}\}/gi, totalQuestions);
    }

    await bot.telegram.sendMessage(telegramId, failMessage, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Testni qayta topshirish', `test_retry_${lessonNumber}`)],
        [Markup.button.callback('📚 Darsni qayta ko\'rish', `rewatch_${lessonNumber}`)]
      ])
    });
  }
}

/**
 * Send gift and pitch after completing all lessons
 */
async function sendGiftAndPitch(telegramId, isPerfect) {
  const user = await db.getUser(telegramId);
  const giftName = await db.getBotMessage('gift_name') || 'maxsus sovg\'a';
  const giftFileId = await db.getBotMessage('gift_file_id');
  let giftMessage = await db.getBotMessage('gift_message') ||
    `🎁 <b>Tabriklaymiz!</b>\n\nSiz barcha darslarni muvaffaqiyatli tugatdingiz!\n\nMana sizga {{gift_name}} sovg'amiz:`;

  giftMessage = giftMessage.replace(/\{\{gift_name\}\}/gi, giftName);

  // Send congratulations and gift
  await bot.telegram.sendMessage(telegramId,
    `🎊🎊🎊\n\n` +
    `<b>${user?.full_name || 'Do\'stim'}, tabriklaymiz!</b>\n\n` +
    `✅ Siz barcha 3 ta bepul darsni tugatdingiz!\n` +
    `✅ Barcha testlardan muvaffaqiyatli o'tdingiz!\n\n` +
    `Endi sizga va'da qilgan sovg'amizni beramiz! 👇`,
    { parse_mode: 'HTML' }
  );

  await delay(2000);

  // Send gift file if exists
  if (giftFileId && giftFileId.trim()) {
    try {
      // Try to detect file type and send accordingly
      if (giftFileId.startsWith('BQA')) {
        await bot.telegram.sendDocument(telegramId, giftFileId, { caption: giftMessage, parse_mode: 'HTML' });
      } else if (giftFileId.startsWith('BAA')) {
        await bot.telegram.sendVideo(telegramId, giftFileId, { caption: giftMessage, parse_mode: 'HTML' });
      } else if (giftFileId.startsWith('AgA')) {
        await bot.telegram.sendPhoto(telegramId, giftFileId, { caption: giftMessage, parse_mode: 'HTML' });
      } else if (giftFileId.startsWith('CQA')) {
        await bot.telegram.sendAudio(telegramId, giftFileId, { caption: giftMessage, parse_mode: 'HTML' });
      } else {
        // Try as document by default
        await bot.telegram.sendDocument(telegramId, giftFileId, { caption: giftMessage, parse_mode: 'HTML' });
      }
    } catch (e) {
      console.error('Gift file send error:', e.message);
      await bot.telegram.sendMessage(telegramId, giftMessage, { parse_mode: 'HTML' });
    }
  } else {
    await bot.telegram.sendMessage(telegramId, giftMessage, { parse_mode: 'HTML' });
  }

  await db.updateUser(telegramId, { bonus_claimed: true });

  // Store isPerfect flag for later use in feedback handlers
  if (isPerfect) {
    await db.updateUser(telegramId, { perfect_score: true });
  }

  await delay(3000);

  // Check if feedback flow is enabled
  const feedbackEnabled = await db.getSetting('feedback_enabled');

  if (feedbackEnabled === 'true') {
    // Send feedback question - pitch will come after response
    await sendFeedbackQuestion(telegramId);
  } else {
    // Skip feedback, go directly to pitch
    await sendBonusOffer(telegramId, isPerfect);
  }
}

// Test start callback
bot.action(/^test_start_(\d+)$/, async (ctx) => {
  try {
    const lessonNumber = parseInt(ctx.match[1]);
    await ctx.answerCbQuery('Boshlandi!');
    await ctx.editMessageReplyMarkup(undefined);
    await delay(500);
    await sendTestQuestion(ctx.from.id, lessonNumber, 1);
  } catch (e) {
    console.error('Test start error:', e);
  }
});

// Test answer callback
bot.action(/^test_ans_(\d+)_([abcd])$/, async (ctx) => {
  try {
    const questionId = parseInt(ctx.match[1]);
    const userAnswer = ctx.match[2];
    const telegramId = ctx.from.id;

    // Get question details
    const question = await db.getTestQuestionById(questionId);

    if (!question) {
      await ctx.answerCbQuery('Savol topilmadi');
      return;
    }

    const isCorrect = userAnswer === question.correct_answer.toLowerCase();

    // Save answer
    await db.saveUserTestAnswer(
      telegramId,
      question.lesson_number,
      question.question_order,
      userAnswer,
      isCorrect,
      questionId
    );

    // Don't show correct/incorrect - just acknowledge and show loading
    await ctx.answerCbQuery('✓ Javob qabul qilindi', { show_alert: false });

    // Animated progress bar effect
    const targetPercent = Math.round((question.question_order / QUESTIONS_PER_TEST) * 100);
    const prevPercent = Math.round(((question.question_order - 1) / QUESTIONS_PER_TEST) * 100);

    // Animation frames - progress bar "fills up"
    const animationFrames = [
      { emoji: '⏳', text: 'Yuklanmoqda', dots: '.  ' },
      { emoji: '⏳', text: 'Yuklanmoqda', dots: '.. ' },
      { emoji: '⏳', text: 'Yuklanmoqda', dots: '...' },
    ];

    // Show quick loading animation
    for (let i = 0; i < animationFrames.length; i++) {
      const frame = animationFrames[i];
      const animPercent = prevPercent + Math.round((targetPercent - prevPercent) * ((i + 1) / animationFrames.length));
      const animBar = generateAnimatedBar(animPercent);

      await ctx.editMessageText(
        `${frame.emoji} <b>${frame.text}${frame.dots}</b>\n\n` +
        `${animBar}\n` +
        `<code>━━━━━━━━━━━━━</code>\n` +
        `📊 <b>${animPercent}%</b>`,
        { parse_mode: 'HTML' }
      );
      await delay(150);
    }

    // Final state with celebration based on progress
    const finalEmoji = targetPercent >= 80 ? '🚀' : targetPercent >= 60 ? '⚡' : targetPercent >= 40 ? '💫' : '✅';
    const finalText = targetPercent >= 80 ? 'Deyarli tayyor!' : targetPercent >= 60 ? 'Zo\'r ketayapsiz!' : targetPercent >= 40 ? 'Davom etamiz!' : 'Saqlandi!';
    const finalBar = generateAnimatedBar(targetPercent);

    await ctx.editMessageText(
      `${finalEmoji} <b>${finalText}</b>\n\n` +
      `${finalBar}\n` +
      `<code>━━━━━━━━━━━━━</code>\n` +
      `📊 <b>${targetPercent}%</b> ✨`,
      { parse_mode: 'HTML' }
    );

    await delay(400);

    // Delete progress message to keep chat clean
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Message might already be deleted, ignore
    }

    // Send next question
    await sendTestQuestion(telegramId, question.lesson_number, question.question_order + 1);
  } catch (e) {
    console.error('Test answer error:', e);
    await ctx.answerCbQuery('Xatolik yuz berdi');
  }
});

// Test retry callback
bot.action(/^test_retry_(\d+)$/, async (ctx) => {
  try {
    const lessonNumber = parseInt(ctx.match[1]);
    await ctx.answerCbQuery('Qayta boshlanmoqda...');
    await ctx.editMessageReplyMarkup(undefined);
    await delay(500);
    await startLessonTest(ctx.from.id, lessonNumber);
  } catch (e) {
    console.error('Test retry error:', e);
  }
});

// Rewatch lesson callback
bot.action(/^rewatch_(\d+)$/, async (ctx) => {
  try {
    const lessonNumber = parseInt(ctx.match[1]);
    await ctx.answerCbQuery('Dars yuborilmoqda...');
    await ctx.editMessageReplyMarkup(undefined);
    await delay(500);
    await sendLesson(ctx.from.id, lessonNumber);
  } catch (e) {
    console.error('Rewatch error:', e);
  }
});

export default bot;
// Last deploy: 2026-02-23 test-system
