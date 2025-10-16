// static/js/game.js

// Basic config
const TILE = 20; // pixels per grid cell
const ROWS = 31;
const COLS = 28;
const CANVAS_W = COLS * TILE;
const CANVAS_H = ROWS * TILE;

const canvas = document.getElementById('gameCanvas');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

let score = 0;
document.getElementById('score').innerText = "Score: 0";

// Minimal map: 0 = empty, 1 = wall, 2 = pellet
// For brevity, using a simple enclosed rectangle with pellets. Replace with real pacman layout later.
let map = new Array(ROWS).fill(0).map(() => new Array(COLS).fill(2));
for (let r=0;r<ROWS;r++){
  for (let c=0;c<COLS;c++){
    if (r===0||r===ROWS-1||c===0||c===COLS-1) map[r][c]=1;
  }
}
// create some walls for variation (example)
for (let r=4;r<8;r++){
  for (let c=6;c<22;c++){
    map[r][c] = 1;
  }
}

// Entities
const pacman = {
  r: Math.floor(ROWS/2),
  c: Math.floor(COLS/2) - 2,
  dir: {r:0,c:0},
  speed: 8, // tiles per second (conceptual; movement is tile-based)
  mouth: 0
};

function makeGhost(r,c,color) {
  return {r,c,dir:{r:0,c:0},color,mode:'chase',target:null};
}
const ghosts = [
  makeGhost(Math.floor(ROWS/2)-2, Math.floor(COLS/2), 'red'),
  makeGhost(Math.floor(ROWS/2)-2, Math.floor(COLS/2)-2, 'pink'),
];

// Input
const input = {up:false,down:false,left:false,right:false};
window.addEventListener('keydown', (e)=>{
  if (e.key.includes('Arrow')) e.preventDefault();
  if (e.key === 'ArrowUp') { input.up=true; input.down=false; input.left=false; input.right=false; pacman.dir={r:-1,c:0}; }
  if (e.key === 'ArrowDown') { input.down=true; input.up=false; input.left=false; input.right=false; pacman.dir={r:1,c:0}; }
  if (e.key === 'ArrowLeft') { input.left=true; input.up=false; input.down=false; input.right=false; pacman.dir={r:0,c:-1}; }
  if (e.key === 'ArrowRight') { input.right=true; input.up=false; input.down=false; input.left=false; pacman.dir={r:0,c:1}; }
});

document.getElementById('restartBtn').addEventListener('click', ()=>{ resetGame(); });
document.getElementById('saveScore').addEventListener('click', ()=> submitScore());

// Game state
let lastTime = 0;
let accumulator = 0;
const STEP = 1/30; // fixed timestep

function resetGame(){
  score = 0;
  document.getElementById('score').innerText = "Score: 0";
  // restore pellets
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if(map[r][c] !==1) map[r][c]=2;
  pacman.r = Math.floor(ROWS/2); pacman.c = Math.floor(COLS/2)-2; pacman.dir={r:0,c:0};
  ghosts.forEach((g,i)=>{ g.r = Math.floor(ROWS/2)-2; g.c = Math.floor(COLS/2)+i; g.dir={r:0,c:0}; });
}

function tileWalkable(r,c){
  if (r<0||c<0||r>=ROWS||c>=COLS) return false;
  return map[r][c] !== 1;
}

function update(dt){
  // move pacman in grid steps when reaches center of tile
  moveEntity(pacman, dt);

  // ghosts: simple random-walk towards pacman occasionally
  ghosts.forEach(g=>{
    // occasionally pick a direction that approaches pacman if possible, else random
    if (Math.random() < 0.3) {
      let dr = Math.sign(pacman.r - g.r);
      let dc = Math.sign(pacman.c - g.c);
      const tryDirs = [{r:dr,c:0},{r:0,c:dc},{r:dr,c:dc},{r:-dr,c:0},{r:0,c:-dc}];
      let chosen = tryDirs.find(d => tileWalkable(g.r + d.r, g.c + d.c));
      if (!chosen) {
        // pick any valid neighbor
        const candidates = [{r:1,c:0},{r:-1,c:0},{r:0,c:1},{r:0,c:-1}].filter(d=>tileWalkable(g.r+d.r,g.c+d.c));
        chosen = candidates.length ? candidates[Math.floor(Math.random()*candidates.length)] : {r:0,c:0};
      }
      g.dir = chosen;
    }
    moveEntity(g, dt);
  });

  // collisions
  ghosts.forEach(g=>{
    if (g.r === pacman.r && g.c === pacman.c) {
      // pacman dies -> restart
      resetGame();
    }
  });

  // pellet eating
  if (map[pacman.r][pacman.c] === 2) {
    map[pacman.r][pacman.c] = 0;
    score += 10;
    document.getElementById('score').innerText = "Score: "+score;
  }
}

