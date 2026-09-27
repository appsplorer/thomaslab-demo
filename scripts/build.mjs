import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT=process.cwd();
const OUT=path.join(ROOT,"_site");
const BASE=(process.env.BASE_PATH||"").replace(/\/$/,"");
const ORIGIN=(process.env.SITE_ORIGIN||"").replace(/\/$/,"");
const site=JSON.parse(fs.readFileSync(path.join(ROOT,"data/site.json"),"utf8"));

const esc=(s="")=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const href=(p="/")=>BASE+(p.startsWith("/")?p:"/"+p);
const absolute=(p="/")=>(ORIGIN||site.site_url||"")+href(p);
const ensure=(p)=>fs.mkdirSync(p,{recursive:true});
const write=(route,html)=>{
  const target=route==="404.html"?path.join(OUT,"404.html"):path.join(OUT,route.replace(/^\//,""),"index.html");
  ensure(path.dirname(target)); fs.writeFileSync(target,html);
};
const socialLinks=()=>site.socials?.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><i class="${esc(s.icon||"fa-solid fa-link")}"></i>${esc(s.label)}</a>`).join("")||"";

function structured(title,description,route,type="WebPage"){
  return JSON.stringify({"@context":"https://schema.org","@graph":[
    {"@type":"ResearchOrganization","@id":absolute("/")+"#organization","name":site.name,"url":absolute("/"),"description":site.seo.description,"email":"mailto:"+site.email,"parentOrganization":{"@type":"CollegeOrUniversity","name":"University of Georgia","url":"https://www.uga.edu/"},"department":{"@type":"Organization","name":"College of Pharmacy","url":"https://rx.uga.edu/"},"sameAs":site.socials?.map(x=>x.url)||[],"knowsAbout":site.research_areas.map(x=>x.title)},
    {"@type":"WebSite","@id":absolute("/")+"#website","url":absolute("/"),"name":site.name,"publisher":{"@id":absolute("/")+"#organization"}},
    {"@type":type,"@id":absolute(route)+"#webpage","url":absolute(route),"name":title,"description":description,"isPartOf":{"@id":absolute("/")+"#website"}}
  ]});
}
function head({title,description,route="/",type="WebPage"}){
  const full=title===site.name?site.seo.title:`${title} | ${site.name}`;
  const json=structured(full,description,route,type);
  const hash=crypto.createHash("sha256").update(json).digest("base64");
  const canonical=absolute(route);
  return `<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title><meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc((site.seo.keywords||[]).join(", "))}">
<meta name="author" content="${esc(site.name)}"><meta name="theme-color" content="#BA0C2F">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(full)}"><meta name="twitter:description" content="${esc(description)}">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'sha256-${hash}'; style-src 'self' https://cdnjs.cloudflare.com; font-src 'self' data: https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
<link rel="stylesheet" href="${href("/assets/css/site.css")}">
<script type="application/ld+json">${json}</script>
<script src="${href("/assets/js/site.js")}" defer></script>
</head>`;
}
function header(route){
 const nav=[["Research","/research/"],["Publications","/publications/"],["Projects","/projects/"],["People","/people/"],["News","/news/"],["Opportunities","/opportunities/"],["Contact","/contact/"]];
 const links=nav.map(([n,u])=>`<a href="${href(u)}"${route===u?' aria-current="page"':""}>${n}</a>`).join("");
 const drawer=nav.map(([n,u],i)=>`<a href="${href(u)}"${route===u?' aria-current="page"':""}><span>${String(i+2).padStart(2,"0")}</span>${n}<i class="fa-solid fa-arrow-right"></i></a>`).join("");
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
<div class="tl-footer__links"><span>Lab</span><a href="${href("/news/")}">News</a><a href="${href("/opportunities/")}">Opportunities</a><a href="${href("/contact/")}">Contact</a><a href="https://app.pagescms.org/" target="_blank" rel="noopener noreferrer">Admin</a></div>
<div class="tl-footer__signal"><span class="signal-dot signal-dot--1"></span><span class="signal-dot signal-dot--2"></span><span class="signal-dot signal-dot--3"></span><span class="signal-line"></span><strong>Evidence → Translation</strong><small>Pharmacogenomics · clinical data · AI · patient outcomes</small></div>
</div><div class="tl-footer__bottom"><span>© ${new Date().getFullYear()} Thomas Lab</span><span>Independent lab website · affiliated with the University of Georgia College of Pharmacy</span><span>Fast static delivery · accessible by design</span></div></footer>`;
}
function shell({route,title,description,content,type="WebPage"}){
 return `<!doctype html><html lang="en" data-dark="false">${head({title,description,route,type})}<body>${header(route)}<main id="main-content" tabindex="-1">${content}</main>${footer()}</body></html>`;
}
function pageHero(kicker,title,text){return `<section class="tl-page-hero" data-size="full"><span class="tl-kicker">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(text)}</p></section>`}

