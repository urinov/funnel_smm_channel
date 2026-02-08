import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        full_name VARCHAR(255),
        phone VARCHAR(50),
        age_group VARCHAR(50),
        occupation VARCHAR(100),
        income_level VARCHAR(50),
        main_problem TEXT,
        previous_courses VARCHAR(100),
        budget_range VARCHAR(50),
        goal TEXT,
        funnel_step INTEGER DEFAULT 0,
        current_lesson INTEGER DEFAULT 0,
        custdev_step INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        last_activity TIMESTAMP DEFAULT NOW(),
        is_blocked BOOLEAN DEFAULT FALSE,
        is_paid BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        telegram_id BIGINT NOT NULL,
        plan_id VARCHAR(20) DEFAULT '1month',
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        amount INTEGER NOT NULL,
        payment_method VARCHAR(50),
        payment_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        is_active BOOLEAN DEFAULT TRUE,
        reminder_sent_5d BOOLEAN DEFAULT FALSE,
        reminder_sent_3d BOOLEAN DEFAULT FALSE,
        reminder_sent_1d BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        duration_days INTEGER NOT NULL,
        price INTEGER NOT NULL,
        discount_percent INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        telegram_id BIGINT NOT NULL,
        amount INTEGER NOT NULL,
        state VARCHAR(50) DEFAULT 'new',
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        create_time BIGINT,
        perform_time BIGINT,
        cancel_time BIGINT,
        reason TEXT,
        sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        lesson_number INTEGER UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        video_file_id VARCHAR(255),
        image_file_id VARCHAR(255),
        audio_file_id VARCHAR(255),
        delay_hours INTEGER DEFAULT 24,
        show_watched_button BOOLEAN DEFAULT TRUE,
        watched_button_text VARCHAR(255) DEFAULT 'Videoni korib boldim',
        watched_message TEXT DEFAULT 'Videoni korib bolganingizdan keyin tugmani bosing:',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS custdev_questions (
        id SERIAL PRIMARY KEY,
        step INTEGER NOT NULL,
        after_lesson INTEGER DEFAULT 1,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) DEFAULT 'buttons',
        options JSONB,
        field_name VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS custdev_answers (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        question_id INTEGER REFERENCES custdev_questions(id),
        answer TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pitch_media (
        id SERIAL PRIMARY KEY,
        media_type VARCHAR(50) DEFAULT 'text',
        video_file_id VARCHAR(255),
        image_file_id VARCHAR(255),
        audio_file_id VARCHAR(255),
        text TEXT,
        delay_hours INTEGER DEFAULT 2,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_messages (
        key VARCHAR(100) PRIMARY KEY,
        text TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        message_type VARCHAR(50) NOT NULL,
        scheduled_at TIMESTAMP NOT NULL,
        data JSONB,
        sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id SERIAL PRIMARY KEY,
        admin_id BIGINT,
        message_type VARCHAR(50),
        content TEXT,
        file_id VARCHAR(255),
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS media_library (
        id SERIAL PRIMARY KEY,
        file_id VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255),
        caption TEXT,
        uploaded_by BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============ INVITE LINKS TRACKING ============
    await client.query(`
      CREATE TABLE IF NOT EXISTS invite_links (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        invite_link VARCHAR(500) NOT NULL,
        subscription_id INTEGER,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        used_at TIMESTAMP
      )
    `);

    // ============ MULTI-FUNNEL TABLES ============
    
    // Varonkalar jadvali
    await client.query(`
      CREATE TABLE IF NOT EXISTS funnels (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        require_subscription_before_lesson INTEGER DEFAULT 0,
        free_channel_id VARCHAR(100),
        free_channel_link VARCHAR(255),
        premium_channel_id VARCHAR(100),
        premium_channel_link VARCHAR(255),
        pitch_after_lesson INTEGER DEFAULT 4,
        pitch_text TEXT,
        pitch_video_file_id VARCHAR(255),
        pitch_image_file_id VARCHAR(255),
        pitch_delay_hours INTEGER DEFAULT 2,
        sales_pitch TEXT,
        sales_delay_hours INTEGER DEFAULT 1,
        soft_attack_text TEXT,
        soft_attack_delay_hours INTEGER DEFAULT 24,
        soft_attack_disabled BOOLEAN DEFAULT FALSE,
        congrats_text TEXT DEFAULT '🎉 Tabriklayman! Barcha bepul darslarni tugatdingiz!',
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Varonka darslari
    await client.query(`
      CREATE TABLE IF NOT EXISTS funnel_lessons (
        id SERIAL PRIMARY KEY,
        funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE,
        lesson_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        video_file_id VARCHAR(255),
        image_file_id VARCHAR(255),
        audio_file_id VARCHAR(255),
        delay_hours INTEGER DEFAULT 24,
        show_watched_button BOOLEAN DEFAULT TRUE,
        watched_button_text VARCHAR(255) DEFAULT 'Videoni ko''rib bo''ldim ✅',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(funnel_id, lesson_number)
      )
    `);

    // Varonka CustDev savollari
    await client.query(`
      CREATE TABLE IF NOT EXISTS funnel_custdev (
        id SERIAL PRIMARY KEY,
        funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE,
        step INTEGER NOT NULL,
        after_lesson INTEGER DEFAULT 1,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) DEFAULT 'buttons',
        options JSONB,
        field_name VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Foydalanuvchi qaysi varonkada
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_funnels (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE,
        current_lesson INTEGER DEFAULT 0,
        custdev_step INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        paid_at TIMESTAMP,
        UNIQUE(telegram_id, funnel_id)
      )
    `);

    // Varonka to'lov rejalari
    await client.query(`
      CREATE TABLE IF NOT EXISTS funnel_plans (
        id SERIAL PRIMARY KEY,
        funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE,
        plan_id VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        duration_days INTEGER NOT NULL,
        price INTEGER NOT NULL,
        discount_percent INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        UNIQUE(funnel_id, plan_id)
      )
    `);

    // ============ SETTINGS TABLE ============
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============ FEEDBACK TABLE ============
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        feedback_type VARCHAR(50) NOT NULL,
        feedback_text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============ MIGRATIONS - Add missing columns ============
    console.log('Running migrations...');
    
    // Payments table migrations
    const paymentMigrations = [
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255)`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS create_time BIGINT`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS perform_time BIGINT`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS cancel_time BIGINT`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS reason TEXT`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS sent BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_id VARCHAR(20) DEFAULT '1month'`
    ];
    
    for (const sql of paymentMigrations) {
      try {
        await client.query(sql);
      } catch (e) {
        // Ignore if column already exists
      }
    }
    
    // Subscriptions table migrations
    const subscriptionMigrations = [
      `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id VARCHAR(20) DEFAULT '1month'`,
      `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS reminder_sent_5d BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS reminder_sent_3d BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS reminder_sent_1d BOOLEAN DEFAULT FALSE`
    ];
    
    for (const sql of subscriptionMigrations) {
      try {
        await client.query(sql);
      } catch (e) {
        // Ignore if column already exists
      }
    }
    
    // User table migrations
    const userMigrations = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS waiting_feedback BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS waiting_subscription BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscribed_free_channel BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_lesson INTEGER`
    ];
    
    for (const sql of userMigrations) {
      try {
        await client.query(sql);
      } catch (e) {}
    }
    
    // Funnel table migrations - to'lov va narx maydonlari
    const funnelMigrations = [
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS payme_enabled BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS click_enabled BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS price_1m INTEGER`,
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS price_3m INTEGER`,
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS price_6m INTEGER`,
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS price_12m INTEGER`,
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS pitch_delay_minutes REAL DEFAULT 120`,
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS sales_delay_minutes REAL DEFAULT 60`,
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS soft_attack_delay_minutes REAL DEFAULT 1440`,
      `ALTER TABLE funnels ADD COLUMN IF NOT EXISTS congrats_text TEXT DEFAULT '🎉 Tabriklayman! Barcha bepul darslarni tugatdingiz!'`
    ];
    
    for (const sql of funnelMigrations) {
      try {
        await client.query(sql);
      } catch (e) {}
    }
    
    console.log('Migrations completed');
    
    // Add delay_minutes to pitch_media
    try {
      await client.query(`ALTER TABLE pitch_media ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0`);
    } catch (e) {}

    // Migrate custdev_questions to funnel_custdev for default funnel
    try {
      // Check if there's a default funnel
      const { rows: defaultFunnel } = await client.query('SELECT id FROM funnels WHERE is_default = true LIMIT 1');
      if (defaultFunnel.length > 0) {
        const defaultId = defaultFunnel[0].id;
        // Check if funnel_custdev is empty for this funnel
        const { rows: existing } = await client.query('SELECT COUNT(*) as cnt FROM funnel_custdev WHERE funnel_id = $1', [defaultId]);
        if (parseInt(existing[0].cnt) === 0) {
          // Copy from custdev_questions to funnel_custdev
          await client.query(`
            INSERT INTO funnel_custdev (funnel_id, step, after_lesson, question_text, question_type, options, field_name, sort_order)
            SELECT $1, step, after_lesson, question_text, question_type, options, field_name, sort_order
            FROM custdev_questions
          `, [defaultId]);
          console.log('Migrated custdev_questions to funnel_custdev for default funnel');
        }
      }
    } catch (e) {
      console.log('CustDev migration skipped or already done');
    }

    // ============ END MIGRATIONS ============

    console.log('Tables created');
    await seedDefaultData(client);

  } finally {
    client.release();
  }
}

async function seedDefaultData(client) {
  const { rows: lessons } = await client.query('SELECT COUNT(*) FROM lessons');
  if (parseInt(lessons[0].count) === 0) {
    await client.query(`
      INSERT INTO lessons (lesson_number, title, content, delay_hours) VALUES
      (1, 'SMM nima va nima uchun kerak?', 'Bu darsda SMM asoslarini organasiz.', 0),
      (2, 'Kontent strategiyasi', 'Bu darsda kontent yaratishni organasiz.', 24),
      (3, 'Targetlangan reklama', 'Bu darsda reklama asoslarini organasiz.', 24),
      (4, 'Analitika va natijalar', 'Bu darsda statistikani tahlil qilishni organasiz.', 24)
      ON CONFLICT (lesson_number) DO NOTHING
    `);
    console.log('Lessons seeded');
  }

  const { rows: questions } = await client.query('SELECT COUNT(*) FROM custdev_questions');
  if (parseInt(questions[0].count) === 0) {
    await client.query(`
      INSERT INTO custdev_questions (step, after_lesson, question_text, question_type, options, field_name, sort_order) VALUES
      (1, 1, 'Yoshingiz qaysi oraliqda?', 'buttons', '["16-22", "23-30", "31-40", "40+"]', 'age_group', 1),
      (2, 1, 'Hozir nima ish qilasiz?', 'buttons', '["Talaba", "Ishlayman", "Freelancer", "Biznesim bor", "Ishsizman"]', 'occupation', 2),
      (3, 2, 'Oylik daromadingiz taxminan qancha?', 'buttons', '["1 mln gacha", "1-3 mln", "3-7 mln", "7-15 mln", "15+ mln"]', 'income_level', 1),
      (4, 2, 'SMM da eng katta muammongiz nima? Erkin yozing:', 'text', NULL, 'main_problem', 2),
      (5, 3, 'Oldin SMM kurs oqiganmisiz?', 'buttons', '["Ha, natija bolmadi", "Ha, yordam berdi", "Yoq, hech qachon"]', 'previous_courses', 1),
      (6, 3, 'SMM organish uchun qancha investitsiya qilishga tayyorsiz?', 'buttons', '["50-100 ming", "100-300 ming", "300-500 ming", "500+ ming"]', 'budget_range', 2),
      (7, 3, 'SMM orqali asosiy maqsadingiz nima? Erkin yozing:', 'text', NULL, 'goal', 3)
      ON CONFLICT DO NOTHING
    `);
    console.log('CustDev seeded');
  }

  const { rows: pitch } = await client.query('SELECT COUNT(*) FROM pitch_media');
  if (parseInt(pitch[0].count) === 0) {
    await client.query(`
      INSERT INTO pitch_media (media_type, text, delay_hours) VALUES
      ('text', 'Maxsus video xabar! Toliq kursga tayyormisiz?', 2)
    `);
  }

  const { rows: msgs } = await client.query('SELECT COUNT(*) FROM bot_messages');
  if (parseInt(msgs[0].count) === 0) {
    await client.query(`
      INSERT INTO bot_messages (key, text) VALUES
      ('welcome', 'Assalomu alaykum! SMM Boshlangich darslar kursiga xush kelibsiz! Sizni 4 ta BEPUL video dars kutmoqda.'),
      ('ask_name', 'Iltimos, ism-familiyangizni kiriting:'),
      ('ask_phone', 'Rahmat! Endi telefon raqamingizni yuboring:'),
      ('registration_done', 'Rahmat! Birinchi dars hozir yuborilmoqda...'),
      ('custdev_intro_1', 'Darsni korganingiz uchun rahmat! Sizni yaxshiroq tushunish uchun bir necha savol:'),
      ('custdev_intro_2', 'Ajoyib davom etyapsiz! Yana bir necha savol:'),
      ('custdev_intro_3', 'Zor! Oxirgi savollar:'),
      ('lesson_scheduled', 'Javoblaringiz uchun rahmat! Keyingi dars tez orada yuboriladi.')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  // Seed subscription plans
  const { rows: plans } = await client.query('SELECT COUNT(*) FROM subscription_plans');
  if (parseInt(plans[0].count) === 0) {
    await client.query(`
      INSERT INTO subscription_plans (id, name, duration_days, price, discount_percent, is_active, sort_order) VALUES
      ('1month', '1 oylik', 30, 9700000, 0, true, 1),
      ('3month', '3 oylik', 90, 24900000, 15, true, 2),
      ('6month', '6 oylik', 180, 44900000, 23, true, 3),
      ('1year', '1 yillik', 365, 79900000, 31, true, 4)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('Subscription plans seeded');
  }

  // Seed subscription reminder messages
  const reminderKeys = ['reminder_5d', 'reminder_3d', 'reminder_1d', 'reminder_expired'];
  for (const key of reminderKeys) {
    const { rows: existing } = await client.query('SELECT 1 FROM bot_messages WHERE key = $1', [key]);
    if (existing.length === 0) {
      let text = '';
      if (key === 'reminder_5d') text = '⏰ Hurmatli {{ism}}, obunangiz tugashiga 5 kun qoldi!\n\nObunani uzaytirish uchun quyidagi tugmani bosing:';
      if (key === 'reminder_3d') text = '⚠️ Hurmatli {{ism}}, obunangiz tugashiga 3 kun qoldi!\n\nPremium kanalga kirishni davom ettirish uchun obunani uzaytiring:';
      if (key === 'reminder_1d') text = '🚨 Hurmatli {{ism}}, obunangiz ERTAGA tugaydi!\n\nKanaldan chiqarib yuborilmaslik uchun hoziroq uzaytiring:';
      if (key === 'reminder_expired') text = '❌ Hurmatli {{ism}}, obunangiz tugadi.\n\nQayta obuna bo\'lish uchun:';
      await client.query('INSERT INTO bot_messages (key, text) VALUES ($1, $2)', [key, text]);
    }
  }
}

export async function getUser(telegramId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  return rows[0] || null;
}

export async function createUser(telegramId, username, fullName) {
  const { rows } = await pool.query(`
    INSERT INTO users (telegram_id, username, full_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (telegram_id) DO UPDATE SET
      username = COALESCE(EXCLUDED.username, users.username),
      last_activity = NOW()
    RETURNING *
  `, [telegramId, username, fullName]);
  return rows[0];
}

export async function updateUser(telegramId, data) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const setClause = fields.map((f, i) => f + ' = $' + (i + 2)).join(', ');

  const { rows } = await pool.query(
    'UPDATE users SET ' + setClause + ', last_activity = NOW() WHERE telegram_id = $1 RETURNING *',
    [telegramId, ...values]
  );
  return rows[0];
}

export async function deleteUser(telegramId) {
  // Delete all related records first (foreign key constraints)
  await pool.query('DELETE FROM custdev_answers WHERE telegram_id = $1', [telegramId]);
  await pool.query('DELETE FROM scheduled_messages WHERE telegram_id = $1', [telegramId]);
  await pool.query('DELETE FROM subscriptions WHERE telegram_id = $1', [telegramId]);
  await pool.query('DELETE FROM payments WHERE telegram_id = $1', [telegramId]);
  await pool.query('DELETE FROM users WHERE telegram_id = $1', [telegramId]);
}

export async function getAllActiveUsers() {
  const { rows } = await pool.query('SELECT * FROM users WHERE is_blocked = FALSE ORDER BY created_at DESC');
  return rows;
}

export async function getLesson(lessonNumber) {
  const { rows } = await pool.query('SELECT * FROM lessons WHERE lesson_number = $1 AND is_active = TRUE', [lessonNumber]);
  return rows[0] || null;
}

export async function getAllLessons() {
  const { rows } = await pool.query('SELECT * FROM lessons ORDER BY lesson_number');
  return rows;
}

export async function getLessonsCount() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM lessons WHERE is_active = TRUE');
  return parseInt(rows[0].count);
}

export async function createLesson(data) {
  const { rows: maxRow } = await pool.query('SELECT COALESCE(MAX(lesson_number), 0) + 1 as next_num FROM lessons');
  const lessonNumber = maxRow[0].next_num;

  const { rows } = await pool.query(`
    INSERT INTO lessons (lesson_number, title, content, delay_hours, show_watched_button, watched_button_text, watched_message)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    lessonNumber,
    data.title || lessonNumber + '-Dars',
    data.content || '',
    data.delay_hours || 24,
    data.show_watched_button !== false,
    data.watched_button_text || 'Videoni korib boldim',
    data.watched_message || 'Videoni korib bolganingizdan keyin tugmani bosing:'
  ]);
  return rows[0];
}

export async function updateLesson(lessonNumber, data) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  
  if (fields.length === 0) {
    return null;
  }
  
  const setClause = fields.map((f, i) => f + ' = $' + (i + 2)).join(', ');
  
  const { rows } = await pool.query(
    'UPDATE lessons SET ' + setClause + ' WHERE lesson_number = $1 RETURNING *', 
    [lessonNumber, ...values]
  );
  return rows[0];
}

export async function deleteLesson(lessonNumber) {
  await pool.query('DELETE FROM lessons WHERE lesson_number = $1', [lessonNumber]);
  await pool.query('UPDATE lessons SET lesson_number = lesson_number - 1 WHERE lesson_number > $1', [lessonNumber]);
}

export async function getCustDevQuestion(step) {
  const { rows } = await pool.query('SELECT * FROM custdev_questions WHERE step = $1 AND is_active = TRUE', [step]);
  return rows[0] || null;
}

export async function getCustDevQuestionsForLesson(afterLesson) {
  const { rows } = await pool.query(`
    SELECT * FROM custdev_questions
    WHERE after_lesson = $1 AND is_active = TRUE
    ORDER BY sort_order, step
  `, [afterLesson]);
  return rows;
}

export async function getAllCustDevQuestions() {
  const { rows } = await pool.query('SELECT * FROM custdev_questions ORDER BY after_lesson, sort_order, step');
  return rows;
}

export async function createCustDevQuestion(data) {
  const { rows: maxRow } = await pool.query('SELECT COALESCE(MAX(step), 0) + 1 as next_step FROM custdev_questions');
  const step = maxRow[0].next_step;

  const { rows } = await pool.query(`
    INSERT INTO custdev_questions (step, after_lesson, question_text, question_type, options, field_name, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    step,
    data.after_lesson || 1,
    data.question_text,
    data.question_type || 'buttons',
    data.options ? JSON.stringify(data.options) : null,
    data.field_name,
    data.sort_order || 0
  ]);
  return rows[0];
}

export async function updateCustDevQuestion(id, data) {
  const fields = Object.keys(data);
  const values = Object.values(data).map(v => {
    if (typeof v === 'object' && v !== null) return JSON.stringify(v);
    return v;
  });
  const setClause = fields.map((f, i) => f + ' = $' + (i + 2)).join(', ');

  await pool.query('UPDATE custdev_questions SET ' + setClause + ' WHERE id = $1', [id, ...values]);
}

export async function deleteCustDevQuestion(id) {
  await pool.query('DELETE FROM custdev_questions WHERE id = $1', [id]);
}

export async function saveCustDevAnswer(telegramId, questionId, answer) {
  await pool.query(`
    INSERT INTO custdev_answers (telegram_id, question_id, answer)
    VALUES ($1, $2, $3)
  `, [telegramId, questionId, answer]);
}

export async function getPitchMedia() {
  const { rows } = await pool.query('SELECT * FROM pitch_media WHERE is_active = TRUE ORDER BY id DESC LIMIT 1');
  return rows[0] || null;
}

export async function updatePitchMedia(data) {
  const existing = await getPitchMedia();

  if (existing) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((f, i) => f + ' = $' + (i + 1)).join(', ');
    await pool.query('UPDATE pitch_media SET ' + setClause + ', updated_at = NOW() WHERE id = ' + existing.id, values);
  } else {
    await pool.query(`
      INSERT INTO pitch_media (media_type, video_file_id, image_file_id, audio_file_id, text, delay_hours)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      data.media_type || 'text',
      data.video_file_id,
      data.image_file_id,
      data.audio_file_id,
      data.text,
      data.delay_hours !== null && data.delay_hours !== undefined ? data.delay_hours : 2
    ]);
  }
}

export async function getBotMessage(key) {
  const { rows } = await pool.query('SELECT text FROM bot_messages WHERE key = $1', [key]);
  return rows[0]?.text || null;
}

export async function getAllBotMessages() {
  const { rows } = await pool.query('SELECT * FROM bot_messages ORDER BY key');
  return rows;
}

export async function updateBotMessage(key, text) {
  await pool.query(`
    INSERT INTO bot_messages (key, text, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE SET text = $2, updated_at = NOW()
  `, [key, text]);
}

export async function scheduleMessage(telegramId, messageType, scheduledAt, data) {
  await pool.query(`
    INSERT INTO scheduled_messages (telegram_id, message_type, scheduled_at, data)
    VALUES ($1, $2, $3, $4)
  `, [telegramId, messageType, scheduledAt, JSON.stringify(data)]);
}

export async function getPendingMessages() {
  const { rows } = await pool.query(`
    SELECT * FROM scheduled_messages
    WHERE sent = FALSE AND scheduled_at <= NOW()
    ORDER BY scheduled_at
    LIMIT 50
  `);
  return rows;
}

// Alias for scheduler.js compatibility
export const getPendingScheduledMessages = getPendingMessages;

export async function markMessageSent(id) {
  await pool.query('UPDATE scheduled_messages SET sent = TRUE WHERE id = $1', [id]);
}

// Alias for scheduler.js compatibility
export const markScheduledMessageSent = markMessageSent;

export async function cancelPendingMessages(telegramId, messageType = null) {
  if (messageType) {
    await pool.query('UPDATE scheduled_messages SET sent = TRUE WHERE telegram_id = $1 AND message_type = $2 AND sent = FALSE', [telegramId, messageType]);
  } else {
    await pool.query('UPDATE scheduled_messages SET sent = TRUE WHERE telegram_id = $1 AND sent = FALSE', [telegramId]);
  }
}

export async function createPayment(orderId, telegramId, amount, planId = '1month') {
  const user = await getUser(telegramId);
  await pool.query(`
    INSERT INTO payments (order_id, telegram_id, user_id, amount, plan_id)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (order_id) DO NOTHING
  `, [orderId, telegramId, user?.id, amount, planId]);
}

export async function getPayment(orderId) {
  const { rows } = await pool.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
  return rows[0] || null;
}

export async function getPaymentByOrderId(orderId) {
  const { rows } = await pool.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
  return rows[0] || null;
}

export async function getPaymentByTransactionId(transactionId, paymentMethod) {
  const { rows } = await pool.query(
    'SELECT * FROM payments WHERE transaction_id = $1 AND payment_method = $2',
    [transactionId.toString(), paymentMethod]
  );
  return rows[0] || null;
}

export async function updatePayment(orderId, data) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const setClause = fields.map((f, i) => f + ' = $' + (i + 2)).join(', ');

  await pool.query('UPDATE payments SET ' + setClause + ' WHERE order_id = $1', [orderId, ...values]);
}

