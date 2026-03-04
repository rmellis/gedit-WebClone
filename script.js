const editor = document.getElementById('editor');
const highlighting = document.getElementById('highlighting-content');
const highlightingPre = document.getElementById('highlighting');
const lineNumbers = document.getElementById('line-numbers');
const tabbar = document.getElementById('tabbar');
const documentList = document.getElementById('document-list');

// Header and Status
const headerTitle = document.getElementById('header-title');
const headerSubtitle = document.getElementById('header-subtitle');
const sbPosition = document.getElementById('sb-position');
const sbType = document.getElementById('sb-type');
const sbTabWidth = document.getElementById('sb-tabwidth');

let tabs = [];
let activeTabId = null;
let fileCounter = 0;
let currentZoom = 14; 

// --- GNOME DIALOG ENGINE ---
let msgBoxCallback = null;

function closeMsgBox(result = null) {
    document.getElementById('msg-box-modal').style.display = 'none';
    if (msgBoxCallback) msgBoxCallback(result);
}

window.customAlert = function(msg) {
    return new Promise(resolve => {
        document.getElementById('msg-box-title').textContent = 'Gedit WebApp';
        document.getElementById('msg-box-text').textContent = msg;
        document.getElementById('msg-box-input-container').style.display = 'none';
        document.getElementById('msg-box-actions').innerHTML = `<button class="btn btn-primary" onclick="closeMsgBox(true)">OK</button>`;
        
        const modal = document.getElementById('msg-box-modal');
        modal.style.display = 'block';
        resetModalPosition(modal);
        msgBoxCallback = resolve;
    });
};

window.customConfirm = function(msg) {
    return new Promise(resolve => {
        document.getElementById('msg-box-title').textContent = 'Confirm';
        document.getElementById('msg-box-text').textContent = msg;
        document.getElementById('msg-box-input-container').style.display = 'none';
        document.getElementById('msg-box-actions').innerHTML = `
            <button class="btn" onclick="closeMsgBox(false)">Cancel</button>
            <button class="btn btn-primary" onclick="closeMsgBox(true)">OK</button>
        `;
        
        const modal = document.getElementById('msg-box-modal');
        modal.style.display = 'block';
        resetModalPosition(modal);
        msgBoxCallback = resolve;
    });
};

window.customPrompt = function(msg, defaultText = '') {
    return new Promise(resolve => {
        document.getElementById('msg-box-title').textContent = 'Input Required';
        document.getElementById('msg-box-text').textContent = msg;
        document.getElementById('msg-box-input-container').style.display = 'block';
        let input = document.getElementById('msg-box-input');
        input.value = defaultText;
        document.getElementById('msg-box-actions').innerHTML = `
            <button class="btn" onclick="closeMsgBox(null)">Cancel</button>
            <button class="btn btn-primary" onclick="closeMsgBox(document.getElementById('msg-box-input').value)">OK</button>
        `;
        
        const modal = document.getElementById('msg-box-modal');
        modal.style.display = 'block';
        resetModalPosition(modal);
        
        input.focus();
        input.select();
        
        input.onkeydown = function(e) {
            if(e.key === 'Enter') { e.preventDefault(); closeMsgBox(input.value); }
            if(e.key === 'Escape') { e.preventDefault(); closeMsgBox(null); }
        };
        msgBoxCallback = resolve;
    });
};

function resetModalPosition(modal) {
    modal.style.left = '50%';
    modal.style.top = '50%';
}

// --- Language Mapping ---
function getExtensionForLang(lang) {
    const extMap = {
        'none': 'txt', 'c': 'c', 'cpp': 'cpp', 'csharp': 'cs', 'css': 'css',
        'html': 'html', 'java': 'java', 'javascript': 'js', 'json': 'json',
        'markdown': 'md', 'php': 'php', 'python': 'py', 'rust': 'rs', 'sql': 'sql', 'xml': 'xml'
    };
    return extMap[lang] || 'txt';
}

function getDisplayNameForLang(lang) {
    const nameMap = {
        'none': 'Plain Text', 'c': 'C', 'cpp': 'C++', 'csharp': 'C#', 'css': 'CSS',
        'html': 'HTML', 'java': 'Java', 'javascript': 'JavaScript', 'json': 'JSON',
        'markdown': 'Markdown', 'php': 'PHP', 'python': 'Python', 'rust': 'Rust', 'sql': 'SQL', 'xml': 'XML'
    };
    return nameMap[lang] || 'Plain Text';
}

