# 🐕 Desktop Mate

A cute interactive desktop companion built with Electron! Your new virtual pet that lives on your desktop.

## 🚀 Quick Start for Users

### Option 1: Easy Installer (Recommended)
1. **Download** the `installer` folder
2. **Install Node.js** from [nodejs.org](https://nodejs.org)
3. **Double-click** `install.bat` in installer folder
4. **Run** using `run.bat` or desktop shortcut

### Option 2: Manual Setup
1. **Install Node.js** from [nodejs.org](https://nodejs.org)
2. **Download** this repository
3. **Open terminal** in project folder
4. **Run:** `npm install`
5. **Run:** `npm start`

## ✨ Features

- 🖱️ **Drag & Drop** - Move your mate anywhere on screen
- 🚶 **Walk Animation** - Animated walking with physics
- 🦘 **Jump Physics** - Realistic jumping with gravity
- 💬 **Talk** - Interactive speech bubbles
- 💃 **Dance** - Fun dance animations
- 👁️ **Eye Tracking** - Animated blinking eyes
- 🎭 **Character Switch** - Boy/Girl characters
- 🖥️ **Desktop Overlay** - Transparent always-on-top window

## 🎮 How to Use

- **🖱️ Drag**: Click and drag your mate anywhere
- **🖱️ Right-click**: Context menu with actions
- **👆 Double-click**: Make your mate talk
- **⌨️ Keyboard**: W-Walk, J-Jump, T-Talk, D-Dance, S-Switch

## 📁 Project Structure

```
desktop-mate/
├── installer/           # User-friendly installer
│   ├── install.bat     # One-click installer
│   ├── run.bat         # Launch script
│   ├── README.txt      # User instructions
│   └── app files...    # Core application
├── main.js             # Electron main process
├── simple-index.html   # UI layout
├── simple-mate.js      # Character logic
└── package.json        # Dependencies
```

## 🔧 For Developers

### Development
```bash
npm install
npm start
```

### Distribution
- Use the `installer` folder for end users
- Contains all necessary files and setup scripts
- Users only need Node.js + double-click installer

## 📝 License

MIT License - Feel free to modify and distribute!

---

**Enjoy your new desktop companion! 🐕💕**