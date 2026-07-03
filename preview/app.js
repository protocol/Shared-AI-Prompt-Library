(function () {
  // ── Config ──────────────────────────────────────────────────────
  // Shared upvotes & comments are powered by Supabase (Postgres) when configured.
  // Values come from config.js (window.PL_CONFIG). Leave them blank to run in
  // local-only mode — everything works, but votes/comments live in this browser.
  // The anon key is a *publishable* key and is safe in client code when paired
  // with the Row-Level Security in SUPABASE_SETUP.md. Never put a service_role key here.
  var PLCFG = window.PL_CONFIG || {};
  var CONFIG = {
    SHEET_ENDPOINT: "",
    SUPABASE_URL: (PLCFG.SUPABASE_URL || "").replace(/\/+$/, ""),
    SUPABASE_ANON_KEY: PLCFG.SUPABASE_ANON_KEY || "",
    FEEDBACK_SHEET_ENDPOINT: PLCFG.FEEDBACK_SHEET_ENDPOINT || ""
  };
  var REMOTE = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
  var promptsRemote = false;   // set true once the Supabase prompts table is confirmed present
  var feedbackRemote = false;  // set true once the Supabase feedback table is confirmed present


  // ── Library data (loaded from prompts.js / prompts.json) ─────────
  // Source of truth is prompts.json. prompts.js mirrors it as window.PROMPTS
  // so the site also works when opened directly over file://.
  var DATA = (window.PROMPTS && Array.isArray(window.PROMPTS.prompts))
    ? window.PROMPTS
    : { categories: [], prompts: [] };
  var SEED_CATEGORIES = Array.isArray(DATA.categories) ? DATA.categories : [];
  var SEED_PROMPTS = Array.isArray(DATA.prompts) ? DATA.prompts : [];

  // ── Storage keys ────────────────────────────────────────────────
  var K = {
    votes:"pl-prompt-votes",
    commentVotes:"pl-prompt-comment-votes",
    comments:"pl-prompt-comments",
    userPrompts:"pl-prompt-userprompts",
    hiddenSeeds:"pl-prompt-hidden-seeds",
    categories:"pl-prompt-categories",
    user:"pl-prompt-user",
    theme:"prompt-lib-theme",
    draftPrompt:"pl-prompt-draft",
    draftFeedback:"pl-feedback-draft"
  };
  function load(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch(e){ return fallback; } }
  function save(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }

  // Stable, anonymous id for this browser — lets us dedupe/toggle a person's vote
  // without ever revealing who they are.
  var voterId = (function(){
    var k="pl-prompt-voter-id", v=localStorage.getItem(k);
    if(!v){ v=(window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : ("v-"+Date.now().toString(36)+Math.random().toString(36).slice(2)); localStorage.setItem(k,v); }
    return v;
  })();

  // ── Supabase REST helper (only used when REMOTE) ────────────────
  function enc(s){ return encodeURIComponent(s); }
  function sbFetch(method, pathq, body, pref){
    var opts={ method:method, headers:{ apikey:CONFIG.SUPABASE_ANON_KEY, Authorization:"Bearer "+CONFIG.SUPABASE_ANON_KEY } };
    if(pref) opts.headers.Prefer=pref;
    if(body!==undefined){ opts.headers["Content-Type"]="application/json"; opts.body=JSON.stringify(body); }
    return fetch(CONFIG.SUPABASE_URL+"/rest/v1"+pathq, opts).then(function(res){
      // A POST to an already-present unique row can 409 — treat as success (idempotent).
      if(!res.ok && !(method==="POST" && res.status===409)) throw new Error("Supabase "+method+" "+res.status);
      if(res.status===204) return null;
      return res.json().catch(function(){ return null; });
    });
  }

  var commentVotes = load(K.commentVotes, {});     // { commentId: true } — NOT counted in dashboard total
  var comments     = load(K.comments, {});         // { promptId: [ {id,author,text,ts,parentId} ] }
  var userPrompts  = load(K.userPrompts, []);      // [ prompt objects; may override a seed by shared id ]
  var hiddenSeeds  = load(K.hiddenSeeds, []);      // [ seed ids the user has deleted ]
  var extraCats    = load(K.categories, []);       // [ category strings added by users ]
  var currentUser  = localStorage.getItem(K.user) || "";  // captured lazily via ensureUser()

  // Ask for the person's name the first time they act (add / comment / upvote),
  // then remember it for this browser. Returns "" if they cancel.
  function ensureUser(){
    if(currentUser && currentUser.trim()) return currentUser;
    var name=window.prompt("What's your name? (shown on prompts you add and feedback you leave)");
    if(name && name.trim()){ currentUser=name.trim(); localStorage.setItem(K.user, currentUser); }
    return currentUser;
  }

  // ── Derived data ────────────────────────────────────────────────
  function isSeed(id){ return SEED_PROMPTS.some(function(p){ return p.id===id; }); }
  function allPrompts(){
    var overrides={};
    userPrompts.forEach(function(p){ overrides[p.id]=p; });
    var seeds=SEED_PROMPTS
      .filter(function(p){ return hiddenSeeds.indexOf(p.id)===-1; })
      .map(function(p){ return overrides[p.id] || p; });
    var extras=userPrompts.filter(function(p){ return !isSeed(p.id); });
    return seeds.concat(extras);
  }
  // You can edit/delete a prompt you authored (seed or user-added).
  function canEdit(p){ return !!p.user_added || (p.author && p.author===currentUser); }
  function allCategories(){
    var set = {};
    SEED_CATEGORIES.forEach(function(c){ set[c]=1; });
    extraCats.forEach(function(c){ set[c]=1; });
    allPrompts().forEach(function(p){ if(p.category) set[p.category]=1; });
    return Object.keys(set).sort(function(a,b){ return a.localeCompare(b); });
  }
  function findPrompt(id){ return allPrompts().find(function(p){ return p.id===id; }); }

  // ── Votes ───────────────────────────────────────────────────────
  // Upvotes are anonymous. In REMOTE mode the count is the number of distinct
  // voters across the team (from Supabase); we still track whether THIS browser
  // voted (for the pressed state), so the app works offline / local-only too.
  var voteCounts = {};                       // promptId -> shared count (REMOTE mode)
  var myVotes    = load(K.votes, {});        // promptId -> true (this browser)
  function getVotes(id){ return REMOTE ? (voteCounts[id] || 0) : (myVotes[id] ? 1 : 0); }
  function hasVoted(id){ return !!myVotes[id]; }
  function toggleVote(id){
    var on=!myVotes[id];
    if(on){ myVotes[id]=true; voteCounts[id]=(voteCounts[id]||0)+1; }
    else { delete myVotes[id]; voteCounts[id]=Math.max(0,(voteCounts[id]||1)-1); }
    save(K.votes, myVotes);
    if(REMOTE) remoteVote(id, on);
    return on;
  }
  function remoteVote(id, on){
    var req = on
      ? sbFetch("POST","/votes",{ prompt_id:id, voter_id:voterId },"return=minimal")
      : sbFetch("DELETE","/votes?prompt_id=eq."+enc(id)+"&voter_id=eq."+enc(voterId));
    req.catch(function(){
      // Roll back the optimistic change and repaint so the UI stays truthful.
      if(on){ delete myVotes[id]; voteCounts[id]=Math.max(0,(voteCounts[id]||1)-1); }
      else { myVotes[id]=true; voteCounts[id]=(voteCounts[id]||0)+1; }
      save(K.votes, myVotes); toast("Couldn't sync your vote — try again"); renderStats(); render();
    });
  }
  function totalVotesAll(){ return allPrompts().reduce(function(s,p){ return s + getVotes(p.id); }, 0); }
  function topRanks(){
    var ranked = allPrompts().filter(function(p){ return getVotes(p.id) > 0; })
      .sort(function(a,b){ return getVotes(b.id) - getVotes(a.id); });
    var map = {};
    ranked.slice(0,3).forEach(function(p,i){ map[p.id] = i+1; });
    return map;
  }

  // ── Popularity ranges ───────────────────────────────────────────
  var POP_RANGES = [
    { key:"0",    label:"No votes yet", test:function(v){ return v===0; } },
    { key:"1-4",  label:"1–4 votes",    test:function(v){ return v>=1 && v<=4; } },
    { key:"5-9",  label:"5–9 votes",    test:function(v){ return v>=5 && v<=9; } },
    { key:"10+",  label:"10+ votes",    test:function(v){ return v>=10; } }
  ];

  // ── State ───────────────────────────────────────────────────────
  var state = {
    search:"", category:new Set(), sensitivity:new Set(),
    status:new Set(), popularity:new Set(), sort:"votes", openCards:new Set()
  };

  function bucketOf(p){
    if (p.is_example === true) return "Examples";
    if (p.status === "Draft") return "Drafts";
    if (p.status === "Approved") return "Approved";
    if (p.status === "Deprecated") return "Deprecated";
    return null;
  }

  // ── Helpers ─────────────────────────────────────────────────────
  function esc(s){
    return String(s==null?"":s).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function setText(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function uid(pref){ return (pref||"p")+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6); }
  function relTime(ts){
    var d = Date.now()-ts, m=Math.floor(d/60000);
    if (m<1) return "just now";
    if (m<60) return m+"m ago";
    var h=Math.floor(m/60); if (h<24) return h+"h ago";
    var day=Math.floor(h/24); if (day<7) return day+"d ago";
    return new Date(ts).toLocaleDateString();
  }
  var SENS_LABELS = {L1:"L1 · Public",L2:"L2 · Internal",L3:"L3 · Confidential",L4:"L4 · Restricted"};

  // ── Toast ───────────────────────────────────────────────────────
  function toast(msg){
    var t=document.getElementById("toast");
    t.textContent=msg; t.classList.add("show");
    clearTimeout(toast._t);
    toast._t=setTimeout(function(){ t.classList.remove("show"); },2200);
  }

  // ── Theme ───────────────────────────────────────────────────────
  function initTheme(){
    var saved=localStorage.getItem(K.theme);
    if(saved) document.documentElement.setAttribute("data-theme",saved);
    document.getElementById("themeToggle").addEventListener("click",function(){
      var cur=document.documentElement.getAttribute("data-theme")||"light";
      var next=cur==="light"?"dark":"light";
      document.documentElement.setAttribute("data-theme",next);
      localStorage.setItem(K.theme,next);
    });
  }

  // ── Identity ────────────────────────────────────────────────────
  // Identity: a discreet "Your name" setter (top of the sidebar on desktop, a menu
  // item on mobile). Persisting your name is what lets you edit your own prompts &
  // comments. Deliberately not shown inline in the top nav.
  function updateIdentityUI(){
    var t = currentUser ? ("You: "+currentUser+" — click to change")
                        : "Set the name used to attribute and edit your contributions";
    ["identityBtn","menuIdentity"].forEach(function(id){ var el=document.getElementById(id); if(el) el.title=t; });
  }
  function promptSetName(){
    var name=window.prompt("Your display name — used to attribute prompts/feedback you add, and to let you edit your own contributions:", currentUser||"");
    if(name===null) return;
    currentUser=name.trim();
    localStorage.setItem(K.user, currentUser);
    updateIdentityUI();
    renderStats(); render();
    toast(currentUser ? ("You're set as "+currentUser) : "Name cleared");
  }
  // Auto-identity: adopt the signed-in user if the embedding dashboard (LabOS)
  // provides it — via a URL param or a postMessage handshake. Falls back to the
  // manual "Your name" setter when nothing is provided. Safe no-op otherwise.
  function applyAutoIdentity(name){
    if(!name) return;
    name=String(name).trim(); if(!name || name===currentUser) return;
    currentUser=name;
    localStorage.setItem(K.user, currentUser);
    updateIdentityUI(); renderStats(); render();
  }
  function initAutoIdentity(){
    // 1) URL query/hash: ?identity= / ?name= / ?user= / ?displayName= / ?email=
    try{
      var qs=new URLSearchParams(location.search);
      var hs=new URLSearchParams((location.hash||"").replace(/^#/,""));
      var cand=qs.get("identity")||qs.get("name")||qs.get("user")||qs.get("displayName")||qs.get("email")||
               hs.get("identity")||hs.get("name")||hs.get("email");
      if(cand) applyAutoIdentity(cand);
    }catch(e){}
    // 2) postMessage handshake with the parent frame (dashboard)
    window.addEventListener("message",function(ev){
      var ok = ev.origin==="null" || ev.origin===location.origin ||
               /(^https?:\/\/(localhost|127\.0\.0\.1)(:|$))/.test(ev.origin) ||
               /\.plnetwork\.io$/.test((ev.origin||"").replace(/^https?:\/\//,""));
      if(!ok) return;
      var d=ev.data; if(!d || typeof d!=="object") return;
      var pl=d.payload||d;
      var name=pl.name||pl.displayName||pl.user||pl.fullName||pl.email;
      if(name) applyAutoIdentity(name);
    });
    // Ask the parent who the user is (LabOS can answer if it supports it)
    try{ if(window.parent && window.parent!==window){ window.parent.postMessage({type:"pl-prompt-library:whoami"},"*"); } }catch(e){}
  }
  function initIdentity(){
    var b=document.getElementById("identityBtn"); if(b) b.addEventListener("click",promptSetName);
    var m=document.getElementById("menuIdentity"); if(m) m.addEventListener("click",function(){
      var nm=document.getElementById("navMenu"); if(nm){ nm.hidden=true; var nb=document.getElementById("navMenuBtn"); if(nb) nb.setAttribute("aria-expanded","false"); }
      promptSetName();
    });
    updateIdentityUI();
  }

  // ── Hamburger menu (mobile/tablet) ──────────────────────────────
  // On narrow screens the nav, "Add a prompt", Filters, and theme controls all
  // collapse into one dropdown in the top bar. Each item reuses the existing
  // control's behavior so there's a single source of truth.
  function updateMenuThemeLabel(){
    var el=document.getElementById("menuThemeLabel"); if(!el) return;
    el.textContent = (document.documentElement.getAttribute("data-theme")==="dark") ? "Light mode" : "Dark mode";
  }
  function initNavMenu(){
    var btn=document.getElementById("navMenuBtn");
    var menu=document.getElementById("navMenu");
    if(!btn || !menu) return;
    function setOpen(open){ menu.hidden=!open; btn.setAttribute("aria-expanded", open?"true":"false"); }
    btn.addEventListener("click",function(e){ e.stopPropagation(); setOpen(menu.hidden); });
    document.addEventListener("click",function(e){ if(!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown",function(e){ if(e.key==="Escape" && !menu.hidden) setOpen(false); });

    // Library / Prompting Guide: the global [data-view] listener switches views;
    // we just close the menu afterward.
    menu.querySelectorAll("[data-view]").forEach(function(el){ el.addEventListener("click",function(){ setOpen(false); }); });

    var add=document.getElementById("menuAddPrompt");
    if(add) add.addEventListener("click",function(){ setOpen(false); var b=document.getElementById("addPromptBtn"); if(b) b.click(); });

    var th=document.getElementById("menuTheme");
    if(th) th.addEventListener("click",function(){ var t=document.getElementById("themeToggle"); if(t) t.click(); updateMenuThemeLabel(); });

    // Filters expands an accordion *inside* the menu (the filter cards are moved
    // here on small screens by initFilterHome); it does not close the menu.
    var filt=document.getElementById("menuFilters");
    var filtHome=document.getElementById("navMenuFilters");
    if(filt && filtHome) filt.addEventListener("click",function(){
      var willOpen=filtHome.hasAttribute("hidden");
      if(willOpen) filtHome.removeAttribute("hidden"); else filtHome.setAttribute("hidden","");
      filt.setAttribute("aria-expanded", willOpen?"true":"false");
    });

    updateMenuThemeLabel();
  }

  // Relocate the filter cards between the left sidebar (wide screens) and the
  // hamburger menu (<=1200px) so the options live in the menu, not the page body.
  var COMPACT = window.matchMedia("(max-width:1200px)");
  function initFilterHome(){
    var sidebar=document.querySelector(".sidebar");
    var menuHome=document.getElementById("navMenuFilters");
    if(!sidebar || !menuHome) return;
    // Only the filter cards + Clear button relocate — the feedback button stays put.
    var nodes=Array.prototype.slice.call(sidebar.querySelectorAll(".filter-card"));
    var clear=document.getElementById("clearFilters"); if(clear) nodes.push(clear);
    function place(){
      var target = COMPACT.matches ? menuHome : sidebar;
      nodes.forEach(function(n){ if(n.parentNode!==target) target.appendChild(n); });
    }
    place();
    if(COMPACT.addEventListener) COMPACT.addEventListener("change", place);
    else if(COMPACT.addListener) COMPACT.addListener(place);
  }

  // ── View switching ──────────────────────────────────────────────
  function setView(view){
    var isGuide = view==="guide";
    document.getElementById("libraryView").hidden = isGuide;
    document.getElementById("guideView").hidden = !isGuide;
    document.getElementById("hero").hidden = isGuide;
    document.querySelectorAll(".nav-link[data-view], .nav-menu-item[data-view]").forEach(function(b){
      b.classList.toggle("is-active", b.dataset.view===view);
    });
    try {
      if (isGuide) { if (location.hash !== "#guide") history.replaceState(null, "", "#guide"); }
      else if (location.hash === "#guide") { history.replaceState(null, "", location.pathname + location.search); }
    } catch(e){}
    window.scrollTo({top:0,behavior:"smooth"});
  }
  // Deep-link support: index.html#guide opens the guide; other pages can link to it.
  function initRouting(){
    if (location.hash === "#guide") setView("guide");
    window.addEventListener("hashchange", function(){
      setView(location.hash === "#guide" ? "guide" : "library");
    });
  }
  function bindViewSwitching(){
    document.body.addEventListener("click",function(e){
      var el=e.target.closest("[data-view]");
      if(el){ e.preventDefault(); setView(el.dataset.view); }
    });
  }

  // ── Stats ───────────────────────────────────────────────────────
  function renderStats(){
    var all=allPrompts();
    setText("statTotal", all.length);
    setText("statApproved", all.filter(function(p){return bucketOf(p)==="Approved";}).length);
    setText("statDrafts", all.filter(function(p){return bucketOf(p)==="Drafts";}).length);
    setText("statVotes", totalVotesAll());
  }

  // ── Filters ─────────────────────────────────────────────────────
  function buildFilters(){
    var all=allPrompts();
    function renderList(containerId, field, items, countFn, labelFn){
      var c=document.getElementById(containerId);
      c.innerHTML="";
      items.forEach(function(value){
        var n=countFn(value);
        var label=document.createElement("label");
        label.className="filter-item";
        var display=labelFn?labelFn(value):value;
        var checked=state[field].has(value)?" checked":"";
        label.innerHTML=
          '<span class="filter-item-label">'+
            '<input type="checkbox" data-field="'+field+'" data-value="'+esc(value)+'"'+checked+' />'+
            '<span>'+esc(display)+'</span>'+
          '</span>'+
          '<span class="filter-item-count">'+n+'</span>';
        c.appendChild(label);
      });
    }

    renderList("filterCategory","category", allCategories(),
      function(v){ return all.filter(function(p){return p.category===v;}).length; });
    renderList("filterPopularity","popularity", POP_RANGES.map(function(r){return r.key;}),
      function(key){ var r=POP_RANGES.find(function(x){return x.key===key;});
        return all.filter(function(p){ return r.test(getVotes(p.id)); }).length; },
      function(key){ return POP_RANGES.find(function(x){return x.key===key;}).label; });
    renderList("filterSensitivity","sensitivity",["L1","L2","L3","L4"],
      function(v){ return all.filter(function(p){return p.sensitivity===v;}).length; },
      function(v){ return SENS_LABELS[v]; });
    renderList("filterStatus","status",["Examples","Drafts","Approved"],
      function(v){ return all.filter(function(p){return bucketOf(p)===v;}).length; });

    document.querySelectorAll(".filter-item input").forEach(function(input){
      input.addEventListener("change",function(e){
        var f=e.target.dataset.field, v=e.target.dataset.value;
        if(e.target.checked) state[f].add(v); else state[f].delete(v);
        render();
      });
    });
  }

  // ── Controls ────────────────────────────────────────────────────
  function bindControls(){
    var search=document.getElementById("mainSearch");
    search.addEventListener("input",function(e){ state.search=e.target.value.toLowerCase().trim(); render(); });
    document.addEventListener("keydown",function(e){
      if(document.querySelector(".modal-backdrop.show")) return;
      if(e.key==="/" && document.activeElement!==search && !e.target.matches("input,textarea,select")){
        e.preventDefault(); search.focus();
      } else if(e.key==="Escape" && document.activeElement===search){
        search.value=""; state.search=""; search.blur(); render();
      }
    });
    document.getElementById("sortSelect").addEventListener("change",function(e){ state.sort=e.target.value; render(); });
    document.getElementById("clearFilters").addEventListener("click",function(){
      state.category.clear(); state.sensitivity.clear(); state.status.clear(); state.popularity.clear();
      state.search="";
      document.getElementById("mainSearch").value="";
      render();
    });
    document.getElementById("addPromptBtn").addEventListener("click",function(){ openPromptModal(null); });
    document.getElementById("exportJsonBtn").addEventListener("click",exportJson);
    var fb=document.getElementById("feedbackBtn"); if(fb) fb.addEventListener("click",openFeedbackModal);
    var mfb=document.getElementById("menuFeedback"); if(mfb) mfb.addEventListener("click",openFeedbackModal);
    // Expand / collapse all (global)
    document.getElementById("bulkBar").addEventListener("click",function(e){
      var b=e.target.closest("[data-action]"); if(!b) return;
      if(b.dataset.action==="expand-all"){ filtered().forEach(function(p){ state.openCards.add(p.id); }); }
      else if(b.dataset.action==="collapse-all"){ state.openCards.clear(); }
      render();
    });
    // Expand / collapse all (per category)
    document.getElementById("promptSections").addEventListener("click",function(e){
      var b=e.target.closest(".cat-toggle"); if(!b) return;
      e.stopPropagation();
      var ids=filtered().filter(function(p){return p.category===b.dataset.cat;}).map(function(p){return p.id;});
      if(b.dataset.action==="expand-cat"){ ids.forEach(function(id){ state.openCards.add(id); }); }
      else { ids.forEach(function(id){ state.openCards.delete(id); }); }
      render();
    });
  }

  // ── Filtering + sorting ─────────────────────────────────────────
  function filtered(){
    var out=allPrompts().slice();
    if(state.category.size) out=out.filter(function(p){return state.category.has(p.category);});
    if(state.sensitivity.size) out=out.filter(function(p){return state.sensitivity.has(p.sensitivity);});
    if(state.status.size) out=out.filter(function(p){return state.status.has(bucketOf(p));});
    if(state.popularity.size){
      out=out.filter(function(p){
        var v=getVotes(p.id);
        return Array.from(state.popularity).some(function(key){
          var r=POP_RANGES.find(function(x){return x.key===key;});
          return r && r.test(v);
        });
      });
    }
    if(state.search){
      var q=state.search;
      out=out.filter(function(p){
        return p.title.toLowerCase().includes(q) ||
          (p.use_case||"").toLowerCase().includes(q) ||
          (p.prompt||"").toLowerCase().includes(q) ||
          (p.tags||[]).some(function(t){return t.toLowerCase().includes(q);}) ||
          (p.author||"").toLowerCase().includes(q) ||
          (p.connectors||"").toLowerCase().includes(q);
      });
    }
    return out;
  }
  function sortList(list){
    var sensRank={L1:1,L2:2,L3:3,L4:4};
    var l=list.slice();
    if(state.sort==="votes") l.sort(function(a,b){return getVotes(b.id)-getVotes(a.id);});
    else if(state.sort==="alpha") l.sort(function(a,b){return a.title.localeCompare(b.title);});
    else if(state.sort==="sensitivity") l.sort(function(a,b){return sensRank[a.sensitivity]-sensRank[b.sensitivity];});
    else l.sort(function(a,b){return (b.updated||"").localeCompare(a.updated||"");});
    return l;
  }

  // ── Chips ───────────────────────────────────────────────────────
  function renderChips(){
    var chips=document.getElementById("activeChips");
    chips.innerHTML="";
    var all=[];
    state.category.forEach(function(v){all.push({field:"category",value:v,label:v});});
    state.popularity.forEach(function(v){var r=POP_RANGES.find(function(x){return x.key===v;});all.push({field:"popularity",value:v,label:r?r.label:v});});
    state.sensitivity.forEach(function(v){all.push({field:"sensitivity",value:v,label:v});});
    state.status.forEach(function(v){all.push({field:"status",value:v,label:v});});
    all.forEach(function(entry){
      var chip=document.createElement("span");
      chip.className="chip";
      chip.innerHTML=esc(entry.label)+'<button aria-label="Remove filter"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
      chip.querySelector("button").addEventListener("click",function(){
        state[entry.field].delete(entry.value); render();
      });
      chips.appendChild(chip);
    });
  }

  // ── Comments rendering ──────────────────────────────────────────
  function commentsFor(pid){ return (comments[pid]||[]).slice(); }
  function commentCount(pid){ return (comments[pid]||[]).length; }
  function addComment(pid, text, parentId){
    if(!comments[pid]) comments[pid]=[];
    var c={ id:uid("c"), author:currentUser, text:text, ts:Date.now(), parentId:parentId||null, client_id:voterId };
    comments[pid].push(c);
    if(REMOTE){
      sbFetch("POST","/comments",{ prompt_id:pid, author:currentUser, text:text, parent_id:parentId||null, client_id:voterId },"return=representation")
        .then(function(rows){ if(rows&&rows[0]){ c.id=rows[0].id; if(rows[0].created_at) c.ts=Date.parse(rows[0].created_at)||c.ts; } })
        .catch(function(){ toast("Couldn't sync your comment — it may not be saved for others"); });
    } else { save(K.comments, comments); }
  }
  // Comment upvotes — tracked separately and intentionally NOT added to the dashboard vote total.
  function getCommentVotes(id){ return commentVotes[id] ? 1 : 0; }
  function hasVotedComment(id){ return !!commentVotes[id]; }
  function toggleCommentVote(id){
    if(commentVotes[id]) delete commentVotes[id]; else commentVotes[id]=true;
    save(K.commentVotes, commentVotes);
  }
  function editComment(pid, id, text){
    (comments[pid]||[]).forEach(function(x){ if(x.id===id){ x.text=text; x.edited=true; } });
    if(REMOTE){ sbFetch("PATCH","/comments?id=eq."+enc(id),{ text:text, edited:true }).catch(function(){ toast("Couldn't sync the edit"); }); }
    else { save(K.comments, comments); }
  }
  function descendantIds(pid, id){
    var res=[id];
    (comments[pid]||[]).filter(function(x){return x.parentId===id;}).forEach(function(ch){
      res=res.concat(descendantIds(pid, ch.id));
    });
    return res;
  }
  function deleteComment(pid, id){
    var remove=descendantIds(pid, id);
    comments[pid]=(comments[pid]||[]).filter(function(x){ return remove.indexOf(x.id)===-1; });
    remove.forEach(function(cid){ if(commentVotes[cid]) delete commentVotes[cid]; });
    save(K.commentVotes, commentVotes);
    // On the server, parent_id has ON DELETE CASCADE, so deleting the top comment
    // removes its replies too — we only need to delete the one id.
    if(REMOTE){ sbFetch("DELETE","/comments?id=eq."+enc(id)).catch(function(){ toast("Couldn't sync the deletion"); }); }
    else { save(K.comments, comments); }
  }
  // Map a Supabase row to the in-memory comment shape used by the renderer.
  function fromRow(r){
    return { id:r.id, author:r.author, text:r.text,
      ts:(r.created_at ? Date.parse(r.created_at) : Date.now()),
      parentId:(r.parent_id!=null ? r.parent_id : null), edited:!!r.edited, client_id:r.client_id||null };
  }
  // Load shared votes + comments from Supabase into the in-memory caches.
  // Each resource hydrates independently — a failure in one (e.g. the prompts
  // table not created yet) must not stop the others from loading.
  function hydrateRemote(){
    return Promise.all([
      sbFetch("GET","/votes?select=prompt_id,voter_id").then(function(rows){
        var counts={}, mine={};
        (rows||[]).forEach(function(r){ counts[r.prompt_id]=(counts[r.prompt_id]||0)+1; if(r.voter_id===voterId) mine[r.prompt_id]=true; });
        voteCounts=counts; myVotes=mine; save(K.votes, myVotes);
      }).catch(function(){ toast("Shared sync unavailable — showing local data"); }),
      sbFetch("GET","/comments?select=*&order=created_at.asc").then(function(rows){
        var byPrompt={};
        (rows||[]).forEach(function(r){ (byPrompt[r.prompt_id]=byPrompt[r.prompt_id]||[]).push(fromRow(r)); });
        comments=byPrompt;
      }).catch(function(){}),
      sbFetch("GET","/prompts?select=id,data,hidden").then(function(rows){
        var ups=[], hid=[];
        (rows||[]).forEach(function(r){ if(r.hidden){ hid.push(r.id); } else if(r.data){ ups.push(r.data); } });
        userPrompts=ups; hiddenSeeds=hid; save(K.userPrompts,userPrompts); save(K.hiddenSeeds,hiddenSeeds);
        promptsRemote=true;   // the prompts table exists → sync writes from now on
      }).catch(function(){ /* prompts table not set up yet — keep local prompts */ }),
      sbFetch("GET","/feedback?select=id&limit=1").then(function(){ feedbackRemote=true; }).catch(function(){})
    ]);
  }
  function buildCommentNode(pid, c, list){
    var wrap=document.createElement("div");
    wrap.className="comment";
    var cv=hasVotedComment(c.id), cvCount=getCommentVotes(c.id);
    var mine=(c.client_id && c.client_id===voterId) || (!!c.author && c.author===currentUser);
    var ownerBtns=mine
      ? '<button class="comment-edit-btn" type="button">Edit</button>'+
        '<button class="comment-del-btn" type="button">Delete</button>'
      : "";
    wrap.innerHTML=
      '<div class="comment-head"><span class="comment-author">'+esc(c.author)+'</span>'+
        '<span class="comment-meta">'+relTime(c.ts)+(c.edited?' · edited':'')+'</span></div>'+
      '<div class="comment-body">'+esc(c.text)+'</div>'+
      '<div class="comment-actions">'+
        '<button class="comment-vote'+(cv?' voted':'')+'" data-cv type="button" aria-pressed="'+cv+'" aria-label="'+(cv?'Remove upvote':'Upvote this comment')+'" title="Upvote this comment">'+
          '<svg viewBox="0 0 24 24" width="12" height="12" fill="'+(cv?'currentColor':'none')+'" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'+
          '<span class="cv-count">'+cvCount+'</span>'+
        '</button>'+
        '<button class="comment-reply-btn" type="button">Reply</button>'+
        ownerBtns+
      '</div>';
    if(mine){
      var editBtn=wrap.querySelector(".comment-edit-btn");
      var delBtn=wrap.querySelector(".comment-del-btn");
      editBtn.addEventListener("click",function(){
        if(wrap.querySelector(".comment-edit-form")) return;
        var bodyEl=wrap.querySelector(".comment-body");
        var actions=wrap.querySelector(".comment-actions");
        var form=document.createElement("div");
        form.className="comment-form comment-edit-form";
        form.innerHTML=
          '<textarea aria-label="Edit comment"></textarea>'+
          '<div class="comment-form-row">'+
            '<span class="comment-as">Editing your comment</span>'+
            '<span style="display:flex;gap:8px">'+
              '<button class="action-btn" data-cancel type="button">Cancel</button>'+
              '<button class="action-btn primary" data-save type="button">Save</button>'+
            '</span>'+
          '</div>';
        var ta=form.querySelector("textarea"); ta.value=c.text;
        bodyEl.style.display="none";
        wrap.insertBefore(form, actions);
        ta.focus();
        form.querySelector("[data-cancel]").addEventListener("click",function(){ form.remove(); bodyEl.style.display=""; });
        form.querySelector("[data-save]").addEventListener("click",function(){
          var t=ta.value.trim(); if(!t){ ta.focus(); return; }
          editComment(pid, c.id, t); toast("Comment updated"); refreshFeedback(pid);
        });
      });
      delBtn.addEventListener("click",function(){
        if(window.confirm("Delete your comment? Any replies to it will be removed too.")){
          deleteComment(pid, c.id); toast("Comment deleted");
          refreshFeedback(pid); updateFeedbackCount(pid);
        }
      });
    }
    var voteBtn=wrap.querySelector("[data-cv]");
    voteBtn.addEventListener("click",function(){
      toggleCommentVote(c.id);
      var v=hasVotedComment(c.id);
      voteBtn.classList.toggle("voted",v);
      voteBtn.setAttribute("aria-pressed",v);
      voteBtn.setAttribute("aria-label",v?"Remove upvote":"Upvote this comment");
      voteBtn.querySelector("svg").setAttribute("fill",v?"currentColor":"none");
      voteBtn.querySelector(".cv-count").textContent=getCommentVotes(c.id);
    });
    var replyBtn=wrap.querySelector(".comment-reply-btn");
    var repliesWrap=document.createElement("div");
    repliesWrap.className="comment-replies";
    replyBtn.addEventListener("click",function(){
      if(wrap.querySelector(".comment-form")) return;
      var form=buildCommentForm(pid, c.id, function(){ /* re-render handled by caller */ });
      wrap.insertBefore(form, repliesWrap);
      form.querySelector("textarea").focus();
    });
    list.filter(function(x){return x.parentId===c.id;}).forEach(function(child){
      repliesWrap.appendChild(buildCommentNode(pid, child, list));
    });
    wrap.appendChild(repliesWrap);
    return wrap;
  }
  function buildCommentForm(pid, parentId, onDone){
    var form=document.createElement("div");
    form.className="comment-form";
    form.innerHTML=
      '<textarea placeholder="'+(parentId?"Write a reply…":"Leave a comment, question, or feedback…")+'" aria-label="Comment text"></textarea>'+
      '<div class="comment-form-row">'+
        '<span class="comment-as">Posting as <strong>'+esc(currentUser||"you")+'</strong></span>'+
        '<button class="action-btn primary" type="button">'+(parentId?"Reply":"Post")+'</button>'+
      '</div>';
    form.querySelector("button").addEventListener("click",function(){
      var ta=form.querySelector("textarea");
      var text=ta.value.trim();
      if(!text){ ta.focus(); return; }
      if(!ensureUser()){ toast("Enter your name to post feedback."); return; }
      addComment(pid, text, parentId);
      toast(parentId?"Reply posted":"Comment posted");
      refreshFeedback(pid);
      updateFeedbackCount(pid);
    });
    return form;
  }
  function renderFeedbackInto(pid, panel){
    panel.innerHTML="";
    var list=commentsFor(pid);
    var top=list.filter(function(c){return !c.parentId;});
    if(top.length===0){
      var empty=document.createElement("p");
      empty.className="comment-empty";
      empty.textContent="No feedback yet — be the first to comment.";
      panel.appendChild(empty);
    } else {
      top.forEach(function(c){ panel.appendChild(buildCommentNode(pid,c,list)); });
    }
    panel.appendChild(buildCommentForm(pid, null));
  }
  function refreshFeedback(pid){
    var panel=document.querySelector('.feedback-panel[data-pid="'+CSS.escape(pid)+'"]');
    if(panel) renderFeedbackInto(pid, panel);
  }
  function updateFeedbackCount(pid){
    var btn=document.querySelector('.feedback-btn[data-pid="'+CSS.escape(pid)+'"] .fb-count');
    if(btn) btn.textContent=commentCount(pid);
  }

  // ── Card rendering ──────────────────────────────────────────────
  function renderCard(p, ranks){
    var isExample = p.is_example===true;
    var card=document.createElement("article");
    card.className="prompt-card is-collapsible"+(isExample?" is-example":"");
    if(state.openCards.has(p.id)) card.classList.add("is-open");
    card.setAttribute("role","listitem");
    card.dataset.id=p.id;

    var statusBadge=bucketOf(p)||p.status;
    var displayTitle=(isExample?"Example - ":"")+p.title;
    var voted=hasVoted(p.id);
    var voteCount=getVotes(p.id);
    var rank=ranks[p.id];
    var tagHtml=(p.tags||[]).map(function(t){return '<span class="tag">#'+esc(t)+'</span>';}).join("");
    var connectorHtml=p.connectors?'<span><strong>Connectors:</strong> '+esc(p.connectors)+'</span>':"";
    var rankHtml=(rank && rank<=3)
      ? '<span class="rank-badge"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>#'+rank+'</span>'
      : "";
    var chevron='<span class="example-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></span>';
    var exampleBadge=isExample?'<span class="badge badge-example">Example</span>':"";
    var editHtml=canEdit(p)
      ? '<button class="action-btn" data-action="edit"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Edit</button>'+
        '<button class="action-btn danger" data-action="delete"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg> Delete</button>'
      : "";
    var notesHtml=p.notes?'<div class="prompt-notes"><strong>Notes:</strong> '+esc(p.notes)+'</div>':"";
    var skillFileHtml=(p.skill_file && p.skill_file.url)
      ? '<div class="prompt-skillfile"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>'+
        '<a href="'+esc(p.skill_file.url)+'" target="_blank" rel="noopener" download>Skill file: '+esc(p.skill_file.name||"download")+'</a></div>'
      : "";

    card.innerHTML=
      '<div class="prompt-head">'+
        '<div class="prompt-title-wrap">'+chevron+
          '<h2 class="prompt-title">'+esc(displayTitle)+'</h2>'+
        '</div>'+
        '<div class="prompt-badges">'+
          rankHtml+exampleBadge+
          '<span class="badge badge-category">'+esc(p.category)+'</span>'+
          '<span class="badge badge-sensitivity" data-tier="'+esc(p.sensitivity)+'">'+(SENS_LABELS[p.sensitivity]||p.sensitivity)+'</span>'+
          '<span class="badge badge-status" data-status="'+esc(statusBadge)+'">'+esc(statusBadge)+'</span>'+
        '</div>'+
      '</div>'+
      '<div class="prompt-body">'+
        '<div class="prompt-meta">'+
          '<span><strong>Submitted by:</strong> '+esc(p.author)+'</span>'+
          '<span><strong>For:</strong> '+esc(p.audience)+'</span>'+
          '<span><strong>Model:</strong> '+esc(p.model)+'</span>'+
          '<span><strong>Inputs:</strong> '+esc(p.inputs)+'</span>'+
          connectorHtml+
          '<span><strong>Updated:</strong> '+esc(p.updated)+'</span>'+
        '</div>'+
        '<p class="prompt-usecase">'+esc(p.use_case)+'</p>'+
        '<div class="prompt-section">'+
          '<div class="prompt-section-label">Prompt (click to expand)</div>'+
          '<div class="prompt-text">'+esc(p.prompt)+'</div>'+
        '</div>'+
        (p.example?('<div class="prompt-section">'+
          '<div class="prompt-section-label">Example output</div>'+
          '<blockquote class="prompt-example"><em>'+esc(p.example)+'</em></blockquote>'+
        '</div>'):"")+
        (tagHtml?'<div class="prompt-tags">'+tagHtml+'</div>':"")+
        notesHtml+
        skillFileHtml+
        '<div class="prompt-actions">'+
          '<div class="actions-left">'+
            '<button class="vote-btn'+(voted?' voted':'')+'" data-action="vote" aria-pressed="'+voted+'" aria-label="'+(voted?'Remove upvote':'Upvote this prompt')+'">'+
              '<svg viewBox="0 0 24 24" width="13" height="13" fill="'+(voted?'currentColor':'none')+'" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'+
              '<span class="vote-count">'+voteCount+'</span>'+
            '</button>'+
            '<button class="feedback-btn" data-action="feedback" data-pid="'+esc(p.id)+'">'+
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'+
              ' Feedback (<span class="fb-count">'+commentCount(p.id)+'</span>)'+
            '</button>'+
          '</div>'+
          editHtml+
          '<button class="action-btn primary" data-action="copy">'+
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'+
            ' Copy prompt'+
          '</button>'+
        '</div>'+
        '<div class="feedback-panel" data-pid="'+esc(p.id)+'" hidden></div>'+
      '</div>';

    // Collapsible header (all cards)
    card.querySelector(".prompt-head").addEventListener("click",function(){
      var open=card.classList.toggle("is-open");
      if(open) state.openCards.add(p.id); else state.openCards.delete(p.id);
    });

    // Expand/collapse prompt text
    card.querySelector(".prompt-text").addEventListener("click",function(e){
      e.stopPropagation();
      e.currentTarget.classList.toggle("expanded");
    });

    // Copy
    card.querySelector('[data-action="copy"]').addEventListener("click",function(e){
      e.stopPropagation();
      navigator.clipboard.writeText(p.prompt).then(function(){ toast("Prompt copied to clipboard"); });
    });

    // Vote
    card.querySelector('[data-action="vote"]').addEventListener("click",function(e){
      e.stopPropagation();
      toggleVote(p.id);
      var btn=e.currentTarget, nowVoted=hasVoted(p.id), newCount=getVotes(p.id);
      btn.classList.toggle("voted",nowVoted);
      btn.setAttribute("aria-pressed",nowVoted);
      btn.setAttribute("aria-label",nowVoted?"Remove upvote":"Upvote this prompt");
      btn.querySelector("svg").setAttribute("fill",nowVoted?"currentColor":"none");
      btn.querySelector(".vote-count").textContent=newCount;
      setText("statVotes",totalVotesAll());
      toast(nowVoted?"Upvote added ▲":"Upvote removed");
      if(state.sort==="votes" || state.popularity.size){
        clearTimeout(renderCard._t);
        renderCard._t=setTimeout(render,650);
      }
    });

    // Feedback toggle
    card.querySelector('[data-action="feedback"]').addEventListener("click",function(e){
      e.stopPropagation();
      var panel=card.querySelector('.feedback-panel');
      if(panel.hidden){ renderFeedbackInto(p.id,panel); panel.hidden=false; }
      else panel.hidden=true;
    });

    // Edit / delete (author only)
    if(canEdit(p)){
      card.querySelector('[data-action="edit"]').addEventListener("click",function(e){
        e.stopPropagation(); openPromptModal(p.id);
      });
      card.querySelector('[data-action="delete"]').addEventListener("click",function(e){
        e.stopPropagation();
        if(window.confirm('Delete "'+p.title+'"? This removes it from the library.')){
          deletePrompt(p.id);
        }
      });
    }

    return card;
  }

  // ── Render library (grouped by category) ────────────────────────
  function render(){
    buildFilters();
    renderChips();
    var mount=document.getElementById("promptSections");
    var empty=document.getElementById("emptyState");
    var items=filtered();
    var ranks=topRanks();
    mount.innerHTML="";

    var bulk=document.getElementById("bulkBar");
    if(items.length===0){
      empty.hidden=false;
      if(bulk) bulk.style.display="none";
      setText("resultCount","0 prompts");
      return;
    }
    empty.hidden=true;
    if(bulk) bulk.style.display="flex";
    setText("resultCount", items.length+" prompt"+(items.length===1?"":"s"));

    // group by category
    var groups={};
    items.forEach(function(p){ (groups[p.category]=groups[p.category]||[]).push(p); });
    var cats=Object.keys(groups).sort(function(a,b){return a.localeCompare(b);});

    cats.forEach(function(cat){
      var section=document.createElement("section");
      section.className="cat-section";
      var group=groups[cat];
      section.innerHTML=
        '<div class="cat-section-head">'+
          '<h2 class="cat-section-title">'+esc(cat)+'</h2>'+
          '<span class="cat-section-count">'+group.length+'</span>'+
          '<span class="cat-actions">'+
            '<button class="cat-toggle" data-action="expand-cat" data-cat="'+esc(cat)+'" type="button">Expand all</button>'+
            '<button class="cat-toggle" data-action="collapse-cat" data-cat="'+esc(cat)+'" type="button">Collapse all</button>'+
          '</span>'+
        '</div>';
      var listWrap=document.createElement("div");
      listWrap.className="prompt-list";

      var examples=sortList(group.filter(function(p){return p.is_example===true;}));
      var rest=sortList(group.filter(function(p){return p.is_example!==true;}));
      examples.forEach(function(p){ listWrap.appendChild(renderCard(p,ranks)); });
      rest.forEach(function(p){ listWrap.appendChild(renderCard(p,ranks)); });

      section.appendChild(listWrap);
      mount.appendChild(section);
    });
  }

  // ── Add / edit / delete prompt ──────────────────────────────────
  var NEW_CAT="__new__";
  var DRAFT_KEYS=["title","category","newCategory","intended_audience","recommended_model",
    "use_case","inputs_required","connectors","prompt_text","example_output","sensitivity","status","author","tags","notes"];
  function clearPromptDraft(){ try{ localStorage.removeItem(K.draftPrompt); }catch(e){} }
  function openPromptModal(editId){
    var editing = editId ? findPrompt(editId) : null;
    var cats=allCategories();
    var catOptions=cats.map(function(c){
      return '<option value="'+esc(c)+'"'+(editing&&editing.category===c?" selected":"")+'>'+esc(c)+'</option>';
    }).join("");
    var sensOptions=["L1","L2","L3","L4"].map(function(s){
      return '<option value="'+s+'"'+(editing&&editing.sensitivity===s?" selected":"")+'>'+SENS_LABELS[s]+'</option>';
    }).join("");
    var statusOptions=["Draft","Approved","Deprecated"].map(function(s){
      return '<option value="'+s+'"'+((editing?editing.status:"Draft")===s?" selected":"")+'>'+s+'</option>';
    }).join("");

    var backdrop=document.createElement("div");
    backdrop.className="modal-backdrop";
    backdrop.innerHTML=
      '<div class="modal" role="dialog" aria-modal="true" aria-label="'+(editing?"Edit prompt":"Add a prompt")+'">'+
        '<div class="modal-head">'+
          '<h2 class="modal-title">'+(editing?"Edit prompt":"Add a prompt")+'</h2>'+
          '<button class="icon-button" data-close aria-label="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'+
        '</div>'+
        '<div class="modal-body">'+
          field("title","Title","input","e.g., NDA first-pass triage",true,editing?editing.title:"")+
          '<div class="field" data-key="category">'+
            '<label>Category <span class="req">*</span></label>'+
            '<select data-input="category"><option value="">Select a category…</option>'+catOptions+
              '<option value="'+NEW_CAT+'">➕ Add a new category…</option></select>'+
            '<input data-input="newCategory" placeholder="New category name" style="margin-top:8px;display:none" />'+
          '</div>'+
          '<div class="field-row">'+
            fieldRaw("intended_audience","Intended audience","input","Who this is for",true,editing?editing.audience:"")+
            fieldRaw("recommended_model","Recommended model","input","e.g., Claude Opus for analysis",true,editing?editing.model:"")+
          '</div>'+
          field("use_case","Use case","textarea","One or two sentences on when to use it.",true,editing?editing.use_case:"")+
          field("inputs_required","Inputs required","input","What the user must supply before running.",true,editing?editing.inputs:"")+
          field("connectors","Connectors","input","e.g., Gmail, Google Drive, Notion (optional)",false,editing?editing.connectors:"")+
          fieldMono("prompt_text","Prompt text","Verbatim prompt. Use {{double_braces}} for variable inputs.",true,editing?editing.prompt:"")+
          field("example_output","Example output","textarea","3–5 line abbreviated sample showing what good output looks like.",true,editing?editing.example:"")+
          '<div class="field-row">'+
            '<div class="field" data-key="sensitivity"><label>Sensitivity <span class="req">*</span></label><select data-input="sensitivity"><option value="">Select…</option>'+sensOptions+'</select><div class="field-hint">Set by the inputs, not the outputs. When unsure, go one tier higher.</div></div>'+
            '<div class="field" data-key="status"><label>Status <span class="req">*</span></label><select data-input="status">'+statusOptions+'</select><div class="field-hint">New prompts start as Draft until a second person tests them.</div></div>'+
          '</div>'+
          '<div class="field-row">'+
            fieldRaw("author","Submitted by","input","Your name / team",true,editing?editing.author:currentUser)+
            fieldRaw("tags","Tags","input","comma, separated, tags",false,editing?(editing.tags||[]).join(", "):"")+
          '</div>'+
          field("notes","Notes","textarea","Optional caveats, gotchas, or related prompts.",false,editing?(editing.notes||""):"")+
          '<div class="field" data-key="skill_file">'+
            '<label>Skill file <span class="field-hint" style="font-weight:400;text-transform:none;display:inline">(optional — a .skill/.zip bundle this prompt pairs with)</span></label>'+
            ((editing && editing.skill_file && editing.skill_file.url)
              ? '<div class="skill-file-current">Current: <a href="'+esc(editing.skill_file.url)+'" target="_blank" rel="noopener">'+esc(editing.skill_file.name||"file")+'</a>'+
                  '<label class="skill-file-remove"><input type="checkbox" data-input="skill_file_remove" /> remove</label></div>'
              : '')+
            '<input type="file" data-input="skill_file_input" accept=".skill,.zip,.json,.md,.yaml,.yml,.txt,.py,.js,.ts" />'+
            (REMOTE ? '' : '<div class="field-hint">File upload needs the shared backend (Supabase) to be configured.</div>')+
          '</div>'+
        '</div>'+
        '<div class="modal-foot">'+
          '<button class="link-button" data-close type="button">Cancel</button>'+
          '<button class="link-button primary" data-save type="button">'+(editing?"Save changes":"Add prompt")+'</button>'+
        '</div>'+
      '</div>';

    document.getElementById("modalRoot").appendChild(backdrop);
    requestAnimationFrame(function(){ backdrop.classList.add("show"); });

    function close(){ backdrop.classList.remove("show"); setTimeout(function(){ backdrop.remove(); },160); }
    backdrop.addEventListener("click",function(e){ if(e.target===backdrop) close(); });
    backdrop.querySelectorAll("[data-close]").forEach(function(b){ b.addEventListener("click",close); });
    document.addEventListener("keydown",function onEsc(e){ if(e.key==="Escape"){ close(); document.removeEventListener("keydown",onEsc); } });

    // New-category toggle
    var catSel=backdrop.querySelector('[data-input="category"]');
    var newCatInput=backdrop.querySelector('[data-input="newCategory"]');
    catSel.addEventListener("change",function(){
      if(catSel.value===NEW_CAT){ newCatInput.style.display="block"; newCatInput.focus(); }
      else newCatInput.style.display="none";
    });

    // Draft autosave for NEW prompts — restore prior in-progress input, save on
    // every keystroke, and clear on successful submit or explicit discard.
    if(!editing){
      var draft=load(K.draftPrompt,null);
      if(draft && DRAFT_KEYS.some(function(k){ return draft[k]; })){
        DRAFT_KEYS.forEach(function(k){
          var el=backdrop.querySelector('[data-input="'+k+'"]');
          if(el && draft[k]!=null && draft[k]!=="") el.value=draft[k];
        });
        if(catSel.value===NEW_CAT) newCatInput.style.display="block";
        var mbody=backdrop.querySelector(".modal-body");
        var note=document.createElement("div");
        note.className="draft-note";
        note.innerHTML='<span>Draft restored from your last edit.</span><button type="button" data-discard>Discard</button>';
        mbody.insertBefore(note, mbody.firstChild);
        note.querySelector("[data-discard]").addEventListener("click",function(){
          clearPromptDraft();
          DRAFT_KEYS.forEach(function(k){ var el=backdrop.querySelector('[data-input="'+k+'"]'); if(el) el.value=(k==="status"?"Draft":""); });
          newCatInput.style.display="none"; note.remove(); toast("Draft discarded");
        });
      }
      var snapshotDraft=function(){
        var d={}; DRAFT_KEYS.forEach(function(k){ var el=backdrop.querySelector('[data-input="'+k+'"]'); if(el) d[k]=el.value; });
        save(K.draftPrompt,d);
      };
      backdrop.querySelectorAll('[data-input]').forEach(function(el){
        el.addEventListener("input",snapshotDraft); el.addEventListener("change",snapshotDraft);
      });
    }

    function val(key){ var el=backdrop.querySelector('[data-input="'+key+'"]'); return el?el.value.trim():""; }
    function markErr(key,on){ var f=backdrop.querySelector('.field[data-key="'+key+'"]'); if(f) f.classList.toggle("err",!!on); }

    backdrop.querySelector("[data-save]").addEventListener("click",async function(){
      var saveBtn=this;
      var category=val("category");
      if(category===NEW_CAT) category=val("newCategory");
      var record={
        title:val("title"),
        category:category,
        audience:val("intended_audience"),
        model:val("recommended_model"),
        use_case:val("use_case"),
        inputs:val("inputs_required"),
        connectors:val("connectors"),
        prompt:backdrop.querySelector('[data-input="prompt_text"]').value.trim(),
        example:val("example_output"),
        sensitivity:val("sensitivity"),
        status:val("status")||"Draft",
        author:val("author")||currentUser,
        tags:val("tags")?val("tags").split(",").map(function(t){return t.trim();}).filter(Boolean):[],
        notes:val("notes")
      };

      // Validate required
      var required={title:"title",category:"category",intended_audience:"audience",
        recommended_model:"model",use_case:"use_case",inputs_required:"inputs",
        prompt_text:"prompt",example_output:"example",sensitivity:"sensitivity",author:"author"};
      var missing=[];
      Object.keys(required).forEach(function(fk){
        var recKey=required[fk];
        var ok = fk==="prompt_text" ? !!record.prompt : !!record[recKey==="audience"?"audience":recKey];
        if(fk==="title") ok=!!record.title;
        if(fk==="category") ok=!!record.category;
        markErr(fk,!ok);
        if(!ok) missing.push(fk);
      });
      if(missing.length){ toast("Please complete all required fields."); return; }

      var pid = editing ? editing.id : uid("user");

      // Skill file: keep existing by default; honor "remove"; upload a newly chosen file.
      record.skill_file = (editing && editing.skill_file) ? editing.skill_file : null;
      var removeEl=backdrop.querySelector('[data-input="skill_file_remove"]');
      if(removeEl && removeEl.checked) record.skill_file=null;
      var fileEl=backdrop.querySelector('[data-input="skill_file_input"]');
      var newFile=fileEl && fileEl.files && fileEl.files[0];
      if(newFile){
        if(!REMOTE){ toast("File upload needs the shared backend — saved without the file"); }
        else {
          var oldTxt=saveBtn.textContent; saveBtn.disabled=true; saveBtn.textContent="Uploading…";
          try { record.skill_file = await uploadSkillFile(newFile, pid); }
          catch(e){ toast("Couldn’t upload the skill file — saved without it"); }
          saveBtn.disabled=false; saveBtn.textContent=oldTxt;
        }
      }

      record.id=pid;
      record.is_example = editing ? (editing.is_example||false) : false;
      record.user_added=true;
      record.updated=todayISO();
      if(editing){
        var idx=userPrompts.findIndex(function(x){return x.id===editing.id;});
        if(idx>=0) userPrompts[idx]=record; else userPrompts.push(record);
      } else {
        userPrompts.push(record);
      }
      save(K.userPrompts,userPrompts);

      // Remember the submitter's name as this browser's identity for later
      // upvotes/comments, so we don't re-ask.
      if(record.author && !currentUser){ currentUser=record.author; localStorage.setItem(K.user,currentUser); }

      // Persist new category
      if(category && allCategories().indexOf(category)===-1){}
      if(category && SEED_CATEGORIES.indexOf(category)===-1 && extraCats.indexOf(category)===-1){
        extraCats.push(category); save(K.categories,extraCats);
      }

      persist(record, editing?"update":"create");
      remotePromptUpsert(record, false);   // share to the team library (Supabase)
      clearPromptDraft();                  // in-progress draft is now saved
      renderStats();
      render();
      close();
      toast(editing?"Prompt updated":"Prompt added — saved to the library");
    });

    backdrop.querySelector('[data-input="title"]').focus();
  }

  // ── Feedback ────────────────────────────────────────────────────
  function openFeedbackModal(){
    // Close the hamburger menu if the button was tapped from inside it.
    var nm=document.getElementById("navMenu"); if(nm && !nm.hidden){ nm.hidden=true; var nb=document.getElementById("navMenuBtn"); if(nb) nb.setAttribute("aria-expanded","false"); }
    var backdrop=document.createElement("div");
    backdrop.className="modal-backdrop";
    backdrop.innerHTML=
      '<div class="modal" role="dialog" aria-modal="true" aria-label="Send feedback" style="max-width:520px">'+
        '<div class="modal-head">'+
          '<h2 class="modal-title">Send feedback</h2>'+
          '<button class="icon-button" data-close aria-label="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'+
        '</div>'+
        '<div class="modal-body">'+
          '<p class="field-hint" style="margin-bottom:12px">Tell us what’s working, what’s missing, or a bug you hit — it goes to the library maintainers.</p>'+
          '<div class="field"><label>Your feedback <span class="req">*</span></label><textarea data-input="message" placeholder="Your thoughts…" style="min-height:120px"></textarea></div>'+
          '<div class="field"><label>Name</label><input data-input="author" placeholder="Optional" value="'+esc(currentUser||"")+'" /></div>'+
        '</div>'+
        '<div class="modal-foot">'+
          '<button class="link-button" data-close type="button">Cancel</button>'+
          '<button class="link-button primary" data-send type="button">Send feedback</button>'+
        '</div>'+
      '</div>';
    document.getElementById("modalRoot").appendChild(backdrop);
    requestAnimationFrame(function(){ backdrop.classList.add("show"); });
    function close(){ backdrop.classList.remove("show"); setTimeout(function(){ backdrop.remove(); },160); }
    backdrop.addEventListener("click",function(e){ if(e.target===backdrop) close(); });
    backdrop.querySelectorAll("[data-close]").forEach(function(b){ b.addEventListener("click",close); });
    document.addEventListener("keydown",function onEsc(e){ if(e.key==="Escape"){ close(); document.removeEventListener("keydown",onEsc); } });

    // Draft autosave: restore an in-progress message, save on input, clear on send.
    var fMsg=backdrop.querySelector('[data-input="message"]');
    var fAuthor=backdrop.querySelector('[data-input="author"]');
    var fdraft=load(K.draftFeedback,null);
    if(fdraft && (fdraft.message || fdraft.author)){
      if(fdraft.message) fMsg.value=fdraft.message;
      if(fdraft.author) fAuthor.value=fdraft.author;
    }
    function snapshotFeedback(){ save(K.draftFeedback,{ message:fMsg.value, author:fAuthor.value }); }
    fMsg.addEventListener("input",snapshotFeedback);
    fAuthor.addEventListener("input",snapshotFeedback);

    backdrop.querySelector("[data-send]").addEventListener("click",function(){
      var msg=fMsg.value.trim();
      if(!msg){ fMsg.focus(); return; }
      sendFeedback(msg, fAuthor.value.trim());
      try{ localStorage.removeItem(K.draftFeedback); }catch(e){}
      close();
    });
    fMsg.focus();
  }
  function sendFeedback(message, author){
    // Prefer a Google Sheet (Apps Script Web App) when configured; else Supabase.
    if(CONFIG.FEEDBACK_SHEET_ENDPOINT){
      try {
        fetch(CONFIG.FEEDBACK_SHEET_ENDPOINT,{
          method:"POST", mode:"no-cors",
          headers:{"Content-Type":"text/plain;charset=utf-8"},
          body:JSON.stringify({ message:message, author:author||"", source:"prompt-library", ts:new Date().toISOString() })
        });
      } catch(e){}
      toast("Thanks for the feedback!");   // no-cors response is opaque — optimistic
      return;
    }
    if(REMOTE && feedbackRemote){
      sbFetch("POST","/feedback",{ message:message, author:author||null },"return=minimal")
        .then(function(){ toast("Thanks for the feedback!"); })
        .catch(function(){ toast("Couldn’t send feedback — please try again later"); });
      return;
    }
    toast("Feedback isn’t set up yet — ask the maintainer to enable it");
  }

  function deletePrompt(id){
    var p=findPrompt(id);
    userPrompts=userPrompts.filter(function(x){return x.id!==id;});
    save(K.userPrompts,userPrompts);
    // Deleting a built-in (seed) prompt hides it via an override list
    if(isSeed(id) && hiddenSeeds.indexOf(id)===-1){
      hiddenSeeds.push(id); save(K.hiddenSeeds,hiddenSeeds);
    }
    if(p) persist(p,"delete");
    // Sync to the shared library: user-added prompts are removed; hiding a built-in
    // seed is stored as a "hidden" marker so it stays hidden for everyone.
    if(isSeed(id)) remotePromptUpsert({ id:id }, true); else remotePromptDelete(id);
    renderStats();
    render();
    toast("Prompt deleted");
  }

  // ── Shared prompt library (Supabase) ────────────────────────────
  // Mirrors user-added prompts / seed edits / seed-hides to the prompts table so
  // they persist for everyone. Only active once the table exists (promptsRemote).
  function remotePromptUpsert(rec, hidden){
    if(!REMOTE || !promptsRemote) return;
    sbFetch("POST","/prompts",
      { id:rec.id, data: hidden ? null : rec, hidden: !!hidden, updated_at: new Date().toISOString() },
      "resolution=merge-duplicates,return=minimal"
    ).catch(function(){ toast("Couldn't sync the prompt to the shared library"); });
  }
  function remotePromptDelete(id){
    if(!REMOTE || !promptsRemote) return;
    sbFetch("DELETE","/prompts?id=eq."+enc(id)).catch(function(){ toast("Couldn't sync the deletion"); });
  }
  // Upload a skill file to the public "skills" Storage bucket; resolves to {name,url}.
  function uploadSkillFile(file, promptId){
    var safe=(file.name||"skill").replace(/[^A-Za-z0-9._-]/g,"_");
    var path=encodeURIComponent(promptId)+"/"+Date.now()+"_"+encodeURIComponent(safe);
    return fetch(CONFIG.SUPABASE_URL+"/storage/v1/object/skills/"+path,{
      method:"POST",
      headers:{ apikey:CONFIG.SUPABASE_ANON_KEY, Authorization:"Bearer "+CONFIG.SUPABASE_ANON_KEY, "x-upsert":"true" },
      body:file
    }).then(function(res){
      if(!res.ok) throw new Error("storage "+res.status);
      return { name:file.name, url: CONFIG.SUPABASE_URL+"/storage/v1/object/public/skills/"+path };
    });
  }

  // ── Persistence (Google Sheet write-back + fallback) ────────────
  function toSchema(p){
    return {
      title:p.title, category:p.category, use_case:p.use_case,
      intended_audience:p.audience, recommended_model:p.model,
      inputs_required:p.inputs, connectors:p.connectors||"",
      prompt_text:p.prompt, example_output:p.example,
      author:p.author, last_updated:p.updated,
      status:p.status, sensitivity:p.sensitivity,
      tags:p.tags||[], notes:p.notes||""
    };
  }
  function persist(prompt, action){
    if(!CONFIG.SHEET_ENDPOINT){
      // Offline: data already in localStorage. Nudge toward source-doc export.
      return;
    }
    try{
      fetch(CONFIG.SHEET_ENDPOINT,{
        method:"POST",
        mode:"no-cors",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({ action:action, id:prompt.id, prompt:toSchema(prompt), submittedBy:currentUser })
      }).then(function(){ toast("Synced to Google Sheet"); })
        .catch(function(){ toast("Saved locally — Sheet sync failed"); });
    }catch(e){}
  }
  function exportJson(){
    var payload=userPrompts.map(toSchema);
    var text=JSON.stringify(payload,null,2);
    navigator.clipboard.writeText(text).then(function(){
      toast(payload.length?("Copied "+payload.length+" prompt(s) as prompts.json entries"):"No user-added prompts to export yet");
    }).catch(function(){ window.prompt("Copy your prompts.json entries:",text); });
  }

  // ── Form field builders ─────────────────────────────────────────
  function field(key,label,type,ph,req,value){ return fieldRaw(key,label,type,ph,req,value); }
  function fieldRaw(key,label,type,ph,req,value){
    var reqTag=req?' <span class="req">*</span>':'';
    var control = type==="textarea"
      ? '<textarea data-input="'+key+'" placeholder="'+esc(ph)+'">'+esc(value||"")+'</textarea>'
      : '<input data-input="'+key+'" placeholder="'+esc(ph)+'" value="'+esc(value||"")+'" />';
    return '<div class="field" data-key="'+key+'"><label>'+esc(label)+reqTag+'</label>'+control+'</div>';
  }
  function fieldMono(key,label,ph,req,value){
    var reqTag=req?' <span class="req">*</span>':'';
    return '<div class="field" data-key="'+key+'"><label>'+esc(label)+reqTag+'</label>'+
      '<textarea class="mono" data-input="'+key+'" style="min-height:150px" placeholder="'+esc(ph)+'">'+esc(value||"")+'</textarea>'+
      '<div class="field-hint">Use <code>{{double_braces}}</code> for variable inputs.</div></div>';
  }

  // ── Init ────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded",function(){
    initTheme();
    initIdentity();
    initAutoIdentity();
    initNavMenu();
    initFilterHome();
    bindViewSwitching();
    initRouting();
    bindControls();
    renderStats();
    render();                                  // paint immediately from local cache
    if(REMOTE){
      hydrateRemote()
        .then(function(){ renderStats(); render(); })   // repaint with shared team data
        .catch(function(){ toast("Shared sync unavailable — showing local data"); });
    }
  });
})();
