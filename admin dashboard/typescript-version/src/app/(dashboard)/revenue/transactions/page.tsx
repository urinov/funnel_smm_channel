'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import { styled } from '@mui/material/styles'
import {
  Download,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
} from 'lucide-react'

import { Card, Button, DataTable, Badge, StatCard } from '@/components/ui'
import type { Column } from '@/components/ui'

interface Transaction {
  id: string
  orderId: string
  user: {
    name: string
    telegramId: string
  }
  amount: number
  method: 'payme' | 'click'
  status: 'completed' | 'pending' | 'failed' | 'cancelled'
  plan: string
  createdAt: string
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    orderId: 'ORD-2024-001',
    user: { name: 'Aziz Karimov', telegramId: '123456789' },
    amount: 99000,
    method: 'payme',
    status: 'completed',
    plan: '1 Month',
    createdAt: '2024-02-15 10:30',
  },
  {
    id: '2',
    orderId: 'ORD-2024-002',
    user: { name: 'Dilshod Rahimov', telegramId: '987654321' },
    amount: 249000,
    method: 'click',
    status: 'completed',
    plan: '3 Months',
    createdAt: '2024-02-15 09:15',
  },
  {
    id: '3',
    orderId: 'ORD-2024-003',
    user: { name: 'Nodira Aliyeva', telegramId: '456789123' },
    amount: 99000,
    method: 'payme',
    status: 'pending',
    plan: '1 Month',
    createdAt: '2024-02-15 08:45',
  },
  {
    id: '4',
    orderId: 'ORD-2024-004',
    user: { name: 'Sardor Toshev', telegramId: '321654987' },
    amount: 449000,
    method: 'click',
    status: 'failed',
    plan: '6 Months',
    createdAt: '2024-02-14 16:20',
  },
]

const StatsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 24,
  marginBottom: 32,

  [theme.breakpoints.down('lg')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: '1fr',
  },
}))

const MethodBadge = styled(Chip)<{ method: 'payme' | 'click' }>(({ method }) => ({
  backgroundColor: method === 'payme' ? '#00CDBE15' : '#2196F315',
  color: method === 'payme' ? '#00CDBE' : '#2196F3',
  fontWeight: 600,
  fontSize: '0.75rem',
}))

export default function TransactionsPage() {
  const [transactions] = useState<Transaction[]>(mockTransactions)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: Transaction['status']) => {
    const config = {
      completed: { color: 'success' as const, icon: <CheckCircle size={14} /> },
      pending: { color: 'warning' as const, icon: <Clock size={14} /> },
      failed: { color: 'danger' as const, icon: <XCircle size={14} /> },
      cancelled: { color: 'neutral' as const, icon: <XCircle size={14} /> },
    }

    return (
      <Badge variant="soft" color={config[status].color} size="sm">
        {config[status].icon}
        <span style={{ marginLeft: 4, textTransform: 'capitalize' }}>{status}</span>
      </Badge>
    )
  }

  const columns: Column<Transaction>[] = [
    {
      id: 'orderId',
      label: 'Order ID',
      minWidth: 140,
      render: (row) => (
        <Typography variant="body2" fontFamily='"JetBrains Mono", monospace' fontWeight={500}>
          {row.orderId}
        </Typography>
      ),
    },
    {
      id: 'user',
      label: 'User',
      minWidth: 180,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
            {row.user.name.split(' ').map((n) => n[0]).join('')}
          </Avatar>
          <Typography variant="body2" fontWeight={500}>
            {row.user.name}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'amount',
      label: 'Amount',
      minWidth: 120,
      render: (row) => (
        <Typography variant="body2" fontFamily='"JetBrains Mono", monospace' fontWeight={600}>
          {formatCurrency(row.amount)}
        </Typography>
      ),
    },
    {
      id: 'method',
      label: 'Method',
      minWidth: 100,
      render: (row) => <MethodBadge method={row.method} label={row.method.toUpperCase()} size="small" />,
    },
    {
      id: 'plan',
      label: 'Plan',
      minWidth: 100,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.plan}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'createdAt',
      label: 'Date',
      minWidth: 140,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.createdAt}
        </Typography>
      ),
    },
  ]

  const totalRevenue = transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage all payment transactions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outline" colorScheme="neutral" leftIcon={<Download size={18} />}>
            Export
          </Button>
          <Button variant="ghost" colorScheme="neutral" leftIcon={<RefreshCw size={18} />}>
            Refresh
          </Button>
        </Box>
      </Box>

      <StatsGrid>
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          subtitle="This month"
          trend={{ value: 12.5, label: 'vs last month' }}
          icon={<CreditCard />}
          iconColor="success"
        />
        <StatCard
          title="Successful"
          value={transactions.filter((t) => t.status === 'completed').length}
          subtitle="Transactions"
          icon={<CheckCircle />}
          iconColor="success"
        />
        <StatCard
          title="Pending"
          value={transactions.filter((t) => t.status === 'pending').length}
          subtitle="Awaiting"
          icon={<Clock />}
          iconColor="warning"
        />
        <StatCard
          title="Failed"
          value={transactions.filter((t) => t.status === 'failed').length}
          subtitle="This month"
          icon={<XCircle />}
          iconColor="danger"
        />
      </StatsGrid>

      <DataTable
        columns={columns}
        data={transactions}
        searchable
        searchPlaceholder="Search by order ID, user..."
        getRowId={(row) => row.id}
        onRowClick={(row) => console.log('View transaction:', row.id)}
      />
    </Box>
  )
}
