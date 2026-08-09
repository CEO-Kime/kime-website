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
  grid.innerHTML = data.map(p => `
    <article class="dyn-card">
      ${p.cover_image ? `<img class="img" src="${esc(p.cover_image)}" alt="" loading="lazy">` : ''}
      <div class="body">
        <span class="meta">${fmtDate(p.created_at.slice(0,10))}</span>
        <h4>${esc(p.title)}</h4>
        <p>${esc((p.content||'').slice(0,140))}${(p.content||'').length>140?'…':''}</p>
      </div>
    </article>`).join('');
}

async function loadEvents(){
  const grid = document.getElementById('events-grid'), empty = document.getElementById('events-empty');
  if (!grid) return;
  const { data, error } = await sb.from('events').select('*').eq('published', true).order('event_date', { ascending: true });
  if (error || !data || !data.length) { empty.style.display=''; return; }
  empty.style.display = 'none';
  grid.innerHTML = data.map(ev => `
    <article class="dyn-card">
      ${ev.cover_image ? `<img class="img" src="${esc(ev.cover_image)}" alt="" loading="lazy">` : ''}
      <div class="body">
        <span class="tag">${fmtDate(ev.event_date)}</span>
        <h4>${esc(ev.title)}</h4>
        <p>${esc(ev.description||'')}</p>
        ${ev.location ? `<span class="meta">📍 ${esc(ev.location)}</span>` : ''}
      </div>
    </article>`).join('');
}

async function loadStore(){
  const grid = document.getElementById('store-grid'), empty = document.getElementById('store-empty');
  if (!grid) return;
  const { data, error } = await sb.from('store_items').select('*').eq('published', true).order('created_at', { ascending: false });
  if (error || !data || !data.length) { empty.style.display=''; return; }
  empty.style.display = 'none';
  grid.innerHTML = data.map(it => `
    <article class="dyn-card">
      ${it.image ? `<img class="img" src="${esc(it.image)}" alt="" loading="lazy">` : ''}
      <div class="body">
        <h4>${esc(it.name)}</h4>
        <p>${esc(it.description||'')}</p>
        <span class="price">${fmtPrice(it.price)}</span>
        ${it.in_stock === false ? `<span class="meta">Out of stock</span>` : `<button class="btn btn-primary buy" data-buy="${it.id}">Buy Now <span class="arr">→</span></button>`}
      </div>
    </article>`).join('');
}

loadPosts();
loadEvents();
loadStore();
