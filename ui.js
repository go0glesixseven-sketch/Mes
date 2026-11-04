// ============================================
// Модуль интерфейса (рендер, тема, уведомления)
// ============================================
const OrbitaUI = (() => {
  const state = {
    theme: localStorage.getItem('orbita-theme') || 'dark',
    currentView: 'auth', // auth | chats | chat
  };

  const init = () => {
    applyTheme();
    setupThemeToggle();
    setupAuthForms();
  };

  // Тема
  const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', state.theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  };

  const toggleTheme = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('orbita-theme', state.theme);
    applyTheme();
  };

  const setupThemeToggle = () => {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);
  };

  // Навигация между экранами
  const navigateTo = (view) => {
    state.currentView = view;

    const screens = document.querySelectorAll('.screen');
    screens.forEach((s) => s.classList.remove('active'));

    const target = document.getElementById(`screen-${view}`);
    if (target) target.classList.add('active');

    // Мобильная адаптация: скрывать список чатов при открытии чата
    if (view === 'chat') {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.add('chat-open');
      const backBtn = document.getElementById('backToChats');
      if (backBtn) backBtn.style.display = 'block';
    } else {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.remove('chat-open');
      const backBtn = document.getElementById('backToChats');
      if (backBtn) backBtn.style.display = 'none';
    }
  };

  // Рендер списка чатов
  const renderConversations = (conversations, onChatClick) => {
    const container = document.getElementById('conversationsList');
    if (!container) return;

    container.innerHTML = '';

    if (!conversations || conversations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-title">Чатов пока нет</div>
          <div class="empty-desc">Начните новый разговор, выбрав пользователя</div>
        </div>
      `;
      return;
    }

    conversations.forEach((conv) => {
      const el = document.createElement('div');
      el.className = `conversation-item ${conv.unread ? 'unread' : ''}`;
      el.dataset.id = conv.id;
      el.onclick = () => onChatClick(conv);

      const avatar = conv.avatar
        ? `<img src="${conv.avatar}" class="conv-avatar" alt="avatar">`
        : `<div class="conv-avatar conv-avatar-letter">${getInitials(conv.name)}</div>`;

      const time = conv.lastMessageTime
        ? formatTime(conv.lastMessageTime)
        : '';

      el.innerHTML = `
        <div class="conv-avatar-wrap">${avatar}</div>
        <div class="conv-body">
          <div class="conv-header">
            <span class="conv-name">${escapeHtml(conv.name)}</span>
            <span class="conv-time">${time}</span>
          </div>
          <div class="conv-preview">${escapeHtml(conv.lastMessage)}</div>
        </div>
        <div class="conv-status">
          ${conv.unread ? '<div class="unread-badge"></div>' : ''}
          ${conv.online ? '<div class="online-dot"></div>' : ''}
        </div>
      `;

      container.appendChild(el);
    });
  };

  // Рендер сообщений
  const renderMessages = (messages, currentUserId) => {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!messages || messages.length === 0) {
      container.innerHTML = `
        <div class="empty-messages">
          <div class="empty-icon">✨</div>
          <div class="empty-title">Начните переписку</div>
          <div class="empty-desc">Отправьте первое сообщение</div>
        </div>
      `;
      return;
    }

    let lastDate = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        const dateSep = document.createElement('div');
        dateSep.className = 'date-separator';
        dateSep.textContent = formatDateFull(msg.created_at);
        container.appendChild(dateSep);
      }

      const isMine = msg.sender_id === currentUserId;
      const time = formatTime(msg.created_at);
      const status = isMine ? `<span class="msg-status">${msg.read ? '✓✓' : '✓'}</span>` : '';

      const bubbleClass = isMine ? 'msg-bubble mine' : 'msg-bubble theirs';

      const el = document.createElement('div');
      el.className = `message ${isMine ? 'message-mine' : 'message-theirs'}`;
      el.innerHTML = `
        <div class="${bubbleClass}">
          <div class="msg-text">${escapeHtml(msg.content)}</div>
          <div class="msg-meta">
            <span class="msg-time">${time}</span>
            ${status}
          </div>
        </div>
      `;

      container.appendChild(el);
    });

    scrollToBottom();
  };

  // Добавить одно сообщение в конец
  const appendMessage = (msg, currentUserId) => {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    // Убираем пустое состояние если есть
    const empty = container.querySelector('.empty-messages');
    if (empty) empty.remove();

    const isMine = msg.sender_id === currentUserId;
    const time = formatTime(msg.created_at);
    const status = isMine ? `<span class="msg-status">✓</span>` : '';
    const bubbleClass = isMine ? 'msg-bubble mine' : 'msg-bubble theirs';

    const el = document.createElement('div');
    el.className = `message ${isMine ? 'message-mine' : 'message-theirs'} new-message`;
    el.innerHTML = `
      <div class="${bubbleClass}">
        <div class="msg-text">${escapeHtml(msg.content)}</div>
        <div class="msg-meta">
          <span class="msg-time">${time}</span>
          ${status}
        </div>
      </div>
    `;

    container.appendChild(el);
    scrollToBottom();

    // Убираем класс анимации через время
    setTimeout(() => el.classList.remove('new-message'), 300);
  };

  // Установить заголовок чата
  const setChatHeader = (conversation, myProfile) => {
    const title = document.getElementById('chatTitle');
    const subtitle = document.getElementById('chatSubtitle');
    const avatarWrap = document.getElementById('chatHeaderAvatar');

    if (title) title.textContent = conversation.name || 'Чат';
    if (subtitle) subtitle.textContent = conversation.online ? 'Онлайн' : 'Офлайн';

    if (avatarWrap) {
      const avatar = conversation.avatar
        ? `<img src="${conversation.avatar}" class="chat-header-avatar" alt="avatar">`
        : `<div class="chat-header-avatar chat-header-avatar-letter">${getInitials(conversation.name)}</div>`;
      avatarWrap.innerHTML = avatar;
    }
  };

  // Показать экран чата
  const showChatScreen = (conversation) => {
    navigateTo('chat');
    const input = document.getElementById('messageInput');
    if (input) {
      input.disabled = false;
      input.focus();
    }
  };

  // Уведомления (тост)
  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Ошибка
  const showError = (message) => {
    showToast(message, 'error');
  };

  // Вспомогательные
  const getInitials = (text) => {
    if (!text) return '?';
    return text
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateFull = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const scrollToBottom = () => {
    const container = document.getElementById('messagesContainer');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  // Setup auth forms (сохраняем в estado)
  const setupAuthForms = () => {
    // Вызывается из auth.js при инициализации
  };

  return {
    init,
    navigateTo,
    renderConversations,
    renderMessages,
    appendMessage,
    setChatHeader,
    showChatScreen,
    showToast,
    showError,
    applyTheme,
    toggleTheme,
    getCurrentView: () => state.currentView,
  };
})();