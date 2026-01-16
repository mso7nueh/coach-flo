# Требования к API для дашборда

## Эндпоинт: GET /api/dashboard/stats

### Текущие данные (уже реализованы):
- `total_workouts` - общее количество тренировок за период
- `completed_workouts` - количество завершенных тренировок
- `attendance_rate` - процент посещаемости
- `today_workouts` - количество тренировок на сегодня
- `next_workout` - следующая запланированная тренировка (объект Workout или null)

### Необходимо добавить:

#### 1. Данные цели и дедлайна (`goal`)
```json
{
  "goal": {
    "headline": "Пробежать марафон без остановки",
    "description": "Фокус на выносливости и контроле темпа",
    "milestone": "City2Surf 10km Challenge",
    "days_left": 35,
    "progress": 65
  }
}
```

**Поля:**
- `headline` (string, обязательное) - заголовок цели
- `description` (string, обязательное) - описание цели
- `milestone` (string, обязательное) - название ближайшего события/марафона
- `days_left` (integer, обязательное) - количество дней до дедлайна/события
- `progress` (integer, опциональное, 0-100) - процент выполнения цели

**Источник данных:**
- Данные должны браться из таблицы целей пользователя (если такая есть)
- Или из onboarding данных пользователя (поле `goals`)
- Или из отдельной таблицы `user_goals` / `client_goals`

**Рекомендации по реализации:**
1. Создать таблицу `user_goals` или использовать существующую таблицу целей
2. Поля таблицы:
   - `id` (UUID)
   - `user_id` (UUID, FK)
   - `headline` (string)
   - `description` (text)
   - `milestone` (string) - название события
   - `target_date` (date) - дата дедлайна/события
   - `progress` (integer, 0-100) - процент выполнения
   - `created_at` (timestamp)
   - `updated_at` (timestamp)
3. В эндпоинте `/api/dashboard/stats`:
   - Найти активную цель пользователя (например, ближайшую по дате)
   - Рассчитать `days_left` как разницу между `target_date` и текущей датой
   - Вернуть данные цели в ответе

#### 2. Фото прогресса (`progress_photos`)
```json
{
  "progress_photos": [
    {
      "id": "uuid",
      "date": "2022-10-15T00:00:00Z",
      "url": "https://example.com/photos/photo1.jpg"
    },
    {
      "id": "uuid",
      "date": "2022-06-15T00:00:00Z",
      "url": "https://example.com/photos/photo2.jpg"
    }
  ]
}
```

**Поля:**
- `id` (string, UUID) - идентификатор фото
- `date` (string, ISO 8601) - дата создания фото
- `url` (string) - URL изображения

**Источник данных:**
- Таблица `progress_photos` или `user_photos`
- Связь с пользователем через `user_id`

**Рекомендации по реализации:**
1. Создать таблицу `progress_photos`:
   - `id` (UUID, PK)
   - `user_id` (UUID, FK)
   - `date` (date)
   - `url` (string) - путь к файлу или URL
   - `created_at` (timestamp)
2. В эндпоинте `/api/dashboard/stats`:
   - Получить последние 2-3 фото пользователя, отсортированные по дате (DESC)
   - Вернуть массив фото в ответе

### Пример полного ответа:

```json
{
  "total_workouts": 12,
  "completed_workouts": 10,
  "attendance_rate": 83,
  "today_workouts": 1,
  "next_workout": {
    "id": "uuid",
    "title": "Утренняя пробежка",
    "start": "2026-01-02T08:00:00Z",
    "end": "2026-01-02T09:00:00Z",
    ...
  },
  "goal": {
    "headline": "Пробежать марафон без остановки",
    "description": "Фокус на выносливости и контроле темпа",
    "milestone": "City2Surf 10km Challenge",
    "days_left": 35,
    "progress": 65
  },
  "progress_photos": [
    {
      "id": "uuid-1",
      "date": "2022-10-15T00:00:00Z",
      "url": "/uploads/photos/user123/photo1.jpg"
    },
    {
      "id": "uuid-2",
      "date": "2022-06-15T00:00:00Z",
      "url": "/uploads/photos/user123/photo2.jpg"
    }
  ]
}
```

### Примечания:
- Если данных цели нет, поле `goal` должно быть `null`
- Если фото нет, поле `progress_photos` должно быть пустым массивом `[]` или `null`
- Все даты должны быть в формате ISO 8601 (UTC)

---

## Дополнительные данные для пользователя

### Эндпоинт: GET /api/users/me

#### Необходимо добавить:

#### 1. Часовой пояс пользователя (`timezone`)
```json
{
  "timezone": "Europe/Moscow"
}
```

**Поле:**
- `timezone` (string, опциональное) - часовой пояс пользователя в формате IANA Time Zone Database (например, 'Europe/Moscow', 'America/New_York')

**Источник данных:**
- Поле должно быть в таблице `users` как `timezone` (string, nullable)
- Если поле не заполнено, фронтенд будет использовать часовой пояс браузера автоматически

