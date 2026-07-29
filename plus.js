/* ═══════════ GoalDay v10 · 五大新增功能（调色盘 / 情绪标签 / 每日手帐 / 灵感收集箱 / 年度回顾） ═══════════
   复用 app.js 全局： $, $$, uid, state, save, toast, esc, fmtDate, todayStr, weekDates, addDays,
   md, mondayOf, isoWeek, DAY_NAMES, PALETTE, colorOf, listOf, activeTasks, renderAll, switchTab,
   showModal, closeModal, openTaskModal, streakOf, drawDonut, drawBars, drawLine, prepCv, roundRect,
   THEMES, applyTheme, homeCard, enterPlan, renderTodo, renderHabit, renderReview, monthDays
*/
"use strict";
/* ── 后端可插拔配置（你后续把后端地址填进来即可接入真实抓取 / 云同步） ── */
const CONFIG = {
  API_BASE: "",   // 例如 "https://your.api/goalday"；留空则使用内置精选 + 仅本机存储
};

/* 数据归一化（老用户兜底） */
if(!state.revMode)state.revMode="data";
if(!state.moods)state.moods={};
if(!state.palette)state.palette={favs:[],colors:[],lastInspire:null};
if(!state.inspirations)state.inspirations=[];
if(!state.annual)state.annual={};

/* ═══════════ 通用：深层页打开/关闭 ═══════════ */
function openExtra(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.hidden=false;el.scrollTop=0;
  if(id==="palettePage")renderPalette();
  if(id==="annualPage")renderAnnual();
  applyEmoji();
}
function closeExtra(id){document.getElementById(id).hidden=true;}
$$('[data-close]').forEach(b=>b.addEventListener("click",()=>closeExtra(b.dataset.close)));

/* ═══════════ 情绪标签 ═══════════ */
const MOODS=[
  {e:"😊",n:"开心"},{e:"😌",n:"平静"},{e:"💪",n:"充实"},{e:"☁️",n:"放空"},
  {e:"😴",n:"疲惫"},{e:"❤️",n:"感恩"},{e:"🌧️",n:"低落"},{e:"🔥",n:"充满干劲"}
];
const MOOD_COLORS={"😊":"#f2b56f","😌":"#88d8db","💪":"#71b7ed","☁️":"#b8aeeb","😴":"#9aa0a6","❤️":"#f2a7da","🌧️":"#7FA8CC","🔥":"#f57c6e"};
const moodColor=e=>MOOD_COLORS[e]||"#b8aeeb";
function renderMoodPicker(){
  const box=$("#moodPicker");if(!box)return;
  const today=todayStr();
  const cur=state.moods[today];
  let html=`<div class="mood-title">今日心情：</div><div class="mood-row">`;
  MOODS.forEach(m=>{html+=`<button class="mood-btn${cur===m.e?" on":""}" data-m="${m.e}" title="${m.n}">${m.e}</button>`;});
  html+=`</div>`;
  if(!cur)html+=`<div class="mood-hint">选一个今天的心情吧（可随时更换）</div>`;
  else html+=`<div class="mood-hint">今天的心情：${cur} ${MOODS.find(m=>m.e===cur)?MOODS.find(m=>m.e===cur).n:""} · 随时可换</div>`;
  box.innerHTML=html;
  box.querySelectorAll(".mood-btn").forEach(b=>b.addEventListener("click",()=>{
    state.moods[today]=b.dataset.m;save();renderMoodPicker();toast("已记录今天的心情 "+b.dataset.m);
  }));
}

