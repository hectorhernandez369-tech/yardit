import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const code = await Deno.readTextFile("src/pages/ListingDetail.jsx");
        
        let tags = [];
        let log = [];
        
        for (let i = 0; i < code.length; i++) {
            if (code.substring(i, i+4) === "<!--" || code.substring(i, i+4) === "{/* ") {
                let end = code.indexOf(code.substring(i, i+4) === "<!--" ? "-->" : "*/}", i);
                i = end > -1 ? end + 3 : code.length;
                continue;
            }
            
            if (code[i] === "<" && code[i+1] && /[a-zA-Z\/]/.test(code[i+1])) {
                let isClosing = code[i+1] === "/";
                let j = isClosing ? i + 2 : i + 1;
                let tagName = "";
                
                while (j < code.length && /[a-zA-Z0-9]/.test(code[j])) {
                    tagName += code[j];
                    j++;
                }
                
                if (tagName === "") continue;
                
                let k = j;
                let isSelfClosing = false;
                let inString = false;
                let strChar = '';
                
                while (k < code.length) {
                    if (inString) {
                        if (code[k] === strChar) inString = false;
                    } else {
                        if (code[k] === '"' || code[k] === "'") {
                            inString = true;
                            strChar = code[k];
                        } else if (code[k] === ">") {
                            if (code[k-1] === "/") isSelfClosing = true;
                            break;
                        }
                    }
                    k++;
                }
                
                if (k >= code.length) break;
                
                let line = code.substring(0, i).split('\n').length;
                
                if (!isSelfClosing) {
                    if (isClosing) {
                        if (tags.length > 0 && tags[tags.length - 1].name === tagName) {
                            tags.pop();
                        } else {
                            log.push(`Mismatch! Expected ${tags.length > 0 ? tags[tags.length - 1].name : 'none'} but got </${tagName}> at line ${line}`);
                        }
                    } else {
                        tags.push({name: tagName, line: line});
                    }
                }
                
                i = k;
            }
        }
        
        return Response.json({
            remaining: tags,
            log
        });
    } catch (e) {
        return Response.json({ error: e.message });
    }
});