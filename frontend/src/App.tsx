import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  CardType, Screen, GameState, GamePhase, PlayerStats,
  GameStartPayload, RoundResultPayload, GameOverPayload,
} from './types';
import AuthScreen        from './components/AuthScreen';
import HomeScreen        from './components/HomeScreen';
import WaitingScreen     from './components/WaitingScreen';
import GameScreen        from './components/GameScreen';
import GameOver          from './components/GameOver';
import ProfileScreen       from './components/ProfileScreen';
import VerifyEmailScreen   from './components/VerifyEmailScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';

const MAX_ENERGY = 12;

interface GameOverInfo {
  won:          boolean;
  myName:       string;
  opponentName: string;
  myNewPoints:  number;
  pointsChange: number;
}

function authHeaders(): HeadersInit {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${localStorage.getItem('medusa_token') || ''}`,
  };
}

export default function App() {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const [authed,           setAuthed]           = useState(() => !!localStorage.getItem('medusa_token'));
  const [playerName,       setPlayerName]       = useState(() => localStorage.getItem('medusa_name') || '');
  const [emailVerifiedMsg, setEmailVerifiedMsg] = useState('');
  const [resetToken,       setResetToken]       = useState<string | null>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('reset');
  });

  // ── Game state ────────────────────────────────────────────────────────────────
  const [screen,       setScreen]       = useState<Screen>('home');
  const [gameState,    setGameState]    = useState<GameState | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [leaderboard,  setLeaderboard]  = useState<PlayerStats[]>([]);

  const revealRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerChanRef  = useRef<RealtimeChannel | null>(null);
  const gameChanRef    = useRef<RealtimeChannel | null>(null);
  const gameStateRef   = useRef<GameState | null>(null);
  gameStateRef.current = gameState;

  // ── Password reset via URL param ─────────────────────────────────────────────
  useEffect(() => {
    if (resetToken) window.history.replaceState({}, '', '/');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Email verification via URL param ─────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vToken = params.get('verify');
    if (!vToken) return;
    window.history.replaceState({}, '', '/');
    const isAuthed = !!localStorage.getItem('medusa_token');
    fetch('/api/auth/verify-email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: vToken }),
    })
      .then(r => {
        if (!r.ok) return;
        if (isAuthed) setScreen(s => s === 'verify-email' ? 'home' : s);
        else          setEmailVerifiedMsg('E-mail verificado! Faça login para entrar na arena.');
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Clear any in-flight reveal animation ──────────────────────────────────────
  const clearReveal = useCallback(() => {
    if (revealRef.current) clearTimeout(revealRef.current);
  }, []);

  // ── Fetch helpers ─────────────────────────────────────────────────────────────
  const apiFetch = useCallback(async (path: string, body?: object) => {
    const res = await fetch(path, {
      method:  body !== undefined ? 'POST' : 'GET',
      headers: authHeaders(),
      body:    body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res;
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const res = await apiFetch('/api/leaderboard');
    if (res.ok) setLeaderboard(await res.json());
  }, [apiFetch]);

  // ── Subscribe to game channel ─────────────────────────────────────────────────
  const subscribeToGame = useCallback((gameId: string, initialState: GameState) => {
    if (gameChanRef.current) gameChanRef.current.unsubscribe();

    const chan = supabase.channel(`game:${gameId}`);

    chan.on('broadcast', { event: 'round_result' }, ({ payload }: { payload: RoundResultPayload }) => {
      clearReveal();

      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          phase:          'revealing',
          myChoice:       (payload.choices[prev.myName]       as CardType) ?? prev.myChoice,
          opponentChoice: (payload.choices[prev.opponentName] as CardType) ?? null,
          myEnergy:       payload.energies[prev.myName]       ?? prev.myEnergy,
          opponentEnergy: payload.energies[prev.opponentName] ?? prev.opponentEnergy,
          lastWinnerName: payload.winnerName,
          lastLoserName:  payload.loserName,
          isTie:          payload.winnerName === null,
        };
      });

      // After reveal animation, reset for next turn
      revealRef.current = setTimeout(() => {
        setGameState(prev => prev ? {
          ...prev,
          phase: 'choosing', myChoice: null, opponentChoice: null,
          turnNumber: prev.turnNumber + 1,
          lastWinnerName: null, lastLoserName: null, isTie: false,
        } : prev);
      }, 2500);
    });

    chan.on('broadcast', { event: 'game_over' }, ({ payload }: { payload: GameOverPayload }) => {
      clearReveal();
      const gs = gameStateRef.current;
      if (!gs) return;
      const won = payload.winnerName === gs.myName;
      setGameOverInfo({
        won, myName: gs.myName,
        opponentName:  won ? payload.loserName : payload.winnerName,
        myNewPoints:   payload.stats[gs.myName]?.points ?? 0,
        pointsChange:  won ? 10 : -5,
      });
      setTimeout(() => setScreen('gameover'), 300);
    });

    chan.on('broadcast', { event: 'opponent_forfeited' }, () => {
      clearReveal();
      const gs = gameStateRef.current;
      if (!gs) return;
      setGameOverInfo({ won: true, myName: gs.myName, opponentName: gs.opponentName, myNewPoints: 0, pointsChange: 10 });
      setTimeout(() => setScreen('gameover'), 300);
    });

    chan.subscribe();
    gameChanRef.current = chan;

    setGameState(initialState);
    setScreen('playing');
  }, [clearReveal]);

  // ── Subscribe to player channel after login ────────────────────────────────────
  useEffect(() => {
    if (!authed || !playerName) return;

    fetchLeaderboard();

    if (playerChanRef.current) playerChanRef.current.unsubscribe();

    const chan = supabase.channel(`player:${playerName}`);

    chan.on('broadcast', { event: 'game_start' }, ({ payload }: { payload: GameStartPayload }) => {
      chan.unsubscribe();
      playerChanRef.current = null;

      // Guard: if the game was already started by the API response (matched player),
      // don't re-init — a second subscribeToGame call would cancel the existing game
      // channel and lose any in-flight round_result events.
      if (gameStateRef.current) return;

      const gs: GameState = {
        gameId:         payload.gameId,
        myName:         payload.myName,
        opponentName:   payload.opponentName,
        myEnergy:       MAX_ENERGY,
        opponentEnergy: MAX_ENERGY,
        phase:          'choosing',
        myChoice:       null,
        opponentChoice: null,
        turnNumber:     1,
        lastWinnerName: null,
        lastLoserName:  null,
        isTie:          false,
      };
      subscribeToGame(payload.gameId, gs);
    });

    chan.subscribe();
    playerChanRef.current = chan;

    return () => {
      chan.unsubscribe();
      playerChanRef.current = null;
    };
  }, [authed, playerName, fetchLeaderboard, subscribeToGame]);

  // ── Polling fallback while waiting for a match ───────────────────────────────
  // Catches game_start broadcasts that arrive before the Realtime WS is ready.
  useEffect(() => {
    if (screen !== 'waiting') return;
    const poll = async () => {
      if (gameStateRef.current) return;
      try {
        const res = await fetch('/api/game/join-queue', { headers: authHeaders() });
        if (!res.ok) return;
        const d = await res.json();
        if (d.status === 'in_game' && !gameStateRef.current) {
          const gs: GameState = {
            gameId:         d.gameId,
            myName:         d.myName,
            opponentName:   d.opponentName,
            myEnergy:       d.myEnergy,
            opponentEnergy: d.opponentEnergy,
            phase:          d.phase as GamePhase,
            myChoice:       null,
            opponentChoice: null,
            turnNumber:     d.turnNumber,
            lastWinnerName: null,
            lastLoserName:  null,
            isTie:          false,
          };
          subscribeToGame(d.gameId, gs);
        }
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [screen, subscribeToGame]);

  // Cleanup on unmount
  useEffect(() => () => { clearReveal(); }, [clearReveal]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleAuth = (_token: string, name: string) => {
    setPlayerName(name);
    setAuthed(true);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('medusa_token');
    if (token) fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
    localStorage.removeItem('medusa_token');
    localStorage.removeItem('medusa_name');
    playerChanRef.current?.unsubscribe();
    gameChanRef.current?.unsubscribe();
    playerChanRef.current = null;
    gameChanRef.current   = null;
    clearReveal();
    setAuthed(false);
    setScreen('home');
    setGameState(null);
    setGameOverInfo(null);
  };

  const handleJoin = async () => {
    setScreen('waiting');
    const res = await apiFetch('/api/game/join-queue', {});
    if (!res.ok) { setScreen('home'); return; }
    const data = await res.json();
    // Matched immediately: both players were in queue atomically
    if (data.status === 'matched' && data.game) {
      if (!gameStateRef.current) {
        const gs: GameState = {
          gameId:         data.game.gameId,
          myName:         data.game.myName,
          opponentName:   data.game.opponentName,
          myEnergy:       MAX_ENERGY,
          opponentEnergy: MAX_ENERGY,
          phase:          'choosing',
          myChoice:       null, opponentChoice: null,
          turnNumber:     1,
          lastWinnerName: null, lastLoserName: null, isTie: false,
        };
        subscribeToGame(data.game.gameId, gs);
      }
    }
    // If 'queued': stay on waiting screen, game_start arrives via player channel
  };

  const handleCancelQueue = async () => {
    await fetch('/api/game/join-queue', { method: 'DELETE', headers: authHeaders() });
    setScreen('home');
  };

  const handleMakeChoice = async (card: CardType) => {
    const gs = gameStateRef.current;
    if (!gs || gs.phase !== 'choosing' || gs.myChoice) return;
    setGameState(prev => prev ? { ...prev, myChoice: card } : prev);
    const res = await apiFetch('/api/game/make-choice', { card, gameId: gs.gameId });
    if (!res.ok) {
      setGameState(prev => prev ? { ...prev, myChoice: null } : prev);
    }
  };

  const handleForfeit = async () => {
    const gs = gameStateRef.current;
    if (!gs) return;
    clearReveal();
    const res = await apiFetch('/api/game/forfeit', { gameId: gs.gameId });
    if (res.ok) {
      gameChanRef.current?.unsubscribe();
      gameChanRef.current = null;
      setGameOverInfo({
        won:          false,
        myName:       gs.myName,
        opponentName: gs.opponentName,
        myNewPoints:  0,
        pointsChange: -5,
      });
      setGameState(null);
      setScreen('gameover');
    }
  };

  const handlePlayAgain = () => {
    gameChanRef.current?.unsubscribe();
    gameChanRef.current = null;

    // Re-subscribe to player channel
    if (playerName) {
      const chan = supabase.channel(`player:${playerName}`);
      chan.on('broadcast', { event: 'game_start' }, ({ payload }: { payload: GameStartPayload }) => {
        chan.unsubscribe();
        playerChanRef.current = null;
        if (gameStateRef.current) return;
        const gs: GameState = {
          gameId: payload.gameId, myName: payload.myName, opponentName: payload.opponentName,
          myEnergy: MAX_ENERGY, opponentEnergy: MAX_ENERGY,
          phase: 'choosing', myChoice: null, opponentChoice: null,
          turnNumber: 1, lastWinnerName: null, lastLoserName: null, isTie: false,
        };
        subscribeToGame(payload.gameId, gs);
      });
      chan.subscribe();
      playerChanRef.current = chan;
    }

    fetchLeaderboard();
    setScreen('home');
    setGameState(null);
    setGameOverInfo(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (resetToken) return (
    <ResetPasswordScreen
      token={resetToken}
      onDone={(msg) => { setResetToken(null); setEmailVerifiedMsg(msg); }}
    />
  );

  if (!authed) return <AuthScreen onAuth={handleAuth} verifiedMsg={emailVerifiedMsg} />;

  if (screen === 'profile') return (
    <ProfileScreen
      token={localStorage.getItem('medusa_token') || ''}
      onBack={() => setScreen('home')}
      onLogout={handleLogout}
    />
  );

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          playerName={playerName}
          leaderboard={leaderboard}
          onJoin={handleJoin}
          onLogout={handleLogout}
          onProfile={() => setScreen('profile')}
          onRefreshLeaderboard={fetchLeaderboard}
        />
      )}

      {screen === 'waiting' && (
        <WaitingScreen playerName={playerName} onCancel={handleCancelQueue} />
      )}

      {screen === 'playing' && gameState && (
        <GameScreen
          gameState={gameState}
          onMakeChoice={handleMakeChoice}
          onForfeit={handleForfeit}
        />
      )}

      {screen === 'gameover' && gameOverInfo && (
        <GameOver info={gameOverInfo} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  );
}
