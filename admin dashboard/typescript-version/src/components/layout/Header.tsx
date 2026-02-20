'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Badge from '@mui/material/Badge'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import InputBase from '@mui/material/InputBase'
import { styled } from '@mui/material/styles'
import {
  Search,
  Bell,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
  MessageSquare,
  CreditCard,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'

const HEADER_HEIGHT = 80

const StyledAppBar = styled(AppBar)(() => ({
  backgroundColor: 'transparent',
  borderBottom: 'none',
  boxShadow: 'none',
  zIndex: 1200,
}))

const SearchWrapper = styled(Box)(() => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: '14px 20px',
  gap: 12,
  transition: 'all 250ms ease',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  minWidth: 400,

  '&:hover, &:focus-within': {
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
  },
}))

const SearchInput = styled(InputBase)(() => ({
  flex: 1,
  fontSize: '0.9375rem',
  fontWeight: 500,
  color: '#1A1A2E',
  fontFamily: '"Plus Jakarta Sans", sans-serif',

  '& input::placeholder': {
    color: '#9CA3AF',
    opacity: 1,
  },
}))

const NotificationItem = styled(MenuItem)(() => ({
  padding: '14px 18px',
  borderRadius: 12,
  margin: '4px 10px',
  gap: 14,
  minWidth: 340,
  transition: 'all 200ms ease',

  '&:hover': {
    backgroundColor: '#F5F3FF',
  },
}))

const NotificationIcon = styled(Box)<{ color: 'success' | 'warning' | 'error' | 'info' }>(({ color }) => {
  const colors = {
    success: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22C55E' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' },
    error: { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' },
    info: { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366F1' },
  }

  return {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors[color].bg,
    color: colors[color].color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }
})

const StyledIconButton = styled(IconButton)(() => ({
  width: 48,
  height: 48,
  borderRadius: 14,
  backgroundColor: '#FFFFFF',
  color: '#6B7280',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  transition: 'all 200ms ease',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',

  '&:hover': {
    backgroundColor: '#F5F3FF',
    color: '#6366F1',
    borderColor: '#6366F1',
  },
}))

const StyledBadge = styled(Badge)(() => ({
  '& .MuiBadge-badge': {
    background: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '0.6875rem',
    boxShadow: '0 2px 6px rgba(244, 114, 182, 0.4)',
    minWidth: 20,
    height: 20,
  },
}))

const ProfileButton = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 16px 8px 8px',
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',

  '&:hover': {
    borderColor: '#6366F1',
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.15)',
  },
}))

interface HeaderProps {
  onCommandPaletteOpen: () => void
  onThemeToggle: () => void
  isDarkMode: boolean
}

const mockNotifications = [
  {
    id: 1,
    type: 'success' as const,
    icon: <CreditCard size={20} />,
    title: "Yangi to'lov qabul qilindi",
    description: '99,000 UZS @user123 dan',
    time: '2 daqiqa oldin',
  },
  {
    id: 2,
    type: 'info' as const,
    icon: <MessageSquare size={20} />,
    title: 'Yangi xabar',
    description: '3 ta foydalanuvchi javob kutmoqda',
    time: '15 daqiqa oldin',
  },
  {
    id: 3,
    type: 'warning' as const,
    icon: <AlertCircle size={20} />,
    title: 'Obuna tugayapti',
    description: '12 ta obuna 3 kun ichida tugaydi',
    time: '1 soat oldin',
  },
]

export default function Header({ onCommandPaletteOpen, onThemeToggle, isDarkMode }: HeaderProps) {
  const [notificationsAnchor, setNotificationsAnchor] = useState<null | HTMLElement>(null)
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null)

  return (
    <StyledAppBar position="fixed">
      <Toolbar sx={{ minHeight: HEADER_HEIGHT, px: 4 }}>
        {/* Search */}
        <SearchWrapper>
          <Search size={20} style={{ color: '#9CA3AF' }} />
          <SearchInput
            placeholder="Qidirish..."
            onClick={onCommandPaletteOpen}
          />
        </SearchWrapper>

        <Box sx={{ flex: 1 }} />

        {/* Right side actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Theme Toggle */}
          <StyledIconButton onClick={onThemeToggle}>
            {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
          </StyledIconButton>

          {/* Notifications */}
          <StyledIconButton onClick={(e) => setNotificationsAnchor(e.currentTarget)}>
            <StyledBadge badgeContent={3}>
              <Bell size={22} />
            </StyledBadge>
          </StyledIconButton>

          {/* Profile */}
          <ProfileButton onClick={(e) => setProfileAnchor(e.currentTarget)}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >
              A
            </Avatar>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography
                sx={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#1A1A2E',
                  lineHeight: 1.3,
                }}
              >
                Admin
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  color: '#9CA3AF',
                  fontWeight: 500,
                }}
              >
                Administrator
              </Typography>
            </Box>
            <ChevronDown size={18} style={{ color: '#9CA3AF' }} />
          </ProfileButton>
        </Box>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationsAnchor}
          open={Boolean(notificationsAnchor)}
          onClose={() => setNotificationsAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              mt: 1.5,
              borderRadius: '20px',
              minWidth: 380,
              maxHeight: 440,
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#1A1A2E',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >
              Bildirishnomalar
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF', fontWeight: 500 }}>
              3 ta o'qilmagan xabar
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.06)' }} />
          {mockNotifications.map((notification) => (
            <NotificationItem key={notification.id}>
              <NotificationIcon color={notification.type}>
                {notification.icon}
              </NotificationIcon>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: '#1A1A2E',
                  }}
                >
                  {notification.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    color: '#9CA3AF',
                  }}
                  noWrap
                >
                  {notification.description}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: '#9CA3AF',
                  flexShrink: 0,
                  fontWeight: 500,
                }}
              >
                {notification.time}
              </Typography>
            </NotificationItem>
          ))}
          <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.06)' }} />
          <MenuItem sx={{ justifyContent: 'center', py: 1.5 }}>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#6366F1',
                fontWeight: 600,
              }}
            >
              Barchasini ko'rish
            </Typography>
          </MenuItem>
        </Menu>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              mt: 1.5,
              borderRadius: '16px',
              minWidth: 220,
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography
              sx={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#1A1A2E',
              }}
            >
              Admin User
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
              admin@funnel.uz
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.06)' }} />
          <MenuItem sx={{ py: 1.5, px: 2.5, gap: 1.5, borderRadius: '8px', mx: 1, my: 0.5 }}>
            <User size={18} style={{ color: '#6B7280' }} />
            <Typography sx={{ fontSize: '0.9375rem', color: '#1A1A2E' }}>Profil</Typography>
          </MenuItem>
          <MenuItem sx={{ py: 1.5, px: 2.5, gap: 1.5, borderRadius: '8px', mx: 1, my: 0.5 }}>
            <Settings size={18} style={{ color: '#6B7280' }} />
            <Typography sx={{ fontSize: '0.9375rem', color: '#1A1A2E' }}>Sozlamalar</Typography>
          </MenuItem>
          <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.06)', my: 0.5 }} />
          <MenuItem sx={{ py: 1.5, px: 2.5, gap: 1.5, borderRadius: '8px', mx: 1, my: 0.5, color: '#EF4444' }}>
            <LogOut size={18} />
            <Typography sx={{ fontSize: '0.9375rem' }}>Chiqish</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </StyledAppBar>
  )
}
