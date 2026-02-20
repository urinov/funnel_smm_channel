'use client'

import { useState, useEffect } from 'react'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { styled, keyframes } from '@mui/material/styles'
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Clock,
  CreditCard,
  UserPlus,
  BookOpen,
  Calendar,
  ArrowRight,
} from 'lucide-react'

import { StatCard, Card } from '@/components/ui'
import HeroBanner from './HeroBanner'
import RevenueChart from './RevenueChart'
import RecentTransactions from './RecentTransactions'
import ConversionFunnel from './ConversionFunnel'

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const SectionTitle = styled(Typography)(() => ({
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#1A1A2E',
  marginBottom: 20,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  opacity: 0,
  animation: `${fadeInUp} 0.5s ease-out 0.2s forwards`,
}))

const SectionDot = styled(Box)<{ color?: string }>(({ color = '#6366F1' }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: color,
}))

const QuickActionCard = styled(Box)(() => ({
  padding: 24,
  borderRadius: 20,
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(0, 0, 0, 0.04)',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
  cursor: 'pointer',
  transition: 'all 300ms ease',
  display: 'flex',
  alignItems: 'center',
  gap: 16,

  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(99, 102, 241, 0.12)',
    borderColor: '#6366F1',
  },
}))

const QuickActionIcon = styled(Box)<{ gradient: string }>(({ gradient }) => ({
  width: 52,
  height: 52,
  borderRadius: 14,
  background: gradient,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#FFFFFF',
  flexShrink: 0,
}))

const CalendarCard = styled(Box)(() => ({
  padding: 24,
  borderRadius: 24,
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(0, 0, 0, 0.04)',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
}))

const CalendarDay = styled(Box)<{ isToday?: boolean; hasEvent?: boolean }>(({ isToday, hasEvent }) => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.875rem',
  fontWeight: isToday ? 700 : 500,
  color: isToday ? '#FFFFFF' : '#6B7280',
  backgroundColor: isToday ? '#6366F1' : 'transparent',
  position: 'relative',
  cursor: 'pointer',
  transition: 'all 200ms ease',

  '&:hover': {
    backgroundColor: isToday ? '#6366F1' : '#F5F3FF',
  },

  '&::after': hasEvent ? {
    content: '""',
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: '50%',
    backgroundColor: isToday ? '#FFFFFF' : '#F472B6',
  } : {},
}))

interface DashboardStats {
  totalUsers: number
  activeSubscribers: number
  monthlyRevenue: number
  todayRevenue: number
  pendingMessages: number
  expiringSubscriptions: number
  todayNewUsers: number
  conversionRate: number
  trends: {
    users: number
    subscribers: number
    revenue: number
    messages: number
  }
}

const mockStats: DashboardStats = {
  totalUsers: 2847,
  activeSubscribers: 412,
  monthlyRevenue: 15420000,
  todayRevenue: 890000,
  pendingMessages: 7,
  expiringSubscriptions: 12,
  todayNewUsers: 23,
  conversionRate: 14.5,
  trends: {
    users: 12.5,
    subscribers: 8.3,
    revenue: 15.2,
    messages: -5,
  },
}

const quickActions = [
  {
    id: 1,
    title: 'Yangi dars qo\'shish',
    subtitle: 'Kontent yarating',
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  },
  {
    id: 2,
    title: 'Xabarlarni ko\'rish',
    subtitle: '7 ta kutmoqda',
    icon: MessageSquare,
    gradient: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)',
  },
  {
    id: 3,
    title: 'Tranzaksiyalar',
    subtitle: 'Bugungi sotuvlar',
    icon: CreditCard,
    gradient: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
  },
]

