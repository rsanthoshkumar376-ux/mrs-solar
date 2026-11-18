import { io } from 'socket.io-client';

let socket = null;

// Mock socket implementation for environments without WebSocket support (e.g. Vercel serverless)
const createMockSocket = () => {
  const listeners = {};
  const mock = {
    connected: false,
    on: (evt, cb) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(cb);
      return mock;
    },
    off: (evt, cb) => {
      if (listeners[evt]) {
        listeners[evt] = listeners[evt].filter(fn => fn !== cb);
      }
      return mock;
    },
    emit: (evt, ...args) => {
      // No-op on mock
      return mock;
    },
    once: (evt, cb) => {
      const wrapper = (...args) => {
        mock.off(evt, wrapper);
        cb(...args);
      };
      mock.on(evt, wrapper);
      return mock;
    }
  };
  return mock;
};

export function getSocket() {
  if (!socket) {
    // Vercel serverless functions do not host a persistent Socket.IO listener.
    // If running on *.vercel.app without an explicit external WebSocket host,
    // use a safe mock socket to prevent 404 / HTML-polling console errors.
    const isVercel = window.location.hostname.includes('vercel.app');

    if (isVercel) {
      socket = createMockSocket();
      return socket;
    }

    const url = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
    try {
      socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 8000
      });

      socket.on('connect_error', () => {
        // Silently handle connection drops
      });

      socket.on('connect', () => {
        const activeTicketId = localStorage.getItem('mrs_active_ticket_id');
        if (activeTicketId) {
          socket.emit('join_ticket', activeTicketId);
        }
      });
    } catch (e) {
      console.warn('Socket.IO initialization fallback:', e.message);
      socket = createMockSocket();
    }
  }
  return socket;
}

export function joinTicketRoom(ticketId) {
  if (!ticketId) return;
  const s = getSocket();
  localStorage.setItem('mrs_active_ticket_id', ticketId);
  if (s.connected) {
    s.emit('join_ticket', ticketId);
  } else {
    s.once('connect', () => {
      s.emit('join_ticket', ticketId);
    });
  }
}

export function leaveTicketRoom(ticketId) {
  if (!ticketId) return;
  const s = getSocket();
  localStorage.removeItem('mrs_active_ticket_id');
  if (s && s.connected) {
    s.emit('leave_ticket', ticketId);
  }
}
