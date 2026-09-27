import fs from "node:fs";
import path from "node:path";

const OUT=path.join(process.cwd(),"_site");
const BASE=(process.env.BASE_PATH||"").replace(/\/$/,"");
const fail=(m)=>{throw new Error(m)};
const files=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(p); else files.push(p);
  }
}
walk(OUT);
const htmlFiles=files.filter(f=>f.endsWith(".html"));
if(htmlFiles.length<20) fail("Unexpectedly small generated site: "+htmlFiles.length+" HTML files");
if(files.some(f=>f.endsWith(".map"))) fail("Production output must not include source-map files");

const datasets=["publications","people","news","projects","opportunities"];
for(const name of datasets){
  const rows=JSON.parse(fs.readFileSync(path.join(process.cwd(),"data",name+".json"),"utf8"));
  for(const row of rows){
    const expected=path.join(OUT,name,row.slug,"index.html");
    if(!fs.existsSync(expected)) fail("Missing generated detail page: "+path.relative(OUT,expected));
    const html=fs.readFileSync(expected,"utf8");
    const sectionHref=(BASE||"")+"/"+name+"/";
    const activeLink='<a href="'+sectionHref+'" aria-current="page">';
    if(!html.includes(activeLink)) fail(path.relative(OUT,expected)+" does not mark "+name+" navigation active");
  }
}

