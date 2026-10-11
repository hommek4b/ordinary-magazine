// 공용 데이터와 머리·바닥 조립, 글 읽기 화면 그리기.
// 글은 두 군데에서 온다. 글쓰기 화면(write.html)에서 발행한 글이 있으면 그 글만 쓰고,
// 아직 하나도 없으면 아래 SAMPLE 예시 글을 보여 준다.
(function () {
  var CATS = ["노동·일자리", "주거·금융", "가족·복지", "사회·소식", "이슈·정치", "문화·예술", "역사·인물", "생각·제언"];
  var POSTS = [
    { id: 1, date: "2026. 10. 11", cover: "img/cover.jpg", cat: "노동·일자리", title: "첫 출근 전에 확인할 근로계약서", dek: "급여, 근로시간, 수습 기간. 서명 전에 짚어 볼 곳.", img: "img/t1.jpg" },
    { id: 2, cat: "이슈·정치", title: "논쟁의 쟁점을 양쪽 말로", dek: "한쪽 편을 들지 않고, 무엇이 다투어지는지만.", img: "img/t2.jpg" },
    { id: 3, cat: "가족·복지", title: "우리 집이 받을 수 있는 지원", dek: "신청 창구와 준비 서류를 가족 단위로 묶어서.", img: "img/t3.jpg" },
    { id: 4, cat: "주거·금융", title: "월세 계약서에서 놓치기 쉬운 특약", dek: "보증금 반환과 수리 책임을 어떻게 적어 둘까." },
    { id: 5, cat: "노동·일자리", title: "퇴사 후 실업급여, 신청 전에 따져 볼 것", dek: "수급 조건과 신청 순서를 한 번에 정리." },
    { id: 6, cat: "주거·금융", title: "대출 금리표, 숫자 읽는 순서", dek: "고정과 변동, 중도상환 수수료까지." },
    { id: 7, cat: "사회·소식", title: "이번 주 바뀐 제도 다섯 가지", dek: "달라진 점만 사실대로 간추립니다." }
  ];
  var SECTIONS = [
    { h: "핵심 정리", p: "이 자리에 글의 핵심 내용이 들어갑니다." },
    { h: "확인할 것", p: "소제목은 명사형으로 쓰고, 사실과 출처는 문장 곁에 밝힙니다. 어느 진영의 말도 그대로 옮기지 않고 확인된 내용만 적습니다." }
  ];
  var real = false;
  var CFG = window.SITE_CONFIG || {};
  // 올려 둔 이미지의 경로를 주소로 바꾼다.
  function imgUrl(p) {
    if (!p) return "";
    return /^(https?:|img\/|\/)/.test(p) ? p : CFG.url + "/storage/v1/object/public/images/" + encodeURI(p);
  }
  function api(path, opt) {
    opt = opt || {};
    var h = { apikey: CFG.key, Authorization: "Bearer " + CFG.key };
    if (opt.body) h["Content-Type"] = "application/json";
    if (opt.prefer) h.Prefer = opt.prefer;
    return fetch(CFG.url + "/rest/v1/" + path, { method: opt.method || "GET", headers: h, body: opt.body, keepalive: !!opt.keepalive });
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function pad3(n) { n = String(n); while (n.length < 3) n = "0" + n; return n; }
  function latestNo() { return real ? pad3(POSTS.length) : "001"; }
  function fmtDate(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso.replace(/-/g, ". ") : (iso || ""); }

  // db에 저장된 글 한 건을 화면에서 쓰는 모양으로 바꾼다. 이미지는 올린 파일의 id로 주소를 만든다.
  function norm(r) {
    if (!r || typeof r.id !== "number" || !r.title) return null;
    return {
      id: r.id, real: true, iso: r.iso || "", date: fmtDate(r.iso), cat: r.cat || "", title: r.title, dek: r.dek || "",
      img: imgUrl(r.img_path || r.imgId), cover: imgUrl(r.cover_path || r.coverId),
      blocks: Array.isArray(r.blocks) ? r.blocks : [], sources: Array.isArray(r.sources) ? r.sources : []
    };
  }

  // 본문 속 [1] 같은 번호는 작은 위첨자로, 주소(http…)는 링크로 만든다. 글자는 모두 textContent로만 넣는다.
  function addText(parent, text, footnotes) {
    String(text || "").split(/(\[\d{1,2}\]|https?:\/\/[^\s)]+)/g).forEach(function (part) {
      if (!part) return;
      if (footnotes && /^\[\d{1,2}\]$/.test(part)) { parent.appendChild(el("sup", "fn", part.slice(1, -1))); return; }
      if (/^https?:\/\//.test(part)) { var a = el("a", "ext", part); a.href = part; a.target = "_blank"; a.rel = "noopener"; parent.appendChild(a); return; }
      parent.appendChild(document.createTextNode(part));
    });
  }


  // ---- 서식이 들어간 문단(굵게·색·글꼴 등)을 안전하게 걸러서 쓴다. 허용한 태그와 스타일만 남기고 나머지는 글자만 남긴다. ----
  var OKFONT = { "Noto Sans KR": "sans-serif", "Noto Serif KR": "serif", "Nanum Pen Script": "cursive", "Black Han Sans": "sans-serif" };
  var COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;
  var SIZES = { "x-small": 1, "small": 1, "medium": 1, "large": 1, "x-large": 1, "xx-large": 1, "xxx-large": 1 };
  var SKIP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  function cleanStyle(st) {
    var out = [], v;
    if ((v = (st.color || "").trim()) && COLOR.test(v)) out.push("color:" + v);
    if ((v = (st.backgroundColor || "").trim()) && COLOR.test(v)) out.push("background-color:" + v);
    if ((v = (st.fontSize || "").trim()) && SIZES[v]) out.push("font-size:" + v);
    else if (/^\d{1,3}(\.\d)?px$/.test(v) && parseFloat(v) >= 8 && parseFloat(v) <= 120) out.push("font-size:" + v);
    if ((v = st.fontFamily || "")) { var n = v.split(",")[0].replace(/["']/g, "").trim(); if (OKFONT[n]) out.push('font-family:"' + n + '",' + OKFONT[n]); }
    if (/^(bold|[6-9]00)$/.test(st.fontWeight || "")) out.push("font-weight:700");
    if (st.fontStyle === "italic") out.push("font-style:italic");
    var td = st.textDecorationLine || st.textDecoration || "", d = [];
    if (/underline/.test(td)) d.push("underline");
    if (/line-through/.test(td)) d.push("line-through");
    if (d.length) out.push("text-decoration:" + d.join(" "));
    return out.join(";");
  }
  function cleanInto(src, dst) {
    Array.prototype.forEach.call(src.childNodes, function (n) {
      if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); return; }
      if (n.nodeType !== 1 || SKIP[n.tagName]) return;
      var t = n.tagName, out = null;
      if (t === "BR") { dst.appendChild(document.createElement("br")); return; }
      if (t === "B" || t === "STRONG") out = document.createElement("b");
      else if (t === "I" || t === "EM") out = document.createElement("i");
      else if (t === "U") out = document.createElement("u");
      else if (t === "S" || t === "STRIKE" || t === "DEL") out = document.createElement("s");
      else if (t === "SPAN" || t === "FONT") {
        var css = cleanStyle(n.style || {});
        if (css) { out = document.createElement("span"); out.setAttribute("style", css); }
      }
      if (out) { dst.appendChild(out); cleanInto(n, out); } else cleanInto(n, dst);
    });
  }
  function cleanHtml(html) {
    var doc = new DOMParser().parseFromString("<body>" + String(html || "") + "</body>", "text/html");
    var box = document.createElement("div");
    cleanInto(doc.body, box);
    return box.innerHTML;
  }
  function moveRich(from, to, footnotes) {
    Array.prototype.forEach.call(from.childNodes, function (n) {
      if (n.nodeType === 3) addText(to, n.nodeValue, footnotes);
      else if (n.nodeType === 1) { var c = n.cloneNode(false); to.appendChild(c); moveRich(n, c, footnotes); }
    });
  }
  function renderRich(parent, html, footnotes) {
    var box = document.createElement("div"); box.innerHTML = cleanHtml(html);
    moveRich(box, parent, footnotes);
  }

  var ready = (async function () {
    try {
      if (CFG.url) {
        var r = await api("posts?status=eq.published&select=*&order=iso.desc,id.desc&limit=500");
        if (r.ok) {
          var arr = (await r.json()).map(norm).filter(Boolean);
          if (arr.length) {
            arr.sort(function (a, b) { return a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : b.id - a.id; });
            POSTS.length = 0;
            arr.forEach(function (x) { POSTS.push(x); });
            real = true;
          }
        }
      }
    } catch (e) {}
    return POSTS;
  })();

  function header(page) {
    var h = el("nav", "site-nav");
    h.setAttribute("aria-label", "주 메뉴");
    var brand = el("a", "brand");
    brand.href = "index.html";
    brand.innerHTML = "가장 <b>보통</b>의 매거진";
    h.appendChild(brand);
    var links = el("div", "links");
    [["ISSUE", "index.html", "index"], ["ARCHIVE", "archive.html", "archive"], ["CATEGORY", "category.html", "category"], ["ABOUT", "about.html", "about"]].forEach(function (l) {
      var a = el("a", "", l[0]);
      a.href = l[1];
      if (page === l[2]) a.setAttribute("aria-current", "page");
      links.appendChild(a);
    });
    h.appendChild(links);
    h.appendChild(el("span", "iss", ""));
    return h;
  }

  function footer() {
    var f = el("footer", "site-foot");
    var s = el("span");
    s.innerHTML = "<strong>가장 보통의 매거진</strong>";
    f.appendChild(s);
    return f;
  }

  function card(p) {
    var li = el("li", "card");
    var a = el("a");
    a.href = "post.html#" + p.id;
    var th = el("div", "thumb");
    if (p.img) th.style.backgroundImage = 'url("' + p.img + '")';
    a.appendChild(th);
    a.appendChild(el("span", "c", p.cat));
    var h3 = el("h3", "", p.title);
    if (!p.real) h3.appendChild(el("span", "tag", "예시"));
    a.appendChild(h3);
    a.appendChild(el("p", "", p.dek));
    li.appendChild(a);
    return li;
  }

  // 글 읽기 화면. 글쓰기 화면의 미리보기도 같은 함수를 쓴다(opts.preview).
  function renderArticle(a, p, opts) {
    opts = opts || {};
    a.textContent = "";
    function add(parent, tag, cls, text) { var e = el(tag, cls, text); parent.appendChild(e); return e; }
    add(a, "span", "cat", p.cat || "분야 선택 전");
    add(a, "h1", "", p.title || "제목 없음");
    if (p.dek) add(a, "p", "dek", p.dek);
    var meta = add(a, "div", "meta");
    if (p.date) add(meta, "span", "", p.date);
    if (!p.real) add(meta, "span", "", "예시 글");
    if (p.img || !p.real) {
      var hero = add(a, "div", "hero");
      if (p.img) hero.style.backgroundImage = 'url("' + p.img + '")';
    }
    var sources;
    if (p.real) {
      (p.blocks || []).forEach(function (b) {
        if (b.t === "h") add(a, "h2", "", b.x);
        else if (b.t === "i" && b.id) {
          var fg = add(a, "figure", "fig"), im = el("img"); im.src = imgUrl(b.id); im.alt = b.x || ""; fg.appendChild(im);
          if (b.x) add(fg, "figcaption", "", b.x);
        }
        else if (b.h) renderRich(add(a, "p", "body"), b.h, true);
        else addText(add(a, "p", "body"), b.x, true);
      });
      sources = p.sources || [];
    } else {
      SECTIONS.forEach(function (s) {
        add(a, "h2", "", s.h);
        var bp = add(a, "p", "body", s.p);
        if (s.h === "확인할 것") bp.appendChild(el("sup", "fn", "1"));
      });
      sources = ["출처 이름과 주소가 이곳에 번호순으로 들어갑니다. 본문의 작은 번호와 짝을 이룹니다. (예시)"];
    }
    if (sources.length) {
      add(a, "h2", "", "출처");
      var ol = add(a, "ol", "sources");
      sources.forEach(function (s) { addText(add(ol, "li"), s, false); });
    }
    if (!p.real) add(a, "div", "note-box", "이 페이지는 글 읽기 화면의 형식을 보여 주는 예시입니다. 글쓰기 화면에서 첫 글을 발행하면 예시 글은 사라집니다.");
    if (opts.preview) return;

    var idx = 0;
    POSTS.forEach(function (x, i) { if (x.id === p.id) idx = i; });
    var rel = POSTS.filter(function (x) { return x.cat === p.cat && x.id !== p.id; }).slice(0, 3);
    if (rel.length) {
      add(a, "h2", "rel-h", "같은 분야의 다른 글");
      var rl = add(a, "ul", "rel");
      rel.forEach(function (x) {
        var li = el("li"), l = el("a", "", x.title);
        l.href = "post.html#" + x.id;
        li.appendChild(l); rl.appendChild(li);
      });
    }
    var pager = add(a, "div", "pager");
    function nav(item, label) {
      var l = el("a");
      if (item) { l.href = "post.html#" + item.id; add(l, "small", "", label); add(l, "span", "", item.title); }
      pager.appendChild(l);
    }
    nav(POSTS[idx - 1], "← 이전 글");
    nav(POSTS[idx + 1], "다음 글 →");
  }

  // 글을 연 사람을 한 사람(이 브라우저)당 1회로 기록한다(인기글 집계용). 실패하면 조용히 건너뛴다.
  function viewerId() {
    try {
      var v = localStorage.getItem("gabo-viewer");
      if (!v) {
        v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2, 12);
        localStorage.setItem("gabo-viewer", v);
      }
      return v;
    } catch (e) { return ""; }
  }
  async function recordView(id) {
    try {
      if (!CFG.url || typeof id !== "number" || id < 100) return;
      var v = viewerId(); if (!v) return;
      await api("reads?on_conflict=post_id,viewer", { method: "POST", prefer: "resolution=ignore-duplicates,return=minimal", body: JSON.stringify({ post_id: id, viewer: v }), keepalive: true });
    } catch (e) {}
  }
  // 인기글 집계: [{post_id, n}] -> {id: n}. 불러오지 못하면 null.
  async function readCounts() {
    try {
      var r = await api("rpc/read_counts", { method: "POST", body: "{}" });
      if (!r.ok) return null;
      var c = {}; (await r.json()).forEach(function (x) { c[x.post_id] = Number(x.n); });
      return c;
    } catch (e) { return null; }
  }
  // 로그인한 적이 있는 브라우저에서만 메뉴에 글쓰기를 보여 준다(실제 권한은 글쓰기 화면에서 다시 확인한다).
  function hasSession() {
    try {
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^sb-.*-auth-token$/.test(k)) return true; }
    } catch (e) {}
    return false;
  }

  window.SITE = {
    recordView: recordView, readCounts: readCounts, hasSession: hasSession, imgUrl: imgUrl, CFG: CFG, CATS: CATS, POSTS: POSTS, SECTIONS: SECTIONS, ready: ready, norm: norm,
    el: el, card: card, cleanHtml: cleanHtml, renderArticle: renderArticle, addText: addText, latestNo: latestNo, fmtDate: fmtDate,
    isReal: function () { return real; }
  };

  var page = document.body.getAttribute("data-page");
  var hs = document.getElementById("site-header");
  var nav = null;
  if (hs) { nav = header(page); hs.appendChild(nav); }
  var fs = document.getElementById("site-footer");
  if (fs) fs.appendChild(footer());

  ready.then(function () {
    if (nav) nav.querySelector(".iss").textContent = "LATEST " + latestNo() + "  " + (POSTS[0] && POSTS[0].date || "");
    if (nav && hasSession()) {
      var a = el("a", "", "WRITE");
      a.href = "write.html";
      if (page === "write") a.setAttribute("aria-current", "page");
      nav.querySelector(".links").appendChild(a);
    }
  });
})();
