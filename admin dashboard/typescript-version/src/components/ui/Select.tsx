'use client'

import type { ReactNode } from 'react'
import { forwardRef } from 'react'

import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MuiSelect from '@mui/material/Select'
import type { SelectProps as MuiSelectProps } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import FormHelperText from '@mui/material/FormHelperText'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  icon?: ReactNode
  description?: string
  disabled?: boolean
}

export interface SelectProps extends Omit<MuiSelectProps, 'onChange'> {
  options: SelectOption[]
  onChange?: (value: string | number | (string | number)[]) => void
  helperText?: string
  placeholder?: string
}

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 10,
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    transition: 'all 200ms ease',

    '& fieldset': {
      borderColor: theme.palette.divider,
    },

    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },

    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: 2,
    },
  },

  '& .MuiInputLabel-root': {
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },

  '& .MuiSelect-select': {
    padding: '14px 16px',
  },
}))

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  borderRadius: 8,
  margin: '2px 8px',
  padding: '10px 12px',
  transition: 'all 150ms ease',

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },

  '&.Mui-selected': {
    backgroundColor: `${theme.palette.primary.main}15`,
    '&:hover': {
      backgroundColor: `${theme.palette.primary.main}25`,
    },
  },

  '& .MuiListItemIcon-root': {
    minWidth: 36,
    color: theme.palette.text.secondary,
  },

  '&.Mui-selected .MuiListItemIcon-root': {
    color: theme.palette.primary.main,
  },
}))

const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      onChange,
      helperText,
      placeholder,
      label,
      multiple,
      value,
      error,
      disabled,
      fullWidth = true,
      size = 'medium',
      ...props
    },
    ref
  ) => {
    const handleChange = (event: any) => {
      const newValue = event.target.value

      onChange?.(newValue)
    }

    const renderValue = (selected: string | number | (string | number)[]) => {
      if (!selected || (Array.isArray(selected) && selected.length === 0)) {
        return <Box sx={{ color: 'text.disabled' }}>{placeholder}</Box>
      }

      if (multiple && Array.isArray(selected)) {
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((val) => {
              const option = options.find((o) => o.value === val)

              return (
                <Chip
                  key={val}
                  label={option?.label || val}
                  size="small"
                  sx={{ borderRadius: 1.5 }}
                />
              )
            })}
          </Box>
        )
      }

      const option = options.find((o) => o.value === selected)

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {option?.icon}
          {option?.label || selected}
        </Box>
      )
    }

    return (
      <StyledFormControl
        ref={ref}
        fullWidth={fullWidth}
        error={error}
        disabled={disabled}
        size={size}
      >
        {label && <InputLabel>{label}</InputLabel>}
        <MuiSelect
          value={value}
          onChange={handleChange}
          label={label}
          multiple={multiple}
          displayEmpty={!!placeholder}
          renderValue={renderValue}
          IconComponent={(props) => <ChevronDown size={20} {...props} />}
          MenuProps={{
            PaperProps: {
              sx: {
                borderRadius: 2,
                mt: 0.5,
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                border: (theme) => `1px solid ${theme.palette.divider}`,
                '& .MuiList-root': {
                  padding: '8px 0',
                },
              },
            },
          }}
          {...props}
        >
          {options.map((option) => (
            <StyledMenuItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.icon && <ListItemIcon>{option.icon}</ListItemIcon>}
              <ListItemText
                primary={option.label}
                secondary={option.description}
                primaryTypographyProps={{
                  fontWeight: 500,
                  fontSize: '0.9375rem',
                }}
                secondaryTypographyProps={{
                  fontSize: '0.8125rem',
                }}
              />
              {multiple && Array.isArray(value) && value.includes(option.value) && (
                <Check size={18} style={{ marginLeft: 'auto', color: '#6366F1' }} />
              )}
            </StyledMenuItem>
          ))}
        </MuiSelect>
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </StyledFormControl>
    )
  }
)

Select.displayName = 'Select'

export default Select

// Simple select for quick use
export function SimpleSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <Select
      options={options}
      value={value}
      onChange={(v) => onChange(v as string)}
      placeholder={placeholder}
      size="small"
    />
  )
}