**Рекомендации по реализации:**
1. Добавить колонку `timezone` в таблицу `users`:
   - `timezone` (string, nullable) - часовой пояс пользователя
2. В эндпоинте `/api/users/me`:
   - Вернуть значение `timezone` из базы данных
   - Если значение `null`, фронтенд автоматически определит часовой пояс браузера

#### 2. Ограничения и травмы (`restrictions`)

**Текущее состояние:**
- Данные уже приходят из эндпоинта `/api/onboarding/` в поле `restrictions` (массив строк)
- Эти данные используются на дашборде для отображения ограничений

**Важно:**
- Если массив `restrictions` пустой или отсутствует, блок "Ограничения и травмы" не должен показывать моковые данные
- Фронтенд теперь не использует моковые данные, если реальных ограничений нет

### Пример полного ответа для User:

```json
{
  "id": "uuid",
  "full_name": "Иван Иванов",
  "email": "ivan@example.com",
  "phone": "+79991234567",
  "role": "client",
  "onboarding_seen": true,
  "locale": "ru",
  "avatar": null,
  "trainer_connection_code": null,
  "phone_verified": true,
  "created_at": "2025-01-01T00:00:00Z",
  "timezone": "Europe/Moscow",
  "trainer": {
    "id": "uuid",
    "full_name": "Тренер Тренеров",
    "email": "trainer@example.com",
    ...
  }
}
```

---

## API для работы с программами тренировок

### Необходимо реализовать следующие endpoints:

#### 1. PUT /api/programs/{program_id}/days/{day_id}
**Обновление дня программы (переименование)**

**Параметры:**
- `program_id` (string, path) - ID программы
- `day_id` (string, path) - ID дня программы

**Тело запроса:**
```json
{
  "name": "Новое название дня",
  "order": 0
}
```

**Поля:**
- `name` (string, опциональное) - новое название дня программы
- `order` (integer, опциональное) - порядок дня в программе

**Ответ:**
- `200 OK` - день программы обновлен
- `404 Not Found` - программа или день не найдены
- `403 Forbidden` - нет доступа к программе

**Пример ответа:**
```json
{
  "id": "uuid",
  "program_id": "uuid",
  "name": "Новое название дня",
  "order": 0,
  "notes": null,
  "owner": "client",
  "source_template_id": null,
  "blocks": [...]
}
```

**Проверка прав доступа:**
- Тренер может обновлять дни в своих программах и программах своих клиентов
- Клиент может обновлять дни только в своих программах

---

#### 2. POST /api/programs/{program_id}/days/{day_id}/blocks/{block_id}/exercises
**Добавление упражнения в блок дня программы**

**Параметры:**
- `program_id` (string, path) - ID программы
- `day_id` (string, path) - ID дня программы
- `block_id` (string, path) - ID блока дня программы

**Тело запроса:**
```json
{
  "title": "Жим лежа",
  "sets": 4,
  "reps": 10,
  "duration": null,
  "rest": 90,
  "weight": 80
}
```

**Поля:**
- `title` (string, обязательное) - название упражнения
- `sets` (integer, обязательное) - количество подходов
- `reps` (integer, опциональное) - количество повторений
- `duration` (integer, опциональное) - длительность в минутах (если упражнение на время)
- `rest` (integer, опциональное) - время отдыха в секундах
- `weight` (float, опциональное) - вес в кг

**Ответ:**
- `201 Created` - упражнение создано
- `404 Not Found` - программа, день или блок не найдены
- `403 Forbidden` - нет доступа к программе

**Пример ответа:**
```json
{
  "id": "uuid",
  "block_id": "uuid",
  "title": "Жим лежа",
  "sets": 4,
  "reps": 10,
  "duration": null,
  "rest": 90,
  "weight": 80.0,
  "order": 0
}
```

**Проверка прав доступа:**
- Тренер может добавлять упражнения в дни своих программ и программ своих клиентов
- Клиент может добавлять упражнения в дни только своих программ

**Рекомендации по реализации:**
1. Проверить существование программы, дня и блока
2. Проверить права доступа пользователя
3. Получить текущий порядок упражнений в блоке
4. Создать новое упражнение с `order = max(order) + 1`
5. **Важно:** В базе данных поля `duration`, `rest`, `weight` хранятся как строки:
   - `duration` хранится как строка вида "8 мин" (число + " мин")
   - `rest` хранится как строка вида "90 сек" (число + " сек")
   - `weight` хранится как строка вида "70 кг" (число + " кг")
   - При сохранении нужно преобразовать числа в строки с единицами измерения
   - При чтении из БД нужно преобразовать строки обратно в числа для ответа API
6. Вернуть созданное упражнение с числовыми значениями в полях `duration`, `rest`, `weight`

---

#### 3. PUT /api/programs/{program_id}/days/{day_id}/blocks/{block_id}/exercises/{exercise_id}
**Обновление упражнения в блоке дня программы**

**Параметры:**
- `program_id` (string, path) - ID программы
- `day_id` (string, path) - ID дня программы
- `block_id` (string, path) - ID блока дня программы
- `exercise_id` (string, path) - ID упражнения

