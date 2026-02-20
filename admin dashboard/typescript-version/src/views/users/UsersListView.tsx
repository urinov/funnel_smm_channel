'use client'

import { useState, useMemo } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import { styled } from '@mui/material/styles'
import {
  MoreVertical,
  Eye,
  MessageSquare,
  Ban,
  Trash2,
  Download,
  Filter,
  UserPlus,
  RefreshCw,
} from 'lucide-react'

import { Button, DataTable, Badge, Input, Select, Modal } from '@/components/ui'
import type { Column } from '@/components/ui'

interface User {
  id: string
  telegramId: string
  name: string
  username?: string
  phone?: string
  isPaid: boolean
  isBlocked: boolean
  funnelStep: string
  currentLesson: number
  subscriptionEnd?: string
  source?: string
  createdAt: string
  lastActive: string
}

const mockUsers: User[] = [
  {
    id: '1',
    telegramId: '123456789',
    name: 'Aziz Karimov',
    username: 'aziz_k',
    phone: '+998901234567',
    isPaid: true,
    isBlocked: false,
    funnelStep: 'subscribed',
    currentLesson: 5,
    subscriptionEnd: '2024-03-15',
    source: 'Instagram',
    createdAt: '2024-01-15',
    lastActive: '2 hours ago',
  },
  {
    id: '2',
    telegramId: '987654321',
    name: 'Dilshod Rahimov',
    username: 'dilshod_r',
    isPaid: true,
    isBlocked: false,
    funnelStep: 'subscribed',
    currentLesson: 8,
    subscriptionEnd: '2024-04-20',
    source: 'Telegram',
    createdAt: '2024-01-20',
    lastActive: '1 day ago',
  },
  {
    id: '3',
    telegramId: '456789123',
    name: 'Nodira Aliyeva',
    isPaid: false,
    isBlocked: false,
    funnelStep: 'lesson_3',
    currentLesson: 3,
    source: 'Friend referral',
    createdAt: '2024-02-01',
    lastActive: '3 hours ago',
  },
  {
    id: '4',
    telegramId: '321654987',
    name: 'Sardor Toshev',
    username: 'sardor_t',
    phone: '+998909876543',
    isPaid: false,
    isBlocked: true,
    funnelStep: 'blocked',
    currentLesson: 1,
    source: 'Direct',
    createdAt: '2024-02-10',
    lastActive: '1 week ago',
  },
  {
    id: '5',
    telegramId: '789123456',
    name: 'Malika Usmanova',
    username: 'malika_u',
    isPaid: true,
    isBlocked: false,
    funnelStep: 'subscribed',
    currentLesson: 12,
    subscriptionEnd: '2024-02-28',
    source: 'Instagram',
    createdAt: '2024-01-05',
    lastActive: '5 min ago',
  },
]

const PageHeader = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 24,
  flexWrap: 'wrap',
  gap: 16,
}))

const FilterBar = styled(Box)(() => ({
  display: 'flex',
  gap: 12,
  marginBottom: 24,
  flexWrap: 'wrap',
}))

const StatsBar = styled(Box)(() => ({
  display: 'flex',
  gap: 24,
  marginBottom: 24,
  flexWrap: 'wrap',
}))

const StatItem = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}))

