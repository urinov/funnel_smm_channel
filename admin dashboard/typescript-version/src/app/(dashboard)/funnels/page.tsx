'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import { styled } from '@mui/material/styles'
import {
  Plus,
  MoreVertical,
  Users,
  DollarSign,
  TrendingUp,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit2,
  GitBranch,
  ArrowRight,
} from 'lucide-react'

import { Card, Button, Badge, Modal, Input, EmptyState } from '@/components/ui'

interface Funnel {
  id: string
  name: string
  description: string
  isDefault: boolean
  isActive: boolean
  stats: {
    users: number
    conversions: number
    revenue: number
    conversionRate: number
  }
  nodesCount: number
  createdAt: string
}

const mockFunnels: Funnel[] = [
  {
    id: '1',
    name: 'Main Sales Funnel',
    description: 'Primary funnel for course sales',
    isDefault: true,
    isActive: true,
    stats: {
      users: 2847,
      conversions: 412,
      revenue: 15420000,
      conversionRate: 14.5,
    },
    nodesCount: 8,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'VIP Funnel',
    description: 'High-ticket offer funnel',
    isDefault: false,
    isActive: true,
    stats: {
      users: 324,
      conversions: 45,
      revenue: 8900000,
      conversionRate: 13.9,
    },
    nodesCount: 6,
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    name: 'Re-engagement Funnel',
    description: 'For inactive users',
    isDefault: false,
    isActive: false,
    stats: {
      users: 156,
      conversions: 12,
      revenue: 1180000,
      conversionRate: 7.7,
    },
    nodesCount: 5,
    createdAt: '2024-02-10',
  },
]

const FunnelCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  transition: 'all 200ms ease',
  cursor: 'pointer',

  '&:hover': {
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    transform: 'translateY(-2px)',
  },
}))

const StatusDot = styled(Box)<{ active: boolean }>(({ active }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: active ? '#10B981' : '#94A3B8',
}))

const StatBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '12px 16px',
  borderRadius: 8,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
}))

export default function FunnelsPage() {
  const [funnels] = useState<Funnel[]>(mockFunnels)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Funnels
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your sales funnels and user flows
          </Typography>
        </Box>
        <Button
          variant="solid"
          colorScheme="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Funnel
        </Button>
      </Box>

      <Grid container spacing={3}>
        {funnels.map((funnel) => (
          <Grid item xs={12} lg={6} xl={4} key={funnel.id}>
            <FunnelCard>
              <Box sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <GitBranch size={20} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight={600}>
                          {funnel.name}
                        </Typography>
                        {funnel.isDefault && (
                          <Chip label="Default" size="small" color="primary" sx={{ height: 20, fontSize: '0.6875rem' }} />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StatusDot active={funnel.isActive} />
                        <Typography variant="caption" color="text.secondary">
                          {funnel.isActive ? 'Active' : 'Paused'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton size="small">
                    <MoreVertical size={18} />
                  </IconButton>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {funnel.description}
                </Typography>

                {/* Stats Grid */}
                <Grid container spacing={1.5} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <StatBox>
                      <Typography variant="caption" color="text.secondary">Users</Typography>
                      <Typography variant="h6" fontWeight={700} fontFamily='"JetBrains Mono", monospace'>
                        {formatNumber(funnel.stats.users)}
                      </Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox>
                      <Typography variant="caption" color="text.secondary">Conversions</Typography>
                      <Typography variant="h6" fontWeight={700} fontFamily='"JetBrains Mono", monospace'>
                        {formatNumber(funnel.stats.conversions)}
                      </Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox>
                      <Typography variant="caption" color="text.secondary">Revenue</Typography>
                      <Typography variant="body2" fontWeight={700} fontFamily='"JetBrains Mono", monospace'>
                        {formatCurrency(funnel.stats.revenue)}
                      </Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox>
                      <Typography variant="caption" color="text.secondary">Conv. Rate</Typography>
                      <Typography variant="h6" fontWeight={700} color="success.main" fontFamily='"JetBrains Mono", monospace'>
                        {funnel.stats.conversionRate}%
                      </Typography>
                    </StatBox>
                  </Grid>
                </Grid>

                {/* Footer */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    {funnel.nodesCount} nodes
                  </Typography>
                  <Button variant="ghost" colorScheme="primary" size="small">
                    Edit Funnel
                    <ArrowRight size={14} style={{ marginLeft: 4 }} />
                  </Button>
                </Box>
              </Box>
            </FunnelCard>
          </Grid>
        ))}

        {/* Create New Funnel Card */}
        <Grid item xs={12} lg={6} xl={4}>
          <Card
            sx={{
              height: '100%',
              minHeight: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: (theme) => `2px dashed ${theme.palette.divider}`,
              cursor: 'pointer',
              transition: 'all 200ms ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  bgcolor: 'primary.main',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Plus size={28} />
              </Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Create New Funnel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Design a new user flow
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Create Funnel Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Funnel"
        size="md"
        actions={
          <>
            <Button variant="ghost" colorScheme="neutral" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" colorScheme="primary">
              Create Funnel
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Input
            label="Funnel Name"
            placeholder="Enter funnel name"
          />
          <Input
            label="Description"
            placeholder="Describe this funnel"
            multiline
            rows={3}
          />
        </Box>
      </Modal>
    </Box>
  )
}
