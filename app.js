/* ═══════════ GoalDay v2 · GoalDay周计划 × 氢时光全模块 ═══════════ */
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
/* v5：回归莫兰迪/马卡龙 8 色板（全局唯一颜色来源） */
const PALETTE = ["#f57c6e","#f2b56f","#fae69e","#84c3b7","#88d8db","#71b7ed","#b8aeeb","#f2a7da"];
/* v3(Apple 系统色) → v5(马卡龙) 颜色迁移映射 */
const COLOR_MIGRATE = {
  "#ff3b30":"#f57c6e","#ff9500":"#f2b56f","#ffcc00":"#fae69e","#34c759":"#84c3b7",
  "#5ac8fa":"#88d8db","#007aff":"#71b7ed","#5856d6":"#b8aeeb","#af52de":"#f2a7da",
};
const migColor = c => COLOR_MIGRATE[(c||"").toLowerCase()] || c || "#71b7ed";
const DAY_NAMES = ["周一","周二","周三","周四","周五","周六","周日"];
const KEY = "goalday-state-v2";
const OLD_KEY = "goalday-state-v1";

/* ───────── 日期工具 ───────── */
function fmtDate(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
const todayStr = () => fmtDate(new Date());
function mondayOf(offset){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7)+offset*7);return d;}
function weekDates(offset){const m=mondayOf(offset);return Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);return d;});}
function isoWeek(d){const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()+3-((t.getDay()+6)%7));const w1=new Date(t.getFullYear(),0,4);return 1+Math.round(((t-w1)/864e5-3+((w1.getDay()+6)%7))/7);}
function addDays(ds,n){const d=new Date(ds+"T00:00");d.setDate(d.getDate()+n);return fmtDate(d);}
function md(ds){return ds?ds.slice(5).replace("-","/"):"";}

/* ───────── 状态 & 迁移 ───────── */
function defaultState(){
  const l1=uid(),l2=uid(),l3=uid();
  return {
    version:2,
    lists:[
      {id:l1,name:"工作",emoji:"💼",color:"#71b7ed"},
      {id:l2,name:"个人成长",emoji:"🌱",color:"#84c3b7"},
      {id:l3,name:"健康养生",emoji:"🍵",color:"#f2b56f"},
    ],
    tasks:[
      {id:uid(),listId:null,title:"👋 欢迎使用 GoalDay！点我编辑",notes:"我在收集箱里～长按可拖到周历排程",due:null,dueEnd:null,time:null,allDay:false,done:false,abandoned:false,tags:["上手指南"],priority:1,subs:[{id:uid(),title:"去「视图」看看双栏周计划",done:false},{id:uid(),title:"试试番茄钟和打卡",done:false}],createdAt:Date.now(),completedAt:null},
      {id:uid(),listId:l1,title:"📝 填截止日期会自动进周历",notes:"",due:todayStr(),dueEnd:null,time:"18:00",allDay:false,done:false,abandoned:false,tags:[],priority:0,subs:[],createdAt:Date.now(),completedAt:null},
    ],
    events:[], goals:{},
    weekOffset:0, weekView:"simple", viewMode:"week", poolList:"all", splitLeft:null,
    todoLayer:"home", todoSel:"inbox",
    reviewDim:"week",
    dayDate:todayStr(), monthOffset:0,
    habits:[
      {id:uid(),name:"早起喝水",emoji:"💧",color:"#88d8db",checks:{},createdAt:Date.now()},
      {id:uid(),name:"阅读30分钟",emoji:"📖",color:"#b8aeeb",checks:{},createdAt:Date.now()},
    ],
    pomo:{focusMin:25,breakMin:5,noise:false,records:[]},
    settings:{theme:"morandi"},
    activeTab:"todo",
    /* v10：新功能数据 */
    revMode:"data",
    moods:{},
    palette:{favs:[],colors:[],lastInspire:null},
    inspirations:[],
    annual:{},
  };
}
function migrateV1(old){
  const st=defaultState();
  st.lists=(old.lists||[]).map(l=>({id:l.id,name:l.name,emoji:l.emoji||"✨",color:PALETTE[(l.color||0)%PALETTE.length]}));
  st.tasks=(old.tasks||[]).map(t=>({id:t.id,listId:t.listId||null,title:t.title,notes:t.notes||"",due:t.due||null,dueEnd:null,time:t.time||null,allDay:false,done:!!t.done,abandoned:false,tags:[],priority:null,subs:[],createdAt:Date.now(),completedAt:t.done?Date.now():null}));
  st.events=old.events||[]; st.goals=old.goals||{};
  st.weekOffset=old.weekOffset||0; st.weekView=old.view||"simple";
  st.habits=defaultState().habits;
  return st;
}
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      const st=Object.assign(defaultState(),JSON.parse(raw));
      (st.lists||[]).forEach(l=>l.color=migColor(l.color));
      (st.habits||[]).forEach(h=>h.color=migColor(h.color));
      /* v6：仅保留 日/周 两种视图；侧边栏仅保留 收集箱/自建清单 */
      if(st.viewMode!=="day"&&st.viewMode!=="week")st.viewMode="week";
      if(st.todoSel==="quad"||st.todoSel==="done"||st.todoSel==="abandoned")st.todoSel="inbox";
      if(st.poolList==="inbox")st.poolList="all";   /* v9：收集箱统一为「全部未排期」池 */
      if(!["princess","flower","morandi","macaron"].includes(st.settings&&st.settings.theme))st.settings=Object.assign({theme:"morandi"},st.settings||{});
      if(!st.todoLayer)st.todoLayer="home";
      if(!st.reviewDim)st.reviewDim="week";
      if(!st.revMode)st.revMode="data";
      if(!st.moods)st.moods={};
      if(!st.palette)st.palette={favs:[],colors:[],lastInspire:null};
      if(!st.inspirations)st.inspirations=[];
      if(!st.annual)st.annual={};
      return st;
    }
    const old=localStorage.getItem(OLD_KEY);
    if(old){const st=migrateV1(JSON.parse(old));toastLater="已自动升级旧版数据 ✨";return st;}
  }catch(e){console.warn(e);}
  return defaultState();
}
let toastLater=null;
let state=load();
let saveTimer=null;
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>localStorage.setItem(KEY,JSON.stringify(state)),150);}

/* ───────── 通用 ───────── */
function esc(s){const d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}
function listOf(id){return state.lists.find(l=>l.id===id);}
function colorOf(t){const l=listOf(t.listId);return l?l.color:"#b8aeeb";}
function activeTasks(){return state.tasks.filter(t=>!t.abandoned);}
let toastTimer=null;
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2200);}

