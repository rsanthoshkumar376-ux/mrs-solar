import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    // In production or dev, connects to origin
    const url = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000
    });

    socket.on('connect', () => {
      // Re-join any active ticket room if stored
      const activeTicketId = localStorage.getItem('mrs_active_ticket_id');
      if (activeTicketId) {
        socket.emit('join_ticket', activeTicketId);
      }
    });
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
