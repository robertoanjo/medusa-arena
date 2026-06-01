const { db } = require('./_lib/supabase-admin');

function checkAdmin(req) {
  const secret = req.headers.authorization?.replace('Bearer ', '');
  return secret && secret === (process.env.ADMIN_SECRET || '').trim();
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

  // ── GET ?stats=1 — dados globais do dashboard ─────────────────────────────
  if (req.method === 'GET' && req.query.stats) {
    const now      = new Date();
    const todayISO = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekISO  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalPlayers },
      { count: totalGames },
      { data:  gamesData },
      { count: gamesToday },
      { count: gamesWeek },
      { count: newPlayersWeek },
      { count: activeSessions },
      { data:  topPlayers },
      { data:  recentGames },
    ] = await Promise.all([
      db.from('players').select('*', { count: 'exact', head: true }),
      db.from('games').select('*', { count: 'exact', head: true }).eq('ended', true),
      db.from('games').select('turn_number').eq('ended', true),
      db.from('games').select('*', { count: 'exact', head: true }).eq('ended', true).gte('created_at', todayISO),
      db.from('games').select('*', { count: 'exact', head: true }).eq('ended', true).gte('created_at', weekISO),
      db.from('players').select('*', { count: 'exact', head: true }).gte('created_at', weekISO),
      db.from('sessions').select('*', { count: 'exact', head: true }),
      db.from('players').select('name, wins, losses, points').order('points', { ascending: false }).limit(10),
      db.from('games')
        .select('id, player_a, player_b, winner_name, result, turn_number, created_at')
        .eq('ended', true)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const totalTurns = (gamesData || []).reduce((s, g) => s + (g.turn_number || 0), 0);
    const avgTurns   = totalGames > 0 ? Math.round(totalTurns / totalGames) : 0;

    return res.json({
      totalPlayers:   totalPlayers  || 0,
      totalGames:     totalGames    || 0,
      totalTurns,
      avgTurns,
      gamesToday:     gamesToday    || 0,
      gamesWeek:      gamesWeek     || 0,
      newPlayersWeek: newPlayersWeek || 0,
      activeSessions: activeSessions || 0,
      topPlayers:     topPlayers    || [],
      recentGames:    (recentGames  || []).map(g => ({
        id:         g.id,
        player_a:   g.player_a,
        player_b:   g.player_b,
        winner:     g.winner_name,
        forfeit:    g.result === 'forfeit',
        turns:      g.turn_number,
        created_at: g.created_at,
      })),
    });
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
