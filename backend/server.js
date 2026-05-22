require('dotenv').config();

const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const { Pool } = require('pg');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// ─── PostgreSQL ───────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

async function q(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function resolveToken(token) {
  if (!token) return null;
  const rows = await q(
    `SELECT p.name, p.wins, p.losses, p.points
     FROM medusa.sessions s
     JOIN medusa.players p ON p.name = s.player_name
     WHERE s.token = $1`,
    [token],
  );
  return rows[0] || null;
}

async function getPlayer(name) {
  const rows = await q(
    'SELECT name, wins, losses, points FROM medusa.players WHERE name = $1',
    [name],
  );
  return rows[0] || null;
}

async function updateStats(name, won) {
  const rows = await q(
    `UPDATE medusa.players
     SET wins   = wins   + $2,
         losses = losses + $3,
         points = GREATEST(0, points + $4)
     WHERE name = $1
     RETURNING name, wins, losses, points`,
    [name, won ? 1 : 0, won ? 0 : 1, won ? 10 : -5],
  );
  return rows[0];
}

async function getLeaderboard() {
  return q(
    `SELECT name, wins, losses, points
     FROM medusa.players
     ORDER BY points DESC, wins DESC
     LIMIT 20`,
  );
}

// ─── Auth REST ────────────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  const { name, password } = req.body || {};
  if (!name || !password)
    return res.status(400).json({ error: 'Nome e senha são obrigatórios.' });

  const trimmed = name.trim().slice(0, 20);
  if (trimmed.length < 2)
    return res.status(400).json({ error: 'Nome deve ter ao menos 2 caracteres.' });
  if (password.length < 4)
    return res.status(400).json({ error: 'Senha deve ter ao menos 4 caracteres.' });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const rows = await q(
      `INSERT INTO medusa.players(name, password_hash)
       VALUES($1, $2)
       RETURNING name, wins, losses, points`,
      [trimmed, passwordHash],
    );
    const player = rows[0];
    const token = newToken();
    await q('INSERT INTO medusa.sessions(token, player_name) VALUES($1, $2)', [token, trimmed]);
    res.json({ token, player });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Nome já cadastrado. Escolha outro.' });
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { name, password } = req.body || {};
  if (!name || !password)
    return res.status(400).json({ error: 'Nome e senha são obrigatórios.' });

  try {
    const rows = await q(
      'SELECT name, password_hash, wins, losses, points FROM medusa.players WHERE name = $1',
      [name.trim()],
    );
    const player = rows[0];
    if (!player)
      return res.status(401).json({ error: 'Usuário não encontrado.' });

    const ok = await bcrypt.compare(password, player.password_hash);
    if (!ok)
      return res.status(401).json({ error: 'Senha incorreta.' });

    const token = newToken();
    await q('INSERT INTO medusa.sessions(token, player_name) VALUES($1, $2)', [token, player.name]);

    const { password_hash: _, ...safePlayer } = player;
    res.json({ token, player: safePlayer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.post('/auth/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    await q('DELETE FROM medusa.sessions WHERE token = $1', [token]).catch(() => {});
  }
  res.json({ ok: true });
});

app.get('/auth/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Token inválido.' });
  res.json(player);
});

// ─── Socket.io auth middleware ────────────────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const token  = socket.handshake.auth?.token;
    const player = await resolveToken(token);
    if (!player) return next(new Error('auth'));
    socket.data.name   = player.name;
    socket.data.player = player;
    next();
  } catch {
    next(new Error('auth'));
  }
});

// ─── Game constants ───────────────────────────────────────────────────────────
const CARDS      = ['SHIELD', 'VEIL', 'MEDUSA'];
const MAX_ENERGY = 12;
const TURN_MS    = 5000;
const REVEAL_MS  = 2500;

const BEATS = { SHIELD: 'MEDUSA', MEDUSA: 'VEIL', VEIL: 'SHIELD' };

function resolveCards(a, b) {
  if (a === b) return 'TIE';
  return BEATS[a] === b ? 'A' : 'B';
}
function randomCard() {
  return CARDS[Math.floor(Math.random() * CARDS.length)];
}

// ─── Game state (in-memory) ───────────────────────────────────────────────────
const queue      = [];
const games      = new Map();
const socketGame = new Map();

function startTurn(gameId) {
  const g = games.get(gameId);
  if (!g || g.ended) return;
  g.phase   = 'choosing';
  g.choices = {};
  io.to(gameId).emit('turn_start', { turnNumber: g.turnNumber, gameId });
  g.timer = setTimeout(() => {
    for (const pid of g.playerIds)
      if (!g.choices[pid]) g.choices[pid] = { card: randomCard(), auto: true };
    resolveRound(gameId);
  }, TURN_MS);
}

