# Narrated native demo evidence

The upload file is [Unpause-demo-narrated.mp4](../../artifacts/submission/Unpause-demo-narrated.mp4). Its accompanying [SRT captions](../../artifacts/submission/Unpause-demo-narrated.srt) can also be uploaded to YouTube. Captions are already burned into the landscape composition.

## Verified export

| Check | Result |
| --- | --- |
| Duration | 77.791667 seconds, below two minutes |
| Video | H.264, 1920 × 1080, 24 fps, yuv420p |
| Audio | AAC, mono, 48,000 Hz |
| Narration | OpenAI gpt-4o-mini-tts, built-in Cedar voice |
| Voice disclosure | Visible throughout: Android emulator preview · AI-generated narration |
| Integrated loudness | -16.65 LUFS, measured from the final AAC stream |
| True peak | -1.39 dBFS, no clipping |
| Loudness range | 6.20 LU |
| Captions | 25 cues, nonoverlapping and aligned to generated speech word timestamps |
| Creator attribution | Shivam Gupta, Creator; no voice impersonation |
| SHA-256 | `7e432fc65d9d272330f744333a57539511fcd3bc6ca6c03355c32101813476e6` |

All seven chapter sample images were visually inspected for text overflow, contrast, native UI visibility, and caption placement. Additional frames were extracted from the encoded MP4 at 3, 24, and 70 seconds. The final decoded audio waveform was inspected. There is no music and no unlicensed background audio.

Each speech segment was transcribed with Whisper word timestamps and compared to the supplied script. Normalized text similarity was 96.2% to 100%; recognition differences were product/name segmentation, the written number ten, and punctuation. The opening received a second transcription with gpt-4o-mini-transcribe, which confirmed the exact creator introduction. The authored wording, including proper names, is preserved in captions.

## Honest footage and editing

The original source is 76.993 seconds of actual Android emulator interaction in `unpause-native-walkthrough.mp4`. The app image is uniformly scaled to 480 × 960 and placed on the right of a separate 1920 × 1080 editorial canvas. Captions and benefit text do not cover or replace native app UI.

The first chapter adds about 0.792 seconds holding a real frame to accommodate narration, with a maximum 8% audio acceleration in that chapter only. All remaining chapters preserve the source action timing. The final source frame is held for the fraction of a frame required by the fixed output frame rate. No app timer, project entry, account interaction, or purchase outcome is fabricated. Illustrative project content remains visibly labeled Sample studio.

The video explicitly states that Studio is a planned lifetime upgrade through RevenueCat and that live purchases and store release are pending. It is a native preview, not evidence of public store release or verified monetization. Public video publication does not satisfy those separate eligibility gates.

## Reproduce

Install repository dependencies for the bundled Fraunces and DM Sans font files. Install `ffmpeg`, `ffprobe`, Python 3, Pillow, and requests. The script reads a private API key from `~/.config/unpause/private/openai-api-key` inside Python only. It never prints the credential or passes it to a shell. Keep that file private and outside the repository.

```sh
python3 scripts/generate-demo.py --audio-only
python3 scripts/generate-demo.py
```

Narration input lives in [submission-narration.json](../submission-narration.json). Generated WAVs, word timings, render samples, and logs are cached under the ignored `.codex-finalizer/video` directory. Successful cached synthesis is reused; editing narration changes its cache key. The script rejects an output duration of two minutes or more and rejects large speech/transcript mismatches.

The workflow uses the official [speech generation documentation](https://developers.openai.com/api/docs/guides/text-to-speech) and [word timestamp documentation](https://developers.openai.com/api/docs/guides/speech-to-text). The public title, description, and testing fields are in [submission-fields.md](../submission-fields.md).
