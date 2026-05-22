const { q } = require('./db');

async function resolveToken(token) {
  if (!token) return null;
  const rows = await q(
    `SELECT p.name, p.wins, p.losses, p.points
     FROM medusa.sessions s
     JOIN medusa.players p ON p.name = s.player_name
     WHERE s.token = $1`,
    [token],
  );
  return rows[0] || null;
}

module.exports = { resolveToken };
