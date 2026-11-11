import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

const base = process.argv[2] || 'http://localhost:8807';
const origin = 'https://bridge.abelai.app';
const results = [];
for (const path of ['/', '/en', '/zh', '/bridge', '/history']) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, `${path} status`);
  const html = await response.text();
  const canonical = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((match) => match[1]);
  // "/" and "/en" are the same English page; "/" is canonical for both.
  assert.deepEqual(canonical, [path === '/' || path === '/en' ? origin : `${origin}${path}`], `${path} canonical`);
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  assert.ok(title, `${path} title`);
  if (['/', '/en', '/zh'].includes(path)) {
    assert.ok(html.includes(`<html lang="${path === '/zh' ? 'zh-CN' : 'en'}"`), `${path} server language`);
    assert.equal([...html.matchAll(/id="faq-answer-\d"/g)].length, 5, `${path} server FAQ answers`);
    for (const [language, target] of [['en', ''], ['zh-CN', '/zh'], ['x-default', '']]) {
      assert.ok(html.includes(`<link rel="alternate" hrefLang="${language}" href="${origin}${target}"`), `${path} ${language} alternate`);
    }
    assert.ok(html.includes('https://promptvault.abelai.app/'), `${path} footer product link`);
    assert.ok(html.includes(path === '/zh' ? '标准转账免费' : 'Standard Transfer is free'), `${path} FAQ text`);
    assert.ok(!html.includes('name="robots" content="noindex'), `${path} indexable`);
  }
  if (path === '/bridge') assert.ok(title.includes('Bridge USDC with Circle CCTP V2'));
  if (path === '/history') assert.ok(html.includes('name="robots" content="noindex, follow"'));
  const row = { path, status: response.status, title, canonical: canonical[0] };
  if (path === '/' || path === '/bridge') {
    const scripts = [...new Set([...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]))];
    const assets = await Promise.all(scripts.map(async (url) => Buffer.from(await (await fetch(new URL(url, base))).arrayBuffer())));
    row.scriptCount = scripts.length;
    row.jsBytes = assets.reduce((sum, asset) => sum + asset.length, 0);
    row.gzipBytes = assets.reduce((sum, asset) => sum + gzipSync(asset).length, 0);
  }
  results.push(row);
}
for (const language of ['en', 'zh']) {
  const response = await fetch(`${base}/?lang=${language}`, { redirect: 'manual' });
  assert.equal(response.status, 307, `legacy ${language} redirect`);
  assert.equal(new URL(response.headers.get('location'), base).pathname, `/${language}`);
}
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
assert.ok(!sitemap.includes('/history'), 'History excluded from sitemap');
for (const path of ['/', '/zh', '/bridge']) assert.ok(sitemap.includes(`${origin}${path}`));
assert.ok(!sitemap.includes(`${origin}/en<`), '/en (duplicate of /) excluded from sitemap');
assert.equal((await fetch(`${base}/fr`)).status, 404, 'Unknown locale returns 404');
console.log(JSON.stringify({ base, checks: 'passed', pages: results }, null, 2));
