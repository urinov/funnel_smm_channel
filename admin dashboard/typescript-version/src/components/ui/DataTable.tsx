'use client'

import { useState, useMemo, ReactNode } from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import TableSortLabel from '@mui/material/TableSortLabel'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import { Search, Inbox } from 'lucide-react'

export interface Column<T> {
  id: keyof T | string
  label: string
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (row: T) => ReactNode
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  selectable?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  onSelectionChange?: (selectedRows: T[]) => void
  emptyMessage?: string
  emptyIcon?: ReactNode
  getRowId?: (row: T) => string | number
  defaultRowsPerPage?: number
  rowsPerPageOptions?: number[]
}

const StyledTableContainer = styled(Paper)(({ theme }) => ({
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  boxShadow: 'none',
}))

const SearchField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 10,
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    '& fieldset': {
      borderColor: 'transparent',
    },
    '&:hover fieldset': {
      borderColor: theme.palette.divider,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: 1,
    },
  },
}))

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  '& .MuiTableCell-head': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '14px 16px',
  },
}))

const StyledTableRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== 'clickable',
})<{ clickable?: boolean }>(({ theme, clickable }) => ({
  transition: 'background-color 150ms ease',
  cursor: clickable ? 'pointer' : 'default',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  },
  '& .MuiTableCell-body': {
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '16px',
  },
}))

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 24px',
  color: theme.palette.text.secondary,
  '& svg': {
    width: 48,
    height: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
}))

type Order = 'asc' | 'desc'

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  selectable = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  onRowClick,
  onSelectionChange,
  emptyMessage = 'No data available',
  emptyIcon,
  getRowId = (row: T) => JSON.stringify(row),
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage)
  const [orderBy, setOrderBy] = useState<string>('')
  const [order, setOrder] = useState<Order>('asc')
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(columnId)
  }

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = new Set(data.map(getRowId))
      setSelected(newSelected)
      onSelectionChange?.(data)
    } else {
      setSelected(new Set())
      onSelectionChange?.([])
    }
  }

  const handleSelectRow = (row: T) => {
    const id = getRowId(row)
    const newSelected = new Set(selected)

    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }

    setSelected(newSelected)
    onSelectionChange?.(data.filter((r) => newSelected.has(getRowId(r))))
  }

  const filteredData = useMemo(() => {
    if (!searchQuery) return data

    const query = searchQuery.toLowerCase()
    return data.filter((row) =>
      Object.values(row).some(
        (value) => value && String(value).toLowerCase().includes(query)
      )
    )
  }, [data, searchQuery])

  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[orderBy]
      const bValue = b[orderBy]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()

      return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }, [filteredData, orderBy, order])

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage
    return sortedData.slice(start, start + rowsPerPage)
  }, [sortedData, page, rowsPerPage])

  const isAllSelected = data.length > 0 && selected.size === data.length
  const isIndeterminate = selected.size > 0 && selected.size < data.length

  if (loading) {
    return (
      <StyledTableContainer>
        {searchable && (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={40} width={300} />
          </Box>
        )}
        <Table>
          <StyledTableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Skeleton variant="rectangular" width={20} height={20} />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={String(column.id)} style={{ minWidth: column.minWidth }}>
                  <Skeleton variant="text" width="80%" />
                </TableCell>
              ))}
            </TableRow>
          </StyledTableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {selectable && (
                  <TableCell padding="checkbox">
                    <Skeleton variant="rectangular" width={20} height={20} />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={String(column.id)}>
                    <Skeleton variant="text" width="70%" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
    )
  }

  return (
    <StyledTableContainer>
      {searchable && (
        <Box sx={{ p: 2 }}>
          <SearchField
            size="small"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} style={{ opacity: 0.5 }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Box>
      )}

      <TableContainer>
        <Table>
          <StyledTableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    size="small"
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align || 'left'}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(String(column.id))}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </StyledTableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)}>
                  <EmptyState>
                    {emptyIcon || <Inbox />}
                    <Typography variant="body2">{emptyMessage}</Typography>
                  </EmptyState>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const rowId = getRowId(row)
                const isSelected = selected.has(rowId)

                return (
                  <StyledTableRow
                    key={rowId}
                    clickable={!!onRowClick}
                    selected={isSelected}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(row)}
                          size="small"
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={String(column.id)} align={column.align || 'left'}>
                        {column.render
                          ? column.render(row)
                          : String(row[column.id as keyof T] ?? '')}
                      </TableCell>
                    ))}
                  </StyledTableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={sortedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        sx={{
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      />
    </StyledTableContainer>
  )
}
