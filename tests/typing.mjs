/* Real typing, over the DevTools Protocol.
 *
 * suite.js dispatches its own keydown events. Those reach the app's handlers,
 * but the browser does nothing with them: no character is typed, no line is
 * split, no paste happens. Every bug in this file lived exactly there - in
 * what Chrome itself does to a checkbox row, a sub-bullet or a callout when a
 * person types, presses Enter or pastes - and the suite was green through all
 * of them. These are real key presses and real pastes into the real app.
 *
 * Each case: the note before ("|" is the caret), what the person does, and the
 * note after. In the result a checkbox is written "[ ]" (or "[x]") and the
 * words beside it `<span.t>`, so the expected shapes stay readable.
 */
const ROW = (words) => `<li><input type="checkbox" contenteditable="false"><span class="task-text">${words}</span></li>`;
const TASKS = (...rows) => `<ul class="tasks">${rows.map(ROW).join("")}</ul>`;

export const cases = [
  /* ── typing Markdown ── */
  ["a checkbox list typed from scratch, with a sub-item and a way out", "<p>|</p>",
    [["type", "[] one\ntwo\n"], ["key", "Tab"], ["type", "sub\n"], ["key", "Enter"], ["type", "back"]],
    '<ul class="tasks"><li>[ ]<span.t>one</span></li><li>[ ]<span.t>two</span></li><ul class="tasks"><li>[ ]<span.t>sub</span></li></ul><li>[ ]<span.t>back|</span></li></ul>'],
  ["GitHub's \"- [ ] \" makes a checkbox, not a bullet holding \"[ ]\"", "<p>|</p>",
    [["type", "- [ ] a"]], '<ul class="tasks"><li>[ ]<span.t>a|</span></li></ul>'],
  ["\"[x] \" makes a checkbox that is already ticked", "<p>|</p>",
    [["type", "[x] a"]], '<ul class="tasks"><li class="done">[x]<span.t>a|</span></li></ul>'],
  ["**bold** works inside a checkbox row", "<p>|</p>",
    [["type", "[] **bo** x"]], '<ul class="tasks"><li>[ ]<span.t><strong>bo</strong>&nbsp;x|</span></li></ul>'],
  ["\"> \" in a checkbox row makes a quote after the list, not inside the row", TASKS("a", "|"),
    [["type", "> q"]], '<ul class="tasks"><li>[ ]<span.t>a</span></li></ul><blockquote><p>q|</p></blockquote>'],
  ["a callout typed between two checkboxes splits the list around it", TASKS("a", "|", "c"),
    [["type", "[!note] hi"]],
    '<ul class="tasks"><li>[ ]<span.t>a</span></li></ul><blockquote class="alert" data-alert="note"><p>hi|</p></blockquote><ul class="tasks"><li>[ ]<span.t>c</span></li></ul>'],
  ["checkboxes typed inside a callout stay inside it", "<p>|</p>",
    [["type", "> "], ["type", "[!note] "], ["type", "hello\n[] a\nb"]],
    '<blockquote class="alert" data-alert="note"><p>hello</p><ul class="tasks"><li>[ ]<span.t>a</span></li><li>[ ]<span.t>b|</span></li></ul></blockquote>'],
  ["\"## \" in a quote makes a heading in the quote", "<p>|</p>",
    [["type", "> ## hi"]], "<blockquote><h2>hi|</h2></blockquote>"],
  ["\"## \" on a bullet makes a heading after the list", "<ul><li>a</li><li>|</li></ul>",
    [["type", "## h"]], "<ul><li>a</li></ul><h2>h|</h2>"],
  ["``` in a checkbox row makes a code block after the list", "<p>|</p>",
    [["type", "[] a\n```\nx"]], '<ul class="tasks"><li>[ ]<span.t>a</span></li></ul><pre>x|</pre>'],
  ["a list typed in a quote is a list, not a list inside a paragraph", "<p>|</p>",
    [["type", "> - a\n"], ["key", "Enter"], ["type", "b"], ["key", "Enter"], ["key", "Enter"], ["type", "c"]],
    "<blockquote><ul><li>a</li></ul><p>b</p></blockquote><p>c|</p>"],
  ["\"```js\" then Enter makes a code block that keeps its language", "<p>|</p>",
    [["type", "```js\nx"]], '<pre data-lang="js">x|</pre>'],
  ["\"1. \" makes a numbered list", "<p>|</p>", [["type", "1. a"]], "<ol><li>a|</li></ol>"],

  /* ── bullets ── */
  ["Tab nests bullets inside the item above, Enter twice climbs back out", "<p>|</p>",
    [["type", "- a\n"], ["key", "Tab"], ["type", "b\n"], ["key", "Tab"], ["type", "c\n"],
     ["key", "Enter"], ["key", "Enter"], ["key", "Enter"], ["type", "end"]],
    "<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul><p>end|</p>"],
  ["Tab and Shift+Tab move every selected bullet", "<ul><li>a</li><li>b</li><li>c|</li></ul>",
    [["key", "ArrowUp", ["shift"]], ["key", "Tab"], ["key", "Tab", ["shift"]]], "<ul><li>a</li><li>b|</li><li>c</li></ul>"],
  ["Backspace at the start of a sub-bullet steps out a level, then out of the list", "<ul><li>a<ul><li>|b</li></ul></li></ul>",
    [["key", "Backspace"], ["key", "Backspace"]], "<ul><li>a</li></ul><p>|b</p>"],
  ["Ctrl+Enter in a sub-bullet leaves the whole list", "<ul><li>a<ul><li>b|</li></ul></li></ul>",
    [["key", "Enter", ["ctrl"]], ["type", "x"]], "<ul><li>a<ul><li>b</li></ul></li></ul><p>x|</p>"],

  /* ── checkbox rows ── */
  ["Enter in the middle of a checkbox row splits it", TASKS("ab|cd"),
    [["key", "Enter"], ["type", "X"]], '<ul class="tasks"><li>[ ]<span.t>ab</span></li><li>[ ]<span.t>X|cd</span></li></ul>'],
  ["Enter at the end of bold words keeps typing bold on the new row", TASKS("a <i><b>bi|</b></i>"),
    [["key", "Enter"], ["type", "X"]], '<ul class="tasks"><li>[ ]<span.t>a <i><b>bi</b></i></span></li><li>[ ]<span.t><i><b>X|</b></i></span></li></ul>'],
  ["Enter at the end of a link does not carry the link to the new row", TASKS('<a href="https://example.com/">l|</a>'),
    [["key", "Enter"], ["type", "X"]], '<ul class="tasks"><li>[ ]<span.t><a href="https://example.com/">l</a></span></li><li>[ ]<span.t>X|</span></li></ul>'],
  ["Enter at the start of a checkbox row adds an empty row above", TASKS("|abc"),
    [["key", "Enter"]], '<ul class="tasks"><li>[ ]<span.t><br></span></li><li>[ ]<span.t>|abc</span></li></ul>'],
  ["Backspace at the start of a checkbox row takes the box off", TASKS("a", "|b"),
    [["key", "Backspace"]], '<ul class="tasks"><li>[ ]<span.t>a</span></li></ul><p>|b</p>'],
  ["Delete at the end of a row pulls the next row up, without its checkbox", TASKS("a|", "b"),
    [["key", "Delete"]], '<ul class="tasks"><li>[ ]<span.t>a|b</span></li></ul>'],
  ["Backspace joining a paragraph into a checkbox row keeps it one row", TASKS("a") + "<p>|b</p>",
    [["key", "Backspace"]], '<ul class="tasks"><li>[ ]<span.t>a|b</span></li></ul>'],
  ["Backspace into a callout does not paint the words with its background",
    '<blockquote class="alert" data-alert="note"><p>a</p></blockquote><p>|b</p>',
    [["key", "Backspace"]], '<blockquote class="alert" data-alert="note"><p>a|b</p></blockquote>'],

  /* ── pasting ── */
  ["two paragraphs pasted into a checkbox row become two rows", TASKS("x|"),
    [["paste", "<p>one</p><p>two</p>", "one\ntwo"]], '<ul class="tasks"><li>[ ]<span.t>xone</span></li><li>[ ]<span.t>two|</span></li></ul>'],
  ["a bullet list pasted into a checkbox row becomes rows, nesting kept", TASKS("x|"),
    [["paste", "<ul><li>one</li><li>two<ul><li>sub</li></ul></li></ul>", "one\ntwo\nsub"]],
    '<ul class="tasks"><li>[ ]<span.t>x</span></li><ul class="tasks"><li>[ ]<span.t>one</span></li><li>[ ]<span.t>two</span></li><ul class="tasks"><li>[ ]<span.t>sub|</span></li></ul></ul></ul>'],
  ["bold words pasted into a checkbox row land inside its words", TASKS("x|"),
    [["paste", "<b>bold</b> word", "bold word"]], '<ul class="tasks"><li>[ ]<span.t>x<b>bold</b> word|</span></li></ul>'],
  ["plain lines pasted into a checkbox row each get a checkbox", TASKS("x|"),
    [["pasteText", "one\ntwo"]], '<ul class="tasks"><li>[ ]<span.t>xone</span></li><li>[ ]<span.t>two|</span></li></ul>'],
  ["a heading pasted into a checkbox row becomes a row", TASKS("x|"),
    [["paste", "<h2>Head</h2>", "Head"]], '<ul class="tasks"><li>[ ]<span.t>x</span></li><li>[ ]<span.t>Head|</span></li></ul>'],
  ["Google Docs' fonts and sizes are left behind, its bold becomes real bold", "<p>x|</p>",
    [["paste", '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:700;">Bold</span><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;"> normal</span></p><ul><li dir="ltr" style="list-style-type:disc;"><p dir="ltr" role="presentation"><span style="font-size:11pt;">item</span></p></li></ul></b>', "Bold normal\nitem"]],
    '<p>x<b>Bold</b> normal</p><ul><li>item|</li></ul>'],
  ["Markdown pasted as plain text arrives formatted", "<p>|<br></p>",
    [["pasteText", "# Title\n- a\n- [ ] b"]], '<h1>Title</h1><ul><li>a</li></ul><ul class="tasks"><li>[ ]<span.t>b|</span></li></ul>'],
  ["Ctrl+Shift+V pastes Markdown as the plain text it is", "<p>|<br></p>",
    [["pasteText", "# Title\n- a", ["ctrl", "shift"]]], "<p># Title</p><p>- a|</p>"],
];

