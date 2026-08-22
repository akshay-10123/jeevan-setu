/**
 * WebSocket client for instant request updates (volunteer + admin dashboards).
 */
function connectRealtime(handlers = {}) {
  if (typeof io === 'undefined') {
    console.warn('Socket.io client not loaded');
    return null;
  }

  const userRaw = sessionStorage.getItem('user');
  if (!userRaw) return null;

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null;
  }

  const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    socket.emit('join', { role: user.role });
    console.log('Realtime connected as', user.role);
  });

  if (handlers.onNewRequest) {
    socket.on('new_request', handlers.onNewRequest);
  }

  if (handlers.onRequestUpdated) {
    socket.on('request_updated', handlers.onRequestUpdated);
  }

  socket.on('disconnect', () => {
    console.log('Realtime disconnected');
  });

  return socket;
}

window.connectRealtime = connectRealtime;