**Тело запроса:**
```json
{
  "title": "Жим лежа (обновлено)",
  "sets": 5,
  "reps": 12,
  "duration": null,
  "rest": 120,
  "weight": 85
}
```

**Поля (все опциональные):**
- `title` (string) - название упражнения
- `sets` (integer) - количество подходов
- `reps` (integer) - количество повторений
- `duration` (integer) - длительность в минутах
- `rest` (integer) - время отдыха в секундах
- `weight` (float) - вес в кг

**Ответ:**
- `200 OK` - упражнение обновлено
- `404 Not Found` - программа, день, блок или упражнение не найдены
- `403 Forbidden` - нет доступа к программе

**Пример ответа:**
```json
{
  "id": "uuid",
  "block_id": "uuid",
  "title": "Жим лежа (обновлено)",
  "sets": 5,
  "reps": 12,
  "duration": null,
  "rest": 120,
  "weight": 85.0,
  "order": 0
}
```

**Проверка прав доступа:**
- Тренер может обновлять упражнения в днях своих программ и программ своих клиентов
- Клиент может обновлять упражнения в днях только своих программ

**Рекомендации по реализации:**
1. Проверить существование программы, дня, блока и упражнения
2. Проверить права доступа пользователя
3. Обновить только те поля, которые переданы в запросе (частичное обновление)
4. **Важно:** При обновлении полей `duration`, `rest`, `weight`:
   - В базе данных эти поля хранятся как строки с единицами измерения
   - `duration` → "8 мин" (если передано число 8)
   - `rest` → "90 сек" (если передано число 90)
   - `weight` → "70 кг" (если передано число 70.0)
   - При чтении из БД преобразовать строки обратно в числа для ответа API
5. Вернуть обновленное упражнение с числовыми значениями в полях `duration`, `rest`, `weight`

---

#### 4. DELETE /api/programs/{program_id}/days/{day_id}/blocks/{block_id}/exercises/{exercise_id}
**Удаление упражнения из блока дня программы**

**Параметры:**
- `program_id` (string, path) - ID программы
- `day_id` (string, path) - ID дня программы
- `block_id` (string, path) - ID блока дня программы
- `exercise_id` (string, path) - ID упражнения

**Ответ:**
- `204 No Content` - упражнение удалено
- `404 Not Found` - программа, день, блок или упражнение не найдены
- `403 Forbidden` - нет доступа к программе

**Проверка прав доступа:**
- Тренер может удалять упражнения из дней своих программ и программ своих клиентов
- Клиент может удалять упражнения из дней только своих программ

**Рекомендации по реализации:**
1. Проверить существование программы, дня, блока и упражнения
2. Проверить права доступа пользователя
3. Удалить упражнение из базы данных
4. Вернуть статус 204 No Content

---

### Важные замечания:

1. **Проверка прав доступа:**
   - Все endpoints должны проверять права доступа пользователя
   - Тренер может работать с программами своих клиентов (проверка через `trainer_id` в таблице `users`)
   - Клиент может работать только со своими программами

2. **Порядок упражнений:**
   - При добавлении нового упражнения нужно автоматически устанавливать `order = max(order) + 1` в рамках блока
   - При удалении упражнения порядок остальных упражнений не нужно пересчитывать (можно оставить как есть)

3. **Валидация данных:**
   - `sets` должно быть положительным числом
   - `reps`, `duration`, `rest`, `weight` должны быть положительными числами или `null`
   - `title` не должен быть пустым

4. **Формат данных:**
   - **В API запросах и ответах:**
     - `rest` передается как integer (секунды)
     - `duration` передается как integer (минуты)
     - `weight` передается как float (кг)
   - **В базе данных (таблица `program_exercises`):**
     - `rest` хранится как строка вида "90 сек" (например, "90 сек")
     - `duration` хранится как строка вида "8 мин" (например, "8 мин")
     - `weight` хранится как строка вида "70 кг" (например, "70 кг")
   - **Преобразование данных:**
     - При сохранении: числа → строки с единицами измерения
     - При чтении: строки с единицами → числа (убрать единицы измерения и преобразовать в число)

---

## Метрики (`/api/metrics`)

### Создание метрик тела и упражнений

#### 1. POST /api/metrics/body
**Создание метрики тела**

**Тело запроса (JSON):**
```json
{
  "label": "Вес",
  "unit": "кг",
  "target": 75.0
}
```

**Параметры:**
- `label` (string, обязательное) - название метрики (например, "Вес", "Рост", "Процент жира")
- `unit` (string, обязательное) - единица измерения (например, "кг", "см", "%")
- `target` (number, опциональное) - целевое значение метрики

**Ответ:**
- `201 Created` - метрика создана
- `400 Bad Request` - неверные данные
- `401 Unauthorized` - не авторизован

