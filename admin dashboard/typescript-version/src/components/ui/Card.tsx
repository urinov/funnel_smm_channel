'use client'

import { forwardRef, ReactNode } from 'react'
import MuiCard, { CardProps as MuiCardProps } from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import { styled, keyframes } from '@mui/material/styles'

export interface CardProps extends Omit<MuiCardProps, 'title'> {
  title?: ReactNode
  subtitle?: string
  headerAction?: ReactNode
  footer?: ReactNode
  loading?: boolean
  hoverable?: boolean
  bordered?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children?: ReactNode
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

const paddingMap = {
  none: 0,
  sm: 16,
  md: 24,
  lg: 32,
}

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => !['hoverable', 'bordered', 'padding'].includes(prop as string),
})<{ hoverable?: boolean; bordered?: boolean; padding?: string }>(({ hoverable, bordered }) => ({
  borderRadius: 20,
  boxShadow: bordered ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  backgroundColor: '#FFFFFF',
  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
  opacity: 0,
  animation: `${fadeInUp} 0.5s ease-out forwards`,

  ...(hoverable && {
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
      borderColor: '#E07A5F',
    },
  }),
}))

const StyledCardHeader = styled(CardHeader)(() => ({
  padding: '24px 28px 0',
  '& .MuiCardHeader-title': {
    fontSize: '1.125rem',
    fontWeight: 700,
    lineHeight: 1.4,
    color: '#1A1A2E',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    letterSpacing: '-0.01em',
  },
  '& .MuiCardHeader-subheader': {
    fontSize: '0.875rem',
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: 500,
  },
  '& .MuiCardHeader-action': {
    marginTop: 0,
    marginRight: 0,
  },
}))

const StyledCardContent = styled(CardContent, {
  shouldForwardProp: (prop) => prop !== 'padding',
})<{ padding?: string }>(({ padding = 'md' }) => ({
  padding: paddingMap[padding as keyof typeof paddingMap],
  '&:last-child': {
    paddingBottom: paddingMap[padding as keyof typeof paddingMap],
  },
}))

const StyledCardActions = styled(CardActions)(() => ({
  padding: '16px 28px',
  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
  justifyContent: 'flex-end',
  gap: 12,
}))

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      subtitle,
      headerAction,
      footer,
      loading = false,
      hoverable = false,
      bordered = false,
      padding = 'md',
      children,
      ...props
    },
    ref
  ) => {
    if (loading) {
      return (
        <StyledCard ref={ref} bordered={bordered} {...props}>
          {title && (
            <StyledCardHeader
              title={<Skeleton variant="text" width="40%" height={28} sx={{ borderRadius: '6px' }} />}
              subheader={subtitle ? <Skeleton variant="text" width="60%" height={20} sx={{ borderRadius: '6px' }} /> : undefined}
            />
          )}
          <StyledCardContent padding={padding}>
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: '12px' }} />
          </StyledCardContent>
        </StyledCard>
      )
    }

    return (
      <StyledCard ref={ref} hoverable={hoverable} bordered={bordered} {...props}>
        {title && (
          <StyledCardHeader
            title={typeof title === 'string' ? title : title}
            subheader={subtitle}
            action={headerAction}
          />
        )}
        <StyledCardContent padding={title ? 'md' : padding}>{children}</StyledCardContent>
        {footer && <StyledCardActions>{footer}</StyledCardActions>}
      </StyledCard>
    )
  }
)

Card.displayName = 'Card'

export default Card

// Simple content card for quick use
export function ContentCard({
  children,
  ...props
}: Omit<CardProps, 'title' | 'subtitle' | 'headerAction' | 'footer'>) {
  return <Card {...props}>{children}</Card>
}

// Metric card for displaying KPIs
export interface MetricCardProps {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: ReactNode
  loading?: boolean
}

export function MetricCard({ label, value, change, changeLabel, icon, loading }: MetricCardProps) {
  if (loading) {
    return (
      <StyledCard>
        <StyledCardContent>
          <Skeleton variant="text" width="40%" height={20} sx={{ borderRadius: '6px' }} />
          <Skeleton variant="text" width="60%" height={36} sx={{ mt: 1, borderRadius: '6px' }} />
        </StyledCardContent>
      </StyledCard>
    )
  }

  return (
    <StyledCard>
      <StyledCardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              sx={{
                color: '#9CA3AF',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {label}
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                mt: 0.5,
                fontSize: '1.5rem',
                color: '#1A1A2E',
                letterSpacing: '-0.02em',
              }}
            >
              {value}
            </Typography>
            {change !== undefined && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 1,
                  color: change >= 0 ? '#22C55E' : '#EF4444',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {change >= 0 ? '+' : ''}
                  {change}%
                </Typography>
                {changeLabel && (
                  <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                    {changeLabel}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(224, 122, 95, 0.3)',
                '& svg': { width: 24, height: 24 },
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </StyledCardContent>
    </StyledCard>
  )
}
