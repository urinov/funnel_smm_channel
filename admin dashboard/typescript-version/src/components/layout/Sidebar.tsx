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
import { styled, keyframes } from '@mui/material/styles'
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
  Sparkles,
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
    label: 'Umumiy',
    icon: <LayoutDashboard size={22} />,
    path: '/',
  },
  {
    id: 'analytics',
    label: 'Analitika',
    icon: <BarChart3 size={22} />,
    path: '/analytics',
  },
  {
    id: 'users',
    label: 'Foydalanuvchilar',
    icon: <Users size={22} />,
    children: [
      { id: 'users-all', label: 'Barcha userlar', icon: <Users size={20} />, path: '/users' },
      { id: 'users-conversations', label: 'Suhbatlar', icon: <MessageSquare size={20} />, path: '/users/conversations', badge: 3 },
      { id: 'users-segments', label: 'Segmentlar', icon: <Tag size={20} />, path: '/users/segments' },
    ],
  },
  {
    id: 'content',
    label: 'Kontentlar',
    icon: <BookOpen size={22} />,
    children: [
      { id: 'content-lessons', label: 'Darslar', icon: <FileText size={20} />, path: '/content/lessons' },
      { id: 'content-custdev', label: 'Custdev', icon: <HelpCircle size={20} />, path: '/content/custdev' },
      { id: 'content-pitch', label: 'Pitch', icon: <Zap size={20} />, path: '/content/pitch' },
    ],
  },
  {
    id: 'revenue',
    label: 'Daromad',
    icon: <DollarSign size={22} />,
    children: [
      { id: 'revenue-transactions', label: 'Tranzaksiyalar', icon: <CreditCard size={20} />, path: '/revenue/transactions' },
      { id: 'revenue-plans', label: 'Obuna rejalari', icon: <Tag size={20} />, path: '/revenue/plans' },
      { id: 'revenue-promo', label: 'Promo kodlar', icon: <Tag size={20} />, path: '/revenue/promo' },
    ],
  },
  {
    id: 'funnels',
    label: 'Voronkalar',
    icon: <GitBranch size={22} />,
    path: '/funnels',
  },
  {
    id: 'settings',
    label: 'Sozlamalar',
    icon: <Settings size={22} />,
    path: '/settings',
  },
]

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'collapsed',
})<{ collapsed?: boolean }>(({ collapsed }) => ({
  width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  transition: 'width 250ms ease',

  '& .MuiDrawer-paper': {
    width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid rgba(0, 0, 0, 0.06)',
    transition: 'width 250ms ease',
    overflowX: 'hidden',
    boxShadow: '0 0 40px rgba(0, 0, 0, 0.03)',
  },
}))

const Logo = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '24px 24px 20px',
  minHeight: 72,
  animation: `${slideIn} 0.4s ease-out`,
}))

const LogoIcon = styled(Box)(() => ({
  width: 44,
  height: 44,
  borderRadius: 14,
  background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#FFFFFF',
  fontWeight: 800,
  fontSize: '1.25rem',
  flexShrink: 0,
  boxShadow: '0 4px 12px rgba(224, 122, 95, 0.3)',
  transition: 'transform 300ms ease, box-shadow 300ms ease',

  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 6px 16px rgba(224, 122, 95, 0.4)',
  },
}))

const NavSection = styled(Box)(() => ({
  padding: '8px 16px',
}))

const SectionLabel = styled(Typography)(() => ({
  fontSize: '0.8125rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#9CA3AF',
  padding: '20px 14px 10px',
}))

const NavItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => !['active', 'nested'].includes(prop as string),
})<{ active?: boolean; nested?: boolean }>(({ active, nested }) => ({
  borderRadius: 14,
  marginBottom: 6,
  padding: nested ? '12px 14px 12px 52px' : '14px 18px',
  transition: 'all 200ms ease',
  color: active ? '#E07A5F' : '#4B5563',
  backgroundColor: active ? 'rgba(224, 122, 95, 0.1)' : 'transparent',
  position: 'relative',

  '&::before': active ? {
    content: '""',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 4,
    height: '60%',
    borderRadius: '0 4px 4px 0',
    background: 'linear-gradient(180deg, #E07A5F 0%, #E8B931 100%)',
  } : {},

  '&:hover': {
    backgroundColor: active ? 'rgba(224, 122, 95, 0.12)' : 'rgba(0, 0, 0, 0.04)',
    color: active ? '#E07A5F' : '#1A1A2E',
  },

  '& .MuiListItemIcon-root': {
    minWidth: 44,
    color: 'inherit',
    transition: 'transform 200ms ease',
  },

  '&:hover .MuiListItemIcon-root': {
    transform: 'scale(1.1)',
  },

  '& .MuiListItemText-primary': {
    fontWeight: active ? 700 : 600,
    fontSize: nested ? '1rem' : '1.0625rem',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
  },
}))

const Badge = styled(Box)(() => ({
  minWidth: 22,
  height: 22,
  padding: '0 7px',
  borderRadius: 11,
  background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
  color: '#FFFFFF',
  fontSize: '0.6875rem',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
}))

const CollapseButton = styled(IconButton)(() => ({
  position: 'absolute',
  right: -14,
  top: 78,
  width: 28,
  height: 28,
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  borderRadius: '50%',
  zIndex: 1,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  transition: 'all 200ms ease',

  '&:hover': {
    backgroundColor: '#F8F6F3',
    borderColor: '#E07A5F',
    color: '#E07A5F',
    transform: 'scale(1.1)',
  },
}))

const HelpCard = styled(Box)(() => ({
  padding: '20px',
  borderRadius: 16,
  background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
  color: 'white',
  textAlign: 'center',
  boxShadow: '0 4px 20px rgba(224, 122, 95, 0.3)',
  transition: 'transform 300ms ease, box-shadow 300ms ease',

  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 30px rgba(224, 122, 95, 0.4)',
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

  const renderNavItem = (item: NavItem, nested = false, index = 0) => {
    const active = isActive(item.path)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)

    if (hasChildren) {
      return (
        <Box key={item.id} sx={{ animation: `${slideIn} 0.3s ease-out ${index * 50}ms both` }}>
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
                    transition: 'transform 250ms ease',
                  }}
                />
              </>
            )}
          </NavItemButton>
          {!collapsed && (
            <Collapse in={isExpanded} timeout={250}>
              <List disablePadding>
                {item.children?.map((child, childIndex) => renderNavItem(child, true, childIndex))}
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
          <ListItem disablePadding sx={{ animation: `${slideIn} 0.3s ease-out ${index * 50}ms both` }}>
            <Link href={item.path || '#'} style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
              {content}
            </Link>
          </ListItem>
        </Tooltip>
      )
    }

    return (
      <ListItem key={item.id} disablePadding sx={{ animation: `${slideIn} 0.3s ease-out ${index * 50}ms both` }}>
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
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '1.25rem',
                color: '#1A1A2E',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              Funnel Admin
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#9CA3AF',
                fontWeight: 500,
              }}
            >
              Boshqaruv paneli
            </Typography>
          </Box>
        )}
      </Logo>

      <Divider sx={{ mx: 2, mb: 1, borderColor: 'rgba(0, 0, 0, 0.06)' }} />

      <NavSection sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && <SectionLabel>Navigatsiya</SectionLabel>}
        <List disablePadding>
          {navigation.map((item, index) => renderNavItem(item, false, index))}
        </List>
      </NavSection>

      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2, borderColor: 'rgba(0, 0, 0, 0.06)' }} />
        {!collapsed && (
          <HelpCard>
            <Sparkles size={32} style={{ marginBottom: 10, opacity: 0.9 }} />
            <Typography sx={{ fontSize: '1.0625rem', fontWeight: 700, mb: 0.5 }}>
              Yordam kerakmi?
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', opacity: 0.85, fontWeight: 500 }}>
              Dokumentatsiyani ko'ring
            </Typography>
          </HelpCard>
        )}
      </Box>
    </StyledDrawer>
  )
}
