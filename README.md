# 🛰️ Орбита — мессенджер нового поколения

Мессенджер на HTML + Supabase + GitHub Pages.

## Запуск

1. Залей все файлы в корень репозитория на GitHub.
2. Включи GitHub Pages (Settings → Pages → Source: main, /root).
3. В Supabase SQL Editor выполни `supabase/schema.sql`.
4. В Supabase Settings → API добавь свой домен в CORS / Additional allowed origins.
5. В `config.js` вставь свои Supabase URL и anon key.

## Структура (всё в корне)

- index.html — главная страница
- style.css — стили
- config.js — конфиг Supabase
- auth.js — авторизация
- chat.js — чаты и сообщения
- ui.js — интерфейс
- .nojekyll — для GitHub Pages
- 404.html — fallback для SPA