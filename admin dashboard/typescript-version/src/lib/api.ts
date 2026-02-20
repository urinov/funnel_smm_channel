// API Client - Funnel SMM Channel Admin
// Connects frontend to Express backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ApiResponse<T> {
  data: T
  error?: string
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private telegramInitData: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setTelegramInitData(initData: string) {
    this.telegramInitData = initData
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    // Add Telegram WebApp auth if available
    if (this.telegramInitData) {
      requestHeaders['X-Telegram-Init-Data'] = this.telegramInitData
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error)
      return {
        data: null as T,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ============ STATS & ANALYTICS ============

  async getStats() {
    return this.request<{
      totalUsers: number
      paidUsers: number
      todayUsers: number
      todayRevenue: number
      monthlyRevenue: number
      conversionRate: number
      activeSubscriptions: number
      expiringSubscriptions: number
    }>('/api/stats')
  }

  async getAnalytics(type: 'subscriptions' | 'buyers' | 'sources' | 'segments' | 'referrals') {
    return this.request(`/api/analytics/${type}`)
  }

  async getPaymentFriction() {
    return this.request('/api/analytics/payment-friction')
  }

  async getInactivityAnalysis() {
    return this.request('/api/analytics/inactivity')
  }

  // ============ USERS ============

  async getUsers() {
    return this.request<Array<{
      telegram_id: string
      first_name: string
      last_name?: string
      username?: string
      phone?: string
      is_paid: boolean
      is_blocked: boolean
      funnel_step: string
      current_lesson: number
      subscription_end?: string
      source?: string
      created_at: string
      last_active?: string
    }>>('/api/users')
  }

  async getUser(telegramId: string) {
    return this.request(`/api/users/${telegramId}`)
  }

  async updateUser(telegramId: string, data: { is_paid?: boolean; is_blocked?: boolean }) {
    return this.request(`/api/users/${telegramId}`, {
      method: 'PATCH',
      body: data,
    })
  }

  async deleteUser(telegramId: string) {
    return this.request(`/api/users/${telegramId}`, { method: 'DELETE' })
  }

  async getUserCustdev(telegramId: string) {
    return this.request(`/api/users/${telegramId}/custdev`)
  }

  // ============ CONVERSATIONS ============

  async getConversations() {
    return this.request<Array<{
      telegram_id: string
      first_name: string
      last_name?: string
      username?: string
      is_paid: boolean
      last_message: string
      last_message_time: string
      unread_count: number
    }>>('/api/conversations')
  }

  async getConversation(telegramId: string) {
    return this.request<{
      user: {
        telegram_id: string
        first_name: string
        username?: string
        is_paid: boolean
      }
      messages: Array<{
        id: string
        content: string
        type: 'incoming' | 'outgoing'
        timestamp: string
      }>
    }>(`/api/conversations/${telegramId}`)
  }

  async replyToConversation(telegramId: string, message: string) {
    return this.request(`/api/conversations/${telegramId}/reply`, {
      method: 'POST',
      body: { message },
    })
  }

  // ============ LESSONS ============

  async getLessons() {
    return this.request<Array<{
      id: number
      lesson_number: number
      content: string
      media_type?: string
      media_url?: string
      delay_hours: number
      has_watched_button: boolean
      is_active: boolean
    }>>('/api/lessons')
  }

  async createLesson(lesson: {
    content: string
    media_type?: string
    media_url?: string
    delay_hours: number
    has_watched_button: boolean
  }) {
    return this.request('/api/lessons', { method: 'POST', body: lesson })
  }

  async updateLesson(id: number, lesson: Partial<{
    content: string
    media_type?: string
    media_url?: string
    delay_hours: number
    has_watched_button: boolean
  }>) {
    return this.request(`/api/lessons/${id}`, { method: 'PUT', body: lesson })
  }

  async deleteLesson(id: number) {
    return this.request(`/api/lessons/${id}`, { method: 'DELETE' })
  }

  // ============ CUSTDEV ============

  async getCustdevQuestions() {
    return this.request<Array<{
      id: number
      question: string
      field_name?: string
      is_active: boolean
      order_num: number
    }>>('/api/custdev')
  }

  async createCustdevQuestion(question: { question: string; field_name?: string }) {
    return this.request('/api/custdev', { method: 'POST', body: question })
  }

  async updateCustdevQuestion(id: number, question: { question?: string; field_name?: string; is_active?: boolean }) {
    return this.request(`/api/custdev/${id}`, { method: 'PUT', body: question })
  }

  async deleteCustdevQuestion(id: number) {
    return this.request(`/api/custdev/${id}`, { method: 'DELETE' })
  }

  async getCustdevAnswers() {
    return this.request('/api/custdev/answers')
  }

  // ============ PITCH ============

  async getPitch() {
    return this.request<Array<{
      id: number
      content: string
      media_type?: string
      media_url?: string
      delay_after_lesson_hours: number
      order_num: number
    }>>('/api/pitch')
  }

  async updatePitch(pitches: Array<{
    content: string
    media_type?: string
    media_url?: string
    delay_after_lesson_hours: number
    order_num: number
  }>) {
    return this.request('/api/pitch', { method: 'PUT', body: { pitches } })
  }

  // ============ PAYMENTS ============

  async getPayments() {
    return this.request<Array<{
      id: number
      telegram_id: string
      order_id: string
      amount: number
      state: string
      payment_method: string
      plan_id?: number
      created_at: string
      performed_at?: string
      user_name?: string
    }>>('/api/payments/debug')
  }

  // ============ SUBSCRIPTION PLANS ============

  async getSubscriptionPlans() {
    return this.request<Array<{
      id: number
      name: string
      duration_days: number
      price: number
      discount_percent: number
      is_active: boolean
      sort_order: number
    }>>('/api/subscription-plans')
  }

  async updateSubscriptionPlan(id: number, plan: Partial<{
    name: string
    duration_days: number
    price: number
    discount_percent: number
    is_active: boolean
    sort_order: number
  }>) {
    return this.request(`/api/subscription-plans/${id}`, { method: 'PUT', body: plan })
  }

  // ============ PROMO CODES ============

  async getPromoCodes() {
    return this.request<Array<{
      id: number
      code: string
      discount_percent: number
      max_uses?: number
      current_uses: number
      expires_at?: string
      is_active: boolean
      created_at: string
    }>>('/api/promo-codes')
  }

  async createPromoCode(promo: {
    code: string
    discount_percent: number
    max_uses?: number
    expires_at?: string
  }) {
    return this.request('/api/promo-codes', { method: 'POST', body: promo })
  }

  async updatePromoCode(id: number, promo: Partial<{
    discount_percent: number
    max_uses?: number
    expires_at?: string
    is_active: boolean
  }>) {
    return this.request(`/api/promo-codes/${id}`, { method: 'PUT', body: promo })
  }

  async deletePromoCode(id: number) {
    return this.request(`/api/promo-codes/${id}`, { method: 'DELETE' })
  }

  async getPromoCodeStats(id: number) {
    return this.request(`/api/promo-codes/${id}/stats`)
  }

  // ============ FUNNELS ============

  async getFunnels() {
    return this.request<Array<{
      id: number
      name: string
      description?: string
      is_default: boolean
      is_active: boolean
      channel_id?: string
      channel_link?: string
      created_at: string
    }>>('/api/funnels')
  }

  async getFunnel(id: number) {
    return this.request(`/api/funnels/${id}`)
  }

  async createFunnel(funnel: { name: string; description?: string }) {
    return this.request('/api/funnels', { method: 'POST', body: funnel })
  }

  async updateFunnel(id: number, funnel: Partial<{
    name: string
    description?: string
    is_active: boolean
    channel_id?: string
    channel_link?: string
  }>) {
    return this.request(`/api/funnels/${id}`, { method: 'PUT', body: funnel })
  }

  async deleteFunnel(id: number) {
    return this.request(`/api/funnels/${id}`, { method: 'DELETE' })
  }

  async setDefaultFunnel(id: number) {
    return this.request(`/api/funnels/${id}/set-default`, { method: 'POST' })
  }

  async getFunnelStats(id: number) {
    return this.request(`/api/funnels/${id}/stats`)
  }

  async getFunnelUsers(id: number) {
    return this.request(`/api/funnels/${id}/users`)
  }

  async getFunnelPayments(id: number) {
    return this.request(`/api/funnels/${id}/payments`)
  }

  // ============ SETTINGS ============

  async getSettings() {
    return this.request<Record<string, string>>('/api/settings')
  }

  async updateSetting(key: string, value: string) {
    return this.request(`/api/settings/${key}`, { method: 'PUT', body: { value } })
  }

  async getChannelLink() {
    return this.request<{ link: string }>('/api/settings/channel-link')
  }

  async updateChannelLink(link: string) {
    return this.request('/api/settings/channel-link', { method: 'PUT', body: { link } })
  }

  async getChannelId() {
    return this.request<{ channel_id: string }>('/api/settings/channel-id')
  }

  async updateChannelId(channelId: string) {
    return this.request('/api/settings/channel-id', { method: 'PUT', body: { channel_id: channelId } })
  }

  async getPrice() {
    return this.request<{ price: number }>('/api/settings/price')
  }

  async updatePrice(price: number) {
    return this.request('/api/settings/price', { method: 'PUT', body: { price } })
  }

  // ============ BROADCAST ============

  async sendBroadcast(message: {
    content: string
    media_type?: string
    media_url?: string
    target_filter?: 'all' | 'paid' | 'free' | 'blocked'
  }) {
    return this.request('/api/broadcast/advanced', { method: 'POST', body: message })
  }

  async sendTestBroadcast(message: { content: string; media_type?: string; media_url?: string }) {
    return this.request('/api/broadcast/test', { method: 'POST', body: message })
  }

  // ============ MEDIA ============

  async uploadMedia(file: File): Promise<ApiResponse<{ file_id: string; url: string }>> {
    const formData = new FormData()
    formData.append('media', file)

    try {
      const response = await fetch(`${this.baseUrl}/api/upload-media`, {
        method: 'POST',
        headers: this.telegramInitData
          ? { 'X-Telegram-Init-Data': this.telegramInitData }
          : {},
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      return {
        data: null as unknown as { file_id: string; url: string },
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  // ============ BOT INFO ============

  async getBotInfo() {
    return this.request<{
      username: string
      first_name: string
      can_read_all_group_messages: boolean
    }>('/api/bot-info')
  }

  // ============ AUDIT LOGS ============

  async getAuditLogs(params?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    const queryString = query.toString()
    return this.request(`/api/audit-logs${queryString ? `?${queryString}` : ''}`)
  }

  // ============ SUBSCRIPTION REMINDERS ============

  async getSubscriptionReminders() {
    return this.request<{
      reminder_10_days: string
      reminder_5_days: string
      reminder_3_days: string
      reminder_1_day: string
    }>('/api/subscription-reminders')
  }

  // ============ HEALTH CHECK ============

  async healthCheck() {
    return this.request<{ status: string; timestamp: string }>('/health')
  }
}

// Singleton instance
export const api = new ApiClient(API_BASE_URL)

// React hooks for data fetching
export function useApi() {
  return api
}

export default api
