'use client'

import { forwardRef, ReactNode } from 'react'
import TextField, { TextFieldProps } from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  hint?: string
  variant?: 'outlined' | 'filled'
}

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 10,
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',

    '& fieldset': {
      borderColor: theme.palette.divider,
      borderWidth: 1,
      transition: 'border-color 200ms ease',
    },

    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },

    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: 2,
    },

    '&.Mui-error fieldset': {
      borderColor: theme.palette.error.main,
    },

    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      '& fieldset': {
        borderColor: theme.palette.divider,
      },
    },
  },

  '& .MuiInputLabel-root': {
    fontSize: '0.9375rem',

    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },

    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },

  '& .MuiInputBase-input': {
    padding: '14px 16px',
    fontSize: '0.9375rem',

    '&::placeholder': {
      color: theme.palette.text.disabled,
      opacity: 1,
    },
  },

  '& .MuiInputBase-inputSizeSmall': {
    padding: '10px 14px',
    fontSize: '0.875rem',
  },

  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    marginTop: 6,
    fontSize: '0.8125rem',

    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
}))

const HintText = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  marginTop: 4,
}))

const Input = forwardRef<HTMLDivElement, InputProps>(
  ({ leftIcon, rightIcon, hint, variant = 'outlined', ...props }, ref) => {
    return (
      <Box sx={{ width: '100%' }}>
        <StyledTextField
          ref={ref}
          variant={variant}
          fullWidth
          InputProps={{
            ...props.InputProps,
            startAdornment: leftIcon ? (
              <InputAdornment position="start" sx={{ color: 'text.secondary' }}>
                {leftIcon}
              </InputAdornment>
            ) : (
              props.InputProps?.startAdornment
            ),
            endAdornment: rightIcon ? (
              <InputAdornment position="end" sx={{ color: 'text.secondary' }}>
                {rightIcon}
              </InputAdornment>
            ) : (
              props.InputProps?.endAdornment
            ),
          }}
          {...props}
        />
        {hint && !props.error && !props.helperText && <HintText>{hint}</HintText>}
      </Box>
    )
  }
)

Input.displayName = 'Input'

export default Input

// Convenience components for common input types
export const SearchInput = forwardRef<HTMLDivElement, Omit<InputProps, 'leftIcon'>>(
  (props, ref) => {
    return (
      <Input
        ref={ref}
        placeholder="Search..."
        leftIcon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        }
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

export const PasswordInput = forwardRef<HTMLDivElement, InputProps>((props, ref) => {
  return <Input ref={ref} type="password" {...props} />
})

PasswordInput.displayName = 'PasswordInput'

export const NumberInput = forwardRef<HTMLDivElement, InputProps>((props, ref) => {
  return (
    <Input
      ref={ref}
      type="number"
      sx={{
        '& input': {
          fontFamily: '"JetBrains Mono", monospace',
          fontVariantNumeric: 'tabular-nums',
        },
        ...props.sx,
      }}
      {...props}
    />
  )
})

NumberInput.displayName = 'NumberInput'