// --- Core Editor Logic ---
function handleInput() {
    const text = editor.value;
    const currentTab = getActiveTab();
    currentTab.content = text;
    
    let prismText = text;
    if (prismText.endsWith('\n')) prismText += ' '; 
    
    highlighting.textContent = prismText;
    if (typeof Prism !== 'undefined') Prism.highlightElement(highlighting);
    
    updateLineNumbers(text);
    updateStatusBarCursor();
    syncScroll();
    
    if (currentTab.isSaved) {
        currentTab.isSaved = false;
        renderTabs();
    }
}

function syncScroll() {
    highlightingPre.scrollTop = editor.scrollTop;
    highlightingPre.scrollLeft = editor.scrollLeft;
    lineNumbers.scrollTop = editor.scrollTop;
    
    document.getElementById('active-line-highlight').style.transform = `translate(-${editor.scrollLeft}px, -${editor.scrollTop}px)`;
    
    if (editor.scrollTop > highlightingPre.scrollTop) editor.scrollTop = highlightingPre.scrollTop;
}

editor.addEventListener('scroll', syncScroll);

function updateLineNumbers(text) {
    const lines = text.split('\n');
    const wrapper = document.getElementById('code-wrapper');
    const isWrap = wrapper.classList.contains('word-wrap');
    
    const cs = window.getComputedStyle(editor);
    const fontSize = parseFloat(cs.fontSize) || currentZoom;
    const lh = fontSize * 1.5; 
    
    let numbersHtml = '';
    
    if (!isWrap) {
        for (let i = 1; i <= lines.length; i++) { 
            numbersHtml += `<div style="height: ${lh}px; line-height: ${lh}px;">${i}</div>`; 
        }
        lineNumbers.innerHTML = numbersHtml;
        return;
    }

    let measurer = document.getElementById('wrap-measurer');
    if (!measurer) {
        measurer = document.createElement('div');
        measurer.id = 'wrap-measurer';
        document.body.appendChild(measurer); 
    }
    
    measurer.style.cssText = `position:fixed; visibility:hidden; top:-9999px; left:-9999px; white-space:pre-wrap; word-wrap:break-word; overflow-wrap:anywhere; word-break:break-all; font-family:${cs.fontFamily}; font-size:${cs.fontSize}; line-height:${cs.lineHeight}; box-sizing:${cs.boxSizing}; tab-size:${cs.tabSize}; width:${editor.clientWidth}px; padding-left:${cs.paddingLeft}; padding-right:${cs.paddingRight};`;

    let dummyHtml = '';
    for (let i = 0; i < lines.length; i++) {
        let safeLine = lines[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (safeLine.length === 0) safeLine = ' '; 
        dummyHtml += `<div style="display:block; width:100%;">${safeLine}</div>`;
    }
    measurer.innerHTML = dummyHtml;

    const children = measurer.children;
    for (let i = 0; i < children.length; i++) {
        let h = children[i].offsetHeight;
        let linesWrapped = Math.round(h / lh);
        if (linesWrapped < 1) linesWrapped = 1; 
        numbersHtml += `<div style="height: ${linesWrapped * lh}px; line-height: ${lh}px;">${i + 1}</div>`;
    }
    lineNumbers.innerHTML = numbersHtml;
}

window.addEventListener('resize', () => {
    if (document.getElementById('code-wrapper').classList.contains('word-wrap')) {
        updateLineNumbers(editor.value);
    }
});

// --- Zoom Engine ---
function zoomEditor(direction) {
    if (direction !== 0) { currentZoom += (direction * 2); }
    if(currentZoom < 8) currentZoom = 8;
    if(currentZoom > 48) currentZoom = 48;
    
    document.documentElement.style.setProperty('--editor-font-size', currentZoom + 'px');
    document.documentElement.style.setProperty('--editor-line-height', (currentZoom * 1.5) + 'px');
    const prefFontSize = document.getElementById('pref-font-size');
    if(prefFontSize) prefFontSize.value = currentZoom;
    
    updateLineNumbers(editor.value); 
    updateStatusBarCursor(); 
    syncScroll(); 
}

function resetZoom() {
    currentZoom = 14;
    document.documentElement.style.setProperty('--editor-font-size', currentZoom + 'px');
    document.documentElement.style.setProperty('--editor-line-height', (currentZoom * 1.5) + 'px');
    const prefFontSize = document.getElementById('pref-font-size');
    if(prefFontSize) prefFontSize.value = currentZoom;
    updateLineNumbers(editor.value); 
    updateStatusBarCursor(); 
    syncScroll(); 
}

document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
        e.preventDefault(); 
        if (e.deltaY < 0) zoomEditor(1);  
        else if (e.deltaY > 0) zoomEditor(-1); 
    }
}, { passive: false });

