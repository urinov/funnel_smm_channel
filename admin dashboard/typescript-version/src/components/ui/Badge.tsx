'use client'

import { ReactNode } from 'react'
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'

export interface BadgeProps {
  children: ReactNode
  variant?: 'solid' | 'soft' | 'outline' | 'dot'
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
  icon?: ReactNode
}

const colorSchemes = {
  primary: {
    solid: { bg: '#6366F1', color: '#FFFFFF' },
    soft: { bg: '#6366F115', color: '#6366F1' },
    outline: { border: '#6366F1', color: '#6366F1' },
    dot: '#6366F1',
  },
  success: {
    solid: { bg: '#10B981', color: '#FFFFFF' },
    soft: { bg: '#10B98115', color: '#10B981' },
    outline: { border: '#10B981', color: '#10B981' },
    dot: '#10B981',
  },
  warning: {
    solid: { bg: '#F59E0B', color: '#000000' },
    soft: { bg: '#F59E0B15', color: '#F59E0B' },
    outline: { border: '#F59E0B', color: '#F59E0B' },
    dot: '#F59E0B',
  },
  danger: {
    solid: { bg: '#EF4444', color: '#FFFFFF' },
    soft: { bg: '#EF444415', color: '#EF4444' },
    outline: { border: '#EF4444', color: '#EF4444' },
    dot: '#EF4444',
  },
  info: {
    solid: { bg: '#3B82F6', color: '#FFFFFF' },
    soft: { bg: '#3B82F615', color: '#3B82F6' },
    outline: { border: '#3B82F6', color: '#3B82F6' },
    dot: '#3B82F6',
  },
  neutral: {
    solid: { bg: '#64748B', color: '#FFFFFF' },
    soft: { bg: '#64748B15', color: '#64748B' },
    outline: { border: '#64748B', color: '#64748B' },
    dot: '#64748B',
  },
}

const sizeStyles = {
  sm: {
    padding: '2px 8px',
    fontSize: '0.6875rem',
    dotSize: 6,
  },
  md: {
    padding: '4px 10px',
    fontSize: '0.75rem',
    dotSize: 8,
  },
  lg: {
    padding: '6px 12px',
    fontSize: '0.8125rem',
    dotSize: 10,
  },
}

const StyledBadge = styled(Box, {
  shouldForwardProp: (prop) =>
    !['variant', 'colorScheme', 'size', 'rounded'].includes(prop as string),
})<{
  variant: string
  colorScheme: string
  size: string
  rounded: boolean
}>(({ variant, colorScheme, size, rounded }) => {
  const colors = colorSchemes[colorScheme as keyof typeof colorSchemes] || colorSchemes.primary
  const sizeStyle = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: rounded ? 9999 : 6,
    whiteSpace: 'nowrap' as const,
    padding: sizeStyle.padding,
    fontSize: sizeStyle.fontSize,
  }

  if (variant === 'solid') {
    return {
      ...baseStyles,
      backgroundColor: colors.solid.bg,
      color: colors.solid.color,
    }
  }

  if (variant === 'soft') {
    return {
      ...baseStyles,
      backgroundColor: colors.soft.bg,
      color: colors.soft.color,
    }
  }

  if (variant === 'outline') {
    return {
      ...baseStyles,
      backgroundColor: 'transparent',
      color: colors.outline.color,
      border: `1.5px solid ${colors.outline.border}`,
    }
  }

  // Dot variant
  return {
    ...baseStyles,
    backgroundColor: 'transparent',
    color: 'inherit',
    '&::before': {
      content: '""',
      width: sizeStyle.dotSize,
      height: sizeStyle.dotSize,
      borderRadius: '50%',
      backgroundColor: colors.dot,
      flexShrink: 0,
    },
  }
})

export default function Badge({
  children,
  variant = 'soft',
  color = 'primary',
  size = 'md',
  rounded = true,
  icon,
}: BadgeProps) {
  return (
    <StyledBadge
      variant={variant}
      colorScheme={color}
      size={size}
      rounded={rounded}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </StyledBadge>
  )
}

// Convenience exports for status badges
export function StatusBadge({ status }: { status: 'active' | 'inactive' | 'pending' | 'error' }) {
  const statusMap = {
    active: { color: 'success' as const, label: 'Active' },
    inactive: { color: 'neutral' as const, label: 'Inactive' },
    pending: { color: 'warning' as const, label: 'Pending' },
    error: { color: 'danger' as const, label: 'Error' },
  }

  const config = statusMap[status] || statusMap.inactive

  return (
    <Badge variant="dot" color={config.color} size="sm">
      {config.label}
    </Badge>
  )
}

export function CountBadge({ count, max = 99 }: { count: number; max?: number }) {
  const displayCount = count > max ? `${max}+` : count

  return (
    <Badge variant="solid" color="danger" size="sm" rounded>
      {displayCount}
    </Badge>
  )
}