**Пример ответа:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "label": "Вес",
  "unit": "кг",
  "target": 75.0,
  "created_at": "2024-01-15T08:00:00"
}
```

**Проверка прав доступа:**
- Пользователь может создавать метрики только для себя
- Метрика автоматически привязывается к текущему пользователю (`user_id`)

---

#### 2. POST /api/metrics/exercise
**Создание метрики упражнения**

**Тело запроса (JSON):**
```json
{
  "label": "Жим лежа",
  "muscle_group": "Грудь"
}
```

**Параметры:**
- `label` (string, обязательное) - название упражнения (например, "Жим лежа", "Приседания")
- `muscle_group` (string, опциональное) - группа мышц (например, "Грудь", "Ноги", "Спина")

**Ответ:**
- `201 Created` - метрика создана
- `400 Bad Request` - неверные данные
- `401 Unauthorized` - не авторизован

**Пример ответа:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "label": "Жим лежа",
  "muscle_group": "Грудь",
  "created_at": "2024-01-15T08:00:00"
}
```

**Проверка прав доступа:**
- Пользователь может создавать метрики только для себя
- Метрика автоматически привязывается к текущему пользователю (`user_id`)

**Рекомендации по реализации:**
1. Проверить, что пользователь авторизован
2. Создать запись в таблице `body_metrics` или `exercise_metrics`
3. Вернуть созданную метрику с присвоенным ID
4. Метрики должны быть доступны только их создателю (проверка через `user_id`)

**Важно:**
- Если у пользователя нет метрик, он должен иметь возможность их создать через эти эндпоинты
- Метрики создаются один раз и используются для добавления записей (entries)

---

## API для работы с упражнениями библиотеки (`/api/exercises`)

### Расширение существующих endpoints

#### 1. POST /api/exercises
**Создание упражнения (расширение)**

**Текущие поля (уже реализованы):**
- `name` (string, обязательное) - название упражнения
- `description` (string, опциональное) - описание упражнения
- `muscle_groups` (string, опциональное) - группы мышц
- `equipment` (string, опциональное) - оборудование
- `difficulty` (string, опциональное) - уровень сложности

**Необходимо добавить следующие поля:**

**Тело запроса (расширенное):**
```json
{
  "name": "Жим лежа",
  "description": "Базовое упражнение для развития груди",
  "muscle_groups": "Грудь, Трицепс",
  "equipment": "Штанга, Скамья",
  "difficulty": "intermediate",
  "starting_position": "Лягте на скамью, ноги на полу, возьмите штангу хватом шире плеч",
  "execution_instructions": "Опустите штангу к груди, затем мощно выжмите вверх. Держите локти под углом 45 градусов.",
  "video_url": "https://youtube.com/watch?v=...",
  "notes": "Важно следить за техникой, не допускать прогиба в пояснице",
  "visibility": "all",
  "client_id": null
}
```

**Новые поля:**
- `starting_position` (string, опциональное) - исходное положение для выполнения упражнения
- `execution_instructions` (string, опциональное) - инструкция по выполнению упражнения (обязательное поле на фронтенде)
- `video_url` (string, опциональное) - ссылка на видео с техникой выполнения (поддерживаются YouTube, Vimeo, Rutube)
- `notes` (string, опциональное) - дополнительные заметки и рекомендации
- `visibility` (string, опциональное, по умолчанию "all") - видимость упражнения:
  - `"all"` - видно всем клиентам тренера
  - `"client"` - видно только конкретному клиенту
  - `"trainer"` - видно только тренеру (не видно клиентам)
- `client_id` (string, опциональное) - ID клиента, для которого упражнение доступно (используется только если `visibility === "client"`)

**Пример ответа:**
```json
{
  "id": "uuid",
  "trainer_id": "uuid",
  "name": "Жим лежа",
  "description": "Базовое упражнение для развития груди",
  "muscle_groups": "Грудь, Трицепс",
  "equipment": "Штанга, Скамья",
  "difficulty": "intermediate",
  "starting_position": "Лягте на скамью, ноги на полу, возьмите штангу хватом шире плеч",
  "execution_instructions": "Опустите штангу к груди, затем мощно выжмите вверх. Держите локти под углом 45 градусов.",
  "video_url": "https://youtube.com/watch?v=...",
  "notes": "Важно следить за техникой, не допускать прогиба в пояснице",
  "visibility": "all",
  "client_id": null,
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2024-01-15T08:00:00Z"
}
```

---

#### 2. PUT /api/exercises/{exercise_id}
**Обновление упражнения (расширение)**

**Тело запроса:**
```json
{
  "name": "Жим лежа (обновлено)",
  "description": "Обновленное описание",
  "muscle_groups": "Грудь, Трицепс, Плечи",
  "equipment": "Штанга, Скамья",
  "difficulty": "advanced",
  "starting_position": "Обновленное исходное положение",
  "execution_instructions": "Обновленная инструкция по выполнению",
  "video_url": "https://vimeo.com/...",
  "notes": "Обновленные заметки",
  "visibility": "client",
  "client_id": "uuid-клиента"
}
```

