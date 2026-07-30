"use client";

import * as React from "react";

/**
 * Hook de debounce — retarde la valeur jusqu'à ce que l'utilisateur arrête de taper.
 * @param value La valeur à debouncer
 * @param delay Délai en ms (défaut : 300ms)
 * @returns La valeur debouncée
 *
 * @example
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebounce(search, 300);
 * // Utiliser debouncedSearch pour filtrer / fetch
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
