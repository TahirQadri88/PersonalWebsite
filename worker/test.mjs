/* Tests for the editor's backend.  Run with:  node test.mjs
   No dependencies and no network — Cloudflare's signing keys and the
   GitHub API are both stood in for, so this runs anywhere Node does.
   The Worker holds a token that can write to the repository, so most of
   these exist to prove it refuses. */
import worker from './src/index.js';

const TEAM='tahirqadri', AUD='aud-tag-123', EMAIL='mtahir001@hotmail.com', FBPROJ='animalhealth-abc12';
const env={ ACCESS_TEAM:TEAM, ACCESS_AUD:AUD, EDITOR_EMAIL:EMAIL,
  GITHUB_OWNER:'TahirQadri88', GITHUB_REPO:'PersonalWebsite', GITHUB_BRANCH:'main',
  GITHUB_TOKEN:'ghp_fake', SITE_ORIGIN:'https://tahirqadri.com.pk' };

// a signing key standing in for Cloudflare's
const kp = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
const KID='kid-1';
const b64u=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
async function mint(over={}, key=kp.privateKey){
  const now=Math.floor(Date.now()/1000);
  const h=b64u({alg:'RS256',kid:KID,typ:'JWT'});
  const p=b64u({aud:[AUD],email:EMAIL,exp:now+3600,iat:now,
    iss:`https://${TEAM}.cloudflareaccess.com`,...over});
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${Buffer.from(sig).toString('base64url')}`;
}

// stand in for the network
let gh=[], blobBodies=[];
/* What the branch already holds, as the tree API would list it. Tests set
   this to say "this file is unchanged" and watch it not be sent. */
let alreadyThere=[], treeSent='{}';
globalThis.fetch = async (url, opts={}) => {
  url=String(url);
  if(url.includes('googleapis.com/service_accounts/v1/jwk/securetoken'))
    return new Response(JSON.stringify({keys:[{...jwk,kid:KID,alg:'RS256'}]}),{status:200,headers:{'content-type':'application/json'}});
  if(url.includes('cloudflareaccess.com/cdn-cgi/access/certs'))
    return new Response(JSON.stringify({keys:[{...jwk,kid:KID,alg:'RS256'}]}),{status:200,headers:{'content-type':'application/json'}});
  if(url.startsWith('https://api.github.com/')){
    gh.push((opts.method||'GET')+' '+url.replace('https://api.github.com/repos/TahirQadri88/PersonalWebsite',''));
    const j=o=>new Response(JSON.stringify(o),{status:200,headers:{'content-type':'application/json'}});
    if(/\/git\/ref\/heads\//.test(url)) return j({object:{sha:'BASESHA'}});
    if(/\/git\/commits\/BASESHA/.test(url)) return j({tree:{sha:'TREESHA'}});
    if(/\/git\/trees\/TREESHA/.test(url)) return j({sha:'TREESHA', truncated:false, tree:alreadyThere});
    if(/\/git\/blobs$/.test(url)) { blobBodies.push(JSON.parse(opts.body)); return j({sha:'BLOB'+gh.length}); }
    if(/\/git\/trees$/.test(url)) { treeSent=opts.body; return j({sha:'NEWTREE'}); }
    if(/\/git\/commits$/.test(url)) return j({sha:'c0ffee1234567890'});
    if(/\/git\/refs\/heads\//.test(url)) return j({});
  }
  if(url.startsWith('https://tahirqadri.com.pk'))
    return new Response('<!doctype html><title>editor</title>',{status:200,headers:{'content-type':'text/html'}});
  throw new Error('unexpected fetch: '+url);
};

const GOOD='window.siteContent = { site:{}, categories:[{id:"a",works:[]}], rulings:[] };';
async function post(files, jwt, msg){
  gh=[]; blobBodies=[];
  const h={'content-type':'application/json'};
  if(jwt) h['Cf-Access-Jwt-Assertion']=jwt;
  const r=await worker.fetch(new Request('https://admin.tahirqadri.com.pk/publish',
    {method:'POST',headers:h,body:JSON.stringify({files,message:msg})}), env);
  return {status:r.status, body:await r.json()};
}
async function mintFb(over={}, key=kp.privateKey){
  const now=Math.floor(Date.now()/1000);
  const h=b64u({alg:'RS256',kid:KID,typ:'JWT'});
  const p=b64u({aud:FBPROJ,email:EMAIL,sub:'uid-123',exp:now+3600,iat:now,
    iss:`https://securetoken.google.com/${FBPROJ}`,...over});
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${Buffer.from(sig).toString('base64url')}`;
}
const fbEnv={...env, ACCESS_TEAM:'', ACCESS_AUD:'', FIREBASE_PROJECT:FBPROJ};
async function postFb(files, jwt){
  gh=[];
  const h={'content-type':'application/json'};
  if(jwt) h['Authorization']='Bearer '+jwt;
  const r=await worker.fetch(new Request('https://admin.tahirqadri.com.pk/publish',
    {method:'POST',headers:h,body:JSON.stringify({files})}), fbEnv);
  return {status:r.status, body:await r.json()};
}

const pass=[],fail=[];
const t=(name,cond,extra='')=> (cond?pass:fail).push(name+(cond?'':'   << '+extra));

let r;
r = await post([{path:'content.js',text:GOOD}], null);
t('no Access token → 401', r.status===401, JSON.stringify(r));

r = await post([{path:'content.js',text:GOOD}], 'not.a.jwt');
t('malformed token → 401', r.status===401, JSON.stringify(r));

const other = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
r = await post([{path:'content.js',text:GOOD}], await mint({}, other.privateKey));
t('token signed by the wrong key → 401', r.status===401, JSON.stringify(r));

r = await post([{path:'content.js',text:GOOD}], await mint({exp:Math.floor(Date.now()/1000)-10}));
t('expired token → 401', r.status===401, JSON.stringify(r));

r = await post([{path:'content.js',text:GOOD}], await mint({aud:['someone-elses-app']}));
t('token for another application → 401', r.status===401, JSON.stringify(r));

r = await post([{path:'content.js',text:GOOD}], await mint({iss:'https://evil.cloudflareaccess.com'}));
t('token from another team → 401', r.status===401, JSON.stringify(r));

r = await post([{path:'content.js',text:GOOD}], await mint({email:'someone@else.com'}));
t('signed in as someone else → 403', r.status===403, JSON.stringify(r));

const JWT = await mint();
r = await post([{path:'../../.github/workflows/evil.yml',text:'x'}], JWT);
t('path traversal refused', r.status===400 && /not a file the editor may write/.test(r.body.message), JSON.stringify(r));

r = await post([{path:'admin.js',text:'x'}], JWT);
t('writing admin.js refused', r.status===400, JSON.stringify(r));

r = await post([{path:'content.js',text:'window.siteContent = { rulings: [] };'}], JWT);
t('content.js with no categories is refused', r.status===400 && /categories/.test(r.body.message), JSON.stringify(r));

/* The malformed shapes the checker can catch by reading rather than
   running — an upload cut short, an edit that drops a brace. */
r = await post([{path:'content.js',text:'window.siteContent = { categories: [ { works: [] } '}], JWT);
t('content.js cut short is refused', r.status===400 && /closing bracket/.test(r.body.message), JSON.stringify(r));

r = await post([{path:'content.js',text:'window.siteContent = { categories: [] } };'}], JWT);
t('content.js with a stray brace is refused', r.status===400 && /stray/.test(r.body.message), JSON.stringify(r));

r = await post([{path:'content.js',text:'window.siteContent = { categories: [{ title: "unclosed }] };'}], JWT);
t('content.js with an unclosed quote is refused', r.status===400 && /quote/.test(r.body.message), JSON.stringify(r));

r = await post([{path:'content.js',text:'window.siteContent = { categories: [] }; /* never closed'}], JWT);
t('content.js with an unclosed comment is refused', r.status===400 && /comment/.test(r.body.message), JSON.stringify(r));

r = await post([{path:'content.js',text:'var x = 1;'}], JWT);
t('content.js that sets nothing is refused', r.status===400 && /siteContent/.test(r.body.message), JSON.stringify(r));

/* And the shapes it must NOT trip over: braces inside strings and
   comments, and apostrophes in the prose. */
r = await post([{path:'content.js',text:'/* a } and a ] in a comment */\nwindow.siteContent = { categories: [{ id: "a", blurb: "a { and a [ and an isn\'t", works: [] }], rulings: [] };'}], JWT);
t('braces inside strings and comments do not trip it', r.status===200, JSON.stringify(r));

/* content.js is two statements now — the record data, then a generated
   search index appended after it — and the checker walks the whole file,
   not just the first statement, so this must still balance. */
r = await post([{path:'content.js',text:GOOD+'\nwindow.siteContent.searchIndex = { "a-post": { text: "some words { not a brace" } };\n'}], JWT);
t('a second statement (the search index) after content.js does not trip it', r.status===200, JSON.stringify(r));

r = await post([{path:'content.js',text:'x'.repeat(600*1024)}], JWT);
t('oversized file refused', r.status===400 && /too large/.test(r.body.message), JSON.stringify(r));

r = await post([], JWT);
t('empty publish refused', r.status===400, JSON.stringify(r));

alreadyThere=[];
r = await post([{path:'content.js',text:GOOD},{path:'sitemap.xml',text:'<urlset/>'},
                {path:'posts/hello-world.html',text:'<h1>hi</h1>'},
                {path:'works/ilm-ul-meerath.html',text:'<h1>hi</h1>'}], JWT);
t('a real publish succeeds', r.status===200 && r.body.sha==='c0ffee1234567890', JSON.stringify(r));
t('  …in exactly one commit', gh.filter(x=>x.startsWith('POST /git/commits')).length===1, gh.join(' | '));
t('  …with all four files', r.body.files.length===4, JSON.stringify(r.body.files));
t('  …and moves the branch once', gh.filter(x=>x.startsWith('PATCH')).length===1, gh.join(' | '));

/* ---- only what changed goes ------------------------------------------

   The editor hands over the whole library every time, on purpose: every
   page is regenerated from content.js so none can drift from the entry it
   came from. Sending all of it is a different matter. It cost a request
   per file, Cloudflare allows fifty in one invocation, and at forty-six
   files a publish died at the very end on "too many subrequests". */

/* git's own sha for a blob, worked out the same way the Worker does, so a
   test can say "this file is already there" truthfully. */
async function gitSha(text){
  const body=new TextEncoder().encode(text);
  const head=new TextEncoder().encode(`blob ${body.length}\0`);
  const all=new Uint8Array(head.length+body.length);
  all.set(head,0); all.set(body,head.length);
  const d=await crypto.subtle.digest('SHA-1',all);
  return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

const PAGE='<!doctype html><title>a post</title>';
alreadyThere=[{type:'blob',path:'content.js',sha:await gitSha(GOOD)},
              {type:'blob',path:'posts/a.html',sha:await gitSha(PAGE)}];

r = await post([{path:'content.js',text:GOOD},{path:'posts/a.html',text:PAGE}], JWT);
t('a publish where nothing differs commits nothing',
  r.status===200 && r.body.sha===null, JSON.stringify(r.body));
t('  …and says so rather than reporting a commit',
  /nothing was published/i.test(r.body.message||''), JSON.stringify(r.body));
t('  …making no commit and moving no branch',
  gh.filter(x=>x.startsWith('POST /git/commits')).length===0 && gh.filter(x=>x.startsWith('PATCH')).length===0,
  gh.join(' | '));

r = await post([{path:'content.js',text:GOOD},{path:'posts/a.html',text:PAGE+'<p>new</p>'}], JWT);
t('a publish where one file differs commits that one file',
  r.status===200 && r.body.files.length===1 && r.body.files[0]==='posts/a.html', JSON.stringify(r.body));
t('  …and the unchanged file is not sent at all',
  !gh.some(x=>x.includes('blobs')) , gh.join(' | '));
t('  …the commit message naming only what changed',
  gh.filter(x=>x.startsWith('POST /git/commits')).length===1, gh.join(' | '));

/* The limit that broke it. A whole library's worth of pages must fit
   inside one invocation's allowance, so text goes into the tree request
   itself rather than a blob apiece. */
alreadyThere=[];
const many=[{path:'content.js',text:GOOD},{path:'sitemap.xml',text:'<urlset/>'}];
for(let i=0;i<22;i++) many.push({path:`works/w${i}.html`,text:`<p>work ${i}</p>`});
for(let i=0;i<22;i++) many.push({path:`posts/p${i}.html`,text:`<p>post ${i}</p>`});
r = await post(many, JWT);
t('a 46-file publish succeeds', r.status===200 && r.body.files.length===46, JSON.stringify(r.body).slice(0,200));
t(`  …in ${gh.length} requests to GitHub, well inside Cloudflare's fifty`,
  gh.length<=12, gh.length+' requests: '+gh.join(' | '));
