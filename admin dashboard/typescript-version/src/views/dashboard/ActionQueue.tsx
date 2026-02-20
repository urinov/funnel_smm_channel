'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import LinearProgress from '@mui/material/LinearProgress'
import { styled } from '@mui/material/styles'
import { Card, Button, Badge } from '@/components/ui'
import {
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

interface ActionItem {
  id: string
  type: 'message' | 'expiring' | 'alert'
  title: string
  description: string
  count?: number
  urgency: 'high' | 'medium' | 'low'
  action: string
}

const mockActions: ActionItem[] = [
  {
    id: '1',
    type: 'message',
    title: 'Unread Messages',
    description: '7 users waiting for response',
    count: 7,
    urgency: 'high',
    action: 'Reply',
  },
  {
    id: '2',
    type: 'expiring',
    title: 'Expiring Subscriptions',
    description: '12 users expire in 3 days',
    count: 12,
    urgency: 'medium',
    action: 'View',
  },
  {
    id: '3',
    type: 'alert',
    title: 'Payment Failures',
    description: '3 failed payments today',
    count: 3,
    urgency: 'high',
    action: 'Investigate',
  },
]

const ActionItemRow = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'urgency',
})<{ urgency: 'high' | 'medium' | 'low' }>(({ theme, urgency }) => {
  const colors = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981',
  }

  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: 12,
    transition: 'all 150ms ease',
    position: 'relative',
    overflow: 'hidden',

    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors[urgency],
    },

    '&:hover': {
      borderColor: colors[urgency],
      boxShadow: `0 4px 12px 0 ${colors[urgency]}20`,
    },

    '&:last-child': {
      marginBottom: 0,
    },
  }
})

const IconWrapper = styled(Box)<{ color: string }>(({ color }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor: `${color}15`,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}))

const ActionButton = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 12px',
  borderRadius: 8,
  backgroundColor: theme.palette.primary.main,
  color: '#FFFFFF',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 150ms ease',
  whiteSpace: 'nowrap',

  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}))

export default function ActionQueue() {
  const getIcon = (type: ActionItem['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare size={20} />
      case 'expiring':
        return <Clock size={20} />
      case 'alert':
        return <AlertTriangle size={20} />
    }
  }

  const getIconColor = (urgency: ActionItem['urgency']) => {
    switch (urgency) {
      case 'high':
        return '#EF4444'
      case 'medium':
        return '#F59E0B'
      case 'low':
        return '#10B981'
    }
  }

  const totalActions = mockActions.reduce((sum, item) => sum + (item.count || 0), 0)

  return (
    <Card
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Action Queue
          <Badge variant="solid" color="danger" size="sm">
            {totalActions}
          </Badge>
        </Box>
      }
      headerAction={
        <Tooltip title="Refresh">
          <IconButton size="small">
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      }
    >
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Pending tasks
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {totalActions} items
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={30}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)',
            },
          }}
        />
      </Box>

      {mockActions.map((item) => (
        <ActionItemRow key={item.id} urgency={item.urgency}>
          <IconWrapper color={getIconColor(item.urgency)}>
            {getIcon(item.type)}
          </IconWrapper>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {item.title}
              </Typography>
              {item.count && (
                <Badge variant="soft" color={item.urgency === 'high' ? 'danger' : 'warning'} size="sm">
                  {item.count}
                </Badge>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {item.description}
            </Typography>
          </Box>

          <ActionButton>
            {item.action}
            <ArrowRight size={14} />
          </ActionButton>
        </ActionItemRow>
      ))}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          mt: 2,
          py: 2,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <CheckCircle size={16} color="#10B981" />
        <Typography variant="body2" color="text.secondary">
          All critical tasks addressed
        </Typography>
      </Box>
    </Card>
  )
}
