# Инструкция по деплою на Render

## Подготовка к деплою

### 1. Структура проекта

Проект должен быть настроен следующим образом:

```
front/
├── client-app/          # React приложение
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── render.yaml          # Конфигурация Render
└── README.md
```

### 2. Конфигурация Render

Файл `render.yaml` уже настроен:

```yaml
services:
  - type: static
    name: coach-fit-client
    buildCommand: cd client-app && npm install && npm run build
    staticPublishPath: ./client-app/dist
    pullRequestPreviewsEnabled: false
    envVars:
      - key: VITE_API_URL
        value: "/"
    routes:
      - type: rewrite
        source: /api/*
        destination: http://103.88.243.123/api/*
      - type: rewrite
        source: /*
        destination: /index.html
```

### 3. Переменные окружения

В Render Dashboard нужно добавить переменную окружения:

- **Key:** `VITE_API_URL`
- **Value:** `/`

**Важно:** Переменные окружения с префиксом `VITE_` доступны в коде через `import.meta.env.VITE_API_URL`.

## Деплой на Render

### Шаг 1: Подключение репозитория

1. Зайдите в [Render Dashboard](https://dashboard.render.com/)
2. Нажмите "New +" → "Static Site"
3. Подключите ваш Git репозиторий
4. Выберите ветку (обычно `main` или `master`)

### Шаг 2: Настройка билда

Render автоматически обнаружит `render.yaml` в корне репозитория. Если файл находится в корне папки `front/`, убедитесь, что:

- Корневая директория проекта указана как `front/`
- Или переместите `render.yaml` в корень репозитория

### Шаг 3: Переменные окружения

В разделе "Environment" добавьте:

```
VITE_API_URL=/
```

### Шаг 4: Деплой

1. Нажмите "Create Static Site"
2. Render автоматически:
   - Установит зависимости (`npm install`)
   - Запустит билд (`npm run build`)
   - Опубликует статические файлы из `client-app/dist`

### Шаг 5: Проверка

После успешного деплоя:

1. Проверьте, что сайт доступен по URL, который предоставил Render
2. Откройте DevTools → Network и проверьте, что запросы идут на правильный API URL
3. Проверьте консоль браузера на наличие ошибок

## Локальный запуск

### Разработка

```bash
cd front/client-app
npm install
npm run dev
```

Приложение будет доступно на `http://localhost:5173`

### Предпросмотр продакшн билда

```bash
cd front/client-app
npm run build
npm run preview
```

## Переменные окружения

### Локальная разработка

Создайте файл `.env.local` в `front/client-app/`:

```env
VITE_API_URL=http://localhost:8000
```

**Важно:** Файл `.env.local` должен быть в `.gitignore` (уже добавлен).

### Продакшн (Render)

Переменные окружения настраиваются в Render Dashboard:

```
VITE_API_URL=/
```

## Troubleshooting

### Проблема: Билд падает с ошибками TypeScript

**Решение:** Убедитесь, что все ошибки TypeScript исправлены локально перед коммитом:

```bash
cd front/client-app
npm run build
```

### Проблема: Переменные окружения не работают

**Решение:** 
1. Убедитесь, что переменная начинается с `VITE_`
2. Перезапустите билд в Render после добавления переменной
3. Проверьте, что переменная добавлена в Environment Variables в Render Dashboard

### Проблема: CORS ошибки

**Решение:** Убедитесь, что URL фронтенда добавлен в `CORS_ORIGINS` на бекенде.

### Проблема: Статические файлы не загружаются

**Решение:** 
1. Проверьте, что `staticPublishPath` указывает на правильную директорию (`./client-app/dist`)
2. Убедитесь, что билд создает файлы в `dist/`

## Оптимизация

### Code Splitting

Для уменьшения размера бандла можно добавить code splitting в `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mantine: ['@mantine/core', '@mantine/hooks'],
        },
      },
    },
  },
})
```

## Дополнительные ресурсы

- [Render Documentation](https://render.com/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [React Router Deployment](https://reactrouter.com/en/main/start/overview#deployment)





