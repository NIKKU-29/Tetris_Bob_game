let canvas = document.querySelector("#tetris");
let scoreboard = document.querySelector("#score");
let ctx = canvas.getContext("2d");
ctx.scale(30, 30);

const SHAPES = [
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]], // I
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]], // L
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]], // J
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]], // Z
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]], // S
    [[1, 1, 1], [0, 1, 0], [0, 0, 0]], // T
    [[1, 1], [1, 1]], // O
    [[1, 1, 1], [1, 2, 1], [1, 1, 1]] // Bomb (new)
];

const COLORS = [
    "#fff",
    "#9b5fe0", // Purple
    "#16a4d8", // Blue
    "#60dbe8", // Light Blue
    "#8bd346", // Green
    "#efdf48", // Yellow
    "#f9a52c", // Orange
    "#d64e12", // Red
    "#ff0000"  // Bomb - Red
];

const GLOW_COLORS = [
    "#fff",
    "#d4b5ff", // Purple glow
    "#6ccbff", // Blue glow
    "#a6f8ff", // Light Blue glow
    "#bef989", // Green glow
    "#fff7a1", // Yellow glow
    "#ffce82", // Orange glow
    "#ff8766", // Red glow
    "#ff6666"  // Bomb glow - Bright Red
];

const ROWS = 20;
const COLS = 10;
const DROP_SPEED = 500;
const BOMB_CHANCE = 0.1; // 10% chance to spawn a bomb

let grid = generateGrid();
let PieceObj = null;
let score = 0;
let linesCleared = 0;
let gameSpeed = DROP_SPEED;
let gameOver = false;
let lastTime = 0;
let dropCounter = 0;
let isClearingLines = false;
let isProcessingInput = false;
let bombExploding = false;

// Initialize GSAP
gsap.registerPlugin(ScrollTrigger);

const gameOverOverlay = document.createElement('div');
gameOverOverlay.className = 'game-over-overlay';
gameOverOverlay.innerHTML = `
    <h3>Game Over!</h3>
    <p>Press R to restart</p>
`;
document.querySelector('main').appendChild(gameOverOverlay);

function generateGrid() {
    return Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

function randomPieceObject() {
    // Add chance for bomb block
    let ran;
    if (Math.random() < BOMB_CHANCE) {
        ran = 7; // Index of the bomb shape
    } else {
        ran = Math.floor(Math.random() * 7); // Regular shapes
    }
    
    return {
        piece: SHAPES[ran],
        colorIndex: ran + 1,
        x: 4,
        y: -2,
        opacity: 1,
        isBomb: ran === 7
    };
}

function renderPiece() {
    ctx.save();
    ctx.globalAlpha = PieceObj.opacity;
    let piece = PieceObj.piece;
    for (let i = 0; i < piece.length; i++) {
        for (let j = 0; j < piece[i].length; j++) {
            if (piece[i][j] >= 1) {
                let x = PieceObj.x + j;
                let y = PieceObj.y + i;
                
                // Special rendering for bomb center
                if (piece[i][j] === 2 && PieceObj.isBomb) {
                    // Bomb center with special effect
                    drawBombCenter(x, y);
                } else {
                    drawGlowingBlock(x, y, COLORS[PieceObj.colorIndex], GLOW_COLORS[PieceObj.colorIndex]);
                }
            }
        }
    }
    ctx.restore();
}

function drawBombCenter(x, y) {
    // Create an image element if it doesn't exist
    if (!window.bombImage) {
        window.bombImage = new Image();
        window.bombImage.src = 'bomb.gif'; // Replace with your image path
        ctx.fillStyle = "#ff0000";
    }

    // Draw the image if it's loaded
    if (window.bombImage.complete) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ff6666";
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw the image to fill the block
        ctx.drawImage(window.bombImage, x, y, 1, 1);
        ctx.restore();
    } else {
        // Fallback if image isn't loaded
        ctx.save();
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(x, y, 1, 1);
        ctx.restore();
    }
}

