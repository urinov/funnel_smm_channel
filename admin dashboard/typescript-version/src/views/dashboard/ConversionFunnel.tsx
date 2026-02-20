'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { styled } from '@mui/material/styles'
import { Card } from '@/components/ui'
import { Users, BookOpen, FileText, Zap, CreditCard, TrendingDown } from 'lucide-react'

interface FunnelStep {
  id: string
  label: string
  count: number
  percentage: number
  dropOff?: number
  icon: React.ReactNode
  color: string
}

const mockFunnelData: FunnelStep[] = [
  {
    id: 'start',
    label: 'Started Bot',
    count: 2847,
    percentage: 100,
    icon: <Users size={16} />,
    color: '#6366F1',
  },
  {
    id: 'lesson',
    label: 'Completed Lesson 1',
    count: 2276,
    percentage: 80,
    dropOff: 20,
    icon: <BookOpen size={16} />,
    color: '#8B5CF6',
  },
  {
    id: 'custdev',
    label: 'Answered Custdev',
    count: 1423,
    percentage: 50,
    dropOff: 30,
    icon: <FileText size={16} />,
    color: '#A855F7',
  },
  {
    id: 'pitch',
    label: 'Saw Pitch',
    count: 854,
    percentage: 30,
    dropOff: 20,
    icon: <Zap size={16} />,
    color: '#D946EF',
  },
  {
    id: 'paid',
    label: 'Made Payment',
    count: 412,
    percentage: 14.5,
    dropOff: 15.5,
    icon: <CreditCard size={16} />,
    color: '#10B981',
  },
]

const FunnelContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
}))

const FunnelStep = styled(Box)<{ percentage: number; color: string }>(
  ({ theme, percentage, color }) => ({
    position: 'relative',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    cursor: 'pointer',
    transition: 'all 200ms ease',

    '&:hover': {
      transform: 'translateX(4px)',
      '& .funnel-bar': {
        opacity: 0.9,
      },
    },

    '&:last-child': {
      marginBottom: 0,
    },
  })
)

const FunnelBar = styled(Box)<{ percentage: number; color: string }>(
  ({ percentage, color }) => ({
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: `${percentage}%`,
    backgroundColor: `${color}25`,
    borderRight: `3px solid ${color}`,
    transition: 'width 500ms ease, opacity 200ms ease',
  })
)

const FunnelContent = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  zIndex: 1,
}))

const IconWrapper = styled(Box)<{ color: string }>(({ color }) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  backgroundColor: `${color}20`,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}))

const DropOffIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 0',
  color: theme.palette.error.main,
  fontSize: '0.6875rem',
  fontWeight: 600,
  gap: 4,
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
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {step.label}
                  </Typography>
                  <Typography variant="caption">
                    {formatNumber(step.count)} users ({step.percentage}%)
                  </Typography>
                  {step.dropOff && (
                    <Typography variant="caption" display="block" color="error.light">
                      Drop-off: {step.dropOff}%
                    </Typography>
                  )}
                </Box>
              }
              placement="left"
              arrow
            >
              <FunnelStep percentage={step.percentage} color={step.color}>
                <FunnelBar
                  className="funnel-bar"
                  percentage={step.percentage}
                  color={step.color}
                />
                <FunnelContent>
                  <IconWrapper color={step.color}>{step.icon}</IconWrapper>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {step.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {step.percentage}% of total
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      fontFamily='"JetBrains Mono", monospace'
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
          pt: 2,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            Overall Conversion
          </Typography>
          <Typography
            variant="h5"
            fontWeight={700}
            color="success.main"
            fontFamily='"JetBrains Mono", monospace'
          >
            14.5%
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            vs Last Month
          </Typography>
          <Typography variant="body2" fontWeight={600} color="success.main">
            +2.3%
          </Typography>
        </Box>
      </Box>
    </Card>
  )
}
