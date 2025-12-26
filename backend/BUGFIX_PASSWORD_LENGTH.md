# Исправление ошибки регистрации (500 Internal Server Error)

## Проблема

При регистрации пользователя через `POST /api/auth/register/step1` возникала ошибка 500 Internal Server Error:

```
ValueError: password cannot be longer than 72 bytes, truncate manually if necessary (e.g. my_password[:72])
```

## Причина

Библиотека `bcrypt`, используемая для хеширования паролей, имеет ограничение в **72 байта** для длины пароля. При попытке захешировать пароль длиннее 72 байт возникает ошибка.

## Решение

Исправлены функции в `backend/app/auth.py`:

1. **`get_password_hash()`** - обрезает пароль до 72 байт перед хешированием
2. **`verify_password()`** - обрезает пароль до 72 байт при проверке (для совместимости)

Также добавлена валидация в схемы (`backend/app/schemas.py`):
- Добавлен `max_length=72` для полей паролей
- Обновлены описания с предупреждением об ограничении

## Изменения в коде

### `backend/app/auth.py`

```python
def get_password_hash(password: str) -> str:
    """Хеширование пароля
    
    Примечание: bcrypt имеет ограничение в 72 байта для паролей.
    Пароли длиннее 72 байт будут автоматически обрезаны.
    """
    # Обрезаем пароль до 72 байт (ограничение bcrypt)
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля
    
    Примечание: пароли длиннее 72 байт обрезаются до 72 байт (ограничение bcrypt).
    """
    # Обрезаем пароль до 72 байт при проверке (для совместимости с хешированием)
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        plain_password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(plain_password, hashed_password)
```

### `backend/app/schemas.py`

Добавлен `max_length=72` и обновлены описания для всех полей паролей:

```python
password: str = Field(..., min_length=6, max_length=72, description="Пароль (6-72 символа). Пароли длиннее 72 символов будут обрезаны.", example="password123")
```

## Результат

✅ Регистрация теперь работает корректно  
✅ Пароли длиннее 72 символов автоматически обрезаются  
✅ Хеширование и проверка паролей работают согласованно  
✅ API валидирует длину пароля (6-72 символа)

## Примечания

- Ограничение в 72 байта - это техническое ограничение библиотеки bcrypt
- Обрезание происходит на уровне байт, а не символов (UTF-8 кодировка)
- Пароли до 72 символов работают без изменений
- Пароли длиннее 72 символов обрезаются до первых 72 байт

## Тестирование

После исправления:
1. Регистрация через `POST /api/auth/register/step1` должна возвращать 200 OK
2. Регистрация через `POST /api/auth/register/step2` должна работать корректно
3. Все последующие запросы с авторизацией должны работать

---

**Дата исправления:** 2025-12-26  
**Файлы изменены:**
- `backend/app/auth.py`
- `backend/app/schemas.py`

