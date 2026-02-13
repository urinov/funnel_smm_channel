import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import FormData from 'form-data';

import { initDatabase } from './database.js';
import { bot, sendBroadcast, setupAdminWebAppMenu } from './bot.js';
import paymeRouter from './payments/payme.js';
import clickRouter from './payments/click.js';
import { startScheduler } from './scheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => Number.isFinite(id));

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Request logging for debugging
app.use((req, res, next) => {
  if (req.path.includes('/payme') || req.path.includes('/click')) {
    console.log(`=== ${new Date().toISOString()} ===`);
    console.log(`${req.method} ${req.path}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

function timingSafeEqualHex(a, b) {
  try {
    const left = Buffer.from(String(a || ''), 'hex');
    const right = Buffer.from(String(b || ''), 'hex');
    if (left.length !== right.length || left.length === 0) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function verifyTelegramWebAppInitData(initDataRaw) {
  try {
    if (!initDataRaw || !process.env.BOT_TOKEN) {
      return { ok: false, error: 'Missing initData or BOT_TOKEN' };
    }

    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return { ok: false, error: 'Missing hash' };

    const dataCheckArr = [];
    for (const [key, value] of params.entries()) {
      if (key === 'hash') continue;
      dataCheckArr.push(`${key}=${value}`);
    }
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN)
      .digest();
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (!timingSafeEqualHex(calculatedHash, hash)) {
      return { ok: false, error: 'Hash mismatch' };
    }

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!authDate || nowSec - authDate > 24 * 60 * 60) {
      return { ok: false, error: 'initData expired' };
    }

    const userRaw = params.get('user');
    if (!userRaw) return { ok: false, error: 'Missing user payload' };

    const user = JSON.parse(userRaw);
    const telegramId = Number(user?.id);
    if (!Number.isFinite(telegramId) || telegramId <= 0) {
      return { ok: false, error: 'Invalid Telegram user id' };
    }

    return { ok: true, telegramId, user };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function tryTelegramWebAppAuth(req) {
  const telegramInitData = req.get('X-Telegram-Init-Data');
  if (!telegramInitData) return { ok: false, skip: true };

  const verified = verifyTelegramWebAppInitData(telegramInitData);
  if (!verified.ok) return { ok: false, status: 401, error: 'Invalid Telegram WebApp auth' };

  if (!ADMIN_IDS.includes(verified.telegramId)) {
    return { ok: false, status: 403, error: 'Access denied' };
  }

  return {
    ok: true,
    telegramId: verified.telegramId,
    user: verified.user
  };
}

const authMiddleware = (req, res, next) => {
  const tgAuth = tryTelegramWebAppAuth(req);
  if (tgAuth.ok) {
    req.adminUser = `tg_${tgAuth.telegramId}`;
    req.adminTelegramId = tgAuth.telegramId;
    req.authSource = 'telegram_webapp';
    return next();
  }
  if (!tgAuth.skip) {
    return res.status(tgAuth.status || 401).json({ error: tgAuth.error || 'Unauthorized' });
  }

  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');

  if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.adminUser = user;
  req.authSource = 'basic';
  next();
};

const upload = multer({ dest: '/tmp/uploads/' });

async function hydrateCustomEmojiMeta(customEmojiRows = []) {
  const unresolvedIds = customEmojiRows
    .filter((row) => row?.custom_emoji_id && !row?.file_id)
    .map((row) => row.custom_emoji_id);

  if (!unresolvedIds.length) return;

  const chunks = [];
  const chunkSize = 200;
  for (let i = 0; i < unresolvedIds.length; i += chunkSize) {
    chunks.push(unresolvedIds.slice(i, i + chunkSize));
  }

  const { upsertCustomEmoji } = await import('./database.js');

  for (const ids of chunks) {
    try {
      const stickers = await bot.telegram.callApi('getCustomEmojiStickers', {
        custom_emoji_ids: ids
      });
      const list = Array.isArray(stickers) ? stickers : [];

      for (const sticker of list) {
        if (!sticker?.custom_emoji_id) continue;
        await upsertCustomEmoji(String(sticker.custom_emoji_id), {
          emoji_char: sticker.emoji || null,
          file_id: sticker.file_id || null,
          thumb_file_id: sticker.thumbnail?.file_id || null,
          is_animated: sticker.is_animated === true,
          is_video: sticker.is_video === true,
          set_name: sticker.set_name || null
        });
      }
    } catch (e) {
      console.error('hydrate custom emoji error:', e.message);
    }
  }
}

function extractUnicodeEmojis(text) {
  const value = String(text || '');
  if (!value) return [];
  const pattern = /(\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/gu;
  const matches = value.match(pattern);
  return Array.isArray(matches) ? matches.filter(Boolean) : [];
}

app.get('/health', (req, res) => res.send('ok'));
app.get('/', (req, res) => res.send('Telegram Bot is running'));
app.get('/api/auth/telegram-webapp', (req, res) => {
  const tgAuth = tryTelegramWebAppAuth(req);
  if (!tgAuth.ok) {
    return res.status(tgAuth.status || 401).json({ ok: false, error: tgAuth.error || 'Unauthorized' });
  }
  res.json({
    ok: true,
    auth_source: 'telegram_webapp',
    telegram_id: tgAuth.telegramId
  });
});

// Payme test endpoint - tekshirish uchun
app.get('/payme/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    merchant_id: process.env.PAYME_MERCHANT_ID ? 'set' : 'missing',
    key: process.env.PAYME_KEY ? 'set' : 'missing',
    test_key: process.env.PAYME_TEST_KEY ? 'set' : 'missing',
    timestamp: new Date().toISOString()
  });
});

// Debug: barcha to'lovlarni ko'rish (admin uchun)
app.get('/api/payments/debug', authMiddleware, async (req, res) => {
  try {
    const { pool } = await import('./database.js');
    const { rows } = await pool.query(`
      SELECT id, order_id, telegram_id, amount, state, payment_method, 
             transaction_id, created_at, perform_time
      FROM payments 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/upload-media', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const type = req.body.type || 'document';
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const adminChatId = process.env.ADMIN_IDS.split(',')[0].trim();

    const formData = new FormData();
    formData.append('chat_id', adminChatId);
    
    const fileStream = fs.createReadStream(filePath);
    
    let endpoint = '';
    if (type === 'video') {
      formData.append('video', fileStream, { filename: fileName });
      endpoint = 'sendVideo';
    } else if (type === 'photo') {
      formData.append('photo', fileStream, { filename: fileName });
      endpoint = 'sendPhoto';
    } else if (type === 'audio') {
      formData.append('audio', fileStream, { filename: fileName });
      endpoint = 'sendAudio';
    } else {
      formData.append('document', fileStream, { filename: fileName });
      endpoint = 'sendDocument';
    }

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/${endpoint}`,
      { 
        method: 'POST', 
        body: formData,
        headers: formData.getHeaders()
      }
    );

    const result = await response.json();

    try { fs.unlinkSync(filePath); } catch(e) {}

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return res.status(400).json({ error: result.description });
    }

    let file_id = null;
    if (result.result.video) file_id = result.result.video.file_id;
    else if (result.result.photo) file_id = result.result.photo[result.result.photo.length - 1].file_id;
    else if (result.result.audio) file_id = result.result.audio.file_id;
    else if (result.result.voice) file_id = result.result.voice.file_id;
    else if (result.result.document) file_id = result.result.document.file_id;

    res.json({ file_id, message: 'Uploaded successfully' });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/telegram/webhook', (req, res) => {
  bot.handleUpdate(req.body)
    .then(() => res.sendStatus(200))
    .catch((e) => {
      console.error('bot.handleUpdate error', e);
      res.sendStatus(500);
    });
});

app.use('/payme', paymeRouter);
app.use('/click', clickRouter);

app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const { getFullStats } = await import('./database.js');
    const stats = await getFullStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const { getAllActiveUsers } = await import('./database.js');
    const users = await getAllActiveUsers();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:telegramId', authMiddleware, async (req, res) => {
  try {
    const { getUser } = await import('./database.js');
    const user = await getUser(parseInt(req.params.telegramId));
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete user and all related data
app.delete('/api/users/:telegramId', authMiddleware, async (req, res) => {
  try {
    const { deleteUser, getUser } = await import('./database.js');
    const telegramId = parseInt(req.params.telegramId);

    const user = await getUser(telegramId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await deleteUser(telegramId);
    console.log(`🗑️ User deleted: ${telegramId} (${user.username || user.full_name})`);

    res.json({ success: true, message: 'User and all related data deleted' });
  } catch (e) {
    console.error('Delete user error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const { getRecentUserMessages } = await import('./database.js');
    const rows = await getRecentUserMessages(limit);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/conversations/:telegramId', authMiddleware, async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId);
    const limit = parseInt(req.query.limit) || 300;
    const { getUserMessages } = await import('./database.js');
    const rows = await getUserMessages(telegramId, limit);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/custom-emojis', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 300;
    const refresh = String(req.query.refresh || '1') !== '0';
    const { getCustomEmojis, getSetting } = await import('./database.js');
    let rows = await getCustomEmojis(limit);

    if (refresh) {
      await hydrateCustomEmojiMeta(rows);
      rows = await getCustomEmojis(limit);
    }

    const hiddenRaw = await getSetting('hidden_custom_emojis');
    let hiddenIds = [];
    try {
      hiddenIds = Array.isArray(JSON.parse(hiddenRaw || '[]')) ? JSON.parse(hiddenRaw || '[]') : [];
    } catch (_) {
      hiddenIds = [];
    }
    const hiddenSet = new Set(hiddenIds.map((v) => String(v || '').replace(/\D/g, '')).filter(Boolean));
    rows = rows.filter((row) => !hiddenSet.has(String(row?.custom_emoji_id || '').replace(/\D/g, '')));

    res.json(rows);
  } catch (e) {
    console.error('custom emoji list error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/custom-emojis/:customEmojiId', authMiddleware, async (req, res) => {
  try {
    const customEmojiId = String(req.params.customEmojiId || '').replace(/\D/g, '');
    if (!customEmojiId) {
      return res.status(400).json({ error: 'customEmojiId noto‘g‘ri' });
    }

    const { deleteCustomEmoji, getSetting, setSetting } = await import('./database.js');
    const deleted = await deleteCustomEmoji(customEmojiId);

    // Deleted emoji key qayta kuzatilsa ham dashboardda chiqmasligi uchun hide ro'yxatga qo'shamiz
    const hiddenRaw = await getSetting('hidden_custom_emojis');
    let hidden = [];
    try {
      hidden = Array.isArray(JSON.parse(hiddenRaw || '[]')) ? JSON.parse(hiddenRaw || '[]') : [];
    } catch (_) {
      hidden = [];
    }
    if (!hidden.includes(customEmojiId)) {
      hidden.push(customEmojiId);
      await setSetting('hidden_custom_emojis', JSON.stringify(hidden));
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Emoji topilmadi' });
    }

    res.json({ ok: true, custom_emoji_id: customEmojiId });
  } catch (e) {
    console.error('custom emoji delete error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/unicode-emojis/:emojiValue', authMiddleware, async (req, res) => {
  try {
    const emoji = decodeURIComponent(String(req.params.emojiValue || '')).trim();
    if (!emoji) {
      return res.status(400).json({ error: 'emoji noto‘g‘ri' });
    }

    const { getSetting, setSetting } = await import('./database.js');
    const raw = await getSetting('hidden_unicode_emojis');
    let hidden = [];
    try {
      hidden = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : [];
    } catch (_) {
      hidden = [];
    }

    if (!hidden.includes(emoji)) {
      hidden.push(emoji);
      await setSetting('hidden_unicode_emojis', JSON.stringify(hidden));
    }

    res.json({ ok: true, emoji });
  } catch (e) {
    console.error('unicode emoji hide error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/unicode-emojis', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 3000, 100), 10000);
    const top = Math.min(Math.max(parseInt(req.query.top) || 120, 20), 400);
    const { getRecentUserMessages, getSetting } = await import('./database.js');
    const rows = await getRecentUserMessages(limit);

    const usage = new Map();
    for (const row of rows) {
      const txt = String(row?.text_content || '');
      if (!txt) continue;
      const emojis = extractUnicodeEmojis(txt);
      if (!emojis.length) continue;

      for (const emoji of emojis) {
        const prev = usage.get(emoji) || { emoji, seen_count: 0, last_seen_at: row.created_at };
        prev.seen_count += 1;
        if (!prev.last_seen_at || new Date(row.created_at) > new Date(prev.last_seen_at)) {
          prev.last_seen_at = row.created_at;
        }
        usage.set(emoji, prev);
      }
    }

    const hiddenRaw = await getSetting('hidden_unicode_emojis');
    let hiddenList = [];
    try {
      hiddenList = Array.isArray(JSON.parse(hiddenRaw || '[]')) ? JSON.parse(hiddenRaw || '[]') : [];
    } catch (_) {
      hiddenList = [];
    }
    const hiddenSet = new Set(hiddenList.map((v) => String(v || '').trim()).filter(Boolean));

    const result = Array.from(usage.values())
      .filter((item) => !hiddenSet.has(String(item?.emoji || '').trim()))
      .sort((a, b) => {
        const ad = new Date(a.last_seen_at).getTime();
        const bd = new Date(b.last_seen_at).getTime();
        if (bd !== ad) return bd - ad;
        return b.seen_count - a.seen_count;
      })
      .slice(0, top);

    res.json(result);
  } catch (e) {
    console.error('unicode emoji list error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/telegram-file/:fileId', authMiddleware, async (req, res) => {
  try {
    const fileId = decodeURIComponent(req.params.fileId || '').trim();
    if (!fileId) {
      return res.status(400).json({ error: 'fileId kerak' });
    }

    const file = await bot.telegram.getFile(fileId);
    if (!file?.file_path) {
      return res.status(404).json({ error: 'Fayl topilmadi' });
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const tgResp = await fetch(fileUrl);
    if (!tgResp.ok) {
      return res.status(tgResp.status).json({ error: 'Telegram file fetch xatolik' });
    }

    const contentType = tgResp.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await tgResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  } catch (e) {
    console.error('telegram-file proxy error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/conversations/:telegramId/reply', authMiddleware, async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId);
    const text = String(req.body?.text || '').trim();
    const stickerFileId = String(req.body?.sticker_file_id || '').trim();
    const replyToMessageId = parseInt(req.body?.reply_to_message_id) || null;
    const parseMode = String(req.body?.parse_mode || 'HTML').toUpperCase();
    const disableLinkPreview = req.body?.disable_link_preview === true;

    if (!telegramId || (!text && !stickerFileId)) {
      return res.status(400).json({ error: 'telegramId va (text yoki sticker_file_id) kerak' });
    }

    const sent = [];
    const replyParams = replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {};

    const { logUserMessage, upsertCustomEmoji } = await import('./database.js');

    if (text) {
      const customEmojiMatches = [...text.matchAll(/<tg-emoji\s+emoji-id="([^"]+)">([\s\S]*?)<\/tg-emoji>/g)];
      for (const match of customEmojiMatches) {
        const customEmojiId = String(match[1] || '').replace(/\D/g, '');
        const emojiChar = String(match[2] || '').trim();
        if (!customEmojiId) continue;
        await upsertCustomEmoji(customEmojiId, {
          emoji_char: emojiChar || null,
          last_used_by: telegramId
        });
      }

      const hasHtmlTags = /<[^>]+>/.test(text);
      const preferredParseMode =
        parseMode === 'MARKDOWNV2'
          ? (hasHtmlTags ? 'HTML' : 'MarkdownV2')
          : 'HTML';

      let sentMsg;
      try {
        sentMsg = await bot.telegram.sendMessage(telegramId, text, {
          parse_mode: preferredParseMode,
          link_preview_options: { is_disabled: disableLinkPreview },
          ...replyParams
        });
      } catch (sendErr) {
        const errText = String(sendErr?.message || '');
        const parseError = errText.includes("can't parse entities");
        if (!parseError) throw sendErr;

        // Fallback: yuborishni parse_mode siz qilib, xabar yo'qolib ketmasin
        sentMsg = await bot.telegram.sendMessage(telegramId, text, {
          link_preview_options: { is_disabled: disableLinkPreview },
          ...replyParams
        });
      }
      sent.push(sentMsg?.message_id);

      await logUserMessage(telegramId, 'admin_outgoing', text, {
        source: 'dashboard',
        admin_user: req.adminUser || 'admin',
        parse_mode: preferredParseMode,
        message_id: sentMsg?.message_id || null,
        reply_to_message_id: replyToMessageId || null
      });
    }

    if (stickerFileId) {
      const sentSticker = await bot.telegram.sendSticker(telegramId, stickerFileId, {
        ...replyParams
      });
      sent.push(sentSticker?.message_id);

      await logUserMessage(telegramId, 'admin_outgoing_sticker', '[STICKER yuborildi]', {
        source: 'dashboard',
        admin_user: req.adminUser || 'admin',
        sticker_file_id: stickerFileId,
        message_id: sentSticker?.message_id || null,
        reply_to_message_id: replyToMessageId || null
      });
    }

    res.json({ success: true, message_ids: sent });
  } catch (e) {
    console.error('Conversation reply error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/lessons', authMiddleware, async (req, res) => {
  try {
    const { getAllLessons } = await import('./database.js');
    const lessons = await getAllLessons();
    res.json(lessons);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lessons', authMiddleware, async (req, res) => {
  try {
    const { createLesson } = await import('./database.js');
    const lesson = await createLesson(req.body);
    res.json(lesson);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/lessons/:id', authMiddleware, async (req, res) => {
  try {
    const { updateLesson } = await import('./database.js');
    const lesson = await updateLesson(parseInt(req.params.id), req.body);
    if (!lesson) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }
    res.json(lesson);
  } catch (e) {
    console.error('Update lesson error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/lessons/:id', authMiddleware, async (req, res) => {
  try {
    const { deleteLesson } = await import('./database.js');
    await deleteLesson(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/custdev', authMiddleware, async (req, res) => {
  try {
    const { getAllCustDevQuestions } = await import('./database.js');
    const questions = await getAllCustDevQuestions();
    res.json(questions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/custdev', authMiddleware, async (req, res) => {
  try {
    const { createCustDevQuestion } = await import('./database.js');
    const question = await createCustDevQuestion(req.body);
    res.json(question);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/custdev/:id', authMiddleware, async (req, res) => {
  try {
    const { updateCustDevQuestion } = await import('./database.js');
    await updateCustDevQuestion(parseInt(req.params.id), req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/custdev/:id', authMiddleware, async (req, res) => {
  try {
    const { deleteCustDevQuestion } = await import('./database.js');
    await deleteCustDevQuestion(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/pitch', authMiddleware, async (req, res) => {
  try {
    const { getPitchMedia } = await import('./database.js');
    const pitch = await getPitchMedia();
    res.json(pitch || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/pitch', authMiddleware, async (req, res) => {
  try {
    const { updatePitchMedia } = await import('./database.js');
    await updatePitchMedia(req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Price settings API
app.get('/api/settings/price', authMiddleware, async (req, res) => {
  try {
    const { getBotMessage } = await import('./database.js');
    const priceStr = await getBotMessage('subscription_price');
    const price = priceStr ? parseInt(priceStr) : 9700000; // default 97,000 so'm in tiyin
    res.json({ price });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings/price', authMiddleware, async (req, res) => {
  try {
    const { updateBotMessage } = await import('./database.js');
    const { price } = req.body;
    
    if (!price || price < 100000) { // minimum 1000 so'm
      return res.status(400).json({ error: 'Narx kamida 1000 so\'m bo\'lishi kerak' });
    }
    
    await updateBotMessage('subscription_price', String(price));
    res.json({ success: true, price });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Channel link settings API
app.get('/api/settings/channel-link', authMiddleware, async (req, res) => {
  try {
    const { getBotMessage } = await import('./database.js');
    const link = await getBotMessage('premium_channel_link');
    res.json({ link: link || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings/channel-link', authMiddleware, async (req, res) => {
  try {
    const { updateBotMessage } = await import('./database.js');
    const { link } = req.body;
    
    await updateBotMessage('premium_channel_link', link || '');
    res.json({ success: true, link });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Channel ID for auto invite links
app.get('/api/settings/channel-id', authMiddleware, async (req, res) => {
  try {
    const { getBotMessage } = await import('./database.js');
    const channelId = await getBotMessage('premium_channel_id');
    res.json({ channel_id: channelId || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings/channel-id', authMiddleware, async (req, res) => {
  try {
    const { updateBotMessage } = await import('./database.js');
    const { channel_id } = req.body;
    
    await updateBotMessage('premium_channel_id', channel_id || '');
    res.json({ success: true, channel_id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ Subscription Plans API ============
app.get('/api/subscription-plans', authMiddleware, async (req, res) => {
  try {
    const { getSubscriptionPlans } = await import('./database.js');
    const plans = await getSubscriptionPlans(false); // Get all, including inactive
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/subscription-plans/:id', authMiddleware, async (req, res) => {
  try {
    const { updateSubscriptionPlan } = await import('./database.js');
    const { name, price, duration_days, discount_percent, is_active } = req.body;
    
    await updateSubscriptionPlan(req.params.id, {
      name,
      price: parseInt(price),
      duration_days: parseInt(duration_days),
      discount_percent: parseInt(discount_percent) || 0,
      is_active: is_active !== false
    });
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ Subscription Reminders API ============
app.get('/api/subscription-reminders', authMiddleware, async (req, res) => {
  try {
    const { getBotMessage } = await import('./database.js');
    const reminders = {
      reminder_10d: await getBotMessage('reminder_10d') || '📅 Hurmatli {{ism}}, premium kanaldagi obunangiz tugashiga 10 kun qoldi.\n\nDavom ettirish uchun hoziroq uzaytiring:',
      reminder_5d: await getBotMessage('reminder_5d') || '⏰ Hurmatli {{ism}}, obunangiz tugashiga 5 kun qoldi!\n\nObunani uzaytirish uchun quyidagi tugmani bosing:',
      reminder_3d: await getBotMessage('reminder_3d') || '⚠️ Hurmatli {{ism}}, obunangiz tugashiga 3 kun qoldi!\n\nPremium kanalga kirishni davom ettirish uchun obunani uzaytiring:',
      reminder_1d: await getBotMessage('reminder_1d') || '🚨 Hurmatli {{ism}}, obunangiz ERTAGA tugaydi!\n\nKanaldan chiqarib yuborilmaslik uchun hoziroq uzaytiring:',
      reminder_expired: await getBotMessage('reminder_expired') || '❌ Hurmatli {{ism}}, obunangiz tugadi.\n\nPremium kanalga kirish to\'xtatildi.\n\nQayta obuna bo\'lish uchun:'
    };
    res.json(reminders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/subscription-reminders', authMiddleware, async (req, res) => {
  try {
    const { updateBotMessage } = await import('./database.js');
    const { reminder_10d, reminder_5d, reminder_3d, reminder_1d, reminder_expired } = req.body;
    
    if (reminder_10d !== undefined) await updateBotMessage('reminder_10d', reminder_10d);
    if (reminder_5d !== undefined) await updateBotMessage('reminder_5d', reminder_5d);
    if (reminder_3d !== undefined) await updateBotMessage('reminder_3d', reminder_3d);
    if (reminder_1d !== undefined) await updateBotMessage('reminder_1d', reminder_1d);
    if (reminder_expired !== undefined) await updateBotMessage('reminder_expired', reminder_expired);
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ Subscriptions List API ============
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const { getAllSubscriptions } = await import('./database.js');
    const subscriptions = await getAllSubscriptions();
    res.json(subscriptions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const { getAllBotMessages } = await import('./database.js');
    const messages = await getAllBotMessages();
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET individual message by key
app.get('/api/messages/:key', authMiddleware, async (req, res) => {
  try {
    const { getBotMessage } = await import('./database.js');
    const text = await getBotMessage(req.params.key);
    res.json({ text: text || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/messages/:key', authMiddleware, async (req, res) => {
  try {
    const { updateBotMessage } = await import('./database.js');
    await updateBotMessage(req.params.key, req.body.text);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Bot messages settings (sales_pitch, soft_attack, delays)
app.get('/api/bot-messages', authMiddleware, async (req, res) => {
  try {
    const { getBotMessage } = await import('./database.js');
    
    const salesDelayStr = await getBotMessage('sales_delay');
    const softDelayStr = await getBotMessage('soft_attack_delay');
    
    const messages = {
      post_lesson_congrats: await getBotMessage('post_lesson_congrats') || '🎉 Tabriklayman! Barcha bepul darslarni tugatdingiz!\n\nTez orada maxsus taklif yuboraman...',
      sales_pitch: await getBotMessage('sales_pitch') || 'SMM PRO KURSGA TAKLIF!',
      soft_attack: await getBotMessage('soft_attack') || '🤔 Hali qaror qilmadingizmi?',
      sales_delay: salesDelayStr !== null && salesDelayStr !== undefined ? parseInt(salesDelayStr) : 1,
      soft_attack_delay: softDelayStr !== null && softDelayStr !== undefined ? parseInt(softDelayStr) : 24,
      soft_attack_disabled: (await getBotMessage('soft_attack_disabled')) === 'true'
    };
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/bot-messages', authMiddleware, async (req, res) => {
  try {
    const { updateBotMessage } = await import('./database.js');
    const data = req.body;
    
    if (data.post_lesson_congrats !== undefined) {
      await updateBotMessage('post_lesson_congrats', data.post_lesson_congrats);
    }
    if (data.sales_pitch !== undefined) {
      await updateBotMessage('sales_pitch', data.sales_pitch);
    }
    if (data.soft_attack !== undefined) {
      await updateBotMessage('soft_attack', data.soft_attack);
    }
    if (data.sales_delay !== undefined) {
      await updateBotMessage('sales_delay', String(data.sales_delay));
    }
    if (data.soft_attack_delay !== undefined) {
      await updateBotMessage('soft_attack_delay', String(data.soft_attack_delay));
    }
    if (data.soft_attack_disabled !== undefined) {
      await updateBotMessage('soft_attack_disabled', String(data.soft_attack_disabled));
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test endpoints
app.post('/api/test/pitch', authMiddleware, async (req, res) => {
  try {
    const { sendVideoPitch } = await import('./bot.js');
    const adminId = parseInt(process.env.ADMIN_IDS?.split(',')[0]);
    if (!adminId) {
      return res.status(400).json({ error: 'ADMIN_IDS not set in environment variables' });
    }
    console.log('🧪 Testing pitch for admin:', adminId);
    await sendVideoPitch(adminId, true); // true = force send (ignore is_paid check)
    res.json({ success: true, message: 'Pitch sent to ' + adminId });
  } catch (e) {
    console.error('❌ Test pitch error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/test/sales', authMiddleware, async (req, res) => {
  try {
    const { sendSalesPitch } = await import('./bot.js');
    const adminId = parseInt(process.env.ADMIN_IDS?.split(',')[0]);
    if (!adminId) {
      return res.status(400).json({ error: 'ADMIN_IDS not set in environment variables' });
    }
    console.log('🧪 Testing sales for admin:', adminId);
    await sendSalesPitch(adminId);
    res.json({ success: true, message: 'Sales sent to ' + adminId });
  } catch (e) {
    console.error('❌ Test sales error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/test/soft-attack', authMiddleware, async (req, res) => {
  try {
    const { sendSoftAttack } = await import('./bot.js');
    const adminId = parseInt(process.env.ADMIN_IDS?.split(',')[0]);
    if (!adminId) {
      return res.status(400).json({ error: 'ADMIN_IDS not set in environment variables' });
    }
    console.log('🧪 Testing soft-attack for admin:', adminId);
    await sendSoftAttack(adminId, true); // true = force send
    res.json({ success: true, message: 'Soft attack sent to ' + adminId });
  } catch (e) {
    console.error('❌ Test soft-attack error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/test/daily-report', authMiddleware, async (req, res) => {
  try {
    const { sendDailyAdminReport } = await import('./scheduler.js');
    await sendDailyAdminReport();
    res.json({ success: true, message: 'Daily report sent to admins' });
  } catch (e) {
    console.error('❌ Daily report test error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Full flow test - sends all messages with short delays
app.post('/api/test/full-flow', authMiddleware, async (req, res) => {
  try {
    const { sendVideoPitch, sendSalesPitch, sendSoftAttack, bot } = await import('./bot.js');
    const adminId = parseInt(process.env.ADMIN_IDS?.split(',')[0]);
    if (!adminId) {
      return res.status(400).json({ error: 'ADMIN_IDS not set in environment variables' });
    }
    
    console.log('🚀 Starting full flow test for admin:', adminId);
    
    // Step 1: Congratulations
    await bot.telegram.sendMessage(adminId, '🎉 <b>Tabriklaymiz!</b>\n\nSiz barcha bepul darslarni muvaffaqiyatli tugatdingiz!\n\n<i>(Bu test xabari - haqiqiy flow 1 soatdan keyin davom etadi)</i>', { parse_mode: 'HTML' });
    
    // Step 2: Pitch (3 sec delay for test)
    setTimeout(async () => {
      try {
        await sendVideoPitch(adminId, true);
      } catch (e) { console.error('Pitch error:', e); }
    }, 3000);
    
    // Step 3: Sales (6 sec delay for test)
    setTimeout(async () => {
      try {
        await sendSalesPitch(adminId);
      } catch (e) { console.error('Sales error:', e); }
    }, 6000);
    
    // Step 4: Soft attack (9 sec delay for test)
    setTimeout(async () => {
      try {
        await sendSoftAttack(adminId, true);
      } catch (e) { console.error('Soft attack error:', e); }
    }, 9000);
    
    res.json({ success: true, message: 'Full flow started. Check Telegram in next 10 seconds.' });
  } catch (e) {
    console.error('❌ Full flow error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ FEEDBACK API ============
app.get('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const { getAllFeedback } = await import('./database.js');
    const feedback = await getAllFeedback();
    res.json(feedback);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/feedback/stats', authMiddleware, async (req, res) => {
  try {
    const { getFeedbackStats } = await import('./database.js');
    const stats = await getFeedbackStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/payments', authMiddleware, async (req, res) => {
  try {
    const { getAllPayments } = await import('./database.js');
    const payments = await getAllPayments();
    res.json(payments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/payments/analytics', authMiddleware, async (req, res) => {
  try {
    const { getPaymentAnalytics } = await import('./database.js');
    const analytics = await getPaymentAnalytics();
    res.json(analytics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Buyer Analytics API
app.get('/api/payments/buyer-analytics', authMiddleware, async (req, res) => {
  try {
    const { getBuyerAnalytics } = await import('./database.js');
    const analytics = await getBuyerAnalytics();
    res.json(analytics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/subscribers/daily', authMiddleware, async (req, res) => {
  try {
    const { getDailySubscribers } = await import('./database.js');
    const data = await getDailySubscribers();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/media', authMiddleware, async (req, res) => {
  try {
    const { getAllMedia } = await import('./database.js');
    const media = await getAllMedia();
    res.json(media);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/media/:type', authMiddleware, async (req, res) => {
  try {
    const { getMediaByType } = await import('./database.js');
    const media = await getMediaByType(req.params.type);
    res.json(media);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/media/:id', authMiddleware, async (req, res) => {
  try {
    const { deleteMedia } = await import('./database.js');
    await deleteMedia(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/media/:id', authMiddleware, async (req, res) => {
  try {
    const { updateMedia } = await import('./database.js');
    const media = await updateMedia(parseInt(req.params.id), req.body.caption || '');
    res.json(media);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/broadcast', authMiddleware, async (req, res) => {
  try {
    const { text, filters, photo, video, button_text, button_url } = req.body;
    const { getAllActiveUsers, getLessonsCount } = await import('./database.js');
    const { Markup } = await import('telegraf');

    let users = await getAllActiveUsers();
    const totalLessons = await getLessonsCount();

    // Apply filters
    if (filters) {
      // Quick filter or status filter
      if (filters.filter === 'paid' || filters.status === 'paid') {
        users = users.filter(u => u.is_paid);
      } else if (filters.filter === 'free' || filters.status === 'free') {
        users = users.filter(u => !u.is_paid);
      }
      
      // Lesson filter
      if (filters.lesson && filters.lesson !== 'all') {
        if (filters.lesson === 'completed') {
          users = users.filter(u => (u.current_lesson || 0) >= totalLessons);
        } else {
          const lessonNum = parseInt(filters.lesson);
          users = users.filter(u => (u.current_lesson || 0) === lessonNum);
        }
      }
      
      // CustDev filter
      if (filters.custdev && filters.custdev !== 'all') {
        if (filters.custdev === 'completed') {
          users = users.filter(u => u.age_group || u.occupation || u.main_problem);
        } else if (filters.custdev === 'not') {
          users = users.filter(u => !u.age_group && !u.occupation && !u.main_problem);
        }
      }
      
      // Date filter
      if (filters.date && filters.date !== 'all') {
        const now = new Date();
        users = users.filter(u => {
          const created = new Date(u.created_at);
          const diff = now - created;
          if (filters.date === 'today') return created.toDateString() === now.toDateString();
          if (filters.date === 'week') return diff < 7 * 24 * 60 * 60 * 1000;
          if (filters.date === 'month') return diff < 30 * 24 * 60 * 60 * 1000;
          if (filters.date === 'old') return diff > 30 * 24 * 60 * 60 * 1000;
          return true;
        });
      }
    }

    let sent = 0;
    let failed = 0;

    // Build inline keyboard if button provided
    let keyboard = null;
    if (button_text && button_url) {
      keyboard = Markup.inlineKeyboard([[Markup.button.url(button_text, button_url)]]);
    }

    for (const user of users) {
      try {
        const personalizedText = text
          .replace(/\{\{fio\}\}/gi, user.full_name || "do'st")
          .replace(/\{\{ism\}\}/gi, (user.full_name || "do'st").split(' ')[0])
          .replace(/\{\{telefon\}\}/gi, user.phone || '')
          .replace(/\{\{username\}\}/gi, user.username ? '@' + user.username : '')
          .replace(/\{\{dars\}\}/gi, String(user.current_lesson || 0));

        const opts = { parse_mode: 'HTML', ...(keyboard || {}) };

        if (video) {
          await bot.telegram.sendVideo(user.telegram_id, video, { caption: personalizedText, ...opts });
        } else if (photo) {
          await bot.telegram.sendPhoto(user.telegram_id, photo, { caption: personalizedText, ...opts });
        } else {
          await bot.telegram.sendMessage(user.telegram_id, personalizedText, opts);
        }
        sent++;
      } catch (e) {
        console.log('Broadcast failed:', user.telegram_id, e.message);
        failed++;
      }
      await new Promise(r => setTimeout(r, 50));
    }

    res.json({ sent, failed, total: users.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ CHANNEL SETTINGS API ============
app.get('/api/settings/channel', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const settings = await db.getChannelSettings();
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings/channel', authMiddleware, async (req, res) => {
  try {
    const { channel_id, channel_link } = req.body;
    const db = await import('./database.js');
    await db.updateChannelSettings(channel_id, channel_link);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generic settings key endpoint (for free channel, etc)
app.put('/api/app-settings', authMiddleware, async (req, res) => {
  try {
    const { key, value } = req.body;
    const db = await import('./database.js');
    await db.setSetting(key, value);
    console.log('✅ Setting saved:', key, '=', value);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/app-settings/:key', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const value = await db.getSetting(req.params.key);
    res.json({ key: req.params.key, value: value || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ INVITE LINKS API ============
app.get('/api/invite-links', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const links = await db.getUsersWithInviteLinks();
    const stats = await db.getInviteLinkStats();
    res.json({ links, stats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ ENHANCED ANALYTICS API ============
app.get('/api/analytics/funnel', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const funnel = await db.getFunnelAnalytics();
    res.json(funnel);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/revenue', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const db = await import('./database.js');
    const revenue = await db.getRevenueByPeriod(days);
    res.json(revenue);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/subscriptions', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const stats = await db.getSubscriptionStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/buyers', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const analytics = await db.getBuyerAnalytics();
    res.json(analytics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ SOURCE/UTM ANALYTICS API ============
app.get('/api/analytics/sources', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const sources = await db.getSourceStats();
    res.json({ sources });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ REFERRAL ANALYTICS API ============
app.get('/api/analytics/referrals', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const globalStats = await db.getGlobalReferralStats();
    const leaderboard = await db.getReferralLeaderboard(20);
    res.json({ stats: globalStats, leaderboard });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/referrals/:telegramId', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const telegramId = parseInt(req.params.telegramId);
    const stats = await db.getReferralStats(telegramId);
    const user = await db.getUser(telegramId);
    res.json({
      ...stats,
      referral_code: user?.referral_code,
      referral_discount_used: user?.referral_discount_used
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ INACTIVITY REMINDER ANALYTICS API ============
app.get('/api/analytics/inactivity', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const stats = await db.getInactivityReminderStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ APP SETTINGS API ============
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    // Use combined settings from bot_messages and settings tables
    const settings = await db.getAllDashboardSettings();
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings/:key', authMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const db = await import('./database.js');
    await db.setSetting(key, value);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ MULTI-FUNNEL API ============

// Get all funnels
app.get('/api/funnels', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const funnels = await db.getAllFunnels();
    res.json(funnels);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single funnel
app.get('/api/funnels/:id', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const funnel = await db.getFunnelById(parseInt(req.params.id));
    if (!funnel) return res.status(404).json({ error: 'Funnel not found' });
    res.json(funnel);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create funnel
app.post('/api/funnels', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const funnel = await db.createFunnel(req.body);
    res.json(funnel);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update funnel
app.put('/api/funnels/:id', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const funnel = await db.updateFunnel(parseInt(req.params.id), req.body);
    res.json(funnel);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete funnel
app.delete('/api/funnels/:id', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    await db.deleteFunnel(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Set default funnel
app.post('/api/funnels/:id/set-default', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    await db.setDefaultFunnel(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get funnel lessons
app.get('/api/funnels/:id/lessons', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const lessons = await db.getFunnelLessons(parseInt(req.params.id));
    res.json(lessons);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create/Update funnel lesson
app.put('/api/funnels/:id/lessons/:num', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const lesson = await db.upsertFunnelLesson(
      parseInt(req.params.id),
      parseInt(req.params.num),
      req.body
    );
    res.json(lesson);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete funnel lesson
app.delete('/api/funnels/:id/lessons/:num', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    await db.deleteFunnelLesson(parseInt(req.params.id), parseInt(req.params.num));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get funnel custdev
app.get('/api/funnels/:id/custdev', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const questions = await db.getFunnelCustDev(parseInt(req.params.id));
    res.json(questions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create funnel custdev question
app.post('/api/funnels/:id/custdev', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const question = await db.createFunnelCustDev(parseInt(req.params.id), req.body);
    res.json(question);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete funnel custdev
app.delete('/api/funnels/:fid/custdev/:id', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    await db.deleteFunnelCustDev(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get funnel plans
app.get('/api/funnels/:id/plans', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const plans = await db.getFunnelPlans(parseInt(req.params.id));
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create/Update funnel plan
app.put('/api/funnels/:id/plans/:planId', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const plan = await db.upsertFunnelPlan(
      parseInt(req.params.id),
      req.params.planId,
      req.body
    );
    res.json(plan);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get funnel stats (enhanced)
app.get('/api/funnels/:id/stats', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const funnelId = parseInt(req.params.id);
    const stats = await db.getFunnelStats(funnelId);
    const lessonStats = await db.getFunnelLessonStats(funnelId);
    const custdevStats = await db.getFunnelCustdevStats(funnelId);
    const revenue = await db.getFunnelRevenue(funnelId);

    res.json({
      ...stats,
      lessonStats,
      custdevStats,
      total_revenue: revenue.total || 0,
      custdev_answered: custdevStats.reduce((sum, c) => sum + parseInt(c.answer_count || 0), 0),
      total_lessons: lessonStats.reduce((sum, l) => sum + (parseInt(l.current_lesson) * parseInt(l.user_count)), 0)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get funnel users
app.get('/api/funnels/:id/users', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const funnelId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const result = await db.getFunnelUsers(funnelId, { page, limit, status });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get funnel payments
app.get('/api/funnels/:id/payments', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const funnelId = parseInt(req.params.id);
    const payments = await db.getFunnelPayments(funnelId);
    res.json({ payments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Migrate existing data to multi-funnel
app.post('/api/funnels/migrate', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const funnel = await db.migrateToMultiFunnel();
    res.json({ success: true, funnel });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ NEW: CustDev Answers API ============
app.get('/api/custdev/answers', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const answers = await db.getAllCustDevAnswers();
    res.json(answers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get user's custdev answers
app.get('/api/users/:telegramId/custdev', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const answers = await db.getUserCustDevAnswers(parseInt(req.params.telegramId));
    res.json(answers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ NEW: Settings POST (save all settings) ============
app.post('/api/settings', authMiddleware, async (req, res) => {
  try {
    const db = await import('./database.js');
    const data = req.body;

    // Channel settings
    if (data.premium_channel_id !== undefined) await db.updateBotMessage('premium_channel_id', data.premium_channel_id);
    if (data.free_channel_id !== undefined) await db.updateBotMessage('free_channel_id', data.free_channel_id);
    if (data.free_channel_link !== undefined) await db.updateBotMessage('free_channel_link', data.free_channel_link);
    if (data.require_subscription_before_lesson !== undefined) await db.updateBotMessage('require_subscription_before_lesson', String(data.require_subscription_before_lesson));

    // Payment settings
    if (data.payme_enabled !== undefined) await db.updateBotMessage('payme_enabled', String(data.payme_enabled));
    if (data.click_enabled !== undefined) await db.updateBotMessage('click_enabled', String(data.click_enabled));

    // Price settings with automatic discount calculation
    // When 1-month price is set, calculate 3/6/12 month prices with discounts
    if (data.price_1m !== undefined) {
      const basePrice = parseInt(data.price_1m);
      await db.updateBotMessage('price_1m', String(basePrice));

      // Automatic discounts: 3 months = 10%, 6 months = 25%, 12 months = 40%
      const price3m = Math.round(basePrice * 3 * 0.90);  // 10% discount
      const price6m = Math.round(basePrice * 6 * 0.75);  // 25% discount
      const price12m = Math.round(basePrice * 12 * 0.60); // 40% discount

      await db.updateBotMessage('price_3m', String(price3m));
      await db.updateBotMessage('price_6m', String(price6m));
      await db.updateBotMessage('price_12m', String(price12m));

      // Also update subscription_plans table (used by bot)
      await db.updateSubscriptionPlan('1month', { price: basePrice, discount_percent: 0 });
      await db.updateSubscriptionPlan('3month', { price: price3m, discount_percent: 10 });
      await db.updateSubscriptionPlan('6month', { price: price6m, discount_percent: 25 });
      await db.updateSubscriptionPlan('1year', { price: price12m, discount_percent: 40 });

      console.log('💰 Prices updated: 1m=' + basePrice + ', 3m=' + price3m + ' (-10%), 6m=' + price6m + ' (-25%), 12m=' + price12m + ' (-40%)');
    }
    // Allow manual override of individual prices
    if (data.price_3m !== undefined && data.price_1m === undefined) await db.updateBotMessage('price_3m', String(data.price_3m));
    if (data.price_6m !== undefined && data.price_1m === undefined) await db.updateBotMessage('price_6m', String(data.price_6m));
    if (data.price_12m !== undefined && data.price_1m === undefined) await db.updateBotMessage('price_12m', String(data.price_12m));

    // Progrev settings (delay before feedback question)
    if (data.welcome !== undefined) await db.updateBotMessage('welcome', data.welcome);
    if (data.ask_name !== undefined) await db.updateBotMessage('ask_name', data.ask_name);

    // Progrev settings (delay before feedback question)
    if (data.pitch_delay_minutes !== undefined) await db.updateBotMessage('pitch_delay_minutes', String(data.pitch_delay_minutes));
    if (data.pitch_media_type !== undefined) await db.updateBotMessage('pitch_media_type', data.pitch_media_type || 'none');
    if (data.pitch_video_file_id !== undefined) await db.updateBotMessage('pitch_video_file_id', data.pitch_video_file_id || '');
    if (data.pitch_audio_file_id !== undefined) await db.updateBotMessage('pitch_audio_file_id', data.pitch_audio_file_id || '');
    if (data.pitch_image_file_id !== undefined) await db.updateBotMessage('pitch_image_file_id', data.pitch_image_file_id || '');
    if (data.pitch_video_note_file_id !== undefined) await db.updateBotMessage('pitch_video_note_file_id', data.pitch_video_note_file_id || '');

    // Also update pitch_media table (used by bot for feedback question media)
    if (data.pitch_video_file_id !== undefined || data.pitch_audio_file_id !== undefined ||
        data.pitch_image_file_id !== undefined || data.pitch_video_note_file_id !== undefined) {
      await db.updatePitchMedia({
        media_type: data.pitch_media_type || 'none',
        video_file_id: data.pitch_video_file_id || null,
        audio_file_id: data.pitch_audio_file_id || null,
        image_file_id: data.pitch_image_file_id || null,
        video_note_file_id: data.pitch_video_note_file_id || null,
        text: null // Text is now from feedback_question setting
      });
    }

    if (data.sales_delay_minutes !== undefined) await db.updateBotMessage('sales_delay_minutes', String(data.sales_delay_minutes));
    if (data.sales_pitch !== undefined) await db.updateBotMessage('sales_pitch', data.sales_pitch);

    if (data.soft_attack_disabled !== undefined) await db.updateBotMessage('soft_attack_disabled', String(data.soft_attack_disabled));
    if (data.soft_attack_delay_minutes !== undefined) await db.updateBotMessage('soft_attack_delay_minutes', String(data.soft_attack_delay_minutes));
    if (data.soft_attack_text !== undefined) await db.updateBotMessage('soft_attack_text', data.soft_attack_text);

    if (data.congrats_text !== undefined) await db.updateBotMessage('congrats_text', data.congrats_text);

    // Lesson completion defaults
    if (data.watched_message_default !== undefined) await db.updateBotMessage('watched_message_default', data.watched_message_default);
    if (data.watched_button_default !== undefined) await db.updateBotMessage('watched_button_default', data.watched_button_default);

    // Feedback flow settings
    if (data.feedback_enabled !== undefined) await db.setSetting('feedback_enabled', String(data.feedback_enabled));
    if (data.feedback_question !== undefined) await db.setSetting('feedback_question', data.feedback_question);
    if (data.feedback_yes_btn !== undefined) await db.setSetting('feedback_yes_btn', data.feedback_yes_btn);
    if (data.feedback_no_btn !== undefined) await db.setSetting('feedback_no_btn', data.feedback_no_btn);
    // Pitch info (shown after positive feedback)
    if (data.pitch_info_text !== undefined) await db.setSetting('pitch_info_text', data.pitch_info_text);
    if (data.pitch_info_btn !== undefined) await db.setSetting('pitch_info_btn', data.pitch_info_btn);
    // Negative feedback
    if (data.feedback_no_response !== undefined) await db.setSetting('feedback_no_response', data.feedback_no_response);
    if (data.feedback_no_sales_delay !== undefined) await db.setSetting('feedback_no_sales_delay', String(data.feedback_no_sales_delay));
    if (data.feedback_followup !== undefined) await db.setSetting('feedback_followup', data.feedback_followup);
    if (data.feedback_special_offer !== undefined) await db.setSetting('feedback_special_offer', data.feedback_special_offer);
    if (data.feedback_special_offer_enabled !== undefined) await db.setSetting('feedback_special_offer_enabled', String(data.feedback_special_offer_enabled));

    // Inactivity reminder settings
    if (data.inactivity_reminder_enabled !== undefined) await db.setSetting('inactivity_reminder_enabled', String(data.inactivity_reminder_enabled));
    if (data.inactivity_reminder_1 !== undefined) await db.setSetting('inactivity_reminder_1', data.inactivity_reminder_1);
    if (data.inactivity_reminder_2 !== undefined) await db.setSetting('inactivity_reminder_2', data.inactivity_reminder_2);

    // Referral system settings
    if (data.referral_enabled !== undefined) await db.setSetting('referral_enabled', String(data.referral_enabled));
    if (data.referral_required_count !== undefined) await db.setSetting('referral_required_count', String(data.referral_required_count));
    if (data.referral_discount_percent !== undefined) await db.setSetting('referral_discount_percent', String(data.referral_discount_percent));

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ NEW: Enhanced Broadcast API ============
app.post('/api/broadcast/advanced', authMiddleware, async (req, res) => {
  try {
    const { target, type, text, media_id, button, user_ids, lesson_from, lesson_to } = req.body;
    const { getAllActiveUsers } = await import('./database.js');
    const { Markup } = await import('telegraf');

    let users = [];
    const allUsers = await getAllActiveUsers();

    if (target === 'specific' && user_ids && user_ids.length > 0) {
      // Send to specific users
      users = allUsers.filter(u => user_ids.includes(u.telegram_id));
    } else if (target === 'paid') {
      users = allUsers.filter(u => u.is_paid);
    } else if (target === 'free') {
      users = allUsers.filter(u => !u.is_paid);
    } else if (target === 'active') {
      users = allUsers.filter(u => u.current_lesson > 0 && !u.is_paid);
    } else if (target === 'lesson') {
      const from = lesson_from || 0;
      const to = lesson_to || 999;
      users = allUsers.filter(u => u.current_lesson >= from && u.current_lesson <= to);
    } else {
      users = allUsers;
    }

    let sent = 0;
    let failed = 0;

    // Build inline keyboard if button provided
    let keyboard = null;
    if (button && button.text && button.url) {
      keyboard = Markup.inlineKeyboard([[Markup.button.url(button.text, button.url)]]);
    }

    for (const user of users) {
      try {
        const personalizedText = (text || '')
          .replace(/\{\{fio\}\}/gi, user.full_name || "do'st")
          .replace(/\{\{ism\}\}/gi, (user.full_name || "do'st").split(' ')[0])
          .replace(/\{\{telefon\}\}/gi, user.phone || '')
          .replace(/\{\{dars\}\}/gi, String(user.current_lesson || 0));

        const opts = { parse_mode: 'HTML', ...(keyboard || {}) };

        if (type === 'video' && media_id) {
          await bot.telegram.sendVideo(user.telegram_id, media_id, { caption: personalizedText, ...opts });
        } else if (type === 'photo' && media_id) {
          await bot.telegram.sendPhoto(user.telegram_id, media_id, { caption: personalizedText, ...opts });
        } else if (type === 'video_note' && media_id) {
          await bot.telegram.sendVideoNote(user.telegram_id, media_id);
          if (personalizedText) await bot.telegram.sendMessage(user.telegram_id, personalizedText, opts);
        } else if (type === 'audio' && media_id) {
          await bot.telegram.sendAudio(user.telegram_id, media_id, { caption: personalizedText, ...opts });
        } else if (type === 'document' && media_id) {
          await bot.telegram.sendDocument(user.telegram_id, media_id, { caption: personalizedText, ...opts });
        } else {
          await bot.telegram.sendMessage(user.telegram_id, personalizedText, opts);
        }
        sent++;

        // Rate limiting
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        console.error('Broadcast error for user', user.telegram_id, ':', e.message);
        failed++;
      }
    }

    res.json({ success: true, sent, failed, total: users.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test broadcast (send to admin)
app.post('/api/broadcast/test', authMiddleware, async (req, res) => {
  try {
    const { type, text, media_id, button } = req.body;
    const { Markup } = await import('telegraf');

    const adminId = process.env.ADMIN_IDS.split(',')[0].trim();

    const personalizedText = (text || '')
      .replace(/\{\{fio\}\}/gi, 'Test Foydalanuvchi')
      .replace(/\{\{ism\}\}/gi, 'Test')
      .replace(/\{\{telefon\}\}/gi, '+998901234567')
      .replace(/\{\{dars\}\}/gi, '3');

    let keyboard = null;
    if (button && button.text && button.url) {
      keyboard = Markup.inlineKeyboard([[Markup.button.url(button.text, button.url)]]);
    }

    const opts = { parse_mode: 'HTML', ...(keyboard || {}) };

    if (type === 'video' && media_id) {
      await bot.telegram.sendVideo(adminId, media_id, { caption: personalizedText, ...opts });
    } else if (type === 'photo' && media_id) {
      await bot.telegram.sendPhoto(adminId, media_id, { caption: personalizedText, ...opts });
    } else if (type === 'voice' && media_id) {
      await bot.telegram.sendVoice(adminId, media_id, { caption: personalizedText, ...opts });
    } else {
      await bot.telegram.sendMessage(adminId, personalizedText, opts);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;

async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');
    
    // Auto-migrate to multi-funnel on first start
    try {
      const db = await import('./database.js');
      await db.migrateToMultiFunnel();
    } catch (e) {
      console.log('Migration note:', e.message);
    }

    startScheduler();

    app.listen(port, async () => {
      console.log('Server listening on port ' + port);

      if (process.env.BASE_URL) {
        try {
          const webhookUrl = process.env.BASE_URL + '/telegram/webhook';
          await bot.telegram.setWebhook(webhookUrl);
          console.log('Webhook set: ' + webhookUrl);
        } catch (e) {
          console.error('setWebhook error', e);
        }
      }

      await setupAdminWebAppMenu();
    });
  } catch (e) {
    console.error('Startup error:', e);
    process.exit(1);
  }
}

start();