function drawGlowingBlock(x, y, fillColor, glowColor) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = glowColor;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, 1, 1);
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 0.05;
    ctx.strokeRect(x, y, 1, 1);
    
    ctx.restore();
}

function animateLineClear(rows) {
    isClearingLines = true;
    let animationProgress = 0;
    
    function animate() {
        ctx.clearRect(0, 0, COLS, ROWS);
        renderGameWithoutPiece(); // Render grid without current piece
        
        rows.forEach(row => {
            ctx.fillStyle = `rgba(255, 255, 255, ${1 - animationProgress})`;
            ctx.fillRect(0, row, COLS, 1);
        });
        
        animationProgress += 0.1;
        if (animationProgress < 1) {
            requestAnimationFrame(animate);
        } else {
            clearLines(rows);
            isClearingLines = false;
            renderGame();
            
            // Enhanced line clear effect with GSAP
            gsap.to("#tetris", { 
                className: "+=glow-pulse", 
                duration: 0.5, 
                yoyo: true, 
                repeat: 1,
                onComplete: () => canvas.classList.remove("glow-pulse")
            });
            
            // Add camera shake effect
            gsap.to("main", {
                x: () => Math.random() * 8 - 4,
                y: () => Math.random() * 8 - 4,
                duration: 0.1,
                repeat: 5,
                yoyo: true,
                ease: "none",
                onComplete: () => gsap.set("main", {x: 0, y: 0})
            });
        }
    }
    requestAnimationFrame(animate);
}

function renderGameWithoutPiece() {
    ctx.clearRect(0, 0, COLS, ROWS);
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(0, 0, COLS, ROWS);
    
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            if (grid[i][j]) {
                drawGlowingBlock(j, i, COLORS[grid[i][j]], GLOW_COLORS[grid[i][j]]);
            }
        }
    }
}

function checkGrid() {
    if (isClearingLines) return; // Prevent overlap
    
    let rowsToClear = [];
    for (let i = 0; i < grid.length; i++) {
        if (grid[i].every(cell => cell > 0)) {
            rowsToClear.push(i);
        }
    }
    
    if (rowsToClear.length > 0) {
        animateLineClear(rowsToClear);
        linesCleared += rowsToClear.length;
        updateScore(rowsToClear.length);
        gameSpeed = Math.max(100, DROP_SPEED - (linesCleared * 10));
    }
}

function clearLines(rows) {
    rows.sort((a, b) => b - a).forEach(row => {
        grid.splice(row, 1);
        grid.unshift(Array(COLS).fill(0));
    });
}

function updateScore(lines) {
    const points = [0, 10, 30, 50, 100];
    score += points[lines] || 100;
    scoreboard.innerHTML = `Score: ${score} | Lines: ${linesCleared}`;
    
    // Enhanced score update animation
    gsap.fromTo("#score", 
        { scale: 1.2, color: "#ffcc00" }, 
        { scale: 1, color: "#ffffff", duration: 0.5, ease: "elastic.out(1.2, 0.5)" }
    );
}

function moveDown() {
    if (!PieceObj || isClearingLines || isProcessingInput || bombExploding) return;
    
    isProcessingInput = true;
    
    if (!collision(PieceObj.x, PieceObj.y + 1)) {
        PieceObj.y += 1;
        renderGame();
        isProcessingInput = false;
    } else {
        freezePiece();
        
        // Check if the piece is a bomb and activate it
        if (PieceObj.isBomb) {
            activateBomb();
        } else {
            checkGrid();
        }
        
        if (!isClearingLines && !bombExploding) {
            if (PieceObj.y < 0) {
                gameOverSequence();
                isProcessingInput = false;
                return;
            }
            
            // Create new piece with animation
            PieceObj = randomPieceObject();
            gsap.fromTo(PieceObj, 
                { opacity: 0, y: -4 }, 
                { opacity: 1, y: -2, duration: 0.3, ease: "power2.out", 
                  onComplete: () => {
                      isProcessingInput = false;
                  }
                }
            );
        } else {
            isProcessingInput = false;
        }
    }
}

