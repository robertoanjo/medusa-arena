const { q }            = require('../_lib/db');
const { resolveToken } = require('../_lib/auth');
const { broadcast, toGame } = require('../_lib/broadcast');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  const { gameId } = req.body || {};
  if (!gameId) return res.status(400).json({ error: 'gameId obrigatório.' });

  const { name: playerName } = player;

  const [game] = await q(
    'SELECT * FROM medusa.games WHERE id=$1 AND (player_a=$2 OR player_b=$2) AND NOT ended',
    [gameId, playerName],
  );
  if (!game) return res.status(400).json({ error: 'Partida não encontrada.' });

  const winnerName = game.player_a === playerName ? game.player_b : game.player_a;
  const loserName  = playerName;

  const [resolved] = await q(
    `UPDATE medusa.games
     SET ended=TRUE, winner_name=$1, loser_name=$2, phase='ended', updated_at=NOW()
     WHERE id=$3 AND NOT ended RETURNING id`,
    [winnerName, loserName, gameId],
  );
  if (!resolved) return res.json({ ok: true });

  await Promise.all([
    q(`UPDATE medusa.players SET wins=wins+1,    points=GREATEST(0,points+10) WHERE name=$1`, [winnerName]),
    q(`UPDATE medusa.players SET losses=losses+1, points=GREATEST(0,points-5)  WHERE name=$1`, [loserName]),
  ]);

  const [wStats] = await q('SELECT name,wins,losses,points FROM medusa.players WHERE name=$1', [winnerName]);
  const [lStats] = await q('SELECT name,wins,losses,points FROM medusa.players WHERE name=$1', [loserName]);

  await broadcast([
    toGame(gameId, 'game_over', {
      winnerName, loserName, forfeit: true,
      stats: { [winnerName]: wStats, [loserName]: lStats },
    }),
  ]);

  res.json({ ok: true });
};
