# Manual Audio Enhancement Script

Pre-processes poor-quality deposition audio before uploading to Depo-Pro.

## When to Use

- Audio quality score below 40 (POOR or UNUSABLE tier)
- Transcript flagged word rate > 30%
- Obvious background noise, hum, or distortion
- Phone recordings, laptop microphone recordings, courtroom echo

## Installation (One-Time)

```bash
# Python dependencies
pip install pydub noisereduce scipy numpy

# FFmpeg (must be installed on local machine)
# Windows:
winget install ffmpeg

# Mac:
brew install ffmpeg
```

## Usage

```bash
# Basic — standard enhancement
python scripts/audio/enhance.py input.mp3 output.wav

# Aggressive — for very poor quality recordings
python scripts/audio/enhance.py input.mp3 output.wav --aggressive

# With noise profile — best results
# Record 1–3 seconds of background noise with no speech, save as noise.wav
python scripts/audio/enhance.py input.mp3 output.wav --profile noise.wav

# Analyze only — report quality without processing
python scripts/audio/enhance.py input.mp3 output.wav --analyze

# Video input → WAV output
python scripts/audio/enhance.py deposition.mp4 output.wav
```

## What the Script Does

```
Input (any format)
  ↓
FFmpeg → Convert to 44.1kHz mono WAV
  ↓
noisereduce → Spectral noise reduction
              (with optional noise profile for best results)
  ↓
FFmpeg → highpass + acompressor + loudnorm
  ↓
FFmpeg → Resample to 16kHz mono WAV
  ↓
Output WAV (upload to Depo-Pro instead of original)
```

## After Running

Upload the output `.wav` file to Depo-Pro instead of the original.
The server-side FFmpeg pipeline will still run — but it will have much
cleaner input.

## Getting a Noise Profile

Find a 1–3 second segment of the recording where no one is speaking
(before the reporter opens the record, during a long pause, etc.).
Trim it to a separate file and use `--profile`. This produces the best
noise reduction results because the algorithm knows exactly what to remove.
