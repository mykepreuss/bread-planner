import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const origin=new URL(process.argv[2]||'https://bread.assemblydigital.com').origin;
assert.ok(origin.startsWith('https://'),'Verification requires HTTPS');
const checks=[],queue=[],seen=new Set();
async function request(path){const r=await fetch(new URL(path,origin),{signal:AbortSignal.timeout(30000)});return {response:r,bytes:Buffer.from(await r.arrayBuffer())};}
function enqueue(ref,base='/'){
 if(!ref||ref.startsWith('data:'))return;
 const url=new URL(ref,new URL(base,origin));
 if(url.origin===origin&&(url.pathname.startsWith('/_astro/')||url.pathname==='/favicon.svg')&&!seen.has(url.pathname)){seen.add(url.pathname);queue.push(url.pathname);}
}
async function asset(path){const remote=await request(path);if(remote.response.status!==200)throw new Error(`${path}: expected200, received${remote.response.status}`);return remote;}
const index=await request('/');assert.equal(index.response.status,200);const html=index.bytes.toString();
assert.match(html,/<h1>Bread Planner<\/h1>/);assert.match(html,/<astro-island/);assert.match(html,/https:\/\/bread\.assemblydigital\.com\//);assert.equal(index.response.headers.get('x-content-type-options'),'nosniff');
checks.push({path:'/',status:200,astro:true,secureHeaders:true});
for(const match of html.matchAll(/(?:src|href|component-url|renderer-url)="([^"]+)"/g))enqueue(match[1]);
for(let i=0;i<queue.length;i++){
 const path=queue[i],remote=await asset(path),text=remote.bytes.toString();
 if(path.endsWith('.js'))for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\()(["'])(\.?\.?\/[^"'\s]+\.js)\1/g))enqueue(match[2],path);
 if(path.endsWith('.css'))for(const match of text.matchAll(/url\(["']?([^"')]+)["']?\)/g))enqueue(match[1],path);
 checks.push({path,status:200,sha256:createHash('sha256').update(remote.bytes).digest('hex'),bytes:remote.bytes.length});
}
assert.ok(queue.some(path=>path.endsWith('.css')),'No stylesheet discovered');assert.ok(queue.some(path=>path.includes('/App.')),'No calculator island discovered');assert.ok(queue.some(path=>path.endsWith('.woff2')),'No font discovered');
const missing=await request('/__bread_planner_missing__');assert.equal(missing.response.status,404);assert.match(missing.bytes.toString(),/Page not found/);checks.push({path:'/__bread_planner_missing__',status:404});
// A deliberately missing asset is an isolated negative fixture. The same
// status check used for real assets must reject it before accepting this run.
await assert.rejects(()=>asset('/_astro/__verification_fixture_missing__.js'),/404/);
const result={origin,verifiedAt:new Date().toISOString(),negativeFixtureRejected:true,checks};await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});await writeFile(new URL('../artifacts/live-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({origin,checks:checks.length,assets:queue.length,negativeFixtureRejected:true,status:'PASS'},null,2));
