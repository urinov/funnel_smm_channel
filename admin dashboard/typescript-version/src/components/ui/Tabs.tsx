'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import Box from '@mui/material/Box'
import MuiTabs from '@mui/material/Tabs'
import MuiTab from '@mui/material/Tab'
import { styled } from '@mui/material/styles'

export interface TabItem {
  label: string
  value: string
  icon?: ReactNode
  badge?: number
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export interface TabPanelProps {
  children: ReactNode
  value: string
  currentValue: string
}

const sizeStyles = {
  sm: { minHeight: 36, fontSize: '0.8125rem', padding: '6px 12px' },
  md: { minHeight: 44, fontSize: '0.875rem', padding: '8px 16px' },
  lg: { minHeight: 52, fontSize: '0.9375rem', padding: '10px 20px' },
}

const StyledTabs = styled(MuiTabs, {
  shouldForwardProp: (prop) => !['variant', 'size'].includes(prop as string),
})<{ variant?: string; size?: string }>(({ variant, size = 'md' }) => {
  const sizeStyle = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md

  const baseStyles = {
    minHeight: sizeStyle.minHeight,
    '& .MuiTabs-indicator': {
      height: 3,
      borderRadius: '3px 3px 0 0',
      backgroundColor: '#6366F1',
    },
    '& .MuiTabs-flexContainer': {
      gap: 4,
    },
  }

  if (variant === 'pills') {
    return {
      ...baseStyles,
      '& .MuiTabs-indicator': {
        display: 'none',
      },
      backgroundColor: '#F5F3FF',
      borderRadius: 14,
      padding: 6,
    }
  }

  if (variant === 'underline') {
    return {
      ...baseStyles,
      borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
      '& .MuiTabs-indicator': {
        height: 3,
        borderRadius: 0,
        backgroundColor: '#6366F1',
      },
    }
  }

  return baseStyles
})

const StyledTab = styled(MuiTab, {
  shouldForwardProp: (prop) => !['variant', 'size'].includes(prop as string),
})<{ variant?: string; size?: string }>(({ variant, size = 'md' }) => {
  const sizeStyle = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md

  const baseStyles = {
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: sizeStyle.fontSize,
    minHeight: sizeStyle.minHeight,
    padding: sizeStyle.padding,
    borderRadius: 10,
    transition: 'all 200ms ease',
    color: '#6B7280',
    fontFamily: '"Plus Jakarta Sans", sans-serif',

    '&:hover': {
      backgroundColor: 'rgba(99, 102, 241, 0.08)',
      color: '#1A1A2E',
    },

    '&.Mui-selected': {
      color: '#6366F1',
      fontWeight: 700,
    },

    '&.Mui-disabled': {
      opacity: 0.5,
    },
  }

  if (variant === 'pills') {
    return {
      ...baseStyles,
      borderRadius: 10,
      '&.Mui-selected': {
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        color: '#FFFFFF',
        fontWeight: 700,
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
        '&:hover': {
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        },
      },
    }
  }

  return baseStyles
})

const BadgeWrapper = styled(Box)(() => ({
  marginLeft: 8,
  padding: '3px 10px',
  borderRadius: 10,
  backgroundColor: '#F472B6',
  color: '#FFFFFF',
  fontSize: '0.75rem',
  fontWeight: 700,
  lineHeight: 1.3,
}))

export default function Tabs({
  items,
  value,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
}: TabsProps) {
  return (
    <StyledTabs
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      variant={fullWidth ? 'fullWidth' : 'standard'}
      size={size}
    >
      {items.map((item) => (
        <StyledTab
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          variant={variant}
          size={size}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {item.icon && (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </Box>
              )}
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <BadgeWrapper>{item.badge > 99 ? '99+' : item.badge}</BadgeWrapper>
              )}
            </Box>
          }
        />
      ))}
    </StyledTabs>
  )
}

export function TabPanel({ children, value, currentValue }: TabPanelProps) {
  if (value !== currentValue) return null

  return (
    <Box
      role="tabpanel"
      sx={{
        animation: 'fadeIn 0.2s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      {children}
    </Box>
  )
}

// Convenience hook for managing tab state
export function useTabs(defaultValue: string) {
  const [value, setValue] = useState(defaultValue)

  return {
    value,
    onChange: setValue,
    getTabProps: () => ({ value, onChange: setValue }),
    getPanelProps: (tabValue: string) => ({ value: tabValue, currentValue: value }),
  }
}
