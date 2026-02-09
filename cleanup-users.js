import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();

  try {
    // 1. Barcha userlarni ko'rsatamiz
    console.log('\n📊 MAVJUD FOYDALANUVCHILAR:\n');
    console.log('=' .repeat(80));

    const { rows: users } = await client.query(`
      SELECT
        telegram_id,
        full_name,
        username,
        phone,
        is_paid,
        created_at,
        current_lesson
      FROM users
      ORDER BY created_at DESC
    `);

    console.log(`Jami: ${users.length} ta foydalanuvchi\n`);

    if (users.length === 0) {
      console.log('Hech qanday foydalanuvchi topilmadi.');
      return;
    }

    // Jadval ko'rinishida chiqaramiz
    console.log('ID'.padEnd(15) + 'ISM'.padEnd(25) + 'USERNAME'.padEnd(20) + 'TELEFON'.padEnd(15) + 'DARS'.padEnd(6) + 'TO\'LOV'.padEnd(8) + 'SANA');
    console.log('-'.repeat(100));

    for (const user of users) {
      const id = String(user.telegram_id).padEnd(15);
      const name = (user.full_name || '-').slice(0, 23).padEnd(25);
      const username = (user.username || '-').slice(0, 18).padEnd(20);
      const phone = (user.phone || '-').padEnd(15);
      const lesson = String(user.current_lesson || 0).padEnd(6);
      const paid = (user.is_paid ? '✅' : '❌').padEnd(8);
      const date = user.created_at ? new Date(user.created_at).toLocaleDateString('uz-UZ') : '-';

      console.log(id + name + username + phone + lesson + paid + date);
    }

    console.log('\n' + '='.repeat(80));

    // Statistika
    const paidCount = users.filter(u => u.is_paid).length;
    console.log(`\n📈 Statistika:`);
    console.log(`   - Jami: ${users.length} ta`);
    console.log(`   - To'lov qilgan: ${paidCount} ta`);
    console.log(`   - To'lov qilmagan: ${users.length - paidCount} ta`);

    // O'chirish so'rovi
    console.log('\n⚠️  BARCHA USERLARNI O\'CHIRISH UCHUN:');
    console.log('   node cleanup-users.js --delete-all\n');

    // Agar --delete-all flag berilgan bo'lsa
    if (process.argv.includes('--delete-all')) {
      console.log('\n🗑️  BARCHA USERLAR O\'CHIRILMOQDA...\n');

      // Cascade delete - avval bog'liq jadvallarni tozalaymiz
      await client.query('DELETE FROM custdev_answers');
      console.log('   ✓ CustDev javoblari o\'chirildi');

      await client.query('DELETE FROM scheduled_messages');
      console.log('   ✓ Rejalashtirilgan xabarlar o\'chirildi');

      await client.query('DELETE FROM invite_links');
      console.log('   ✓ Taklif havolalari o\'chirildi');

      await client.query('DELETE FROM user_feedback');
      console.log('   ✓ Foydalanuvchi fikrlari o\'chirildi');

      await client.query('DELETE FROM user_funnels');
      console.log('   ✓ User funnels o\'chirildi');

      await client.query('DELETE FROM subscriptions');
      console.log('   ✓ Obunalar o\'chirildi');

      await client.query('DELETE FROM payments');
      console.log('   ✓ To\'lovlar o\'chirildi');

      await client.query('DELETE FROM users');
      console.log('   ✓ Foydalanuvchilar o\'chirildi');

      console.log('\n✅ BARCHA MA\'LUMOTLAR TOZALANDI!\n');
      console.log('Endi haqiqiy foydalanuvchilar bilan ishlashingiz mumkin.\n');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Xatolik:', err.message);
  process.exit(1);
});
