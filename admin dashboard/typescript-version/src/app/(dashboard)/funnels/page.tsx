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
  GitBranch,
  ArrowRight,
} from 'lucide-react'

import { Card, Button, Modal, Input } from '@/components/ui'

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
    name: 'Asosiy Sotish Voronkasi',
    description: 'Kurs sotish uchun asosiy voronka',
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
    name: 'VIP Voronka',
    description: 'Yuqori narxli takliflar voronkasi',
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
    name: 'Qayta faollashtirish',
    description: 'Faol bo\'lmagan foydalanuvchilar uchun',
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
  borderRadius: 24,
  border: '1px solid rgba(0, 0, 0, 0.04)',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',

  '&:hover': {
    boxShadow: '0 12px 40px rgba(99, 102, 241, 0.12)',
    transform: 'translateY(-6px)',
    borderColor: '#6366F1',
  },
}))

const StatusDot = styled(Box)<{ active: boolean }>(({ active }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: active ? '#22C55E' : '#94A3B8',
}))

const StatBox = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '14px 16px',
  borderRadius: 14,
  backgroundColor: '#F5F3FF',
  border: '1px solid rgba(99, 102, 241, 0.08)',
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
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 6px 16px rgba(99, 102, 241, 0.3)',
                      }}
                    >
                      <GitBranch size={24} />
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
                              height: 24,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(99, 102, 241, 0.12)',
                              color: '#6366F1',
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
              minHeight: 340,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed rgba(99, 102, 241, 0.3)',
              borderRadius: 24,
              cursor: 'pointer',
              transition: 'all 300ms ease',
              backgroundColor: '#FFFFFF',
              '&:hover': {
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.04)',
                transform: 'translateY(-6px)',
              },
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2.5,
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                }}
              >
                <Plus size={30} />
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