export async function getAllPayments() {
  const { rows } = await pool.query(`
    SELECT p.*, u.full_name, u.username
    FROM payments p
    LEFT JOIN users u ON p.telegram_id = u.telegram_id
    ORDER BY p.created_at DESC
    LIMIT 100
  `);
  return rows;
}

export async function getPaymentAnalytics() {
  const { rows: daily } = await pool.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE state = 'performed' AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at) ORDER BY date DESC
  `);

  const { rows: monthly } = await pool.query(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE state = 'performed' AND created_at > NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month DESC
  `);

  const { rows: today } = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE state = 'performed' AND DATE(created_at) = CURRENT_DATE
  `);

  const { rows: week } = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE state = 'performed' AND created_at > NOW() - INTERVAL '7 days'
  `);

  const { rows: month } = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE state = 'performed' AND created_at > NOW() - INTERVAL '30 days'
  `);

  const { rows: year } = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE state = 'performed' AND created_at > NOW() - INTERVAL '365 days'
  `);

  const { rows: total } = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE state = 'performed'
  `);

  const { rows: payme } = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE state = 'performed' AND payment_method = 'payme'
  `);

  const { rows: click } = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE state = 'performed' AND payment_method = 'click'
  `);

  return {
    daily,
    monthly,
    today: today[0],
    week: week[0],
    month: month[0],
    year: year[0],
    total: total[0],
    payme: payme[0],
    click: click[0]
  };
}

export async function getDailySubscribers() {
  const { rows: daily } = await pool.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at) ORDER BY date DESC
  `);

  const { rows: monthly } = await pool.query(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
    FROM users WHERE created_at > NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month DESC
  `);

  return { daily, monthly };
}

export async function getFullStats() {
  const { rows: userStats } = await pool.query(`
    SELECT
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE is_paid = TRUE) as paid_users,
      COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_users
    FROM users WHERE is_blocked = FALSE
  `);

  const { rows: paymentStats } = await pool.query(`
    SELECT
      COUNT(*) as total_payments,
      COALESCE(SUM(amount), 0) as total_revenue,
      COALESCE(SUM(amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) as monthly_revenue
    FROM payments WHERE state = 'performed'
  `);

  const { rows: funnelStats } = await pool.query(`
    SELECT funnel_step, COUNT(*) as count
    FROM users WHERE is_blocked = FALSE
    GROUP BY funnel_step ORDER BY funnel_step
  `);

  return {
    ...userStats[0],
    ...paymentStats[0],
    funnel_distribution: funnelStats
  };
}

export async function createSubscription(telegramId, planId, amount, paymentMethod, paymentId) {
  const user = await getUser(telegramId);
  const plan = await getSubscriptionPlan(planId);
  const durationDays = plan ? plan.duration_days : 30;
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  await pool.query(`
    INSERT INTO subscriptions (user_id, telegram_id, plan_id, start_date, end_date, amount, payment_method, payment_id, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
  `, [user?.id, telegramId, planId, startDate, endDate, amount, paymentMethod, paymentId]);

  await updateUser(telegramId, { is_paid: true });
}

// ============ Subscription Plans Functions ============
export async function getSubscriptionPlans(activeOnly = true) {
  const query = activeOnly 
    ? 'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order'
    : 'SELECT * FROM subscription_plans ORDER BY sort_order';
  const { rows } = await pool.query(query);
  return rows;
}

export async function getSubscriptionPlan(planId) {
  const { rows } = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
  return rows[0] || null;
}

export async function updateSubscriptionPlan(planId, data) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const setClause = fields.map((f, i) => f + ' = $' + (i + 2)).join(', ');
  await pool.query('UPDATE subscription_plans SET ' + setClause + ' WHERE id = $1', [planId, ...values]);
}

export async function getActiveSubscription(telegramId) {
  const { rows } = await pool.query(`
    SELECT * FROM subscriptions 
    WHERE telegram_id = $1 AND is_active = true AND end_date > NOW()
    ORDER BY end_date DESC LIMIT 1
  `, [telegramId]);
  return rows[0] || null;
}

export async function extendSubscription(telegramId, planId, additionalDays) {
  // Get current active subscription
  const current = await getActiveSubscription(telegramId);
  
  if (current) {
    // Extend existing subscription
    const newEndDate = new Date(current.end_date);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);
    
    await pool.query(`
      UPDATE subscriptions SET end_date = $1, 
        reminder_sent_5d = false, reminder_sent_3d = false, reminder_sent_1d = false
      WHERE id = $2
    `, [newEndDate, current.id]);
    
    return newEndDate;
  }
  
  return null;
}

export async function getExpiringSubscriptions(daysRemaining) {
  // Determine which reminder column to check
  let reminderColumn;
  if (daysRemaining === 5) reminderColumn = 'reminder_sent_5d';
  else if (daysRemaining === 3) reminderColumn = 'reminder_sent_3d';
  else reminderColumn = 'reminder_sent_1d';
  
  const { rows } = await pool.query(`
    SELECT s.*, u.full_name, u.username
    FROM subscriptions s
    JOIN users u ON s.telegram_id = u.telegram_id
    WHERE s.is_active = true 
      AND s.end_date > NOW()
      AND DATE(s.end_date) = CURRENT_DATE + $1 * INTERVAL '1 day'
      AND ${reminderColumn} = false
  `, [daysRemaining]);
  return rows;
}

export async function markReminderSent(subscriptionId, reminderType) {
  // reminderType: '5d', '3d', or '1d'
  const column = 'reminder_sent_' + reminderType;
  await pool.query(`UPDATE subscriptions SET ${column} = true WHERE id = $1`, [subscriptionId]);
}

export async function getExpiredSubscriptions() {
  const { rows } = await pool.query(`
    SELECT s.*, u.full_name, u.username
    FROM subscriptions s
    JOIN users u ON s.telegram_id = u.telegram_id
    WHERE s.is_active = true AND s.end_date < NOW()
  `);
  return rows;
}

export async function deactivateSubscription(subscriptionId) {
  await pool.query('UPDATE subscriptions SET is_active = false, status = $1 WHERE id = $2', ['expired', subscriptionId]);
}

export async function getAllSubscriptions() {
  const { rows } = await pool.query(`
    SELECT s.*, u.full_name, u.username, p.name as plan_name
    FROM subscriptions s
    LEFT JOIN users u ON s.telegram_id = u.telegram_id
    LEFT JOIN subscription_plans p ON s.plan_id = p.id
    ORDER BY s.created_at DESC
    LIMIT 100
  `);
  return rows;
}

export async function saveMedia(fileId, fileType, fileName, caption, uploadedBy) {
  const { rows } = await pool.query(`
    INSERT INTO media_library (file_id, file_type, file_name, caption, uploaded_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING
    RETURNING *
  `, [fileId, fileType, fileName, caption, uploadedBy]);
  return rows[0];
}

export async function getAllMedia() {
  const { rows } = await pool.query('SELECT * FROM media_library ORDER BY created_at DESC');
  return rows;
}

export async function getMediaByType(fileType) {
  const { rows } = await pool.query('SELECT * FROM media_library WHERE file_type = $1 ORDER BY created_at DESC', [fileType]);
  return rows;
}

export async function deleteMedia(id) {
  await pool.query('DELETE FROM media_library WHERE id = $1', [id]);
}

export async function updateMedia(id, caption) {
  const { rows } = await pool.query('UPDATE media_library SET caption = $1 WHERE id = $2 RETURNING *', [caption, id]);
  return rows[0];
}

// Get payments by time range for GetStatement
export async function getPaymentsByTimeRange(from, to, paymentMethod) {
  // Payme sends time in milliseconds
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  const { rows } = await pool.query(`
    SELECT * FROM payments 
    WHERE payment_method = $1 
      AND create_time IS NOT NULL
      AND create_time >= $2 
      AND create_time <= $3
    ORDER BY create_time
  `, [paymentMethod, fromDate, toDate]);
  
  return rows;
}

// Buyer Analytics - time to purchase, demographics of buyers
export async function getBuyerAnalytics() {
  try {
    // Get all successful payments with user data
    const { rows: buyers } = await pool.query(`
      SELECT 
        p.telegram_id,
        p.created_at as payment_date,
        p.amount,
        u.created_at as registration_date,
        u.age_group,
        u.occupation,
        u.main_problem,
        u.income_level
      FROM payments p
      JOIN users u ON p.telegram_id = u.telegram_id
      WHERE p.state = 'performed'
      ORDER BY p.created_at DESC
    `);
    
    // Get total users for conversion rate
    const { rows: totalUsersResult } = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalUsersResult[0]?.count || 0);
    
    // Calculate time to purchase
    const timesToPurchase = buyers
      .filter(b => b.registration_date && b.payment_date)
      .map(b => new Date(b.payment_date) - new Date(b.registration_date))
      .filter(t => t >= 0);
    
    const avgTimeToPurchase = timesToPurchase.length > 0 
      ? timesToPurchase.reduce((a, b) => a + b, 0) / timesToPurchase.length 
      : 0;
    
    const fastestPurchase = timesToPurchase.length > 0 
      ? Math.min(...timesToPurchase) 
      : 0;
    
    const slowestPurchase = timesToPurchase.length > 0 
      ? Math.max(...timesToPurchase) 
      : 0;
    
    // Conversion rate
    const uniqueBuyers = new Set(buyers.map(b => b.telegram_id)).size;
    const conversionRate = totalUsers > 0 ? (uniqueBuyers / totalUsers) * 100 : 0;
    
    // Group by age
    const buyersByAge = {};
    buyers.forEach(b => {
      if (b.age_group) {
        buyersByAge[b.age_group] = (buyersByAge[b.age_group] || 0) + 1;
      }
    });
    
    // Group by occupation
    const buyersByOccupation = {};
    buyers.forEach(b => {
      if (b.occupation) {
        const occ = b.occupation.length > 20 ? b.occupation.slice(0, 20) + '...' : b.occupation;
        buyersByOccupation[occ] = (buyersByOccupation[occ] || 0) + 1;
      }
    });
    
    // Group by problem
    const buyersByProblem = {};
    buyers.forEach(b => {
      if (b.main_problem) {
        const prob = b.main_problem.length > 25 ? b.main_problem.slice(0, 25) + '...' : b.main_problem;
        buyersByProblem[prob] = (buyersByProblem[prob] || 0) + 1;
      }
    });
    
    return {
      avgTimeToPurchase,
      fastestPurchase,
      slowestPurchase,
      conversionRate,
      buyersByAge,
      buyersByOccupation,
      buyersByProblem,
      totalBuyers: uniqueBuyers
    };
    
  } catch (e) {
    console.error('getBuyerAnalytics error:', e);
    return {
      avgTimeToPurchase: 0,
      fastestPurchase: 0,
      slowestPurchase: 0,
      conversionRate: 0,
      buyersByAge: {},
      buyersByOccupation: {},
      buyersByProblem: {},
      totalBuyers: 0
    };
  }
}

export { pool };

// ============ INVITE LINKS FUNCTIONS ============
export async function saveInviteLink(telegramId, inviteLink, subscriptionId = null) {
  await pool.query(`
    INSERT INTO invite_links (telegram_id, invite_link, subscription_id)
    VALUES ($1, $2, $3)
  `, [telegramId, inviteLink, subscriptionId]);
}

export async function markInviteLinkUsed(telegramId) {
  await pool.query(`
    UPDATE invite_links SET is_used = true, used_at = NOW()
    WHERE telegram_id = $1 AND is_used = false
    ORDER BY created_at DESC LIMIT 1
  `, [telegramId]);
}

export async function getInviteLinkStats() {
  const { rows } = await pool.query(`
    SELECT 
      COUNT(*) as total_links,
      COUNT(CASE WHEN is_used = true THEN 1 END) as used_links,
      COUNT(CASE WHEN is_used = false THEN 1 END) as unused_links
    FROM invite_links
  `);
  return rows[0];
}

export async function getUsersWithInviteLinks() {
  const { rows } = await pool.query(`
    SELECT 
      u.telegram_id,
      u.full_name,
      u.username,
      u.phone,
      u.is_paid,
      il.invite_link,
      il.is_used,
      il.created_at as link_created,
      il.used_at as link_used,
      s.plan_id,
      s.start_date,
      s.end_date,
      s.is_active as subscription_active
    FROM invite_links il
    LEFT JOIN users u ON il.telegram_id = u.telegram_id
    LEFT JOIN subscriptions s ON il.subscription_id = s.id
    ORDER BY il.created_at DESC
  `);
  return rows;
}

// ============ APP SETTINGS FUNCTIONS ============
export async function getSetting(key) {
  const { rows } = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  return rows[0]?.value || null;
}

export async function setSetting(key, value) {
  await pool.query(`
    INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
  `, [key, value]);
}

export async function getAllSettings() {
  const { rows } = await pool.query('SELECT * FROM app_settings');
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  return settings;
}

// ============ CHANNEL SETTINGS ============
export async function getChannelSettings() {
  return {
    channel_id: await getSetting('premium_channel_id') || process.env.PREMIUM_CHANNEL_ID || '',
    channel_link: await getSetting('premium_channel_link') || ''
  };
}

export async function updateChannelSettings(channelId, channelLink) {
  if (channelId) await setSetting('premium_channel_id', channelId);
  if (channelLink) await setSetting('premium_channel_link', channelLink);
}

// ============ ENHANCED ANALYTICS ============
export async function getFunnelAnalytics() {
  const { rows } = await pool.query(`
    SELECT 
      funnel_step,
      COUNT(*) as count
    FROM users
    GROUP BY funnel_step
    ORDER BY funnel_step
  `);
  
  const steps = {
    0: { name: 'Yangi', count: 0 },
    1: { name: 'Start', count: 0 },
    2: { name: '1-Dars', count: 0 },
    3: { name: 'CustDev 1', count: 0 },
    4: { name: '2-Dars', count: 0 },
    5: { name: 'CustDev 2', count: 0 },
    6: { name: '3-Dars', count: 0 },
    7: { name: 'CustDev 3', count: 0 },
    8: { name: '4-Dars', count: 0 },
    9: { name: 'Pitch', count: 0 },
    10: { name: 'Sotish', count: 0 },
    11: { name: 'Premium', count: 0 }
  };
  
  rows.forEach(r => {
    if (steps[r.funnel_step]) {
      steps[r.funnel_step].count = parseInt(r.count);
    }
  });
  
  return steps;
}

export async function getRevenueByPeriod(days = 30) {
  const { rows } = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      SUM(amount) as revenue,
      COUNT(*) as transactions
    FROM payments
    WHERE state = 'performed' 
      AND created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);
  return rows;
}

export async function getSubscriptionStats() {
  const { rows } = await pool.query(`
    SELECT 
      plan_id,
      COUNT(*) as count,
      SUM(amount) as total_revenue
    FROM subscriptions
    WHERE is_active = true
    GROUP BY plan_id
  `);
  return rows;
}

// ============ FEEDBACK FUNCTIONS ============
export async function saveFeedback(telegramId, feedbackType, feedbackText) {
  await pool.query(`
    INSERT INTO user_feedback (telegram_id, feedback_type, feedback_text)
    VALUES ($1, $2, $3)
  `, [telegramId, feedbackType, feedbackText]);
}

export async function getAllFeedback() {
  const { rows } = await pool.query(`
    SELECT 
      f.id,
      f.telegram_id,
      f.feedback_type,
      f.feedback_text,
      f.created_at,
      u.full_name,
      u.username,
      u.phone
    FROM user_feedback f
    LEFT JOIN users u ON f.telegram_id = u.telegram_id
    ORDER BY f.created_at DESC
  `);
  return rows;
}

export async function getFeedbackStats() {
  const { rows } = await pool.query(`
    SELECT 
      feedback_type,
      COUNT(*) as count
    FROM user_feedback
    GROUP BY feedback_type
  `);
  return rows;
}

// ============ MULTI-FUNNEL FUNCTIONS ============

// Get all funnels
export async function getAllFunnels() {
  const { rows } = await pool.query('SELECT * FROM funnels ORDER BY sort_order, created_at');
  return rows;
}

// Get funnel by ID
export async function getFunnelById(id) {
  const { rows } = await pool.query('SELECT * FROM funnels WHERE id = $1', [id]);
  return rows[0] || null;
}

// Get funnel by slug
export async function getFunnelBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM funnels WHERE slug = $1 AND is_active = true', [slug]);
  return rows[0] || null;
}

// Get default funnel
export async function getDefaultFunnel() {
  const { rows } = await pool.query('SELECT * FROM funnels WHERE is_default = true AND is_active = true LIMIT 1');
  if (rows[0]) return rows[0];
  // Agar default yo'q bo'lsa, birinchi active funnelni qaytar
  const { rows: fallback } = await pool.query('SELECT * FROM funnels WHERE is_active = true ORDER BY sort_order LIMIT 1');
  return fallback[0] || null;
}

// Create funnel
export async function createFunnel(data) {
  const { rows } = await pool.query(`
    INSERT INTO funnels (slug, name, description, is_default, is_active)
    VALUES ($1, $2, $3, $4, true)
    RETURNING *
  `, [data.slug, data.name, data.description || '', data.is_default || false]);
  return rows[0];
}

// Update funnel
export async function updateFunnel(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;
  
  const allowedFields = [
    'slug', 'name', 'description', 'require_subscription_before_lesson',
    'free_channel_id', 'free_channel_link', 'premium_channel_id', 'premium_channel_link',
    'pitch_after_lesson', 'pitch_text', 'pitch_video_file_id', 'pitch_image_file_id',
    'pitch_delay_hours', 'pitch_delay_minutes', 'sales_pitch', 'sales_delay_hours',
    'sales_delay_minutes', 'soft_attack_text', 'soft_attack_delay_hours',
    'soft_attack_delay_minutes', 'soft_attack_disabled', 'congrats_text',
    'is_default', 'is_active', 'sort_order',
    'payme_enabled', 'click_enabled', 'price_1m', 'price_3m', 'price_6m', 'price_12m'
  ];
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx}`);
      values.push(data[field]);
      idx++;
    }
  }
  
  if (fields.length === 0) return null;
  
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE funnels SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

