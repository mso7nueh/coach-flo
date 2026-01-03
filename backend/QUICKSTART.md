# Быстрый старт на Ubuntu VPS сервере

## Подготовка сервера

### 1. Подключение к серверу

```bash
ssh root@your-server-ip
# или
ssh your-user@your-server-ip
```

### 2. Обновление системы

```bash
sudo apt update
sudo apt upgrade -y
```

## Вариант A: Развертывание с Docker (Рекомендуется)

### 1. Установка Docker и Docker Compose

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker (чтобы не использовать sudo)
sudo usermod -aG docker $USER
# Выйдите и войдите снова, чтобы изменения вступили в силу

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker-compose --version
```

### 2. Клонирование проекта

```bash
# Создайте директорию для проекта
cd /opt
sudo git clone <your-repo-url> coach-fit
# или загрузите файлы через scp/sftp
cd coach-fit/backend
```

### 3. Настройка переменных окружения

```bash
# Создайте файл .env на основе примера
cp env.example .env
nano .env
```

Настройте следующие параметры:

```env
# PostgreSQL Database
POSTGRES_USER=coachfit
POSTGRES_PASSWORD=<ИЗМЕНИТЕ_НА_СИЛЬНЫЙ_ПАРОЛЬ>
POSTGRES_DB=coachfit
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Database URL
DATABASE_URL=postgresql://coachfit:<ВАШ_ПАРОЛЬ>@db:5432/coachfit

# JWT Secret Key (ОБЯЗАТЕЛЬНО измените!)
SECRET_KEY=<СГЕНЕРИРУЙТЕ_СИЛЬНЫЙ_СЛУЧАЙНЫЙ_КЛЮЧ>

# CORS Origins (укажите ваш домен)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Генерация SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Запуск приложения

```bash
# Запуск в фоновом режиме
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f backend
```

### 5. Настройка автозапуска

Docker Compose обычно запускает контейнеры автоматически после перезагрузки. Для проверки:

```bash
# Перезагрузите сервер
sudo reboot

# После перезагрузки проверьте статус
docker-compose ps
```

### 6. Настройка Nginx (Reverse Proxy)

```bash
# Установка Nginx
sudo apt install nginx -y

# Создание конфигурации
sudo nano /etc/nginx/sites-available/coachfit-api
```

Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Замените на ваш домен

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket поддержка (если нужна)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Активируйте конфигурацию:

```bash
# Создайте симлинк
sudo ln -s /etc/nginx/sites-available/coachfit-api /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (опционально)
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl restart nginx
```

### 7. Настройка SSL (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
sudo certbot --nginx -d api.yourdomain.com

# Автоматическое обновление сертификата
sudo certbot renew --dry-run
```

### 8. Обновление приложения

```bash
cd /opt/coach-fit/backend

# Получение последних изменений
git pull

# Пересборка и перезапуск
docker-compose up -d --build

# Проверка логов
docker-compose logs -f backend
```

## Вариант B: Развертывание без Docker

### 1. Установка зависимостей

```bash
# Python 3.11+
sudo apt install python3.11 python3.11-venv python3-pip -y

# PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Системные зависимости
sudo apt install gcc libpq-dev -y
```

### 2. Настройка PostgreSQL

```bash
# Переключение на пользователя postgres
sudo -u postgres psql

# В PostgreSQL shell выполните:
CREATE USER coachfit WITH PASSWORD 'your_strong_password_here';
CREATE DATABASE coachfit OWNER coachfit;
GRANT ALL PRIVILEGES ON DATABASE coachfit TO coachfit;
\q
```

### 3. Клонирование и настройка проекта

```bash
# Перейдите в директорию проекта
cd /opt/coach-fit/backend

# Создайте виртуальное окружение
python3.11 -m venv venv
source venv/bin/activate

# Установите зависимости
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Настройка переменных окружения

```bash
# Создайте файл .env
cp env.example .env
nano .env
```

Настройте параметры (используйте `localhost` для POSTGRES_HOST):

```env
POSTGRES_USER=coachfit
POSTGRES_PASSWORD=<ваш_пароль>
POSTGRES_DB=coachfit
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://coachfit:<ваш_пароль>@localhost:5432/coachfit
SECRET_KEY=<сгенерируйте_ключ>
CORS_ORIGINS=https://yourdomain.com
```

### 5. Создание systemd службы

