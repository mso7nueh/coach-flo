/**
 * Тема приложения с системой кастомизации
 * Основной цвет определяется в colors.ts
 */

import type { MantineThemeOverride } from '@mantine/core'
import { PRIMARY_COLOR, SHADOWS, RADIUS, getGradient } from './colors'

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
      styles: (theme) => ({
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
      styles: (theme) => ({
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
      styles: (theme) => ({
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
      styles: (theme) => ({
        root: {
          color: theme.colors.gray[9],
        },
      }),
    },
    
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
      styles: (theme) => ({
        input: {
          borderColor: theme.colors.gray[3],
          transition: 'all 0.2s ease-in-out',
          '&:focus': {
            borderColor: theme.colors[PRIMARY_COLOR][6],
            boxShadow: `0 0 0 3px ${theme.colors[PRIMARY_COLOR][0]}`,
          },
        },
      }),
    },
    
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    
    Modal: {
      defaultProps: {
        radius: 'lg',
        overlayProps: {
          backgroundOpacity: 0.55,
          blur: 3,
        },
      },
      styles: {
        content: {
          boxShadow: SHADOWS.xl,
        },
      },
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