function moveEntity(entity, dt){
  // We'll accumulate positional progress; simple tile-by-tile discrete movement
  if (!entity._progress) entity._progress = 0;
  const speedTilesPerSec = entity.speed || 8;
  entity._progress += dt * speedTilesPerSec;
  const whole = Math.floor(entity._progress);
  if (whole >= 1) {
    for (let i=0;i<whole;i++){
      const nr = entity.r + entity.dir.r;
      const nc = entity.c + entity.dir.c;
      if (tileWalkable(nr,nc)) {
        entity.r = nr; entity.c = nc;
      } else {
        // blocked -> stop
        entity.dir = {r:0,c:0};
      }
    }
    entity._progress -= whole;
  }
}

// Render
function render(){
  // clear
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);

  // draw tiles
  for (let r=0;r<ROWS;r++){
    for (let c=0;c<COLS;c++){
      const x = c*TILE, y = r*TILE;
      if (map[r][c] === 1) {
        ctx.fillStyle = '#001f3f';
        ctx.fillRect(x,y,TILE,TILE);
      } else if (map[r][c] === 2) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(x+TILE/2, y+TILE/2, Math.max(2, TILE/6), 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  // pacman
  drawPacman(pacman);

  // ghosts
  ghosts.forEach(g=>{
    ctx.fillStyle = g.color;
    const x = g.c*TILE, y = g.r*TILE;
    ctx.beginPath();
    ctx.arc(x+TILE/2, y+TILE/2, TILE*0.45, 0, Math.PI*2);
    ctx.fill();
  });
}

function drawPacman(p){
  const x = p.c*TILE + TILE/2;
  const y = p.r*TILE + TILE/2;
  p.mouth = (p.mouth + 0.2) % (Math.PI*2);
  const mouthAngle = Math.abs(Math.sin(p.mouth)) * (Math.PI/3);
  let start = mouthAngle/2;
  let end = Math.PI*2 - mouthAngle/2;
  // rotate based on dir
  ctx.fillStyle = '#FFFF00';
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.arc(x,y,TILE*0.45, start + directionAngle(p.dir), end + directionAngle(p.dir));
  ctx.closePath();
  ctx.fill();
}

function directionAngle(dir){
  if (dir.r === -1) return -Math.PI/2;
  if (dir.r === 1) return Math.PI/2;
  if (dir.c === -1) return Math.PI;
  return 0;
}

// Game loop
function loop(ts){
  if (!lastTime) lastTime = ts;
  let dt = (ts - lastTime) / 1000;
  lastTime = ts;

  // cap dt to avoid spiral of death
  if (dt > 0.1) dt = 0.1;

  accumulator += dt;
  while (accumulator >= STEP) {
    update(STEP);
    accumulator -= STEP;
  }

  render();
  requestAnimationFrame(loop);
}

// Highscore interactions
async function loadHighscores(){
  try {
    const res = await fetch('/api/highscores/');
    const data = await res.json();
    const list = document.getElementById('highscores');
    list.innerHTML = '';
    data.highscores.forEach(h => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.innerText = `${h.player} — ${h.score}`;
      list.appendChild(li);
    });
  } catch (e) { console.error('failed to load highscores', e); }
}

async function submitScore(){
  const name = document.getElementById('playerName').value || 'Anon';
  try {
    await fetch('/api/highscores/add/', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({player: name, score})
    });
    await loadHighscores();
  } catch (e) { console.error('failed to submit score', e); }
}

// initialize
resetGame();
loadHighscores();
requestAnimationFrame(loop);
