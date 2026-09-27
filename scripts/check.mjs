import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const datasetNames=["publications","people","news","projects","opportunities"];
const fail=(m)=>{throw new Error(m)};
const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const iconRe=/^fa-(?:solid|regular|brands)\s+fa-[a-z0-9-]+$/;
const doiRe=/^10\.\d{4,9}\/[A-Z0-9._;()/:+-]+$/i;
const danger=/<\s*(script|iframe|object|embed|form|style|svg|math|template|base|meta|link)\b|\s(?:on[a-z]+|style|srcdoc|formaction)\s*=|(?:javascript|vbscript|data)\s*:/i;

function httpsUrl(value){
  try{
    const u=new URL(String(value));
    return u.protocol==="https:" && !u.username && !u.password;
  }catch{return false}
}
function safeLinkUrl(value){
  try{
    const u=new URL(String(value));
    return ["https:","mailto:","tel:"].includes(u.protocol) && !u.username && !u.password;
  }catch{return false}
}
function localPath(value,prefix){
  const v=String(value||"");
  return v.startsWith(prefix) && !v.includes("..") && !v.includes("\\") && !/[?#]/.test(v);
}
function mediaPath(value,prefix,exts){
  if(!localPath(value,prefix)) return false;
  return exts.some(ext=>String(value).toLowerCase().endsWith(ext));
}
function checkIcon(value,label){
  if(value && !iconRe.test(String(value))) fail(label+" has an invalid icon class");
}

const datasets={};
for(const name of datasetNames){
  const file=path.join(ROOT,"data",name+".json");
  datasets[name]=JSON.parse(fs.readFileSync(file,"utf8"));
  if(!Array.isArray(datasets[name])) fail(name+".json must be a top-level array");
}

const slugSets={};
for(const name of datasetNames){
  const rows=datasets[name];
  const seen=new Set();
  for(const [i,row] of rows.entries()){
    const label=name+"["+i+"]";
    if(!row.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) fail(label+" has an invalid slug");
    if(seen.has(row.slug)) fail(name+" contains duplicate slug: "+row.slug);
    seen.add(row.slug);
    if(!row.title && !row.name) fail(label+" needs a title or name");

    for(const key of ["external_url","external_apply_url","pubmed","linkedin","google_scholar","orcid","github","website"]){
      const value=row[key];
      if(value && !httpsUrl(value)) fail(label+"."+key+" must be an HTTPS URL without embedded credentials");
    }
    for(const [j,link] of (row.links||[]).entries()){
      if(link.url && !safeLinkUrl(link.url)) fail(label+".links["+j+"] must use HTTPS, mailto, or tel without embedded credentials");
      checkIcon(link.icon,label+".links["+j+"].icon");
    }
    for(const key of ["body_html","bio_html"]){
      if(row[key] && danger.test(row[key])) fail(label+"."+key+" contains unsafe HTML");
    }
    if(row.email && !emailRe.test(String(row.email))) fail(label+".email is not a valid email address");
    if(row.contact_email && !emailRe.test(String(row.contact_email))) fail(label+".contact_email is not a valid email address");
    if(row.doi && !doiRe.test(String(row.doi))) fail(label+".doi is not a valid DOI");
    if(name==="publications" && !row.external_url && !row.pubmed && !row.doi) fail(label+" needs an official external_url, PubMed URL, or DOI");

    if(row.pdf && !mediaPath(row.pdf,"/media/pdfs/",[".pdf"])) fail(label+".pdf must be a safe /media/pdfs/*.pdf path");
    if(row.cv && !mediaPath(row.cv,"/media/pdfs/",[".pdf"])) fail(label+".cv must be a safe /media/pdfs/*.pdf path");
    if(row.image && !mediaPath(row.image,"/media/images/",[".jpg",".jpeg",".png",".webp",".gif",".avif"])) fail(label+".image must be a safe raster /media/images/ path");
    if(row.photo && !mediaPath(row.photo,"/media/images/",[".jpg",".jpeg",".png",".webp",".gif",".avif"])) fail(label+".photo must be a safe raster /media/images/ path");

    checkIcon(row.icon,label+".icon");
  }
  slugSets[name]=seen;
}

for(const [i,person] of datasets.people.entries()){
  for(const slug of person.current_projects||[]){
    if(!slugSets.projects.has(slug)) fail("people["+i+"].current_projects references missing project: "+slug);
  }
  for(const slug of person.selected_publications||[]){
    if(!slugSets.publications.has(slug)) fail("people["+i+"].selected_publications references missing publication: "+slug);
  }
}
for(const [i,project] of datasets.projects.entries()){
  for(const slug of project.related_publications||[]){
    if(!slugSets.publications.has(slug)) fail("projects["+i+"].related_publications references missing publication: "+slug);
  }
}

const site=JSON.parse(fs.readFileSync(path.join(ROOT,"data/site.json"),"utf8"));
if(!site.name || !site.email || !site.site_url) fail("site.json needs name, email and site_url");
if(!emailRe.test(String(site.email))) fail("site.email is not a valid email address");
if(!httpsUrl(site.site_url)) fail("site.site_url must be an HTTPS URL without embedded credentials");
for(const key of ["primary_href","secondary_href"]){
  const value=site.hero?.[key];
  if(!value || !value.startsWith("/") || value.startsWith("//") || value.includes("..") || value.includes("\\")) fail("Hero "+key+" must be a safe site-relative path beginning with /");
}
const researchTitles=new Set();
for(const [i,area] of (site.research_areas||[]).entries()){
  if(!area.title) fail("site.research_areas["+i+"] needs a title");
  const key=area.title.trim().toLowerCase();
  if(researchTitles.has(key)) fail("Duplicate research area: "+area.title);
  researchTitles.add(key);
  checkIcon(area.icon,"site.research_areas["+i+"].icon");
  for(const slug of area.project_slugs||[]){
    if(!slugSets.projects.has(slug)) fail("site.research_areas["+i+"].project_slugs references missing project: "+slug);
  }
}
for(const [i,social] of (site.socials||[]).entries()){
  if(!social.label || !social.url || !httpsUrl(social.url)) fail("site.socials["+i+"] needs a label and safe HTTPS URL");
  checkIcon(social.icon,"site.socials["+i+"].icon");
}

const gallery=site.gallery||{};
if(gallery.photos && !Array.isArray(gallery.photos)) fail("site.gallery.photos must be an array");
let featuredGalleryPhotos=0;
const galleryImages=new Set();
for(const [i,photo] of (gallery.photos||[]).entries()){
  const label="site.gallery.photos["+i+"]";
  if(!photo.image || !mediaPath(photo.image,"/media/images/",[".jpg",".jpeg",".png",".webp",".gif",".avif"])) fail(label+".image must be a safe raster /media/images/ path");
  if(!String(photo.alt||"").trim()) fail(label+".alt is required for accessibility");
  if(photo.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(photo.date))) fail(label+".date must use YYYY-MM-DD");
  if(photo.focus && !["center","top","bottom","left","right"].includes(photo.focus)) fail(label+".focus is invalid");
  if(photo.featured && photo.visible!==false) featuredGalleryPhotos+=1;
  if(galleryImages.has(photo.image)) fail(label+" duplicates another gallery image");
  galleryImages.add(photo.image);
}
if(featuredGalleryPhotos>1) fail("site.gallery may have at most one visible featured photo");
if((gallery.photos||[]).length>100) fail("site.gallery supports up to 100 photos to protect homepage performance");

