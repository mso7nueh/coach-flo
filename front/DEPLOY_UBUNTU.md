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

    # Если API находится на том же сервере, можно проксировать запросы
    # location /api {
    #     proxy_pass http://localhost:8000;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    # }
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

1. Создайте папку для проекта (если решили вынести dist отдельно) или укажите путь к ней в конфиге.
   *Совет: лучше скопировать содержимое папки `dist` в `/var/www/coach-flo/front/dist`.*

```bash
sudo mkdir -p /var/www/coach-flo/front
sudo cp -r dist/* /var/www/coach-flo/front/
```

2. Включите конфиг и проверьте Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/coach-flo /etc/nginx/sites-enabled/
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

*   **Маршрутизация (SPA):** Строка `try_files $uri $uri/ /index.html;` критически важна для React Router. Она позволяет серверу отдавать `index.html` при любом запросе, чтобы React сам обработал путь.
*   **Переменные окружения:** Если вы меняете `VITE_API_URL`, проект нужно пересобрать (`npm run build`). В Vite переменные вшиваются в код на этапе сборки.
*   **Права доступа:** Убедитесь, что у пользователя `www-data` есть доступ к папке с файлами:
    `sudo chown -R www-data:www-data /var/www/coach-flo/front`
