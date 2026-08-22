let io = null;

function initSocket(httpServer) {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('join', ({ role }) => {
      if (role === 'volunteer') socket.join('volunteers');
      if (role === 'admin') socket.join('admins');
      if (role === 'victim') socket.join('victims');
      socket.join('dashboard');
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitNewRequest(request) {
  if (!io) return;
  io.to('volunteers').to('admins').emit('new_request', request);
}

function emitRequestUpdated(request) {
  if (!io) return;
  io.to('volunteers').to('admins').to('victims').emit('request_updated', request);
}

module.exports = {
  initSocket,
  getIO,
  emitNewRequest,
  emitRequestUpdated
};