function activateBomb() {
    bombExploding = true;
    
    // Find the center of the bomb
    let centerX = -1;
    let centerY = -1;
    
    for (let i = 0; i < PieceObj.piece.length; i++) {
        for (let j = 0; j < PieceObj.piece[i].length; j++) {
            if (PieceObj.piece[i][j] === 2) { // '2' marks the center of the bomb
                centerX = PieceObj.x + j;
                centerY = PieceObj.y + i;
                break;
            }
        }
        if (centerX !== -1) break;
    }
    
    // If we found the center and it's within the grid
    if (centerX >= 0 && centerX < COLS && centerY >= 0 && centerY < ROWS) {
        // Animate explosion
        animateExplosion(centerX, centerY, () => {
            // Clear blocks in a "+" pattern
            clearExplosionArea(centerX, centerY);
            bombExploding = false;
            
            // Check for any full lines after explosion
            checkGrid();
            
            // If no lines are being cleared, spawn new piece
            if (!isClearingLines) {
                if (PieceObj.y < 0) {
                    gameOverSequence();
                    return;
                }
                
                PieceObj = randomPieceObject();
                gsap.fromTo(PieceObj, 
                    { opacity: 0, y: -4 }, 
                    { opacity: 1, y: -2, duration: 0.3, ease: "power2.out",
                      onComplete: () => {
                          isProcessingInput = false;
                          // Reset the drop counter so the piece starts falling immediately
                          dropCounter = 0;
                          // Optionally, you can also force a drop:
                          // moveDown();
                      }
                    }
                );
            }
        });
    } else {
        // If bomb center is out of bounds, treat like a normal piece
        bombExploding = false;
        checkGrid();
        
        if (!isClearingLines) {
            if (PieceObj.y < 0) {
                gameOverSequence();
                return;
            }
            
            PieceObj = randomPieceObject();
            gsap.fromTo(PieceObj, 
                { opacity: 0, y: -4 }, 
                { opacity: 1, y: -2, duration: 0.3, ease: "power2.out",
                  onComplete: () => {
                      isProcessingInput = false;
                      dropCounter = 0;
                  }
                }
            );
        }
    }
}


