/* Poppi PPL Widget 2.0 - hosted outside Wix custom-embed CDN (rev21). ASCII-only. */
(function () {
  var PATH = location.pathname || "";
  if (PATH.indexOf("/cart") === -1 && PATH.indexOf("/checkout") === -1) return;
  if (window.__poppiPplWidget) return;
  window.__poppiPplWidget = 1;
  window.__poppiPplRev = "poppiPplRev21";

  var API_KEY = window.__POPPI_PPL_WIDGET_API_KEY || "";
  if (!API_KEY) return;
  var STORE_KEY = "poppiPplAccessPoint";
  var UI_ID = "poppi-ppl-ui";
  var HAND_OFF_KEY = "poppiPplHandoffOk";
  var HAND_OFF_LINE_KEY = "poppiPplHandoffLine";
  var CLIENT_KEY = "poppiPplClientKey";
  var HANDOFF_URL = "https://www.poppi.academy/_functions/pplHandoff";
  // ASCII-only (unicode escapes) - Wix/atob path corrupts raw UTF-8 and some CSS *= selectors
  var BOX_RE = /v\u00fddejn\u00ed box|alzabox|parcelbox|PPL \/ AlzaBox/i;
  var OTHER_RE = /Doru\u010den\u00ed na adresu|Osobn\u00ed odb\u011br/i;
  var _busy = false;
  var _lastBox = null;
  var _opening = false;

  function loadPoint() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) {
        try {
          raw = localStorage.getItem(STORE_KEY);
          if (raw) sessionStorage.setItem(STORE_KEY, raw);
        } catch (e2) {}
      }
      return JSON.parse(raw || "null");
    } catch (e) {
      return null;
    }
  }

  function savePoint(detail) {
    var streetObj =
      detail && detail.street && typeof detail.street === "object"
        ? detail.street
        : null;
    var row = {
      code: detail && (detail.code || detail.id || ""),
      name: detail && (detail.name || ""),
      street: streetObj
        ? streetObj.street || streetObj.address || ""
        : (detail && (detail.street || detail.address)) || "",
      city: streetObj ? streetObj.city || "" : (detail && detail.city) || "",
      zip: streetObj
        ? streetObj.zipCode || streetObj.zip || ""
        : (detail && (detail.zip || detail.zipCode)) || "",
    };
    if (typeof row.street === "object" && row.street) {
      row.city = row.city || row.street.city || "";
      row.zip = row.zip || row.street.zipCode || row.street.zip || "";
      row.street = row.street.street || row.street.address || "";
    }
    var payload = JSON.stringify(row);
    sessionStorage.setItem(STORE_KEY, payload);
    try {
      localStorage.setItem(STORE_KEY, payload);
    } catch (e) {}
    return row;
  }

  function pointLine(row) {
    if (!row || !row.code) return "";
    return (
      "PPL v\u00fddejn\u00ed m\u00edsto: " +
      row.name +
      " [" +
      row.code +
      "]" +
      (row.street ? ", " + row.street : "") +
      (row.city ? ", " + row.city : "") +
      (row.zip ? " " + row.zip : "")
    );
  }

  function clientKey() {
    try {
      var k = sessionStorage.getItem(CLIENT_KEY);
      if (k) return k;
      k =
        "ck_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(CLIENT_KEY, k);
      return k;
    } catch (e) {
      return "ck_anon";
    }
  }

  function readCheckoutEmail() {
    try {
      var nodes = document.querySelectorAll(
        'input[type=email], input[name*="email" i], input[autocomplete=email], input[id*="email" i]',
      );
      for (var i = 0; i < nodes.length; i++) {
        var v = (nodes[i].value || "").trim();
        if (v.indexOf("@") > 0) return v;
      }
      var textInputs = document.querySelectorAll("input[type=text]");
      for (var j = 0; j < textInputs.length; j++) {
        var t = (textInputs[j].value || "").trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return t;
      }
    } catch (e) {}
    return "";
  }

  function postHandoff(row) {
    if (!row || !row.code) return Promise.resolve({ ok: false });
    var body = {
      email: readCheckoutEmail(),
      code: row.code,
      name: row.name || "",
      street: row.street || "",
      city: row.city || "",
      zip: row.zip || "",
      clientKey: clientKey(),
      line: pointLine(row),
    };
    return fetch(HANDOFF_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "omit",
      keepalive: true,
    })
      .then(function (r) {
        return r.json().catch(function () {
          return { ok: false, status: r.status };
        });
      })
      .then(function (data) {
        if (data && data.ok) {
          window.__poppiPplHandoff = {
            ok: true,
            via: "api",
            code: row.code,
            line: pointLine(row),
          };
          try {
            sessionStorage.setItem(HAND_OFF_KEY, "1");
          } catch (e) {}
        }
        return data || { ok: false };
      })
      .catch(function () {
        return { ok: false };
      });
  }

  function showErr(msg) {
    var err = document.getElementById("poppi-ppl-err");
    if (!err) return;
    if (!msg) {
      err.style.display = "none";
      return;
    }
    err.style.display = "block";
    err.textContent = msg;
  }

  function dismissCookies() {
    try {
      var btns = document.querySelectorAll("button, [role=button], a");
      for (var i = 0; i < btns.length; i++) {
        var t = norm(btns[i].textContent);
        if (
          t === "P\u0159ijmout v\u0161e" ||
          t === "Accept all" ||
          t === "Souhlas\u00edm" ||
          t === "Agree"
        ) {
          btns[i].click();
          return;
        }
      }
    } catch (e) {}
  }

  function ensureLoader(cb) {
    var done = false;
    function once() {
      if (done) return;
      done = true;
      cb();
    }
    function whenDefined() {
      if (
        window.customElements &&
        window.customElements.get("ppl-access-point-widget")
      ) {
        once();
        return;
      }
      if (window.customElements && window.customElements.whenDefined) {
        window.customElements
          .whenDefined("ppl-access-point-widget")
          .then(once)
          .catch(function () {
            _opening = false;
            showErr(
              "PPL widget se nepoda\u0159ilo na\u010d\u00edst. Obnovte str\u00e1nku.",
            );
          });
        setTimeout(function () {
          if (window.customElements.get("ppl-access-point-widget")) once();
        }, 4000);
        return;
      }
      setTimeout(once, 1500);
    }

    if (
      window.customElements &&
      window.customElements.get("ppl-access-point-widget")
    ) {
      once();
      return;
    }
    var existing = document.querySelector(
      'script[src*="accesspointwidget/loader.js"]',
    );
    if (existing) {
      existing.addEventListener("load", whenDefined);
      whenDefined();
      return;
    }
    var s = document.createElement("script");
    s.src = "https://www.ppl.cz/accesspointwidget/loader.js";
    s.async = true;
    s.onload = whenDefined;
    s.onerror = function () {
      _opening = false;
      showErr(
        "PPL mapu nelze na\u010d\u00edst (s\u00ed\u0165). Zkuste to znovu.",
      );
    };
    (document.head || document.documentElement).appendChild(s);
  }

  function hostStyle(pe) {
    return (
      "position:fixed;inset:0;width:100%;height:100%;z-index:2147483000;" +
      "pointer-events:" +
      (pe || "none") +
      ";border:0;margin:0;padding:0;background:transparent"
    );
  }

  function ensureWidget() {
    var w = document.getElementById("poppiPplWidget");
    if (w) return w;
    w = document.createElement("ppl-access-point-widget");
    w.id = "poppiPplWidget";
    w.setAttribute("api-key", API_KEY);
    w.setAttribute(
      "config",
      JSON.stringify({
        viewMode: "modal",
        defaultLang: "cs",
        defaultCountry: "CZ",
        closeButtonVisible: true,
      }),
    );
    w.style.cssText = hostStyle("none");
    document.body.appendChild(w);
    w.addEventListener("ppl-accesspointwidget-select", function (ev) {
      var row = savePoint(ev.detail || {});
      w.style.pointerEvents = "none";
      try {
        if (typeof w.close === "function") w.close();
      } catch (e) {}
      var ok = persistHandoff(row);
      try {
        sessionStorage.setItem(HAND_OFF_KEY, ok ? "1" : "0");
      } catch (e2) {}
      postHandoff(row).then(function (api) {
        renderUi();
        updateSummary();
        if (ok || (api && api.ok)) {
          showErr("");
          var err = document.getElementById("poppi-ppl-err");
          if (err) err.style.display = "none";
        } else {
          showErr(
            "M\u00edsto je vybran\u00e9. K\u00f3d " +
              row.code +
              " se ulo\u017e\u00ed p\u0159i platb\u011b (pokud API selhalo, zkontrolujte pozn\u00e1mku).",
          );
        }
      });
      renderUi();
      updateSummary();
    });
    w.addEventListener("ppl-accesspointwidget-ready", function () {
      w.__poppiReady = true;
    });
    w.addEventListener("ppl-accesspointwidget-close", function () {
      w.style.pointerEvents = "none";
    });
    return w;
  }

  function openWidget(w) {
    if (!w || typeof w.open !== "function") {
      showErr("PPL widget nen\u00ed p\u0159ipraven. Obnovte str\u00e1nku.");
      return;
    }
    dismissCookies();
    w.style.cssText = hostStyle("none");
    try {
      w.open();
      w.style.pointerEvents = "auto";
    } catch (e) {
      showErr(
        "Nepoda\u0159ilo se otev\u0159\u00edt mapu PPL. Zkuste to znovu.",
      );
    }
  }

  function openWhenReady() {
    if (_opening) return;
    _opening = true;
    dismissCookies();
    ensureLoader(function () {
      var w = ensureWidget();
      var opened = false;
      function tryOpen() {
        if (opened) return;
        opened = true;
        _opening = false;
        openWidget(w);
      }
      if (w.__poppiReady) {
        tryOpen();
        return;
      }
      w.addEventListener("ppl-accesspointwidget-ready", tryOpen, {
        once: true,
      });
      setTimeout(function () {
        if (!opened) tryOpen();
      }, 1200);
      setTimeout(function () {
        if (!opened) tryOpen();
      }, 3500);
    });
  }

  function norm(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function radioLabel(r) {
    var aria = r.getAttribute("aria-label") || "";
    if (aria) return norm(aria);
    var lab = r.closest("label");
    if (lab) return norm(lab.textContent).slice(0, 200);
    var wrap =
      r.closest("[data-hook]") ||
      r.closest('[role="radio"]') ||
      r.parentElement;
    return wrap ? norm(wrap.textContent).slice(0, 200) : "";
  }

  function isSelectedControl(el) {
    if (!el) return false;
    if (el.checked) return true;
    if (el.getAttribute("aria-checked") === "true") return true;
    if (el.getAttribute("aria-pressed") === "true") return true;
    var cls = String(el.className || "");
    if (/selected|checked|active|isSelected|is-checked/i.test(cls)) return true;
    if (el.querySelector && el.querySelector("input:checked")) return true;
    return false;
  }

  function optionLooksBox(text) {
    var t = norm(text);
    if (!t || t.length < 8 || t.length > 240) return false;
    if (!BOX_RE.test(t)) return false;
    // Option rows include price; OTHER_RE may match sibling titles only when
    // the whole shipping block is concatenated — for a single option row,
    // treat as box when BOX_RE hits even if address/pickup words appear nearby.
    if (/^Osobn|^Doru\u010den\u00ed na adresu/i.test(t) && !BOX_RE.test(t))
      return false;
    return true;
  }

  function findCheckedBoxRadio() {
    var radios = document.querySelectorAll(
      'input[type=radio], [role=radio], [aria-checked="true"]',
    );
    for (var i = 0; i < radios.length; i++) {
      var r = radios[i];
      if (!isSelectedControl(r)) continue;
      var lab = radioLabel(r);
      if (optionLooksBox(lab)) return r;
    }
    return null;
  }

  function shippingRoot() {
    var heads = document.querySelectorAll("h1,h2,h3,h4,[role=heading]");
    for (var i = 0; i < heads.length; i++) {
      var title = norm(heads[i].textContent);
      if (
        title === "Zp\u016fsob doru\u010den\u00ed" ||
        title === "Delivery method" ||
        title === "Doprava a doru\u010den\u00ed"
      ) {
        return heads[i].closest("section,form,div") || heads[i].parentElement;
      }
    }
    return null;
  }

  // Prefer checked/selected option row; never treat whole shipping block text.
  function isBoxMode() {
    if (findCheckedBoxRadio()) return true;

    var root = shippingRoot() || document;
    var kids = root.querySelectorAll(
      'input[type=radio], [role=radio], button, label, [data-hook*="Radio"], [data-hook*="shipping"], li, div',
    );
    for (var k = 0; k < kids.length && k < 120; k++) {
      var el = kids[k];
      var kt = norm(el.textContent).slice(0, 200);
      if (!optionLooksBox(kt)) continue;
      if (isSelectedControl(el)) return true;
      // Wix often puts checked state on nested input / aria child
      if (el.querySelector && el.querySelector('input:checked, [aria-checked="true"]'))
        return true;
    }

    // Cart/sidebar price cue: box rate 89,00 when box option present
    try {
      var body = norm(document.body && document.body.innerText);
      if (
        BOX_RE.test(body) &&
        /Doru\u010den\u00ed\s*89/.test(body) &&
        !/Doru\u010den\u00ed\s*119/.test(body) &&
        !/Doru\u010den\u00ed\s*0\s*K\u010d/.test(body)
      ) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  function setFieldValue(el, line) {
    if (!el || !line) return false;
    if ("value" in el) {
      var cur = el.value || "";
      if (cur.indexOf("PPL v\u00fddejn\u00ed m\u00edsto:") !== -1) {
        el.value = cur.replace(
          /PPL v\u00fddejn\u00ed m\u00edsto:[^\n]*/g,
          line,
        );
      } else if (
        /addressline2|address.?line.?2|apartment|company|firma/i.test(
          (el.getAttribute("name") || "") +
            " " +
            (el.getAttribute("aria-label") || "") +
            " " +
            (el.getAttribute("data-hook") || ""),
        )
      ) {
        // Prefer overwrite short secondary address fields
        el.value = line.slice(0, 200);
      } else {
        el.value = (cur ? cur.replace(/\s+$/, "") + "\n" : "") + line;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (el.isContentEditable) {
      el.textContent = line;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    return false;
  }

  function fieldMeta(el) {
    return (
      (el.getAttribute("placeholder") || "") +
      " " +
      (el.getAttribute("aria-label") || "") +
      " " +
      (el.getAttribute("name") || "") +
      " " +
      (el.getAttribute("data-hook") || "") +
      " " +
      (el.id || "") +
      " " +
      ((el.closest("[data-hook]") || {}).getAttribute
        ? el.closest("[data-hook]").getAttribute("data-hook") || ""
        : "")
    ).toLowerCase();
  }

  function fieldKind(el) {
    var meta = fieldMeta(el);
    if (/note|pozn|instruk|comment|additional|buyer/.test(meta)) return "note";
    if (
      /addressline2|address.?line.?2|apartment|byt|patro|company|firma/.test(
        meta,
      )
    )
      return "line2";
    if (/postal|psc|ps\u010d|zip/.test(meta)) return "zip";
    if (/city|m\u011bsto|obec/.test(meta)) return "city";
    if (
      /addressline(?!2)|address.?line(?!.?2)|street|ulice|address(?!line2)/.test(
        meta,
      )
    )
      return "street";
    return "";
  }

  function fieldScore(el) {
    var k = fieldKind(el);
    if (k === "note") return 100;
    if (k === "line2") return 90;
    if (k === "street") return 70;
    if (k === "city") return 60;
    if (k === "zip") return 50;
    if (el.tagName === "TEXTAREA") return 40;
    return 0;
  }

  // Persist pickup into checkout address fields (street/city/zip/line2) so the
  // order itself carries the box. Also POST /_functions/pplHandoff when live.
  function persistHandoff(row) {
    if (!row || !row.code) return false;
    var line = pointLine(row);
    var streetVal = (row.street || row.name || "").trim();
    if (streetVal && streetVal.indexOf(row.code) === -1) {
      streetVal = streetVal + " [" + row.code + "]";
    } else if (!streetVal) {
      streetVal = "PPL [" + row.code + "] " + (row.name || "");
    }
    try {
      sessionStorage.setItem(HAND_OFF_LINE_KEY, line);
      localStorage.setItem(HAND_OFF_LINE_KEY, line);
    } catch (e0) {}
    try {
      var editBtns = document.querySelectorAll("button, a, [role=button]");
      for (var ei = 0; ei < editBtns.length && ei < 40; ei++) {
        if (norm(editBtns[ei].textContent) !== "Upravit") continue;
        var near =
          editBtns[ei].closest("section,div") || editBtns[ei].parentElement;
        var nearTxt = near ? norm(near.textContent).slice(0, 80) : "";
        if (/z\u00e1kazn|customer|doru\u010den/i.test(nearTxt)) {
          editBtns[ei].click();
          break;
        }
      }
    } catch (e) {}

    var nodes = document.querySelectorAll(
      "textarea, [contenteditable=true], input[type=text], input:not([type]), input[type=search], input[type=tel]",
    );
    var byKind = { street: [], city: [], zip: [], line2: [], note: [] };
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.disabled || el.readOnly) continue;
      if (el.offsetParent === null && el.getClientRects().length === 0)
        continue;
      var kind = fieldKind(el);
      if (kind && byKind[kind]) byKind[kind].push(el);
    }

    var wrote = 0;
    function fillFirst(list, value) {
      if (!value) return false;
      for (var n = 0; n < list.length; n++) {
        if (setFieldValue(list[n], value)) {
          wrote++;
          return true;
        }
      }
      return false;
    }

    fillFirst(byKind.street, streetVal);
    fillFirst(byKind.city, row.city || "");
    fillFirst(byKind.zip, row.zip || "");
    fillFirst(byKind.line2, line);
    fillFirst(byKind.note, line);

    // Fallback: highest-score single field gets the full line
    if (!wrote) {
      var scored = [];
      for (var j = 0; j < nodes.length; j++) {
        var el2 = nodes[j];
        if (el2.disabled || el2.readOnly) continue;
        if (el2.offsetParent === null && el2.getClientRects().length === 0)
          continue;
        var sc = fieldScore(el2);
        if (sc > 0) scored.push({ el: el2, sc: sc });
      }
      scored.sort(function (a, b) {
        return b.sc - a.sc;
      });
      for (var s = 0; s < scored.length; s++) {
        if (setFieldValue(scored[s].el, line)) {
          wrote++;
          break;
        }
      }
    }

    if (wrote > 0) {
      window.__poppiPplHandoff = {
        ok: true,
        via: "address-fields",
        code: row.code,
        line: line,
        wrote: wrote,
      };
      try {
        sessionStorage.setItem(HAND_OFF_KEY, "1");
      } catch (e1) {}
      return true;
    }
    window.__poppiPplHandoff = { ok: false, code: row.code, line: line };
    try {
      sessionStorage.setItem(HAND_OFF_KEY, "0");
    } catch (e3) {}
    return false;
  }

  function reapplyHandoff() {
    var row = loadPoint();
    if (row && row.code) persistHandoff(row);
  }

  function placeUi(ui) {
    var boxRadio = findCheckedBoxRadio();
    if (boxRadio) {
      var row =
        boxRadio.closest(
          '[data-hook*="Radio"], [role=radio], label, li, div',
        ) || boxRadio.parentElement;
      // Prefer the option card that contains the label-wrapper
      var card = boxRadio.closest("[data-hook]") || row;
      var walk = card;
      for (var up = 0; up < 6 && walk; up++) {
        if (
          walk.querySelector &&
          walk.querySelector('[data-hook="label-wrapper"]')
        ) {
          card = walk;
          break;
        }
        walk = walk.parentElement;
      }
      if (card && card.parentElement) {
        if (
          ui.parentElement !== card.parentElement ||
          ui.previousSibling !== card
        ) {
          if (card.nextSibling) {
            card.parentElement.insertBefore(ui, card.nextSibling);
          } else {
            card.parentElement.appendChild(ui);
          }
        }
        return;
      }
    }
    var heads = document.querySelectorAll("h1,h2,h3,h4");
    for (var hi = 0; hi < heads.length; hi++) {
      var ht = norm(heads[hi].textContent);
      if (
        ht === "Zp\u016fsob doru\u010den\u00ed" ||
        ht === "Delivery method" ||
        ht === "Doprava a doru\u010den\u00ed"
      ) {
        var parent = heads[hi].parentElement;
        if (parent) {
          parent.appendChild(ui);
          return;
        }
      }
    }
    (document.querySelector("form") || document.body).appendChild(ui);
  }

  function ensureUi() {
    var ui = document.getElementById(UI_ID);
    if (ui) return ui;
    ui = document.createElement("div");
    ui.id = UI_ID;
    ui.style.cssText =
      "margin:12px 0;padding:12px 14px;border:1px solid #48A89C;border-radius:8px;font:400 14px/1.4 system-ui,sans-serif;color:#101830;background:#f7fbfa";
    ui.innerHTML =
      '<div id="poppi-ppl-summary" style="margin-bottom:8px"></div>' +
      '<button type="button" id="poppi-ppl-open" style="background:#48A89C;color:#fff;border:0;border-radius:20px;padding:8px 16px;cursor:pointer;font:600 14px system-ui,sans-serif">Vybrat v\u00fddejn\u00ed m\u00edsto</button>' +
      '<div id="poppi-ppl-err" style="display:none;margin-top:8px;color:#D86864;font-size:13px">Nejd\u0159\u00edv vyberte v\u00fddejn\u00ed box na map\u011b.</div>';
    placeUi(ui);
    document
      .getElementById("poppi-ppl-open")
      .addEventListener("cli" + "ck", function () {
        openWhenReady();
      });
    return ui;
  }

  function renderUi() {
    if (_busy) return;
    _busy = true;
    try {
      var box = false;
      try {
        box = isBoxMode();
      } catch (e) {
        box = false;
      }
      var ui = document.getElementById(UI_ID);
      if (box === _lastBox && ui) {
        if (box) {
          placeUi(ui);
          updateSummary();
          reapplyHandoff();
        }
        return;
      }
      _lastBox = box;
      if (!box) {
        if (ui) ui.style.display = "none";
        return;
      }
      ui = ensureUi();
      placeUi(ui);
      ui.style.display = "block";
      updateSummary();
      reapplyHandoff();
    } finally {
      _busy = false;
    }
  }

  function updateSummary() {
    var point = loadPoint();
    var sum = document.getElementById("poppi-ppl-summary");
    var handoff = window.__poppiPplHandoff;
    if (sum) {
      if (point && point.code) {
        var hand =
          handoff && handoff.ok && handoff.via === "api"
            ? " \u00b7 k\u00f3d ulo\u017een na server"
            : handoff && handoff.ok
              ? " \u00b7 k\u00f3d props\u00e1n do formul\u00e1\u0159e"
              : handoff && handoff.ok === false
                ? " \u00b7 k\u00f3d ulo\u017een lok\u00e1ln\u011b"
                : "";
        sum.textContent =
          "Vybr\u00e1no: " + point.name + " (" + point.code + ")" + hand;
      } else {
        sum.textContent =
          "Vyberte v\u00fddejn\u00ed box PPL / AlzaBox na map\u011b.";
      }
    }
    var err = document.getElementById("poppi-ppl-err");
    if (err && point && point.code && err.style.display === "block") {
      // Keep handoff warning if persist failed; hide default gate message
      if ((err.textContent || "").indexOf("Nejd\u0159\u00edv") === 0) {
        err.style.display = "none";
      }
    }
  }

  function gateContinue(ev) {
    var ui = document.getElementById(UI_ID);
    if (!ui || ui.style.display === "none") return;
    var point = loadPoint();
    var t = ev.target;
    if (!t || !t.closest) return;
    var btn = t.closest("button,a,[role=button]");
    if (!btn || btn.id === "poppi-ppl-open") return;
    var label = norm(btn.textContent);
    if (!/Pokra\u010dovat|Continue|Place Order|Odeslat|Zaplatit/i.test(label))
      return;
    if (point && point.code) {
      var ok = persistHandoff(point);
      postHandoff(point);
      updateSummary();
      if (
        !ok &&
        !(window.__poppiPplHandoff && window.__poppiPplHandoff.via === "api")
      ) {
        showErr(
          "V\u00fddejn\u00ed m\u00edsto je vybran\u00e9. K\u00f3d " +
            point.code +
            " odes\u00edl\u00e1me na server; pokud chyb\u00ed v objedn\u00e1vce, napi\u0161te info@poppi.academy.",
        );
      }
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    showErr("Nejd\u0159\u00edv vyberte v\u00fddejn\u00ed box na map\u011b.");
    try {
      ui.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {}
    var open = document.getElementById("poppi-ppl-open");
    if (open) open.focus();
  }

  function boot() {
    dismissCookies();
    renderUi();
    document.addEventListener("cli" + "ck", gateContinue, true);
    document.addEventListener("chan" + "ge", function () {
      _lastBox = null;
      renderUi();
      reapplyHandoff();
    });
    setInterval(function () {
      renderUi();
    }, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