/* ───────── Tab 切换 ───────── */
const PAGES={todo:"page-todo",habit:"page-habit",focus:"page-focus",review:"page-review",settings:"page-settings"};
function switchTab(tab){
  state.activeTab=tab;
  Object.entries(PAGES).forEach(([k,id])=>$("#"+id).classList.toggle("active",k===tab));
  $$("#tabbar button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  const inPlan=(tab==="todo"&&state.todoLayer==="plan");
  $("#fabAdd").classList.toggle("show",tab==="todo");
  $("#fabView").style.display=(inPlan&&state.viewMode==="week")?"block":"none";
  renderTab(tab); save();
}
$$("#tabbar button").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
function renderTab(tab){
  if(tab==="todo")renderTodo();
  else if(tab==="habit")renderHabit();
  else if(tab==="focus")renderFocus();
  else if(tab==="review")renderReview();
  else if(tab==="settings")renderSettings();
}
function renderAll(){renderTab(state.activeTab);save();}

/* ═══════════ Tab1 待办 · GTD ═══════════ */
const SYS_LISTS=[
  {id:"inbox",name:"收集箱",emoji:"📥"},
];
function sysCount(id){
  const ts=state.tasks;
  if(id==="inbox")return ts.filter(t=>!t.done&&!t.abandoned&&!t.due).length;
  return 0;
}
function enterPlan(pool){
  state.todoLayer="plan";
  state.poolList=pool;
  closeDrawer();
  renderTodo();
}
function renderDrawer(){
  const sys=$("#sysLists");sys.innerHTML="";
  SYS_LISTS.forEach(s=>{
    const b=document.createElement("button");
    const cnt=state.tasks.filter(t=>!t.done&&!t.abandoned&&!t.due).length;
    b.className="ditem"+(state.todoLayer==="plan"&&state.poolList==="all"?" active":"");
    b.innerHTML=`<span>${s.emoji}</span>${s.name}<span class="cnt">${cnt}</span>`;
    b.addEventListener("click",()=>enterPlan("all"));
    sys.appendChild(b);
  });
  const ul=$("#userLists");ul.innerHTML="";
  state.lists.forEach(l=>{
    const b=document.createElement("button");
    b.className="ditem"+(state.todoLayer==="plan"&&state.poolList===l.id?" active":"");
    b.innerHTML=`<span class="dot" style="background:${l.color}"></span><span>${l.emoji}</span>${esc(l.name)}<span class="cnt">${state.tasks.filter(t=>t.listId===l.id&&!t.done&&!t.abandoned).length}</span>`;
    b.addEventListener("click",()=>enterPlan(l.id));
    b.addEventListener("contextmenu",e=>{e.preventDefault();delList(l.id);});
    let tm;
    b.addEventListener("touchstart",()=>{tm=setTimeout(()=>delList(l.id),700);},{passive:true});
    b.addEventListener("touchend",()=>clearTimeout(tm));
    b.addEventListener("touchmove",()=>clearTimeout(tm));
    ul.appendChild(b);
  });
}
function delList(id){
  const l=listOf(id);if(!l)return;
  if(confirm(`删除清单「${l.name}」？其中任务将移入收集箱。`)){
    state.lists=state.lists.filter(x=>x.id!==id);
    state.tasks.forEach(t=>{if(t.listId===id)t.listId=null;});
    if(state.todoSel===id)state.todoSel="inbox";
    if(state.poolList===id)state.poolList="all";
    renderDrawer();renderTodo();save();
  }
}
function openDrawer(){renderDrawer();$("#drawer").classList.add("show");$("#drawerMask").classList.add("show");}
function closeDrawer(){$("#drawer").classList.remove("show");$("#drawerMask").classList.remove("show");}
$("#drawerBtn").addEventListener("click",openDrawer);
$("#drawerBtn2").addEventListener("click",openDrawer);
$("#planBack").addEventListener("click",()=>{state.todoLayer="home";renderTodo();save();});
$("#drawerMask").addEventListener("click",closeDrawer);
$("#addListBtn").addEventListener("click",()=>{closeDrawer();openListModal();});

function todoTitle(){
  const s=SYS_LISTS.find(x=>x.id===state.todoSel);
  if(s)return s.emoji+" "+s.name;
  const l=listOf(state.todoSel);
  return l?l.emoji+" "+l.name:"📥 收集箱";
}
/* ── Tab1：首页（收集箱） + 双栏周计划（第二层） ── */
function renderTodo(){
  const home=$("#todoHome"),plan=$("#todoPlan");
  if(state.todoLayer==="plan"){home.hidden=true;plan.hidden=false;renderTodoPlan();}
  else{home.hidden=false;plan.hidden=true;renderTodoHome();}
}
function renderTodoHome(){
  $("#todoTitle").textContent="📋 待办";
  const body=$("#todoBody");body.innerHTML="";
  /* 收集箱入口卡（→ 双栏周计划 · 未排期任务池） */
  const inboxCnt=state.tasks.filter(t=>!t.done&&!t.abandoned&&!t.due).length;
  body.appendChild(homeCard("📥","收集箱",inboxCnt,"plan","all"));
  /* 各用户清单 */
  state.lists.forEach(l=>{
    const n=state.tasks.filter(t=>t.listId===l.id&&!t.done&&!t.abandoned).length;
    body.appendChild(homeCard(l.emoji,l.name,n,"plan",l.id,l.color));
  });
  /* 新增清单 */
  const add=document.createElement("button");
  add.className="home-add";add.innerHTML="➕ 新增清单";
  add.addEventListener("click",openListModal);
  body.appendChild(add);
}
function homeCard(emoji,name,count,act,arg,color){
  const c=document.createElement("button");
  c.className="home-card";
  c.innerHTML=`<span class="hc-ico">${emoji}</span>`+
    (color?`<span class="dot" style="background:${color}"></span>`:"")+
    `<span class="hc-name">${esc(name)}</span>`+
    `<span class="hc-cnt">${count}</span>`+
    `<span class="hc-go">›</span>`;
  c.addEventListener("click",()=>{if(act==="plan")enterPlan(arg);});
  return c;
}
function renderTodoPlan(){
  setWkTab("plan");
  renderView();
}
function fillTaskList(box,list){
  list=list.slice().sort((a,b)=>(a.done-b.done)||((a.priority??9)-(b.priority??9))||String((a.due||"9999")+(a.time||"99")).localeCompare(String((b.due||"9999")+(b.time||"99"))));
  if(!list.length){box.innerHTML=`<div class="empty-tip">空空如也 ☁️<br>点右下角 ➕ 添加任务吧</div>`;return;}
  list.forEach(t=>box.appendChild(taskCard(t)));
}
function taskCard(t,opts){
  opts=opts||{};
  const card=document.createElement("div");
  card.className="tcard"+(t.done?" done":"")+(t.abandoned?" abandon":"")+(opts.pool?" pool-card":"");
  card.style.setProperty("--dot",colorOf(t));
  /* 待办池：左前增加清单小色点（参考图） */
  if(opts.pool){
    const dot=document.createElement("span");
    dot.className="dot";dot.style.cssText=`width:8px;height:8px;border-radius:50%;background:${colorOf(t)};flex:none;margin-top:7px;`;
    card.appendChild(dot);
  }
  const ck=document.createElement("button");
  ck.className="ckb"+(t.abandoned?" x":(t.done?" on":""));
  ck.setAttribute("aria-label",t.abandoned?"已放弃":(t.done?"已完成":"未完成"));
  ck.addEventListener("click",e=>{e.stopPropagation();if(t.abandoned)return toast("先在编辑里取消放弃状态哦");toggleDone(t,!t.done);});
  card.appendChild(ck);
  const body=document.createElement("div");body.className="body";
  let meta="";
  if(t.due){
    const overdue=!t.done&&!t.abandoned&&t.due<todayStr();
    meta+=`<span class="badge ${overdue?"overdue":"sched"}">📅 ${md(t.due)}${t.dueEnd?"–"+md(t.dueEnd):""}${t.allDay?" 全天":(t.time?" "+t.time:"")}${overdue?" 已过期":""}</span>`;
  }else if(!opts.pool)meta+=`<span class="badge">未排期</span>`;
  if(t.priority!=null)meta+=`<span class="badge p${t.priority}">P${t.priority}</span>`;
  (t.tags||[]).forEach(g=>meta+=`<span class="badge tag"># ${esc(g)}</span>`);
  if(t.subs&&t.subs.length)meta+=`<span class="badge">${t.subs.filter(s=>s.done).length}/${t.subs.length}</span>`;
  const l=listOf(t.listId);
  if(l&&!opts.pool)meta+=`<span class="badge">${l.emoji}${esc(l.name)}</span>`;
  body.innerHTML=`<div class="tt">${esc(t.title)}</div>`+(t.notes?`<div class="nt">${esc(t.notes)}</div>`:"")+(meta?`<div class="meta">${meta}</div>`:"");
  card.appendChild(body);
  if(!t.abandoned&&!t.done&&!opts.pool){
    const ab=document.createElement("button");
    ab.className="abn-btn";ab.textContent="✕";ab.title="标记放弃";
    ab.addEventListener("click",e=>{e.stopPropagation();if(confirm("放弃这个任务？"))(t.abandoned=true,t.done=false,renderAll(),toast("已标记放弃"));});
    card.appendChild(ab);
  }
  card.addEventListener("click",()=>openTaskModal(t.id));
  enableDrag(card,t.id);
  return card;
}
function toggleDone(t,v){
  t.done=v;t.completedAt=v?Date.now():null;
  if(v&&t.subs)t.subs.forEach(s=>s.done=true);
  renderAll();toast(v?"🎉 完成啦！":"已恢复未完成");
}
/* ═══════════ Tab2 视图（v5：仅 日/周 两种） ═══════════ */
const VWRAPS={day:"dayWrap",week:"weekWrap"};
$$("#viewSwitch button").forEach(b=>b.addEventListener("click",()=>{state.viewMode=b.dataset.view;renderView();save();}));
function renderView(){
  $$("#viewSwitch button").forEach(b=>b.classList.toggle("active",b.dataset.view===state.viewMode));
  Object.entries(VWRAPS).forEach(([k,id])=>$("#"+id).hidden=k!==state.viewMode);
  $("#fabView").style.display=state.viewMode==="week"?"block":"none";
  if(state.viewMode==="week")renderWeek();
  else renderDay();
  applySplit();
}
/* 应用持久化的双栏宽度（可拖拽分割线） */
function applySplit(){
  const cols=$(".week-cols"); if(!cols)return;
  if(state.splitLeft)cols.style.setProperty("--left-w",state.splitLeft);
  else cols.style.removeProperty("--left-w");
}
/* 可拖拽分割线：用户按住左右拖动调节两栏宽窄，与拖任务互不干扰 */
function initSplitter(){
  const sp=$("#splitter"); if(!sp)return;
  const cols=$(".week-cols"); if(!cols)return;
  let on=false,sx=0,startW=0,cw=0;
  const down=e=>{
    on=true;sp.classList.add("active");
    const r=cols.getBoundingClientRect();cw=r.width;
    startW=cols.querySelector(".cal-panel").getBoundingClientRect().width;
    sx=(e.touches?e.touches[0].clientX:e.clientX);
    document.body.classList.add("col-resizing");
    if(e.cancelable)e.preventDefault();
  };
  const move=e=>{
    if(!on)return;
    const x=(e.touches?e.touches[0].clientX:e.clientX);
    let pct=(startW+(x-sx))/cw*100;
    pct=Math.max(30,Math.min(82,pct));
    cols.style.setProperty("--left-w",pct.toFixed(1)+"%");
    if(e.cancelable)e.preventDefault();
  };
  const up=()=>{
    if(!on)return;on=false;sp.classList.remove("active");
    document.body.classList.remove("col-resizing");
    state.splitLeft=cols.style.getPropertyValue("--left-w")||null;save();
  };
  sp.addEventListener("mousedown",down);
  sp.addEventListener("touchstart",down,{passive:false});
  window.addEventListener("mousemove",move);
  window.addEventListener("touchmove",move,{passive:false});
  window.addEventListener("mouseup",up);
  window.addEventListener("touchend",up);
}

/* ── 周计划（双栏） ── */
function renderWeek(){
  document.body.classList.toggle("view-simple",state.weekView==="simple");
  document.body.classList.toggle("view-full",state.weekView==="full");
  const dates=weekDates(state.weekOffset);
  $("#weekNum").textContent=`第${isoWeek(dates[0])}周`;
  $("#weekRange").textContent=`${dates[0].getMonth()+1}月${dates[0].getDate()}日 – ${dates[6].getMonth()+1}月${dates[6].getDate()}日`;
  $("#todayBtn").style.visibility=state.weekOffset===0?"hidden":"visible";
  const k=fmtDate(dates[0]);
  const gi=$("#goalInput");
  if(document.activeElement!==gi)gi.value=state.goals[k]||"";

  const grid=$("#weekGrid");grid.innerHTML="";
  dates.forEach((d,i)=>{
    const ds=fmtDate(d);
    const cell=document.createElement("div");
    cell.className="day-cell"+(ds===todayStr()?" today":"");
    cell.dataset.date=ds;
    const isToday=ds===todayStr();
    cell.innerHTML=`<div class="day-head">
        <span class="day-num">${d.getDate()}</span>
        <span class="day-wk">${isToday?"今天":DAY_NAMES[i]}</span>
      </div>`;
    const chips=document.createElement("div");chips.className="chips";
    const items=dayItems(ds);
    items.forEach(it=>chips.appendChild(it.type==="ics"?icsChip(it.data):weekChip(it.data)));
    cell.appendChild(chips);grid.appendChild(cell);
  });
  renderPool();
}
function dayItems(ds){
  const items=[];
  state.events.filter(e=>e.date===ds).forEach(e=>items.push({type:"ics",data:e}));
  let tks=state.tasks.filter(t=>t.due===ds||(t.due&&t.dueEnd&&t.due<=ds&&t.dueEnd>=ds));
  tks.sort((a,b)=>((a.done||a.abandoned)-(b.done||b.abandoned))||String(a.time||"99").localeCompare(String(b.time||"99")));
  tks.forEach(t=>items.push({type:"task",data:t}));
  return items;
}
function icsChip(e){
  const el=document.createElement("div");
  el.className="chip ics";
  el.innerHTML=`<span class="ico">📅</span><span class="t">${esc(e.title)}</span>`+(e.time?`<span class="time">${e.time}</span>`:"");
  return el;
}
function weekChip(t){
  const el=document.createElement("div");
  el.className="chip"+(t.done?" done":"")+(t.abandoned?" abandon":"")+((t.priority===0||(t.due&&t.due<todayStr()&&!t.done&&!t.abandoned))?" urgent":"");
  el.style.setProperty("--dot",colorOf(t));
  const st=document.createElement("button");
  st.className="st"+(t.abandoned?" x":(t.done?" on":""));
  st.setAttribute("aria-label",t.abandoned?"已放弃":(t.done?"已完成":"未完成"));
  st.addEventListener("click",e=>{e.stopPropagation();if(!t.abandoned)toggleDone(t,!t.done);});
  el.appendChild(st);
  /* 标题内可能含有 emoji，保留原样展示 */
  const tt=document.createElement("span");tt.className="t";tt.textContent=t.title;el.appendChild(tt);
  if(t.time&&!t.allDay){const s=document.createElement("span");s.className="time";s.textContent=t.time;el.appendChild(s);}
  if(state.weekView==="full"&&t.notes){const n=document.createElement("span");n.className="note";n.textContent="✎ "+t.notes;el.appendChild(n);}
  el.addEventListener("click",()=>openTaskModal(t.id));
  enableDrag(el,t.id);
  return el;
}
function renderPool(){
  /* 自定义下拉：圆点 + 名称 + ⌄ */
  const sel=state.poolList;
  const cur=sel==="all"?{name:"收集箱",color:"#8A857E"}:
            (()=>{const l=state.lists.find(x=>x.id===sel);return l?{name:l.name,color:l.color,emoji:l.emoji}:{name:"收集箱",color:"#8A857E"};})();
  $("#poolName").textContent=cur.name;
  $("#poolDot").style.background=cur.color;

  /* 下拉菜单项：收集箱（全部未排期） + 各用户清单 */
  const menu=$("#poolMenu");
  const items=[
    {id:"all",name:"收集箱",color:"#8A857E",emoji:"📥"},
    ...state.lists.map(l=>({id:l.id,name:l.name,color:l.color,emoji:l.emoji}))
  ];
  menu.innerHTML=items.map(it=>`<div class="mi" data-id="${it.id}"><span class="dot" style="background:${it.color}"></span><span>${esc(it.emoji)} ${esc(it.name)}</span></div>`).join("");
  menu.querySelectorAll(".mi").forEach(m=>{
    m.addEventListener("click",()=>{
      state.poolList=m.dataset.id;
      $("#poolPanel").classList.remove("open");
      renderPool();save();
    });
  });

  /* 任务列表 —— 剪切语义：只显示「未排期」任务；拖到左侧周历后即从池中消失 */
  const box=$("#poolList");box.innerHTML="";
  let list=activeTasks().filter(t=>{
    if(t.due)return false;               /* 已排期 → 已被"剪切"到左侧周历 */
    if(t.done)return false;              /* 已完成不占清单池 */
    if(state.poolList==="all")return true;   /* 收集箱 = 全部未排期任务 */
    return t.listId===state.poolList;
  });
  list.sort((a,b)=>((a.priority??9)-(b.priority??9))||(a.createdAt-b.createdAt));
  if(!list.length){box.innerHTML=`<div class="empty-tip">这个清单空空的 ☁️<br>未排期的任务会出现在这里<br>拖到左侧周历即完成排程 ✂️</div>`;return;}
  list.forEach(t=>box.appendChild(taskCard(t,{pool:true})));
}
/* 打开/关闭自定义下拉 */
$("#poolTrigger").addEventListener("click",e=>{
  e.stopPropagation();
  $("#poolPanel").classList.toggle("open");
});
document.addEventListener("click",e=>{
  if(!e.target.closest("#poolPanel"))$("#poolPanel").classList.remove("open");
});
$("#quickInput").addEventListener("keydown",e=>{
  if(e.key!=="Enter")return;
  const v=e.target.value.trim();if(!v)return;
  const listId=state.poolList!=="all"?state.poolList:null;
  state.tasks.unshift({id:uid(),listId,title:v,notes:"",due:null,dueEnd:null,time:null,allDay:false,done:false,abandoned:false,tags:[],priority:null,subs:[],createdAt:Date.now(),completedAt:null});
  e.target.value="";renderWeek();save();toast("已加入待办池 🫧");
});
$("#goalInput").addEventListener("input",e=>{state.goals[fmtDate(mondayOf(state.weekOffset))]=e.target.value;save();});
$("#prevWeek").addEventListener("click",()=>{state.weekOffset--;renderWeek();save();});
$("#nextWeek").addEventListener("click",()=>{state.weekOffset++;renderWeek();save();});
$("#todayBtn").addEventListener("click",()=>{state.weekOffset=0;renderWeek();save();});
$("#fabView").addEventListener("click",()=>{state.weekView=state.weekView==="simple"?"full":"simple";renderWeek();save();toast(state.weekView==="simple"?"✨ 简洁概览视图":"📋 完整周详情视图");});
$("#wtPlan").addEventListener("click",()=>setWkTab("plan"));
$("#wtPool").addEventListener("click",()=>setWkTab("pool"));
function setWkTab(t){
  document.body.classList.toggle("wk-plan",t==="plan");
  document.body.classList.toggle("wk-pool",t==="pool");
  $("#wtPlan").classList.toggle("active",t==="plan");
  $("#wtPool").classList.toggle("active",t==="pool");
}
setWkTab("plan");

/* ── 日视图 ── */
$("#dayPrev").addEventListener("click",()=>{state.dayDate=addDays(state.dayDate,-1);renderDay();save();});
$("#dayNext").addEventListener("click",()=>{state.dayDate=addDays(state.dayDate,1);renderDay();save();});
$("#dayToday").addEventListener("click",()=>{state.dayDate=todayStr();renderDay();save();});
function renderDay(){
  const ds=state.dayDate;
  const d=new Date(ds+"T00:00");
  $("#dayTitle").textContent=`${d.getMonth()+1}月${d.getDate()}日 ${DAY_NAMES[(d.getDay()+6)%7]}`+(ds===todayStr()?" · 今天":"");
  const box=$("#dayTimeline");box.innerHTML="";
  const items=dayItems(ds);
  if(!items.length){box.innerHTML=`<div class="empty-tip">这一天还没有安排 🛋️</div>`;return;}
  const allday=items.filter(i=>i.type==="task"?(!i.data.time||i.data.allDay):!i.data.time);
  const timed=items.filter(i=>!allday.includes(i)).sort((a,b)=>String(a.data.time).localeCompare(String(b.data.time)));
  if(allday.length){
    const row=document.createElement("div");row.className="tl-row";
    row.innerHTML=`<div class="tl-time">🌤️ 全天</div>`;
    const b=document.createElement("div");b.className="tl-body";
    allday.forEach(i=>b.appendChild(i.type==="ics"?icsChip(i.data):weekChip(i.data)));
    row.appendChild(b);box.appendChild(row);
  }
  timed.forEach(i=>{
    const row=document.createElement("div");row.className="tl-row";
    row.innerHTML=`<div class="tl-time">⏰ ${i.data.time}</div>`;
    const b=document.createElement("div");b.className="tl-body";
    b.appendChild(i.type==="ics"?icsChip(i.data):weekChip(i.data));
    row.appendChild(b);box.appendChild(row);
  });
}

/* ═══════════ 拖拽系统（强化版） ═══════════ */
let ghost=null,dragTaskId=null,dragSrcEl=null,hoverEl=null,edgeTimer=null,draggingStarted=false;
function enableDrag(el,taskId){
  el.addEventListener("mousedown",e=>{
    if(e.button!==0||e.target.tagName==="BUTTON"||e.target.type==="checkbox")return;
    startDrag(e.clientX,e.clientY,taskId,el,false);
  });
  el.addEventListener("touchstart",e=>{
    if(e.target.tagName==="BUTTON")return;
    const t=e.touches[0];startDrag(t.clientX,t.clientY,taskId,el,true);
  },{passive:true});
}
function startDrag(sx,sy,taskId,el,isTouch){
  let started=false,timer=null,longPressed=false;
  const begin=()=>{
    if(started)return;
    started=true;draggingStarted=true;dragTaskId=taskId;dragSrcEl=el;
    /* 源元素变淡 */
    el.classList.add("dragging-source");
    /* 创建浮起 ghost */
    ghost=el.cloneNode(true);
    ghost.classList.remove("dragging-source");
    ghost.classList.add("ghost");
    const w=Math.min(el.getBoundingClientRect().width,230);
    ghost.style.width=w+"px";
    document.body.appendChild(ghost);positionGhost(sx,sy);
    document.body.classList.add("dragging");
    if(navigator.vibrate)navigator.vibrate(20);
  };
  if(isTouch){
    /* 长按 0.3s 后浮起 + 触发开始 */
    longPressed=false;
    timer=setTimeout(()=>{longPressed=true;begin();},300);
  }
  const move=ev=>{
    const p=ev.touches?ev.touches[0]:ev;
    if(!started){
      const dist=Math.hypot(p.clientX-sx,p.clientY-sy);
      if(isTouch){
        /* 长按未到，滑动距离 >12px 视为滚动取消 */
        if(dist>12){cleanup();return;}
        if(longPressed)begin();
        else return;
      }else{
        /* 鼠标：移动 >6px 即开始 */
        if(dist>6)begin();else return;
      }
    }
    if(ev.cancelable)ev.preventDefault();
    positionGhost(p.clientX,p.clientY);highlight(p.clientX,p.clientY);
  };
  const up=ev=>{
    clearTimeout(timer);
    if(started){
      const p=ev.changedTouches?ev.changedTouches[0]:ev;
      drop(p.clientX,p.clientY);
    }
    cleanup();
  };
  const cleanup=()=>{
    clearTimeout(timer);clearTimeout(edgeTimer);edgeTimer=null;
    ["mousemove","mouseup","touchmove","touchend","touchcancel"].forEach((n,i)=>
      document.removeEventListener(n,[move,up,move,up,up][i]));
    if(ghost){ghost.remove();ghost=null;}
    if(dragSrcEl){dragSrcEl.classList.remove("dragging-source");dragSrcEl=null;}
    if(hoverEl){hoverEl.classList.remove("drop-hover","wk-drop-hot");hoverEl=null;}
    document.body.classList.remove("dragging");dragTaskId=null;draggingStarted=false;
  };
  document.addEventListener("mousemove",move);
  document.addEventListener("mouseup",up);
  document.addEventListener("touchmove",move,{passive:false});
  document.addEventListener("touchend",up);
  document.addEventListener("touchcancel",up);
}
function positionGhost(x,y){
  if(!ghost)return;
  ghost.style.left=(x-40)+"px";
  ghost.style.top=(y-22)+"px";
}
function targetAt(x,y){
  if(ghost)ghost.style.display="none";
  const el=document.elementFromPoint(x,y);
  if(ghost)ghost.style.display="";
  if(!el)return null;
  return el.closest("#doneDrop")||el.closest(".day-cell")||el.closest("#prevWeek")||el.closest("#nextWeek")||el.closest("#poolPanel")||el.closest("#todoBody");
}
function highlight(x,y){
  const t=targetAt(x,y);
  if(hoverEl&&hoverEl!==t){hoverEl.classList.remove("drop-hover","wk-drop-hot");clearTimeout(edgeTimer);edgeTimer=null;}
  hoverEl=t;
  if(!t)return;
  if(t.classList.contains("day-cell")||t.id==="doneDrop")t.classList.add("drop-hover");
  /* 跨周拖拽：悬停在 ‹ › 上 0.6s 自动翻周（拖拽中保持跟随） */
  if((t.id==="prevWeek"||t.id==="nextWeek")&&!edgeTimer){
    t.classList.add("wk-drop-hot");
    edgeTimer=setTimeout(()=>{
      state.weekOffset+=t.id==="nextWeek"?1:-1;
      renderWeek();save();
      /* 翻周后让 ghost 重新定位到屏幕中央（避免定位错乱） */
      positionGhost(x,y);
      toast(t.id==="nextWeek"?"➡️ 已翻到下一周":"⬅️ 已翻到上一周");
      edgeTimer=null;
    },600);
  }
}
function drop(x,y){
  const t=targetAt(x,y);
  const task=state.tasks.find(k=>k.id===dragTaskId);
  if(!t||!task)return;
  if(t.id==="doneDrop"){
    task.done=true;task.abandoned=false;task.completedAt=Date.now();
    toast("🎉 已标记完成！");
  }else if(t.classList&&t.classList.contains("day-cell")){
    /* ✂️ 剪切语义：排到日期后任务从清单池消失，只留在周历上 */
    const targetDate=t.dataset.date;
    task.due=targetDate;task.dueEnd=null;
    toast(`✂️ 已排到 ${md(targetDate)}，并从清单池移出`);
  }else if(t.id==="poolPanel"||t.id==="todoBody"){
    /* 反向剪切：从周历拖回清单池 → 取消排期 */
    if(task.due){
      task.due=null;task.dueEnd=null;task.time=null;
      toast("🫧 已移回清单池（未排期）");
    }
  }
  /* 拖到空白处：不命中任何目标 → 上面已 return，一切保持原样 */
  renderAll();
}

/* ═══════════ 任务弹窗 ═══════════ */
let editingId=null,editSubs=[];
function openTaskModal(id){
  const isNew=!id;
  let t=isNew?null:state.tasks.find(k=>k.id===id);
  editingId=id||null;
  $("#tmTitle").textContent=isNew?"🌸 新建任务":"✏️ 编辑任务";
  $("#mTitle").value=t?t.title:"";
  $("#mNotes").value=t?(t.notes||""):"";
  $("#mDate").value=t?(t.due||""):(state.todoLayer==="plan"&&state.viewMode==="day"?state.dayDate:"");
  $("#mDateEnd").value=t?(t.dueEnd||""):"";
  $("#mTime").value=t?(t.time||""):"";
  $("#mAllDay").checked=t?!!t.allDay:false;
  $("#mPri").value=t&&t.priority!=null?String(t.priority):"";
  $("#mTags").value=t?(t.tags||[]).join(", "):"";
  $("#mDone").checked=t?!!t.done:false;
  $("#mAbandon").checked=t?!!t.abandoned:false;
  editSubs=t?JSON.parse(JSON.stringify(t.subs||[])):[];
  renderSubs();
  const sel=$("#mList");
  const cur=t?t.listId:((state.todoSel&&listOf(state.todoSel))?state.todoSel:(state.poolList!=="all"?state.poolList:null));
  sel.innerHTML=`<option value="">📥 收集箱</option>`+state.lists.map(l=>`<option value="${l.id}" ${l.id===cur?"selected":""}>${l.emoji} ${esc(l.name)}</option>`).join("");
  $("#mDelete").style.display=isNew?"none":"block";
  showModal("taskModal");
}
function renderSubs(){
  const box=$("#mSubs");box.innerHTML="";
  editSubs.forEach(s=>{
    const row=document.createElement("div");
    row.className="subrow"+(s.done?" done":"");
    const cb=document.createElement("input");cb.type="checkbox";cb.checked=s.done;
    cb.addEventListener("change",()=>{s.done=cb.checked;renderSubs();});
    const sp=document.createElement("span");sp.className="st";sp.textContent=s.title;
    const del=document.createElement("button");del.className="del";del.textContent="🗑️";
    del.addEventListener("click",()=>{editSubs=editSubs.filter(x=>x!==s);renderSubs();});
    row.append(cb,sp,del);box.appendChild(row);
  });
}
$("#mSubInput").addEventListener("keydown",e=>{
  if(e.key!=="Enter")return;
  const v=e.target.value.trim();if(!v)return;
  editSubs.push({id:uid(),title:v,done:false});
  e.target.value="";renderSubs();
});
$("#mSave").addEventListener("click",()=>{
  const title=$("#mTitle").value.trim();
  if(!title){toast("标题不能为空哦 ✏️");return;}
  const data={
    title,notes:$("#mNotes").value.trim(),
    due:$("#mDate").value||null,dueEnd:$("#mDateEnd").value||null,
    time:$("#mTime").value||null,allDay:$("#mAllDay").checked,
    listId:$("#mList").value||null,
    priority:$("#mPri").value===""?null:+$("#mPri").value,
    tags:$("#mTags").value.split(/[,，]/).map(s=>s.trim()).filter(Boolean),
    subs:editSubs,done:$("#mDone").checked,abandoned:$("#mAbandon").checked,
  };
  if(data.dueEnd&&(!data.due||data.dueEnd<data.due))data.dueEnd=null;
  if(!data.due){data.time=null;data.dueEnd=null;}
  if(editingId){
    const t=state.tasks.find(k=>k.id===editingId);
    Object.assign(t,data);
    t.completedAt=data.done?(t.completedAt||Date.now()):null;
  }else{
    state.tasks.unshift(Object.assign({id:uid(),createdAt:Date.now(),completedAt:data.done?Date.now():null},data));
  }
  closeModal();renderAll();toast("已保存 ✨");
});
$("#mDelete").addEventListener("click",()=>{
  if(editingId&&confirm("确定删除这个任务吗？")){
    state.tasks=state.tasks.filter(k=>k.id!==editingId);
    closeModal();renderAll();toast("已删除 🗑️");
  }
});
$("#mCancel").addEventListener("click",closeModal);
$("#fabAdd").addEventListener("click",()=>openTaskModal(null));

/* ═══════════ 清单弹窗 ═══════════ */
let pickColor=PALETTE[0];
function buildSwatches(boxSel,onPick){
  const box=$(boxSel);box.innerHTML="";
  PALETTE.forEach(c=>{
    const b=document.createElement("button");
    b.className="swatch";b.style.background=c;
    b.addEventListener("click",()=>{
      $$(boxSel+" .swatch").forEach(x=>x.classList.remove("sel"));
      b.classList.add("sel");onPick(c);
    });
    box.appendChild(b);
  });
  box.firstChild.classList.add("sel");
}
function openListModal(){
  $("#lmName").value="";$("#lmEmoji").value="";
  pickColor=PALETTE[0];
  buildSwatches("#lmColors",c=>pickColor=c);
  showModal("listModal");
}
$("#lmSave").addEventListener("click",()=>{
  const name=$("#lmName").value.trim();
  if(!name){toast("请填写清单名称 ✏️");return;}
  state.lists.push({id:uid(),name,emoji:$("#lmEmoji").value.trim()||"✨",color:pickColor});
  closeModal();renderDrawer();renderAll();toast("清单已创建 🎀");
});
$("#lmCancel").addEventListener("click",closeModal);

/* ═══════════ Tab3 专注 · 番茄钟 ═══════════ */
const RING_LEN=2*Math.PI*96;
let fc={running:false,mode:"focus",left:0,total:0,timer:null};
function focusSecs(){return state.pomo.focusMin*60;}
function renderFocus(){
  const sf=$("#selFocusMin"),sb=$("#selBreakMin");
  if(!sf.options.length){
    [5,10,15,20,25,30,40,45,50,60,90].forEach(m=>sf.add(new Option(m+" 分钟",m)));
    [3,5,10,15,20].forEach(m=>sb.add(new Option(m+" 分钟",m)));
  }
  sf.value=state.pomo.focusMin;sb.value=state.pomo.breakMin;
  $("#noiseToggle").checked=state.pomo.noise;
  const ft=$("#focusTask");
  const cur=ft.value;
  ft.innerHTML=`<option value="">不绑定</option>`+activeTasks().filter(t=>!t.done).slice(0,50).map(t=>`<option value="${t.id}">${esc(t.title.slice(0,20))}</option>`).join("");
  ft.value=cur;
  if(!fc.running&&fc.left===0)setRing(focusSecs(),focusSecs(),"准备专注");
  renderFocusStats();
}
function setRing(left,total,label){
  fc.left=left;fc.total=total;
  const m=Math.floor(left/60),s=left%60;
  $("#focusTime").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  $("#focusState").textContent=label;
  $("#ringFg").style.strokeDasharray=RING_LEN;
  $("#ringFg").style.strokeDashoffset=RING_LEN*(1-(total?left/total:0));
}
function tick(){
  if(fc.left<=0){finishPhase();return;}
  fc.left--;
  setRing(fc.left,fc.total,fc.mode==="focus"?"专注中 🍅":"休息中 ☕");
  if(fc.left<=0)finishPhase();
}
function finishPhase(){
  clearInterval(fc.timer);fc.timer=null;fc.running=false;
  stopNoise();
  if(fc.mode==="focus"){
    const taskId=$("#focusTask").value||null;
    state.pomo.records.push({date:todayStr(),minutes:state.pomo.focusMin,taskId,ts:Date.now()});
    save();notify("🍅 专注完成！","干得漂亮，休息一下吧～");
    toast("🎉 完成一个番茄！+"+state.pomo.focusMin+"分钟");
    fc.mode="break";
    setRing(state.pomo.breakMin*60,state.pomo.breakMin*60,"该休息啦 ☕");
    $("#focusStart").textContent="▶️ 开始休息";
  }else{
    notify("☕ 休息结束","开始下一个番茄吧！");
    fc.mode="focus";
    setRing(focusSecs(),focusSecs(),"准备专注");
    $("#focusStart").textContent="▶️ 开始专注";
  }
  renderFocusStats();
}
$("#focusStart").addEventListener("click",()=>{
  if(fc.running){
    clearInterval(fc.timer);fc.timer=null;fc.running=false;stopNoise();
    $("#focusStart").textContent="▶️ 继续";
    $("#focusState").textContent="已暂停 ⏸";
  }else{
    if(fc.left<=0){fc.mode="focus";setRing(focusSecs(),focusSecs(),"");}
    fc.running=true;
    fc.timer=setInterval(tick,1000);
    $("#focusStart").textContent="⏸ 暂停";
    $("#focusState").textContent=fc.mode==="focus"?"专注中 🍅":"休息中 ☕";
    if(fc.mode==="focus"&&state.pomo.noise)startNoise();
  }
});
$("#focusReset").addEventListener("click",()=>{
  clearInterval(fc.timer);fc.timer=null;fc.running=false;fc.mode="focus";stopNoise();
  setRing(focusSecs(),focusSecs(),"准备专注");
  $("#focusStart").textContent="▶️ 开始专注";
});
$("#selFocusMin").addEventListener("change",e=>{state.pomo.focusMin=+e.target.value;save();if(!fc.running&&fc.mode==="focus")setRing(focusSecs(),focusSecs(),"准备专注");});
$("#selBreakMin").addEventListener("change",e=>{state.pomo.breakMin=+e.target.value;save();});
$("#noiseToggle").addEventListener("change",e=>{state.pomo.noise=e.target.checked;save();if(!e.target.checked)stopNoise();else if(fc.running&&fc.mode==="focus")startNoise();});
function renderFocusStats(){
  const today=state.pomo.records.filter(r=>r.date===todayStr());
  $("#focusTodayStats").innerHTML=
    `<div class="scard"><b>${today.length}</b><span>今日番茄 🍅</span></div>`+
    `<div class="scard"><b>${today.reduce((s,r)=>s+r.minutes,0)}</b><span>今日专注分钟 ⏱️</span></div>`+
    `<div class="scard"><b>${state.pomo.records.length}</b><span>累计番茄 🏆</span></div>`;
}
/* 白噪音（WebAudio 粉噪声，离线可用） */
let audioCtx=null,noiseNode=null,noiseGain=null;
function startNoise(){
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(noiseNode)return;
    const len=audioCtx.sampleRate*2;
    const buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
    const data=buf.getChannelData(0);
    let b0=0,b1=0,b2=0;
    for(let i=0;i<len;i++){
      const w=Math.random()*2-1;
      b0=0.997*b0+0.03*w;b1=0.985*b1+0.06*w;b2=0.95*b2+0.1*w;
      data[i]=(b0+b1+b2+w*0.05)*0.35;
    }
    noiseNode=audioCtx.createBufferSource();
    noiseNode.buffer=buf;noiseNode.loop=true;
    noiseGain=audioCtx.createGain();noiseGain.gain.value=0.18;
    noiseNode.connect(noiseGain).connect(audioCtx.destination);
    noiseNode.start();
  }catch(e){console.warn(e);}
}
function stopNoise(){if(noiseNode){try{noiseNode.stop();}catch(e){}noiseNode=null;}}
function notify(title,body){
  if("Notification" in window&&Notification.permission==="granted")try{new Notification(title,{body});}catch(e){}
}

