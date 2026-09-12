// A separate, explicitly synthetic website for manual UI/audio/offline checks.
import { mkdir, cp, writeFile, readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createServer } from "node:http";
import { ROOT, audioManifest } from "./lib.mjs";
import { build } from "./build.mjs";
import { fixture } from "../tests/fixture.mjs";
const root = resolve(ROOT, ".cache/ui-preview"),
  c = fixture();
// Reuse genuine voice samples without adding learning content or making more TTS calls.
c.lessons[0].words[0].ko = "안녕하세요.";
c.lessons[0].words[0].th = "สวัสดี";
c.lessons[0].questions[1].answerText = "안녕하세요.";
c.lessons[0].questions[1].prompt = "สวัสดี";
await mkdir(resolve(root, "content/lessons"), { recursive: true });
await mkdir(resolve(root, "tools"), { recursive: true });
await mkdir(resolve(root, "audio-source/clips"), { recursive: true });
await cp(resolve(ROOT, "public"), resolve(root, "public"), { recursive: true });
await cp(
  resolve(ROOT, "tools/sw-template.js"),
  resolve(root, "tools/sw-template.js"),
);
await writeFile(resolve(root, "content/course.json"), JSON.stringify(c.course));
await writeFile(
  resolve(root, "content/progress.json"),
  JSON.stringify({ learned: c.learned }),
);
await writeFile(
  resolve(root, "content/audio-config.json"),
  JSON.stringify(c.config),
);
for (const l of c.lessons)
  await writeFile(
    resolve(root, `content/lessons/${l.id}.json`),
    JSON.stringify(l),
  );
const samples = JSON.parse(
  await readFile(resolve(ROOT, "audio-source/samples/samples.json"), "utf8"),
);
for (const a of audioManifest(c)) {
  const s = samples.items.find((x) => x.text === a.text);
  if (!s)
    throw Error("Run node tools/audio.mjs --sample before UI audio tests");
  await cp(
    resolve(ROOT, "audio-source/samples", s.file),
    resolve(root, "audio-source/clips", a.file.split("/").pop()),
  );
}
await build(root);
const base = resolve(root, "public");
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!path.startsWith("/Korean/")) {
      res.writeHead(404).end();
      return;
    }
    const file = resolve(
      base,
      "." +
        path.slice("/Korean".length) +
        (path.endsWith("/") ? "index.html" : ""),
    );
    if (!file.startsWith(base + sep)) {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type":
        {
          ".js": "text/javascript",
          ".html": "text/html; charset=utf-8",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".mp3": "audio/mpeg",
          ".png": "image/png",
          ".webmanifest": "application/manifest+json",
        }[extname(file)] || "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.end();
  }
}).listen(8737, "127.0.0.1", () =>
  console.log("SYNTHETIC UI TEST ONLY: http://localhost:8737/Korean/"),
);
