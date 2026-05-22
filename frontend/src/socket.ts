import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

// autoConnect: false — conecta só após login, com token válido
const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  // auth é avaliado na hora da conexão/reconexão
  auth: (cb) => {
    cb({ token: localStorage.getItem('medusa_token') || '' });
  },
});

export default socket;