// --- Syntax & Status Management ---
function setLanguage(lang) {
    const currentTab = getActiveTab();
    if(!currentTab) return;
    
    currentTab.lang = lang;
    highlighting.className = `language-${lang}`;
    if (typeof Prism !== 'undefined') Prism.highlightElement(highlighting);
    
    sbType.textContent = getDisplayNameForLang(lang);
    document.getElementById('hamburger-dropdown').classList.remove('open');
}

function updateStatusBarCursor() {
    const text = editor.value;
    const pos = editor.selectionStart;
    const linesBeforeCursor = text.substring(0, pos).split('\n');
    const currentLine = linesBeforeCursor.length;
    const currentCol = linesBeforeCursor[linesBeforeCursor.length - 1].length + 1;
    sbPosition.textContent = `Line ${currentLine}, Column ${currentCol}`;
    
    const isWrap = document.getElementById('code-wrapper').classList.contains('word-wrap');
    const highlight = document.getElementById('active-line-highlight');
    if (!isWrap) {
        const lh = parseFloat(window.getComputedStyle(editor).fontSize) * 1.5 || (currentZoom * 1.5);
        highlight.style.display = 'block';
        highlight.style.top = `${(currentLine - 1) * lh + 5}px`; 
        highlight.style.width = `max(100%, ${editor.scrollWidth}px)`;
    } else {
        highlight.style.display = 'none'; 
    }
}

// --- Tab Management ---
function newTab(title = null, content = '', lang = 'none', isOpenedFile = false) {
    fileCounter++;
    const tabTitle = title || `Document ${fileCounter}`;
    const tabPath = isOpenedFile ? `~/Documents/${tabTitle}` : `~/Unsaved/${tabTitle}`;
    
    const newId = `tab-${Date.now()}`;
    tabs.push({ id: newId, title: tabTitle, path: tabPath, content: content, isSaved: true, lang: lang });
    switchTab(newId);
    document.getElementById('hamburger-dropdown').classList.remove('open');
}

function switchTab(id) {
    const currentTab = getActiveTab();
    if (currentTab) {
        currentTab.scrollTop = editor.scrollTop;
        currentTab.scrollLeft = editor.scrollLeft;
    }

    activeTabId = id;
    const tab = getActiveTab();
    
    editor.value = tab.content;
    let prismText = tab.content;
    if (prismText.endsWith('\n')) prismText += ' ';
    
    highlighting.textContent = prismText;
    highlighting.className = `language-${tab.lang}`;
    if (typeof Prism !== 'undefined') Prism.highlightElement(highlighting);
    
    updateLineNumbers(tab.content);
    sbType.textContent = getDisplayNameForLang(tab.lang);
    updateStatusBarCursor();
    
    headerTitle.textContent = tab.title;
    headerSubtitle.textContent = tab.path;
    document.title = `${tab.title} - Gedit`;
    
    setTimeout(() => {
        editor.scrollTop = tab.scrollTop || 0;
        editor.scrollLeft = tab.scrollLeft || 0;
        syncScroll();
    }, 0);

    renderTabs();
}

async function closeTab(event, id) {
    event.stopPropagation();
    const tabToClose = tabs.find(t => t.id === id);
    
    if (!tabToClose.isSaved) {
        if (!(await customConfirm(`Close document "${tabToClose.title}" without saving? Changes will be lost.`))) return;
    }
    
    tabs = tabs.filter(t => t.id !== id);
    if (tabs.length === 0) newTab();
    else if (activeTabId === id) switchTab(tabs[tabs.length - 1].id);
    else renderTabs();
}

function getActiveTab() { return tabs.find(t => t.id === activeTabId); }

