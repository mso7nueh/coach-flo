# Деплой на Render

## Способ 1: Статический сайт (рекомендуется)

Это самый простой и бесплатный вариант для Vite приложения.

### Настройка через веб-интерфейс Render:

1. **Создайте новый Static Site**:
   - Зайдите на [render.com](https://render.com)
   - Нажмите "New +" → "Static Site"

2. **Подключите репозиторий**:
   - Подключите ваш GitHub/GitLab репозиторий
   - Выберите ветку (обычно `main` или `master`)

3. **Настройте параметры**:
   - **Name**: `coach-fit-client` (или любое другое имя)
   - **Build Command**: `cd client-app && npm install && npm run build`
   - **Publish Directory**: `client-app/dist`
   - **Root Directory**: оставьте пустым (или `/`)

4. **Нажмите "Create Static Site"**

### Настройка через render.yaml:

Если используете файл `render.yaml` в корне репозитория:

```bash
# Убедитесь, что файл render.yaml в корне репозитория
# Render автоматически обнаружит его при подключении репозитория
```

## Способ 2: Web Service с Express (для SPA роутинга)

Если нужен полноценный веб-сервер для обработки всех маршрутов:

1. **Установите Express**:
```bash
cd client-app
npm install express
```

2. **Создайте новый Web Service на Render**:
   - "New +" → "Web Service"
   - Подключите репозиторий

3. **Настройки**:
   - **Name**: `coach-fit-client`
   - **Environment**: `Node`
   - **Build Command**: `cd client-app && npm install && npm run build`
   - **Start Command**: `cd client-app && node server.js`
   - **Root Directory**: оставьте пустым

4. **Переменные окружения** (если нужны):
   - `NODE_ENV=production`
   - `PORT` (Render автоматически устанавливает)

## Важные моменты:

### 1. SPA роутинг

Для React Router нужно настроить редирект всех маршрутов на `index.html`. Render Static Site делает это автоматически. Для Web Service используйте `server.js`.

### 2. Переменные окружения

Если нужно использовать переменные окружения в приложении, добавьте их в настройках Render:
- В веб-интерфейсе: Settings → Environment Variables

В коде используйте `import.meta.env.VITE_*` для доступа к переменным.

### 3. Base URL

Если приложение развернуто не в корне домена, обновите `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/your-subdirectory/', // если нужно
  // ...
})
```

### 4. HTTPS

Render автоматически предоставляет HTTPS для всех сайтов.

## Проверка после деплоя:

1. Убедитесь, что сборка проходит успешно
2. Проверьте, что все маршруты работают
3. Проверьте работу авторизации и других функций

## Обновление:

После каждого push в основную ветку Render автоматически пересоберет и перезапустит приложение.

