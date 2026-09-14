# 한국어 · Korean review

A Thai-language personal review app for the Udemy course **The Complete Korean Course for Beginners | 10 courses in 1!** Static HTML/CSS/JavaScript, no application dependencies or runtime API calls. The learner is restarting, already reads Hangul, and will report newly completed lectures. The shipping corpus contains the learner’s Section 10–13 recap; future content is added only after a learning report.

## Run

Requires Node.js 22 or newer.

```sh
npm test
npm run build
npm start
```

Open http://localhost:8736. The server exposes **only `public/`**, never the root `.env`. Do not open `index.html` as a `file://` URL: ES modules and service workers require an HTTP origin. On a phone, use the eventual HTTPS GitHub Pages address and add it to the home screen. A LAN HTTP URL can preview the UI, but browser security restrictions prevent service worker installation there.

## Publishing on GitHub Pages

The workflow in `.github/workflows/pages.yml` tests, builds, and uploads **only `public/`** on pushes to `main`. In the chosen GitHub repository, select **Settings → Pages → Source: GitHub Actions**, then push this project. No GitHub repository or remote was supplied, so no external repository is created or pushed by the implementation.

Do not select the repository root as a branch-based Pages source. Source materials belong in ignored `private/`; Azure secrets belong in ignored `.env`. `.env.example` contains variable names only. Generated production audio in `audio-source/clips/` must be committed so CI can build without credentials. Samples are ignored and never published.

Open the app online and wait for **พร้อมใช้ออฟไลน์ · รวมเสียง** before disconnecting. Installation verifies each file against the release's SHA-256 inventory. A failed download or quota error cannot mark a partial version ready. A new worker waits for the update button; an existing quiz is not reloaded automatically. The browser can evict site storage, so the app rechecks offline completeness and offers repair. Export learning results for a backup; there is no cross-device sync.

## Structure and content contract

- `content/`: course map, explicitly learned IDs, audio settings, and one authored JSON package per lecture in `lessons/`.
- `public/`: deployable UI and generated catalog/service worker/audio only.
- `tools/`: content validation, release building, local Azure generation and a safe preview server.
- `tests/`: synthetic fixtures and behavioral tests; never included in the website.

The **ผันกริยา** page is generated from ready lessons at runtime. It shows only dictionary forms and conjugations that already have a validated exercise, rule, stable word ID and source in the shipping corpus. Selecting **ฝึกกฎนี้** opens the existing practice mode with the matching lesson and rule filter, so results continue to use the same score store.

See [CONTENT.md](CONTENT.md) for the exact incremental authoring workflow and data fields. Use stable Udemy lecture IDs in lesson identifiers when available; visible lecture numbers are source locators, not permanent IDs. The section map records the 82 observed headings, not 733 fabricated lecture records.

## Audio

```sh
npm run audio:check                 # offline inventory, no Azure request
npm run audio:voices                # list Korean voices from configured region
node tools/audio.mjs --sample       # three voice samples, outside the app
node tools/audio.mjs --generate --limit 3
node tools/audio.mjs --generate
node tools/audio.mjs --generate --delay-ms 3100  # safe pace for an F0 resource
npm run build
```

The learner approved `ko-KR-SunHiNeural` at `-10%` on 2026-09-12, MP3 24 kHz / 48 kbps mono. Production generation uses this setting consistently and requires `approved: true`.

Files are keyed by NFC text, voice, rate and output format. The same text is generated once. Generation resumes from missing clips, writes atomically, and limits retries. A release with ready lessons fails if any required clip is missing. Sentence playback always uses a complete sentence clip, never concatenated words. `wordIds` explicitly attaches pronounceable vocabulary buttons beneath a sentence; individual particles and unsorted chunks do not get invented standalone readings.

After answering or revealing a card, **S** plays its correct Korean answer. Modifiers and editable fields are ignored. Clicking another clip or changing questions stops the current audio. All text and audio work offline once the release is fully cached.

References used for the implementation: [Azure text-to-speech REST API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech), [Azure Korean voice support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts), [service worker installation and updates](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Verification

`npm test` covers lesson/prerequisite gating, all answer types, backup validation, persistent IDs, recall decks, conjugation-lab scoping, audio shortcut/playback, publish isolation and missing audio, plus repository-subpath caching, ranged MP3 responses, interrupted updates, quota errors, checksum mismatch and repair.

The current release contains 18 recap units, 165 vocabulary entries, 418 exercises and 364 unique audio clips from the learner's Section 10–13 PDFs. Only the covered topics are marked learned; this does not complete every lecture in those sections. Test fixtures must stay in `tests/` or ignored `.cache/`. Physical iOS/Android installation should also be checked after publishing a new release.
