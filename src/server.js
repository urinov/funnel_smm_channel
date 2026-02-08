import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';

import { initDatabase } from './database.js';
import { bot, sendBroadcast } from './bot.js';
import paymeRouter from './payments/payme.js';
import clickRouter from './payments/click.js';
import { startScheduler } from './scheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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

const authMiddleware = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');

  if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  next();
};

const upload = multer({ dest: '/tmp/uploads/' });

app.get('/health', (req, res) => res.send('ok'));
app.get('/', (req, res) => res.send('Telegram Bot is running'));

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
    const { reminder_5d, reminder_3d, reminder_1d, reminder_expired } = req.body;
    
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
    if (data.price_1m !== undefined) await db.updateBotMessage('price_1m', String(data.price_1m));
    if (data.price_3m !== undefined) await db.updateBotMessage('price_3m', String(data.price_3m));
    if (data.price_6m !== undefined) await db.updateBotMessage('price_6m', String(data.price_6m));
    if (data.price_12m !== undefined) await db.updateBotMessage('price_12m', String(data.price_12m));

    // Progrev settings
    if (data.pitch_after_lesson !== undefined) await db.updateBotMessage('pitch_after_lesson', String(data.pitch_after_lesson));
    if (data.pitch_delay_minutes !== undefined) await db.updateBotMessage('pitch_delay_minutes', String(data.pitch_delay_minutes));
    if (data.pitch_text !== undefined) await db.updateBotMessage('pitch_text', data.pitch_text);
    if (data.pitch_video_file_id !== undefined) await db.updateBotMessage('pitch_video_file_id', data.pitch_video_file_id || '');
    if (data.pitch_image_file_id !== undefined) await db.updateBotMessage('pitch_image_file_id', data.pitch_image_file_id || '');

    if (data.sales_delay_minutes !== undefined) await db.updateBotMessage('sales_delay_minutes', String(data.sales_delay_minutes));
    if (data.sales_pitch !== undefined) await db.updateBotMessage('sales_pitch', data.sales_pitch);

    if (data.soft_attack_disabled !== undefined) await db.updateBotMessage('soft_attack_disabled', String(data.soft_attack_disabled));
    if (data.soft_attack_delay_minutes !== undefined) await db.updateBotMessage('soft_attack_delay_minutes', String(data.soft_attack_delay_minutes));
    if (data.soft_attack_text !== undefined) await db.updateBotMessage('soft_attack_text', data.soft_attack_text);

    if (data.congrats_text !== undefined) await db.updateBotMessage('congrats_text', data.congrats_text);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ NEW: Enhanced Broadcast API ============
app.post('/api/broadcast/advanced', authMiddleware, async (req, res) => {
  try {
    const { target, type, text, media_id, button, user_ids } = req.body;
    const { getAllActiveUsers } = await import('./database.js');
    const { Markup } = await import('telegraf');

    let users = [];

    if (target === 'specific' && user_ids && user_ids.length > 0) {
      // Send to specific users
      const allUsers = await getAllActiveUsers();
      users = allUsers.filter(u => user_ids.includes(u.telegram_id));
    } else if (target === 'paid') {
      const allUsers = await getAllActiveUsers();
      users = allUsers.filter(u => u.is_paid);
    } else if (target === 'free') {
      const allUsers = await getAllActiveUsers();
      users = allUsers.filter(u => !u.is_paid);
    } else {
      users = await getAllActiveUsers();
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
    });
  } catch (e) {
    console.error('Startup error:', e);
    process.exit(1);
  }
}

start();