function animateExplosion(centerX, centerY, callback) {
    // Animation variables
    let radius = 0;
    const maxRadius = 3;
    const explosionSpeed = 0.2;
    
    function animateFrame() {
        renderGameWithoutPiece();
        
        // Draw explosion circle
        ctx.beginPath();
        ctx.arc((centerX + 0.5), (centerY + 0.5), radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${255 - radius * 60}, 0, ${1 - radius / maxRadius})`;
        ctx.fill();
        
        // Increase radius
        radius += explosionSpeed;
        
        if (radius <= maxRadius) {
            requestAnimationFrame(animateFrame);
        } else {
            // Explosion finished
            if (callback) callback();
        }
    }
    
    // Add explosion sound and visual effects with GSAP
    gsap.to("#tetris", {
        scale: 1.05,
        duration: 0.2,
        yoyo: true,
        repeat: 1
    });
    
    gsap.to("main", {
        x: () => Math.random() * 15 - 7.5,
        y: () => Math.random() * 15 - 7.5,
        duration: 0.05,
        repeat: 10,
        yoyo: true,
        ease: "none",
        onComplete: () => gsap.set("main", {x: 0, y: 0})
    });
    
    // Start animation
    animateFrame();
}

function clearExplosionArea(centerX, centerY) {
    // Clear blocks in a "+" pattern
    // Clear current row (horizontal line)
    for (let x = Math.max(0, centerX - 1); x <= Math.min(COLS - 1, centerX + 1); x++) {
        if (centerY >= 0 && centerY < ROWS) {
            grid[centerY][x] = 0;
        }
    }
    
    // Clear current column (vertical line)
    for (let y = Math.max(0, centerY - 1); y <= Math.min(ROWS - 1, centerY + 1); y++) {
        if (centerX >= 0 && centerX < COLS) {
            grid[y][centerX] = 0;
        }
    }
    
    // Add points for explosion
    score += 30;
    updateScore(0);
}

function moveLeft() {
    if (!PieceObj || gameOver || isClearingLines || isProcessingInput || bombExploding) return;
    
    isProcessingInput = true;
    if (!collision(PieceObj.x - 1, PieceObj.y)) {
        PieceObj.x -= 1;
        renderGame();
    }
    isProcessingInput = false;
}

function moveRight() {
    if (!PieceObj || gameOver || isClearingLines || isProcessingInput || bombExploding) return;
    
    isProcessingInput = true;
    if (!collision(PieceObj.x + 1, PieceObj.y)) {
        PieceObj.x += 1;
        renderGame();
    }
    isProcessingInput = false;
}

function rotate() {
    if (!PieceObj || gameOver || isClearingLines || isProcessingInput || bombExploding) return;
    
    // Don't rotate bombs (they're symmetrical)
    if (PieceObj.isBomb) {
        return;
    }
    
    isProcessingInput = true;
    
    // Create rotated piece matrix
    let rotated = PieceObj.piece[0].map((_, colIndex) => 
        PieceObj.piece.map(row => row[colIndex]).reverse()
    );
    
    // Try rotation with wall kicks
    let offset = 0;
    let rotationSuccess = false;
    
    // Try original position first
    if (!collision(PieceObj.x, PieceObj.y, rotated)) {
        PieceObj.piece = rotated;
        rotationSuccess = true;
    } else {
        // Try wall kicks (left, right, up)
        const kicks = [-1, 1, -2, 2, 0, -1]; // Different offsets to try
        
        for (let i = 0; i < kicks.length; i++) {
            offset = kicks[i];
            if (!collision(PieceObj.x + offset, PieceObj.y, rotated)) {
                PieceObj.piece = rotated;
                PieceObj.x += offset;
                rotationSuccess = true;
                break;
            }
        }
    }
    
    if (rotationSuccess) {
        renderGame();
        
        // Only animate the piece, not the whole canvas
        gsap.to(`#tetris`, {
            scale: 1.02,
            duration: 0.1,
            yoyo: true,
            repeat: 1,
            ease: "power1.inOut"
        });
    }
    
    isProcessingInput = false;
}

function hardDropPiece() {
    if (!PieceObj || gameOver || isClearingLines || isProcessingInput ) return;
    
    isProcessingInput = true;
    
    // Find how far the piece can drop
    let dropDistance = 0;
    while (!collision(PieceObj.x, PieceObj.y + dropDistance + 1)) {
        dropDistance++;
    }
    
    if (dropDistance > 0) {
        // Animate the hard drop
        gsap.to(PieceObj, {
            y: PieceObj.y + dropDistance,
            duration: 0.1 * Math.min(dropDistance, 10),
            ease: "power1.in",
            onUpdate: renderGame,
            onComplete: () => {
                freezePiece();
                
                // Check if the piece is a bomb and activate it
                if (PieceObj.isBomb) {
                    activateBomb();
                } else {
                    checkGrid();
                }
                
                if (!isClearingLines && !bombExploding) {
                    if (PieceObj.y < 0) {
                        gameOverSequence();
                        isProcessingInput = false;
                        return;
                    }
                    
                    PieceObj = randomPieceObject();
                    gsap.fromTo(PieceObj, 
                        { opacity: 0, y: -4 }, 
                        { opacity: 1, y: -2, duration: 0.3, ease: "power2.out", 
                          onComplete: () => {
                              isProcessingInput = false;
                          }
                        }
                    );
                } else {
                    isProcessingInput = false;
                }
            }
        });
    } else {
        isProcessingInput = false;
    }
}

function freezePiece() {
    if (!PieceObj) return;
    
    let piece = PieceObj.piece;
    for (let i = 0; i < piece.length; i++) {
        for (let j = 0; j < piece[i].length; j++) {
            if (piece[i][j] >= 1) { // Consider both regular blocks and bomb center
                let p = PieceObj.x + j;
                let q = PieceObj.y + i;
                if (q >= 0 && p >= 0 && p < COLS && q < ROWS) {
                    grid[q][p] = PieceObj.colorIndex;
                }
            }
        }
    }
    
    // Add freeze effect
    gsap.to(".game-container", {
        scale: 1.02,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.out"
    });
}

