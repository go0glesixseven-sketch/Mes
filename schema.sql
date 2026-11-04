-- ============================================
-- Схема базы данных для мессенджера Орбита
-- Выполните этот SQL в SQL Editor вашего Supabase проекта
-- ============================================

-- Включаем расширение uuid-osf (если нужно)
-- create extension if not exists "uuid-ossp";

-- 1. Профили пользователей (расширяют auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  status text default 'online', -- online, offline, away
  last_seen_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Чат-комнаты (диалоги и групповые чаты)
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  type text check (type in ('direct', 'group')) default 'direct',
  name text, -- для групповых чатов
  description text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Участники чатов
create table if not exists conversation_participants (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique(conversation_id, user_id)
);

-- 4. Сообщения
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  content text not null,
  type text check (type in ('text', 'image', 'file', 'system')) default 'text',
  reply_to uuid references messages(id), -- ответ на сообщение
  read boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 5. Индексы для производительности
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_created_at on messages(created_at desc);
create index if not exists idx_conversation_participants_user on conversation_participants(user_id);
create index if not exists idx_profiles_username on profiles(username);

-- 6. Row Level Security (RLS)
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Политики для профилей: все могут читать, свои — менять
create policy "Profiles are viewable by everyone" on profiles
  for select using ( true );
create policy "Users can update own profile" on profiles
  for update using ( auth.uid() = id );
create policy "Users can insert own profile" on profiles
  for insert with check ( auth.uid() = id );

-- Политики для чатов: участники могут читать
create policy "Conversation participants can view conversations" on conversations
  for select using (
    exists (
      select 1 from conversation_participants
      where conversation_participants.conversation_id = conversations.id
      and conversation_participants.user_id = auth.uid()
    )
  );
create policy "Authenticated users can create conversations" on conversations
  for insert with check ( auth.uid() is not null );

-- Политики для участников: участники чата могут видеть участников
create policy "Participants can view conversation participants" on conversation_participants
  for select using ( true );
create policy "Users can join conversations" on conversation_participants
  for insert with check ( auth.uid() = user_id );

-- Политики для сообщений: участники чата читают, отправитель пишет
create policy "Conversation participants can view messages" on messages
  for select using (
    exists (
      select 1 from conversation_participants
      where conversation_participants.conversation_id = messages.conversation_id
      and conversation_participants.user_id = auth.uid()
    )
  );
create policy "Authenticated users can insert messages" on messages
  for insert with check ( auth.uid() = sender_id );
create policy "Users can update own messages" on messages
  for update using ( auth.uid() = sender_id );

-- 7. Триггер для обновления updated_at у профилей и чатов
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute procedure update_updated_at_column();

create trigger update_conversations_updated_at
  before update on conversations
  for each row
  execute procedure update_updated_at_column();

-- 8. Включаем Realtime для таблицы messages
-- (также нужно включить галочку в Dashboard → Database → Replication)
alter publication supabase_realtime add table messages;