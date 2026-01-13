# Security Notes

## npm audit

As of January 2026, moderate vulnerabilities exist in dev-only tooling (vitest → vite → esbuild).

**Impact:** These affect the local development server only and do not impact production builds or runtime security.

**Decision:** Upgrade deferred to a planned tooling upgrade.

**Details:**
- 6 moderate severity vulnerabilities in development dependencies
- Primary chain: vitest → vite → esbuild <=0.24.2
- Advisory: https://github.com/advisories/GHSA-67mh-4wv8-2f99
- Issue: esbuild enables any website to send requests to dev server (local development only)

**Mitigation:**
- Production builds use Next.js bundler, not affected
- Development servers should only be accessed on localhost
- No external exposure in production deployments

**Next Steps:**
- Monitor for stable vitest/vite updates
- Upgrade when breaking changes are acceptable
- Re-audit after major dependency updates
