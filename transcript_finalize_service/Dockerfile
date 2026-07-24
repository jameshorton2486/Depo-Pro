FROM denoland/deno:debian-2.9.3

ENV DENO_DIR=./.deno_cache \
    PORT=8080

WORKDIR /app

COPY src ./src
COPY supabase/functions/_shared ./supabase/functions/_shared
COPY transcript_finalize_service ./transcript_finalize_service

RUN deno cache --sloppy-imports transcript_finalize_service/main.ts

EXPOSE 8080

CMD ["run", "--sloppy-imports", "--allow-env", "--allow-net", "--allow-read", "--cached-only", "transcript_finalize_service/main.ts"]
