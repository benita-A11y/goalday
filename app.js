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
  const l1=uid(),l2=uid(),l3=uid(),l4=uid();
  return {
    version:2,
    lists:[
      {id:l1,name:"工作",emoji:"💼",color:"#71b7ed"},
      {id:l2,name:"个人成长",emoji:"🌱",color:"#84c3b7"},
      {id:l3,name:"健康养生",emoji:"🍵",color:"#f2b56f"},
      {id:l4,name:"学习",emoji:"📚",color:"#b8aeeb"},
    ],
    tasks:[
      {id:uid(),listId:null,title:"👋 欢迎使用 GoalDay！点我编辑",notes:"我在收集箱里～长按可拖到周历排程",due:null,dueEnd:null,time:null,allDay:false,done:false,abandoned:false,tags:["上手指南"],priority:1,subs:[{id:uid(),title:"去「视图」看看双栏周计划",done:false},{id:uid(),title:"试试番茄钟和打卡",done:false}],createdAt:Date.now(),completedAt:null},
      {id:uid(),listId:l1,title:"📝 填截止日期会自动进周历",notes:"",due:todayStr(),dueEnd:null,time:"18:00",allDay:false,done:false,abandoned:false,tags:[],priority:0,subs:[],createdAt:Date.now(),completedAt:null},
    ],
    events:[], goals:{},
    weekOffset:0, weekView:"simple", viewMode:"week", poolList:"all", splitLeft:null,
    todoLayer:"inbox", todoSel:"inbox",
    reviewDim:"week",
    dayDate:todayStr(), monthOffset:0,
    habits:[
      {id:uid(),name:"早起喝水",emoji:"💧",color:"#88d8db",checks:{},createdAt:Date.now()},
      {id:uid(),name:"阅读30分钟",emoji:"📖",color:"#b8aeeb",checks:{},createdAt:Date.now()},
    ],
    pomo:{focusMin:25,breakMin:5,noise:false,records:[]},
    settings:{theme:"morandi",accent:null},
    activeTab:"todo",
    /* v10：新功能数据 */
    revMode:"data",
    moods:{},
    palette:{favs:[],colors:[],lastInspire:null},
    inspirations:[
      {id:uid(),text:"今天下午3点开会",img:null,createdAt:Date.now(),status:"inbox",deletedAt:null},
      {id:uid(),text:"周末买一束花放书房",img:null,createdAt:Date.now(),status:"inbox",deletedAt:null},
      {id:uid(),text:"下个月旅行记得带充电器",img:null,createdAt:Date.now(),status:"inbox",deletedAt:null},
    ],
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
      if(!st.todoLayer)st.todoLayer="inbox";
      if(!st.reviewDim)st.reviewDim="week";
      if(!st.revMode)st.revMode="data";
      if(!st.moods)st.moods={};
      if(!st.palette)st.palette={favs:[],colors:[],lastInspire:null};
      if(!st.inspirations)st.inspirations=[];
      if(!st.annual)st.annual={};
      if(st.settings&&st.settings.accent===undefined)st.settings.accent=null;
      /* v11：灵感数据归一化（旧 {text,img,color} → 新 {status} 模型） */
      st.inspirations=(st.inspirations||[]).map(n=>({
        id:n.id||uid(),text:n.text||"",img:n.img||null,
        createdAt:n.createdAt||Date.now(),
        status:(n.status==="trash"||n.status==="categorized")?n.status:"inbox",
        deletedAt:n.deletedAt||null,
      }));
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

/* ───────── 通用 ───────── */
function esc(s){const d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}
/* 非苹果设备用 Twemoji 替换原生 emoji（苹果设备保留系统原生）；自包含，避免初始化依赖 plus.js */
function applyEmoji(){
  if(/Mac|iPhone|iPad|iPod/.test(navigator.platform||navigator.userAgent||""))return;
  if(window.twemoji&&window.twemoji.parse){try{window.twemoji.parse(document.body,{folder:"svg",base:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/",ext:".svg"});}catch(e){}}
}
function listOf(id){return state.lists.find(l=>l.id===id);}
function colorOf(t){const l=listOf(t.listId);return l?l.color:"#b8aeeb";}
function activeTasks(){return state.tasks.filter(t=>!t.abandoned);}
let toastTimer=null;
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2200);}
/* 写入前先备份上一稳定版本，失败可回滚（防崩溃丢数据） */
function save(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    try{
      const prev=localStorage.getItem(KEY);
      const cur=JSON.stringify(state);
      if(prev)localStorage.setItem(KEY+"~bak",prev);
      localStorage.setItem(KEY,cur);
    }catch(e){
      const bak=localStorage.getItem(KEY+"~bak");
      if(bak){try{localStorage.setItem(KEY,bak);}catch(_){}}
      console.warn("save failed, rolled back",e);
    }
  },150);
}

/* ───────── Tab 切换 ───────── */
const PAGES={todo:"page-todo",habit:"page-habit",focus:"page-focus",review:"page-review",settings:"page-settings"};
function switchTab(tab){
  state.activeTab=tab;
  /* 离开灵感收集箱多选态时清理工具条 */
  inspSel=null;const sb=$("#inspSelBar");if(sb)sb.remove();
  Object.entries(PAGES).forEach(([k,id])=>{
    const el=$("#"+id);if(!el)return;
    const on=k===tab;
    el.classList.toggle("active",on);
    if(on){el.classList.remove("fade-in");void el.offsetWidth;el.classList.add("fade-in");}
  });
  $$("#tabbar button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  const inPlan=(tab==="todo"&&state.todoLayer==="plan");
  /* 右下角悬浮「+」新增按钮已移除：任务新建统一走 灵感→待分类→我的清单 流程 */
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

/* ═══════════ Tab1 待办 · 我的空间（灵感→待分类→周计划→我的清单→回收站） ═══════════ */
let openListId=null;
let inspSel=null;   /* 多选模式：Set<id> 或 null */
let activeInspId=null;   /* 灵感收集箱当前聚焦的圆点条目 id（↑/↓ 导航基准） */
let pendingFocusId=null; /* renderInbox 重建后需要自动聚焦的条目 id */
/* 多行续写：在当前圆点条目内换行（不新建圆点） */
function insertInspLineBreak(txt,n){
  const sel=window.getSelection();
  let range;
  if(sel&&sel.rangeCount){range=sel.getRangeAt(0);range.deleteContents();}
  else{range=document.createRange();range.selectNodeContents(txt);range.collapse(false);}
  const tn=document.createTextNode("\n");
  range.insertNode(tn);
  const after=document.createRange();after.setStartAfter(tn);after.collapse(true);
  sel&&sel.removeAllRanges();sel&&sel.addRange(after);
  if(n)n.text=txt.textContent;save();
}
function placeCaretEnd(el){
  const r=document.createRange();r.selectNodeContents(el);r.collapse(false);
  const s=window.getSelection();s.removeAllRanges();s.addRange(r);
}
/* 聚焦到指定圆点条目末尾，平滑滚动 + 高亮闪烁 */
function focusInspRow(id){
  const row=document.querySelector('#todoBody .insp-row[data-id="'+id+'"]');
  if(!row)return;
  const txt=row.querySelector('.ib-text');if(!txt)return;
  activeInspId=id;
  txt.focus();placeCaretEnd(txt);
  row.scrollIntoView({behavior:'smooth',block:'center'});
  row.classList.add('insp-flash');setTimeout(()=>row.classList.remove('insp-flash'),320);
}
function showKbBar(){const b=$("#kbBar");if(b)b.hidden=false;}
function hideKbBar(){const b=$("#kbBar");if(b)b.hidden=true;}
/* ↓ 下箭头：有下一条则跳转，否则在当前条目下方新建圆点 */
function inspArrowDown(){
  if(!activeInspId)return;
  const rows=[...document.querySelectorAll('#todoBody .insp-row')];
  const idx=rows.findIndex(r=>r.dataset.id===activeInspId);
  if(idx<0)return;
  if(idx<rows.length-1){focusInspRow(rows[idx+1].dataset.id);}
  else{pendingFocusId=addInspAt("",activeInspId);}
}
/* ↑ 上箭头：跳转到上一条圆点 */
function inspArrowUp(){
  if(!activeInspId)return;
  const rows=[...document.querySelectorAll('#todoBody .insp-row')];
  const idx=rows.findIndex(r=>r.dataset.id===activeInspId);
  if(idx>0)focusInspRow(rows[idx-1].dataset.id);
}
function enterPlan(pool){
  state.todoLayer="plan";
  state.poolList=pool||"all";
  closeDrawer();
  renderTodo();
}
function renderDrawer(){
  $("#dvInbox").textContent=state.inspirations.filter(n=>n.status==="inbox").length;
  $("#dvTriage").textContent=state.inspirations.filter(n=>n.status==="inbox").length;
  $("#dvTrash").textContent=state.inspirations.filter(n=>n.status==="trash").length;
  $$("#drawer .ditem[data-tv]").forEach(b=>b.classList.toggle("active",b.dataset.tv===state.todoLayer));
  const ul=$("#userLists");ul.innerHTML="";
  state.lists.forEach(l=>{
    const b=document.createElement("button");
    b.className="ditem"+(state.todoLayer==="lists"&&openListId===l.id?" active":"");
    b.innerHTML=`<span class="dot" style="background:${l.color}"></span><span class="di">${l.emoji}</span>${esc(l.name)}<span class="cnt">${state.tasks.filter(t=>t.listId===l.id&&!t.done&&!t.abandoned).length}</span>`;
    b.addEventListener("click",()=>{state.todoLayer="lists";openListId=l.id;closeDrawer();renderTodo();});
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
    if(openListId===id)openListId=null;
    renderDrawer();renderTodo();save();
  }
}
function openDrawer(){inspSel=null;const sb=$("#inspSelBar");if(sb)sb.remove();renderDrawer();$("#drawer").classList.add("show");$("#drawerMask").classList.add("show");}
function closeDrawer(){$("#drawer").classList.remove("show");$("#drawerMask").classList.remove("show");}
$("#drawerBtn").addEventListener("click",openDrawer);
$("#drawerBtn2").addEventListener("click",openDrawer);
$("#planBack").addEventListener("click",()=>{state.todoLayer="inbox";openListId=null;renderTodo();save();});
$("#drawerMask").addEventListener("click",closeDrawer);
$("#addListBtn").addEventListener("click",()=>{closeDrawer();openListModal();});
$$("#drawer .ditem[data-tv]").forEach(b=>b.addEventListener("click",()=>{
  const tv=b.dataset.tv;
  if(tv==="plan"){state.todoLayer="plan";closeDrawer();renderTodo();return;}
  state.todoLayer=tv;openListId=null;closeDrawer();renderTodo();
}));

function refreshTodo(){renderTodo();renderDrawer();}
/* ── Tab1 主分发：按使用流程切换子视图 ── */
function renderTodo(){
  const home=$("#todoHome"),plan=$("#todoPlan");
  if(state.todoLayer==="plan"){home.hidden=true;plan.hidden=false;renderTodoPlan();}
  else{
    home.hidden=false;plan.hidden=true;
    if(state.todoLayer==="triage")renderTriage();
    else if(state.todoLayer==="lists")renderMyLists();
    else if(state.todoLayer==="trash")renderTrash();
    else{state.todoLayer="inbox";renderInbox();}
  }
}

/* ── 灵感数据助手 ── */
function mkTask(listId,title){
  return {id:uid(),listId:listId||null,title:title,notes:"来自灵感收集箱",due:null,dueEnd:null,time:null,allDay:false,done:false,abandoned:false,tags:[],priority:null,subs:[],createdAt:Date.now(),completedAt:null};
}
function addInsp(text,img){
  const id=uid();
  state.inspirations.push({id:id,text:text||"",img:img||null,createdAt:Date.now(),status:"inbox",deletedAt:null});
  pendingFocusId=id;
  save();renderInbox();
  return id;
}
/* 在指定条目之后插入新圆点（↓ 下箭头用），返回新条目 id */
function addInspAt(text,afterId){
  const id=uid();
  const n={id:id,text:text||"",img:null,createdAt:Date.now(),status:"inbox",deletedAt:null};
  const i=state.inspirations.findIndex(x=>x.id===afterId);
  if(i>=0)state.inspirations.splice(i+1,0,n);else state.inspirations.push(n);
  save();renderInbox();
  return id;
}
/* 转义 + 多行换行（用于待分类/回收站等只读展示） */
function escBr(s){return esc(s||"").replace(/\n/g,"<br>");}
function focusLastInsp(){
  const rows=$$("#todoBody .insp-row .ib-text");
  if(rows.length){const el=rows[rows.length-1];el.focus();document.getSelection().selectAllChildren(el);}
}
function trashInsp(id){const n=state.inspirations.find(x=>x.id===id);if(n){n.status="trash";n.deletedAt=Date.now();save();refreshTodo();toast("已移入回收站 🗑️");}}
function restoreInsp(id){const n=state.inspirations.find(x=>x.id===id);if(n){n.status="inbox";n.deletedAt=null;save();refreshTodo();toast("已恢复到灵感收集箱 📥");}}
function permDeleteInsp(id){state.inspirations=state.inspirations.filter(x=>x.id!==id);save();refreshTodo();toast("已永久删除");}
function purgeTrash(){const cut=Date.now()-30*864e5;state.inspirations=state.inspirations.filter(n=>!(n.status==="trash"&&(n.deletedAt||0)<cut));}
function categorizeInsp(id){
  const n=state.inspirations.find(x=>x.id===id);if(!n)return;
  pickList("归类到清单",val=>{
    state.tasks.unshift(mkTask(val, n.text));
    n.status="categorized";
    save();renderTriage();toast("已归类到清单 ✅");
  });
}
/* 选清单弹层（归类灵感 / 任务用） */
function pickList(title,cb){
  const ov=document.createElement("div");ov.className="mask show";
  ov.innerHTML=`<div class="modal show" style="max-width:420px"><h3>${esc(title)}</h3><div id="pl"></div><div class="modal-btns"><span class="flex1"></span><button id="plCancel">取消</button></div></div>`;
  document.body.appendChild(ov);
  const pl=ov.querySelector("#pl");
  const mk=(label,val,color)=>{const b=document.createElement("button");b.className="set-btn pick-row";b.style.marginBottom="8px";b.innerHTML=`<span class="dot" style="width:10px;height:10px;border-radius:50%;background:${color||'#8A857E'};flex:none"></span><span style="flex:1">${label}</span>`;b.onclick=()=>{ov.remove();cb(val);};pl.appendChild(b);};
  mk("📥 收集箱",null,"#8A857E");
  state.lists.forEach(l=>mk(l.emoji+" "+l.name,l.id,l.color));
  ov.querySelector("#plCancel").onclick=()=>ov.remove();
  ov.addEventListener("click",e=>{if(e.target===ov)ov.remove();});
}

/* ── 滑动手势：左滑 onLeft / 右滑 onRight（行内包含 contenteditable 时跳过） ── */
function enableSwipeRow(el,onLeft,onRight){
  let sx=0,sy=0,tracking=false,decided=null;
  el.addEventListener("pointerdown",e=>{if(e.target.isContentEditable||e.target.closest("button"))return;sx=e.clientX;sy=e.clientY;tracking=true;decided=null;});
  el.addEventListener("pointermove",e=>{if(!tracking)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))decided=dx<0?"L":"R";});
  el.addEventListener("pointerup",()=>{if(!tracking)return;tracking=false;if(decided==="L"&&onLeft)onLeft();else if(decided==="R"&&onRight)onRight();});
  el.addEventListener("pointercancel",()=>{tracking=false;});
}

/* ── 灵感收集箱（默认页 · Apple 圆点速记 升级版） ── */
function renderInbox(){
  $("#todoTitle").textContent="💭 灵感收集箱";
  const body=$("#todoBody");body.innerHTML="";
  const list=state.inspirations.filter(n=>n.status==="inbox");
  const wrap=document.createElement("div");wrap.className="insp-editor";
  if(!list.length)wrap.innerHTML=`<div class="insp-empty">✨ 想到什么就记下来，稍后整理<br><span class="dim">点下方空白处 / 最后一行新增一条 · 左滑删除 · 长按 ○ 批量</span></div>`;
  list.forEach(n=>wrap.appendChild(inspRow(n)));
  body.appendChild(wrap);
  /* 点空白处（含空白提示）新建一行并聚焦 */
  wrap.addEventListener("click",e=>{
    if(inspSel){ if(e.target===wrap||e.target.classList.contains("insp-empty"))exitInspSel(); return; }
    if(e.target===wrap||e.target.classList.contains("insp-empty"))addInsp("");
  });
  /* 底部新增一行（明确可点区域） */
  const add=document.createElement("div");add.className="insp-add";
  add.innerHTML=`<span class="ib-bullet" style="color:var(--ink-3)">○</span><span class="insp-add-input" style="color:var(--ink-3)">新增一条灵感…</span>`;
  add.addEventListener("click",()=>addInsp(""));
  body.appendChild(add);
  renderInspSelBar();
  applyEmoji();
  /* 重建后自动聚焦（↓ 新建 / 底部新增） */
  if(pendingFocusId){
    const id=pendingFocusId;pendingFocusId=null;
    const row=body.querySelector('.insp-row[data-id="'+id+'"]');
    if(row){const t=row.querySelector('.ib-text');if(t){t.focus();placeCaretEnd(t);row.scrollIntoView({block:'center'});}}
  }
}
function inspRow(n){
  const row=document.createElement("div");row.className="insp-row"+(inspSel&&inspSel.has(n.id)?" sel":"");row.dataset.id=n.id;
  const front=document.createElement("div");front.className="insp-front";
  const bullet=document.createElement("button");bullet.className="ib-bullet";bullet.type="button";bullet.textContent="○";bullet.title="选择/批量";
  /* 长按 ○ → 进入多选；轻点 ○ → 选中本条 */
  let bt=null;
  bullet.addEventListener("pointerdown",e=>{e.stopPropagation();bt=setTimeout(()=>{bt=null;enterInspSel(n.id);},450);});
  bullet.addEventListener("pointerup",e=>{e.stopPropagation();if(bt){clearTimeout(bt);bt=null;onInspBullet(n.id);}});
  bullet.addEventListener("pointerleave",()=>{if(bt){clearTimeout(bt);bt=null;}});
  bullet.addEventListener("contextmenu",e=>{e.preventDefault();enterInspSel(n.id);});
  const txt=document.createElement("div");txt.className="ib-text";txt.contentEditable="true";txt.textContent=n.text;
  txt.addEventListener("input",()=>{n.text=txt.textContent;save();});
  txt.addEventListener("focus",()=>{row.classList.add("focus");activeInspId=n.id;showKbBar();});
  txt.addEventListener("blur",()=>{row.classList.remove("focus");setTimeout(()=>{const a=document.activeElement;if(!a||!a.closest||!a.closest("#todoBody .ib-text"))hideKbBar();},180);});
  txt.addEventListener("keydown",e=>{
    /* 回车：仅在当前条目内换行，不新建圆点（Apple 备忘录式交互） */
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();insertInspLineBreak(txt,n);}
    else if(e.key==="Backspace"&&!txt.textContent.trim()){e.preventDefault();delInspRow(n.id);}
  });
  const plus=document.createElement("button");plus.className="ib-add";plus.type="button";plus.textContent="＋";plus.title="添加图片";
  plus.addEventListener("click",e=>{e.stopPropagation();window.__pendingInsp=n.id;$("#inspPhoto").click();});
  const mic=document.createElement("button");mic.className="ib-add ib-mic";mic.type="button";mic.textContent="🎤";mic.title="语音输入";
  mic.addEventListener("click",e=>{e.stopPropagation();startVoice(txt);});
  front.append(bullet,txt,plus,mic);
  if(n.img){const im=document.createElement("img");im.src=n.img;im.className="ib-img";front.appendChild(im);}
  row.appendChild(front);
  enableSwipeReveal(row,{left:{label:"🗑 删除",cls:"ib-del-act",fn:()=>trashInsp(n.id)},right:null});
  if(inspSel){
    row.addEventListener("click",e=>{if(e.target.closest(".ib-act")||e.target.closest("button"))return;e.stopPropagation();toggleInspSel(n.id);});
    row.addEventListener("click",e=>{if(row.classList.contains("sw-open")&&!e.target.closest(".ib-act")){row.classList.remove("sw-open");front.style.transform="";}});
  }
  return row;
}
/* 删除空白行（直接移除，不进回收站） */
function delInspRow(id){
  const i=state.inspirations.findIndex(x=>x.id===id);
  if(i>=0)state.inspirations.splice(i,1);
  save();renderInbox();
}
/* 多选：○ 交互 */
function onInspBullet(id){ if(inspSel){toggleInspSel(id);return;} enterInspSel(id); }
function enterInspSel(id){inspSel=new Set([id]);renderInbox();}
function toggleInspSel(id){ if(!inspSel)inspSel=new Set(); if(inspSel.has(id))inspSel.delete(id);else inspSel.add(id); if(inspSel.size===0)inspSel=null; renderInbox(); }
function exitInspSel(){inspSel=null;renderInbox();}
/* 多选工具条 */
function renderInspSelBar(){
  const old=$("#inspSelBar");if(old)old.remove();
  if(!inspSel||inspSel.size===0)return;
  const bar=document.createElement("div");bar.id="inspSelBar";bar.className="insp-sel-bar";
  bar.innerHTML=`<span class="is-count">已选 ${inspSel.size} 条</span>
    <button class="is-btn is-del">🗑 删除</button>
    <button class="is-btn is-cat">📂 归类</button>
    <button class="is-btn is-mv">📥 移入待分类</button>`;
  bar.querySelector(".is-del").onclick=()=>{
    inspSel.forEach(id=>{const n=state.inspirations.find(x=>x.id===id);if(n){n.status="trash";n.deletedAt=Date.now();}});
    inspSel=null;save();refreshTodo();toast("已移入回收站 🗑️");
  };
  bar.querySelector(".is-cat").onclick=()=>{
    const ids=[...inspSel];
    pickList("归类到清单 · 共 "+ids.length+" 条",val=>{
      ids.forEach(id=>{const n=state.inspirations.find(x=>x.id===id);if(n){state.tasks.unshift(mkTask(val,n.text));n.status="categorized";}});
      inspSel=null;save();renderTriage();toast("已归类 "+ids.length+" 条 ✅");
    });
  };
  bar.querySelector(".is-mv").onclick=()=>{
    inspSel.forEach(id=>{const n=state.inspirations.find(x=>x.id===id);if(n)n.status="inbox";});
    inspSel=null;state.todoLayer="triage";save();renderTodo();toast("已移到待分类 📂");
  };
  document.body.appendChild(bar);
}
/* 语音输入（Web Speech API，离线不可用则提示） */
function startVoice(el){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast("当前浏览器不支持语音输入 🎤");return;}
  try{
    const r=new SR();r.lang="zh-CN";r.interimResults=false;r.continuous=false;
    r.onresult=ev=>{const t=ev.results[0][0].transcript;if(el.textContent&&!/[\s\n]$/.test(el.textContent))el.textContent+=" ";el.textContent+=t;el.dispatchEvent(new Event("input"));};
    r.onerror=()=>toast("语音识别失败，请重试");
    r.onend=()=>toast("🎤 听写结束");
    r.start();toast("🎤 正在听写…");
  }catch(e){toast("语音输入不可用");}
}
/* 左/右滑动揭示操作（带揭示按钮，非立即执行） */
function enableSwipeReveal(row,opts){
  const front=row.querySelector(".insp-front");
  if(opts.left){const a=document.createElement("div");a.className="insp-actions ia-right";const b=document.createElement("button");b.className="ib-act "+opts.left.cls;b.textContent=opts.left.label;b.onclick=()=>opts.left.fn();a.appendChild(b);row.appendChild(a);}
  if(opts.right){const a=document.createElement("div");a.className="insp-actions ia-left";const b=document.createElement("button");b.className="ib-act "+opts.right.cls;b.textContent=opts.right.label;b.onclick=()=>opts.right.fn();a.appendChild(b);row.appendChild(a);}
  let sx=0,sy=0,tracking=false,decided=null,blurred=false;
  front.addEventListener("pointerdown",e=>{
    if(e.target.closest("button"))return;
    sx=e.clientX;sy=e.clientY;tracking=true;decided=null;blurred=false;
    row.classList.remove("sw-open");front.style.transform="";
  });
  front.addEventListener("pointermove",e=>{
    if(!tracking)return;const dx=e.clientX-sx,dy=e.clientY-sy;
    if(decided===null&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){decided=dx<0?"L":"R";if(!blurred){const a=document.activeElement;a&&a.blur&&a.blur();blurred=true;}}
    if(decided==="L"&&opts.left)front.style.transform="translateX("+Math.max(-92,dx)+"px)";
    else if(decided==="R"&&opts.right)front.style.transform="translateX("+Math.min(92,dx)+"px)";
  });
  front.addEventListener("pointerup",()=>{
    if(!tracking)return;tracking=false;
    const m=front.style.transform.match(/-?\d+(\.\d+)?/);const cur=m?parseFloat(m[0]):0;
    if(decided==="L"&&opts.left&&cur<=-46){row.classList.add("sw-open");front.style.transform="translateX(-92px)";}
    else if(decided==="R"&&opts.right&&cur>=46){row.classList.add("sw-open");front.style.transform="translateX(92px)";}
    else front.style.transform="";
  });
  front.addEventListener("pointercancel",()=>{tracking=false;front.style.transform="";});
  row.addEventListener("click",e=>{if(row.classList.contains("sw-open")&&!e.target.closest(".ib-act")){row.classList.remove("sw-open");front.style.transform="";}});
}

