import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  cp,
  writeFile,
  readFile,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ROOT, audioManifest } from "../tools/lib.mjs";
import { build } from "../tools/build.mjs";
import { fixture } from "./fixture.mjs";
test("publisher rejects missing audio, then builds learned content without fixture drafts or credentials", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "korean-build-"));
  await cp(resolve(ROOT, "public"), resolve(root, "public"), {
    recursive: true,
  });
  await mkdir(resolve(root, "tools"));
  await cp(
    resolve(ROOT, "tools/sw-template.js"),
    resolve(root, "tools/sw-template.js"),
  );
  await mkdir(resolve(root, "content/lessons"), { recursive: true });
  await mkdir(resolve(root, "audio-source/clips"), { recursive: true });
  const c = fixture();
  await writeFile(
    resolve(root, "content/course.json"),
    JSON.stringify(c.course),
  );
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
  await writeFile(resolve(root, ".env"), "SECRET_TEST=not-for-public");
  await assert.rejects(build(root), /Missing audio/);
  for (const a of audioManifest(c))
    await writeFile(
      resolve(root, "audio-source/clips", a.file.split("/").pop()),
      Buffer.alloc(128, 42),
    );
  const result = await build(root);
  assert.equal(
    result.catalog.lessons.find((l) => l.id === "lesson-b").words.length,
    0,
  );
  assert.equal(result.manifest.length, 2);
  assert(!(await readdir(resolve(root, "public"))).includes(".env"));
  assert(
    !(await readFile(resolve(root, "public/catalog.js"), "utf8")).includes(
      "not-for-public",
    ),
  );
});
