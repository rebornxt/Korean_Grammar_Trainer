// Azure credentials are read only by this local tool. Never bundle this file.
import { readFile, writeFile, mkdir, stat, rename } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ROOT,
  loadContent,
  validateContent,
  audioManifest,
  hash,
} from "./lib.mjs";
const args = process.argv.slice(2),
  c = validateContent(await loadContent());
async function exists(p) {
  try {
    return (await stat(p)).size > 100;
  } catch {
    return false;
  }
}
async function credentials() {
  const env = {};
  for (const line of (await readFile(resolve(ROOT, ".env"), "utf8")).split(
    /\r?\n/,
  )) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  if (!env.AZURE_TTS_KEY || !/^[a-z0-9-]+$/.test(env.AZURE_TTS_REGION || ""))
    throw Error("Missing Azure key or valid region in local .env");
  return env;
}
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (x) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[x],
  );
async function voices(env) {
  const r = await fetch(
    `https://${env.AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
    {
      headers: { "Ocp-Apim-Subscription-Key": env.AZURE_TTS_KEY },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!r.ok)
    throw Error(
      `Azure voice lookup failed (HTTP ${r.status}); credentials were not logged.`,
    );
  return (await r.json()).filter((x) => x.Locale === "ko-KR");
}
async function synthesize(env, text) {
  const body = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR"><voice name="${escape(c.config.voice)}"><prosody rate="${escape(c.config.rate)}">${escape(text)}</prosody></voice></speak>`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(
      `https://${env.AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": env.AZURE_TTS_KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": c.config.format,
          "User-Agent": "KoreanReviewLocalBuilder",
        },
        body,
        signal: AbortSignal.timeout(45000),
      },
    );
    if (r.ok) {
      const bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length < 100) throw Error("Azure returned an empty clip");
      return bytes;
    }
    if (![429, 500, 502, 503, 504].includes(r.status) || attempt === 3)
      throw Error(
        `Azure synthesis failed (HTTP ${r.status}); credentials were not logged.`,
      );
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
}
try {
  const manifest = audioManifest(c),
    missing = [];
  for (const item of manifest)
    if (
      !(await exists(
        resolve(ROOT, "audio-source/clips", item.file.split("/").pop()),
      ))
    )
      missing.push(item);
  if (args.includes("--check")) {
    console.log(
      JSON.stringify(
        {
          voice: c.config.voice,
          rate: c.config.rate,
          approved: c.config.approved,
          total: manifest.length,
          missing: missing.length,
          charactersToGenerate: missing.reduce((n, x) => n + x.text.length, 0),
        },
        null,
        2,
      ),
    );
  } else if (
    args.includes("--voices") ||
    args.includes("--sample") ||
    args.includes("--generate")
  ) {
    if (args.includes("--generate") && !c.config.approved)
      throw Error(
        "Listen to --sample first, then set approved:true in content/audio-config.json before generating lesson audio.",
      );
    const env = await credentials(),
      available = await voices(env);
    if (args.includes("--voices"))
      console.log(
        available.map((x) => ({ voice: x.ShortName, gender: x.Gender })),
      );
    else {
      if (!available.some((x) => x.ShortName === c.config.voice))
        throw Error("Configured Korean voice is unavailable in this region");
      const sample = args.includes("--sample");
      const samples = ["안녕하세요.", "한국어를 공부해요.", "저는 학생입니다."];
      let items = sample
        ? samples.map((text, i) => ({
            text,
            file: `sample-${i + 1}-${hash(JSON.stringify([text, c.config])).slice(0, 12)}.mp3`,
          }))
        : missing;
      const li = args.indexOf("--limit");
      if (li >= 0) {
        const n = Number(args[li + 1]);
        if (!Number.isInteger(n) || n < 1)
          throw Error("--limit must be a positive integer");
        items = items.slice(0, n);
      }
      const dir = resolve(
        ROOT,
        sample ? "audio-source/samples" : "audio-source/clips",
      );
      await mkdir(dir, { recursive: true });
      for (const [i, item] of items.entries()) {
        const path = resolve(dir, item.file.split("/").pop());
        if (await exists(path)) continue;
        const bytes = await synthesize(env, item.text);
        await writeFile(path + ".tmp", bytes);
        await rename(path + ".tmp", path);
        console.log(`${i + 1}/${items.length}: ${path}`);
      }
      if (sample)
        await writeFile(
          resolve(dir, "samples.json"),
          JSON.stringify({ config: c.config, items }, null, 2),
        );
      console.log(
        sample
          ? "Samples only; no lesson content was added."
          : "Missing clips generated. Run npm run build to verify coverage.",
      );
    }
  } else
    console.log(
      "Usage: node tools/audio.mjs --check | --voices | --sample | --generate [--limit N]",
    );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