export default function UsersListView() {
  const [users] = useState<User[]>(mockUsers)
  const [loading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; user: User } | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const filteredUsers = useMemo(() => {
    let result = users

    if (searchQuery) {
      const query = searchQuery.toLowerCase()

      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.telegramId.includes(query) ||
          u.username?.toLowerCase().includes(query) ||
          u.phone?.includes(query)
      )
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'paid') result = result.filter((u) => u.isPaid)

      if (statusFilter === 'free') result = result.filter((u) => !u.isPaid && !u.isBlocked)

      if (statusFilter === 'blocked') result = result.filter((u) => u.isBlocked)
    }

    return result
  }, [users, searchQuery, statusFilter])

  const stats = useMemo(
    () => ({
      total: users.length,
      paid: users.filter((u) => u.isPaid).length,
      free: users.filter((u) => !u.isPaid && !u.isBlocked).length,
      blocked: users.filter((u) => u.isBlocked).length,
    }),
    [users]
  )

  const getFunnelStepBadge = (step: string, isPaid: boolean, isBlocked: boolean) => {
    if (isBlocked) return <Badge color="danger" variant="soft">Blocked</Badge>

    if (isPaid) return <Badge color="success" variant="soft">Subscribed</Badge>

    const stepMap: Record<string, { label: string; color: 'primary' | 'warning' | 'info' }> = {
      start: { label: 'Started', color: 'info' },
      lesson_1: { label: 'Lesson 1', color: 'primary' },
      lesson_2: { label: 'Lesson 2', color: 'primary' },
      lesson_3: { label: 'Lesson 3', color: 'primary' },
      custdev: { label: 'Custdev', color: 'warning' },
      pitch: { label: 'Saw Pitch', color: 'warning' },
    }

    const config = stepMap[step] || { label: step, color: 'info' }

    return <Badge color={config.color} variant="soft">{config.label}</Badge>
  }

  const columns: Column<User>[] = [
    {
      id: 'name',
      label: 'User',
      minWidth: 200,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: row.isPaid ? 'success.main' : 'primary.main',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {row.name.split(' ').map((n) => n[0]).join('')}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.username ? `@${row.username}` : row.telegramId}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      render: (row) => getFunnelStepBadge(row.funnelStep, row.isPaid, row.isBlocked),
    },
    {
      id: 'currentLesson',
      label: 'Progress',
      minWidth: 100,
      render: (row) => (
        <Typography variant="body2" fontFamily='"JetBrains Mono", monospace'>
          Lesson {row.currentLesson}
        </Typography>
      ),
    },
    {
      id: 'source',
      label: 'Source',
      minWidth: 120,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.source || '-'}
        </Typography>
      ),
    },
    {
      id: 'subscriptionEnd',
      label: 'Subscription',
      minWidth: 130,
      render: (row) => {
        if (!row.subscriptionEnd) {
          return <Typography variant="caption" color="text.secondary">-</Typography>
        }

        const endDate = new Date(row.subscriptionEnd)
        const isExpiringSoon = endDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

        return (
          <Typography
            variant="body2"
            color={isExpiringSoon ? 'warning.main' : 'text.secondary'}
            fontWeight={isExpiringSoon ? 600 : 400}
          >
            {new Date(row.subscriptionEnd).toLocaleDateString()}
          </Typography>
        )
      },
    },
    {
      id: 'lastActive',
      label: 'Last Active',
      minWidth: 120,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.lastActive}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: '',
      minWidth: 50,
      sortable: false,
      render: (row) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            setMenuAnchor({ element: e.currentTarget, user: row })
          }}
        >
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ]

  const handleDeleteUser = () => {
    if (userToDelete) {
      // API call to delete user
      console.log('Deleting user:', userToDelete.id)
      setDeleteModalOpen(false)
      setUserToDelete(null)
    }
  }

  return (
    <Box>
      <PageHeader>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all registered users and their subscriptions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outline"
            colorScheme="neutral"
            leftIcon={<Download size={18} />}
          >
            Export
          </Button>
          <Button
            variant="solid"
            colorScheme="primary"
            leftIcon={<UserPlus size={18} />}
          >
            Add User
          </Button>
        </Box>
      </PageHeader>

      {/* Stats Bar */}
      <StatsBar>
        <StatItem>
          <Typography variant="body2" color="text.secondary">Total:</Typography>
          <Typography variant="body2" fontWeight={600}>{stats.total}</Typography>
        </StatItem>
        <StatItem>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
          <Typography variant="body2" color="text.secondary">Paid:</Typography>
          <Typography variant="body2" fontWeight={600}>{stats.paid}</Typography>
        </StatItem>
        <StatItem>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
          <Typography variant="body2" color="text.secondary">Free:</Typography>
          <Typography variant="body2" fontWeight={600}>{stats.free}</Typography>
        </StatItem>
        <StatItem>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
          <Typography variant="body2" color="text.secondary">Blocked:</Typography>
          <Typography variant="body2" fontWeight={600}>{stats.blocked}</Typography>
        </StatItem>
      </StatsBar>

      {/* Filter Bar */}
      <FilterBar>
        <Box sx={{ flex: 1, minWidth: 200, maxWidth: 400 }}>
          <Input
            placeholder="Search by name, username, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
          />
        </Box>
        <Select
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'paid', label: 'Paid Only' },
            { value: 'free', label: 'Free Only' },
            { value: 'blocked', label: 'Blocked' },
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as string)}
          size="small"
          placeholder="Status"
        />
        <Tooltip title="More filters">
          <IconButton>
            <Filter size={20} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Refresh">
          <IconButton>
            <RefreshCw size={20} />
          </IconButton>
        </Tooltip>
      </FilterBar>

      {/* Selected Users Actions */}
      {selectedUsers.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'white',
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {selectedUsers.length} users selected
          </Typography>
          <Button variant="ghost" colorScheme="neutral" size="small">
            Block Selected
          </Button>
          <Button variant="ghost" colorScheme="neutral" size="small">
            Export Selected
          </Button>
        </Box>
      )}

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        selectable
        onSelectionChange={setSelectedUsers}
        onRowClick={(row) => console.log('View user:', row.id)}
        getRowId={(row) => row.id}
        emptyMessage="No users found"
      />

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 180,
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            console.log('View user:', menuAnchor?.user.id)
            setMenuAnchor(null)
          }}
          sx={{ gap: 1.5 }}
        >
          <Eye size={18} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            console.log('Message user:', menuAnchor?.user.id)
            setMenuAnchor(null)
          }}
          sx={{ gap: 1.5 }}
        >
          <MessageSquare size={18} />
          Send Message
        </MenuItem>
        <MenuItem
          onClick={() => {
            console.log('Block user:', menuAnchor?.user.id)
            setMenuAnchor(null)
          }}
          sx={{ gap: 1.5 }}
        >
          <Ban size={18} />
          {menuAnchor?.user.isBlocked ? 'Unblock' : 'Block'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setUserToDelete(menuAnchor?.user || null)
            setDeleteModalOpen(true)
            setMenuAnchor(null)
          }}
          sx={{ gap: 1.5, color: 'error.main' }}
        >
          <Trash2 size={18} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete User"
        subtitle="This action cannot be undone"
        size="sm"
        actions={
          <>
            <Button variant="ghost" colorScheme="neutral" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" colorScheme="danger" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </>
        }
      >
        <Typography variant="body2">
          Are you sure you want to delete <strong>{userToDelete?.name}</strong>?
          This will permanently remove all their data, including conversation history,
          custdev answers, and payment records.
        </Typography>
      </Modal>
    </Box>
  )
}
