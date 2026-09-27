import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT=process.cwd();
const OUT=path.join(ROOT,"_site");
const BASE=(process.env.BASE_PATH||"").replace(/\/$/,"");
const ORIGIN=(process.env.SITE_ORIGIN||"").replace(/\/$/,"");
const site=JSON.parse(fs.readFileSync(path.join(ROOT,"data/site.json"),"utf8"));\nconst publications=JSON.parse(fs.readFileSync(path.join(ROOT,"data/publications.json"),"utf8"));\nconst people=JSON.parse(fs.readFileSync(path.join(ROOT,"data/people.json"),"utf8"));

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


function personInitials(p){return p.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function memberCard(p){
  const visual=p.photo?\`<img src="\${href(p.photo)}" alt="\${esc(p.name)}" loading="lazy" decoding="async">\`:\`<span class="tl-member-monogram">\${esc(personInitials(p))}</span>\`;
  return \`<a class="tl-member-card tl-hover-card reveal tl-card-link" data-tilt data-spotlight href="\${href("/people/"+p.slug+"/")}" aria-label="View \${esc(p.name)} profile"><div class="tl-member-card__image">\${visual}</div><div class="tl-member-card__body"><span>\${esc(p.role_label||p.role)}</span><h3>\${esc(p.name)}\${p.credentials?", "+esc(p.credentials):""}</h3><p>\${esc(p.position||"")}</p><div class="tl-member-topics">\${(p.research_topics||[]).slice(0,3).map(t=>\`<small>\${esc(t)}</small>\`).join("")}</div><i class="fa-solid fa-arrow-right"></i></div></a>\`;
}
function peoplePage(){
 const pi=people.find(p=>p.role==="principal-investigator");
 const current=people.filter(p=>p.role!=="principal-investigator" && p.role!=="alumni" && !p.end_year);
 const alumni=people.filter(p=>p.role==="alumni" || p.end_year);
 const piBlock=pi?\`<a class="tl-pi-feature tl-card-link reveal" href="\${href("/people/"+pi.slug+"/")}"><div class="tl-pi-feature__visual">\${pi.photo?\`<img src="\${href(pi.photo)}" alt="\${esc(pi.name)}">\`:\`<span>\${esc(personInitials(pi))}</span>\`}</div><div class="tl-pi-feature__copy"><span class="tl-kicker">Principal Investigator</span><h2>\${esc(pi.name)}, \${esc(pi.credentials||"")}</h2><p class="tl-pi-role">\${esc(pi.position)} · \${esc(pi.affiliation)}</p><p>\${esc(pi.short_bio||"")}</p><div class="tl-tags">\${(pi.research_topics||[]).slice(0,5).map(t=>\`<small>\${esc(t)}</small>\`).join("")}</div><strong class="tl-profile-link">View full profile <i class="fa-solid fa-arrow-right"></i></strong></div></a>\`:"";
 const teamBlock=current.length?\`<section class="tl-team-block"><div class="tl-section__head"><div><span class="tl-kicker">Current members</span><h2>Different disciplines. One research system.</h2></div><p>Profiles can include research topics, projects, training, contact details, and professional links.</p></div><div class="tl-team-grid">\${current.map(memberCard).join("")}</div></section>\`:\`<section class="tl-growing-team reveal"><span class="tl-kicker">Growing team</span><h2>Students, research assistants, postdocs, and collaborators.</h2><p>New lab members can be added through the admin panel with a photo, biography, research topics, education, projects, and professional links.</p><a class="tl-button tl-button--dark" href="\${href("/opportunities/")}">Explore opportunities <i class="fa-solid fa-arrow-right"></i></a></section>\`;
 const alumniBlock=alumni.length?\`<section class="tl-alumni-section"><div class="tl-section__head"><div><span class="tl-kicker">Alumni & past students</span><h2>Where former members go next.</h2></div><p>Past students and researchers remain part of the lab record, including their role, years in the lab, and next position when known.</p></div><div class="tl-alumni__grid">\${alumni.map(p=>\`<a href="\${href("/people/"+p.slug+"/")}"><strong>\${esc(p.name)}</strong><span>\${esc(p.position||"")}\${p.end_year?\` · through \${p.end_year}\`:""}</span>\${p.next_position?\`<small>\${esc(p.next_position)}</small>\`:""}</a>\`).join("")}</div></section>\`:"";
 return pageHero("People","A focused lab built for deep collaboration.","Meet current members, collaborators, and alumni across pharmacy, clinical research, data science, and computational health.")+\`<section class="tl-page-shell">\${piBlock}\${teamBlock}\${alumniBlock}</section>\`;
}
function personPage(p){
 const links=(p.links||[]).map(l=>\`<a href="\${esc(l.url)}"\${/^https?:/.test(l.url)?' target="_blank" rel="noopener noreferrer"':""}><i class="\${esc(l.icon||"fa-solid fa-link")}"></i>\${esc(l.label)}</a>\`).join("");
 const education=(p.education||[]).map(x=>\`<li><strong>\${esc(x.label)}</strong><span>\${esc(x.detail)}</span></li>\`).join("");
 return pageHero(p.role_label||"Lab member",p.name+(p.credentials?", "+p.credentials:""),(p.position||"")+(p.affiliation?" · "+p.affiliation:""))+\`<section class="tl-page-shell"><div class="tl-profile-grid"><aside class="tl-profile-side"><div class="tl-profile-photo">\${p.photo?\`<img src="\${href(p.photo)}" alt="\${esc(p.name)}">\`:\`<span>\${esc(personInitials(p))}</span>\`}</div><div class="tl-person-links">\${links}</div>\${p.email?\`<a class="tl-profile-email" href="mailto:\${esc(p.email)}">\${esc(p.email)}</a>\`:""}\${p.office?\`<p class="tl-profile-office">\${esc(p.office)}</p>\`:""}</aside><article class="tl-profile-main"><span class="tl-kicker">Biography</span><div class="tl-rich">\${p.bio_html||\`<p>\${esc(p.short_bio||"")}</p>\`}</div><section><h2>Research topics</h2><div class="tl-topic-cloud">\${(p.research_topics||[]).map(t=>\`<span>\${esc(t)}</span>\`).join("")}</div></section>\${education?\`<section><h2>Training & education</h2><ul class="tl-training-list">\${education}</ul></section>\`:""}\${p.end_year?\`<section><h2>Lab history</h2><p>\${p.start_year?\`\${esc(p.start_year)}–\${esc(p.end_year)}\`:\`Through \${esc(p.end_year)}\`}\${p.next_position?\` · \${esc(p.next_position)}\`:""}</p></section>\`:""}</article></div></section>\`;
}

function publicationHome(){
  const rows=publications.filter(p=>p.featured).slice(0,4).map(p=>\`<article class="tl-publication-row tl-hover-row" data-spotlight><div class="tl-publication-row__year">\${esc(p.year)}</div><div><span>\${esc(p.venue)}</span><h3><a class="tl-publication-title" href="\${esc(p.external_url||p.pubmed||("#"+p.slug))}" target="_blank" rel="noopener noreferrer">\${esc(p.title)}</a></h3><p>\${esc(p.authors)}</p></div><div class="tl-pub-quick">\${p.pdf?\`<a href="\${href(p.pdf)}" target="_blank" rel="noopener noreferrer" aria-label="PDF"><i class="fa-regular fa-file-pdf"></i></a>\`:""}<a href="\${esc(p.external_url||p.pubmed)}" target="_blank" rel="noopener noreferrer" aria-label="Open publication"><i class="fa-solid fa-arrow-up-right-from-square"></i></a></div></article>\`).join("");
  return \`<section class="tl-section tl-evidence-section"><div class="tl-section__head tl-section__head--compact reveal"><div><span class="tl-kicker">Selected publications</span><h2>Evidence with a clinical endpoint.</h2></div><a class="tl-text-link" href="\${href("/publications/")}">View all publications <i class="fa-solid fa-arrow-right"></i></a></div><div class="tl-publication-list tl-publication-list--home reveal">\${rows}</div></section>\`;
}
function publicationsPage(){
 const years=[...new Set(publications.map(p=>p.year))].sort((a,b)=>b-a);
 return pageHero("Publications","Scholarship built for clinical translation.","Browse selected peer-reviewed work spanning pharmacogenomics, cardiovascular pharmacotherapy, precision medicine, medication safety, and real-world evidence.")+\`<section class="tl-page-shell"><div class="tl-publication-toolbar"><p><strong>\${publications.length}</strong> selected publications</p><span>Titles open the official external publication record. Uploaded PDFs appear as a separate download when available.</span></div>\${years.map(year=>\`<section class="tl-pub-year"><div class="tl-pub-year__label">\${year}</div><div class="tl-pub-cards">\${publications.filter(p=>p.year===year).map(p=>\`<article class="tl-pub-card" id="\${esc(p.slug)}"><div class="tl-pub-card__meta"><span>\${esc(p.type||"Publication")}</span><span>\${esc(p.venue)}</span></div><h2><a href="\${esc(p.external_url||p.pubmed)}" target="_blank" rel="noopener noreferrer">\${esc(p.title)} <i class="fa-solid fa-arrow-up-right-from-square"></i></a></h2><p class="tl-pub-card__authors">\${esc(p.authors)}</p><p class="tl-pub-card__summary">\${esc(p.summary||"")}</p><div class="tl-tags">\${(p.topics||[]).map(t=>\`<small>\${esc(t)}</small>\`).join("")}</div><div class="tl-pub-card__actions">\${p.doi?\`<a href="https://doi.org/\${encodeURIComponent(p.doi)}" target="_blank" rel="noopener noreferrer">DOI</a>\`:""}\${p.pubmed?\`<a href="\${esc(p.pubmed)}" target="_blank" rel="noopener noreferrer">PubMed</a>\`:""}\${p.pdf?\`<a class="tl-pdf-link" href="\${href(p.pdf)}" target="_blank" rel="noopener noreferrer"><i class="fa-regular fa-file-pdf"></i> PDF</a>\`:""}</div></article>\`).join("")}</div></section>\`).join("")}</section>\`;
}

function pageHero(kicker,title,text){return `<section class="tl-page-hero" data-size="full"><span class="tl-kicker">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(text)}</p></section>`}

const constellation=`<div class="tl-constellation tl-constellation--light reveal" data-delay="120" data-constellation aria-label="Animated orbital map of Thomas Lab research areas"><div class="tl-constellation__halo"></div><div class="tl-orbit tl-orbit--outer"></div><div class="tl-orbit tl-orbit--middle"></div><div class="tl-orbit tl-orbit--inner"></div><svg class="tl-network" viewBox="0 0 620 620" aria-hidden="true"><g class="network-lines"><path d="M310 310 L118 155"/><path d="M310 310 L492 146"/><path d="M310 310 L524 349"/><path d="M310 310 L410 511"/><path d="M310 310 L111 438"/></g><g class="network-pulses"><circle cx="118" cy="155" r="5"/><circle cx="492" cy="146" r="5"/><circle cx="524" cy="349" r="5"/><circle cx="410" cy="511" r="5"/><circle cx="111" cy="438" r="5"/></g></svg><div class="tl-core" data-core-magnet><span>THOMAS</span><strong>LAB</strong><small>precision therapeutics</small></div>
${[["Pharmacogenomics","fa-solid fa-dna",1,"27s","-4s","8%"],["Clinical NLP","fa-solid fa-file-waveform",2,"33s","-16s","15%"],["Medication Safety","fa-solid fa-shield-heart",3,"29s","-20s","8%"],["Real-World Evidence","fa-solid fa-chart-line",4,"36s","-28s","16%"],["Cardiovascular","fa-solid fa-heart-pulse",5,"31s","-10s","11%"]].map(([n,i,k,t,d,ins])=>`<div class="tl-planet tl-planet--${k}" style="--orbit-time:${t};--orbit-delay:${d};--orbit-inset:${ins};"><div class="tl-planet__counter"><div class="tl-node"><i class="${i}"></i><span>${n}</span></div></div></div>`).join("")}<div class="tl-constellation__cursor"></div></div>`;

const homeResearch=site.research_areas.map((a,i)=>`<article class="tl-research-card tl-hover-card reveal" data-tilt data-spotlight data-delay="${i*65}"><div class="tl-research-card__top"><span>${esc(a.number)}</span><i class="${esc(a.icon)}"></i></div><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><div class="tl-research-card__line"></div></article>`).join("");
const hero=`<section class="tl-hero tl-hero--light" data-size="full"><div class="tl-hero__wash tl-hero__wash--red"></div><div class="tl-hero__wash tl-hero__wash--blue"></div><div class="tl-hero__gridline"></div><div class="tl-hero__inner"><div class="tl-hero__copy reveal"><div class="tl-affiliation-pill"><span></span>${esc(site.affiliation)}</div><div class="tl-eyebrow"><span></span>${esc(site.hero.eyebrow)}</div><h1>${esc(site.hero.title_prefix)} <em>${esc(site.hero.title_highlight)}</em></h1><p>${esc(site.hero.summary)}</p><div class="tl-actions"><a class="tl-button tl-button--primary" href="${href(site.hero.primary_href)}">${esc(site.hero.primary_label)} <i class="fa-solid fa-arrow-right"></i></a><a class="tl-button tl-button--ghost" href="${href(site.hero.secondary_href)}">${esc(site.hero.secondary_label)}</a></div><div class="tl-hero__proof"><span><strong>Pharmacogenomics</strong><small>genotype-informed therapeutics</small></span><span><strong>Clinical AI + NLP</strong><small>structured and narrative data</small></span><span><strong>Real-world evidence</strong><small>translation to patient care</small></span></div></div>${constellation}</div></section>`;

write("/",shell({route:"/",title:site.name,description:site.seo.description,content:hero+`<section class="tl-section tl-research-section"><div class="tl-section__head reveal"><div><span class="tl-kicker">Research system</span><h2>Six connected ways we turn data into evidence.</h2></div><p>Therapeutics, clinical data science, and precision medicine operate here as one connected program—not as isolated projects.</p></div><div class="tl-research-grid">${homeResearch}</div></section>${publicationHome()}<section class="tl-join tl-join--light"><div><span class="tl-kicker">Join the lab</span><h2>Build better evidence with us.</h2><p>Students and collaborators interested in precision medicine, clinical informatics, pharmacogenomics, and trustworthy healthcare AI are welcome to explore current opportunities.</p><a class="tl-button tl-button--primary" href="${href("/opportunities/")}">View opportunities <i class="fa-solid fa-arrow-right"></i></a></div></section>`}));

write("/research/",shell({route:"/research/",title:"Research",description:"Research themes in pharmacogenomics, precision medicine, clinical NLP, healthcare AI, real-world evidence, and medication safety.",content:pageHero("Research","Connected methods for precision therapeutics.","We combine clinical questions with genetics, real-world data, NLP, machine learning, and rigorous validation.")+`<section class="tl-section"><div class="tl-research-grid">${homeResearch}</div></section>`}));

write("/publications/",shell({route:"/publications/",title:"Publications",description:"Selected Thomas Lab peer-reviewed publications in pharmacogenomics, precision medicine, cardiovascular pharmacotherapy, and real-world evidence.",content:publicationsPage()}));\n\nwrite("/people/",shell({route:"/people/",title:"People",description:"Meet Thomas Lab members, collaborators, and alumni at the University of Georgia College of Pharmacy.",content:peoplePage()}));\nfor(const person of people){write("/people/"+person.slug+"/",shell({route:"/people/"+person.slug+"/",title:person.name,description:person.short_bio||("Profile of "+person.name+" at Thomas Lab."),type:"ProfilePage",content:personPage(person)}));}\n\nfor(const [route,title,kicker,desc] of [["/projects/","Projects","Projects","Active and completed research programs."],["/news/","News","News","Lab updates, publications, talks, and milestones."],["/opportunities/","Opportunities","Join the lab","PhD, research assistant, student, and collaboration opportunities."]]){
 write(route,shell({route,title,description:desc,content:pageHero(kicker,title,desc)+`<section class="tl-page-shell"><div class="tl-empty"><strong>Structured content is being migrated in the next deployment stage.</strong><p>This route is live so navigation remains complete during the six-part upgrade.</p></div></section>`}));
}

write("/contact/",shell({route:"/contact/",title:"Contact",description:"Contact Thomas Lab at the University of Georgia College of Pharmacy.",content:pageHero("Contact","Start with the research question.","For research, student, and collaboration inquiries, contact the lab using the details below.")+`<section class="tl-page-shell tl-page-shell--narrow"><div class="tl-person-feature tl-person-feature--interactive reveal" data-spotlight><div class="tl-person-feature__copy"><span class="tl-kicker">Thomas Lab</span><h2>${esc(site.department)}</h2><p>${esc(site.affiliation)}<br>${esc(site.office)} · ${esc(site.location)}</p><div class="tl-person-links"><a href="mailto:${esc(site.email)}"><i class="fa-regular fa-envelope"></i> ${esc(site.email)}</a><a href="tel:${esc(site.phone.replace(/\s/g,""))}"><i class="fa-solid fa-phone"></i> ${esc(site.phone)}</a></div><div class="tl-socials" style="margin-top:24px">${socialLinks()}</div></div></div></section>`}));

write("404.html",`<!doctype html><html lang="en">${head({title:"Page not found",description:"The requested Thomas Lab page could not be found.",route:"/404.html"})}<body>${header("")}<main id="main-content"><section class="tl-page-hero"><span class="tl-kicker">404</span><h1>That page is not here.</h1><p>Use the navigation or return to the Thomas Lab homepage.</p></section><section class="tl-page-shell"><a class="tl-button tl-button--primary" href="${href("/")}">Back home</a></section></main>${footer()}</body></html>`);

ensure(path.join(OUT,"assets/css")); ensure(path.join(OUT,"assets/js"));
fs.copyFileSync(path.join(ROOT,"assets/css/site.css"),path.join(OUT,"assets/css/site.css"));
fs.copyFileSync(path.join(ROOT,"assets/js/site.js"),path.join(OUT,"assets/js/site.js"));
fs.writeFileSync(path.join(OUT,".nojekyll"),"");