**Все поля опциональные** (частичное обновление):
- `name` (string)
- `description` (string)
- `muscle_groups` (string)
- `equipment` (string)
- `difficulty` (string)
- `starting_position` (string)
- `execution_instructions` (string)
- `video_url` (string)
- `notes` (string)
- `visibility` (string) - "all", "client", или "trainer"
- `client_id` (string, nullable) - обязательное, если `visibility === "client"`

**Пример ответа:**
```json
{
  "id": "uuid",
  "trainer_id": "uuid",
  "name": "Жим лежа (обновлено)",
  "description": "Обновленное описание",
  "muscle_groups": "Грудь, Трицепс, Плечи",
  "equipment": "Штанга, Скамья",
  "difficulty": "advanced",
  "starting_position": "Обновленное исходное положение",
  "execution_instructions": "Обновленная инструкция по выполнению",
  "video_url": "https://vimeo.com/...",
  "notes": "Обновленные заметки",
  "visibility": "client",
  "client_id": "uuid-клиента",
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2024-01-15T09:00:00Z"
}
```

---

#### 3. GET /api/exercises
**Получение списка упражнений (расширение)**

**Ответ должен включать все новые поля:**
```json
[
  {
    "id": "uuid",
    "trainer_id": "uuid",
    "name": "Жим лежа",
    "description": "Базовое упражнение для развития груди",
    "muscle_groups": "Грудь, Трицепс",
    "equipment": "Штанга, Скамья",
    "difficulty": "intermediate",
    "starting_position": "Лягте на скамью...",
    "execution_instructions": "Опустите штангу...",
    "video_url": "https://youtube.com/watch?v=...",
    "notes": "Важно следить за техникой...",
    "visibility": "all",
    "client_id": null,
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T08:00:00Z"
  }
]
```

**Фильтрация по видимости:**
- Если пользователь - тренер: возвращаются все его упражнения (включая с `visibility="trainer"`)
- Если пользователь - клиент: возвращаются только упражнения с `visibility="all"` или `visibility="client"` и `client_id` равен ID клиента

---

#### 4. GET /api/exercises/{exercise_id}
**Получение упражнения по ID (расширение)**

**Ответ должен включать все новые поля** (см. пример выше)

**Проверка прав доступа:**
- Тренер может получить доступ к своим упражнениям
- Клиент может получить доступ только к упражнениям с `visibility="all"` или `visibility="client"` с его `client_id`

---

### Рекомендации по реализации:

#### 1. Изменения в базе данных (таблица `exercises`):

Добавить следующие колонки в таблицу `exercises`:
```sql
ALTER TABLE exercises ADD COLUMN starting_position TEXT;
ALTER TABLE exercises ADD COLUMN execution_instructions TEXT;
ALTER TABLE exercises ADD COLUMN video_url VARCHAR(500);
ALTER TABLE exercises ADD COLUMN notes TEXT;
ALTER TABLE exercises ADD COLUMN visibility VARCHAR(20) DEFAULT 'all';
ALTER TABLE exercises ADD COLUMN client_id VARCHAR(36);
```

**Описание полей:**
- `starting_position` (TEXT, nullable) - исходное положение
- `execution_instructions` (TEXT, nullable) - инструкция по выполнению
- `video_url` (VARCHAR(500), nullable) - ссылка на видео (максимум 500 символов)
- `notes` (TEXT, nullable) - заметки
- `visibility` (VARCHAR(20), default 'all') - видимость: 'all', 'client', 'trainer'
- `client_id` (VARCHAR(36), nullable, FK to users.id) - ID клиента (используется только если `visibility='client'`)

**Ограничения:**
- `visibility` должен быть одним из значений: 'all', 'client', 'trainer'
- Если `visibility='client'`, то `client_id` должен быть указан
- Если `visibility!='client'`, то `client_id` должен быть `NULL`

#### 2. Изменения в Pydantic схемах (`schemas.py`):

**Обновить `ExerciseBase`:**
```python
class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    muscle_groups: Optional[str] = None
    equipment: Optional[str] = None
    difficulty: Optional[str] = None
    starting_position: Optional[str] = None
    execution_instructions: Optional[str] = None
    video_url: Optional[str] = None
    notes: Optional[str] = None
    visibility: Optional[str] = 'all'  # 'all', 'client', 'trainer'
    client_id: Optional[str] = None
```

**Обновить `ExerciseCreate` и `ExerciseResponse`** (они наследуются от `ExerciseBase`)

#### 3. Изменения в SQLAlchemy модели (`models.py`):

**Обновить модель `Exercise`:**
```python
class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(String, primary_key=True, index=True)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    muscle_groups = Column(String, nullable=True)
    equipment = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    starting_position = Column(Text, nullable=True)  # НОВОЕ
    execution_instructions = Column(Text, nullable=True)  # НОВОЕ
    video_url = Column(String(500), nullable=True)  # НОВОЕ
    notes = Column(Text, nullable=True)  # НОВОЕ
    visibility = Column(String(20), default='all', nullable=False)  # НОВОЕ
    client_id = Column(String, ForeignKey("users.id"), nullable=True)  # НОВОЕ
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    trainer = relationship("User", foreign_keys=[trainer_id])
    client = relationship("User", foreign_keys=[client_id])  # НОВОЕ
```

