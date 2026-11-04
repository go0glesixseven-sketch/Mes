// ============================================
// Чат-комнаты и сообщения (Supabase Realtime)
// ============================================
const OrbitaChat = (() => {
  let supabase = null;

  const init = (sb) => {
    supabase = sb;
  };

  const loadConversations = async () => {
    const user = OrbitaAuth.getCurrentUser();
    if (!user) return [];

    const { data: participants, error: pErr } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (pErr) return [];
    const conversationIds = participants.map((p) => p.conversation_id);
    if (conversationIds.length === 0) return [];

    const { data: conversations, error: cErr } = await supabase
      .from('conversations')
      .select('*, conversation_participants(user_id)')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (cErr) return [];

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('*, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

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

  const getOrCreateDirectConversation = async (companionId) => {
    const user = OrbitaAuth.getCurrentUser();

    const { data: conversation, error: cErr } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .single();

    if (cErr) throw cErr;

    await supabase.from('conversation_participants').insert([
      { conversation_id: conversation.id, user_id: user.id },
      { conversation_id: conversation.id, user_id: companionId },
    ]);

    return conversation.id;
  };

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

  const subscribeToMessages = (conversationId, callback) => {
    const channel = supabase
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

    return channel;
  };

  const subscribeToConversations = (callback) => {
    const channel = supabase
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

    return channel;
  };

  const markAsRead = async (conversationId) => {
    const user = OrbitaAuth.getCurrentUser();
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id);
  };

  let currentConversationId = null;

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