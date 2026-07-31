/* ═══════════ 计划册 v22 · 五大新增功能（调色盘 / 情绪标签 / 每日手帐 / 灵感收集箱 / 年度回顾） ═══════════
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
if(!state.palette.favs)state.palette.favs=[];
if(!state.palette.colors)state.palette.colors=[];
if(!state.palette.diary)state.palette.diary=[];
/* v17：配色日记每天仅一条（老数据去重，保留每天最新一条）+ keywords 字段兜底 */
(function(){
  const seen={},out=[];
  (state.palette.diary||[]).forEach(d=>{
    if(!d||!d.date)return;
    if(seen[d.date])return;
    seen[d.date]=1;
    if(!Array.isArray(d.keywords))d.keywords=[];
    out.push(d);
  });
  state.palette.diary=out;
})();
if(state.palette.dailyEmotion===undefined)state.palette.dailyEmotion=null;
if(state.palette.dailyMood===undefined)state.palette.dailyMood=null;
if(!state.palette.seasonSeen)state.palette.seasonSeen={};
if(!state.inspirations)state.inspirations=[];
if(!state.annual)state.annual={};

/* ═══════════ 通用：深层页打开/关闭 ═══════════ */
function maybeSeasonPrompt(){
  const s=seasonNow();
  if(!state.palette.seasonSeen[s]){state.palette.seasonSeen[s]=true;save();
    setTimeout(()=>toast("🌸 "+seasonName(s)+"限定配色已上线，去「灵感补给 · 季节限定」看看 →"),400);}
}
function openExtra(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.hidden=false;el.scrollTop=0;
  if(id==="palettePage"){renderPalette();maybeSeasonPrompt();}
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
let currentInspireTab="hot";

/* ── 季节 / 时段 / 星期 工具 ── */
function seasonNow(){const m=new Date().getMonth()+1;if(m>=3&&m<=5)return"spring";if(m>=6&&m<=8)return"summer";if(m>=9&&m<=11)return"autumn";return"winter";}
function seasonName(s){return{spring:"春日",summer:"夏日",autumn:"秋日",winter:"冬日"}[s]||s;}
function periodNow(){const h=new Date().getHours();if(h<11)return"morning";if(h<18)return"afternoon";return"evening";}
function nextSeasonBound(){const now=new Date(),y=now.getFullYear();const b=[[3,20],[6,21],[9,23],[12,22]];for(const m of b){const dt=new Date(y,m[0]-1,m[1]);if(dt>now)return dt;}return new Date(y+1,2,20);}
function seasonRemainingDays(){return Math.max(0,Math.ceil((nextSeasonBound()-new Date())/864e5));}

/* ── 模块一：今日色彩情绪 ── */
const DAILY_POOL=[
 {season:"spring",period:"morning",name:"樱花薄荷",colors:["#FCD2D3","#CAE691","#D9EEFF","#FFF8F0","#B8AEEB"],names:["樱花粉","新芽绿","海盐蓝","奶油白","薰衣草"]},
 {season:"spring",period:"afternoon",name:"清新鹅黄",colors:["#FAE69E","#D6F5E8","#88D8DB","#FFFDF5","#F2A7DA"],names:["鹅黄","青柠绿","薄荷蓝","奶白","蜜桃粉"]},
 {season:"summer",period:"morning",name:"青柠汽水",colors:["#D6F5E8","#D9EEFF","#88D8DB","#FFE8B3","#FF6B6B"],names:["青柠绿","海盐蓝","薄荷绿","阳光黄","西瓜红"]},
 {season:"summer",period:"afternoon",name:"海风微咸",colors:["#D9EEFF","#88D8DB","#71B7ED","#FFFDF5","#6FC2A8"],names:["海盐蓝","薄荷绿","湖蓝","奶白","马卡龙绿"]},
 {season:"summer",period:"evening",name:"晚霞蜜橘",colors:["#FFE8B3","#F2B56F","#F2A7DA","#FFF8F0","#E08A6E"],names:["暖阳黄","焦糖橘","蜜桃粉","奶油白","落日橘"]},
 {season:"autumn",period:"morning",name:"秋日暖阳",colors:["#F2B56F","#FAE69E","#8D6E63","#FFE0D6","#FFF8F0"],names:["枫叶橘","桂花黄","焦糖棕","杏色","奶油白"]},
 {season:"autumn",period:"afternoon",name:"桂花拿铁",colors:["#E9D8A6","#D9B89A","#B07D56","#F3E7DB","#8D6E63"],names:["桂花黄","燕麦","焦糖棕","拿铁","深棕"]},
 {season:"autumn",period:"evening",name:"暮色暖茶",colors:["#E8DFF5","#F2B56F","#8D6E63","#FFE0D6","#D5CFC5"],names:["豆沙粉","焦糖橘","热可可","杏色","暖灰"]},
 {season:"winter",period:"morning",name:"冬日暖茶",colors:["#FFF8F0","#8D6E63","#E8DFF5","#D5CFC5","#FFE0D6"],names:["落雪白","热可可","豆沙粉","暖灰","暖杏"]},
 {season:"winter",period:"afternoon",name:"雾蓝毛衣",colors:["#E6E9EC","#C2CCD2","#8FA3AD","#B8AEEB","#FFF8F0"],names:["雾白","雾蓝","灰蓝","薰衣草","雪白"]},
 {season:"winter",period:"evening",name:"炉火暖橙",colors:["#F3E7DB","#E08A6E","#F2B56F","#8D6E63","#FFF8F0"],names:["暖陶","落日橘","焦糖橘","深棕","奶白"]},
 {season:null,period:"morning",name:"清晨唤醒",colors:["#FAE69E","#D9EEFF","#88D8DB","#FFFDF5","#F2B56F"],names:["晨光黄","海盐蓝","薄荷绿","奶白","蜜橘"]},
 {season:null,period:"afternoon",name:"专注中性",colors:["#D5CFC5","#B8AEAB","#A99B95","#F5F0EB","#88D8DB"],names:["暖灰","莫兰迪","灰紫","米白","薄荷"]},
 {season:null,period:"evening",name:"夜色温柔",colors:["#E8DFF5","#B8AEEB","#F2A7DA","#FFF8F0","#8FA3AD"],names:["柔紫","薰衣草","蜜桃粉","奶白","雾蓝"]},
 {season:null,period:null,name:"治愈薄荷",colors:["#D6F5E8","#88D8DB","#D9EEFF","#FFF8F0","#6FC2A8"],names:["薄荷绿","湖蓝","海盐蓝","奶白","马卡龙绿"]},
 {season:null,period:null,name:"奶油蜜桃",colors:["#FFFDF5","#F6E7D8","#F2B56F","#B8AEEB","#88D8DB"],names:["奶白","蜜桃","焦糖橘","薰衣草","薄荷"]}
];
function dailyGreeting(){
  const p=periodNow(),s=seasonNow(),w=DAY_NAMES[(new Date().getDay()+6)%7];
  const sea={spring:"万物生长的",summer:"清清凉凉的",autumn:"温柔暖意的",winter:"柔软治愈的"}[s];
  const per={morning:"早安",afternoon:"下午好",evening:"夜深了"}[p];
  const wd={周一:"新的周一",周三:"周三",周五:"周五",周日:"周末"}[w]||w;
  return per+"～今天是"+wd+"，用一抹"+sea+"色彩，给自己一点小确幸吧 🌿";
}
function genDailyPalettes(){
  const s=seasonNow(),p=periodNow();
  let pool=DAILY_POOL.filter(x=>(!x.season||x.season===s)&&(!x.period||x.period===p));
  if(pool.length<4)pool=pool.concat(DAILY_POOL.filter(x=>(!x.season||x.season===s)));
  if(pool.length<4)pool=pool.concat(DAILY_POOL);
  const seed=parseInt(fmtDate(new Date()).replace(/-/g,""),10);
  const out=[],seen=new Set();
  for(let k=0;k<DAILY_POOL.length*3&&out.length<4;k++){
    const idx=(seed+k)%pool.length;
    if(seen.has(idx))continue;seen.add(idx);out.push(pool[idx]);
  }
  return out.slice(0,4);
}
function renderDaily(){
  const box=$("#palDaily");if(!box)return;
  const today=fmtDate(new Date());
  if(!state.palette.dailyEmotion||state.palette.dailyEmotion.date!==today){
    state.palette.dailyEmotion={date:today,idx:0,palettes:genDailyPalettes(),greeting:dailyGreeting()};
    save();
  }
  const de=state.palette.dailyEmotion;
  const cur=de.palettes[de.idx]||de.palettes[0];
  box.innerHTML=`
    <div class="pd-greet">🌸 今日色彩情绪</div>
    <div style="font-size:13px;color:var(--ink-soft);line-height:1.7;margin-bottom:12px">${de.greeting}</div>
    <div class="pd-cards">${cur.colors.map(c=>`<div class="pd-card"><div class="pd-sw" style="background:${c}"></div></div>`).join("")}</div>
    <div style="font-size:11.5px;color:var(--ink-soft);text-align:center;margin-top:8px">${cur.names.join(" · ")}</div>
    <div class="pd-acts">
      <button class="pd-use" id="pdUse">💜 使用这套配色</button>
      <button id="pdSwap">🔄 换一组</button>
      <button id="pdMood">💬 记录心情</button>
    </div>
    <div class="pd-alt" id="pdAlt">${de.palettes.slice(1,4).map((pp,i)=>`
      <div class="pd-alt-card"><div class="pd-sw-row">${pp.colors.map(c=>`<span style="background:${c}"></span>`).join("")}</div>
      <div class="pd-alt-name">${pp.name}</div>
      <button class="pd-alt-use" data-alt="${i+1}">使用</button></div>`).join("")}</div>`;
  box.querySelector("#pdUse").onclick=()=>applyPaletteToTheme(cur.colors,cur.name,cur.names);
  box.querySelector("#pdSwap").onclick=()=>{const a=box.querySelector("#pdAlt");a.classList.toggle("show");};
  box.querySelectorAll(".pd-alt-use").forEach(b=>b.onclick=()=>{const pp=de.palettes[+b.dataset.alt];applyPaletteToTheme(pp.colors,pp.name,pp.names);});
  box.querySelector("#pdMood").onclick=openMoodModal;
}
/* 一键应用：全局主色 + 自动生成配色日记（v17：真正全局应用） */
function applyPaletteToTheme(colors,name,names){
  state.settings.accent=(colors&&colors[0])||"#A99B95";
  applyAccent();
  addDiary(colors,name||"今日配色",["清单","打卡","周计划","图表"],names);
  renderSettings();renderDiaryPrev();
  if(typeof renderHabit==="function"){try{renderHabit();}catch(e){}}
  save();
  toast("✅ 配色已应用到全局");
}
/* 自动记录配色日记（v17：每天仅一条，当天重复应用则覆盖更新） */
function addDiary(colors,name,scope,names){
  if(!state.palette.diary)state.palette.diary=[];
  const now=new Date();
  const d=fmtDate(now);
  const t=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
  const cols=(colors||[]).slice(0,5);
  const nms=(names&&names.slice)?names.slice(0,5):cols.slice();
  const exist=state.palette.diary.find(x=>x.date===d);
  if(exist){ /* 覆盖更新当天条目（保留用户已写的备注/关键词） */
    exist.time=t;exist.name=name||exist.name||"我的配色";
    exist.colors=cols;exist.names=nms;exist.scope=scope||exist.scope||["清单"];
    if(!Array.isArray(exist.keywords))exist.keywords=[];
    if(!exist.mood)exist.mood=state.palette.dailyMood||"";
  }else{
    state.palette.diary.unshift({date:d,time:t,name:name||"我的配色",colors:cols,names:nms,scope:scope||["清单"],mood:state.palette.dailyMood||"",keywords:[]});
  }
  if(state.palette.diary.length>200)state.palette.diary.length=200;
}
/* v17：日记条目可编辑表单（预览卡 + 完整页共用） */
const DIARY_SCOPES=["清单","打卡","周计划","图表"];
function diaryFormHTML(d,pfx){
  const kw=(d.keywords||[]).join("、");
  return `
    <div class="dp-field"><span class="lbl">🎨 配色名称</span><input class="val edit" id="${pfx}Name" type="text" maxlength="20" value="${esc(d.name||"")}" placeholder="给这套配色起个名字" style="border:0;background:transparent;font-size:12.5px;color:var(--ink);outline:none;border-bottom:1px dashed var(--line)"></div>
    <div class="dp-field"><span class="lbl">💬 心情备注</span><input class="val edit" id="${pfx}Mood" type="text" maxlength="60" value="${esc(d.mood||"")}" placeholder="今天的小心情…" style="border:0;background:transparent;font-size:12.5px;color:var(--ink);outline:none;border-bottom:1px dashed var(--line)"></div>
    <div class="dp-field"><span class="lbl">🔖 关键词</span><input class="val edit" id="${pfx}Kw" type="text" value="${esc(kw)}" placeholder="1-3 个，用、分隔（如：治愈、温柔）" style="border:0;background:transparent;font-size:12.5px;color:var(--ink);outline:none;border-bottom:1px dashed var(--line)"></div>
    <div class="dp-scopes" id="${pfx}Scopes">${DIARY_SCOPES.map(s=>`<label><input type="checkbox" value="${s}"${(d.scope||[]).includes(s)?" checked":""}>${s}</label>`).join("")}</div>
    <button class="dp-save" id="${pfx}Save">💾 保存</button>`;
}
function bindDiaryForm(box,d,pfx,after){
  const btn=box.querySelector("#"+pfx+"Save");if(!btn)return;
  btn.addEventListener("click",()=>{
    d.name=(box.querySelector("#"+pfx+"Name").value.trim()||"我的配色");
    d.mood=box.querySelector("#"+pfx+"Mood").value.trim();
    let kws=box.querySelector("#"+pfx+"Kw").value.split(/[、,，\s]+/).map(x=>x.trim()).filter(Boolean);
    if(kws.length>3){kws=kws.slice(0,3);toast("关键词最多 3 个，已保留前 3 个");}
    d.keywords=kws;
    d.scope=[...box.querySelectorAll("#"+pfx+"Scopes input:checked")].map(i=>i.value);
    save();toast("已保存配色日记 💾");
    if(after)after();
  });
}

/* ── 模块二：配色日记 ── */
function renderDiaryPrev(){
  const box=$("#palDiaryPrev");if(!box)return;
  const list=state.palette.diary||[];
  if(!list.length){box.innerHTML=`<div class="dp-head"><b>📖 配色日记</b><span class="dp-more">查看全部 →</span></div><div class="dp-empty">还没有配色记录，应用一套配色后会自动生成 📝（每天仅一条，当天重复应用会覆盖更新）</div>`;return;}
  const today=fmtDate(new Date());
  const d=list.find(x=>x.date===today)||list[0];
  box.innerHTML=`<div class="dp-head"><b>📖 配色日记</b><span class="dp-more">查看全部 →</span></div>
    <div class="dp-when">${d.date} ${d.time||""}${d.date===today?" · 今天":""}</div>
    <div class="dp-cards">${d.colors.map(c=>`<span style="background:${c}"></span>`).join("")}</div>
    <div class="dp-names">${esc((d.names||d.colors).join(" · "))}</div>
    ${(d.keywords&&d.keywords.length)?`<div class="dp-kws" style="margin-top:6px">${d.keywords.map(k=>`<span class="dp-kw">${esc(k)}</span>`).join("")}</div>`:""}
    ${diaryFormHTML(d,"dpv")}`;
  /* 阻止表单区域点击冒泡到「查看全部」 */
  box.querySelectorAll("input,button,.dp-scopes").forEach(el=>el.addEventListener("click",e=>e.stopPropagation()));
  bindDiaryForm(box,d,"dpv",()=>{renderDiaryPrev();});
}
function openDiary(){
  const page=$("#diaryPage");if(!page)return;
  page.hidden=false;page.scrollTop=0;renderDiary();applyEmoji();
}
let diaryOpenDate=null; /* v17：当前展开详情的日期 */
function renderDiary(){
  const body=$("#diaryBody");if(!body)return;
  const diary=state.palette.diary||[];
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const days=new Date(y,m+1,0).getDate();
  const wd0=new Date(y,m,1).getDay();
  const mark={};diary.forEach(d=>{mark[d.date]=d.colors[0];});
  let cal=`<div class="diary-cal">`;
  ["日","一","二","三","四","五","六"].forEach(x=>cal+=`<div class="dc-h">${x}</div>`);
  for(let i=0;i<wd0;i++)cal+=`<div></div>`;
  for(let d=1;d<=days;d++){
    const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const has=mark[ds];
    cal+=`<div class="dc${has?" has":""}${d===now.getDate()?" today":""}${diaryOpenDate===ds?" sel":""}"${has?` data-ds="${ds}" style="--dcolor:${mark[ds]}"`:""}>${d}</div>`;
  }
  cal+=`</div>`;
  let html=`<div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:4px">● 有配色记录的日子 · 点日期展开详情（每天仅一条）</div>${cal}`;
  /* 点选日期 → 展开当天详情（可编辑） */
  if(diaryOpenDate){
    const idx=diary.findIndex(x=>x.date===diaryOpenDate);
    if(idx>=0){
      const d=diary[idx];
      html+=`<div class="diary-detail">
        <div class="de-when"><span>📅 ${d.date} ${d.time||""}</span></div>
        <div class="de-cards">${d.colors.map(c=>`<span style="background:${c}"></span>`).join("")}</div>
        <div class="de-names">${esc((d.names||d.colors).join(" · "))}</div>
        ${diaryFormHTML(d,"dd")}
        <button class="set-btn" id="ddDel" style="margin-top:8px;color:var(--red)">🗑 删除这一天的日记</button>
      </div>`;
    }
  }
  if(!diary.length)html+=`<div class="dp-empty" style="padding:20px">还没有配色日记，应用配色会自动记录 ✨</div>`;
  diary.forEach((d,i)=>{
    html+=`<div class="diary-entry" data-i="${i}" data-ds="${d.date}">
      <div class="de-when"><span>${d.date} ${d.time||""}</span>${d.mood?"💬":""}</div>
      <div class="de-cards">${d.colors.map(c=>`<span style="background:${c}"></span>`).join("")}</div>
      <div class="de-name">${esc(d.name||"我的配色")}</div>
      <div class="de-names">${esc((d.names||d.colors).join(" · "))}</div>
      ${(d.keywords&&d.keywords.length)?`<div class="dp-kws" style="margin-top:5px">${d.keywords.map(k=>`<span class="dp-kw">${esc(k)}</span>`).join("")}</div>`:""}
      ${d.scope&&d.scope.length?`<div class="de-scope">📍 ${esc(d.scope.join(" · "))}</div>`:""}
      ${d.mood?`<div class="de-mood">💬 “${esc(d.mood)}”</div>`:""}
    </div>`;
  });
  body.innerHTML=html;
  /* 月历点击展开 */
  body.querySelectorAll(".dc.has").forEach(el=>el.addEventListener("click",()=>{
    diaryOpenDate=(diaryOpenDate===el.dataset.ds)?null:el.dataset.ds;
    renderDiary();
    const det=body.querySelector(".diary-detail");if(det&&det.scrollIntoView)det.scrollIntoView({behavior:"smooth",block:"nearest"});
  }));
  /* 详情表单绑定 */
  if(diaryOpenDate){
    const d=diary.find(x=>x.date===diaryOpenDate);
    if(d){
      bindDiaryForm(body,d,"dd",()=>{renderDiary();renderDiaryPrev();});
      const del=body.querySelector("#ddDel");
      if(del)del.addEventListener("click",()=>{
        const i=state.palette.diary.findIndex(x=>x.date===diaryOpenDate);
        if(i>=0)state.palette.diary.splice(i,1);
        diaryOpenDate=null;save();renderDiary();renderDiaryPrev();toast("已删除该日记 🗑");
      });
    }
  }
  /* 列表：点条目也展开该日详情；长按/右键菜单保留 */
  body.querySelectorAll(".diary-entry").forEach(el=>{
    el.addEventListener("click",()=>{
      diaryOpenDate=(diaryOpenDate===el.dataset.ds)?null:el.dataset.ds;
      renderDiary();
      const det=body.querySelector(".diary-detail");if(det&&det.scrollIntoView)det.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
    el.addEventListener("contextmenu",e=>{e.preventDefault();openDiaryMenu(+el.dataset.i,e.clientX,e.clientY);});
  });
}
function openDiaryMenu(i,x,y){
  closeDiaryMenu();
  const d=state.palette.diary[i];if(!d)return;
  const m=document.createElement("div");m.className="tc-menu show";m.id="diaryMenu";
  m.innerHTML=`<button data-act="note">✏️ 编辑备注</button>
    <button data-act="fav">❤️ 收藏此配色</button>
    <button data-act="del" class="danger">🗑 删除此条</button>`;
  document.body.appendChild(m);
  m.style.left=Math.min(x,window.innerWidth-(m.offsetWidth||160)-8)+"px";
  m.style.top=Math.min(y,window.innerHeight-(m.offsetHeight||130)-8)+"px";
  m.querySelector('[data-act=note]').onclick=()=>{const v=prompt("心情备注：",d.mood||"");if(v!=null){d.mood=v;save();renderDiary();renderDiaryPrev();}closeDiaryMenu();};
  m.querySelector('[data-act=fav]').onclick=()=>{if(!state.palette.favs.some(f=>f.name===d.name)){state.palette.favs.push({name:d.name,src:"配色日记",colors:d.colors.slice()});save();renderPaletteFav();toast("已收藏到「我的收藏」❤️");}closeDiaryMenu();};
  m.querySelector('[data-act=del]').onclick=()=>{state.palette.diary.splice(i,1);save();renderDiary();renderDiaryPrev();closeDiaryMenu();};
  setTimeout(()=>document.addEventListener("click",function once(e){if(e.target.closest&&e.target.closest(".tc-menu"))return;closeDiaryMenu();document.removeEventListener("click",once);}),0);
}
function closeDiaryMenu(){const m=$("#diaryMenu");if(m)m.remove();}

/* ── 模块三：灵感补给（分类 + 季节限定） ── */
const SEASON_CARDS={
  spring:[{name:"樱花物语",colors:["#FCD2D3","#CAE691","#FAE69E","#B8AEAB","#FFF8F0"],names:["樱花粉","新芽绿","淡鹅黄","雾霾蓝","奶油白"]},
          {name:"春日野餐",colors:["#FFF6D9","#CFE3C0","#9CC08A","#F2D9B0","#F2A7DA"],names:["鹅黄","嫩绿","草绿","杏色","蜜桃粉"]}],
  summer:[{name:"青柠汽水",colors:["#D6F5E8","#D9EEFF","#FF6B6B","#88D8DB","#FFE8B3"],names:["青柠绿","海盐蓝","西瓜红","薄荷绿","阳光黄"]},
          {name:"海边假日",colors:["#D9EEFF","#71B7ED","#88D8DB","#FFFDF5","#6FC2A8"],names:["海盐蓝","湖蓝","薄荷绿","奶白","马卡龙绿"]}],
  autumn:[{name:"秋日暖阳",colors:["#F2B56F","#FAE69E","#8D6E63","#FFE0D6","#FFF8F0"],names:["枫叶橘","桂花黄","焦糖棕","杏色","奶油白"]},
          {name:"桂花拿铁",colors:["#E9D8A6","#D9B89A","#B07D56","#F3E7DB","#8D6E63"],names:["桂花黄","燕麦","焦糖棕","拿铁","深棕"]}],
  winter:[{name:"冬日暖茶",colors:["#FFF8F0","#8D6E63","#E8DFF5","#D5CFC5","#FFE0D6"],names:["落雪白","热可可","豆沙粉","暖灰","暖杏"]},
          {name:"落雪黄昏",colors:["#E6E9EC","#C2CCD2","#8FA3AD","#B8AEEB","#D5CFC5"],names:["雾白","雾蓝","灰蓝","薰衣草","暖灰"]}]
};
function seasonCards(){
  const s=seasonNow();
  return (SEASON_CARDS[s]||[]).map(c=>({name:c.name,colors:c.colors,names:c.names,src:"🌸 季节限定 · "+seasonName(s),seasonTag:"🌸 "+seasonName(s)+"限定"}));
}
function isFaved(p){return state.palette.favs.some(f=>f.name===p.name);}
function toggleFav(p){
  if(isFaved(p)){state.palette.favs=state.palette.favs.filter(f=>f.name!==p.name);}
  else{state.palette.favs.push({name:p.name,src:p.src,colors:p.colors.slice()});}
  save();renderInspireStream();renderPaletteFav();toast(isFaved(p)?"已取消收藏":"已收藏到「我的收藏」❤️");
}

/* ── 模块四：我的收藏 → 搭配推荐 ── */
function openPair(hex,name){
  const page=$("#pairPage");if(!page)return;
  $("#pairTitle").textContent="🎨 你选择了「"+(name||hex)+"」";
  const schemes=buildSchemes(hex);
  const body=$("#pairBody");
  body.innerHTML=schemes.map((sc,i)=>`
    <div class="pair-scheme">
      <div class="ps-name">${esc(sc.name)}</div>
      <div class="ps-sw">${sc.colors.map(c=>`<span style="background:${c}"></span>`).join("")}</div>
      <div class="ps-names">${esc(sc.colors.join(" · "))}</div>
      <div class="ps-acts">
        <button class="ps-prev" data-i="${i}">👀 预览效果</button>
        <button class="ps-apply" data-i="${i}">💜 一键应用</button>
      </div>
    </div>`).join("");
  body.querySelectorAll(".ps-prev").forEach(b=>b.onclick=()=>openPrev(schemes[+b.dataset.i],name));
  body.querySelectorAll(".ps-apply").forEach(b=>b.onclick=()=>{const sc=schemes[+b.dataset.i];applyPaletteToTheme(sc.colors,name+" · "+sc.name.split(" ")[0],sc.colors);page.hidden=true;});
  page.hidden=false;page.scrollTop=0;applyEmoji();
}
function buildSchemes(hex){
  const {h,s,l}=hexToHsl(hex);const S=Math.max(s,46),L=Math.max(44,Math.min(72,l));
  const mk=(hh,ss,ll)=>hslToHex((hh%360+360)%360,Math.max(20,Math.min(86,ss)),Math.max(28,Math.min(88,ll)));
  const A=[hex,mk(h-34,S,L),mk(h+34,S,L),mk(h-12,Math.min(S,30),Math.min(90,L+18)),mk(h+20,Math.max(S,55),Math.max(34,L-18))];
  const C=[hex,mk(h+180,S,L),mk(h+180,Math.min(S,30),Math.min(90,L+16)),mk(h+160,S,L-10),mk(h+200,Math.max(S,55),L-16)];
  const T=[hex,mk(h+120,S,L),mk(h+240,S,L),mk(h+120,Math.min(S,30),Math.min(90,L+16)),mk(h+240,Math.max(S,55),L-16)];
  return [{name:"方案A · 邻近色（和谐统一）",colors:A},{name:"方案B · 互补色（视觉冲击）",colors:C},{name:"方案C · 三角色（层次丰富）",colors:T}];
}
function closePair(){$("#pairPage").hidden=true;}
function openPrev(scheme,baseName){
  const ov=document.createElement("div");ov.className="mask show";
  ov.innerHTML=`<div class="modal show" style="max-width:420px"><h3>👀 预览效果 · ${esc(baseName||"")}</h3>
    <div class="prev-preview">
      <div class="prev-block prev-mini-list">
        <div class="pb-t">清单分类</div>
        ${scheme.colors.map((c,i)=>`<div class="pb-row"><span class="pb-dot" style="background:${c}"></span>${["工作","个人成长","健康养生","学习","其他"][i]||("项目"+(i+1))}</div>`).join("")}
      </div>
      <div class="prev-block"><div class="pb-t">打卡月历</div>
        <div class="prev-mini-cal">${Array.from({length:28},(_,k)=>`<span style="background:${scheme.colors[k%5]}"></span>`).join("")}</div>
      </div>
    </div>
    <div class="modal-btns"><span class="flex1"></span><button id="pvApply" class="primary">💜 一键应用</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#pvApply").onclick=()=>{applyPaletteToTheme(scheme.colors,baseName+" · 预览配色",scheme.colors);ov.remove();closePair();};
  ov.addEventListener("click",e=>{if(e.target===ov)ov.remove();});
}

/* ── 模块五：记录心情 ── */
function openMoodModal(){
  const ov=document.createElement("div");ov.className="mask show";
  ov.innerHTML=`<div class="modal show" style="max-width:420px"><h3>💬 记录今天的心情</h3>
    <textarea id="moodTa" rows="3" placeholder="例如：今天有点累，但看到蓝色就平静了">${esc(state.palette.dailyMood||"")}</textarea>
    <div class="modal-btns"><span class="flex1"></span><button id="moodCancel" class="modal-cancel">取消</button><button id="moodSave" class="primary">保存</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#moodCancel").onclick=()=>ov.remove();
  ov.querySelector("#moodSave").onclick=()=>{
    const v=ov.querySelector("#moodTa").value.trim();state.palette.dailyMood=v;
    const list=state.palette.diary||[];if(list.length&&list[0].date===fmtDate(new Date()))list[0].mood=v;
    save();ov.remove();toast("已记录心情 💬");renderDaily();renderDiaryPrev();
  };
  ov.addEventListener("click",e=>{if(e.target===ov)ov.remove();});
}

function renderInspireStream(){
  const box=$("#inspireStream");if(!box)return;
  box.innerHTML="";
  INSPIRE_HOT5.forEach((p,idx)=>{
    const faved=isFaved(p);
    const on=state.settings.scheme===p.key;
    const card=document.createElement("div");card.className="icard";
    card.innerHTML=`
      <div class="swatches-row">${p.colors.map(c=>`<div class="sw" style="background:${c}"></div>`).join("")}</div>
      <div class="hexes">${p.colors.map(c=>`<span class="hex">${c.toUpperCase()}</span>`).join("")}</div>
      <div class="icard-foot"><span class="src">${esc(p.name)}</span><button class="fav${faved?" on":""}" data-i="${idx}">${faved?"❤️":"🤍"}</button></div>
      <button class="ins-apply" data-key="${p.key}">💜 一键应用${on?" · 已应用":""}</button>`;
    card.querySelector(".fav").addEventListener("click",()=>toggleFav(p));
    card.querySelector(".ins-apply").addEventListener("click",()=>{
      state.settings.scheme=p.key;state.settings.accent=null;applyScheme(p.key);save();renderInspireStream();toast("主题已切换 🎨");
    });
    box.appendChild(card);
  });
}
function renderPaletteFav(){
  const grid=$("#favGrid"),cnt=$("#favCount");
  const favs=(state.palette.favs||[]).map((f,i)=>({hex:f.colors[0],name:f.name,src:"fav",idx:i}));
  const cols=(state.palette.colors||[]).map((c,i)=>({hex:c.hex,name:c.name||c.hex,src:"col",idx:i}));
  const all=favs.concat(cols);
  if(cnt)cnt.textContent="共 "+all.length+" 个颜色";
  if(!grid)return;
  if(!all.length){grid.innerHTML=`<div class="fav-empty">还没有收藏的颜色，去「灵感补给」点 ❤️，或点「➕ 新建颜色」</div>`;return;}
  grid.innerHTML=all.map(c=>`
    <div class="fav-cell" data-hex="${c.hex}" data-name="${esc(c.name)}" data-src="${c.src}" data-idx="${c.idx}">
      <div class="fc-sw" style="background:${c.hex}"></div>
      <div class="fc-name">${esc(c.name)}</div>
      <button class="fc-act" title="移除">✕</button>
    </div>`).join("");
  grid.querySelectorAll(".fav-cell").forEach(cell=>{
    const hex=cell.dataset.hex,name=cell.dataset.name,src=cell.dataset.src,idx=+cell.dataset.idx;
    cell.addEventListener("click",e=>{if(e.target.closest(".fc-act"))return;openPair(hex,name);});
    cell.querySelector(".fc-act").addEventListener("click",e=>{e.stopPropagation();
      if(src==="fav")state.palette.favs.splice(idx,1);else state.palette.colors.splice(idx,1);
      save();renderPaletteFav();toast("已移除");});
  });
}
function renderPalette(){
  renderDaily();
  renderDiaryPrev();
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
/* 云同步已统一迁移到 sync.js（全量 state 同步 + 离线队列 + LWW）。
   此处不再单独绑定 paletteSync，避免与 sync.js 重复触发。 */
/* 灵感补给：固定展示全网热门 5 套成套配色（见 renderInspireStream），tab 切换已移除 */
/* 配色日记预览 → 完整页 */
$("#palDiaryPrev").addEventListener("click",openDiary);
/* 子页返回 */
$("#diaryBack").addEventListener("click",()=>{$("#diaryPage").hidden=true;});
$("#pairBack").addEventListener("click",closePair);
/* 照片取色（我的收藏内） */
$("#pickPhotoBtn2").addEventListener("click",()=>$("#palettePhoto").click());
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
