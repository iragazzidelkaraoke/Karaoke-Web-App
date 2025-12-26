// Shared logic for "prenotazioni a blocchi"
//
// Expected Realtime DB node:
// config: {
//   maxPrenotazioni: number,
//   branoCorrente: number,
//   annullaLimite: number,
//   blocks: {
//     enabled: boolean,
//     blockSize: number,
//     blockCount: number,
//     unlockAhead: number,
//     currentCap: number,
//     modeAfterLast: "MAX"
//   }
// }

import { runTransaction, update } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  const safe = Number.isFinite(n) ? n : fallback;
  return Math.min(Math.max(safe, min), max);
}

export function normalizeBlocks(config) {
  const totalMax = clampInt(config?.maxPrenotazioni, 25, 1, 999999);
  const raw = config?.blocks || {};

  const enabled = !!raw.enabled;
  const blockSize = clampInt(raw.blockSize, 10, 1, 999999);
  const blockCount = clampInt(raw.blockCount, 3, 1, 999999);
  const unlockAhead = clampInt(raw.unlockAhead, 2, 0, 999999);
  const blocksTotal = blockSize * blockCount;

  const defaultCap = Math.min(blockSize, totalMax);
  const currentCap = clampInt(raw.currentCap, defaultCap, 1, totalMax);

  return {
    enabled,
    blockSize,
    blockCount,
    unlockAhead,
    currentCap,
    totalMax,
    blocksTotal,
    modeAfterLast: raw.modeAfterLast || "MAX",
    manualOverride: !!raw.manualOverride,
  };
}

export function getEffectiveCap(config) {
  const s = normalizeBlocks(config);
  return s.enabled ? Math.min(s.currentCap, s.totalMax) : s.totalMax;
}

export function getUnlockThreshold(config) {
  const s = normalizeBlocks(config);
  if (!s.enabled) return null;
  return s.currentCap - s.unlockAhead;
}

export function getSongsRemainingToUnlock(config) {
  const s = normalizeBlocks(config);
  if (!s.enabled) return 0;

  const branoCorrente = clampInt(config?.branoCorrente, 0, 0, 999999);
  const threshold = s.currentCap - s.unlockAhead;
  return Math.max(0, threshold - branoCorrente);
}

export function countValidReservations(raw) {
  if (!raw) return 0;
  const arr = Array.isArray(raw) ? raw : Object.values(raw || {});
  return arr.filter(r => r && r.name && r.song).length;
}

export function isUserAlreadyReserved(rawReservations, userName) {
  if (!userName) return false;
  const arr = Array.isArray(rawReservations) ? rawReservations : Object.values(rawReservations || {});
  return arr.some(r => r && r.name === userName);
}

// Transactional auto-unlock.
// It unlocks as many blocks as needed to "catch up" if branoCorrente is already past multiple thresholds.
export async function tryAutoUnlock(configRef) {
  return runTransaction(configRef, (cfg) => {
    if (!cfg) return cfg;

    const totalMax = clampInt(cfg.maxPrenotazioni, 25, 1, 999999);
    const branoCorrente = clampInt(cfg.branoCorrente, 0, 0, 999999);
    const blocks = cfg.blocks || {};

    if (!blocks.enabled) return cfg;
    if (blocks.manualOverride) return cfg;

    const blockSize = clampInt(blocks.blockSize, 10, 1, 999999);
    const unlockAhead = clampInt(blocks.unlockAhead, 2, 0, 999999);
    let currentCap = clampInt(blocks.currentCap, Math.min(blockSize, totalMax), 1, totalMax);

    // Unlock forward while we're at/after the threshold.
    // Example: currentCap=10 unlockAhead=2 => threshold=8
    // if branoCorrente is already 18, we should unlock twice (10->20->30 ...)
    let changed = false;
    while (currentCap < totalMax && branoCorrente >= (currentCap - unlockAhead)) {
      const next = currentCap + blockSize;
      const clamped = Math.min(next, totalMax);
      if (clamped === currentCap) break;
      currentCap = clamped;
      changed = true;
    }

    if (!changed) return cfg;

    cfg.blocks = {
      ...blocks,
      currentCap,
      modeAfterLast: blocks.modeAfterLast || "MAX",
    };
    return cfg;
  });
}

// Transactional sync of currentCap based on branoCorrente.
// This is bidirectional: it can unlock forward and also "re-lock" if branoCorrente goes back.
// Rule:
// - Blocks unlock when branoCorrente >= (currentCap - unlockAhead)
// - Therefore the active cap level can be derived from (branoCorrente + unlockAhead)
// Example (blockSize=10, unlockAhead=2):
//  branoCorrente 0..7  -> cap 10
//  branoCorrente 8..17 -> cap 20
//  branoCorrente 18..  -> cap 30 ...
export async function syncBlocksCapToBranoCorrente(configRef) {
  return runTransaction(configRef, (cfg) => {
    if (!cfg) return cfg;

    const totalMax = clampInt(cfg.maxPrenotazioni, 25, 1, 999999);
    const branoCorrente = clampInt(cfg.branoCorrente, 0, 0, 999999);
    const blocks = cfg.blocks || {};
    if (!blocks.enabled) return cfg;
    if (blocks.manualOverride) return cfg;

    const blockSize = clampInt(blocks.blockSize, 10, 1, 999999);
    const blockCount = clampInt(blocks.blockCount, 3, 1, 999999);
    const unlockAhead = clampInt(blocks.unlockAhead, 2, 0, 999999);

    // Compute level from song index (bidirectional)
    const level = Math.min(
      blockCount,
      Math.max(1, 1 + Math.floor((branoCorrente + unlockAhead) / blockSize))
    );
    const desiredCap = Math.min(level * blockSize, totalMax);

    const currentCap = clampInt(blocks.currentCap, Math.min(blockSize, totalMax), 1, totalMax);
    if (desiredCap === currentCap) return cfg;

    cfg.blocks = {
      ...blocks,
      currentCap: desiredCap,
      modeAfterLast: blocks.modeAfterLast || "MAX",
    };
    return cfg;
  });
}

// Manual helpers (editor)
export async function openNextBlockNow(configRef) {
  return runTransaction(configRef, (cfg) => {
    if (!cfg) return cfg;
    const totalMax = clampInt(cfg.maxPrenotazioni, 25, 1, 999999);
    const blocks = cfg.blocks || {};
    const blockSize = clampInt(blocks.blockSize, 10, 1, 999999);
    let currentCap = clampInt(blocks.currentCap, Math.min(blockSize, totalMax), 1, totalMax);

    currentCap = Math.min(currentCap + blockSize, totalMax);

    cfg.blocks = {
      ...blocks,
      enabled: true,
      currentCap,
      modeAfterLast: blocks.modeAfterLast || "MAX",
      manualOverride: true,
    };
    return cfg;
  });
}

export async function resetBlocks(configRef, { blockSize, totalMax }) {
  const cap = Math.min(Math.max(1, Number.parseInt(blockSize || 10, 10)), totalMax);
  return update(configRef, {
    "blocks/currentCap": cap,
    "blocks/manualOverride": false,
  });
}
