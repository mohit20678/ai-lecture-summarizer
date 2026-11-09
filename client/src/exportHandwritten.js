const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const paras = (t) =>
  String(t || "")
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");

const list = (tag, items) =>
  items && items.length
    ? `<${tag}>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</${tag}>`
    : "";

const section = (cls, title, inner) =>
  `<section class="topic ${cls}"><h3><span>${title}</span></h3>${inner}</section>`;

function visualHtml(v) {
  if (!v || v.type === "none") return "";
  const cap = v.title ? `<div class="cap">${esc(v.title)}</div>` : "";
  if (v.type === "flow") {
    const steps = (v.steps || [])
      .map((s, i) => `<span class="box">${i + 1}. ${esc(s)}</span>`)
      .join('<span class="arrow">&rarr;</span>');
    return `<div class="visual">${cap}<div class="flow">${steps}</div></div>`;
  }
  if (v.type === "compare") {
    const head = (v.columns || []).map((c) => `<th>${esc(c)}</th>`).join("");
    const rows = (v.rows || [])
      .map((r) => `<tr>${(Array.isArray(r) ? r : []).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("");
    return `<div class="visual">${cap}<table class="data"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  if (v.type === "concept") {
    const br = (v.branches || []).map((b) => `<span class="box">${esc(b)}</span>`).join("");
    return `<div class="visual">${cap}<div class="concept"><span class="center">${esc(v.center)}</span><div class="branches">${br}</div></div></div>`;
  }
  return "";
}

const HW_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html { color-scheme: light; background: #f1eee6; }
body { margin: 0; background: #f1eee6; font-family: "Kalam", "Segoe Print", "Comic Sans MS", cursive; font-size: 12pt; line-height: 1.7; color: #1f2a44; }
table.sheet { width: 100%; border-collapse: collapse; }
table.sheet td { padding: 0; }
table.sheet td.page { padding: 0 16mm; }
.sp { height: 14mm; }
h1 { margin: 0 0 5mm; font-size: 26pt; line-height: 1.25; font-weight: 700; color: #1b2b52; }
h1 span { text-decoration: underline wavy #f4a261; text-decoration-thickness: 2px; text-underline-offset: 6px; }
.overview { background: #fff1a6; padding: 4mm 5mm; border-radius: 2mm; box-shadow: 1px 2px 0 rgba(0,0,0,.12); transform: rotate(-.4deg); margin: 0 0 8mm; }
.topic { --c: #5b8def; --h: #cfe0ff; margin: 0 0 8mm; padding-left: 4mm; border-left: 3px solid var(--c); break-inside: avoid-page; page-break-inside: avoid; }
.c1 { --c: #f2b705; --h: #fff0b3; } .c2 { --c: #35b58a; --h: #cdf1e1; } .c3 { --c: #ef6f91; --h: #ffd9e4; }
h3 { margin: 0 0 3mm; font-size: 15pt; line-height: 1.4; break-after: avoid; }
h3 span { display: inline-block; background: var(--h); padding: 0 3mm; border-radius: 3mm; font-weight: 700; }
p { margin: 0 0 2.5mm; text-align: left; orphans: 3; widows: 3; }
p b { background: linear-gradient(transparent 55%, #ffe58f 55%); }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li::marker { color: var(--c); font-weight: 700; }
.example { margin: 3mm 0; padding: 2mm 4mm; border: 1.5px dashed var(--c); border-radius: 3mm; background: rgba(255,255,255,.6); }
.visual { margin: 3mm 0; padding: 3mm 4mm; border: 1.5px solid #3a4a7a; border-radius: 3mm; background: rgba(255,255,255,.65); break-inside: avoid; }
.cap { font-size: 10pt; line-height: 1.5; color: #5b6fa0; margin-bottom: 1mm; }
.box { display: inline-block; border: 1.5px solid #3a4a7a; border-radius: 3mm; padding: 0 2.5mm; margin: 1mm 0; background: #fff; font-size: 11pt; line-height: 1.6; }
.arrow { margin: 0 2mm; color: #3a4a7a; font-size: 14pt; }
table.data { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 11pt; }
table.data th, table.data td { border: 1.2px solid #3a4a7a; padding: 1mm 2mm; text-align: left; vertical-align: top; line-height: 1.5; }
table.data th { background: var(--h); }
.concept .center { display: inline-block; background: #ffe58f; border: 1.5px solid #3a4a7a; border-radius: 99px; padding: 0 5mm; font-weight: 700; margin-bottom: 2mm; }
.branches { display: flex; flex-wrap: wrap; gap: 2mm; }
`;

export function exportHandwritten(note) {
  const topics = note.topics || [];
  const gloss = (note.glossary || [])
    .map((g) => `<p><b>${esc(g.term)}:</b> ${esc(g.meaning)}</p>`)
    .join("");

  const body =
    `<h1><span>${esc(note.title || "Lecture notes")}</span></h1>` +
    (note.summary ? `<p class="overview">${esc(note.summary)}</p>` : "") +
    topics
      .map((t, i) =>
        section(
          "c" + (i % 4),
          `${i + 1}. ${esc(t.heading)}`,
          paras(t.explanation) +
            visualHtml(t.visual) +
            list("ul", t.keyPoints) +
            (t.example ? `<p class="example"><b>Example:</b> ${esc(t.example)}</p>` : "")
        )
      )
      .join("") +
    (gloss ? section("c1", "Key terms", gloss) : "") +
    section("c2", topics.length ? "Quick recap" : "Key points", list("ul", note.keyPoints)) +
    section("c3", "Revision questions", list("ol", note.revisionQuestions));

  const sheet =
    '<table class="sheet"><thead><tr><td><div class="sp"></div></td></tr></thead>' +
    '<tfoot><tr><td><div class="sp"></div></td></tr></tfoot>' +
    `<tbody><tr><td class="page">${body}</td></tr></tbody></table>`;

  const title = esc(note.title || "Lecture notes");
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>` +
    `<link href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap" rel="stylesheet">` +
    `<style>${HW_CSS}</style></head><body>${sheet}</body></html>`;

  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const oldTitle = document.title;
  document.title = note.title || "Lecture notes";

  const link = doc.querySelector("link[rel=stylesheet]");
  const cssLoaded = new Promise((res) => {
    if (!link) res();
    else {
      link.onload = res;
      link.onerror = res;
    }
  });
  const fontsLoaded = cssLoaded
    .then(() => Promise.all([doc.fonts.load("12pt Kalam"), doc.fonts.load("bold 12pt Kalam")]))
    .catch(() => {});

  const go = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    document.title = oldTitle;
    setTimeout(() => frame.remove(), 1000);
  };
  Promise.race([fontsLoaded, new Promise((r) => setTimeout(r, 4000))]).then(() => setTimeout(go, 300));
}

const PLAIN_CSS = `
@page { size: A4; margin: 16mm 14mm 18mm; @bottom-left { content: "AI Lecture Summarizer"; font-size: 8pt; color: #8b95a5; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #8b95a5; } }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html { color-scheme: light; background: #fff; }
body { margin: 0; font-family: "Segoe UI", Inter, system-ui, Arial, sans-serif; font-size: 10.5pt; line-height: 1.6; color: #1f2937; }
h1 { background: linear-gradient(120deg, #5b63f0, #1fb5a0); color: #fff; padding: 18pt 20pt; border-radius: 12pt; font-size: 21pt; line-height: 1.2; margin: 0 0 12pt; }
h1 span { background: none; padding: 0; }
.overview { background: #f4f6ff; border-left: 4pt solid #5b63f0; padding: 10pt 14pt; border-radius: 0 8pt 8pt 0; color: #2d3748; font-size: 11pt; margin: 0 0 6pt; }
.topic { margin: 18pt 0 0; break-inside: avoid-page; page-break-inside: avoid; }
h3 { margin: 0 0 8pt; font-size: 14pt; color: #111827; border-bottom: 1.5pt solid #e3e7ff; padding-bottom: 5pt; break-after: avoid; }
h3 span { display: inline; background: none; padding: 0; }
p { margin: 0 0 6pt; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 6pt; padding-left: 18pt; }
li { margin-bottom: 2pt; }
li::marker { color: #5b63f0; }
.example { background: #effaf8; border: 1px solid #cdeee9; border-left: 3pt solid #1fb5a0; border-radius: 8pt; padding: 6pt 10pt; margin: 8pt 0; }
.visual { background: #f7f8ff; border: 1px solid #dfe3ff; border-radius: 10pt; padding: 10pt 12pt; margin: 10pt 0; break-inside: avoid; }
.cap { color: #5b63f0; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6pt; }
.flow { display: flex; flex-wrap: wrap; align-items: center; gap: 6pt; }
.box { display: inline-block; background: #fff; border: 1px solid #5b63f0; border-radius: 8pt; padding: 4pt 9pt; font-size: 10pt; }
.arrow { color: #5b63f0; font-weight: 700; }
table { border-collapse: collapse; width: 100%; font-size: 10pt; }
th, td { border: 1px solid #e2e6f3; padding: 5pt 8pt; text-align: left; vertical-align: top; }
th { background: #eef0ff; }
tbody tr:nth-child(even) td { background: #fafbff; }
tr { break-inside: avoid; }
.concept .center { display: inline-block; background: #5b63f0; color: #fff; font-weight: 700; padding: 5pt 14pt; border-radius: 99pt; margin-bottom: 6pt; }
.branches { display: flex; flex-wrap: wrap; gap: 6pt; }
.branches .box { border-color: #1fb5a0; }
`;

export function exportPlain(note) {
  const topics = note.topics || [];
  const gloss = (note.glossary || [])
    .map((g) => `<p><b>${esc(g.term)}:</b> ${esc(g.meaning)}</p>`)
    .join("");

  const body =
    `<h1><span>${esc(note.title || "Lecture notes")}</span></h1>` +
    (note.summary ? `<p class="overview">${esc(note.summary)}</p>` : "") +
    topics
      .map((t, i) =>
        section(
          "c" + (i % 4),
          `${i + 1}. ${esc(t.heading)}`,
          paras(t.explanation) +
            visualHtml(t.visual) +
            list("ul", t.keyPoints) +
            (t.example ? `<p class="example"><b>Example:</b> ${esc(t.example)}</p>` : "")
        )
      )
      .join("") +
    (gloss ? section("c1", "Key terms", gloss) : "") +
    section("c2", topics.length ? "Quick recap" : "Key points", list("ul", note.keyPoints)) +
    section("c3", "Revision questions", list("ol", note.revisionQuestions));

  const title = esc(note.title || "Lecture notes");
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>` +
    `<style>${PLAIN_CSS}</style></head><body>${body}</body></html>`;

  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const oldTitle = document.title;
  document.title = note.title || "Lecture notes";
  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    document.title = oldTitle;
    setTimeout(() => frame.remove(), 1000);
  }, 400);
}
