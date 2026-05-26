const { db }           = require('../_lib/supabase-admin');
const { resolveToken } = require('../_lib/auth');
const { broadcast, toGame } = require('../_lib/broadcast');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  const { gameId } = req.body || {};
  if (!gameId) return res.status(400).json({ error: 'gameId obrigatório.' });

  const { data, error } = await db.rpc('fn_forfeit_game', {
    p_game_id:    gameId,
    p_player_name: player.name,
  });

  if (error) { console.error(error); return res.status(500).json({ error: 'Erro interno.' }); }
  if (!data) return res.json({ ok: true });

  // Mark game ended + forfeit so the polling fallback can distinguish forfeit from normal win
  const { error: updErr } = await db.from('games')
    .update({ ended: true, result: 'forfeit' })
    .eq('id', gameId);
  if (updErr) console.error('[forfeit] games update error:', updErr.message);

  await broadcast([
    toGame(gameId, 'game_over', {
      winnerName: data.winner_name,
      loserName:  data.loser_name,
      forfeit:    true,
      stats: {
        [data.winner_name]: data.winner_stats,
        [data.loser_name]:  data.loser_stats,
      },
    }),
  ]);

  res.json({ ok: true });
};
