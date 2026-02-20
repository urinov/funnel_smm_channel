'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Skeleton from '@mui/material/Skeleton'
import { styled, keyframes } from '@mui/material/styles'
import { TrendingUp } from 'lucide-react'

import { Card } from '@/components/ui'

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`

const ChartHeader = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
  flexWrap: 'wrap',
  gap: 16,
}))

const TotalRevenue = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
}))

const RevenueIcon = styled(Box)(() => ({
  width: 52,
  height: 52,
  borderRadius: 14,
  background: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
}))

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(() => ({
  backgroundColor: 'rgba(0, 0, 0, 0.04)',
  borderRadius: 12,
  padding: 4,

  '& .MuiToggleButton-root': {
    border: 'none',
    borderRadius: 10,
    padding: '8px 18px',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.8125rem',
    color: '#6B7280',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    transition: 'all 200ms ease',

    '&.Mui-selected': {
      background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(224, 122, 95, 0.3)',
      '&:hover': {
        background: 'linear-gradient(135deg, #D4654A 0%, #D1A62C 100%)',
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
  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(false)

  const data = chartDataByPeriod[period]
  const totalRevenue = data.revenue.reduce((a, b) => a + b, 0)

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
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 600,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    colors: ['#E07A5F', '#22C55E'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
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
          colors: '#9CA3AF',
          fontSize: '12px',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        },
      },
    },
    yaxis: [
      {
        title: {
          text: 'Revenue (UZS)',
          style: {
            color: '#9CA3AF',
            fontSize: '12px',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          },
        },
        labels: {
          formatter: (val) => `${(val / 1000000).toFixed(1)}M`,
          style: {
            colors: '#9CA3AF',
            fontSize: '12px',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          },
        },
      },
      {
        opposite: true,
        title: {
          text: 'Subscriptions',
          style: {
            color: '#9CA3AF',
            fontSize: '12px',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          },
        },
        labels: {
          style: {
            colors: '#9CA3AF',
            fontSize: '12px',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          },
        },
      },
    ],
    grid: {
      borderColor: 'rgba(0, 0, 0, 0.06)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 500,
      labels: {
        colors: '#1A1A2E',
      },
      markers: {
        radius: 4,
      },
    },
    tooltip: {
      theme: 'light',
      style: {
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      },
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
            <TrendingUp size={26} />
          </RevenueIcon>
          <Box>
            <Typography
              sx={{
                fontSize: '0.8125rem',
                color: '#9CA3AF',
                fontWeight: 500,
                marginBottom: 0.5,
              }}
            >
              Total Revenue
            </Typography>
            <Typography
              sx={{
                fontSize: '1.5rem',
                fontWeight: 800,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                color: '#1A1A2E',
                letterSpacing: '-0.02em',
              }}
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
        <Skeleton
          variant="rounded"
          height={300}
          sx={{ borderRadius: '12px' }}
        />
      ) : (
        <Box
          sx={{
            height: 300,
            animation: `${fadeIn} 0.4s ease-out`,
          }}
        >
          <ApexChart options={chartOptions} series={series} type="area" height="100%" />
        </Box>
      )}
    </Card>
  )
}