t('  …with every page written into the tree, not one blob each',
  gh.filter(x=>x.includes('/git/blobs')).length===0, gh.join(' | '));

/* A card image: its own path pattern, and the bytes are sent through as
   base64 rather than re-encoded as UTF-8, which would corrupt them. It is
   the one kind of file that still needs a blob of its own — the tree API
   reads an inline `content` as text, and a picture is not text. */
const TINY_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
r = await post([{path:'content.js',text:GOOD},{path:'sitemap.xml',text:'<urlset/>'},
                {path:'files/cards/ilm-ul-meerath.jpg',text:TINY_IMAGE_BASE64,binary:true}], JWT);
t('a card image is accepted', r.status===200, JSON.stringify(r));
t('  …sent as base64, not re-encoded utf-8', blobBodies.some(b=>b.content===TINY_IMAGE_BASE64 && b.encoding==='base64'), JSON.stringify(blobBodies));
t('  …as the only blob, the text going into the tree instead',
  blobBodies.length===1, JSON.stringify(blobBodies).slice(0,160));
t('  …and content.js still lands, written into the tree as text',
  JSON.parse(gh.filter(x=>x==='POST /git/trees').length ? treeSent : '{}').tree
    .some(e=>e.path==='content.js' && e.content===GOOD), treeSent.slice(0,200));

