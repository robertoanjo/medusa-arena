const { q }            = require('../_lib/db');
const { resolveToken } = require('../_lib/auth');
const { broadcast, toGame } = require('../_lib/broadcast');
const { CARDS, resolveCards } = require('../_lib/game');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  const { card, gameId } = req.body || {};
  if (!CARDS.includes(card)) return res.status(400).json({ error: 'Carta inválida.' });
  if (!gameId)               return res.status(400).json({ error: 'gameId obrigatório.' });

  const { name: playerName } = player;

  const [game] = await q(
    `SELECT * FROM medusa.games
     WHERE id = $1 AND (player_a = $2 OR player_b = $2) AND NOT ended AND phase = 'choosing'`,
    [gameId, playerName],
  );
  if (!game) return res.status(400).json({ error: 'Partida não encontrada.' });

  const isA      = game.player_a === playerName;
  const col      = isA ? 'pending_a' : 'pending_b';
  const otherCol = isA ? 'pending_b' : 'pending_a';

  // Already chose?
  if (game[col]) return res.json({ confirmed: true, card: game[col] });

  // Atomically record choice (fails if already set by concurrent request)
  const [updated] = await q(
    `UPDATE medusa.games
     SET ${col} = $1, updated_at = NOW()
     WHERE id = $2 AND ${col} IS NULL AND phase = 'choosing'
     RETURNING *`,
    [card, gameId],
  );
  if (!updated) return res.json({ confirmed: true, card });

  // Both players chose → resolve round
  if (updated[otherCol]) {
    await resolveRound(updated, res, card);
  } else {
    res.json({ confirmed: true, card });
  }
};

async function resolveRound(game, res, myCard) {
  const cardA  = game.pending_a;
  const cardB  = game.pending_b;
  const result = resolveCards(cardA, cardB);

  let winnerName = null, loserName = null;
  let energyA = game.energy_a, energyB = game.energy_b;

  if (result !== 'TIE') {
    winnerName = result === 'A' ? game.player_a : game.player_b;
    loserName  = result === 'A' ? game.player_b : game.player_a;
    if (result === 'A') energyB = Math.max(0, energyB - 1);
    else                energyA = Math.max(0, energyA - 1);
  }

  const loserEnergy = loserName === game.player_a ? energyA : energyB;
  const gameOver    = loserName !== null && loserEnergy <= 0;
  const nextTurn    = game.turn_number + 1;

  // Atomic transition — only one concurrent request wins
  const [resolved] = await q(
    `UPDATE medusa.games SET
       choice_a = pending_a, choice_b = pending_b,
       pending_a = NULL, pending_b = NULL,
       phase       = CASE WHEN $1 THEN 'ended'    ELSE 'choosing' END,
       energy_a    = $2, energy_b = $3,
       turn_number = CASE WHEN $1 THEN turn_number ELSE $4 END,
       winner_name = $5, loser_name = $6, result = $7,
       ended = $1, updated_at = NOW()
     WHERE id = $8 AND phase = 'choosing'
     RETURNING *`,
    [gameOver, energyA, energyB, nextTurn, winnerName, loserName, result, game.id],
  );

  if (!resolved) return res.json({ confirmed: true, card: myCard });

  const roundPayload = {
    choices:    { [game.player_a]: cardA, [game.player_b]: cardB },
    result,     winnerName, loserName,
    energies:   { [game.player_a]: energyA, [game.player_b]: energyB },
  };

  const messages = [toGame(game.id, 'round_result', roundPayload)];

  if (gameOver) {
    await Promise.all([
      q(`UPDATE medusa.players SET wins=wins+1,   points=GREATEST(0,points+10) WHERE name=$1`, [winnerName]),
      q(`UPDATE medusa.players SET losses=losses+1, points=GREATEST(0,points-5)  WHERE name=$1`, [loserName]),
    ]);
    const [wStats] = await q('SELECT name,wins,losses,points FROM medusa.players WHERE name=$1', [winnerName]);
    const [lStats] = await q('SELECT name,wins,losses,points FROM medusa.players WHERE name=$1', [loserName]);
    messages.push(toGame(game.id, 'game_over', { winnerName, loserName, stats: { [winnerName]: wStats, [loserName]: lStats } }));
  }

  await broadcast(messages);
  res.json({ confirmed: true, card: myCard });
}
