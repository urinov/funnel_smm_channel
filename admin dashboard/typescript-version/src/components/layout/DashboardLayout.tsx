'use client'

import { useState, useEffect, ReactNode } from 'react'
import Box from '@mui/material/Box'
import { styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useSettings } from '@core/hooks/useSettings'
import Sidebar from './Sidebar'
import Header from './Header'
import CommandPalette from './CommandPalette'

const HEADER_HEIGHT = 72
const SIDEBAR_WIDTH = 280

const LayoutRoot = styled(Box)(() => ({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#F8F6F3',
}))

const MainWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  marginLeft: SIDEBAR_WIDTH,
  transition: 'margin-left 250ms ease',

  [theme.breakpoints.down('lg')]: {
    marginLeft: 0,
  },
}))

const ContentWrapper = styled(Box)(() => ({
  flex: 1,
  paddingTop: HEADER_HEIGHT,
  minHeight: '100vh',
}))

const Content = styled(Box)(({ theme }) => ({
  padding: 32,
  maxWidth: 1480,
  margin: '0 auto',
  width: '100%',

  [theme.breakpoints.down('md')]: {
    padding: 24,
  },

  [theme.breakpoints.down('sm')]: {
    padding: 16,
  },
}))

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Use the settings context for theme management
  const { settings, updateSettings } = useSettings()
  const isDarkMode = settings.mode === 'dark'

  // Global keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleThemeToggle = () => {
    updateSettings({ mode: isDarkMode ? 'light' : 'dark' })
  }

  return (
    <LayoutRoot>
      {/* Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main Content Area */}
      <MainWrapper>
        <Header
          onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
          onThemeToggle={handleThemeToggle}
          isDarkMode={isDarkMode}
        />

        <ContentWrapper>
          <Content>{children}</Content>
        </ContentWrapper>
      </MainWrapper>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onThemeToggle={handleThemeToggle}
        isDarkMode={isDarkMode}
      />
    </LayoutRoot>
  )
}
