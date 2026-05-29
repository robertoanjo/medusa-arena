const { db } = require('./_lib/supabase-admin');

function checkAdmin(req) {
  const secret = req.headers.authorization?.replace('Bearer ', '');
  return secret && secret === process.env.ADMIN_SECRET;
}

module.exports = async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Não autorizado.' });

  // ── GET ?history=1&name=X — histórico de partidas do jogador ───────────────
  if (req.method === 'GET' && req.query.history) {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'name obrigatório.' });

    const { data } = await db
      .from('games')
      .select('id, player_a, player_b, winner_name, loser_name, result, turn_number, created_at')
      .or(`player_a.eq.${name},player_b.eq.${name}`)
      .eq('ended', true)
      .order('created_at', { ascending: true })
      .limit(60);

    const games = (data || []).map(g => ({
      id:         g.id,
      opponent:   g.player_a === name ? g.player_b : g.player_a,
      won:        g.winner_name === name,
      forfeit:    g.result === 'forfeit',
      turns:      g.turn_number,
      created_at: g.created_at,
    }));

    return res.json(games);
  }

  // ── GET — lista todos os jogadores ─────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: players } = await db
      .from('players')
      .select('name, real_name, email, email_verified, wins, losses, points, created_at')
      .order('points', { ascending: false });

    if (!players) return res.json([]);

    const { data: gameCounts } = await db
      .from('games')
      .select('player_a, player_b')
      .eq('ended', true);

    const counts = {};
    (gameCounts || []).forEach(g => {
      counts[g.player_a] = (counts[g.player_a] || 0) + 1;
      counts[g.player_b] = (counts[g.player_b] || 0) + 1;
    });

    return res.json(players.map(p => ({ ...p, total_games: counts[p.name] || 0 })));
  }

  // ── PUT — edita wins, losses, points ───────────────────────────────────────
  if (req.method === 'PUT') {
    const { name, wins, losses, points } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name obrigatório.' });

    const update = {};
    if (wins    !== undefined) update.wins    = Number(wins);
    if (losses  !== undefined) update.losses  = Number(losses);
    if (points  !== undefined) update.points  = Number(points);

    const { error } = await db.from('players').update(update).eq('name', name);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  // ── DELETE — remove jogador ────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'name obrigatório.' });

    await db.from('sessions').delete().eq('player_name', name);
    await db.from('queue').delete().eq('player_name', name);
    const { error } = await db.from('players').delete().eq('name', name);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).end();
};
