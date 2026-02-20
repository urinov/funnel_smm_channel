'use client'

import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import { styled, keyframes } from '@mui/material/styles'
import { Users, DollarSign, BookOpen, MessageSquare, TrendingUp, TrendingDown, Calendar } from 'lucide-react'

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`

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

const Container = styled(Box)(() => ({
  background: '#FFFFFF',
  borderRadius: 24,
  padding: 32,
  border: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
  opacity: 0,
  animation: `${fadeInUp} 0.5s ease-out forwards`,
}))

const HeaderRow = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 32,
}))

const TitleSection = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
}))

const IconBox = styled(Box)(() => ({
  width: 48,
  height: 48,
  borderRadius: 14,
  background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#FFFFFF',
  boxShadow: '0 4px 12px rgba(224, 122, 95, 0.3)',
}))

const LiveIndicator = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 18px',
  borderRadius: 30,
  background: 'rgba(34, 197, 94, 0.1)',
  border: '1px solid rgba(34, 197, 94, 0.2)',
}))

const PulseDot = styled(Box)(() => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: '#22C55E',
  boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)',
  animation: `${pulse} 2s ease-in-out infinite`,
}))

const StatCard = styled(Box)<{ index: number }>(({ index }) => ({
  padding: 24,
  borderRadius: 18,
  backgroundColor: '#F8F6F3',
  border: '1px solid rgba(0, 0, 0, 0.04)',
  transition: 'all 300ms ease',
  opacity: 0,
  animation: `${fadeInUp} 0.4s ease-out ${100 + index * 80}ms forwards`,

  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
    borderColor: '#E07A5F',
  },
}))

const StatIcon = styled(Box)<{ color: string }>(({ color }) => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  background: `${color}15`,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
}))

const TrendBadge = styled(Box)<{ positive: boolean }>(({ positive }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 10px',
  borderRadius: 8,
  backgroundColor: positive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
  color: positive ? '#22C55E' : '#EF4444',
  fontSize: '0.875rem',
  fontWeight: 700,
  fontFamily: '"JetBrains Mono", monospace',
}))

interface TodayStat {
  label: string
  value: string | number
  subtext: string
  trend?: { value: number; label: string }
  icon: React.ReactNode
  color: string
}

export default function LivePulse() {
  const [stats, setStats] = useState<TodayStat[]>([
    {
      label: 'YANGI USERLAR',
      value: 32,
      subtext: 'kechaga nisbatan',
      trend: { value: 12, label: '' },
      icon: <Users size={22} />,
      color: '#E07A5F',
    },
    {
      label: "TO'LOVLAR",
      value: "0 so'm",
      subtext: 'Bugun tushgan',
      icon: <DollarSign size={22} />,
      color: '#22C55E',
    },
    {
      label: "DARS KO'RGANLAR",
      value: 156,
      subtext: 'Bugun aktiv',
      trend: { value: 8, label: '' },
      icon: <BookOpen size={22} />,
      color: '#3B82F6',
    },
    {
      label: 'FEEDBACK',
      value: 'Ijobiy',
      subtext: "4.8 o'rtacha baho",
      icon: <MessageSquare size={22} />,
      color: '#8B5CF6',
    },
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) =>
        prev.map((stat) => {
          if (stat.label === 'YANGI USERLAR' && typeof stat.value === 'number') {
            const newValue = Math.max(0, stat.value + Math.floor(Math.random() * 3) - 1)
            return { ...stat, value: newValue }
          }
          if (stat.label === "DARS KO'RGANLAR" && typeof stat.value === 'number') {
            const newValue = Math.max(100, stat.value + Math.floor(Math.random() * 5) - 2)
            return { ...stat, value: newValue }
          }
          return stat
        })
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Container>
      <HeaderRow>
        <TitleSection>
          <IconBox>
            <Calendar size={24} />
          </IconBox>
          <Box>
            <Typography
              sx={{
                fontSize: '1.375rem',
                fontWeight: 800,
                color: '#1A1A2E',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >
              Bugungi statistika
            </Typography>
            <Typography sx={{ fontSize: '0.9375rem', color: '#6B7280', fontWeight: 500 }}>
              {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>
        </TitleSection>

        <LiveIndicator>
          <PulseDot />
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#22C55E' }}>
            JONLI
          </Typography>
        </LiveIndicator>
      </HeaderRow>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.label}>
            <StatCard index={index}>
              <StatIcon color={stat.color}>
                {stat.icon}
              </StatIcon>

              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 1,
                }}
              >
                {stat.label}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, mb: 1 }}>
                <Typography
                  sx={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: stat.color,
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </Typography>

                {stat.trend && (
                  <TrendBadge positive={stat.trend.value >= 0}>
                    {stat.trend.value >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {stat.trend.value >= 0 ? '+' : ''}{stat.trend.value}%
                  </TrendBadge>
                )}
              </Box>

              <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF', fontWeight: 500 }}>
                {stat.subtext}
              </Typography>
            </StatCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}
