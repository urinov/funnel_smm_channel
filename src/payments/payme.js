// src/payments/payme.js - Payme Merchant API (based on working code)
import { Router } from 'express';
import * as db from '../database.js';
import { bot } from '../bot.js';

const router = Router();

const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID;
const PAYME_KEY = process.env.PAYME_KEY;
const PAYME_TEST_KEY = process.env.PAYME_TEST_KEY;

// ===================== HELPERS =====================
const ok = (id, result) => ({ jsonrpc: '2.0', result, id });
const err = (id, code, msg) => ({
  jsonrpc: '2.0',
  error: { code, message: { uz: msg, ru: msg, en: msg } },
  id
});

function isBasicAuthValid(req) {
  const hdr = req.get('Authorization');
  if (!hdr || !hdr.startsWith('Basic ')) return false;
  const decoded = Buffer.from(hdr.slice(6), 'base64').toString('utf8');
  const [user, key] = decoded.split(':');
  return user === 'Paycom' && (key === PAYME_KEY || key === PAYME_TEST_KEY);
}

// ===================== CHECKOUT URL =====================
router.get('/api/checkout-url', async (req, res) => {
  try {
    const { order_id, amount, redirect } = req.query;
    
    if (!order_id || !amount) {
      return res.status(400).json({ error: 'order_id va amount (tiyin) shart' });
    }

    const amountInTiyin = Number(amount);
    
    // Payme checkout URL format
    const params = `m=${PAYME_MERCHANT_ID};ac.order_id=${order_id};a=${amountInTiyin}`;
    const encodedParams = Buffer.from(params).toString('base64');
    const checkoutUrl = `https://checkout.paycom.uz/${encodedParams}`;

    console.log('Payme checkout URL:', { order_id, amountInTiyin, url: checkoutUrl });

    if (redirect === '1') {
      return res.redirect(checkoutUrl);
    }

    res.json({ url: checkoutUrl });
  } catch (e) {
    console.error('Payme checkout error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================== JSON-RPC ENDPOINT =====================
router.post('/', handlePaymeRequest);
router.post('/api', handlePaymeRequest);

async function handlePaymeRequest(req, res) {
  console.log('Payme raw request:', JSON.stringify(req.body));
  
  // Auth check
  if (!isBasicAuthValid(req)) {
    console.log('Payme auth failed, headers:', req.headers.authorization ? 'present' : 'missing');
    return res.json(err(req.body?.id, -32504, 'Unauthorized'));
  }

  const { method, params, id } = req.body || {};
  console.log('Payme request:', method, JSON.stringify(params));

  try {
    // ==================== CheckPerformTransaction ====================
    if (method === 'CheckPerformTransaction') {
      const orderId = String(params?.account?.order_id || '');
      console.log('CheckPerformTransaction orderId:', orderId);
      
      const payment = await db.getPaymentByOrderId(orderId);
      console.log('Payment found:', payment ? { order_id: payment.order_id, amount: payment.amount, state: payment.state } : 'null');
      
      if (!payment) {
        return res.json(err(id, -31050, 'Order not found'));
      }
      
      console.log('Amount check:', { db: payment.amount, dbType: typeof payment.amount, payme: params.amount, paymeType: typeof params.amount });
      
      if (Number(payment.amount) !== Number(params.amount)) {
        console.log('Amount mismatch!');
        return res.json(err(id, -31001, 'Amount mismatch'));
      }
      if (payment.state === 'performed') {
        return res.json(err(id, -31008, 'Already paid'));
      }
      
      // Mark as payme payment
      if (!payment.payment_method) {
        await db.updatePayment(orderId, { payment_method: 'payme' });
      }
      
      return res.json(ok(id, { allow: true }));
    }

    // ==================== CreateTransaction ====================
    if (method === 'CreateTransaction') {
      const orderId = String(params?.account?.order_id || '');
      const payment = await db.getPaymentByOrderId(orderId);
      
      if (!payment) {
        return res.json(err(id, -31050, 'Order not found'));
      }
      if (Number(payment.amount) !== Number(params.amount)) {
        console.log('CreateTransaction amount mismatch:', { db: payment.amount, payme: params.amount });
        return res.json(err(id, -31001, 'Amount mismatch'));
      }

      // Idempotent check
      if (payment.transaction_id === params.id) {
        return res.json(ok(id, {
          transaction: payment.transaction_id,
          state: 1,
          create_time: payment.create_time || params.time
        }));
      }

      // Already has different transaction
      if (payment.state && payment.state !== 'new' && payment.state !== 'pending') {
        return res.json(err(id, -31050, 'Order already has transaction'));
      }

      // Create transaction
      await db.updatePayment(orderId, {
        transaction_id: params.id,
        state: 'created',
        create_time: params.time,
        payment_method: 'payme'
      });

      return res.json(ok(id, {
        transaction: params.id,
        state: 1,
        create_time: params.time
      }));
    }

    // ==================== PerformTransaction ====================
    if (method === 'PerformTransaction') {
      const txId = params.id;
      const payment = await db.getPaymentByTransactionId(txId, 'payme');
      
      if (!payment) {
        return res.json(err(id, -31003, 'Transaction not found'));
      }

      // Already performed - idempotent
      if (payment.state === 'performed') {
        return res.json(ok(id, {
          transaction: txId,
          state: 2,
          perform_time: payment.perform_time || Date.now()
        }));
      }

      const performTime = Date.now();

      // Complete payment
      await db.updatePayment(payment.order_id, {
        state: 'performed',
        perform_time: performTime
      });

      // Get plan details
      const planId = payment.plan_id || '1month';
      const plan = await db.getSubscriptionPlan(planId);
      const durationDays = plan ? plan.duration_days : 30;

      // Check if this is an extension
      const isExtension = payment.order_id.startsWith('EXT');
      let finalEndDate = null;
      
      if (isExtension) {
        // Extend existing subscription
        const newEndDate = await db.extendSubscription(payment.telegram_id, planId, durationDays);
        if (newEndDate) {
          finalEndDate = newEndDate;
          console.log('Subscription extended to:', newEndDate);
        } else {
          // Fallback: if active subscription does not exist, create a new one
          const createdSub = await db.createSubscription(payment.telegram_id, planId, payment.amount, 'payme', payment.order_id);
          finalEndDate = createdSub?.end_date ? new Date(createdSub.end_date) : null;
          console.log('No active subscription to extend, created new subscription for:', payment.telegram_id);
        }
      } else {
        // Create new subscription
        const createdSub = await db.createSubscription(payment.telegram_id, planId, payment.amount, 'payme', payment.order_id);
        finalEndDate = createdSub?.end_date ? new Date(createdSub.end_date) : null;
      }

      // Activate user
      await db.updateUser(payment.telegram_id, { is_paid: true, funnel_step: 11 });
      await db.cancelPendingMessages(payment.telegram_id, 'soft_attack');

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

      console.log('Payme perform success:', payment.order_id);

      return res.json(ok(id, {
        transaction: txId,
        state: 2,
        perform_time: performTime
      }));
    }

    // ==================== CancelTransaction ====================
    if (method === 'CancelTransaction') {
      const txId = params.id;
      const payment = await db.getPaymentByTransactionId(txId, 'payme');
      
      if (!payment) {
        return res.json(err(id, -31003, 'Transaction not found'));
      }

      const cancelTime = Date.now();
      const wasPerformed = payment.state === 'performed';

      await db.updatePayment(payment.order_id, {
        state: 'cancelled',
        cancel_time: cancelTime
      });

      if (wasPerformed) {
        await db.updateUser(payment.telegram_id, { is_paid: false });
      }

      return res.json(ok(id, {
        transaction: txId,
        state: wasPerformed ? -2 : -1,
        cancel_time: cancelTime
      }));
    }

    // ==================== CheckTransaction ====================
    if (method === 'CheckTransaction') {
      const txId = params.id;
      const payment = await db.getPaymentByTransactionId(txId, 'payme');
      
      if (!payment) {
        return res.json(err(id, -31003, 'Transaction not found'));
      }

      let state = 1;
      if (payment.state === 'performed') state = 2;
      else if (payment.state === 'cancelled') state = payment.perform_time ? -2 : -1;

      return res.json(ok(id, {
        transaction: txId,
        state,
        create_time: payment.create_time || 0,
        perform_time: payment.perform_time || 0,
        cancel_time: payment.cancel_time || 0,
        reason: null
      }));
    }

    // ==================== GetStatement ====================
    if (method === 'GetStatement') {
      // Return empty for now
      return res.json(ok(id, { transactions: [] }));
    }

    return res.json(err(id, -32601, 'Method not found'));

  } catch (e) {
    console.error('Payme error:', e);
    return res.json(err(id, -32603, 'Server error'));
  }
}

export default router;
