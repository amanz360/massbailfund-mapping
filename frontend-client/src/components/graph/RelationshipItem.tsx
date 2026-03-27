import { Box, Link, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'

interface RelationshipItemProps {
  name: string
  caption?: string
  color: string
  borderOpacity?: number
  onClick?: () => void
}

export default function RelationshipItem({
  name,
  caption,
  color,
  borderOpacity = 0.2,
  onClick,
}: RelationshipItemProps) {
  const theme = useTheme()

  // Resolve MUI palette path (e.g. 'primary.main') to a color value
  const [group, shade] = color.split('.') as [string, string]
  const paletteGroup = (theme.palette as unknown as Record<string, Record<string, string>>)[group]
  const resolvedColor = paletteGroup?.[shade] ?? color

  return (
    <Box
      sx={{
        mb: 1.5,
        pl: 2,
        borderLeft: '3px solid',
        borderColor: alpha(resolvedColor, borderOpacity),
      }}
    >
      {onClick ? (
        <Link
          component="button"
          variant="subtitle2"
          onClick={onClick}
          sx={{
            color,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
            textAlign: 'left',
          }}
        >
          {name}
        </Link>
      ) : (
        <Typography variant="subtitle2" sx={{ color }}>
          {name}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" color="text.secondary" display="block">
          {caption}
        </Typography>
      )}
    </Box>
  )
}
