/**
 * Тема приложения с системой кастомизации
 * Основной цвет определяется в colors.ts
 */

import type { MantineThemeOverride, MantineTheme } from '@mantine/core'
import { PRIMARY_COLOR, SHADOWS, RADIUS, getGradient } from './colors'

const buildFieldStyles = (theme: MantineTheme) => ({
  label: {
    fontWeight: 600,
    color: theme.colors.gray[7],
    marginBottom: theme.spacing.xs,
    fontSize: theme.fontSizes.sm,
  },
  input: {
    borderColor: theme.colors.gray[3],
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderWidth: 1.5,
    transition: 'all 0.2s ease',
    boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.05)',
    '&::placeholder': {
      color: theme.colors.gray[5],
    },
    '&:focus, &:focus-within': {
      borderColor: theme.colors[PRIMARY_COLOR][5],
      boxShadow: `0 0 0 3px rgba(129, 140, 248, 0.2)`,
      backgroundColor: 'white',
    },
  },
})

export const theme: MantineThemeOverride = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  primaryColor: PRIMARY_COLOR,
  defaultRadius: 'md',
  cursorType: 'pointer',
  
  // Цветовая схема
  colors: {
    // Можно кастомизировать цвета Mantine здесь
  },
  
  // Заголовки
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.5rem', lineHeight: '1.2', fontWeight: '800' },
      h2: { fontSize: '2rem', lineHeight: '1.3', fontWeight: '700' },
      h3: { fontSize: '1.75rem', lineHeight: '1.4', fontWeight: '700' },
      h4: { fontSize: '1.5rem', lineHeight: '1.4', fontWeight: '600' },
      h5: { fontSize: '1.25rem', lineHeight: '1.5', fontWeight: '600' },
      h6: { fontSize: '1rem', lineHeight: '1.5', fontWeight: '600' },
    },
  },
  
  // Компоненты
  components: {
    Card: {
      defaultProps: {
        shadow: 'sm',
        padding: 'lg',
        radius: 'md',
        withBorder: false,
      },
      styles: (theme: MantineTheme) => ({
        root: {
          backgroundColor: theme.white,
          border: `1px solid ${theme.colors.gray[2]}`,
          boxShadow: SHADOWS.card,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: SHADOWS.cardHover,
            transform: 'translateY(-2px)',
          },
        },
      }),
    },
    
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: () => ({
        root: {
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: SHADOWS.md,
          },
        },
      }),
    },
    
    AppShell: {
      styles: (theme: MantineTheme) => ({
        main: {
          backgroundColor: theme.colors.gray[0],
        },
        header: {
          backgroundColor: theme.white,
          borderBottom: `1px solid ${theme.colors.gray[2]}`,
          boxShadow: SHADOWS.sm,
        },
        navbar: {
          backgroundColor: theme.white,
          borderRight: `1px solid ${theme.colors.gray[2]}`,
          boxShadow: SHADOWS.sm,
        },
      }),
    },
    
    Badge: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
        },
      },
    },
    
    Title: {
      styles: (theme: MantineTheme) => ({
        root: {
          color: theme.colors.gray[9],
        },
      }),
    },
    
    TextInput: {
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
      styles: (theme: MantineTheme) => buildFieldStyles(theme),
    },
    
    PasswordInput: {
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
      styles: (theme: MantineTheme) => buildFieldStyles(theme),
    },
    
    NumberInput: {
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
      styles: (theme: MantineTheme) => buildFieldStyles(theme),
    },
    
    Select: {
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
      styles: (theme: MantineTheme) => buildFieldStyles(theme),
    },
    
    Textarea: {
      defaultProps: {
        radius: 'md',
        variant: 'filled',
        minRows: 3,
      },
      styles: (theme: MantineTheme) => buildFieldStyles(theme),
    },
    
    DateInput: {
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
      styles: (theme: MantineTheme) => buildFieldStyles(theme),
    },
    
    TimeInput: {
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
      styles: (theme: MantineTheme) => buildFieldStyles(theme),
    },
    
    Modal: {
      defaultProps: {
        radius: 'xl',
        padding: 'xl',
        overlayProps: {
          color: '#0b0c16',
          backgroundOpacity: 0.65,
          blur: 6,
        },
        transitionProps: {
          transition: 'pop',
          duration: 200,
        },
      },
      styles: (theme: MantineTheme) => ({
        content: {
          border: `1px solid ${theme.colors.gray[2]}`,
          background: theme.white,
          boxShadow: '0 25px 70px rgba(21, 21, 43, 0.18)',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            opacity: 0.07,
            backgroundImage: `linear-gradient(135deg, ${theme.colors[PRIMARY_COLOR][5]} 0%, ${theme.colors.pink[4]} 100%)`,
            pointerEvents: 'none',
          },
        },
        header: {
          paddingBottom: theme.spacing.sm,
          marginBottom: theme.spacing.xs,
          borderBottom: `1px solid ${theme.colors.gray[2]}`,
        },
        title: {
          fontWeight: 700,
          fontSize: theme.fontSizes.xl,
          color: theme.colors.gray[8],
        },
        body: {
          paddingTop: theme.spacing.sm,
          position: 'relative',
        },
        close: {
          color: theme.colors.gray[6],
          borderRadius: '50%',
          border: `1px solid ${theme.colors.gray[2]}`,
          backgroundColor: theme.white,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme.colors[PRIMARY_COLOR][0],
            color: theme.colors[PRIMARY_COLOR][6],
          },
        },
      }),
    },
    
    Drawer: {
      defaultProps: {
        padding: 'xl',
      },
      styles: {
        content: {
          boxShadow: SHADOWS.xl,
        },
      },
    },
    
    Menu: {
      defaultProps: {
        radius: 'md',
        shadow: 'lg',
      },
    },
  },
  
  // Дополнительные настройки доступны через other
  other: {
    shadows: SHADOWS,
    radius: RADIUS,
    primaryColor: PRIMARY_COLOR,
    gradient: getGradient(PRIMARY_COLOR),
  },
}

// Экспортируем для использования в компонентах
export { PRIMARY_COLOR, SHADOWS, RADIUS, getGradient } from './colors'