const constellation=`<div class="tl-constellation tl-constellation--light reveal" data-delay="120" data-constellation aria-label="Animated orbital map of Thomas Lab research areas"><div class="tl-constellation__halo"></div><div class="tl-orbit tl-orbit--outer"></div><div class="tl-orbit tl-orbit--middle"></div><div class="tl-orbit tl-orbit--inner"></div><svg class="tl-network" viewBox="0 0 620 620" aria-hidden="true"><g class="network-lines"><path d="M310 310 L118 155"/><path d="M310 310 L492 146"/><path d="M310 310 L524 349"/><path d="M310 310 L410 511"/><path d="M310 310 L111 438"/></g><g class="network-pulses"><circle cx="118" cy="155" r="5"/><circle cx="492" cy="146" r="5"/><circle cx="524" cy="349" r="5"/><circle cx="410" cy="511" r="5"/><circle cx="111" cy="438" r="5"/></g></svg><div class="tl-core" data-core-magnet><span>THOMAS</span><strong>LAB</strong><small>precision therapeutics</small></div>
${[["Pharmacogenomics","fa-solid fa-dna",1,"27s","-4s","8%"],["Clinical NLP","fa-solid fa-file-waveform",2,"33s","-16s","15%"],["Medication Safety","fa-solid fa-shield-heart",3,"29s","-20s","8%"],["Real-World Evidence","fa-solid fa-chart-line",4,"36s","-28s","16%"],["Cardiovascular","fa-solid fa-heart-pulse",5,"31s","-10s","11%"]].map(([n,i,k,t,d,ins])=>`<div class="tl-planet tl-planet--${k}" style="--orbit-time:${t};--orbit-delay:${d};--orbit-inset:${ins};"><div class="tl-planet__counter"><div class="tl-node"><i class="${i}"></i><span>${n}</span></div></div></div>`).join("")}<div class="tl-constellation__cursor"></div></div>`;

const homeResearch=site.research_areas.map((a,i)=>`<article class="tl-research-card tl-hover-card reveal" data-tilt data-spotlight data-delay="${i*65}"><div class="tl-research-card__top"><span>${esc(a.number)}</span><i class="${esc(a.icon)}"></i></div><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><div class="tl-research-card__line"></div></article>`).join("");
const hero=`<section class="tl-hero tl-hero--light" data-size="full"><div class="tl-hero__wash tl-hero__wash--red"></div><div class="tl-hero__wash tl-hero__wash--blue"></div><div class="tl-hero__gridline"></div><div class="tl-hero__inner"><div class="tl-hero__copy reveal"><div class="tl-affiliation-pill"><span></span>${esc(site.affiliation)}</div><div class="tl-eyebrow"><span></span>${esc(site.hero.eyebrow)}</div><h1>${esc(site.hero.title_prefix)} <em>${esc(site.hero.title_highlight)}</em></h1><p>${esc(site.hero.summary)}</p><div class="tl-actions"><a class="tl-button tl-button--primary" href="${href(site.hero.primary_href)}">${esc(site.hero.primary_label)} <i class="fa-solid fa-arrow-right"></i></a><a class="tl-button tl-button--ghost" href="${href(site.hero.secondary_href)}">${esc(site.hero.secondary_label)}</a></div><div class="tl-hero__proof"><span><strong>Pharmacogenomics</strong><small>genotype-informed therapeutics</small></span><span><strong>Clinical AI + NLP</strong><small>structured and narrative data</small></span><span><strong>Real-world evidence</strong><small>translation to patient care</small></span></div></div>${constellation}</div></section>`;

