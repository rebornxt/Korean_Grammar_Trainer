import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { webcrypto, createHash } from "node:crypto";
const template = await readFile(
  new URL("../tools/sw-template.js", import.meta.url),
  "utf8",
);
const digest = (x) => createHash("sha256").update(x).digest("hex");
function storage() {
  const stores = new Map();
  return {
    stores,
    async open(n) {
      if (!stores.has(n)) stores.set(n, new Map());
      const s = stores.get(n);
      return {
        async match(k) {
          return s.get(k)?.clone();
        },
        async put(k, r) {
          s.set(k, r.clone());
        },
      };
    },
    async delete(n) {
      return stores.delete(n);
    },
    async keys() {
      return [...stores.keys()];
    },
  };
}
function worker({
  version = "v1",
  active = false,
  caches = storage(),
  failAt = "",
  files = {
    "index.html": "shell",
    "app.js": "code",
    "audio/clip.mp3": "1234567890",
  },
  corrupt = false,
  quota = false,
} = {}) {
  const events = {},
    messages = [],
    scope = "https://example.com/Korean/",
    assets = Object.entries(files).map(([path, bytes]) => ({
      path,
      sha256: digest(bytes),
    }));
  let online = true,
    skipped = false;
  const ctx = {
    URL,
    Response,
    Request,
    Uint8Array,
    crypto: webcrypto,
    caches,
    fetch: async (url) => {
      if (!online || (url.endsWith(failAt) && failAt))
        throw Error("network down");
      const path = url.slice(scope.length);
      return new Response(corrupt ? "wrong" : files[path], { status: 200 });
    },
    self: {
      registration: { scope, active: active ? {} : null },
      clients: {
        matchAll: async () => [{ postMessage: (x) => messages.push(x) }],
        claim: async () => {},
      },
      skipWaiting: async () => {
        skipped = true;
      },
      addEventListener: (n, fn) => (events[n] = fn),
    },
  };
  if (quota) {
    const open = caches.open.bind(caches);
    ctx.caches = {
      ...caches,
      open: async (n) => {
        const c = await open(n);
        return {
          ...c,
          put: async () => {
            throw Error("QuotaExceeded");
          },
        };
      },
    };
  }
  vm.runInNewContext(
    `const VERSION=${JSON.stringify(version)};const ASSETS=${JSON.stringify(assets)};${template}`,
    ctx,
  );
  return {
    caches,
    messages,
    get skipped() {
      return skipped;
    },
    offline() {
      online = false;
    },
    online() {
      online = true;
    },
    async event(name, data) {
      let promise;
      events[name]({
        data,
        source: { postMessage: (x) => messages.push(x) },
        waitUntil: (p) => (promise = p),
      });
      return promise;
    },
    async request(path, range) {
      let p;
      events.fetch({
        request: {
          method: "GET",
          url: scope + path,
          mode: path === "" ? "navigate" : "cors",
          headers: new Headers(range ? { Range: range } : {}),
        },
        respondWith: (x) => (p = x),
      });
      return p;
    },
  };
}
test("first install caches complete app under repository subpath and plays ranged audio offline", async () => {
  const w = worker();
  await w.event("install");
  assert(w.skipped);
  w.offline();
  assert.equal(await (await w.request("")).text(), "shell");
  const r = await w.request("audio/clip.mp3", "bytes=2-5");
  assert.equal(r.status, 206);
  assert.equal(await r.text(), "3456");
  assert.equal(r.headers.get("Content-Range"), "bytes 2-5/10");
  await w.event("message", { type: "STATUS" });
  assert(w.messages.at(-1).complete);
});
test("new release waits for explicit activation; failed update preserves old release", async () => {
  const cache = storage(),
    v1 = worker({ caches: cache });
  await v1.event("install");
  const broken = worker({
    version: "v2",
    active: true,
    caches: cache,
    failAt: "app.js",
  });
  await assert.rejects(broken.event("install"));
  assert((await cache.keys()).some((x) => x.endsWith(":v1")));
  assert(!(await cache.keys()).some((x) => x.endsWith(":v2")));
  v1.offline();
  assert.equal(await (await v1.request("")).text(), "shell");
  const v2 = worker({ version: "v2", active: true, caches: cache });
  await v2.event("install");
  assert.equal(v2.skipped, false);
  await v2.event("message", { type: "ACTIVATE" });
  assert.equal(v2.skipped, true);
});
test("quota and mixed deployment bytes never report ready", async () => {
  for (const opts of [{ quota: true }, { corrupt: true }]) {
    const w = worker(opts);
    await assert.rejects(w.event("install"));
    assert.equal(w.messages.at(-1).type, "INSTALL_FAILED");
    assert.equal((await w.caches.keys()).length, 0);
  }
});
test("missing cached asset reports incomplete, then repairs without discarding old files", async () => {
  const w = worker();
  await w.event("install");
  const cache = [...w.caches.stores.entries()].find(([name]) =>
    name.endsWith(":audio"),
  )[1];
  cache.delete("https://example.com/Korean/audio/clip.mp3");
  await w.event("message", { type: "STATUS" });
  assert.equal(w.messages.at(-1).complete, false);
  await w.event("message", { type: "REPAIR" });
  assert.equal(w.messages.at(-1).complete, true);
  w.offline();
  assert.equal((await w.request("audio/clip.mp3", "bytes=99-100")).status, 416);
});
