/** In-memory viewed set. Nothing is written to localStorage. */

const listeners = new Set();
const closeListeners = new Set();

export const viewedIds = new Set();

export function viewedCount() {
  return viewedIds.size;
}

export function isViewed(id) {
  return Boolean(id && viewedIds.has(id));
}

export function markViewed(id) {
  if (!id || viewedIds.has(id)) return viewedIds.size;
  viewedIds.add(id);
  const count = viewedIds.size;
  listeners.forEach((listener) => listener(count, id));
  return count;
}

export function onViewedChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitProfileClose() {
  closeListeners.forEach((listener) => listener());
}

export function onProfileClose(listener) {
  closeListeners.add(listener);
  return () => closeListeners.delete(listener);
}