// Delete funnel
export async function deleteFunnel(id) {
  await pool.query('DELETE FROM funnels WHERE id = $1', [id]);
}

// Set default funnel (only one can be default)
export async function setDefaultFunnel(id) {
  await pool.query('UPDATE funnels SET is_default = false');
  await pool.query('UPDATE funnels SET is_default = true WHERE id = $1', [id]);
}

// ============ FUNNEL LESSONS ============

// Get lessons for funnel
export async function getFunnelLessons(funnelId) {
  const { rows } = await pool.query(
    'SELECT * FROM funnel_lessons WHERE funnel_id = $1 ORDER BY lesson_number',
    [funnelId]
  );
  return rows;
}

// Get single lesson
export async function getFunnelLesson(funnelId, lessonNumber) {
  const { rows } = await pool.query(
    'SELECT * FROM funnel_lessons WHERE funnel_id = $1 AND lesson_number = $2',
    [funnelId, lessonNumber]
  );
  return rows[0] || null;
}

// Create/Update funnel lesson
export async function upsertFunnelLesson(funnelId, lessonNumber, data) {
  const { rows } = await pool.query(`
    INSERT INTO funnel_lessons (funnel_id, lesson_number, title, content, video_file_id, image_file_id, audio_file_id, delay_hours, show_watched_button, watched_button_text)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (funnel_id, lesson_number) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      video_file_id = EXCLUDED.video_file_id,
      image_file_id = EXCLUDED.image_file_id,
      audio_file_id = EXCLUDED.audio_file_id,
      delay_hours = EXCLUDED.delay_hours,
      show_watched_button = EXCLUDED.show_watched_button,
      watched_button_text = EXCLUDED.watched_button_text
    RETURNING *
  `, [
    funnelId, lessonNumber, data.title, data.content || '',
    data.video_file_id || null, data.image_file_id || null, data.audio_file_id || null,
    data.delay_hours || 24, data.show_watched_button !== false,
    data.watched_button_text || 'Videoni ko\'rib bo\'ldim ✅'
  ]);
  return rows[0];
}

