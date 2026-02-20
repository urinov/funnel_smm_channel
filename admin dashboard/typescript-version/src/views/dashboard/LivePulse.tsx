'use client'

import { useState, useEffect } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { styled, keyframes } from '@mui/material/styles'
import { Activity, Users, Zap, DollarSign } from 'lucide-react'

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`

const Container = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  padding: '16px 24px',
  borderRadius: 16,
  backgroundColor: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
  border: `1px solid ${theme.palette.divider}`,
  flexWrap: 'wrap',

  [theme.breakpoints.down('md')]: {
    gap: 16,
    padding: '16px',
  },
}))

const PulseIndicator = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}))

const PulseDot = styled(Box)(() => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: '#10B981',
  boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
  animation: `${pulse} 2s ease-in-out infinite`,
}))

const MetricItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  borderRadius: 10,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
}))

const MetricIcon = styled(Box)(({ theme }) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.primary.main,
  color: '#FFFFFF',

  '& svg': {
    width: 16,
    height: 16,
  },
}))

const MetricValue = styled(Typography)(() => ({
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 700,
  fontSize: '1.25rem',
  fontVariantNumeric: 'tabular-nums',
}))

interface LiveMetric {
  label: string
  value: number
  icon: React.ReactNode
  prefix?: string
  suffix?: string
}

export default function LivePulse() {
  const [metrics, setMetrics] = useState<LiveMetric[]>([
    { label: 'Online Users', value: 47, icon: <Users /> },
    { label: 'Active Sessions', value: 23, icon: <Activity /> },
    { label: 'Today Revenue', value: 890000, icon: <DollarSign />, prefix: '' },
    { label: 'Bot Actions', value: 156, icon: <Zap />, suffix: '/hr' },
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value:
            metric.label === 'Online Users'
              ? Math.max(30, metric.value + Math.floor(Math.random() * 5) - 2)
              : metric.label === 'Active Sessions'
              ? Math.max(10, metric.value + Math.floor(Math.random() * 3) - 1)
              : metric.label === 'Bot Actions'
              ? Math.max(100, metric.value + Math.floor(Math.random() * 10))
              : metric.value,
        }))
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const formatValue = (metric: LiveMetric) => {
    if (metric.label === 'Today Revenue') {
      return new Intl.NumberFormat('uz-UZ').format(metric.value)
    }

    return metric.value
  }

  return (
    <Container>
      <PulseIndicator>
        <PulseDot />
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          LIVE
        </Typography>
      </PulseIndicator>

      {metrics.map((metric, index) => (
        <MetricItem key={index}>
          <MetricIcon>{metric.icon}</MetricIcon>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {metric.label}
            </Typography>
            <MetricValue>
              {metric.prefix}
              {formatValue(metric)}
              {metric.suffix}
            </MetricValue>
          </Box>
        </MetricItem>
      ))}

      <Chip
        label="Real-time data"
        size="small"
        sx={{
          ml: 'auto',
          backgroundColor: 'success.main',
          color: 'white',
          fontWeight: 600,
          fontSize: '0.6875rem',
        }}
      />
    </Container>
  )
}