/* ── 待分类（左滑归类 / 右滑删除） ── */
function renderTriage(){
  $("#todoTitle").textContent="📂 待分类";
  const body=$("#todoBody");body.innerHTML="";
  const list=state.inspirations.filter(n=>n.status==="inbox");
  if(!list.length){body.innerHTML=`<div class="insp-empty">🎉 没有待整理的了，灵感都归类好啦</div>`;applyEmoji();return;}
  const info=document.createElement("div");info.className="triage-info";info.textContent=`共 ${list.length} 条待整理 · 左滑归类到清单（删除请到灵感收集箱或回收站）`;
  body.appendChild(info);
  list.forEach(n=>{
    const row=document.createElement("div");row.className="insp-row";row.dataset.id=n.id;
    const front=document.createElement("div");front.className="insp-front";
    front.innerHTML=`<span class="ib-bullet" style="pointer-events:none">○</span><div class="ib-text">${escBr(n.text)}</div>`;
    if(n.img){const im=document.createElement("img");im.src=n.img;im.className="ib-img";front.appendChild(im);}
    row.appendChild(front);
    enableSwipeReveal(row,{left:{label:"📂 归类",cls:"ib-cat-act",fn:()=>categorizeInsp(n.id)},right:null});
    body.appendChild(row);
  });
  applyEmoji();
}

