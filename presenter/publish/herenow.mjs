import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
const API = 'https://here.now';
const stateRoot = path.resolve(import.meta.dirname, '../.herenow');
class HereNowError extends Error {
  constructor(method, endpoint, status, body) { super(`${method} ${endpoint}: ${status} ${JSON.stringify(body)}`); this.status = status; this.body = body; }
}
export async function api(endpoint, body, method = body === undefined ? 'GET' : 'POST') {
  const key = process.env.HERENOW_API_KEY || (await fs.readFile(path.join(os.homedir(), '.herenow/credentials'), 'utf8')).trim();
  const response = await fetch(API + endpoint, {
    // here.now vill veta vilket verktyg som publicerar (codex, claude-code …). Sätt HERENOW_CLIENT; standard som förut.
    method, headers: { Authorization: `Bearer ${key}`, 'X-HereNow-Client': process.env.HERENOW_CLIENT || 'codex/presenter', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok) throw new HereNowError(method, endpoint, response.status, result);
  return result;
}
export async function loadState(name) {
  try { return JSON.parse(await fs.readFile(path.join(stateRoot, name + '.json'), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
}
export async function saveState(name, state) {
  await fs.mkdir(stateRoot, { recursive: true });
  await fs.writeFile(path.join(stateRoot, name + '.json'), JSON.stringify(state, null, 2));
}
async function finalizeVersion(slug, versionId) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try { return await api(`/api/v1/publish/${slug}/finalize`, { versionId }); }
    catch (e) {
      if (e.body?.code !== 'finalize_in_flight' && e.status !== 429 && e.status < 500) throw e;
      if (attempt === 5) throw e;
      console.log(`Waiting for here.now to finalize the same version (${attempt + 1}/6).`);
      await new Promise(resolve => setTimeout(resolve, Math.min(30000, Math.max(2000, (e.body?.retry_after || 5) * 1000))));
    }
  }
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.md': 'text/markdown; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.ico': 'image/x-icon' };
async function walk(root, dir = root) {
  const result = [];
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...await walk(root, file));
    else if (item.isFile()) {
      const bytes = await fs.readFile(file);
      result.push({ path: path.relative(root, file).replaceAll('\\', '/'), size: bytes.length, contentType: types[path.extname(file)] || 'application/octet-stream', hash: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  return result;
}
export async function publish(directory, name, displayName) {
  let state = await loadState(name);
  if (state.pendingVersionId) {
    const live = await api(`/api/v1/publish/${state.slug}`);
    if (live.currentVersionId !== state.pendingVersionId) await finalizeVersion(state.slug, state.pendingVersionId);
    const resumed = await api(`/api/v1/publish/${state.slug}`);
    state = { ...state, versionId: resumed.currentVersionId };
    delete state.pendingVersionId;
    await saveState(name, state);
  }
  const files = await walk(directory);
  if (!files.some(f => f.path === 'index.html')) throw new Error('Missing index.html');
  if (files.length > 2500) throw new Error('More than 2500 files');
  if (state.slug) {
    const live = await api(`/api/v1/publish/${state.slug}`);
    if (state.versionId && state.versionId !== live.currentVersionId) throw new Error('Live version has changed; reconcile before publishing.');
  }
  const stage = await api(`/api/v1/publish${state.slug ? '/' + state.slug : ''}`, { files, displayName, ...(state.versionId ? { baseVersionId: state.versionId } : {}) }, state.slug ? 'PUT' : 'POST');
  await saveState(name, { ...state, slug: stage.slug, siteUrl: stage.siteUrl, pendingVersionId: stage.upload.versionId });
  const queue = [...stage.upload.uploads];
  let uploaded = 0;
  await Promise.all(Array.from({ length: Math.min(queue.length, 6) }, async () => {
    for (let target; (target = queue.shift());) {
      const url = new URL(target.url);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.r2.cloudflarestorage.com')) throw new Error('Unexpected upload host');
      const data = await fs.readFile(path.join(directory, target.path));
      let ok = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(url, { method: 'PUT', headers: target.headers, body: data, signal: AbortSignal.timeout(120000) });
        if (response.ok) { ok = true; break; }
        if (attempt === 2) throw new Error(`Upload ${target.path}: ${response.status}`);
      }
      if (ok && ++uploaded % 30 === 0) console.log(`Uploaded ${uploaded}/${stage.upload.uploads.length}`);
    }
  }));
  const finalize = await finalizeVersion(stage.slug, stage.upload.versionId);
  if (finalize.warnings?.length) throw new Error(`Publish warnings: ${JSON.stringify(finalize.warnings)}`);
  const live = await api(`/api/v1/publish/${stage.slug}`);
  const next = { ...state, slug: stage.slug, siteUrl: stage.siteUrl, versionId: live.currentVersionId };
  delete next.pendingVersionId;
  await saveState(name, next);
  console.log(JSON.stringify({ name, ...next, files: files.length, bytes: files.reduce((n, f) => n + f.size, 0) }));
  return next;
}