export default function CommandCenter() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchStats = async () => {
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 800))
      setStats(mockStats)
      setLoading(false)
    }

    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Generate calendar days
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const day = i - firstDay + 1
    if (day < 1 || day > daysInMonth) return null
    return day
  })

  return (
    <Box>
      {/* Hero Banner */}
      <HeroBanner
        userName="Admin"
        totalUsers={stats?.totalUsers || 0}
        todayGrowth={stats?.trends.users || 0}
        activeNow={142}
      />

      {/* Key Metrics Grid */}
      <SectionTitle>
        <SectionDot color="#6366F1" />
        Asosiy Ko'rsatkichlar
      </SectionTitle>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Jami Foydalanuvchilar"
            value={loading ? '...' : formatNumber(stats?.totalUsers || 0)}
            subtitle="Ro'yxatdan o'tgan"
            trend={stats ? { value: stats.trends.users, label: "o'tgan oyga nisbatan" } : undefined}
            icon={<Users />}
            iconColor="primary"
            loading={loading}
            delay={0}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Faol Obunachilar"
            value={loading ? '...' : formatNumber(stats?.activeSubscribers || 0)}
            subtitle="Pullik a'zolar"
            trend={stats ? { value: stats.trends.subscribers, label: "o'tgan oyga nisbatan" } : undefined}
            icon={<UserCheck />}
            iconColor="success"
            loading={loading}
            delay={60}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Oylik Daromad"
            value={loading ? '...' : formatCurrency(stats?.monthlyRevenue || 0)}
            subtitle="Joriy oy"
            trend={stats ? { value: stats.trends.revenue, label: "o'tgan oyga nisbatan" } : undefined}
            icon={<DollarSign />}
            iconColor="warning"
            loading={loading}
            delay={120}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Konversiya Darajasi"
            value={loading ? '...' : `${stats?.conversionRate || 0}%`}
            subtitle="Userdan pullikka"
            trend={{ value: 2.3, label: "o'tgan oyga nisbatan" }}
            icon={<TrendingUp />}
            iconColor="info"
            loading={loading}
            delay={180}
          />
        </Grid>
      </Grid>

      {/* Quick Actions & Calendar Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <SectionTitle sx={{ animationDelay: '0.3s' }}>
            <SectionDot color="#F472B6" />
            Tezkor Amallar
          </SectionTitle>
          <Grid container spacing={2}>
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Grid item xs={12} sm={4} key={action.id}>
                  <QuickActionCard>
                    <QuickActionIcon gradient={action.gradient}>
                      <Icon size={24} />
                    </QuickActionIcon>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1A1A2E', mb: 0.25 }}>
                        {action.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF', fontWeight: 500 }}>
                        {action.subtitle}
                      </Typography>
                    </Box>
                    <ArrowRight size={20} color="#9CA3AF" />
                  </QuickActionCard>
                </Grid>
              )
            })}
          </Grid>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionTitle sx={{ animationDelay: '0.3s' }}>
            <SectionDot color="#22C55E" />
            Kalendar
          </SectionTitle>
          <CalendarCard>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1A1A2E' }}>
                {today.toLocaleString('uz-UZ', { month: 'long', year: 'numeric' })}
              </Typography>
              <Calendar size={20} color="#6366F1" />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 2 }}>
              {['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'].map((day) => (
                <Typography
                  key={day}
                  sx={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#9CA3AF',
                    py: 1,
                  }}
                >
                  {day}
                </Typography>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
              {calendarDays.map((day, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
                  {day && (
                    <CalendarDay
                      isToday={day === today.getDate()}
                      hasEvent={[5, 12, 18, 25].includes(day)}
                    >
                      {day}
                    </CalendarDay>
                  )}
                </Box>
              ))}
            </Box>
          </CalendarCard>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <SectionTitle sx={{ animationDelay: '0.4s' }}>
        <SectionDot color="#3B82F6" />
        Analitika Ko'rinishi
      </SectionTitle>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <RevenueChart />
        </Grid>
        <Grid item xs={12} lg={4}>
          <ConversionFunnel />
        </Grid>
      </Grid>

      {/* Bottom Row */}
      <SectionTitle sx={{ animationDelay: '0.5s' }}>
        <SectionDot color="#F59E0B" />
        So'nggi Faoliyat
      </SectionTitle>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <RecentTransactions />
        </Grid>
      </Grid>
    </Box>
  )
}
