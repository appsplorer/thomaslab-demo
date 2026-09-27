import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const datasets=["publications","people","news","projects","opportunities"];
const fail=(m)=>{throw new Error(m)};
const safeUrl=(u)=>!u || /^(https:\/\/|mailto:|tel:)/i.test(u);
const danger=/<\s*(script|iframe|object|embed|form|style)\b|\son[a-z]+\s*=|javascript\s*:/i;

for(const name of datasets){
  const file=path.join(ROOT,"data",name+".json");
  const rows=JSON.parse(fs.readFileSync(file,"utf8"));
  if(!Array.isArray(rows)) fail(name+".json must be a top-level array");
  const seen=new Set();
  for(const [i,row] of rows.entries()){
    if(!row.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) fail(name+"["+i+"] has an invalid slug");
    if(seen.has(row.slug)) fail(name+" contains duplicate slug: "+row.slug);
    seen.add(row.slug);
    if(!row.title && !row.name) fail(name+"["+i+"] needs a title or name");
    for(const key of ["external_url","external_apply_url","pubmed","email","phone"]){
      const value=row[key];
      if(value && key==="email") continue;
      if(value && key==="phone") continue;
      if(value && !safeUrl(value)) fail(name+"["+i+"]."+key+" is not an allowed URL");
    }
    for(const key of ["body_html","bio_html"]){
      if(row[key] && danger.test(row[key])) fail(name+"["+i+"]."+key+" contains unsafe HTML");
    }
    if(row.pdf && !/^\/media\/pdfs\//.test(row.pdf)) fail(name+"["+i+"].pdf must use /media/pdfs/");
    if(row.image && !/^\/media\/images\//.test(row.image)) fail(name+"["+i+"].image must use /media/images/");
  }
}
const site=JSON.parse(fs.readFileSync(path.join(ROOT,"data/site.json"),"utf8"));
if(!site.name || !site.email || !site.site_url) fail("site.json needs name, email and site_url");
console.log("Source validation passed:",datasets.join(", "));
