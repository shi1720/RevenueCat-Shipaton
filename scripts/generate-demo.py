#!/usr/bin/env python3
"""Build the disclosed AI-narrated Unpause native preview.

Requires Python 3, requests, Pillow, ffmpeg, ffprobe, and npm-installed app fonts.
The private API credential is read only in this process, never passed to a shell.
Run with --audio-only to prepare cached narration without rendering video.
Actual app pixels are only uniformly resized. Extra narration time holds the
last real frame of its chapter, with no fabricated app UI or purchase sequence.
"""
import argparse
import difflib
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import wave

import requests
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.codex-finalizer/video'
OUT = ROOT / 'artifacts/submission'
FPS = 24
CREAM, INK, VIOLET, MUTED = '#F8F7F3', '#252638', '#5753A3', '#686773'
CHAPTERS = [
    ('A WAY BACK', 'Your projects.\nStill waiting for you.', 'A memory for the things\nyou love making.', ['Shivam Gupta', 'Creator']),
    ('THE MOMENT THAT MATTERS', 'Ten minutes.\nWhere were you?', 'Save the context that makes\nstarting again feel possible.', ['One next action', 'Materials at hand']),
    ('LEAVE A HANDOFF', 'Make the next\nbeginning easier.', 'What changed. What comes next.\nWhere everything lives.', ['A tiny next step', 'A clear checkpoint']),
    ('KEEP THE PHYSICAL CONTEXT', 'A photo can hold\nwhat words miss.', 'Your notes and photos\nstay on your device.', ['Local by default', 'Your memories']),
    ('SEE YOUR PROGRESS', 'Every return\nbecomes a moment.', 'Revisit earlier notes. Keep making.\nFinish when you are ready.', ['Project history', 'No streak pressure']),
    ('FIT THE MOMENT YOU HAVE', 'A small window.\nA useful next step.', 'Choose your available time\nand energy, then begin.', ['10 min', '25 min', '45 min']),
    ('A SUSTAINABLE LITTLE STUDIO', 'Three projects free.\nRoom to grow.', 'Planned lifetime Studio upgrade\nthrough RevenueCat.', ['Free backups', 'Purchases + release pending']),
]

def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)

def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(path)]))

def api_request(endpoint, **kwargs):
    # This file is outside the repository and is never included in subprocess arguments.
    key = (Path.home() / '.config/unpause/private/openai-api-key').read_text().strip()
    result = requests.post('https://api.openai.com/v1/audio/' + endpoint,
                           headers={'Authorization': 'Bearer ' + key}, timeout=180, **kwargs)
    if not result.ok:
        raise RuntimeError('Audio API request failed with HTTP ' + str(result.status_code))
    return result

def font(name, size):
    paths = {
        'serif': '@expo-google-fonts/fraunces/500Medium/Fraunces_500Medium.ttf',
        'sans': '@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf',
        'medium': '@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf',
        'bold': '@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf',
    }
    return ImageFont.truetype(str(ROOT / 'node_modules' / paths[name]), size)

def wrap(text, draw, face, width):
    lines, line = [], ''
    for word in text.split():
        candidate = (line + ' ' + word).strip()
        if draw.textlength(candidate, font=face) > width and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    return '\n'.join(lines + [line])

def background(index):
    im = Image.new('RGB', (1920, 1080), CREAM)
    d = ImageDraw.Draw(im)
    # Editorial guide and original brand mark remain outside the native screen.
    d.rounded_rectangle((1306, 46, 1814, 1034), radius=24, fill='#E8E6EF')
    icon = Image.open(ROOT / 'assets/icon.png').convert('RGB').resize((72, 72), Image.Resampling.LANCZOS)
    im.paste(icon, (96, 76))
    d.text((190, 83), 'Unpause', font=font('serif', 48), fill=INK)
    d.text((96, 214), CHAPTERS[index][0], font=font('bold', 23), fill=VIOLET)
    d.multiline_text((90, 277), CHAPTERS[index][1], font=font('serif', 88), fill=INK, spacing=6)
    d.multiline_text((96, 520), CHAPTERS[index][2], font=font('sans', 39), fill=MUTED, spacing=12)
    x = 96
    for label in CHAPTERS[index][3]:
        face = font('medium', 27)
        width = int(d.textlength(label, font=face)) + 42
        d.rounded_rectangle((x, 661, x + width, 716), radius=27, fill='#EAE8F2')
        d.text((x + 21, 671), label, font=face, fill=VIOLET)
        x += width + 14
    d.line((96, 804, 1164, 804), fill='#D9D6E3', width=2)
    d.text((96, 1007), 'Android emulator preview  ·  AI-generated narration', font=font('medium', 24), fill=MUTED)
    d.text((1100, 1007), f'{index + 1:02d} / 07', font=font('medium', 24), fill=MUTED)
    return im

