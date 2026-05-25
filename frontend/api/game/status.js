const { db }           = require('../_lib/supabase-admin');
const { resolveToken } = require('../_lib/auth');

/**
 * GET /api/game/status?gameId=xxx
 *
 * Polling fallback for round results.
 * Returns the current game state so the client can detect when both players
 * have submitted their choices and the round has resolved.
 *
 * A round is resolved when the server's turn_number has advanced past what
 * the client last saw — at that point choice_a/choice_b hold the played cards.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  const { gameId } = req.query;
  if (!gameId) return res.status(400).json({ error: 'gameId obrigatório.' });

  const { data: game, error } = await db
    .from('games')
    .select('id, player_a, player_b, choice_a, choice_b, result, winner_name, loser_name, energy_a, energy_b, turn_number, ended')
    .eq('id', gameId)
    .single();

  if (error || !game) return res.status(404).json({ error: 'Partida não encontrada.' });

  if (game.player_a !== player.name && game.player_b !== player.name)
    return res.status(403).json({ error: 'Acesso negado.' });

  const isA = game.player_a === player.name;

  const body = {
    turnNumber:    game.turn_number,
    myChoice:      isA ? game.choice_a : game.choice_b,
    opponentChoice: isA ? game.choice_b : game.choice_a,
    myEnergy:      isA ? game.energy_a : game.energy_b,
    opponentEnergy: isA ? game.energy_b : game.energy_a,
    winnerName:    game.winner_name,
    loserName:     game.loser_name,
    result:        game.result,
    ended:         game.ended,
  };

  // When the game is over, include the player's updated point total
  if (game.ended) {
    const { data: stats } = await db
      .from('players')
      .select('points')
      .eq('name', player.name)
      .single();
    body.myNewPoints = stats?.points ?? 0;
  }

  res.json(body);
};
