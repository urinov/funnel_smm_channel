'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Modal from '@mui/material/Modal'
import InputBase from '@mui/material/InputBase'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { styled } from '@mui/material/styles'
import {
  Search,
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  GitBranch,
  BarChart3,
  Settings,
  MessageSquare,
  CreditCard,
  FileText,
  Sun,
  Moon,
  Plus,
  ArrowRight,
  Hash,
} from 'lucide-react'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  shortcut?: string[]
  action: () => void
  category: 'navigation' | 'actions' | 'settings'
}

const Backdrop = styled(Box)(({ theme }) => ({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(4px)',
  zIndex: theme.zIndex.modal,
}))

const Container = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: '20%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '100%',
  maxWidth: 640,
  backgroundColor: theme.palette.background.paper,
  borderRadius: 16,
  boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  zIndex: theme.zIndex.modal + 1,
  animation: 'fadeInDown 0.15s ease-out',

  '@keyframes fadeInDown': {
    from: {
      opacity: 0,
      transform: 'translateX(-50%) translateY(-10px)',
    },
    to: {
      opacity: 1,
      transform: 'translateX(-50%) translateY(0)',
    },
  },
}))

const SearchInput = styled(InputBase)(({ theme }) => ({
  width: '100%',
  padding: '16px 20px',
  fontSize: '1rem',

  '& input': {
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 1,
    },
  },
}))

const ResultsContainer = styled(Box)(({ theme }) => ({
  maxHeight: 400,
  overflowY: 'auto',
  padding: 8,
}))

const CategoryLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: theme.palette.text.secondary,
  padding: '8px 12px 4px',
}))

const CommandItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'all 100ms ease',
  backgroundColor: selected
    ? theme.palette.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.15)'
      : 'rgba(99, 102, 241, 0.08)'
    : 'transparent',

  '&:hover': {
    backgroundColor: selected
      ? theme.palette.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.12)'
      : theme.palette.action.hover,
  },
}))

const IconWrapper = styled(Box)(({ theme }) => ({
  width: 36,
  height: 36,
  borderRadius: 8,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
  flexShrink: 0,
}))

const Shortcut = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: 4,
  marginLeft: 'auto',
}))

const Kbd = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 24,
  height: 24,
  padding: '0 6px',
  borderRadius: 4,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  fontSize: '0.75rem',
  fontWeight: 600,
  fontFamily: '"JetBrains Mono", monospace',
  color: theme.palette.text.secondary,
}))

const Footer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 16px',
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
}))

const FooterHint = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}))

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onThemeToggle: () => void
  isDarkMode: boolean
}

export default function CommandPalette({
  open,
  onClose,
  onThemeToggle,
  isDarkMode,
}: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const commands: Command[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'View command center',
        icon: <LayoutDashboard size={18} />,
        shortcut: ['G', 'D'],
        action: () => router.push('/'),
        category: 'navigation',
      },
      {
        id: 'nav-users',
        label: 'Go to Users',
        description: 'Manage all users',
        icon: <Users size={18} />,
        shortcut: ['G', 'U'],
        action: () => router.push('/users'),
        category: 'navigation',
      },
      {
        id: 'nav-conversations',
        label: 'Go to Conversations',
        description: 'View user messages',
        icon: <MessageSquare size={18} />,
        action: () => router.push('/users/conversations'),
        category: 'navigation',
      },
      {
        id: 'nav-lessons',
        label: 'Go to Lessons',
        description: 'Manage course content',
        icon: <FileText size={18} />,
        action: () => router.push('/content/lessons'),
        category: 'navigation',
      },
      {
        id: 'nav-transactions',
        label: 'Go to Transactions',
        description: 'View payment history',
        icon: <CreditCard size={18} />,
        action: () => router.push('/revenue/transactions'),
        category: 'navigation',
      },
      {
        id: 'nav-funnels',
        label: 'Go to Funnels',
        description: 'Manage sales funnels',
        icon: <GitBranch size={18} />,
        shortcut: ['G', 'F'],
        action: () => router.push('/funnels'),
        category: 'navigation',
      },
      {
        id: 'nav-analytics',
        label: 'Go to Analytics',
        description: 'View detailed analytics',
        icon: <BarChart3 size={18} />,
        shortcut: ['G', 'A'],
        action: () => router.push('/analytics'),
        category: 'navigation',
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        description: 'Configure application',
        icon: <Settings size={18} />,
        shortcut: ['G', 'S'],
        action: () => router.push('/settings'),
        category: 'navigation',
      },
      // Actions
      {
        id: 'action-new-lesson',
        label: 'Create New Lesson',
        icon: <Plus size={18} />,
        action: () => {
          router.push('/content/lessons?new=true')
        },
        category: 'actions',
      },
      {
        id: 'action-new-promo',
        label: 'Create Promo Code',
        icon: <Hash size={18} />,
        action: () => {
          router.push('/revenue/promo?new=true')
        },
        category: 'actions',
      },
      // Settings
      {
        id: 'settings-theme',
        label: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        icon: isDarkMode ? <Sun size={18} /> : <Moon size={18} />,
        shortcut: ['T'],
        action: () => {
          onThemeToggle()
        },
        category: 'settings',
      },
    ],
    [router, isDarkMode, onThemeToggle]
  )

  const filteredCommands = useMemo(() => {
    if (!search) return commands

    const query = search.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query)
    )
  }, [commands, search])

  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {}

    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    })

    return groups
  }, [filteredCommands])

  const flatCommands = useMemo(() => filteredCommands, [filteredCommands])

  const executeCommand = useCallback(
    (command: Command) => {
      command.action()
      onClose()
      setSearch('')
      setSelectedIndex(0)
    },
    [onClose]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < flatCommands.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatCommands.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, flatCommands, selectedIndex, executeCommand, onClose])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Global keyboard shortcut to open
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [open, onClose])

  if (!open) return null

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    settings: 'Settings',
  }

  let itemIndex = -1

  return (
    <>
      <Backdrop onClick={onClose} />
      <Container>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
          <Search size={20} style={{ opacity: 0.5, marginRight: 12 }} />
          <SearchInput
            autoFocus
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>

        <Divider />

        <ResultsContainer>
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <Box key={category}>
              <CategoryLabel>{categoryLabels[category]}</CategoryLabel>
              {cmds.map((cmd) => {
                itemIndex++
                const isSelected = itemIndex === selectedIndex

                return (
                  <CommandItem
                    key={cmd.id}
                    selected={isSelected}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  >
                    <IconWrapper>{cmd.icon}</IconWrapper>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {cmd.label}
                      </Typography>
                      {cmd.description && (
                        <Typography variant="caption" color="text.secondary">
                          {cmd.description}
                        </Typography>
                      )}
                    </Box>
                    {cmd.shortcut && (
                      <Shortcut>
                        {cmd.shortcut.map((key, i) => (
                          <Kbd key={i}>{key}</Kbd>
                        ))}
                      </Shortcut>
                    )}
                    {isSelected && (
                      <ArrowRight size={16} style={{ opacity: 0.5, marginLeft: 8 }} />
                    )}
                  </CommandItem>
                )
              })}
            </Box>
          ))}

          {filteredCommands.length === 0 && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No commands found for "{search}"
              </Typography>
            </Box>
          )}
        </ResultsContainer>

        <Footer>
          <FooterHint>
            <Kbd>↵</Kbd>
            <span>Select</span>
          </FooterHint>
          <FooterHint>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span>Navigate</span>
          </FooterHint>
          <FooterHint>
            <Kbd>Esc</Kbd>
            <span>Close</span>
          </FooterHint>
        </Footer>
      </Container>
    </>
  )
}
