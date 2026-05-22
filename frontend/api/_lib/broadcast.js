const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function broadcast(messages) {
  const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) console.error('Broadcast failed:', res.status, await res.text().catch(() => ''));
}

const toPlayer = (name, event, payload) =>
  ({ topic: `realtime:player:${name}`, event, payload });

const toGame = (gameId, event, payload) =>
  ({ topic: `realtime:game:${gameId}`, event, payload });

module.exports = { broadcast, toPlayer, toGame };