function renderTabs() {
    tabbar.innerHTML = '';
    documentList.innerHTML = '';
    
    if(tabs.length <= 1) { tabbar.style.display = 'none'; } 
    else { tabbar.style.display = 'flex'; }

    tabs.forEach(tab => {
        const isActive = tab.id === activeTabId;
        const unsavedMarker = tab.isSaved ? '' : '<span class="unsaved-dot">*</span>';
        
        // 1. Render Top Tab
        const tabEl = document.createElement('div');
        tabEl.className = `tab ${isActive ? 'active' : ''}`;
        tabEl.onclick = () => switchTab(tab.id);
        
        // Tab Drag and Drop
        tabEl.draggable = true;
        tabEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', tab.id);
            setTimeout(() => tabEl.classList.add('dragging'), 0);
        });
        tabEl.addEventListener('dragover', (e) => { e.preventDefault(); tabEl.classList.add('drag-over'); });
        tabEl.addEventListener('dragleave', (e) => { tabEl.classList.remove('drag-over'); });
        tabEl.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation(); 
            tabEl.classList.remove('drag-over');
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId && draggedId !== tab.id) {
                const draggedIndex = tabs.findIndex(t => t.id === draggedId);
                const targetIndex = tabs.findIndex(t => t.id === tab.id);
                if (draggedIndex !== -1 && targetIndex !== -1) {
                    const [draggedTab] = tabs.splice(draggedIndex, 1);
                    tabs.splice(targetIndex, 0, draggedTab);
                    renderTabs();
                }
            }
        });
        tabEl.addEventListener('dragend', (e) => {
            tabEl.classList.remove('dragging');
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
        });

        tabEl.innerHTML = `
            ${unsavedMarker}
            <span class="tab-title">${tab.title}</span>
            <span class="tab-close" onclick="closeTab(event, '${tab.id}')">✖</span>
        `;
        tabbar.appendChild(tabEl);
        
        // 2. Render Side Panel Item
        const sideEl = document.createElement('div');
        sideEl.className = `doc-list-item ${isActive ? 'active' : ''}`;
        sideEl.onclick = () => switchTab(tab.id);
        sideEl.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" opacity="0.6">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span style="flex-grow:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-left:8px;">${tab.title}</span>
            ${unsavedMarker}
        `;
        documentList.appendChild(sideEl);
    });
}

tabbar.addEventListener('dragover', (e) => { e.preventDefault(); });
tabbar.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId) {
        const draggedIndex = tabs.findIndex(t => t.id === draggedId);
        if (draggedIndex !== -1) {
            const [draggedTab] = tabs.splice(draggedIndex, 1);
            tabs.push(draggedTab);
            renderTabs();
        }
    }
});

// --- File Operations ---
function triggerFileOpen() { document.getElementById('fileInput').click(); }

function handleFileOpen(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const ext = file.name.split('.').pop().toLowerCase();
        let lang = 'none';
        if (['html', 'htm'].includes(ext)) lang = 'html';
        else if (['js'].includes(ext)) lang = 'javascript';
        else if (['css'].includes(ext)) lang = 'css';
        else if (['json'].includes(ext)) lang = 'json';
        else if (['py'].includes(ext)) lang = 'python';
        else if (['php'].includes(ext)) lang = 'php';
        else if (['c'].includes(ext)) lang = 'c';
        else if (['cpp', 'h'].includes(ext)) lang = 'cpp';
        else if (['cs'].includes(ext)) lang = 'csharp';
        else if (['java'].includes(ext)) lang = 'java';
        else if (['xml'].includes(ext)) lang = 'xml';
        else if (['md'].includes(ext)) lang = 'markdown';
        else if (['rs'].includes(ext)) lang = 'rust';

        newTab(file.name, e.target.result, lang, true);
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

function executeDownload(tab, fileName) {
    const blob = new Blob([tab.content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 0);
    
    tab.path = `~/Documents/${fileName}`;
    tab.isSaved = true; 
    
    if(tab.id === activeTabId) headerSubtitle.textContent = tab.path;
    renderTabs();
}

function saveCurrentFile() {
    const tab = getActiveTab();
    if(!tab) return;
    let fileName = tab.title;
    if (!fileName.includes('.')) fileName = `${fileName}.${getExtensionForLang(tab.lang)}`;
    executeDownload(tab, fileName);
}

async function saveAsFile() {
    const tab = getActiveTab();
    if(!tab) return;
    let suggestedName = tab.title.includes('.') ? tab.title : `${tab.title}.${getExtensionForLang(tab.lang)}`;
    let newFileName = await customPrompt("Save As...", suggestedName);
    if (newFileName === null || newFileName.trim() === "") return; 
    
    tab.title = newFileName;
    executeDownload(tab, newFileName);
    document.getElementById('hamburger-dropdown').classList.remove('open');
    headerTitle.textContent = tab.title;
}

function saveAllFiles() {
    tabs.forEach(tab => {
        if(!tab.isSaved) {
            let fileName = tab.title.includes('.') ? tab.title : `${tab.title}.${getExtensionForLang(tab.lang)}`;
            const blob = new Blob([tab.content], { type: "text/plain;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob); a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            
            tab.path = `~/Documents/${fileName}`;
            tab.isSaved = true;
            if(tab.id === activeTabId) headerSubtitle.textContent = tab.path;
        }
    });
    renderTabs();
    document.getElementById('hamburger-dropdown').classList.remove('open');
}

// --- Utility Functions & Tools ---
async function goToLine() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    let ln = await customPrompt("Go to line:");
    if(ln !== null && !isNaN(ln) && ln > 0) {
        let lines = editor.value.split('\n');
        let pos = 0;
        for(let i=0; i<ln-1 && i<lines.length; i++) pos += lines[i].length + 1;
        editor.focus();
        editor.setSelectionRange(pos, pos);
        scrollToTarget(pos); 
    }
}

function toggleSidePanel() {
    const panel = document.getElementById('side-panel');
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'flex';
    document.getElementById('view-check-sidepanel').textContent = isVisible ? '' : '✓ ';
    document.getElementById('hamburger-dropdown').classList.remove('open');
}

function showDocumentStats() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    let text = editor.value;
    let chars = text.length;
    let words = text.split(/\s+/).filter(w => w.length > 0).length;
    let lines = text.split('\n').length;
    customAlert(`Document Statistics:\n\nLines: ${lines}\nWords: ${words}\nCharacters: ${chars}`);
}

function toggleFullScreen() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => {});
    else if (document.exitFullscreen) document.exitFullscreen();
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('view-check-darkmode').textContent = isDark ? '✓ ' : '';
    document.getElementById('hamburger-dropdown').classList.remove('open');
}

function toggleSpellCheck() {
    const isSpell = editor.getAttribute('spellcheck') === 'true';
    editor.setAttribute('spellcheck', !isSpell ? 'true' : 'false');
    document.getElementById('view-check-spell').textContent = !isSpell ? '✓ ' : '';
    document.getElementById('hamburger-dropdown').classList.remove('open');
}

// Gedit Text Formatting Tools
function insertDateTime() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    const now = new Date();
    const str = now.toLocaleString();
    if(!document.execCommand('insertText', false, str)) editor.setRangeText(str, editor.selectionStart, editor.selectionEnd, 'end');
    handleInput();
}

function sortLines() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    let textToSort = editor.value;
    let isSelection = false;
    
    if (start !== end) {
        textToSort = editor.value.substring(start, end);
        isSelection = true;
    }
    
    let lines = textToSort.split('\n');
    lines.sort();
    let sortedText = lines.join('\n');
    
    if (isSelection) {
        if(!document.execCommand('insertText', false, sortedText)) editor.setRangeText(sortedText, start, end, 'end');
    } else {
        editor.value = sortedText;
    }
    handleInput();
}

function changeCase(type) {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return customAlert("Select text to change its case.");
    
    const selText = editor.value.substring(start, end);
    const newText = type === 'upper' ? selText.toUpperCase() : selText.toLowerCase();
    
    if(!document.execCommand('insertText', false, newText)) editor.setRangeText(newText, start, end, 'end');
    handleInput();
}

function removeTrailingSpaces() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    const text = editor.value;
    const newText = text.split('\n').map(line => line.trimEnd()).join('\n');
    if (text !== newText) {
        editor.value = newText;
        handleInput();
        customAlert("Trailing spaces removed successfully.");
    } else {
        customAlert("No trailing spaces found.");
    }
}

function tabsToSpaces() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    const tabSize = parseInt(document.documentElement.style.getPropertyValue('--editor-tab-size')) || 4;
    const spaces = ' '.repeat(tabSize);
    const text = editor.value;
    const newText = text.replace(/\t/g, spaces);
    if (text !== newText) {
        editor.value = newText;
        handleInput();
    }
}

function spacesToTabs() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    const tabSize = parseInt(document.documentElement.style.getPropertyValue('--editor-tab-size')) || 4;
    const regex = new RegExp(' '.repeat(tabSize), 'g');
    const text = editor.value;
    const newText = text.replace(regex, '\t');
    if (text !== newText) {
        editor.value = newText;
        handleInput();
    }
}

function performBase64Encode() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return customAlert("Please select text to encode first.");
    try {
        const encoded = btoa(unescape(encodeURIComponent(editor.value.substring(start, end))));
        if(!document.execCommand('insertText', false, encoded)) editor.setRangeText(encoded, start, end, 'end');
        handleInput();
    } catch (e) { customAlert("Failed to encode text."); }
}

function performBase64Decode() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return customAlert("Please select Base64 text to decode first.");
    try {
        const decoded = decodeURIComponent(escape(atob(editor.value.substring(start, end))));
        if(!document.execCommand('insertText', false, decoded)) editor.setRangeText(decoded, start, end, 'end');
        handleInput();
    } catch (e) { customAlert("Failed to decode. Make sure the selection is valid Base64."); }
}

function convertToHex() {
    document.getElementById('hamburger-dropdown').classList.remove('open');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return customAlert("Select text to convert to HEX.");
    const hex = Array.from(editor.value.substring(start, end)).map(c => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(' ');
    if(!document.execCommand('insertText', false, hex)) editor.setRangeText(hex, start, end, 'end');
    handleInput();
}

// --- Find Engine ---
function scrollToTarget(index) {
    const isWrap = document.getElementById('code-wrapper').classList.contains('word-wrap');
    const textBefore = editor.value.substring(0, index);
    const linesBefore = textBefore.split('\n');
    const lh = (parseFloat(window.getComputedStyle(editor).fontSize) || currentZoom) * 1.5; 
    
    let targetTop = 0;
    if (!isWrap) {
        targetTop = (linesBefore.length - 1) * lh;
    } else {
        let measurer = document.getElementById('wrap-measurer');
        if (measurer && measurer.children.length >= linesBefore.length) {
            for (let i = 0; i < linesBefore.length - 1; i++) {
                let linesWrapped = Math.max(1, Math.round(measurer.children[i].offsetHeight / lh));
                targetTop += (linesWrapped * lh);
            }
        } else {
            targetTop = (linesBefore.length - 1) * lh; 
        }
    }
    editor.scrollTop = Math.max(0, targetTop - (editor.clientHeight / 2) + (lh / 2));
    syncScroll();
}

function showFindModal(isReplace) {
    const modal = document.getElementById('find-modal');
    modal.style.display = 'block';
    resetModalPosition(modal); // Place perfectly in center
    
    document.getElementById('hamburger-dropdown').classList.remove('open');
    
    document.getElementById('find-modal-title').textContent = isReplace ? 'Find and Replace' : 'Find';
    document.getElementById('replace-row').style.display = isReplace ? 'block' : 'none';
    document.getElementById('btn-replace').style.display = isReplace ? 'inline-block' : 'none';
    document.getElementById('btn-replace-all').style.display = isReplace ? 'inline-block' : 'none';
    
    let sel = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    if (sel && !sel.includes('\n')) document.getElementById('find-input').value = sel;
    document.getElementById('find-input').focus();
}

function closeFindModal() { document.getElementById('find-modal').style.display = 'none'; editor.focus(); }

function doFindNext() {
    let query = document.getElementById('find-input').value;
    if (!query) return;
    let targetText = document.getElementById('find-match-case').checked ? editor.value : editor.value.toLowerCase();
    let targetQuery = document.getElementById('find-match-case').checked ? query : query.toLowerCase();
    let index = targetText.indexOf(targetQuery, editor.selectionEnd);
    if (index === -1 && document.getElementById('find-wrap').checked) index = targetText.indexOf(targetQuery, 0); 
    
    if (index !== -1) {
        editor.focus();
        editor.setSelectionRange(index, index + query.length);
        scrollToTarget(index); 
    } else {
        customAlert(`Cannot find "${query}"`);
    }
}

function doReplace() {
    let query = document.getElementById('find-input').value;
    let replacement = document.getElementById('replace-input').value;
    let sel = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    let matchCase = document.getElementById('find-match-case').checked;
    
    if (matchCase ? (sel === query) : (sel.toLowerCase() === query.toLowerCase())) {
        if(!document.execCommand('insertText', false, replacement)) editor.setRangeText(replacement, editor.selectionStart, editor.selectionEnd, 'end');
        handleInput();
    }
    doFindNext();
}

function doReplaceAll() {
    let query = document.getElementById('find-input').value;
    let replacement = document.getElementById('replace-input').value;
    if (!query) return;
    
    let flags = document.getElementById('find-match-case').checked ? 'g' : 'gi';
    let regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    let text = editor.value;
    let newText = text.replace(regex, replacement);
    
    if(text !== newText) {
        editor.value = newText;
        handleInput();
        customAlert("Replace All completed.");
    } else customAlert(`Cannot find "${query}"`);
}

// --- Preferences & Modals ---
function showAboutModal() { 
    const modal = document.getElementById('about-modal');
    modal.style.display = 'block'; 
    resetModalPosition(modal);
    document.getElementById('hamburger-dropdown').classList.remove('open');
}
function closeAboutModal() { document.getElementById('about-modal').style.display = 'none'; }

function showPrefModal() { 
    const modal = document.getElementById('pref-modal');
    modal.style.display = 'block'; 
    resetModalPosition(modal);
    document.getElementById('hamburger-dropdown').classList.remove('open');
}
function closePrefModal() { document.getElementById('pref-modal').style.display = 'none'; }

function showShortcutModal() { 
    const modal = document.getElementById('shortcut-modal');
    modal.style.display = 'block'; 
    resetModalPosition(modal);
    document.getElementById('hamburger-dropdown').classList.remove('open');
}
function closeShortcutModal() { document.getElementById('shortcut-modal').style.display = 'none'; }

function changeFontSizePref() {
    let val = parseInt(document.getElementById('pref-font-size').value, 10);
    if(val >= 8 && val <= 48) { currentZoom = val; document.documentElement.style.setProperty('--editor-font-size', val + 'px'); document.documentElement.style.setProperty('--editor-line-height', (val * 1.5) + 'px'); updateLineNumbers(editor.value); syncScroll(); updateStatusBarCursor();}
}
function changeFontFamilyPref() {
    document.documentElement.style.setProperty('--editor-font-family', document.getElementById('pref-font-family').value);
    updateLineNumbers(editor.value); syncScroll();
}
function changeTabSizePref() {
    let size = parseInt(document.getElementById('pref-tab-size').value, 10);
    if(size > 0 && size <= 16) { document.documentElement.style.setProperty('--editor-tab-size', size); sbTabWidth.textContent = `Tab Width: ${size}`; updateLineNumbers(editor.value); syncScroll(); }
}

function toggleLineNumbers() {
    const display = document.getElementById('line-numbers').style.display !== 'none';
    document.getElementById('line-numbers').style.display = display ? 'none' : 'block';
    document.getElementById('pref-line-numbers').checked = !display;
    document.getElementById('view-check-linenums').textContent = display ? '' : '✓ ';
    setTimeout(syncScroll, 10);
}

function toggleWordWrap() {
    const isWrap = document.getElementById('code-wrapper').classList.toggle('word-wrap');
    editor.setAttribute('wrap', isWrap ? 'soft' : 'off');
    document.getElementById('pref-word-wrap').checked = isWrap;
    document.getElementById('view-check-wordwrap').textContent = isWrap ? '✓ ' : '';
    updateLineNumbers(editor.value); 
    updateStatusBarCursor();
    setTimeout(syncScroll, 10);
}

// --- Universal Modal Dragging Logic ---
document.addEventListener('DOMContentLoaded', () => {
    
    // FORCE DARK MODE ON LOAD FOR CODEPEN
    document.body.classList.add('dark-mode');
    
    let isDragging = false;
    let dragModal = null;
    let startX, startY, initialLeft, initialTop;

    document.querySelectorAll('.modal-header').forEach(header => {
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName.toLowerCase() === 'button') return; 
            
            isDragging = true;
            dragModal = header.closest('.modal');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const style = window.getComputedStyle(dragModal);
            initialLeft = parseFloat(style.left);
            initialTop = parseFloat(style.top);
            
            e.preventDefault(); 
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !dragModal) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        dragModal.style.left = `${initialLeft + dx}px`;
        dragModal.style.top = `${initialTop + dy}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            dragModal = null;
        }
    });

    // Hamburger toggle
    document.getElementById('btn-hamburger').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('hamburger-dropdown').classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.hamburger-container')) {
            document.getElementById('hamburger-dropdown').classList.remove('open');
        }
    });

    newTab();
});

