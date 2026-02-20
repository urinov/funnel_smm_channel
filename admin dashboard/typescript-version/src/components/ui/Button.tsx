'use client'

import { forwardRef } from 'react'
import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { styled } from '@mui/material/styles'

export interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'solid' | 'outline' | 'ghost' | 'soft'
  colorScheme?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => !['colorScheme', 'loading'].includes(prop as string),
})<{ colorScheme?: string }>(({ theme, colorScheme = 'primary' }) => {
  const colors: Record<string, { main: string; dark: string; light: string; contrastText: string }> = {
    primary: {
      main: '#E07A5F',
      dark: '#C86B52',
      light: '#E8927A',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#22C55E',
      dark: '#16A34A',
      light: '#4ADE80',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#E8B931',
      dark: '#D4A52A',
      light: '#ECCC5A',
      contrastText: '#1A1A2E',
    },
    danger: {
      main: '#EF4444',
      dark: '#DC2626',
      light: '#F87171',
      contrastText: '#FFFFFF',
    },
    neutral: {
      main: '#6B7280',
      dark: '#4B5563',
      light: '#9CA3AF',
      contrastText: '#FFFFFF',
    },
  }

  const color = colors[colorScheme] || colors.primary

  return {
    borderRadius: '8px',
    fontWeight: 500,
    textTransform: 'none' as const,
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',

    '&.variant-solid': {
      backgroundColor: color.main,
      color: color.contrastText,
      boxShadow: 'none',
      '&:hover': {
        backgroundColor: color.dark,
        boxShadow: `0 4px 14px 0 ${color.main}40`,
        transform: 'translateY(-1px)',
      },
      '&:active': {
        transform: 'translateY(0)',
      },
    },

    '&.variant-outline': {
      backgroundColor: 'transparent',
      color: color.main,
      border: `1.5px solid ${color.main}`,
      '&:hover': {
        backgroundColor: `${color.main}10`,
        borderColor: color.dark,
      },
    },

    '&.variant-ghost': {
      backgroundColor: 'transparent',
      color: color.main,
      '&:hover': {
        backgroundColor: `${color.main}10`,
      },
    },

    '&.variant-soft': {
      backgroundColor: `${color.main}15`,
      color: color.main,
      '&:hover': {
        backgroundColor: `${color.main}25`,
      },
    },

    '&.Mui-disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },

    '&.MuiButton-sizeSmall': {
      padding: '6px 14px',
      fontSize: '0.8125rem',
    },

    '&.MuiButton-sizeMedium': {
      padding: '10px 20px',
      fontSize: '0.875rem',
    },

    '&.MuiButton-sizeLarge': {
      padding: '12px 28px',
      fontSize: '1rem',
    },
  }
})

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'solid',
      colorScheme = 'primary',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <StyledButton
        ref={ref}
        colorScheme={colorScheme}
        disabled={disabled || loading}
        className={`variant-${variant} ${className || ''}`}
        {...props}
      >
        {loading && (
          <CircularProgress
            size={16}
            color="inherit"
            sx={{ mr: children ? 1 : 0 }}
          />
        )}
        {!loading && leftIcon && (
          <span style={{ marginRight: children ? 8 : 0, display: 'flex', alignItems: 'center' }}>
            {leftIcon}
          </span>
        )}
        {children}
        {!loading && rightIcon && (
          <span style={{ marginLeft: children ? 8 : 0, display: 'flex', alignItems: 'center' }}>
            {rightIcon}
          </span>
        )}
      </StyledButton>
    )
  }
)

Button.displayName = 'Button'

export default Button
