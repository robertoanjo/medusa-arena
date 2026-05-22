const { q }            = require('../_lib/db');
const { resolveToken } = require('../_lib/auth');
const { broadcast, toPlayer } = require('../_lib/broadcast');
const { MAX_ENERGY }   = require('../_lib/game');
const crypto           = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  const { name: playerName } = player;

  // Remove any stale entry for this player
  await q('DELETE FROM medusa.queue WHERE player_name = $1', [playerName]);

  // Atomically claim the oldest waiting opponent
  const [opp] = await q(`
    WITH claimed AS (
      SELECT player_name FROM medusa.queue
      WHERE player_name != $1
      ORDER BY joined_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM medusa.queue q
    USING claimed
    WHERE q.player_name = claimed.player_name
    RETURNING q.player_name
  `, [playerName]);

  if (!opp) {
    // No opponent — enter the queue
    await q(
      'INSERT INTO medusa.queue(player_name) VALUES($1) ON CONFLICT(player_name) DO UPDATE SET joined_at = NOW()',
      [playerName],
    );
    return res.json({ status: 'queued' });
  }

  // Match found — create game
  const gameId  = `g_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const oppName = opp.player_name; // was waiting longer → player_a

  await q(
    'INSERT INTO medusa.games(id, player_a, player_b) VALUES($1, $2, $3)',
    [gameId, oppName, playerName],
  );

  // Broadcast game_start to both players' personal channels
  await broadcast([
    toPlayer(oppName,    'game_start', { gameId, myName: oppName,    opponentName: playerName, myEnergy: MAX_ENERGY, opponentEnergy: MAX_ENERGY }),
    toPlayer(playerName, 'game_start', { gameId, myName: playerName, opponentName: oppName,    myEnergy: MAX_ENERGY, opponentEnergy: MAX_ENERGY }),
  ]);

  res.json({ status: 'matched', game: { gameId, myName: playerName, opponentName: oppName, myEnergy: MAX_ENERGY, opponentEnergy: MAX_ENERGY } });
};
