/* ═══════ 灵感专区 · 交互逻辑 ═══════
 * 完全自包含，不依赖平台 app.js / plus.js，零耦合。
 * 图片以 dataURL 存入 IndexedDB，脱离系统相册。
 */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtTime(ts) {
    var d = new Date(ts), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function readImage(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsDataURL(file);
    });
  }
  var toastTimer;
  function toast(msg) {
    var t = $("#insToast");
    t.textContent = msg;
    t.hidden = false;
    t.classList.remove("hide");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add("hide"); setTimeout(function () { t.hidden = true; }, 320); }, 1800);
  }

  /* ── 状态 ── */
  var notes = [];                 // 全部笔记（含回收站）
  var state = { cat: "all", q: "", tags: [] };
  var edit = { id: null, cat: null, images: [], tags: [], draft: false };
  var confirmCb = null;

  /* ── 渲染瀑布流 ── */
  function activeNotes() {
    return notes.filter(function (n) { return !n.deleted; });
  }
  function matchFilter(n) {
    if (state.cat !== "all" && n.category !== state.cat) return false;
    if (state.tags.length) {
      var hit = n.tags && n.tags.some(function (t) { return state.tags.indexOf(t) >= 0; });
      if (!hit) return false;
    }
    if (state.q) {
      var q = state.q.toLowerCase();
      var hay = ((n.title || "") + " " + (n.body || "") + " " + (n.tags || []).join(" ")).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }
  function render() {
    var list = activeNotes().filter(matchFilter).sort(function (a, b) { return b.createdAt - a.createdAt; });
    var box = $("#insWaterfall");
    var empty = $("#insEmpty"), nores = $("#insNoresult");
    if (!activeNotes().length) {
      box.innerHTML = ""; empty.hidden = false; nores.hidden = true; return;
    }
    empty.hidden = true;
    if (!list.length) { box.innerHTML = ""; nores.hidden = false; return; }
    nores.hidden = true;
    box.innerHTML = list.map(cardHTML).join("");
    // 图片淡入
    $$(".ins-card-img img", box).forEach(function (img) {
      if (img.complete) img.classList.add("loaded");
      else img.addEventListener("load", function () { img.classList.add("loaded"); });
    });
  }
  function cardHTML(n) {
    var cover = n.images && n.images[0];
    var imgBlock = cover
      ? '<div class="ins-card-img"><img src="' + esc(cover.dataUrl) + '" alt="" loading="lazy">' +
        (n.images.length > 1 ? '<span class="ins-count">1/' + n.images.length + "</span>" : "") + "</div>"
      : '<div class="ins-card-img" style="background:linear-gradient(135deg,var(--accent-soft),var(--bg-soft));display:flex;align-items:center;justify-content:center;height:120px;font-size:30px">' +
        (n.category === "outfit" ? "👗" : "💄") + "</div>";
    var title = n.title ? '<h3 class="ins-card-title">' + esc(n.title) + "</h3>" : "";
    var sum = n.body ? esc(n.body) : (n.title ? "（仅图片）" : "（无文字描述）");
    var tags = (n.tags && n.tags.length)
      ? '<div class="ins-card-tags">' + n.tags.slice(0, 3).map(function (t) { return '<span class="ins-minitag">#' + esc(t) + "</span>"; }).join("") + "</div>"
      : "";
    return '<article class="ins-card" data-id="' + esc(n.id) + '">' + imgBlock +
      '<div class="ins-card-body">' + title + '<p class="ins-card-sum">' + sum + "</p>" + tags + "</div>" +
      '<div class="ins-cat-badge">' + (n.category === "outfit" ? "👗" : "💄") + "</div></article>";
  }

  /* ── 详情 ── */
  var currentDetail = null;
  function openDetail(id) {
    var n = notes.find(function (x) { return x.id === id; });
    if (!n) return;
    currentDetail = n;
    var imgs = n.images || [];
    var car = imgs.length
      ? '<div class="ins-carousel" id="insCar">' + imgs.map(function (im) { return '<img src="' + esc(im.dataUrl) + '" alt="">'; }).join("") + "</div>" +
        (imgs.length > 1 ? '<div class="ins-car-dots" id="insDots">' + imgs.map(function (_, i) { return '<span class="ins-car-dot' + (i === 0 ? " active" : "") + '"></span>'; }).join("") + "</div>" : "")
      : '<div style="height:160px;background:linear-gradient(135deg,var(--accent-soft),var(--bg-soft));display:flex;align-items:center;justify-content:center;font-size:40px">' + (n.category === "outfit" ? "👗" : "💄") + "</div>";
    var tags = (n.tags && n.tags.length) ? '<div class="ins-detail-tags">' + n.tags.map(function (t) { return '<span class="ins-tagchip">#' + esc(t) + "</span>"; }).join("") + "</div>" : "";
    $("#detailBody").innerHTML =
      car +
      '<div class="ins-detail-pad">' +
      '<span class="ins-detail-cat ' + n.category + '">' + (n.category === "outfit" ? "👗 穿搭灵感" : "💄 妆容灵感") + "</span>" +
      (n.title ? '<h2 class="ins-detail-title">' + esc(n.title) + "</h2>" : "") +
      '<div class="ins-detail-time">🕒 ' + fmtTime(n.createdAt) + (n.updatedAt && n.updatedAt !== n.createdAt ? " · 已编辑" : "") + "</div>" +
      (n.body ? '<div class="ins-detail-body-txt">' + esc(n.body) + "</div>" : '<div class="ins-detail-body-txt" style="color:var(--ink-3)">（无文字描述）</div>') +
      tags + "</div>";
    // 轮播 dots
    var carEl = $("#insCar");
    if (carEl) {
      var dots = $$("#insDots .ins-car-dot");
      carEl.addEventListener("scroll", function () {
        var i = Math.round(carEl.scrollLeft / carEl.clientWidth);
        dots.forEach(function (d, k) { d.classList.toggle("active", k === i); });
      });
      $$("img", carEl).forEach(function (img) {
        img.addEventListener("click", function () { openLightbox(img.src); });
      });
    }
    $("#detailOverlay").hidden = false;
  }
  function closeDetail() { $("#detailOverlay").hidden = true; currentDetail = null; }

  /* ── 图片放大 ── */
  function openLightbox(src) { $("#lightboxImg").src = src; $("#lightbox").hidden = false; }
  function closeLightbox() { $("#lightbox").hidden = true; }

  /* ── 动作菜单（详情更多） ── */
  function openActionMenu(items) {
    var ov = document.createElement("div");
    ov.className = "ins-overlay";
    var sheet = document.createElement("div");
    sheet.className = "ins-sheet";
    sheet.innerHTML = '<div class="ins-sheet-bar"><b>操作</b><button class="ins-icon ins-am-close">✕</button></div>' +
      '<div class="ins-sheet-body ins-menu">' + items.map(function (it, i) {
        return '<button class="ins-menu-item ins-am-item" data-i="' + i + '">' + esc(it.label) + "</button>";
      }).join("") + "</div>";
    ov.appendChild(sheet);
    document.body.appendChild(ov);
    function close() { ov.remove(); }
    $(".ins-am-close", sheet).addEventListener("click", close);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    $$(".ins-am-item", sheet).forEach(function (b) {
      b.addEventListener("click", function () { close(); items[+b.dataset.i].onClick(); });
    });
  }

  /* ── 复制全部文字 ── */
  function copyAllText(n) {
    var txt = (n.title ? n.title + "\n" : "") + (n.body || "") + ((n.tags && n.tags.length) ? "\n" + n.tags.map(function (t) { return "#" + t; }).join(" ") : "");
    function done() { toast("✅ 已复制全部文字"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("复制失败，请手动选择"); }
      document.body.removeChild(ta);
    }
  }

  /* ── 删除确认 ── */
  function openConfirm(text, onOk) {
    $("#confirmText").textContent = text;
    confirmCb = onOk;
    $("#confirmOverlay").hidden = false;
  }
  function closeConfirm() { $("#confirmOverlay").hidden = true; confirmCb = null; }

  /* ── 新建 / 编辑 笔记 ── */
  function resetEditForm() {
    edit = { id: null, cat: null, images: [], tags: [], draft: false };
    $("#insThumbs").innerHTML = "";
    $("#insNoteTitle").value = "";
    $("#insNoteBody").value = "";
    $("#insTags").innerHTML = "";
    $("#insTagInput").value = "";
    $$(".ins-catopt").forEach(function (b) { b.classList.remove("active"); });
    $("#insDraftHint").hidden = true;
  }
  function renderThumbs() {
    $("#insThumbs").innerHTML = edit.images.map(function (im, i) {
      return '<div class="ins-thumb"><img src="' + esc(im.dataUrl) + '"><button class="ins-thumb-x" data-i="' + i + '">✕</button></div>';
    }).join("");
    $$("#insThumbs .ins-thumb-x").forEach(function (b) {
      b.addEventListener("click", function () {
        edit.images.splice(+b.dataset.i, 1); renderThumbs(); if (edit.id === null) autoDraft();
      });
    });
  }
  function renderEditTags() {
    $("#insTags").innerHTML = edit.tags.map(function (t, i) {
      return '<span class="ins-tagchip"><b>#' + esc(t) + '</b><span class="ins-tagchip-x" data-i="' + i + '">✕</span></span>';
    }).join("");
    $$("#insTags .ins-tagchip-x").forEach(function (b) {
      b.addEventListener("click", function () { edit.tags.splice(+b.dataset.i, 1); renderEditTags(); if (edit.id === null) autoDraft(); });
    });
  }
  var draftTimer;
  function autoDraft() {
    if (edit.id !== null) return; // 编辑模式不存草稿
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      InspireDB.saveDraft({
        title: $("#insNoteTitle").value, body: $("#insNoteBody").value,
        category: edit.cat, tags: edit.tags.slice(), images: edit.images.slice()
      }).then(function () { $("#insDraftHint").hidden = false; }).catch(function () {});
    }, 500);
  }
  function openNew() {
    resetEditForm();
    $("#editTitle").textContent = "新建灵感笔记";
    $("#editOverlay").hidden = false;
    // 恢复草稿
    InspireDB.getDraft().then(function (d) {
      if (!d) return;
      $("#insNoteTitle").value = d.title || "";
      $("#insNoteBody").value = d.body || "";
      edit.cat = d.category || null;
      edit.tags = (d.tags || []).slice();
      edit.images = (d.images || []).slice();
      if (edit.cat) {
        var b = $('.ins-catopt[data-cat="' + edit.cat + '"]'); if (b) b.classList.add("active");
      }
      renderThumbs(); renderEditTags();
      if (d.title || d.body || edit.images.length || edit.tags.length) $("#insDraftHint").hidden = false;
    }).catch(function () {});
    setTimeout(function () { $("#insNoteTitle").focus(); }, 250);
  }
  function openEdit(n) {
    resetEditForm();
    edit.id = n.id; edit.cat = n.category; edit.tags = (n.tags || []).slice(); edit.images = (n.images || []).slice();
    $("#editTitle").textContent = "编辑笔记";
    $("#insNoteTitle").value = n.title || "";
    $("#insNoteBody").value = n.body || "";
    var b = $('.ins-catopt[data-cat="' + n.category + '"]'); if (b) b.classList.add("active");
    renderThumbs(); renderEditTags();
    $("#editOverlay").hidden = false;
  }
  function saveNote() {
    if (!edit.cat) { toast("请先选择归属分类"); return; }
    var data = {
      title: $("#insNoteTitle").value.trim(),
      body: $("#insNoteBody").value.trim(),
      category: edit.cat, tags: edit.tags.slice(), images: edit.images.slice()
    };
    var promise;
    if (edit.id) {
      var old = notes.find(function (x) { return x.id === edit.id; });
      old.title = data.title; old.body = data.body; old.category = data.category;
      old.tags = data.tags; old.images = data.images; old.updatedAt = Date.now();
      promise = InspireDB.saveNote(old);
    } else {
      var nw = {
        id: InspireDB.uid(), title: data.title, body: data.body, category: data.category,
        tags: data.tags, images: data.images, createdAt: Date.now(), updatedAt: Date.now(),
        deleted: false, deletedAt: 0
      };
      notes.unshift(nw);
      promise = InspireDB.saveNote(nw).then(function () { return InspireDB.clearDraft(); });
    }
    promise.then(function () {
      $("#editOverlay").hidden = true;
      render();
      toast(edit.id ? "✅ 已保存修改" : "✅ 已发布灵感");
    }).catch(function () { toast("保存失败，请重试"); });
  }

  /* ── 标签筛选 ══ */
  function openTagFilter() {
    var all = {};
    activeNotes().forEach(function (n) { (n.tags || []).forEach(function (t) { all[t] = (all[t] || 0) + 1; }); });
    var keys = Object.keys(all);
    $("#insTagFilterList").innerHTML = keys.length
      ? keys.map(function (t) {
        var on = state.tags.indexOf(t) >= 0;
        return '<button class="ins-tf' + (on ? " active" : "") + '" data-t="' + esc(t) + '"><span class="ck">' + (on ? "✓" : "○") + "</span>#" + esc(t) + " (" + all[t] + ")</button>";
      }).join("")
      : '<p class="ins-bin-empty">还没有自定义标签，去新建笔记添加吧～</p>';
    $$("#insTagFilterList .ins-tf").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = b.dataset.t, i = state.tags.indexOf(t);
        if (i >= 0) state.tags.splice(i, 1); else state.tags.push(t);
        b.classList.toggle("active");
        b.querySelector(".ck").textContent = b.classList.contains("active") ? "✓" : "○";
      });
    });
    $("#tagSheet").hidden = false;
  }

  /* ── 回收站 ══ */
  function openBin() {
    var bin = notes.filter(function (n) { return n.deleted && n.deletedAt && (Date.now() - n.deletedAt) < 30 * 86400000; });
    var list = $("#insBinList");
    if (!bin.length) { list.innerHTML = '<p class="ins-bin-empty">回收站是空的 🍃</p>'; }
    else {
      list.innerHTML = bin.map(function (n) {
        var cover = n.images && n.images[0];
        var left = Math.ceil((30 * 86400000 - (Date.now() - n.deletedAt)) / 86400000);
        return '<div class="ins-bin-item" data-id="' + esc(n.id) + '">' +
          (cover ? '<img class="ins-bin-thumb" src="' + esc(cover.dataUrl) + '">' : '<div class="ins-bin-thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px">' + (n.category === "outfit" ? "👗" : "💄") + "</div>") +
          '<div class="ins-bin-info"><div class="ins-bin-name">' + esc(n.title || "（无标题）") + "</div>" +
          '<div class="ins-bin-sub">剩余 ' + left + " 天可恢复</div></div>" +
          '<div class="ins-bin-act"><button class="ins-bin-restore" data-act="restore">恢复</button>' +
          '<button class="ins-bin-del" data-act="purge">永久删</button></div></div>';
      }).join("");
      $$("#insBinList .ins-bin-item").forEach(function (row) {
        var id = row.dataset.id;
        row.querySelector('[data-act="restore"]').addEventListener("click", function () {
          InspireDB.restoreNote(id).then(function (r) {
            if (r) { var i = notes.findIndex(function (x) { return x.id === id; }); if (i >= 0) notes[i] = r; render(); openBin(); toast("✅ 已恢复"); }
          });
        });
        row.querySelector('[data-act="purge"]').addEventListener("click", function () {
          InspireDB.purgeNote(id).then(function () {
            notes = notes.filter(function (x) { return x.id !== id; }); openBin(); render(); toast("已永久删除");
          });
        });
      });
    }
    $("#binSheet").hidden = false;
  }

  /* ── 备份导出 / 导入 ══ */
  function exportBackup() {
    InspireDB.exportAll().then(function (data) {
      var blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      var a = document.createElement("a");
      var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
      a.href = URL.createObjectURL(blob);
      a.download = "goalday-inspire-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + ".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast("✅ 已导出备份");
    }).catch(function () { toast("导出失败"); });
  }
  function importBackup(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var data = JSON.parse(fr.result);
        if (!data || data.type !== "goalday-inspire-backup" || !Array.isArray(data.notes)) { toast("文件格式不正确"); return; }
        InspireDB.importNotes(data.notes).then(function (cnt) {
          return InspireDB.allNotes().then(function (all) { notes = all; render(); });
        }).then(function () { toast("✅ 已导入 " + data.notes.length + " 条笔记"); $("#backupSheet").hidden = true; });
      } catch (e) { toast("解析失败，请检查文件"); }
    };
    fr.readAsText(file);
  }

  /* ── 绑定事件 ══ */
  function bind() {
    // 分类标签
    $$("#insTabs .ins-tab[data-cat]").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#insTabs .ins-tab[data-cat]").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        state.cat = b.dataset.cat; render();
      });
    });
    $("#insTagFilterBtn").addEventListener("click", openTagFilter);
    // 搜索
    var st;
    $("#insSearch").addEventListener("input", function () {
      var v = this.value.trim();
      $("#insSearchClear").hidden = !v;
      clearTimeout(st); st = setTimeout(function () { state.q = v; render(); }, 200);
    });
    $("#insSearchClear").addEventListener("click", function () { $("#insSearch").value = ""; state.q = ""; this.hidden = true; render(); });
    // 悬浮加号
    $("#insFab").addEventListener("click", openNew);
    // 瀑布流点击
    $("#insWaterfall").addEventListener("click", function (e) {
      var card = e.target.closest(".ins-card"); if (card) openDetail(card.dataset.id);
    });
    // 更多菜单（顶部）
    $("#insMore").addEventListener("click", function () { $("#moreSheet").hidden = false; });
    $$("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { $("#" + b.dataset.close).hidden = true; });
    });
    $("#moreRecycle").addEventListener("click", function () { $("#moreSheet").hidden = true; openBin(); });
    $("#moreBackup").addEventListener("click", function () { $("#moreSheet").hidden = true; $("#backupSheet").hidden = false; });
    $("#moreAbout").addEventListener("click", function () { $("#moreSheet").hidden = true; toast("💡 仅你本人可见的私人灵感收藏库"); });
    // 标签筛选
    $("#tagApply").addEventListener("click", function () { $("#tagSheet").hidden = true; render(); });
    $("#tagClear").addEventListener("click", function () { state.tags = []; openTagFilter(); render(); });
    // 详情
    $("#detailClose").addEventListener("click", closeDetail);
    $("#detailMore").addEventListener("click", function () {
      if (!currentDetail) return;
      var n = currentDetail;
      openActionMenu([
        { label: "✏️ 编辑笔记", onClick: function () { closeDetail(); openEdit(n); } },
        { label: "📋 复制全部文字", onClick: function () { copyAllText(n); } },
        { label: "🗑️ 删除笔记", onClick: function () {
          openConfirm("确定删除这篇笔记吗？", function () {
            InspireDB.trashNote(n.id).then(function (r) {
              if (r) { var i = notes.findIndex(function (x) { return x.id === n.id; }); if (i >= 0) notes[i] = r; }
              closeConfirm(); closeDetail(); render(); toast("已移入回收站，30 天内可恢复");
            });
          });
        } }
      ]);
    });
    // 图片放大
    $("#lightboxClose").addEventListener("click", closeLightbox);
    $("#lightbox").addEventListener("click", function (e) { if (e.target === $("#lightbox")) closeLightbox(); });
    // 确认框
    $("#confirmCancel").addEventListener("click", closeConfirm);
    $("#confirmOk").addEventListener("click", function () { if (confirmCb) confirmCb(); });
    $("#confirmOverlay").addEventListener("click", function (e) { if (e.target === $("#confirmOverlay")) closeConfirm(); });

    // 新建/编辑
    $("#editCancel").addEventListener("click", function () { $("#editOverlay").hidden = true; });
    $("#editSave").addEventListener("click", saveNote);
    $("#insAddImg").addEventListener("click", function () { $("#insFile").click(); });
    $("#insFile").addEventListener("change", function () {
      var files = Array.prototype.slice.call(this.files || []);
      var room = 9 - edit.images.length;
      if (room <= 0) { toast("最多 9 张图片哦"); this.value = ""; return; }
      files = files.slice(0, room);
      Promise.all(files.map(readImage)).then(function (urls) {
        urls.forEach(function (u) { edit.images.push({ id: InspireDB.uid(), dataUrl: u }); });
        renderThumbs(); if (edit.id === null) autoDraft();
        toast("🖼 已添加 " + urls.length + " 张图片");
      }).catch(function () { toast("图片读取失败"); });
      this.value = "";
    });
    $$(".ins-catopt").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".ins-catopt").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active"); edit.cat = b.dataset.cat; if (edit.id === null) autoDraft();
      });
    });
    function addTag() {
      var v = $("#insTagInput").value.trim().replace(/^#/, "");
      if (!v) return;
      if (edit.tags.indexOf(v) < 0) { if (edit.tags.length >= 20) { toast("标签最多 20 个"); return; } edit.tags.push(v); renderEditTags(); }
      $("#insTagInput").value = ""; if (edit.id === null) autoDraft();
    }
    $("#insTagAdd").addEventListener("click", addTag);
    $("#insTagInput").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addTag(); } });
    $("#insNoteTitle").addEventListener("input", function () { if (edit.id === null) autoDraft(); });
    $("#insNoteBody").addEventListener("input", function () { if (edit.id === null) autoDraft(); });
    // 备份
    $("#backupExport").addEventListener("click", exportBackup);
    $("#backupImport").addEventListener("click", function () { $("#backupFile").click(); });
    $("#backupFile").addEventListener("change", function () { if (this.files && this.files[0]) importBackup(this.files[0]); this.value = ""; });
  }

  /* ── 启动 ── */
  function start() {
    if (!window.InspireDB || !InspireDB.isSupported()) {
      toast("当前浏览器不支持本地存储，无法使用灵感专区");
      $("#insFab").style.display = "none";
      return;
    }
    bind();
    InspireDB.openDB().then(function () {
      return InspireDB.cleanupExpired();
    }).then(function () {
      return InspireDB.allNotes();
    }).then(function (all) {
      notes = all || [];
      render();
    }).catch(function (e) {
      console.error(e);
      toast("灵感专区加载失败");
    });
    // 暴露给平台备份体系（后续打通用）
    window.GoalDayInspire = {
      exportAll: InspireDB.exportAll,
      importNotes: InspireDB.importNotes,
      allNotes: InspireDB.allNotes,
      namespace: "goalday-inspire"
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