/* ── the driver ── */
const KEYS = {
  Enter: { code: "Enter", keyCode: 13, text: "\r" }, Backspace: { code: "Backspace", keyCode: 8 },
  Delete: { code: "Delete", keyCode: 46 }, Tab: { code: "Tab", keyCode: 9 },
  ArrowUp: { code: "ArrowUp", keyCode: 38 }, ArrowDown: { code: "ArrowDown", keyCode: 40 },
};
const MODIFIER_BITS = { alt: 1, ctrl: 2, meta: 4, shift: 8 };

export async function runTyping(send, appUrl) {
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
    return r.result?.result?.value;
  };
  const press = async (name, mods = [], commands) => {
    const k = KEYS[name] || { code: "Key" + name.toUpperCase(), keyCode: name.toUpperCase().charCodeAt(0) };
    const modifiers = mods.reduce((bits, m) => bits | MODIFIER_BITS[m], 0);
    const withText = k.text && !(modifiers & ~MODIFIER_BITS.shift);
    const base = { key: name, code: k.code, windowsVirtualKeyCode: k.keyCode, modifiers };
    await send("Input.dispatchKeyEvent", { type: withText ? "keyDown" : "rawKeyDown", ...base, text: withText ? k.text : undefined, commands });
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  };
  const typeText = async (text) => {
    for (const ch of text) {
      if (ch === "\n") { await press("Enter"); continue; }
      /* a punctuation key sent with its character code as the key code reads
         as some other key ("[" is 91, the Windows key) - 0 means "just text" */
      const letterOrDigit = /[a-z0-9]/i.test(ch);
      const code = ch === " " ? "Space" : letterOrDigit ? (/\d/.test(ch) ? "Digit" : "Key") + ch.toUpperCase() : "";
      const keyCode = ch === " " ? 32 : letterOrDigit ? ch.toUpperCase().charCodeAt(0) : 0;
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, code, text: ch, windowsVirtualKeyCode: keyCode });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch, code, windowsVirtualKeyCode: keyCode });
    }
  };
  const paste = async (items, mods = ["ctrl"]) => {
    await evaluate(`navigator.clipboard.write([new ClipboardItem(Object.fromEntries(
      Object.entries(${JSON.stringify(items)}).map(([type, v]) => [type, new Blob([v], { type })])))])`);
    await press(mods.includes("shift") ? "V" : "v", mods, ["paste"]);
  };
  const ACTIONS = {
    type: (text) => typeText(text),
    key: (name, mods) => press(name, mods),
    paste: (html, text) => paste({ "text/html": html, "text/plain": text }),
    pasteText: (text, mods) => paste({ "text/plain": text }, mods),
  };

  await send("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin: new URL(appUrl).origin });
  /* a fresh page is one without the mark the last one was given */
  const openApp = async () => {
    await evaluate("window.__stale=1").catch(() => {});
    await send("Page.navigate", { url: appUrl });
    for (let i = 0; i < 100; i++) {
      if (await evaluate("!window.__stale&&!!window.__typewell&&!!document.querySelector('#editor')").catch(() => false)) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  };
  /* the suite before this ran the app on the same origin and left its notes
     and settings behind; these cases start from a first visit instead */
  if (!await openApp() || (await evaluate("localStorage.clear()"), !await openApp()))
    return [{ name: "typing: the app never loaded", pass: false, error: appUrl }];

  const results = [];
  for (const [name, before, steps, expected] of cases) {
    try {
      await evaluate(`(()=>{const ed=document.querySelector('#editor');ed.innerHTML=${JSON.stringify(before)};ed.focus();
        const w=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);let n,hit=null;
        while((n=w.nextNode()))if(n.data.includes('|')){hit=n;break;}
        const r=document.createRange();
        if(hit){const o=hit.data.indexOf('|');hit.data=hit.data.replace('|','');
          /* an empty line holds a <br>, not an empty text node - the caret goes where a click would put it */
          if(hit.data)r.setStart(hit,o);else{const box=hit.parentNode,at=[...box.childNodes].indexOf(hit);hit.remove();
            if(!box.firstChild)box.appendChild(document.createElement('br'));r.setStart(box,at);}}
        else{r.selectNodeContents(ed);r.collapse(false);}
        r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);})()`);
      for (const [action, ...args] of steps) await ACTIONS[action](...args);
      /* the note as it stands, the caret shown as "|", a trailing empty line
         (the app keeps one after a list or a quote at the end) left off */
      const actual = await evaluate(`(()=>{const ed=document.querySelector('#editor'),s=getSelection();
        const m=document.createTextNode('|');if(s.rangeCount){const r=s.getRangeAt(0).cloneRange();r.collapse(true);r.insertNode(m);}
        const h=ed.innerHTML;m.remove();
        return h.replace(/<input type="checkbox" contenteditable="false" checked="">/g,'[x]')
          .replace(/<input type="checkbox" contenteditable="false">/g,'[ ]')
          .replace(/ class="task-text"/g,'.t').replace(/(<p><br><\\/p>)+$/,'');})()`);
      if (actual !== expected) throw new Error(`  expected: ${expected}\n  actual:   ${actual}`);
      results.push({ name: "typing: " + name, pass: true });
    } catch (e) {
      results.push({ name: "typing: " + name, pass: false, error: e.message });
    }
  }
  return results;
}