write("/",shell({route:"/",title:site.name,description:site.seo.description,content:hero+`<section class="tl-section tl-research-section"><div class="tl-section__head reveal"><div><span class="tl-kicker">Research system</span><h2>Six connected ways we turn data into evidence.</h2></div><p>Therapeutics, clinical data science, and precision medicine operate here as one connected program—not as isolated projects.</p></div><div class="tl-research-grid">${homeResearch}</div></section><section class="tl-join tl-join--light"><div><span class="tl-kicker">Join the lab</span><h2>Build better evidence with us.</h2><p>Students and collaborators interested in precision medicine, clinical informatics, pharmacogenomics, and trustworthy healthcare AI are welcome to explore current opportunities.</p><a class="tl-button tl-button--primary" href="${href("/opportunities/")}">View opportunities <i class="fa-solid fa-arrow-right"></i></a></div></section>`}));

write("/research/",shell({route:"/research/",title:"Research",description:"Research themes in pharmacogenomics, precision medicine, clinical NLP, healthcare AI, real-world evidence, and medication safety.",content:pageHero("Research","Connected methods for precision therapeutics.","We combine clinical questions with genetics, real-world data, NLP, machine learning, and rigorous validation.")+`<section class="tl-section"><div class="tl-research-grid">${homeResearch}</div></section>`}));

for(const [route,title,kicker,desc] of [["/publications/","Publications","Publications","Peer-reviewed scholarship and research outputs."],["/projects/","Projects","Projects","Active and completed research programs."],["/people/","People","People","Current members, collaborators, and alumni."],["/news/","News","News","Lab updates, publications, talks, and milestones."],["/opportunities/","Opportunities","Join the lab","PhD, research assistant, student, and collaboration opportunities."]]){
 write(route,shell({route,title,description:desc,content:pageHero(kicker,title,desc)+`<section class="tl-page-shell"><div class="tl-empty"><strong>Structured content is being migrated in the next deployment stage.</strong><p>This route is live so navigation remains complete during the six-part upgrade.</p></div></section>`}));
}

write("/contact/",shell({route:"/contact/",title:"Contact",description:"Contact Thomas Lab at the University of Georgia College of Pharmacy.",content:pageHero("Contact","Start with the research question.","For research, student, and collaboration inquiries, contact the lab using the details below.")+`<section class="tl-page-shell tl-page-shell--narrow"><div class="tl-person-feature tl-person-feature--interactive reveal" data-spotlight><div class="tl-person-feature__copy"><span class="tl-kicker">Thomas Lab</span><h2>${esc(site.department)}</h2><p>${esc(site.affiliation)}<br>${esc(site.office)} · ${esc(site.location)}</p><div class="tl-person-links"><a href="mailto:${esc(site.email)}"><i class="fa-regular fa-envelope"></i> ${esc(site.email)}</a><a href="tel:${esc(site.phone.replace(/\s/g,""))}"><i class="fa-solid fa-phone"></i> ${esc(site.phone)}</a></div><div class="tl-socials" style="margin-top:24px">${socialLinks()}</div></div></div></section>`}));

write("404.html",`<!doctype html><html lang="en">${head({title:"Page not found",description:"The requested Thomas Lab page could not be found.",route:"/404.html"})}<body>${header("")}<main id="main-content"><section class="tl-page-hero"><span class="tl-kicker">404</span><h1>That page is not here.</h1><p>Use the navigation or return to the Thomas Lab homepage.</p></section><section class="tl-page-shell"><a class="tl-button tl-button--primary" href="${href("/")}">Back home</a></section></main>${footer()}</body></html>`);

ensure(path.join(OUT,"assets/css")); ensure(path.join(OUT,"assets/js"));
fs.copyFileSync(path.join(ROOT,"assets/css/site.css"),path.join(OUT,"assets/css/site.css"));
fs.copyFileSync(path.join(ROOT,"assets/js/site.js"),path.join(OUT,"assets/js/site.js"));
fs.writeFileSync(path.join(OUT,".nojekyll"),"");
