
const fs = require('fs');
const content = fs.readFileSync('/run/media/shark/033e2f56-34e7-4428-b4ef-bf76d5c4b6fb/CODE/CeramiSys/docs/client/src/app/accountant/page.tsx', 'utf8');

function checkBalance(text) {
    let divCount = 0;
    let braceCount = 1; // Component starts at line 29
    let parenCount = 0;
    let lines = text.split('\n');
    let inReturn = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.includes('return (')) inReturn = true;

        if (inReturn) {
            let opens = (line.match(/<div/g) || []).length;
            let closes = (line.match(/<\/div/g) || []).length;
            divCount += opens - closes;
        }

        // Braces (ignoring strings for simplicity)
        let oBraces = (line.match(/{/g) || []).length;
        let cBraces = (line.match(/}/g) || []).length;
        braceCount += oBraces - cBraces;

        let oParens = (line.match(/\(/g) || []).length;
        let cParens = (line.match(/\)/g) || []).length;
        parenCount += oParens - cParens;

        if (braceCount < 0 || parenCount < 0) {
            // console.log(`Mismatch at line ${i+1}: brace=${braceCount}, paren=${parenCount}`);
        }
    }
    console.log(`Final totals: div=${divCount}, brace=${braceCount}, paren=${parenCount}`);
}

checkBalance(content);
