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
import Tooltip from '@mui/material/Tooltip'
import { styled } from '@mui/material/styles'
import {
  Search,
  Bell,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
  Command,
  MessageSquare,
  CreditCard,
  AlertCircle,
} from 'lucide-react'

const HEADER_HEIGHT = 72

const StyledAppBar = styled(AppBar)(() => ({
  backgroundColor: '#FFFFFF',
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: 'none',
  zIndex: 1200,
}))

const SearchWrapper = styled(Box)(() => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#F8F6F3',
  borderRadius: 14,
  padding: '10px 18px',
  gap: 10,
  cursor: 'pointer',
  transition: 'all 250ms ease',
  border: '1px solid transparent',
  minWidth: 300,

  '&:hover': {
    backgroundColor: '#F5F3EF',
    borderColor: '#E07A5F',
    boxShadow: '0 0 0 3px rgba(224, 122, 95, 0.1)',
  },
}))

const Kbd = styled(Box)(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3px 7px',
  borderRadius: 6,
  backgroundColor: 'rgba(0, 0, 0, 0.06)',
  fontSize: '0.6875rem',
  fontWeight: 600,
  fontFamily: '"JetBrains Mono", monospace',
  color: '#9CA3AF',
}))

const NotificationItem = styled(MenuItem)(() => ({
  padding: '14px 18px',
  borderRadius: 12,
  margin: '4px 10px',
  gap: 14,
  minWidth: 340,
  transition: 'all 200ms ease',

  '&:hover': {
    backgroundColor: '#F8F6F3',
  },
}))

const NotificationIcon = styled(Box)<{ color: 'success' | 'warning' | 'error' | 'info' }>(({ color }) => {
  const colors = {
    success: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22C55E' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' },
    error: { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' },
    info: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' },
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
  width: 42,
  height: 42,
  borderRadius: 12,
  color: '#6B7280',
  transition: 'all 200ms ease',

  '&:hover': {
    backgroundColor: '#F8F6F3',
    color: '#E07A5F',
  },
}))

const StyledBadge = styled(Badge)(() => ({
  '& .MuiBadge-badge': {
    background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '0.6875rem',
    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
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
    title: 'New payment received',
    description: '$99.00 from @user123',
    time: '2 min ago',
  },
  {
    id: 2,
    type: 'info' as const,
    icon: <MessageSquare size={20} />,
    title: 'New message',
    description: '3 users are waiting for response',
    time: '15 min ago',
  },
  {
    id: 3,
    type: 'warning' as const,
    icon: <AlertCircle size={20} />,
    title: 'Subscription expiring',
    description: '12 users expire in 3 days',
    time: '1 hour ago',
  },
]

export default function Header({ onCommandPaletteOpen, onThemeToggle, isDarkMode }: HeaderProps) {
  const [notificationsAnchor, setNotificationsAnchor] = useState<null | HTMLElement>(null)
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null)

  return (
    <StyledAppBar position="fixed">
      <Toolbar sx={{ minHeight: HEADER_HEIGHT, px: 3.5 }}>
        {/* Search / Command Palette Trigger */}
        <SearchWrapper onClick={onCommandPaletteOpen}>
          <Search size={18} style={{ color: '#9CA3AF' }} />
          <Typography
            sx={{
              flex: 1,
              color: '#9CA3AF',
              fontSize: '0.9375rem',
              fontWeight: 500,
            }}
          >
            Search or command...
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Kbd><Command size={11} /></Kbd>
            <Kbd>K</Kbd>
          </Box>
        </SearchWrapper>

        <Box sx={{ flex: 1 }} />

        {/* Right side actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Theme Toggle */}
          <Tooltip title={isDarkMode ? 'Light mode' : 'Dark mode'}>
            <StyledIconButton onClick={onThemeToggle}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </StyledIconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <StyledIconButton onClick={(e) => setNotificationsAnchor(e.currentTarget)}>
              <StyledBadge badgeContent={3}>
                <Bell size={20} />
              </StyledBadge>
            </StyledIconButton>
          </Tooltip>

          {/* Profile */}
          <Tooltip title="Profile">
            <IconButton
              onClick={(e) => setProfileAnchor(e.currentTarget)}
              sx={{ ml: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  boxShadow: '0 2px 8px rgba(224, 122, 95, 0.3)',
                }}
              >
                A
              </Avatar>
            </IconButton>
          </Tooltip>
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
              borderRadius: '16px',
              minWidth: 380,
              maxHeight: 440,
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            },
          }}
        >
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography
              sx={{
                fontSize: '1.0625rem',
                fontWeight: 700,
                color: '#1A1A2E',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >
              Notifications
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF', fontWeight: 500 }}>
              You have 3 unread notifications
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
                color: '#E07A5F',
                fontWeight: 600,
              }}
            >
              View all notifications
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
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
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
            <Typography sx={{ fontSize: '0.9375rem', color: '#1A1A2E' }}>Profile</Typography>
          </MenuItem>
          <MenuItem sx={{ py: 1.5, px: 2.5, gap: 1.5, borderRadius: '8px', mx: 1, my: 0.5 }}>
            <Settings size={18} style={{ color: '#6B7280' }} />
            <Typography sx={{ fontSize: '0.9375rem', color: '#1A1A2E' }}>Settings</Typography>
          </MenuItem>
          <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.06)', my: 0.5 }} />
          <MenuItem sx={{ py: 1.5, px: 2.5, gap: 1.5, borderRadius: '8px', mx: 1, my: 0.5, color: '#EF4444' }}>
            <LogOut size={18} />
            <Typography sx={{ fontSize: '0.9375rem' }}>Logout</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </StyledAppBar>
  )
}
