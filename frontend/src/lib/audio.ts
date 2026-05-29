import { Howl, Howler } from 'howler';

// Lazy-initialized sounds — criados só após a primeira interação do usuário
let _cardPlay: Howl | null = null;
let _hit:      Howl | null = null;
let _win:      Howl | null = null;
let _lose:     Howl | null = null;
let _theme:    Howl | null = null;
let _battle:   Howl | null = null;

// -12 dB → linear: 10^(-12/20) ≈ 0.25
const BATTLE_VOL = 0.25;

function cardPlay() {
  if (!_cardPlay) _cardPlay = new Howl({ src: ['/sounds/card-play.mp3'], volume: 0.7 });
  return _cardPlay;
}
function hit() {
  if (!_hit) _hit = new Howl({ src: ['/sounds/hit.mp3'], volume: 0.8 });
  return _hit;
}
function win() {
  if (!_win) _win = new Howl({ src: ['/sounds/win.mp3'], volume: 0.8 });
  return _win;
}
function lose() {
  // -12 dB → linear: 10^(-12/20) ≈ 0.25
  if (!_lose) _lose = new Howl({ src: ['/sounds/lose.mp3'], volume: 0.25 });
  return _lose;
}
function theme() {
  if (!_theme) _theme = new Howl({ src: ['/sounds/arena-theme.mp3'], loop: true, volume: 0.3 });
  return _theme;
}
function battle() {
  if (!_battle) _battle = new Howl({ src: ['/sounds/background-battle.mp3'], loop: true, volume: BATTLE_VOL });
  return _battle;
}

export const audio = {
  playCard:   () => cardPlay().play(),
  playHit:    () => hit().play(),
  playWin:    () => win().play(),
  playLose:   () => lose().play(),

  startTheme: () => {
    const t = theme();
    if (!t.playing()) t.play();
  },
  stopTheme: () => {
    if (_theme?.playing()) _theme.fade(0.3, 0, 800);
  },

  startBattle: () => {
    const b = battle();
    if (!b.playing()) b.play();
  },
  stopBattle: () => {
    if (_battle?.playing()) _battle.fade(BATTLE_VOL, 0, 1000);
  },

  mute:    () => Howler.mute(true),
  unmute:  () => Howler.mute(false),
  isMuted: () => (Howler as unknown as { _muted?: boolean })._muted === true,
};
