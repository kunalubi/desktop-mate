const canvas = document.getElementById("mateCanvas");
const ctx = canvas.getContext("2d");
const { ipcRenderer } = require('electron');

// Mouse event handling for click-through
let isOverInteractiveElement = false;

function updateMouseEvents() {
    if (isOverInteractiveElement) {
        ipcRenderer.send('set-ignore-mouse-events', false);
    } else {
        ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    }
}

// Canvas setup - Full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Character properties
let mate = {
    x: 200,
    y: 200,
    size: 80,
    dx: 0,
    dy: 0,
    type: 'boy', // 'boy' or 'girl'
    skinColor: '#FDBCB4',
    hairColor: '#8B4513',
    shirtColor: '#4169E1',
    eyeOffset: 0,
    state: 'idle', // idle, walking, jumping, talking
    isDragging: false,
    walkDirection: 1,
    jumpVelocity: 0,
    gravity: 0.8,
    groundY: 200,
    talkTimer: 0,
    blinkTimer: 0,
    isBlinking: false,
    walkCycle: 0,
    happiness: 0
};

// Drag and drop functionality
let mouseDown = false;
let mouseOffset = { x: 0, y: 0 };
let dragStartTime = 0;
let hasDragged = false;

canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left click for drag
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Check if mouse is over mate
    const distance = Math.sqrt((mouseX - (mate.x + mate.size/2))**2 + (mouseY - (mate.y + mate.size/2))**2);
    if (distance < mate.size/2) {
        mouseDown = true;
        dragStartTime = Date.now();
        hasDragged = false;
        mouseOffset.x = mouseX - mate.x;
        mouseOffset.y = mouseY - mate.y;
        document.body.style.cursor = 'grabbing';
        isOverInteractiveElement = true;
        updateMouseEvents();
        hideContextMenu(); // Hide menu when starting drag
    }
});

canvas.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    if (mouseDown) {
        const dragDistance = Math.sqrt((mouseX - (mate.x + mouseOffset.x))**2 + (mouseY - (mate.y + mouseOffset.y))**2);
        
        if (dragDistance > 5) { // Start dragging after 5px movement
            hasDragged = true;
            mate.isDragging = true;
            mate.state = 'idle'; // Stop any current action when dragging
            mate.dx = 0;
            mate.dy = 0;
            
            mate.x = mouseX - mouseOffset.x;
            mate.y = mouseY - mouseOffset.y;
            
            // Keep mate within screen bounds
            mate.x = Math.max(0, Math.min(canvas.width - mate.size, mate.x));
            mate.y = Math.max(0, Math.min(canvas.height - mate.size, mate.y));
        }
    } else {
        // Check if hovering over mate or context menu
        const distance = Math.sqrt((mouseX - (mate.x + mate.size/2))**2 + (mouseY - (mate.y + mate.size/2))**2);
        const contextMenu = document.getElementById('contextMenu');
        const contextRect = contextMenu.getBoundingClientRect();
        const overContextMenu = contextMenu.style.display === 'block' && 
                               mouseX >= contextRect.left && mouseX <= contextRect.right && 
                               mouseY >= contextRect.top && mouseY <= contextRect.bottom;
        
        const wasOverInteractive = isOverInteractiveElement;
        isOverInteractiveElement = distance < mate.size/2 || overContextMenu;
        
        if (wasOverInteractive !== isOverInteractiveElement) {
            updateMouseEvents();
        }
        
        document.body.style.cursor = isOverInteractiveElement ? 'grab' : 'default';
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (mouseDown) {
        mouseDown = false;
        mate.isDragging = false;
        document.body.style.cursor = 'default';
        
        // Reset interactive state after a brief delay
        setTimeout(() => {
            if (!mouseDown) {
                isOverInteractiveElement = false;
                updateMouseEvents();
            }
        }, 50);
    }
});

// Right click for context menu
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    const distance = Math.sqrt((mouseX - (mate.x + mate.size/2))**2 + (mouseY - (mate.y + mate.size/2))**2);
    if (distance < mate.size/2 && !hasDragged) {
        showContextMenu(mouseX, mouseY);
    }
});

// Double click for talk
canvas.addEventListener('dblclick', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    const distance = Math.sqrt((mouseX - (mate.x + mate.size/2))**2 + (mouseY - (mate.y + mate.size/2))**2);
    if (distance < mate.size/2) {
        talk();
    }
});

