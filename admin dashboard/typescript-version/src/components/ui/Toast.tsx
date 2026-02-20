'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert, { AlertColor } from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Slide, { SlideProps } from '@mui/material/Slide'
import { styled } from '@mui/material/styles'
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'

export interface ToastOptions {
  title?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface Toast extends ToastOptions {
  id: string
}

interface ToastContextType {
  toast: (options: ToastOptions) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap: Record<string, AlertColor> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

const StyledAlert = styled(Alert)(({ theme }) => ({
  borderRadius: 12,
  padding: '12px 16px',
  alignItems: 'flex-start',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  border: `1px solid ${theme.palette.divider}`,

  '& .MuiAlert-icon': {
    padding: '2px 0',
    marginRight: 12,
    fontSize: 20,
  },

  '& .MuiAlert-message': {
    padding: 0,
  },

  '& .MuiAlertTitle-root': {
    fontWeight: 600,
    marginBottom: 2,
  },
}))

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(7)
    const newToast: Toast = { ...options, id }

    setToasts((prev) => [...prev, newToast])

    if (options.duration !== 0) {
      setTimeout(() => {
        dismiss(id)
      }, options.duration || 5000)
    }
  }, [dismiss])

  const success = useCallback(
    (message: string, title?: string) => toast({ message, title, type: 'success' }),
    [toast]
  )

  const error = useCallback(
    (message: string, title?: string) => toast({ message, title, type: 'error', duration: 7000 }),
    [toast]
  )

  const warning = useCallback(
    (message: string, title?: string) => toast({ message, title, type: 'warning' }),
    [toast]
  )

  const info = useCallback(
    (message: string, title?: string) => toast({ message, title, type: 'info' }),
    [toast]
  )

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {toasts.map((t) => {
          const Icon = iconMap[t.type || 'info']

          return (
            <Snackbar
              key={t.id}
              open={true}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              TransitionComponent={SlideTransition}
              sx={{ position: 'relative', transform: 'none !important' }}
            >
              <StyledAlert
                severity={colorMap[t.type || 'info']}
                icon={<Icon size={20} />}
                action={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                    {t.action && (
                      <Box
                        component="button"
                        onClick={() => {
                          t.action?.onClick()
                          dismiss(t.id)
                        }}
                        sx={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          '&:hover': { opacity: 0.8 },
                        }}
                      >
                        {t.action.label}
                      </Box>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => dismiss(t.id)}
                      sx={{ color: 'inherit', opacity: 0.7, '&:hover': { opacity: 1 } }}
                    >
                      <X size={16} />
                    </IconButton>
                  </Box>
                }
              >
                {t.title && <AlertTitle>{t.title}</AlertTitle>}
                {t.message}
              </StyledAlert>
            </Snackbar>
          )
        })}
      </Box>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}

export default ToastProvider
