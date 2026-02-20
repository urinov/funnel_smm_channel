'use client'

import { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import { Inbox, Search, FileX, Users, CreditCard, BarChart3 } from 'lucide-react'
import Button from './Button'

export interface EmptyStateProps {
  icon?: ReactNode
  iconType?: 'inbox' | 'search' | 'file' | 'users' | 'payment' | 'chart'
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md' | 'lg'
}

const iconMap = {
  inbox: Inbox,
  search: Search,
  file: FileX,
  users: Users,
  payment: CreditCard,
  chart: BarChart3,
}

const sizeStyles = {
  sm: {
    iconSize: 48,
    padding: '32px 24px',
    titleSize: '1rem',
    descSize: '0.875rem',
  },
  md: {
    iconSize: 64,
    padding: '48px 24px',
    titleSize: '1.125rem',
    descSize: '0.9375rem',
  },
  lg: {
    iconSize: 80,
    padding: '64px 32px',
    titleSize: '1.25rem',
    descSize: '1rem',
  },
}

const Container = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'size',
})<{ size: string }>(({ theme, size }) => {
  const sizeStyle = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md

  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: sizeStyle.padding,
    animation: 'fadeIn 0.3s ease-out',
  }
})

const IconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'iconSize',
})<{ iconSize: number }>(({ theme, iconSize }) => ({
  width: iconSize,
  height: iconSize,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 24,
  color: theme.palette.mode === 'dark' ? '#475569' : '#94A3B8',

  '& svg': {
    width: '100%',
    height: '100%',
    strokeWidth: 1.5,
  },
}))

export default function EmptyState({
  icon,
  iconType = 'inbox',
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
}: EmptyStateProps) {
  const sizeStyle = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md
  const IconComponent = iconMap[iconType]

  return (
    <Container size={size}>
      <IconWrapper iconSize={sizeStyle.iconSize}>
        {icon || <IconComponent />}
      </IconWrapper>

      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          fontSize: sizeStyle.titleSize,
          mb: description ? 1 : action ? 3 : 0,
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: sizeStyle.descSize,
            maxWidth: 400,
            mb: action ? 3 : 0,
          }}
        >
          {description}
        </Typography>
      )}

      {(action || secondaryAction) && (
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          {action && (
            <Button
              variant="solid"
              colorScheme="primary"
              onClick={action.onClick}
              leftIcon={action.icon}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              colorScheme="neutral"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </Box>
      )}
    </Container>
  )
}

// Preset empty states for common scenarios
export function NoDataEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      iconType="inbox"
      title="No data yet"
      description="There's nothing here yet. Data will appear once you start using the system."
      action={onAction ? { label: 'Get Started', onClick: onAction } : undefined}
    />
  )
}

export function NoSearchResultsEmptyState({
  query,
  onClear,
}: {
  query: string
  onClear: () => void
}) {
  return (
    <EmptyState
      iconType="search"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search.`}
      action={{ label: 'Clear search', onClick: onClear }}
    />
  )
}

export function NoUsersEmptyState({ onAddUser }: { onAddUser?: () => void }) {
  return (
    <EmptyState
      iconType="users"
      title="No users yet"
      description="Users will appear here once they start interacting with your bot."
      action={onAddUser ? { label: 'Invite Users', onClick: onAddUser } : undefined}
    />
  )
}

export function NoTransactionsEmptyState() {
  return (
    <EmptyState
      iconType="payment"
      title="No transactions"
      description="You haven't received any payments yet. Transactions will appear here."
    />
  )
}
