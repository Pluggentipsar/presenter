import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { checkComfyServer, comfyFetch, normalizeServerUrl, resolveComfyServer, saveComfyServer } from "./comfy-client.mjs";

test("serverval och nätverksfel utan att skicka jobb till fel dator", async (t) => {
  const tempRoot = path.resolve(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(tempRoot, "comfy-client-test-"));
  const file = path.join(dir, "comfyui.json");
  const env = { COMFYUI_CONFIG: file };
  let redirectedRequests = 0;
  let postedJobs = 0;
  let flakyReads = 0;
  let interruptedFiles = 0;
  const stats = { system: { comfyui_version: "test" }, devices: [{ name: "Test GPU" }] };
  const server = http.createServer((req, res) => {
    if (req.url.startsWith("/flaky")) {
      flakyReads++;
      if (flakyReads === 1) { res.writeHead(503); res.end(); return; }
    }
    if (req.url === "/file") {
      interruptedFiles++;
      if (interruptedFiles === 1) {
        res.writeHead(200, { "content-length": "100" });
        res.write("delvis");
        setImmediate(() => res.destroy());
      } else { res.end("hela filen"); }
      return;
    }
    if (req.url.startsWith("/slow")) return;
    if (req.url === "/prompt") { postedJobs++; return; }
    if (req.url.startsWith("/redirect")) { res.writeHead(302, { Location: "/unexpected" }); res.end(); return; }
    if (req.url === "/unexpected") redirectedRequests++;
    if (req.url.startsWith("/broken")) { res.writeHead(503); res.end(); return; }
    if (req.url.startsWith("/html")) { res.end("<html>Logga in</html>"); return; }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(stats));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    assert.equal(path.dirname(path.resolve(dir)), tempRoot);
    assert.ok(path.basename(dir).startsWith("comfy-client-test-"));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  await t.test("lokal standard, sparad adress och uttryckliga val har rätt företräde", async () => {
    assert.equal(resolveComfyServer(undefined, env).url, "http://127.0.0.1:8188");
    await saveComfyServer(`${url}/`, env);
    assert.equal(resolveComfyServer(undefined, env).url, url);
    const overridden = { ...env, COMFYUI_URL: "https://env.example.test" };
    assert.equal(resolveComfyServer(undefined, overridden).url, overridden.COMFYUI_URL);
    assert.equal(resolveComfyServer("https://explicit.example.test/", overridden).url, "https://explicit.example.test");
  });

  await t.test("felaktig eller otillgänglig server ersätter inte sparad adress", async () => {
    const saved = fs.readFileSync(file, "utf8");
    await assert.rejects(saveComfyServer(`${url}/broken`, env), /503/);
    await assert.rejects(saveComfyServer(`${url}/html`, env), /inte med ComfyUI-data/);
    assert.equal(fs.readFileSync(file, "utf8"), saved);
  });

  await t.test("trasig konfiguration skickar inte jobb till localhost som reserv", () => {
    fs.writeFileSync(file, "{ trasig JSON");
    assert.throws(() => resolveComfyServer(undefined, env), /Kan inte läsa/);
    assert.equal(resolveComfyServer(url, env).url, url);
  });

  await t.test("fel adressformat och inbäddade hemligheter avvisas", () => {
    for (const bad of [true, "", "comfy:8188", "ftp://host", "https://user:secret@host", "https://host?token=secret", "https://host#x"]) {
      assert.throws(() => normalizeServerUrl(bad));
    }
    assert.equal(normalizeServerUrl("https://comfy.example.test:8443/api/"), "https://comfy.example.test:8443/api");
  });

  await t.test("en svarande ComfyUI identifieras med GPU-information", async () => {
    assert.deepEqual(await checkComfyServer(url), stats);
  });

  await t.test("omdirigering följs inte till en annan tjänst", async () => {
    await assert.rejects(checkComfyServer(`${url}/redirect`), /Kunde inte nå/);
    assert.equal(redirectedRequests, 0);
  });

  await t.test("en server som hänger får en begränsad väntetid", async () => {
    await assert.rejects(checkComfyServer(`${url}/slow`, { timeoutMs: 100 }), /tidsgränsen/);
  });

  await t.test("ett osäkert POST-resultat köas inte automatiskt igen", async () => {
    await assert.rejects(comfyFetch(`${url}/prompt`, { method: "POST", body: "{}", timeoutMs: 100 }), /tidsgränsen/);
    assert.equal(postedJobs, 1);
  });

  await t.test("ett tillfälligt serverfel återhämtas vid läsning", async () => {
    assert.deepEqual(await checkComfyServer(`${url}/flaky`), stats);
    assert.equal(flakyReads, 2);
  });

  await t.test("en avbruten filöverföring hämtas färdigt vid nästa försök", async () => {
    const data = await comfyFetch(`${url}/file`, { readAs: "buffer" });
    assert.equal(data.toString(), "hela filen");
    assert.equal(interruptedFiles, 2);
  });
});
