"""
pipeline/transcriber.py

Sends audio chunks to Deepgram and returns structured word/segment data.

KEY PARAMETERS:
  utt_split   — silence duration (seconds) to finalize one utterance.
                Default 0.9 s for speaker turn separation.
                User-configurable in the UI.
  filler_words=True  — preserves "uh"/"um" for the verbatim legal record.
  dictation=False    — prevents spoken words being treated as format commands.
  profanity_filter=False — verbatim legal record cannot be sanitized.
"""

import os
import time
import traceback
from typing import Any, Dict, List
from urllib.parse import urlencode

import httpx

from app_logging import get_logger
from config import (
    DEEPGRAM_CHUNK_SIZE_LIMIT_MB,
    DEEPGRAM_CONNECTION_TIMEOUT,
    DEEPGRAM_READ_TIMEOUT,
    DEEPGRAM_WRITE_TIMEOUT,
    TARGET_SAMPLE_RATE,
)
from .preprocessor import get_audio_info

logger = get_logger(__name__)

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 10


def get_deepgram_client():
    """Return or initialize the Deepgram SDK client."""
    try:
        from deepgram import DeepgramClient
    except ImportError as exc:
        raise ImportError(
            "deepgram-sdk is not installed. Run: pip install deepgram-sdk"
        ) from exc

    api_key = os.getenv("DEEPGRAM_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "DEEPGRAM_API_KEY is not set. Add it to your .env file."
        )
    try:
        from deepgram import DeepgramClientOptions  # type: ignore

        client_config = DeepgramClientOptions(
            api_key=api_key,
            options={
                "timeout_connection": DEEPGRAM_CONNECTION_TIMEOUT,
                "timeout_read": DEEPGRAM_READ_TIMEOUT,
                "timeout_write": DEEPGRAM_WRITE_TIMEOUT,
            },
        )
        return DeepgramClient(api_key, config=client_config)
    except Exception:
        return DeepgramClient(
            api_key=api_key,
            timeout=DEEPGRAM_READ_TIMEOUT,
        )


def build_transcription_options(
    keyterms: List[str] = None,
    model: str = "nova-3",
    utt_split: float = 0.9,
):
    """
    Build Deepgram transcription options with all legal accuracy settings.

    NOTE:
      - Nova-3 uses direct HTTP in this app and receives repeated `keyterm`
        query parameters there.
      - Earlier SDK-based models (ex: Nova-2) use `keywords`.
    """
    opts: Dict[str, Any] = dict(
        model=model,
        sample_rate=TARGET_SAMPLE_RATE,
        encoding="linear16",
        utt_split=utt_split,
        smart_format=True,
        punctuate=True,
        paragraphs=True,
        dictation=False,
        numerals=True,
        diarize=True,
        utterances=True,
        filler_words=True,
        profanity_filter=False,
        language="en",
        detect_language=False,
    )
    if keyterms and not _is_nova3_model(model):
        opts["keywords"] = keyterms

    return opts


def _is_nova3_model(model: str) -> bool:
    return bool(model and "nova-3" in model.lower())


def _response_to_dict(response: Any) -> Dict[str, Any]:
    if hasattr(response, "to_dict"):
        return response.to_dict()
    if hasattr(response, "model_dump"):
        return response.model_dump()
    if isinstance(response, dict):
        return response
    return {"repr": repr(response)}


def _build_direct_query_params(
    keyterms: List[str] = None,
    model: str = "nova-3",
    utt_split: float = 0.9,
):
    params: list[tuple[str, str]] = [
        ("model", model),
        ("sample_rate", str(TARGET_SAMPLE_RATE)),
        ("encoding", "linear16"),
        ("utt_split", str(utt_split)),
        ("smart_format", "true"),
        ("punctuate", "true"),
        ("paragraphs", "true"),
        ("dictation", "false"),
        ("numerals", "true"),
        ("diarize", "true"),
        ("utterances", "true"),
        ("filler_words", "true"),
        ("profanity_filter", "false"),
        ("language", "en"),
        ("detect_language", "false"),
    ]

    # URL-length safety guard: Deepgram returns 400 if the query string is
    # too long or contains invalid characters (e.g. @ in email addresses).
    # Hard-filter keyterms here as a second line of defence, then enforce a
    # total query-string budget of 3,500 characters.
    from urllib.parse import quote

    QUERY_BUDGET = 3500
    base_len = sum(len(k) + len(str(v)) + 2 for k, v in params)  # rough estimate
    remaining = QUERY_BUDGET - base_len

    for term in keyterms or []:
        cleaned = (term or "").strip()
        if not cleaned:
            continue
        if "@" in cleaned:
            logger.warning("Keyterm rejected (contains @): %r", cleaned)
            continue
        encoded_len = len(quote(cleaned, safe="")) + len("&keyterm=")
        if remaining - encoded_len < 0:
            logger.warning(
                "Keyterm list truncated at URL budget (%s chars). "
                "Dropped term: %r",
                QUERY_BUDGET,
                cleaned,
            )
            break
        params.append(("keyterm", cleaned))
        remaining -= encoded_len
    return params


