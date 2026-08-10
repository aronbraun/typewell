/* Typewell regression suite.
 *
 * Every check in here exists because the behaviour it covers broke at least
 * once. The app is one 3,700-line file of contenteditable and execCommand,
 * where a fix in one control routinely lands on another, and "I clicked around
 * and it looked fine" has now missed the same class of bug several times
 * running. This file is the replacement for clicking around.
 *
 * It drives the real app in an iframe: real elements, real events, real
 * execCommand. No mocks — a mock of contenteditable would agree with whatever
 * I believed at the time, which is exactly the failure mode.
 *
 * Runs two ways, same code both times:
 *   tests/index.html in a browser — open it, read the list
 *   node tests/run.mjs          — headless Chrome over CDP, exit code 1 on red
 */
export function suite(win) {
  const doc = win.document;
  const $ = (s) => doc.querySelector(s);
  const ed = $("#editor");
  const results = [];

  /* ---- assertions ---- */
  const eq = (a, b, m) => {
    if (a !== b) throw new Error(`${m || ""}\n  expected: ${JSON.stringify(b)}\n  actual:   ${JSON.stringify(a)}`);
  };
  const ok = (v, m) => { if (!v) throw new Error(m || "expected truthy"); };
  const has = (s, sub, m) => { if (!String(s).includes(sub)) throw new Error(`${m || ""}\n  ${JSON.stringify(s)}\n  should contain ${JSON.stringify(sub)}`); };
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (e) { results.push({ name, pass: false, error: e.message }); }
  };

  /* ---- driving the app the way a person does ---- */
  const setHTML = (html) => { ed.innerHTML = html; ed.focus(); };
  const sel = () => win.getSelection();
  const caret = (node, off) => {
    const r = doc.createRange(); r.setStart(node, off); r.collapse(true);
    sel().removeAllRanges(); sel().addRange(r); ed.focus();
  };
  const range = (node, a, b) => {
    const r = doc.createRange(); r.setStart(node, a); r.setEnd(node, b);
    sel().removeAllRanges(); sel().addRange(r); ed.focus();
  };
  const selectAll = (el) => {
    const r = doc.createRange(); r.selectNodeContents(el);
    sel().removeAllRanges(); sel().addRange(r); ed.focus();
  };
  const mouse = (el, type, init = {}) =>
    el.dispatchEvent(new win.MouseEvent(type, Object.assign(
      { bubbles: true, cancelable: true, view: win }, init)));
  const press = (el, key, init = {}) =>
    el.dispatchEvent(new win.KeyboardEvent("keydown", Object.assign(
      { bubbles: true, cancelable: true, key }, init)));
  /* the real typing path: beforeinput first, so the armed-format handler gets
     its chance to intercept exactly as it does for a human */
  const type = (str) => {
    for (const ch of str) {
      const e = new win.InputEvent("beforeinput",
        { bubbles: true, cancelable: true, inputType: "insertText", data: ch });
      if (ed.dispatchEvent(e)) doc.execCommand("insertText", false, ch);
    }
  };
  const pickDD = (btnSel, label) => {
    const b = $(btnSel);
    mouse(b, "mousedown"); mouse(b, "click");
    const menu = doc.querySelector(".dd-menu.open");
    if (!menu) throw new Error(`${btnSel} did not open a menu`);
    const item = [...menu.querySelectorAll("button")].find((x) => x.textContent.trim() === label);
    if (!item) throw new Error(`no "${label}" in ${btnSel}`);
    mouse(item, "mousedown"); mouse(item, "click");
  };
  const tag = (el) => el && el.tagName;

  /* ═════════ headings ═════════ */

  test("heading via dropdown sets the tag", () => {
    setHTML("<p>title here</p>");
    caret(ed.firstChild.firstChild, 3);
    pickDD("#blockSelect", "Heading 1");
    eq(tag(ed.firstElementChild), "H1");
  });

  test("heading beats an inline font-size (size stepper, or any paste)", () => {
    setHTML('<p><span style="font-size:20px">sized line</span></p>');
    caret(ed.querySelector("span").firstChild, 3);
    pickDD("#blockSelect", "Heading 1");
    const h = ed.firstElementChild;
    eq(tag(h), "H1");
    ok(!/font-size/.test(ed.innerHTML), "an inline font-size survived into the heading");
    ok(parseFloat(win.getComputedStyle(h).fontSize) > 20,
      "heading rendered at the paragraph size — bold but not bigger");
  });

  test("heading on a list item lifts it out instead of wrapping the list", () => {
    setHTML("<ul><li>first</li><li>middle</li><li>last</li></ul>");
    caret(ed.querySelectorAll("li")[1].firstChild, 3);
    pickDD("#blockSelect", "Heading 2");
    ok(!/<h2><ul|<h2>\s*<ul/.test(ed.innerHTML), "the heading swallowed the whole list");
    eq([...ed.children].map(tag).join(","), "UL,H2,UL");
    eq(ed.querySelector("h2").textContent, "middle");
    ok(!/class=""/.test(ed.innerHTML), "left an empty class attribute behind");
  });

  test("heading via the markdown trigger also drops inline sizes", () => {
    setHTML('<p><span style="font-size:20px">##</span></p>');
    const sp = ed.querySelector("span");
    caret(sp.firstChild, 2);
    press(ed, " ", { key: " " });
    eq(tag(ed.firstElementChild), "H2");
    ok(!/font-size/.test(ed.innerHTML), "inline size survived the markdown heading");
  });

  test("block dropdown offers headings only", () => {
    const b = $("#blockSelect");
    mouse(b, "mousedown"); mouse(b, "click");
    const labels = [...doc.querySelectorAll(".dd-menu.open button")].map((x) => x.textContent.trim());
    mouse(doc.body, "mousedown");
    eq(labels.length, 7);
    ok(!labels.some((l) => /quote|code/i.test(l)), "quote/code are back in the block dropdown");
  });

  /* ═════════ font ═════════ */

  test("font with a selection touches only the selection", () => {
    setHTML("<p>one two</p>");
    range(ed.firstChild.firstChild, 0, 3);
    pickDD("#fontSelect", "Georgia");
    eq(ed.innerHTML, '<p><font face="Georgia">one</font> two</p>');
  });

  test("font with no selection applies from here on, not to the block", () => {
    setHTML("<p>abc</p>");
    caret(ed.firstChild.firstChild, 3);
    pickDD("#fontSelect", "Courier New");
    eq(ed.innerHTML, "<p>abc</p>", "picking a font restyled text that was already there");
    type("XY");
    eq(ed.innerHTML, '<p>abc<font face="Courier New">XY</font></p>');
  });

  test("font works on the first pick, not the second", () => {
    setHTML("<p>x</p>");
    caret(ed.firstChild.firstChild, 1);
    pickDD("#fontSelect", "Courier New");
    type("a");
    has(ed.innerHTML, 'face="Courier New"', "first pick did nothing");
  });

  test("the font label shows what you will get", () => {
    setHTML("<p>x</p>");
    caret(ed.firstChild.firstChild, 1);
    pickDD("#fontSelect", "Verdana");
    eq($("#fontSelect .lbl").textContent, "Verdana");
  });

  test("moving the caret cancels an armed font", () => {
    setHTML("<p>abc</p><p>def</p>");
    caret(ed.firstChild.firstChild, 3);
    pickDD("#fontSelect", "Courier New");
    caret(ed.lastChild.firstChild, 1);           /* fires selectionchange */
    type("Z");
    ok(!/Courier New/.test(ed.innerHTML), "an armed font followed the caret to another line");
  });

  /* ═════════ size ═════════ */

  const bump = (n) => { for (let i = 0; i < n; i++) mouse($("#sizeUp"), "mousedown"); };
  const size = (el) => Math.round(parseFloat(win.getComputedStyle(el).fontSize));

  test("the size stepper steps once per click", () => {
    setHTML("<p>abc</p>");
    range(ed.firstChild.firstChild, 0, 3);
    bump(1);
    const from = Number($("#sizeVal").textContent);
    bump(2);
    eq($("#sizeVal").textContent, String(from + 2), "clicks after the first were swallowed");
    eq(size(ed.querySelector("p span") || ed.querySelector("p")), from + 2,
      "the readout moved but the text did not");
  });

  test("resizing a nested list moves every row, markers included", () => {
    setHTML("<p>before</p><ul><li>top one</li><li>top two" +
      '<ul><li><span style="font-size:20px">already 20</span></li><li>plain</li></ul>' +
      "</li></ul><p>after</p>");
    const li = ed.querySelectorAll("li");
    const base = size(ed.querySelector("p"));
    /* one selection running from the first top-level row into the last sub-item */
    const r = doc.createRange();
    r.setStart(li[0].firstChild, 0);
    r.setEnd(li[3].firstChild, li[3].firstChild.length);
    const s = win.getSelection(); s.removeAllRanges(); s.addRange(r); ed.focus();
    bump(2);
    const want = size(li[0]);
    ok(want > base, `nothing moved — still ${want}px`);
    [...ed.querySelectorAll("li")].forEach((el, i) => {
      eq(size(el), want, `row ${i} stayed at ${size(el)}px while the rest went to ${want}px`);
    });
    /* the size already sitting on "already 20" would otherwise outrank the new
       one and that row alone would refuse to move */
    ok(!/font-size:\s*20px/.test(ed.innerHTML), "a stale inline size survived and still wins");
    eq(size(ed.querySelector("p")), base, "text outside the selection was resized too");
  });

  test("resizing the same words twice does not nest spans", () => {
    setHTML("<p>alpha bravo charlie</p>");
    range(ed.firstChild.firstChild, 6, 11);
    bump(1);
    const once = (ed.innerHTML.match(/<span/g) || []).length;
    bump(1);
    eq((ed.innerHTML.match(/<span/g) || []).length, once, "a second click wrapped another span");
  });

  test("the size stepper with no selection does not resize the document", () => {
    setHTML("<p>hello</p>");
    const base = size(ed.querySelector("p"));
    caret(ed.firstChild.firstChild, 5);
    bump(2);
    eq(size(ed.querySelector("p")), base, "a bare caret resized text that was already there");
    type("X");
    has(ed.innerHTML, "font-size", "the armed size never landed on what was typed");
  });

  test("font on a task line is not silently refused", () => {
    setHTML('<ul class="tasks"><li><input type="checkbox" contenteditable="false"><span class="task-text">buy milk</span></li></ul>');
    const t = ed.querySelector(".task-text");
    selectAll(t);
    pickDD("#fontSelect", "Georgia");
    has(ed.innerHTML, "Georgia", "execCommand refused the edit and nothing happened");
  });

  /* ═════════ inline code and code blocks ═════════ */

  test("inline code wraps a selection and stays lit", () => {
    setHTML("<p>hello world</p>");
    range(ed.firstChild.firstChild, 0, 5);
    mouse($("#inlineCodeBtn"), "mousedown");
    eq(ed.innerHTML, "<p><code>hello</code> world</p>");
    ok($("#inlineCodeBtn").classList.contains("on"), "button went dark the instant it was pressed");
  });

  test("inline code with no selection arms, like bold", () => {
    setHTML("<p>run </p>");
    caret(ed.firstChild.firstChild, 4);
    mouse($("#inlineCodeBtn"), "mousedown");
    ok($("#inlineCodeBtn").classList.contains("on"), "no feedback that anything happened");
    type("npm i");
    eq(ed.innerHTML, "<p>run <code>npm i</code></p>");
  });

  test("inline code toggles back off", () => {
    setHTML("<p><code>hi</code> there</p>");
    caret(ed.querySelector("code").firstChild, 1);
    mouse($("#inlineCodeBtn"), "mousedown");
    eq(ed.innerHTML, "<p>hi there</p>");
  });

  test("inline code across an element boundary leaves no empty shells", () => {
    setHTML("<p><b>bo</b>ld run</p>");
    const r = doc.createRange();
    r.setStart(ed.querySelector("b").firstChild, 1);
    r.setEnd(ed.firstChild.lastChild, 2);
    sel().removeAllRanges(); sel().addRange(r); ed.focus();
    mouse($("#inlineCodeBtn"), "mousedown");
    ok(!/<b><\/b>|<i><\/i>|<span><\/span>/.test(ed.innerHTML), "empty formatting shell left behind");
  });

  test("code block button toggles both ways", () => {
    setHTML("<p>const x = 1</p>");
    caret(ed.firstChild.firstChild, 3);
    mouse($("#codeBlockBtn"), "mousedown");
    eq(tag(ed.firstElementChild), "PRE");
    ok($("#codeBlockBtn").classList.contains("on"));
    mouse($("#codeBlockBtn"), "mousedown");
    eq(tag(ed.firstElementChild), "P");
  });

  test("leaving a multi-line code block gives one paragraph per line", () => {
    setHTML("<pre>one\ntwo\nthree</pre>");
    caret(ed.firstElementChild.firstChild, 1);
    mouse($("#codeBlockBtn"), "mousedown");
    eq([...ed.children].map(tag).join(","), "P,P,P");
    eq([...ed.children].map((p) => p.textContent).join("|"), "one|two|three");
  });

  /* ═════════ colour ═════════ */

  const openColour = (btnSel) => {
    const b = $(btnSel);
    mouse(b, "mousedown"); mouse(b, "click");
    const m = doc.querySelector(".cp-menu");
    if (!m) throw new Error(`${btnSel} did not open the palette`);
    return m;
  };

  test("the whole colour button opens the palette", () => {
    setHTML("<p>colour me</p>");
    range(ed.firstChild.firstChild, 0, 6);
    const m = openColour("#foreBtn");
    ok(m.classList.contains("open"));
    mouse(doc.body, "mousedown");
  });

  test("the palette lays out as a grid, not one swatch per line", () => {
    setHTML("<p>x</p>"); caret(ed.firstChild.firstChild, 1);
    const m = openColour("#foreBtn");
    const grid = m.querySelector(".cp-grid");
    const sw = grid.querySelector("button").getBoundingClientRect();
    ok(sw.width < 40, `swatch stretched to ${Math.round(sw.width)}px — .menu button width:100% won`);
    ok(grid.scrollWidth <= grid.clientWidth + 1, "the swatch grid overflows its popup");
    const perRow = Math.round(grid.getBoundingClientRect().width / (sw.width + 5));
    ok(perRow >= 7, `only ${perRow} swatches per row`);
    mouse(doc.body, "mousedown");
  });

  test("the palette stays on screen", () => {
    setHTML("<p>x</p>"); caret(ed.firstChild.firstChild, 1);
    const m = openColour("#hiliteBtn");
    const r = m.getBoundingClientRect();
    ok(r.left >= 0 && r.right <= win.innerWidth, "palette hangs off the side of the window");
    ok(r.top >= 0 && r.bottom <= win.innerHeight, "palette hangs off the bottom of the window");
    mouse(doc.body, "mousedown");
  });

  test("custom picker and hex box are inside the popup, at the top", () => {
    setHTML("<p>x</p>"); caret(ed.firstChild.firstChild, 1);
    const m = openColour("#foreBtn");
    eq(m.firstElementChild.className, "cp-top", "custom row is not the first thing in the popup");
    const native = m.querySelector('input[type="color"]');
    ok(native, "no colour picker in the popup");
    const nr = native.getBoundingClientRect();
    const mr = m.getBoundingClientRect();
    ok(nr.left >= mr.left && nr.top >= mr.top && nr.width > 0,
      "the native picker is off-screen — the OS dialog will open in the corner");
    ok(m.querySelector(".cp-hex"), "no hex field");
    mouse(doc.body, "mousedown");
  });

  test("one click on a preset applies it and closes", () => {
    setHTML("<p>colour me</p>");
    range(ed.firstChild.firstChild, 0, 6);
    const m = openColour("#foreBtn");
    const swatches = [...m.querySelectorAll(".cp-grid button")];
    const target = swatches[7];
    const want = target.style.background;
    mouse(target, "mousedown"); mouse(target, "click");
    ok(!doc.querySelector(".cp-menu"), "the palette stayed open after a pick");
    has(ed.innerHTML, "<font color=", "the colour was not applied");
    eq($("#foreBar").style.background, want, "the button did not adopt the colour");
  });

  test("picked colours come back under Recent", () => {
    setHTML("<p>x</p>"); caret(ed.firstChild.firstChild, 1);
    const m = openColour("#foreBtn");
    const labels = [...m.querySelectorAll(".cp-lbl")].map((l) => l.textContent);
    ok(labels.includes("Recent"), `no Recent section — sections were ${labels}`);
    ok(m.querySelector(".cp-grid button.cur"), "the colour in use is not marked");
    mouse(doc.body, "mousedown");
  });

  test("highlight offers a way to remove the highlight", () => {
    setHTML("<p>x</p>"); caret(ed.firstChild.firstChild, 1);
    const m = openColour("#hiliteBtn");
    ok(m.querySelector(".cp-grid button.none"), "no 'no highlight' swatch");
    mouse(doc.body, "mousedown");
  });

  /* ═════════ moving blocks ═════════ */

  const hover = (el, dx = 20, dy = 5) => {
    const r = el.getBoundingClientRect();
    ed.dispatchEvent(new win.MouseEvent("mousemove",
      { bubbles: true, view: win, clientX: r.left + dx, clientY: r.top + dy }));
  };

  test("the grip survives the trip from the text out to the gutter", () => {
    setHTML("<ul><li>alpha</li><li>beta</li></ul>");
    const li = ed.querySelectorAll("li")[1];
    hover(li);
    ok($("#dragUI").classList.contains("on"), "no grip to begin with");
    const grip = doc.querySelector("#dragUI .dragh");
    const g = grip.getBoundingClientRect();
    const r = li.getBoundingClientRect();
    /* walk the pointer left from the text to the grip, one pixel at a time,
       through the page margin — which is outside #editor */
    for (let x = r.left; x >= g.left + g.width / 2; x--) {
      doc.dispatchEvent(new win.MouseEvent("mousemove",
        { bubbles: true, view: win, clientX: x, clientY: r.top + 5 }));
    }
    ok($("#dragUI").classList.contains("on"),
      "the grip disappeared on the way to it — nothing left to grab");
    ok(win.getComputedStyle(grip).cursor === "grab", "the grip has no grab cursor");
    ok(win.getComputedStyle(grip).pointerEvents === "auto", "the grip cannot be clicked");
    ok(parseFloat(win.getComputedStyle(grip).opacity) > 0.2, "the grip is invisible");
  });

  test("the grip follows list items", () => {
    setHTML("<ul><li>alpha</li><li>beta</li></ul>");
    hover(ed.querySelectorAll("li")[1]);
    ok($("#dragUI").classList.contains("on"), "no grip for a list item");
  });

  test("the grip follows paragraphs, headings and quotes too", () => {
    setHTML("<h2>head</h2><p>para</p><blockquote><p>quoted</p></blockquote>");
    for (const s of ["h2", "p", "blockquote"]) {
      hover(ed.querySelector(s));
      ok($("#dragUI").classList.contains("on"), `no grip for <${s}> — only lists were draggable before`);
    }
  });

  test("the grip keeps clear of bullets, numbers and checkboxes", () => {
    setHTML(
      "<p>plain</p>" +
      "<ul><li>bullet</li></ul>" +
      "<ol><li>numbered</li></ol>" +
      '<ul class="tasks"><li><input type="checkbox" contenteditable="false"><span class="task-text">task</span></li></ul>' +
      "<blockquote><p>quoted</p></blockquote>");
    const grip = doc.querySelector("#dragUI .dragh");
    const at = (el) => { hover(el, 15, 5); return grip.getBoundingClientRect(); };
    const rows = [
      ["paragraph", ed.querySelector("p")],
      ["bullet", ed.querySelector("ul:not(.tasks) li")],
      ["numbered", ed.querySelector("ol li")],
      ["task", ed.querySelector("ul.tasks li")],
      ["quote", ed.querySelector("blockquote p")],
    ].map(([label, el]) => {
      const g = at(el);
      /* A bullet is painted in the parent list's padding, outside the <li>, so
         the grip has to clear the *marker*, not the item box. Both naive
         answers were shipped and both were rejected on sight: measure the <li>
         and the grip lands on the bullet, measure the <ul> and it sits an
         indent away with a visible hole between it and the row. The gap below
         is the one the row's own leftmost ink gets. */
      const own = el.getBoundingClientRect();
      const box = (el.parentElement.tagName === "BLOCKQUOTE" ? el.parentElement : el)
        .getBoundingClientRect();
      return { label, left: g.left, right: g.right, gap: box.left - g.right };
    });
    for (const r of rows) {
      ok(r.gap >= 4, `${r.label}: only ${Math.round(r.gap)}px between the grip and the row — it reads as attached`);
      ok(r.gap <= 30, `${r.label}: ${Math.round(r.gap)}px between the grip and the row — it reads as unrelated to it`);
    }
    /* one loose column, not one exact column: a bullet row's grip steps right
       to hug its marker, but nothing may stick out further left than a plain
       paragraph's, or the gutter looks ragged as you run down the page */
    const p = rows[0].right;
    for (const r of rows.slice(1)) {
      ok(r.right >= p - 1,
        `${r.label}: the grip sits ${Math.round(p - r.right)}px further left than a paragraph's`);
      ok(r.right - p <= 10,
        `${r.label}: the grip sits ${Math.round(r.right - p)}px right of a paragraph's — the column is ragged`);
    }
  });

  test("dragging a row past the next one reorders it", () => {
    setHTML("<ul><li>alpha</li><li>beta</li><li>gamma</li></ul>");
    const li = ed.querySelectorAll("li")[1];
    hover(li);
    const grip = doc.querySelector("#dragUI .dragh");
    const r = li.getBoundingClientRect();
    mouse(grip, "mousedown", { clientX: r.left, clientY: r.top + 3 });
    ok(li.classList.contains("drag-src"), "the source row is not marked while dragging");
    ok(doc.querySelector("#dragUI .ghost").textContent.includes("beta"),
      "the thing under the cursor does not say what you picked up");
    const last = ed.querySelectorAll("li")[2].getBoundingClientRect();
    doc.dispatchEvent(new win.MouseEvent("mousemove",
      { bubbles: true, view: win, clientX: last.left + 10, clientY: last.bottom - 1 }));
    const line = doc.querySelector("#dragUI .dropline");
    ok(parseFloat(line.style.width) > 40, "the drop line has no width");
    doc.dispatchEvent(new win.MouseEvent("mouseup", { bubbles: true, view: win }));
    eq([...ed.querySelectorAll("li")].map((x) => x.textContent).join(","), "alpha,gamma,beta");
    ok(!/drag-src|class=""/.test(ed.innerHTML), "drag chrome leaked into the note");
  });

  test("escape during a drag puts everything back", () => {
    setHTML("<ul><li>alpha</li><li>beta</li><li>gamma</li></ul>");
    const li = ed.querySelectorAll("li")[0];
    hover(li);
    const grip = doc.querySelector("#dragUI .dragh");
    const r = li.getBoundingClientRect();
    mouse(grip, "mousedown", { clientX: r.left, clientY: r.top + 3 });
    const last = ed.querySelectorAll("li")[2].getBoundingClientRect();
    doc.dispatchEvent(new win.MouseEvent("mousemove",
      { bubbles: true, view: win, clientX: last.left + 10, clientY: last.bottom - 1 }));
    doc.dispatchEvent(new win.KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }));
    doc.dispatchEvent(new win.MouseEvent("mouseup", { bubbles: true, view: win }));
    eq([...ed.querySelectorAll("li")].map((x) => x.textContent).join(","), "alpha,beta,gamma");
    ok(!ed.innerHTML.includes("drag-src"));
  });

  test("Alt+Shift+arrow moves the block at the caret", () => {
    setHTML("<ul><li>alpha</li><li>beta</li></ul>");
    caret(ed.querySelector("li").firstChild, 2);
    press(ed, "ArrowDown", { altKey: true, shiftKey: true });
    eq([...ed.querySelectorAll("li")].map((x) => x.textContent).join(","), "beta,alpha");
  });

  test("a block never escapes its own parent", () => {
    setHTML("<p>top</p><ul><li>only</li></ul>");
    caret(ed.querySelector("li").firstChild, 2);
    press(ed, "ArrowUp", { altKey: true, shiftKey: true });
    eq([...ed.children].map(tag).join(","), "P,UL", "a list item jumped out of its list");
  });

  test("top-level blocks reorder among themselves", () => {
    setHTML("<h2>head</h2><p>para</p>");
    caret(ed.querySelector("p").firstChild, 2);
    press(ed, "ArrowUp", { altKey: true, shiftKey: true });
    eq([...ed.children].map(tag).join(","), "P,H2");
  });

  /* ═════════ the checkbox button ═════════
   *
   * The button used to reach for editor.children, so a <ul> came back as one
   * "block" and its whole "<li>a</li><li>b</li>" was pushed into a single
   * checkbox line — from which the items promptly escaped and sat in the
   * document as stray bullets. With a caret inside an item instead, the new
   * task list was planted *inside* the bullet list, a <ul> as the direct child
   * of a <ul>.
   *
   * The first fix for that was checked against hand-written `<ul>` fixtures and
   * shipped still broken, because that is not the markup the app produces:
   * select some paragraphs, press the bullet button, and Chrome's own
   * insertUnorderedList leaves the list INSIDE the paragraph it was made from —
   * `<p><ul><li>…</li></ul></p>`. Every check below that starts from a list
   * therefore builds it by pressing the real button, not by assigning HTML. The
   * hand-written shapes are still worth having (that is what an import or a
   * paste looks like), so both are covered. */

  const taskBtn = () => mouse($("#taskBtn"), "mousedown");
  /* the readable shape of the editor: task rows as "[ ] text", everything else
     as its tag, so a failure prints something a person can act on */
  /* one row per item, a ">" per level of indent, so a nesting bug prints as a
     row in the wrong column rather than as a wall of HTML */
  const taskRows = (ul, depth) => {
    const rows = [];
    const row = (li) => rows.push(">".repeat(depth) +
      "[" + (li.querySelector(":scope > input")?.hasAttribute("checked") ? "x" : " ") + "]" +
      (li.querySelector(":scope > .task-text")?.textContent ?? "?"));
    for (const ch of ul.children) {
      if (ch.matches("ul.tasks")) { rows.push(...taskRows(ch, depth + 1)); continue; }
      if (ch.tagName !== "LI") continue;
      row(ch);
      for (const sub of ch.children) if (sub.matches("ul.tasks")) rows.push(...taskRows(sub, depth + 1));
    }
    return rows;
  };
  const bulletRows = (ul, depth) => {
    const rows = [];
    for (const ch of ul.children) {
      if (ch.matches("ul,ol")) { rows.push(...bulletRows(ch, depth + 1)); continue; }
      if (ch.tagName !== "LI") continue;
      const subs = [...ch.children].filter((c) => c.matches("ul,ol"));
      const own = [...ch.childNodes].filter((n) => !subs.includes(n)).map((n) => n.textContent).join("");
      rows.push(">".repeat(depth) + own);
      for (const sub of subs) rows.push(...bulletRows(sub, depth + 1));
    }
    return rows;
  };
  const describe = (el) => {
    if (el.matches("ul.tasks")) return "TASKS(" + taskRows(el, 0).join("|") + ")";
    if (el.matches("ul,ol")) return el.tagName + "(" + bulletRows(el, 0).join("|") + ")";
    /* a wrapper the browser left around a list is part of the shape, not noise:
       a task list buried in one is exactly the bug */
    const inner = [...el.children].filter((c) => c.matches("ul,ol"));
    if (inner.length && !el.textContent.replace(inner.map((i) => i.textContent).join(""), "").trim())
      return el.tagName + "[" + inner.map(describe).join(" ") + "]";
    return el.tagName + "(" + el.textContent + ")";
  };
  const shape = () => [...ed.children].map(describe).join(" ");
  const selectItems = (a, b) => {
    const r = doc.createRange();
    r.setStart(a.firstChild, 0);
    r.setEnd(b.firstChild, b.firstChild.length);
    sel().removeAllRanges(); sel().addRange(r); ed.focus();
  };
  /* the route a person actually takes: type lines, select them, press the
     button in the toolbar — whatever markup that leaves behind is the markup
     the checkbox button has to cope with */
  const listFromButton = (cmd, lines) => {
    setHTML(lines.map((l) => `<p>${l}</p>`).join(""));
    selectAll(ed);
    mouse($(`[data-cmd="${cmd}"]`), "mousedown");
  };

  test("the bullet button really does leave the list inside a paragraph", () => {
    listFromButton("insertUnorderedList", ["alpha", "beta"]);
    /* Not a wish — a guard. If a future Chrome stops doing this, the checks
       below quietly stop testing the case they were written for, and this one
       goes red to say so. */
    eq(shape(), "P[UL(alpha|beta)]",
      "the browser no longer wraps a new list in a <p> — re-read the checkbox tests, they were written for that shape");
  });

  test("a bullet list made with the toolbar becomes checkboxes, one per bullet", () => {
    listFromButton("insertUnorderedList", ["alpha", "beta", "gamma"]);
    selectAll(ed);
    taskBtn();
    eq(shape(), "TASKS([ ]alpha|[ ]beta|[ ]gamma)");
  });

  test("a numbered list made with the toolbar becomes checkboxes too", () => {
    listFromButton("insertOrderedList", ["one", "two"]);
    selectAll(ed);
    taskBtn();
    eq(shape(), "TASKS([ ]one|[ ]two)");
  });

  test("the toolbar list survives being toggled back and forth", () => {
    listFromButton("insertUnorderedList", ["alpha", "beta", "gamma"]);
    selectAll(ed); taskBtn();
    selectAll(ed); taskBtn();
    eq(shape(), "P(alpha) P(beta) P(gamma)", "toggling off left a copy behind");
    selectAll(ed); taskBtn();
    eq(shape(), "TASKS([ ]alpha|[ ]beta|[ ]gamma)", "the second conversion was not the same as the first");
  });

  test("one item of a toolbar list converts without disturbing the others", () => {
    listFromButton("insertUnorderedList", ["a", "b", "c"]);
    const li = ed.querySelectorAll("li")[1];
    caret(li.firstChild, 1);
    taskBtn();
    eq(shape(), "P[UL(a)] TASKS([ ]b) P[UL(c)]");
  });

  test("a bullet list becomes checkboxes, one per bullet", () => {
    setHTML("<ul><li>alpha</li><li>beta</li><li>gamma</li></ul>");
    selectAll(ed.querySelector("ul"));
    taskBtn();
    eq(shape(), "TASKS([ ]alpha|[ ]beta|[ ]gamma)");
  });

  test("a numbered list becomes checkboxes too", () => {
    setHTML("<ol><li>one</li><li>two</li></ol>");
    selectAll(ed.querySelector("ol"));
    taskBtn();
    eq(shape(), "TASKS([ ]one|[ ]two)");
  });

  test("no task list is ever planted inside a bullet list", () => {
    setHTML("<ul><li>alpha</li><li>beta</li></ul>");
    caret(ed.querySelector("li").firstChild, 2);
    taskBtn();
    eq(ed.querySelector("ul ul"), null, "a <ul> ended up as the child of a <ul>");
    eq(shape(), "TASKS([ ]alpha) UL(beta)");
  });

  test("converting some of a list leaves the rest of it alone", () => {
    setHTML("<ul><li>alpha</li><li>beta</li><li>gamma</li></ul>");
    const li = ed.querySelectorAll("li");
    selectItems(li[1], li[2]);
    taskBtn();
    eq(shape(), "UL(alpha) TASKS([ ]beta|[ ]gamma)");
  });

  test("a split numbered list carries on counting", () => {
    setHTML("<ol><li>one</li><li>two</li><li>three</li></ol>");
    const li = ed.querySelectorAll("li");
    selectItems(li[1], li[1]);
    taskBtn();
    eq(shape(), "OL(one) TASKS([ ]two) OL(three)");
    eq(ed.querySelectorAll("ol")[1].getAttribute("start"), "2",
      "the second half restarted at 1, so the document counts 1, 1");
  });

  test("paragraphs and a list convert together, in order", () => {
    setHTML("<p>intro</p><ul><li>a</li><li>b</li></ul>");
    selectAll(ed);
    taskBtn();
    eq(shape(), "TASKS([ ]intro|[ ]a|[ ]b)");
  });

  test("a sub-list comes along and keeps its indent", () => {
    setHTML("<ul><li>outer<ul><li>inner</li></ul></li><li>after</li></ul>");
    caret(ed.querySelector("li").firstChild, 2);
    taskBtn();
    eq(shape(), "TASKS([ ]outer|>[ ]inner) UL(after)");
  });

  test("a list inside a quote stays inside the quote", () => {
    setHTML("<blockquote><ul><li>a</li><li>b</li></ul></blockquote>");
    selectAll(ed.querySelector("ul"));
    taskBtn();
    eq(shape(), "BLOCKQUOTE[TASKS([ ]a|[ ]b)]");
    ok(ed.querySelector("blockquote > ul.tasks"), "the task list was lifted out of the quote");
  });

  test("bold and links survive the conversion", () => {
    setHTML("<ul><li><b>bold</b> and <i>it</i></li></ul>");
    selectAll(ed.querySelector("ul"));
    taskBtn();
    has(ed.querySelector(".task-text").innerHTML, "<b>bold</b>", "inline marks were flattened away");
  });

  test("the button toggles back off to plain paragraphs", () => {
    setHTML("<ul><li>alpha</li><li>beta</li></ul>");
    selectAll(ed.querySelector("ul"));
    taskBtn();
    selectAll(ed.querySelector("ul.tasks"));
    taskBtn();
    eq(shape(), "P(alpha) P(beta)");
  });

  /* ---- the shapes that come back after un-bulleting, and indented ones ---- */

  /* Un-bulleting does not hand the paragraphs back: the browser collapses the
     whole list into one <p>a<br>b<br>c</p>. Press the checkbox button on that
     and the old code made a single enormous checkbox holding all three lines. */
  test("the bullet button really does collapse an un-bulleted list into one block", () => {
    listFromButton("insertUnorderedList", ["alpha", "beta", "gamma"]);
    selectAll(ed);
    mouse($('[data-cmd="insertUnorderedList"]'), "mousedown");
    eq(ed.children.length, 1, "un-bulleting no longer leaves one block — re-read the checks below");
    eq(ed.querySelectorAll("br").length, 2, "the lines are no longer <br>-separated");
  });

  test("bullets, then no bullets, then checkboxes gives one box per line", () => {
    listFromButton("insertUnorderedList", ["alpha", "beta", "gamma"]);
    selectAll(ed);
    mouse($('[data-cmd="insertUnorderedList"]'), "mousedown");
    selectAll(ed);
    taskBtn();
    eq(shape(), "TASKS([ ]alpha|[ ]beta|[ ]gamma)",
      "the three lines did not come out as three checkboxes");
  });

  test("indented bullets become indented checkboxes", () => {
    listFromButton("insertUnorderedList", ["one", "two", "three", "four"]);
    const li = ed.querySelectorAll("li");
    caret(li[1].firstChild, 0); press(ed, "Tab");
    caret(ed.querySelectorAll("li")[2].firstChild, 0); press(ed, "Tab"); press(ed, "Tab");
    eq(shape(), "P[UL(one|>two|>>three|four)]", "Tab did not indent the bullets as expected");
    selectAll(ed);
    taskBtn();
    eq(shape(), "TASKS([ ]one|>[ ]two|>>[ ]three|[ ]four)");
  });

  test("Tab indents a checkbox and Shift+Tab brings it back", () => {
    setHTML("<p>alpha</p><p>beta</p>");
    selectAll(ed); taskBtn();
    const rows = ed.querySelectorAll("ul.tasks li");
    caret(rows[1].querySelector(".task-text").firstChild, 1);
    press(ed, "Tab");
    eq(shape(), "TASKS([ ]alpha|>[ ]beta)");
    press(ed, "Tab", { shiftKey: true });
    eq(shape(), "TASKS([ ]alpha|[ ]beta)", "Shift+Tab did not undo the indent");
    eq(ed.querySelectorAll("ul.tasks").length, 1, "an empty sub-list was left behind");
  });

  test("Enter under an indented checkbox stays at that level", () => {
    setHTML("<p>alpha</p><p>beta</p>");
    selectAll(ed); taskBtn();
    const rows = ed.querySelectorAll("ul.tasks li");
    caret(rows[1].querySelector(".task-text").firstChild, 4);
    press(ed, "Tab");
    press(ed, "Enter");
    type("gamma");
    eq(shape(), "TASKS([ ]alpha|>[ ]beta|>[ ]gamma)");
  });

  test("Enter on an empty indented checkbox steps back out a level", () => {
    setHTML("<p>alpha</p><p>beta</p>");
    selectAll(ed); taskBtn();
    const rows = ed.querySelectorAll("ul.tasks li");
    caret(rows[1].querySelector(".task-text").firstChild, 4);
    press(ed, "Tab");
    press(ed, "Enter");                       /* new sub-item, empty */
    press(ed, "Enter");                       /* … so this one outdents it */
    eq(shape(), "TASKS([ ]alpha|>[ ]beta|[ ])");
    press(ed, "Enter");                       /* and now it leaves the list */
    eq(shape(), "TASKS([ ]alpha|>[ ]beta) P()");
  });

  test("an indented list toggles off to bullets and straight back again", () => {
    setHTML("<ul><li>outer<ul><li>inner</li></ul></li></ul>");
    selectAll(ed);
    taskBtn();
    eq(shape(), "TASKS([ ]outer|>[ ]inner)");
    selectAll(ed); taskBtn();
    eq(shape(), "UL(outer|>inner)", "the indent was lost on the way back to bullets");
    selectAll(ed); taskBtn();
    eq(shape(), "TASKS([ ]outer|>[ ]inner)", "the second conversion was not the same as the first");
  });

  /* ---- the way back out: the list buttons, and clear formatting ---- */

  /* Chrome's execCommand looks at the <ul>, decides the list it was asked for
     is already there, and does nothing — so both buttons appeared dead. */
  test("the bullet button turns checkboxes back into bullets", () => {
    setHTML("<p>alpha</p><p>beta</p>");
    selectAll(ed); taskBtn();
    selectAll(ed);
    mouse($('[data-cmd="insertUnorderedList"]'), "mousedown");
    eq(shape(), "UL(alpha|beta)");
    eq(ed.querySelectorAll("input").length, 0, "the checkboxes came along as stray inputs");
  });

  test("the numbered button turns checkboxes into a numbered list", () => {
    setHTML("<p>alpha</p><p>beta</p>");
    selectAll(ed); taskBtn();
    selectAll(ed);
    mouse($('[data-cmd="insertOrderedList"]'), "mousedown");
    eq(shape(), "OL(alpha|beta)");
  });

  test("an indented checkbox list keeps its indent on the way back to bullets", () => {
    setHTML("<ul><li>outer<ul><li>inner</li></ul></li></ul>");
    selectAll(ed); taskBtn();
    selectAll(ed);
    mouse($('[data-cmd="insertUnorderedList"]'), "mousedown");
    eq(shape(), "UL(outer|>inner)");
  });

  test("clear formatting on a bullet list leaves plain paragraphs", () => {
    setHTML("<ul><li><b>alpha</b></li><li>beta</li></ul>");
    selectAll(ed);
    mouse($("#clearFmtBtn"), "mousedown");
    eq(shape(), "P(alpha) P(beta)", "the list survived being cleared");
    eq(ed.querySelector("b"), null, "the bold survived being cleared");
  });

  test("clear formatting on a numbered list leaves plain paragraphs", () => {
    setHTML("<ol><li>one</li><li>two</li></ol>");
    selectAll(ed);
    mouse($("#clearFmtBtn"), "mousedown");
    eq(shape(), "P(one) P(two)");
  });

  test("clear formatting on a checkbox list leaves plain paragraphs", () => {
    setHTML("<p>alpha</p><p>beta</p>");
    selectAll(ed); taskBtn();
    selectAll(ed);
    mouse($("#clearFmtBtn"), "mousedown");
    eq(shape(), "P(alpha) P(beta)");
    eq(ed.querySelectorAll("input").length, 0, "a checkbox was left sitting in the text");
  });

  test("clear formatting flattens an indented list, keeping every line", () => {
    setHTML("<ul><li>outer<ul><li>inner</li></ul></li><li>last</li></ul>");
    selectAll(ed);
    mouse($("#clearFmtBtn"), "mousedown");
    eq(shape(), "P(outer) P(inner) P(last)");
  });

  test("clear formatting keeps links and images, which are not formatting", () => {
    setHTML('<ul><li><b><a href="https://example.com">site</a></b></li></ul>');
    selectAll(ed);
    mouse($("#clearFmtBtn"), "mousedown");
    ok(ed.querySelector('a[href="https://example.com"]'), "the link was thrown away");
    eq(ed.querySelector("b"), null, "the bold survived");
  });

  test("clearing one item of a list leaves the rest of it alone", () => {
    setHTML("<ul><li>a</li><li>b</li><li>c</li></ul>");
    const li = ed.querySelectorAll("li");
    selectItems(li[1], li[1]);
    mouse($("#clearFmtBtn"), "mousedown");
    eq(shape(), "UL(a) P(b) UL(c)");
  });

  test("clearing a list inside a quote leaves the lines in the quote", () => {
    setHTML("<blockquote><ul><li>q1</li><li>q2</li></ul></blockquote>");
    selectAll(ed.querySelector("ul"));
    mouse($("#clearFmtBtn"), "mousedown");
    eq(shape(), "BLOCKQUOTE(q1q2)");
    eq(ed.querySelectorAll("blockquote > p").length, 2, "the lines were lifted out of the quote");
  });

  test("the caret alone is enough to turn checkboxes back into bullets", () => {
    setHTML("<p>alpha</p><p>beta</p>");
    selectAll(ed); taskBtn();
    caret(ed.querySelector(".task-text").firstChild, 2);
    mouse($('[data-cmd="insertUnorderedList"]'), "mousedown");
    eq(shape(), "UL(alpha|beta)");
  });

  test("clear formatting still turns a heading into a paragraph", () => {
    setHTML("<h2>Title</h2>");
    caret(ed.querySelector("h2").firstChild, 2);
    mouse($("#clearFmtBtn"), "mousedown");
    eq(shape(), "P(Title)");
  });

  test("a converted list exports as markdown checkboxes", () => {
    setHTML("<ul><li>alpha</li><li>beta</li></ul>");
    selectAll(ed.querySelector("ul"));
    taskBtn();
    ed.querySelector("input").setAttribute("checked", "");
    const holder = doc.createElement("div");
    holder.innerHTML = ed.innerHTML;
    eq(win.htmlToMd(holder).trim(), "- [x] alpha\n- [ ] beta",
      "the converted list did not survive the trip out to a .md file");
  });

  test("an indented checkbox list round-trips through markdown", () => {
    setHTML("<ul><li>outer<ul><li>inner<ul><li>deeper</li></ul></li></ul></li><li>last</li></ul>");
    selectAll(ed);
    taskBtn();
    eq(shape(), "TASKS([ ]outer|>[ ]inner|>>[ ]deeper|[ ]last)");
    const holder = doc.createElement("div");
    holder.innerHTML = ed.innerHTML;
    const md = win.htmlToMd(holder).trim();
    eq(md, "- [ ] outer\n  - [ ] inner\n    - [ ] deeper\n- [ ] last",
      "the indent did not reach the .md file");
    const back = doc.createElement("div");
    back.innerHTML = win.mdToHtml(md);
    setHTML(back.innerHTML);
    eq(shape(), "TASKS([ ]outer|>[ ]inner|>>[ ]deeper|[ ]last)",
      "the indent did not survive coming back in");
  });

  /* ═════════ things that were fixed before and must stay fixed ═════════ */

  test("--- plus a space is a divider", () => {
    setHTML("<p>---</p>");
    caret(ed.firstChild.firstChild, 3);
    press(ed, " ", { key: " " });
    ok(ed.querySelector("hr"), "the divider trigger stopped firing on space");
  });

  test("export menu offers import as well as export", () => {
    ok(doc.querySelector('[data-x="import"]'), "no import entry next to the export actions");
    ok(doc.querySelector('[data-x="json"]'), "no full-backup entry");
  });

  test("the toolbar still fits on one row at desktop width", () => {
    /* the frame is whatever width the harness gave it; widen it to a real
       desktop for the measurement, then put it back */
    const fr = win.frameElement;
    const was = fr && fr.style.cssText;
    if (fr) { fr.style.cssText = "position:fixed;left:0;top:0;width:1440px;height:900px;border:0;z-index:-1"; }
    const tb = $("#toolbar");
    void tb.offsetWidth;                            /* force the reflow */
    /* centres, not tops: the items are different heights and centre-aligned, so
       their tops legitimately differ by a few pixels on a single row */
    const kids = [...tb.children].filter((c) => c.getBoundingClientRect().width > 0);
    const mids = kids.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; });
    const spread = Math.max(...mids) - Math.min(...mids);
    const h = tb.getBoundingClientRect().height;
    if (fr) fr.style.cssText = was;
    ok(spread < 6, `toolbar wrapped — item centres span ${Math.round(spread)}px at 1440px`);
    ok(h < 48, `toolbar is ${Math.round(h)}px tall, which is more than one row`);
  });

  test("the welcome note's callouts render as callouts", () => {
    const holder = doc.createElement("div");
    holder.innerHTML = win.__typewell.WELCOME_HTML;
    const tagged = holder.querySelectorAll("blockquote[data-alert]").length;
    const styled = holder.querySelectorAll("blockquote.alert").length;
    ok(tagged > 0, "the welcome note has no callouts at all");
    eq(styled, tagged,
      "a callout carries data-alert but not class=alert, so on a first-ever visit it renders as a plain quote");
    /* the coloured label is a ::before off data-alert — a literal one in the
       markup would print it twice */
    ok(!/<p><strong>(Tip|Note|Warning|Caution|Important)<\/strong><\/p>/i.test(win.__typewell.WELCOME_HTML),
      "a callout repeats its own label as body text");
  });

  test("the welcome note still round-trips through markdown", () => {
    const before = win.__typewell && win.__typewell.WELCOME_HTML;
    ok(before, "no welcome note");
    const holder = doc.createElement("div");
    holder.innerHTML = before;
    const md = win.htmlToMd(holder);
    const back = doc.createElement("div");
    back.innerHTML = win.mdToHtml(md);
    eq(back.querySelectorAll("blockquote.alert").length,
      holder.querySelectorAll("blockquote.alert").length, "callouts lost in the round trip");
    eq(back.querySelectorAll('input[type="checkbox"]').length,
      holder.querySelectorAll('input[type="checkbox"]').length, "task items lost in the round trip");
    eq(back.querySelectorAll("h2").length, holder.querySelectorAll("h2").length);
  });

  test("undo puts a code-block toggle back", () => {
    setHTML("<p>undo me</p>");
    caret(ed.firstChild.firstChild, 3);
    mouse($("#codeBlockBtn"), "mousedown");
    eq(tag(ed.firstElementChild), "PRE");
    win.doUndo();
    eq(tag(ed.firstElementChild), "P");
  });

  test("the page is installable and works offline", () => {
    ok(doc.querySelector('link[rel="manifest"]'), "no web app manifest");
    ok("serviceWorker" in win.navigator, "no service worker support to register with");
  });

  /* ═════════ pasting ═════════
     A synthetic paste event cannot trigger the browser's own paste, so these
     only mean anything because the app now handles the plain-text case itself
     rather than leaving it to the default action. That is the point of the
     change: behaviour we decide is behaviour we can check. */
  const paste = (data) => {
    const dt = new win.DataTransfer();
    for (const [k, v] of Object.entries(data)) dt.setData(k, v);
    return ed.dispatchEvent(new win.ClipboardEvent("paste",
      { clipboardData: dt, bubbles: true, cancelable: true }));
  };

  test("plain text keeps the formatting it is pasted into", () => {
    setHTML('<p><b><span style="color:#C0392B">bold red tail</span></b></p>');
    caret(ed.querySelector("span").firstChild, 9);
    paste({ "text/plain": "PASTED" });
    const sp = ed.querySelector("span");
    has(sp.textContent, "PASTED", "the text never arrived");
    ok(sp.closest("b"), "the paste landed outside the bold it was dropped into");
    has(ed.innerHTML, "PASTED", "");
    ok(/<b><span[^>]*>[^<]*PASTED/.test(ed.innerHTML),
      `the text arrived unformatted instead of matching the line — ${ed.innerHTML}`);
  });

  test("plain text pasted into a heading stays in the heading", () => {
    setHTML("<h1>Title</h1>");
    caret(ed.querySelector("h1").firstChild, 5);
    paste({ "text/plain": "more" });
    eq(tag(ed.firstElementChild), "H1", "the paste broke the heading apart");
    eq(ed.querySelector("h1").textContent, "Titlemore");
  });

  test("pasting plain text does not drop characters", () => {
    setHTML("<p>abcdef</p>");
    caret(ed.firstChild.firstChild, 3);
    paste({ "text/plain": "XY" });
    eq(ed.querySelector("p").textContent, "abcXYdef");
  });

  test("pasting over a selection replaces it", () => {
    setHTML("<p>one two three</p>");
    range(ed.firstChild.firstChild, 4, 7);
    paste({ "text/plain": "TWO" });
    eq(ed.querySelector("p").textContent, "one TWO three");
  });

  test("a rich paste is still left to the browser", () => {
    setHTML("<p>abc</p>");
    caret(ed.firstChild.firstChild, 3);
    ok(paste({ "text/plain": "x", "text/html": "<i>x</i>" }),
      "formatted paste was intercepted and flattened — only text/plain should be");
  });

  test("a pasted URL still becomes a link", () => {
    setHTML("<p>see </p>");
    caret(ed.firstChild.firstChild, 4);
    paste({ "text/plain": "https://example.com" });
    const a = ed.querySelector("a");
    ok(a, "a lone URL stopped linking itself");
    eq(a.getAttribute("href"), "https://example.com");
  });

  /* A formatted paste is still the browser's to perform, and a synthetic event
     cannot make it perform one — so these build the markup Word and Docs are
     known to produce and check what the app does with it afterwards. */
  const pasted = (html) => {
    setHTML(html);
    ed.dispatchEvent(new win.InputEvent("input",
      { inputType: "insertFromPaste", bubbles: true }));
    return ed.innerHTML;
  };

  test("a paste does not bring the source page's white background with it", () => {
    const html = pasted('<p><span style="background-color:#ffffff;color:#000000;font-weight:700">x</span></p>');
    ok(!/background/i.test(html), `a white background survived the paste — ${html}`);
    has(html, "font-weight", "the scrub took the bold with it");
  });

  test("the same in the rgb() form Word writes, including table cells", () => {
    const html = pasted('<p><span style="background-color:rgb(255, 255, 255)">x</span></p>' +
      '<table><tr><td bgcolor="#FFFFFF">a</td><td bgcolor="#FFFF00">b</td></tr></table>');
    ok(!/background-color/i.test(html), `rgb(255,255,255) survived — ${html}`);
    ok(!/bgcolor="#FFFFFF"/i.test(html), "a white cell background survived");
    has(html, 'bgcolor="#FFFF00"', "a yellow cell background was stripped as well");
  });

  test("a highlight someone chose survives a paste", () => {
    const html = pasted('<p><span style="background-color:#F5E6A8">keep</span>' +
      '<span style="background-color:rgb(255,255,255)">drop</span></p>');
    has(html, "#F5E6A8", "a real highlight was scrubbed off");
    ok(!/255,\s*255,\s*255|#ffffff/i.test(html), "the white one stayed");
  });

  test("black text is only dropped when it came with a white background", () => {
    /* the pair is the signature of a page-colour dump; black on its own may
       well be deliberate, and in a light theme it is invisible either way */
    ok(!/color:\s*#?0{3,6}|rgb\(0,\s*0,\s*0\)/i.test(
      pasted('<p><span style="background-color:#fff;color:#000">x</span></p>')),
      "black text survived alongside the white background it came with");
    has(pasted('<p><span style="color:#000000">x</span></p>'), "#000000",
      "a black colour with no white background was thrown away too");
  });

  test("typing is not scrubbed — only a paste is", () => {
    setHTML('<p><span style="background-color:#ffffff">typed</span></p>');
    ed.dispatchEvent(new win.InputEvent("input",
      { inputType: "insertText", data: "x", bubbles: true }));
    has(ed.innerHTML, "background-color", "an ordinary keystroke ran the paste scrub");
  });

  test("one undo takes a whole paste back out", () => {
    setHTML("<p>keep</p>");
    caret(ed.firstChild.firstChild, 4);
    paste({ "text/plain": "gone" });
    has(ed.innerHTML, "gone", "nothing was pasted to undo");
    press(ed, "z", { key: "z", code: "KeyZ", ctrlKey: true });
    ok(!/gone/.test(ed.innerHTML), "undo left part of the paste behind");
  });

  /* ═════════ copying out ═════════ */

  const copyHTML = (evName = "copy") => {
    const dt = new win.DataTransfer();
    ed.dispatchEvent(new win.ClipboardEvent(evName,
      { clipboardData: dt, bubbles: true, cancelable: true }));
    return { html: dt.getData("text/html"), text: dt.getData("text/plain") };
  };
  const selectIn = (fn) => {
    const r = doc.createRange(); fn(r);
    sel().removeAllRanges(); sel().addRange(r); ed.focus();
  };

  test("copying does not carry the page's own background out with it", () => {
    /* left to itself the browser inlines the computed style of everything the
       selection sits inside, so every word arrives in another editor with this
       app's paper colour behind it, as though it had been highlighted */
    setHTML("<p>one two three</p>");
    selectIn((r) => r.selectNodeContents(ed.querySelector("p")));
    const { html } = copyHTML();
    ok(html, "nothing was written to the clipboard at all");
    ok(!/background/i.test(html), `a background came along for the ride — ${html}`);
    ok(!/font-family/i.test(html), `the editor's own font was forced on the paste — ${html}`);
  });

  test("copying part of a formatted line keeps that formatting", () => {
    setHTML('<p><b><span style="color:#C0392B">one two three</span></b></p>');
    selectIn((r) => {
      const t = ed.querySelector("span").firstChild;
      r.setStart(t, 4); r.setEnd(t, 7);
    });
    const { html, text } = copyHTML();
    eq(text, "two");
    has(html, "two", "the text itself did not make it");
    ok(/<b>/i.test(html), `the bold it was sitting inside was dropped — ${html}`);
    has(html, "#C0392B", "the colour it was sitting inside was dropped");
  });

  test("a highlight someone applied still travels", () => {
    setHTML('<p><span style="background-color:#F5E6A8">lit</span></p>');
    selectIn((r) => r.selectNodeContents(ed.querySelector("p")));
    has(copyHTML().html, "#F5E6A8", "a real highlight was stripped on the way out");
  });

  test("copying across blocks keeps the blocks", () => {
    setHTML("<h2>Title</h2><ul><li>a</li><li>b</li></ul>");
    selectIn((r) => {
      r.setStart(ed.querySelector("h2").firstChild, 0);
      r.setEnd(ed.querySelectorAll("li")[1].firstChild, 1);
    });
    const { html } = copyHTML();
    has(html, "<h2>", "the heading flattened");
    has(html, "<li>", "the list flattened");
  });

  test("cut writes the clipboard and removes the text", () => {
    setHTML("<p>keep this gone</p>");
    selectIn((r) => {
      const t = ed.querySelector("p").firstChild;
      r.setStart(t, 10); r.setEnd(t, 14);
    });
    const { text } = copyHTML("cut");
    eq(text, "gone");
    ok(!/gone/.test(ed.textContent), "cut copied but left the text behind");
  });

  test("a collapsed caret is left to the browser", () => {
    setHTML("<p>abc</p>");
    caret(ed.firstChild.firstChild, 1);
    eq(copyHTML().html, "", "an empty selection still wrote to the clipboard");
  });

  /* ═════════ themes ═════════ */

  test("white is offered, and offered first", () => {
    const dots = [...doc.querySelectorAll("#themeDots .tdot")].map((b) => b.dataset.theme);
    eq(dots[0], "white", `themes are ordered ${dots.join(", ")}`);
    has(dots.join(","), "paper", "paper went missing");
    eq(dots.length, 4);
  });

  test("every offered theme actually styles the app", () => {
    /* a name with no matching rule leaves every custom property unset and the
       whole app renders black on white — so each dot must resolve to real ink */
    const before = doc.documentElement.dataset.theme;
    for (const t of [...doc.querySelectorAll("#themeDots .tdot")].map((b) => b.dataset.theme)) {
      win.setTheme(t);
      eq(doc.documentElement.dataset.theme, t, `${t} did not apply`);
      ok(win.getComputedStyle(doc.documentElement).getPropertyValue("--ink").trim(),
        `${t} leaves --ink unset — the theme has no rule of its own`);
    }
    win.setTheme("not-a-theme");
    ok(doc.documentElement.dataset.theme !== "not-a-theme",
      "an unknown theme name was applied and left the app unstyled");
    win.setTheme(before);
  });

  /* ═════════ where the caret is ═════════ */

  const pos = () => { win.updateCaretPos(); return $("#curpos").textContent; };

  test("the status bar says which line and column the caret is on", () => {
    setHTML("<p>first line</p><h2>second</h2><p>third</p>");
    caret(ed.firstChild.firstChild, 3);
    eq(pos(), "Ln 1, Col 4");
    caret(ed.querySelector("h2").firstChild, 6);
    eq(pos(), "Ln 2, Col 7");
    caret(ed.querySelectorAll("p")[1].firstChild, 0);
    eq(pos(), "Ln 3, Col 1");
  });

  test("a block that only wraps another is not counted as its own line", () => {
    setHTML("<p>one</p><blockquote><p>two</p></blockquote><p>three</p>");
    caret(ed.querySelector("blockquote p").firstChild, 0);
    eq(pos(), "Ln 2, Col 1", "the quote counted as a line of its own");
    caret(ed.querySelectorAll("p")[2].firstChild, 0);
    eq(pos(), "Ln 3, Col 1");
  });

  test("a list item above a sub-list is still its own line", () => {
    setHTML("<ul><li>one</li><li>two<ul><li>three</li></ul></li></ul>");
    const li = ed.querySelectorAll("li");
    caret(li[1].firstChild, 0);
    eq(pos(), "Ln 2, Col 1");
    caret(li[2].firstChild, 0);
    eq(pos(), "Ln 3, Col 1", "the nested item did not get its own line number");
  });

  test("selecting text shows how much is selected", () => {
    setHTML("<p>abcdefghij</p>");
    caret(ed.firstChild.firstChild, 0);
    ok(!/selected/.test(pos()), "a bare caret claims a selection");
    range(ed.firstChild.firstChild, 2, 7);
    has(pos(), "(5 selected)", "a selection of five characters was not reported");
  });

  /* ═════════ the Drive token ═════════
     No Google account in the loop: these drive the token's own lifetime, which
     is the part that decides whether an auth window opens. Each one puts the
     stored token back exactly as it found it — the suite shares localStorage
     with whatever notes are open in this browser. */
  const withToken = (fn) => {
    const { drive, LS_DTOK } = win.__typewell;
    const keep = win.localStorage.getItem(LS_DTOK);
    const was = { t: drive.token, e: drive.tokenExp, c: drive.connected, l: drive.linked };
    try { fn(drive, LS_DTOK); }
    finally {
      drive.token = was.t; drive.tokenExp = was.e;
      drive.connected = was.c; drive.linked = was.l;
      if (keep === null) win.localStorage.removeItem(LS_DTOK);
      else win.localStorage.setItem(LS_DTOK, keep);
    }
  };

  test("a live token survives a reload instead of costing another auth window", () => {
    withToken((drive, key) => {
      drive.token = "tok-live"; drive.tokenExp = Date.now() + 30 * 60000;
      drive.saveToken();
      has(win.localStorage.getItem(key) || "", "tok-live", "the token was never written down");
      drive.token = null; drive.tokenExp = 0; drive.connected = false;   /* as after a reload */
      ok(drive.restoreToken(), "a token with half an hour left was not restored");
      eq(drive.token, "tok-live");
      ok(drive.connected, "restored the token but still reports disconnected");
    });
  });

  test("an expired token is dropped rather than sent", () => {
    withToken((drive, key) => {
      win.localStorage.setItem(key, JSON.stringify({ t: "tok-stale", e: Date.now() - 1000 }));
      drive.token = null; drive.tokenExp = 0;
      ok(!drive.restoreToken(), "an expired token was restored and would 401");
      eq(win.localStorage.getItem(key), null, "the expired token was left lying in storage");
    });
  });

  test("a token about to expire is not restored either", () => {
    withToken((drive, key) => {
      /* inside the margin: it would expire between here and the response */
      win.localStorage.setItem(key, JSON.stringify({ t: "tok-edge", e: Date.now() + 2000 }));
      drive.token = null; drive.tokenExp = 0;
      ok(!drive.restoreToken(), "a token with 2s left was restored");
    });
  });

  test("disconnecting removes the stored token", () => {
    withToken((drive, key) => {
      drive.token = "tok-bye"; drive.tokenExp = Date.now() + 30 * 60000;
      drive.linked = true; drive.saveToken();
      drive.disconnect();
      eq(win.localStorage.getItem(key), null, "the token outlived the disconnect");
      eq(drive.token, null);
      ok(!drive.linked, "still linked after disconnecting");
    });
  });

  /* ═════════ dragging the sidebar into order ═════════
     The order of the notes array IS the order of the sidebar, so these drive
     real pointer events at real cards and then read the array back. Same deal
     as the token tests: the suite shares localStorage with whatever notes are
     open in this browser, so every one of them puts the real list back. */
  const noteList = $("#noteList");
  const withNotes = (seed, fn) => {
    const keep = win.__typewell.notes();
    const stored = win.localStorage.getItem(win.__typewell.LS_NOTES);
    const openId = noteList.querySelector(".note-item.active")?.dataset.id;
    try {
      win.__typewell.setNotes(seed.map((o, i) => Object.assign(
        { id: "t" + i, html: "<p>x</p>", created: 1, updated: 100 - i, pinned: false, deleted: false }, o)));
      win.renderList();
      $("#fileName").value = "";        /* so "did this open a note?" has an answer */
      fn();
    } finally {
      win.__typewell.setNotes(keep);
      if (stored === null) win.localStorage.removeItem(win.__typewell.LS_NOTES);
      else win.localStorage.setItem(win.__typewell.LS_NOTES, stored);
      win.renderList();
      if (openId && keep.some((n) => n.id === openId)) win.openNote(openId);
    }
  };
  const shownTitles = () => [...noteList.children]
    .map((el) => el.querySelector(".tt")?.textContent).filter(Boolean).join(",");
  const storedTitles = () => win.__typewell.notes()
    .map((n) => (n.deleted ? "#" : "") + (n.pinned ? "*" : "") + n.title).join(",");
  const pointer = (el, type, y, init = {}) => el.dispatchEvent(new win.PointerEvent(type, Object.assign(
    { bubbles: true, cancelable: true, pointerType: "mouse", button: 0,
      clientX: (el.getBoundingClientRect ? el.getBoundingClientRect().left : 0) + 40, clientY: y }, init)));
  /* the destination is fixed before the first move: once the card is under the
     pointer, asking the list where its top is again gives an answer that moves
     with you, and the walk never arrives */
  const dragCard = (from, toY, opts = {}) => {
    const card = noteList.children[from], r = card.getBoundingClientRect();
    const sy = r.top + r.height / 2;
    pointer(card, "pointerdown", sy);
    pointer(doc, "pointermove", sy + (toY > sy ? 6 : -6));
    const steps = Math.max(1, Math.ceil(Math.abs(toY - sy) / 5));
    for (let i = 1; i <= steps; i++) pointer(doc, "pointermove", sy + (toY - sy) * i / steps);
    if (opts.hold) return card;
    if (opts.escape) press(doc, "Escape");
    else pointer(doc, "pointerup", toY);
    return card;
  };
  const topOfList = () => noteList.children[0].getBoundingClientRect().top + 2;
  const bottomOfList = () => noteList.children[noteList.children.length - 1]
    .getBoundingClientRect().bottom - 2;

  test("a note dragged up lands where it was dropped, and stays there", () => {
    withNotes([{ title: "A" }, { title: "B" }, { title: "C" }, { title: "D" }], () => {
      dragCard(3, topOfList());
      eq(shownTitles(), "D,A,B,C");
      eq(storedTitles(), "D,A,B,C", "the sidebar moved but the notes did not");
      eq(JSON.parse(win.localStorage.getItem(win.__typewell.LS_NOTES)).map((n) => n.title).join(","),
        "D,A,B,C", "the new order would not survive a reload");
    });
  });

  /* The card is drawn at its slot's position plus an offset from the grab, and
     changing slots mid-drag changes that position. Getting the bookkeeping
     wrong does not show up in the final order — it still ends where you let go
     — it shows up as the card sailing off on its own, in one case clean out of
     the top of the sidebar, where #sidebar's overflow:hidden ate it. */
  test("the card stays under the pointer that is dragging it", () => {
    withNotes([{ title: "A" }, { title: "B" }, { title: "C" }, { title: "D" }, { title: "E" }], () => {
      const toY = noteList.children[0].getBoundingClientRect().top + 20;
      const card = dragCard(4, toY, { hold: true });
      try {
        const r = card.getBoundingClientRect(), list = noteList.getBoundingClientRect();
        ok(r.top <= toY && r.bottom >= toY,
          `the pointer is at ${Math.round(toY)} but the card it is holding is at ${Math.round(r.top)}–${Math.round(r.bottom)}`);
        ok(r.top >= list.top - 1 && r.bottom <= list.bottom + 1,
          "the dragged card was carried out of the list, where the sidebar clips it away");
      } finally {
        /* let go whatever happened: a drag left running blocks every render
           after it, and one red test would turn into five */
        pointer(doc, "pointerup", toY);
      }
    });
  });

  test("a note dragged down lands at the bottom", () => {
    withNotes([{ title: "A" }, { title: "B" }, { title: "C" }], () => {
      dragCard(0, bottomOfList());
      eq(shownTitles(), "B,C,A");
    });
  });

  test("a pinned note cannot be dragged out of the pinned band", () => {
    withNotes([{ title: "P1", pinned: true }, { title: "P2", pinned: true },
      { title: "U1" }, { title: "U2" }], () => {
      dragCard(0, bottomOfList() + 60);
      eq(storedTitles(), "*P2,*P1,U1,U2",
        "a pinned note was dropped among the unpinned ones, where the next render would only snap it back");
    });
  });

  test("an unpinned note cannot climb above the pinned ones", () => {
    withNotes([{ title: "P1", pinned: true }, { title: "U1" }, { title: "U2" }], () => {
      dragCard(2, topOfList() - 60);
      eq(storedTitles(), "*P1,U2,U1");
    });
  });

  test("notes in the trash keep their place in the list", () => {
    withNotes([{ title: "A" }, { title: "T1", deleted: true }, { title: "B" },
      { title: "C" }, { title: "T2", deleted: true }], () => {
      dragCard(2, topOfList());     /* the third card shown is C, not the third note */
      eq(shownTitles(), "C,A,B");
      eq(storedTitles(), "C,#T1,A,B,#T2",
        "reordering the sidebar shuffled the trash, which is not on screen to see it happen");
    });
  });

  test("escape during a drag puts the list back", () => {
    withNotes([{ title: "A" }, { title: "B" }, { title: "C" }], () => {
      dragCard(2, topOfList(), { escape: true });
      eq(shownTitles(), "A,B,C");
      eq(storedTitles(), "A,B,C");
    });
  });

  test("the drop does not also open the note it dropped on", () => {
    withNotes([{ title: "A" }, { title: "B" }, { title: "C" }], () => {
      dragCard(2, topOfList());
      mouse(noteList.children[0], "click");
      eq($("#fileName").value, "", "the drag ended by opening a note nobody asked for");
    });
  });

  test("a click that is not a drag still opens the note", () => {
    withNotes([{ title: "A" }, { title: "B" }, { title: "C" }], () => {
      const card = noteList.children[1], y = card.getBoundingClientRect().top + 8;
      pointer(card, "pointerdown", y);
      pointer(doc, "pointerup", y);
      mouse(card, "click");
      eq($("#fileName").value, "B", "clicking a note no longer opens it");
    });
  });

  test("the pin and delete buttons are not drag handles", () => {
    withNotes([{ title: "A" }, { title: "B" }], () => {
      const card = noteList.children[0];
      const pin = card.querySelector('[data-a="pin"]');
      const r = pin.getBoundingClientRect();
      pointer(pin, "pointerdown", r.top + 5, { clientX: r.left + 5 });
      pointer(doc, "pointermove", r.top + 60, { clientX: r.left + 5 });
      ok(!noteList.querySelector(".sb-drag"), "reaching for the pin button started a drag instead");
      pointer(doc, "pointerup", r.top + 60, { clientX: r.left + 5 });
    });
  });

  test("a filtered list is not reorderable", () => {
    withNotes([{ title: "Apple" }, { title: "Banana" }], () => {
      const box = $("#searchInput");
      const was = box.value;
      box.value = "an"; win.renderList();
      ok(!noteList.classList.contains("sortable"),
        "dragging inside a search result promises an order the list cannot keep");
      box.value = was; win.renderList();
    });
  });

  test("a new note still arrives at the top of the list", () => {
    withNotes([{ title: "A" }, { title: "B" }], () => {
      win.newNote();
      eq(win.__typewell.notes()[0].title, "Untitled", "a new note was filed at the bottom");
    });
  });

  test("a duplicate lands next to the note it came from", () => {
    withNotes([{ title: "A" }, { title: "B" }, { title: "C" }], () => {
      win.noteAction("dup", win.__typewell.notes()[1].id);
      eq(storedTitles(), "A,B,B-copy,C", "the copy was filed somewhere you were not looking");
    });
  });

  return results;
}