def timestamp(seconds):
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio-only', action='store_true')
    args = parser.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    spec = json.loads((ROOT / 'docs/submission-narration.json').read_text())
    records, all_cues, start = [], [], 0.0
    for index, segment in enumerate(spec['segments']):
        text = segment['text']
        assert '\u2014' not in text
        signature = hashlib.sha256(('cedar-v1:' + text).encode()).hexdigest()[:12]
        audio = WORK / f'{index + 1}-{signature}.wav'
        transcript = audio.with_suffix('.json')
        if not audio.exists():
            result = api_request('speech', json={
                'model': 'gpt-4o-mini-tts', 'voice': 'cedar', 'input': text,
                'response_format': 'wav',
                'instructions': 'A warm, thoughtful documentary narrator. Clear and conversational, gently optimistic. Natural neutral English. Speak at about 145 words per minute with brief natural sentence pauses. Read the supplied script exactly. Do not add words. Unpause is pronounced un-pause. This is an independent narrator, not the creator speaking.',
            })
            audio.write_bytes(result.content)
        if not transcript.exists():
            with audio.open('rb') as f:
                result = api_request('transcriptions', files={'file': (audio.name, f, 'audio/wav')},
                    data={'model': 'whisper-1', 'response_format': 'verbose_json', 'timestamp_granularities[]': 'word', 'language': 'en', 'prompt': 'Unpause. Shivam Gupta. RevenueCat.'})
            transcript.write_text(json.dumps(result.json(), indent=2))
        data = json.loads(transcript.read_text())
        natural = duration(audio)
        original = segment['end_seconds'] - segment['start_seconds']
        # At most 8% acceleration; otherwise preserve speech and hold a real frame.
        tempo = min(1.08, max(1.0, natural / max(1, original - .22)))
        frames = math.ceil(max(original, natural / tempo + .22) * FPS)
        length = frames / FPS
        words = data['words']
        spoken = ' '.join(w['word'] for w in words)
        norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
        similarity = difflib.SequenceMatcher(None, norm(text), norm(spoken)).ratio()
        if similarity < .92:
            raise ValueError(f'Narration segment {index + 1} differs from script: {spoken}')
        # Map exact authored tokens to aligned recognition words, preserving punctuation.
        expected = text.split()
        matcher = difflib.SequenceMatcher(None, [norm(t) for t in expected], [norm(w['word']) for w in words])
        aligned = []
        for tag, a, b, c, e in matcher.get_opcodes():
            if tag == 'equal':
                aligned.extend((expected[k], words[c + k - a]['start'], words[c + k - a]['end']) for k in range(a, b))
            elif b > a:
                lo = words[c]['start'] if c < len(words) else words[-1]['end']
                hi = words[e-1]['end'] if e > c else lo + .1
                aligned.extend((expected[k], lo + (hi-lo)*(k-a)/(b-a), lo + (hi-lo)*(k-a+1)/(b-a)) for k in range(a,b))
        cues, group = [], []
        for token in aligned:
            group.append(token)
            if len(group) >= 8 or token[0].endswith(('.', '?', ':')):
                cues.append({'start': start + group[0][1] / tempo,
                             'end': start + min(length, group[-1][2] / tempo + .12),
                             'text': ' '.join(t[0] for t in group)})
                group = []
        if group:
            cues.append({'start': start + group[0][1]/tempo, 'end': start + min(length,group[-1][2]/tempo+.12), 'text': ' '.join(t[0] for t in group)})
        for current, following in zip(cues, cues[1:]):
            current['end'] = min(current['end'], following['start'])
        adjusted = WORK / f'chapter-{index + 1}.wav'
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(audio), '-af', f'atempo={tempo:.6f},apad,atrim=duration={length:.6f}', '-ar', '48000', '-ac', '1', str(adjusted)])
        rec = {'chapter': index + 1, 'start': start, 'duration': length, 'source_start': segment['start_seconds'], 'source_duration': original, 'natural_voice_duration': natural, 'audio_tempo': tempo, 'transcript_similarity': similarity, 'frames': frames, 'audio': str(adjusted), 'cues': cues}
        records.append(rec)
        all_cues.extend(cues)
        start += length
        print(f'Chapter {index + 1}: voice {natural:.2f}s, final {length:.2f}s, tempo {tempo:.3f}, transcript {similarity:.3f}', flush=True)
    if start >= 120:
        raise ValueError('Video exceeds hackathon duration limit')
    (WORK / 'timing.json').write_text(json.dumps(records, indent=2))
    (OUT / 'Unpause-demo-narrated.srt').write_text('\n\n'.join(f"{i+1}\n{timestamp(c['start'])} --> {timestamp(c['end'])}\n{c['text']}" for i,c in enumerate(all_cues)) + '\n')
    if args.audio_only:
        return
    # WAV concat and loudness normalization happen before video encoding.
    joined = WORK / 'joined.wav'
    with wave.open(str(joined), 'wb') as target:
        target.setnchannels(1); target.setsampwidth(2); target.setframerate(48000)
        for record in records:
            with wave.open(record['audio'], 'rb') as source:
                target.writeframes(source.readframes(source.getnframes()))
    normalized = WORK / 'narration.wav'
    run(['ffmpeg','-v','error','-y','-i',str(joined),'-af','loudnorm=I=-16:TP=-1.5:LRA=7','-ar','48000',str(normalized)])
    output = OUT / 'Unpause-demo-narrated.mp4'
    log = (WORK / 'encoder.log').open('w')
    encoder = subprocess.Popen(['ffmpeg','-v','warning','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','1920x1080','-framerate',str(FPS),'-i','pipe:0','-i',str(normalized),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-metadata','title=Unpause: Leave Yourself a Way Back','-metadata','comment=Android emulator preview with disclosed AI-generated narration. Native UI scaled uniformly; chapter-end holds added where speech requires. Live purchases and store release pending.','-shortest',str(output)], stdin=subprocess.PIPE, stderr=log)
    try:
        for index, rec in enumerate(records):
            base = background(index)
            base.save(WORK / f'chapter-{index+1}-background.png')
            decoder = subprocess.Popen(['ffmpeg','-v','error','-ss',str(rec['source_start']),'-t',str(rec['source_duration']),'-i',str(ROOT/spec['source_video']),'-vf',f'scale=480:960:flags=lanczos,fps={FPS},setsar=1','-frames:v',str(round(rec['source_duration']*FPS)),'-f','rawvideo','-pix_fmt','rgb24','pipe:1'], stdout=subprocess.PIPE)
            previous, cached_key, canvas = None, None, None
            source_frames = round(rec['source_duration']*FPS)
            for n in range(rec['frames']):
                if n < source_frames:
                    data = decoder.stdout.read(480*960*3)
                    if len(data) == 480*960*3:
                        previous = Image.frombytes('RGB',(480,960),data)
                assert previous is not None
                t = rec['start'] + n/FPS
                caption = next((c['text'] for c in rec['cues'] if c['start'] <= t < c['end']), '')
                if caption != cached_key:
                    canvas = base.copy()
                    draw = ImageDraw.Draw(canvas)
                    if caption:
                        wrapped = wrap(caption,draw,font('medium',36),1068)
                        draw.multiline_text((96, 846),wrapped,font=font('medium',36),fill=INK,spacing=12)
                    cached_key = caption
                frame = canvas.copy()
                frame.paste(previous,(1320,60))
                encoder.stdin.write(frame.tobytes())
                if n == min(round(rec['duration']*FPS/2),rec['frames']-1):
                    frame.save(WORK/f'chapter-{index+1}-sample.jpg',quality=95)
            decoder.stdout.close()
            if decoder.wait() != 0:
                raise RuntimeError('Native source decoder failed')
            print(f'Rendered chapter {index+1}/7',flush=True)
    finally:
        encoder.stdin.close()
    if encoder.wait() != 0:
        raise RuntimeError('Video encoder failed; inspect local encoder.log')
    log.close()
    print(f'Finished {output.name}: {duration(output):.3f}s',flush=True)

if __name__ == '__main__':
    main()