def _transcribe_nova3_direct(
    audio_file_path: str,
    keyterms: List[str] = None,
    model: str = "nova-3",
    utt_split: float = 0.9,
    timeout: httpx.Timeout | None = None,
) -> Dict[str, Any]:
    api_key = os.getenv("DEEPGRAM_API_KEY", "").strip()
    if not api_key:
        raise ValueError("DEEPGRAM_API_KEY is not set. Add it to your .env file.")

    params = _build_direct_query_params(keyterms, model=model, utt_split=utt_split)
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "audio/wav",
    }
    url = "https://api.deepgram.com/v1/listen"

    with open(audio_file_path, "rb") as f:
        buffer_data = f.read()

    logger.info(
        "Deepgram direct Nova-3 request query=%s",
        urlencode(params, doseq=True),
    )

    with httpx.Client(timeout=timeout) as client:
        response = client.post(url, params=params, headers=headers, content=buffer_data)
        response.raise_for_status()
        raw = response.json()

    channel = (
        raw.get("results", {})
        .get("channels", [{}])[0]
    )
    alternative = channel.get("alternatives", [{}])[0]

    words = []
    for w in alternative.get("words") or []:
        words.append({
            "word": w.get("word", ""),
            "start": w.get("start"),
            "end": w.get("end"),
            "confidence": w.get("confidence"),
            "speaker": w.get("speaker"),
            "punctuated_word": w.get("punctuated_word", w.get("word", "")),
        })

    utterances = []
    for u in raw.get("results", {}).get("utterances") or []:
        utterances.append({
            "speaker": u.get("speaker"),
            "start": u.get("start"),
            "end": u.get("end"),
            "transcript": u.get("transcript", ""),
            "confidence": u.get("confidence"),
            "words": [
                {
                    "word": w.get("word", ""),
                    "start": w.get("start"),
                    "end": w.get("end"),
                    "confidence": w.get("confidence"),
                    "speaker": w.get("speaker"),
                }
                for w in (u.get("words") or [])
            ],
        })

    return {
        "words": words,
        "utterances": utterances,
        "transcript": alternative.get("transcript", "") or "",
        "raw": raw,
    }