function collision(x, y, rotatedPiece) {
    let piece = rotatedPiece || PieceObj.piece;
    for (let i = 0; i < piece.length; i++) {
        for (let j = 0; j < piece[i].length; j++) {
            if (piece[i][j] >= 1) { // Check both regular blocks and bomb center
                let p = x + j;
                let q = y + i;
                if (p < 0 || p >= COLS || q >= ROWS) return true;
                if (q >= 0 && grid[q][p]) return true;
            }
        }
    }
    return false;
}

function renderGame() {
    ctx.clearRect(0, 0, COLS, ROWS);
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(0, 0, COLS, ROWS);
    
    // Draw grid
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            if (grid[i][j]) {
                drawGlowingBlock(j, i, COLORS[grid[i][j]], GLOW_COLORS[grid[i][j]]);
            }
        }
    }
    
    // Draw piece
    if (PieceObj && !isClearingLines && !bombExploding) renderPiece();
}

function gameLoop(timestamp) {
    if (gameOver) return;

    if (!lastTime) lastTime = timestamp;
    let delta = timestamp - lastTime;
    lastTime = timestamp;

    dropCounter += delta;
    if (dropCounter >= gameSpeed && !isClearingLines && !bombExploding && !isProcessingInput) {
        moveDown();
        dropCounter = 0;
    }

    renderGame();
    requestAnimationFrame(gameLoop);
}

function gameOverSequence() {
    gameOver = true;
    
    // Enhanced game over animation
    gsap.to(".game-over-overlay", {
        opacity: 1,
        duration: 0.8,
        ease: "power2.in",
        onStart: () => gameOverOverlay.style.pointerEvents = "auto"
    });
    
    gsap.from(".game-over-overlay h3", {
        y: -50,
        opacity: 0,
        duration: 0.7,
        ease: "back.out(1.7)"
    });
    
    gsap.from(".game-over-overlay p", {
        y: 50,
        opacity: 0,
        duration: 0.7,
        delay: 0.3,
        ease: "back.out(1.7)"
    });
    
    // Fade out the pieces
    gsap.to("#tetris", {
        opacity: 0.5,
        duration: 1,
        ease: "power2.in"
    });
}



function startGame() {
    grid = generateGrid();
    PieceObj = randomPieceObject();
    score = 0;
    linesCleared = 0;
    gameSpeed = DROP_SPEED;
    gameOver = false;
    isClearingLines = false;
    isProcessingInput = false;
    bombExploding = false;
    lastTime = 0;
    dropCounter = 0;
    updateScore(0);
    
    // Hide game over overlay
    gameOverOverlay.style.opacity = 0;
    gameOverOverlay.style.pointerEvents = "none";
    
    // Start game loop
    requestAnimationFrame(gameLoop);
    
    // Intro animation
    gsap.fromTo("#tetris", 
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 1, ease: "elastic.out(1, 0.5)" }
    );
    
    gsap.fromTo("#score", 
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.3, ease: "back.out(1.7)" }
    );
}

// Controls
document.addEventListener("keydown", function(e) {
    if (gameOver && e.key === "r") {
        startGame();
        return;
    }
    
    if (isProcessingInput && e.key !== "r") return;
    
    switch(e.key) {
        case "ArrowDown":
            e.preventDefault();
           if(!gameOver) moveDown();
            dropCounter = 0;
            break;
        case "ArrowLeft":
            e.preventDefault();
            moveLeft();
            break;
        case "ArrowRight":
            e.preventDefault();
            moveRight();
            break;
        case "ArrowUp":
            e.preventDefault();
            rotate();
            break;
        case " ": // Space bar for hard drop
            e.preventDefault();
            hardDropPiece();
            break;
    }
});

// Add CSS for smooth animat

document.getElementById("play-btn").addEventListener("click", () => {
    document.getElementById("start-overlay").style.display = "none";
    startGame();
});