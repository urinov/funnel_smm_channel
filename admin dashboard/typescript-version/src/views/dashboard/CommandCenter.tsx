'use client'

import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Clock,
  CreditCard,
  UserPlus,
} from 'lucide-react'

import { StatCard } from '@/components/ui'
import { useStats } from '@/hooks'
import LivePulse from './LivePulse'
import RevenueChart from './RevenueChart'
import RecentTransactions from './RecentTransactions'
import ActionQueue from './ActionQueue'
import ConversionFunnel from './ConversionFunnel'

const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: 32,
}))

const WelcomeText = styled(Typography)(({ theme }) => ({
  fontSize: '1.75rem',
  fontWeight: 700,
  marginBottom: 4,
  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}))

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.125rem',
  fontWeight: 600,
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
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
      await new Promise((resolve) => setTimeout(resolve, 1000))
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
        <WelcomeText>Command Center</WelcomeText>
        <Typography variant="body1" color="text.secondary">
          Real-time overview of your bot performance and key metrics
        </Typography>
      </PageHeader>

      {/* Live Pulse Section */}
      <Box sx={{ mb: 4 }}>
        <LivePulse />
      </Box>

      {/* Key Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Users"
            value={loading ? '...' : formatNumber(stats?.totalUsers || 0)}
            subtitle="All registered users"
            trend={stats ? { value: stats.trends.users, label: 'vs last month' } : undefined}
            icon={<Users />}
            iconColor="primary"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Active Subscribers"
            value={loading ? '...' : formatNumber(stats?.activeSubscribers || 0)}
            subtitle="Paid members"
            trend={stats ? { value: stats.trends.subscribers, label: 'vs last month' } : undefined}
            icon={<UserCheck />}
            iconColor="success"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Monthly Revenue"
            value={loading ? '...' : formatCurrency(stats?.monthlyRevenue || 0)}
            subtitle="This month"
            trend={stats ? { value: stats.trends.revenue, label: 'vs last month' } : undefined}
            icon={<DollarSign />}
            iconColor="warning"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Conversion Rate"
            value={loading ? '...' : `${stats?.conversionRate || 0}%`}
            subtitle="Users to paid"
            trend={{ value: 2.3, label: 'vs last month' }}
            icon={<TrendingUp />}
            iconColor="info"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Quick Action Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Pending Messages"
            value={loading ? '...' : stats?.pendingMessages || 0}
            subtitle="Awaiting response"
            icon={<MessageSquare />}
            iconColor="danger"
            loading={loading}
            onClick={() => console.log('Go to messages')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Expiring Soon"
            value={loading ? '...' : stats?.expiringSubscriptions || 0}
            subtitle="In next 3 days"
            icon={<Clock />}
            iconColor="warning"
            loading={loading}
            onClick={() => console.log('View expiring')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Today's Revenue"
            value={loading ? '...' : formatCurrency(stats?.todayRevenue || 0)}
            subtitle="Today so far"
            icon={<CreditCard />}
            iconColor="success"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="New Users Today"
            value={loading ? '...' : stats?.todayNewUsers || 0}
            subtitle="Joined today"
            icon={<UserPlus />}
            iconColor="primary"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Charts and Tables Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <RevenueChart />
        </Grid>
        <Grid item xs={12} lg={4}>
          <ConversionFunnel />
        </Grid>
      </Grid>

      {/* Bottom Row */}
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