const localTarget=(raw)=>{
  const clean=raw.split("#")[0].split("?")[0];
  if(!clean || clean.startsWith("#") || /^(https?:|mailto:|tel:|data:)/i.test(clean)) return null;
  let p=clean;
  if(BASE && p.startsWith(BASE)) p=p.slice(BASE.length)||"/";
  if(!p.startsWith("/")) return null;
  const disk=path.join(OUT,p.replace(/^\//,""));
  if(p.endsWith("/")) return path.join(disk,"index.html");
  return disk;
};

for(const file of htmlFiles){
  const html=fs.readFileSync(file,"utf8");
  for(const marker of ["Sample Member","Research update 1","Structured content is being migrated","through the admin panel","easy to maintain"]){
    if(html.includes(marker)) fail(path.relative(OUT,file)+" still contains placeholder text: "+marker);
  }
  if(/javascript\s*:/i.test(html)) fail(path.relative(OUT,file)+" contains javascript: URL");
  if(/<a\b[^>]*href=["']\s*data:/i.test(html)) fail(path.relative(OUT,file)+" contains a data: navigation URL");
  if(/\son[a-z]+\s*=/i.test(html)) fail(path.relative(OUT,file)+" contains an inline event handler");
  if(/\ssrcdoc\s*=/i.test(html)) fail(path.relative(OUT,file)+" contains srcdoc");
  if(/\sstyle\s*=/i.test(html)) fail(path.relative(OUT,file)+" contains an inline style attribute");
  if(/<style\b/i.test(html)) fail(path.relative(OUT,file)+" contains an inline style block");
  if(/\b(?:href|src)=["']http:\/\//i.test(html)) fail(path.relative(OUT,file)+" contains an insecure http:// asset or link");
  const csp=[...html.matchAll(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi)];
  if(csp.length!==1) fail(path.relative(OUT,file)+" must contain exactly one Content-Security-Policy meta tag");
  if(/'unsafe-inline'|'unsafe-eval'/i.test(csp[0][0])) fail(path.relative(OUT,file)+" has an unsafe CSP allowance");
  for(const directive of ["default-src 'self'","base-uri 'none'","object-src 'none'","script-src-attr 'none'","frame-src 'none'","worker-src 'none'","form-action 'none'","require-trusted-types-for 'script'"]){
    if(!csp[0][0].includes(directive)) fail(path.relative(OUT,file)+" CSP is missing: "+directive);
  }
  if(!/<meta\b[^>]*name=["']referrer["'][^>]*content=["']strict-origin-when-cross-origin["']/i.test(html)) fail(path.relative(OUT,file)+" is missing the referrer policy meta tag");
  const faLink=html.match(/<link\b[^>]*href=["']https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.7\.2\/css\/all\.min\.css["'][^>]*>/i)?.[0]||"";
  if(!faLink || !/integrity=["']sha512-[^"']+["']/i.test(faLink) || !/crossorigin=["']anonymous["']/i.test(faLink)) fail(path.relative(OUT,file)+" Font Awesome stylesheet is missing SRI/crossorigin");
  const localCss=html.match(/<link\b[^>]*href=["'][^"']*\/assets\/css\/site\.css["'][^>]*>/i)?.[0]||"";
  if(!localCss || !/integrity=["']sha384-[^"']+["']/i.test(localCss)) fail(path.relative(OUT,file)+" local stylesheet is missing SRI");
  const localJs=html.match(/<script\b[^>]*src=["'][^"']*\/assets\/js\/site\.js["'][^>]*>/i)?.[0]||"";
  if(!localJs || !/integrity=["']sha384-[^"']+["']/i.test(localJs)) fail(path.relative(OUT,file)+" local JavaScript is missing SRI");
  const mainCount=(html.match(/<main\b/gi)||[]).length;
  const mainCloseCount=(html.match(/<\/main>/gi)||[]).length;
  if(mainCount!==1) fail(path.relative(OUT,file)+" must contain exactly one main landmark, found "+mainCount);
  if(mainCloseCount!==1) fail(path.relative(OUT,file)+" must contain exactly one closing main tag, found "+mainCloseCount);
  if(/<a\b[^>]*href=["']\s*(?:#)?\s*["']/i.test(html)) fail(path.relative(OUT,file)+" contains an empty link");
  const ids=[...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
  const seenIds=new Set();
  for(const id of ids){
    if(seenIds.has(id)) fail(path.relative(OUT,file)+" contains duplicate id: "+id);
    seenIds.add(id);
  }
  const headings=[...html.matchAll(/<h([1-6])\b/gi)].map(m=>Number(m[1]));
  if(headings.length){
    if(headings[0]!==1) fail(path.relative(OUT,file)+" must start its heading outline with h1");
    if(headings.filter(x=>x===1).length!==1) fail(path.relative(OUT,file)+" must contain exactly one h1");
    for(let i=1;i<headings.length;i++){
      if(headings[i]>headings[i-1]+1) fail(path.relative(OUT,file)+" skips heading level h"+headings[i-1]+" -> h"+headings[i]);
    }
  }
  const attrs=[...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map(m=>m[1]);
  for(const value of attrs){
    const target=localTarget(value);
    if(target && !fs.existsSync(target)) fail(path.relative(OUT,file)+" has broken local link: "+value+" -> "+path.relative(OUT,target));
  }
  const hrefs=[...html.matchAll(/\bhref=["']([^"']+)["']/gi)].map(m=>m[1]);
  for(const value of hrefs){
    if(/^(https?:|mailto:|tel:|data:)/i.test(value)) continue;
    const hashIndex=value.indexOf("#");
    if(hashIndex<0) continue;
    const rawHash=value.slice(hashIndex+1);
    if(!rawHash) continue;
    const hash=decodeURIComponent(rawHash);
    const pathPart=value.slice(0,hashIndex);
    let targetFile=file;
    if(pathPart){
      const target=localTarget(pathPart);
      if(target) targetFile=target;
    }
    if(!fs.existsSync(targetFile)) continue;
    const targetHtml=fs.readFileSync(targetFile,"utf8");
    const targetIds=[...targetHtml.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
    if(!targetIds.includes(hash)) fail(path.relative(OUT,file)+" links to missing anchor #"+hash+" in "+path.relative(OUT,targetFile));
  }
  for(const tag of html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)){
    if(!/rel=["'][^"']*noopener[^"']*noreferrer[^"']*["']/i.test(tag[0])) fail(path.relative(OUT,file)+" has target=_blank without noopener noreferrer");
  }
  for(const tag of html.matchAll(/<img\b[^>]*>/gi)){
    if(!/\balt=["'][^"']*["']/i.test(tag[0])) fail(path.relative(OUT,file)+" has image without alt attribute");
  }
}
for(const required of ["sitemap.xml","robots.txt","feed.xml","assets/css/site.css","assets/js/site.js","assets/favicon.svg","SECURITY.md",".well-known/security.txt"]){
  if(!fs.existsSync(path.join(OUT,required))) fail("Missing generated asset: "+required);
}
const js=fs.readFileSync(path.join(OUT,"assets/js/site.js"),"utf8");
for(const sink of ["innerHTML","outerHTML","insertAdjacentHTML","eval(","new Function","document.write"]){
  if(js.includes(sink)) fail("Production JavaScript contains disallowed DOM/code sink: "+sink);
}
if(/sourceMappingURL/i.test(js)) fail("Production JavaScript references a source map");
const css=fs.readFileSync(path.join(OUT,"assets/css/site.css"),"utf8");
if(/@import\s/i.test(css)) fail("Production CSS contains @import; vendor resources must be explicit and CSP-controlled");
if(/sourceMappingURL/i.test(css)) fail("Production CSS references a source map");
const securityTxt=fs.readFileSync(path.join(OUT,".well-known/security.txt"),"utf8");
for(const field of ["Contact: mailto:","Canonical: https://","Expires: "]){
  if(!securityTxt.includes(field)) fail("security.txt is missing "+field);
}
console.log("Output validation passed:",htmlFiles.length,"HTML pages and",files.length,"total files, with CSP/SRI/security checks.");
