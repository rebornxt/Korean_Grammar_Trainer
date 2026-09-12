// VERSION and ASSETS are generated together. Each response is checked before commit.
const PREFIX = "hangeul-om:" + self.registration.scope + ":";
const CACHE = PREFIX + VERSION;
const AUDIO_CACHE = PREFIX + "audio";
const absolute = (p) => new URL(p, self.registration.scope).href;
async function tell(data) {
  for (const c of await self.clients.matchAll({ includeUncontrolled: true }))
    c.postMessage(data);
}
async function download(cache, asset) {
  if (asset.path.endsWith(".mp3")) {
    cache = await caches.open(AUDIO_CACHE);
    const prior = await cache.match(absolute(asset.path));
    if (prior) {
      const priorHash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", await prior.arrayBuffer()),
        ),
        (x) => x.toString(16).padStart(2, "0"),
      ).join("");
      if (priorHash === asset.sha256) return;
    }
  }
  const response = await fetch(absolute(asset.path), { cache: "no-store" });
  if (!response.ok) throw Error("Download failed");
  const bytes = await response.clone().arrayBuffer();
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== asset.sha256) throw Error("Version mismatch");
  await cache.put(absolute(asset.path), response);
}
async function complete() {
  const c = await caches.open(CACHE);
  for (const a of ASSETS) {
    const store = a.path.endsWith(".mp3") ? await caches.open(AUDIO_CACHE) : c;
    if (!(await store.match(absolute(a.path)))) return false;
  }
  return true;
}
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const c = await caches.open(CACHE);
        for (const a of ASSETS) await download(c, a);
        if (!self.registration.active) await self.skipWaiting();
      } catch (e) {
        await caches.delete(CACHE);
        await tell({ type: "INSTALL_FAILED" });
        throw e;
      }
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Modules are eagerly loaded; older open pages only need shared audio.
      for (const name of await caches.keys())
        if (name.startsWith(PREFIX) && name !== CACHE && name !== AUDIO_CACHE)
          await caches.delete(name);
      await tell({
        type: "STATUS",
        complete: await complete(),
        version: VERSION,
      });
    })(),
  ),
);
// Immutable clips are shared between releases and retained for older open tabs.
self.addEventListener("message", (event) => {
  event.waitUntil(
    (async () => {
      if (event.data?.type === "ACTIVATE" && (await complete()))
        await self.skipWaiting();
      if (event.data?.type === "VERSION")
        event.source?.postMessage({ type: "VERSION", version: VERSION });
      if (event.data?.type === "REPAIR") {
        try {
          const c = await caches.open(CACHE);
          for (const a of ASSETS)
            if (
              !(await (
                a.path.endsWith(".mp3") ? await caches.open(AUDIO_CACHE) : c
              ).match(absolute(a.path)))
            )
              await download(c, a);
        } catch {
          await tell({ type: "INSTALL_FAILED" });
        }
      }
      if (["STATUS", "REPAIR"].includes(event.data?.type))
        event.source?.postMessage({
          type: "STATUS",
          complete: await complete(),
          version: VERSION,
        });
    })(),
  );
});
async function ranged(response, range) {
  if (!range) return response;
  const bytes = await response.arrayBuffer();
  const m = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!m || (!m[1] && !m[2]))
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${bytes.byteLength}` },
    });
  let start = m[1]
    ? Number(m[1])
    : Math.max(0, bytes.byteLength - Number(m[2]));
  let end = m[1]
    ? m[2]
      ? Math.min(Number(m[2]), bytes.byteLength - 1)
      : bytes.byteLength - 1
    : bytes.byteLength - 1;
  if (start > end || start >= bytes.byteLength)
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${bytes.byteLength}` },
    });
  return new Response(bytes.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${bytes.byteLength}`,
    },
  });
}
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!url.href.startsWith(self.registration.scope)) return;
  event.respondWith(
    (async () => {
      const c = await caches.open(CACHE);
      const key =
        event.request.mode === "navigate" ? absolute("index.html") : url.href;
      let cached = await c.match(key);
      if (!cached && url.pathname.endsWith(".mp3")) {
        cached = await (await caches.open(AUDIO_CACHE)).match(key);
      }
      if (cached)
        return url.pathname.endsWith(".mp3")
          ? ranged(cached, event.request.headers.get("Range"))
          : cached;
      return fetch(event.request);
    })(),
  );
});
