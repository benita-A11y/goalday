/* ═══════ 灵感专区 · 本地存储层（IndexedDB） ═══════
 * 完全独立数据库 goalday-inspire，与平台其他模块零耦合。
 * 图片以 dataURL 存入 IndexedDB，脱离系统相册，即使相册原图删除也不影响。
 * 不读取/不修改平台任何已有数据。
 */
(function (global) {
  "use strict";

  var DB_NAME = "goalday-inspire";
  var DB_VER = 1;
  var STORE_NOTES = "notes";
  var STORE_DRAFTS = "drafts";
  var RECYCLE_DAYS = 30;

  var _db = null;
  var _unsupported = false;

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (_db) return resolve(_db);
      if (!global.indexedDB) {
        _unsupported = true;
        return reject(new Error("IndexedDB 不可用"));
      }
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NOTES)) {
          var s = db.createObjectStore(STORE_NOTES, { keyPath: "id" });
          s.createIndex("createdAt", "createdAt", { unique: false });
          s.createIndex("category", "category", { unique: false });
          s.createIndex("deletedAt", "deletedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
          db.createObjectStore(STORE_DRAFTS, { keyPath: "slot" });
        }
      };
      req.onsuccess = function (e) { _db = e.target.result; resolve(_db); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  function store(name, mode) {
    return openDB().then(function (db) {
      return db.transaction(name, mode).objectStore(name);
    });
  }
  function reqP(req) {
    return new Promise(function (res, rej) {
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }
  function put(name, val) { return store(name, "readwrite").then(function (s) { return reqP(s.put(val)).then(function () { return val; }); }); }
  function getAll(name) { return store(name, "readonly").then(function (s) { return reqP(s.getAll()); }); }
  function getOne(name, key) { return store(name, "readonly").then(function (s) { return reqP(s.get(key)); }); }
  function del(name, key) { return store(name, "readwrite").then(function (s) { return reqP(s.delete(key)); }); }

  function uid() {
    return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ── 笔记 ── */
  function saveNote(note) { return put(STORE_NOTES, note); }
  function getNote(id) { return getOne(STORE_NOTES, id); }
  function allNotes() { return getAll(STORE_NOTES).catch(function () { return []; }); }

  // 软删除：移入回收站
  function trashNote(id) {
    return getNote(id).then(function (n) {
      if (!n) return null;
      n.deleted = true;
      n.deletedAt = Date.now();
      return saveNote(n);
    });
  }
  // 恢复
  function restoreNote(id) {
    return getNote(id).then(function (n) {
      if (!n) return null;
      n.deleted = false;
      n.deletedAt = 0;
      return saveNote(n);
    });
  }
  // 永久删除
  function purgeNote(id) { return del(STORE_NOTES, id); }

  // 清理超过 30 天的回收站条目（永久清除）
  function cleanupExpired() {
    var cutoff = Date.now() - RECYCLE_DAYS * 86400000;
    return allNotes().then(function (list) {
      var jobs = list.filter(function (n) { return n.deleted && n.deletedAt && n.deletedAt < cutoff; })
        .map(function (n) { return purgeNote(n.id); });
      return Promise.all(jobs);
    });
  }

  /* ── 草稿（新建笔记未发布时自动保存） ── */
  function saveDraft(d) { return put(STORE_DRAFTS, Object.assign({ slot: "new-note" }, d)); }
  function getDraft() { return getOne(STORE_DRAFTS, "new-note"); }
  function clearDraft() { return del(STORE_DRAFTS, "new-note"); }

  /* ── 备份导出 / 导入 ── */
  function exportAll() {
    return allNotes().then(function (list) {
      return {
        type: "goalday-inspire-backup",
        version: 1,
        exportedAt: Date.now(),
        notes: list
      };
    });
  }
  function importNotes(arr) {
    if (!Array.isArray(arr)) return Promise.reject(new Error("格式错误"));
    var jobs = arr.map(function (n) { return saveNote(n); });
    return Promise.all(jobs).then(function () { return arr.length; });
  }

  global.InspireDB = {
    uid: uid,
    openDB: openDB,
    saveNote: saveNote,
    getNote: getNote,
    allNotes: allNotes,
    trashNote: trashNote,
    restoreNote: restoreNote,
    purgeNote: purgeNote,
    cleanupExpired: cleanupExpired,
    saveDraft: saveDraft,
    getDraft: getDraft,
    clearDraft: clearDraft,
    exportAll: exportAll,
    importNotes: importNotes,
    isSupported: function () { return !!global.indexedDB && !_unsupported; }
  };
})(window);
