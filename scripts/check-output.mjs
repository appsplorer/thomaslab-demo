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
const siteData=JSON.parse(fs.readFileSync(path.join(process.cwd(),"data/site.json"),"utf8"));
const expectedGalleryPhotos=(siteData.gallery?.photos||[]).filter(photo=>photo?.image && photo.visible!==false).length;
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
  if(!html.includes('class="tl-skip-link"') || !html.includes('id="main-content" tabindex="-1"')) fail(path.relative(OUT,file)+" is missing the accessible skip-link target");
  if(!html.includes("tl-footer-orbit")) fail(path.relative(OUT,file)+" is missing the shared orbital footer");
  if(/class=["'][^"']*(?:signal-line|signal-dot)/.test(html)) fail(path.relative(OUT,file)+" still contains a legacy footer signal");
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
  for(const directive of ["default-src 'self'","base-uri 'none'","object-src 'none'","script-src-attr 'none'","style-src 'self'","font-src 'self'","img-src 'self' data:","frame-src 'none'","worker-src 'none'","form-action 'none'","require-trusted-types-for 'script'"]){
    if(!csp[0][0].includes(directive)) fail(path.relative(OUT,file)+" CSP is missing: "+directive);
  }
  if(!/<meta\b[^>]*name=["']referrer["'][^>]*content=["']strict-origin-when-cross-origin["']/i.test(html)) fail(path.relative(OUT,file)+" is missing the referrer policy meta tag");
  if(!csp[0][0].includes("style-src 'self'") || !csp[0][0].includes("font-src 'self'")) fail(path.relative(OUT,file)+" CSP must keep styles and fonts same-origin");
  for(const match of html.matchAll(/<script\b[^>]*>/gi)){
    if(/\bsrc=["']https?:\/\//i.test(match[0])) fail(path.relative(OUT,file)+" contains a third-party runtime script: "+match[0]);
  }
  for(const match of html.matchAll(/<link\b[^>]*>/gi)){
    if(/\brel=["'][^"']*stylesheet[^"']*["']/i.test(match[0]) && /\bhref=["']https?:\/\//i.test(match[0])) fail(path.relative(OUT,file)+" contains a third-party runtime stylesheet: "+match[0]);
  }
  const faLink=html.match(/<link\b[^>]*href=["'][^"']*\/assets\/vendor\/fontawesome\/css\/all\.min\.css["'][^>]*>/i)?.[0]||"";
  if(!faLink || !/integrity=["']sha384-[^"']+["']/i.test(faLink)) fail(path.relative(OUT,file)+" self-hosted Font Awesome stylesheet is missing SRI");
  const localCss=html.match(/<link\b[^>]*href=["'][^"']*\/assets\/css\/site\.css["'][^>]*>/i)?.[0]||"";
  if(!localCss || !/integrity=["']sha384-[^"']+["']/i.test(localCss)) fail(path.relative(OUT,file)+" local stylesheet is missing SRI");
  const localJs=html.match(/<script\b[^>]*src=["'][^"']*\/assets\/js\/site\.js["'][^>]*>/i)?.[0]||"";
  if(!localJs || !/integrity=["']sha384-[^"']+["']/i.test(localJs)) fail(path.relative(OUT,file)+" local JavaScript is missing SRI");
  const headerCount=(html.match(/<header\b[^>]*class=["'][^"']*tl-header/gi)||[]).length;
  const footerCount=(html.match(/<footer\b[^>]*class=["'][^"']*tl-footer/gi)||[]).length;
  const drawerCount=(html.match(/id=["']tl-mobile-drawer["']/gi)||[]).length;
  const backTopCount=(html.match(/\bdata-backtop\b/gi)||[]).length;
  if(headerCount!==1 || footerCount!==1 || drawerCount!==1 || backTopCount!==1) fail(path.relative(OUT,file)+" must contain exactly one shared header, footer, mobile drawer and back-to-top control");
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
  const titleMatch=html.match(/<title>([^<]*)<\/title>/i);
  const descriptionMatch=html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const canonicalMatch=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if(!titleMatch || titleMatch[1].trim().length<10 || titleMatch[1].trim().length>70) fail(path.relative(OUT,file)+" has an invalid SEO title length");
  if(!descriptionMatch || descriptionMatch[1].trim().length<40 || descriptionMatch[1].trim().length>165) fail(path.relative(OUT,file)+" has an invalid meta-description length");
  if(!canonicalMatch || !/^https:\/\//i.test(canonicalMatch[1])) fail(path.relative(OUT,file)+" is missing an absolute HTTPS canonical URL");
  if(path.basename(file)==="404.html" && !/<meta\b[^>]*name=["']robots["'][^>]*content=["']noindex,follow["']/i.test(html)) fail("404.html must be noindex,follow");
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
    if(/\bsrc=["']https?:\/\//i.test(tag[0])) fail(path.relative(OUT,file)+" contains a remote runtime image");
  }
}
const seenTitles=new Map();
const seenCanonicals=new Map();
for(const file of htmlFiles){
  const html=fs.readFileSync(file,"utf8");
  const title=(html.match(/<title>([^<]*)<\/title>/i)?.[1]||"").trim();
  const canonical=(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]||"").trim();
  if(title){
    if(seenTitles.has(title)) fail("Duplicate SEO title across "+path.relative(OUT,seenTitles.get(title))+" and "+path.relative(OUT,file)+": "+title);
    seenTitles.set(title,file);
  }
  if(canonical){
    if(seenCanonicals.has(canonical)) fail("Duplicate canonical URL across generated pages: "+canonical);
    seenCanonicals.set(canonical,file);
  }
}
const homeHtml=fs.readFileSync(path.join(OUT,"index.html"),"utf8");
if(!homeHtml.includes("tl-footer-orbit")) fail("Homepage footer is missing the orbital research pathway");
if(/class=["'][^"']*signal-line/.test(homeHtml)) fail("Legacy linear footer signal is still present");
const renderedGalleryPhotos=(homeHtml.match(/\bdata-gallery-item\b/g)||[]).length;
if(expectedGalleryPhotos!==renderedGalleryPhotos) fail("Homepage gallery rendered "+renderedGalleryPhotos+" photos but "+expectedGalleryPhotos+" are visible in site.json");
if(siteData.gallery?.enabled===false && /id=["']lab-life["']/.test(homeHtml)) fail("Homepage gallery is disabled but still rendered");
if(siteData.gallery?.enabled!==false && !/id=["']lab-life["']/.test(homeHtml)) fail("Homepage gallery is enabled but missing");
if(expectedGalleryPhotos>0 && !/\bdata-gallery-lightbox\b/.test(homeHtml)) fail("Homepage gallery photos exist but the lightbox is missing");
if(expectedGalleryPhotos===0 && /\bdata-gallery-lightbox\b/.test(homeHtml)) fail("Homepage gallery lightbox should not render without photos");
const publicationsHtml=fs.readFileSync(path.join(OUT,"publications","index.html"),"utf8");
if(!/aria-live=["']polite["'][^>]*aria-atomic=["']true["']/.test(publicationsHtml)) fail("Publication result count must expose polite live feedback");
if(!/data-publication-empty[^>]*role=["']status["'][^>]*aria-live=["']polite["']/.test(publicationsHtml)) fail("Publication empty state must be announced as a polite status");

for(const required of ["sitemap.xml","robots.txt","feed.xml","assets/css/site.css","assets/js/site.js","assets/favicon.svg","assets/vendor/fontawesome/css/all.min.css","assets/vendor/fontawesome/webfonts/fa-brands-400.woff2","assets/vendor/fontawesome/webfonts/fa-regular-400.woff2","assets/vendor/fontawesome/webfonts/fa-solid-900.woff2","assets/vendor/fontawesome/webfonts/fa-v4compatibility.woff2","SECURITY.md",".well-known/security.txt"]){
  if(!fs.existsSync(path.join(OUT,required))) fail("Missing generated asset: "+required);
}
if(fs.existsSync(path.join(OUT,"media/documents"))) fail("Production output must not publish the unused media/documents directory");
if(files.some(f=>path.basename(f)===".gitkeep")) fail("Production output must not publish repository placeholder files");
const js=fs.readFileSync(path.join(OUT,"assets/js/site.js"),"utf8");
for(const sink of ["innerHTML","outerHTML","insertAdjacentHTML","eval(","new Function","document.write"]){
  if(js.includes(sink)) fail("Production JavaScript contains disallowed DOM/code sink: "+sink);
}
if(/sourceMappingURL/i.test(js)) fail("Production JavaScript references a source map");
const css=fs.readFileSync(path.join(OUT,"assets/css/site.css"),"utf8");
if(/@import\s/i.test(css)) fail("Production CSS contains @import; vendor resources must be explicit and CSP-controlled");
if(/sourceMappingURL/i.test(css)) fail("Production CSS references a source map");
for(const requiredMotion of ["@keyframes tlOrbitSpin","@keyframes tlOrbitSpinReverse","@keyframes tlGenericOrbitNode",".tl-motion-paused","@media(prefers-reduced-motion:reduce)",".tl-footer-orbit__ring--outer",".tl-project-signal>span:nth-of-type(3)",".tl-gallery-empty__signal i:nth-child(1)",".tl-research-detail__orbit:before"]){
  if(!css.includes(requiredMotion)) fail("Production CSS is missing motion safeguard/component: "+requiredMotion);
}
for(const deadLegacy of [".signal-line",".signal-dot--1",".signal-dot--2",".signal-dot--3"]){
  if(css.includes(deadLegacy)) fail("Production CSS still contains obsolete footer motion selector: "+deadLegacy);
}
if(!js.includes("visibilitychange") || !js.includes("syncDocumentMotion")) fail("Production JavaScript must pause decorative motion while the document is hidden");
if(!js.includes("'.tl-hero'")) fail("Homepage hero must participate in off-screen motion pausing");
const faCss=fs.readFileSync(path.join(OUT,"assets/vendor/fontawesome/css/all.min.css"),"utf8");
if(/https?:\/\//i.test(faCss.replace(/\/\*[\s\S]*?\*\//g,""))) fail("Self-hosted Font Awesome CSS contains a runtime external URL");
for(const font of ["fa-brands-400.woff2","fa-regular-400.woff2","fa-solid-900.woff2","fa-v4compatibility.woff2"]){
  if(!faCss.includes("../webfonts/"+font)) fail("Self-hosted Font Awesome CSS does not reference "+font);
}
const securityTxt=fs.readFileSync(path.join(OUT,".well-known/security.txt"),"utf8");
for(const field of ["Contact: mailto:","Canonical: https://","Expires: "]){
  if(!securityTxt.includes(field)) fail("security.txt is missing "+field);
}
console.log("Output validation passed:",htmlFiles.length,"HTML pages and",files.length,"total files, with CSP/SRI/security checks.");
