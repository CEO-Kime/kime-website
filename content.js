const SUPABASE_URL = 'https://ryfueewhyuooalnyuhhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZnVlZXdoeXVvb2Fsbnl1aGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMzM3ODIsImV4cCI6MjEwMTcwOTc4Mn0.HhuTR4XulXIexJGYnP9VxEQk2lB9zHI-zb6iGOstrM4';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const esc = s => (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = d => new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const fmtPrice = n => '₹' + Number(n).toLocaleString('en-IN');

async function loadPosts(){
  const grid = document.getElementById('posts-grid'), empty = document.getElementById('posts-empty');
  if (!grid) return;
  const { data, error } = await sb.from('posts').select('*').eq('published', true).order('created_at', { ascending: false });
  if (error || !data || !data.length) { empty.style.display=''; return; }
  empty.style.display = 'none';
  grid.innerHTML = data.map(p => {
    let images = [];
    try{ images = p.images ? JSON.parse(p.images) : (p.cover_image ? [p.cover_image] : []); }catch(e){ images = p.cover_image ? [p.cover_image] : []; }
    const galleryHtml = buildGallery(images);
    return `
      <article class="dyn-card">
        ${galleryHtml}
        <div class="body">
          <span class="meta">${fmtDate(p.created_at.slice(0,10))}</span>
          ${p.category ? `<span class="tag">${esc(p.category)}</span>` : ''}
          <h4>${esc(p.title)}</h4>
          <p>${esc((p.content||'').slice(0,140))}${(p.content||'').length>140?'…':''}</p>
        </div>
      </article>`;
  }).join('');
  wireGalleries(grid);
}

async function loadEvents(){
  const grid = document.getElementById('events-grid'), empty = document.getElementById('events-empty');
  if (!grid) return;
  const todayStr = new Date().toISOString().slice(0,10);
  const { data, error } = await sb.from('events').select('*').eq('published', true).gte('event_date', todayStr).order('event_date', { ascending: true });
  if (error || !data || !data.length) { empty.style.display=''; return; }
  empty.style.display = 'none';
  grid.innerHTML = data.map(ev => {
    let images = [];
    try{ images = ev.images ? JSON.parse(ev.images) : (ev.cover_image ? [ev.cover_image] : []); }catch(e){ images = ev.cover_image ? [ev.cover_image] : []; }
    const galleryHtml = buildGallery(images);
    return `
      <article class="dyn-card">
        ${galleryHtml}
        <div class="body">
          <span class="tag">${fmtDate(ev.event_date)}</span>
          <h4>${esc(ev.title)}</h4>
          <p>${esc(ev.description||'')}</p>
          ${ev.location ? `<span class="meta">📍 ${esc(ev.location)}</span>` : ''}
        </div>
      </article>`;
  }).join('');
  wireGalleries(grid);
}

function buildGallery(images){
  if (!images.length) return '';
  if (images.length === 1) return `<img class="img" src="${esc(images[0])}" alt="" loading="lazy">`;
  return `<div class="gallery">
    <img class="img gallery-main" src="${esc(images[0])}" alt="" loading="lazy">
    <div class="gallery-thumbs">
      ${images.map((src,i)=>`<img class="thumb${i===0?' active':''}" src="${esc(src)}" data-idx="${i}" loading="lazy">`).join('')}
    </div>
  </div>`;
}
function wireGalleries(grid){
  grid.querySelectorAll('.gallery').forEach(g=>{
    const main = g.querySelector('.gallery-main');
    g.querySelectorAll('.thumb').forEach(t=>t.addEventListener('click', ()=>{
      main.src = t.src;
      g.querySelectorAll('.thumb').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
    }));
  });
}

async function loadStore(){
  const grid = document.getElementById('store-grid'), empty = document.getElementById('store-empty');
  if (!grid) return;
  const { data, error } = await sb.from('store_items').select('*').eq('published', true).order('created_at', { ascending: false });
  if (error || !data || !data.length) { empty.style.display=''; return; }
  empty.style.display = 'none';
  grid.innerHTML = data.map(it => {
    let images = [];
    try{ images = it.images ? JSON.parse(it.images) : (it.image ? [it.image] : []); }catch(e){ images = it.image ? [it.image] : []; }
    const discountPct = (it.original_price && it.original_price > it.price)
      ? Math.round((1 - it.price / it.original_price) * 100) : null;
    const priceHtml = discountPct
      ? `<span class="price-row"><span class="price-old">${fmtPrice(it.original_price)}</span><span class="price">${fmtPrice(it.price)}</span><span class="discount-badge">${discountPct}% OFF</span></span>`
      : `<span class="price">${fmtPrice(it.price)}</span>`;
    return `
      <article class="dyn-card">
        ${buildGallery(images)}
        <div class="body">
          <h4>${esc(it.name)}</h4>
          <p>${esc(it.description||'')}</p>
          ${priceHtml}
          ${it.in_stock === false ? `<span class="meta">Out of stock</span>` : `<button class="btn btn-primary buy" data-buy="${it.id}">Buy Now <span class="arr">→</span></button>`}
        </div>
      </article>`;
  }).join('');
  wireGalleries(grid);
}

loadPosts();
loadEvents();
loadStore();
