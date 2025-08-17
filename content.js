const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function normalizeText(s) {
    if (!s) return "";
    return s.replace(/\u00A0/g, " ")
            .replace(/[ \t\r\n]+/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
}

function paragraphText(p) {
    const katex = p.querySelector(".katex-html");
    if (katex) return normalizeText(p.innerText);
    return normalizeText(p.innerText || p.textContent);
}

function collectParagraphsBetween(startNode, endNodeExclusive, container) {
    const parts = [];
    let node = startNode ? startNode.nextElementSibling : container.firstElementChild;
    while (node && node !== endNodeExclusive) {
        if (node.tagName === "P") {
            const t = paragraphText(node);
            if (t) parts.push(t);
        }
        node = node.nextElementSibling;
    }
    return parts;
}

function findCodeAfterHeading(h) {
    let cur = h.nextElementSibling;
    while (cur && !/^H[12]$/.test(cur.tagName)) {
        if (cur.matches("pre, code")) return cur.innerText.trim();
        const inner = cur.querySelector("pre, code");
        if (inner) return inner.innerText.trim();
        cur = cur.nextElementSibling;
    }
    return "";
}

function scrapeProblem() {
    const container = $(".css-lpvz3r, .description-html");
    if (!container) return null;

    const data = {
        url: location.href,
        title: normalizeText(document.title.replace(/\|.*/, "")),
        constraints: [],
        statement: "",
        input_desc: "",
        output_desc: "",
        samples: []
    };

    const ul = container.querySelector("ul");
    if (ul) data.constraints.push(...$$("li", ul).map(li => normalizeText(li.innerText)));

    const hConstraints = $$("h1, h2", container).find(h => /محدودیت/.test(h.innerText));
    if (hConstraints) {
        let nextH2 = null, node = hConstraints.nextElementSibling;
        while (node) { if (node.tagName === "H2") { nextH2 = node; break; } node = node.nextElementSibling; }
        const paras = collectParagraphsBetween(hConstraints, nextH2, container);
        if (paras.length) data.constraints.push(...paras);

        let cur = hConstraints.nextElementSibling;
        while (cur && cur !== nextH2) {
            if (cur.tagName === "UL") data.constraints.push(...$$("li", cur).map(li => normalizeText(li.innerText)));
            cur = cur.nextElementSibling;
        }
    }

    const h1s = $$("h1", container);
    const hInput  = h1s.find(h => /ورودی/.test(h.innerText));
    const hOutput = h1s.find(h => /خروجی/.test(h.innerText));

    const startForStatement = ul || null;
    data.statement = collectParagraphsBetween(startForStatement, hInput, container).join("\n\n");
    if (hInput) data.input_desc = collectParagraphsBetween(hInput, hOutput || null, container).join("\n\n");
    if (hOutput) {
        let nextH2 = null, node = hOutput.nextElementSibling;
        while (node) { if (node.tagName === "H2") { nextH2 = node; break; } node = node.nextElementSibling; }
        data.output_desc = collectParagraphsBetween(hOutput, nextH2, container).join("\n\n");
    }

    const h2s = $$("h2", container);
    for (let i = 0; i < h2s.length; i++) {
        const h2 = h2s[i];
        const isInputSample  = /ورودی\s*نمونه/.test(h2.innerText);
        const isOutputSample = /خروجی\s*نمونه/.test(h2.innerText);
        if (isInputSample) {
            const inCode = findCodeAfterHeading(h2);
            let outCode = "";
            for (let j = i + 1; j < h2s.length; j++) {
                if (/خروجی\s*نمونه/.test(h2s[j].innerText)) {
                    outCode = findCodeAfterHeading(h2s[j]); i=j; break;
                }
                if (/ورودی\s*نمونه/.test(h2s[j].innerText)) break;
            }
            data.samples.push({ input: inCode, output: outCode });
        } else if (isOutputSample) {
            const outCode = findCodeAfterHeading(h2);
            data.samples.push({ input: "", output: outCode });
        }
    }

    ["statement","input_desc","output_desc"].forEach(k=>data[k]=data[k]||"");
    return data;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "SCRAPE_QUERA") {
        const data = scrapeProblem();
        sendResponse({ data });
    }
});