```bash
sudo nano /etc/systemd/system/coachfit-api.service
```

Добавьте следующее содержимое:

```ini
[Unit]
Description=Coach Fit API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/coach-fit/backend
Environment="PATH=/opt/coach-fit/backend/venv/bin"
ExecStart=/opt/coach-fit/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

> **Примечание:** Замените `User=www-data` на вашего пользователя или создайте отдельного пользователя для приложения.

### 6. Запуск службы

```bash
# Перезагрузите systemd
sudo systemctl daemon-reload

# Включите автозапуск
sudo systemctl enable coachfit-api

# Запустите службу
sudo systemctl start coachfit-api

# Проверьте статус
sudo systemctl status coachfit-api

# Просмотр логов
sudo journalctl -u coachfit-api -f
```

### 7. Настройка Nginx и SSL

Следуйте инструкциям из **Варианта A, пункты 6-7**.

### 8. Обновление приложения

```bash
cd /opt/coach-fit/backend

# Активируйте виртуальное окружение
source venv/bin/activate

# Получите последние изменения
git pull

# Обновите зависимости (если нужно)
pip install -r requirements.txt

# Перезапустите службу
sudo systemctl restart coachfit-api
```

## Проверка работы

### Проверка API

```bash
# Проверка health check
curl http://localhost:8000/health

# Или через домен (если настроен Nginx)
curl https://api.yourdomain.com/health
```

### Просмотр документации

Откройте в браузере:
- Swagger UI: `http://your-server-ip:8000/docs` (или `https://api.yourdomain.com/docs`)
- ReDoc: `http://your-server-ip:8000/redoc` (или `https://api.yourdomain.com/redoc`)

## Полезные команды

### Docker вариант

```bash
# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f db

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Очистка неиспользуемых данных
docker system prune -a

# Просмотр использования ресурсов
docker stats
```

### Без Docker вариант

```bash
# Статус службы
sudo systemctl status coachfit-api

# Остановка/запуск/перезапуск
sudo systemctl stop coachfit-api
sudo systemctl start coachfit-api
sudo systemctl restart coachfit-api

# Логи
sudo journalctl -u coachfit-api -f
sudo journalctl -u coachfit-api --since "1 hour ago"
```

## Резервное копирование базы данных

### С Docker

```bash
# Создание резервной копии
docker-compose exec db pg_dump -U coachfit coachfit > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление
docker-compose exec -T db psql -U coachfit coachfit < backup_20240101_120000.sql
```

### Без Docker

```bash
# Создание резервной копии
sudo -u postgres pg_dump coachfit > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление
sudo -u postgres psql coachfit < backup_20240101_120000.sql
```

## Безопасность

1. **Firewall:** Настройте UFW для ограничения доступа
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

2. **SSH:** Используйте ключи вместо паролей, отключите root-вход

3. **База данных:** Используйте сильные пароли, ограничьте доступ только с localhost

4. **SECRET_KEY:** Никогда не коммитьте `.env` файл в git

5. **Регулярные обновления:** Поддерживайте систему и зависимости в актуальном состоянии

## Мониторинг

### Установка htop для мониторинга ресурсов

```bash
sudo apt install htop -y
htop
```

### Настройка логирования

Логи доступны через:
- Docker: `docker-compose logs`
- Systemd: `journalctl -u coachfit-api`
- Nginx: `/var/log/nginx/access.log` и `/var/log/nginx/error.log`

## Устранение неполадок

### Приложение не запускается

1. Проверьте логи: `docker-compose logs backend` или `sudo journalctl -u coachfit-api`
2. Убедитесь, что база данных запущена
3. Проверьте файл `.env` и правильность переменных окружения
4. Проверьте, что порт 8000 не занят: `sudo netstat -tulpn | grep 8000`

### Ошибки подключения к БД

1. Проверьте статус PostgreSQL: `sudo systemctl status postgresql`
2. Проверьте правильность учетных данных в `.env`
3. Проверьте доступность БД: `psql -h localhost -U coachfit -d coachfit`

### Nginx не проксирует запросы

1. Проверьте конфигурацию: `sudo nginx -t`
2. Проверьте логи Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Убедитесь, что приложение работает на порту 8000

## Дополнительные ресурсы

- [Документация Docker](https://docs.docker.com/)
- [Документация Nginx](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [FastAPI документация](https://fastapi.tiangolo.com/)