// Hide context menu on click elsewhere
document.addEventListener('click', (e) => {
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu.contains(e.target) && contextMenu.style.display === 'block') {
        hideContextMenu();
    }
});

// Prevent context menu from closing when clicking on it
document.getElementById('contextMenu').addEventListener('click', (e) => {
    e.stopPropagation();
});

// Animation loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update mate based on state
    if (!mate.isDragging) {
        if (mate.state === 'walking') {
            mate.x += mate.dx;
            // Bounce off edges
            if (mate.x <= 0 || mate.x >= canvas.width - mate.size) {
                mate.dx = -mate.dx;
                mate.walkDirection = -mate.walkDirection;
            }
        }
        
        if (mate.state === 'jumping') {
            mate.y += mate.jumpVelocity;
            mate.jumpVelocity += mate.gravity;
            
            if (mate.y >= mate.groundY) {
                mate.y = mate.groundY;
                mate.jumpVelocity = 0;
                mate.state = 'idle';
                mate.shirtColor = mate.type === 'boy' ? '#4169E1' : '#FF69B4';
                mate.happiness = 0;
            }
        }
    }
    
    // Update animations
    mate.talkTimer = Math.max(0, mate.talkTimer - 1);
    mate.blinkTimer++;
    mate.walkCycle += 0.2;
    mate.happiness = Math.max(0, mate.happiness - 0.01);
    
    if (mate.blinkTimer > 180) { // Blink every 3 seconds
        mate.isBlinking = true;
        if (mate.blinkTimer > 190) {
            mate.isBlinking = false;
            mate.blinkTimer = 0;
        }
    }
    
    drawMate();
    requestAnimationFrame(animate);
}

