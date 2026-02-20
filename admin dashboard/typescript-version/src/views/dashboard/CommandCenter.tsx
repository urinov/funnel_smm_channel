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
  Sparkles,
} from 'lucide-react'

import { StatCard } from '@/components/ui'
import LivePulse from './LivePulse'
import RevenueChart from './RevenueChart'
import RecentTransactions from './RecentTransactions'
import ActionQueue from './ActionQueue'
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

const PageHeader = styled(Box)(() => ({
  marginBottom: 40,
  opacity: 0,
  animation: `${fadeInUp} 0.5s ease-out forwards`,
}))

const WelcomeContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginBottom: 8,
}))

const WelcomeIcon = styled(Box)(() => ({
  width: 48,
  height: 48,
  borderRadius: 14,
  background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#FFFFFF',
  boxShadow: '0 4px 16px rgba(224, 122, 95, 0.3)',
}))

const WelcomeText = styled(Typography)(() => ({
  fontSize: '2.25rem',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
}))

const SubtitleText = styled(Typography)(() => ({
  fontSize: '1.125rem',
  color: '#6B7280',
  fontWeight: 500,
  paddingLeft: 64,
}))

const SectionTitle = styled(Typography)(() => ({
  fontSize: '1.375rem',
  fontWeight: 700,
  color: '#1A1A2E',
  marginBottom: 24,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  opacity: 0,
  animation: `${fadeInUp} 0.5s ease-out 0.2s forwards`,
}))

const SectionDot = styled(Box)<{ color?: string }>(({ color = '#E07A5F' }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: color,
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

  return (
    <Box>
      <PageHeader>
        <WelcomeContainer>
          <WelcomeIcon>
            <Sparkles size={26} />
          </WelcomeIcon>
          <WelcomeText>Boshqaruv Markazi</WelcomeText>
        </WelcomeContainer>
        <SubtitleText>
          Bot ishlashi va asosiy ko'rsatkichlarning real-vaqt ko'rinishi
        </SubtitleText>
      </PageHeader>

      {/* Live Pulse Section */}
      <Box sx={{ mb: 5 }}>
        <LivePulse />
      </Box>

      {/* Key Metrics Grid */}
      <SectionTitle>
        <SectionDot color="#E07A5F" />
        Asosiy Ko'rsatkichlar
      </SectionTitle>
      <Grid container spacing={3} sx={{ mb: 5 }}>
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

      {/* Quick Action Cards */}
      <SectionTitle sx={{ animationDelay: '0.3s' }}>
        <SectionDot color="#22C55E" />
        Tezkor Amallar
      </SectionTitle>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Kutilayotgan Xabarlar"
            value={loading ? '...' : stats?.pendingMessages || 0}
            subtitle="Javob kutmoqda"
            icon={<MessageSquare />}
            iconColor="danger"
            loading={loading}
            onClick={() => console.log('Go to messages')}
            delay={240}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Yaqinda Tugaydi"
            value={loading ? '...' : stats?.expiringSubscriptions || 0}
            subtitle="3 kun ichida"
            icon={<Clock />}
            iconColor="warning"
            loading={loading}
            onClick={() => console.log('View expiring')}
            delay={300}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Bugungi Daromad"
            value={loading ? '...' : formatCurrency(stats?.todayRevenue || 0)}
            subtitle="Bugungi holatda"
            icon={<CreditCard />}
            iconColor="success"
            loading={loading}
            delay={360}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Bugun Yangi Userlar"
            value={loading ? '...' : stats?.todayNewUsers || 0}
            subtitle="Bugun qo'shilgan"
            icon={<UserPlus />}
            iconColor="primary"
            loading={loading}
            delay={420}
          />
        </Grid>
      </Grid>

      {/* Charts and Tables Row */}
      <SectionTitle sx={{ animationDelay: '0.4s' }}>
        <SectionDot color="#3B82F6" />
        Analitika Ko'rinishi
      </SectionTitle>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} lg={8}>
          <RevenueChart />
        </Grid>
        <Grid item xs={12} lg={4}>
          <ConversionFunnel />
        </Grid>
      </Grid>

      {/* Bottom Row */}
      <SectionTitle sx={{ animationDelay: '0.5s' }}>
        <SectionDot color="#E8B931" />
        So'nggi Faoliyat
      </SectionTitle>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <RecentTransactions />
        </Grid>
        <Grid item xs={12} lg={5}>
          <ActionQueue />
        </Grid>
      </Grid>
    </Box>
  )
}