/* ═══════════ 每日手帐时间轴 + 心情日历 ═══════════ */
function jItemsAt(h,ds){
  const out=[];
  state.tasks.filter(t=>t.due===ds).forEach(t=>{
    const hr=t.time?+t.time.slice(0,2):-1;
    if(hr===h)out.push(`<div class="jbar" style="--c:${colorOf(t)}">${t.done?"✅":"◻️"} ${esc(t.title)}</div>`);
  });
  if(h===6){
    state.habits.filter(x=>x.checks[ds]).forEach(hb=>out.push(`<div class="jbar" style="--c:${hb.color}">✅ 打卡 ${hb.emoji}${esc(hb.name)}</div>`));
    const recs=state.pomo.records.filter(r=>r.date===ds);
    if(recs.length)out.push(`<div class="jbar" style="--c:#f2b56f">🍅 专注 ${recs.reduce((s,r)=>s+r.minutes,0)} 分钟</div>`);
  }
  return out;
}
function renderJournal(){
  const box=$("#journalView");if(!box)return;
  const ds=todayStr();
  let html=`<div class="journal-head">📝 每日手帐 · ${md(ds)} ${DAY_NAMES[(new Date(ds+"T00:00").getDay()+6)%7]}</div>`;
  html+=`<div class="tl">`;
  for(let h=6;h<=24;h++){
    const hh=String(h).padStart(2,"0");
    const items=jItemsAt(h,ds);
    const sun=h>=6&&h<18?"☀️":"🌙";
    html+=`<div class="jrow"><div class="jtime">${hh}:00</div><div class="jev"><div class="jm" style="position:static;display:inline">${sun}</div>${items.join("")}</div></div>`;
  }
  html+=`</div>`;
  html+=`<div class="panel"><h3 class="ptt">🌈 本月心情日历</h3><div class="heatmap" id="journalCal"></div></div>`;
  box.innerHTML=html;
  renderJournalCal();
  applyEmoji();
}
function renderJournalCal(){
  const box=$("#journalCal");if(!box)return;
  DAY_NAMES.forEach(n=>{const h=document.createElement("div");h.className="hm-head";h.textContent=n.slice(1);box.appendChild(h);});
  const {base,cells}=monthDays(0);
  cells.forEach(d=>{
    const ds=fmtDate(d);
    const cell=document.createElement("div");
    cell.className="hm-cell"+(d.getMonth()!==base.getMonth()?" out":"");
    cell.innerHTML=`<span class="hm-d">${d.getDate()}</span>`;
    const m=state.moods[ds];
    if(m){const s=document.createElement("div");s.className="jm";s.textContent=m;cell.appendChild(s);}
    box.appendChild(cell);
  });
}
function renderMoodCharts(){
  const panel=$("#revMoodPanel"),trend=$("#revMoodTrendPanel");
  const m=state.moods;const keys=Object.keys(m);
  if(!keys.length){panel.hidden=true;trend.hidden=true;return;}
  const ym=todayStr().slice(0,7);
  const monthKeys=keys.filter(k=>k.startsWith(ym));
  const counts={};MOODS.forEach(mo=>counts[mo.e]=0);
  monthKeys.forEach(k=>{if(counts[m[k]]!=null)counts[m[k]]++;});
  const groups=MOODS.filter(mo=>counts[mo.e]>0).map(mo=>({label:mo.e+" "+mo.n,color:moodColor(mo.e),value:counts[mo.e]}));
  if(groups.length){panel.hidden=false;drawDonut($("#revMoodDonut"),groups);$("#revMoodLegend").innerHTML=groups.map(g=>`<span><i style="background:${g.color}"></i>${g.label} ${g.value}</span>`).join("");}
  else panel.hidden=true;
  const now=new Date();const days=now.getDate();
  const labels=[],vals=[];
  for(let i=1;i<=days;i++){const ds=fmtDate(new Date(now.getFullYear(),now.getMonth(),i));labels.push(i);const e=m[ds];vals.push(e?MOODS.findIndex(x=>x.e===e)+1:0);}
  if(vals.some(v=>v>0)){trend.hidden=false;drawLine($("#revMoodLine"),labels,vals,new Array(days).fill(0));}
  else trend.hidden=true;
}

