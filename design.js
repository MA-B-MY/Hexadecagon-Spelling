// --- HELPER FUNCTION: DRAW 16-SIDED POLYGON ---
function drawHexadecagon(ctx, x, y, radius, rotation) {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
        const angle = rotation + (i * Math.PI * 2) / 16;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    
    ctx.fillStyle = playerColor; 
    ctx.fill();
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF'; 
    ctx.stroke();
    ctx.lineWidth = 1; 
}

// --- HELPER FUNCTION: DRAW CLOUD SHAPE ---
function drawCloud(ctx, x, y, width) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, width * 0.4, 0, Math.PI * 2);
    ctx.arc(x - width * 0.35, y + width * 0.1, width * 0.3, 0, Math.PI * 2);
    ctx.arc(x + width * 0.35, y + width * 0.1, width * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

// --- ALL VISUAL RENDERING LOGIC ---
function drawGameScene() {
    ctx.imageSmoothingEnabled = false;

    // 1. Draw Sky Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    skyGrad.addColorStop(0, '#1A237E'); 
    skyGrad.addColorStop(1, '#64B5F6'); 
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 2. Draw Parallax Clouds (Background)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cloudOffset + (i * 300) + 40, 70, 30, 0, Math.PI * 2);
        ctx.arc(cloudOffset + (i * 300) + 70, 70, 40, 0, Math.PI * 2);
        ctx.arc(cloudOffset + (i * 300) + 100, 70, 30, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(cloudOffset + (i * 300) + GAME_WIDTH + 40, 70, 30, 0, Math.PI * 2);
        ctx.arc(cloudOffset + (i * 300) + GAME_WIDTH + 70, 70, 40, 0, Math.PI * 2);
        ctx.arc(cloudOffset + (i * 300) + GAME_WIDTH + 100, 70, 30, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. Draw Ground
    ctx.fillStyle = '#795548'; 
    ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);
    ctx.fillStyle = '#4CAF50'; 
    ctx.fillRect(0, GAME_HEIGHT - 25, GAME_WIDTH, 5);
    
    // 4. Draw Player OR Explosion Particles
    if (gameState === STATE_EXPLODING) {
        particles.forEach(p => {
            if (p.life > 0) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = playerColor;
                
                // Draw rotating square shards for the explosion
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            }
        });
        ctx.globalAlpha = 1.0; // Reset alpha so it doesn't fade the rest of the game
    } else {
        // Draw the normal rolling player
        const playerRadius = player.width / 2;
        const playerCenterX = player.x + playerRadius;
        const playerCenterY = player.y + playerRadius;
        const rollRotation = distanceTraveled * 0.05; 
        
        drawHexadecagon(ctx, playerCenterX, playerCenterY, playerRadius, rollRotation);
    }

    // 5. Draw Obstacles (Stone Blocks)
    activeObstacles.forEach(obs => {
        ctx.fillStyle = '#757575';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(obs.x, obs.y, obs.width, 4);
        
        ctx.fillStyle = '#424242';
        ctx.fillRect(obs.x, obs.y + obs.height - 4, obs.width, 4);

        ctx.fillStyle = '#616161';
        ctx.fillRect(obs.x + 10, obs.y + 10, 15, 3);
        ctx.fillRect(obs.x + obs.width - 25, obs.y + obs.height - 15, 12, 3);
        if (obs.height > 40) {
            ctx.fillRect(obs.x + 20, obs.y + 30, 10, 3);
        }
    });

    // 6. Draw Letters (Static Clouds)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    activeLetters.forEach(letter => {
        const centerX = letter.x + (letter.width / 2);
        const centerY = letter.y + (letter.height / 2); 

        drawCloud(ctx, centerX, centerY, letter.width);
        
        ctx.fillStyle = '#D84315'; 
        ctx.font = 'bold 22px Arial';
        ctx.fillText(letter.char, centerX, centerY + 2); 
    });

    // 7. Draw Gameplay HUD (Word & Score)
    if (gameState === STATE_PLAYING || gameState === STATE_PAUSED || gameState === STATE_EXPLODING) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 300, 100);

        ctx.fillStyle = '#FFF'; 
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Word: ${currentWord}`, 20, 20);
        ctx.fillText(`Score: ${score}`, 20, 50);

        if (gameDictionary.isValidWord(currentWord)) {
            ctx.fillStyle = '#4CAF50'; 
            ctx.fillText("Valid word! Press SPACE to submit!", 20, 80);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(pauseBtn.x, pauseBtn.y, pauseBtn.width, pauseBtn.height);
        ctx.fillStyle = '#4CAF50';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gameState === STATE_PAUSED ? "▶" : "⏸", pauseBtn.x + 25, pauseBtn.y + 25);
        ctx.font = '10px Arial';
        ctx.fillStyle = '#FFF';
        ctx.fillText("Press P", pauseBtn.x + 25, pauseBtn.y + 45);
    }

    // 8. Draw Pause Menu Overlay
    if (gameState === STATE_PAUSED) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; 
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90); 
        
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(pauseMenuResumeBtn.x, pauseMenuResumeBtn.y, pauseMenuResumeBtn.width, pauseMenuResumeBtn.height);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px Arial';
        ctx.textBaseline = 'middle';
        ctx.fillText('RESUME', GAME_WIDTH / 2, pauseMenuResumeBtn.y + 20);

        ctx.fillStyle = '#007BFF';
        ctx.fillRect(pauseMenuRestartBtn.x, pauseMenuRestartBtn.y, pauseMenuRestartBtn.width, pauseMenuRestartBtn.height);
        ctx.fillStyle = '#FFF';
        ctx.fillText('RESTART', GAME_WIDTH / 2, pauseMenuRestartBtn.y + 20);

        ctx.fillStyle = isMuted ? '#F44336' : '#FF9800';
        ctx.fillRect(pauseMenuMuteBtn.x, pauseMenuMuteBtn.y, pauseMenuMuteBtn.width, pauseMenuMuteBtn.height);
        ctx.fillStyle = '#FFF';
        ctx.fillText(isMuted ? 'SOUND: OFF' : 'SOUND: ON', GAME_WIDTH / 2, pauseMenuMuteBtn.y + 20);

        ctx.fillStyle = '#673AB7';
        ctx.fillRect(pauseMenuHomeBtn.x, pauseMenuHomeBtn.y, pauseMenuHomeBtn.width, pauseMenuHomeBtn.height);
        ctx.fillStyle = '#FFF';
        ctx.fillText('MAIN MENU', GAME_WIDTH / 2, pauseMenuHomeBtn.y + 20);
    }

    // 9. Draw Game Over Overlay
    else if (gameState === STATE_GAMEOVER) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        ctx.textAlign = 'center';
        if (isNewRecord) {
            ctx.fillStyle = '#FFEB3B'; 
            ctx.font = 'bold 48px Arial';
            ctx.fillText('🏆 NEW RECORD! 🏆', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100);
        } else {
            ctx.fillStyle = '#F44336'; 
            ctx.font = 'bold 48px Arial';
            ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100);
        }
        
        ctx.fillStyle = '#FFF';
        ctx.font = '24px Arial';
        ctx.fillText(`Current Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
        ctx.fillText(`Best Score: ${bestScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10);
        ctx.fillText(`Time Played: ${timePlayed}s`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
        
        ctx.fillStyle = '#007BFF';
        ctx.fillRect(startBtn.x, startBtn.y + 40, startBtn.width, startBtn.height);
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('RESTART', startBtn.x + (startBtn.width / 2), startBtn.y + 40 + (startBtn.height / 2));
    }
}