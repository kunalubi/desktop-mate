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

// Mate properties
let mate = {
    x: 200,
    y: 200,
    size: 80,
    dx: 0,
    dy: 0,
    baseColor: '#FFB6C1',
    currentColor: '#FFB6C1',
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
    tailWag: 0,
    earBounce: 0
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
                mate.currentColor = mate.baseColor;
            }
        }
    }
    
    // Update animations
    mate.talkTimer = Math.max(0, mate.talkTimer - 1);
    mate.blinkTimer++;
    mate.tailWag += 0.2;
    mate.earBounce += 0.15;
    
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
    ctx.ellipse(centerX, centerY + mate.size/2 + 5, mate.size/3, mate.size/8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail (animated)
    const tailX = centerX - mate.size/2 + 5;
    const tailY = centerY + 5;
    const tailOffset = Math.sin(mate.tailWag) * 15;
    
    ctx.strokeStyle = mate.currentColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.quadraticCurveTo(tailX - 20 + tailOffset, tailY - 20, tailX - 15 + tailOffset, tailY - 35);
    ctx.stroke();
    
    // Body (oval)
    ctx.fillStyle = mate.currentColor;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 5, mate.size/2.2, mate.size/2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body outline
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Head (circle)
    ctx.fillStyle = mate.currentColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 10, mate.size/2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Ears (animated bounce)
    const earBounce = Math.sin(mate.earBounce) * 2;
    ctx.fillStyle = mate.currentColor;
    
    // Left ear
    ctx.beginPath();
    ctx.ellipse(centerX - 15, centerY - 25 + earBounce, 8, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Right ear
    ctx.beginPath();
    ctx.ellipse(centerX + 15, centerY - 25 + earBounce, 8, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Inner ears
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(centerX - 15, centerY - 25 + earBounce, 4, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 15, centerY - 25 + earBounce, 4, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    if (!mate.isBlinking) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(centerX - 8, centerY - 15, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + 8, centerY - 15, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils (animated)
        mate.eyeOffset = Math.sin(Date.now() * 0.003) * 2;
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(centerX - 8 + mate.eyeOffset, centerY - 15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 8 + mate.eyeOffset, centerY - 15, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX - 8 + mate.eyeOffset + 1, centerY - 15 - 1, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 8 + mate.eyeOffset + 1, centerY - 15 - 1, 1, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Closed eyes
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX - 8, centerY - 15, 6, 0, Math.PI);
        ctx.arc(centerX + 8, centerY - 15, 6, 0, Math.PI);
        ctx.stroke();
    }
    
    // Nose
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 8, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    if (mate.talkTimer > 0) {
        // Talking mouth (animated)
        const mouthSize = 3 + Math.sin(Date.now() * 0.3) * 2;
        ctx.arc(centerX, centerY - 3, mouthSize, 0, Math.PI * 2);
    } else if (mate.state === 'jumping') {
        // Surprised mouth
        ctx.arc(centerX, centerY - 3, 3, 0, Math.PI * 2);
    } else {
        // Happy mouth
        ctx.arc(centerX, centerY - 3, 5, 0, Math.PI);
    }
    ctx.stroke();
    
    // Paws when walking
    if (mate.state === 'walking') {
        const pawOffset = Math.sin(Date.now() * 0.02) * 4;
        ctx.fillStyle = '#333';
        
        // Front paws
        ctx.beginPath();
        ctx.ellipse(centerX - 12, centerY + mate.size/2.5 + pawOffset, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + 12, centerY + mate.size/2.5 - pawOffset, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Speech bubble when talking
    if (mate.talkTimer > 0) {
        const messages = ['Woof!', 'Hello friend!', 'Pet me!', 'I love you!', 'Play with me!', 'Wag wag!'];
        const message = messages[Math.floor(mate.talkTimer / 25) % messages.length];
        
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        const bubbleX = centerX + 50;
        const bubbleY = centerY - 50;
        const bubbleWidth = message.length * 8 + 20;
        
        // Speech bubble
        ctx.beginPath();
        ctx.roundRect(bubbleX - bubbleWidth/2, bubbleY - 15, bubbleWidth, 30, 15);
        ctx.fill();
        ctx.stroke();
        
        // Speech bubble tail
        ctx.beginPath();
        ctx.moveTo(bubbleX - 20, bubbleY + 10);
        ctx.lineTo(centerX + 20, centerY - 20);
        ctx.lineTo(bubbleX - 15, bubbleY + 15);
        ctx.fill();
        
        // Text
        ctx.fillStyle = 'black';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, bubbleX, bubbleY + 5);
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
    
    walkItem.innerHTML = mate.state === 'walking' ? '⏹️ Stop Walk' : '🚶 Walk';
    talkItem.innerHTML = mate.talkTimer > 0 ? '🤐 Stop Talk' : '💬 Talk';
    danceItem.innerHTML = danceInterval ? '⏹️ Stop Dance' : '💃 Dance';
}

// Actions
function walk() {
    if (mate.state === 'walking') {
        // Stop walking
        mate.state = 'idle';
        mate.dx = 0;
        mate.currentColor = mate.baseColor;
    } else {
        // Start walking
        mate.state = 'walking';
        mate.dx = 3 * mate.walkDirection;
        mate.currentColor = '#87CEEB';
    }
    hideContextMenu();
}

function jump() {
    if (mate.state !== 'jumping') {
        mate.state = 'jumping';
        mate.jumpVelocity = -15;
        mate.groundY = mate.y;
        mate.currentColor = '#98FB98';
        // Color will reset when jump completes naturally
        setTimeout(() => {
            if (mate.state === 'idle') mate.currentColor = mate.baseColor;
        }, 1200);
    }
    hideContextMenu();
}

function talk() {
    if (mate.talkTimer > 0) {
        // Stop talking
        mate.talkTimer = 0;
        mate.currentColor = mate.baseColor;
    } else {
        // Start talking (continuous)
        mate.talkTimer = 9999; // Very long time
        mate.currentColor = '#DDA0DD';
    }
    hideContextMenu();
}

let danceInterval = null;
function dance() {
    if (danceInterval) {
        // Stop dancing
        clearInterval(danceInterval);
        danceInterval = null;
        mate.currentColor = mate.baseColor;
    } else {
        // Start dancing
        mate.currentColor = '#F0E68C';
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
    } else if (e.key === 'Escape') {
        window.close();
    }
});

// Initialize mouse events
updateMouseEvents();

// Start animation
animate();