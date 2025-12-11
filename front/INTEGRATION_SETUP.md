# Инструкция по настройке интеграции с бекендом

## Шаг 1: Установка зависимостей

Убедитесь, что установлен пакет `@mantine/notifications`:

```bash
cd client-app
npm install @mantine/notifications
# или
pnpm add @mantine/notifications
```

## Шаг 2: Настройка переменных окружения

Создайте файл `.env` в корне проекта `client-app/`:

```env
VITE_API_URL=http://45.144.221.74:8000
```

**Важно:** 
- Файл `.env` должен быть добавлен в `.gitignore`
- После изменения `.env` перезапустите dev сервер

## Шаг 3: Проверка интеграции

1. Запустите фронтенд приложение:
   ```bash
   npm run dev
   ```

2. Откройте браузер и перейдите на страницу регистрации

3. Заполните форму регистрации

4. **Важно:** В режиме разработки SMS код выводится в консоль сервера бекенда. Проверьте логи сервера для получения кода.

5. Введите код и завершите регистрацию

## Что было интегрировано

✅ **Авторизация:**
- Логин (`POST /api/auth/login`)
- Регистрация (двухшаговая через `/api/auth/register/step1` и `/api/auth/register/step2`)
- Получение текущего пользователя (`GET /api/auth/me`)
- Автоматическая проверка токена при загрузке

✅ **Онбординг:**
- Завершение онбординга (`POST /api/onboarding/complete`)
- Получение данных онбординга (`GET /api/onboarding/`)

## Структура файлов

- `src/shared/api/client.ts` - API клиент для работы с бекендом
- `src/app/store/slices/userSlice.ts` - Redux slice с async thunks
- `src/pages/auth/LoginPage.tsx` - Страница входа (интегрирована)
- `src/pages/auth/RegisterPage.tsx` - Страница регистрации (интегрирована)
- `src/pages/client/onboarding/OnboardingPage.tsx` - Страница онбординга (интегрирована)

## Дополнительная документация

- [API Integration Documentation](../backend/API_INTEGRATION.md) - Полная документация по API
- [Integration Guide](../backend/INTEGRATION_GUIDE.md) - Подробное руководство по интеграции


