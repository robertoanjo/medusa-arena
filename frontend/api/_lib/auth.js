const { db } = require('./supabase-admin');

async function resolveToken(token) {
  if (!token) return null;
  const { data: session } = await db.from('sessions').select('player_name').eq('token', token).single();
  if (!session) return null;
  const { data: player } = await db
    .from('players')
    .select('name, real_name, email, email_verified, wins, losses, points')
    .eq('name', session.player_name)
    .single();
  if (!player) return null;
  return { token, ...player };
}

module.exports = { resolveToken };
