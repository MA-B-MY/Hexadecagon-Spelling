const manualWords = [
    "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
    "I am so lazy to write every single words. Just copy and paste that link"
];

const sortedWords = manualWords.map(w => w.toUpperCase()).sort();

const searchInput = document.getElementById('searchInput');
const alphabetContainer = document.getElementById('alphabetContainer');
const wordGrid = document.getElementById('wordGrid');
const resetBtn = document.getElementById('resetBtn');

// Back button using the new SPA flow
document.getElementById('backToMenuBtn').addEventListener('click', () => {
    // Assuming showScreen is available globally from game.js
    showScreen('menu-screen');
});

const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
alphabets.forEach(letter => {
    const btn = document.createElement('button');
    btn.textContent = letter;
    btn.className = 'alpha-btn';
    
    btn.addEventListener('click', () => {
        const filtered = sortedWords.filter(word => word.startsWith(letter));
        renderWords(filtered);
        searchInput.value = ''; 
    });
    
    alphabetContainer.appendChild(btn);
});

function renderWords(wordsToRender) {
    wordGrid.innerHTML = ''; 
    
    if (wordsToRender.length === 0) {
        wordGrid.innerHTML = '<p>No words found.</p>';
        return;
    }

    wordsToRender.forEach(word => {
        const div = document.createElement('div');
        div.className = 'word-item';
        div.textContent = word;
        wordGrid.appendChild(div);
    });
}

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toUpperCase();
    const filtered = sortedWords.filter(word => word.includes(searchTerm));
    renderWords(filtered);
});

resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    renderWords(sortedWords);
});

renderWords(sortedWords);