import { playhtml } from "https://unpkg.com/playhtml";

const SIZE = 9;
const TYPES = ["rock", "paper", "scissors"];
const ICON = { rock:"✊", paper:"✋", scissors:"✌️" };
const NAME = { rock:"Đấm", paper:"Lá", scissors:"Kéo" };
const COLS = "abcdefghi";

const url = new URL(location.href);
const requestedRoom = (url.searchParams.get("room") || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0,20);
const roomCode = requestedRoom || randomRoom();
if (!requestedRoom) {
  url.searchParams.set("room", roomCode);
  history.replaceState(null, "", url);
}

const $ = (s) => document.querySelector(s);
const boardEl = $("#board");
const lobbyEl = $("#lobby");
const gameEl = $("#game");
const roomCodeEl = $("#roomCode");
const joinStatus = $("#joinStatus");
const connectionEl = $("#connection");
roomCodeEl.textContent = roomCode;
$("#roomInput").value = roomCode;

let myId = sessionStorage.getItem("ottv2-player-id");
if (!myId) {
  myId = crypto.randomUUID();
  sessionStorage.setItem("ottv2-player-id", myId);
}

let myPlayer = null;
let selected = null;
let roomData, gameData;

function randomRoom() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join("");
}

function emptyBoard() {
  return Array.from({length: SIZE}, () => Array(SIZE).fill(null));
}

function makeInitialState() {
  const b = emptyBoard();
  // P1: a1-c3; each type occupies one file, 3 pieces each.
  [["rock",0,0],["rock",0,1],["rock",0,2],
   ["paper",1,0],["paper",1,1],["paper",1,2],
   ["scissors",2,0],["scissors",2,1],["scissors",2,2]].forEach(([type,x,y]) => {
    b[y][x] = { owner: 1, type };
  });
  // P2: mirrored 3x3 block at i9-g7.
  [["rock",8,8],["rock",8,7],["rock",8,6],
   ["paper",7,8],["paper",7,7],["paper",7,6],
   ["scissors",6,8],["scissors",6,7],["scissors",6,6]].forEach(([type,x,y]) => {
    b[y][x] = { owner: 2, type };
  });
  return { board:b, turn:1, winner:null, version:1 };
}

function validEmptyGame() { return { board: emptyBoard(), turn:1, winner:null, version:1 }; }

function pieceKey(p) { return p ? `${p.owner}-${p.type}` : ""; }

function countPieces(board, owner) {
  const out = {rock:0,paper:0,scissors:0};
  for (const row of board) for (const p of row) if (p && p.owner === owner) out[p.type]++;
  return out;
}

function beats(a,b) {
  return (a==="rock" && b==="scissors") ||
         (a==="scissors" && b==="paper") ||
         (a==="paper" && b==="rock");
}

// Return true when moving piece can enter target. Same type and losing matchup are blocked.
// A winning matchup captures the target.
function canMove(board, from, to, owner) {
  const p = board[from.y]?.[from.x];
  if (!p || p.owner !== owner) return {ok:false, reason:"Đây không phải quân của bạn."};
  if (Math.max(Math.abs(to.x-from.x), Math.abs(to.y-from.y)) !== 1) return {ok:false, reason:"Chỉ được đi 1 ô."};
  if (to.x<0 || to.x>=SIZE || to.y<0 || to.y>=SIZE) return {ok:false, reason:"Ngoài bàn cờ."};
  const target = board[to.y][to.x];
  if (!target) return {ok:true, capture:false};
  if (target.owner === owner) return {ok:false, reason:"Không thể đi vào quân của mình."};
  if (target.type === p.type) return {ok:false, reason:"Hai quân cùng loại chỉ chặn đường nhau."};
  if (!beats(p.type,target.type)) return {ok:false, reason:`${NAME[p.type]} không thắng ${NAME[target.type]}.`};
  return {ok:true, capture:true};
}

function checkWin(board, movedPiece, to) {
  if (movedPiece.owner === 1 && to.x === 8 && to.y === 8) return 1;
  if (movedPiece.owner === 2 && to.x === 0 && to.y === 0) return 2;
  const c1 = countPieces(board,1), c2 = countPieces(board,2);
  if (TYPES.some(t => c2[t] === 0)) return 1;
  if (TYPES.some(t => c1[t] === 0)) return 2;
  return null;
}

function playerName(id) {
  return id ? (id === myId ? "Bạn" : "Đối thủ") : "Đang chờ";
}

function renderPlayers() {
  const players = roomData?.getData?.()?.players || [null,null];
  const p1 = players[0] || null;
  const p2 = players[1] || null;
  $("#p1Name").textContent = playerName(p1);
  $("#p2Name").textContent = playerName(p2);
  $("#p1Ready").textContent = p1 ? "✓" : "—";
  $("#p2Ready").textContent = p2 ? "✓" : "—";
}

function renderBoard() {
  boardEl.replaceChildren();
  const board = gameData?.board || emptyBoard();
  for (let y=8;y>=0;y--) {
    for (let x=0;x<9;x++) {
      const cell = document.createElement("button");
      cell.type="button";
      cell.className = `cell ${(x+y)%2===0?"light":"dark"}`;
      if (x===8 && y===8) cell.classList.add("target-p1");
      if (x===0 && y===0) cell.classList.add("target-p2");
      cell.dataset.x=x; cell.dataset.y=y;
      const coord=document.createElement("span");
      coord.className="coord"; coord.textContent=`${COLS[x]}${y+1}`;
      cell.append(coord);
      const p=board[y][x];
      if (p) {
        const piece=document.createElement("div");
        piece.className=`piece p${p.owner}`;
        piece.textContent=ICON[p.type];
        piece.title=`P${p.owner} — ${NAME[p.type]}`;
        cell.append(piece);
      }
      if (selected && selected.x===x && selected.y===y) cell.classList.add("selected");
      if (selected && myPlayer === gameData.turn && !gameData.winner) {
        const r=canMove(board, selected, {x,y}, myPlayer);
        if (r.ok) cell.classList.add("valid");
      }
      cell.addEventListener("click",()=>handleCell(x,y));
      boardEl.append(cell);
    }
  }
}

