# Korean review — implementation record

## Accepted direction

The user is restarting **The Complete Korean Course for Beginners | 10 courses in 1!** and already reads Hangul. Historical Udemy completion ticks are not authoritative. Add review content only after the user explicitly reports newly learned lectures; do not build the whole course now.

Use Thai UI/explanations, tap choices and chunk assembly only, plus vocabulary self-assessment. Desktop/mobile web, GitHub Pages deployment, offline content and audio. Clicking Korean words/sentences plays locally generated Azure clips; S after answer/reveal repeats the correct Korean answer.

## Implemented — 2026-09-12

- Static app with Lessons / Practice / Review, learned/waiting/ready states, per-lesson/topic/rule filtering and persistent scores/vocabulary.
- Course map from the observed Udemy page: 10 groups / 82 sections. No invented lecture records; first recap content added on 2026-09-12.
- Three exercise engines, explicit alternate answers, prerequisite checks and an empty first-run state.
- Versioned backup import/export; importing requires confirmation and preserves identifiers not currently in the catalog.
- Azure voice lookup, sample generation, deduplicated resumable production generation and release-time clip coverage checks. `.env` remains private. SunHi at -10% approved; 113 production clips generated.
- SHA-256-verified service worker installation, explicit update action, cache repair, repository subpath support, offline MP3 range playback, shared audio between versions.
- Node-only build/server, no application dependencies; GitHub Actions publishes only `public/`.

## Working references

- `README.md`: run, publish, audio and verification commands.
- `CONTENT.md`: exact schema and incremental content workflow.
- `content/progress.json`: seven recap units learned from the supplied PDF; use user reports, not Udemy ticks.
- `tests/`: synthetic fixtures kept out of the released app.

The Japanese, Mandarin and German siblings were studied but not changed. Korean preserves their small static-app approach. Documentation and tests are the handoff for the next content update.

## Remaining external inputs

1. Additional newly completed lectures for the next incremental batch.
2. First input and voice selection are complete: Section 10–11 recap, SunHi -10%.
3. GitHub repository destination to actually push/deploy. The deployment workflow is prepared; no external remote was supplied.

The current recap release works locally and supports offline caching.