r = await post([{path:'content.js',text:GOOD},{path:'files/cards/../../evil.jpg',text:TINY_IMAGE_BASE64,binary:true}], JWT);
t('a card path outside files/cards/ is refused', r.status===400 && /not a file the editor may write/.test(r.body.message), JSON.stringify(r));

const g = await worker.fetch(new Request('https://admin.tahirqadri.com.pk/publish',{method:'GET'}), env);
t('GET /publish → 405', g.status===405);

/* /version is what the editor checks on load to catch a Worker deployed
   by hand and left behind. It answers without a sign-in — a check that
   needs a credential fails for the wrong reason — and names every path
   it would write, so the editor can ask the question that matters
   without trusting the version string alone. */
const ver = await worker.fetch(new Request('https://admin.tahirqadri.com.pk/version'), env);
const verBody = await ver.json();
t('GET /version answers without signing in', ver.status===200, JSON.stringify(verBody));
t('  …with a version', typeof verBody.version==='string' && verBody.version.length>0);
t('  …and every path the editor publishes', ['content.js','sitemap.xml','posts/a.html','works/a.html','files/cards/a.jpg']
  .every(p => verBody.writable.some(src => new RegExp(src).test(p))), JSON.stringify(verBody.writable));
t('  …and the limits it enforces', verBody.maxFiles===1000 && verBody.maxFileBytes===512*1024, JSON.stringify(verBody));
t('  …and is not cached', /no-store/.test(ver.headers.get('cache-control')||''));