/* ── 我的清单（列表 → 清单详情） ── */
function renderMyLists(){
  $("#todoTitle").textContent="📋 我的清单";
  const body=$("#todoBody");body.innerHTML="";
  if(openListId){renderListDetail(openListId,body);applyEmoji();return;}
  state.lists.forEach(l=>{
    const n=state.tasks.filter(t=>t.listId===l.id&&!t.done&&!t.abandoned).length;
    const card=document.createElement("button");card.className="home-card";
    card.innerHTML=`<span class="dot" style="background:${l.color}"></span><span class="hc-ico">${l.emoji}</span><span class="hc-name">${esc(l.name)}</span><span class="hc-cnt">${n}</span><span class="hc-go">›</span>`;
    card.addEventListener("click",()=>{openListId=l.id;renderMyLists();});
    card.addEventListener("contextmenu",e=>{e.preventDefault();delList(l.id);});
    body.appendChild(card);
  });
  const add=document.createElement("button");add.className="home-add";add.textContent="➕ 新增清单";
  add.addEventListener("click",openListModal);body.appendChild(add);
  applyEmoji();
}
function renderListDetail(id,body){
  const l=listOf(id);if(!l){openListId=null;renderMyLists();return;}
  const back=document.createElement("button");back.className="ll-back";back.textContent="‹ 返回清单";
  back.addEventListener("click",()=>{openListId=null;renderMyLists();});
  body.appendChild(back);
  const meta=document.createElement("div");meta.className="ll-meta";
  meta.innerHTML=`<span class="dot" style="background:${l.color}"></span><b>${l.emoji} ${esc(l.name)}</b><span class="ll-edit" data-id="${l.id}">✎ 编辑</span>`;
  meta.querySelector(".ll-edit").addEventListener("click",()=>openListModal(l.id));
  body.appendChild(meta);
  const tasks=state.tasks.filter(t=>t.listId===l.id&&!t.abandoned).sort((a,b)=>(a.done-b.done));
  if(!tasks.length)body.appendChild(Object.assign(document.createElement("div"),{className:"insp-empty",textContent:"这个清单还没有任务，去周计划拖进来吧"}));
  tasks.forEach(t=>body.appendChild(taskCard(t)));
  const add=document.createElement("button");add.className="home-add";add.textContent="➕ 添加任务";
  add.addEventListener("click",()=>openTaskModal(null));
  body.appendChild(add);
  applyEmoji();
}

