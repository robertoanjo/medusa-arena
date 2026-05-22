import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  CardType, Screen, GameState, PlayerStats,
  GameStartPayload, RoundResultPayload, GameOverPayload,
} from './types';
import AuthScreen   from './components/AuthScreen';
import HomeScreen   from './components/HomeScreen';
import WaitingScreen from './components/WaitingScreen';
import GameScreen   from './components/GameScreen';
import GameOver     from './components/GameOver';

const MAX_ENERGY   = 12;
const TURN_SECONDS = 5;

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
  const [authed,      setAuthed]      = useState(() => !!localStorage.getItem('medusa_token'));
  const [playerName,  setPlayerName]  = useState(() => localStorage.getItem('medusa_name') || '');

  // ── Game state ────────────────────────────────────────────────────────────────
  const [screen,       setScreen]       = useState<Screen>('home');
  const [gameState,    setGameState]    = useState<GameState | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [leaderboard,  setLeaderboard]  = useState<PlayerStats[]>([]);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_SECONDS);

  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerChanRef  = useRef<RealtimeChannel | null>(null);
  const gameChanRef    = useRef<RealtimeChannel | null>(null);
  const gameStateRef   = useRef<GameState | null>(null);
  gameStateRef.current = gameState;

  // ── Timer ─────────────────────────────────────────────────────────────────────
  const startTurnTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTurnTimeLeft(TURN_SECONDS);
    timerRef.current = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
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
      stopTimer();
      if (revealRef.current) clearTimeout(revealRef.current);

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

      // After reveal animation, start next turn
      revealRef.current = setTimeout(() => {
        setGameState(prev => prev ? {
          ...prev,
          phase: 'choosing', myChoice: null, opponentChoice: null,
          turnNumber: prev.turnNumber + 1,
          lastWinnerName: null, lastLoserName: null, isTie: false,
        } : prev);
        startTurnTimer();
      }, 2500);
    });

    chan.on('broadcast', { event: 'game_over' }, ({ payload }: { payload: GameOverPayload }) => {
      stopTimer();
      if (revealRef.current) clearTimeout(revealRef.current);
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
      stopTimer();
      if (revealRef.current) clearTimeout(revealRef.current);
      const gs = gameStateRef.current;
      if (!gs) return;
      setGameOverInfo({ won: true, myName: gs.myName, opponentName: gs.opponentName, myNewPoints: 0, pointsChange: 10 });
      setTimeout(() => setScreen('gameover'), 300);
    });

    chan.subscribe();
    gameChanRef.current = chan;

    setGameState(initialState);
    setScreen('playing');
    startTurnTimer();
  }, [startTurnTimer, stopTimer]);

  // ── Subscribe to player channel after login ────────────────────────────────────
  useEffect(() => {
    if (!authed || !playerName) return;

    fetchLeaderboard();

    if (playerChanRef.current) playerChanRef.current.unsubscribe();

    const chan = supabase.channel(`player:${playerName}`);

    chan.on('broadcast', { event: 'game_start' }, ({ payload }: { payload: GameStartPayload }) => {
      // Unsubscribe from player channel, move to game channel
      chan.unsubscribe();
      playerChanRef.current = null;

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

  // Cleanup on unmount
  useEffect(() => () => { stopTimer(); }, [stopTimer]);

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
    stopTimer();
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
    // If matched immediately (no one was in queue before us but server found someone atomically)
    if (data.status === 'matched' && data.game) {
      // game_start will also arrive via Realtime; guard against double-init with gameState check
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
    await apiFetch('/api/game/leave-queue', {});
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

  // Auto-submit random choice when timer hits 0
  useEffect(() => {
    if (turnTimeLeft !== 0 || screen !== 'playing') return;
    const gs = gameStateRef.current;
    if (!gs || gs.phase !== 'choosing' || gs.myChoice) return;
    const cards: CardType[] = ['SHIELD', 'VEIL', 'MEDUSA'];
    handleMakeChoice(cards[Math.floor(Math.random() * cards.length)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnTimeLeft, screen]);

  const handleForfeit = async () => {
    const gs = gameStateRef.current;
    if (!gs) return;
    await apiFetch('/api/game/forfeit', { gameId: gs.gameId });
    // game_over event comes via Realtime to both players
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
  if (!authed) return <AuthScreen onAuth={handleAuth} />;

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          playerName={playerName}
          leaderboard={leaderboard}
          onJoin={handleJoin}
          onLogout={handleLogout}
          onRefreshLeaderboard={fetchLeaderboard}
        />
      )}

      {screen === 'waiting' && (
        <WaitingScreen playerName={playerName} onCancel={handleCancelQueue} />
      )}

      {screen === 'playing' && gameState && (
        <GameScreen
          gameState={gameState}
          turnTimeLeft={turnTimeLeft}
          maxTurnTime={TURN_SECONDS}
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
