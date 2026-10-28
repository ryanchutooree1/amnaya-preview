import fs from "node:fs/promises";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = {window:{}};
vm.runInNewContext(await fs.readFile(new URL("../catalog.js",import.meta.url),"utf8"),context);
const catalogue = context.window.AMNAYA_CATALOG;
const journal = context.window.AMNAYA_JOURNAL;
const ids = new Set(catalogue.map(piece=>piece.id));
assert.equal(ids.size,catalogue.length,"Catalogue identifiers must be unique");
const assets = new Set();
for (const piece of catalogue) {
  assert.ok(piece.sizes.length,"Every piece needs a valid fit preference");
  assets.add(piece.image);
  await fs.access(new URL(`..${piece.image}`,import.meta.url));
}
for (const article of journal) {
  assets.add(article.image);
  for(const id of article.products) assert.ok(ids.has(id),`Journal link must name an existing piece: ${id}`);
}
const html = await fs.readFile(new URL("../index.html",import.meta.url),"utf8");
const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(htmlIds).size,htmlIds.length,"Static document IDs must be unique");
const routes = ["/","/gifting","/your-edit","/journal",...catalogue.map(piece=>`/products/${piece.id}`),...journal.map(article=>`/journal/${article.slug}`),...["all","new-in","everyday","saris","occasion","objects","island-edit"].map(slug=>`/collections/${slug}`),...["our-story","craft","contact","how-to-order","fit","care","delivery","privacy","faq"].map(slug=>`/pages/${slug}`)];
await Promise.all(routes.map(async route=>{
  const response=await fetch(`http://localhost:4173${route}`);
  assert.equal(response.status,200,`Route must serve: ${route}`);
  assert.ok((await response.text()).includes('src="/catalog.js"'),`Deep route must use root-relative resources: ${route}`);
}));
await Promise.all([...assets].map(async asset=>{
  const response=await fetch(`http://localhost:4173${asset}`,{method:"HEAD"});
  assert.equal(response.status,200,`Image must serve: ${asset}`);
  assert.match(response.headers.get("content-type"),/^image\/webp/);
}));
for(const route of ["/catalog.js","/storefront.js","/storefront.css","/styles.css","/tokens.css"]){
  const response=await fetch(`http://localhost:4173${route}`,{method:"HEAD"});
  assert.equal(response.status,200,`Application asset must serve: ${route}`);
}
assert.equal((await fetch("http://localhost:4173/README.md")).status,404,"Project notes are not public site files");
const report={passed:true,routes:routes.length,products:catalogue.length,journalArticles:journal.length,uniqueImages:assets.size,checks:["Catalogue references and image files","Journal product links","Unique static HTML IDs","Deep-route HTML and root-relative resources","WebP asset availability and MIME types","Application asset availability","Private project-note isolation"]};
await fs.writeFile(new URL("storefront-checks.json",import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
