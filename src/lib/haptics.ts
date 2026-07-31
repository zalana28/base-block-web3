// Haptic feedback via Vibration API — otomatis silent jika device tidak support
export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

// Preset getaran berdasarkan intensitas event
export const haptic = {
  place:      () => vibrate(15),                       // block ditaruh — getaran halus
  clear:      () => vibrate([20, 40, 20]),             // line clear — pola pendek
  combo:      (n: number) => vibrate([30, 30, 30].slice(0, n)), // combo makin panjang
  gameOver:   () => vibrate([80, 50, 80, 50, 120]),    // game over — dramatis
  denied:     () => vibrate([30, 40, 30]),             // drop invalid — getaran tolak
  streakLost: () => vibrate([40, 20, 40]),             // streak putus
};
