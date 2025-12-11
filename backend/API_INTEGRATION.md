# API Integration Documentation

Документация по интеграции бекенда Coach Fit API с фронтендом.

## Содержание

1. [Базовые настройки](#базовые-настройки)
2. [Аутентификация](#аутентификация)
3. [Эндпоинты API](#эндпоинты-api)
4. [Интеграция с фронтендом](#интеграция-с-фронтендом)
5. [Примеры использования](#примеры-использования)

---

## Базовые настройки

### Базовый URL

**Продакшн:**
```
http://45.144.221.74:8000
```

**Разработка:**
```
http://localhost:8000
```

Для изменения URL используйте переменную окружения `VITE_API_URL` в файле `.env` фронтенд проекта.

### CORS

Бекенд настроен на работу с фронтендом на следующих адресах:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (альтернативный порт)

Для изменения настроек CORS отредактируйте переменную окружения `CORS_ORIGINS` в `.env` файле.

### Формат запросов

Все запросы должны использовать:
- **Content-Type**: `application/json`
- **Authorization**: `Bearer <token>` (для защищенных эндпоинтов)

### Формат ответов

Все ответы возвращаются в формате JSON.

---

## Аутентификация

### JWT Токены

API использует JWT (JSON Web Tokens) для аутентификации. Токен действителен **7 дней**.

### Получение токена

Токен можно получить двумя способами:
1. **Регистрация** (`POST /api/auth/register/step2`) - возвращает токен после подтверждения SMS кода
2. **Вход** (`POST /api/auth/login`) - возвращает токен при успешной авторизации

### Использование токена

После получения токена, добавьте его в заголовок всех защищенных запросов:

```http
Authorization: Bearer <your_token>
```

### Хранение токена

Рекомендуется хранить токен в:
- **localStorage** (для веб-приложений)
- **sessionStorage** (если нужна сессионная авторизация)
- **Secure Cookie** (для дополнительной безопасности)

---

## Эндпоинты API

### 1. Авторизация и регистрация

#### 1.1. Отправить SMS код

**POST** `/api/auth/send-sms`

Отправляет 4-значный SMS код на указанный номер телефона.

**Запрос:**
```json
{
  "phone": "+7 (999) 123-45-67"
}
```

**Ответ:**
```json
{
  "verified": false,
  "message": "SMS код отправлен"
}
```

**Примечание:** В режиме разработки код выводится в консоль сервера.

---

#### 1.2. Проверить SMS код

**POST** `/api/auth/verify-sms`

Проверяет SMS код, отправленный на телефон.

**Запрос:**
```json
{
  "phone": "+7 (999) 123-45-67",
  "code": "1234"
}
```

**Ответ:**
```json
{
  "verified": true,
  "message": "Телефон подтвержден"
}
```

**Ошибки:**
- `400` - Неверный код или код истек

---

#### 1.3. Регистрация (Шаг 1)

**POST** `/api/auth/register/step1`

Создает пользователя в системе и отправляет SMS код на указанный телефон.

**Запрос:**
```json
{
  "full_name": "Иван Иванов",
  "email": "ivan@example.com",
  "password": "password123",
  "phone": "+7 (999) 123-45-67",
  "role": "client",
  "trainer_code": "TRAINER123"
}
```

**Поля:**
- `full_name` (string, обязательное) - Полное имя пользователя (минимум 2 символа)
- `email` (string, обязательное) - Email пользователя (должен быть уникальным)
- `password` (string, обязательное) - Пароль (минимум 6 символов)
- `phone` (string, обязательное) - Номер телефона в формате `+7 (999) 123-45-67`
- `role` (string, обязательное) - Роль пользователя: `"client"` или `"trainer"`
- `trainer_code` (string, опциональное) - Код подключения тренера (только для клиентов)

**Ответ:**
```json
{
  "verified": false,
  "message": "SMS код отправлен на ваш телефон"
}
```

**Ошибки:**
- `400` - Пользователь с таким email/телефоном уже существует или неверный код тренера

**Процесс регистрации:**
1. Вызовите этот эндпоинт с данными пользователя
2. Получите SMS код (в разработке - в консоли сервера)
3. Вызовите `/api/auth/register/step2` с кодом для завершения регистрации

---

#### 1.4. Регистрация (Шаг 2)

**POST** `/api/auth/register/step2`

Подтверждает SMS код и завершает регистрацию. Возвращает JWT токен.

**Запрос:**
```json
{
  "phone": "+7 (999) 123-45-67",
  "code": "1234"
}
```

**Ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "full_name": "Иван Иванов",
    "email": "ivan@example.com",
    "phone": "+7 (999) 123-45-67",
    "role": "client",
    "onboarding_seen": false,
    "locale": "ru",
    "avatar": null,
    "trainer_connection_code": null,
    "phone_verified": true,
    "created_at": "2024-01-01T00:00:00"
  },
  "requires_onboarding": true
}
```

**Поля ответа:**
- `token` (string) - JWT токен для аутентификации
- `user` (object) - Информация о пользователе
- `requires_onboarding` (boolean) - Требуется ли прохождение онбординга

**Ошибки:**
- `400` - Неверный код или код истек
- `404` - Пользователь не найден

**Важно:**
- Сохраните токен для последующих запросов
- Если `requires_onboarding: true`, пользователю нужно пройти онбординг через `/api/onboarding/complete`

---

#### 1.5. Вход в систему

**POST** `/api/auth/login`

Авторизация пользователя по email и паролю.

**Запрос:**
```json
{
  "email": "ivan@example.com",
  "password": "password123"
}
```

**Ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "full_name": "Иван Иванов",
    "email": "ivan@example.com",
    "phone": "+7 (999) 123-45-67",
    "role": "client",
    "onboarding_seen": true,
    "locale": "ru",
    "avatar": null,
    "trainer_connection_code": null,
    "phone_verified": true,
    "created_at": "2024-01-01T00:00:00"
  }
}
```

**Ошибки:**
- `401` - Неверный email или пароль

---

#### 1.6. Текущий пользователь (Auth)

**GET** `/api/auth/me`

Получить информацию о текущем аутентифицированном пользователе.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "id": "uuid-here",
  "full_name": "Иван Иванов",
  "email": "ivan@example.com",
  "phone": "+7 (999) 123-45-67",
  "role": "client",
  "onboarding_seen": true,
  "locale": "ru",
  "avatar": null,
  "trainer_connection_code": null,
  "phone_verified": true,
  "created_at": "2024-01-01T00:00:00"
}
```

**Ошибки:**
- `401` - Не авторизован (отсутствует или неверный токен)

---

### 2. Онбординг

#### 2.1. Завершить онбординг

**POST** `/api/onboarding/complete`

Сохраняет данные онбординга для текущего пользователя.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Запрос:**
```json
{
  "weight": 75.5,
  "height": 180,
  "age": 30,
  "goals": ["weight_loss", "muscle_gain"],
  "restrictions": ["no_dairy", "vegetarian"],
  "activity_level": "medium"
}
```

**Поля:**
- `weight` (float, опциональное) - Вес в килограммах (30-200)
- `height` (float, опциональное) - Рост в сантиметрах (100-250)
- `age` (integer, опциональное) - Возраст (14-100)
- `goals` (array[string], опциональное) - Список целей
- `restrictions` (array[string], опциональное) - Список ограничений
- `activity_level` (string, опциональное) - Уровень активности: `"low"`, `"medium"`, `"high"`

**Доступные цели (goals):**
- `weight_loss` - Похудение
- `muscle_gain` - Набор мышечной массы
- `endurance` - Выносливость
- `strength` - Сила
- `flexibility` - Гибкость
- `general_fitness` - Общее здоровье

**Уровни активности (activity_level):**
- `low` - Низкий
- `medium` - Средний
- `high` - Высокий

**Ограничения (restrictions):**
Список строк с ограничениями (например: `"no_dairy"`, `"vegetarian"`, `"gluten_free"`)

**Ответ:**
```json
{
  "id": "uuid-here",
  "user_id": "user-uuid",
  "weight": 75.5,
  "height": 180,
  "age": 30,
  "goals": ["weight_loss", "muscle_gain"],
  "restrictions": ["no_dairy"],
  "activity_level": "medium",
  "created_at": "2024-01-01T00:00:00"
}
```

**Ошибки:**
- `401` - Не авторизован

**Примечание:** После успешного завершения онбординга пользователь помечается как прошедший онбординг (`onboarding_seen: true`).

---

#### 2.2. Получить данные онбординга

**GET** `/api/onboarding/`

Получить сохраненные данные онбординга для текущего пользователя.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "id": "uuid-here",
  "user_id": "user-uuid",
  "weight": 75.5,
  "height": 180,
  "age": 30,
  "goals": ["weight_loss", "muscle_gain"],
  "restrictions": ["no_dairy"],
  "activity_level": "medium",
  "created_at": "2024-01-01T00:00:00"
}
```

**Ошибки:**
- `401` - Не авторизован
- `404` - Онбординг не найден

---

### 3. Пользователи

#### 3.1. Текущий пользователь (Users)

**GET** `/api/users/me`

Получить информацию о текущем аутентифицированном пользователе.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "id": "uuid-here",
  "full_name": "Иван Иванов",
  "email": "ivan@example.com",
  "phone": "+7 (999) 123-45-67",
  "role": "client",
  "onboarding_seen": true,
  "locale": "ru",
  "avatar": null,
  "trainer_connection_code": null,
  "phone_verified": true,
  "created_at": "2024-01-01T00:00:00"
}
```

**Ошибки:**
- `401` - Не авторизован

**Примечание:** Этот эндпоинт дублирует `/api/auth/me` для удобства.

---

### 4. Системные эндпоинты

#### 4.1. Проверка здоровья

**GET** `/health`

Проверка работоспособности API.

**Ответ:**
```json
{
  "status": "ok"
}
```

---

#### 4.2. Корневой эндпоинт

**GET** `/`

Информация о API.

**Ответ:**
```json
{
  "message": "Coach Fit API"
}
```

---

## Интеграция с фронтендом

### Настройка API клиента

Создайте файл для работы с API, например `src/shared/api/client.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Загружаем токен из localStorage при инициализации
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'Произошла ошибка',
      }));
      throw new Error(error.detail || 'Произошла ошибка');
    }

    return response.json();
  }

  // Auth endpoints
  async sendSMS(phone: string) {
    return this.request<{ verified: boolean; message: string }>(
      '/api/auth/send-sms',
      {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }
    );
  }

  async verifySMS(phone: string, code: string) {
    return this.request<{ verified: boolean; message: string }>(
      '/api/auth/verify-sms',
      {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }
    );
  }

  async registerStep1(data: {
    full_name: string;
    email: string;
    password: string;
    phone: string;
    role: 'client' | 'trainer';
    trainer_code?: string;
  }) {
    return this.request<{ verified: boolean; message: string }>(
      '/api/auth/register/step1',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async registerStep2(phone: string, code: string) {
    const response = await this.request<{
      token: string;
      user: User;
      requires_onboarding: boolean;
    }>('/api/auth/register/step2', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });

    // Сохраняем токен
    this.setToken(response.token);

    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{
      token: string;
      user: User;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Сохраняем токен
    this.setToken(response.token);

    return response;
  }

  async getCurrentUser() {
    return this.request<User>('/api/auth/me');
  }

  // Onboarding endpoints
  async completeOnboarding(data: {
    weight?: number;
    height?: number;
    age?: number;
    goals?: string[];
    restrictions?: string[];
    activity_level?: 'low' | 'medium' | 'high';
  }) {
    return this.request<OnboardingResponse>(
      '/api/onboarding/complete',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getOnboarding() {
    return this.request<OnboardingResponse>('/api/onboarding/');
  }

  logout() {
    this.setToken(null);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Types
export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'client' | 'trainer';
  onboarding_seen: boolean;
  locale: string;
  avatar: string | null;
  trainer_connection_code: string | null;
  phone_verified: boolean;
  created_at: string;
}

export interface OnboardingResponse {
  id: string;
  user_id: string;
  weight: number | null;
  height: number | null;
  age: number | null;
  goals: string[];
  restrictions: string[];
  activity_level: string | null;
  created_at: string;
}
```

### Переменные окружения

Создайте файл `.env` в корне фронтенд проекта:

**Продакшн:**
```env
VITE_API_URL=http://45.144.221.74:8000
```

**Разработка:**
```env
VITE_API_URL=http://localhost:8000
```

**Важно:** Файл `.env` должен быть добавлен в `.gitignore` для безопасности.

---

## Примеры использования

### Регистрация клиента

```typescript
import { apiClient } from '@/shared/api/client';

// Шаг 1: Создание пользователя и отправка SMS
try {
  await apiClient.registerStep1({
    full_name: 'Иван Иванов',
    email: 'ivan@example.com',
    password: 'password123',
    phone: '+7 (999) 123-45-67',
    role: 'client',
    trainer_code: 'TRAINER123', // опционально
  });
  
  // SMS код отправлен, покажите форму ввода кода
} catch (error) {
  console.error('Ошибка регистрации:', error);
}

// Шаг 2: Подтверждение SMS кода
try {
  const response = await apiClient.registerStep2(
    '+7 (999) 123-45-67',
    '1234' // код из SMS
  );
  
  // Токен сохранен автоматически
  if (response.requires_onboarding) {
    // Перенаправить на онбординг
  } else {
    // Перенаправить на главную страницу
  }
} catch (error) {
  console.error('Ошибка подтверждения кода:', error);
}
```

### Вход в систему

```typescript
import { apiClient } from '@/shared/api/client';

try {
  const response = await apiClient.login(
    'ivan@example.com',
    'password123'
  );
  
  // Токен сохранен автоматически
  // Перенаправить на главную страницу или онбординг
} catch (error) {
  console.error('Ошибка входа:', error);
}
```

### Завершение онбординга

```typescript
import { apiClient } from '@/shared/api/client';

try {
  const response = await apiClient.completeOnboarding({
    weight: 75.5,
    height: 180,
    age: 30,
    goals: ['weight_loss', 'muscle_gain'],
    restrictions: ['no_dairy'],
    activity_level: 'medium',
  });
  
  // Онбординг завершен, перенаправить на главную
} catch (error) {
  console.error('Ошибка сохранения онбординга:', error);
}
```

### Получение текущего пользователя

```typescript
import { apiClient } from '@/shared/api/client';

try {
  const user = await apiClient.getCurrentUser();
  console.log('Текущий пользователь:', user);
} catch (error) {
  // Токен недействителен или отсутствует
  apiClient.logout();
  // Перенаправить на страницу входа
}
```

### Проверка авторизации при загрузке приложения

```typescript
import { useEffect, useState } from 'react';
import { apiClient, User } from '@/shared/api/client';

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        // Пользователь не авторизован
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { user, loading };
}
```

### Выход из системы

```typescript
import { apiClient } from '@/shared/api/client';

function handleLogout() {
  apiClient.logout();
  // Перенаправить на страницу входа
}
```

---

## Обработка ошибок

### Типичные ошибки

1. **401 Unauthorized** - Токен отсутствует, истек или неверен
   - Решение: Перенаправить на страницу входа

2. **400 Bad Request** - Неверные данные запроса
   - Решение: Показать сообщение об ошибке пользователю

3. **404 Not Found** - Ресурс не найден
   - Решение: Проверить корректность запроса

4. **500 Internal Server Error** - Ошибка сервера
   - Решение: Показать сообщение об ошибке, попробовать повторить запрос

### Пример обработки ошибок

```typescript
try {
  await apiClient.login(email, password);
} catch (error) {
  if (error.message.includes('Неверный email или пароль')) {
    // Показать ошибку в форме входа
  } else {
    // Показать общую ошибку
  }
}
```

---

## Роли пользователей

### Client (Клиент)

- Требует прохождение онбординга после регистрации
- Может быть привязан к тренеру через `trainer_code`
- `onboarding_seen: false` после регистрации

### Trainer (Тренер)

- Онбординг пропускается автоматически (`onboarding_seen: true`)
- Получает уникальный `trainer_connection_code` при регистрации
- Может иметь клиентов (связь через `trainer_id`)

---

## Безопасность

### Рекомендации

1. **Хранение токенов**
   - Используйте `localStorage` для веб-приложений
   - Рассмотрите использование `httpOnly` cookies для дополнительной безопасности

2. **HTTPS**
   - В продакшене обязательно используйте HTTPS

3. **Валидация данных**
   - Всегда валидируйте данные на фронтенде перед отправкой

4. **Обработка токенов**
   - Проверяйте срок действия токена
   - Реализуйте автоматическое обновление токена (refresh token) если необходимо

---

## Дополнительная информация

### Формат телефона

Телефон должен быть в формате: `+7 (999) 123-45-67`

### Валидация пароля

Минимум 6 символов.

### Валидация email

Должен быть валидным email адресом.

### SMS коды

- 4-значный код
- Действителен 10 минут
- В режиме разработки код выводится в консоль сервера

---

## Поддержка

При возникновении проблем проверьте:
1. Правильность базового URL API
2. Настройки CORS на бекенде
3. Корректность токена в заголовках запросов
4. Логи сервера для диагностики ошибок

## Дополнительная документация

- [Руководство по интеграции](./INTEGRATION_GUIDE.md) - Подробное руководство по интеграции фронтенда с бекендом
- [Swagger документация](http://45.144.221.74:8000/docs) - Интерактивная документация API

