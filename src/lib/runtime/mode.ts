export function isMockMode(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_USE_REAL_API !== "1";
}

export function isRealApiMode(): boolean {
  return import.meta.env.VITE_USE_REAL_API === "1";
}
