# 📝 Gedit WebApp

A fully-featured, browser-based clone of the GNOME Gedit text editor. Built entirely with vanilla HTML, CSS, and JavaScript. It delivers a native Ubuntu Adwaita UI with seamless dark mode, drag-and-drop tabs, and real-time syntax highlighting. No backend or installation required—just open it in your browser and start typing!

<img width="1194" height="835" alt="image" src="https://github.com/user-attachments/assets/52d21cc4-59b8-4880-bb7a-1f2d28c4a9ee" />


---

## ✨ Features

### 🖥️ Native Adwaita UI & UX
Designed to look and feel exactly like a native Linux GNOME application.
* **HeaderBar Integration:** Clean, modern header bar replacing the outdated, cluttered Windows-style menu ribbons.
* **Light / Dark Mode:** Flawless toggling between native Adwaita Light and Dark themes. Syntax highlighting colors adapt automatically.
* **Draggable Modals:** Native-looking GNOME popup dialogs that can be dragged and repositioned across the screen.
* **Collapsible Side Panel:** Press `F9` to toggle the side panel, displaying a clean list of all currently open documents.

<img width="1202" height="846" alt="image" src="https://github.com/user-attachments/assets/d9c544a1-db32-4bba-90e9-957d0e43f5a8" />


### 📁 File & Tab Management
A powerful document engine that handles multiple files natively inside the browser.
* **Local File Access:** Open files directly from your computer and save them back to your hard drive.
* **Smart Tab Bar:** Tabs dynamically appear when multiple files are open.
* **Drag-and-Drop Tabs:** Click and drag tabs to reorder your workspace.
* **Right-Click Renaming:** Right-click any tab to instantly rename the document.
* **Unsaved Indicators:** Asterisks (`*`) appear to notify you of unsaved changes.

<img width="1202" height="91" alt="image" src="https://github.com/user-attachments/assets/bf933968-f216-4f64-8991-0a5f52501f28" />

### ⌨️ Advanced Text Editing & Formatting
Packed with iconic Gedit developer features and plugins.
* **Line Manipulation:** * Move lines up/down (`Alt + Up/Down`)
  * Duplicate current line (`Ctrl + D`)
  * Join lines together (`Ctrl + J`)
* **Indentation:** Smart indenting and un-indenting of code blocks using `Tab` and `Shift + Tab`.
* **Clean Up Tools:** Instantly remove trailing spaces or convert between Tabs and Spaces.
* **Text Formatting:** Sort selected lines alphabetically or instantly change text case (UPPERCASE / lowercase).
* **Insert Date/Time:** Quickly stamp the current local date and time into the document.

### 🔍 Search & Navigation
* **Find & Replace:** Full search functionality with "Match Case" and "Wrap Around" support.
* **Go To Line:** Jump instantly to specific lines in massive documents.
* **Active Line Highlighting:** The editor dynamically highlights the current line your cursor is resting on.
* **Ctrl + Scroll Zooming:** Fluidly scale the font size up and down using the mouse wheel, or reset to default using `Ctrl + 0`.

<img width="698" height="341" alt="image" src="https://github.com/user-attachments/assets/f34c0d2c-7411-42ee-889c-f56d645c7c9e" />


### 🛠️ Developer Tools & Syntax Highlighting
Powered by [Prism.js](https://prismjs.com/), the editor highlights code in real-time without breaking cursor alignment.
* **Supported Languages:** C, C++, C#, CSS, HTML, Java, JavaScript, JSON, Markdown, PHP, Python, Rust, SQL, XML, and Plain Text.
* **Encoding Tools:** Instantly encode or decode selected text to/from Base64, or convert strings to HEX.
* **Document Statistics:** Quickly view the current Line, Word, and Character count.
* **Browser Spellcheck:** Toggle the native red-squiggly browser spellchecker on or off to reduce visual noise when coding.

---

## 🚀 Keyboard Shortcuts

Fully mapped to standard desktop hotkeys to keep your hands on the keyboard.

| Command | Shortcut |
| :--- | :--- |
| **New Document** | `Ctrl + N` |
| **Open Document** | `Ctrl + O` |
| **Save / Save As** | `Ctrl + S` / `Ctrl + Shift + S` |
| **Close Document** | `Ctrl + W` |
| **Undo / Redo** | `Ctrl + Z` / `Ctrl + Y` |
| **Indent / Unindent** | `Tab` / `Shift + Tab` |
| **Duplicate Line** | `Ctrl + D` |
| **Move Line Up/Down** | `Alt + Up` / `Alt + Down` |
| **Join Lines** | `Ctrl + J` |
| **Find / Replace** | `Ctrl + F` / `Ctrl + H` |
| **Find Next** | `F3` |
| **Go To Line** | `Ctrl + G` |
| **Toggle Side Panel** | `F9` |
| **Toggle Fullscreen** | `F11` |
| **Zoom In/Out** | `Ctrl + Scroll` |
| **Reset Zoom** | `Ctrl + 0` |
| **Print** | `Ctrl + P` |

---

## 💻 Tech Stack
* **HTML5** (Structure & Layout)
* **CSS3** (Adwaita Styling, Flexbox, CSS Variables for Dark Mode)
* **Vanilla JavaScript (ES6)** (DOM Manipulation, State Management, Tab Engine)
* **Prism.js** (Real-time Syntax Highlighting Engine)

## 🏃 How to Run
Because this is a pure frontend WebApp, there are no dependencies, node modules, or build steps required.

1. Clone or download this repository.
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).
3. Start typing!

*(Alternatively, host it for free via GitHub Pages or drop the code directly into CodePen!)*
