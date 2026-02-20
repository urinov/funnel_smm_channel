'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import { styled } from '@mui/material/styles'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  GitBranch,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  CreditCard,
  Tag,
  FileText,
  HelpCircle,
  Zap,
  Bell,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  path?: string
  badge?: number
  children?: NavItem[]
}

const SIDEBAR_WIDTH = 280
const SIDEBAR_COLLAPSED_WIDTH = 80

const navigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Command Center',
    icon: <LayoutDashboard size={20} />,
    path: '/',
  },
  {
    id: 'users',
    label: 'Users',
    icon: <Users size={20} />,
    children: [
      { id: 'users-all', label: 'All Users', icon: <Users size={18} />, path: '/users' },
      { id: 'users-conversations', label: 'Conversations', icon: <MessageSquare size={18} />, path: '/users/conversations', badge: 3 },
      { id: 'users-segments', label: 'Segments', icon: <Tag size={18} />, path: '/users/segments' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: <BookOpen size={20} />,
    children: [
      { id: 'content-lessons', label: 'Lessons', icon: <FileText size={18} />, path: '/content/lessons' },
      { id: 'content-custdev', label: 'Custdev', icon: <HelpCircle size={18} />, path: '/content/custdev' },
      { id: 'content-pitch', label: 'Pitch', icon: <Zap size={18} />, path: '/content/pitch' },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    icon: <DollarSign size={20} />,
    children: [
      { id: 'revenue-transactions', label: 'Transactions', icon: <CreditCard size={18} />, path: '/revenue/transactions' },
      { id: 'revenue-plans', label: 'Subscription Plans', icon: <Tag size={18} />, path: '/revenue/plans' },
      { id: 'revenue-promo', label: 'Promo Codes', icon: <Tag size={18} />, path: '/revenue/promo' },
    ],
  },
  {
    id: 'funnels',
    label: 'Funnels',
    icon: <GitBranch size={20} />,
    path: '/funnels',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 size={20} />,
    path: '/analytics',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={20} />,
    path: '/settings',
  },
]

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'collapsed',
})<{ collapsed?: boolean }>(({ theme, collapsed }) => ({
  width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  transition: 'width 200ms ease',

  '& .MuiDrawer-paper': {
    width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    transition: 'width 200ms ease',
    overflowX: 'hidden',
  },
}))

const Logo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '20px 20px 16px',
  minHeight: 64,
}))

const LogoIcon = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#FFFFFF',
  fontWeight: 700,
  fontSize: '1.25rem',
  flexShrink: 0,
}))

const NavSection = styled(Box)(({ theme }) => ({
  padding: '8px 12px',
}))

const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: theme.palette.text.secondary,
  padding: '8px 8px 4px',
}))

const NavItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => !['active', 'nested'].includes(prop as string),
})<{ active?: boolean; nested?: boolean }>(({ theme, active, nested }) => ({
  borderRadius: 10,
  marginBottom: 2,
  padding: nested ? '8px 12px 8px 44px' : '10px 12px',
  transition: 'all 150ms ease',
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  backgroundColor: active
    ? theme.palette.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.15)'
      : 'rgba(99, 102, 241, 0.08)'
    : 'transparent',

  '&:hover': {
    backgroundColor: active
      ? theme.palette.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.12)'
      : theme.palette.action.hover,
  },

  '& .MuiListItemIcon-root': {
    minWidth: 36,
    color: 'inherit',
  },

  '& .MuiListItemText-primary': {
    fontWeight: active ? 600 : 500,
    fontSize: nested ? '0.875rem' : '0.9375rem',
  },
}))

const Badge = styled(Box)(({ theme }) => ({
  minWidth: 20,
  height: 20,
  padding: '0 6px',
  borderRadius: 10,
  backgroundColor: theme.palette.error.main,
  color: '#FFFFFF',
  fontSize: '0.6875rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const CollapseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: -12,
  top: 70,
  width: 24,
  height: 24,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '50%',
  zIndex: 1,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}))

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['users', 'content', 'revenue'])

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const isActive = (path?: string) => {
    if (!path) return false
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const renderNavItem = (item: NavItem, nested = false) => {
    const active = isActive(item.path)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)

    if (hasChildren) {
      return (
        <Box key={item.id}>
          <NavItemButton
            onClick={() => toggleExpand(item.id)}
            active={item.children?.some((child) => isActive(child.path))}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText primary={item.label} />
                <ChevronDown
                  size={16}
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 200ms ease',
                  }}
                />
              </>
            )}
          </NavItemButton>
          {!collapsed && (
            <Collapse in={isExpanded} timeout="auto">
              <List disablePadding>
                {item.children?.map((child) => renderNavItem(child, true))}
              </List>
            </Collapse>
          )}
        </Box>
      )
    }

    const content = (
      <NavItemButton active={active} nested={nested}>
        <ListItemIcon>{item.icon}</ListItemIcon>
        {!collapsed && (
          <>
            <ListItemText primary={item.label} />
            {item.badge && item.badge > 0 && <Badge>{item.badge}</Badge>}
          </>
        )}
      </NavItemButton>
    )

    if (collapsed) {
      return (
        <Tooltip key={item.id} title={item.label} placement="right" arrow>
          <ListItem disablePadding>
            <Link href={item.path || '#'} style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
              {content}
            </Link>
          </ListItem>
        </Tooltip>
      )
    }

    return (
      <ListItem key={item.id} disablePadding>
        <Link href={item.path || '#'} style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
          {content}
        </Link>
      </ListItem>
    )
  }

  return (
    <StyledDrawer variant="permanent" collapsed={collapsed}>
      <Box sx={{ position: 'relative' }}>
        <CollapseButton onClick={() => setCollapsed(!collapsed)} size="small">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </CollapseButton>
      </Box>

      <Logo>
        <LogoIcon>F</LogoIcon>
        {!collapsed && (
          <Box>
            <Typography variant="h6" fontWeight={700} fontSize="1rem">
              Funnel Admin
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Dashboard
            </Typography>
          </Box>
        )}
      </Logo>

      <Divider sx={{ mx: 2, mb: 1 }} />

      <NavSection sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && <SectionLabel>Navigation</SectionLabel>}
        <List disablePadding>
          {navigation.map((item) => renderNavItem(item))}
        </List>
      </NavSection>

      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        {!collapsed && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Bell size={24} style={{ marginBottom: 8 }} />
            <Typography variant="body2" fontWeight={600}>
              Need help?
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Check documentation
            </Typography>
          </Box>
        )}
      </Box>
    </StyledDrawer>
  )
}
