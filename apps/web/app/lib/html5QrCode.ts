import type { Html5Qrcode } from "html5-qrcode";

const SCANNING = 2;
const PAUSED = 3;

function getScannerState(scanner: Html5Qrcode): number | null {
  try {
    return scanner.getState();
  } catch {
    return null;
  }
}

export function pauseScanner(scanner: Html5Qrcode | null) {
  if (!scanner || getScannerState(scanner) !== SCANNING) return;
  try {
    scanner.pause(true);
  } catch {
    /* scanner may have stopped during navigation */
  }
}

export function resumeScanner(scanner: Html5Qrcode | null) {
  if (!scanner || getScannerState(scanner) !== PAUSED) return;
  try {
    scanner.resume();
  } catch {
    /* scanner may have stopped during navigation */
  }
}

export async function stopAndClearScanner(scanner: Html5Qrcode | null | undefined) {
  if (!scanner) return;
  const state = getScannerState(scanner);
  try {
    if (state === SCANNING || state === PAUSED) await scanner.stop();
  } catch {
    /* stop() throws if start() never completed; clear what we can below */
  }
  try {
    scanner.clear();
  } catch {
    /* already cleared */
  }
}
