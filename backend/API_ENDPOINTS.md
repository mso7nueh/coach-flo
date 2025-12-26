# API Endpoints - Coach Fit Backend

Полный список всех эндпоинтов API для интеграции с фронтендом.

## Аутентификация (`/api/auth`)

- `POST /api/auth/register/step1` - Регистрация (шаг 1: создание пользователя и отправка SMS)
- `POST /api/auth/register/step2` - Регистрация (шаг 2: подтверждение SMS кода)
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/send-sms` - Отправка SMS кода
- `POST /api/auth/verify-sms` - Проверка SMS кода

## Пользователи (`/api/users`)

- `GET /api/users/me` - Получить информацию о текущем пользователе
- `PUT /api/users/me` - Обновить профиль пользователя
- `POST /api/users/link-trainer` - Связать клиента с тренером по коду
- `POST /api/users/unlink-trainer` - Отвязать клиента от тренера

## Настройки (`/api/users/me/settings`)

- `GET /api/users/me/settings` - Получить настройки пользователя (локаль, уведомления)
- `PUT /api/users/me/settings` - Обновить настройки пользователя

## Онбординг (`/api/onboarding`)

- `POST /api/onboarding/complete` - Завершить онбординг (создание или обновление)
- `PUT /api/onboarding/` - Обновить данные онбординга
- `GET /api/onboarding/` - Получить данные онбординга

## Тренировки (`/api/workouts`)

- `POST /api/workouts` - Создать тренировку
  - Для тренеров: передать `user_id` или `trainer_id` (ID клиента)
  - Для клиентов: передать `trainer_id` (ID тренера, если с тренером)
- `GET /api/workouts` - Получить список тренировок
  - Параметры: `start_date`, `end_date`, `client_id` (для тренеров), `trainer_view=true` (для тренеров)
- `GET /api/workouts/{workout_id}` - Получить тренировку по ID
- `PUT /api/workouts/{workout_id}` - Обновить тренировку
- `DELETE /api/workouts/{workout_id}` - Удалить тренировку
  - Параметр: `delete_series=true` - удалить всю серию повторяющихся тренировок

## Программы тренировок (`/api/programs`)

- `POST /api/programs` - Создать программу тренировок
- `GET /api/programs` - Получить список программ
  - Параметр: `user_id` (для тренеров - просмотр программ клиента)
- `GET /api/programs/{program_id}` - Получить программу по ID
- `DELETE /api/programs/{program_id}` - Удалить программу
- `POST /api/programs/{program_id}/days` - Создать день программы
- `GET /api/programs/{program_id}/days` - Получить дни программы
- `GET /api/programs/{program_id}/days/{day_id}` - Получить день программы по ID

## Метрики (`/api/metrics`)

### Метрики тела
- `POST /api/metrics/body` - Создать метрику тела
- `GET /api/metrics/body` - Получить список метрик тела
  - Параметр: `user_id` (для тренеров - просмотр метрик клиента)
- `POST /api/metrics/body/entries` - Добавить запись метрики тела
- `GET /api/metrics/body/entries` - Получить записи метрик тела
  - Параметры: `metric_id`, `user_id` (для тренеров), `start_date`, `end_date`

### Метрики упражнений
- `POST /api/metrics/exercise` - Создать метрику упражнения
- `GET /api/metrics/exercise` - Получить список метрик упражнений
  - Параметр: `user_id` (для тренеров - просмотр метрик клиента)
- `POST /api/metrics/exercise/entries` - Добавить запись метрики упражнения
- `GET /api/metrics/exercise/entries` - Получить записи метрик упражнений
  - Параметры: `exercise_metric_id`, `user_id` (для тренеров), `start_date`, `end_date`

## Питание (`/api/nutrition`)

- `POST /api/nutrition/` - Создать/обновить запись питания (обновление если запись на эту дату уже есть)
- `GET /api/nutrition/` - Получить записи питания
  - Параметры: `start_date`, `end_date`
- `GET /api/nutrition/{entry_id}` - Получить запись питания по ID
- `PUT /api/nutrition/{entry_id}` - Обновить запись питания
- `DELETE /api/nutrition/{entry_id}` - Удалить запись питания

## Финансы (`/api/finances`) - только для тренеров

- `POST /api/finances` - Создать платеж
- `GET /api/finances` - Получить список платежей
  - Параметры: `client_id`, `start_date`, `end_date`
- `GET /api/finances/stats` - Получить статистику по финансам
- `DELETE /api/finances/{payment_id}` - Удалить платеж

## Клиенты (`/api/clients`) - только для тренеров

- `GET /api/clients` - Получить список клиентов
  - Параметр: `search` - поиск по имени
- `POST /api/clients` - Добавить клиента
- `GET /api/clients/{client_id}` - Получить информацию о клиенте
- `PUT /api/clients/{client_id}` - Обновить данные клиента (включая онбординг)
- `GET /api/clients/{client_id}/stats` - Получить статистику клиента
- `GET /api/clients/{client_id}/onboarding` - Получить данные онбординга клиента

## Библиотека упражнений (`/api/exercises`)

- `POST /api/exercises` - Создать упражнение (только для тренеров)
- `GET /api/exercises` - Получить список упражнений
  - Параметры: `search`, `muscle_group`
- `GET /api/exercises/{exercise_id}` - Получить упражнение по ID
- `PUT /api/exercises/{exercise_id}` - Обновить упражнение (только свои, для тренеров)
- `DELETE /api/exercises/{exercise_id}` - Удалить упражнение (только свои, для тренеров)

## Заметки тренера (`/api/notes`)

- `POST /api/notes` - Создать заметку для клиента (только для тренеров)
- `GET /api/notes` - Получить заметки
  - Параметр: `client_id` (для тренеров)
- `GET /api/notes/{note_id}` - Получить заметку по ID
- `PUT /api/notes/{note_id}` - Обновить заметку (только для тренеров)
- `DELETE /api/notes/{note_id}` - Удалить заметку (только для тренеров)

## Дашборд (`/api/dashboard`)

- `GET /api/dashboard/stats` - Получить статистику для дашборда
  - Параметр: `period` (7d, 14d, 30d)

---

## Особенности реализации

### Создание тренировок тренером для клиентов

При создании тренировки тренером:
- Передать `user_id` или `trainer_id` (ID клиента) в теле запроса
- `trainer_id` в ответе будет автоматически установлен на ID тренера

### Просмотр данных клиентов тренером

Для просмотра данных клиентов используйте параметр `user_id`:
- `GET /api/metrics/body?user_id={client_id}`
- `GET /api/metrics/exercise?user_id={client_id}`
- `GET /api/programs?user_id={client_id}`

### Обновление онбординга

- `POST /api/onboarding/complete` - создает или обновляет онбординг
- `PUT /api/onboarding/` - обновляет существующий онбординг

### Обновление данных клиента тренером

`PUT /api/clients/{client_id}` принимает:
- Основные данные: `full_name`, `email`, `phone`, `avatar`
- Данные клиента: `client_format`, `workouts_package`, `package_expiry_date`, `is_active`
- Данные онбординга: `weight`, `height`, `age`, `goals`, `restrictions`, `activity_level`

---

## Статус готовности

✅ **100% критичного функционала реализовано**
✅ **Все эндпоинты готовы к интеграции**
✅ **Правильная обработка прав доступа**
✅ **Поддержка всех операций CRUD**