for(const required of [".pages.yml","SECURITY.md","assets/css/site.css","assets/js/site.js","assets/favicon.svg","assets/vendor/fontawesome/css/all.min.css","assets/vendor/fontawesome/webfonts/fa-brands-400.woff2","assets/vendor/fontawesome/webfonts/fa-regular-400.woff2","assets/vendor/fontawesome/webfonts/fa-solid-900.woff2","assets/vendor/fontawesome/webfonts/fa-v4compatibility.woff2","scripts/build.mjs","scripts/check-output.mjs"]){
  if(!fs.existsSync(path.join(ROOT,required))) fail("Missing required source file: "+required);
}

// Only passive, expected media types may be published from CMS-controlled media folders.
const mediaRules=[
  ["media/images",new Set([".jpg",".jpeg",".png",".webp",".gif",".avif",".gitkeep"])],
  ["media/pdfs",new Set([".pdf",".gitkeep"])]
];
for(const [relDir,allowed] of mediaRules){
  const dir=path.join(ROOT,relDir);
  if(!fs.existsSync(dir)) continue;
  const stack=[dir];
  while(stack.length){
    const current=stack.pop();
    for(const entry of fs.readdirSync(current,{withFileTypes:true})){
      const full=path.join(current,entry.name);
      if(entry.isDirectory()){stack.push(full);continue}
      const ext=entry.name===".gitkeep"?".gitkeep":path.extname(entry.name).toLowerCase();
      if(!allowed.has(ext)) fail("Unsafe or unsupported media type in "+path.relative(ROOT,full));
    }
  }
}
if(fs.existsSync(path.join(ROOT,"media/documents"))) {
  const extra=fs.readdirSync(path.join(ROOT,"media/documents")).filter(x=>x!==".gitkeep");
  if(extra.length) fail("Unused media/documents folder contains publishable files");
}

// Prevent common credential files and high-confidence secret formats from entering production history.
const forbiddenNames=[
  /^\.env(?:\..+)?$/i,/^id_(?:rsa|dsa|ecdsa|ed25519)$/i,/\.(?:pem|p12|pfx|key)$/i
];
const secretPatterns=[
  /github_pat_[A-Za-z0-9_]{20,}/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/
];
const skipDirs=new Set([".git","_site","node_modules"]);
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory() && skipDirs.has(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){ walk(full); continue; }
    if(forbiddenNames.some(re=>re.test(entry.name))) fail("Forbidden credential-like file tracked: "+path.relative(ROOT,full));
    const ext=path.extname(entry.name).toLowerCase();
    if(![".js",".mjs",".cjs",".json",".yml",".yaml",".md",".css",".html",".txt",".xml"].includes(ext) && !entry.name.startsWith(".")) continue;
    let text="";
    try{text=fs.readFileSync(full,"utf8")}catch{continue}
    for(const re of secretPatterns){
      if(re.test(text)) fail("Potential secret detected in "+path.relative(ROOT,full));
    }
  }
}
walk(ROOT);

console.log("Source validation passed:",datasetNames.join(", "),"+ URLs, HTML, cross-references, media paths, icons and secret scan.");
