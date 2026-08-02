/**
 * Exécute un callback après le corps synchrone de l'effet
 * (évite react-hooks/set-state-in-effect sur les loaders).
 */
export function runAsyncEffect(fn: () => void | Promise<void>): () => void {
  let cancelled = false;
  queueMicrotask(() => {
    if (!cancelled) void fn();
  });
  return () => {
    cancelled = true;
  };
}
