// ============================================
// Конфигурация Supabase для мессенджера Орбита
// Замените значения ниже на свои из Supabase Dashboard
// ============================================
const SUPABASE_CONFIG = {
  // Project URL (например: https://xyzcompany.supabase.co)
  url: 'https://rtafobxsajeveobtjkrh.supabase.co',

  // Anon public key (начинается с eyJ...)
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0YWZvYnhzYWpldmVvYnRqa3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTgxMTMsImV4cCI6MjEwOTM3NDExM30.0lHp8l0qXSffwwBmUszio2v8LOzXiE5FjHbqXYZWoRs',
};

// Экспортируем для использования в других файлах
window.SUPABASE_CONFIG = SUPABASE_CONFIG;