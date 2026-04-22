import * as fs from "node:fs";

const code = fs.readFileSync("pages/ListingDetail.jsx", "utf-8");

let depth = 0;
let tags = [];
const tagRegex = /<\/?([a-zA-Z0-9]+)(?:\s+[^>]*?)?(\/?)>/g;

let match;
while ((match = tagRegex.exec(code)) !== null) {
  const isClosing = match[0].startsWith("</");
  const isSelfClosing = match[2] === "/";
  const tagName = match[1];

  // skip tags that are inside comments or strings (rough heuristic, we can do better)
  // Let's just print the stack
  if (isSelfClosing) {
    // console.log(`Self closing: ${tagName}`);
  } else if (isClosing) {
    if (tags.length > 0 && tags[tags.length - 1].name === tagName) {
      tags.pop();
    } else {
      console.log(`Mismatch! Expected ${tags[tags.length - 1]?.name} but got </${tagName}> at index ${match.index}`);
      break;
    }
  } else {
    tags.push({ name: tagName, index: match.index });
  }
}

console.log("Remaining open tags:", tags.map(t => t.name));