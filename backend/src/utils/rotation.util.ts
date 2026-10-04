const SIX_HOURS_MS = 6 * 3600 * 1000;
const VN_TIMEZONE_OFFSET_MS = 7 * 3600 * 1000;

export interface RotationInfo {
  slot: number;
  rotatesAt: Date;
  secondsRemaining: number;
}

export function calculateRotation(nowMs: number = Date.now()): RotationInfo {
  const vnNow = nowMs + VN_TIMEZONE_OFFSET_MS;
  const slot = Math.floor(vnNow / SIX_HOURS_MS);

  const nextSlotVnMs = (slot + 1) * SIX_HOURS_MS;
  const rotatesAt = new Date(nextSlotVnMs - VN_TIMEZONE_OFFSET_MS);
  const secondsRemaining = Math.max(1, Math.floor((rotatesAt.getTime() - nowMs) / 1000));

  return { slot, rotatesAt, secondsRemaining };
}
