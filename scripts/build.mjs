import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT=process.cwd();
const OUT=path.join(ROOT,"_site");
const BASE=(process.env.BASE_PATH||"").replace(/\/$/,"");
const ORIGIN=(process.env.SITE_ORIGIN||"").replace(/\/$/,"");
const site=JSON.parse(fs.readFileSync(path.join(ROOT,"data/site.json"),"utf8"));
const publications=JSON.parse(fs.readFileSync(path.join(ROOT,"data/publications.json"),"utf8"));
const people=JSON.parse(fs.readFileSync(path.join(ROOT,"data/people.json"),"utf8"));
const news=JSON.parse(fs.readFileSync(path.join(ROOT,"data/news.json"),"utf8"));
const projects=JSON.parse(fs.readFileSync(path.join(ROOT,"data/projects.json"),"utf8"));
const opportunities=JSON.parse(fs.readFileSync(path.join(ROOT,"data/opportunities.json"),"utf8"));

const esc=(s="")=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const safeRichHref=(value="")=>{
  const v=String(value).trim();
  return v==="" || v.startsWith("/") || v.startsWith("#") || /^(https:\/\/|mailto:|tel:)/i.test(v);
};
const safeRichSrc=(value="")=>{
  const v=String(value).trim();
  return v==="" || /^\/media\/images\/[A-Za-z0-9._/-]+$/.test(v);
};
function safeRichHtml(input=""){
  return String(input||"")
    .replace(/<(script|iframe|object|embed|form|style|svg|math|template|base|meta|link)\b[\s\S]*?<\/\1\s*>/gi,"")
    .replace(/<(script|iframe|object|embed|form|style|svg|math|template|base|meta|link)\b[^>]*\/?>/gi,"")
    .replace(/\s(?:on[a-z]+|style|srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,"")
    .replace(/\ssrcset\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,"")
    .replace(/\s(href|src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,(match,attr,raw,dq,sq,bare)=>{
      const value=dq??sq??bare??"";
      const ok=String(attr).toLowerCase()==="src"?safeRichSrc(value):safeRichHref(value);
      return ok?` ${attr}="${value.replace(/"/g,"&quot;")}"`:` ${attr}="#"`;
    });
}
const href=(p="/")=>BASE+(p.startsWith("/")?p:"/"+p);
const absolute=(p="/")=>(ORIGIN||site.site_url||"")+href(p);
const publicationExternal=(p)=>p.external_url||p.pubmed||(p.doi?"https://doi.org/"+p.doi:href("/publications/"+p.slug+"/"));
const slugify=(s="")=>String(s).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const ensure=(p)=>fs.mkdirSync(p,{recursive:true});
const renderedRoutes=[];
const write=(route,html)=>{
  if(route!=="404.html") renderedRoutes.push(route);
  const target=route==="404.html"?path.join(OUT,"404.html"):path.join(OUT,route.replace(/^\//,""),"index.html");
  ensure(path.dirname(target)); fs.writeFileSync(target,html);
};
const socialLinks=()=>site.socials?.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><i class="${esc(s.icon||"fa-solid fa-link")}"></i>${esc(s.label)}</a>`).join("")||"";
const sri=(file)=>"sha384-"+crypto.createHash("sha384").update(fs.readFileSync(path.join(ROOT,file))).digest("base64");
const SITE_CSS_SRI=sri("assets/css/site.css");
const SITE_JS_SRI=sri("assets/js/site.js");
const FONT_AWESOME_SRI=sri("assets/vendor/fontawesome/css/all.min.css");

function structured(title,description,route,type="WebPage"){
  return JSON.stringify({"@context":"https://schema.org","@graph":[
    {"@type":"ResearchOrganization","@id":absolute("/")+"#organization","name":site.name,"url":absolute("/"),"description":site.seo.description,"email":"mailto:"+site.email,"parentOrganization":{"@type":"CollegeOrUniversity","name":"University of Georgia","url":"https://www.uga.edu/"},"department":{"@type":"Organization","name":"College of Pharmacy","url":"https://rx.uga.edu/"},"sameAs":site.socials?.map(x=>x.url)||[],"knowsAbout":site.research_areas.map(x=>x.title)},
    {"@type":"WebSite","@id":absolute("/")+"#website","url":absolute("/"),"name":site.name,"publisher":{"@id":absolute("/")+"#organization"}},
    {"@type":type,"@id":absolute(route)+"#webpage","url":absolute(route),"name":title,"description":description,"isPartOf":{"@id":absolute("/")+"#website"}}
  ]});
}
function head({title,description,route="/",type="WebPage"}){
  const full=title===site.name?site.seo.title:`${title} | ${site.name}`;
  const json=structured(full,description,route,type)
    .replace(/</g,"\\u003c")
    .replace(/>/g,"\\u003e")
    .replace(/&/g,"\\u0026")
    .replace(/\u2028/g,"\\u2028")
    .replace(/\u2029/g,"\\u2029");
  const hash=crypto.createHash("sha256").update(json).digest("base64");
  const canonical=absolute(route);
  return `<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title><meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc((site.seo.keywords||[]).join(", "))}">
<meta name="author" content="${esc(site.name)}"><meta name="theme-color" content="#BA0C2F">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" type="image/svg+xml" href="${href("/assets/favicon.svg")}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(full)}"><meta name="twitter:description" content="${esc(description)}">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; object-src 'none'; script-src 'self' 'sha256-${hash}'; script-src-attr 'none'; style-src 'self'; font-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src 'none'; child-src 'none'; worker-src 'none'; manifest-src 'self'; frame-ancestors 'none'; form-action 'none'; require-trusted-types-for 'script'; upgrade-insecure-requests">
<link rel="stylesheet" href="${href("/assets/vendor/fontawesome/css/all.min.css")}" integrity="${FONT_AWESOME_SRI}">
<link rel="stylesheet" href="${href("/assets/css/site.css")}" integrity="${SITE_CSS_SRI}">
<script type="application/ld+json">${json}</script>
<script src="${href("/assets/js/site.js")}" integrity="${SITE_JS_SRI}" defer></script>
</head>`;
}
function header(route){
 const nav=[["Research","/research/"],["Publications","/publications/"],["Projects","/projects/"],["People","/people/"],["News","/news/"],["Opportunities","/opportunities/"],["Contact","/contact/"]];
 const active=(u)=>route===u || (u!=="/" && route.startsWith(u));
 const links=nav.map(([n,u])=>`<a href="${href(u)}"${active(u)?' aria-current="page"':""}>${n}</a>`).join("");
 const drawer=nav.map(([n,u],i)=>`<a href="${href(u)}"${active(u)?' aria-current="page"':""}><span>${String(i+2).padStart(2,"0")}</span>${n}<i class="fa-solid fa-arrow-right"></i></a>`).join("");
 return `<a class="tl-skip-link" href="#main-content">Skip to main content</a>
<header class="tl-header" data-dark="false"><div class="tl-header__accent"><span></span><span></span></div><div class="tl-header__inner">
<a href="${href("/")}" class="tl-brand" aria-label="Thomas Lab home"><span class="tl-brand__mark"><svg viewBox="0 0 56 56"><path d="M9 13h22M20 13v29M31 13v11h16M39 24v18"/><circle cx="9" cy="13" r="3"/><circle cx="20" cy="42" r="3"/><circle cx="47" cy="24" r="3"/><circle cx="39" cy="42" r="3"/></svg></span><span class="tl-brand__text"><strong>Thomas Lab</strong><small>UGA College of Pharmacy</small></span></a>
<nav class="tl-nav tl-nav--desktop" aria-label="Primary navigation"><a href="${href("/")}"${route==="/"?' aria-current="page"':""}>Home</a>${links}<a class="tl-nav__accent" href="${href("/opportunities/")}">Join us <i class="fa-solid fa-arrow-right"></i></a></nav>
<button class="tl-drawer-toggle" type="button" aria-label="Open navigation" aria-controls="tl-mobile-drawer" aria-expanded="false"><span></span><span></span><span></span></button>
</div></header>
<div class="tl-drawer-backdrop" data-drawer-close aria-hidden="true"></div>
<aside class="tl-drawer" id="tl-mobile-drawer" aria-hidden="true" aria-label="Mobile navigation" inert><div class="tl-drawer__header"><a href="${href("/")}" class="tl-drawer__brand"><span class="tl-brand__mark"><svg viewBox="0 0 56 56"><path d="M9 13h22M20 13v29M31 13v11h16M39 24v18"/><circle cx="9" cy="13" r="3"/><circle cx="20" cy="42" r="3"/><circle cx="47" cy="24" r="3"/><circle cx="39" cy="42" r="3"/></svg></span><span><strong>Thomas Lab</strong><small>UGA College of Pharmacy</small></span></a><button class="tl-drawer__close" type="button" data-drawer-close aria-label="Close navigation"><span></span><span></span></button></div>
<nav class="tl-drawer__nav"><a href="${href("/")}"${route==="/"?' aria-current="page"':""}><span>01</span>Home<i class="fa-solid fa-arrow-right"></i></a>${drawer}</nav>
<div class="tl-drawer__footer"><span>Thomas Lab · College of Pharmacy</span><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></div></aside>`;
}
function footer(){
 return `<footer class="tl-footer tl-footer--light"><div class="tl-footer__topline"><span></span><span></span></div><div class="tl-footer__grid">
<div class="tl-footer__identity"><a href="${href("/")}" class="tl-footer__brand">Thomas Lab</a><p>${esc(site.tagline)}</p><p class="tl-footer__affiliation">${esc(site.department)}<br>${esc(site.affiliation)}<br>${esc(site.location)}</p><div class="tl-socials">${socialLinks()}</div></div>
<div class="tl-footer__links"><span>Explore</span><a href="${href("/research/")}">Research</a><a href="${href("/publications/")}">Publications</a><a href="${href("/projects/")}">Projects</a><a href="${href("/people/")}">People</a></div>
<div class="tl-footer__links"><span>Lab</span><a href="${href("/news/")}">News</a><a href="${href("/opportunities/")}">Opportunities</a><a href="${href("/contact/")}">Contact</a></div>
<div class="tl-footer__signal"><span class="signal-dot signal-dot--1"></span><span class="signal-dot signal-dot--2"></span><span class="signal-dot signal-dot--3"></span><span class="signal-line"></span><strong>Evidence → Translation</strong><small>Pharmacogenomics · clinical data · AI · patient outcomes</small></div>
</div><div class="tl-footer__bottom"><span>© ${new Date().getFullYear()} Thomas Lab</span><span>Independent lab website · affiliated with the University of Georgia College of Pharmacy</span><span>Research · education · collaboration</span></div></footer>`;
}
function shell({route,title,description,content,type="WebPage"}){
 return `<!doctype html><html lang="en" data-dark="false">${head({title,description,route,type})}<body>${header(route)}<main id="main-content" tabindex="-1">${content}</main>${footer()}<button class="tl-backtop" type="button" data-backtop aria-label="Back to top"><i class="fa-solid fa-arrow-up"></i></button></body></html>`;
}




function projectCard(p){
 return `<a class="tl-project-card tl-hover-card tl-card-link reveal" data-tilt data-spotlight href="${href("/projects/"+p.slug+"/")}"><div class="tl-project-card__visual">${p.image?`<img src="${href(p.image)}" alt="" loading="lazy" decoding="async">`:`<div class="tl-project-signal"><i class="${esc(p.icon||"fa-solid fa-diagram-project")}"></i><span></span><span></span><span></span></div>`}</div><div class="tl-project-card__body"><span>${esc(p.status||"Research program")}</span><h3>${esc(p.title)}</h3><small>${esc(p.subtitle||"")}</small><p>${esc(p.short_description||p.summary||"")}</p><div class="tl-tags">${(p.topics||[]).slice(0,3).map(t=>`<small>${esc(t)}</small>`).join("")}</div><strong>View project <i class="fa-solid fa-arrow-right"></i></strong></div></a>`;
}
function projectHome(){
 const featured=projects.filter(p=>p.featured).slice(0,3);
 return `<section class="tl-section tl-project-home"><div class="tl-section__head tl-section__head--compact reveal"><div><span class="tl-kicker">Featured research</span><h2>Programs built around real clinical questions.</h2></div><a class="tl-text-link" href="${href("/projects/")}">View all projects <i class="fa-solid fa-arrow-right"></i></a></div><div class="tl-project-grid">${featured.map(projectCard).join("")}</div></section>`;
}
function projectsPage(){
 return pageHero("Projects","Research programs with a translational endpoint.","Explore active and completed programs across pharmacogenomics, clinical NLP, cardiovascular therapeutics, medication safety, and real-world evidence.")+`<section class="tl-page-shell"><h2 class="tl-sr-only">Research projects</h2><div class="tl-project-grid tl-project-grid--archive">${projects.map(projectCard).join("")}</div></section>`;
}
function projectPage(p){
 const related=(p.related_publications||[]).map(slug=>publications.find(x=>x.slug===slug)).filter(Boolean);
 const links=(p.links||[]).map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`).join("");
 const collaborators=(p.collaborators||[]).map(x=>`<li>${esc(x)}</li>`).join("");
 const funding=(p.funding||[]).map(x=>`<li>${esc(x)}</li>`).join("");
 const period=(p.start_year||p.end_year)?`${p.start_year?esc(p.start_year):"Ongoing"}${p.end_year?"–"+esc(p.end_year):p.start_year?"–present":""}`:"";
 const projectFacts=(p.lead||period||collaborators||funding)?`<div class="tl-detail-side-card"><span>Project information</span>${p.lead?`<div class="tl-detail-fact"><small>Lead</small><strong>${esc(p.lead)}</strong></div>`:""}${period?`<div class="tl-detail-fact"><small>Period</small><strong>${period}</strong></div>`:""}${collaborators?`<div class="tl-detail-fact"><small>Collaborators</small><ul>${collaborators}</ul></div>`:""}${funding?`<div class="tl-detail-fact"><small>Funding / support</small><ul>${funding}</ul></div>`:""}</div>`:"";
 return `<article class="tl-project-detail"><header class="tl-project-detail__hero"><a class="tl-back-link" href="${href("/projects/")}"><i class="fa-solid fa-arrow-left"></i> All projects</a><div class="tl-project-detail__eyebrow"><span>${esc(p.status||"Research program")}</span><small>${esc(p.subtitle||"")}</small></div><h1>${esc(p.title)}</h1><p>${esc(p.summary||p.short_description||"")}</p><div class="tl-topic-cloud">${(p.topics||[]).map(t=>`<span>${esc(t)}</span>`).join("")}</div></header><div class="tl-project-detail__grid"><div class="tl-project-detail__main"><div class="tl-rich">${safeRichHtml(p.body_html)||""}</div>${(p.goals||[]).length?`<section><h2>Research goals</h2><ul class="tl-detail-list">${p.goals.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:""}${(p.methods||[]).length?`<section><h2>Methods & approaches</h2><div class="tl-method-grid">${p.methods.map(x=>`<span>${esc(x)}</span>`).join("")}</div></section>`:""}</div><aside class="tl-project-detail__side">${projectFacts}${links?`<div class="tl-detail-side-card"><span>Project links</span>${links}</div>`:""}${related.length?`<div class="tl-detail-side-card"><span>Related publications</span>${related.map(r=>`<a href="${href("/publications/"+r.slug+"/")}">${esc(r.title)} <i class="fa-solid fa-arrow-right"></i></a>`).join("")}</div>`:""}</aside></div></article>`;
}

function opportunityCard(o){
 const closed=/closed|filled/i.test(o.status||"");
 return `<a class="tl-opportunity-card tl-card-link reveal" href="${href("/opportunities/"+o.slug+"/")}"><div class="tl-opportunity-card__top"><span class="${closed?"is-closed":""}">${esc(o.status)}</span><small>${esc(o.type)}</small></div><h3>${esc(o.title)}</h3><p>${esc(o.summary)}</p><div class="tl-opportunity-card__facts"><span><i class="fa-solid fa-location-dot"></i>${esc(o.location||"")}</span><span><i class="fa-regular fa-clock"></i>${esc(o.deadline||"")}</span></div><strong>View details <i class="fa-solid fa-arrow-right"></i></strong></a>`;
}
function opportunitiesPage(){
 const active=opportunities.filter(o=>!/closed|filled/i.test(o.status||""));
 const closed=opportunities.filter(o=>/closed|filled/i.test(o.status||""));
 return pageHero("Join the lab","Ways to join, contribute, and collaborate.","Current PhD, research assistant, student-research, and collaboration opportunities are listed below. Each listing states its status, timing, and funding information when available.")+`<section class="tl-page-shell"><h2 class="tl-sr-only">Current opportunities</h2><div class="tl-opportunity-notice reveal"><i class="fa-solid fa-circle-info"></i><div><strong>Important</strong><p>An expression-of-interest listing is not a guarantee of admission, funding, employment, or an open position. Always read the individual listing and relevant UGA program requirements.</p></div></div><div class="tl-opportunity-grid">${active.map(opportunityCard).join("")}</div>${closed.length?`<section class="tl-closed-opps"><span class="tl-kicker">Past listings</span><h2>Closed opportunities</h2><div class="tl-opportunity-grid">${closed.map(opportunityCard).join("")}</div></section>`:""}</section>`;
}
function opportunityPage(o){
 const eligibility=(o.eligibility||[]).length?`<section><h2>Eligibility & program requirements</h2><ul class="tl-detail-list">${o.eligibility.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:"";
 return `<article class="tl-opportunity-detail"><header class="tl-opportunity-detail__hero"><a class="tl-back-link" href="${href("/opportunities/")}"><i class="fa-solid fa-arrow-left"></i> All opportunities</a><div class="tl-opportunity-detail__status"><span>${esc(o.status)}</span><small>${esc(o.type)}</small></div><h1>${esc(o.title)}</h1><p>${esc(o.summary)}</p><div class="tl-opportunity-facts"><span><strong>Location</strong>${esc(o.location||"To be confirmed")}</span><span><strong>Commitment</strong>${esc(o.commitment||"To be confirmed")}</span><span><strong>Start</strong>${esc(o.start_date||"To be confirmed")}</span><span><strong>Deadline</strong>${esc(o.deadline||"To be confirmed")}</span>${o.funding?`<span><strong>Funding / compensation</strong>${esc(o.funding)}</span>`:""}</div></header><div class="tl-opportunity-detail__grid"><div class="tl-opportunity-detail__main"><div class="tl-rich">${safeRichHtml(o.body_html)||""}</div>${(o.qualifications||[]).length?`<section><h2>What we look for</h2><ul class="tl-detail-list">${o.qualifications.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:""}${eligibility}${(o.how_to_apply||[]).length?`<section><h2>How to inquire / apply</h2><ol class="tl-number-list">${o.how_to_apply.map(x=>`<li>${esc(x)}</li>`).join("")}</ol></section>`:""}</div><aside><div class="tl-apply-card"><span>Interested?</span><strong>Start with a concise, relevant inquiry.</strong>${o.external_apply_url?`<a class="tl-button tl-button--primary" href="${esc(o.external_apply_url)}" target="_blank" rel="noopener noreferrer">Apply externally <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`:`<a class="tl-button tl-button--primary" href="mailto:${esc(o.contact_email||site.email)}?subject=${encodeURIComponent("Thomas Lab inquiry: "+o.title)}">Contact the lab <i class="fa-regular fa-envelope"></i></a>`}<small>Availability, funding, eligibility, admission, and employment status are confirmed only through the relevant UGA process.</small></div></aside></div></article>`;
}

function formatDate(iso){
  const d=new Date(iso+"T00:00:00Z");
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(d);
}
function newsCard(item){
  return `<article class="tl-news-card tl-hover-card reveal" data-spotlight><a class="tl-card-link" href="${href("/news/"+item.slug+"/")}"><div class="tl-news-card__media">${item.image?`<img src="${href(item.image)}" alt="" loading="lazy" decoding="async">`:`<span><i class="${item.category==="Publication"?"fa-regular fa-file-lines":item.category==="Media"?"fa-regular fa-newspaper":"fa-solid fa-bullhorn"}"></i></span>`}</div><div class="tl-news-card__body"><div class="tl-news-card__meta"><span>${esc(item.category)}</span><time datetime="${esc(item.date)}">${esc(formatDate(item.date))}</time></div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><strong>Read update <i class="fa-solid fa-arrow-right"></i></strong></div></a></article>`;
}
function newsHome(){
  const latest=[...news].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  return `<section class="tl-section tl-news-home"><div class="tl-section__head tl-section__head--compact reveal"><div><span class="tl-kicker">Latest from the lab</span><h2>Research moves. We document the signal.</h2></div><a class="tl-text-link" href="${href("/news/")}">View all news <i class="fa-solid fa-arrow-right"></i></a></div><div class="tl-news-home__grid">${latest.map(newsCard).join("")}</div></section>`;
}
function galleryHome(){
  const gallery=site.gallery||{};
  if(gallery.enabled===false) return "";
  const visible=(gallery.photos||[]).filter(photo=>photo?.image && photo.visible!==false);
  const eyebrow=gallery.eyebrow||"Lab life";
  const title=gallery.title||"The people and moments behind the work.";
  const description=gallery.description||"Conferences, celebrations, get-togethers, and everyday moments from the Thomas Lab community.";

  if(!visible.length){
    return `<section class="tl-section tl-gallery-section" id="lab-life"><div class="tl-gallery-head reveal"><div><span class="tl-kicker">${esc(eyebrow)}</span><h2>${esc(title)}</h2></div><p>${esc(description)}</p></div><div class="tl-gallery-empty reveal"><span class="tl-gallery-empty__icon"><i class="fa-regular fa-images"></i></span><div><strong>A living lab archive.</strong><p>Lab gatherings, conferences, celebrations, and milestones will appear here as the gallery grows.</p></div><span class="tl-gallery-empty__signal" aria-hidden="true"><i></i><i></i><i></i></span></div></section>`;
  }

  const featuredIndex=Math.max(0,visible.findIndex(photo=>photo.featured));
  const ordered=featuredIndex>0?[visible[featuredIndex],...visible.slice(0,featuredIndex),...visible.slice(featuredIndex+1)]:visible;
  const cards=ordered.map((photo,index)=>{
    const focus=["center","top","bottom","left","right"].includes(photo.focus)?photo.focus:"center";
    const meta=[];
    if(photo.date) meta.push(formatDate(photo.date));
    if(photo.location) meta.push(photo.location);
    const caption=photo.caption||photo.alt||"Thomas Lab photo";
    return `<button class="tl-gallery-card${index===0?" is-featured":""} reveal" type="button" data-gallery-item data-gallery-src="${esc(href(photo.image))}" data-gallery-alt="${esc(photo.alt||caption)}" data-gallery-caption="${esc(photo.caption||"")}" data-gallery-meta="${esc(meta.join(" · "))}" aria-label="Open photo: ${esc(caption)}"><span class="tl-gallery-card__media tl-gallery-focus--${focus}"><img src="${esc(href(photo.image))}" alt="${esc(photo.alt||caption)}" loading="lazy" decoding="async" fetchpriority="low"></span><span class="tl-gallery-card__shade" aria-hidden="true"></span><span class="tl-gallery-card__copy">${meta.length?`<small>${esc(meta.join(" · "))}</small>`:""}<strong>${esc(photo.caption||"Lab life")}</strong></span><span class="tl-gallery-card__open" aria-hidden="true"><i class="fa-solid fa-expand"></i></span></button>`;
  }).join("");

  return `<section class="tl-section tl-gallery-section" id="lab-life"><div class="tl-gallery-head reveal"><div><span class="tl-kicker">${esc(eyebrow)}</span><h2>${esc(title)}</h2></div><p>${esc(description)}</p></div><div class="tl-gallery-grid tl-gallery-grid--count-${Math.min(ordered.length,6)}" data-gallery-grid>${cards}</div><dialog class="tl-gallery-lightbox" data-gallery-lightbox aria-label="Lab photo viewer"><div class="tl-gallery-lightbox__shell"><button class="tl-gallery-lightbox__close" type="button" data-gallery-close aria-label="Close photo viewer"><i class="fa-solid fa-xmark"></i></button><div class="tl-gallery-lightbox__stage"><button class="tl-gallery-lightbox__nav tl-gallery-lightbox__nav--prev" type="button" data-gallery-prev aria-label="Previous photo"><i class="fa-solid fa-arrow-left"></i></button><img data-gallery-image alt=""><button class="tl-gallery-lightbox__nav tl-gallery-lightbox__nav--next" type="button" data-gallery-next aria-label="Next photo"><i class="fa-solid fa-arrow-right"></i></button></div><footer class="tl-gallery-lightbox__caption"><span data-gallery-counter></span><div><strong data-gallery-caption></strong><small data-gallery-meta></small></div></footer></div></dialog></section>`;
}

function newsPage(){
  const items=[...news].sort((a,b)=>b.date.localeCompare(a.date));
  return pageHero("News","Research updates, publications, and lab milestones.","A durable archive of Thomas Lab activity. Each update has its own page and can also point to an external university, journal, conference, or media source.")+`<section class="tl-page-shell"><h2 class="tl-sr-only">News archive</h2><div class="tl-news-archive">${items.map(newsCard).join("")}</div></section>`;
}
function newsArticlePage(item){
  const tags=(item.tags||[]).map(t=>`<small>${esc(t)}</small>`).join("");
  return `<article class="tl-article"><header class="tl-article__hero"><a class="tl-back-link" href="${href("/news/")}"><i class="fa-solid fa-arrow-left"></i> All news</a><div class="tl-article__meta"><span>${esc(item.category)}</span><time datetime="${esc(item.date)}">${esc(formatDate(item.date))}</time></div><h1>${esc(item.title)}</h1><p>${esc(item.description)}</p><div class="tl-tags">${tags}</div></header><div class="tl-article__body"><div class="tl-rich">${safeRichHtml(item.body_html)||""}</div>${item.external_url?`<aside class="tl-source-card"><span>External source</span><strong>${esc(item.external_label||"Read original source")}</strong><a class="tl-button tl-button--primary" href="${esc(item.external_url)}" target="_blank" rel="noopener noreferrer">Open source <i class="fa-solid fa-arrow-up-right-from-square"></i></a></aside>`:""}</div></article>`;
}

function personInitials(p){return p.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function personProfessionalLinks(p){
  const links=[
    p.linkedin?{label:"LinkedIn",url:p.linkedin,icon:"fa-brands fa-linkedin"}:null,
    p.google_scholar?{label:"Google Scholar",url:p.google_scholar,icon:"fa-solid fa-graduation-cap"}:null,
    p.orcid?{label:"ORCID",url:p.orcid,icon:"fa-brands fa-orcid"}:null,
    p.github?{label:"GitHub",url:p.github,icon:"fa-brands fa-github"}:null,
    p.website?{label:"Website",url:p.website,icon:"fa-solid fa-globe"}:null,
    p.cv?{label:"CV",url:p.cv,icon:"fa-regular fa-file-pdf",local:true}:null,
    ...(p.links||[])
  ].filter(Boolean);
  const seen=new Set();
  return links.filter(link=>{
    const key=String(link.url||"").trim();
    if(!key||seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function personLinkHref(link){return link.local||String(link.url||"").startsWith("/")?href(link.url):link.url}
function personLinkAttrs(link){
  const url=String(personLinkHref(link)||"");
  return /^https?:/i.test(url)?' target="_blank" rel="noopener noreferrer"':"";
}
function personQuickLinks(p,{compact=false,includeEmail=true}={}){
  const links=personProfessionalLinks(p).filter(link=>includeEmail||String(link.label||"").toLowerCase()!=="email");
  if(!links.length) return "";
  return `<div class="${compact?"tl-member-socials":"tl-person-links"}">${links.map(link=>`<a href="${esc(personLinkHref(link))}"${personLinkAttrs(link)} aria-label="${esc(link.label)}"${compact?' title="'+esc(link.label)+'"':""}><i class="${esc(link.icon||"fa-solid fa-link")}"></i>${compact?"":esc(link.label)}</a>`).join("")}</div>`;
}
function memberPublications(p){
  const selected=(p.selected_publications||[]).map(slug=>publications.find(x=>x.slug===slug)).filter(Boolean);
  if(selected.length) return selected;
  const key=String(p.name||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  if(!key) return [];
  return publications.filter(pub=>String(pub.authors||"").toLowerCase().replace(/[^a-z0-9]/g,"").includes(key)).slice(0,6);
}
function memberCard(p){
  const visual=p.photo?`<img src="${href(p.photo)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`:`<span class="tl-member-monogram">${esc(personInitials(p))}</span>`;
  const quick=personQuickLinks(p,{compact:true});
  return `<article class="tl-member-card tl-hover-card reveal" data-tilt data-spotlight><a class="tl-member-card__profile" href="${href("/people/"+p.slug+"/")}" aria-label="View ${esc(p.name)} profile"><div class="tl-member-card__image">${visual}</div><div class="tl-member-card__body"><span>${esc(p.role_label||p.role)}</span><h3>${esc(p.name)}${p.credentials?", "+esc(p.credentials):""}</h3><p>${esc(p.position||"")}</p><div class="tl-member-topics">${(p.research_topics||[]).slice(0,3).map(t=>`<small>${esc(t)}</small>`).join("")}</div><strong class="tl-member-card__cta">View profile <i class="fa-solid fa-arrow-right"></i></strong></div></a>${quick}</article>`;
}
function peoplePage(){
 const pi=people.find(p=>p.role==="principal-investigator");
 const current=people.filter(p=>p.role!=="principal-investigator" && p.role!=="alumni" && !p.end_year);
 const alumni=people.filter(p=>p.role==="alumni" || p.end_year);
 const piBlock=pi?`<article class="tl-pi-feature reveal"><a class="tl-pi-feature__visual" href="${href("/people/"+pi.slug+"/")}" aria-label="View ${esc(pi.name)} profile">${pi.photo?`<img src="${href(pi.photo)}" alt="${esc(pi.name)}">`:`<span>${esc(personInitials(pi))}</span>`}</a><div class="tl-pi-feature__copy"><span class="tl-kicker">Principal Investigator</span><h2>${esc(pi.name)}, ${esc(pi.credentials||"")}</h2><p class="tl-pi-role">${esc(pi.position)} · ${esc(pi.affiliation)}</p><p>${esc(pi.short_bio||"")}</p><div class="tl-tags">${(pi.research_topics||[]).slice(0,5).map(t=>`<small>${esc(t)}</small>`).join("")}</div>${personQuickLinks(pi)}<a class="tl-profile-link" href="${href("/people/"+pi.slug+"/")}">View full profile <i class="fa-solid fa-arrow-right"></i></a></div></article>`:"";
 const teamBlock=current.length?`<section class="tl-team-block"><div class="tl-section__head"><div><span class="tl-kicker">Current members</span><h2>Different disciplines. One research system.</h2></div><p>Every member profile can include research topics, current projects, selected publications, training, contact details, CV, and professional links.</p></div><div class="tl-team-grid">${current.map(memberCard).join("")}</div></section>`:`<section class="tl-growing-team reveal"><span class="tl-kicker">Growing team</span><h2>Students, research assistants, postdocs, and collaborators.</h2><p>As the lab grows, current student and researcher profiles will appear here with their research topics, projects, publications, training, and professional links.</p><a class="tl-button tl-button--dark" href="${href("/opportunities/")}">Explore opportunities <i class="fa-solid fa-arrow-right"></i></a></section>`;
 const alumniBlock=alumni.length?`<section class="tl-alumni-section"><div class="tl-section__head"><div><span class="tl-kicker">Alumni & past students</span><h2>Where former members go next.</h2></div><p>Past students and researchers remain part of the lab record, including their role, years in the lab, research topics, and next position when known.</p></div><div class="tl-alumni__grid">${alumni.map(p=>`<a href="${href("/people/"+p.slug+"/")}"><strong>${esc(p.name)}</strong><span>${esc(p.position||"")}${p.end_year?` · through ${p.end_year}`:""}</span>${p.next_position?`<small>${esc(p.next_position)}</small>`:""}</a>`).join("")}</div></section>`:`<section class="tl-alumni-section tl-alumni-section--empty"><div class="tl-section__head"><div><span class="tl-kicker">Alumni & past students</span><h2>A permanent record of the lab community.</h2></div><p>Former students, research assistants, postdocs, and staff will be archived here with their lab role, dates, research topics, and next position when available.</p></div><div class="tl-empty-record"><i class="fa-solid fa-user-graduate"></i><p>No alumni profiles have been published yet.</p></div></section>`;
 return pageHero("People","A focused lab built for deep collaboration.","Meet current members, collaborators, and alumni across pharmacy, clinical research, data science, and computational health.")+`<section class="tl-page-shell">${piBlock}${teamBlock}${alumniBlock}</section>`;
}
function personPage(p){
 const links=personQuickLinks(p,{includeEmail:false});
 const education=(p.education||[]).map(x=>`<li><strong>${esc(x.label)}</strong><span>${esc(x.detail)}</span></li>`).join("");
 const honors=(p.honors||[]).map(x=>`<li><span>${esc(x.year||"")}</span><div><strong>${esc(x.title)}</strong>${x.detail?`<small>${esc(x.detail)}</small>`:""}</div></li>`).join("");
 const memberProjects=(p.current_projects||[]).map(slug=>projects.find(x=>x.slug===slug)).filter(Boolean);
 const memberPubs=memberPublications(p);
 const researchStatement=p.research_statement?`<section><h2>Research focus</h2><p class="tl-research-statement">${esc(p.research_statement)}</p></section>`:"";
 const projectsBlock=memberProjects.length?`<section><h2>Current projects</h2><div class="tl-profile-projects">${memberProjects.map(project=>`<a href="${href("/projects/"+project.slug+"/")}"><span>${esc(project.status||"Research program")}</span><strong>${esc(project.title)}</strong><i class="fa-solid fa-arrow-right"></i></a>`).join("")}</div></section>`:"";
 const publicationsBlock=memberPubs.length?`<section><div class="tl-profile-section-head"><h2>Selected publications</h2><a href="${href("/publications/")}">All publications <i class="fa-solid fa-arrow-right"></i></a></div><div class="tl-profile-publications">${memberPubs.map(pub=>`<a href="${esc(publicationExternal(pub))}" target="_blank" rel="noopener noreferrer"><span>${esc(pub.year)} · ${esc(pub.venue)}</span><strong>${esc(pub.title)}</strong><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`).join("")}</div></section>`:"";
 return pageHero(p.role_label||"Lab member",p.name+(p.credentials?", "+p.credentials:""),(p.position||"")+(p.affiliation?" · "+p.affiliation:""))+`<section class="tl-page-shell"><div class="tl-profile-grid"><aside class="tl-profile-side"><div class="tl-profile-photo">${p.photo?`<img src="${href(p.photo)}" alt="${esc(p.name)}">`:`<span>${esc(personInitials(p))}</span>`}</div>${links}${p.email?`<a class="tl-profile-email" href="mailto:${esc(p.email)}"><i class="fa-regular fa-envelope"></i> ${esc(p.email)}</a>`:""}${p.office?`<p class="tl-profile-office"><i class="fa-solid fa-location-dot"></i> ${esc(p.office)}</p>`:""}</aside><article class="tl-profile-main"><span class="tl-kicker">Biography</span><div class="tl-rich">${safeRichHtml(p.bio_html)||`<p>${esc(p.short_bio||"")}</p>`}</div>${researchStatement}<section><h2>Research topics</h2><div class="tl-topic-cloud">${(p.research_topics||[]).map(t=>`<span>${esc(t)}</span>`).join("")}</div></section>${projectsBlock}${publicationsBlock}${honors?`<section><h2>Awards & honors</h2><ul class="tl-honors-list">${honors}</ul></section>`:""}${education?`<section><h2>Training & education</h2><ul class="tl-training-list">${education}</ul></section>`:""}${p.end_year?`<section><h2>Lab history</h2><p>${p.start_year?`${esc(p.start_year)}–${esc(p.end_year)}`:`Through ${esc(p.end_year)}`}${p.next_position?` · ${esc(p.next_position)}`:""}</p></section>`:""}</article></div></section>`;
}

function publicationHome(){
  const rows=publications.filter(p=>p.featured).slice(0,4).map(p=>`<article class="tl-publication-row tl-hover-row" data-spotlight><div class="tl-publication-row__year">${esc(p.year)}</div><div><span>${esc(p.venue)}</span><h3><a class="tl-publication-title" href="${esc(publicationExternal(p))}" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a></h3><p>${esc(p.authors)}</p></div><div class="tl-pub-quick"><a href="${href("/publications/"+p.slug+"/")}" aria-label="Publication details"><i class="fa-solid fa-circle-info"></i></a>${p.pdf?`<a href="${href(p.pdf)}" target="_blank" rel="noopener noreferrer" aria-label="PDF"><i class="fa-regular fa-file-pdf"></i></a>`:""}<a href="${esc(publicationExternal(p))}" target="_blank" rel="noopener noreferrer" aria-label="Open publication"><i class="fa-solid fa-arrow-up-right-from-square"></i></a></div></article>`).join("");
  return `<section class="tl-section tl-evidence-section"><div class="tl-section__head tl-section__head--compact reveal"><div><span class="tl-kicker">Selected publications</span><h2>Evidence with a clinical endpoint.</h2></div><a class="tl-text-link" href="${href("/publications/")}">View all publications <i class="fa-solid fa-arrow-right"></i></a></div><div class="tl-publication-list tl-publication-list--home reveal">${rows}</div></section>`;
}
function publicationsPage(){
 const years=[...new Set(publications.map(p=>p.year))].sort((a,b)=>b-a);
 return pageHero("Publications","Scholarship built for clinical translation.","Browse selected peer-reviewed work spanning pharmacogenomics, cardiovascular pharmacotherapy, precision medicine, medication safety, and real-world evidence.")+`<section class="tl-page-shell"><div class="tl-publication-toolbar"><div><p><strong data-publication-count>${publications.length}</strong> selected publications</p><span>Titles open the official external publication record. Full-text PDFs hosted by the lab appear as a separate download when available.</span></div><label class="tl-publication-search"><span>Search publications</span><i class="fa-solid fa-magnifying-glass"></i><input type="search" inputmode="search" autocomplete="off" placeholder="Title, author, topic, venue…" data-publication-search aria-label="Search publications"></label></div><p class="tl-filter-empty" data-publication-empty hidden>No publications match your search.</p>${years.map(year=>`<section class="tl-pub-year" data-publication-year><div class="tl-pub-year__label">${year}</div><div class="tl-pub-cards">${publications.filter(p=>p.year===year).map(p=>{const hay=[p.title,p.authors,p.venue,p.type,p.year,...(p.topics||[])].filter(Boolean).join(" ").toLowerCase();return `<article class="tl-pub-card" id="${esc(p.slug)}" data-publication-card data-filter-text="${esc(hay)}"><div class="tl-pub-card__meta"><span>${esc(p.type||"Publication")}</span><span>${esc(p.venue)}</span></div><h2><a href="${esc(publicationExternal(p))}" target="_blank" rel="noopener noreferrer">${esc(p.title)} <i class="fa-solid fa-arrow-up-right-from-square"></i></a></h2><p class="tl-pub-card__authors">${esc(p.authors)}</p><p class="tl-pub-card__summary">${esc(p.summary||"")}</p><div class="tl-tags">${(p.topics||[]).map(t=>`<small>${esc(t)}</small>`).join("")}</div><div class="tl-pub-card__actions"><a class="tl-detail-link" href="${href("/publications/"+p.slug+"/")}">Details</a>${p.doi?`<a href="${esc("https://doi.org/"+p.doi)}" target="_blank" rel="noopener noreferrer">DOI</a>`:""}${p.pubmed?`<a href="${esc(p.pubmed)}" target="_blank" rel="noopener noreferrer">PubMed</a>`:""}${p.pdf?`<a class="tl-pdf-link" href="${href(p.pdf)}" target="_blank" rel="noopener noreferrer"><i class="fa-regular fa-file-pdf"></i> PDF</a>`:""}</div></article>`}).join("")}</div></section>`).join("")}</section>`;
}

function publicationPage(p){
 const citation=p.citation||`${p.authors} (${p.year}). ${p.title}. ${p.venue}.${p.doi?" https://doi.org/"+p.doi:""}`;
 const abstract=p.abstract||p.summary||"";
 return `<article class="tl-publication-detail"><header class="tl-publication-detail__hero"><a class="tl-back-link" href="${href("/publications/")}"><i class="fa-solid fa-arrow-left"></i> All publications</a><div class="tl-publication-detail__meta"><span>${esc(p.type||"Publication")}</span><span>${esc(p.year)}</span><span>${esc(p.venue||"")}</span></div><h1><a href="${esc(publicationExternal(p))}" target="_blank" rel="noopener noreferrer">${esc(p.title)} <i class="fa-solid fa-arrow-up-right-from-square"></i></a></h1><p class="tl-publication-detail__authors">${esc(p.authors||"")}</p><div class="tl-topic-cloud">${(p.topics||[]).map(t=>`<span>${esc(t)}</span>`).join("")}</div></header><div class="tl-publication-detail__grid"><div class="tl-publication-detail__main"><section><span class="tl-kicker">Overview</span><h2>Publication details</h2><p>${esc(p.summary||"")}</p></section>${abstract?`<section><h2>Abstract / detailed summary</h2><p>${esc(abstract)}</p></section>`:""}<section><div class="tl-profile-section-head"><h2>Preferred citation</h2><button class="tl-copy-button" type="button" data-copy-text="${esc(citation)}"><i class="fa-regular fa-copy"></i> Copy citation</button></div><div class="tl-citation-box">${esc(citation)}</div></section></div><aside><div class="tl-detail-side-card"><span>Publication links</span>${p.external_url?`<a href="${esc(p.external_url)}" target="_blank" rel="noopener noreferrer">Publisher / record <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`:""}${p.pubmed?`<a href="${esc(p.pubmed)}" target="_blank" rel="noopener noreferrer">PubMed <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`:""}${p.doi?`<a href="${esc("https://doi.org/"+p.doi)}" target="_blank" rel="noopener noreferrer">DOI <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`:""}${p.pdf?`<a class="tl-pdf-link" href="${href(p.pdf)}" target="_blank" rel="noopener noreferrer"><i class="fa-regular fa-file-pdf"></i> Full-text PDF</a>`:""}${!p.pdf?`<small class="tl-rights-note">No lab-hosted PDF is available. Use the official publication links above.</small>`:""}</div></aside></div></article>`;
}

function pageHero(kicker,title,text){return `<section class="tl-page-hero" data-size="full"><span class="tl-kicker">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(text)}</p></section>`}

const constellation=`<div class="tl-constellation tl-constellation--light reveal" data-delay="120" data-constellation aria-label="Animated orbital map of Thomas Lab research areas"><div class="tl-constellation__halo"></div><div class="tl-orbit tl-orbit--outer"></div><div class="tl-orbit tl-orbit--middle"></div><div class="tl-orbit tl-orbit--inner"></div><svg class="tl-network" viewBox="0 0 620 620" aria-hidden="true"><g class="network-lines"><path d="M310 310 L118 155"/><path d="M310 310 L492 146"/><path d="M310 310 L524 349"/><path d="M310 310 L410 511"/><path d="M310 310 L111 438"/></g><g class="network-pulses"><circle cx="118" cy="155" r="5"/><circle cx="492" cy="146" r="5"/><circle cx="524" cy="349" r="5"/><circle cx="410" cy="511" r="5"/><circle cx="111" cy="438" r="5"/></g></svg><div class="tl-core" data-core-magnet><span>THOMAS</span><strong>LAB</strong><small>precision therapeutics</small></div>
${[["Pharmacogenomics","fa-solid fa-dna",1],["Clinical NLP","fa-solid fa-file-waveform",2],["Medication Safety","fa-solid fa-shield-heart",3],["Real-World Evidence","fa-solid fa-chart-line",4],["Cardiovascular","fa-solid fa-heart-pulse",5]].map(([n,i,k])=>`<div class="tl-planet tl-planet--${k}"><div class="tl-planet__counter"><div class="tl-node"><i class="${i}"></i><span>${n}</span></div></div></div>`).join("")}<div class="tl-constellation__cursor"></div></div>`;

const homeResearch=site.research_areas.map((a,i)=>`<article id="${esc(slugify(a.title))}" class="tl-research-card tl-hover-card reveal" data-tilt data-spotlight data-delay="${i*65}"><div class="tl-research-card__top"><span>${esc(a.number)}</span><i class="${esc(a.icon)}"></i></div><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><a class="tl-research-card__link" href="${href("/research/#"+slugify(a.title)+"-detail")}" aria-label="Explore ${esc(a.title)}">Explore area <i class="fa-solid fa-arrow-right"></i></a><div class="tl-research-card__line"></div></article>`).join("");
const hero=`<section class="tl-hero tl-hero--light" data-size="full"><div class="tl-hero__wash tl-hero__wash--red"></div><div class="tl-hero__wash tl-hero__wash--blue"></div><div class="tl-hero__gridline"></div><div class="tl-hero__inner"><div class="tl-hero__copy reveal"><div class="tl-affiliation-pill"><span></span>${esc(site.affiliation)}</div><div class="tl-eyebrow"><span></span>${esc(site.hero.eyebrow)}</div><h1>${esc(site.hero.title_prefix)} <em>${esc(site.hero.title_highlight)}</em></h1><p>${esc(site.hero.summary)}</p><div class="tl-actions"><a class="tl-button tl-button--primary" href="${href(site.hero.primary_href)}">${esc(site.hero.primary_label)} <i class="fa-solid fa-arrow-right"></i></a><a class="tl-button tl-button--ghost" href="${href(site.hero.secondary_href)}">${esc(site.hero.secondary_label)}</a></div><div class="tl-hero__proof tl-discovery-rail" aria-label="Thomas Lab research pathways"><span class="tl-discovery-rail__track" aria-hidden="true"><b></b></span><a href="${href("/research/#pharmacogenomics-detail")}" class="tl-discovery-card"><span class="tl-discovery-card__icon"><i class="fa-solid fa-dna"></i></span><span class="tl-discovery-card__copy"><small>01 · Genomics</small><strong>Pharmacogenomics</strong><em>Genotype-informed therapeutics</em></span><span class="tl-discovery-card__action">Explore <i class="fa-solid fa-arrow-right"></i></span></a><a href="${href("/research/#clinical-nlp-detail")}" class="tl-discovery-card"><span class="tl-discovery-card__icon"><i class="fa-solid fa-file-waveform"></i></span><span class="tl-discovery-card__copy"><small>02 · Clinical data</small><strong>Clinical AI + NLP</strong><em>Notes to validated phenotypes</em></span><span class="tl-discovery-card__action">Explore <i class="fa-solid fa-arrow-right"></i></span></a><a href="${href("/research/#real-world-evidence-detail")}" class="tl-discovery-card"><span class="tl-discovery-card__icon"><i class="fa-solid fa-chart-line"></i></span><span class="tl-discovery-card__copy"><small>03 · Translation</small><strong>Real-world evidence</strong><em>Care pathways to outcomes</em></span><span class="tl-discovery-card__action">Explore <i class="fa-solid fa-arrow-right"></i></span></a></div></div>${constellation}</div></section>`;

const researchDetails=site.research_areas.map((area,i)=>{
  const slug=slugify(area.title);
  const related=(area.project_slugs||[]).map(projectSlug=>projects.find(p=>p.slug===projectSlug)).filter(Boolean);
  return `<article id="${esc(slug)}-detail" class="tl-research-detail reveal${i%2?" tl-research-detail--reverse":""}"><div class="tl-research-detail__visual"><span>${esc(area.number||String(i+1).padStart(2,"0"))}</span><i class="${esc(area.icon||"fa-solid fa-flask")}"></i><div class="tl-research-detail__orbit"><b></b><b></b><b></b></div></div><div class="tl-research-detail__content"><span class="tl-kicker">Research pillar</span><h2>${esc(area.title)}</h2><p>${esc(area.long_description||area.description||"")}</p>${(area.methods||[]).length?`<div class="tl-research-methods"><strong>Methods & approaches</strong><div>${area.methods.map(method=>`<span>${esc(method)}</span>`).join("")}</div></div>`:""}${related.length?`<div class="tl-research-related"><strong>Related programs</strong>${related.map(project=>`<a href="${href("/projects/"+project.slug+"/")}"><span>${esc(project.title)}</span><i class="fa-solid fa-arrow-right"></i></a>`).join("")}</div>`:""}</div></article>`;
}).join("");

write("/",shell({route:"/",title:site.name,description:site.seo.description,content:hero+`<section class="tl-section tl-research-section"><div class="tl-section__head reveal"><div><span class="tl-kicker">Research system</span><h2>Six connected ways we turn data into evidence.</h2></div><p>Therapeutics, clinical data science, and precision medicine operate here as one connected program—not as isolated projects.</p></div><div class="tl-research-grid">${homeResearch}</div></section>${projectHome()}${publicationHome()}${newsHome()}${galleryHome()}<section class="tl-join tl-join--light"><div><span class="tl-kicker">Join the lab</span><h2>Build better evidence with us.</h2><p>Students and collaborators interested in precision medicine, clinical informatics, pharmacogenomics, and trustworthy healthcare AI are welcome to explore current opportunities.</p><a class="tl-button tl-button--primary" href="${href("/opportunities/")}">View opportunities <i class="fa-solid fa-arrow-right"></i></a></div></section>`}));

write("/research/",shell({route:"/research/",title:"Research",description:"Research themes in pharmacogenomics, precision medicine, clinical NLP, healthcare AI, real-world evidence, and medication safety.",content:pageHero("Research","Connected methods for precision therapeutics.","We combine clinical questions with genetics, real-world data, NLP, machine learning, and rigorous validation.")+`<section class="tl-section tl-research-index"><h2 class="tl-sr-only">Research areas</h2><div class="tl-research-grid">${homeResearch}</div></section><section class="tl-research-details-wrap"><div class="tl-research-details-head"><span class="tl-kicker">Inside the research</span><h2>From research pillar to translational program.</h2><p>Each pillar connects a clinical question to reproducible methods, active research programs, and evidence that can support better therapeutic decisions.</p></div><div class="tl-research-details">${researchDetails}</div></section>`}));

write("/publications/",shell({route:"/publications/",title:"Publications",description:"Selected Thomas Lab peer-reviewed publications in pharmacogenomics, precision medicine, cardiovascular pharmacotherapy, and real-world evidence.",content:publicationsPage()}));
for(const publication of publications){write("/publications/"+publication.slug+"/",shell({route:"/publications/"+publication.slug+"/",title:publication.title,description:publication.summary||("Publication by "+publication.authors),type:"ScholarlyArticle",content:publicationPage(publication)}));}

write("/people/",shell({route:"/people/",title:"People",description:"Meet Thomas Lab members, collaborators, and alumni at the University of Georgia College of Pharmacy.",content:peoplePage()}));
for(const person of people){write("/people/"+person.slug+"/",shell({route:"/people/"+person.slug+"/",title:person.name,description:person.short_bio||("Profile of "+person.name+" at Thomas Lab."),type:"ProfilePage",content:personPage(person)}));}

write("/news/",shell({route:"/news/",title:"News",description:"Thomas Lab news, publications, media, talks, and research updates.",content:newsPage()}));
for(const item of news){write("/news/"+item.slug+"/",shell({route:"/news/"+item.slug+"/",title:item.title,description:item.description,type:"Article",content:newsArticlePage(item)}));}

write("/projects/",shell({route:"/projects/",title:"Projects",description:"Thomas Lab research programs in pharmacogenomics, clinical NLP, cardiovascular therapeutics, medication safety, and real-world evidence.",content:projectsPage()}));
for(const project of projects){write("/projects/"+project.slug+"/",shell({route:"/projects/"+project.slug+"/",title:project.title,description:project.short_description||project.summary,content:projectPage(project)}));}
write("/opportunities/",shell({route:"/opportunities/",title:"Opportunities",description:"PhD, research assistant, student research, and collaboration opportunities with Thomas Lab.",content:opportunitiesPage()}));
for(const opportunity of opportunities){write("/opportunities/"+opportunity.slug+"/",shell({route:"/opportunities/"+opportunity.slug+"/",title:opportunity.title,description:opportunity.summary,content:opportunityPage(opportunity)}));}

write("/contact/",shell({route:"/contact/",title:"Contact",description:"Contact Thomas Lab at the University of Georgia College of Pharmacy.",content:pageHero("Contact","Start with the research question.","For research, student, and collaboration inquiries, contact the lab using the details below.")+`<section class="tl-page-shell tl-contact-shell"><div class="tl-contact-card reveal" data-spotlight><div class="tl-contact-card__identity"><span class="tl-kicker">Thomas Lab</span><h2>${esc(site.department)}</h2><p>${esc(site.affiliation)}<br>${esc(site.office)} · ${esc(site.location)}</p><div class="tl-person-links tl-contact-actions"><a href="mailto:${esc(site.email)}"><i class="fa-regular fa-envelope"></i> ${esc(site.email)}</a><a href="tel:${esc(site.phone.replace(/\s/g,""))}"><i class="fa-solid fa-phone"></i> ${esc(site.phone)}</a></div><div class="tl-socials tl-contact-socials">${socialLinks()}</div></div><div class="tl-contact-card__routes"><span class="tl-kicker">Useful paths</span><a href="${href("/opportunities/")}"><span class="tl-contact-route__icon"><i class="fa-solid fa-user-graduate"></i></span><span><strong>Students & researchers</strong><small>See current PhD, RA, student-research, and collaboration listings.</small></span><i class="fa-solid fa-arrow-right"></i></a><a href="${href("/research/")}"><span class="tl-contact-route__icon"><i class="fa-solid fa-flask"></i></span><span><strong>Research & collaboration</strong><small>Explore the lab's research pillars and active programs first.</small></span><i class="fa-solid fa-arrow-right"></i></a><a href="${href("/publications/")}"><span class="tl-contact-route__icon"><i class="fa-solid fa-book-open"></i></span><span><strong>Publications</strong><small>Browse selected peer-reviewed work and publication details.</small></span><i class="fa-solid fa-arrow-right"></i></a></div></div></section>`}));

write("404.html",`<!doctype html><html lang="en">${head({title:"Page not found",description:"The requested Thomas Lab page could not be found.",route:"/404.html"})}<body>${header("")}<main id="main-content"><section class="tl-page-hero"><span class="tl-kicker">404</span><h1>That page is not here.</h1><p>Use the navigation or return to the Thomas Lab homepage.</p></section><section class="tl-page-shell"><a class="tl-button tl-button--primary" href="${href("/")}">Back home</a></section></main>${footer()}</body></html>`);

ensure(path.join(OUT,"assets/css")); ensure(path.join(OUT,"assets/js"));
fs.copyFileSync(path.join(ROOT,"assets/css/site.css"),path.join(OUT,"assets/css/site.css"));
fs.copyFileSync(path.join(ROOT,"assets/js/site.js"),path.join(OUT,"assets/js/site.js"));
fs.copyFileSync(path.join(ROOT,"assets/favicon.svg"),path.join(OUT,"assets/favicon.svg"));
fs.cpSync(path.join(ROOT,"assets/vendor"),path.join(OUT,"assets/vendor"),{recursive:true});
fs.writeFileSync(path.join(OUT,".nojekyll"),"");
for(const kind of ["images","pdfs"]){
  const source=path.join(ROOT,"media",kind);
  if(!fs.existsSync(source)) continue;
  const destination=path.join(OUT,"media",kind);
  ensure(destination);
  fs.cpSync(source,destination,{recursive:true,filter:(sourcePath)=>path.basename(sourcePath)!==".gitkeep"});
}

const xmlEsc=(s="")=>String(s).replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));
const today=new Date().toISOString().slice(0,10);
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  [...new Set(renderedRoutes)].map(route=>'  <url><loc>'+xmlEsc(absolute(route))+'</loc><lastmod>'+today+'</lastmod></url>').join('\n')+
  '\n</urlset>\n';
fs.writeFileSync(path.join(OUT,"sitemap.xml"),sitemap);
fs.writeFileSync(path.join(OUT,"robots.txt"),'User-agent: *\nAllow: /\nSitemap: '+absolute("/sitemap.xml")+'\n');
ensure(path.join(OUT,".well-known"));
const securityExpires=new Date(Date.now()+365*24*60*60*1000).toISOString();
fs.writeFileSync(path.join(OUT,".well-known/security.txt"),[
  "Contact: mailto:"+site.email,
  "Canonical: "+absolute("/.well-known/security.txt"),
  "Policy: "+absolute("/SECURITY.md"),
  "Preferred-Languages: en",
  "Expires: "+securityExpires,
  ""
].join("\n"));
fs.copyFileSync(path.join(ROOT,"SECURITY.md"),path.join(OUT,"SECURITY.md"));

const rssItems=[...news].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20).map(item=>
  '<item><title>'+xmlEsc(item.title)+'</title><link>'+xmlEsc(absolute("/news/"+item.slug+"/"))+'</link><guid>'+xmlEsc(absolute("/news/"+item.slug+"/"))+'</guid><pubDate>'+new Date(item.date+"T12:00:00Z").toUTCString()+'</pubDate><description>'+xmlEsc(item.description)+'</description></item>'
).join("");
const rss='<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>'+xmlEsc(site.name+' News')+'</title><link>'+xmlEsc(absolute("/news/"))+'</link><description>'+xmlEsc("Research updates and news from "+site.name)+'</description>'+rssItems+'</channel></rss>\n';
fs.writeFileSync(path.join(OUT,"feed.xml"),rss);
