import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Player {
  name:           string;
  real_name:      string | null;
  email:          string | null;
  email_verified: boolean;
  wins:           number;
  losses:         number;
  points:         number;
  total_games:    number;
  created_at:     string;
}

interface HistoryGame {
  id:         string;
  opponent:   string;
  won:        boolean;
  forfeit:    boolean;
  turns:      number;
  created_at: string;
}

interface Achievement {
  id:    string;
  label: string;
  icon:  string;
  desc:  string;
}

// ── Conquistas ────────────────────────────────────────────────────────────────

function computeAchievements(p: Player): Achievement[] {
  const total = p.wins + p.losses;
  const ratio = total > 0 ? p.wins / total : 0;
  const earned: Achievement[] = [];

  if (p.wins >= 1)
    earned.push({ id: 'first_blood',  icon: '🩸', label: 'Primeira Sangue', desc: 'Conseguiu a primeira vitória' });
  if (p.wins >= 10)
    earned.push({ id: 'warrior',      icon: '⚔️',  label: 'Guerreiro',       desc: '10+ vitórias' });
  if (p.wins >= 50)
    earned.push({ id: 'legendary',    icon: '👑',  label: 'Lendário',        desc: '50+ vitórias' });
  if (p.wins >= 5 && p.losses === 0)
    earned.push({ id: 'undefeated',   icon: '🛡️',  label: 'Invicto',         desc: '5+ vitórias sem nenhuma derrota' });
  if (total >= 20)
    earned.push({ id: 'persistent',   icon: '🔥',  label: 'Persistente',     desc: '20+ partidas jogadas' });
  if (total >= 100)
    earned.push({ id: 'veteran',      icon: '🎖️',  label: 'Veterano',        desc: '100+ partidas jogadas' });
  if (total >= 10 && ratio > 0.7)
    earned.push({ id: 'dominator',    icon: '💥',  label: 'Dominador',       desc: '+70% de vitórias (mín. 10 jogos)' });
  if (p.points >= 500)
    earned.push({ id: 'scorer',       icon: '⚡',  label: 'Pontuador',       desc: '500+ pontos acumulados' });

  return earned;
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────

function Sparkline({ games }: { games: HistoryGame[] }) {
  if (games.length < 2) return <span style={{ color: '#604080', fontSize: 12 }}>Poucos dados</span>;

  const W = 200, H = 50, PAD = 4;
  let cur = 0;
  const points = games.map(g => { cur += g.won ? 10 : -5; return cur; });
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((v, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const lastY = Number(coords[coords.length - 1].split(',')[1]);
  const trend = points[points.length - 1] >= points[0];

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={trend ? '#50c050' : '#c05050'}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <circle
        cx={Number(coords[coords.length - 1].split(',')[0])}
        cy={lastY}
        r={3}
        fill={trend ? '#50c050' : '#c05050'}
      />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function adminH(secret: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [secret,   setSecret]   = useState(() => sessionStorage.getItem('medusa_admin') || '');
  const [authed,   setAuthed]   = useState(false);
  const [authErr,  setAuthErr]  = useState('');
  const [players,  setPlayers]  = useState<Player[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Player | null>(null);
  const [history,  setHistory]  = useState<HistoryGame[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [editVals, setEditVals] = useState({ wins: 0, losses: 0, points: 0 });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [actionMsg, setActionMsg]   = useState('');

  const fetchPlayers = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', { headers: adminH(s) });
      if (res.status === 401) { setAuthed(false); return; }
      setPlayers(await res.json());
    } finally { setLoading(false); }
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr('');
    const res = await fetch('/api/admin', { headers: adminH(secret) });
    if (res.status === 401) { setAuthErr('Senha incorreta.'); return; }
    sessionStorage.setItem('medusa_admin', secret);
    setPlayers(await res.json());
    setAuthed(true);
  };

  const selectPlayer = async (p: Player) => {
    setSelected(p);
    setEditing(false);
    setConfirmDel(false);
    setActionMsg('');
    setHistLoading(true);
    try {
      const res = await fetch(`/api/admin?history=1&name=${encodeURIComponent(p.name)}`, { headers: adminH(secret) });
      setHistory(await res.json());
    } finally { setHistLoading(false); }
  };

  const startEdit = () => {
    if (!selected) return;
    setEditVals({ wins: selected.wins, losses: selected.losses, points: selected.points });
    setEditing(true);
    setActionMsg('');
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method:  'PUT',
        headers: adminH(secret),
        body:    JSON.stringify({ name: selected.name, ...editVals }),
      });
      if (!res.ok) { const d = await res.json(); setActionMsg('Erro: ' + d.error); return; }
      const updated = { ...selected, ...editVals };
      setSelected(updated);
      setPlayers(prev => prev.map(p => p.name === updated.name ? updated : p));
      setEditing(false);
      setActionMsg('Salvo com sucesso.');
    } finally { setSaving(false); }
  };

  const deletePlayer = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin?name=${encodeURIComponent(selected.name)}`, {
        method:  'DELETE',
        headers: adminH(secret),
      });
      if (!res.ok) { const d = await res.json(); setActionMsg('Erro: ' + d.error); return; }
      setPlayers(prev => prev.filter(p => p.name !== selected.name));
      setSelected(null);
    } finally { setDeleting(false); setConfirmDel(false); }
  };

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.real_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Login screen ─────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <form onSubmit={login} style={{
        background: '#1a0a2e', border: '1px solid rgba(201,168,76,.2)',
        borderRadius: 12, padding: 32, width: 320, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <h2 style={{ color: '#d4af37', margin: 0, textAlign: 'center', fontSize: 18 }}>🐍 Admin — Medusa Arena</h2>
        <input
          className="join-input"
          type="password"
          placeholder="Senha de administrador"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          autoFocus
        />
        {authErr && <p style={{ color: '#c05050', margin: 0, fontSize: 13 }}>{authErr}</p>}
        <button className="btn-primary" type="submit" style={{ width: '100%' }}>Entrar</button>
      </form>
    </div>
  );

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: '#e0d0f0',
      fontFamily: 'inherit', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: '#1a0a2e', borderBottom: '1px solid rgba(201,168,76,.15)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <h1 style={{ color: '#d4af37', margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '.06em' }}>
          🐍 MEDUSA ARENA — DASHBOARD
        </h1>
        <span style={{ color: '#604080', fontSize: 13 }}>
          {players.length} jogador{players.length !== 1 ? 'es' : ''}
        </span>
        <div style={{ flex: 1 }} />
        <button
          className="auth-link"
          style={{ fontSize: 13 }}
          onClick={() => fetchPlayers(secret)}
        >↺ Atualizar</button>
        <button
          className="auth-link"
          style={{ fontSize: 13, color: '#c04040' }}
          onClick={() => { setAuthed(false); sessionStorage.removeItem('medusa_admin'); }}
        >Sair</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 53px)' }}>

        {/* ── Player list ── */}
        <div style={{
          width: 340, flexShrink: 0, borderRight: '1px solid rgba(201,168,76,.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(201,168,76,.08)' }}>
            <input
              className="join-input"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '7px 10px' }}
              placeholder="Buscar jogador…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <p style={{ color: '#604080', padding: 16, margin: 0, fontSize: 13 }}>Carregando…</p>}
            {filtered.map(p => {
              const achievements = computeAchievements(p);
              const isSelected = selected?.name === p.name;
              return (
                <div
                  key={p.name}
                  onClick={() => selectPlayer(p)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(201,168,76,.06)',
                    background: isSelected ? 'rgba(201,168,76,.08)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #d4af37' : '2px solid transparent',
                    transition: 'background .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: '#e8d8f8', fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                    <span style={{ color: '#d4af37', fontSize: 13, fontWeight: 700 }}>{p.points}pts</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 12, color: '#7050a0' }}>
                    <span>✓ {p.wins}</span>
                    <span>✗ {p.losses}</span>
                    <span>{p.total_games} partidas</span>
                    <span style={{ marginLeft: 'auto' }}>
                      {achievements.slice(0, 3).map(a => a.icon).join('')}
                      {achievements.length > 3 && <span style={{ fontSize: 10 }}> +{achievements.length - 3}</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selected ? (
            <div style={{ color: '#4a3060', fontSize: 14, marginTop: 60, textAlign: 'center' }}>
              Selecione um jogador para ver os detalhes
            </div>
          ) : (
            <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Player header ── */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h2 style={{ color: '#d4af37', margin: '0 0 4px', fontSize: 22 }}>{selected.name}</h2>
                  {selected.real_name && <p style={{ color: '#8060a0', margin: '0 0 2px', fontSize: 13 }}>{selected.real_name}</p>}
                  {selected.email && (
                    <p style={{ color: '#604080', margin: 0, fontSize: 12 }}>
                      {selected.email}
                      {selected.email_verified
                        ? <span style={{ color: '#50c050', marginLeft: 6 }}>✓</span>
                        : <span style={{ color: '#e08030', marginLeft: 6 }}>⚠ não verificado</span>}
                    </p>
                  )}
                  <p style={{ color: '#503070', margin: '4px 0 0', fontSize: 11 }}>
                    Cadastro: {fmt(selected.created_at)}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 13, padding: '7px 14px' }}
                    onClick={startEdit}
                  >✏️ Editar</button>
                  <button
                    onClick={() => { setConfirmDel(true); setEditing(false); setActionMsg(''); }}
                    style={{
                      background: 'rgba(139,0,0,.3)', border: '1px solid rgba(192,64,64,.4)',
                      color: '#e07070', borderRadius: 8, padding: '7px 14px',
                      cursor: 'pointer', fontSize: 13,
                    }}
                  >🗑️ Excluir</button>
                </div>
              </div>

              {actionMsg && (
                <p style={{ color: actionMsg.startsWith('Erro') ? '#c05050' : '#50c050', margin: 0, fontSize: 13 }}>
                  {actionMsg}
                </p>
              )}

              {/* ── Edit form ── */}
              {editing && (
                <div style={{
                  background: '#1a0a2e', border: '1px solid rgba(201,168,76,.2)',
                  borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <h3 style={{ color: '#c8a870', margin: 0, fontSize: 13, letterSpacing: '.06em' }}>EDITAR STATS</h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['wins', 'losses', 'points'] as const).map(field => (
                      <label key={field} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ color: '#7050a0', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          {field === 'wins' ? 'Vitórias' : field === 'losses' ? 'Derrotas' : 'Pontos'}
                        </span>
                        <input
                          className="join-input"
                          type="number"
                          min={0}
                          value={editVals[field]}
                          onChange={e => setEditVals(v => ({ ...v, [field]: Number(e.target.value) }))}
                          style={{ padding: '6px 10px', fontSize: 14 }}
                        />
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ flex: 1, fontSize: 13 }}
                      onClick={() => setEditing(false)}>Cancelar</button>
                    <button className="btn-primary" style={{ flex: 1, fontSize: 13 }}
                      onClick={saveEdit} disabled={saving}>
                      {saving ? '⌛ Salvando…' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Delete confirm ── */}
              {confirmDel && (
                <div style={{
                  background: 'rgba(192,64,64,.08)', border: '1px solid rgba(192,64,64,.35)',
                  borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <p style={{ color: '#e07070', fontWeight: 600, margin: 0 }}>
                    ⚠️ Confirmar exclusão de <strong>{selected.name}</strong>?
                  </p>
                  <p style={{ color: '#a07070', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    Isso remove o jogador, todas as sessões e da fila. Histórico de partidas é mantido (winner_name/loser_name ficam com o nome).
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ flex: 1, fontSize: 13 }}
                      onClick={() => setConfirmDel(false)}>Cancelar</button>
                    <button
                      onClick={deletePlayer}
                      disabled={deleting}
                      style={{
                        flex: 1, padding: '9px 14px', borderRadius: 8,
                        background: '#8b0000', color: '#ffd700', border: 'none',
                        cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      }}
                    >{deleting ? '⌛ Excluindo…' : '🗑️ Excluir'}</button>
                  </div>
                </div>
              )}

              {/* ── Stats cards ── */}
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  ['⚡', 'Pontos',    selected.points],
                  ['🏆', 'Vitórias',  selected.wins],
                  ['💀', 'Derrotas',  selected.losses],
                  ['🎮', 'Partidas',  selected.total_games],
                  ['📊', 'Win rate',  selected.total_games >= 5
                    ? Math.round((selected.wins / selected.total_games) * 100) + '%'
                    : '—'],
                ].map(([icon, label, val]) => (
                  <div key={String(label)} style={{
                    flex: 1, textAlign: 'center', background: '#1a0a2e',
                    padding: '10px 4px', borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 16 }}>{icon}</div>
                    <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 15 }}>{String(val)}</div>
                    <div style={{ color: '#604080', fontSize: 10, lineHeight: 1.2, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* ── Achievements ── */}
              <div>
                <h3 style={{ color: '#c8a870', margin: '0 0 10px', fontSize: 13, letterSpacing: '.06em' }}>CONQUISTAS</h3>
                {(() => {
                  const earned = computeAchievements(selected);
                  return earned.length === 0
                    ? <p style={{ color: '#503070', fontSize: 13, margin: 0 }}>Nenhuma conquista ainda.</p>
                    : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {earned.map(a => (
                          <div key={a.id} title={a.desc} style={{
                            background: '#2a0a3e', border: '1px solid rgba(201,168,76,.2)',
                            borderRadius: 8, padding: '7px 12px',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <span style={{ fontSize: 18 }}>{a.icon}</span>
                            <div>
                              <div style={{ color: '#d4af37', fontSize: 12, fontWeight: 700 }}>{a.label}</div>
                              <div style={{ color: '#604080', fontSize: 10 }}>{a.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                })()}
              </div>

              {/* ── Evolution chart ── */}
              <div>
                <h3 style={{ color: '#c8a870', margin: '0 0 10px', fontSize: 13, letterSpacing: '.06em' }}>
                  EVOLUÇÃO DE PONTOS (últimas partidas)
                </h3>
                {histLoading
                  ? <p style={{ color: '#604080', fontSize: 13, margin: 0 }}>Carregando…</p>
                  : (
                    <div style={{ background: '#1a0a2e', borderRadius: 8, padding: '12px 16px' }}>
                      <Sparkline games={history} />
                      <p style={{ color: '#503070', fontSize: 11, margin: '6px 0 0' }}>
                        Variação relativa (+10 vitória / -5 derrota) — {history.length} partidas
                      </p>
                    </div>
                  )
                }
              </div>

              {/* ── Game history table ── */}
              {!histLoading && history.length > 0 && (
                <div>
                  <h3 style={{ color: '#c8a870', margin: '0 0 10px', fontSize: 13, letterSpacing: '.06em' }}>
                    HISTÓRICO DE PARTIDAS
                  </h3>
                  <div style={{ background: '#1a0a2e', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(201,168,76,.1)' }}>
                          {['Data', 'Adversário', 'Resultado', 'Turnos', 'Pts'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', color: '#604080', fontWeight: 600, textAlign: 'left', fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...history].reverse().map((g, i) => (
                          <tr key={g.id} style={{ borderBottom: i < history.length - 1 ? '1px solid rgba(201,168,76,.05)' : 'none' }}>
                            <td style={{ padding: '7px 12px', color: '#503070' }}>{fmt(g.created_at)}</td>
                            <td style={{ padding: '7px 12px', color: '#c8b0e8' }}>{g.opponent}</td>
                            <td style={{ padding: '7px 12px' }}>
                              <span style={{
                                color: g.won ? '#50c050' : '#c05050',
                                fontWeight: 700, fontSize: 12,
                              }}>
                                {g.won ? '✓ Vitória' : '✗ Derrota'}
                                {g.forfeit && <span style={{ color: '#e08030', marginLeft: 4, fontSize: 10 }}>(desistência)</span>}
                              </span>
                            </td>
                            <td style={{ padding: '7px 12px', color: '#604080' }}>{g.turns}</td>
                            <td style={{ padding: '7px 12px', color: g.won ? '#50c050' : '#c05050', fontWeight: 700 }}>
                              {g.won ? '+10' : '-5'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
