#!/usr/bin/env python3
"""Generate audio pack manifest placeholders (no real recordings)."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHRASES_TS = ROOT / "src" / "voice" / "phrases.ts"
OUT = ROOT / "public" / "audio"


def phrase_ids() -> list[str]:
    text = PHRASES_TS.read_text(encoding="utf-8")
    return re.findall(r"\bp\(\s*'([^']+)'", text)


def main() -> None:
    ids = sorted(set(phrase_ids()))
    for lang in ("en", "rw"):
        lang_dir = OUT / lang
        lang_dir.mkdir(parents=True, exist_ok=True)
        (lang_dir / ".gitkeep").touch()
        manifest = {
            "language": lang,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "phrases": [{"id": pid, "file": f"{pid}.mp3", "reviewed": False} for pid in ids],
        }
        (lang_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Generated manifests for {len(ids)} phrases in en/ and rw/")


if __name__ == "__main__":
    main()
