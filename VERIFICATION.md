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
## รอบฝึกและตัวกรอง — 2026-09-13

- ตัวกรองหัวข้อ/กฎจำกัดตามบทที่เลือก และคืนค่าที่ไม่สัมพันธ์เป็นทุกหัวข้อ/ทุกกฎ
- ยุบตัวกรองระหว่างฝึก; แสดงชุดคำศัพท์เฉพาะหัวข้อคำศัพท์; ล้างตัวกรองได้จากชุดว่าง
- รอบสุ่มไม่ซ้ำสูงสุด 10 ข้อ (ชุดเล็กใช้จำนวนจริง) พร้อมสรุปและฝึกเฉพาะข้อผิดซ้ำ
- ทดสอบ UI จริง: 10 ข้อไม่ซ้ำ สรุป 2/10; รอบซ้ำมีเฉพาะ 8 ข้อผิด; บัตรคำ 7/8 และรอบแก้ตัว 1/1; เรียงคำ 2/2; ชุดยังจำไม่ได้ว่างหลังแก้ตัว; กฎจำกัดตามบท; ปุ่มเสียง/S; จอ 390px; ไม่มี console error
- คะแนนทดสอบถูกบันทึกในเครื่อง ไม่ล้างผลเดิม
- รอบปัจจุบันอยู่ในหน่วยความจำ การโหลดหน้าใหม่/เปลี่ยนชุดเริ่มรอบใหม่ คะแนนและสถานะคำศัพท์ยังบันทึกถาวร
- 18 automated tests ผ่าน; build ตรวจ 113 คลิปครบ
## Section 11 end — 2026-09-13

Added 3 units: object particles, negatives, and questions; 10 new words, 46 exercises, 40 new clips. Total 10 ready units, 63 words, 169 exercises, 153 clips. Existing IDs and saved progress remain intact. Source PDF is outside the repository under ../private/worksheets. Read all 6 rendered pages. Only the negative action patterns are developed; the isolated 아니 introductory slide is insufficient for a copula-negation unit. Standardized slide 너가 to 네가 using NIKL FAQ 5874. Thai explanations and derived examples are authored; source examples remain page-referenced. Proposed future listening discrimination needs intonation QA before inclusion.

20 tests pass; complete audio coverage and release isolation pass. Browser loaded new units, offline-ready status, new vocabulary reveal and S/button playback. Final source-locator correction: 사과 on page 2. Physical mobile/offline restart not repeated in this batch.
## Section 12 — 2026-09-13

Read all eight PDF pages visually. Added six explicitly learned groups (ㅂ, ㄷ, ㅅ, ㅡ, 르, ㅎ), 45 new vocabulary entries, 94 exercises, and 89 new SunHi -10% clips. Total: 16 ready units, 108 words, 263 exercises, 242 clips. Dictionary forms are reconstructed where slides show only inflections; Thai explanations and distractors are authored. All content is limited to the meanings and forms covered in the notes. Regular 잡다/입다 are taught as contrasts; 듣다 (listen) is distinct from existing 들다 (lift).

Corrections: 낫다 → 나아요 (slides show 나요 and one 나다 label); 하얗다 → 하얘요 (slides show 하예요 / one 하얗다 typo); 입다 means wear clothes, not grab. NIKL references: https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5890 ; https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=73274 ; https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=75774 . Source PDF remains outside repository under ../private/worksheets.

22 automated tests pass, including corrected forms, regular exceptions, lesson scope, reachable prerequisites and no answer-revealing prompt audio. Production build 26ed84668e75 verifies all 242 clips. Earlier build attempted before synthesis finished correctly rejected missing audio; rebuilding after completion passes.

## เครื่องผันกริยา — 2026-09-13

นำแนวคิดลำดับขั้นจากไฟล์ `ผันกริยาเกาหลี-standalone.html` มาเขียนใหม่ในโครงแอพเดิม โดยไม่เผยแพร่ runtime และฟอนต์ที่ฝังในไฟล์ต้นฉบับขนาด 5.3 MB หน้าใหม่ดึงเฉพาะคำ กฎ รูปผัน แหล่งอ้างอิง และเสียงจากบทที่มีสถานะพร้อมทบทวน จึงเพิ่มตามบทเรียนในอนาคตโดยอัตโนมัติ ปัจจุบันมี 77 คำ กรองกฎพื้นฐาน/กฎเปลี่ยนรูป สลับระดับภาษาที่เคยเรียน สุ่มคำ และเปิดแบบฝึกของกฎเดียวกันได้

ตรวจ UI จริงบนเดสก์ท็อปและ viewport 390 × 844: เลือกคำ เปลี่ยนจากรูปสุภาพเป็นทางการ และเปิดแบบฝึกที่กรองตรงบท/กฎสำเร็จ สถานะออฟไลน์รวมเสียงยังครบ โมดูลใหม่รวมอยู่ในรายการไฟล์ของ service worker และ 23 automated tests ผ่าน
