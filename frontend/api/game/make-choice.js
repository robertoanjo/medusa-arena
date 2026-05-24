const { db }           = require('../_lib/supabase-admin');
const { resolveToken } = require('../_lib/auth');
const { broadcast, toGame } = require('../_lib/broadcast');
const { CARDS }        = require('../_lib/game');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  const { card, gameId } = req.body || {};
  if (!CARDS.includes(card)) return res.status(400).json({ error: 'Carta inválida.' });
  if (!gameId)               return res.status(400).json({ error: 'gameId obrigatório.' });

  // ── Record the choice and resolve if both players have chosen ─────────────────
  const { data, error } = await db.rpc('fn_record_choice', {
    p_game_id:     gameId,
    p_player_name: player.name,
    p_card:        card,
  });

  if (error) { console.error('[make-choice] RPC error:', JSON.stringify(error)); return res.status(500).json({ error: 'Erro interno.' }); }
  if (!data)  { console.error('[make-choice] RPC returned null for', player.name, gameId); return res.status(400).json({ error: 'Partida não encontrada.' }); }

  // Unwrap if PostgREST returned an array instead of a plain object
  const row = Array.isArray(data) ? data[0] : data;
  console.log('[make-choice]', player.name, 'resolved:', row?.resolved, 'isArray:', Array.isArray(data), 'gameId:', gameId);

  // First player to submit: choice recorded, waiting for opponent
  if (!row.resolved) return res.json({ confirmed: true, card });

  // Second player to submit: broadcast BEFORE responding so Vercel doesn't
  // kill the Lambda immediately after res.json() / res.end()
  const roundPayload = {
    choices:    { [row.player_a]: row.card_a, [row.player_b]: row.card_b },
    result:     row.result,
    winnerName: row.winner_name,
    loserName:  row.loser_name,
    energies:   { [row.player_a]: row.energy_a, [row.player_b]: row.energy_b },
  };
  const messages = [toGame(gameId, 'round_result', roundPayload)];
  console.log('[make-choice] broadcasting round_result to game:', gameId, 'game_over:', row.game_over);

  if (row.game_over) {
    // Mark game ended so the polling fallback never re-subscribes to a stale channel
    await db.from('games').update({ ended: true }).eq('id', gameId);

    const [{ data: wStats }, { data: lStats }] = await Promise.all([
      db.from('players').select('name,wins,losses,points').eq('name', row.winner_name).single(),
      db.from('players').select('name,wins,losses,points').eq('name', row.loser_name).single(),
    ]);
    messages.push(toGame(gameId, 'game_over', {
      winnerName: row.winner_name,
      loserName:  row.loser_name,
      stats: { [row.winner_name]: wStats, [row.loser_name]: lStats },
    }));
  }

  await broadcast(messages);
  console.log('[make-choice] broadcast done');
  res.json({ confirmed: true, card });
};
