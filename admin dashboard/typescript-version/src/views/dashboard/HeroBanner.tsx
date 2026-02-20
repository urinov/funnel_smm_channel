'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { styled, keyframes } from '@mui/material/styles'
import { Sparkles, TrendingUp, Users, Zap } from 'lucide-react'

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`

const BannerWrapper = styled(Box)(() => ({
  position: 'relative',
  borderRadius: 28,
  padding: '40px 48px',
  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 40%, #A855F7 70%, #D946EF 100%)',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(99, 102, 241, 0.3)',
  marginBottom: 32,
}))

const GlowOrb = styled(Box)<{ position: 'left' | 'right' | 'center' }>(({ position }) => {
  const positions = {
    left: { top: '-30%', left: '-10%' },
    right: { top: '-20%', right: '-5%' },
    center: { bottom: '-40%', left: '30%' },
  }

  return {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    filter: 'blur(60px)',
    animation: `${pulse} 4s ease-in-out infinite`,
    ...positions[position],
  }
})

const FloatingIcon = styled(Box)<{ delay?: number }>(({ delay = 0 }) => ({
  position: 'absolute',
  width: 56,
  height: 56,
  borderRadius: 16,
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#FFFFFF',
  animation: `${float} 3s ease-in-out infinite`,
  animationDelay: `${delay}ms`,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
}))

const StatBadge = styled(Box)(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px',
  borderRadius: 50,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)',
  color: '#FFFFFF',
  fontSize: '0.9375rem',
  fontWeight: 600,
  marginRight: 12,
  marginTop: 8,
}))

interface HeroBannerProps {
  userName?: string
  totalUsers?: number
  todayGrowth?: number
  activeNow?: number
}

export default function HeroBanner({
  userName = 'Admin',
  totalUsers = 2847,
  todayGrowth = 12.5,
  activeNow = 142,
}: HeroBannerProps) {
  return (
    <BannerWrapper>
      {/* Background Effects */}
      <GlowOrb position="left" />
      <GlowOrb position="right" />
      <GlowOrb position="center" />

      {/* Floating Icons */}
      <FloatingIcon sx={{ top: 30, right: 120 }} delay={0}>
        <TrendingUp size={28} />
      </FloatingIcon>
      <FloatingIcon sx={{ top: 80, right: 40 }} delay={500}>
        <Users size={28} />
      </FloatingIcon>
      <FloatingIcon sx={{ bottom: 30, right: 180 }} delay={1000}>
        <Zap size={28} />
      </FloatingIcon>

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={26} color="#FFFFFF" />
          </Box>
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.8)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Boshqaruv Paneli
          </Typography>
        </Box>

        <Typography
          sx={{
            fontSize: '2.5rem',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.2,
            mb: 1.5,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          Xush kelibsiz, {userName}!
        </Typography>

        <Typography
          sx={{
            fontSize: '1.125rem',
            color: 'rgba(255, 255, 255, 0.85)',
            fontWeight: 500,
            mb: 3,
            lineHeight: 1.6,
          }}
        >
          Bugun botingiz a'lo ishlayapti. Barcha ko'rsatkichlar o'sishda.
        </Typography>

        {/* Quick Stats */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
          <StatBadge>
            <Users size={18} />
            {totalUsers.toLocaleString()} foydalanuvchi
          </StatBadge>
          <StatBadge>
            <TrendingUp size={18} />
            +{todayGrowth}% bugun
          </StatBadge>
          <StatBadge>
            <Zap size={18} />
            {activeNow} faol hozir
          </StatBadge>
        </Box>
      </Box>
    </BannerWrapper>
  )
}
