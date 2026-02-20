// Theme Configuration - Funnel SMM Channel Admin
// Premium Dashboard Design System

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
  mode: 'light', // Light mode for warm, professional look
  layoutPadding: 32,
  compactContentWidth: 1440,
  disableRipple: false,
  sidebarWidth: 280,
  sidebarCollapsedWidth: 80,
  headerHeight: 72,
}

export default themeConfig