#### 4. Изменения в роутерах (`routers/exercises.py`):

**В `create_exercise`:**
- Добавить сохранение новых полей из `exercise` в `db_exercise`
- Добавить валидацию: если `visibility='client'`, проверить наличие `client_id`
- Проверить, что указанный `client_id` является клиентом текущего тренера

**В `update_exercise`:**
- Добавить обновление новых полей (частичное обновление)
- Добавить валидацию: если `visibility='client'`, проверить наличие `client_id`
- Проверить, что указанный `client_id` является клиентом текущего тренера

**В `get_exercises`:**
- Добавить фильтрацию по `visibility`:
  - Для тренеров: показывать все их упражнения
  - Для клиентов: показывать только упражнения с `visibility='all'` или (`visibility='client'` и `client_id` равен ID клиента)

**В `get_exercise`:**
- Добавить проверку прав доступа на основе `visibility` и `client_id`

#### 5. Валидация данных:

- `execution_instructions` - обязательное поле на фронтенде, но опциональное в API (для обратной совместимости)
- `video_url` - должен быть валидным URL (можно добавить проверку формата)
- `visibility` - должен быть одним из: 'all', 'client', 'trainer'
- `client_id` - обязателен, если `visibility='client'`
- `client_id` - должен быть `NULL`, если `visibility!='client'`
- `client_id` - должен существовать в таблице `users` и быть клиентом текущего тренера

#### 6. Миграция данных:

- Для существующих записей установить `visibility='all'` по умолчанию
- Все новые поля будут `NULL` для существующих записей (это нормально)

---

### Важные замечания:

1. **Обратная совместимость:**
   - Все новые поля опциональные, чтобы не сломать существующий функционал
   - Существующие записи будут иметь `NULL` для новых полей

2. **Видимость упражнений:**
   - `visibility='all'` - упражнение видно всем клиентам тренера
   - `visibility='client'` - упражнение видно только конкретному клиенту (требует `client_id`)
   - `visibility='trainer'` - упражнение видно только тренеру (не видно клиентам)

3. **Проверка прав доступа:**
   - Тренер может создавать/обновлять упражнения только для своих клиентов
   - При установке `visibility='client'` необходимо проверить, что `client_id` является клиентом текущего тренера

4. **Формат видео:**
   - Поддерживаются ссылки на YouTube, Vimeo, Rutube
   - Фронтенд автоматически определяет тип видео и отображает превью
   - Валидация формата URL на бэкенде не обязательна (можно оставить на фронтенде)

---

## API для работы с шаблонами тренировок (`/api/library/workout-templates`)

### Необходимо реализовать следующие endpoints:

#### 1. POST /api/library/workout-templates/
**Создание шаблона тренировки**

**Тело запроса (JSON):**
```json
{
  "title": "Силовая тренировка для груди",
  "description": "Комплексная тренировка для развития мышц груди",
  "duration": 60,
  "level": "intermediate",
  "goal": "muscle_gain",
  "muscle_groups": ["chest", "triceps"],
  "equipment": ["barbell", "dumbbells"],
  "exercises": [
    {
      "exercise_id": "uuid",
      "block_type": "warmup",
      "sets": 2,
      "reps": 10,
      "duration": null,
      "rest": 60,
      "weight": null,
      "notes": "Легкий разогрев"
    },
    {
      "exercise_id": "uuid",
      "block_type": "main",
      "sets": 4,
      "reps": 8,
      "duration": null,
      "rest": 90,
      "weight": 80.0,
      "notes": "Рабочий вес"
    },
    {
      "exercise_id": "uuid",
      "block_type": "cooldown",
      "sets": 1,
      "reps": null,
      "duration": 5,
      "rest": null,
      "weight": null,
      "notes": "Растяжка"
    }
  ]
}
```

**Поля:**
- `title` (string, обязательное) - название шаблона тренировки
- `description` (string, опциональное) - описание тренировки
- `duration` (integer, опциональное) - длительность тренировки в минутах
- `level` (string, опциональное) - уровень сложности: "beginner", "intermediate", "advanced"
- `goal` (string, опциональное) - цель тренировки: "weight_loss", "muscle_gain", "endurance", "flexibility", "general"
- `muscle_groups` (array of strings, опциональное) - группы мышц
- `equipment` (array of strings, опциональное) - необходимое оборудование
- `exercises` (array, обязательное) - массив упражнений:
  - `exercise_id` (string, обязательное) - ID упражнения из библиотеки
  - `block_type` (string, обязательное) - тип блока: "warmup", "main", "cooldown"
  - `sets` (integer, обязательное) - количество подходов
  - `reps` (integer, опциональное) - количество повторений
  - `duration` (integer, опциональное) - длительность в минутах (если упражнение на время)
  - `rest` (integer, опциональное) - время отдыха в секундах
  - `weight` (float, опциональное) - вес в кг
  - `notes` (string, опциональное) - заметки к упражнению

