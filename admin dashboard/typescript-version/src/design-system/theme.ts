// MUI Theme Configuration - Funnel SMM Channel Admin
import { createTheme, type ThemeOptions } from '@mui/material/styles'

import { colors, typography, borderRadius, shadows, transitions } from './tokens'

// Light Theme Options
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary[500],
      light: colors.primary[400],
      dark: colors.primary[600],
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colors.neutral[600],
      light: colors.neutral[400],
      dark: colors.neutral[700],
      contrastText: '#FFFFFF',
    },
    success: {
      main: colors.success[500],
      light: colors.success[400],
      dark: colors.success[600],
      contrastText: '#FFFFFF',
    },
    warning: {
      main: colors.warning[500],
      light: colors.warning[400],
      dark: colors.warning[600],
      contrastText: '#FFFFFF',
    },
    error: {
      main: colors.danger[500],
      light: colors.danger[400],
      dark: colors.danger[600],
      contrastText: '#FFFFFF',
    },
    info: {
      main: colors.info[500],
      light: colors.info[400],
      dark: colors.info[600],
      contrastText: '#FFFFFF',
    },
    background: {
      default: colors.neutral[50],
      paper: colors.neutral[0],
    },
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[600],
      disabled: colors.neutral[400],
    },
    divider: colors.neutral[200],
    action: {
      active: colors.neutral[600],
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(99, 102, 241, 0.08)',
      disabled: colors.neutral[300],
      disabledBackground: colors.neutral[100],
    },
  },
  typography: {
    fontFamily: typography.fontFamily.sans.join(', '),
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    shadows.sm,
    shadows.DEFAULT,
    shadows.DEFAULT,
    shadows.md,
    shadows.md,
    shadows.md,
    shadows.lg,
    shadows.lg,
    shadows.lg,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${colors.neutral[300]} transparent`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 4,
            backgroundColor: colors.neutral[300],
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          padding: '10px 20px',
          fontWeight: 500,
          boxShadow: 'none',
          transition: `all ${transitions.duration[200]} ${transitions.timing.DEFAULT}`,
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: colors.primary[600],
            boxShadow: shadows.primary,
          },
        },
        containedSuccess: {
          '&:hover': {
            backgroundColor: colors.success[600],
            boxShadow: shadows.success,
          },
        },
        containedError: {
          '&:hover': {
            backgroundColor: colors.danger[600],
            boxShadow: shadows.danger,
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '12px 28px',
          fontSize: '1rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.xl,
          boxShadow: shadows.sm,
          border: `1px solid ${colors.neutral[200]}`,
          transition: `all ${transitions.duration[200]} ${transitions.timing.DEFAULT}`,
          '&:hover': {
            boxShadow: shadows.md,
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '20px 24px 16px',
        },
        title: {
          fontSize: '1.125rem',
          fontWeight: 600,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
          '&:last-child': {
            paddingBottom: 24,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: borderRadius.md,
            transition: `all ${transitions.duration[200]} ${transitions.timing.DEFAULT}`,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary[400],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary[500],
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          fontWeight: 500,
        },
        colorSuccess: {
          backgroundColor: colors.success[100],
          color: colors.success[700],
        },
        colorWarning: {
          backgroundColor: colors.warning[100],
          color: colors.warning[700],
        },
        colorError: {
          backgroundColor: colors.danger[100],
          color: colors.danger[700],
        },
        colorInfo: {
          backgroundColor: colors.info[100],
          color: colors.info[700],
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: colors.neutral[50],
            borderBottom: `1px solid ${colors.neutral[200]}`,
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.neutral[600],
            padding: '14px 16px',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            transition: `background-color ${transitions.duration[150]} ${transitions.timing.DEFAULT}`,
            '&:hover': {
              backgroundColor: colors.neutral[50],
            },
          },
          '& .MuiTableCell-root': {
            borderBottom: `1px solid ${colors.neutral[100]}`,
            padding: '16px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: borderRadius.lg,
        },
        elevation1: {
          boxShadow: shadows.sm,
        },
        elevation2: {
          boxShadow: shadows.DEFAULT,
        },
        elevation3: {
          boxShadow: shadows.md,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.neutral[800],
          borderRadius: borderRadius.md,
          fontSize: '0.8125rem',
          padding: '8px 12px',
        },
        arrow: {
          color: colors.neutral[800],
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          border: '1px solid',
        },
        standardSuccess: {
          backgroundColor: colors.success[50],
          borderColor: colors.success[200],
          color: colors.success[800],
          '& .MuiAlert-icon': {
            color: colors.success[600],
          },
        },
        standardWarning: {
          backgroundColor: colors.warning[50],
          borderColor: colors.warning[200],
          color: colors.warning[800],
          '& .MuiAlert-icon': {
            color: colors.warning[600],
          },
        },
        standardError: {
          backgroundColor: colors.danger[50],
          borderColor: colors.danger[200],
          color: colors.danger[800],
          '& .MuiAlert-icon': {
            color: colors.danger[600],
          },
        },
        standardInfo: {
          backgroundColor: colors.info[50],
          borderColor: colors.info[200],
          color: colors.info[800],
          '& .MuiAlert-icon': {
            color: colors.info[600],
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: borderRadius.xl,
          boxShadow: shadows['2xl'],
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
        colorDefault: {
          backgroundColor: colors.primary[100],
          color: colors.primary[600],
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
          fontSize: '0.6875rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.full,
          height: 6,
          backgroundColor: colors.neutral[200],
        },
        bar: {
          borderRadius: borderRadius.full,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: colors.neutral[200],
        },
        rounded: {
          borderRadius: borderRadius.md,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9375rem',
          minHeight: 48,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
  },
}

// Dark Theme Options
const darkThemeOptions: ThemeOptions = {
  ...lightThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: colors.primary[400],
      light: colors.primary[300],
      dark: colors.primary[500],
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colors.neutral[400],
      light: colors.neutral[300],
      dark: colors.neutral[500],
      contrastText: '#FFFFFF',
    },
    success: {
      main: colors.success[400],
      light: colors.success[300],
      dark: colors.success[500],
      contrastText: '#FFFFFF',
    },
    warning: {
      main: colors.warning[400],
      light: colors.warning[300],
      dark: colors.warning[500],
      contrastText: '#000000',
    },
    error: {
      main: colors.danger[400],
      light: colors.danger[300],
      dark: colors.danger[500],
      contrastText: '#FFFFFF',
    },
    info: {
      main: colors.info[400],
      light: colors.info[300],
      dark: colors.info[500],
      contrastText: '#FFFFFF',
    },
    background: {
      default: colors.neutral[950],
      paper: colors.neutral[900],
    },
    text: {
      primary: colors.neutral[50],
      secondary: colors.neutral[400],
      disabled: colors.neutral[600],
    },
    divider: colors.neutral[800],
    action: {
      active: colors.neutral[400],
      hover: 'rgba(255, 255, 255, 0.05)',
      selected: 'rgba(99, 102, 241, 0.15)',
      disabled: colors.neutral[600],
      disabledBackground: colors.neutral[800],
    },
  },
  components: {
    ...lightThemeOptions.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${colors.neutral[700]} transparent`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 4,
            backgroundColor: colors.neutral[700],
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.xl,
          boxShadow: 'none',
          border: `1px solid ${colors.neutral[800]}`,
          backgroundColor: colors.neutral[900],
          transition: `all ${transitions.duration[200]} ${transitions.timing.DEFAULT}`,
          '&:hover': {
            borderColor: colors.neutral[700],
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: colors.neutral[900],
            borderBottom: `1px solid ${colors.neutral[800]}`,
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.neutral[400],
            padding: '14px 16px',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            '&:hover': {
              backgroundColor: colors.neutral[800],
            },
          },
          '& .MuiTableCell-root': {
            borderBottom: `1px solid ${colors.neutral[800]}`,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${colors.neutral[800]}`,
          backgroundColor: colors.neutral[900],
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        colorSuccess: {
          backgroundColor: `${colors.success[500]}20`,
          color: colors.success[400],
        },
        colorWarning: {
          backgroundColor: `${colors.warning[500]}20`,
          color: colors.warning[400],
        },
        colorError: {
          backgroundColor: `${colors.danger[500]}20`,
          color: colors.danger[400],
        },
        colorInfo: {
          backgroundColor: `${colors.info[500]}20`,
          color: colors.info[400],
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardSuccess: {
          backgroundColor: `${colors.success[500]}15`,
          borderColor: `${colors.success[500]}30`,
          color: colors.success[300],
        },
        standardWarning: {
          backgroundColor: `${colors.warning[500]}15`,
          borderColor: `${colors.warning[500]}30`,
          color: colors.warning[300],
        },
        standardError: {
          backgroundColor: `${colors.danger[500]}15`,
          borderColor: `${colors.danger[500]}30`,
          color: colors.danger[300],
        },
        standardInfo: {
          backgroundColor: `${colors.info[500]}15`,
          borderColor: `${colors.info[500]}30`,
          color: colors.info[300],
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: colors.neutral[800],
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.neutral[700],
        },
        arrow: {
          color: colors.neutral[700],
        },
      },
    },
  },
}

export const lightTheme = createTheme(lightThemeOptions)
export const darkTheme = createTheme(darkThemeOptions)

export type AppTheme = typeof lightTheme
