/* Tests for the editor's backend.  Run with:  node test.mjs
   No dependencies and no network — Cloudflare's signing keys and the
   GitHub API are both stood in for, so this runs anywhere Node does.
   The Worker holds a token that can write to the repository, so most of
   these exist to prove it refuses. */
import worker from './src/index.js';

const TEAM='tahirqadri', AUD='aud-tag-123', EMAIL='mtahir001@hotmail.com';
const env={ ACCESS_TEAM:TEAM, ACCESS_AUD:AUD, ACCESS_EMAIL:EMAIL,
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
let gh=[];
globalThis.fetch = async (url, opts={}) => {
  url=String(url);
  if(url.includes('cloudflareaccess.com/cdn-cgi/access/certs'))
    return new Response(JSON.stringify({keys:[{...jwk,kid:KID,alg:'RS256'}]}),{status:200,headers:{'content-type':'application/json'}});
  if(url.startsWith('https://api.github.com/')){
    gh.push((opts.method||'GET')+' '+url.replace('https://api.github.com/repos/TahirQadri88/PersonalWebsite',''));
    const j=o=>new Response(JSON.stringify(o),{status:200,headers:{'content-type':'application/json'}});
    if(/\/git\/ref\/heads\//.test(url)) return j({object:{sha:'BASESHA'}});
    if(/\/git\/commits\/BASESHA/.test(url)) return j({tree:{sha:'TREESHA'}});
    if(/\/git\/blobs$/.test(url)) return j({sha:'BLOB'+gh.length});
    if(/\/git\/trees$/.test(url)) return j({sha:'NEWTREE'});
    if(/\/git\/commits$/.test(url)) return j({sha:'c0ffee1234567890'});
    if(/\/git\/refs\/heads\//.test(url)) return j({});
  }
  if(url.startsWith('https://tahirqadri.com.pk'))
    return new Response('<!doctype html><title>editor</title>',{status:200,headers:{'content-type':'text/html'}});
  throw new Error('unexpected fetch: '+url);
};

const GOOD='window.siteContent = { site:{}, categories:[{id:"a",works:[]}], rulings:[] };';
async function post(files, jwt, msg){
  gh=[];
  const h={'content-type':'application/json'};
  if(jwt) h['Cf-Access-Jwt-Assertion']=jwt;
  const r=await worker.fetch(new Request('https://admin.tahirqadri.com.pk/publish',
    {method:'POST',headers:h,body:JSON.stringify({files,message:msg})}), env);
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

r = await post([{path:'content.js',text:'window.siteContent = {{{ broken'}], JWT);
t('content.js that does not parse is refused', r.status===400 && /did not parse/.test(r.body.message), JSON.stringify(r));

r = await post([{path:'content.js',text:'window.siteContent = { rulings: [] };'}], JWT);
t('content.js with no categories is refused', r.status===400 && /categories/.test(r.body.message), JSON.stringify(r));

r = await post([{path:'content.js',text:'x'.repeat(600*1024)}], JWT);
t('oversized file refused', r.status===400 && /too large/.test(r.body.message), JSON.stringify(r));

r = await post([], JWT);
t('empty publish refused', r.status===400, JSON.stringify(r));

r = await post([{path:'content.js',text:GOOD},{path:'sitemap.xml',text:'<urlset/>'},
                {path:'posts/hello-world.html',text:'<h1>hi</h1>'}], JWT);
t('a real publish succeeds', r.status===200 && r.body.sha==='c0ffee1234567890', JSON.stringify(r));
t('  …in exactly one commit', gh.filter(x=>x.startsWith('POST /git/commits')).length===1, gh.join(' | '));
t('  …with all three files', r.body.files.length===3, JSON.stringify(r.body.files));
t('  …and moves the branch once', gh.filter(x=>x.startsWith('PATCH')).length===1, gh.join(' | '));

const g = await worker.fetch(new Request('https://admin.tahirqadri.com.pk/publish',{method:'GET'}), env);
t('GET /publish → 405', g.status===405);

const page = await worker.fetch(new Request('https://admin.tahirqadri.com.pk/admin.html',
  {headers:{'Cf-Access-Jwt-Assertion':JWT}}), env);
t('the editor is served through the Worker', page.status===200);
t('  …and told not to be indexed', /noindex/.test(page.headers.get('x-robots-tag')||''));
t('  …and not to be cached', /no-store/.test(page.headers.get('cache-control')||''));

const noEnv = await worker.fetch(new Request('https://admin.tahirqadri.com.pk/publish',
  {method:'POST',headers:{'content-type':'application/json'},body:'{}'}), {...env, ACCESS_TEAM:'', ACCESS_AUD:''});
t('unconfigured Access refuses rather than allows', noEnv.status===500);

console.log('PASS ('+pass.length+')'); pass.forEach(x=>console.log('  ✓ '+x));
if(fail.length){console.log('\nFAIL ('+fail.length+')'); fail.forEach(x=>console.log('  ✗ '+x)); process.exit(1);}