/* ═══════════ Tab4 打卡 ═══════════ */
let habitTab="main";
$("#hbTab1").addEventListener("click",()=>{habitTab="main";renderHabit();});
$("#hbTab2").addEventListener("click",()=>{habitTab="history";renderHabit();});
function streakOf(h){
  let n=0,d=todayStr();
  if(!h.checks[d]){d=addDays(d,-1);}
  while(h.checks[d]){n++;d=addDays(d,-1);}
  return n;
}
function renderHabit(){
  $("#hbTab1").classList.toggle("active",habitTab==="main");
  $("#hbTab2").classList.toggle("active",habitTab==="history");
  $("#habitMain").hidden=habitTab!=="main";
  $("#habitHistory").hidden=habitTab!=="history";
  if(habitTab==="main"){renderHabitHeatmap();renderHabitList();}
  else renderHabitHistory();
}
function monthDays(offset){
  const now=new Date();
  const base=new Date(now.getFullYear(),now.getMonth()+offset,1);
  const first=new Date(base);first.setDate(1-((base.getDay()+6)%7));
  return {base,cells:Array.from({length:42},(_,i)=>{const d=new Date(first);d.setDate(first.getDate()+i);return d;})};
}
function renderHabitHeatmap(){
  const box=$("#habitHeatmap");box.innerHTML="";
  DAY_NAMES.forEach(n=>{const h=document.createElement("div");h.className="hm-head";h.textContent=n.slice(1);box.appendChild(h);});
  const {base,cells}=monthDays(0);
  const total=state.habits.length||1;
  cells.forEach(d=>{
    const ds=fmtDate(d);
    const checked=state.habits.filter(h=>h.checks[ds]);
    const ratio=checked.length/total;
    let lvl="";
    if(checked.length>0)lvl=ratio>=.67?" l3":ratio>=.34?" l2":" l1";
    const cell=document.createElement("div");
    cell.className="hm-cell"+(d.getMonth()!==base.getMonth()?" out":"")+lvl;
    cell.innerHTML=`<span class="hm-d">${d.getDate()}</span>`;
    if(checked.length){
      const dots=document.createElement("div");dots.className="hm-dots";
      checked.forEach(h=>{const dt=document.createElement("span");dt.className="hm-dot";dt.style.background=h.color;dots.appendChild(dt);});
      cell.appendChild(dots);
    }
    cell.addEventListener("click",()=>{
      const names=checked.map(h=>h.emoji+h.name);
      toast(names.length?`${md(ds)} 已打卡：${names.join("、")}`:`${md(ds)} 这天还没有打卡记录`);
    });
    box.appendChild(cell);
  });
}
function renderHabitList(){
  const box=$("#habitList");box.innerHTML="";
  state.habits.forEach(h=>{
    const total=Object.keys(h.checks).length;
    const streak=streakOf(h);
    const now=new Date();
    const daysSoFar=now.getDate();
    const monthCnt=Object.keys(h.checks).filter(ds=>ds.startsWith(fmtDate(now).slice(0,7))).length;
    const pct=Math.min(100,Math.round(monthCnt/daysSoFar*100));
    const card=document.createElement("div");card.className="hcard";
    card.innerHTML=`<div class="hico" style="background:${h.color}33">${h.emoji}</div>
      <div class="hbody"><div class="hname">${esc(h.name)}</div>
      <div class="hmeta">累计 ${total} 次 · 连续 ${streak} 天 🔥 · 本月完成率 ${pct}%</div>
      <div class="hbar"><i style="width:${pct}%;background:${h.color}"></i></div></div>`;
    const chk=document.createElement("button");
    const on=!!h.checks[todayStr()];
    chk.className="hchk"+(on?" on":"");
    chk.setAttribute("aria-label",on?"已打卡":"打卡");
    chk.addEventListener("click",()=>{
      if(h.checks[todayStr()])delete h.checks[todayStr()];
      else{h.checks[todayStr()]=1;toast("打卡成功 ✅ 连续 "+(streakOf(h))+" 天！");if(navigator.vibrate)navigator.vibrate(15);}
      renderHabit();save();
    });
    card.appendChild(chk);
    card.addEventListener("contextmenu",e=>{e.preventDefault();delHabit(h.id);});
    let tm;
    card.addEventListener("touchstart",e=>{if(e.target===chk)return;tm=setTimeout(()=>delHabit(h.id),700);},{passive:true});
    card.addEventListener("touchend",()=>clearTimeout(tm));
    card.addEventListener("touchmove",()=>clearTimeout(tm));
    box.appendChild(card);
  });
  const add=document.createElement("button");
  add.className="drawer-add";add.textContent="➕ 新增习惯";
  add.addEventListener("click",openHabitModal);
  box.appendChild(add);
}
function delHabit(id){
  const h=state.habits.find(x=>x.id===id);if(!h)return;
  if(confirm(`删除习惯「${h.name}」及其全部打卡记录？`)){
    state.habits=state.habits.filter(x=>x.id!==id);
    renderHabit();save();
  }
}
function renderHabitHistory(){
  const box=$("#habitHistory");box.innerHTML="";
  const year=new Date().getFullYear();
  const panel=document.createElement("div");panel.className="panel";
  panel.innerHTML=`<h3 class="ptt">📆 ${year} 年度打卡热力图（全部习惯）</h3>`;
  const hm=document.createElement("div");hm.className="year-hm";
  const start=new Date(year,0,1);
  for(let i=0;i<364;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const ds=fmtDate(d);
    const cnt=state.habits.reduce((s,h)=>s+(h.checks[ds]?1:0),0);
    const cell=document.createElement("i");
    if(cnt>=3)cell.className="l3";else if(cnt===2)cell.className="l2";else if(cnt===1)cell.className="l1";
    cell.title=ds+" · "+cnt+"次";
    hm.appendChild(cell);
  }
  panel.appendChild(hm);
  box.appendChild(panel);
  /* 周/月报表 */
  const wk=weekDates(0).map(fmtDate);
  const wkCnt=wk.reduce((s,ds)=>s+state.habits.reduce((x,h)=>x+(h.checks[ds]?1:0),0),0);
  const mPrefix=todayStr().slice(0,7);
  const moCnt=state.habits.reduce((s,h)=>s+Object.keys(h.checks).filter(ds=>ds.startsWith(mPrefix)).length,0);
  const yCnt=state.habits.reduce((s,h)=>s+Object.keys(h.checks).filter(ds=>ds.startsWith(String(year))).length,0);
  const sum=document.createElement("div");sum.className="stat-cards";sum.style.marginTop="12px";
  sum.innerHTML=`<div class="scard"><b>${wkCnt}</b><span>本周打卡 📅</span></div>
    <div class="scard"><b>${moCnt}</b><span>本月打卡 🗓️</span></div>
    <div class="scard"><b>${yCnt}</b><span>年度打卡 🏆</span></div>`;
  box.appendChild(sum);
}
let habitColor=PALETTE[3];
function openHabitModal(){
  $("#hmName").value="";$("#hmEmoji").value="";
  habitColor=PALETTE[3];
  buildSwatches("#hmColors",c=>habitColor=c);
  showModal("habitModal");
}
$("#hmSave").addEventListener("click",()=>{
  const name=$("#hmName").value.trim();
  if(!name){toast("请填写习惯名称 ✏️");return;}
  state.habits.push({id:uid(),name,emoji:$("#hmEmoji").value.trim()||"🌱",color:habitColor,checks:{},createdAt:Date.now()});
  closeModal();renderHabit();save();toast("习惯已创建 🌱");
});
$("#hmCancel").addEventListener("click",closeModal);

