// =============================================================
//  UI — event listeners and text filling
// =============================================================

import { generateStory } from './grammar.js';

function generateTextUntilFull() {
    const output = document.getElementById('brainRotOutput');
    const tempDiv = document.getElementById('tempDiv');

    const style = window.getComputedStyle(output);
    tempDiv.style.width = style.width;
    tempDiv.style.padding = style.padding;
    tempDiv.style.fontSize = style.fontSize;
    tempDiv.style.lineHeight = style.lineHeight;
    tempDiv.style.fontFamily = style.fontFamily;

    const maxHeight = output.clientHeight;

    // Generate a story with plenty of content
    const paragraphs = generateStory(30);

    // Build paragraphs until the container is full
    let html = '';
    for (const para of paragraphs) {
        const paraText = para.join(' ');
        const candidate = html + (html ? '\n\n' : '') + paraText;

        // Test if this fits
        tempDiv.innerHTML = candidate.replace(/\n\n/g, '<br><br>');
        if (tempDiv.scrollHeight > maxHeight && html) break;
        html = candidate;
    }

    // If we still have room, generate more filler paragraphs
    if (tempDiv.scrollHeight < maxHeight) {
        const extra = generateStory(20);
        for (const para of extra) {
            const paraText = para.join(' ');
            const candidate = html + '\n\n' + paraText;
            tempDiv.innerHTML = candidate.replace(/\n\n/g, '<br><br>');
            if (tempDiv.scrollHeight > maxHeight) break;
            html = candidate;
        }
    }

    output.innerHTML = html.replace(/\n\n/g, '<br><br>');
    output.classList.remove('fade-in');
    void output.offsetWidth;
    output.classList.add('fade-in');
}

document.getElementById('rotButton').addEventListener('click', generateTextUntilFull);

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (document.getElementById('brainRotOutput').innerHTML) {
            generateTextUntilFull();
        }
    }, 200);
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        generateTextUntilFull();
    }
});
