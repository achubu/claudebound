'use strict';
// Offline control-flow probes of the unmodified renderer. No game/browser writes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const source=fs.readFileSync(process.env.HERO_WEAR_SOURCE || path.resolve(__dirname,'../../../../assets/hero-wear.js'),'utf8');
function fixture({fail=false,nullBlob=false}={}){
 const callbacks=[],created=[],revoked=[];let imageLoads=0,failNext=fail;
 const looks={};for(const k of ['A','B','C','D','E','F'])looks[k]={slot:'belt',items:[k],overlay:k+'.png',v:1};
 class Image {constructor(){this.naturalWidth=2304;this.naturalHeight=1024}set src(s){imageLoads++;const error=failNext;failNext=false;queueMicrotask(()=>error?this.onerror():this.onload());}}
 const node={style:{}};const context=vm.createContext({Image,queueMicrotask,HERO_WEAR_DATA:looks,HERO_WEAR_SLOTS:['belt'],state:{gear:{belt:'A'}},ensureGear(){},URL:{createObjectURL(){const u='blob:'+created.length;created.push(u);return u},revokeObjectURL(u){revoked.push(u)}},document:{querySelector(){return node},createElement(){return{getContext(){return{drawImage(){}}},toBlob(cb){if(nullBlob)cb(null);else callbacks.push(cb)}}}}});
 vm.runInContext(source,context);
 const run=s=>vm.runInContext(s,context);const flush=()=>new Promise(setImmediate);
 async function apply(k){run('state.gear.belt='+JSON.stringify(k)+';heroWearApply()');await flush()}
 async function finish(i){callbacks[i]({});await flush()}
 return{run,flush,apply,finish,callbacks,created,revoked,loads:()=>imageLoads};
}
(async()=>{
 const results={};
 {
  const f=fixture({fail:true});await f.apply('A');const before=f.loads();await f.apply('A');
  assert.equal(f.loads(),before);assert.equal(f.run('heroWearFailed.size'),1);
  results.transientImageFailure={firstImageLoads:before,loadsAfterRetry:f.loads(),failedKeys:1,recovered:false};
 }
 {
  const f=fixture({nullBlob:true});await f.apply('A');const before=f.loads();await f.apply('A');
  assert.equal(f.loads(),before);assert.equal(f.run('heroWearUrl'),null);assert.equal(f.run('heroWearFailed.size'),0);
  results.nullBlob={loadsAfterInitial:before,loadsAfterRetry:f.loads(),url:null,recovered:false};
 }
 {
  const f=fixture();await f.apply('A');await f.finish(0);
  for(const k of ['B','C','D','E','F'])await f.apply(k);
  await f.finish(1);await f.finish(2);await f.finish(3);await f.finish(5);
  await f.apply('B');const activeB=f.run('heroWearUrl');
  await f.finish(4); // stale E finishes while oldest cached B is displayed
  assert.equal(f.run('[...heroWearCache.values()].includes(heroWearUrl)'),false);
  await f.apply('C');
  assert(!f.revoked.includes(activeB));assert.notEqual(f.run('heroWearUrl'),activeB);
  const live=f.created.filter(u=>!f.revoked.includes(u));
  results.staleCompletionEviction={created:f.created.length,revoked:f.revoked.length,cacheEntries:f.run('heroWearCache.size'),liveUrls:live.length,orphanedUrl:activeB};
  assert.equal(live.length,5);assert.equal(f.run('heroWearCache.size'),4);
 }
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
