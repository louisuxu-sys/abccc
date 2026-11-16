import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const pass = 'test-local-router-pass';
const child = spawn(process.execPath, ['work/traffic-router/server.mjs'], {
  env: {...process.env, ADMIN_PASSWORD: pass, DB_PATH: ':memory:', PORT: '0', ROUTER_PROXY_SECRET:'local-test-secret'},
  stdio: ['ignore','pipe','inherit'],
});
try {
  const [chunk] = await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('Startup failed');})]);
  const base = new URL(chunk.toString().trim()).origin;
  const authorization = 'Basic '+Buffer.from('admin:'+pass).toString('base64');
  const get = (path, headers={}) => fetch(base+path,{redirect:'manual',headers});
  const admin = (query='') => get('/admin'+query,{authorization});
  assert.equal((await get('/admin')).status,401);
  const create = await (await admin('?new=1')).text();
  const csrf = create.match(/name="csrf" value="([^"]+)"/)[1];
  const submit = (query, form) => fetch(base+'/admin'+query,{method:'POST',redirect:'manual',headers:{authorization},body:new URLSearchParams({csrf,...form})});
  const route = {title:'Test route',slug:'promo',mode:'redirect',a:'https://example.com/a',b:'https://example.com/b',platform:'Facebook',enabled:'1',weight:'0'};
  assert.equal((await submit('?new=1',route)).status,303);
  assert.match(await (await admin()).text(),/Test route.*Facebook/s);
  const link = await (await admin('?link=promo')).text();
  assert.ok(link.includes(base+'/r/promo'));
  assert.equal((await get('/r/promo?utm_source=mail')).headers.get('location'),'https://example.com/b?utm_source=mail');
  const rules = {action:'rules',original:'promo',countries:'TW',regions:'Taipei',device:'mobile',asns:'AS64500'};
  assert.equal((await submit('?rules=promo',{...rules,start:'22:00'})).status,400);
  assert.equal((await submit('?rules=promo',rules)).status,303);
  const metadata = {'x-router-country':'TW','x-router-region':'Taipei','x-router-asn':'64501','user-agent':'iPhone'};
  assert.equal((await get('/r/promo',metadata)).headers.get('location'),'https://example.com/a');
  assert.equal((await get('/r/promo',{...metadata,'x-router-secret':'local-test-secret'})).headers.get('location'),'https://example.com/b');
  assert.match(await (await admin('?overview=1')).text(),/Test route.*<td>1<\/td><td>2<\/td>/s);
  assert.equal((await submit('?edit=promo',{...route,original:'promo',enabled:'0'})).status,303);
  assert.equal((await get('/r/promo')).status,404);
  assert.equal((await submit('?delete=promo',{action:'delete',original:'promo'})).status,303);
  assert.ok(!(await (await admin()).text()).includes('Test route'));
  console.log('Passed real HTTP: route creation, rules, trusted metadata, promotion URL, UTM, counts, pause, delete');
} finally { child.kill(); }
