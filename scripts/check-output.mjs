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
if(htmlFiles.length<10) fail("Unexpectedly small generated site: "+htmlFiles.length+" HTML files");

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
  for(const marker of ["Sample Member","Research update 1","Structured content is being migrated"]){
    if(html.includes(marker)) fail(path.relative(OUT,file)+" still contains placeholder text: "+marker);
  }
  if(/javascript\s*:/i.test(html)) fail(path.relative(OUT,file)+" contains javascript: URL");
  const attrs=[...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map(m=>m[1]);
  for(const value of attrs){
    const target=localTarget(value);
    if(target && !fs.existsSync(target)) fail(path.relative(OUT,file)+" has broken local link: "+value+" -> "+path.relative(OUT,target));
  }
  for(const tag of html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)){
    if(!/rel=["'][^"']*noopener[^"']*noreferrer[^"']*["']/i.test(tag[0])) fail(path.relative(OUT,file)+" has target=_blank without noopener noreferrer");
  }
  for(const tag of html.matchAll(/<img\b[^>]*>/gi)){
    if(!/\balt=["'][^"']*["']/i.test(tag[0])) fail(path.relative(OUT,file)+" has image without alt attribute");
  }
}
for(const required of ["sitemap.xml","robots.txt","feed.xml","assets/css/site.css","assets/js/site.js"]){
  if(!fs.existsSync(path.join(OUT,required))) fail("Missing generated asset: "+required);
}
console.log("Output validation passed:",htmlFiles.length,"HTML pages and",files.length,"total files.");
