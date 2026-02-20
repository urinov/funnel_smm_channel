'use client'

import { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import { styled } from '@mui/material/styles'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    label?: string
  }
  icon?: ReactNode
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  loading?: boolean
  onClick?: () => void
}

const colorMap = {
  primary: { bg: '#6366F115', color: '#6366F1' },
  success: { bg: '#10B98115', color: '#10B981' },
  warning: { bg: '#F59E0B15', color: '#F59E0B' },
  danger: { bg: '#EF444415', color: '#EF4444' },
  info: { bg: '#3B82F615', color: '#3B82F6' },
}

const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'clickable',
})<{ clickable?: boolean }>(({ theme, clickable }) => ({
  padding: '24px',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '16px',
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: clickable ? 'pointer' : 'default',

  '&:hover': clickable ? {
    transform: 'translateY(-2px)',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    borderColor: theme.palette.primary.main,
  } : {},

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: '120px',
    height: '120px',
    background: 'linear-gradient(135deg, transparent 50%, rgba(99, 102, 241, 0.03) 50%)',
    borderRadius: '0 16px 0 100%',
  },
}))

const IconWrapper = styled(Box)<{ iconColor: string }>(({ iconColor }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colorMap[iconColor as keyof typeof colorMap]?.bg || colorMap.primary.bg,
  color: colorMap[iconColor as keyof typeof colorMap]?.color || colorMap.primary.color,

  '& svg': {
    width: 24,
    height: 24,
  },
}))

const TrendBadge = styled(Box)<{ trend: 'up' | 'down' | 'neutral' }>(({ trend }) => {
  const colors = {
    up: { bg: '#10B98115', color: '#10B981' },
    down: { bg: '#EF444415', color: '#EF4444' },
    neutral: { bg: '#64748B15', color: '#64748B' },
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: colors[trend].bg,
    color: colors[trend].color,

    '& svg': {
      width: 14,
      height: 14,
    },
  }
})

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconColor = 'primary',
  loading = false,
  onClick,
}: StatCardProps) {
  const getTrendDirection = (val: number): 'up' | 'down' | 'neutral' => {
    if (val > 0) return 'up'
    if (val < 0) return 'down'
    return 'neutral'
  }

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null

  if (loading) {
    return (
      <StyledCard>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Skeleton variant="rounded" width={48} height={48} />
          <Skeleton variant="rounded" width={60} height={24} />
        </Box>
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={36} />
      </StyledCard>
    )
  }

  return (
    <StyledCard clickable={!!onClick} onClick={onClick}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        {icon && <IconWrapper iconColor={iconColor}>{icon}</IconWrapper>}
        {trend && (
          <TrendBadge trend={getTrendDirection(trend.value)}>
            {TrendIcon && <TrendIcon />}
            {Math.abs(trend.value)}%
          </TrendBadge>
        )}
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontWeight: 500,
          mb: 0.5,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          fontFamily: '"JetBrains Mono", monospace',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>

      {subtitle && (
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
        >
          {subtitle}
        </Typography>
      )}

      {trend?.label && (
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', mt: 1, display: 'block' }}
        >
          {trend.label}
        </Typography>
      )}
    </StyledCard>
  )
}
