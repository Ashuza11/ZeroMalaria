#!/usr/bin/env python3
"""Synthesize demo MP3 packs with gTTS.

Kinyarwanda: speak phrase text_rw with Swahili (sw) voice stand-in
(gTTS has no rw). Mark needs native review before field use.

Usage: python scripts/synthesize_audio_pack.py [--lang rw|en|both]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHRASES_TS = ROOT / "src" / "voice" / "phrases.ts"
CHECKLIST = ROOT / "public" / "audio" / "rw" / "recording-checklist.json"
OUT = ROOT / "public" / "audio"


def load_from_checklist() -> list[tuple[str, str, str]]:
    if not CHECKLIST.exists():
        return []
    data = json.loads(CHECKLIST.read_text(encoding="utf-8"))
    out: list[tuple[str, str, str]] = []
    for p in data.get("phrases") or []:
        pid = p.get("id")
        if not pid:
            continue
        out.append((pid, p.get("text_en") or "", p.get("text_rw") or ""))
    return out


def load_from_phrases_ts() -> list[tuple[str, str, str]]:
    text = PHRASES_TS.read_text(encoding="utf-8")
    # Match both single-line and multi-line p('id', 'en', 'rw')
    pat = re.compile(
        r"p\(\s*'([^']+)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*\)",
        re.DOTALL,
    )
    seen: dict[str, tuple[str, str, str]] = {}
    for m in pat.finditer(text):
        pid = m.group(1)
        en = m.group(2).replace("\\'", "'")
        rw = m.group(3).replace("\\'", "'")
        seen[pid] = (pid, en, rw)
    return sorted(seen.values(), key=lambda x: x[0])


def load_phrases() -> list[tuple[str, str, str]]:
    phrases = load_from_checklist() or load_from_phrases_ts()
    # Prefer checklist entries that have text; fill gaps from ts
    by_id = {p[0]: p for p in load_from_phrases_ts()}
    if phrases:
        merged = []
        for pid, en, rw in phrases:
            if pid.startswith("locale_") or pid.startswith("prompt_"):
                # optional locale prompts — synthesize if text present
                if rw or en:
                    merged.append((pid, en, rw))
                continue
            ts = by_id.get(pid)
            if ts:
                merged.append(ts)
            elif rw or en:
                merged.append((pid, en, rw))
        # ensure core phrase ids from ts are included
        have = {p[0] for p in merged}
        for pid, en, rw in by_id.values():
            if pid not in have:
                merged.append((pid, en, rw))
        return sorted(merged, key=lambda x: x[0])
    return list(by_id.values())


def synthesize(lang: str, limit: int | None) -> int:
    try:
        from gtts import gTTS
    except ImportError:
        print("gTTS required: pip install gTTS", file=sys.stderr)
        return 1

    phrases = load_phrases()
    print(f"phrases loaded: {len(phrases)}")
    if limit is not None:
        phrases = phrases[:limit]
    dest = OUT / lang
    dest.mkdir(parents=True, exist_ok=True)
    ok = 0
    for pid, en, rw in phrases:
        text = (rw if lang == "rw" else en).strip()
        if not text:
            continue
        path = dest / f"{pid}.mp3"
        if path.exists() and path.stat().st_size > 500:
            print(f"skip {lang}/{pid}.mp3")
            ok += 1
            continue
        # gTTS has no rw — use sw stand-in for Kinyarwanda text (demo only).
        tts_lang = "sw" if lang == "rw" else "en"
        try:
            gTTS(text=text, lang=tts_lang).save(str(path))
            print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")
            ok += 1
            time.sleep(0.2)
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {pid}: {exc}", file=sys.stderr)
            time.sleep(0.5)
    manifest = {
        "language": lang,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": (
            "gTTS: Kinyarwanda text via Swahili voice stand-in — needs native recording"
            if lang == "rw"
            else "gTTS English demo — needs native review"
        ),
        "phrases": [{"id": pid, "file": f"{pid}.mp3", "reviewed": False} for pid, _, _ in phrases],
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Done {lang}: {ok} files written/skipped")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=("rw", "en", "both"), default="both")
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()
    langs = ["rw", "en"] if args.lang == "both" else [args.lang]
    code = 0
    for lang in langs:
        code = max(code, synthesize(lang, args.limit))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
