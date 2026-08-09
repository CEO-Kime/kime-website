const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* LOADER — fist fills bottom-to-top, wordmark lights, curtain lifts. Once per session. */
const loader=$('#loader');
function endLoad(){loader.classList.add('done');document.body.classList.remove('locked');setTimeout(()=>loader.remove(),1000)}
if(sessionStorage.getItem('kime-loaded')||RM){endLoad()}
else{
  const r=$('#lrect');let t0=null;const D=1100;
  const ease=x=>1-Math.pow(1-x,3);
  function step(t){if(!t0)t0=t;const p=Math.min((t-t0)/D,1);r.setAttribute('y',1536*(1-ease(p)));if(p<1)requestAnimationFrame(step);else{loader.classList.add('lit');setTimeout(endLoad,850)}}
  requestAnimationFrame(step);
  sessionStorage.setItem('kime-loaded','1');
}

/* NAV glass on scroll */
const hdr=$('#hdr');
addEventListener('scroll',()=>hdr.classList.toggle('scrolled',scrollY>24),{passive:true});

/* MOBILE MENU */
const burger=$('.burger'),mm=$('#mobileMenu');
function setMenu(open){burger.setAttribute('aria-expanded',open);mm.classList.toggle('open',open);mm.setAttribute('aria-hidden',!open);document.body.classList.toggle('locked',open)}
burger.addEventListener('click',()=>setMenu(burger.getAttribute('aria-expanded')!=='true'));

/* PAGE TRANSITIONS — real navigation with the obsidian wipe as a visual flourish.
   Links are genuine <a href> tags, so search engines, the back button, and
   opening in a new tab all work exactly like a normal website. */
const wipe=$('#wipe');
$$('[data-page]').forEach(a=>a.addEventListener('click',e=>{
  const href=a.getAttribute('href');
  if(!href||href==='#')return;
  // let modified clicks (new tab, new window, middle click) behave normally
  if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;
  // if we're already on this page, just close the menu, no need to transition
  if(location.pathname===href)return;
  e.preventDefault();
  setMenu(false);
  if(RM){location.href=href;return}
  wipe.classList.add('cover');
  setTimeout(()=>{location.href=href},520);
}));

/* MODAL */
const overlay=$('#overlay');let lastFocus=null;
function openModal(){lastFocus=document.activeElement;overlay.classList.add('open');document.body.classList.add('locked');setTimeout(()=>$('#f-name')?.focus(),380)}
function closeModal(){overlay.classList.remove('open');document.body.classList.remove('locked');$('#success').classList.remove('show');$('#formwrap').style.display='';lastFocus?.focus()}
$$('[data-modal]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openModal()}));
$$('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal()});
addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();setMenu(false)}});
/* focus trap */
overlay.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const f=$$('#modal a[href],#modal button,#modal input,#modal select,#modal textarea').filter(el=>el.offsetParent);
  const first=f[0],last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault()}
  else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault()}
});

/* FORM — Indian validation, errors state the fix */
const phoneOK=v=>/^[6-9]\d{9}$/.test(v.replace(/[^\d]/g,'').replace(/^91/,''));
const enqForm=$('#enq');
if(enqForm)enqForm.addEventListener('submit',async e=>{
  e.preventDefault();
  if(e.target.website.value)return; /* honeypot */
  let ok=true;
  const check=(id,fn)=>{const el=$(id),f=el.closest('.field'),bad=!fn(el.value.trim());f.classList.toggle('bad',bad);if(bad)ok=false};
  check('#f-name',v=>v.length>1);
  check('#f-email',v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  check('#f-phone',phoneOK);
  check('#f-city',v=>v.length>1);
  check('#f-org',v=>!!v);
  if(!ok){$('.field.bad .inp')?.focus();return}

  const btn=e.target.querySelector('button[type="submit"]'),original=btn.innerHTML;
  btn.disabled=true;btn.innerHTML='Sending…';

  try{
    const res=await fetch('https://api.web3forms.com/submit',{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({
        access_key:'f7115b8c-c4ec-4268-9fd0-6d8e4f2545c8',
        subject:'New KIME Enquiry',
        from_name:'KIME Website',
        name:$('#f-name').value.trim(),
        email:$('#f-email').value.trim()||'Not provided',
        phone:$('#f-phone').value.trim(),
        city:$('#f-city').value.trim(),
        represents:$('#f-org').value,
        preferred_callback:$('#f-time').value,
        message:$('#f-msg').value.trim()||'No message provided'
      })
    });
    const data=await res.json();
    if(!data.success)throw new Error(data.message||'Failed');
    $('#formwrap').style.display='none';
    $('#success').classList.add('show');
  }catch(err){
    alert('Something went wrong sending your enquiry. Please try again, or reach us directly at contact@kimeworld.com.');
  }finally{
    btn.disabled=false;btn.innerHTML=original;
  }
});

/* stat counters */
const sio=new IntersectionObserver(es=>{es.forEach(e=>{
  if(!e.isIntersecting||e.target.dataset.done)return;e.target.dataset.done=1;
  const end=+e.target.dataset.count,suf=e.target.dataset.suffix||'';let t0=null;const D=1400;
  const ez=x=>1-Math.pow(1-x,4);
  const st=t=>{if(!t0)t0=t;const p=Math.min((t-t0)/D,1);e.target.textContent=Math.round(end*ez(p))+suf;if(p<1)requestAnimationFrame(st)};
  if(RM){e.target.textContent=end+suf;return}
  requestAnimationFrame(st);
})},{threshold:.5});
$$('[data-count]').forEach(el=>sio.observe(el));

$$('.field .inp').forEach(el=>el.addEventListener('input',()=>el.closest('.field').classList.remove('bad')));

/* BACK/FORWARD BUTTON FIX — when you navigate away mid-transition, the browser
   often freezes that exact covered frame for the Back/Forward cache. On return,
   this properly plays the reveal (fist lifting away) instead of leaving it
   stuck, or snapping instantly with no animation. */
addEventListener('pageshow', e=>{
  if(e.persisted){
    document.body.classList.remove('locked');
    setMenu(false);
    if(wipe.classList.contains('cover')){
      wipe.classList.remove('cover');
      wipe.classList.add('reveal');
      setTimeout(()=>wipe.classList.remove('reveal'),700);
    }else{
      wipe.classList.remove('reveal');
    }
  }
});
