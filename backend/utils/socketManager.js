import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.IO instance on Node HTTP server
 */
export function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    // Client joins ticket room
    socket.on('join_ticket', (ticketId) => {
      if (ticketId) {
        socket.join(`ticket_${ticketId}`);
      }
    });

    // Client leaves ticket room
    socket.on('leave_ticket', (ticketId) => {
      if (ticketId) {
        socket.leave(`ticket_${ticketId}`);
      }
    });

    // User joins personal notification room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    // Typing indicators
    socket.on('typing', ({ ticketId, user, isTyping }) => {
      if (ticketId) {
        socket.to(`ticket_${ticketId}`).emit('user_typing', { user, isTyping });
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

/**
 * Get active Socket.IO instance
 */
export function getIO() {
  return io;
}

/**
 * Broadcast event to ticket room and general support listeners
 */
export function broadcastTicketEvent(ticketId, event, data) {
  if (!io) return;
  try {
    if (ticketId) {
      io.to(`ticket_${ticketId}`).emit(event, data);
    }
    // Also broadcast to general updates for managers and owner dashboard
    io.emit('support_update', { ticketId, event, data });
  } catch (err) {
    console.warn('Socket broadcast error:', err.message);
  }
}

/**
 * Send real-time notification to a specific user
 */
export function notifyUser(userId, data) {
  if (!io) return;
  try {
    io.to(`user_${userId}`).emit('new_notification', data);
    io.emit('support_notification', data);
  } catch (err) {
    console.warn('Socket user notification error:', err.message);
  }
}
