// ============================================
// Авторизация и профили (Supabase Auth)
// ============================================
const OrbitaAuth = (() => {
  let supabase = null;

  const init = (sb) => {
    supabase = sb;
  };

  const getCurrentUser = () => {
    const { data: { user } } = supabase.auth.getUser();
    return user;
  };

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

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getMyProfile = async () => {
    const user = getCurrentUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) return null;
    return data;
  };

  const updateStatus = async (status) => {
    const user = getCurrentUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ status, last_seen_at: new Date().toISOString() })
      .eq('id', user.id);
  };

  const getProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  };

  const searchUsers = async (query) => {
    const user = getCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(10);
    if (error) return [];
    return data || [];
  };

  const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  };

  return {
    init,
    getCurrentUser,
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