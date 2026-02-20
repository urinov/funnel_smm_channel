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
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import InputBase from '@mui/material/InputBase'
import { styled, alpha } from '@mui/material/styles'
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
  CheckCircle,
} from 'lucide-react'

const HEADER_HEIGHT = 64

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  zIndex: theme.zIndex.drawer + 1,
}))

const SearchWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
  borderRadius: 10,
  padding: '8px 16px',
  gap: 8,
  cursor: 'pointer',
  transition: 'all 200ms ease',
  border: `1px solid transparent`,
  minWidth: 280,

  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    borderColor: theme.palette.divider,
  },
}))

const Kbd = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 6px',
  borderRadius: 4,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  fontSize: '0.6875rem',
  fontWeight: 600,
  fontFamily: '"JetBrains Mono", monospace',
  color: theme.palette.text.secondary,
}))

const NotificationItem = styled(MenuItem)(({ theme }) => ({
  padding: '12px 16px',
  borderRadius: 8,
  margin: '2px 8px',
  gap: 12,
  minWidth: 320,

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}))

const NotificationIcon = styled(Box)<{ color: 'success' | 'warning' | 'error' | 'info' }>(
  ({ theme, color }) => {
    const colors = {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    }

    return {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: `${colors[color]}15`,
      color: colors[color],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }
  }
)

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
      <Toolbar sx={{ minHeight: HEADER_HEIGHT, px: 3 }}>
        {/* Search / Command Palette Trigger */}
        <SearchWrapper onClick={onCommandPaletteOpen}>
          <Search size={18} style={{ opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            Search or command...
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Kbd><Command size={12} /></Kbd>
            <Kbd>K</Kbd>
          </Box>
        </SearchWrapper>

        <Box sx={{ flex: 1 }} />

        {/* Right side actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Theme Toggle */}
          <Tooltip title={isDarkMode ? 'Light mode' : 'Dark mode'}>
            <IconButton onClick={onThemeToggle} sx={{ color: 'text.secondary' }}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              onClick={(e) => setNotificationsAnchor(e.currentTarget)}
              sx={{ color: 'text.secondary' }}
            >
              <Badge badgeContent={3} color="error">
                <Bell size={20} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Profile */}
          <Tooltip title="Profile">
            <IconButton
              onClick={(e) => setProfileAnchor(e.currentTarget)}
              sx={{ ml: 1 }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.main',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
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
              mt: 1,
              borderRadius: 2,
              minWidth: 360,
              maxHeight: 400,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="h6" fontSize="1rem" fontWeight={600}>
              Notifications
            </Typography>
            <Typography variant="caption" color="text.secondary">
              You have 3 unread notifications
            </Typography>
          </Box>
          <Divider />
          {mockNotifications.map((notification) => (
            <NotificationItem key={notification.id}>
              <NotificationIcon color={notification.type}>
                {notification.icon}
              </NotificationIcon>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {notification.description}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {notification.time}
              </Typography>
            </NotificationItem>
          ))}
          <Divider />
          <MenuItem sx={{ justifyContent: 'center', py: 1.5 }}>
            <Typography variant="body2" color="primary" fontWeight={600}>
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
              mt: 1,
              borderRadius: 2,
              minWidth: 200,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" fontWeight={600}>
              Admin User
            </Typography>
            <Typography variant="caption" color="text.secondary">
              admin@funnel.uz
            </Typography>
          </Box>
          <Divider />
          <MenuItem sx={{ py: 1.5, px: 2, gap: 1.5 }}>
            <User size={18} />
            <Typography variant="body2">Profile</Typography>
          </MenuItem>
          <MenuItem sx={{ py: 1.5, px: 2, gap: 1.5 }}>
            <Settings size={18} />
            <Typography variant="body2">Settings</Typography>
          </MenuItem>
          <Divider />
          <MenuItem sx={{ py: 1.5, px: 2, gap: 1.5, color: 'error.main' }}>
            <LogOut size={18} />
            <Typography variant="body2">Logout</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </StyledAppBar>
  )
}
