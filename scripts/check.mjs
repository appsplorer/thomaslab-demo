import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const datasetNames=["publications","people","news","projects","opportunities"];
const fail=(m)=>{throw new Error(m)};
const safeUrl=(u)=>!u || /^(https:\/\/|mailto:|tel:)/i.test(String(u));
const danger=/<\s*(script|iframe|object|embed|form|style)\b|\son[a-z]+\s*=|javascript\s*:/i;

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
    if(!row.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) fail(name+"["+i+"] has an invalid slug");
    if(seen.has(row.slug)) fail(name+" contains duplicate slug: "+row.slug);
    seen.add(row.slug);
    if(!row.title && !row.name) fail(name+"["+i+"] needs a title or name");

    for(const key of ["external_url","external_apply_url","pubmed","linkedin","google_scholar","orcid","github","website"]){
      const value=row[key];
      if(value && !safeUrl(value)) fail(name+"["+i+"]."+key+" is not an allowed URL");
    }
    for(const link of row.links||[]){
      if(link.url && !safeUrl(link.url)) fail(name+"["+i+"].links contains a disallowed URL");
    }
    for(const key of ["body_html","bio_html"]){
      if(row[key] && danger.test(row[key])) fail(name+"["+i+"]."+key+" contains unsafe HTML");
    }
    if(row.pdf && !/^\/media\/pdfs\//.test(row.pdf)) fail(name+"["+i+"].pdf must use /media/pdfs/");
    if(row.cv && !/^\/media\/pdfs\//.test(row.cv)) fail(name+"["+i+"].cv must use /media/pdfs/");
    if(row.image && !/^\/media\/images\//.test(row.image)) fail(name+"["+i+"].image must use /media/images/");
    if(row.photo && !/^\/media\/images\//.test(row.photo)) fail(name+"["+i+"].photo must use /media/images/");
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
if(!/^https:\/\//i.test(site.site_url)) fail("site.site_url must use https://");
if(!site.hero?.primary_href?.startsWith("/") || !site.hero?.secondary_href?.startsWith("/")) fail("Hero links must be site-relative paths beginning with /");
const researchTitles=new Set();
for(const [i,area] of (site.research_areas||[]).entries()){
  if(!area.title) fail("site.research_areas["+i+"] needs a title");
  const key=area.title.trim().toLowerCase();
  if(researchTitles.has(key)) fail("Duplicate research area: "+area.title);
  researchTitles.add(key);
}
for(const [i,social] of (site.socials||[]).entries()){
  if(!social.label || !social.url || !safeUrl(social.url)) fail("site.socials["+i+"] needs a safe label and URL");
}

for(const required of [".pages.yml","assets/css/site.css","assets/js/site.js","scripts/build.mjs","scripts/check-output.mjs"]){
  if(!fs.existsSync(path.join(ROOT,required))) fail("Missing required source file: "+required);
}

console.log("Source validation passed:",datasetNames.join(", "),"+ cross-references, professional links and media paths.");
