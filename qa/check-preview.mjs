import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=path.resolve('dist');
const base='/amnaya-preview';
let routes=0;
async function check(directory) {
  for (const entry of await fs.readdir(directory,{withFileTypes:true})) {
    const target=path.join(directory,entry.name);
    if (entry.isDirectory()) {await check(target);continue;}
    if (entry.name==='index.html') {
      const html=await fs.readFile(target,'utf8');
      assert.match(html,/noindex, nofollow, noarchive/);
      for (const [,url] of html.matchAll(/(?:href|src)="(\/[^"#]+)"/g)) {
        assert.ok(url.startsWith(`${base}/`),`Hosted URL escaped project path: ${url}`);
        if (/\.(?:js|css|webp|png|ttf)$/.test(url)) await fs.access(path.join(root,decodeURIComponent(url.slice(base.length))));
      }
      routes++;
    }
    if (entry.name.endsWith('.js')) new vm.Script(await fs.readFile(target,'utf8'));
  }
}
await check(root);
assert.equal(routes,35);
const catalogContext={window:{}};
vm.runInNewContext(await fs.readFile(path.join(root,'catalog.js'),'utf8'),catalogContext);
for (const record of [...catalogContext.window.AMNAYA_CATALOG,...catalogContext.window.AMNAYA_JOURNAL]) {
  assert.ok(record.image.startsWith(`${base}/assets/`));
  await fs.access(path.join(root,record.image.slice(base.length)));
}
const storefront=await fs.readFile(path.join(root,'storefront.js'),'utf8');
assert.ok(storefront.includes('const sitePathname = () =>'));
assert.ok(storefront.includes(`href="${base}/collections/new-in"`));
assert.ok(storefront.includes(`a[href^="${base}/products/"]`));
for (const name of ['README.md','qa','server.mjs','.local','.git']) await assert.rejects(fs.access(path.join(root,name)));
console.log(JSON.stringify({passed:true,staticRoutes:routes,base,checks:['Project-path links','Direct route entry files','Local assets','Compiled JavaScript syntax','Concept preview noindex','Private working files excluded']}));
