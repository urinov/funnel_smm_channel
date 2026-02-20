// Theme Configuration - Funnel SMM Channel Admin
// Controls the core theme settings for the application

import type { Mode } from '@core/types'

export type Config = {
  templateName: string
  settingsCookieName: string
  mode: Mode
  layoutPadding: number
  compactContentWidth: number
  disableRipple: boolean
  sidebarWidth: number
  sidebarCollapsedWidth: number
  headerHeight: number
}

const themeConfig: Config = {
  templateName: 'Funnel Admin',
  settingsCookieName: 'funnel-admin-settings',
  mode: 'dark', // Default to dark mode for modern look
  layoutPadding: 24,
  compactContentWidth: 1440,
  disableRipple: false,
  sidebarWidth: 280,
  sidebarCollapsedWidth: 80,
  headerHeight: 64,
}

export default themeConfig
