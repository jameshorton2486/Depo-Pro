export type SiteRoute =
  | "home"
  | "features"
  | "pricing"
  | "checkout"
  | "help"
  | "privacy"
  | "terms"
  | "workspace";

const ROUTES: Readonly<Record<string, SiteRoute>> = {
  "/": "home",
  "/features": "features",
  "/pricing": "pricing",
  "/checkout": "checkout",
  "/help": "help",
  "/privacy": "privacy",
  "/terms": "terms",
  "/app": "workspace",
};

export function resolveSiteRoute(pathname: string): SiteRoute {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ROUTES[normalized] ?? "home";
}
