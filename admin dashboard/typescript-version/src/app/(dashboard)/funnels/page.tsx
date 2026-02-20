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

const FunnelCard = styled(Card)(() => ({
  position: 'relative',
  transition: 'all 300ms ease',
  cursor: 'pointer',
  background: '#FFFFFF',
  borderRadius: 20,
  border: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',

  '&:hover': {
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
    transform: 'translateY(-4px)',
    borderColor: '#E07A5F',
  },
}))

const StatusDot = styled(Box)<{ active: boolean }>(({ active }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: active ? '#10B981' : '#94A3B8',
}))

const StatBox = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '12px 16px',
  borderRadius: 10,
  backgroundColor: '#F8F6F3',
  border: '1px solid rgba(0, 0, 0, 0.04)',
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
          <Typography
            sx={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#1A1A2E',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              letterSpacing: '-0.02em',
              mb: 1,
            }}
          >
            Voronkalar
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: '#6B7280', fontWeight: 500 }}>
            Sotish voronkalari va foydalanuvchi oqimlarini boshqaring
          </Typography>
        </Box>
        <Button
          variant="solid"
          colorScheme="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setIsModalOpen(true)}
        >
          Yangi Voronka
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
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(224, 122, 95, 0.3)',
                      }}
                    >
                      <GitBranch size={22} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A2E', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                          {funnel.name}
                        </Typography>
                        {funnel.isDefault && (
                          <Chip
                            label="Asosiy"
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(224, 122, 95, 0.15)',
                              color: '#E07A5F',
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StatusDot active={funnel.isActive} />
                        <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280', fontWeight: 500 }}>
                          {funnel.isActive ? 'Faol' : "To'xtatilgan"}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton size="small" sx={{ color: '#6B7280' }}>
                    <MoreVertical size={18} />
                  </IconButton>
                </Box>

                <Typography sx={{ fontSize: '0.9375rem', color: '#6B7280', fontWeight: 500, mb: 3 }}>
                  {funnel.description}
                </Typography>

                {/* Stats Grid */}
                <Grid container spacing={1.5} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <StatBox>
                      <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600, mb: 0.5 }}>Foydalanuvchilar</Typography>
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A2E', fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatNumber(funnel.stats.users)}
                      </Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox>
                      <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600, mb: 0.5 }}>Konversiyalar</Typography>
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A2E', fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatNumber(funnel.stats.conversions)}
                      </Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox>
                      <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600, mb: 0.5 }}>Daromad</Typography>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#1A1A2E', fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatCurrency(funnel.stats.revenue)}
                      </Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox>
                      <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600, mb: 0.5 }}>CR</Typography>
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#22C55E', fontFamily: '"JetBrains Mono", monospace' }}>
                        {funnel.stats.conversionRate}%
                      </Typography>
                    </StatBox>
                  </Grid>
                </Grid>

                {/* Footer */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF', fontWeight: 500 }}>
                    {funnel.nodesCount} bosqich
                  </Typography>
                  <Button variant="ghost" colorScheme="primary" size="small">
                    Tahrirlash
                    <ArrowRight size={14} style={{ marginLeft: 4 }} />
                  </Button>
                </Box>
              </Box>
            </FunnelCard>
          </Grid>
        ))}

        {/* Create New Funnel Card */}
        <Grid item xs={12} lg={6} xl={4}>
          <Box
            sx={{
              height: '100%',
              minHeight: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed rgba(224, 122, 95, 0.3)',
              borderRadius: 20,
              cursor: 'pointer',
              transition: 'all 300ms ease',
              backgroundColor: '#FFFFFF',
              '&:hover': {
                borderColor: '#E07A5F',
                backgroundColor: 'rgba(224, 122, 95, 0.05)',
                transform: 'translateY(-4px)',
              },
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2.5,
                  boxShadow: '0 4px 16px rgba(224, 122, 95, 0.3)',
                }}
              >
                <Plus size={28} />
              </Box>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A2E', mb: 1, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                Yangi Voronka Yaratish
              </Typography>
              <Typography sx={{ fontSize: '0.9375rem', color: '#6B7280', fontWeight: 500 }}>
                Yangi foydalanuvchi oqimini loyihalashtiring
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Create Funnel Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Yangi Voronka Yaratish"
        size="md"
        actions={
          <>
            <Button variant="ghost" colorScheme="neutral" onClick={() => setIsModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button variant="solid" colorScheme="primary">
              Yaratish
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Input
            label="Voronka nomi"
            placeholder="Voronka nomini kiriting"
          />
          <Input
            label="Tavsif"
            placeholder="Bu voronkani tasvirlab bering"
            multiline
            rows={3}
          />
        </Box>
      </Modal>
    </Box>
  )
}
