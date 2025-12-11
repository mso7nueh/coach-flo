# Система кастомизации темы

Эта система позволяет легко изменять основной цвет приложения в одном месте, и он автоматически применится везде.

## Изменение основного цвета

Чтобы изменить основной цвет приложения:

1. Откройте файл `colors.ts`
2. Измените значение `PRIMARY_COLOR`:

```typescript
export const PRIMARY_COLOR: ColorScheme = 'violet' // Измените на 'blue', 'green', 'orange', 'pink', или 'cyan'
```

## Доступные цвета

- `violet` - фиолетовый (по умолчанию)
- `blue` - синий
- `green` - зеленый
- `orange` - оранжевый
- `pink` - розовый
- `cyan` - голубой

## Использование в компонентах

### Использование основного цвета

```typescript
import { PRIMARY_COLOR } from '@/shared/config/theme'

// В компоненте
<Button color={PRIMARY_COLOR}>Кнопка</Button>
<Avatar color={PRIMARY_COLOR}>АВ</Avatar>
```

### Использование теней

```typescript
import { SHADOWS } from '@/shared/config/theme'

<Card style={{ boxShadow: SHADOWS.card }}>
  Контент
</Card>
```

### Использование градиентов

```typescript
import { getGradient, PRIMARY_COLOR } from '@/shared/config/theme'

<div style={{ background: getGradient(PRIMARY_COLOR) }}>
  Контент с градиентом
</div>
```

## Структура файлов

- `colors.ts` - Определение цветовой схемы, теней, радиусов
- `index.ts` - Конфигурация темы Mantine
- `README.md` - Документация (этот файл)

## Будущие улучшения

В будущем можно добавить:
- Поддержку темной темы
- Пользовательские цветовые схемы
- Сохранение предпочтений пользователя
- Динамическое переключение цветов через UI

