'use client'

import { forwardRef, ReactNode } from 'react'
import MuiCard, { CardProps as MuiCardProps } from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import { styled } from '@mui/material/styles'
import { MoreVertical } from 'lucide-react'

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

const paddingMap = {
  none: 0,
  sm: 16,
  md: 24,
  lg: 32,
}

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => !['hoverable', 'bordered', 'padding'].includes(prop as string),
})<{ hoverable?: boolean; bordered?: boolean; padding?: string }>(
  ({ theme, hoverable, bordered, padding = 'md' }) => ({
    borderRadius: 16,
    boxShadow: bordered ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',

    ...(hoverable && {
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        borderColor: theme.palette.primary.main,
      },
    }),
  })
)

const StyledCardHeader = styled(CardHeader)(({ theme }) => ({
  padding: '20px 24px 0',
  '& .MuiCardHeader-title': {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  '& .MuiCardHeader-subheader': {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
    marginTop: 2,
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

const StyledCardActions = styled(CardActions)(({ theme }) => ({
  padding: '16px 24px',
  borderTop: `1px solid ${theme.palette.divider}`,
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
              title={<Skeleton variant="text" width="40%" height={28} />}
              subheader={subtitle ? <Skeleton variant="text" width="60%" height={20} /> : undefined}
            />
          )}
          <StyledCardContent padding={padding}>
            <Skeleton variant="rounded" height={120} />
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
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="text" width="60%" height={36} sx={{ mt: 1 }} />
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
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.8125rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
                mt: 0.5,
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
                  color: change >= 0 ? 'success.main' : 'error.main',
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {change >= 0 ? '+' : ''}
                  {change}%
                </Typography>
                {changeLabel && (
                  <Typography variant="body2" color="text.secondary">
                    {changeLabel}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                backgroundColor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.1,
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
