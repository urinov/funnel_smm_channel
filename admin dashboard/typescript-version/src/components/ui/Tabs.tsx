'use client'

import { ReactNode, useState, Children, isValidElement, cloneElement } from 'react'
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
})<{ variant?: string; size?: string }>(({ theme, variant, size = 'md' }) => {
  const sizeStyle = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md

  const baseStyles = {
    minHeight: sizeStyle.minHeight,
    '& .MuiTabs-indicator': {
      height: 3,
      borderRadius: '3px 3px 0 0',
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
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderRadius: 10,
      padding: 4,
    }
  }

  if (variant === 'underline') {
    return {
      ...baseStyles,
      borderBottom: `1px solid ${theme.palette.divider}`,
      '& .MuiTabs-indicator': {
        height: 2,
        borderRadius: 0,
      },
    }
  }

  return baseStyles
})

const StyledTab = styled(MuiTab, {
  shouldForwardProp: (prop) => !['variant', 'size'].includes(prop as string),
})<{ variant?: string; size?: string }>(({ theme, variant, size = 'md' }) => {
  const sizeStyle = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md

  const baseStyles = {
    textTransform: 'none' as const,
    fontWeight: 500,
    fontSize: sizeStyle.fontSize,
    minHeight: sizeStyle.minHeight,
    padding: sizeStyle.padding,
    borderRadius: 8,
    transition: 'all 200ms ease',
    color: theme.palette.text.secondary,

    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },

    '&.Mui-selected': {
      color: theme.palette.primary.main,
      fontWeight: 600,
    },

    '&.Mui-disabled': {
      opacity: 0.5,
    },
  }

  if (variant === 'pills') {
    return {
      ...baseStyles,
      borderRadius: 8,
      '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: '#FFFFFF',
        fontWeight: 600,
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
        },
      },
    }
  }

  return baseStyles
})

const BadgeWrapper = styled(Box)(({ theme }) => ({
  marginLeft: 8,
  padding: '2px 8px',
  borderRadius: 10,
  backgroundColor: theme.palette.error.main,
  color: '#FFFFFF',
  fontSize: '0.6875rem',
  fontWeight: 600,
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
