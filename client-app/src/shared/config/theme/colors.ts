/**
 * Цветовая система приложения
 * Изменяйте основной цвет здесь, и он применится везде в приложении
 */

export type ColorScheme = 'violet' | 'blue' | 'green' | 'orange' | 'pink' | 'cyan'

/**
 * Основной цвет приложения
 * Измените это значение, чтобы поменять цвет во всем приложении
 */
export const PRIMARY_COLOR: ColorScheme = 'violet'

/**
 * Цвета для различных состояний
 */
export const STATUS_COLORS = {
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
} as const

/**
 * Градиенты для использования в компонентах
 */
export const getGradient = (color: ColorScheme = PRIMARY_COLOR) => {
  const gradients: Record<ColorScheme, string> = {
    violet: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    blue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    green: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    orange: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    pink: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    cyan: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  }
  return gradients[color]
}

/**
 * Тени для карточек и компонентов
 */
export const SHADOWS = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  card: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
  cardHover: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
} as const

/**
 * Радиусы скругления
 */
export const RADIUS = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
} as const

