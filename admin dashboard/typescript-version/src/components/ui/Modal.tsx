'use client'

import { ReactNode } from 'react'
import Dialog, { DialogProps } from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Slide from '@mui/material/Slide'
import { styled } from '@mui/material/styles'
import { TransitionProps } from '@mui/material/transitions'
import { X } from 'lucide-react'
import { forwardRef } from 'react'

export interface ModalProps extends Omit<DialogProps, 'title'> {
  title?: ReactNode
  subtitle?: string
  children: ReactNode
  actions?: ReactNode
  onClose: () => void
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  centered?: boolean
}

const sizeMap = {
  xs: 400,
  sm: 500,
  md: 600,
  lg: 800,
  xl: 1000,
  full: '100%',
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />
})

const StyledDialog = styled(Dialog, {
  shouldForwardProp: (prop) => !['size', 'centered'].includes(prop as string),
})<{ size?: string; centered?: boolean }>(({ theme, size = 'md', centered }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 20,
    maxWidth: typeof sizeMap[size as keyof typeof sizeMap] === 'number'
      ? sizeMap[size as keyof typeof sizeMap]
      : sizeMap[size as keyof typeof sizeMap],
    width: '100%',
    margin: centered ? 'auto' : 16,
    maxHeight: 'calc(100vh - 64px)',
    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    border: `1px solid ${theme.palette.divider}`,
    animation: 'fadeInUp 0.2s ease-out',
  },
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
  },
}))

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  padding: '20px 24px 16px',
  borderBottom: 'none',
}))

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: '16px 24px 24px',
}))

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: '16px 24px 20px',
  gap: 12,
  borderTop: `1px solid ${theme.palette.divider}`,
}))

const CloseButton = styled(IconButton)(({ theme }) => ({
  marginLeft: 'auto',
  marginTop: -8,
  marginRight: -8,
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary,
  },
}))

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions,
  size = 'md',
  showCloseButton = true,
  centered = true,
  ...props
}: ModalProps) {
  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      size={size}
      centered={centered}
      {...props}
    >
      {(title || showCloseButton) && (
        <StyledDialogTitle>
          <Box>
            {typeof title === 'string' ? (
              <Typography variant="h5" fontWeight={600}>
                {title}
              </Typography>
            ) : (
              title
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {showCloseButton && (
            <CloseButton onClick={onClose} size="small">
              <X size={20} />
            </CloseButton>
          )}
        </StyledDialogTitle>
      )}

      <StyledDialogContent>{children}</StyledDialogContent>

      {actions && <StyledDialogActions>{actions}</StyledDialogActions>}
    </StyledDialog>
  )
}