function drawMate() {
    const centerX = mate.x + mate.size/2;
    const centerY = mate.y + mate.size/2;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + mate.size/2 + 8, mate.size/3, mate.size/10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Walking animation offset
    const walkBounce = mate.state === 'walking' ? Math.sin(mate.walkCycle) * 2 : 0;
    const bodyY = centerY + walkBounce;
    
    // Body (shirt)
    ctx.fillStyle = mate.shirtColor;
    ctx.beginPath();
    ctx.ellipse(centerX, bodyY + 8, mate.size/3, mate.size/2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Arms
    const armSwing = mate.state === 'walking' ? Math.sin(mate.walkCycle + Math.PI) * 0.3 : 0;
    ctx.strokeStyle = mate.skinColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    
    // Left arm
    ctx.beginPath();
    ctx.moveTo(centerX - mate.size/4, bodyY - 5);
    ctx.lineTo(centerX - mate.size/3 + armSwing * 10, bodyY + 15);
    ctx.stroke();
    
    // Right arm
    ctx.beginPath();
    ctx.moveTo(centerX + mate.size/4, bodyY - 5);
    ctx.lineTo(centerX + mate.size/3 - armSwing * 10, bodyY + 15);
    ctx.stroke();
    
    // Legs
    const legSwing = mate.state === 'walking' ? Math.sin(mate.walkCycle) * 0.4 : 0;
    ctx.strokeStyle = mate.type === 'boy' ? '#000080' : '#8B008B';
    ctx.lineWidth = 10;
    
    // Left leg
    ctx.beginPath();
    ctx.moveTo(centerX - 8, bodyY + mate.size/3);
    ctx.lineTo(centerX - 8 + legSwing * 8, bodyY + mate.size/2 + 5);
    ctx.stroke();
    
    // Right leg
    ctx.beginPath();
    ctx.moveTo(centerX + 8, bodyY + mate.size/3);
    ctx.lineTo(centerX + 8 - legSwing * 8, bodyY + mate.size/2 + 5);
    ctx.stroke();
    
    // Feet
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(centerX - 8 + legSwing * 8, bodyY + mate.size/2 + 8, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 8 - legSwing * 8, bodyY + mate.size/2 + 8, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Head (skin color)
    ctx.fillStyle = mate.skinColor;
    ctx.beginPath();
    ctx.arc(centerX, bodyY - 20, mate.size/3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Hair
    ctx.fillStyle = mate.hairColor;
    if (mate.type === 'boy') {
        // Boy hair - short
        ctx.beginPath();
        ctx.arc(centerX, bodyY - 20, mate.size/3.5, Math.PI, Math.PI * 2);
        ctx.fill();
    } else {
        // Girl hair - long with ponytails
        ctx.beginPath();
        ctx.arc(centerX, bodyY - 20, mate.size/3.5, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // Ponytails
        const ponytailBounce = Math.sin(Date.now() * 0.01) * 2;
        ctx.beginPath();
        ctx.arc(centerX - mate.size/4, bodyY - 15 + ponytailBounce, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + mate.size/4, bodyY - 15 + ponytailBounce, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Eyes
    if (!mate.isBlinking) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(centerX - 6, bodyY - 22, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + 6, bodyY - 22, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        mate.eyeOffset = Math.sin(Date.now() * 0.003) * 1;
        ctx.fillStyle = mate.type === 'boy' ? '#4169E1' : '#8B008B';
        ctx.beginPath();
        ctx.arc(centerX - 6 + mate.eyeOffset, bodyY - 22, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 6 + mate.eyeOffset, bodyY - 22, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX - 6 + mate.eyeOffset + 1, bodyY - 23, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 6 + mate.eyeOffset + 1, bodyY - 23, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyelashes for girl
        if (mate.type === 'girl') {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX - 8, bodyY - 25);
            ctx.lineTo(centerX - 9, bodyY - 27);
            ctx.moveTo(centerX - 4, bodyY - 26);
            ctx.lineTo(centerX - 4, bodyY - 28);
            ctx.moveTo(centerX + 4, bodyY - 26);
            ctx.lineTo(centerX + 4, bodyY - 28);
            ctx.moveTo(centerX + 8, bodyY - 25);
            ctx.lineTo(centerX + 9, bodyY - 27);
            ctx.stroke();
        }
    } else {
        // Closed eyes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX - 6, bodyY - 22, 4, 0, Math.PI);
        ctx.arc(centerX + 6, bodyY - 22, 4, 0, Math.PI);
        ctx.stroke();
    }
    
    // Nose
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(centerX, bodyY - 18, 1.5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    if (mate.talkTimer > 0) {
        // Talking mouth
        const mouthSize = 2 + Math.sin(Date.now() * 0.3) * 1;
        ctx.arc(centerX, bodyY - 14, mouthSize, 0, Math.PI * 2);
    } else if (mate.state === 'jumping') {
        // Surprised mouth
        ctx.arc(centerX, bodyY - 14, 2, 0, Math.PI * 2);
    } else {
        // Happy smile
        ctx.arc(centerX, bodyY - 14, 4, 0, Math.PI);
    }
    ctx.stroke();
    
    // Cheek blush when happy
    if (mate.happiness > 0) {
        ctx.fillStyle = `rgba(255, 182, 193, ${mate.happiness})`;
        ctx.beginPath();
        ctx.arc(centerX - 12, bodyY - 18, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 12, bodyY - 18, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Speech bubble when talking
    if (mate.talkTimer > 0) {
        const messages = mate.type === 'boy' ? 
            ['Hey there!', 'What\'s up?', 'Let\'s play!', 'I\'m happy!', 'Cool!', 'Awesome!'] :
            ['Hi cutie!', 'How are you?', 'Let\'s have fun!', 'I love this!', 'So cute!', 'Yay!'];
        const message = messages[Math.floor(mate.talkTimer / 25) % messages.length];
        
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        const bubbleX = centerX + 45;
        const bubbleY = bodyY - 45;
        const bubbleWidth = message.length * 7 + 20;
        
        // Speech bubble
        ctx.beginPath();
        ctx.roundRect(bubbleX - bubbleWidth/2, bubbleY - 15, bubbleWidth, 30, 15);
        ctx.fill();
        ctx.stroke();
        
        // Speech bubble tail
        ctx.beginPath();
        ctx.moveTo(bubbleX - 20, bubbleY + 10);
        ctx.lineTo(centerX + 15, bodyY - 25);
        ctx.lineTo(bubbleX - 15, bubbleY + 15);
        ctx.fill();
        
        // Text
        ctx.fillStyle = mate.type === 'boy' ? '#4169E1' : '#8B008B';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, bubbleX, bubbleY + 4);
    }
}

// Context Menu Functions
function showContextMenu(x, y) {
    const contextMenu = document.getElementById('contextMenu');
    
    // Update menu items first
    updateMenuItems();
    
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    
    // Keep menu within screen bounds
    setTimeout(() => {
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (y - rect.height) + 'px';
        }
    }, 10);
    
    isOverInteractiveElement = true;
    updateMouseEvents();
}

function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu.style.display === 'block') {
        contextMenu.style.display = 'none';
        setTimeout(() => {
            if (!mouseDown) {
                isOverInteractiveElement = false;
                updateMouseEvents();
            }
        }, 50);
    }
}

function updateMenuItems() {
    const walkItem = document.getElementById('walkMenuItem');
    const talkItem = document.getElementById('talkMenuItem');
    const danceItem = document.getElementById('danceMenuItem');
    const switchItem = document.getElementById('switchMenuItem');
    
    walkItem.innerHTML = mate.state === 'walking' ? '⏹️ Stop Walk' : '🚶 Walk';
    talkItem.innerHTML = mate.talkTimer > 0 ? '🤐 Stop Talk' : '💬 Talk';
    danceItem.innerHTML = danceInterval ? '⏹️ Stop Dance' : '💃 Dance';
    switchItem.innerHTML = mate.type === 'boy' ? '👧 Switch to Girl' : '👦 Switch to Boy';
}

// Actions
function walk() {
    if (mate.state === 'walking') {
        // Stop walking
        mate.state = 'idle';
        mate.dx = 0;
        mate.shirtColor = mate.type === 'boy' ? '#4169E1' : '#FF69B4';
        mate.happiness = 0;
    } else {
        // Start walking
        mate.state = 'walking';
        mate.dx = 3 * mate.walkDirection;
        mate.shirtColor = mate.type === 'boy' ? '#87CEEB' : '#FFB6C1';
        mate.happiness = 0.3;
    }
    hideContextMenu();
}

function jump() {
    if (mate.state !== 'jumping') {
        mate.state = 'jumping';
        mate.jumpVelocity = -15;
        mate.groundY = mate.y;
        mate.shirtColor = '#98FB98';
        mate.happiness = 0.5;
    }
    hideContextMenu();
}

function talk() {
    if (mate.talkTimer > 0) {
        // Stop talking
        mate.talkTimer = 0;
        mate.shirtColor = mate.type === 'boy' ? '#4169E1' : '#FF69B4';
        mate.happiness = 0;
    } else {
        // Start talking (continuous)
        mate.talkTimer = 9999; // Very long time
        mate.shirtColor = '#DDA0DD';
        mate.happiness = 0.4;
    }
    hideContextMenu();
}

let danceInterval = null;
function dance() {
    if (danceInterval) {
        // Stop dancing
        clearInterval(danceInterval);
        danceInterval = null;
        mate.shirtColor = mate.type === 'boy' ? '#4169E1' : '#FF69B4';
        mate.happiness = 0;
    } else {
        // Start dancing
        mate.shirtColor = '#F0E68C';
        mate.happiness = 0.6;
        let danceCount = 0;
        danceInterval = setInterval(() => {
            if (!mate.isDragging) {
                mate.x += Math.sin(danceCount * 0.3) * 8;
                mate.y += Math.cos(danceCount * 0.4) * 4;
                
                // Keep within bounds
                mate.x = Math.max(0, Math.min(canvas.width - mate.size, mate.x));
                mate.y = Math.max(0, Math.min(canvas.height - mate.size, mate.y));
            }
            danceCount++;
        }, 60);
    }
    hideContextMenu();
}

function switchCharacter() {
    mate.type = mate.type === 'boy' ? 'girl' : 'boy';
    mate.shirtColor = mate.type === 'boy' ? '#4169E1' : '#FF69B4';
    mate.hairColor = mate.type === 'boy' ? '#8B4513' : '#FFD700';
    mate.happiness = 0.5;
    setTimeout(() => mate.happiness = 0, 2000);
    hideContextMenu();
}

// Keyboard shortcuts for easy access
document.addEventListener('keydown', (e) => {
    // Only work when window is focused
    if (e.key === 'w' || e.key === 'W') {
        walk();
    } else if (e.key === 'j' || e.key === 'J') {
        jump();
    } else if (e.key === 't' || e.key === 'T') {
        talk();
    } else if (e.key === 'd' || e.key === 'D') {
        dance();
    } else if (e.key === 's' || e.key === 'S') {
        switchCharacter();
    } else if (e.key === 'Escape') {
        window.close();
    }
});

// Initialize mouse events
updateMouseEvents();

// Start animation
animate();