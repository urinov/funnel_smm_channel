// src/payments/click.js - Click Payment (based on working code)
import { Router } from 'express';
import crypto from 'crypto';
import * as db from '../database.js';
import { bot } from '../bot.js';
import { logAudit, AuditEvents } from '../utils/security.js';

const router = Router();

const CLICK_MERCHANT_ID = process.env.CLICK_MERCHANT_ID;
const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID;
const CLICK_SECRET_KEY = process.env.CLICK_SECRET_KEY;
const BASE_URL = process.env.BASE_URL;

// ===================== SIGNATURE HELPERS =====================
function buildPrepareSign(data) {
  const str = '' + data.click_trans_id + data.service_id + data.secret_key + 
              data.merchant_trans_id + data.amount + data.action + data.sign_time;
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

function buildCompleteSign(data) {
  const str = '' + data.click_trans_id + data.service_id + data.secret_key + 
              data.merchant_trans_id + data.merchant_prepare_id + data.amount + 
              data.action + data.sign_time;
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

// ===================== CHECKOUT URL =====================
router.get('/api/checkout-url', async (req, res) => {
  try {
    const { order_id, amount, chat_id, redirect } = req.query;
    
    if (!order_id || !amount) {
      return res.status(400).json({ error: 'order_id va amount (tiyin) shart' });
    }

    // Click expects amount in SUM (not tiyin)
    const amountInTiyin = Number(amount);
    const amountInSum = Math.round(amountInTiyin / 100);
    
    const u = new URL('https://my.click.uz/services/pay');
    u.searchParams.set('service_id', CLICK_SERVICE_ID);
    u.searchParams.set('merchant_id', CLICK_MERCHANT_ID);
    u.searchParams.set('transaction_param', order_id);
    u.searchParams.set('amount', amountInSum.toString());
    
    if (process.env.CLICK_RETURN_URL) {
      u.searchParams.set('return_url', process.env.CLICK_RETURN_URL);
    }

    const checkoutUrl = u.toString();
    console.log('Click checkout URL:', { order_id, amountInTiyin, amountInSum, url: checkoutUrl });

    if (redirect === '1') {
      return res.redirect(checkoutUrl);
    }

    res.json({ url: checkoutUrl });
  } catch (e) {
    console.error('Click checkout error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================== CALLBACK (prepare/complete) =====================
// Support multiple endpoints for Click
router.post('/callback', handleClickCallback);
router.post('/api/prepare', handleClickCallback);
router.post('/api/complete', handleClickCallback);

async function handleClickCallback(req, res) {
  const p = { ...req.body };
  console.log('Click callback received:', JSON.stringify(p));
  
  const required = ['click_trans_id', 'service_id', 'merchant_trans_id', 'amount', 'action', 'sign_time', 'sign_string'];
  for (const k of required) {
    if (typeof p[k] === 'undefined') {
      console.log('Missing field:', k);
      return res.json({ error: -1, error_note: `Missing field: ${k}` });
    }
  }

  const orderId = String(p.merchant_trans_id);
  const action = Number(p.action); // 0=prepare, 1=complete
  const amtStr = String(p.amount);

  // Get payment from database
  const payment = await db.getPaymentByOrderId(orderId);
  if (!payment) {
    console.log('Order not found:', orderId);
    return res.json({ error: -5, error_note: 'Order not found' });
  }

  // ===================== PREPARE (action = 0) =====================
  if (action === 0) {
    const signData = {
      click_trans_id: p.click_trans_id,
      service_id: p.service_id,
      secret_key: CLICK_SECRET_KEY,
      merchant_trans_id: p.merchant_trans_id,
      amount: amtStr,
      action: p.action,
      sign_time: p.sign_time
    };
    console.log('Click prepare sign data:', JSON.stringify({ ...signData, secret_key: '***' }));
    
    const expected = buildPrepareSign(signData);
    console.log('Click sign comparison:', { expected, received: p.sign_string, match: expected === String(p.sign_string).toLowerCase() });

    if (expected !== String(p.sign_string).toLowerCase()) {
      console.log('Click prepare sign mismatch!');
      return res.json({ error: -1, error_note: 'Invalid sign (prepare)' });
    }

    // Check amount (Click sends in sum, we store in tiyin)
    const expectedAmount = Math.round(payment.amount / 100);
    console.log('Click amount check:', { dbTiyin: payment.amount, expectedSum: expectedAmount, receivedSum: amtStr });
    
    if (Math.round(Number(amtStr)) !== expectedAmount) {
      console.log('Click amount mismatch!');
      return res.json({ error: -2, error_note: 'Incorrect amount' });
    }

    if (payment.state === 'performed') {
      return res.json({ error: -4, error_note: 'Already paid' });
    }

    // Update payment
    await db.updatePayment(orderId, {
      transaction_id: String(p.click_trans_id),
      state: 'created',
      payment_method: 'click'
    });

    console.log('Click prepare success:', orderId);

    return res.json({
      click_trans_id: p.click_trans_id,
      merchant_trans_id: orderId,
      merchant_prepare_id: orderId,
      error: 0,
      error_note: 'Success'
    });
  }

  // ===================== COMPLETE (action = 1) =====================
  if (action === 1) {
    if (typeof p.merchant_prepare_id === 'undefined') {
      return res.json({ error: -1, error_note: 'Missing field: merchant_prepare_id' });
    }

    const expected = buildCompleteSign({
      click_trans_id: p.click_trans_id,
      service_id: p.service_id,
      secret_key: CLICK_SECRET_KEY,
      merchant_trans_id: p.merchant_trans_id,
      merchant_prepare_id: p.merchant_prepare_id,
      amount: amtStr,
      action: p.action,
      sign_time: p.sign_time
    });

    if (expected !== String(p.sign_string).toLowerCase()) {
      console.log('Click complete sign mismatch:', expected, p.sign_string);
      return res.json({ error: -1, error_note: 'Invalid sign (complete)' });
    }

    // Check for Click error
    if (Number(p.error) < 0) {
      await db.updatePayment(orderId, { state: 'cancelled' });
      return res.json({
        click_trans_id: p.click_trans_id,
        merchant_trans_id: orderId,
        merchant_confirm_id: orderId,
        error: -9,
        error_note: 'Payment cancelled'
      });
    }

    // Already performed - idempotent
    if (payment.state === 'performed') {
      return res.json({
        click_trans_id: p.click_trans_id,
        merchant_trans_id: orderId,
        merchant_confirm_id: orderId,
        error: 0,
        error_note: 'Success'
      });
    }

    // Complete payment
    await db.updatePayment(orderId, {
      state: 'performed',
      perform_time: Date.now()
    });

    // Get plan details
    const planId = payment.plan_id || '1month';
    const plan = await db.getSubscriptionPlan(planId);
    const durationDays = plan ? plan.duration_days : 30;

    // Check if this is an extension
    const isExtension = orderId.startsWith('EXT');
    let finalEndDate = null;
    
    if (isExtension) {
      // Extend existing subscription
      const newEndDate = await db.extendSubscription(payment.telegram_id, planId, durationDays);
      if (newEndDate) {
        finalEndDate = newEndDate;
        console.log('Subscription extended to:', newEndDate);
      } else {
        // Fallback: if active subscription does not exist, create a new one
        const createdSub = await db.createSubscription(payment.telegram_id, planId, payment.amount, 'click', orderId);
        finalEndDate = createdSub?.end_date ? new Date(createdSub.end_date) : null;
        console.log('No active subscription to extend, created new subscription for:', payment.telegram_id);
      }
    } else {
      // Create new subscription
      const createdSub = await db.createSubscription(payment.telegram_id, planId, payment.amount, 'click', orderId);
      finalEndDate = createdSub?.end_date ? new Date(createdSub.end_date) : null;
    }

    // Activate user
    await db.updateUser(payment.telegram_id, { is_paid: true, funnel_step: 11 });
    await db.cancelPendingMessages(payment.telegram_id, 'soft_attack');

    // Mark referral discount as used if this was a referral payment (atomic to prevent race condition)
    if (orderId.startsWith('REF')) {
      const claimResult = await db.claimReferralDiscount(payment.telegram_id);
      if (claimResult.success) {
        console.log('Referral discount claimed atomically for:', payment.telegram_id);
      } else {
        // Discount was already used (possibly by concurrent payment) - log but continue
        console.log('Referral discount claim result for', payment.telegram_id, ':', claimResult.error);
      }
    }

    // Mark promo code as used if this was a promo payment
    if (orderId.startsWith('PRM') && payment.metadata?.promo_code) {
      try {
        const promoInfo = payment.metadata.promo_code;
        await db.usePromoCode(promoInfo.promo_id, payment.telegram_id, payment.id, payment.amount);
        console.log('Promo code used:', promoInfo.code, 'for user:', payment.telegram_id);
      } catch (e) {
        console.error('Error marking promo code as used:', e.message);
      }
    }

    // Log payment completion
    logAudit(AuditEvents.paymentCompleted(payment.telegram_id, orderId, payment.amount, 'click'));

    // Create one-time invite link
    const { createInviteLink } = await import('../bot.js');
    const inviteLink = await createInviteLink(payment.telegram_id, 1); // 1 day validity

    // Notify user with channel access
    try {
      const planName = plan ? plan.name : '1 oylik';
      const endDateForMessage = finalEndDate || (await db.getActiveSubscription(payment.telegram_id))?.end_date;
      const endDateStr = endDateForMessage
        ? new Date(endDateForMessage).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'aniqlanmadi';
      
      let successMessage = '🎉 <b>To\'lov muvaffaqiyatli qabul qilindi!</b>\n\n' +
        (isExtension ? '✅ Premium obuna muddati uzaytirildi.\n\n' : '✅ Premium obuna faollashtirildi.\n\n') +
        `📦 Obuna: <b>${planName}</b>\n` +
        `📅 Amal qilish muddati: <b>${endDateStr}</b> gacha\n\n`;
      
      if (inviteLink) {
        successMessage += `📢 <b>Premium kanalga kirish:</b>\n${inviteLink}\n\n`;
        successMessage += `⚠️ <i>Diqqat: Bu havola faqat 1 marta va 1 soat davomida ishlaydi!</i>\n\n`;
      }
      
      successMessage += 'Kursga xush kelibsiz!';

      await bot.telegram.sendMessage(payment.telegram_id, successMessage, { parse_mode: 'HTML' });
    } catch (e) {
      console.error('Failed to notify user:', e.message);
    }

    console.log('Click complete success:', orderId);

    return res.json({
      click_trans_id: p.click_trans_id,
      merchant_trans_id: orderId,
      merchant_confirm_id: orderId,
      error: 0,
      error_note: 'Success'
    });
  }

  return res.json({ error: -3, error_note: 'Unknown action' });
}

// Success page
router.get('/success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>To'lov muvaffaqiyatli!</title>
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea, #764ba2); }
        .card { background: white; padding: 50px; border-radius: 24px; text-align: center; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        h1 { color: #10b981; }
        a { display: inline-block; background: #8b5cf6; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🎉 Muvaffaqiyatli!</h1>
        <p>To'lov qabul qilindi. Premium obuna faollashtirildi.</p>
        <a href="https://t.me/${process.env.BOT_USERNAME || 'bot'}">📱 Botga qaytish</a>
      </div>
    </body>
    </html>
  `);
});

export default router;
