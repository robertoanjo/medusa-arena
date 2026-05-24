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

  console.log('[make-choice] RPC result:', player.name, JSON.stringify(data));

  // First player to submit: choice recorded, waiting for opponent
  if (!data.resolved) return res.json({ confirmed: true, card });

  // Second player to submit: broadcast BEFORE responding so Vercel doesn't
  // kill the Lambda immediately after res.json() / res.end()
  const roundPayload = {
    choices:    { [data.player_a]: data.card_a, [data.player_b]: data.card_b },
    result:     data.result,
    winnerName: data.winner_name,
    loserName:  data.loser_name,
    energies:   { [data.player_a]: data.energy_a, [data.player_b]: data.energy_b },
  };
  const messages = [toGame(gameId, 'round_result', roundPayload)];
  console.log('[make-choice] broadcasting round_result to game:', gameId, 'game_over:', data.game_over);

  if (data.game_over) {
    // Mark game ended so the polling fallback never re-subscribes to a stale channel
    await db.from('games').update({ ended: true }).eq('id', gameId);

    const [{ data: wStats }, { data: lStats }] = await Promise.all([
      db.from('players').select('name,wins,losses,points').eq('name', data.winner_name).single(),
      db.from('players').select('name,wins,losses,points').eq('name', data.loser_name).single(),
    ]);
    messages.push(toGame(gameId, 'game_over', {
      winnerName: data.winner_name,
      loserName:  data.loser_name,
      stats: { [data.winner_name]: wStats, [data.loser_name]: lStats },
    }));
  }

  await broadcast(messages);
  console.log('[make-choice] broadcast done');
  res.json({ confirmed: true, card });
};
