# 🔧 Tuzatilgan Loyiha + Flow Builder Reja

## ✅ Tuzatilgan xatolar:

### 1. server.js - Dublikat API o'chirildi
- **Muammo:** `/api/settings/channel` ikki marta aniqlangan edi (734-755 va 833-855 qatorlarda)
- **Yechim:** Ikkinchi dublikat o'chirildi

---

## 🚀 FLOW BUILDER - ChatPlace uslubida

### Konsept:
Vizual interfeys orqali xohlagan voronkalarni tuzish:
- Drag & Drop node'lar
- Node'larni ulash (connection)
- Real-time preview
- Analytics

### Node turlari:

| Node | Emoji | Vazifasi |
|------|-------|----------|
| Trigger | ⚡ | Flow ni boshlaydi (/start, button, lesson) |
| Message | 📧 | Xabar yuboradi (text, media, buttons) |
| Delay | ⏱️ | Kutish (1 soat, 1 kun, etc) |
| Condition | ❓ | Shart tekshiradi (paid?, lesson?, etc) |
| Action | 🎯 | Harakat (subscribe, tag, kick) |
| Split | 🔀 | A/B test |

### Database Schema:

```sql
-- Voronkalar ro'yxati
CREATE TABLE funnels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  trigger_type VARCHAR(50), -- 'command', 'button', 'lesson_complete', 'payment'
  trigger_value VARCHAR(255), -- '/start', 'btn_xxx', '4', etc
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Voronka ichidagi node'lar
CREATE TABLE funnel_nodes (
  id SERIAL PRIMARY KEY,
  funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE,
  node_type VARCHAR(50) NOT NULL, -- 'trigger', 'message', 'delay', 'condition', 'action'
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  -- config misollari:
  -- message: {"text": "Salom!", "media_id": null, "buttons": [...]}
  -- delay: {"hours": 1, "minutes": 0}
  -- condition: {"field": "is_paid", "operator": "==", "value": true}
  -- action: {"type": "subscribe", "plan_id": "1month"}
  created_at TIMESTAMP DEFAULT NOW()
);

-- Node'lar orasidagi bog'lanishlar
CREATE TABLE funnel_connections (
  id SERIAL PRIMARY KEY,
  funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE,
  from_node_id INTEGER REFERENCES funnel_nodes(id) ON DELETE CASCADE,
  to_node_id INTEGER REFERENCES funnel_nodes(id) ON DELETE CASCADE,
  connection_type VARCHAR(50) DEFAULT 'default', -- 'default', 'yes', 'no', 'timeout', 'button_1', etc
  UNIQUE(from_node_id, to_node_id, connection_type)
);

-- Foydalanuvchi qaysi flow'da qaysi node'da turganini saqlash
CREATE TABLE user_flow_state (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  funnel_id INTEGER REFERENCES funnels(id),
  current_node_id INTEGER REFERENCES funnel_nodes(id),
  variables JSONB DEFAULT '{}', -- dynamic variables for this user
  started_at TIMESTAMP DEFAULT NOW(),
  last_node_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(telegram_id, funnel_id)
);

-- Flow analytics
CREATE TABLE funnel_analytics (
  id SERIAL PRIMARY KEY,
  funnel_id INTEGER REFERENCES funnels(id),
  node_id INTEGER REFERENCES funnel_nodes(id),
  telegram_id BIGINT,
  event_type VARCHAR(50), -- 'entered', 'completed', 'dropped', 'converted'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints:

```
# Funnels CRUD
GET    /api/funnels              - Barcha voronkalar
POST   /api/funnels              - Yangi voronka
GET    /api/funnels/:id          - Bitta voronka (nodes bilan)
PUT    /api/funnels/:id          - Voronka yangilash
DELETE /api/funnels/:id          - O'chirish
PUT    /api/funnels/:id/activate - Faollashtirish/O'chirish

# Nodes CRUD
POST   /api/funnels/:id/nodes              - Yangi node
PUT    /api/funnels/:id/nodes/:nodeId      - Node yangilash
DELETE /api/funnels/:id/nodes/:nodeId      - O'chirish

# Connections
POST   /api/funnels/:id/connections        - Yangi ulanish
DELETE /api/funnels/:id/connections/:connId - O'chirish

# Analytics
GET    /api/funnels/:id/analytics          - Voronka statistikasi
```

### Frontend (admin.html ga qo'shiladi):

1. **Funnel List** - barcha voronkalar ro'yxati
2. **Flow Builder** - Canvas + Nodes + Connections
3. **Node Editor** - Har bir node uchun modal
4. **Preview** - Flow qanday ishlashini ko'rish
5. **Analytics** - Har bir node statistikasi

---

## 📋 Keyingi qadamlar:

1. [ ] Database jadvallarini qo'shish
2. [ ] API endpointlarini yozish
3. [ ] Flow Engine (node'larni bajarish logikasi)
4. [ ] Frontend Flow Builder
5. [ ] Drag & Drop
6. [ ] Real-time preview
7. [ ] Analytics dashboard

---

## ⏰ Taxminiy vaqt:

- Database + API: 2-3 soat
- Flow Engine: 3-4 soat
- Frontend Builder: 5-6 soat
- Total: ~12 soat ish

Bu katta loyiha! Boshlashga tayyormisiz?