const page = await worker.fetch(new Request('https://admin.tahirqadri.com.pk/admin.html',
  {headers:{'Cf-Access-Jwt-Assertion':JWT}}), env);
t('the editor is served through the Worker', page.status===200);
t('  …and told not to be indexed', /noindex/.test(page.headers.get('x-robots-tag')||''));
t('  …and not to be cached', /no-store/.test(page.headers.get('cache-control')||''));

/* ---- the Firebase way in ---- */
r = await postFb([{path:'content.js',text:GOOD}], null);
t('firebase: no token → 401', r.status===401, JSON.stringify(r));

r = await postFb([{path:'content.js',text:GOOD}], await mintFb({}, other.privateKey));
t('firebase: signed by the wrong key → 401', r.status===401, JSON.stringify(r));

r = await postFb([{path:'content.js',text:GOOD}], await mintFb({exp:Math.floor(Date.now()/1000)-10}));
t('firebase: expired → 401', r.status===401, JSON.stringify(r));

r = await postFb([{path:'content.js',text:GOOD}], await mintFb({aud:'some-other-project'}));
t('firebase: token for another project → 401', r.status===401, JSON.stringify(r));

r = await postFb([{path:'content.js',text:GOOD}], await mintFb({iss:'https://securetoken.google.com/someone-else'}));
t('firebase: issued for another project → 401', r.status===401, JSON.stringify(r));

r = await postFb([{path:'content.js',text:GOOD}], await mintFb({email:'someone@else.com'}));
t('firebase: another account in the project → 403', r.status===403, JSON.stringify(r));

r = await postFb([{path:'content.js',text:GOOD}], await mintFb({sub:''}));
t('firebase: token naming no one → 401', r.status===401, JSON.stringify(r));

r = await postFb([{path:'content.js',text:GOOD}], JWT);
t('firebase: an Access token is not accepted in its place', r.status===401, JSON.stringify(r));

r = await postFb([{path:'content.js',text:GOOD},{path:'sitemap.xml',text:'<urlset/>'}], await mintFb());
t('firebase: a real publish succeeds', r.status===200 && r.body.sha==='c0ffee1234567890', JSON.stringify(r));

const noEnv = await worker.fetch(new Request('https://admin.tahirqadri.com.pk/publish',
  {method:'POST',headers:{'content-type':'application/json'},body:'{}'}), {...env, ACCESS_TEAM:'', ACCESS_AUD:'', FIREBASE_PROJECT:''});
t('with nothing configured it refuses rather than falls open', noEnv.status===500);

console.log('PASS ('+pass.length+')'); pass.forEach(x=>console.log('  ✓ '+x));
if(fail.length){console.log('\nFAIL ('+fail.length+')'); fail.forEach(x=>console.log('  ✗ '+x)); process.exit(1);}