function resolveRound(gameId) {
  const g = games.get(gameId);
  if (!g || g.ended) return;
  clearTimeout(g.timer);
  g.phase = 'revealing';

  const [pidA, pidB] = g.playerIds;
  const cardA  = g.choices[pidA]?.card ?? randomCard();
  const cardB  = g.choices[pidB]?.card ?? randomCard();
  const result = resolveCards(cardA, cardB);

  let winnerId = null, loserId = null;
  if (result !== 'TIE') {
    winnerId = result === 'A' ? pidA : pidB;
    loserId  = result === 'A' ? pidB : pidA;
    g.energy[loserId] = Math.max(0, g.energy[loserId] - 1);
  }

  io.to(gameId).emit('round_result', {
    choices:    { [pidA]: cardA, [pidB]: cardB },
    result,
    winnerId,
    loserId,
    energies:   { ...g.energy },
    autoChoice: { [pidA]: !!(g.choices[pidA]?.auto), [pidB]: !!(g.choices[pidB]?.auto) },
  });

  if (loserId && g.energy[loserId] <= 0) {
    setTimeout(() => endGame(gameId, winnerId, loserId), 2000);
    return;
  }
  g.turnNumber++;
  setTimeout(() => startTurn(gameId), REVEAL_MS);
}

async function endGame(gameId, winnerId, loserId) {
  const g = games.get(gameId);
  if (!g || g.ended) return;
  g.ended = true;
  clearTimeout(g.timer);

  const winnerName = g.names[winnerId];
  const loserName  = g.names[loserId];

  const [winnerStats, loserStats] = await Promise.all([
    updateStats(winnerName, true),
    updateStats(loserName, false),
  ]);

  io.to(gameId).emit('game_over', {
    winnerId, loserId, winnerName, loserName,
    stats: { [winnerId]: winnerStats, [loserId]: loserStats },
  });

  setTimeout(() => {
    games.delete(gameId);
    for (const pid of g.playerIds) socketGame.delete(pid);
  }, 30_000);
}

// ─── Socket handlers ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const playerName = socket.data.name;
  console.log(`[+] ${playerName} (${socket.id})`);

  socket.on('join_queue', async () => {
    const player = await getPlayer(playerName);
    if (!player) { socket.emit('error_msg', { message: 'Jogador não encontrado.' }); return; }

    socket.data.player = player;

    const dup = queue.findIndex(s => s.id === socket.id);
    if (dup !== -1) queue.splice(dup, 1);

    if (queue.length > 0) {
      const opp    = queue.shift();
      const gameId = `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const pids   = [socket.id, opp.id];

      const g = {
        id: gameId, playerIds: pids,
        names:  { [socket.id]: playerName,  [opp.id]: opp.data.name },
        energy: { [socket.id]: MAX_ENERGY,  [opp.id]: MAX_ENERGY },
        phase: 'starting', choices: {}, turnNumber: 1, timer: null, ended: false,
      };
      games.set(gameId, g);
      socketGame.set(socket.id, gameId);
      socketGame.set(opp.id,    gameId);
      socket.join(gameId);
      opp.join(gameId);

      socket.emit('game_start', {
        gameId, myId: socket.id,
        myName: playerName,        opponentName: opp.data.name,
        myEnergy: MAX_ENERGY,      opponentEnergy: MAX_ENERGY,
        myStats: player,           opponentStats: opp.data.player,
      });
      opp.emit('game_start', {
        gameId, myId: opp.id,
        myName: opp.data.name,     opponentName: playerName,
        myEnergy: MAX_ENERGY,      opponentEnergy: MAX_ENERGY,
        myStats: opp.data.player,  opponentStats: player,
      });
      setTimeout(() => startTurn(gameId), 1500);
    } else {
      queue.push(socket);
      socket.emit('queue_joined', { position: queue.length });
    }
  });

  socket.on('leave_queue', () => {
    const i = queue.findIndex(s => s.id === socket.id);
    if (i !== -1) queue.splice(i, 1);
  });

  socket.on('make_choice', ({ card, gameId: clientGameId }) => {
    const gameId = clientGameId || socketGame.get(socket.id);
    const g = games.get(gameId);
    if (!g || g.phase !== 'choosing') return;
    if (!CARDS.includes(card))        return;
    if (g.choices[socket.id])         return;
    g.choices[socket.id] = { card, auto: false };
    socket.emit('choice_confirmed', { card });
    const [pidA, pidB] = g.playerIds;
    if (g.choices[pidA] && g.choices[pidB]) {
      clearTimeout(g.timer);
      resolveRound(gameId);
    }
  });

  socket.on('forfeit', () => {
    const gameId = socketGame.get(socket.id);
    const g = games.get(gameId);
    if (!g || g.ended) return;
    const oppId = g.playerIds.find(id => id !== socket.id);
    if (oppId) {
      io.to(oppId).emit('opponent_forfeited');
      endGame(gameId, oppId, socket.id);
    }
  });

  socket.on('get_leaderboard', async () => {
    socket.emit('leaderboard', await getLeaderboard());
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${playerName} (${socket.id})`);
    const qi = queue.findIndex(s => s.id === socket.id);
    if (qi !== -1) queue.splice(qi, 1);
    const gameId = socketGame.get(socket.id);
    if (gameId) {
      const g = games.get(gameId);
      if (g && !g.ended) {
        const oppId = g.playerIds.find(id => id !== socket.id);
        if (oppId) {
          io.to(oppId).emit('opponent_left');
          endGame(gameId, oppId, socket.id);
        }
      }
    }
  });
});

// ─── Misc endpoints ───────────────────────────────────────────────────────────
app.get('/health', (_, res) =>
  res.json({ ok: true, games: games.size, queue: queue.length }));

app.get('/games', (_, res) =>
  res.json([...games.keys()]));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`🐍 Medusa Arena · http://localhost:${PORT}`));