/* ═══════════ 年度回顾 ═══════════ */
function renderAnnualEntry(){
  const box=$("#annualEntry");if(!box)return;
  const now=new Date();const d=now.getDate(),mo=now.getMonth()+1;
  const banner=(mo===12&&d>=20)||(mo===1&&d<=10);
  box.innerHTML=`<div class="panel entry-banner" id="annualOpen" style="cursor:pointer">
     <div class="eb-emoji">✨</div>
     <div class="eb-txt"><b>年度回顾</b><span>${banner?"你的年度报告已生成，点击查看 🎉":"查看年度数据报告 & 写下展望"}</span></div>
     <div class="hc-go">›</div></div>`;
  box.querySelector("#annualOpen").addEventListener("click",()=>openExtra("annualPage"));
}
function renderAnnual(){
  const body=$("#annualBody");if(!body)return;
  const y=new Date().getFullYear();
  const data=state.annual[y]||{outlook:{},photos:[]};
  /* ── 自动汇总 ── */
  const doneY=state.tasks.filter(t=>t.done&&!t.abandoned&&t.due&&t.due.startsWith(y+"-")).length;
  const recs=state.pomo.records.filter(r=>r.date.startsWith(y+"-"));
  const focusMin=recs.reduce((s,r)=>s+r.minutes,0),pomoN=recs.length;
  let habitDays=0;const yearDays=[];for(let i=0;i<365;i++){const d=new Date(y,0,1);d.setDate(i+1);yearDays.push(fmtDate(d));}
  yearDays.forEach(ds=>{if(state.habits.some(h=>h.checks[ds]))habitDays++;});
  let maxStreak=0;state.habits.forEach(h=>{const s=streakOf(h);if(s>maxStreak)maxStreak=s;});
  const monthly=[...Array(12)].map((_,mi)=>state.tasks.filter(t=>t.done&&!t.abandoned&&t.due&&t.due.startsWith(y+"-"+(mi+1).toString().padStart(2,"0")+"-")).length);
  const maxMi=monthly.indexOf(Math.max(...monthly));
  const groups=[];state.lists.forEach(l=>{const n=state.tasks.filter(t=>t.done&&!t.abandoned&&t.listId===l.id&&t.due&&t.due.startsWith(y+"-")).length;if(n>0)groups.push({label:l.emoji+l.name,color:l.color,value:n});});
  const inboxN=state.tasks.filter(t=>t.done&&!t.abandoned&&!t.listId&&t.due&&t.due.startsWith(y+"-")).length;if(inboxN>0)groups.push({label:"收集箱",color:"#8E8E93",value:inboxN});
  const mc={};Object.keys(state.moods).filter(k=>k.startsWith(y+"-")).forEach(k=>{mc[state.moods[k]]=(mc[state.moods[k]]||0)+1;});
  let topMood=null,topN=0;Object.entries(mc).forEach(([e,n])=>{if(n>topN){topN=n;topMood=e;}});
  const maxFm=recs.length?recs.reduce((a,b)=>a.minutes>b.minutes?a:b).minutes:0;
  /* ── 报告 HTML ── */
  let html=`<div class="panel an-report">
    <h3 class="ptt">🏆 ${y} 年度成就总览</h3>
    <div class="an-hero">
      <div class="scard"><b>${doneY}</b><span>完成任务 ✅</span></div>
      <div class="scard"><b>${Math.round(focusMin/60)}</b><span>专注小时 ⏱️</span></div>
      <div class="scard"><b>${pomoN}</b><span>番茄钟 🍅</span></div>
      <div class="scard"><b>${habitDays}</b><span>打卡天数 📅</span></div>
    </div>
    <h3 class="ptt" style="margin-top:10px">🥧 清单分类占比</h3>
    <div class="an-donut-wrap"><canvas id="anDonut" height="200" style="max-width:260px"></canvas></div>
    <h3 class="ptt" style="margin-top:6px">📅 月度完成热力（共 ${monthly.reduce((a,b)=>a+b,0)} 项）</h3>
    <div class="an-heat" id="anHeat"></div>
    <h3 class="ptt" style="margin-top:10px">🌟 高光时刻</h3>
    <div class="an-hl">
      <div><span class="star">🌟</span> 完成最多的月份：<b>${maxMi>=0?(maxMi+1)+"月":""}</b>（${Math.max(...monthly)} 项）</div>
      <div><span class="star">🌟</span> 专注最久的单日：<b>${maxFm} 分钟</b></div>
      <div><span class="star">🌟</span> 最长连续打卡：<b>${maxStreak} 天</b></div>
      ${topMood?`<div><span class="star">🌟</span> 最常见的情绪：<b>${topMood} ${MOODS.find(m=>m.e===topMood)?MOODS.find(m=>m.e===topMood).n:""}</b>（占比 ${Math.round(topN/Object.values(mc).reduce((a,b)=>a+b,0)*100)}%）</div>`:""}
    </div>
  </div>`;
  /* ── 展望 ── */
  const ov=data.outlook||{};
  html+=`<div class="panel an-outlook">
    <h3 class="ptt">✍️ 年度展望（手写风）</h3>
    <label>✨ 今年最想感谢自己的三件事</label>
    <textarea id="ovThanks" rows="3" placeholder="1. ……&#10;2. ……&#10;3. ……">${esc(ov.thanks||"")}</textarea>
    <label>🎯 明年的三个核心目标</label>
    <textarea id="ovGoals" rows="3" placeholder="1. ……&#10;2. ……&#10;3. ……">${esc(ov.goals||"")}</textarea>
    <label>🌱 明年想培养的一个新习惯</label>
    <input id="ovHabit" type="text" value="${esc(ov.habit||"")}" placeholder="例如：每天散步 20 分钟">
    <label>💌 写给明年自己的话</label>
    <textarea id="ovLetter" rows="3" placeholder="亲爱的明年我……">${esc(ov.letter||"")}</textarea>
    <label>🖼️ 年度照片（可选）</label>
    <button class="set-btn" id="annualPhotoBtn">📷 添加年度照片</button>
    <div class="an-photos" id="anPhotos"></div>
    <button class="save-out" id="ovSave">💾 保存我的年度展望</button>
  </div>`;
  body.innerHTML=html;
  if(groups.length)drawDonut($("#anDonut"),groups);
  const heat=$("#anHeat");
  const maxM=Math.max(...monthly,1);
  monthly.forEach((v,mi)=>{
    const c=document.createElement("div");c.className="mh";
    const lvl=v/maxM;
    c.style.background=lvl>0?(lvl>=.67?"var(--accent)":`color-mix(in srgb,var(--accent) ${Math.round(lvl*60)}%,var(--bg-soft))`):"var(--bg-soft)";
    c.innerHTML=`${mi+1}月${v?`<br><b>${v}</b>`:""}`;
    heat.appendChild(c);
  });
  const photos=data.photos||[];
  const pr=$("#anPhotos");
  photos.forEach((src,i)=>{
    const w=document.createElement("div");w.style.position="relative";
    w.innerHTML=`<img src="${src}"><button data-i="${i}" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:0;border-radius:50%;width:20px;height:20px;font-size:11px">✕</button>`;
    w.querySelector("button").addEventListener("click",()=>{state.annual[y].photos.splice(i,1);save();renderAnnual();});
    pr.appendChild(w);
  });
  $("#annualPhotoBtn").addEventListener("click",()=>$("#annualPhoto").click());
  $("#ovSave").addEventListener("click",()=>{
    state.annual[y]=Object.assign(state.annual[y]||{},{outlook:{
      thanks:$("#ovThanks").value,goals:$("#ovGoals").value,habit:$("#ovHabit").value,letter:$("#ovLetter").value
    },photos:(state.annual[y]&&state.annual[y].photos)||[]});
    save();toast("已保存年度展望 ✨");
  });
  applyEmoji();
}
$("#annualPhoto").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    const y=new Date().getFullYear();
    state.annual[y]=state.annual[y]||{outlook:{},photos:[]};
    state.annual[y].photos=(state.annual[y].photos||[]);state.annual[y].photos.push(String(r.result));
    save();renderAnnual();
  };
  r.readAsDataURL(f);e.target.value="";
});

