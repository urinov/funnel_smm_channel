'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Skeleton from '@mui/material/Skeleton'
import { styled, useTheme } from '@mui/material/styles'
import { Card } from '@/components/ui'
import { TrendingUp } from 'lucide-react'

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const ChartHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
  flexWrap: 'wrap',
  gap: 16,
}))

const TotalRevenue = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}))

const RevenueIcon = styled(Box)(({ theme }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  backgroundColor: 'rgba(16, 185, 129, 0.1)',
  color: '#10B981',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    },
  },
}))

type Period = '7d' | '30d' | '90d' | '1y'

const chartDataByPeriod: Record<Period, { categories: string[]; revenue: number[]; subscriptions: number[] }> = {
  '7d': {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    revenue: [120000, 180000, 150000, 280000, 220000, 310000, 190000],
    subscriptions: [3, 5, 4, 8, 6, 9, 5],
  },
  '30d': {
    categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    revenue: [850000, 1200000, 980000, 1350000],
    subscriptions: [22, 31, 26, 35],
  },
  '90d': {
    categories: ['Jan', 'Feb', 'Mar'],
    revenue: [3200000, 4100000, 4800000],
    subscriptions: [85, 108, 127],
  },
  '1y': {
    categories: ['Q1', 'Q2', 'Q3', 'Q4'],
    revenue: [9500000, 12200000, 15800000, 18500000],
    subscriptions: [280, 360, 425, 510],
  },
}

export default function RevenueChart() {
  const theme = useTheme()
  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(false)

  const data = chartDataByPeriod[period]
  const totalRevenue = data.revenue.reduce((a, b) => a + b, 0)
  const totalSubscriptions = data.subscriptions.reduce((a, b) => a + b, 0)

  const handlePeriodChange = (_: React.MouseEvent<HTMLElement>, newPeriod: Period | null) => {
    if (newPeriod) {
      setLoading(true)
      setTimeout(() => {
        setPeriod(newPeriod)
        setLoading(false)
      }, 300)
    }
  }

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 500,
      },
    },
    colors: ['#6366F1', '#10B981'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: data.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontSize: '12px',
        },
      },
    },
    yaxis: [
      {
        title: { text: 'Revenue (UZS)' },
        labels: {
          formatter: (val) => `${(val / 1000000).toFixed(1)}M`,
          style: {
            colors: theme.palette.text.secondary,
            fontSize: '12px',
          },
        },
      },
      {
        opposite: true,
        title: { text: 'Subscriptions' },
        labels: {
          style: {
            colors: theme.palette.text.secondary,
            fontSize: '12px',
          },
        },
      },
    ],
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: theme.palette.text.primary,
      },
      markers: {
        radius: 4,
      },
    },
    tooltip: {
      theme: theme.palette.mode,
      y: [
        {
          formatter: (val) =>
            new Intl.NumberFormat('uz-UZ', {
              style: 'currency',
              currency: 'UZS',
              minimumFractionDigits: 0,
            }).format(val),
        },
        {
          formatter: (val) => `${val} subscriptions`,
        },
      ],
    },
  }

  const series = [
    { name: 'Revenue', data: data.revenue },
    { name: 'Subscriptions', data: data.subscriptions },
  ]

  return (
    <Card title="Revenue Overview" padding="md">
      <ChartHeader>
        <TotalRevenue>
          <RevenueIcon>
            <TrendingUp size={24} />
          </RevenueIcon>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Revenue
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              fontFamily='"JetBrains Mono", monospace'
            >
              {new Intl.NumberFormat('uz-UZ', {
                style: 'currency',
                currency: 'UZS',
                minimumFractionDigits: 0,
              }).format(totalRevenue)}
            </Typography>
          </Box>
        </TotalRevenue>

        <StyledToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
        >
          <ToggleButton value="7d">7 Days</ToggleButton>
          <ToggleButton value="30d">30 Days</ToggleButton>
          <ToggleButton value="90d">90 Days</ToggleButton>
          <ToggleButton value="1y">1 Year</ToggleButton>
        </StyledToggleButtonGroup>
      </ChartHeader>

      {loading ? (
        <Skeleton variant="rounded" height={300} />
      ) : (
        <Box sx={{ height: 300 }}>
          <ApexChart options={chartOptions} series={series} type="area" height="100%" />
        </Box>
      )}
    </Card>
  )
}
