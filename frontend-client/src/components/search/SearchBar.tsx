import { useEffect, useMemo, useRef, useState } from 'react'
import { Autocomplete, TextField, Chip, Box, Typography, InputAdornment } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useSelector } from 'react-redux'
import { selectGraphData } from '../../store/slices/graphSlice'

interface SearchOption {
  id: string
  name: string
  type: 'Mechanism' | 'Decision Maker' | 'Institution'
  subtitle: string
}

interface SearchBarProps {
  onSelect: (nodeId: string) => void
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const graphData = useSelector(selectGraphData)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }
      if (e.key === '/') {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const options = useMemo(() => {
    const byId = new Map<string, SearchOption>()
    // Graph-sourced options (always available once graph loads)
    if (graphData) {
      for (const n of graphData.nodes) {
        if (n.primary_type === 'Mechanism' || n.primary_type === 'Decision Maker' || n.primary_type === 'Institution') {
          byId.set(n.id, { id: n.id, name: n.name, type: n.primary_type as SearchOption['type'], subtitle: n.secondary_type })
        }
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [graphData])

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option.name}
      value={null}
      inputValue={inputValue}
      onInputChange={(_event, newValue, reason) => {
        if (reason === 'reset') {
          setInputValue('')
        } else {
          setInputValue(newValue)
        }
      }}
      onChange={(_event, value) => {
        if (value) {
          onSelect(value.id)
          setInputValue('')
        }
      }}
      blurOnSelect
      clearOnBlur
      size="small"
      sx={{ width: '100%', maxWidth: 400 }}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          placeholder="Search mechanisms, decision makers..."
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
              '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
            },
            '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.5)', opacity: 1 },
          }}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const isMechanism = option.type === 'Mechanism'
        const isInstitution = option.type === 'Institution'
        return (
          <Box component="li" {...props} key={option.id}>
            <Chip
              label={isMechanism ? 'M' : isInstitution ? 'I' : 'D'}
              size="small"
              sx={{
                mr: 1,
                minWidth: 28,
                backgroundColor: isMechanism ? 'primary.main' : isInstitution ? 'institution.main' : 'secondary.main',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '0.75rem',
              }}
            />
            <Box>
              <Typography variant="body2">{option.name}</Typography>
              {option.subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {option.subtitle}
                </Typography>
              )}
            </Box>
          </Box>
        )
      }}
    />
  )
}
