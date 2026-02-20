// MUI Imports
import type { Theme } from '@mui/material/styles'

const colorSchemes = (): Theme['colorSchemes'] => {
  return {
    light: {
      palette: {
        primary: {
          main: '#E07A5F', // Warm coral/terracotta
          light: '#E8968B',
          dark: '#D4654A',
          contrastText: '#FFFFFF',
          lighterOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.38)'
        },
        secondary: {
          main: '#E8B931', // Warm gold
          light: '#ECC85A',
          dark: '#D1A62C',
          contrastText: '#1A1A2E',
          lighterOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.38)'
        },
        error: {
          main: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
          contrastText: '#fff',
          lighterOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.38)'
        },
        warning: {
          main: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
          contrastText: '#fff',
          lighterOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.38)'
        },
        info: {
          main: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
          contrastText: '#fff',
          lighterOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.38)'
        },
        success: {
          main: '#22C55E',
          light: '#4ADE80',
          dark: '#16A34A',
          contrastText: '#fff',
          lighterOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.38)'
        },
        text: {
          primary: '#1A1A2E',
          secondary: '#6B7280',
          disabled: '#9CA3AF',
          primaryChannel: '26 26 46',
          secondaryChannel: '107 114 128'
        },
        divider: 'rgba(0, 0, 0, 0.08)',
        dividerChannel: '0 0 0',
        background: {
          default: '#F8F6F3', // Warm off-white
          paper: '#FFFFFF'
        },
        action: {
          active: 'rgba(26, 26, 46, 0.56)',
          hover: 'rgba(26, 26, 46, 0.04)',
          selected: 'rgba(224, 122, 95, 0.12)',
          disabled: 'rgba(26, 26, 46, 0.26)',
          disabledBackground: 'rgba(26, 26, 46, 0.12)',
          focus: 'rgba(224, 122, 95, 0.12)',
          focusOpacity: 0.12,
          activeChannel: '26 26 46',
          selectedChannel: '224 122 95'
        },
        Alert: {
          errorColor: 'var(--mui-palette-error-main)',
          warningColor: 'var(--mui-palette-warning-main)',
          infoColor: 'var(--mui-palette-info-main)',
          successColor: 'var(--mui-palette-success-main)',
          errorStandardBg: 'var(--mui-palette-error-lightOpacity)',
          warningStandardBg: 'var(--mui-palette-warning-lightOpacity)',
          infoStandardBg: 'var(--mui-palette-info-lightOpacity)',
          successStandardBg: 'var(--mui-palette-success-lightOpacity)',
          errorFilledColor: 'var(--mui-palette-error-contrastText)',
          warningFilledColor: 'var(--mui-palette-warning-contrastText)',
          infoFilledColor: 'var(--mui-palette-info-contrastText)',
          successFilledColor: 'var(--mui-palette-success-contrastText)',
          errorFilledBg: 'var(--mui-palette-error-main)',
          warningFilledBg: 'var(--mui-palette-warning-main)',
          infoFilledBg: 'var(--mui-palette-info-main)',
          successFilledBg: 'var(--mui-palette-success-main)'
        },
        Avatar: {
          defaultBg: '#F5F3EF'
        },
        Chip: {
          defaultBorder: 'var(--mui-palette-divider)'
        },
        FilledInput: {
          bg: 'rgba(26, 26, 46, 0.04)',
          hoverBg: 'rgba(26, 26, 46, 0.06)',
          disabledBg: 'rgba(26, 26, 46, 0.04)'
        },
        LinearProgress: {
          primaryBg: 'var(--mui-palette-primary-mainOpacity)',
          secondaryBg: 'var(--mui-palette-secondary-mainOpacity)',
          errorBg: 'var(--mui-palette-error-mainOpacity)',
          warningBg: 'var(--mui-palette-warning-mainOpacity)',
          infoBg: 'var(--mui-palette-info-mainOpacity)',
          successBg: 'var(--mui-palette-success-mainOpacity)'
        },
        SnackbarContent: {
          bg: '#1A1A2E',
          color: '#FFFFFF'
        },
        Switch: {
          defaultColor: 'var(--mui-palette-common-white)',
          defaultDisabledColor: 'var(--mui-palette-common-white)',
          primaryDisabledColor: 'var(--mui-palette-common-white)',
          secondaryDisabledColor: 'var(--mui-palette-common-white)',
          errorDisabledColor: 'var(--mui-palette-common-white)',
          warningDisabledColor: 'var(--mui-palette-common-white)',
          infoDisabledColor: 'var(--mui-palette-common-white)',
          successDisabledColor: 'var(--mui-palette-common-white)'
        },
        Tooltip: {
          bg: '#1A1A2E'
        },
        TableCell: {
          border: 'var(--mui-palette-divider)'
        },
        customColors: {
          bodyBg: '#F8F6F3',
          chatBg: '#FAFAF7',
          greyLightBg: '#F5F3EF',
          inputBorder: 'rgba(26, 26, 46, 0.16)',
          tableHeaderBg: '#F5F3EF',
          tooltipText: '#FFFFFF',
          trackBg: '#E8E8E8'
        }
      }
    },
    dark: {
      palette: {
        primary: {
          main: '#E07A5F',
          light: '#E8968B',
          dark: '#D4654A',
          contrastText: '#FFFFFF',
          lighterOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-primary-mainChannel) / 0.38)'
        },
        secondary: {
          main: '#E8B931',
          light: '#ECC85A',
          dark: '#D1A62C',
          contrastText: '#1A1A2E',
          lighterOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.38)'
        },
        error: {
          main: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
          contrastText: '#fff',
          lighterOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-error-mainChannel) / 0.38)'
        },
        warning: {
          main: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
          contrastText: '#fff',
          lighterOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-warning-mainChannel) / 0.38)'
        },
        info: {
          main: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
          contrastText: '#fff',
          lighterOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-info-mainChannel) / 0.38)'
        },
        success: {
          main: '#22C55E',
          light: '#4ADE80',
          dark: '#16A34A',
          contrastText: '#fff',
          lighterOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.08)',
          lightOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.16)',
          mainOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.24)',
          darkOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.32)',
          darkerOpacity: 'rgb(var(--mui-palette-success-mainChannel) / 0.38)'
        },
        text: {
          primary: 'rgba(255, 255, 255, 0.9)',
          secondary: 'rgba(255, 255, 255, 0.7)',
          disabled: 'rgba(255, 255, 255, 0.4)',
          primaryChannel: '255 255 255',
          secondaryChannel: '255 255 255'
        },
        divider: 'rgba(255, 255, 255, 0.12)',
        dividerChannel: '255 255 255',
        background: {
          default: '#1A1A2E',
          paper: '#2D2D44'
        },
        action: {
          active: 'rgba(255, 255, 255, 0.56)',
          hover: 'rgba(255, 255, 255, 0.04)',
          selected: 'rgba(224, 122, 95, 0.16)',
          disabled: 'rgba(255, 255, 255, 0.26)',
          disabledBackground: 'rgba(255, 255, 255, 0.12)',
          focus: 'rgba(224, 122, 95, 0.12)',
          focusOpacity: 0.12,
          activeChannel: '255 255 255',
          selectedChannel: '224 122 95'
        },
        Alert: {
          errorColor: 'var(--mui-palette-error-main)',
          warningColor: 'var(--mui-palette-warning-main)',
          infoColor: 'var(--mui-palette-info-main)',
          successColor: 'var(--mui-palette-success-main)',
          errorStandardBg: 'var(--mui-palette-error-lightOpacity)',
          warningStandardBg: 'var(--mui-palette-warning-lightOpacity)',
          infoStandardBg: 'var(--mui-palette-info-lightOpacity)',
          successStandardBg: 'var(--mui-palette-success-lightOpacity)',
          errorFilledColor: 'var(--mui-palette-error-contrastText)',
          warningFilledColor: 'var(--mui-palette-warning-contrastText)',
          infoFilledColor: 'var(--mui-palette-info-contrastText)',
          successFilledColor: 'var(--mui-palette-success-contrastText)',
          errorFilledBg: 'var(--mui-palette-error-main)',
          warningFilledBg: 'var(--mui-palette-warning-main)',
          infoFilledBg: 'var(--mui-palette-info-main)',
          successFilledBg: 'var(--mui-palette-success-main)'
        },
        Avatar: {
          defaultBg: '#3D3D52'
        },
        Chip: {
          defaultBorder: 'var(--mui-palette-divider)'
        },
        FilledInput: {
          bg: 'rgba(255, 255, 255, 0.06)',
          hoverBg: 'rgba(255, 255, 255, 0.08)',
          disabledBg: 'rgba(255, 255, 255, 0.06)'
        },
        LinearProgress: {
          primaryBg: 'var(--mui-palette-primary-mainOpacity)',
          secondaryBg: 'var(--mui-palette-secondary-mainOpacity)',
          errorBg: 'var(--mui-palette-error-mainOpacity)',
          warningBg: 'var(--mui-palette-warning-mainOpacity)',
          infoBg: 'var(--mui-palette-info-mainOpacity)',
          successBg: 'var(--mui-palette-success-mainOpacity)'
        },
        SnackbarContent: {
          bg: '#F8F6F3',
          color: '#1A1A2E'
        },
        Switch: {
          defaultColor: 'var(--mui-palette-common-white)',
          defaultDisabledColor: 'var(--mui-palette-common-white)',
          primaryDisabledColor: 'var(--mui-palette-common-white)',
          secondaryDisabledColor: 'var(--mui-palette-common-white)',
          errorDisabledColor: 'var(--mui-palette-common-white)',
          warningDisabledColor: 'var(--mui-palette-common-white)',
          infoDisabledColor: 'var(--mui-palette-common-white)',
          successDisabledColor: 'var(--mui-palette-common-white)'
        },
        Tooltip: {
          bg: '#F8F6F3'
        },
        TableCell: {
          border: 'var(--mui-palette-divider)'
        },
        customColors: {
          bodyBg: '#1A1A2E',
          chatBg: '#2D2D44',
          greyLightBg: '#3D3D52',
          inputBorder: 'rgba(255, 255, 255, 0.16)',
          tableHeaderBg: '#2D2D44',
          tooltipText: '#1A1A2E',
          trackBg: '#3D3D52'
        }
      }
    }
  } as Theme['colorSchemes']
}

export default colorSchemes
