'use client'

import { useState, useEffect, ReactNode } from 'react'
import Box from '@mui/material/Box'
import { styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Sidebar from './Sidebar'
import Header from './Header'
import CommandPalette from './CommandPalette'

const HEADER_HEIGHT = 64
const SIDEBAR_WIDTH = 280

const LayoutRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}))

const MainWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  marginLeft: SIDEBAR_WIDTH,
  transition: 'margin-left 200ms ease',

  [theme.breakpoints.down('lg')]: {
    marginLeft: 0,
  },
}))

const ContentWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  paddingTop: HEADER_HEIGHT,
  minHeight: '100vh',
}))

const Content = styled(Box)(({ theme }) => ({
  padding: 24,
  maxWidth: 1440,
  margin: '0 auto',
  width: '100%',

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
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Detect initial theme
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDarkMode(darkModeMediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    darkModeMediaQuery.addEventListener('change', handler)
    return () => darkModeMediaQuery.removeEventListener('change', handler)
  }, [])

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
    setIsDarkMode((prev) => !prev)
    // Here you would integrate with your theme context/provider
    document.documentElement.setAttribute(
      'data-mui-color-scheme',
      isDarkMode ? 'light' : 'dark'
    )
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
