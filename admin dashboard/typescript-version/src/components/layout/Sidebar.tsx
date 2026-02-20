'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import { styled, keyframes } from '@mui/material/styles'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  GitBranch,
  BarChart3,
  Settings,
  MessageSquare,
  Bell,
  LogOut,
  HelpCircle,
} from 'lucide-react'

const SIDEBAR_WIDTH = 88

const navigation = [
  { id: 'dashboard', label: 'Umumiy', icon: LayoutDashboard, path: '/' },
  { id: 'analytics', label: 'Analitika', icon: BarChart3, path: '/analytics' },
  { id: 'users', label: 'Foydalanuvchilar', icon: Users, path: '/users' },
  { id: 'content', label: 'Kontentlar', icon: BookOpen, path: '/content/lessons' },
  { id: 'revenue', label: 'Daromad', icon: DollarSign, path: '/revenue/transactions' },
  { id: 'funnels', label: 'Voronkalar', icon: GitBranch, path: '/funnels' },
  { id: 'messages', label: 'Xabarlar', icon: MessageSquare, path: '/users/conversations' },
]

const bottomNavigation = [
  { id: 'notifications', label: 'Bildirishnomalar', icon: Bell, path: '/notifications' },
  { id: 'settings', label: 'Sozlamalar', icon: Settings, path: '/settings' },
  { id: 'help', label: 'Yordam', icon: HelpCircle, path: '/help' },
]

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const StyledDrawer = styled(Drawer)(() => ({
  width: SIDEBAR_WIDTH,
  flexShrink: 0,

  '& .MuiDrawer-paper': {
    width: SIDEBAR_WIDTH,
    background: 'linear-gradient(180deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%)',
    borderRight: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    boxShadow: '4px 0 24px rgba(99, 102, 241, 0.15)',
  },
}))

const LogoBox = styled(Box)(() => ({
  width: 52,
  height: 52,
  borderRadius: 16,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 32,
  cursor: 'pointer',
  transition: 'all 300ms ease',
  backdropFilter: 'blur(10px)',
  animation: `${slideIn} 0.4s ease-out`,

  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: 'scale(1.05)',
  },
}))

const NavItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  width: 52,
  height: 52,
  borderRadius: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  marginBottom: 8,
  position: 'relative',
  color: active ? '#6366F1' : 'rgba(255, 255, 255, 0.7)',
  backgroundColor: active ? '#FFFFFF' : 'transparent',
  boxShadow: active ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',

  '&:hover': {
    backgroundColor: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)',
    color: active ? '#6366F1' : '#FFFFFF',
    transform: 'scale(1.05)',
  },

  '& svg': {
    width: 24,
    height: 24,
    strokeWidth: active ? 2.5 : 2,
    transition: 'all 200ms ease',
  },
}))

const ActiveIndicator = styled(Box)(() => ({
  position: 'absolute',
  left: -4,
  width: 4,
  height: 24,
  borderRadius: '0 4px 4px 0',
  backgroundColor: '#FFFFFF',
}))

const Divider = styled(Box)(() => ({
  width: 40,
  height: 1,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  margin: '16px 0',
}))

const ProfileAvatar = styled(Avatar)(() => ({
  width: 44,
  height: 44,
  border: '3px solid rgba(255, 255, 255, 0.3)',
  cursor: 'pointer',
  transition: 'all 300ms ease',
  fontSize: '1rem',
  fontWeight: 700,
  background: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)',

  '&:hover': {
    borderColor: 'rgba(255, 255, 255, 0.6)',
    transform: 'scale(1.1)',
  },
}))

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <StyledDrawer variant="permanent">
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none' }}>
        <LogoBox>
          <Box
            component="span"
            sx={{
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.5rem',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
          >
            F
          </Box>
        </LogoBox>
      </Link>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {navigation.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <Tooltip key={item.id} title={item.label} placement="right" arrow>
              <Link href={item.path} style={{ textDecoration: 'none' }}>
                <NavItem
                  active={active}
                  sx={{ animation: `${slideIn} 0.3s ease-out ${index * 50}ms both` }}
                >
                  {active && <ActiveIndicator />}
                  <Icon />
                </NavItem>
              </Link>
            </Tooltip>
          )
        })}
      </Box>

      <Divider />

      {/* Bottom Navigation */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {bottomNavigation.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <Tooltip key={item.id} title={item.label} placement="right" arrow>
              <Link href={item.path} style={{ textDecoration: 'none' }}>
                <NavItem active={active}>
                  {active && <ActiveIndicator />}
                  <Icon />
                </NavItem>
              </Link>
            </Tooltip>
          )
        })}
      </Box>

      <Divider />

      {/* Profile Avatar */}
      <Tooltip title="Profil" placement="right" arrow>
        <ProfileAvatar>A</ProfileAvatar>
      </Tooltip>
    </StyledDrawer>
  )
}
