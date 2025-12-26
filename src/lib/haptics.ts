/**
 * Haptic feedback utility for mobile devices
 */

export const triggerVibration = (pattern: number[] = [200, 100, 200]) => {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }
};

export const vibrateOnTurn = () => {
  triggerVibration([200, 100, 200]);
};

export const vibrateShort = () => {
  triggerVibration([100]);
};

export const vibrateLong = () => {
  triggerVibration([500]);
};