// Delete funnel lesson
export async function deleteFunnelLesson(funnelId, lessonNumber) {
  await pool.query(
    'DELETE FROM funnel_lessons WHERE funnel_id = $1 AND lesson_number = $2',
    [funnelId, lessonNumber]
  );
}

// ============ FUNNEL CUSTDEV ============

// Get custdev questions for funnel
export async function getFunnelCustDev(funnelId) {
  const { rows } = await pool.query(
    'SELECT * FROM funnel_custdev WHERE funnel_id = $1 ORDER BY after_lesson, sort_order, step',
    [funnelId]
  );
  return rows;
}

// Create funnel custdev question
export async function createFunnelCustDev(funnelId, data) {
  const { rows } = await pool.query(`
    INSERT INTO funnel_custdev (funnel_id, step, after_lesson, question_text, question_type, options, field_name, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    funnelId, data.step || 1, data.after_lesson || 1,
    data.question_text, data.question_type || 'buttons',
    data.options ? JSON.stringify(data.options) : null,
    data.field_name || null, data.sort_order || 0
  ]);
  return rows[0];
}

// Delete funnel custdev
export async function deleteFunnelCustDev(id) {
  await pool.query('DELETE FROM funnel_custdev WHERE id = $1', [id]);
}

// ============ USER FUNNELS ============

// Get user's active funnel
export async function getUserActiveFunnel(telegramId) {
  const { rows } = await pool.query(`
    SELECT uf.*, f.* 
    FROM user_funnels uf
    JOIN funnels f ON uf.funnel_id = f.id
    WHERE uf.telegram_id = $1 AND uf.status = 'active'
    ORDER BY uf.started_at DESC
    LIMIT 1
  `, [telegramId]);
  return rows[0] || null;
}

// Start user in funnel
export async function startUserInFunnel(telegramId, funnelId) {
  const { rows } = await pool.query(`
    INSERT INTO user_funnels (telegram_id, funnel_id, current_lesson, custdev_step, status)
    VALUES ($1, $2, 0, 0, 'active')
    ON CONFLICT (telegram_id, funnel_id) DO UPDATE SET
      status = 'active',
      started_at = NOW()
    RETURNING *
  `, [telegramId, funnelId]);
  return rows[0];
}

// Update user funnel progress
export async function updateUserFunnelProgress(telegramId, funnelId, lesson, custdevStep) {
  await pool.query(`
    UPDATE user_funnels 
    SET current_lesson = $3, custdev_step = $4
    WHERE telegram_id = $1 AND funnel_id = $2
  `, [telegramId, funnelId, lesson, custdevStep]);
}

// Mark user funnel as paid
export async function markUserFunnelPaid(telegramId, funnelId) {
  await pool.query(`
    UPDATE user_funnels 
    SET status = 'paid', paid_at = NOW()
    WHERE telegram_id = $1 AND funnel_id = $2
  `, [telegramId, funnelId]);
}

// Get all user funnels
export async function getUserFunnels(telegramId) {
  const { rows } = await pool.query(`
    SELECT uf.*, f.name as funnel_name, f.slug as funnel_slug
    FROM user_funnels uf
    JOIN funnels f ON uf.funnel_id = f.id
    WHERE uf.telegram_id = $1
    ORDER BY uf.started_at DESC
  `, [telegramId]);
  return rows;
}

// ============ FUNNEL PLANS ============

// Get plans for funnel
export async function getFunnelPlans(funnelId) {
  const { rows } = await pool.query(
    'SELECT * FROM funnel_plans WHERE funnel_id = $1 AND is_active = true ORDER BY sort_order, price',
    [funnelId]
  );
  return rows;
}

// Create/Update funnel plan
export async function upsertFunnelPlan(funnelId, planId, data) {
  const { rows } = await pool.query(`
    INSERT INTO funnel_plans (funnel_id, plan_id, name, duration_days, price, discount_percent, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (funnel_id, plan_id) DO UPDATE SET
      name = EXCLUDED.name,
      duration_days = EXCLUDED.duration_days,
      price = EXCLUDED.price,
      discount_percent = EXCLUDED.discount_percent,
      sort_order = EXCLUDED.sort_order
    RETURNING *
  `, [funnelId, planId, data.name, data.duration_days, data.price, data.discount_percent || 0, data.sort_order || 0]);
  return rows[0];
}

// ============ FUNNEL STATS ============

// Get funnel statistics
export async function getFunnelStats(funnelId) {
  const { rows } = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_users,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_users
    FROM user_funnels
    WHERE funnel_id = $1
  `, [funnelId]);
  return rows[0];
}

// Get lesson completion stats for funnel
export async function getFunnelLessonStats(funnelId) {
  const { rows } = await pool.query(`
    SELECT 
      current_lesson,
      COUNT(*) as user_count
    FROM user_funnels
    WHERE funnel_id = $1
    GROUP BY current_lesson
    ORDER BY current_lesson
  `, [funnelId]);
  return rows;
}

// ============ MIGRATION: Create default funnel from existing data ============

export async function migrateToMultiFunnel() {
  // Check if default funnel exists
  const { rows: existing } = await pool.query("SELECT * FROM funnels WHERE slug = 'default'");
  if (existing.length > 0) {
    console.log('Default funnel already exists, skipping migration');
    return existing[0];
  }
  
  console.log('Creating default funnel from existing data...');
  
  // Get existing settings
  const pitchData = await pool.query('SELECT * FROM pitch_media LIMIT 1');
  const pitch = pitchData.rows[0] || {};
  
  const salesPitch = await getBotMessage('sales_pitch');
  const softAttack = await getBotMessage('soft_attack');
  const salesDelay = await getBotMessage('sales_delay');
  const softDelay = await getBotMessage('soft_attack_delay');
  const congrats = await getBotMessage('post_lesson_congrats');
  
  const freeChannelId = await getBotMessage('free_channel_id');
  const freeChannelLink = await getBotMessage('free_channel_link');
  const requireSub = await getBotMessage('require_subscription_before_lesson');
  
  const premiumChannelId = await getSetting('premium_channel_id');
  const premiumChannelLink = await getSetting('premium_channel_link');
  
  // Create default funnel
  const { rows } = await pool.query(`
    INSERT INTO funnels (
      slug, name, description, is_default, is_active,
      require_subscription_before_lesson, free_channel_id, free_channel_link,
      premium_channel_id, premium_channel_link,
      pitch_after_lesson, pitch_text, pitch_video_file_id, pitch_image_file_id, pitch_delay_hours,
      sales_pitch, sales_delay_hours, soft_attack_text, soft_attack_delay_hours, congrats_text
    ) VALUES (
      'default', 'Asosiy Varonka', 'Mavjud tizimdan ko''chirilgan', true, true,
      $1, $2, $3, $4, $5,
      4, $6, $7, $8, $9,
      $10, $11, $12, $13, $14
    ) RETURNING *
  `, [
    parseInt(requireSub) || 0, freeChannelId || '', freeChannelLink || '',
    premiumChannelId || '', premiumChannelLink || '',
    pitch.text || '', pitch.video_file_id || null, pitch.image_file_id || null, pitch.delay_hours || 2,
    salesPitch || '', parseInt(salesDelay) || 1, softAttack || '', parseInt(softDelay) || 24,
    congrats || '🎉 Tabriklayman!'
  ]);
  
  const funnel = rows[0];
  console.log('Created default funnel:', funnel.id);
  
  // Copy existing lessons
  const lessons = await getAllLessons();
  for (const lesson of lessons) {
    await pool.query(`
      INSERT INTO funnel_lessons (funnel_id, lesson_number, title, content, video_file_id, image_file_id, audio_file_id, delay_hours, show_watched_button, watched_button_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (funnel_id, lesson_number) DO NOTHING
    `, [funnel.id, lesson.lesson_number, lesson.title, lesson.content, lesson.video_file_id, lesson.image_file_id, lesson.audio_file_id, lesson.delay_hours, lesson.show_watched_button, lesson.watched_button_text]);
  }
  console.log('Copied', lessons.length, 'lessons');
  
  // Copy existing custdev questions
  const custdev = await getAllCustDevQuestions();
  for (const q of custdev) {
    await pool.query(`
      INSERT INTO funnel_custdev (funnel_id, step, after_lesson, question_text, question_type, options, field_name, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [funnel.id, q.step || 1, q.after_lesson || 1, q.question_text, q.question_type, q.options, q.field_name, q.sort_order || 0]);
  }
  console.log('Copied', custdev.length, 'custdev questions');
  
  // Copy existing subscription plans
  const plans = await getSubscriptionPlans();
  for (const plan of plans) {
    await pool.query(`
      INSERT INTO funnel_plans (funnel_id, plan_id, name, duration_days, price, discount_percent, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (funnel_id, plan_id) DO NOTHING
    `, [funnel.id, plan.id, plan.name, plan.duration_days, plan.price, plan.discount_percent || 0, plan.sort_order || 0]);
  }
  console.log('Copied', plans.length, 'subscription plans');
  
  // Assign existing users to default funnel
  const { rowCount } = await pool.query(`
    INSERT INTO user_funnels (telegram_id, funnel_id, current_lesson, custdev_step, status)
    SELECT telegram_id, $1, current_lesson, custdev_step, 
           CASE WHEN is_paid THEN 'paid' ELSE 'active' END
    FROM users
    ON CONFLICT (telegram_id, funnel_id) DO NOTHING
  `, [funnel.id]);
  console.log('Assigned', rowCount, 'users to default funnel');
  
  return funnel;
}
