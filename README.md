# 🛰️ Орбита — мессенджер нового поколения

Современный мессенджер на HTML + Supabase + Cloudflare Pages. Интерфейс вдохновлён Telegram, но выполнен в собственном стиле: стекло-морфизм, плавные анимации, тёмная/светлая тема, реальное время через Supabase Realtime.

## Структура

```
orbita/
├── index.html          # Главная страница
├── css/
│   └── style.css       # Стили (текстуальный дизайн, анимации, адаптив)
├── js/
│   ├── config.js       # Конфигурация Supabase
│   ├── auth.js         # Авторизация и профили
│   ├── chat.js         # Работа с чатами и сообщениями
│   └── ui.js           # Интерфейс: рендер, тема, уведомления
├── supabase/
│   └── schema.sql      # Схема базы данных
├── _redirects          # Перенаправления для Cloudflare Pages
├── _headers            # Заголовки безопасности
└── package.json
```

## Быстрый старт

### 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. Выполните SQL из файла `supabase/schema.sql` в SQL Editor.
3. Включите **Realtime** для таблицы `messages` (Database → Replication → toggle on `messages`).
4. Скопируйте **Project URL** и **anon public key** в `js/config.js`.

### 2. Локальная разработка

Откройте `index.html` в браузере или используйте любой локальный сервер:

```bash
npx serve .  # или python -m http.server
```

### 3. Деплой на Cloudflare Pages

1. Загрузите репозиторий на GitHub.
2. Подключите его в [Cloudflare Pages](https://pages.cloudflare.com/).
3. Настройки сборки:
   - Framework preset: None
   - Build command: (пусто)
   - Build output directory: `/` (корень репозитория)
4. Добавьте переменные окружения (если нужно) — но для чистого HTML достаточно встроенного config.js.

## Возможности

- Регистрация и вход (Supabase Auth)
- Список чатов с превью последнего сообщения
- Отправка и получение сообщений в реальном времени
- Статус доставки и прочтения
- Аватары пользователей
- Тёмная и светлая тема
- Адаптивный дизайн (мобильный + десктоп)
- Онлайн-статус пользователей

## Технологии

- HTML5 / CSS3 / Vanilla JS
- Supabase (Auth, Database, Realtime)
- Cloudflare Pages (хостинг)

---

Сделано с ❤️ для Орбиты.