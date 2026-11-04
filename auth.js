// ============================================
// Модуль авторизации и профилей (Supabase Auth)
// ============================================
const OrbitaAuth = (() => {
  let supabase = null;
  let currentUser = null;

  const init = (sb) => {
    supabase = sb;
  };

  const getCurrentUser = () => currentUser;

  const setCurrentUser = (user) => {
    currentUser = user;
    if (user) {
      OrbitaUI.showToast(`Добро пожаловать, ${user.user_metadata.full_name || user.email}`, 'success');
    }
  };

  // Регистрация
  const signUp = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: email.split('@')[0],
        },
      },
    });
    if (error) throw error;
    return data;
  };

  // Вход
  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Выход
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    currentUser = null;
    OrbitaUI.navigateTo('auth');
  };

  // Профиль текущего пользователя
  const getMyProfile = async () => {
    if (!currentUser) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    if (error) return null;
    return data;
  };

  // Обновить статус
  const updateStatus = async (status) => {
    if (!currentUser) return;
    await supabase
      .from('profiles')
      .update({ status, last_seen_at: new Date().toISOString() })
      .eq('id', currentUser.id);
  };

  // Получить профиль другого пользователя
  const getProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  };

  // Поиск пользователей
  const searchUsers = async (query) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .neq('id', currentUser.id)
      .limit(10);
    if (error) return [];
    return data;
  };

  // Слушатель состояния auth
  const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        setCurrentUser(session.user);
      } else {
        currentUser = null;
      }
      callback(event, session);
    });
  };

  return {
    init,
    getCurrentUser,
    setCurrentUser,
    signUp,
    signIn,
    signOut,
    getMyProfile,
    updateStatus,
    getProfile,
    searchUsers,
    onAuthStateChange,
  };
})();