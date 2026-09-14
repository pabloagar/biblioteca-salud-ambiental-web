(() => {
  "use strict";

  const payload = window.BIBLIOTECA_CATALOGO || { resources: [], labels: { temas: {}, formatos: {}, tipos_recurso: {} } };
  const rows = payload.resources || [];
  const territorialEntries = (payload.cases || []).flatMap(item => item.entries);
  const labels = payload.labels || { temas: {}, formatos: {}, tipos_recurso: {} };
  const view = document.getElementById("view");

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const route = (name, params = {}) => `#${name}${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`;
  const territoryNames = row => (row.territorios || []).map(t => typeof t === "string" ? t : t.name).filter(Boolean);
  const territoryObjects = row => (row.territorios || []).map(t => typeof t === "string" ? { name: t, kind: "territorio_ambiental" } : t);
  const label = (group, code) => labels[group]?.[code] || code?.replaceAll("_", " ") || "";
  const unique = values => [...new Set(values.filter(Boolean))];
  const words = value => norm(value).split(/\s+/).filter(Boolean);
  const matchesText = (row, query) => {
    const evidence = territorialEntries.filter(e => e.resource_id === row.id).map(e => [e.titulo, e.hallazgos_clave, e.lugares_sectores, e.actores_clave, e.tags, e.cita_recomendada, e.identificador_externo].join(' '));
    const haystack = norm([row.titulo, row.descripcion, row.utilidad, row.institucion, row.autor_ponente, ...(row.temas || []).map(t => label("temas", t)), ...territoryNames(row), ...evidence].join(" "));
    return words(query).every(word => haystack.includes(word));
  };
  const typeLabel = row => {
    let types = (row.tipos_recurso || []).map(t => label("tipos_recurso", t));
    const territorialType = territorialEntries.find(e => e.resource_id === row.id)?.tipo_recurso;
    if (territorialType && types.every(t => norm(t) === 'otro')) return territorialType.charAt(0).toUpperCase() + territorialType.slice(1);
    if (row.audiovisual && types.every(t => norm(t) === "otro")) types = ["Video"];
    else if (row.audiovisual && !types.some(t => /clase|grabación|seminario|webinar/i.test(t))) types.unshift("Video");
    return unique(types).join(" · ") || "Recurso";
  };
  const groupOf = row => {
    const original = norm(row.tipo_original || "");
    const types = new Set(row.tipos_recurso || []);
    if (types.has("clase") || types.has("grabacion") || row.audiovisual) return "audiovisuales";
    if (types.has("seminario") || types.has("webinar") || types.has("taller")) return "encuentros";
    if (original.includes("tesis") || original.includes("articulo") || original.includes("revisión")) return "investigacion";
    return "documentos";
  };
  const groupLabels = { audiovisuales: "Clases y videos", encuentros: "Seminarios y talleres", investigacion: "Investigación y tesis", documentos: "Documentos técnicos" };
  const byline = row => [row.autor_ponente, row.institucion, row.anio].filter(Boolean).join(" · ");
  const statusLabel = row => row.estado_url === "redirige" ? "Enlace con redirección" : row.estado_url === "funciona" ? "Enlace comprobado" : "Enlace pendiente de comprobación";
  const themeTag = code => `<a class="tag" href="${route("tema", { tema: code })}">${esc(label("temas", code))}</a>`;
  const themeCounts = () => Object.fromEntries(Object.keys(labels.temas || {}).map(code => [code, rows.filter(r => (r.temas || []).includes(code)).length]));
  const allTerritories = () => {
    const map = new Map();
    rows.forEach(row => territoryObjects(row).forEach(t => {
      const key = `${t.kind}:${t.name}`;
      const current = map.get(key) || { name: t.name, kind: t.kind, count: 0 };
      current.count += 1;
      map.set(key, current);
    }));
    return [...map.values()];
  };
  const northSouth = ["Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "Metropolitana", "O'Higgins", "Maule", "Ñuble", "Biobío", "Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"];
  const geoRank = name => {
    const n = norm(name);
    const index = northSouth.findIndex(item => n.includes(norm(item)));
    return index < 0 ? 999 : index;
  };
  const homeTerritories = () => allTerritories().filter(t => t.kind === "region").sort((a, b) => geoRank(a.name) - geoRank(b.name) || a.name.localeCompare(b.name, "es"));
  const regionLabel = name => String(name || "").replace(/^Región de /, "").replace(/^Región del /, "").replace(/^Región Metropolitana$/, "Metropolitana");

  // Curated links between the public catalogue and the six territorial cases.
  // Counts and publication years are always derived from the current public rows.
  const caseDefinitions = [
    { number:"01", slug:"polimetales-arica", name:"Polimetales en Arica", region:"Arica y Parinacota", regionId:"arica", marker:[121,10], resourceIds:[56,120,121,122,150], summary:"Recursos sobre exposición a arsénico, plomo y otros metales en Arica, incluidos trabajos sobre Cerro Chuño y salud infantil." },
    { number:"02", slug:"tocopilla", name:"Tocopilla", region:"Antofagasta", regionId:"antofagasta", marker:[118,82], resourceIds:[153], summary:"Evidencia publicada en la Biblioteca sobre salud respiratoria en una comuna expuesta a centrales termoeléctricas a carbón." },
    { number:"03", slug:"chanaral", name:"Chañaral", region:"Atacama", regionId:"atacama", marker:[107,120], resourceIds:[126,152], summary:"Estudios sobre relaves mineros, material particulado, función pulmonar e incertidumbre sanitaria en Chañaral." },
    { number:"04", slug:"huasco", name:"Huasco", region:"Atacama", regionId:"atacama", marker:[105,152], resourceIds:[153], summary:"Material publicado sobre salud respiratoria y exposición asociada a centrales termoeléctricas a carbón en Huasco." },
    { number:"05", slug:"quintero-puchuncavi-ventanas", name:"Quintero-Puchuncaví-Ventanas", region:"Valparaíso", regionId:"valparaiso", marker:[102,214], resourceIds:[4,44,127,128,129,155], summary:"Estudios, tesis y documentos sobre exposición, salud, regulación y justicia ambiental en Quintero, Puchuncaví y Ventanas." },
    { number:"06", slug:"coronel", name:"Coronel", region:"Biobío", regionId:"biobio", marker:[78,291], resourceIds:[136], summary:"Recursos sobre la acción del Estado por la salud y la justicia ambiental en Coronel." },
  ];
  (payload.cases || []).forEach(imported => {
    const current = caseDefinitions.find(item => item.slug === imported.slug);
    if (current) {
      const resourceIds = unique([...current.resourceIds, ...imported.resourceIds]);
      Object.assign(current, imported, {resourceIds});
    }
  });
  const caseBySlug = slug => caseDefinitions.find(item => item.slug === slug);
  const caseResources = item => (item?.resourceIds || []).map(id => rows.find(row => row.id === id)).filter(Boolean);
  const casesForRow = row => caseDefinitions.filter(item => item.resourceIds.includes(row.id));
  const caseYearRange = item => {
    const years = caseResources(item).filter(row => row.anio).map(row => Number(row.anio)).filter(Number.isFinite).sort((a,b)=>a-b);
    if (!years.length) return "Sin año consignado";
    return years[0] === years.at(-1) ? String(years[0]) : `${years[0]}–${years.at(-1)}`;
  };
  const caseThemeCounts = item => {
    const counts = new Map();
    caseResources(item).forEach(row => (row.temas || []).forEach(code => counts.set(code,(counts.get(code)||0)+1)));
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]||label("temas",a[0]).localeCompare(label("temas",b[0]),"es"));
  };

  function resultRow(row) {
    const territorialCases = casesForRow(row);
    return `<article class="result-row">
      <div class="result-kind">${esc(typeLabel(row))}<div class="meta">${esc(row.tipo_relacion_salud_ambiental ? `Relación ${row.tipo_relacion_salud_ambiental}` : "Relación por determinar")}</div></div>
      <div class="result-main">
        <h2><a href="${route("recurso", { id: row.id })}">${esc(row.titulo)}</a></h2>
        <p class="meta">${esc(byline(row))}${territoryNames(row).length ? ` · ${esc(territoryNames(row).join(" · "))}` : ""}</p>
        <p>${esc(row.descripcion || "Ficha sin resumen editorial.")}</p>
        ${territorialCases.length ? `<div class="result-case-links">${territorialCases.map(item=>`<a href="${route('caso',{caso:item.slug})}">Caso territorial · ${esc(item.name)}</a>`).join('')}</div>` : ''}
        <div class="result-bottom">
          <div class="tag-list">${(row.temas || []).slice(0, 4).map(themeTag).join("")}</div>
          <a class="text-link" href="${route("recurso", { id: row.id })}">Ver ficha →</a>
        </div>
      </div>
    </article>`;
  }

  function catalogResultRow(row) {
    const group = groupOf(row);
    const territorialCases = casesForRow(row);
    const icon = row.audiovisual ? '▷' : group === 'investigacion' ? '⌕' : group === 'encuentros' ? '◌' : '▤';
    return `<article class="catalog-result-card">
      <div class="catalog-result-icon catalog-result-icon-${group}" aria-hidden="true">${icon}</div>
      <div class="catalog-result-copy">
        <p class="catalog-result-meta"><span>${esc(typeLabel(row))}</span>${row.anio?`<i></i><span>${esc(row.anio)}</span>`:''}${row.institucion?`<i></i><span>${esc(row.institucion)}</span>`:''}</p>
        <h2><a href="${route('recurso',{id:row.id})}">${esc(row.titulo)}</a></h2>
        <p class="catalog-result-summary">${esc(row.descripcion || 'Ficha sin resumen editorial.')}</p>
        ${territorialCases.length?`<div class="catalog-case-links">${territorialCases.map(item=>`<a href="${route('caso',{caso:item.slug})}">Caso territorial · ${esc(item.name)}</a>`).join('')}</div>`:''}
        <div class="catalog-result-bottom"><div class="tag-list">${(row.temas||[]).slice(0,4).map(themeTag).join('')}</div><a class="text-link" href="${route('recurso',{id:row.id})}">Ver ficha →</a></div>
      </div>
    </article>`;
  }

  function paginationItems(current,total) {
    if (total <= 7) return Array.from({length:total},(_,index)=>index+1);
    const pages = unique([1,current-1,current,current+1,total].filter(page=>page>=1&&page<=total)).sort((a,b)=>a-b);
    const items = [];
    pages.forEach((page,index)=>{
      if (index && page-pages[index-1]>1) items.push('…');
      items.push(page);
    });
    return items;
  }

  const regions = window.BIBLIOTECA_REGIONES || [];
  const seq = ['#DCECE8', '#A8D0C8', '#6DAFA3', '#2E8376', '#0F5A50'];
  const regionKey = name => norm(name).replace(/[^a-z]/g, '');
  const regionalCatalog = () => regions.map(region => {
    const matches = homeTerritories().filter(t => regionKey(t.name).includes(region.id));
    return { ...region, count: matches.reduce((sum, t) => sum + t.count, 0), territory: matches[0]?.name };
  });
  const scaleColor = (value, min, max) => value == null ? '#D6D3CD' : seq[max === min ? 2 : Math.min(4, Math.floor((value - min) / (max - min) * 5))];
  const mapCredit = `<p class="map-credit">Límites regionales: <a href="https://www.geoboundaries.org/" target="_blank" rel="noopener noreferrer">geoBoundaries</a> (BCN Chile / OCHA ROLAC), CC BY 3.0 IGO. Chile continental.</p>`;

  function regionMap(items, mode) {
    const values = items.map(r => r.value).filter(v => v != null);
    const min = Math.min(...values), max = Math.max(...values);
    return `<svg class="region-map" viewBox="0 0 220 640" role="group" aria-label="${mode === 'catalog' ? 'Recursos por región' : 'Indicadores por región'}">${items.map(r => {
      const accessible = `${r.name}: ${mode === 'catalog' ? (r.count ? `${r.count} ${r.count === 1 ? 'recurso' : 'recursos'}` : 'Sin recursos') : r.value == null ? 'Sin datos' : r.value}`;
      const shape = `<path d="${r.path}" fill="${scaleColor(r.value, min, max)}" fill-rule="evenodd"><title>${esc(accessible)}</title></path>`;
      return mode === 'catalog' && r.count ? `<a href="${route('territorio', {territorio:r.territory})}" data-region="${r.id}" aria-label="${esc(accessible)}">${shape}</a>` : `<g data-region="${r.id}" ${mode === 'data' ? 'role="button" tabindex="0"' : ''} aria-label="${esc(accessible)}">${shape}</g>`;
    }).join('')}</svg>`;
  }

  function casesMap() {
    const counts = Object.fromEntries(regions.map(region => [region.id, caseDefinitions.filter(item => item.regionId === region.id).length]));
    const colors = ['#DCECE8','#A8D0C8','#6DAFA3'];
    return `<svg class="cases-map" viewBox="0 0 220 640" role="group" aria-label="Mapa de Chile con seis casos territoriales documentados">
      ${regions.map(region => `<path d="${region.path}" fill="${colors[Math.min(2,counts[region.id]||0)]}" stroke="#F7F4EF" stroke-width=".7" fill-rule="evenodd"><title>${esc(region.name)}: ${counts[region.id]||0} ${(counts[region.id]||0)===1?'caso':'casos'}</title></path>`).join('')}
      ${caseDefinitions.map(item => `<a href="${route('caso',{caso:item.slug})}" class="case-marker" data-case="${item.slug}" aria-label="Abrir el caso ${esc(item.name)}"><circle cx="${item.marker[0]}" cy="${item.marker[1]}" r="4"/><title>${esc(item.name)}</title></a>`).join('')}
    </svg>`;
  }

  function bindCaseHover(container) {
    if (!container) return;
    const targets = [...container.querySelectorAll('[data-case]')];
    const highlight = slug => targets.forEach(element => {
      element.classList.toggle('case-active', element.dataset.case === slug);
      element.classList.toggle('case-muted', Boolean(slug) && element.dataset.case !== slug);
    });
    targets.forEach(element => {
      element.addEventListener('mouseenter',()=>highlight(element.dataset.case));
      element.addEventListener('mouseleave',()=>highlight(null));
      element.addEventListener('focus',()=>highlight(element.dataset.case));
      element.addEventListener('blur',()=>highlight(null));
    });
  }

  function editorialCard(row, photographic = false) {
    const cover = photographic
      ? `<figure class="editorial-media"><img src="assets/design-p7.webp" alt="Paisaje de Icalma usado como imagen de la selección editorial" width="1400" height="1050" loading="lazy"><figcaption class="photo-credit">Icalma</figcaption></figure>`
      : `<div class="type-cover ${row.audiovisual ? 'type-cover-av' : ''}" aria-hidden="true"><div class="cover-meta"><span>${esc(typeLabel(row))}</span><span>${esc(row.anio || '')}</span></div><div class="cover-title">${esc(row.titulo)}</div><div class="cover-rule"></div></div>`;
    return `<article class="editorial-card ${photographic ? 'with-photo' : 'without-photo'}">${cover}<div class="editorial-body"><p class="resource-kind">${esc(typeLabel(row))}${row.anio ? `<span> · ${esc(row.anio)}</span>` : ''}</p><h3><a href="${route('recurso',{id:row.id})}">${esc(row.titulo)}</a></h3><p class="meta">${esc(byline(row))}</p><p class="editorial-description">${esc(row.descripcion || '')}</p><a class="text-link" href="${route('recurso',{id:row.id})}">Ver ficha →</a></div></article>`;
  }

  function home() {
    const counts = Object.fromEntries(Object.keys(groupLabels).map(group => [group, rows.filter(r => groupOf(r) === group).length]));
    const topics = Object.entries(themeCounts()).filter(([, count]) => count).sort((a, b) => b[1] - a[1]).slice(0, 9);
    const featured = rows.find(r => r.id === 29) || rows.find(r => r.prioridad_formato === 1) || rows[0];
    const companions = rows.filter(r => r.id !== featured?.id).sort((a, b) => (a.prioridad_formato || 6) - (b.prioridad_formato || 6) || (b.prioridad_total || 0) - (a.prioridad_total || 0)).slice(0, 2);
    const regionsWithCounts = regionalCatalog();
    view.innerHTML = `<section class="hero"><figure class="hero-media"><img src="assets/design-p1.webp" alt="Arco rocoso de La Portada en la costa de Antofagasta" width="1400" height="1051" fetchpriority="high"><figcaption class="photo-credit">La Portada, Antofagasta</figcaption></figure><div class="shell hero-inner"><div class="hero-copy"><p class="eyebrow">Conocimiento abierto · Perspectiva chilena</p><h1>Ambiente y salud<br><em>Un conocimiento compartido</em></h1><p class="hero-lede">Clases, seminarios, estudios y documentos seleccionados para aprender, enseñar e investigar desde Chile</p></div><form id="home-search" role="search"><label class="search-label" for="home-query">¿Qué quieres explorar?</label><div class="search-combo"><input id="home-query" type="search" placeholder="Busca un tema, autor, institución o territorio"><button class="primary-button" type="submit">Buscar en la biblioteca <span aria-hidden="true">→</span></button></div></form></div></section>
    <div class="type-band"><div class="shell type-links">${Object.entries(groupLabels).map(([group, text]) => `<a href="${route('catalogo',{grupo:group})}"><span>${esc(text)}</span><strong>${counts[group]}</strong></a>`).join('')}</div></div>
    <section class="home-section home-topics"><div class="shell topics-layout"><div><p class="eyebrow">01 / Explorar por tema</p><h2>Las preguntas se conectan.</h2><p class="section-lede">Un recurso puede pertenecer a varios temas. Estos son los tres con más material en la Biblioteca.</p><div class="top-topics">${topics.slice(0,3).map(([code,count]) => `<a href="${route('tema',{tema:code})}"><span>${esc(label('temas',code))}</span><small>${count} recursos</small></a>`).join('')}</div></div><div class="other-topics"><p class="index-heading">Los demás temas</p>${topics.slice(3).map(([code,count]) => `<a href="${route('tema',{tema:code})}"><span>${esc(label('temas',code))}</span><small>${count}</small></a>`).join('')}<a class="text-link" href="#temas">Ver todos los temas →</a></div></div></section>
    <section class="home-section territory-section"><div class="shell territory-layout"><div class="territory-intro"><p class="eyebrow">02 / Territorios de Chile</p><h2>El lugar también es parte de la historia.</h2><p class="section-lede">Explora estudios y experiencias desde los territorios donde se sitúan.</p></div><figure class="territory-photo"><img src="assets/design-p2.webp" width="1400" height="1867" alt="Bosque de araucarias en el camino a Icalma" loading="lazy"><figcaption class="photo-credit">Camino a Icalma · Bosque de araucarias</figcaption></figure><div class="territory-map-wrap">${regionMap(regionsWithCounts.map(r => ({...r,value:r.count || null})), 'catalog')}<div class="map-legend"><span class="legend-scale">${seq.map(c=>`<i style="background:${c}"></i>`).join('')}</span><span>1 → ${Math.max(...regionsWithCounts.map(r=>r.count),0)} recursos</span><span class="no-data-key">Sin recursos</span></div>${mapCredit}</div><div class="territory-list" aria-label="Regiones de Chile">${regionsWithCounts.map(r => r.count ? `<a data-region="${r.id}" href="${route('territorio',{territorio:r.territory})}"><span>${esc(r.name)}</span><small>${r.count}<span class="desktop-count"> ${r.count === 1 ? 'recurso' : 'recursos'} →</span></small></a>` : `<div class="no-resources" data-region="${r.id}"><span>${esc(r.name)}</span><small><span class="desktop-count">Sin recursos</span><span class="mobile-count" aria-label="Sin recursos">—</span></small></div>`).join('')}</div><a class="text-link territory-more" href="#territorios">Explorar todos los territorios →</a></div></section>
    <section class="home-section editorial-section"><div class="shell"><div class="section-heading"><div><p class="eyebrow">03 / Selección editorial</p><h2>Un punto de partida.</h2></div><a class="text-link" href="#catalogo">Explorar la biblioteca →</a></div><div class="editorial-grid">${featured ? editorialCard(featured, true) : ''}${companions.map(r=>editorialCard(r)).join('')}</div></div></section>
    `;
    document.getElementById('home-search').addEventListener('submit', event => {
      event.preventDefault();
      const q = document.getElementById('home-query').value.trim();
      location.hash = route('catalogo', q ? {q} : {}).slice(1);
    });
    bindRegionHover(document.querySelector('.territory-section'));
  }

  function bindRegionHover(container) {
    const targets = container.querySelectorAll('[data-region]');
    const tooltip = document.createElement('div');
    tooltip.className = 'region-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    container.append(tooltip);
    const highlight = id => targets.forEach(el => {
      el.classList.toggle('region-active', el.dataset.region === id);
      el.classList.toggle('region-muted', Boolean(id) && el.dataset.region !== id);
    });
    targets.forEach(el => {
      el.addEventListener('mouseenter', () => {
        highlight(el.dataset.region);
        const mapRegion = container.querySelector(`.region-map [data-region="${el.dataset.region}"]`);
        tooltip.textContent = mapRegion?.getAttribute('aria-label') || el.textContent;
        const rect = el.getBoundingClientRect();
        tooltip.style.left = `${Math.max(12, Math.min(rect.right + 8, window.innerWidth - 212))}px`;
        tooltip.style.top = `${Math.max(12, Math.min(rect.top, window.innerHeight - 80))}px`;
        tooltip.hidden = false;
      });
      el.addEventListener('mouseleave', () => { highlight(null); tooltip.hidden = true; });
      el.addEventListener('focus', () => highlight(el.dataset.region));
      el.addEventListener('blur', () => highlight(null));
    });
  }

  const pm25Payload = window.BIBLIOTECA_PM25 || null;
  const pm25Number = value => Number.isFinite(value) ? value.toLocaleString('es-CL', {minimumFractionDigits:1,maximumFractionDigits:1}) : 's/d';
  const pm25Slug = value => norm(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const pm25Annual = (capital, year) => capital.series.find(point => point.year === year);
  const pm25Quality = {validado:'Validado',mixto:'Mixto',preliminar:'Preliminar',insuficiente:'Insuficiente'};

  function pm25Segments(capital, years, width, height, maxValue, padding = 3) {
    const x = index => padding + index * ((width-padding*2) / Math.max(years.length-1,1));
    const y = value => height-padding-(value/maxValue)*(height-padding*2);
    const segments = [];
    let current = [];
    years.forEach((year,index)=>{
      const point = pm25Annual(capital,year);
      if (Number.isFinite(point?.value)) current.push([x(index),y(point.value)]);
      else if (current.length) { segments.push(current); current=[]; }
    });
    if (current.length) segments.push(current);
    return segments;
  }

  function pm25Sparkline(capital) {
    const years = Array.from({length:13},(_,index)=>2013+index);
    const maxValue = Math.max(...capital.series.filter(point=>years.includes(point.year)&&Number.isFinite(point.value)).map(point=>point.value),1);
    const lines = pm25Segments(capital,years,112,30,maxValue).map(points=>`<polyline points="${points.map(point=>point.join(',')).join(' ')}"/>`).join('');
    return `<svg class="pm25-sparkline" viewBox="0 0 112 30" role="img" aria-label="Tendencia anual 2013 a 2025 de ${esc(capital.name)}">${lines}</svg>`;
  }

  function pm25DetailChart(capital) {
    const years = Array.from({length:14},(_,index)=>2013+index);
    const width=760,height=260,left=46,right=22,top=20,bottom=38;
    const observed=capital.series.filter(point=>point.year>=2013&&point.year<=2026&&Number.isFinite(point.value)).map(point=>point.value);
    const maxValue=Math.max(40,Math.ceil(Math.max(...observed,1)/10)*10);
    const gridStep=maxValue<=40?10:20;
    const gridValues=Array.from({length:Math.floor(maxValue/gridStep)+1},(_,index)=>index*gridStep);
    if(gridValues.at(-1)!==maxValue) gridValues.push(maxValue);
    const chartWidth=width-left-right,chartHeight=height-top-bottom;
    const x = year => left+(year-2013)*(chartWidth/13);
    const y = value => top+chartHeight-(value/maxValue)*chartHeight;
    const completeYears=years.slice(0,-1);
    const completeSegments=[];
    let completeCurrent=[];
    completeYears.forEach(year=>{
      const point=pm25Annual(capital,year);
      if(Number.isFinite(point?.value)) completeCurrent.push([x(year),y(point.value)]);
      else if(completeCurrent.length){completeSegments.push(completeCurrent);completeCurrent=[];}
    });
    if(completeCurrent.length) completeSegments.push(completeCurrent);
    const completeLines=completeSegments.map(points=>`<polyline class="pm25-chart-line" points="${points.map(point=>point.join(',')).join(' ')}"/>`).join('');
    const points=completeYears.map(year=>pm25Annual(capital,year)).filter(point=>Number.isFinite(point?.value));
    const last=pm25Annual(capital,2025),ytd=pm25Annual(capital,2026);
    const ytdConnector=Number.isFinite(last?.value)&&Number.isFinite(ytd?.value)?`<line class="pm25-ytd-connector" x1="${x(2025)}" y1="${y(last.value)}" x2="${x(2026)}" y2="${y(ytd.value)}"/>`:'';
    const dots=points.map(point=>`<circle cx="${x(point.year)}" cy="${y(point.value)}" r="3"><title>${point.year}: ${pm25Number(point.value)} µg/m³</title></circle>`).join('');
    const ytdDot=Number.isFinite(ytd?.value)?`<circle class="pm25-ytd-dot" cx="${x(2026)}" cy="${y(ytd.value)}" r="5"><title>2026 YTD provisional: ${pm25Number(ytd.value)} µg/m³</title></circle>`:'';
    return `<svg class="pm25-detail-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Serie anual de PM2.5 en ${esc(capital.name)}; 2013 a 2025 son años completos y 2026 es YTD provisional">
      <rect class="pm25-ytd-band" x="${x(2026)-chartWidth/26}" y="0" width="${chartWidth/13+right}" height="${height}"/>
      ${gridValues.map(value=>`<g class="pm25-grid"><line x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}"/><text x="${left-9}" y="${y(value)+4}">${value}</text></g>`).join('')}
      ${completeLines}${ytdConnector}<g class="pm25-chart-points">${dots}${ytdDot}</g>
      ${[2013,2017,2021,2025].map(year=>`<text class="pm25-year-label" x="${x(year)}" y="${height-10}">${year}</text>`).join('')}
      <text class="pm25-year-label pm25-ytd-label" x="${x(2026)}" y="${height-10}">2026 YTD</text>
      <text class="pm25-axis-title" transform="translate(13 ${height/2}) rotate(-90)">PM2.5 (µg/m³)</text>
    </svg>`;
  }

  function pm25ComparisonChart(capitals, selectedName) {
    const years=Array.from({length:13},(_,index)=>2013+index),width=1120,height=390,left=48,right=28,top=26,bottom=42;
    const observed=capitals.flatMap(capital=>capital.series.filter(point=>years.includes(point.year)&&Number.isFinite(point.value)).map(point=>point.value));
    const maxValue=Math.max(40,Math.ceil(Math.max(...observed,1)/10)*10);
    const gridStep=maxValue<=40?10:20;
    const gridValues=Array.from({length:Math.floor(maxValue/gridStep)+1},(_,index)=>index*gridStep);
    if(gridValues.at(-1)!==maxValue) gridValues.push(maxValue);
    const chartWidth=width-left-right,chartHeight=height-top-bottom;
    const paths=capitals.map(capital=>{
      const selected=capital.name===selectedName;
      return pm25Segments(capital,years,chartWidth,chartHeight,maxValue,0).map(points=>`<polyline class="${selected?'is-selected':''}" points="${points.map(([px,py])=>`${px+left},${py+top}`).join(' ')}"><title>${esc(capital.name)}</title></polyline>`).join('');
    }).join('');
    return `<svg class="pm25-comparison-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Comparación de promedios anuales de PM2.5 entre capitales regionales, 2013 a 2025">
      ${gridValues.map(value=>`<g class="pm25-grid"><line x1="${left}" y1="${top+chartHeight-(value/maxValue)*chartHeight}" x2="${width-right}" y2="${top+chartHeight-(value/maxValue)*chartHeight}"/><text x="${left-10}" y="${top+chartHeight-(value/maxValue)*chartHeight+4}">${value}</text></g>`).join('')}
      <g class="pm25-comparison-lines">${paths}</g>
      ${[2013,2015,2017,2019,2021,2023,2025].map(year=>`<text class="pm25-year-label" x="${left+(year-2013)*(chartWidth/12)}" y="${height-12}">${year}</text>`).join('')}
      <text class="pm25-axis-title" transform="translate(13 ${height/2}) rotate(-90)">PM2.5 (µg/m³)</text>
    </svg>`;
  }

  function pm25Csv(capitals) {
    const header=['region_code','capital','region','macrozona','year','year_type','annual_mean_ugm3','classification','coverage_pct','n_days_with_data','days_in_period','station_ids_used'];
    const quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
    return [header.join(','),...capitals.flatMap(capital=>capital.series.map(point=>[
      capital.regionCode,capital.name,capital.region,capital.macrozone,point.year,point.type,point.value,point.classification,point.coveragePct,point.daysWithData,point.daysInPeriod,point.stationIdsUsed.join(';')
    ].map(quote).join(',')))].join('\r\n');
  }

  function dataPage(params) {
    if (!pm25Payload?.capitals?.length) return notFound('Datos todavía no disponibles');
    const all=pm25Payload.capitals.slice().sort((a,b)=>a.order-b.order);
    const requested=params.get('capital');
    let selected=all.find(capital=>pm25Slug(capital.name)===requested)||all.find(capital=>capital.name==='Coyhaique')||all[0];
    let macro='Todas',sort='annual-desc';
    const macrozones=['Todas',...unique(all.map(capital=>capital.macrozone))];
    view.innerHTML = `<section class="data-hero"><div class="shell data-hero-inner"><div><p class="eyebrow">Datos · Calidad del aire</p><h1>PM2.5 en capitales regionales de Chile</h1><p>Promedio anual de material particulado fino (PM2.5) en las 16 capitales regionales. La comparación principal comprende 2013–2025; 2026 se presenta por separado como avance provisional.</p></div><aside><p class="eyebrow">Una lectura documentada</p><h2>Aire más limpio,<br>comunidades más saludables</h2><p>Series con cobertura, calidad y selección de estaciones explícitas.</p></aside></div></section>
      <nav class="data-product-tabs" aria-label="Visualizaciones de PM2.5"><div class="shell"><a href="#datos" aria-current="page">Serie anual</a><span aria-disabled="true">Ciclo estacional <small>Próximamente</small></span></div></nav>
      <section class="pm25-controls"><div class="shell"><span>Filtrar por macrozona</span><div class="pm25-filter-chips">${macrozones.map(item=>`<button type="button" data-pm25-macro="${esc(item)}" aria-pressed="${item===macro}">${esc(item)}</button>`).join('')}</div><a href="#pm25-metodologia">¿Cómo leer estos datos? ↓</a></div></section>
      <section class="shell pm25-dashboard" id="pm25-anual"><section class="pm25-ranking-panel"><div class="pm25-panel-head"><div><p class="eyebrow">Comparación nacional</p><h2>Capitales regionales <span>(16)</span></h2></div><label>Ordenar por<select id="pm25-sort"><option value="annual-desc">PM2.5 anual 2025</option><option value="ytd-desc">2026 YTD</option><option value="north">Norte a sur</option><option value="name">Nombre A–Z</option></select></label></div><div class="pm25-table-head"><span># · Ciudad</span><span>Tendencia<br>2013–2025</span><span>2025<br>µg/m³</span><span>2026 YTD<br>provisional</span></div><div id="pm25-city-list"></div><p class="pm25-table-note">Las discontinuidades indican períodos sin un promedio publicable. Un año insuficiente no se interpola.</p></section><section class="pm25-detail-panel" id="pm25-detail" aria-live="polite"></section></section>
      <section class="shell pm25-comparison"><div class="pm25-section-head"><div><p class="eyebrow">Las capitales en una misma escala</p><h2>Trece años de series, una sola escala</h2><p>Cada línea corresponde a una capital. La ciudad seleccionada queda destacada; 2026 YTD no se incorpora a esta comparación.</p></div><button type="button" id="pm25-download-top">Descargar serie completa ↓</button></div><div id="pm25-comparison-chart"></div></section>
      <section class="pm25-method" id="pm25-metodologia"><div class="shell"><article><span>▥</span><div><h3>Calidad de los datos</h3><p><i class="quality-validado"></i> Validado · <i class="quality-mixto"></i> Mixto · <i class="quality-preliminar"></i> Preliminar · <i class="quality-insuficiente"></i> Insuficiente</p><small>Los valores con cobertura insuficiente permanecen vacíos.</small></div></article><article><span>▤</span><div><h3>Metodología</h3><p>${esc(pm25Payload.method)}</p></div></article><article><span>⌖</span><div><h3>Estaciones y cobertura</h3><p id="pm25-station-summary"></p></div></article><article><span>↓</span><div><h3>Descargar datos</h3><button type="button" id="pm25-download-bottom">Serie anual en CSV</button><small>Fuente: ${esc(pm25Payload.source)}.</small></div></article></div></section>`;

    const visibleCapitals=()=>all.filter(capital=>macro==='Todas'||capital.macrozone===macro).sort((a,b)=>{
      if(sort==='north') return a.order-b.order;
      if(sort==='name') return a.name.localeCompare(b.name,'es');
      const year=sort==='ytd-desc'?2026:2025;
      return (pm25Annual(b,year)?.value??-Infinity)-(pm25Annual(a,year)?.value??-Infinity)||a.order-b.order;
    });
    const syncUrl=()=>history.replaceState(null,'',route('datos',{capital:pm25Slug(selected.name)}));
    const renderDetail=()=>{
      const annual=pm25Annual(selected,2025),ytd=pm25Annual(selected,2026);
      const usable=selected.series.filter(point=>point.type==='completo'&&point.year>=2013&&point.year<=2025&&Number.isFinite(point.value));
      const first=usable[0];
      const included=selected.stations.filter(station=>station.included);
      const comparison=first&&Number.isFinite(annual?.value)?`Entre ${first.year} y 2025, el promedio anual pasó de ${pm25Number(first.value)} a ${pm25Number(annual.value)} µg/m³. Esta comparación describe la serie y no atribuye causas.`:'La serie no cuenta con dos extremos publicables para calcular una comparación.';
      document.getElementById('pm25-detail').innerHTML=`<div class="pm25-detail-head"><div><p class="eyebrow">${esc(selected.region)} · ${esc(selected.macrozone)}</p><h2>${esc(selected.name)}</h2></div><span>${included.length} ${included.length===1?'estación incluida':'estaciones incluidas'}</span></div><div class="pm25-metrics"><article><strong>${pm25Number(annual?.value)} <small>${esc(pm25Payload.unit)}</small></strong><span>Promedio anual 2025</span><small>${pm25Quality[annual?.classification]||'Sin clasificación'} · ${pm25Number(annual?.coveragePct)}% cobertura</small></article><article class="is-ytd"><strong>${pm25Number(ytd?.value)} <small>${esc(pm25Payload.unit)}</small></strong><span>2026 a la fecha</span><small>YTD provisional · ${pm25Quality[ytd?.classification]||'Sin clasificación'} · ${pm25Number(ytd?.coveragePct)}% cobertura</small></article></div><h3 class="pm25-chart-title">Evolución anual de PM2.5 en ${esc(selected.name)}</h3>${pm25DetailChart(selected)}<p class="pm25-observation"><i aria-hidden="true">◆</i>${esc(comparison)} <strong>2026 permanece separado por ser un período parcial.</strong></p>`;
      document.getElementById('pm25-station-summary').textContent=`${included.length} estaciones incluidas para ${selected.name}. ${ytd?.stationsWithData??0} aportan datos al avance 2026.`;
      document.getElementById('pm25-comparison-chart').innerHTML=pm25ComparisonChart(visibleCapitals(),selected.name);
      syncUrl();
    };
    const renderList=()=>{
      const current=visibleCapitals();
      if(!current.includes(selected)) selected=current[0]||all[0];
      document.getElementById('pm25-city-list').innerHTML=current.map((capital,index)=>{
        const annual=pm25Annual(capital,2025),ytd=pm25Annual(capital,2026);
        return `<button type="button" class="pm25-city-row" data-pm25-city="${esc(pm25Slug(capital.name))}" aria-pressed="${capital===selected}"><span><small>${index+1}</small><strong>${esc(capital.name)}</strong></span>${pm25Sparkline(capital)}<b>${pm25Number(annual?.value)}</b><b class="pm25-ytd-value"><i class="quality-${esc(ytd?.classification||'insuficiente')}"></i>${pm25Number(ytd?.value)}</b></button>`;
      }).join('');
      document.querySelectorAll('[data-pm25-city]').forEach(button=>button.addEventListener('click',()=>{
        selected=all.find(capital=>pm25Slug(capital.name)===button.dataset.pm25City)||selected;
        document.querySelectorAll('[data-pm25-city]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
        renderDetail();
      }));
      renderDetail();
    };
    document.querySelectorAll('[data-pm25-macro]').forEach(button=>button.addEventListener('click',()=>{
      macro=button.dataset.pm25Macro;
      document.querySelectorAll('[data-pm25-macro]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      renderList();
    }));
    document.getElementById('pm25-sort').addEventListener('change',event=>{sort=event.target.value;renderList();});
    const download=()=>{
      const blob=new Blob(['\uFEFF'+pm25Csv(all)],{type:'text/csv;charset=utf-8'});
      const link=document.createElement('a');
      link.href=URL.createObjectURL(blob);link.download='pm25_capital_annual_frontend.csv';link.click();
      setTimeout(()=>URL.revokeObjectURL(link.href),0);
    };
    document.getElementById('pm25-download-top').addEventListener('click',download);
    document.getElementById('pm25-download-bottom').addEventListener('click',download);
    renderList();
  }

  function interiorHero({ variant, eyebrow, title, text, image, alt, tool = "" }) {
    return `<section class="interior-hero interior-hero--${esc(variant)}"><figure class="interior-hero-media"><img src="${esc(image)}" alt="${esc(alt)}" width="1800" height="1350" fetchpriority="high"></figure><div class="shell interior-hero-inner"><div class="interior-hero-copy"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="interior-hero-lede">${esc(text)}</p>${tool}</div></div></section>`;
  }

  const libraryIcon = name => {
    const paths = {
      resources:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
      institutions:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      themes:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      years:'<path d="M6 4h12a2 2 0 0 1 2 2v15l-8-4-8 4V6a2 2 0 0 1 2-2Z"/>',
      encounters:'<circle cx="9" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M14 14.5a5 5 0 0 1 7 4.5v1"/>',
      documents:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/>',
      classes:'<path d="m2 9 10-5 10 5-10 5Z"/><path d="M6 11.5V17c3 2.5 9 2.5 12 0v-5.5M22 9v6"/>',
      research:'<path d="M4 20V10M9 20V4M14 20v-7M19 20V7"/>',
      videos:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
      data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.resources}</svg>`;
  };

  const libraryZones = [
    { slug:'norte-grande', name:'Norte Grande', regions:['Arica y Parinacota','Tarapacá','Antofagasta'], caption:'Arica y Parinacota · Tarapacá · Antofagasta', image:'assets/interior-territorios.webp', alt:'Localidad y cultivos de precordillera en el norte de Chile' },
    { slug:'norte-chico', name:'Norte Chico', regions:['Atacama','Coquimbo'], caption:'Atacama · Coquimbo', image:'assets/interior-temas.webp', alt:'Paisaje de desierto florido del norte de Chile' },
    { slug:'zona-central', name:'Zona Central', regions:['Valparaíso','Metropolitana',"O'Higgins",'Maule'], caption:"Valparaíso · Metropolitana · O’Higgins · Maule", image:'assets/hero-editorial-v1.webp', alt:'Costa y ciudad de la zona central observadas desde un punto de estudio' },
    { slug:'zona-sur', name:'Zona Sur', regions:['Ñuble','Biobío','Araucanía','Los Ríos','Los Lagos'], caption:'Ñuble · Biobío · La Araucanía · Los Ríos · Los Lagos', image:'assets/design-p2.webp', alt:'Bosque de araucarias y curso de agua de la zona sur' },
    { slug:'zona-austral', name:'Zona Austral', regions:['Aysén','Magallanes'], caption:'Aysén · Magallanes', image:'assets/territorio-paine.webp', alt:'Montañas, bosque y aguas de la zona austral de Chile' },
  ];

  const libraryCollections = {
    encuentros:{ label:'Seminarios y talleres', icon:'encounters', description:'Encuentros, seminarios y talleres', predicate:row=>['seminario','taller','webinar'].some(type=>(row.tipos_recurso||[]).includes(type)) },
    documentos:{ label:'Documentos técnicos', icon:'documents', description:'Informes, guías y documentos', predicate:row=>groupOf(row)==='documentos' },
    clases:{ label:'Clases y cursos', icon:'classes', description:'Material docente y cursos abiertos', predicate:row=>['clase','curso'].some(type=>(row.tipos_recurso||[]).includes(type)) || /clase|curso/i.test(row.tipo_original||'') },
    investigacion:{ label:'Investigación y tesis', icon:'research', description:'Estudios, artículos y tesis', predicate:row=>groupOf(row)==='investigacion' },
    videos:{ label:'Videos', icon:'videos', description:'Registros y materiales audiovisuales', predicate:row=>row.audiovisual || (row.formatos||[]).some(format=>['video','youtube'].includes(format)) },
    datos:{ label:'Conjuntos de datos', icon:'data', description:'Datos, registros y series consultables', predicate:row=>/\b(datos|dataset|base de datos|serie de datos)\b/i.test([row.titulo,row.descripcion,row.tipo_original].join(' ')) },
  };

  const rowMatchesZone = (row, zoneSlug) => {
    if (!zoneSlug) return true;
    const zone = libraryZones.find(item=>item.slug===zoneSlug);
    return !zone || territoryNames(row).some(territory=>zone.regions.some(region=>norm(territory).includes(norm(region))));
  };

  function libraryRecentRow(row) {
    const group = groupOf(row);
    const iconName = row.audiovisual ? 'videos' : group === 'investigacion' ? 'research' : group === 'encuentros' ? 'encounters' : 'documents';
    return `<article class="library-recent-card">
      <div class="library-recent-icon library-recent-icon-${group}">${libraryIcon(iconName)}</div>
      <div class="library-recent-main">
        <p class="catalog-result-meta"><span>${esc(typeLabel(row))}</span>${row.anio?`<i></i><span>${esc(row.anio)}</span>`:''}${row.institucion?`<i></i><span>${esc(row.institucion)}</span>`:''}</p>
        <h3><a href="${route('recurso',{id:row.id})}">${esc(row.titulo)}</a></h3>
      </div>
      <div class="library-recent-tags">${(row.temas||[]).slice(0,3).map(themeTag).join('')}</div>
      <a class="library-recent-link" href="${route('recurso',{id:row.id})}">Ver ficha <span aria-hidden="true">→</span></a>
    </article>`;
  }

  function libraryLanding() {
    const institutions = unique(rows.map(row=>String(row.institucion||'').trim()));
    const usedThemes = unique(rows.flatMap(row=>row.temas||[]));
    const years = rows.map(row=>Number(row.anio)).filter(year=>Number.isInteger(year)&&year>0).sort((a,b)=>a-b);
    const firstYear = years[0];
    const lastYear = years.at(-1);
    const yearSpan = firstYear && lastYear ? lastYear-firstYear+1 : 0;
    const recent = [...rows].sort((a,b)=>(Number(b.anio)||0)-(Number(a.anio)||0)||(b.id||0)-(a.id||0)).slice(0,5);
    const formatCards = Object.entries(libraryCollections).map(([slug,item])=>{
      const count = rows.filter(item.predicate).length;
      return `<a class="library-format-card" href="${route('catalogo',{vista:'catalogo',coleccion:slug})}"><span class="library-format-icon">${libraryIcon(item.icon)}</span><strong>${esc(item.label)}</strong><small>${esc(item.description)}</small><span class="library-card-arrow" aria-hidden="true">→</span><span class="library-card-count">${count}</span></a>`;
    }).join('');
    const zoneCards = libraryZones.map(zone=>{
      const count = rows.filter(row=>rowMatchesZone(row,zone.slug)).length;
      return `<a class="library-zone-card" href="${route('catalogo',{vista:'catalogo',zona:zone.slug})}"><figure><img src="${esc(zone.image)}" alt="${esc(zone.alt)}" width="600" height="360" loading="lazy"></figure><div><h3>${esc(zone.name)}</h3><p>${esc(zone.caption)}</p><span>${count} ${count===1?'recurso':'recursos'} <i aria-hidden="true">→</i></span></div></a>`;
    }).join('');
    return `<div class="library-landing">
      <section class="library-stats" aria-labelledby="library-stats-title"><div class="shell library-stats-grid"><div class="library-stats-intro"><p class="eyebrow">La colección</p><h2 id="library-stats-title">La Biblioteca en cifras</h2><p>Conocimiento abierto para comprender la relación entre ambiente, territorios y salud.</p></div>
        <div class="library-stat"><span>${libraryIcon('resources')}</span><div><strong>${rows.length}</strong><b>recursos</b><small>Documentos, clases, seminarios y más</small></div></div>
        <div class="library-stat"><span>${libraryIcon('institutions')}</span><div><strong>${institutions.length}</strong><b>instituciones</b><small>Universidades, organismos públicos y centros</small></div></div>
        <div class="library-stat"><span>${libraryIcon('themes')}</span><div><strong>${usedThemes.length}</strong><b>temas</b><small>De aire y agua a cambio climático y salud</small></div></div>
        <div class="library-stat"><span>${libraryIcon('years')}</span><div><strong>${yearSpan}</strong><b>años de conocimiento</b><small>${firstYear&&lastYear?`${firstYear}–${lastYear}`:'Rango en revisión'}</small></div></div>
      </div></section>
      <section class="library-featured"><div class="shell library-featured-grid"><div class="library-featured-copy"><p class="eyebrow library-accent-label">Colección destacada</p><h2>Agua y territorios: evidencia para un Chile resiliente</h2><p>Explora estudios, documentos y experiencias sobre calidad de aguas, ecosistemas y salud en distintos territorios del país. Un punto de partida para conectar evidencia, contexto y acción.</p><a class="primary-button library-featured-cta" href="${route('catalogo',{vista:'catalogo',tema:'agua'})}">Ver colección <span aria-hidden="true">→</span></a></div><figure class="library-featured-media"><img src="assets/design-p7.webp" alt="Paisaje de río, bosque y comunidad en el sur de Chile" width="1400" height="1050" loading="lazy"><figcaption><span>Conocimiento para territorios más saludables</span><small>Agua · Ecosistemas · Salud</small></figcaption></figure></div></section>
      <section class="library-discovery library-zones" aria-labelledby="library-zones-title"><div class="shell"><div class="library-section-heading"><div><p class="eyebrow">Archivo territorial</p><h2 id="library-zones-title">Explora por territorio</h2><p>Conoce recursos situados en las macrozonas y regiones que conforman Chile.</p></div><a class="text-link" href="#territorios">Ver todos los territorios →</a></div><div class="library-zone-grid">${zoneCards}</div></div></section>
      <section class="library-discovery library-formats" aria-labelledby="library-formats-title"><div class="shell"><div class="library-section-heading"><div><p class="eyebrow">Distintas formas de aprender</p><h2 id="library-formats-title">Formatos y recursos</h2><p>Explora la colección según el tipo de material que necesitas consultar, enseñar o investigar.</p></div></div><div class="library-format-grid">${formatCards}</div></div></section>
      <section class="library-discovery library-recents" aria-labelledby="library-recents-title"><div class="shell"><div class="library-section-heading"><div><p class="eyebrow">Nuevas incorporaciones</p><h2 id="library-recents-title">Recursos recientes</h2><p>Una selección de las publicaciones más recientes incorporadas a la Biblioteca.</p></div><a class="text-link" href="${route('catalogo',{vista:'catalogo',orden:'recientes'})}">Ver todos los recursos →</a></div><div class="library-recent-list">${recent.map(libraryRecentRow).join('')}</div><div class="library-all-resources"><a class="primary-button" href="${route('catalogo',{vista:'catalogo'})}">Ver todos los recursos <span aria-hidden="true">→</span></a></div></div></section>
    </div>`;
  }


  function catalog(params = new URLSearchParams()) {
    const state = {
      q: params.get("q") || "",
      group: params.get("grupo") || "todos",
      theme: params.get("tema") || "todos",
      territory: params.get("territorio") || "todos",
      type: params.get("tipo") || "todos",
      year: params.get("anio") || "todos",
      relation: params.get("relacion") || "todos",
      zone: params.get("zona") || "",
      collection: params.get("coleccion") || "",
      caseSlug: params.get("caso") || "",
      sort: params.get("orden") || "relevancia",
      page: Math.max(1,Number(params.get("pagina"))||1),
    };
    const selectedCase = caseBySlug(state.caseSlug);
    const territories = allTerritories().sort((a, b) => a.name.localeCompare(b.name, "es"));
    const years = unique(rows.map(r => r.anio)).sort((a, b) => b - a);
    const typeCodes = unique(rows.flatMap(r => r.tipos_recurso || [])).sort((a, b) => label("tipos_recurso", a).localeCompare(label("tipos_recurso", b), "es"));
    const catalogBaseRows = selectedCase ? rows.filter(row=>selectedCase.resourceIds.includes(row.id)) : rows;
    const groupCounts = Object.fromEntries(Object.keys(groupLabels).map(group=>[group,catalogBaseRows.filter(row=>groupOf(row)===group).length]));
    const searchForm = `<form id="catalog-form" class="interior-hero-search" role="search"><label class="search-label" for="catalog-query">Buscar por palabras</label><div class="search-combo"><input id="catalog-query" type="search" value="${esc(state.q)}" placeholder="Título, autor, institución, tema o territorio"><button class="primary-button" type="submit">Buscar <span aria-hidden="true">→</span></button></div></form>`;
    const hero = interiorHero({ variant:"biblioteca", eyebrow:"Catálogo público", title:"Buscar en la Biblioteca", text:"Compara recursos por tema, territorio, formato e institución. Cada ficha explica qué contiene y enlaza a la fuente original.", image:"assets/interior-biblioteca.webp", alt:"Paisaje lacustre con volcanes", tool:searchForm });
    const showLanding = !params.has('vista') && !selectedCase && !state.q && state.group==='todos' && state.theme==='todos' && state.territory==='todos' && state.type==='todos' && state.year==='todos' && state.relation==='todos' && !state.zone && !state.collection;
    if (showLanding) {
      view.innerHTML = hero + libraryLanding();
      document.getElementById("catalog-form").addEventListener("submit", event => {
        event.preventDefault();
        const q = document.getElementById("catalog-query").value.trim();
        location.hash = route('catalogo',q?{vista:'catalogo',q}:{vista:'catalogo'}).slice(1);
      });
      return;
    }
    view.innerHTML = `${hero}
      <section class="shell catalog-tools catalog-tools-after-hero">${selectedCase?`<div class="case-filter-context"><span>Expediente territorial</span><strong>${esc(selectedCase.name)}</strong><a href="${route('caso',{caso:selectedCase.slug})}">Volver al caso →</a></div>`:''}<div class="quick-filters" aria-label="Categorías de recursos">${[["todos","Todos los recursos",catalogBaseRows.length], ...Object.entries(groupLabels).map(([value,text])=>[value,text,groupCounts[value]])].map(([value,text,count]) => `<button class="chip" type="button" data-group="${value}" aria-pressed="${state.group === value}"><span>${esc(text)}</span><small>${count}</small></button>`).join("")}</div>
      <div class="catalog-body"><aside class="catalog-filter-sidebar" aria-label="Filtros del catálogo"><div class="catalog-filter-heading"><h2>Filtrar resultados</h2><button id="clear-filters" type="button">Limpiar todo</button></div><div class="filter-grid">
        <label><span>Tema</span><select id="filter-theme"><option value="todos">Todos los temas</option>${Object.keys(labels.temas || {}).filter(t => rows.some(r => (r.temas || []).includes(t))).sort((a,b)=>label("temas",a).localeCompare(label("temas",b),"es")).map(t=>`<option value="${t}" ${state.theme===t?"selected":""}>${esc(label("temas",t))}</option>`).join("")}</select></label>
        <label><span>Territorio</span><select id="filter-territory"><option value="todos">Todos los territorios</option>${territories.map(t=>`<option value="${esc(t.name)}" ${state.territory===t.name?"selected":""}>${esc(t.name)}</option>`).join("")}</select></label>
        <label><span>Tipo de recurso</span><select id="filter-type"><option value="todos">Todos los tipos</option>${typeCodes.map(t=>`<option value="${t}" ${state.type===t?"selected":""}>${esc(label("tipos_recurso",t))}</option>`).join("")}</select></label>
        <label><span>Año de publicación</span><select id="filter-year"><option value="todos">Todos los años</option>${years.map(y=>`<option value="${y}" ${state.year===String(y)?"selected":""}>${y}</option>`).join("")}</select></label>
        <label><span>Relación con salud ambiental</span><select id="filter-relation"><option value="todos">Todas las relaciones</option>${["directa","contextual","tangencial"].map(r=>`<option value="${r}" ${state.relation===r?"selected":""}>${r[0].toUpperCase()+r.slice(1)}</option>`).join("")}</select></label>
      </div></aside><div class="catalog-results-column"><div class="catalog-results-head"><strong id="result-count"></strong><label>Ordenar por<select id="catalog-sort"><option value="relevancia" ${state.sort==='relevancia'?'selected':''}>Relevancia editorial</option><option value="recientes" ${state.sort==='recientes'?'selected':''}>Más recientes</option><option value="antiguos" ${state.sort==='antiguos'?'selected':''}>Más antiguos</option><option value="titulo" ${state.sort==='titulo'?'selected':''}>Título A–Z</option></select></label></div><div id="active-filters" class="catalog-active-filters" aria-live="polite"></div><div id="results" class="catalog-results"></div><div id="catalog-pagination"></div></div></div></section>`;

    const render = () => {
      const selected = rows.filter(row =>
        matchesText(row, state.q) &&
        (state.group === "todos" || groupOf(row) === state.group) &&
        (state.theme === "todos" || (row.temas || []).includes(state.theme)) &&
        (state.territory === "todos" || territoryNames(row).includes(state.territory)) &&
        (state.type === "todos" || (row.tipos_recurso || []).includes(state.type)) &&
        (state.year === "todos" || String(row.anio) === state.year) &&
        (state.relation === "todos" || row.tipo_relacion_salud_ambiental === state.relation) &&
        rowMatchesZone(row,state.zone) &&
        (!state.collection || !libraryCollections[state.collection] || libraryCollections[state.collection].predicate(row)) &&
        (!selectedCase || selectedCase.resourceIds.includes(row.id))
      );
      const sorters = {
        relevancia:(a,b)=>(a.prioridad_formato||6)-(b.prioridad_formato||6)||(b.prioridad_total||0)-(a.prioridad_total||0)||String(a.titulo).localeCompare(String(b.titulo),"es"),
        recientes:(a,b)=>(b.anio||0)-(a.anio||0)||String(a.titulo).localeCompare(String(b.titulo),"es"),
        antiguos:(a,b)=>(a.anio||9999)-(b.anio||9999)||String(a.titulo).localeCompare(String(b.titulo),"es"),
        titulo:(a,b)=>String(a.titulo).localeCompare(String(b.titulo),"es"),
      };
      selected.sort(sorters[state.sort]||sorters.relevancia);
      const pageSize = 6;
      const totalPages = Math.max(1,Math.ceil(selected.length/pageSize));
      state.page = Math.min(state.page,totalPages);
      const first = (state.page-1)*pageSize;
      const pageRows = selected.slice(first,first+pageSize);
      document.getElementById("result-count").textContent = `${selected.length} ${selected.length === 1 ? "recurso" : "recursos"}`;
      document.getElementById("results").innerHTML = selected.length ? pageRows.map(catalogResultRow).join("") : `<p class="empty">No encontramos recursos con esta combinación. Prueba otra palabra o limpia los filtros.</p>`;
      const active = [
        state.q ? ['q',`Búsqueda: “${state.q}”`] : null,
        state.group !== 'todos' ? ['group',groupLabels[state.group]||state.group] : null,
        state.theme !== 'todos' ? ['theme',label('temas',state.theme)] : null,
        state.territory !== 'todos' ? ['territory',state.territory] : null,
        state.type !== 'todos' ? ['type',label('tipos_recurso',state.type)] : null,
        state.year !== 'todos' ? ['year',state.year] : null,
        state.relation !== 'todos' ? ['relation',`Relación ${state.relation}`] : null,
        state.zone ? ['zone',libraryZones.find(zone=>zone.slug===state.zone)?.name||state.zone] : null,
        state.collection ? ['collection',libraryCollections[state.collection]?.label||state.collection] : null,
      ].filter(Boolean);
      document.getElementById('active-filters').innerHTML = active.length ? `<span>Filtros activos</span>${active.map(([key,text])=>`<button type="button" data-clear-filter="${key}">${esc(text)} <i aria-hidden="true">×</i></button>`).join('')}` : '';
      document.getElementById('catalog-pagination').innerHTML = selected.length>pageSize ? `<nav class="catalog-pagination" aria-label="Páginas de resultados"><span>Mostrando ${first+1}–${Math.min(first+pageSize,selected.length)} de ${selected.length}</span><div><button type="button" data-page="${state.page-1}" ${state.page===1?'disabled':''}>← Anterior</button>${paginationItems(state.page,totalPages).map(item=>item==='…'?'<span class="pagination-ellipsis">…</span>':`<button type="button" data-page="${item}" aria-current="${item===state.page?'page':'false'}">${item}</button>`).join('')}<button type="button" data-page="${state.page+1}" ${state.page===totalPages?'disabled':''}>Siguiente →</button></div></nav>` : '';
      document.querySelectorAll('[data-group]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.group===state.group)));
      document.querySelectorAll('[data-clear-filter]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.clearFilter;state[key]=['q','zone','collection'].includes(key)?'':'todos';if(key==='q')document.getElementById('catalog-query').value='';const control={theme:'filter-theme',territory:'filter-territory',type:'filter-type',year:'filter-year',relation:'filter-relation'}[key];if(control)document.getElementById(control).value='todos';state.page=1;sync();}));
      document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{state.page=Number(button.dataset.page);sync();document.querySelector('.catalog-results-head')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}));
    };
    const sync = () => {
      const p = {vista:'catalogo'};
      if (state.q) p.q = state.q;
      if (state.group !== "todos") p.grupo = state.group;
      if (state.theme !== "todos") p.tema = state.theme;
      if (state.territory !== "todos") p.territorio = state.territory;
      if (state.type !== "todos") p.tipo = state.type;
      if (state.year !== "todos") p.anio = state.year;
      if (state.relation !== "todos") p.relacion = state.relation;
      if (state.zone) p.zona = state.zone;
      if (state.collection) p.coleccion = state.collection;
      if (selectedCase) p.caso = selectedCase.slug;
      if (state.sort !== "relevancia") p.orden = state.sort;
      if (state.page > 1) p.pagina = state.page;
      history.replaceState(null, "", route("catalogo", p));
      render();
    };
    document.getElementById("catalog-form").addEventListener("submit", event => { event.preventDefault(); state.q = document.getElementById("catalog-query").value.trim(); state.page=1; sync(); });
    document.querySelectorAll("[data-group]").forEach(button => button.addEventListener("click", () => { state.group = button.dataset.group; state.page=1; document.querySelectorAll("[data-group]").forEach(b => b.setAttribute("aria-pressed", String(b === button))); sync(); }));
    [["filter-theme","theme"],["filter-territory","territory"],["filter-type","type"],["filter-year","year"],["filter-relation","relation"]].forEach(([id,key]) => document.getElementById(id).addEventListener("change", event => { state[key] = event.target.value; state.page=1; sync(); }));
    document.getElementById('catalog-sort').addEventListener('change',event=>{state.sort=event.target.value;state.page=1;sync();});
    document.getElementById("clear-filters").addEventListener("click", () => { history.replaceState(null, "", route("catalogo",{vista:'catalogo'})); catalog(new URLSearchParams('vista=catalogo')); });
    render();
  }

  const topicFeatureImages = [
    {src:'assets/design-p1.webp',alt:'Costa rocosa del norte de Chile'},
    {src:'assets/interior-biblioteca.webp',alt:'Paisaje de agua y cordillera de Chile'},
    {src:'assets/interior-temas.webp',alt:'Desierto florido del norte de Chile'},
    {src:'assets/design-p7.webp',alt:'Lago y cordillera de la zona austral'},
    {src:'assets/interior-acerca.webp',alt:'Bosque chileno cubierto de niebla'},
    {src:'assets/design-p2.webp',alt:'Bosque de araucarias y curso de agua'}
  ];

  function themeEditorialData() {
    const territoryLookup = new Map(allTerritories().map(item=>[norm(item.name),item]));
    const used = Object.entries(themeCounts()).filter(([,count])=>count).map(([code,count])=>({code,count,name:label('temas',code)}));
    const territorial = used.filter(item=>territoryLookup.has(norm(item.name))).map(item=>({...item,territory:territoryLookup.get(norm(item.name))}));
    const territoryCodes = new Set(territorial.map(item=>item.code));
    const themes = used.filter(item=>!territoryCodes.has(item.code));
    return {themes,territorial};
  }

  function themeConnections(code, available) {
    const allowed = new Set(available.map(item=>item.code));
    const counts = new Map();
    rows.filter(row=>(row.temas||[]).includes(code)).forEach(row=>(row.temas||[]).forEach(other=>{
      if(other!==code&&allowed.has(other)) counts.set(other,(counts.get(other)||0)+1);
    }));
    return [...counts.entries()].map(([other,count])=>({code:other,count,name:label('temas',other)})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'es'));
  }

  function themeConnectionCopy(code, available) {
    const connected = themeConnections(code,available).slice(0,3);
    return connected.length ? `Se conecta con ${connected.map(item=>item.name.toLowerCase()).join(', ')}.` : 'Reúne recursos de distintas fuentes y formatos de la colección.';
  }

  function svgTextLines(value, maxLength = 18) {
    const lines = [];
    String(value).split(/\s+/).forEach(word=>{
      const last=lines.at(-1);
      if(!last||`${last} ${word}`.length>maxLength) lines.push(word); else lines[lines.length-1]=`${last} ${word}`;
    });
    if(lines.length>3) lines.splice(2,lines.length-2,lines.slice(2).join(' '));
    return lines.slice(0,3);
  }

  function themeNetwork(center, connections) {
    const positions = [[260,55],[425,125],[425,290],[260,355],[95,290],[95,125]];
    const text = (name,x,y,centered=false) => {
      const lines=svgTextLines(name,centered?19:16);
      const start=y-((lines.length-1)*7);
      return `<text x="${x}" y="${start}" text-anchor="middle">${lines.map((line,index)=>`<tspan x="${x}" dy="${index?14:0}">${esc(line)}</tspan>`).join('')}</text>`;
    };
    return `<svg class="topics-network" viewBox="0 0 520 410" role="group" aria-label="Relaciones del tema ${esc(center.name)}">${connections.map((item,index)=>{const [x,y]=positions[index];return `<line x1="260" y1="205" x2="${x}" y2="${y}"/><circle class="topics-network-joint" cx="${(260+x)/2}" cy="${(205+y)/2}" r="3"/>`;}).join('')}<a href="${route('tema',{tema:center.code})}" aria-label="Abrir ${esc(center.name)}"><circle class="topics-network-center" cx="260" cy="205" r="68"/>${text(center.name,260,199,true)}<text class="topics-network-count" x="260" y="235" text-anchor="middle">${center.count} recursos</text></a>${connections.map((item,index)=>{const [x,y]=positions[index];return `<a href="${route('tema',{tema:item.code})}" aria-label="Abrir ${esc(item.name)}; comparte ${item.count} recursos con ${esc(center.name)}"><circle class="topics-network-node" cx="${x}" cy="${y}" r="49"/>${text(item.name,x,y-2)}<text class="topics-network-count" x="${x}" y="${y+30}" text-anchor="middle">${item.count} cruces</text></a>`;}).join('')}</svg>`;
  }

  function bindTopicsIndex() {
    const input=document.getElementById('topics-index-search');
    if(!input) return;
    const links=[...document.querySelectorAll('[data-topic-search-name]')];
    const empty=document.getElementById('topics-index-empty');
    input.addEventListener('input',()=>{
      const query=norm(input.value.trim());
      let visible=0;
      links.forEach(link=>{const show=!query||norm(link.dataset.topicSearchName).includes(query);link.hidden=!show;if(show) visible+=1;});
      empty.hidden=visible>0;
    });
  }

  function topics() {
    const {themes,territorial} = themeEditorialData();
    const featured = [...themes].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'es')).slice(0,6);
    const alphabetical = [...themes].sort((a,b)=>a.name.localeCompare(b.name,'es'));
    const resourcesWithThemes = rows.filter(row=>(row.temas||[]).some(code=>themes.some(item=>item.code===code))).length;
    const center = featured[0];
    const connections = themeConnections(center.code,themes).slice(0,6);
    const pairKeys = new Set();
    rows.forEach(row=>{
      const codes=unique((row.temas||[]).filter(code=>themes.some(item=>item.code===code))).sort();
      codes.forEach((code,index)=>codes.slice(index+1).forEach(other=>pairKeys.add(`${code}|${other}`)));
    });
    view.innerHTML = `${interiorHero({ variant:"temas", eyebrow:"Explorar", title:"Temas de salud ambiental", text:"Los recursos pueden pertenecer a varios temas. Esta organización permite seguir relaciones entre exposiciones, territorios, salud e institucionalidad.", image:"assets/interior-temas.webp", alt:"Paisaje desértico cubierto de flores moradas y amarillas" })}
      <section class="topics-overview"><div class="shell topics-overview-grid"><div class="topics-overview-mark">${territoryLevelIcon('environment')}</div><div class="topics-overview-copy"><h2>Una mirada conectada a la salud ambiental</h2><p>Explora los temas que organizan la evidencia y descubre sus relaciones.</p></div><div class="topics-overview-stat"><strong>${themes.length}</strong><span>temas editoriales</span></div><div class="topics-overview-stat"><strong>${resourcesWithThemes}</strong><span>recursos relacionados</span></div><div class="topics-overview-stat"><strong>${pairKeys.size}</strong><span>cruces presentes</span></div></div></section>
      <section class="topics-editorial"><div class="shell topics-editorial-grid"><div class="topics-featured"><div class="topics-section-head"><div><p class="eyebrow">Selección editorial</p><h2>Temas principales</h2></div><a href="#todos-los-temas">Ver todos los temas <span aria-hidden="true">↓</span></a></div><div class="topics-featured-list">${featured.map((item,index)=>{const image=topicFeatureImages[index%topicFeatureImages.length];return `<a class="topics-featured-row" href="${route('tema',{tema:item.code})}"><figure><img src="${image.src}" alt="${esc(image.alt)}" width="320" height="180" loading="lazy"></figure><div><h3>${esc(item.name)}</h3><p>${esc(themeConnectionCopy(item.code,themes))}</p></div><strong>${item.count}<span>${item.count===1?'recurso':'recursos'}</span></strong><i aria-hidden="true">→</i></a>`;}).join('')}</div></div><aside class="topics-crosses"><p class="eyebrow">Conexiones de la colección</p><h2>Cruces temáticos</h2><p>Los temas no viven aislados. Esta vista muestra cuántos recursos comparten el concepto central con otros temas.</p>${themeNetwork(center,connections)}<a class="topics-crosses-link" href="${route('tema',{tema:center.code})}">Explorar ${esc(center.name.toLowerCase())} <span aria-hidden="true">→</span></a></aside></div></section>
      <section class="topics-all" id="todos-los-temas"><div class="shell"><div class="topics-all-head"><div><p class="eyebrow">Índice completo</p><h2>Explorar todos los temas</h2></div><label for="topics-index-search"><span>Buscar un tema</span><input id="topics-index-search" type="search" placeholder="Escribe una palabra…"></label></div><div class="topics-all-index">${alphabetical.map(item=>`<a data-topic-search-name="${esc(item.name)}" href="${route('tema',{tema:item.code})}"><span>${esc(item.name)}</span><small>${item.count}</small></a>`).join('')}</div><p id="topics-index-empty" class="topics-index-empty" hidden>No se encontraron temas con ese nombre.</p>${territorial.length?`<div class="topics-geographic"><div><p class="eyebrow">Referencias geográficas</p><h3>Estos conceptos pertenecen a Territorios</h3><p>Se conservan sus conteos, pero se presentan aparte para no confundir un lugar con un tema de salud ambiental.</p></div><div>${territorial.map(item=>`<a href="${route('territorio',{territorio:item.territory.name})}"><span>${esc(item.name)}</span><small>${item.count} recursos · Ir a Territorios →</small></a>`).join('')}</div></div>`:''}</div></section>`;
    bindTopicsIndex();
  }

  function topic(params) {
    const code = params.get("tema");
    const selected = rows.filter(r => (r.temas || []).includes(code));
    if (!code || !labels.temas?.[code]) return notFound("Tema no encontrado");
    view.innerHTML = `<section class="shell page-head"><div class="topic-intro"><div><p class="eyebrow">Tema</p><h1>${esc(label("temas",code))}</h1><p>Selección de clases, estudios y documentos relacionados con ${esc(label("temas",code).toLowerCase())} en el catálogo de la Biblioteca.</p></div><div class="topic-count"><strong>${selected.length}</strong><span>${selected.length===1?"recurso":"recursos"}</span></div></div></section><section class="shell section"><div class="results-bar"><strong>Material seleccionado</strong><a class="text-link" href="${route("catalogo",{tema:code})}">Abrir con filtros →</a></div>${selected.sort((a,b)=>(a.prioridad_formato||6)-(b.prioridad_formato||6)).map(resultRow).join("")}</section>`;
  }

  const territoryLevelIcon = name => {
    const paths = {
      country:'<path d="M13 2c-2 3-1 5-3 8s0 5-2 8l3 4M12 4l2 2-2 3 2 3-2 3 1 4"/>',
      regions:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      environment:'<path d="M4 20c6-1 10-5 12-12 3 4 3 9-1 12M4 20C3 12 7 7 16 5M12 12c2 0 5-1 8-4"/>',
      communities:'<path d="M3 21V9l6-4v16M9 21V2l7 4v15M16 21v-9l5 3v6M1 21h22M6 12h1M6 16h1M12 8h1M12 12h1M12 16h1"/>',
      basins:'<path d="M2 8c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 13c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 18c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/>',
      resources:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.regions}</svg>`;
  };

  const territoryRegionCatalog = () => regions.map(region => {
    const territories = homeTerritories().filter(item => regionKey(item.name).includes(region.id));
    const territorySet = new Set(territories.map(item => item.name));
    const resources = rows.filter(row => territoryNames(row).some(name => territorySet.has(name)));
    const primary = territories.sort((a,b)=>b.count-a.count)[0];
    return {...region, count:resources.length, territory:primary?.name, territoryNames:[...territorySet], resources};
  });

  function relatedTerritoriesForRegion(region) {
    const related = new Map();
    (region?.resources || []).forEach(row => territoryObjects(row).forEach(item => {
      if (item.kind === 'pais' || item.kind === 'region') return;
      const key = `${item.kind}:${item.name}`;
      const current = related.get(key) || {name:item.name,kind:item.kind,count:0};
      current.count += 1;
      related.set(key,current);
    }));
    return [...related.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'es'));
  }

  function territoryAtlasMap(items, selectedId) {
    const populated = items.map(item=>item.count).filter(Boolean);
    const min = Math.min(...populated), max = Math.max(...populated);
    return `<svg class="territories-chile-map" viewBox="0 0 220 640" role="group" aria-label="Mapa interactivo de las regiones de Chile">${items.map(item=>{
      const description = `${item.name}: ${item.count ? `${item.count} ${item.count===1?'recurso':'recursos'}` : 'sin recursos publicados'}`;
      return `<g role="button" tabindex="0" data-territory-region-id="${esc(item.id)}" aria-label="${esc(description)}" aria-pressed="${item.id===selectedId}"><path d="${item.path}" fill="${scaleColor(item.count||null,min,max)}" fill-rule="evenodd"><title>${esc(description)}</title></path></g>`;
    }).join('')}</svg>`;
  }

  function territoryRegionContext(region) {
    const related = relatedTerritoriesForRegion(region).slice(0,5);
    const resourceText = region.count === 1 ? 'recurso asociado' : 'recursos asociados';
    return `<p class="territories-context-kicker">Región seleccionada</p><h2>${esc(region.name.replace(/^Región (de |del )?/,''))}</h2><p class="territories-context-count"><strong>${region.count}</strong><span>${resourceText}</span></p><p class="territories-context-copy">La colección reúne aquí recursos vinculados explícitamente con ${esc(region.name)}. Explora sus escalas locales o abre el catálogo con el filtro territorial aplicado.</p>${region.territory?`<a class="territories-context-cta" href="${route('territorio',{territorio:region.territory})}">Ver recursos de la región <span aria-hidden="true">→</span></a>`:'<span class="territories-context-empty">Aún no hay recursos publicados para esta región.</span>'}${related.length?`<div class="territories-related"><p>Escalas relacionadas</p>${related.map(item=>`<a href="${route('territorio',{territorio:item.name})}"><span><i aria-hidden="true"></i>${esc(item.name)}</span><small>${item.count}</small></a>`).join('')}</div>`:''}`;
  }

  function territoryIndexGroup({title,description,icon,items,selectedName}) {
    const ordered = [...items].sort((a,b)=>(a.name===selectedName?-1:0)-(b.name===selectedName?-1:0)||b.count-a.count||geoRank(a.name)-geoRank(b.name)||a.name.localeCompare(b.name,'es'));
    const visible = ordered.slice(0,3);
    const more = ordered.slice(3);
    return `<section class="territories-index-group"><div class="territories-index-heading"><span>${territoryLevelIcon(icon)}</span><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div></div><div class="territories-index-links">${visible.map(item=>`<a href="${route('territorio',{territorio:item.name})}"><span>${esc(item.name)}</span><small>${item.count}</small></a>`).join('')}${more.length?`<details><summary>Ver ${more.length} ${more.length===1?'territorio más':'territorios más'} <span aria-hidden="true">↓</span></summary><div>${more.map(item=>`<a href="${route('territorio',{territorio:item.name})}"><span>${esc(item.name)}</span><small>${item.count}</small></a>`).join('')}</div></details>`:''}</div></section>`;
  }

  function bindTerritoriesExplorer(regionItems) {
    const explorer = document.querySelector('.territories-atlas');
    if (!explorer) return;
    let selectedId = explorer.dataset.selectedRegion;
    const context = explorer.querySelector('#territories-region-context');
    const crumb = explorer.querySelector('#territories-region-crumb');
    const select = explorer.querySelector('#territories-region-select');
    const choose = (id, returnFocus = false) => {
      const region = regionItems.find(item=>item.id===id);
      if (!region) return;
      selectedId = id;
      explorer.dataset.selectedRegion=id;
      context.innerHTML=territoryRegionContext(region);
      crumb.textContent=region.name;
      select.value=id;
      explorer.querySelectorAll('[data-territory-region-id]').forEach(item=>{
        const active=item.dataset.territoryRegionId===id;
        item.classList.toggle('is-selected',active);
        item.setAttribute('aria-pressed',String(active));
      });
      if (returnFocus) select.focus({preventScroll:true});
    };
    explorer.querySelectorAll('[data-territory-region-id]').forEach(item=>{
      item.addEventListener('click',()=>choose(item.dataset.territoryRegionId));
      item.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(item.dataset.territoryRegionId);}
      });
    });
    select.addEventListener('change',()=>choose(select.value,true));
    choose(selectedId);
  }

  function territories() {
    const names = allTerritories().sort((a,b)=>{
      const kindOrder={pais:0,region:1,territorio_ambiental:2,comuna_ciudad:3,cuenca_zona:4};
      return (kindOrder[a.kind]??9)-(kindOrder[b.kind]??9)||geoRank(a.name)-geoRank(b.name)||a.name.localeCompare(b.name,"es");
    });
    const groups = {
      pais:names.filter(item=>item.kind==='pais'),
      region:names.filter(item=>item.kind==='region'),
      territorio_ambiental:names.filter(item=>item.kind==='territorio_ambiental'),
      comuna_ciudad:names.filter(item=>item.kind==='comuna_ciudad'),
      cuenca_zona:names.filter(item=>item.kind==='cuenca_zona')
    };
    const regionItems = territoryRegionCatalog();
    const selected = regionItems.find(item=>item.id==='valparaiso'&&item.count) || [...regionItems].sort((a,b)=>b.count-a.count)[0];
    const levelCards = [
      {kind:'pais',title:'País y alcance nacional',copy:'Recursos de alcance nacional',icon:'country'},
      {kind:'region',title:'Regiones',copy:'Regiones presentes en la colección',icon:'regions'},
      {kind:'territorio_ambiental',title:'Territorios ambientales',copy:'Áreas con características compartidas',icon:'environment'},
      {kind:'comuna_ciudad',title:'Comunas y ciudades',copy:'Escalas locales de la colección',icon:'communities'},
      {kind:'cuenca_zona',title:'Cuencas y zonas',copy:'Cuencas hidrográficas y otras zonas',icon:'basins'}
    ];
    view.innerHTML = `${interiorHero({ variant:"territorios", eyebrow:"Explorar", title:"Territorios de Chile", text:"Un recurso puede relacionarse con una región, comuna, territorio ambiental o cuenca. Los niveles se mantienen separados para facilitar la búsqueda.", image:"assets/interior-territorios.webp", alt:"Valle habitado entre montañas" })}
      <section class="territories-atlas" data-selected-region="${esc(selected.id)}">
        <div class="shell territories-breadcrumb"><span>Chile</span><i aria-hidden="true">›</i><strong id="territories-region-crumb">${esc(selected.name)}</strong><a href="${route('catalogo',{vista:'catalogo'})}">Ver todos los recursos <span aria-hidden="true">→</span></a></div>
        <div class="shell territories-atlas-grid">
          <div class="territories-map-story">
            <div class="territories-country-intro"><p class="eyebrow">Cartografía de la colección</p><h2>Chile</h2><p>Explora por regiones y conecta cada lugar con comunas, territorios ambientales o cuencas.</p><div class="territories-national-count"><strong>${groups.pais[0]?.count||rows.length}</strong><span>recursos de alcance nacional</span></div></div>
            <div class="territories-map-figure"><label for="territories-region-select">Seleccionar región</label><select id="territories-region-select">${regionItems.map(item=>`<option value="${esc(item.id)}" ${item.id===selected.id?'selected':''}>${esc(item.name)} · ${item.count}</option>`).join('')}</select>${territoryAtlasMap(regionItems,selected.id)}<div class="territories-map-label territories-map-label-north">Norte</div><div class="territories-map-label territories-map-label-south">Sur austral</div><div class="territories-map-scale" aria-hidden="true"><span>N</span><i></i><small>0&nbsp;&nbsp;&nbsp;500&nbsp;&nbsp;&nbsp;1.000 km</small></div>${mapCredit}</div>
          </div>
          <div class="territories-region-context" id="territories-region-context" aria-live="polite">${territoryRegionContext(selected)}</div>
          <aside class="territories-index" aria-label="Explorar niveles territoriales"><div class="territories-index-title"><span>${territoryLevelIcon('regions')}</span><div><h2>Explorar territorios</h2><p>Chile → región → escala local</p></div></div>${territoryIndexGroup({title:'País y alcance nacional',description:'Recursos de alcance nacional.',icon:'country',items:groups.pais})}${territoryIndexGroup({title:'Regiones',description:'Regiones de Chile con recursos.',icon:'regions',items:groups.region,selectedName:selected.territory})}${territoryIndexGroup({title:'Territorios ambientales',description:'Territorios con dinámicas ambientales comunes.',icon:'environment',items:groups.territorio_ambiental})}${territoryIndexGroup({title:'Comunas y ciudades',description:'Comunas y principales ciudades.',icon:'communities',items:groups.comuna_ciudad})}${territoryIndexGroup({title:'Cuencas y zonas',description:'Cuencas hidrográficas y zonas.',icon:'basins',items:groups.cuenca_zona})}<a class="territories-all-resources" href="${route('catalogo',{vista:'catalogo'})}"><span>${territoryLevelIcon('resources')}Todos los recursos</span><b>${rows.length} →</b></a></aside>
        </div>
      </section>
      <section class="territories-levels"><div class="shell"><div class="territories-levels-heading"><p class="eyebrow">Niveles territoriales</p><h2>Una colección, distintas escalas</h2><p>Los niveles se mantienen separados para que cada búsqueda conserve su contexto geográfico.</p></div><div class="territories-level-grid">${levelCards.map(card=>{const items=groups[card.kind];const total=items.reduce((sum,item)=>sum+item.count,0);return `<article><span>${territoryLevelIcon(card.icon)}</span><small>${items.length} ${items.length===1?'lugar':'lugares'}</small><h3>${esc(card.title)}</h3><p>${esc(card.copy)}</p><strong>${total} ${total===1?'vínculo':'vínculos'} con recursos</strong>${items[0]?`<a href="${route('territorio',{territorio:items[0].name})}">Comenzar por ${esc(items[0].name)} →</a>`:''}</article>`;}).join('')}</div></div></section>`;
    bindTerritoriesExplorer(regionItems);
  }

  function territory(params) {
    const name = params.get("territorio");
    const selected = rows.filter(r => territoryNames(r).includes(name));
    if (!name || !selected.length) return notFound("Territorio no encontrado");
    view.innerHTML = `<section class="shell page-head"><div class="topic-intro"><div><p class="eyebrow">Territorio</p><h1>${esc(name)}</h1><p>Recursos cuya ficha relaciona explícitamente su contenido con este territorio.</p></div><div class="topic-count"><strong>${selected.length}</strong><span>${selected.length===1?"recurso":"recursos"}</span></div></div></section><section class="shell section"><div class="results-bar"><strong>Material territorial</strong>${caseDefinitions.filter(c => c.territory === name || c.region === regionLabel(name)).map(c=>`<a class="text-link" href="${route("caso",{caso:c.slug})}">Explorar ${esc(c.name)} →</a>`).join("")}<a class="text-link" href="${route("catalogo",{territorio:name})}">Abrir con filtros →</a></div>${selected.sort((a,b)=>(a.prioridad_formato||6)-(b.prioridad_formato||6)).map(resultRow).join("")}</section>`;
  }

  function caseIndexRow(item) {
    const linked = caseResources(item);
    return `<a class="case-index-row" data-case="${item.slug}" href="${route('caso',{caso:item.slug})}">
      <span class="case-index-number" aria-hidden="true">${item.number}</span>
      <span class="case-index-copy"><small>${esc(item.region)} · publicaciones ${esc(caseYearRange(item))}</small><strong>${esc(item.name)}</strong><span>${esc(item.summary)}</span></span>
      <span class="case-index-count">${linked.length} ${linked.length===1?'recurso':'recursos'} →</span>
    </a>`;
  }

  function caseFeature(item) {
    const linked = caseResources(item);
    return `<a class="case-feature" href="${route('caso',{caso:item.slug})}"><span class="case-feature-number">${item.number}</span><span class="case-feature-copy"><small>${esc(item.region)}</small><strong>${esc(item.name)}</strong><span>${esc(item.summary)}</span><b>${linked.length} ${linked.length===1?'recurso':'recursos'} vinculados →</b></span></a>`;
  }

  function casesLanding() {
    const uniqueResources = new Set(caseDefinitions.flatMap(item => caseResources(item).map(row => row.id))).size;
    const featured = [caseBySlug('polimetales-arica'),caseBySlug('quintero-puchuncavi-ventanas')].filter(Boolean);
    view.innerHTML = `<section class="cases-hero"><figure><img src="assets/interior-territorios.webp" alt="Paisaje chileno con un valle habitado entre montañas" width="1800" height="1350" fetchpriority="high"><figcaption class="photo-credit">Paisaje de Chile</figcaption></figure><div class="shell cases-hero-inner"><div><p class="cases-eyebrow">Casos y territorios</p><h1>Los lugares donde la salud ambiental se volvió historia.</h1><p>Seis territorios de Chile conectados con los recursos ya publicados. Los expedientes de Arica y Quintero–Puchuncaví–Ventanas incorporan secciones de lectura y cronologías continuas con sus fuentes.</p><div class="cases-actions"><a class="cases-primary" href="#explorar-casos">Explorar el mapa ↓</a><a class="cases-secondary" href="#indice-casos">Ver los seis casos</a></div></div></div></section>
      <section class="cases-explorer" id="explorar-casos"><div class="shell cases-explorer-grid"><div class="cases-map-column"><p class="eyebrow">Explorar el territorio</p><h2>Chile, de norte a sur</h2><div class="cases-map-card">${casesMap()}<div class="cases-map-legend"><span><i style="background:#DCECE8"></i>Sin caso</span><span><i style="background:#A8D0C8"></i>1 caso</span><span><i style="background:#6DAFA3"></i>2 casos</span><span><i class="marker-key"></i>Caso documentado</span></div>${mapCredit}</div></div><div id="indice-casos" class="case-index"><div class="case-index-head"><span>6 casos</span><span>${uniqueResources} recursos únicos vinculados</span></div>${caseDefinitions.map(caseIndexRow).join('')}</div></div></section>
      <section class="cases-featured"><div class="shell"><div class="section-heading"><div><p class="eyebrow">Casos destacados</p><h2>Dos historias para empezar</h2></div><a class="text-link" href="#acerca">Cómo se revisa la Biblioteca →</a></div><div class="cases-feature-grid">${featured.map(caseFeature).join('')}</div></div></section>
      <section class="cases-method"><div class="shell cases-method-grid"><h2>Qué encontrarás en cada territorio</h2><div class="cases-method-items"><div><strong>Entender</strong><p>Una visión general construida con los recursos públicos vinculados al territorio.</p></div><div><strong>Profundizar</strong><p>Cronologías con fuentes y notas de interpretación en los expedientes que cuentan con un paquete territorial.</p></div><div><strong>Consultar</strong><p>Estudios, tesis, documentos y seminarios que ya forman parte de la Biblioteca.</p></div></div></div></section>`;
    bindCaseHover(document.querySelector('.cases-explorer'));
  }

  function caseTabs(item, active) {
    const chapterLabel = item.timeline?.length ? 'Cronología · 5 capítulos' : 'Cronología';
    const resourceLabel = item.entries?.length ? `Documentos y publicaciones · ${caseResources(item).length}` : 'Recursos del caso';
    return `<nav class="case-tabs" aria-label="Navegación del caso"><a href="${route('caso',{caso:item.slug})}" ${active==='overview'?'aria-current="page"':''}>Visión general</a><a href="${route('cronologia',{caso:item.slug})}" ${active==='chronology'?'aria-current="page"':''}>${chapterLabel}</a><a href="${route('catalogo',{caso:item.slug})}">${resourceLabel}</a></nav>`;
  }

  function caseOverview(params) {
    const item = caseBySlug(params.get('caso'));
    if (!item) return notFound('Caso territorial no encontrado');
    if (item.entries?.length) return importedCaseOverview(item);
    const linked = caseResources(item).sort((a,b)=>(a.prioridad_formato||6)-(b.prioridad_formato||6)||(b.anio||0)-(a.anio||0));
    const themes = caseThemeCounts(item);
    const institutions = unique(linked.map(row=>row.institucion)).length;
    const topThemes = themes.slice(0,4);
    view.innerHTML = `<section class="case-detail-hero"><figure><img src="assets/interior-territorios.webp" alt="Paisaje chileno con un valle habitado entre montañas" width="1800" height="1350" fetchpriority="high"></figure><div class="shell case-detail-inner"><a class="case-back" href="#casos">← Casos y territorios</a><div class="case-detail-title"><div><p class="cases-eyebrow">Caso ${item.number} · ${esc(item.region)}</p><h1>${esc(item.name)}</h1><p>${esc(item.summary)}</p></div>${caseTabs(item,'overview')}</div></div></section>
      <section class="shell case-intro"><div><p>Este expediente reúne únicamente recursos que ya forman parte de la edición pública de la Biblioteca. La narración histórica, las cifras sanitarias y los hitos del caso se incorporarán después de comprobar cada dato con su fuente.</p></div><blockquote>La base documental está disponible desde ahora; la cronología permanece en revisión editorial.</blockquote></section>
      <section class="case-facts"><div class="shell"><div><small>Recursos vinculados</small><strong>${linked.length}</strong><span>fichas públicas</span></div><div><small>Años de publicación</small><strong>${esc(caseYearRange(item))}</strong><span>no corresponde al período histórico del caso</span></div><div><small>Temas principales</small><strong>${esc(topThemes.slice(0,2).map(([code])=>label('temas',code)).join(' · ')||'Por revisar')}</strong><span>según las fichas vinculadas</span></div><div><small>Instituciones</small><strong>${institutions}</strong><span>consignadas en las fichas</span></div></div></section>
      <section class="shell case-content"><div><div class="case-section-head"><div><p class="eyebrow">Base documental</p><h2>Recursos en la Biblioteca</h2></div><a class="text-link" href="${route('catalogo',{caso:item.slug})}">Abrir con filtros →</a></div>${linked.map(resultRow).join('')}</div><aside><div class="case-aside-block"><p class="eyebrow">Lectura inicial</p><h2>Temas presentes</h2>${topThemes.map(([code,count])=>`<a href="${route('tema',{tema:code})}"><span>${esc(label('temas',code))}</span><small>${count}</small></a>`).join('')}</div><div class="case-aside-block"><p class="eyebrow">Profundizar</p><h2>Cronología</h2><p>La estructura está preparada para publicar hitos y capítulos con sus fuentes.</p><a class="text-link" href="${route('cronologia',{caso:item.slug})}">Ver estado de la cronología →</a></div></aside></section>
      <section class="case-editorial-status"><div class="shell"><div><p class="cases-eyebrow">Situación editorial</p><h2>Historia y datos en verificación</h2><p>No se muestran cifras de demostración ni fechas aproximadas como hechos. El expediente crecerá a medida que se incorporen fuentes revisadas.</p></div><a class="cases-primary" href="${route('cronologia',{caso:item.slug})}">Continuar a la cronología →</a></div></section>`;
  }

  function caseChronology(params) {
    const item = caseBySlug(params.get('caso'));
    if (!item) return notFound('Cronología no encontrada');
    if (item.timeline?.length) return importedCaseChronology(item, params.get('hito'));
    const linked = caseResources(item).sort((a,b)=>(a.anio||9999)-(b.anio||9999)||String(a.titulo).localeCompare(String(b.titulo),'es'));
    view.innerHTML = `${caseTabs(item,'chronology')}<section class="shell chronology-head"><a class="back-link" href="${route('caso',{caso:item.slug})}">← ${esc(item.name)}</a><p class="eyebrow">Cronología territorial</p><h1>Una historia en preparación.</h1><p>La cronología definitiva distinguirá episodios ambientales, decisiones institucionales, evidencia sanitaria y acciones comunitarias. Cada hito deberá enlazar una fuente comprobada antes de publicarse.</p></section>
      <section class="shell chronology-status"><strong>Estado editorial</strong><p>La maqueta entregada contiene fechas y cifras demostrativas. Esta integración conserva su estructura, pero no presenta esos valores como información verificada.</p></section>
      <section class="shell chronology-resources"><div class="case-section-head"><div><p class="eyebrow">Base disponible</p><h2>Publicaciones actualmente vinculadas</h2></div><a class="text-link" href="${route('catalogo',{caso:item.slug})}">Ver en la Biblioteca →</a></div><p class="chronology-explanation">Los años siguientes corresponden a la publicación de cada recurso, no a la fecha de los hechos del caso.</p><div class="publication-timeline">${linked.map(row=>`<article><time>${esc(row.anio||'—')}</time><div><p class="resource-kind">${esc(typeLabel(row))}</p><h3><a href="${route('recurso',{id:row.id})}">${esc(row.titulo)}</a></h3><p class="meta">${esc(row.institucion||'Institución no consignada')}</p><p>${esc(row.descripcion||'Ficha sin resumen editorial.')}</p><a class="text-link" href="${route('recurso',{id:row.id})}">Ver ficha y fuente →</a></div></article>`).join('')}</div></section>
      <section class="shell chronology-next"><span>Seguir explorando</span><div><a href="${route('catalogo',{caso:item.slug})}">Documentos del caso →</a><a href="#casos">Todos los territorios →</a></div></section>`;
  }


  const entryByUid = uid => (payload.cases || []).flatMap(c => c.entries).find(e => e.resource_uid === uid);
  const entryLink = entry => route('recurso', {id: entry.resource_id});
  const sourceContext = entry => entry.resource_uid === 'ARICA-076' ? 'Posición de la empresa · Boliden'
    : entry.resource_uid === 'ARICA-020' ? 'Información institucional preliminar · estudio en revisión al 11-09-2026'
    : entry.resource_uid === 'ARICA-056' ? 'Expediente judicial en curso · revisión del paquete: 12-09-2026'
    : entry.tipo_evidencia;

  const casePresentations = {
    'polimetales-arica': {
      heroImage:'assets/interior-territorios.webp', heroAlt:'Paisaje habitado del norte de Chile', heroCredit:'Paisaje del norte de Chile · archivo de la Biblioteca',
      healthSection:'05_salud_evidencia', keyEventIndexes:[0,4,6,12,17], currentType:'remediacion', currentTitle:'Cerro Chuño: intervención territorial en curso',
      chronologyTitle:'Cuarenta años en cinco capítulos.',
      chapters:[
        { num:'I', title:'La llegada', range:'1984–1985', from:1984, to:1985, image:'assets/interior-territorios.webp', credit:'Paisaje del norte de Chile · archivo de la Biblioteca' },
        { num:'II', title:'Los barrios', range:'1989–1997', from:1986, to:1997, image:'assets/design-p1.webp', credit:'Costa del norte de Chile · archivo de la Biblioteca' },
        { num:'III', title:'La evidencia', range:'1998–2009', from:1998, to:2009, image:'assets/interior-territorios.webp', credit:'Territorio del norte de Chile · archivo de la Biblioteca' },
        { num:'IV', title:'La ley y el juicio', range:'2010–2019', from:2010, to:2019, image:'assets/design-p1.webp', credit:'Costa y ciudad del norte de Chile · archivo de la Biblioteca' },
        { num:'V', title:'Hoy', range:'2020–actualidad', from:2020, to:9999, image:'assets/interior-territorios.webp', credit:'Paisaje habitado del norte de Chile · archivo de la Biblioteca' }
      ]
    },
    'quintero-puchuncavi-ventanas': {
      heroImage:'assets/design-p1.webp', heroAlt:'Costa chilena usada como referencia territorial', heroCredit:'Costa de Chile · imagen de referencia de la Biblioteca',
      healthSection:'04_evidencia_salud', keyEventIndexes:[0,4,7,10,17], currentType:'situacion_actual', currentTitle:'PPDA, monitoreo y transición industrial',
      chronologyTitle:'Seis décadas en cinco capítulos.',
      chapters:[
        { num:'I', title:'El polo industrial', range:'1964–1990', from:1964, to:1990, image:'assets/design-p1.webp', credit:'Costa de Chile · imagen territorial de referencia' },
        { num:'II', title:'Normas y expansión', range:'1991–2010', from:1991, to:2010, image:'assets/interior-territorios.webp', credit:'Territorio habitado de Chile · archivo de la Biblioteca' },
        { num:'III', title:'Las crisis sanitarias', range:'2011–2018', from:2011, to:2018, image:'assets/design-p1.webp', credit:'Costa de Chile · imagen territorial de referencia' },
        { num:'IV', title:'La respuesta institucional', range:'2019–2023', from:2019, to:2023, image:'assets/interior-territorios.webp', credit:'Paisaje habitado de Chile · archivo de la Biblioteca' },
        { num:'V', title:'Transición y vigilancia', range:'2024–actualidad', from:2024, to:9999, image:'assets/design-p1.webp', credit:'Costa de Chile · imagen territorial de referencia' }
      ]
    }
  };

  const presentationFor = item => casePresentations[item.slug] || casePresentations['polimetales-arica'];

  const eventYear = event => Number(String(event.fecha_periodo || '').match(/\d{4}/)?.[0] || 9999);
  const largeEventDate = event => {
    const value = String(event.fecha_periodo || '');
    if (!/(?:19|20)\d{2}-\d{2}/.test(value)) return value;
    return unique([...value.matchAll(/(?:19|20)\d{2}/g)].map(match => match[0])).join('–');
  };
  const eventKind = type => {
    const value = norm(type);
    if (/salud|biomonitoreo|evidencia/.test(value)) return { key:'health', label:'Evidencia sanitaria' };
    if (/justicia|ddhh/.test(value)) return { key:'community', label:'Comunidad y justicia' };
    if (/regul|respuesta|marco|monitoreo|fiscal|calidad_aire|recuperacion|situacion_actual/.test(value)) return { key:'regulation', label:'Regulación' };
    return { key:'environment', label:'Ambiental' };
  };

  function caseChapters(item) {
    return presentationFor(item).chapters.map(def => {
      const events = item.timeline.filter(event => eventYear(event) >= def.from && eventYear(event) <= def.to);
      const counts = { environment:0, regulation:0, health:0, community:0 };
      const sources = new Set();
      events.forEach(event => {
        counts[eventKind(event.tipo_hito).key] += 1;
        event.resource_uids.forEach(uid => sources.add(uid));
      });
      return {...def, events, counts, sourceCount:sources.size, intro:events.slice(0,2).map(event => event.resumen).join(' ')};
    });
  }

  function overviewResourceRow(entry) {
    return `<a class="case-resource-row" href="${entryLink(entry)}"><span><strong>${esc(entry.titulo)}</strong><small>${esc([entry.institucion,entry.anio].filter(Boolean).join(' · '))}</small></span><b>${esc(entry.tipo_recurso || 'Recurso')}</b></a>`;
  }

  function localCaseMap(item) {
    if (item.slug === 'quintero-puchuncavi-ventanas') return `<div class="case-local-map" role="img" aria-label="Esquema territorial de la bahía de Quintero y Puchuncaví que ubica Concón, Quintero y Ventanas">
      <svg viewBox="0 0 400 300" aria-hidden="true"><path d="M0 0 H145 C170 45 150 85 175 115 C202 146 176 186 198 218 C215 245 200 275 214 300 H0 Z" class="map-water"></path><path d="M145 0 C170 45 150 85 175 115 C202 146 176 186 198 218 C215 245 200 275 214 300" class="map-coast"></path><path d="M205 74 L315 65 L345 184 L238 222 L182 154 Z" class="map-polygon"></path><circle cx="214" cy="116" r="4" class="map-site"></circle><circle cx="230" cy="144" r="3" class="map-place"></circle><circle cx="275" cy="95" r="3" class="map-place"></circle><circle cx="190" cy="238" r="3" class="map-place"></circle><text x="224" y="110">Complejo Ventanas</text><text x="238" y="149">Quintero</text><text x="284" y="99">Puchuncaví</text><text x="198" y="244">Concón</text><text x="28" y="250" class="map-ocean">Océano Pacífico</text><text x="246" y="205" class="map-city">BAHÍA DE QUINTERO</text></svg>
      <div class="case-map-key"><span><i class="polygon"></i>Territorio documentado</span><span><i class="site"></i>Complejo industrial</span><span><i class="place"></i>Comunas y localidades</span></div><small>Esquema territorial basado en los lugares consignados por las fuentes</small>
    </div>`;
    return `<div class="case-local-map" role="img" aria-label="Esquema territorial de Arica que ubica Sitio F, Los Industriales y Cerro Chuño">
      <svg viewBox="0 0 400 300" aria-hidden="true"><path d="M0 0 H150 C170 60 140 120 160 180 C175 230 150 270 165 300 H0 Z" class="map-water"></path><path d="M150 0 C170 60 140 120 160 180 C175 230 150 270 165 300" class="map-coast"></path><path d="M400 30 C330 60 300 120 320 300" class="map-border"></path><path d="M230 110 L250 140 L235 165 L205 155 Z" class="map-polygon"></path><circle cx="232" cy="140" r="4" class="map-site"></circle><circle cx="212" cy="150" r="3" class="map-place"></circle><circle cx="245" cy="152" r="3" class="map-place"></circle><text x="240" y="132">Sitio F</text><text x="157" y="160">Los Industriales</text><text x="252" y="158">Cerro Chuño</text><text x="185" y="215" class="map-city">ARICA</text><text x="28" y="250" class="map-ocean">Océano Pacífico</text><text x="330" y="60" class="map-country">PERÚ</text></svg>
      <div class="case-map-key"><span><i class="polygon"></i>Área de intervención</span><span><i class="site"></i>Antiguo acopio</span><span><i class="place"></i>Poblaciones</span></div><small>Esquema territorial basado en los lugares consignados por las fuentes</small>
    </div>`;
  }

  function importedCaseOverview(item) {
    const presentation = presentationFor(item);
    const linked = caseResources(item);
    const officialTypes = /ley|reglamento|informe|programa|plan|cuenta pública|comunicado|portal institucional|licitación|normativa|judicial|fiscalización|balance oficial|datos oficiales|expediente|procedimiento sancionatorio|ficha de medida|fuente institucional/i;
    const publicationTypes = /artículo|tesis|documento de trabajo|trabajo académico|estudio de salud|científico|académico/i;
    const newsTypes = /noticia|reportaje|columna|periodismo/i;
    const rank = (a,b) => (b.importancia_1_10||0)-(a.importancia_1_10||0)||(a.orden||999)-(b.orden||999);
    const official = item.entries.filter(e => officialTypes.test(e.tipo_recurso)).sort(rank);
    const publications = item.entries.filter(e => publicationTypes.test(e.tipo_recurso)).sort(rank);
    const news = item.entries.filter(e => newsTypes.test(e.tipo_recurso)).sort((a,b)=>(a.orden||999)-(b.orden||999));
    const health = item.entries.filter(e => e.seccion === presentation.healthSection).sort(rank).slice(0,4);
    const keyEvents = presentation.keyEventIndexes.map(index => item.timeline[index]).filter(Boolean);
    const intro = [item.timeline[0],item.timeline[1]].filter(Boolean).map(event => event.resumen).join(' ');
    const current = item.timeline.find(event => event.tipo_hito === presentation.currentType) || item.timeline.at(-1);
    view.innerHTML = `<section class="case-detail-hero territorial-case-hero case-${esc(item.slug)}"><figure><img src="${presentation.heroImage}" alt="${esc(presentation.heroAlt)}" width="1800" height="1350" fetchpriority="high"><figcaption class="photo-credit">${esc(presentation.heroCredit)}</figcaption></figure><div class="shell case-detail-inner"><p class="case-breadcrumb"><a href="#casos">Casos y territorios</a><span>/</span>${esc(item.region)}<span>/</span>${esc(item.name)}</p><div class="case-detail-title"><div><p class="cases-eyebrow">Caso · ${esc(item.region)}</p><h1>${esc(item.name)}</h1><p>${esc(item.summary)}</p></div>${caseTabs(item,'overview')}</div></div></section>
      <div class="case-sticky-tabs">${caseTabs(item,'overview')}</div>
      <section class="shell case-intro"><div><p>${esc(intro)}</p></div><blockquote>Presencia ambiental, exposición humana, riesgo estimado y efectos en salud describen cosas distintas. Cada ficha conserva el alcance y las limitaciones de su fuente.</blockquote></section>
      <section class="case-facts"><div class="shell"><div><small>Base documental</small><strong>${linked.length} recursos</strong><span>fichas únicas vinculadas al caso</span></div><div><small>Lecturas territoriales</small><strong>${item.entries.length}</strong><span>síntesis y notas del paquete editorial</span></div><div><small>Historia documentada</small><strong>${item.timeline.length} hitos</strong><span>cada uno enlazado con sus fuentes</span></div><div><small>Periodo del caso</small><strong>${esc(item.period)}</strong><span>revisión editorial: ${esc(item.reviewed_at)}</span></div></div></section>
      <section class="shell case-place-grid"><article><h2>Ubicación y contexto territorial</h2>${localCaseMap(item)}<p>${esc(item.timeline[1]?.resumen || item.summary)}</p></article><article><div class="case-section-title"><h2>Hitos principales</h2><a href="${route('cronologia',{caso:item.slug})}">Ver cronología completa →</a></div><div class="case-key-events">${keyEvents.map(event=>`<a href="${route('cronologia',{caso:item.slug,hito:eventYear(event)})}"><time>${esc(largeEventDate(event))}</time><span><strong>${esc(event.hito)}</strong><small>${esc(event.resumen)}</small></span></a>`).join('')}</div></article></section>
      <section class="case-health"><div class="shell"><div><h2>Efectos y resultados en salud estudiados</h2><p>Lo que describen las publicaciones vinculadas, manteniendo sus límites de interpretación.</p></div><div class="case-health-grid">${health.map(entry=>`<a href="${entryLink(entry)}"><strong>${esc(entry.resultado_salud || entry.titulo)}</strong><span>${esc(entry.descripcion_corta)}</span></a>`).join('')}</div></div></section>
      <section class="shell case-library-sections"><article><div class="case-section-title"><h2>Documentos oficiales</h2><a href="${route('catalogo',{caso:item.slug})}">Ver todos (${official.length}) →</a></div>${official.slice(0,3).map(overviewResourceRow).join('')}</article><article><div class="case-section-title"><h2>Publicaciones</h2><a href="${route('catalogo',{caso:item.slug})}">Ver todas (${publications.length}) →</a></div>${publications.slice(0,3).map(overviewResourceRow).join('')}</article></section>
      ${news.length ? `<section class="shell case-news"><div class="case-section-title"><h2>Noticias históricas</h2><a href="${route('catalogo',{caso:item.slug})}">Ver todas (${news.length}) →</a></div><div class="case-news-grid">${news.slice(0,3).map((entry,index)=>`<a href="${entryLink(entry)}"><span class="case-news-photo"><img src="${index===1?'assets/design-p1.webp':'assets/interior-territorios.webp'}" alt="Paisaje territorial de referencia"></span><small>${esc([entry.anio,entry.institucion].filter(Boolean).join(' · '))}</small><strong>${esc(entry.titulo)}</strong></a>`).join('')}</div></section>` : ''}
      <section class="case-current"><div class="shell"><div><p class="cases-eyebrow">Situación actual</p><h2>${esc(presentation.currentTitle)}</h2><p>${esc(current?.resumen || item.summary)}</p>${current?.nota_editorial?`<p class="case-current-note">${esc(current.nota_editorial)}</p>`:''}<a class="cases-primary" href="${route('cronologia',{caso:item.slug})}">Profundizar en la cronología →</a></div><figure><img src="${presentation.heroImage}" alt="${esc(presentation.heroAlt)}"><figcaption>${esc(presentation.heroCredit)}</figcaption></figure></div></section>`;
  }

  function importedCaseChronology(item, selectedYear) {
    const presentation = presentationFor(item);
    const chapters = caseChapters(item);
    view.innerHTML = `<nav class="chapter-bar" aria-label="Capítulos de la cronología"><div class="shell"><span><a href="${route('caso',{caso:item.slug})}">${esc(item.name)}</a><i>/</i><strong>Cronología</strong></span><div>${chapters.map(chapter=>`<a href="#chapter-${chapter.num}" data-chapter-link="${chapter.num}"><b>${chapter.num}</b>${esc(chapter.title)}</a>`).join('')}</div></div></nav>
      <section class="shell chronology-2a-head"><div><p class="eyebrow">Cronología · ${esc(item.period)}</p><h1>${esc(presentation.chronologyTitle)}</h1><p>Cada capítulo cruza los hechos con la evidencia sanitaria, las decisiones institucionales y la respuesta de la comunidad. Toda fecha enlaza sus fuentes.</p><div class="chronology-scale" aria-label="Escala temporal">${chapters.map(chapter=>`<a href="#chapter-${chapter.num}" style="--span:${Math.max(2,chapter.to===9999?7:chapter.to-chapter.from+1)}"><strong>${chapter.num}</strong><small>${esc(chapter.range)}</small></a>`).join('')}</div></div></section>
      <div class="chronology-chapters">${chapters.map(chapter=>`<section class="chronology-chapter" id="chapter-${chapter.num}" data-chapter="${chapter.num}"><div class="chapter-photo"><img src="${chapter.image}" alt="Paisaje territorial de apertura del capítulo ${chapter.num}"><div class="chapter-photo-inner shell"><span class="chapter-number">${chapter.num}</span><div><p>Capítulo ${chapter.num} · ${esc(chapter.range)}</p><h2>${esc(chapter.title)}</h2></div></div><span class="photo-credit">${esc(chapter.credit)}</span></div><div class="chapter-body shell"><div class="chapter-reading"><p class="chapter-intro">${esc(chapter.intro)}</p><div class="chapter-events">${chapter.events.map((event,eventIndex)=>{const kind=eventKind(event.tipo_hito);return `<article id="hito-${chapter.num}-${eventIndex}" data-event-year="${eventYear(event)}"><div class="chapter-event-year"><time>${esc(largeEventDate(event))}</time><span class="event-kind ${kind.key}">${kind.label}</span></div><div class="chapter-event-copy"><h3>${esc(event.hito)}</h3><p>${esc(event.resumen)}</p>${event.nota_editorial?`<p class="chapter-note">${esc(event.nota_editorial)}</p>`:''}<div class="chapter-sources">${event.resource_uids.map(entryByUid).filter(Boolean).map(entry=>`<a href="${entryLink(entry)}"><span>${esc(entry.tipo_recurso || 'Fuente')}</span><strong>${esc(entry.titulo)}</strong></a>`).join('')}</div><a class="chapter-primary-source" href="${esc(event.fuente_principal)}" target="_blank" rel="noopener noreferrer">Consultar fuente principal ↗</a></div></article>`}).join('')}</div></div><aside><strong>En este capítulo</strong><p>${chapter.counts.environment} ${chapter.counts.environment===1?'hito ambiental':'hitos ambientales'}<br>${chapter.counts.regulation} ${chapter.counts.regulation===1?'decisión institucional':'decisiones institucionales'}<br>${chapter.counts.health} ${chapter.counts.health===1?'estudio sanitario':'estudios sanitarios'}<br>${chapter.counts.community} ${chapter.counts.community===1?'acción comunitaria o judicial':'acciones comunitarias o judiciales'}<br>${chapter.sourceCount} fuentes enlazadas</p></aside></div></section>`).join('')}</div>
      <section class="shell chronology-next chronology-2a-next"><span>Seguir explorando</span><div><a href="${route('catalogo',{caso:item.slug})}">Documentos del caso →</a><a href="#casos">Todos los territorios →</a></div></section>`;
    view.querySelectorAll('.chapter-bar a[href^="#chapter-"],.chronology-scale a').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      document.querySelector(link.getAttribute('href'))?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        view.querySelectorAll('[data-chapter-link]').forEach(link => link.toggleAttribute('aria-current', link.dataset.chapterLink === entry.target.dataset.chapter));
      }), {rootMargin:'-20% 0px -70% 0px'});
      view.querySelectorAll('[data-chapter]').forEach(chapter => observer.observe(chapter));
    }
    if (selectedYear) requestAnimationFrame(() => requestAnimationFrame(() => {
      view.querySelector(`[data-event-year="${Number(selectedYear)}"]`)?.scrollIntoView({behavior:'instant',block:'start'});
    }));
  }

  const resourceEntries = row => (payload.cases || []).flatMap(c=>c.entries).filter(e=>e.resource_id===row.id);

  function resourceVisual(row) {
    if (row.id !== 29) return '';
    return `<figure class="resource-visual"><img src="assets/video-s_EiX1i1Ovk.jpg" alt="Vista previa del Tercer Seminario de Medioambiente y Salud" width="1280" height="720" loading="eager"><figcaption>Vista previa del recurso audiovisual en su fuente original.</figcaption></figure>`;
  }

  function caseEvidence(row, entries = resourceEntries(row)) {
    const fields = [
      ['hallazgos_clave','Hallazgos clave','wide'],
      ['matriz_ambiental','Matriz ambiental'],
      ['contaminantes_clave','Contaminantes'],
      ['poblacion','Población o alcance'],
      ['lugares_sectores','Lugares y sectores'],
      ['resultado_salud','Resultado de salud estudiado'],
      ['cifras_clave','Cifras y datos consignados','wide'],
      ['fecha_hito','Fecha o período completo'],
      ['actores_clave','Actores'],
      ['implicancia_salud','Relevancia para salud ambiental','wide'],
      ['respuesta_publica_legal','Respuesta pública o legal','wide'],
      ['limitaciones_interpretacion','Alcance y limitaciones','wide']
    ];
    return entries.map(entry=>{
      const details = fields.filter(([key])=>entry[key]);
      const related = (entry.contrapunto_recurso_uid || []).map(entryByUid).filter(Boolean);
      return `<section class="resource-section territorial-evidence"><header class="resource-section-heading"><p class="eyebrow">${esc(entry.seccion_label)}</p><h2>${esc(entries.length > 1 ? entry.titulo : "Detalles del contenido")}</h2>${sourceContext(entry)?`<p class="evidence-note">${esc(sourceContext(entry))}</p>`:''}</header>${details.length?`<dl class="resource-fact-grid">${details.map(([key,title,width])=>`<div class="resource-fact ${width==='wide'?'resource-fact-wide':''}"><dt>${title}</dt><dd>${esc(entry[key])}</dd></div>`).join('')}</dl>`:''}${related.length?`<div class="evidence-context"><h3>Fuentes para leer en conjunto</h3>${related.map(e=>`<a href="${entryLink(e)}">${esc(e.titulo)} →</a>`).join('')}</div>`:''}<a class="text-link resource-evidence-source" href="${esc(entry.url)}" target="_blank" rel="noopener noreferrer">Abrir esta fuente ↗</a></section>`;
    }).join('');
  }

  function resourceRelation(row, entries) {
    const statements = unique([row.utilidad, ...entries.map(entry=>entry.implicancia_salud)].filter(Boolean));
    return statements.length ? statements : [row.descripcion || 'Este recurso forma parte de la selección editorial de la Biblioteca por su relación con la salud ambiental.'];
  }

  function relatedList(items, emptyLabel) {
    return items.length ? items.join('') : `<p class="resource-related-empty">${emptyLabel}</p>`;
  }

  function resourceCitation(row, entries) {
    const supplied = unique(entries.map(entry=>entry.cita_recomendada).filter(Boolean));
    if (supplied.length) return supplied;
    const author = row.autor_ponente || row.institucion || 'Autoría no consignada';
    const publication = row.institucion && row.institucion !== author ? ` ${row.institucion}.` : '';
    return [`${author} (${row.anio || 's. f.'}). ${row.titulo}.${publication}`];
  }

  function resource(params) {
    const row = rows.find(r => r.id === Number(params.get("id")));
    if (!row) return notFound("Recurso no encontrado");
    const entries = resourceEntries(row);
    const relatedCases = casesForRow(row);
    const casesHtml = relatedCases.map(item=>`<a class="case-resource-link" href="${route('caso',{caso:item.slug})}"><span>Expediente territorial</span><strong>Ver caso: ${esc(item.name)} <i aria-hidden="true">→</i></strong></a>`).join('');
    const themeLinks = (row.temas || []).map(code=>`<a href="${route('tema',{tema:code})}"><span>${esc(label('temas',code))}</span><i aria-hidden="true">›</i></a>`);
    const territoryLinks = territoryObjects(row).map(territory=>`<a href="${route('territorio',{territorio:territory.name})}"><span>${esc(territory.name)}</span><i aria-hidden="true">›</i></a>`);
    const importance = resourceRelation(row, entries).map(text=>`<p>${esc(text)}</p>`).join('');
    const citations = resourceCitation(row, entries).map(citation=>`<p>${esc(citation)}</p>`).join('');
    view.innerHTML = `<section class="shell resource-layout"><article class="resource-main"><a class="back-link" href="${route("catalogo")}">← Volver al catálogo</a><header class="resource-header"><p class="eyebrow">${esc(typeLabel(row))}</p><h1 class="resource-title">${esc(row.titulo)}</h1><p class="meta resource-byline">${esc(byline(row))}</p><p class="resource-summary">${esc(row.descripcion || "Ficha sin resumen editorial.")}</p></header>${resourceVisual(row)}${casesHtml?`<div class="case-resource-links">${casesHtml}</div>`:''}<section class="resource-section resource-importance"><h2>¿Por qué importa?</h2>${importance}</section>${caseEvidence(row,entries)}<section class="resource-section resource-citation"><h3>Cita sugerida</h3>${citations}</section><p class="resource-library-note">La Biblioteca conserva los metadatos y el enlace. El material permanece alojado y administrado por su fuente original.</p></article><aside class="resource-aside" aria-label="Información del recurso"><div class="resource-aside-panel"><h2>Información del recurso</h2><dl><dt>Institución o publicación</dt><dd>${esc(row.institucion||"Sin identificar")}</dd><dt>Autoría o participación</dt><dd>${esc(row.autor_ponente||"No consignada")}${row.rol_autoria?` · ${esc(row.rol_autoria)}`:""}</dd><dt>Año</dt><dd>${esc(row.anio||"Sin precisar")}</dd><dt>Formato</dt><dd>${esc((row.formatos||[]).map(f=>label("formatos",f)).join(" · ")||"Sin clasificar")}</dd><dt>Relación con salud ambiental</dt><dd>${esc(row.tipo_relacion_salud_ambiental||"Por determinar")}</dd><dt>Estado del enlace</dt><dd class="resource-link-status status-${esc(row.estado_url||'pendiente')}">${esc(statusLabel(row))}</dd></dl><a class="source-button" href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">Abrir fuente original <span aria-hidden="true">↗</span></a><section class="resource-related"><h3>Temas relacionados</h3><nav aria-label="Temas relacionados">${relatedList(themeLinks,'Sin temas asignados')}</nav></section><section class="resource-related"><h3>Territorios relacionados</h3><nav aria-label="Territorios relacionados">${relatedList(territoryLinks,'Sin territorio asignado')}</nav></section><p class="resource-aside-note">La Biblioteca organiza y describe el recurso para facilitar su consulta y conserva el vínculo con la fuente original.</p></div></aside></section>`;
  }

  function about() {
    view.innerHTML = `${interiorHero({ variant:"acerca", eyebrow:"Acerca de", title:"Una biblioteca para comprender y enseñar.", text:"La Biblioteca Digital de Salud Ambiental de Chile organiza clases, seminarios, investigaciones, presentaciones y documentos técnicos de acceso público.", image:"assets/interior-acerca.webp", alt:"Bosque cubierto de niebla" })}<section class="shell about-grid about-grid-continuation"><div><h2>Qué conserva</h2><p>Conserva metadatos, criterios editoriales y enlaces. Los archivos originales permanecen en YouTube, repositorios universitarios, organismos públicos y otras fuentes.</p></div><div><h2>Qué incluye</h2><p>Incluye recursos con relación directa con la salud y también material ambiental contextual necesario para comprender regulación, institucionalidad, contaminación, justicia ambiental y cambio climático en Chile.</p><h2>Cómo se revisa</h2><p>Las fichas publicadas pasan por revisión humana. Los datos no comprobados, como duración o extensión, se omiten hasta contar con evidencia.</p></div></section>`;
  }

  function notFound(title) {
    view.innerHTML = `<section class="shell page-head"><p class="eyebrow">Biblioteca</p><h1>${esc(title)}</h1><p>El contenido solicitado no está en la edición pública actual.</p><a class="text-link" href="${route("inicio")}">Volver al inicio →</a></section>`;
  }

  function renderRoute() {
    const raw = location.hash.slice(1) || "inicio";
    const [name, query = ""] = raw.split("?");
    const params = new URLSearchParams(query);
    ({ inicio: home, catalogo: () => catalog(params), temas: topics, tema: () => topic(params), territorios: territories, territorio: () => territory(params), datos: () => dataPage(params), casos: casesLanding, caso: () => caseOverview(params), cronologia: () => caseChronology(params), recurso: () => resource(params), acerca: about }[name] || (() => notFound("Página no encontrada")))();
    document.title = name === "inicio" ? "Biblioteca Digital de Salud Ambiental de Chile" : `${view.querySelector("h1")?.textContent || "Biblioteca"} · Biblioteca de Salud Ambiental`;
    window.scrollTo({ top: 0, behavior: "instant" });
    const navRoute = ({tema:'temas',territorio:'territorios',caso:'casos',cronologia:'casos',recurso:'catalogo'}[name]||name);
    document.querySelectorAll('.site-header nav a').forEach(a => a.setAttribute('aria-current', a.hash === `#${navRoute}` ? 'page' : 'false'));
    document.querySelector('.site-header nav').classList.remove('is-open');
    document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
    document.getElementById('main').focus({preventScroll:true});
  }

  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault(); document.getElementById('main').focus({preventScroll:false});
  });
  document.getElementById('footer-total').textContent = rows.length;
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.site-header nav');
  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(expanded));
    navigation.classList.toggle('is-open', expanded);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('is-open'); menu.focus();
    }
  });
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
})();
