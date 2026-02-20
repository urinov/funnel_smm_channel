'use client'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { styled, keyframes } from '@mui/material/styles'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  fullScreen?: boolean
  overlay?: boolean
}

const sizeMap = {
  sm: { spinner: 24, text: '0.75rem' },
  md: { spinner: 40, text: '0.875rem' },
  lg: { spinner: 56, text: '1rem' },
}

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const Container = styled(Box, {
  shouldForwardProp: (prop) => !['fullScreen', 'overlay'].includes(prop as string),
})<{ fullScreen?: boolean; overlay?: boolean }>(({ fullScreen, overlay }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,

  ...(fullScreen && {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'var(--bg-primary)',
    zIndex: 9999,
  }),

  ...(overlay && {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
  }),
}))

const StyledSpinner = styled(CircularProgress)(({ theme }) => ({
  color: theme.palette.primary.main,
}))

export default function LoadingSpinner({
  size = 'md',
  label,
  fullScreen = false,
  overlay = false,
}: LoadingSpinnerProps) {
  const sizeConfig = sizeMap[size]

  return (
    <Container fullScreen={fullScreen} overlay={overlay}>
      <StyledSpinner size={sizeConfig.spinner} thickness={3} />
      {label && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: sizeConfig.text,
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        >
          {label}
        </Typography>
      )}
    </Container>
  )
}

// Loading skeleton for content
export function LoadingContent({ rows = 3 }: { rows?: number }) {
  return (
    <Box sx={{ width: '100%' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box
          key={i}
          sx={{
            height: 20,
            mb: 2,
            borderRadius: 1,
            width: i === rows - 1 ? '60%' : '100%',
          }}
          className="skeleton"
        />
      ))}
    </Box>
  )
}

// Page loading state
export function PageLoader() {
  return (
    <LoadingSpinner
      fullScreen
      size="lg"
      label="Loading..."
    />
  )
}

// Section loading state
export function SectionLoader({ label }: { label?: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
      }}
    >
      <LoadingSpinner size="md" label={label} />
    </Box>
  )
}

// Button loading indicator (inline)
export function ButtonLoader({ size = 16 }: { size?: number }) {
  return <CircularProgress size={size} color="inherit" />
}
