'use client'

import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import { styled, keyframes } from '@mui/material/styles'
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
  animateValue?: boolean
  delay?: number
}

const colorMap = {
  primary: { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' },
  success: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22C55E', gradient: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' },
  danger: { bg: 'rgba(244, 114, 182, 0.12)', color: '#F472B6', gradient: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)' },
  info: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)' },
}

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

const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => !['clickable', 'animationDelay'].includes(prop as string),
})<{ clickable?: boolean; animationDelay?: number }>(({ clickable, animationDelay = 0 }) => ({
  padding: '28px',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '24px',
  border: '1px solid rgba(0, 0, 0, 0.04)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02), 0 8px 24px rgba(0, 0, 0, 0.04)',
  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: clickable ? 'pointer' : 'default',
  background: '#FFFFFF',
  opacity: 0,
  animation: `${fadeInUp} 0.5s ease-out ${animationDelay}ms forwards`,

  '&:hover': clickable ? {
    transform: 'translateY(-6px)',
    boxShadow: '0 12px 40px rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
  } : {},
}))

const DecorativeShape = styled(Box)<{ iconColor: string }>(({ iconColor }) => ({
  position: 'absolute',
  top: -30,
  right: -30,
  width: '160px',
  height: '160px',
  background: colorMap[iconColor as keyof typeof colorMap]?.gradient || colorMap.primary.gradient,
  opacity: 0.06,
  borderRadius: '50%',
  filter: 'blur(40px)',
}))

const IconWrapper = styled(Box)<{ iconColor: string }>(({ iconColor }) => ({
  width: 56,
  height: 56,
  borderRadius: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: colorMap[iconColor as keyof typeof colorMap]?.gradient || colorMap.primary.gradient,
  color: '#FFFFFF',
  boxShadow: `0 8px 24px ${colorMap[iconColor as keyof typeof colorMap]?.color || colorMap.primary.color}30`,
  transition: 'transform 300ms ease, box-shadow 300ms ease',

  '& svg': {
    width: 26,
    height: 26,
  },

  '.MuiCard-root:hover &': {
    transform: 'scale(1.08)',
    boxShadow: `0 12px 32px ${colorMap[iconColor as keyof typeof colorMap]?.color || colorMap.primary.color}40`,
  },
}))

const TrendBadge = styled(Box)<{ trend: 'up' | 'down' | 'neutral' }>(({ trend }) => {
  const colors = {
    up: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22C55E' },
    down: { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' },
    neutral: { bg: 'rgba(107, 114, 128, 0.12)', color: '#6B7280' },
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 14px',
    borderRadius: 12,
    fontSize: '0.875rem',
    fontWeight: 700,
    backgroundColor: colors[trend].bg,
    color: colors[trend].color,
    fontFamily: '"JetBrains Mono", monospace',

    '& svg': {
      width: 16,
      height: 16,
    },
  }
})

// Custom hook for count-up animation
function useCountUp(end: number, duration: number = 1500, startOnMount: boolean = true) {
  const [count, setCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(startOnMount)
  const startTime = useRef<number | null>(null)

  useEffect(() => {
    if (!startOnMount || end === 0) {
      setCount(end)
      setIsAnimating(false)

      return
    }

    const animate = (currentTime: number) => {
      if (startTime.current === null) {
        startTime.current = currentTime
      }

      const elapsed = currentTime - startTime.current
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      setCount(Math.floor(easeOut * end))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(end)
        setIsAnimating(false)
      }
    }

    const timer = setTimeout(() => {
      requestAnimationFrame(animate)
    }, 300)

    return () => clearTimeout(timer)
  }, [end, duration, startOnMount])

  return { count, isAnimating }
}

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconColor = 'primary',
  loading = false,
  onClick,
  animateValue = true,
  delay = 0,
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

  // Parse numeric value for animation
  const numericValue = typeof value === 'number'
    ? value
    : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0

  const { count } = useCountUp(
    animateValue && !loading ? numericValue : 0,
    1500,
    animateValue && !loading
  )

  // Format the animated count to match original format
  const formatAnimatedValue = () => {
    if (!animateValue || loading) return value

    const originalStr = String(value)

    // Handle currency
    if (originalStr.includes('UZS') || originalStr.includes('$')) {
      const formatted = new Intl.NumberFormat('en-US').format(count)

      if (originalStr.includes('UZS')) {
        return `${formatted} UZS`
      }

      return `$${formatted}`
    }

    // Handle percentage
    if (originalStr.includes('%')) {
      return `${count}%`
    }

    // Handle plain numbers
    if (typeof value === 'number' || !isNaN(Number(value))) {
      return new Intl.NumberFormat('en-US').format(count)
    }

    return value
  }

  if (loading) {
    return (
      <StyledCard animationDelay={delay}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Skeleton variant="rounded" width={56} height={56} sx={{ borderRadius: '16px' }} />
          <Skeleton variant="rounded" width={70} height={28} sx={{ borderRadius: '12px' }} />
        </Box>
        <Skeleton variant="text" width="45%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="70%" height={40} />
      </StyledCard>
    )
  }

  return (
    <StyledCard clickable={!!onClick} onClick={onClick} animationDelay={delay}>
      <DecorativeShape iconColor={iconColor} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, position: 'relative', zIndex: 1 }}>
        {icon && <IconWrapper iconColor={iconColor}>{icon}</IconWrapper>}
        {trend && (
          <TrendBadge trend={getTrendDirection(trend.value)}>
            {TrendIcon && <TrendIcon />}
            {Math.abs(trend.value)}%
          </TrendBadge>
        )}
      </Box>

      <Typography
        sx={{
          color: '#6B7280',
          fontWeight: 600,
          mb: 0.75,
          textTransform: 'uppercase',
          fontSize: '0.8125rem',
          letterSpacing: '0.06em',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '2rem',
          lineHeight: 1.2,
          color: '#1A1A2E',
          letterSpacing: '-0.02em',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {formatAnimatedValue()}
      </Typography>

      {subtitle && (
        <Typography
          variant="body2"
          sx={{
            color: '#9CA3AF',
            mt: 0.75,
            fontSize: '0.9375rem',
            fontWeight: 500,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {subtitle}
        </Typography>
      )}

      {trend?.label && (
        <Typography
          variant="caption"
          sx={{
            color: '#9CA3AF',
            mt: 1.5,
            display: 'block',
            fontSize: '0.8125rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {trend.label}
        </Typography>
      )}
    </StyledCard>
  )
}
