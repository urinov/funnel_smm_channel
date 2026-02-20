'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { styled, keyframes } from '@mui/material/styles'
import { Users, BookOpen, FileText, Zap, CreditCard, TrendingDown } from 'lucide-react'

import { Card } from '@/components/ui'

interface FunnelStepData {
  id: string
  label: string
  count: number
  percentage: number
  dropOff?: number
  icon: React.ReactNode
  color: string
}

const mockFunnelData: FunnelStepData[] = [
  {
    id: 'start',
    label: 'Started Bot',
    count: 2847,
    percentage: 100,
    icon: <Users size={16} />,
    color: '#E07A5F',
  },
  {
    id: 'lesson',
    label: 'Completed Lesson 1',
    count: 2276,
    percentage: 80,
    dropOff: 20,
    icon: <BookOpen size={16} />,
    color: '#E8B931',
  },
  {
    id: 'custdev',
    label: 'Answered Custdev',
    count: 1423,
    percentage: 50,
    dropOff: 30,
    icon: <FileText size={16} />,
    color: '#3B82F6',
  },
  {
    id: 'pitch',
    label: 'Saw Pitch',
    count: 854,
    percentage: 30,
    dropOff: 20,
    icon: <Zap size={16} />,
    color: '#8B5CF6',
  },
  {
    id: 'paid',
    label: 'Made Payment',
    count: 412,
    percentage: 14.5,
    dropOff: 15.5,
    icon: <CreditCard size={16} />,
    color: '#22C55E',
  },
]

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const FunnelContainer = styled(Box)(() => ({
  position: 'relative',
}))

const FunnelStep = styled(Box)<{ index: number }>(({ index }) => ({
  position: 'relative',
  marginBottom: 8,
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: 'rgba(0, 0, 0, 0.02)',
  cursor: 'pointer',
  transition: 'all 250ms ease',
  opacity: 0,
  animation: `${slideIn} 0.4s ease-out ${index * 80}ms forwards`,

  '&:hover': {
    transform: 'translateX(6px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
    '& .funnel-bar': {
      opacity: 1,
    },
  },

  '&:last-child': {
    marginBottom: 0,
  },
}))

const FunnelBar = styled(Box)<{ percentage: number; color: string }>(({ percentage, color }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: `${percentage}%`,
  background: `linear-gradient(90deg, ${color}20 0%, ${color}10 100%)`,
  borderRight: `3px solid ${color}`,
  transition: 'width 600ms ease, opacity 200ms ease',
  opacity: 0.85,
}))

const FunnelContent = styled(Box)(() => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '14px 18px',
  zIndex: 1,
}))

const IconWrapper = styled(Box)<{ color: string }>(({ color }) => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  background: `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'transform 200ms ease',

  '.MuiBox-root:hover &': {
    transform: 'scale(1.1)',
  },
}))

const DropOffIndicator = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 0',
  color: '#EF4444',
  fontSize: '0.6875rem',
  fontWeight: 600,
  gap: 4,
  fontFamily: '"JetBrains Mono", monospace',
}))

export default function ConversionFunnel() {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <Card title="Conversion Funnel">
      <FunnelContainer>
        {mockFunnelData.map((step, index) => (
          <Box key={step.id}>
            <Tooltip
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                    {step.label}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    {formatNumber(step.count)} users ({step.percentage}%)
                  </Typography>
                  {step.dropOff && (
                    <Typography variant="caption" display="block" sx={{ color: '#EF4444', mt: 0.5 }}>
                      Drop-off: {step.dropOff}%
                    </Typography>
                  )}
                </Box>
              }
              placement="left"
              arrow
            >
              <FunnelStep index={index}>
                <FunnelBar
                  className="funnel-bar"
                  percentage={step.percentage}
                  color={step.color}
                />
                <FunnelContent>
                  <IconWrapper color={step.color}>{step.icon}</IconWrapper>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#1A1A2E',
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                      }}
                      noWrap
                    >
                      {step.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: '#9CA3AF',
                        fontWeight: 500,
                      }}
                    >
                      {step.percentage}% of total
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      sx={{
                        fontSize: '0.9375rem',
                        fontWeight: 800,
                        fontFamily: '"JetBrains Mono", monospace',
                        color: '#1A1A2E',
                      }}
                    >
                      {formatNumber(step.count)}
                    </Typography>
                  </Box>
                </FunnelContent>
              </FunnelStep>
            </Tooltip>

            {step.dropOff && index < mockFunnelData.length - 1 && (
              <DropOffIndicator>
                <TrendingDown size={12} />
                {step.dropOff}% drop-off
              </DropOffIndicator>
            )}
          </Box>
        ))}
      </FunnelContainer>

      <Box
        sx={{
          mt: 3,
          pt: 2.5,
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#9CA3AF',
              fontWeight: 500,
              mb: 0.5,
            }}
          >
            Overall Conversion
          </Typography>
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#22C55E',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            14.5%
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#9CA3AF',
              fontWeight: 500,
              mb: 0.5,
            }}
          >
            vs Last Month
          </Typography>
          <Typography
            sx={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#22C55E',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            +2.3%
          </Typography>
        </Box>
      </Box>
    </Card>
  )
}
