import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import type {CreatedShare} from '../../packages/contracts/src';
const output=process.env.REPORT_TEST_OUTPUT??'.local/task08';
async function login(page:Page){await page.goto('/sign-in');await page.getByLabel('Email',{exact:true}).fill('manager.north@example.test');await page.getByLabel('Password',{exact:true}).fill(process.env.SEED_PASSWORD!);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:/Projects/})).toBeVisible();}
async function newReport(page:Page){
 const f=JSON.parse(await readFile(output+'/fixture.json','utf8')),prefix=`/bff/v1/organizations/${f.scope.organizationId}/projects/${f.projectId}`,origin=new URL(page.url()).origin;
 const p=await(await page.request.get(prefix)).json(),run=(await(await page.request.get(prefix+'/checklist')).json()).run,comp=(await(await page.request.get(prefix+'/proof')).json()).composition;
 const r=await page.request.post(prefix+'/reports',{headers:{origin,'idempotency-key':randomUUID()},data:{projectVersion:p.version,checklistVersion:run.version,compositionVersion:comp.version,mediaIds:[f.before,f.after]}});expect(r.status()).toBe(200);const report=await r.json();
 await expect.poll(async()=>(await(await page.request.get(prefix+'/reports/'+report.id)).json()).state,{timeout:30000}).toBe('ready');return {f,prefix,report,origin};
}
// Set the fragment before hydration without putting bearer secrets in Playwright
// navigation diagnostics. Trace/video are disabled; the page scrubs it immediately.
async function openGuest(page:Page,s:CreatedShare){
 await page.addInitScript(({id,token})=>{if(location.pathname==='/share/'+id)history.replaceState(null,'',location.pathname+'#'+token);},{id:s.share.id,token:s.token});
 const r=await page.goto('/share/'+s.share.id);expect(r?.headers()['referrer-policy']).toBe('no-referrer');await expect(page.getByRole('heading',{name:`Report revision ${s.share.report.revision}`,exact:true})).toBeVisible();expect(new URL(page.url()).hash).toBe('');
}
test('one-time manager link, lost response recovery, narrow customer correction, real PDF and manager review',async({page,browser})=>{
 test.skip(process.env.TASK08_ISOLATED!=='true','Requires isolated report fixtures and worker');
 await login(page);const {f,prefix,report,origin}=await newReport(page);
 await page.goto(`/org/${f.scope.organizationId}/projects/${f.projectId}`);await page.getByRole('button',{name:`Sharing & decisions for r${report.revision}`,exact:true}).click();const panel=page.locator('.sharing-panel');
 let lost=true;const keys:string[]=[];await page.route('**'+prefix+'/reports/'+report.id+'/shares',async route=>{keys.push(route.request().headers()['idempotency-key']!);const response=await route.fetch();if(lost){lost=false;await route.fulfill({status:502,contentType:'application/json',body:'{"code":"UPSTREAM_UNAVAILABLE"}'});}else await route.fulfill({response});});
 await panel.getByRole('button',{name:`Create private link for r${report.revision}`}).click();await panel.getByRole('button',{name:'Retry identical sharing command'}).click();await expect(panel.getByText('The one-time link is unavailable.',{exact:false})).toBeVisible();expect(keys.length).toBe(2);expect(keys[0]).toBe(keys[1]);
 const lostShares=await(await page.request.get(prefix+'/reports/'+report.id+'/sharing')).json();expect(lostShares.shares.length).toBe(1);await panel.getByRole('button',{name:/Revoke share/}).click();await expect(panel.getByText(/· revoked ·/)).toBeVisible();await page.unroute('**'+prefix+'/reports/'+report.id+'/shares');
 // Capture the actual copy UI in test memory, not the OS clipboard or an artifact.
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value:string)=>{(window as unknown as {copied?:string}).copied=value;}}});});
 await panel.getByRole('button',{name:`Create private link for r${report.revision}`}).click();await panel.getByRole('button',{name:'Copy private link once'}).click();await expect(panel.getByRole('button',{name:'Copy private link once'})).toHaveCount(0);
 const link=await page.evaluate(()=>{const w=window as unknown as {copied?:string};const v=w.copied;delete w.copied;return v;});expect(!!link).toBe(true);const url=new URL(link!);const workspace=await(await page.request.get(prefix+'/reports/'+report.id+'/sharing')).json();const share=workspace.shares.find((s:{id:string})=>s.id===url.pathname.split('/').pop());const capability:CreatedShare={share,token:url.hash.slice(1)};
 expect((await page.content()).includes(capability.token!)).toBe(false);
 const ctx=await browser.newContext({viewport:{width:390,height:844},baseURL:origin}),guest=await ctx.newPage();const observed:{url:string;cookie:boolean;referrer:boolean}[]=[];guest.on('request',r=>{if(r.url().includes('/guest/v1/'))observed.push({url:r.url(),cookie:!!r.headers().cookie,referrer:!!r.headers().referer});});
 await openGuest(guest,capability);const downloadPromise=guest.waitForEvent('download');await guest.getByRole('button',{name:`Download exact PDF r${report.revision}`}).click();const download=await downloadPromise;const path=await download.path();expect(createHash('sha256').update(await readFile(path!)).digest('hex')).toBe(share.report.sha256);
 await guest.getByLabel('Your name (unverified)').fill('<img src=x onerror=alert(1)> Customer');await guest.getByLabel('Decision',{exact:true}).selectOption('correction');await guest.getByLabel('Corrections requested (required)').fill('Please correct the seal shown on page 2.\nThis applies only to this revision.');await guest.getByRole('checkbox').check();await guest.getByRole('button',{name:'Review decision before submitting'}).click();
 await expect(guest.getByRole('heading',{name:`Confirm correction request · r${report.revision}`})).toBeVisible();await guest.screenshot({path:output+'/guest-confirmation-narrow.png',fullPage:true});
 let drop=true;const decisionKeys:string[]=[];await guest.route('**/guest/v1/shares/*/decisions',async route=>{decisionKeys.push(route.request().headers()['idempotency-key']!);const response=await route.fetch();if(drop){drop=false;await route.fulfill({status:502,contentType:'application/json',body:'{"code":"UPSTREAM_UNAVAILABLE"}'});}else await route.fulfill({response});});
 await guest.getByRole('button',{name:'Confirm and record decision'}).click();await guest.getByRole('button',{name:'Retry identical decision'}).click();await expect(guest.getByText('Your decision was recorded',{exact:false})).toBeVisible();expect(decisionKeys.length).toBe(2);expect(decisionKeys[0]).toBe(decisionKeys[1]);
 expect(observed.every(r=>!r.cookie&&!r.referrer&&!r.url.includes(capability.token!))).toBe(true);expect(await guest.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});expect(await guest.locator('img').count()).toBe(0);expect(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(panel.getByRole('heading',{name:`Correction requested · report r${report.revision}`})).toBeVisible({timeout:15000});await panel.getByLabel('Internal review note').fill('Manager will issue a corrected report revision.');await panel.getByRole('button',{name:'Record manager review'}).click();await expect(panel.getByText(/Internal review note: Manager/)).toBeVisible();await panel.screenshot({path:output+'/manager-review.png'});
 await panel.getByRole('button',{name:'Revoke share '+share.id.slice(0,8)}).click();await guest.getByRole('button',{name:`Download exact PDF r${report.revision}`}).click();await expect(guest.getByRole('heading',{name:'Report access unavailable'})).toBeVisible();await expect(guest.getByText(share.report.title,{exact:true})).toHaveCount(0);await ctx.close();
});
test('guest scopes fence late reads, link changes, manager cookies, refresh and revoked metadata',async({page,browser})=>{
 test.skip(process.env.TASK08_ISOLATED!=='true','Requires isolated report fixtures and worker');
 await login(page);const {prefix,report,origin}=await newReport(page);
 const {report:other}=await newReport(page);
 async function create(id=report.id){const r=await page.request.post(prefix+'/reports/'+id+'/shares',{headers:{origin,'idempotency-key':randomUUID()},data:{expiresAt:new Date(Date.now()+86400000).toISOString()}});expect(r.status()).toBe(200);return await r.json() as CreatedShare;}
 const a=await create(),b=await create(other.id);const ctx=await browser.newContext({baseURL:origin}),guest=await ctx.newPage();await ctx.addCookies(await page.context().cookies());
 let unblock:(()=>void)|undefined;const gate=new Promise<void>(r=>{unblock=r;});await guest.route(`**/guest/v1/shares/${a.share.id}`,async route=>{const response=await route.fetch();await gate;try{await route.fulfill({response});}catch{/* Navigation correctly cancelled delivery. */}});
 await guest.addInitScript(({id,token})=>{if(location.pathname==='/share/'+id)history.replaceState(null,'',location.pathname+'#'+token);},{id:a.share.id,token:a.token});
 await guest.goto('/share/'+a.share.id);await expect(guest.getByRole('heading',{name:'Opening private report…'})).toBeVisible();
 // Same-origin app-router navigation exercises mounted provider replacement.
 await guest.evaluate(({id,token})=>{history.pushState(null,'','/share/'+id+'#'+token);dispatchEvent(new PopStateEvent('popstate'));},{id:b.share.id,token:b.token});
 await expect(guest.getByRole('heading',{name:`Report revision ${other.revision}`,exact:true})).toBeVisible();unblock!();await guest.unroute(`**/guest/v1/shares/${a.share.id}`);
 await guest.getByLabel('Your name (unverified)').fill('Acceptance test customer');await guest.getByRole('checkbox').check();await guest.getByRole('button',{name:'Review decision before submitting'}).click();await guest.getByRole('button',{name:'Confirm and record decision'}).click();await expect(guest.getByText('Acceptance recorded',{exact:false})).toBeVisible();
 const read=await guest.request.get('/guest/v1/shares/'+b.share.id);expect(read.status()).toBe(404); // Manager cookie is insufficient.
 await page.request.post(prefix+'/reports/'+other.id+'/shares/'+b.share.id+'/revoke',{headers:{origin,'idempotency-key':randomUUID()}});
 await guest.getByRole('button',{name:`Download exact PDF r${other.revision}`}).click();await expect(guest.getByRole('heading',{name:'Report access unavailable'})).toBeVisible();
 await guest.goto('/');await expect(guest.getByRole('heading',{name:/Projects/})).toBeVisible();await guest.goto('/share/'+b.share.id);await expect(guest.getByRole('heading',{name:'Open your complete private link'})).toBeVisible();await expect(guest.getByText(b.share.report.title,{exact:true})).toHaveCount(0);await ctx.close();
});
