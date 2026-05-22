import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from './socket';
import type {
  CardType,
  Screen,
  GameState,
  PlayerStats,
  GameStartData,
  RoundResultData,
  GameOverData,
} from './types';
import AuthScreen   from './components/AuthScreen';
import HomeScreen   from './components/HomeScreen';
import WaitingScreen from './components/WaitingScreen';
import GameScreen   from './components/GameScreen';
import GameOver     from './components/GameOver';

const MAX_ENERGY   = 12;
const TURN_SECONDS = 5;

interface GameOverInfo {
  won: boolean;
  myName: string;
  opponentName: string;
  myNewPoints: number;
  pointsChange: number;
}

export default function App() {
  // ── Auth state ──────────────────────────────────────────────
  const [authed, setAuthed] = useState(
    () => !!localStorage.getItem('medusa_token'),
  );
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('medusa_name') || '',
  );

  // ── Game state ──────────────────────────────────────────────
  const [screen,      setScreen]      = useState<Screen>('home');
  const [gameState,   setGameState]   = useState<GameState | null>(null);
  const [gameOverInfo,setGameOverInfo]= useState<GameOverInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [connected,   setConnected]   = useState(false);
  const [turnTimeLeft,setTurnTimeLeft]= useState(TURN_SECONDS);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  gameStateRef.current = gameState;

  // ── Timer helpers ────────────────────────────────────────────
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
  }, []);

  // ── Connect socket when authed ───────────────────────────────
  useEffect(() => {
    if (!authed) {
      socket.disconnect();
      return;
    }

    socket.connect();

    socket.on('connect',    () => { setConnected(true); socket.emit('get_leaderboard'); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      // auth rejected by server
      if (err.message === 'auth') {
        handleLogout();
      }
    });

    socket.on('queue_joined', () => setScreen('waiting'));

    socket.on('game_start', (data: GameStartData) => {
      const gs: GameState = {
        gameId: data.gameId, myId: data.myId,
        myName: data.myName, opponentName: data.opponentName,
        myEnergy: MAX_ENERGY, opponentEnergy: MAX_ENERGY,
        phase: 'choosing', myChoice: null, opponentChoice: null,
        turnNumber: 1, lastWinnerId: null, lastLoserId: null, isTie: false,
      };
      setGameState(gs);
      setScreen('playing');
    });

    socket.on('turn_start', (data: { turnNumber: number; gameId?: string }) => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          gameId: data.gameId ?? prev.gameId,
          phase: 'choosing', myChoice: null, opponentChoice: null,
          turnNumber: data.turnNumber,
          lastWinnerId: null, lastLoserId: null, isTie: false,
        };
      });
      startTurnTimer();
    });

    socket.on('choice_confirmed', ({ card }: { card: CardType }) => {
      setGameState(prev => prev ? { ...prev, myChoice: card } : prev);
    });

    socket.on('round_result', (data: RoundResultData) => {
      stopTimer();
      setGameState(prev => {
        if (!prev) return prev;
        const oppId = Object.keys(data.choices).find(id => id !== prev.myId);
        return {
          ...prev,
          phase: 'revealing',
          myChoice:       data.choices[prev.myId] ?? prev.myChoice,
          opponentChoice: oppId ? data.choices[oppId] : null,
          myEnergy:       data.energies[prev.myId]  ?? prev.myEnergy,
          opponentEnergy: oppId ? (data.energies[oppId] ?? prev.opponentEnergy) : prev.opponentEnergy,
          lastWinnerId: data.winnerId, lastLoserId: data.loserId,
          isTie: data.result === 'TIE',
        };
      });
    });

    socket.on('game_over', (data: GameOverData) => {
      stopTimer();
      setGameState(prev => {
        if (!prev) return prev;
        const won = data.winnerId === prev.myId;
        setGameOverInfo({
          won, myName: prev.myName,
          opponentName: won ? data.loserName : data.winnerName,
          myNewPoints:  data.stats[prev.myId]?.points ?? 0,
          pointsChange: won ? 10 : -5,
        });
        return prev;
      });
      setTimeout(() => setScreen('gameover'), 300);
    });

    const handleForfeitWin = () => {
      stopTimer();
      const prev = gameStateRef.current;
      if (prev) setGameOverInfo({ won: true, myName: prev.myName, opponentName: prev.opponentName, myNewPoints: 0, pointsChange: 10 });
      setTimeout(() => setScreen('gameover'), 300);
    };
    socket.on('opponent_forfeited', handleForfeitWin);
    socket.on('opponent_left',      handleForfeitWin);

    socket.on('leaderboard', (data: PlayerStats[]) => setLeaderboard(data));
    socket.on('error_msg',   (data: { message: string }) => alert(data.message));

    if (socket.connected) { setConnected(true); socket.emit('get_leaderboard'); }

    return () => {
      socket.off('connect'); socket.off('disconnect'); socket.off('connect_error');
      socket.off('queue_joined'); socket.off('game_start'); socket.off('turn_start');
      socket.off('choice_confirmed'); socket.off('round_result'); socket.off('game_over');
      socket.off('opponent_forfeited'); socket.off('opponent_left');
      socket.off('leaderboard'); socket.off('error_msg');
      stopTimer();
    };
  }, [authed, startTurnTimer, stopTimer]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleAuth = (_token: string, name: string) => {
    setPlayerName(name);
    setAuthed(true);
  };

  const SERVER_URL =
    import.meta.env.VITE_SERVER_URL ||
    (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

  const handleLogout = () => {
    const token = localStorage.getItem('medusa_token');
    if (token) fetch(`${SERVER_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    localStorage.removeItem('medusa_token');
    localStorage.removeItem('medusa_name');
    socket.disconnect();
    setAuthed(false);
    setScreen('home');
    setGameState(null);
    setGameOverInfo(null);
    setConnected(false);
  };

  const handleJoin = () => {
    socket.emit('join_queue');
  };

  const handleCancelQueue = () => {
    socket.emit('leave_queue');
    setScreen('home');
  };

  const handleMakeChoice = (card: CardType) => {
    if (!gameState || gameState.phase !== 'choosing' || gameState.myChoice) return;
    socket.emit('make_choice', { gameId: gameState.gameId, card });
  };

  const handleForfeit = () => {
    socket.emit('forfeit');
  };

  const handlePlayAgain = () => {
    socket.emit('get_leaderboard');
    setScreen('home');
    setGameState(null);
    setGameOverInfo(null);
  };

  // ── Render ───────────────────────────────────────────────────
  if (!authed) return <AuthScreen onAuth={handleAuth} />;

  return (
    <div className="app">
      {!connected && (
        <div className="connection-banner">
          <span>⚡ Conectando ao servidor...</span>
        </div>
      )}

      {screen === 'home' && (
        <HomeScreen
          playerName={playerName}
          leaderboard={leaderboard}
          onJoin={handleJoin}
          onLogout={handleLogout}
          onRefreshLeaderboard={() => socket.emit('get_leaderboard')}
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