**Ответ:**
- `201 Created` - шаблон создан
- `400 Bad Request` - неверные данные
- `401 Unauthorized` - не авторизован
- `403 Forbidden` - только для тренеров

**Пример ответа:**
```json
{
  "id": "uuid",
  "trainer_id": "uuid",
  "title": "Силовая тренировка для груди",
  "description": "Комплексная тренировка для развития мышц груди",
  "duration": 60,
  "level": "intermediate",
  "goal": "muscle_gain",
  "muscle_groups": ["chest", "triceps"],
  "equipment": ["barbell", "dumbbells"],
  "exercises": [
    {
      "id": "uuid",
      "exercise_id": "uuid",
      "block_type": "warmup",
      "sets": 2,
      "reps": 10,
      "duration": null,
      "rest": 60,
      "weight": null,
      "notes": "Легкий разогрев",
      "order": 0
    }
  ],
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2024-01-15T08:00:00Z"
}
```

**Проверка прав доступа:**
- Только тренеры могут создавать шаблоны тренировок
- Шаблон автоматически привязывается к текущему тренеру (`trainer_id`)

---

#### 2. GET /api/library/workout-templates
**Получение списка шаблонов тренировок**

**Параметры запроса:**
- `search` (string, опциональное) - поиск по названию
- `level` (string, опциональное) - фильтр по уровню: "beginner", "intermediate", "advanced"
- `goal` (string, опциональное) - фильтр по цели: "weight_loss", "muscle_gain", "endurance", "flexibility", "general"
- `muscle_group` (string, опциональное) - фильтр по группе мышц
- `equipment` (string, опциональное) - фильтр по оборудованию

**Ответ:**
- `200 OK` - список шаблонов
- `401 Unauthorized` - не авторизован

**Пример ответа:**
```json
[
  {
    "id": "uuid",
    "trainer_id": "uuid",
    "title": "Силовая тренировка для груди",
    "description": "Комплексная тренировка для развития мышц груди",
    "duration": 60,
    "level": "intermediate",
    "goal": "muscle_gain",
    "muscle_groups": ["chest", "triceps"],
    "equipment": ["barbell", "dumbbells"],
    "exercises": [...],
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T08:00:00Z"
  }
]
```

**Проверка прав доступа:**
- Тренеры видят только свои шаблоны
- Клиенты видят шаблоны своих тренеров (если тренер разрешил)

---

#### 3. GET /api/library/workout-templates/{template_id}
**Получение шаблона тренировки по ID**

**Ответ:**
- `200 OK` - шаблон найден
- `404 Not Found` - шаблон не найден
- `401 Unauthorized` - не авторизован
- `403 Forbidden` - нет доступа к шаблону

**Пример ответа:** (см. пример ответа для POST)

**Проверка прав доступа:**
- Тренер может получить доступ к своим шаблонам
- Клиент может получить доступ только к шаблонам своего тренера

---

#### 4. PUT /api/library/workout-templates/{template_id}
**Обновление шаблона тренировки**

**Тело запроса:** (все поля опциональные, частичное обновление)
```json
{
  "title": "Обновленное название",
  "description": "Обновленное описание",
  "duration": 75,
  "level": "advanced",
  "goal": "endurance",
  "muscle_groups": ["legs"],
  "equipment": ["bodyweight"],
  "exercises": [...]
}
```

**Ответ:**
- `200 OK` - шаблон обновлен
- `404 Not Found` - шаблон не найден
- `401 Unauthorized` - не авторизован
- `403 Forbidden` - нет доступа к шаблону

**Проверка прав доступа:**
- Только тренер может обновлять свои шаблоны

---

#### 5. DELETE /api/library/workout-templates/{template_id}
**Удаление шаблона тренировки**

**Ответ:**
- `204 No Content` - шаблон удален
- `404 Not Found` - шаблон не найден
- `401 Unauthorized` - не авторизован
- `403 Forbidden` - нет доступа к шаблону

**Проверка прав доступа:**
- Только тренер может удалять свои шаблоны

---

### Рекомендации по реализации:

#### 1. Изменения в базе данных:

Создать таблицу `workout_templates`:
```sql
CREATE TABLE workout_templates (
    id VARCHAR(36) PRIMARY KEY,
    trainer_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER,
    level VARCHAR(20),
    goal VARCHAR(20),
    muscle_groups TEXT, -- JSON array или comma-separated
    equipment TEXT, -- JSON array или comma-separated
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_trainer_id (trainer_id)
);

CREATE TABLE workout_template_exercises (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    exercise_id VARCHAR(36) NOT NULL,
    block_type VARCHAR(20) NOT NULL, -- 'warmup', 'main', 'cooldown'
    sets INTEGER NOT NULL,
    reps INTEGER,
    duration INTEGER,
    rest INTEGER,
    weight DECIMAL(10, 2),
    notes TEXT,
    order_index INTEGER NOT NULL,
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    INDEX idx_template_id (template_id),
    INDEX idx_exercise_id (exercise_id)
);
```

