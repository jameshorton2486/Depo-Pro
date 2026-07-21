# Console and Edge Log Audit

## Result

Repository source audit completed on 2026-07-18. No source logging of signed URLs, Authorization headers, bearer tokens, Deepgram keys, Anthropic keys, or case payloads remains in the reviewed application and transcript Edge Function paths.

The remaining logs are operational warnings/errors. They use operation names, route names, counts, or sanitized messages; they must not be expanded to include case IDs, search terms, transcript IDs, request bodies, response bodies, or raw error objects.

## Guardrail

For TypeScript changes, reject `console.log`, `console.debug`, and `console.info`. `console.warn` and `console.error` may only include non-sensitive operational metadata. Do not rely on a production bundler to strip logging.

## Deployment verification

Run the same scan against `src` and `supabase/functions` after staging deployment. Review remote Edge Function logs separately because source inspection cannot prove that an older deployed function has been replaced.