def transcribe_chunk(
    audio_file_path: str,
    keyterms: List[str] = None,
    model: str = "nova-3",
    utt_split: float = 0.9,
    progress_callback=None,
) -> Dict[str, Any]:
    """
    Send one audio chunk to Deepgram and return structured result.

    Returns:
        {
            "words":      list of word objects with timestamps/confidence,
            "utterances": list of utterance objects (speaker-grouped turns),
            "transcript": full plain-text string,
            "raw":        complete Deepgram response dict,
        }

    Raises:
        RuntimeError on API error or network failure.
    """
    timeout = httpx.Timeout(
        timeout=DEEPGRAM_READ_TIMEOUT,
        connect=DEEPGRAM_CONNECTION_TIMEOUT,
        read=DEEPGRAM_READ_TIMEOUT,
        write=DEEPGRAM_WRITE_TIMEOUT,
    )
    chunk_name = os.path.basename(audio_file_path)
    chunk_size_bytes = os.path.getsize(audio_file_path)
    chunk_size_mb = chunk_size_bytes / (1024 * 1024)
    audio_info = get_audio_info(audio_file_path)
    format_info = audio_info.get("format", {})
    use_direct_nova3 = _is_nova3_model(model)
    client = None if use_direct_nova3 else get_deepgram_client()
    options = None if use_direct_nova3 else build_transcription_options(keyterms, model=model, utt_split=utt_split)
    options_dict = (
        _build_direct_query_params(keyterms, model=model, utt_split=utt_split)
        if use_direct_nova3
        else dict(options)
    )
    timeout_config = {
        "connect": DEEPGRAM_CONNECTION_TIMEOUT,
        "read": DEEPGRAM_READ_TIMEOUT,
        "write": DEEPGRAM_WRITE_TIMEOUT,
    }

    if progress_callback:
        progress_callback(f"Sending to Deepgram: {chunk_name}")

    logger.info(
        "Deepgram transcription starting chunk=%s path=%s size_mb=%.1f duration_seconds=%s model=%s timeout=%s",
        chunk_name,
        audio_file_path,
        chunk_size_mb,
        format_info.get("duration", "unknown"),
        model,
        timeout_config,
    )
    logger.info("Deepgram request options chunk=%s options=%s", chunk_name, options_dict)

    if chunk_size_mb > DEEPGRAM_CHUNK_SIZE_LIMIT_MB:
        logger.warning(
            "Chunk may exceed safe upload limits chunk=%s size_mb=%.1f limit_mb=%s",
            chunk_name,
            chunk_size_mb,
            DEEPGRAM_CHUNK_SIZE_LIMIT_MB,
        )

    try:
        with open(audio_file_path, "rb") as f:
            buffer_data = f.read()

        payload = {"buffer": buffer_data}
        logger.info(
            "Deepgram payload prepared chunk=%s bytes=%s file_exists=%s",
            chunk_name,
            len(buffer_data),
            os.path.exists(audio_file_path),
        )

        last_exc = None
        for attempt in range(1, MAX_RETRIES + 1):
            logger.info("Attempt %s of %s for chunk %s", attempt, MAX_RETRIES, chunk_name)
            upload_started_at = time.time()
            logger.info(
                "Deepgram upload started_at=%s chunk=%s",
                time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(upload_started_at)),
                chunk_name,
            )
            try:
                if use_direct_nova3:
                    result_payload = _transcribe_nova3_direct(
                        audio_file_path,
                        keyterms=keyterms,
                        model=model,
                        utt_split=utt_split,
                        timeout=timeout,
                    )
                else:
                    if hasattr(client.listen.v1, "media"):
                        response = client.listen.v1.media.transcribe_file(
                            request=buffer_data,
                            **options,
                            request_options={
                                "timeout_in_seconds": DEEPGRAM_READ_TIMEOUT,
                                "max_retries": 0,
                            },
                        )
                    else:
                        from deepgram import PrerecordedOptions  # type: ignore

                        legacy_options = PrerecordedOptions(**options)
                        response = client.listen.prerecorded.v("1").transcribe_file(
                            payload,
                            legacy_options,
                            timeout=timeout,
                        )
                    result = response.results.channels[0].alternatives[0]

                    words = []
                    for w in result.words or []:
                        words.append({
                            "word":            w.word,
                            "start":           w.start,
                            "end":             w.end,
                            "confidence":      w.confidence,
                            "speaker":         getattr(w, "speaker", None),
                            "punctuated_word": getattr(w, "punctuated_word", w.word),
                        })

                    utterances = []
                    if response.results.utterances:
                        for u in response.results.utterances:
                            utterances.append({
                                "speaker":    u.speaker,
                                "start":      u.start,
                                "end":        u.end,
                                "transcript": u.transcript,
                                "confidence": u.confidence,
                                "words": [
                                    {
                                        "word":       w.word,
                                        "start":      w.start,
                                        "end":        w.end,
                                        "confidence": w.confidence,
                                        "speaker":    getattr(w, "speaker", None),
                                    }
                                    for w in (u.words or [])
                                ],
                            })

                    result_payload = {
                        "words": words,
                        "utterances": utterances,
                        "transcript": result.transcript or "",
                        "raw": _response_to_dict(response),
                    }
                elapsed = time.time() - upload_started_at
                words = result_payload["words"]
                utterances = result_payload["utterances"]
                transcript_text = result_payload["transcript"]
                logger.info(
                    "Deepgram response received chunk=%s elapsed_seconds=%.2f words=%s utterances=%s transcript_empty=%s",
                    chunk_name,
                    elapsed,
                    len(words),
                    len(utterances),
                    not bool(transcript_text.strip()),
                )
                print(f"[DEEPGRAM] Done - {len(words)} words")

                if progress_callback:
                    progress_callback(
                        f"Deepgram returned {len(words)} words, {len(utterances)} utterances"
                    )

                return result_payload
            except Exception as exc:
                last_exc = exc
                elapsed = time.time() - upload_started_at
                chunk_exists = os.path.exists(audio_file_path)
                current_size_mb = (
                    os.path.getsize(audio_file_path) / (1024 * 1024)
                    if chunk_exists else 0.0
                )
                logger.error(
                    "Deepgram attempt failed chunk=%s attempt=%s/%s exception_type=%s elapsed_seconds=%.2f size_mb=%.1f file_exists=%s error=%s",
                    chunk_name,
                    attempt,
                    MAX_RETRIES,
                    type(exc).__name__,
                    elapsed,
                    current_size_mb,
                    chunk_exists,
                    exc,
                )
                logger.error(
                    "Deepgram traceback chunk=%s attempt=%s/%s\n%s",
                    chunk_name,
                    attempt,
                    MAX_RETRIES,
                    traceback.format_exc(),
                )
                is_timeout = isinstance(exc, httpx.TimeoutException) or "timed out" in str(exc).lower()
                if attempt < MAX_RETRIES and is_timeout:
                    logger.warning(
                        "Timeout during Deepgram upload chunk=%s attempt=%s/%s retrying_in_seconds=%s error=%s",
                        chunk_name,
                        attempt,
                        MAX_RETRIES,
                        RETRY_DELAY_SECONDS,
                        exc,
                    )
                    time.sleep(RETRY_DELAY_SECONDS)
                    continue
                break

        logger.error(
            "All %s attempts failed for chunk %s last_error_type=%s last_error=%s",
            MAX_RETRIES,
            chunk_name,
            type(last_exc).__name__ if last_exc else "UnknownError",
            last_exc,
        )
        raise last_exc if last_exc is not None else RuntimeError("Deepgram transcription failed without exception")

    except Exception as exc:
        print(f"[DEEPGRAM] ERROR: {exc}")
        logger.error(
            "Deepgram transcription failed chunk=%s exception_type=%s traceback=\n%s",
            chunk_name,
            type(exc).__name__,
            traceback.format_exc(),
        )
        raise RuntimeError(f"Deepgram transcription failed: {exc}") from exc
