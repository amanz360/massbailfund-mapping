import { createTheme } from '@mui/material/styles'

// Extend MUI palette to include institution color
declare module '@mui/material/styles' {
  interface Palette {
    institution: Palette['primary']
  }
  interface PaletteOptions {
    institution?: PaletteOptions['primary']
  }
}

// Cool institutional palette — inspired by MBF-Brangan MVP
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5525E3', // Purple — mechanisms, primary actions
      light: '#8891ED', // Light purple — highlights, hover
      dark: '#3a1a9e',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#000F35', // Dark navy — decision makers, headings
      light: '#2a3a5e',
      dark: '#000820',
      contrastText: '#ffffff',
    },
    institution: {
      main: '#4A5568', // Gray — institutions
      light: '#6b7a8d',
      dark: '#2d3748',
      contrastText: '#ffffff',
    },
    error: {
      main: '#c4503a', // Red-orange — urgency, calls to action
    },
    success: {
      main: '#2e7d5a', // Green/teal — hope, potential solutions
    },
    warning: {
      main: '#d4943a', // Amber — caution
    },
    background: {
      default: '#F2EDF4', // Light lavender
      paper: '#ffffff',
    },
    text: {
      primary: '#000F35', // Dark navy
      secondary: '#4a4660', // Muted purple-gray
    },
    divider: '#d8d4e4',
  },
  typography: {
    fontFamily: '"Source Sans 3", "Helvetica Neue", sans-serif',
    h1: { fontFamily: '"Lora", serif', fontWeight: 700 },
    h2: { fontFamily: '"Lora", serif', fontWeight: 700 },
    h3: { fontFamily: '"Lora", serif', fontWeight: 600 },
    h4: { fontFamily: '"Lora", serif', fontWeight: 600 },
    h5: { fontFamily: '"Lora", serif', fontWeight: 600 },
    h6: { fontFamily: '"Lora", serif', fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.6 },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: t.palette.secondary.main,
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
})
