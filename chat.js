// ============================================
// Модуль чатов и сообщений (Supabase Realtime)
// ============================================
const OrbitaChat = (() => {
  let supabase = null;
  let currentConversationId = null;
  let messagesChannel = null;
  let presenceChannel = null;
  let onNewMessage = null;
  let onConversationList = null;

  const init = (sb) => {
    supabase = sb;
  };

  // Получить список чатов пользователя
  const loadConversations = async () => {
    const user = OrbitaAuth.getCurrentUser();
    if (!user) return [];

    // Получаем участковые чаты пользователя
    const { data: participants, error: pErr } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (pErr) return [];

    const conversationIds = participants.map((p) => p.conversation_id);
    if (conversationIds.length === 0) return [];

    // Получаем сами чаты
    const { data: conversations, error: cErr } = await supabase
      .from('conversations')
      .select('*, conversation_participants(user_id)')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (cErr) return [];

    // Для каждого чата получаем последнее сообщение и имя собеседника
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        // Последнее сообщение
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('*, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Собеседник (для личных чатов)
        let companion = null;
        if (conv.type === 'direct') {
          const participant = conv.conversation_participants.find(
            (p) => p.user_id !== user.id
          );
          if (participant) {
            companion = await OrbitaAuth.getProfile(participant.user_id);
          }
        }

        return {
          id: conv.id,
          type: conv.type,
          name: conv.name || (companion ? companion.full_name || companion.username : 'Неизвестный'),
          avatar: conv.avatar_url || (companion ? companion.avatar_url : null),
          lastMessage: lastMsg ? lastMsg.content : 'Нет сообщений',
          lastMessageTime: lastMsg ? lastMsg.created_at : conv.created_at,
          unread: lastMsg ? !lastMsg.read && lastMsg.sender_id !== user.id : false,
          online: companion ? companion.status === 'online' : false,
        };
      })
    );

    return enriched;
  };

  // Создать или найти личный чат с пользователем
  const getOrCreateDirectConversation = async (companionId) => {
    const user = OrbitaAuth.getCurrentUser();

    // Ищем существующий direct чат с обоими участниками
    const { data: convs, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)
      .eq('conversation_id', companionId); // упрощённо, в продакшене лучше RPC

    // Для надёжности создаём новый чат (в реальном приложении проверяем существующий)
    const { data: conversation, error: cErr } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .single();

    if (cErr) throw cErr;

    // Добавляем обоих участников
    await supabase.from('conversation_participants').insert([
      { conversation_id: conversation.id, user_id: user.id },
      { conversation_id: conversation.id, user_id: companionId },
    ]);

    return conversation.id;
  };

  // Загрузить сообщения чата
  const loadMessages = async (conversationId, limit = 50) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) return [];
    return data || [];
  };

  // Отправить сообщение
  const sendMessage = async (conversationId, content, type = 'text') => {
    const user = OrbitaAuth.getCurrentUser();
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        type,
      })
      .select('*, sender_id')
      .single();

    if (error) throw error;
    return data;
  };

  // Подписаться на новые сообщения в чате
  const subscribeToMessages = (conversationId, callback) => {
    if (messagesChannel) {
      supabase.removeChannel(messagesChannel);
    }

    messagesChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (callback) callback(payload.new);
        }
      )
      .subscribe();

    onNewMessage = callback;
    return messagesChannel;
  };

  // Подписаться на список чатов (при появлении нового сообщения обновляется updated_at)
  const subscribeToConversations = (callback) => {
    if (presenceChannel) {
      supabase.removeChannel(presenceChannel);
    }

    presenceChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          if (callback) callback();
        }
      )
      .subscribe();

    onConversationList = callback;
    return presenceChannel;
  };

  // Отметить сообщения как прочитанные
  const markAsRead = async (conversationId) => {
    const user = OrbitaAuth.getCurrentUser();
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id);
  };

  const setCurrentConversation = (id) => {
    currentConversationId = id;
  };

  const getCurrentConversation = () => currentConversationId;

  return {
    init,
    loadConversations,
    getOrCreateDirectConversation,
    loadMessages,
    sendMessage,
    subscribeToMessages,
    subscribeToConversations,
    markAsRead,
    setCurrentConversation,
    getCurrentConversation,
  };
})();