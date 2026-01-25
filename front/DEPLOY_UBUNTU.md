# Инструкция по деплою фронтенда на Ubuntu VPS

Эта инструкция описывает процесс развертывания React-приложения (Vite) на чистый сервер Ubuntu с использованием Nginx.

## 1. Подготовка сервера

Обновите пакеты и установите необходимые зависимости:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl
```

### Установка Node.js (через NVM)

Рекомендуется использовать NVM для управления версиями Node.js:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20 # Или другая версия, используемая в разработке
```

## 2. Подготовка проекта

Склонируйте репозиторий (если еще не сделано):

```bash
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
cd <ПАПКА_ПРОЕКТА>/front/client-app
```

### Установка зависимостей и сборка

```bash
npm install
# Замените API_URL на адрес вашего бэкенда
VITE_API_URL=https://api.yourdomain.com npm run build
```

После сборки в папке `front/client-app/dist` появятся статические файлы.

## 3. Настройка Nginx

### Вариант А: Без домена (по IP-адресу)

Создайте файл конфигурации:
`sudo nano /etc/nginx/sites-available/coach-flo`

Вставьте следующее содержимое:

```nginx
server {
    listen 80;
    server_name <ВАШ_IP_АДРЕС>;

    root /var/www/coach-flo/front/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Проксирование запросов к API (ОБЯЗАТЕЛЬНО для работы приложения)
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Вариант Б: С доменом (и SSL)

Настройка практически такая же, но с указанием домена:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/coach-flo/front/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 4. Активация конфигурации

1. Создайте структуру папок и скопируйте файлы:
   *Важно: путь должен строго соответствовать `root` в конфиге Nginx.*

```bash
# Создаем папку, включая подпапку dist
sudo mkdir -p /var/www/coach-flo/front/dist

# Копируем содержимое собранной папки dist в целевую директорию
sudo cp -r dist/* /var/www/coach-flo/front/dist/

# ПРОВЕРКА: убедитесь, что index.html находится именно здесь
ls -l /var/www/coach-flo/front/dist/index.html
```

2. Включите конфиг (если это первый раз) и проверьте Nginx:

```bash
# Если ссылка уже существует, удалите её перед созданием (или используйте -sf)
sudo ln -sf /etc/nginx/sites-available/coach-flo /etc/nginx/sites-enabled/

# Удалите стандартный конфиг, если он мешает
sudo rm /etc/nginx/sites-enabled/default 2>/dev/null

sudo nginx -t
sudo systemctl restart nginx
```

## 5. Настройка SSL (только для варианта с доменом)

Используйте Certbot для получения бесплатного сертификата Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot автоматически изменит конфигурацию Nginx для поддержки HTTPS и настроит редирект с HTTP.

## 6. Важные замечания

*   **Маршрутизация (SPA):** Строка `try_files $uri $uri/ /index.html;` критически важна. Она сообщает Nginx: "если файл не найден по его пути, отдай `index.html`". Без этого при обновлении страницы будет ошибка 404.
*   **Переменные окружения:** Если вы меняете `VITE_API_URL`, проект нужно пересобрать (`npm run build`). В Vite переменные вшиваются в код на этапе сборки.
*   **Права доступа:** Чтобы Nginx (пользователь `www-data`) мог читать файлы, выполните:
    ```bash
    # Устанавливаем владельца
    sudo chown -R www-data:www-data /var/www/coach-flo/front
    
    # Устанавливаем права: 755 для папок, 644 для файлов
    sudo find /var/www/coach-flo/front -type d -exec chmod 755 {} \;
    sudo find /var/www/coach-flo/front -type f -exec chmod 644 {} \;
    ```
    *Примечание: Если папка проекта находится в `/root` или `/home/user`, Nginx может выдать 403 Forbidden, так как у него нет прав доступа к родительским папкам. Лучше использовать `/var/www/`.*
