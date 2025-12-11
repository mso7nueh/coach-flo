FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements и установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода приложения
COPY . .

# Копирование и настройка скрипта ожидания БД
COPY wait-for-db.sh /wait-for-db.sh
RUN chmod +x /wait-for-db.sh

# Порт для FastAPI
EXPOSE 8000

# Команда запуска с ожиданием БД
CMD ["/wait-for-db.sh", "db", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