function renderCounts() {
  const c1=countPieces(gameData.board,1), c2=countPieces(gameData.board,2);
  $("#countsBody").innerHTML = `
    <div class="count-row"><span></span><span>P1</span><span>P2</span></div>
    ${TYPES.map(t=>`<div class="count-row"><span>${ICON[t]} ${NAME[t]}</span><span>${c1[t]}</span><span>${c2[t]}</span></div>`).join("")}
  `;
}

function renderStatus() {
  const players=roomData?.getData?.()?.players || [null,null];
  const waiting=!players[0] || !players[1];
  if (gameData.winner) {
    $("#turnText").textContent = gameData.winner === myPlayer ? "🎉 Bạn thắng!" : "🏁 Bạn thua!";
    $("#message").textContent = "Trận đấu đã kết thúc.";
    $("#newGame").classList.toggle("hidden", !myPlayer);
  } else if (waiting) {
    $("#turnText").textContent = "Chờ người chơi thứ hai…";
    $("#message").textContent = "Gửi link phòng cho đối thủ.";
    $("#newGame").classList.add("hidden");
  } else {
    $("#turnText").textContent = gameData.turn === myPlayer ? "Đến lượt bạn" : `Đến lượt Player ${gameData.turn}`;
    $("#message").textContent = selected ? "Chọn ô đích." : "Chọn một quân của bạn.";
    $("#newGame").classList.add("hidden");
  }
}

function render() {
  if (!roomData || !gameData) return;
  lobbyEl.classList.toggle("hidden", !!myPlayer);
  gameEl.classList.toggle("hidden", !myPlayer);
  renderPlayers(); renderBoard(); renderCounts(); renderStatus();
}

async function joinRoom() {
  const ids = roomData.getData().players || [null,null];
  if (ids.includes(myId)) {
    myPlayer = ids.indexOf(myId)+1;
    return;
  }
  if (!ids[0]) {
    myPlayer=1;
    roomData.setData(d=>{ d.players[0]=myId; });
  } else if (!ids[1]) {
    myPlayer=2;
    roomData.setData(d=>{ d.players[1]=myId; });
  } else {
    myPlayer=null;
    joinStatus.textContent="Phòng đã đủ 2 người. Hãy dùng mã phòng khác.";
    return;
  }
  await new Promise(r=>setTimeout(r,100));
  joinStatus.textContent=`Bạn là Player ${myPlayer}.`;
}

function resetGame() {
  if (!myPlayer) return;
  gameData.setData(makeInitialState());
  selected=null;
}

async function handleCell(x,y) {
  if (!myPlayer || !gameData || gameData.winner) return;
  if (gameData.turn !== myPlayer) return;

  const p=gameData.board[y][x];
  if (p && p.owner===myPlayer) {
    selected={x,y}; renderBoard(); renderStatus(); return;
  }
  if (!selected) return;

  const result=canMove(gameData.board,selected,{x,y},myPlayer);
  if (!result.ok) {
    $("#message").textContent=result.reason;
    return;
  }

  const next=structuredClone(gameData);
  const moving=next.board[selected.y][selected.x];
  next.board[selected.y][selected.x]=null;
  next.board[y][x]=moving;
  const winner=checkWin(next.board,moving,{x,y});
  next.winner=winner;
  next.turn=winner ? moving.owner : (moving.owner===1?2:1);
  next.version=(next.version||1)+1;
  gameData.setData(next);
  selected=null;
}

$("#copyRoom").addEventListener("click", async()=>{
  await navigator.clipboard.writeText(location.href);
  $("#copyRoom").textContent="Đã copy!";
  setTimeout(()=>$("#copyRoom").textContent="Copy link",1200);
});
$("#joinRoomBtn").addEventListener("click",()=>{
  const code=$("#roomInput").value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"");
  if (!code) return;
  const u=new URL(location.href); u.searchParams.set("room",code); location.href=u.toString();
});
$("#newGame").addEventListener("click",resetGame);

async function start() {
  try {
    connectionEl.textContent="● Connecting…";
    connectionEl.style.color="#fbbf24";

    await playhtml.init({
      room: () => `ottv2-${roomCode}`,
      cursors: { enabled: false },
      onError: () => {
        connectionEl.textContent="● Mất kết nối";
        connectionEl.style.color="#fb7185";
      }
    });

    connectionEl.textContent="● Connected";
    connectionEl.style.color="#34d399";
    await playhtml.ready;

    roomData = playhtml.createPageData("ottv2-room", {players:[null,null]});
    gameData = playhtml.createPageData("ottv2-game", makeInitialState());

    roomData.onUpdate(d=>{ roomData.value=d; render(); });
    gameData.onUpdate(d=>{ gameData.value=d; render(); });

    render();

    const current=roomData.getData();
    if (current.players.includes(myId)) {
      myPlayer=current.players.indexOf(myId)+1;
    } else {
      await joinRoom();
    }
    render();
  } catch (err) {
    console.error(err);
    connectionEl.textContent="● Không kết nối được";
    connectionEl.style.color="#fb7185";
    joinStatus.textContent="Không kết nối được PlayHTML. Kiểm tra mạng rồi tải lại trang.";
  }
}

start();