/* ═══════════ 灵感收集箱（已整合进 Tab1「我的空间 · 灵感收集箱」，见 app.js） ═══════════ */

/* ═══════════ 调色盘 ═══════════ */
const INSPIRE_PALETTES=[
  {name:"低饱和基底+高饱和点睛",src:"📕 小红书热门",colors:["#E8E2DA","#C9BFB4","#7FA8CC","#F2A7DA","#84C3B7"]},
  {name:"奶fufu手帐",src:"📕 小红书热门",colors:["#FFFDF5","#F6E7D8","#F2B56F","#B8AEEB","#88D8DB"]},
  {name:"莫兰迪日常",src:"🎨 Color Hunt 流行",colors:["#D5CFC5","#B8AEAB","#A99B95","#E0D6CC","#8A7C76"]},
  {name:"薄荷微风",src:"🎨 Color Hunt 流行",colors:["#D9EEFF","#88D8DB","#84C3B7","#EAF6F0","#6FC2A8"]},
  {name:"《怦然心动》暖调",src:"🎬 电影配色",colors:["#F3E9DC","#E6B89C","#C97B63","#7A5C58","#3E2F2B"]},
  {name:"《千与千寻》夜色",src:"🎬 电影配色",colors:["#1B2A4A","#3E5C76","#8FB8C9","#E5C07B","#F2E2C4"]},
  {name:"2026 嫩粉趋势",src:"🌸 2026 春夏趋势",colors:["#FFE3EC","#FFC2D4","#F7A8C0","#FFF5F7","#E88FB0"]},
  {name:"2026 通透蓝",src:"🌸 2026 春夏趋势",colors:["#DFF1FF","#A9D6F5","#71B7ED","#4F8FD6","#EAF6FF"]},
  {name:"鹅黄奶油",src:"🌸 2026 春夏趋势",colors:["#FFF6D9","#FBE7A1","#F2B56F","#FFFDF5","#E9D8A6"]},
  {name:"清晨花园",src:"🏞️ 自然灵感",colors:["#F4F1E8","#CFE3C0","#9CC08A","#E8A0A0","#F2D9B0"]},
  {name:"海岸黄昏",src:"🏞️ 自然灵感",colors:["#FCE9D8","#F6B68A","#E08A6E","#5E8CA0","#2E4A56"]},
  {name:"森林浴",src:"🏞️ 自然灵感",colors:["#E7EDE3","#Bcd3b0","#7FA98C","#4E7A5E","#2E4636"]},
  {name:"焦糖拿铁",src:"📕 小红书热门",colors:["#F3E7DB","#D9B89A","#B07D56","#6E4B33","#3A2A20"]},
  {name:"葡萄气泡",src:"🎨 Color Hunt 流行",colors:["#F1E9F7","#D9BCEB","#B8AEEB","#8E7BD6","#F2A7DA"]},
  {name:"《你的名字》sky",src:"🎬 电影配色",colors:["#2B3A67","#5E7BB0","#9FC6E0","#E8A0A0","#F6D9C0"]},
  {name:"抹茶千层",src:"🌸 2026 春夏趋势",colors:["#EEF2E2","#CFE0A8","#A9C46C","#7C9A4E","#E8EAD0"]},
  {name:"草莓奶昔",src:"📕 小红书热门",colors:["#FFEAF0","#FBC3D4","#F48FB1","#FFF5F7","#E06A96"]},
  {name:"雾蓝灰",src:"🎨 Color Hunt 流行",colors:["#E6E9EC","#C2CCD2","#8FA3AD","#5E727C","#34454C"]},
  {name:"《怪物之子》森灵",src:"🎬 电影配色",colors:["#1E3326","#3E6B4A","#7FB089","#C9E0B0","#F2E9C9"]},
  {name:"陶土暖窑",src:"🏞️ 自然灵感",colors:["#F0E3D6","#D9A57E","#B06A45","#6E3F2A","#3A241A"]},
  {name:"极光夜",src:"🏞️ 自然灵感",colors:["#101B3D","#27408B","#3FA7A0","#8FE0C0","#C9F2D6"]},
  {name:"蜜桃午后",src:"🌸 2026 春夏趋势",colors:["#FFE9E0","#FBC9B0","#F2A07A","#FFF5F0","#E88A6E"]},
  {name:"靛蓝手帐",src:"📕 小红书热门",colors:["#E7E9F2","#B9BEEB","#7E86D6","#4B53A0","#F2A7DA"]},
  {name:"燕麦拿铁",src:"🎨 Color Hunt 流行",colors:["#F2EDE4","#D8CBB8","#B7A892","#8A7C6E","#E8DCC8"]}
];
let inspireOffset=0;
function renderInspireStream(){
  const box=$("#inspireStream");if(!box)return;
  const shuffled=INSPIRE_PALETTES.slice(inspireOffset).concat(INSPIRE_PALETTES.slice(0,inspireOffset));
  box.innerHTML="";
  shuffled.slice(0,10).forEach((p,idx)=>{
    const faved=state.palette.favs.some(f=>f.name===p.name);
    const card=document.createElement("div");card.className="icard";
    card.innerHTML=`
      <div class="swatches-row">${p.colors.map(c=>`<div class="sw" style="background:${c}"></div>`).join("")}</div>
      <div class="hexes">${p.colors.map(c=>`<span class="hex">${c.toUpperCase()}</span>`).join("")}</div>
      <div class="icard-foot"><span class="src">${p.src}</span><button class="fav${faved?" on":""}" data-i="${idx}">${faved?"❤️":"🤍"}</button></div>`;
    card.querySelector(".fav").addEventListener("click",()=>{
      if(faved){state.palette.favs=state.palette.favs.filter(f=>f.name!==p.name);}
      else{state.palette.favs.push({name:p.name,src:p.src,colors:p.colors.slice()});}
      save();renderInspireStream();renderPaletteFav();toast(faved?"已取消收藏":"已收藏到「我的收藏」❤️");
    });
    box.appendChild(card);
  });
}
function renderPaletteFav(){
  const fav=$("#favList"),col=$("#colorList");
  fav.innerHTML=`<div class="fav-list">${state.palette.favs.length?state.palette.favs.map((f,i)=>`
    <div class="circle"><div class="cacts"><button data-fav="${i}" title="应用">📌</button></div>
    <div class="dotc" style="background:${f.colors[0]}"></div><span class="cn">${esc(f.name)}</span></div>`).join(""):`<div class="empty-tip sm">还没有收藏的配色，去上方「灵感补给」点 ❤️ 吧</div>`}</div>`;
  col.innerHTML=`<div class="fav-list">${state.palette.colors.length?state.palette.colors.map((c,i)=>`
    <div class="circle"><div class="cacts"><button data-col="${i}" title="应用">📌</button><button data-delcol="${i}" title="删除">✕</button></div>
    <div class="dotc" style="background:${c.hex}"></div><span class="cn">${esc(c.name||c.hex)}</span></div>`).join(""):`<div class="empty-tip sm">还没有自建颜色，点「➕ 新建颜色」</div>`}</div>`;
  fav.querySelectorAll("[data-fav]").forEach(b=>b.addEventListener("click",()=>applyPalette(state.palette.favs[+b.dataset.fav])));
  col.querySelectorAll("[data-col]").forEach(b=>b.addEventListener("click",()=>applyColor(state.palette.colors[+b.dataset.col],null)));
  col.querySelectorAll("[data-delcol]").forEach(b=>b.addEventListener("click",()=>{state.palette.colors.splice(+b.dataset.delcol,1);save();renderPaletteFav();}));
}
function renderPalette(){
  renderInspireStream();
  renderPaletteFav();
}
function applyPalette(fav){
  pickApplyTarget(t=>{
    if(t==="__tag"){state.palette.tagColors=state.palette.tagColors||{};state.palette.tagColors[fav.colors[0]]=fav.name;toast("配色已加入任务标签色板 🏷️");return;}
    const l=listOf(t);if(l){l.color=fav.colors[0];toast("已应用到清单「"+l.name+"」🎨");renderAll();return;}
    const h=state.habits.find(x=>x.id===t);if(h){h.color=fav.colors[0];toast("已应用到习惯「"+h.name+"」🎨");renderHabit();return;}
  });
}
function applyColor(c,target){
  if(target){applyPalette({colors:[c.hex],name:c.name,src:""});return;}
  pickApplyTarget(t=>{
    if(t==="__tag"){state.palette.tagColors=state.palette.tagColors||{};state.palette.tagColors[c.hex]=c.name;toast("已加入任务标签色板 🏷️");return;}
    const l=listOf(t);if(l){l.color=c.hex;toast("已应用到清单「"+l.name+"」🎨");renderAll();return;}
    const h=state.habits.find(x=>x.id===t);if(h){h.color=c.hex;toast("已应用到习惯「"+h.name+"」🎨");renderHabit();return;}
  });
}
function pickApplyTarget(cb){
  const ov=document.createElement("div");ov.className="mask show";
  ov.innerHTML=`<div class="modal show" style="max-width:420px"><h3>📌 应用到…</h3><div id="pl"></div><div class="modal-btns"><span class="flex1"></span><button id="plCancel">取消</button></div></div>`;
  document.body.appendChild(ov);
  const pl=ov.querySelector("#pl");
  const mk=(label,val)=>{const b=document.createElement("button");b.className="set-btn";b.style.marginBottom="8px";b.textContent=label;b.onclick=()=>{ov.remove();cb(val);};pl.appendChild(b);};
  state.lists.forEach(l=>mk(l.emoji+" "+l.name,l.id));
  state.habits.forEach(h=>mk(h.emoji+" "+h.name,h.id));
  mk("🏷️ 任务标签","__tag");
  ov.querySelector("#plCancel").onclick=()=>ov.remove();
  ov.addEventListener("click",e=>{if(e.target===ov)ov.remove();});
}
/* 新建颜色 */
$("#addColorBtn").addEventListener("click",()=>{const f=$("#colorForm");f.hidden=!f.hidden;});
$("#cfHex").addEventListener("input",e=>{$("#cfVal").value=e.target.value;});
$("#cfVal").addEventListener("input",e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value))$("#cfHex").value=e.target.value;});
$("#cfSave").addEventListener("click",()=>{
  const hex=$("#cfVal").value.trim();const name=$("#cfName").value.trim();
  if(!/^#[0-9a-fA-F]{6}$/.test(hex)){toast("颜色值格式应为 #RRGGBB");return;}
  state.palette.colors.push({hex:hex.toUpperCase(),name:name||hex.toUpperCase()});
  save();renderPaletteFav();$("#cfName").value="";$("#colorForm").hidden=true;toast("颜色已创建 🎨");
});
/* 照片取色 */
$("#pickPhotoBtn").addEventListener("click",()=>$("#palettePhoto").click());
$("#palettePhoto").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;
  const img=new Image();img.onload=()=>{
    const out=extractColors(img);
    const box=$("#extractOut");
    box.innerHTML=`<div class="extracted">${out.map(o=>`<div class="ex"><div class="d" style="background:${o.hex}"></div>${o.hex}</div>`).join("")}</div>
      <button class="set-btn" id="saveExtract" style="margin-top:10px">❤️ 全部收藏</button>`;
    box.querySelector("#saveExtract").addEventListener("click",()=>{
      out.forEach(o=>{if(!state.palette.colors.some(c=>c.hex===o.hex))state.palette.colors.push({hex:o.hex,name:o.hex});});
      save();renderPaletteFav();toast("已收藏 "+out.length+" 个颜色 ❤️");
    });
  };
  img.src=URL.createObjectURL(f);e.target.value="";
});
function extractColors(img){
  const c=document.createElement("canvas");const max=140;
  const s=Math.min(max/img.naturalWidth,max/img.naturalHeight,1);
  c.width=Math.max(1,Math.round(img.naturalWidth*s));c.height=Math.max(1,Math.round(img.naturalHeight*s));
  const ctx=c.getContext("2d");ctx.drawImage(img,0,0,c.width,c.height);
  const d=ctx.getImageData(0,0,c.width,c.height).data;const map={};
  for(let i=0;i<d.length;i+=4){
    const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];if(a<125)continue;
    const key=`${r>>4},${g>>4},${b>>4}`;
    if(!map[key])map[key]={r,g,b,n:0};map[key].n++;
  }
  return Object.values(map).sort((a,b)=>b.n-a.n).slice(0,6).map(o=>({hex:rgbHex(o.r,o.g,o.b)}));
}
function rgbHex(r,g,b){return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();}
/* 云同步（可插拔后端） */
$("#paletteSync").addEventListener("click",()=>{
  if(!CONFIG.API_BASE){toast("未配置同步后端 · 当前仅本机保存");return;}
  fetch(CONFIG.API_BASE+"/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({palette:state.palette})})
    .then(r=>r.ok?toast("已同步到云端 ☁️"):toast("同步失败")).catch(()=>toast("同步失败，检查网络/后端"));
});
$("#inspireRefresh").addEventListener("click",()=>{inspireOffset=(inspireOffset+7)%INSPIRE_PALETTES.length;renderInspireStream();});
$("#openPalette").addEventListener("click",()=>openExtra("palettePage"));

/* ═══════════ 渲染接入（包装现有 render） ═══════════ */
const _renderReview=window.renderReview;
window.renderReview=function(){
  $$("#revModes button").forEach(b=>b.classList.toggle("active",(b.dataset.m===(state.revMode||"data"))));
  const journal=(state.revMode||"data")==="journal";
  $("#dataView").hidden=journal;
  $("#journalView").hidden=!journal;
  if(journal){renderJournal();}
  else{_renderReview();renderMoodCharts();}
  renderAnnualEntry();
  applyEmoji();
};
$$("#revModes button").forEach(b=>b.addEventListener("click",()=>{state.revMode=b.dataset.m;save();window.renderReview();}));

const _renderHabit=window.renderHabit;
window.renderHabit=function(){_renderHabit();if(habitTab==="main")renderMoodPicker();applyEmoji();};

const _renderAll=window.renderAll;
window.renderAll=function(){_renderAll();applyEmoji();};

/* ═══════════ emoji 图片层（非苹果设备）：applyEmoji 已统一在 app.js 定义 ═══════════ */
window.addEventListener("load",applyEmoji);

/* 启动：刷新当前页以应用新模块 */
if(window.renderAll)window.renderAll();
