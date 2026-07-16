"use client";

type Listener = () => void;

interface VaultKeyState {
  vaultId: string | null;
  unlocked: boolean;
  locksAt: number | null;
}

let activeVaultKey: Uint8Array | null = null;
let activeVaultId: string | null = null;
let autoLockMilliseconds = 0;
let locksAt: number | null = null;
let autoLockTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();
let currentState: VaultKeyState = {
  vaultId: null,
  unlocked: false,
  locksAt: null,
};

function emit() {
  currentState = {
    vaultId: activeVaultId,
    unlocked: activeVaultKey !== null,
    locksAt,
  };
  for (const listener of listeners) listener();
}

function scheduleAutoLock() {
  if (!activeVaultKey || autoLockMilliseconds <= 0) return;
  if (autoLockTimer) clearTimeout(autoLockTimer);
  locksAt = Date.now() + autoLockMilliseconds;
  autoLockTimer = setTimeout(clearActiveVaultKey, autoLockMilliseconds);
}

export function setActiveVaultKey(
  vaultId: string,
  key: Uint8Array,
  autoLockMinutes: number,
) {
  clearActiveVaultKey();
  activeVaultKey = key.slice();
  activeVaultId = vaultId;
  autoLockMilliseconds = autoLockMinutes * 60_000;
  scheduleAutoLock();
  emit();
}

export function getActiveVaultKey(vaultId?: string) {
  if (vaultId && vaultId !== activeVaultId) return null;
  return activeVaultKey?.slice() ?? null;
}

export function touchVaultActivity() {
  if (!activeVaultKey) return;
  scheduleAutoLock();
  emit();
}

export function clearActiveVaultKey() {
  if (autoLockTimer) clearTimeout(autoLockTimer);
  autoLockTimer = null;
  activeVaultKey?.fill(0);
  activeVaultKey = null;
  activeVaultId = null;
  autoLockMilliseconds = 0;
  locksAt = null;
  emit();
}

export function subscribeToVaultKey(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVaultKeyState(): VaultKeyState {
  return currentState;
}

export const lockedVaultKeyState: VaultKeyState = {
  vaultId: null,
  unlocked: false,
  locksAt: null,
};
