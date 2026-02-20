'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { styled, useTheme } from '@mui/material/styles'
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  UserCheck,
  UserX,
  Clock,
  Repeat,
} from 'lucide-react'

import { Card, StatCard, Tabs, TabPanel, useTabs } from '@/components/ui'

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const PageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 32,
  flexWrap: 'wrap',
  gap: 16,
}))

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
  borderRadius: 10,
  padding: 4,

  '& .MuiToggleButton-root': {
    border: 'none',
    borderRadius: 8,
    padding: '6px 16px',
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.8125rem',
    color: theme.palette.text.secondary,

    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: '#FFFFFF',
    },
  },
}))

export default function AnalyticsPage() {
  const theme = useTheme()
  const [period, setPeriod] = useState('30d')
  const tabs = useTabs('overview')

  // Mock data for charts
  const userGrowthData = {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    data: [120, 280, 450, 680, 920, 1150],
  }

  const conversionData = {
    labels: ['Started', 'Lesson 1', 'Custdev', 'Pitch', 'Paid'],
    data: [100, 82, 54, 32, 15],
  }

  const revenueBySource = {
    labels: ['Instagram', 'Telegram', 'Direct', 'Referral', 'Other'],
    data: [35, 28, 18, 12, 7],
  }

  const lineChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#6366F1'],
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: userGrowthData.categories,
      labels: { style: { colors: theme.palette.text.secondary } },
    },
    yaxis: {
      labels: { style: { colors: theme.palette.text.secondary } },
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 4,
    },
    tooltip: { theme: theme.palette.mode },
  }

  const funnelChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: ['#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#10B981'],
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        borderRadius: 4,
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}%`,
      style: { colors: [theme.palette.text.primary] },
    },
    xaxis: {
      categories: conversionData.labels,
      labels: { style: { colors: theme.palette.text.secondary } },
    },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { theme: theme.palette.mode },
  }

  const pieChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut' },
    labels: revenueBySource.labels,
    colors: ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#94A3B8'],
    dataLabels: { enabled: false },
    legend: {
      position: 'bottom',
      labels: { colors: theme.palette.text.primary },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => '100%',
            },
          },
        },
      },
    },
    tooltip: { theme: theme.palette.mode },
  }

  return (
    <Box>
      <PageHeader>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deep insights into your bot performance and user behavior
          </Typography>
        </Box>
        <StyledToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => v && setPeriod(v)}
          size="small"
        >
          <ToggleButton value="7d">7 Days</ToggleButton>
          <ToggleButton value="30d">30 Days</ToggleButton>
          <ToggleButton value="90d">90 Days</ToggleButton>
          <ToggleButton value="1y">1 Year</ToggleButton>
        </StyledToggleButtonGroup>
      </PageHeader>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Users"
            value="2,847"
            trend={{ value: 12.5, label: 'vs last period' }}
            icon={<Users />}
            iconColor="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Conversion Rate"
            value="14.5%"
            trend={{ value: 2.3, label: 'vs last period' }}
            icon={<Target />}
            iconColor="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Avg. Revenue/User"
            value="$12.40"
            trend={{ value: 8.1, label: 'vs last period' }}
            icon={<DollarSign />}
            iconColor="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Retention Rate"
            value="68%"
            trend={{ value: -3.2, label: 'vs last period' }}
            icon={<Repeat />}
            iconColor="info"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card title="User Growth">
            <Box sx={{ height: 350 }}>
              <ApexChart
                options={lineChartOptions}
                series={[{ name: 'Users', data: userGrowthData.data }]}
                type="area"
                height="100%"
              />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card title="Traffic Sources">
            <Box sx={{ height: 350 }}>
              <ApexChart
                options={pieChartOptions}
                series={revenueBySource.data}
                type="donut"
                height="100%"
              />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card title="Conversion Funnel">
            <Box sx={{ height: 300 }}>
              <ApexChart
                options={funnelChartOptions}
                series={[{ name: 'Conversion', data: conversionData.data }]}
                type="bar"
                height="100%"
              />
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