document.addEventListener('keydown', function(e) {
    // Indent / Unindent
    if (e.key === 'Tab') { 
        e.preventDefault(); 
        if (e.shiftKey) {
            // Unindent block
            const start = editor.selectionStart;
            let text = editor.value;
            let lines = text.split('\n');
            let currentLineIndex = text.substr(0, start).split('\n').length - 1;
            
            if (lines[currentLineIndex].startsWith('    ')) {
                lines[currentLineIndex] = lines[currentLineIndex].substring(4);
                editor.value = lines.join('\n');
                handleInput();
                editor.selectionStart = start > 4 ? start - 4 : 0;
                editor.selectionEnd = editor.selectionStart;
            } else if (lines[currentLineIndex].startsWith('\t')) {
                lines[currentLineIndex] = lines[currentLineIndex].substring(1);
                editor.value = lines.join('\n');
                handleInput();
                editor.selectionStart = start > 1 ? start - 1 : 0;
                editor.selectionEnd = editor.selectionStart;
            }
        } else {
            // Indent block
            if(!document.execCommand('insertText', false, '    ')) { editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end'); handleInput(); }
        }
    }
    
    // Gedit Move Line Up / Down
    if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        const start = editor.selectionStart;
        const text = editor.value;
        const lines = text.split('\n');
        let currentLineIndex = text.substr(0, start).split('\n').length - 1;

        if (currentLineIndex > 0) {
            let temp = lines[currentLineIndex];
            lines[currentLineIndex] = lines[currentLineIndex - 1];
            lines[currentLineIndex - 1] = temp;
            editor.value = lines.join('\n');
            handleInput();
            let pos = 0;
            for(let i=0; i<currentLineIndex - 1; i++) pos += lines[i].length + 1;
            editor.selectionStart = editor.selectionEnd = pos;
        }
    }
    
    if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        const start = editor.selectionStart;
        const text = editor.value;
        const lines = text.split('\n');
        let currentLineIndex = text.substr(0, start).split('\n').length - 1;

        if (currentLineIndex < lines.length - 1) {
            let temp = lines[currentLineIndex];
            lines[currentLineIndex] = lines[currentLineIndex + 1];
            lines[currentLineIndex + 1] = temp;
            editor.value = lines.join('\n');
            handleInput();
            let pos = 0;
            for(let i=0; i<=currentLineIndex; i++) pos += lines[i].length + 1;
            editor.selectionStart = editor.selectionEnd = pos;
        }
    }

    // Gedit Join Lines
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        const start = editor.selectionStart;
        const text = editor.value;
        const lines = text.split('\n');
        let currentLineIndex = text.substr(0, start).split('\n').length - 1;

        if (currentLineIndex < lines.length - 1) {
            lines[currentLineIndex] = lines[currentLineIndex] + " " + lines[currentLineIndex + 1].trimStart();
            lines.splice(currentLineIndex + 1, 1);
            editor.value = lines.join('\n');
            handleInput();
            let pos = 0;
            for(let i=0; i<currentLineIndex; i++) pos += lines[i].length + 1;
            editor.selectionStart = editor.selectionEnd = pos + lines[currentLineIndex].length;
        }
    }

    // Gedit Quick Duplicate Shortcut
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        if (start === end) {
            const text = editor.value;
            const lines = text.split('\n');
            let currentLine = 0, pos = 0;
            for(let i=0; i<lines.length; i++) {
                pos += lines[i].length + 1;
                if (pos > start) { currentLine = i; break; }
            }
            lines.splice(currentLine, 0, lines[currentLine]);
            editor.value = lines.join('\n');
            handleInput();
            editor.selectionStart = start + lines[currentLine].length + 1;
            editor.selectionEnd = editor.selectionStart;
        } else {
            const selText = editor.value.substring(start, end);
            if(!document.execCommand('insertText', false, selText + selText)) editor.setRangeText(selText + selText, start, end, 'end');
            handleInput();
        }
    }
    
    if (e.ctrlKey && e.key === '0') { e.preventDefault(); resetZoom(); }
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); showFindModal(false); }
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'h') { e.preventDefault(); showFindModal(true); }
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'g') { e.preventDefault(); goToLine(); }
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); }
    if (e.key === 'F3') { e.preventDefault(); if (document.getElementById('find-modal').style.display === 'block') doFindNext(); }
    if (e.key === 'F9') { e.preventDefault(); toggleSidePanel(); }
    if (e.key === 'F11') { e.preventDefault(); toggleFullScreen(); }
    
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveAsFile(); }
    else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveCurrentFile(); }
    
    if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); newTab(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); triggerFileOpen(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'w') { e.preventDefault(); closeActiveTab(); }
});