/* ── 回收站（30 天） ── */
function renderTrash(){
  $("#todoTitle").textContent="🗑️ 回收站";
  const body=$("#todoBody");body.innerHTML="";
  purgeTrash();
  const list=state.inspirations.filter(n=>n.status==="trash");
  if(!list.length){body.innerHTML=`<div class="insp-empty">回收站是空的 🍃</div>`;applyEmoji();return;}
  const info=document.createElement("div");info.className="triage-info";info.textContent=`左滑恢复 · 右滑永久删除（保留 30 天）`;
  body.appendChild(info);
  list.forEach(n=>{
    const row=document.createElement("div");row.className="insp-row";
    const front=document.createElement("div");front.className="insp-front";
    const days=Math.max(0,Math.ceil((Date.now()-(n.deletedAt||Date.now()))/864e5));
    front.innerHTML=`<span class="ib-bullet">🗑️</span><div class="ib-text">${escBr(n.text)}</div><span class="ib-del">${days}天前删</span>`;
    if(n.img){const im=document.createElement("img");im.src=n.img;im.className="ib-img";front.appendChild(im);}
    row.appendChild(front);
    enableSwipeReveal(row,{left:{label:"♻️ 恢复",cls:"ib-restore-act",fn:()=>restoreInsp(n.id)},right:{label:"🗑 永久删除",cls:"ib-perm-act",fn:()=>permDeleteInsp(n.id)}});
    body.appendChild(row);
  });
  applyEmoji();
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
  $("#weekRangeBtn").textContent=`${dates[0].getMonth()+1}月${dates[0].getDate()}日 – ${dates[6].getMonth()+1}月${dates[6].getDate()}日 📆`;
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

/* ── 周计划日历跳转弹窗 ── */
let calOff=0;
function openCalPop(){calOff=0;renderCalPop();$("#calPop").hidden=false;}
function closeCalPop(){$("#calPop").hidden=true;}
function renderCalPop(){
  const now=new Date();now.setDate(1);now.setMonth(now.getMonth()+calOff);
  const y=now.getFullYear(),m=now.getMonth();
  $("#calMonthLabel").textContent=`${y}年${m+1}月`;
  const first=new Date(y,m,1);first.setDate(1-((first.getDay()+6)%7));
  const grid=$("#calGrid");grid.innerHTML="";
  const hasTask=ds=>state.tasks.some(t=>!t.abandoned&&t.due===ds)||state.habits.some(h=>h.checks[ds]);
  for(let i=0;i<42;i++){
    const d=new Date(first);d.setDate(first.getDate()+i);
    const ds=fmtDate(d);
    const cell=document.createElement("div");
    cell.className="cd"+(d.getMonth()!==m?" out":"")+(ds===todayStr()?" today":"")+(hasTask(ds)?" has":"");
    cell.textContent=d.getDate();
    if(d.getMonth()===m)cell.addEventListener("click",()=>jumpToWeek(ds));
    grid.appendChild(cell);
  }
}
function jumpToWeek(ds){
  const t=new Date(ds+"T00:00");
  const tm=new Date(t);tm.setHours(0,0,0,0);tm.setDate(tm.getDate()-((tm.getDay()+6)%7));
  const base=new Date();base.setHours(0,0,0,0);base.setDate(base.getDate()-((base.getDay()+6)%7));
  state.weekOffset=Math.round((tm-base)/(7*864e5));
  state.viewMode="week";closeCalPop();renderView();save();
}
$("#weekRangeBtn").addEventListener("click",openCalPop);
$("#calPrevM").addEventListener("click",()=>{calOff--;renderCalPop();});
$("#calNextM").addEventListener("click",()=>{calOff++;renderCalPop();});
$("#calPop").addEventListener("click",e=>{if(e.target.id==="calPop")closeCalPop();});

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
let editListId=null;
function openListModal(id){
  editListId=id||null;
  const l=id?listOf(id):null;
  $("#lmName").value=l?l.name:"";
  $("#lmEmoji").value=l?l.emoji:"";
  pickColor=l?l.color:PALETTE[0];
  buildSwatches("#lmColors",c=>pickColor=c);
  showModal("listModal");
}
$("#lmSave").addEventListener("click",()=>{
  const name=$("#lmName").value.trim();
  if(!name){toast("请填写清单名称 ✏️");return;}
  if(editListId){
    const l=listOf(editListId);
    if(l){l.name=name;l.emoji=$("#lmEmoji").value.trim()||"✨";l.color=pickColor;}
    closeModal();renderDrawer();renderAll();toast("清单已更新 ✏️");
  }else{
    state.lists.push({id:uid(),name,emoji:$("#lmEmoji").value.trim()||"✨",color:pickColor});
    closeModal();renderDrawer();renderAll();toast("清单已创建 🎀");
  }
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
    chk.addEventListener("click",e=>{
      e.stopPropagation();   /* 勾选按钮只负责打卡，不触发卡片编辑 */
      if(h.checks[todayStr()])delete h.checks[todayStr()];
      else{h.checks[todayStr()]=1;toast("打卡成功 ✅ 连续 "+(streakOf(h))+" 天！");if(navigator.vibrate)navigator.vibrate(15);}
      renderHabit();save();
    });
    card.appendChild(chk);
    card.style.cursor="pointer";
    card.addEventListener("contextmenu",e=>{e.preventDefault();delHabit(h.id);});
    let tm,lp=false;
    card.addEventListener("touchstart",e=>{if(e.target===chk)return;lp=false;tm=setTimeout(()=>{lp=true;delHabit(h.id);},650);},{passive:true});
    card.addEventListener("touchend",()=>clearTimeout(tm));
    card.addEventListener("touchmove",()=>clearTimeout(tm));
    /* 整块卡片（除右侧勾选按钮）点击 → 打开编辑弹窗；勾选按钮已 stopPropagation */
    card.addEventListener("click",e=>{
      if(e.target===chk)return;
      if(lp){lp=false;return;}          /* 长按删除后抑制误触编辑 */
      openHabitModal(h);
    });
    box.appendChild(card);
  });
  const add=document.createElement("button");
  add.className="drawer-add";add.textContent="➕ 新增习惯";
  add.addEventListener("click",()=>openHabitModal());
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
let editingHabit=null;
function openHabitModal(habit){
  editingHabit=habit||null;
  const h3=$("#habitModal").querySelector("h3");
  if(habit){
    $("#hmName").value=habit.name;
    $("#hmEmoji").value=habit.emoji||"";
    habitColor=habit.color||PALETTE[3];
    if(h3)h3.textContent="✏️ 编辑习惯";
    $("#hmSave").textContent="保存";
  }else{
    $("#hmName").value="";$("#hmEmoji").value="";
    habitColor=PALETTE[3];
    if(h3)h3.textContent="🌱 新增习惯";
    $("#hmSave").textContent="创建";
  }
  buildSwatches("#hmColors",c=>habitColor=c);
  showModal("habitModal");
}
$("#hmSave").addEventListener("click",()=>{
  const name=$("#hmName").value.trim();
  if(!name){toast("请填写习惯名称 ✏️");return;}
  const emoji=$("#hmEmoji").value.trim()||"🌱";
  if(editingHabit){
    editingHabit.name=name;editingHabit.emoji=emoji;editingHabit.color=habitColor;
    closeModal();renderHabit();save();toast("习惯已更新 ✏️");
  }else{
    state.habits.push({id:uid(),name,emoji,color:habitColor,checks:{},createdAt:Date.now()});
    closeModal();renderHabit();save();toast("习惯已创建 🌱");
  }
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
  const acc=getComputedStyle(document.body).getPropertyValue("--accent").trim()||"#71b7ed";
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
  plot(a,acc,true);
  ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillStyle="#8E8E93";
  labels.forEach((l,i)=>{if(labels.length<=16||i%Math.ceil(labels.length/16)===0)ctx.fillText(String(l),pad+i*step,h-10);});
  ctx.textAlign="left";
  ctx.fillStyle=acc;ctx.fillRect(pad,6,9,9);ctx.fillStyle="#1C1C1E";ctx.fillText("完成",pad+13,14);
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
  applyAccent();
}
/* 全局主色调（调色盘「我的收藏色」联动） */
function applyAccent(){
  const root=document.body;
  if(state.settings.accent){
    root.style.setProperty("--accent",state.settings.accent);
    root.style.setProperty("--accent-deep",accentDeep(state.settings.accent));
  }else{
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-deep");
  }
}
function accentDeep(hex){
  const c=String(hex).replace("#","");
  if(c.length!==6)return hex;
  const n=parseInt(c,16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  const f=v=>Math.max(0,Math.round(v*0.82)).toString(16).padStart(2,"0");
  return "#"+f(r)+f(g)+f(b);
}
/* 调色盘收藏 → 可点击主题色（最多 5，最近优先，带名称与长按菜单） */
let themeShowAll=false;
function favColorsDetailed(){
  if(!state.palette)return [];
  const out=[];
  (state.palette.favs||[]).forEach((f,i)=>{if(f&&f.colors&&f.colors[0])out.push({hex:f.colors[0],name:f.name||f.colors[0],src:"fav",idx:i});});
  (state.palette.colors||[]).forEach((c,i)=>out.push({hex:c.hex,name:c.name||c.hex,src:"color",idx:i}));
  const seen=new Set(),uniq=[];
  for(let i=out.length-1;i>=0;i--){const h=String(out[i].hex).toUpperCase();if(!seen.has(h)){seen.add(h);uniq.push(out[i]);}}
  return uniq;
}
function renderThemeCustom(){
  const box=$("#themeCustom");if(!box)return;
  const all=favColorsDetailed();
  if(!all.length){
    box.innerHTML=`<div class="tc-title">🎨 我的收藏色</div><div class="tc-empty">💡 去「调色盘」收藏你喜欢的颜色吧<br>收藏后会出现在这里，一键设为全局主色</div>`;
    return;
  }
  const cols=themeShowAll?all:all.slice(0,5);
  let html=`<div class="tc-title">🎨 我的收藏色</div><div class="tc-grid">`;
  cols.forEach((c,i)=>{
    const sel=state.settings.accent&&state.settings.accent.toUpperCase()===String(c.hex).toUpperCase();
    html+=`<div class="tc-cell${sel?" on":""}" data-i="${i}"><div class="tc-sw" style="background:${c.hex}"></div><div class="tc-name">${esc(c.name||c.hex)}</div></div>`;
  });
  html+=`</div>`;
  if(!themeShowAll&&all.length>5)html+=`<button class="tc-more" id="tcMore">查看全部 ${all.length} 个 →</button>`;
  if(state.settings.accent)html+=`<button class="tc-reset" id="tcReset">↺ 恢复默认主题色</button>`;
  html+=renderRecPalettes();
  box.innerHTML=html;
  box.querySelectorAll(".tc-cell").forEach(cell=>{
    const i=+cell.dataset.i,c=cols[i];
    cell.addEventListener("click",()=>{state.settings.accent=c.hex;applyAccent();renderSettings();save();toast("已应用主色 🎨");});
    let lp=null;
    cell.addEventListener("pointerdown",e=>{lp=setTimeout(()=>{lp=null;openTcMenu(c,e.clientX,e.clientY);},480);});
    cell.addEventListener("pointerup",()=>{if(lp){clearTimeout(lp);lp=null;}});
    cell.addEventListener("pointerleave",()=>{if(lp){clearTimeout(lp);lp=null;}});
    cell.addEventListener("contextmenu",e=>{e.preventDefault();openTcMenu(c,e.clientX,e.clientY);});
  });
  const more=$("#tcMore");if(more)more.addEventListener("click",()=>{themeShowAll=true;renderThemeCustom();});
  const r=$("#tcReset");if(r)r.addEventListener("click",()=>{state.settings.accent=null;applyAccent();renderSettings();save();toast("已恢复默认主题色");});
  box.querySelectorAll(".rec-apply,.rec-sw").forEach(b=>b.addEventListener("click",()=>{state.settings.accent=b.dataset.hex;applyAccent();renderSettings();save();toast("已应用推荐配色 🎨");}));
}
/* 长按菜单：设为默认 / 编辑名称 / 从收藏移除 */
function openTcMenu(c,x,y){
  closeTcMenu();
  const m=document.createElement("div");m.className="tc-menu";m.id="tcMenu";
  m.innerHTML=`<button data-act="default">⭐ 设为默认</button>
    <button data-act="rename">✏️ 编辑名称</button>
    <button data-act="remove" class="danger">🗑 从收藏移除</button>`;
  document.body.appendChild(m);
  const w=m.offsetWidth||160,h=m.offsetHeight||130;
  m.style.left=Math.min(x,window.innerWidth-w-8)+"px";
  m.style.top=Math.min(y,window.innerHeight-h-8)+"px";
  m.classList.add("show");
  m.querySelector('[data-act=default]').onclick=()=>{state.settings.accent=c.hex;applyAccent();renderSettings();save();toast("已设为默认主色 ⭐");closeTcMenu();};
  m.querySelector('[data-act=rename]').onclick=()=>{const v=prompt("颜色名称：",c.name||c.hex);if(v!=null){setFavName(c,(v.trim()||c.name));save();renderThemeCustom();}closeTcMenu();};
  m.querySelector('[data-act=remove]').onclick=()=>{removeFav(c);save();renderThemeCustom();toast("已从收藏移除");closeTcMenu();};
  let ignoreUntil=Date.now()+260;
  setTimeout(()=>document.addEventListener("click",function once(e){if(Date.now()<ignoreUntil)return;if(e.target.closest&&e.target.closest(".tc-menu"))return;closeTcMenu();document.removeEventListener("click",once);}),0);
}
function closeTcMenu(){const m=$("#tcMenu");if(m)m.remove();}
function setFavName(c,name){
  if(c.src==="fav"){const f=state.palette.favs[c.idx];if(f)f.name=name;}
  else{const col=state.palette.colors[c.idx];if(col)col.name=name;}
}
function removeFav(c){
  if(c.src==="fav")state.palette.favs.splice(c.idx,1);
  else state.palette.colors.splice(c.idx,1);
}
/* 推荐配色：基于当前主色，用 HSL 推导类比/互补/同色系 */
function hexToHsl(hex){
  const c=String(hex).replace("#","");if(c.length!==6)return{h:0,s:0,l:60};
  const n=parseInt(c,16);let r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h,s,l=(mx+mn)/2;
  if(mx===mn)s=0;else{s=l>.5?(mx-mn)/(2-mx-mn):(mx-mn)/(mx+mn);}
  switch(mx){case r:h=(g-b)/(mx-mn)+(g<b?6:0);break;case g:h=(b-r)/(mx-mn)+2;break;default:h=(r-g)/(mx-mn)+4;}
  return{h:h*60,s:s*100,l:l*100};
}
function hslToHex(h,s,l){
  h=(h%360+360)%360;s=Math.max(0,Math.min(100,s))/100;l=Math.max(0,Math.min(100,l))/100;
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  let r,g,b;if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];
  else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];
  const to=v=>Math.round((v+m)*255).toString(16).padStart(2,"0");
  return "#"+to(r)+to(g)+to(b);
}
function harmonize(hex){
  const {h,s,l}=hexToHsl(hex);const S=Math.max(s,45),L=Math.max(42,Math.min(70,l));
  const A=[hslToHex((h-30+360)%360,S,L),hex,hslToHex((h+30)%360,S,L)];
  const C=[hex,hslToHex((h+180)%360,Math.max(S,40),L)];
  const M=[hslToHex(h,Math.min(S,30),Math.min(88,L+22)),hex,hslToHex(h,Math.max(S,55),Math.max(34,L-20))];
  return [{name:"类比色",colors:A},{name:"互补色",colors:C},{name:"同色系深浅",colors:M}];
}
function renderRecPalettes(){
  const base=state.settings.accent||"#A99B95";
  const schemes=harmonize(base);
  let html=`<div class="tc-rec"><div class="tc-title" style="margin:0 0 8px">✨ 为你推荐的配色（基于主色自动生成）</div>`;
  schemes.forEach(s=>{
    const sw=s.colors.map(c=>`<span style="background:${c}"></span>`).join("");
    html+=`<div class="rec-row"><div class="rec-sw" data-hex="${s.colors[0]}">${sw}</div><div class="rec-label">${s.name}</div><button class="rec-apply" data-hex="${s.colors[0]}">应用</button></div>`;
  });
  html+=`</div>`;
  return html;
}
function renderThemePreview(t){
  const box=$("#themePreview");if(!box)return;
  const th=THEMES[t]||THEMES.morandi;
  box.innerHTML=th.colors.map(c=>`<span class="pv" style="background:${c}"></span>`).join("")+`<span class="pv-name">${th.name}</span>`;
}
function renderSettings(){
  $$("#themeList .theme-item").forEach(b=>b.classList.toggle("sel",b.dataset.t===state.settings.theme));
  renderThemePreview(state.settings.theme);
  renderThemeCustom();
}
$$("#themeList .theme-item").forEach(b=>b.addEventListener("click",()=>{
  state.settings.theme=b.dataset.t;applyTheme(b.dataset.t);renderSettings();save();toast("主题已切换 🎨");
}));
/* 清空当前数据：保留调色盘收藏与主题设置，重置为 4 清单空初始态 */
function resetCleanState(){
  const keepPalette=JSON.parse(JSON.stringify(state.palette||{favs:[],colors:[],lastInspire:null}));
  const keepSettings=JSON.parse(JSON.stringify(state.settings||{theme:"morandi",accent:null}));
  const l1=uid(),l2=uid(),l3=uid(),l4=uid();
  state={
    version:2,
    lists:[
      {id:l1,name:"工作",emoji:"💼",color:"#71b7ed"},
      {id:l2,name:"个人成长",emoji:"🌱",color:"#84c3b7"},
      {id:l3,name:"健康养生",emoji:"🍵",color:"#f2b56f"},
      {id:l4,name:"学习",emoji:"📚",color:"#b8aeeb"},
    ],
    tasks:[],events:[],goals:{},
    weekOffset:0,weekView:"simple",viewMode:"week",poolList:"all",splitLeft:null,
    todoLayer:"inbox",todoSel:"inbox",
    reviewDim:"week",dayDate:todayStr(),monthOffset:0,
    habits:[],pomo:{focusMin:25,breakMin:5,noise:false,records:[]},
    settings:keepSettings,activeTab:"todo",
    revMode:"data",moods:{},palette:keepPalette,inspirations:[],annual:{},
  };
  inspSel=null;
  save();renderAll();
}
$("#clearData").addEventListener("click",()=>{
  if(confirm("⚠️ 确定要清空所有数据吗？此操作不可撤销。\n（调色盘收藏与主题配色会被保留）")){
    resetCleanState();
    switchTab("todo");
    toast("已清空，重新开始 ✨");
  }
});
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

/* ═══ 灵感收集箱键盘上方控制条（↑↓ 新建/跳转 · 完成/收起） ═══ */
(function initKbBar(){
  const up=$("#kbUp"),down=$("#kbDown"),done=$("#kbDone"),hide=$("#kbHide");
  if(up)up.addEventListener("pointerdown",e=>{e.preventDefault();inspArrowUp();});
  if(down)down.addEventListener("pointerdown",e=>{e.preventDefault();inspArrowDown();});
  const blurAndHide=()=>{const a=document.activeElement;if(a&&a.blur)a.blur();hideKbBar();};
  if(done)done.addEventListener("click",blurAndHide);
  if(hide)hide.addEventListener("click",blurAndHide);
})();
