#!/usr/bin/env python3
"""
Depo-Pro Manual Audio Enhancement Script

Pre-processes poor-quality deposition audio before uploading to Depo-Pro.
Use this when the automated pipeline scores audio as POOR or UNUSABLE,
or when the transcript has an unacceptably high flagged word rate (>30%).

Dependencies:
    pip install pydub noisereduce scipy numpy

System requirement:
    FFmpeg must be installed and available on PATH.
    Windows: winget install ffmpeg
    Mac:     brew install ffmpeg

Usage:
    python scripts/audio/enhance.py input.mp3 output.wav
    python scripts/audio/enhance.py input.mp3 output.wav --aggressive
    python scripts/audio/enhance.py input.mp3 output.wav --profile noise.wav
    python scripts/audio/enhance.py input.mp3 output.wav --analyze

After running, upload the output .wav file to Depo-Pro instead of the original.
"""

import argparse
import os
import sys
import subprocess
import tempfile

def check_dependencies():
    """Verify required Python packages and FFmpeg are available."""
    missing = []
    try:
        import pydub  # noqa: F401
    except ImportError:
        missing.append("pydub")
    try:
        import noisereduce  # noqa: F401
    except ImportError:
        missing.append("noisereduce")
    try:
        import scipy  # noqa: F401
    except ImportError:
        missing.append("scipy")
    try:
        import numpy  # noqa: F401
    except ImportError:
        missing.append("numpy")

    if missing:
        print(f"ERROR: Missing Python packages: {', '.join(missing)}")
        print(f"Install with: pip install {' '.join(missing)}")
        sys.exit(1)

    # Check FFmpeg
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("ERROR: FFmpeg not found on PATH.")
        print("Install with: winget install ffmpeg (Windows) or brew install ffmpeg (Mac)")
        sys.exit(1)


def analyze_audio(input_path):
    """Analyze audio file and print quality report."""
    from pydub import AudioSegment

    audio = AudioSegment.from_file(input_path)
    duration_s = len(audio) / 1000.0
    sample_rate = audio.frame_rate
    channels = audio.channels
    sample_width = audio.sample_width * 8  # bits

    print("\n=== Audio Analysis ===")
    print(f"  File:        {os.path.basename(input_path)}")
    print(f"  Duration:    {duration_s:.1f}s ({duration_s / 60:.1f} min)")
    print(f"  Sample Rate: {sample_rate} Hz")
    print(f"  Channels:    {channels}")
    print(f"  Bit Depth:   {sample_width}-bit")
    print(f"  File Size:   {os.path.getsize(input_path) / (1024*1024):.1f} MB")

    # Quality assessment
    issues = []
    if sample_rate < 16000:
        issues.append(f"Low sample rate ({sample_rate} Hz) — below 16kHz threshold")
    if channels > 1:
        issues.append(f"Multi-channel ({channels}) — will be mixed to mono")

    if issues:
        print("\n  Issues detected:")
        for issue in issues:
            print(f"    - {issue}")
    else:
        print("\n  No obvious quality issues detected.")

    print("======================\n")
    return audio


def enhance_audio(input_path, output_path, aggressive=False, noise_profile=None):
    """
    Enhance audio through multi-stage pipeline:
    1. Convert to 44.1kHz mono WAV (via pydub/FFmpeg)
    2. Apply noisereduce spectral denoising
    3. Apply FFmpeg highpass + acompressor + loudnorm
    4. Resample to 16kHz mono WAV (Deepgram optimal)
    """
    import numpy as np
    import noisereduce as nr
    from pydub import AudioSegment

    print(f"[1/4] Loading and converting to 44.1kHz mono WAV...")
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1).set_frame_rate(44100)

    # Convert to numpy array for noisereduce
    samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
    sample_rate = audio.frame_rate

    print(f"[2/4] Applying spectral noise reduction{'  (aggressive)' if aggressive else ''}...")

    # Load noise profile if provided
    noise_clip = None
    if noise_profile and os.path.exists(noise_profile):
        print(f"       Using noise profile: {noise_profile}")
        noise_audio = AudioSegment.from_file(noise_profile)
        noise_audio = noise_audio.set_channels(1).set_frame_rate(44100)
        noise_clip = np.array(noise_audio.get_array_of_samples(), dtype=np.float32)

    # Apply noise reduction
    nr_kwargs = {
        "y": samples,
        "sr": sample_rate,
        "stationary": True,
        "prop_decrease": 0.85 if aggressive else 0.65,
    }
    if noise_clip is not None:
        nr_kwargs["y_noise"] = noise_clip

    reduced = nr.reduce_noise(**nr_kwargs)

    # Convert back to AudioSegment
    reduced_int = np.int16(np.clip(reduced, -32768, 32767))
    enhanced_audio = AudioSegment(
        data=reduced_int.tobytes(),
        sample_width=2,
        frame_rate=sample_rate,
        channels=1,
    )

    # Save intermediate WAV for FFmpeg processing
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    enhanced_audio.export(tmp_path, format="wav")

    print(f"[3/4] Applying FFmpeg enhancement filters...")

    # Build FFmpeg filter chain
    highpass_freq = "100" if aggressive else "80"
    filters = [
        f"highpass=f={highpass_freq}",
        "acompressor=threshold=-25dB:ratio=4:attack=5:release=50:makeup=2",
        "loudnorm=I=-16:TP=-1.5:LRA=11",
    ]
    filter_str = ",".join(filters)

    # Intermediate file for FFmpeg output
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp2:
        tmp2_path = tmp2.name

    ffmpeg_cmd = [
        "ffmpeg", "-y", "-i", tmp_path,
        "-af", filter_str,
        "-acodec", "pcm_s16le",
        tmp2_path,
    ]
    subprocess.run(ffmpeg_cmd, capture_output=True, check=True)

    print(f"[4/4] Resampling to 16kHz mono WAV (Deepgram optimal)...")

    resample_cmd = [
        "ffmpeg", "-y", "-i", tmp2_path,
        "-ar", "16000", "-ac", "1",
        "-acodec", "pcm_s16le",
        output_path,
    ]
    subprocess.run(resample_cmd, capture_output=True, check=True)

    # Cleanup temp files
    os.unlink(tmp_path)
    os.unlink(tmp2_path)

    # Report
    input_size = os.path.getsize(input_path) / (1024 * 1024)
    output_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nDone! Enhanced audio saved to: {output_path}")
    print(f"  Input:  {input_size:.1f} MB")
    print(f"  Output: {output_size:.1f} MB")
    print(f"\nUpload {output_path} to Depo-Pro instead of the original.")


def main():
    parser = argparse.ArgumentParser(
        description="Depo-Pro Manual Audio Enhancement",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("input", help="Input audio/video file path")
    parser.add_argument("output", help="Output WAV file path")
    parser.add_argument(
        "--aggressive", action="store_true",
        help="Use aggressive noise reduction (for very poor recordings)",
    )
    parser.add_argument(
        "--profile", metavar="NOISE_FILE",
        help="Path to a 1-3 second noise-only sample for targeted noise removal",
    )
    parser.add_argument(
        "--analyze", action="store_true",
        help="Analyze audio quality only — do not process",
    )

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"ERROR: Input file not found: {args.input}")
        sys.exit(1)

    check_dependencies()

    if args.analyze:
        analyze_audio(args.input)
        return

    enhance_audio(
        args.input,
        args.output,
        aggressive=args.aggressive,
        noise_profile=args.profile,
    )


if __name__ == "__main__":
    main()
