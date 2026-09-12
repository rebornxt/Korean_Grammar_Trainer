# Scaffold verification — 2026-09-12

- Node tests: content and prerequisite gates, choice/order/recall answers, subtopic filtering, backup round-trip and invalid payload rejection, retained IDs, recall decks, S shortcut rules, single-clip audio/replay, release isolation, and missing audio rejection.
- Worker tests execute the real worker template with simulated CacheStorage/network: first install, `/Korean/` subpath, offline MP3 range requests, waiting activation, failed update preserving old release, quota failure, mixed-release checksum mismatch, missing-cache detection and repair.
- Browser: shipping empty Lessons / Practice / Review screens; 390px mobile layout inspected. No real course exercises were added.
- Separate synthetic preview: clicked a correct choice, assembled a sentence, revealed a vocabulary card, marked remembered, and reloaded to confirm saved scores and filters. Checked S playback without browser errors.
- Stopped the synthetic preview server and reloaded the browser successfully from the worker cache; vocabulary reveal and S audio still worked.
- Verified that a new shipping release downloads and shows an update button while the older page stays open.
- Azure: live Korean voice lookup succeeded using the local `.env`; three candidate SunHi samples generated successfully outside public/. No production clips or source worksheets were published.

Limits: no physical iOS/Android device test; no hosted GitHub Pages test because a repository destination has not been supplied. Voice preference remains for the learner to choose before the first real content release. Backup confirmation UI is implemented; malformed inputs and round trips were tested at the state layer.


## Recap release 2026-09-12

18 Node tests pass. Seven recap packages validate with all cross-lesson prerequisites available; 53 words, 22 rules, 123 questions. Production build 0679e24755fd includes 113/113 SunHi -10% clips, no secrets or source PDFs. Browser update from the empty release completed and displayed offline-ready including audio. Real ordering exercise submitted correctly; sentence playback button and S exercised without console errors. Review endings filter excludes unrelated pronoun cards. Physical mobile and fully disconnected browser restart for this content batch have not been repeated; simulated cache, range, interruption and quota tests pass. One successful ordering answer was recorded during browser QA.
