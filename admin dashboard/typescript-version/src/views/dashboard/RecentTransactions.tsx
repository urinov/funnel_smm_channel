'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Skeleton from '@mui/material/Skeleton'
import { styled } from '@mui/material/styles'
import { ExternalLink, CheckCircle, XCircle, Clock, MoreVertical } from 'lucide-react'

import { Card } from '@/components/ui'

interface Transaction {
  id: string
  user: {
    name: string
    avatar?: string
    telegramId: string
  }
  amount: number
  status: 'completed' | 'pending' | 'failed'
  method: 'payme' | 'click'
  plan: string
  date: string
}

const mockTransactions: Transaction[] = [
  {
    id: 'TXN001',
    user: { name: 'Aziz Karimov', telegramId: '123456789' },
    amount: 99000,
    status: 'completed',
    method: 'payme',
    plan: '1 Month',
    date: '2 min ago',
  },
  {
    id: 'TXN002',
    user: { name: 'Dilshod Rahimov', telegramId: '987654321' },
    amount: 249000,
    status: 'completed',
    method: 'click',
    plan: '3 Months',
    date: '15 min ago',
  },
  {
    id: 'TXN003',
    user: { name: 'Nodira Aliyeva', telegramId: '456789123' },
    amount: 99000,
    status: 'pending',
    method: 'payme',
    plan: '1 Month',
    date: '32 min ago',
  },
  {
    id: 'TXN004',
    user: { name: 'Sardor Toshev', telegramId: '321654987' },
    amount: 449000,
    status: 'completed',
    method: 'click',
    plan: '6 Months',
    date: '1 hour ago',
  },
  {
    id: 'TXN005',
    user: { name: 'Malika Usmanova', telegramId: '789123456' },
    amount: 99000,
    status: 'failed',
    method: 'payme',
    plan: '1 Month',
    date: '2 hours ago',
  },
]

const TransactionRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 0',
  borderBottom: `1px solid ${theme.palette.divider}`,
  transition: 'background-color 150ms ease',

  '&:last-child': {
    borderBottom: 'none',
  },

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    marginLeft: -16,
    marginRight: -16,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 8,
  },
}))

const UserInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flex: 1,
  minWidth: 0,
})

const StatusIcon = ({ status }: { status: Transaction['status'] }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle size={16} color="#10B981" />
    case 'pending':
      return <Clock size={16} color="#F59E0B" />
    case 'failed':
      return <XCircle size={16} color="#EF4444" />
  }
}

const MethodBadge = styled(Box)<{ method: 'payme' | 'click' }>(({ method }) => ({
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  backgroundColor: method === 'payme' ? '#00CDBE15' : '#2196F315',
  color: method === 'payme' ? '#00CDBE' : '#2196F3',
}))

export default function RecentTransactions() {
  const [transactions] = useState<Transaction[]>(mockTransactions)
  const [loading] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <Card title="Recent Transactions">
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, py: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Box>
            <Skeleton variant="text" width={80} />
          </Box>
        ))}
      </Card>
    )
  }

  return (
    <Card
      title="Recent Transactions"
      headerAction={
        <Tooltip title="View all transactions">
          <IconButton size="small">
            <ExternalLink size={18} />
          </IconButton>
        </Tooltip>
      }
    >
      <Box sx={{ mx: -1 }}>
        {transactions.map((txn) => (
          <TransactionRow key={txn.id}>
            <UserInfo>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {txn.user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {txn.user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{txn.user.telegramId.slice(0, 5)}...
                </Typography>
              </Box>
            </UserInfo>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MethodBadge method={txn.method}>{txn.method}</MethodBadge>
              <Typography variant="caption" color="text.secondary">
                {txn.plan}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'right', minWidth: 100 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                fontFamily='"JetBrains Mono", monospace'
              >
                {formatCurrency(txn.amount)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                <StatusIcon status={txn.status} />
                <Typography variant="caption" color="text.secondary">
                  {txn.date}
                </Typography>
              </Box>
            </Box>

            <IconButton size="small" sx={{ ml: 1 }}>
              <MoreVertical size={16} />
            </IconButton>
          </TransactionRow>
        ))}
      </Box>

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography
          variant="body2"
          color="primary"
          fontWeight={600}
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          View all transactions →
        </Typography>
      </Box>
    </Card>
  )
}
