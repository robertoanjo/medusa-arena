const { db }           = require('../_lib/supabase-admin');
const { resolveToken } = require('../_lib/auth');
const { broadcast, toPlayer } = require('../_lib/broadcast');
const { MAX_ENERGY }   = require('../_lib/game');

module.exports = async function handler(req, res) {
  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  // ── GET: two modes depending on whether ?gameId= is provided ─────────────────
  if (req.method === 'GET') {
    const { gameId } = req.query;

    // ── Mode A: round-result status polling (gameId provided) ──────────────────
    // Used by the client while waiting for the opponent to choose a card.
    // Returns round outcome when server turn_number has advanced.
    if (gameId) {
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
        turnNumber:     game.turn_number,
        myChoice:       isA ? game.choice_a : game.choice_b,
        opponentChoice: isA ? game.choice_b : game.choice_a,
        myEnergy:       isA ? game.energy_a : game.energy_b,
        opponentEnergy: isA ? game.energy_b : game.energy_a,
        winnerName:     game.winner_name,
        loserName:      game.loser_name,
        result:         game.result,
        ended:          game.ended,
      };

      // Include updated points when game is over
      if (game.ended) {
        const { data: stats } = await db
          .from('players')
          .select('points')
          .eq('name', player.name)
          .single();
        body.myNewPoints = stats?.points ?? 0;
      }

      return res.json(body);
    }

    // ── Mode B: queue/match status polling (waiting screen fallback) ───────────
    // Use limit(1) + order so multiple active games (e.g. stale data) never error
    const { data: games } = await db
      .from('games')
      .select('id, player_a, player_b, energy_a, energy_b, phase, turn_number')
      .or(`player_a.eq.${player.name},player_b.eq.${player.name}`)
      .eq('ended', false)
      .order('created_at', { ascending: false })
      .limit(1);

    const game = games?.[0] ?? null;

    if (game) {
      const isA = game.player_a === player.name;
      return res.json({
        status:        'in_game',
        gameId:        game.id,
        myName:        player.name,
        opponentName:  isA ? game.player_b : game.player_a,
        myEnergy:      isA ? game.energy_a : game.energy_b,
        opponentEnergy: isA ? game.energy_b : game.energy_a,
        phase:         game.phase,
        turnNumber:    game.turn_number,
      });
    }

    return res.json({ status: 'waiting' });
  }

  // ── DELETE: leave queue ──────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    await db.from('queue').delete().eq('player_name', player.name);
    return res.json({ ok: true });
  }

  // ── POST: join queue ─────────────────────────────────────────────────────────
  if (req.method !== 'POST') return res.status(405).end();

  const { data, error } = await db.rpc('fn_join_queue', { p_name: player.name });
  if (error) { console.error(error); return res.status(500).json({ error: 'Erro interno.' }); }

  if (data.status === 'queued') return res.json({ status: 'queued' });

  const { game_id: gameId, my_name: myName, opponent_name: oppName } = data;

  await broadcast([
    toPlayer(oppName, 'game_start', { gameId, myName: oppName,  opponentName: myName, myEnergy: MAX_ENERGY, opponentEnergy: MAX_ENERGY }),
    toPlayer(myName,  'game_start', { gameId, myName,            opponentName: oppName, myEnergy: MAX_ENERGY, opponentEnergy: MAX_ENERGY }),
  ]);

  res.json({ status: 'matched', game: { gameId, myName, opponentName: oppName, myEnergy: MAX_ENERGY, opponentEnergy: MAX_ENERGY } });
};