#### 2. Изменения в Pydantic схемах (`schemas.py`):

```python
class WorkoutTemplateExerciseBase(BaseModel):
    exercise_id: str
    block_type: str  # 'warmup', 'main', 'cooldown'
    sets: int
    reps: Optional[int] = None
    duration: Optional[int] = None
    rest: Optional[int] = None
    weight: Optional[float] = None
    notes: Optional[str] = None

class WorkoutTemplateExerciseCreate(WorkoutTemplateExerciseBase):
    pass

class WorkoutTemplateExerciseResponse(WorkoutTemplateExerciseBase):
    id: str
    order: int

class WorkoutTemplateBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    level: Optional[str] = None
    goal: Optional[str] = None
    muscle_groups: Optional[List[str]] = None
    equipment: Optional[List[str]] = None

class WorkoutTemplateCreate(WorkoutTemplateBase):
    exercises: List[WorkoutTemplateExerciseCreate]

class WorkoutTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    level: Optional[str] = None
    goal: Optional[str] = None
    muscle_groups: Optional[List[str]] = None
    equipment: Optional[List[str]] = None
    exercises: Optional[List[WorkoutTemplateExerciseCreate]] = None

class WorkoutTemplateResponse(WorkoutTemplateBase):
    id: str
    trainer_id: str
    exercises: List[WorkoutTemplateExerciseResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

#### 3. Изменения в SQLAlchemy моделях (`models.py`):

```python
class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id = Column(String, primary_key=True, index=True)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=True)
    level = Column(String(20), nullable=True)
    goal = Column(String(20), nullable=True)
    muscle_groups = Column(Text, nullable=True)  # JSON array
    equipment = Column(Text, nullable=True)  # JSON array
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    trainer = relationship("User", foreign_keys=[trainer_id])
    exercises = relationship("WorkoutTemplateExercise", back_populates="template", cascade="all, delete-orphan", order_by="WorkoutTemplateExercise.order_index")

class WorkoutTemplateExercise(Base):
    __tablename__ = "workout_template_exercises"

    id = Column(String, primary_key=True, index=True)
    template_id = Column(String, ForeignKey("workout_templates.id"), nullable=False, index=True)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False, index=True)
    block_type = Column(String(20), nullable=False)
    sets = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=True)
    rest = Column(Integer, nullable=True)
    weight = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False)

    template = relationship("WorkoutTemplate", back_populates="exercises")
    exercise = relationship("Exercise")
```

#### 4. Создать роутер `backend/app/routers/library.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
import uuid
import json

router = APIRouter()

@router.post("/workout-templates/", response_model=schemas.WorkoutTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_workout_template(
    template: schemas.WorkoutTemplateCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать шаблон тренировки (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут создавать шаблоны тренировок")
    
    template_id = str(uuid.uuid4())
    db_template = models.WorkoutTemplate(
        id=template_id,
        trainer_id=current_user.id,
        title=template.title,
        description=template.description,
        duration=template.duration,
        level=template.level,
        goal=template.goal,
        muscle_groups=json.dumps(template.muscle_groups) if template.muscle_groups else None,
        equipment=json.dumps(template.equipment) if template.equipment else None,
    )
    db.add(db_template)
    
    # Добавляем упражнения
    for idx, exercise_data in enumerate(template.exercises):
        exercise_id = str(uuid.uuid4())
        db_exercise = models.WorkoutTemplateExercise(
            id=exercise_id,
            template_id=template_id,
            exercise_id=exercise_data.exercise_id,
            block_type=exercise_data.block_type,
            sets=exercise_data.sets,
            reps=exercise_data.reps,
            duration=exercise_data.duration,
            rest=exercise_data.rest,
            weight=exercise_data.weight,
            notes=exercise_data.notes,
            order_index=idx,
        )
        db.add(db_exercise)
    
    db.commit()
    db.refresh(db_template)
    return db_template

# Аналогично для GET, PUT, DELETE endpoints...
```

#### 5. Подключить роутер в `backend/main.py`:

```python
from app.routers import library

app.include_router(library.router, prefix="/api/library", tags=["library"])
```

---

### Важные замечания:

1. **Порядок упражнений:**
   - Упражнения должны сохраняться с `order_index` для сохранения порядка
   - При обновлении списка упражнений нужно пересчитывать `order_index`

2. **Валидация данных:**
   - `block_type` должен быть одним из: "warmup", "main", "cooldown"
   - `level` должен быть одним из: "beginner", "intermediate", "advanced"
   - `goal` должен быть одним из: "weight_loss", "muscle_gain", "endurance", "flexibility", "general"
   - `exercise_id` должен существовать в таблице `exercises`

3. **Хранение массивов:**
   - `muscle_groups` и `equipment` можно хранить как JSON строки в БД
   - При чтении преобразовывать обратно в массивы

4. **Связь с программами:**
   - Шаблоны тренировок могут использоваться при создании дней программ
   - Поле `source_template_id` в таблице `program_days` может ссылаться на `workout_templates.id`