/* ── Canvas 图表（无依赖，离线可用） ── */
function prepCv(cv){
  const dpr=window.devicePixelRatio||1;
  const w=cv.clientWidth||cv.parentElement.clientWidth||320;
  const h=+cv.getAttribute("height")||190;
  cv.width=w*dpr;cv.height=h*dpr;cv.style.height=h+"px";
  const ctx=cv.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  return {ctx,w,h};
}
function drawDonut(cv,data){
  const {ctx,w,h}=prepCv(cv);
  const total=data.reduce((s,d)=>s+d.value,0);
  const cx=w/2,cy=h/2,R=Math.min(w,h)/2-14,r=R*0.62;
  if(!total){ctx.fillStyle="#8E8E93";ctx.font="13px sans-serif";ctx.textAlign="center";ctx.fillText("暂无数据",cx,cy);return;}
  let a=-Math.PI/2;
  data.forEach(d=>{
    const ang=d.value/total*2*Math.PI;
    ctx.beginPath();ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,R,a,a+ang);ctx.closePath();
    ctx.fillStyle=d.color;ctx.fill();
    a+=ang;
  });
  ctx.globalCompositeOperation="destination-out";
  ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();
  ctx.globalCompositeOperation="source-over";
  ctx.fillStyle="#1C1C1E";ctx.font="600 20px sans-serif";ctx.textAlign="center";
  ctx.fillText(total+"",cx,cy+2);
  ctx.fillStyle="#8E8E93";ctx.font="11px sans-serif";
  ctx.fillText("已完成",cx,cy+18);
}
function drawBars(cv,labels,vals,color){
  const {ctx,w,h}=prepCv(cv);
  const max=Math.max(...vals,1);
  const pad=26,bw=(w-pad*2)/vals.length;
  ctx.font="10px sans-serif";ctx.textAlign="center";
  vals.forEach((v,i)=>{
    const bh=(h-46)*(v/max);
    const x=pad+i*bw+bw*0.2,y=h-26-bh;
    ctx.fillStyle=color+"CC";
    roundRect(ctx,x,y,bw*0.6,Math.max(bh,2),4);ctx.fill();
    ctx.fillStyle="#8E8E93";
    if(labels.length<=16||i%Math.ceil(labels.length/16)===0)ctx.fillText(String(labels[i]),pad+i*bw+bw/2,h-10);
    if(v>0&&labels.length<=16){ctx.fillStyle="#1C1C1E";ctx.fillText(String(v),pad+i*bw+bw/2,y-4);}
  });
}
function drawLine(cv,labels,a,b){
  const {ctx,w,h}=prepCv(cv);
  const max=Math.max(...a,...b,1);
  const pad=26,step=(w-pad*2)/Math.max(labels.length-1,1);
  const py=v=>h-26-(h-52)*(v/max);
  const plot=(arr,color,fill)=>{
    ctx.beginPath();
    arr.forEach((v,i)=>{const x=pad+i*step,y=py(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin="round";ctx.stroke();
    if(fill){ctx.lineTo(pad+(arr.length-1)*step,h-26);ctx.lineTo(pad,h-26);ctx.closePath();ctx.fillStyle=color+"22";ctx.fill();}
    arr.forEach((v,i)=>{ctx.beginPath();ctx.arc(pad+i*step,py(v),3,0,7);ctx.fillStyle=color;ctx.fill();});
  };
  plot(b,"#B5B0A9",false);
  plot(a,"#71b7ed",true);
  ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillStyle="#8E8E93";
  labels.forEach((l,i)=>{if(labels.length<=16||i%Math.ceil(labels.length/16)===0)ctx.fillText(String(l),pad+i*step,h-10);});
  ctx.textAlign="left";
  ctx.fillStyle="#71b7ed";ctx.fillRect(pad,6,9,9);ctx.fillStyle="#1C1C1E";ctx.fillText("完成",pad+13,14);
  ctx.fillStyle="#8E8E93";ctx.fillRect(pad+52,6,9,9);ctx.fillStyle="#1C1C1E";ctx.fillText("计划",pad+65,14);
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,0);
  ctx.arcTo(x,y+h,x,y,0);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

/* ═══════════ Tab4 复盘（视图 + 统计 合并） ═══════════ */
$$("#revDims button").forEach(b=>b.addEventListener("click",()=>{state.reviewDim=b.dataset.d;renderReview();save();}));
function revRange(){
  const dim=state.reviewDim,now=new Date();
  if(dim==="day"){const ds=todayStr();return {dates:[ds],label:`${now.getMonth()+1}月${now.getDate()}日 ${DAY_NAMES[(now.getDay()+6)%7]} · 今天`,isDay:true,isYear:false};}
  if(dim==="week"){const ds=weekDates(0).map(fmtDate);return {dates:ds,label:`${ds[0].slice(5).replace("-","/")} – ${ds[6].slice(5).replace("-","/")} 本周`,isDay:false,isYear:false};}
  if(dim==="month"){const y=now.getFullYear(),m=now.getMonth();const n=new Date(y,m+1,0).getDate();const ds=[];for(let i=1;i<=n;i++)ds.push(fmtDate(new Date(y,m,i)));return {dates:ds,label:`${y}年${m+1}月`,isDay:false,isYear:false};}
  const y=now.getFullYear();const ds=[];for(let m=0;m<12;m++)ds.push(`${y}-${String(m+1).padStart(2,"0")}`);return {dates:ds,label:`${y}年`,isDay:false,isYear:true};
}
function revRangeShifted(dim){
  const now=new Date();
  if(dim==="day")return [addDays(todayStr(),-1)];
  if(dim==="week")return weekDates(-1).map(fmtDate);
  if(dim==="month"){const y=now.getFullYear(),m=now.getMonth()-1;const n=new Date(y,m+1,0).getDate();const out=[];for(let i=1;i<=n;i++)out.push(fmtDate(new Date(y,m,i)));return out;}
  const y=now.getFullYear()-1;const out=[];for(let m=0;m<12;m++)out.push(`${y}-${String(m+1).padStart(2,"0")}`);return out;
}
function rateOf(dates,isYear){const inR=ds=>ds&&(isYear?dates.includes(ds.slice(0,7)):dates.includes(ds));const p=state.tasks.filter(t=>!t.abandoned&&inR(t.due));return p.length?Math.round(p.filter(t=>t.done).length/p.length*100):null;}
function renderReview(){
  $$("#revDims button").forEach(b=>b.classList.toggle("active",b.dataset.d===state.reviewDim));
  const {dates,label,isDay,isYear}=revRange();
  $("#revRangeLabel").textContent=label;
  const inRange=ds=>ds&&(isYear?dates.includes(ds.slice(0,7)):dates.includes(ds));
  const planned=state.tasks.filter(t=>!t.abandoned&&inRange(t.due));
  const doneT=planned.filter(t=>t.done);
  const rate=planned.length?Math.round(doneT.length/planned.length*100):0;
  const recs=state.pomo.records.filter(r=>isYear?dates.includes(r.date.slice(0,7)):dates.includes(r.date));
  const focusMin=recs.reduce((s,r)=>s+r.minutes,0);
  let habitDays=0;dates.forEach(ds=>{if(state.habits.some(h=>h.checks[ds]))habitDays++;});
  const prevRate=rateOf(revRangeShifted(state.reviewDim),isYear);
  const trend=(prevRate==null)?"":(rate>prevRate?` ↑${rate-prevRate}%`:rate<prevRate?` ↓${prevRate-rate}%`:" 持平");
  $("#revSummary").innerHTML=
    `<div class="scard"><b>${doneT.length}</b><span>完成任务 ✅</span></div>`+
    `<div class="scard"><b>${Math.round(focusMin/6)/10}</b><span>专注小时 ⏱️</span></div>`+
    `<div class="scard"><b>${habitDays}</b><span>打卡天数 📅</span></div>`+
    `<div class="scard"><b>${rate}%</b><span>完成率 🎯${trend}</span></div>`;
  /* 环形：清单完成分布 */
  const groups=[];const push=(l,c,n)=>{if(n>0)groups.push({label:l,color:c,value:n});};
  push("收集箱","#8E8E93",doneT.filter(t=>!t.listId).length);
  state.lists.forEach(l=>push(l.emoji+l.name,l.color,doneT.filter(t=>t.listId===l.id).length));
  drawDonut($("#revDonut"),groups);
  $("#revDonutLegend").innerHTML=groups.length?groups.map(g=>`<span><i style="background:${g.color}"></i>${esc(g.label)} ${g.value}</span>`).join(""):"<span>暂无已完成任务</span>";
  /* 折线：完成 vs 计划 */
  const labels=isYear?dates.map(m=>+m.slice(5)+"月"):dates.map(ds=>isDay?ds.slice(5).replace("-","/"):+ds.slice(8)+"");
  const planS=dates.map(k=>state.tasks.filter(t=>!t.abandoned&&t.due&&(isYear?t.due.slice(0,7)===k:t.due===k)).length);
  const doneS=dates.map(k=>state.tasks.filter(t=>t.done&&!t.abandoned&&t.due&&(isYear?t.due.slice(0,7)===k:t.due===k)).length);
  drawLine($("#revLine"),labels,doneS,planS);
  /* 温柔的夸夸 & 改进 */
  buildPraise({planned,doneT,rate,focusMin,habitDays,prevRate,dates,isYear,isDay});
  buildImprove({planned,doneT,rate,focusMin,habitDays,dates,isYear,isDay});
  renderRevCal();
  save();
}
function buildPraise(o){
  const msgs=[];
  if(o.prevRate!=null&&o.rate>o.prevRate)msgs.push(`完成率比上一周期提升了 <b>${o.rate-o.prevRate}%</b>，稳步推进 🌿`);
  if(o.rate===100&&o.planned.length>0)msgs.push(`本周期 <b>${o.planned.length}</b> 项任务全部清空，超有执行力 🎉`);
  if(o.focusMin>=120)msgs.push(`专注总时长达到 <b>${Math.round(o.focusMin/6)/10} 小时</b>，心流状态在线 🍅`);
  else if(o.focusMin>0)msgs.push(`完成了 <b>${o.focusMin}</b> 分钟专注，慢慢来也很好 🌸`);
  let maxStreak=0;state.habits.forEach(h=>{const s=streakOf(h);if(s>maxStreak)maxStreak=s;});
  if(maxStreak>=7)msgs.push(`连续打卡最长 <b>${maxStreak}</b> 天，习惯正在长出来 🌟`);
  else if(o.habitDays>0)msgs.push(`本周期打卡 <b>${o.habitDays}</b> 天，坚持本身就是进步 💛`);
  if(!msgs.length)msgs.push("这一周期也许节奏慢了些，但你在认真生活，这就很棒 🌷");
  $("#revPraise").innerHTML=`<h3 class="ptt">🌟 夸夸你</h3>`+msgs.map(m=>`<p class="pp">${m}</p>`).join("");
}
function buildImprove(o){
  const tips=[];
  if(o.planned.length>0&&o.rate<70){
    /* 找出完成率最低的一天（周/月维度） */
    let worst=null,worstRate=101;
    o.dates.forEach(ds=>{
      const day=state.tasks.filter(t=>!t.abandoned&&t.due===ds);
      if(day.length){const r=Math.round(day.filter(t=>t.done).length/day.length*100);if(r<worstRate){worstRate=r;worst=ds;}}
    });
    if(worst)tips.push(`<b>${md(worst)}</b> 完成率只有 ${worstRate}%，也许是任务排太满啦——下次试着把大任务拆小一点 🧩`);
  }
  if(o.focusMin<60&&!o.isDay)tips.push("专注时长还可以再暖一点，每天锁定一个 25 分钟番茄，慢慢就养成了 🍅");
  /* 找积压最多的清单 */
  let top=null,topN=0;
  state.lists.forEach(l=>{const n=state.tasks.filter(t=>t.listId===l.id&&!t.done&&!t.abandoned&&!t.due).length;if(n>topN){topN=n;top=l;}});
  if(top&&topN>=3)tips.push(`「${esc(top.name)}」里有 <b>${topN}</b> 条还没排进日程，挑 1–2 条先拖到周历上吧 📌`);
  if(!tips.length)tips.push("目前节奏很舒服，保持住就好，不需要给自己加压 🍃");
  $("#revImprove").innerHTML=`<h3 class="ptt">💡 可以更好</h3>`+tips.map(t=>`<p class="pp">${t}</p>`).join("");
}
function renderRevCal(){
  const box=$("#revCal");box.innerHTML="";
  DAY_NAMES.forEach(n=>{const h=document.createElement("div");h.className="hm-head";h.textContent=n.slice(1);box.appendChild(h);});
  const {base,cells}=monthDays(0);
  cells.forEach(d=>{
    const ds=fmtDate(d);
    const day=state.tasks.filter(t=>!t.abandoned&&t.due===ds);
    const r=day.length?day.filter(t=>t.done).length/day.length:0;
    const cell=document.createElement("div");
    let bg="var(--bg-soft)";
    if(day.length){bg=r>=.67?"var(--accent)":r>=.34?"color-mix(in srgb,var(--accent) 55%,var(--bg-soft))":"color-mix(in srgb,var(--accent) 28%,var(--bg-soft))";}
    cell.className="hm-cell"+(d.getMonth()!==base.getMonth()?" out":"");
    cell.style.background=bg;
    cell.innerHTML=`<span class="hm-d">${d.getDate()}</span>`;
    cell.addEventListener("click",()=>toast(day.length?`${md(ds)}：${day.filter(t=>t.done).length}/${day.length} 完成`:`${md(ds)} 无安排`));
    box.appendChild(cell);
  });
}

/* ═══════════ Tab5 设置 · 主题配色 ═══════════ */
const THEMES={
  princess:{name:"公主色系",colors:["#FFB3C6","#FFD6E0","#FFF5F7"]},
  flower:{name:"花束色系",colors:["#F2B56F","#FFE0D6","#FFF8F0"]},
  morandi:{name:"莫兰迪色系",colors:["#B8AEAB","#D5CFC5","#F5F0EB"]},
  macaron:{name:"马卡龙色系",colors:["#6FC2A8","#D9EEFF","#FFFDF5"]},
};
function applyTheme(t){
  document.body.dataset.theme=t;
  const meta=document.querySelector('meta[name=theme-color]');
  const bar=getComputedStyle(document.body).getPropertyValue("--bar").trim();
  if(meta&&bar)meta.setAttribute("content",bar);
  renderThemePreview(t);
}
function renderThemePreview(t){
  const box=$("#themePreview");if(!box)return;
  const th=THEMES[t]||THEMES.morandi;
  box.innerHTML=th.colors.map(c=>`<span class="pv" style="background:${c}"></span>`).join("")+`<span class="pv-name">${th.name}</span>`;
}
function renderSettings(){
  $$("#themeList .theme-item").forEach(b=>b.classList.toggle("sel",b.dataset.t===state.settings.theme));
  renderThemePreview(state.settings.theme);
}
$$("#themeList .theme-item").forEach(b=>b.addEventListener("click",()=>{
  state.settings.theme=b.dataset.t;applyTheme(b.dataset.t);renderSettings();save();toast("主题已切换 🎨");
}));
$("#setNotify").addEventListener("click",async()=>{
  if(!("Notification" in window)){toast("此浏览器不支持通知");return;}
  const p=await Notification.requestPermission();
  toast(p==="granted"?"通知已开启 🔔":"未授权通知");
});
/* 提醒轮询（应用打开时） */
let lastRemind={};
setInterval(()=>{
  const now=new Date();
  const hm=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
  state.tasks.forEach(t=>{
    if(t.done||t.abandoned||!t.due||!t.time)return;
    if(t.due===todayStr()&&t.time===hm&&lastRemind[t.id]!==t.due+hm){
      lastRemind[t.id]=t.due+hm;
      notify("⏰ 任务提醒",t.title);
      toast("⏰ 到时间了："+t.title);
    }
  });
},30000);

/* 备份导出/恢复 */
function doExport(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`GoalDay备份-${todayStr()}.json`;
  a.click();URL.revokeObjectURL(a.href);
  toast("💾 已导出，保存到 iCloud云盘 即可跨设备同步");
}
$("#setExport").addEventListener("click",doExport);
$("#setImport").addEventListener("click",()=>$("#jsonFile").click());
$("#jsonFile").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const data=JSON.parse(String(r.result));
      if(!data.tasks||!data.lists)throw 0;
      if(confirm("恢复备份将覆盖当前数据，继续吗？")){
        state=Object.assign(defaultState(),data);
        document.body.dataset.theme=state.settings.theme;
        renderAll();toast("📂 备份已恢复 ✨");
      }
    }catch{toast("⚠️ 文件格式不正确");}
  };
  r.readAsText(f);e.target.value="";
});
/* ICS 导入 */
$("#setIcs").addEventListener("click",()=>$("#icsFile").click());
$("#icsFile").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    const evs=parseICS(String(r.result));
    let n=0;
    evs.forEach(ev=>{
      if(!state.events.some(x=>x.date===ev.date&&x.title===ev.title&&x.time===ev.time)){state.events.push(ev);n++;}
    });
    save();renderAll();
    toast(n?`📅 已导入 ${n} 条日历事件（只读）`:"没有发现新的日历事件");
  };
  r.readAsText(f);e.target.value="";
});
$("#setClearIcs").addEventListener("click",()=>{
  if(state.events.length&&confirm(`清空已导入的 ${state.events.length} 条日历事件？（不影响任务）`)){
    state.events=[];save();renderAll();toast("已清空导入的日历 🧹");
  }else if(!state.events.length)toast("目前没有导入的日历事件");
});
function parseICS(text){
  const lines=text.replace(/\r/g,"").split("\n");
  const un=[];
  for(const l of lines){
    if(/^[ \t]/.test(l)&&un.length)un[un.length-1]+=l.slice(1);
    else un.push(l);
  }
  const evs=[];let cur=null;
  for(const l of un){
    if(l.startsWith("BEGIN:VEVENT"))cur={};
    else if(l.startsWith("END:VEVENT")){if(cur&&cur.date&&cur.title)evs.push({id:uid(),...cur});cur=null;}
    else if(cur){
      if(/^SUMMARY/i.test(l))cur.title=l.split(":").slice(1).join(":").replace(/\\,/g,",").trim();
      else if(/^DTSTART/i.test(l)){
        const v=l.split(":").pop();
        const m=v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
        if(m){cur.date=`${m[1]}-${m[2]}-${m[3]}`;if(m[4])cur.time=`${m[4]}:${m[5]}`;}
      }
    }
  }
  return evs;
}

/* ═══════════ 弹窗通用 ═══════════ */
function showModal(id){
  $("#mask").classList.add("show");
  $$(".modal").forEach(m=>m.classList.remove("show"));
  $("#"+id).classList.add("show");
}
function closeModal(){
  $("#mask").classList.remove("show");
  $$(".modal").forEach(m=>m.classList.remove("show"));
  editingId=null;
}
$("#mask").addEventListener("click",e=>{if(e.target===$("#mask"))closeModal();});

/* ═══════════ PWA & 启动 ═══════════ */
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
applyTheme(state.settings.theme||"morandi");
initSplitter();
switchTab(state.activeTab||"todo");
if(toastLater)setTimeout(()=>toast(toastLater),600);
window.addEventListener("resize",()=>{if(state.activeTab==="review")renderReview();});
