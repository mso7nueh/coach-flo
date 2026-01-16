# Правила использования API эндпоинтов

## Важно: Использование слешей в URL

### Правило 1: POST запросы к коллекциям
**ВСЕГДА** добавляйте слеш `/` в конце URL для POST запросов к коллекциям (создание новых ресурсов).

✅ **Правильно:**
```typescript
api.post('/api/clients/', data)
api.post('/api/workouts/', data)
api.post('/api/notes/', data)
api.post('/api/metrics/body/', data)
api.post('/api/metrics/exercise/', data)
```

❌ **Неправильно:**
```typescript
api.post('/api/clients', data)  // Может вызвать 307 редирект и потерю токена
api.post('/api/workouts', data)
api.post('/api/notes', data)
```

### Правило 2: GET запросы к коллекциям
Для GET запросов к коллекциям **можно** добавлять слеш, но это не обязательно. Однако для консистентности рекомендуется добавлять.

✅ **Правильно:**
```typescript
api.get('/api/clients/')
api.get('/api/workouts/')
api.get('/api/notes/')
```

### Правило 3: Запросы к конкретным ресурсам (с ID)
**НИКОГДА** не добавляйте слеш после ID ресурса.

✅ **Правильно:**
```typescript
api.get(`/api/clients/${client_id}`)
api.put(`/api/clients/${client_id}`, data)
api.delete(`/api/clients/${client_id}`)
api.get(`/api/workouts/${workout_id}`)
```

❌ **Неправильно:**
```typescript
api.get(`/api/clients/${client_id}/`)  // Лишний слеш
api.put(`/api/clients/${client_id}/`, data)
```

### Правило 4: Вложенные ресурсы
Для вложенных ресурсов следуйте тем же правилам:
- POST к коллекции → добавляйте слеш
- GET/PUT/DELETE к конкретному ресурсу → без слеша после ID

✅ **Правильно:**
```typescript
// Создание заметки для клиента
api.post(`/api/trainer/clients/${client_id}/notes/`, data)

// Получение конкретной заметки
api.get(`/api/trainer/clients/${client_id}/notes/${note_id}`)

// Обновление заметки
api.put(`/api/trainer/clients/${client_id}/notes/${note_id}`, data)
```

### Правило 5: Эндпоинты с параметрами запроса
Для эндпоинтов с query параметрами слеш не обязателен, но можно добавить для консистентности.

✅ **Правильно:**
```typescript
api.get('/api/clients/', { params: { search: 'John' } })
api.get('/api/workouts/', { params: { start_date: '2024-01-01' } })
```

## Почему это важно?

1. **307 Temporary Redirect**: Бэкенд может возвращать 307 редирект при отсутствии слеша в POST запросах к коллекциям
2. **Потеря токена**: При редиректе заголовок `Authorization` может быть потерян, что приводит к 401 ошибке
3. **Консистентность**: Единообразное использование слешей делает код более предсказуемым

## Примеры из кодовой базы

### ✅ Правильные примеры:
```typescript
// client.ts
export const createClient = async (data) => {
  const { data: response } = await api.post<any>('/api/clients/', data)
  return response
}

export const getNotes = async () => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data } = await api.get<Note[]>('/api/notes/')
  return data
}

export const createWorkout = async (data) => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data: response } = await api.post<Workout>('/api/workouts/', data)
  return response
}
```

### ❌ Примеры, которые нужно исправить:
```typescript
// НЕ ДЕЛАЙТЕ ТАК:
api.post('/api/clients', data)  // Нет слеша
api.post('/api/metrics/body', data)  // Нет слеша
```

## Чеклист при добавлении нового API эндпоинта

- [ ] POST к коллекции → добавить `/` в конце
- [ ] GET к коллекции → можно добавить `/` для консистентности
- [ ] Запросы с ID → без слеша после ID
- [ ] Проверить, что нет 307 редиректов в Network tab
- [ ] Убедиться, что токен передается в заголовках

## Исправленные эндпоинты

### ✅ Исправлено 2025-01-XX:
- `POST /api/clients` → `POST /api/clients/`
- `POST /api/metrics/body` → `POST /api/metrics/body/`
- `POST /api/metrics/body/entries` → `POST /api/metrics/body/entries/`
- `POST /api/metrics/exercise` → `POST /api/metrics/exercise/`
- `POST /api/metrics/exercise/entries` → `POST /api/metrics/exercise/entries/`
- `POST /api/trainer/clients/{id}/notes` → `POST /api/trainer/clients/{id}/notes/`
- `POST /api/programs/{id}/days/{id}/blocks/{id}/exercises` → `POST /api/programs/{id}/days/{id}/blocks/{id}/exercises/`
- `POST /api/programs/{id}/days` → `POST /api/programs/{id}/days/`
- `POST /api/library/workout-templates` → `POST /api/library/workout-templates/`
- `POST /api/library/exercise-templates` → `POST /api/library/exercise-templates/`
- `POST /api/users/link-trainer` → `POST /api/users/link-trainer/`
- `POST /api/users/unlink-trainer` → `POST /api/users/unlink-trainer/`
- `POST /api/onboarding/complete` → `POST /api/onboarding/complete/`
- `POST /api/auth/send-sms` → `POST /api/auth/send-sms/`
- `POST /api/auth/verify-sms` → `POST /api/auth/verify-sms/`
- `POST /api/auth/register/step1` → `POST /api/auth/register/step1/`
- `POST /api/auth/register/step2` → `POST /api/auth/register/step2/`
- `POST /api/auth/login` → `POST /api/auth/login/`

## Дата создания
2025-01-XX

## Последнее обновление
2025-01-XX

