import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Eye, Zap, Star, Settings } from "lucide-react";

const BOARD_SIZE = 8;
const THEME_PINK = "#F06292"; 
const BG_PINK = "#F8BBD0";    
const GRID_CONTAINER = "#7F3039"; 
const GRID_CELL_EMPTY = "#8A3A43"; 

const SHAPES = [
  { shape: [[1]], name: "single" },
  { shape: [[1, 1]], name: "h2" },
  { shape: [[1], [1]], name: "v2" },
  { shape: [[1, 1, 0], [0, 1, 1]], name: "z" },
  { shape: [[1, 1, 1]], name: "h3" },
  { shape: [[1], [1], [1]], name: "v3" },
  { shape: [[1, 1], [1, 1]], name: "square" },
  { shape: [[0, 1, 0], [1, 1, 1]], name: "t-up" },
  { shape: [[1, 1, 1], [0, 1, 0]], name: "t-down" },
  { shape: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], name: "l-big" },
  { shape: [[1, 1, 1, 1]], name: "h4" },
];

const rotateMatrix = (matrix) => {
  return matrix[0].map((val, index) => matrix.map(row => row[index]).reverse());
};

const Cell = ({ filled, isGhost, onClick, onMouseEnter }) => (
  <div
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    className={`w-full h-full transition-all duration-100 relative ${filled ? "pink-block" : isGhost ? "bg-white/20 scale-90" : ""}`}
    style={{ backgroundColor: filled ? THEME_PINK : isGhost ? "" : GRID_CELL_EMPTY,
      boxSizing: "border-box"
     }}
  />
);

const BlockPreview = ({ block, isSelected, onClick, onTouchStart, scale = 1 }) => (
  <motion.div
    whileHover={{ scale: scale * 1.05 }}
    whileTap={{ scale: scale * 0.95 }}
    onClick={onClick}
    onTouchStart={onTouchStart}
    className={`grid gap-1 cursor-pointer p-2 transition-all ${isSelected ? "scale-110 -translate-y-4 filter drop-shadow-lg" : ""}`}
    style={{ gridTemplateColumns: `repeat(${block.shape[0].length}, 20px)` }}
  >
    {block.shape.map((row, r) =>
      row.map((cell, c) => (
        <div key={`${r}-${c}`} className={`w-5 h-5 rounded-sm ${cell ? "pink-block" : "bg-transparent"}`} />
      ))
    )}
  </motion.div>
);

export default function App() {
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [mode, setMode] = useState("CLASSIC");
  const [hand, setHand] = useState([]);
  const [nextHand, setNextHand] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [hoverPos, setHoverPos] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const playSound = (url) => {
    // Sounds disabled for demo
  };

  const SOUNDS = {
    PICKUP: "",
    PLACE: "",
    CLEAR_1: "",
    COMBO: "",
    PERFECT: "",
    GAMEOVER: "",
    GOOD: "",
    AMAZING: "",
    GAMESTART: "",
  };

  const generateBatch = () => Array(3).fill(0).map(() => {
    const base = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    let finalShape = base.shape;
    
    const rotations = Math.floor(Math.random() * 4);
    for (let i = 0; i < rotations; i++) {
      finalShape = rotateMatrix(finalShape);
    }

    return {
      id: Math.random(),
      shape: finalShape,
      name: base.name,
    };
  });

  const handleRetry = () => {
    playSound(SOUNDS.GAMESTART);
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setScore(0);
    setGameOver(false);
    setSelectedIdx(null);
    setHoverPos(null);
    setHand(generateBatch());
    setNextHand(generateBatch());
  };

  useEffect(() => {
    handleRetry();
    const savedHS = localStorage.getItem("pinkBlastHS");
    if (savedHS) setHighScore(parseInt(savedHS));
  }, []);

  const canPlace = (shape, r, c, currentBoard) => {
    for (let i = 0; i < shape.length; i++) {
      for (let j = 0; j < shape[i].length; j++) {
        if (shape[i][j] === 1) {
          if (r + i >= BOARD_SIZE || c + j >= BOARD_SIZE || currentBoard[r + i][c + j] !== null) return false;
        }
      }
    }
    return true;
  };

  const [feedback, setFeedback] = useState(null);

  const handleTouchStart = (idx, e) => {
    if (gameOver) return;
    e.stopPropagation();
    setSelectedIdx(idx);
    setIsDragging(true);
    playSound(SOUNDS.PICKUP);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || selectedIdx === null) return;
    
    const touch = e.touches[0];
    const boardElement = document.querySelector('[data-board="true"]');
    if (!boardElement) return;
    
    const rect = boardElement.getBoundingClientRect();
    const cellSize = rect.width / BOARD_SIZE;
    
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (x >= 0 && x < rect.width && y >= 0 && y < rect.height) {
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        setHoverPos({ r, c });
      }
    } else {
      setHoverPos(null);
    }
  };

  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    
    if (hoverPos && selectedIdx !== null) {
      handlePlacement(hoverPos.r, hoverPos.c);
    }
    
    setIsDragging(false);
    setSelectedIdx(null);
    setHoverPos(null);
  };

  const handlePlacement = (r, c) => {
    if (selectedIdx === null || gameOver) return;
    const block = hand[selectedIdx];
    
    if (canPlace(block.shape, r, c, board)) {
      playSound(SOUNDS.PLACE);

      const tilesPlaced = block.shape.flat().filter(t => t === 1).length;
      let newBoard = board.map(row => [...row]);
      
      block.shape.forEach((rowArr, i) => {
        rowArr.forEach((val, j) => {
          if (val === 1) newBoard[r + i][c + j] = true;
        });
      });

      let rowsToClear = [], colsToClear = [];
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (newBoard[i].every(cell => cell !== null)) rowsToClear.push(i);
        if (newBoard.every(row => row[i] !== null)) colsToClear.push(i);
      }

      const lineCount = rowsToClear.length + colsToClear.length;

      if (lineCount === 1) {
        playSound(SOUNDS.CLEAR_1);
        playSound(SOUNDS.GOOD);
      } else if (lineCount >= 2) {
        playSound(SOUNDS.COMBO);
        playSound(SOUNDS.AMAZING);
      }

      const linePoints = lineCount * 100 * lineCount;
      
      rowsToClear.forEach(ri => newBoard[ri].fill(null));
      colsToClear.forEach(ci => { for(let i=0; i<BOARD_SIZE; i++) newBoard[i][ci] = null; });

      let boardClearBonus = 0;
      const isBoardEmpty = newBoard.every(row => row.every(cell => cell === null));
      
      if (isBoardEmpty && lineCount > 0) {
        playSound(SOUNDS.PERFECT);
        boardClearBonus = 1000;
        setFeedback({ text: "PERFECT CLEAR!", type: "clear" });
      } else if (lineCount > 0) {
        setFeedback({ text: `+${linePoints}`, type: "points" });
      }

      setTimeout(() => setFeedback(null), 1000);

      const newScore = score + tilesPlaced + linePoints + boardClearBonus;
      setScore(newScore);
      
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem("pinkBlastHS", newScore.toString());
      }

      setBoard(newBoard);
      const newHand = hand.filter((_, idx) => idx !== selectedIdx);
      setSelectedIdx(null);
      
      if (newHand.length === 0) {
        setHand(nextHand);
        setNextHand(generateBatch());
      } else {
        setHand(newHand);
        const isStillPlayable = newHand.some(b => {
          for(let row=0; row<BOARD_SIZE; row++) {
            for(let col=0; col<BOARD_SIZE; col++) {
              if (canPlace(b.shape, row, col, newBoard)) return true;
            }
          }
          return false;
        });
        if (!isStillPlayable) {
          setGameOver(true);
          playSound(SOUNDS.GAMEOVER);
        };
      }
    }
  };

  const isGhostCell = (r, c) => {
    if (!hoverPos || selectedIdx === null) return false;
    const block = hand[selectedIdx];
    return block.shape.some((row, i) => 
      row.some((val, j) => val === 1 && hoverPos.r + i === r && hoverPos.c + j === c)
    );
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center p-6 select-none overflow-hidden" 
      style={{ backgroundColor: BG_PINK, touchAction: 'none' }}
      onMouseLeave={() => setHoverPos(null)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      
      <div className="w-full max-w-sm flex justify-between items-start mb-2">
        <div className="flex items-center gap-1 text-yellow-400 drop-shadow-md">
          <Star size={24} fill="currentColor" />
          <span className="text-2xl font-bold text-white">{highScore}</span>
        </div>
        <button onClick={handleRetry} className="text-white opacity-80 hover:opacity-100 transition-opacity">
          <RefreshCw size={28} />
        </button>
      </div>

      <motion.div key={score} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-6xl font-black text-white mb-8 drop-shadow-xl tracking-tighter">
        {score}
      </motion.div>

      <div className="p-2 shadow-2xl" 
           style={{ backgroundColor: GRID_CONTAINER, width: "min(92vw, 380px)", aspectRatio: "1/1" }}>
        <div className="grid h-full w-full" data-board="true" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`, gap: "1px" }}>
          {board.map((row, r) => row.map((filled, c) => (
            <Cell key={`${r}-${c}`} filled={filled} isGhost={isGhostCell(r, c)} onMouseEnter={() => setHoverPos({ r, c })} onClick={() => handlePlacement(r, c)} />
          )))}
        </div>
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: -20, scale: 1.2 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            >
              <span className={`
                font-black tracking-tighter drop-shadow-2xl
                ${feedback.type === 'clear' 
                  ? "text-5xl text-yellow-300 italic uppercase" 
                  : "text-4xl text-white"}
              `}>
                {feedback.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-center items-center gap-4 h-32 mt-12 mb-4 w-full">
        {hand.map((block, idx) => (
          <BlockPreview 
            key={block.id} 
            block={block} 
            isSelected={selectedIdx === idx} 
            onClick={() => {
              if (selectedIdx !== idx) playSound(SOUNDS.PICKUP);
              setSelectedIdx(selectedIdx === idx ? null : idx);
            }}
            onTouchStart={(e) => {
              handleTouchStart(idx, e);
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <div className="flex bg-white/30 p-1 rounded-full shadow-inner border border-white/20">
          <button onClick={() => setMode("CLASSIC")} className={`px-4 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1 ${mode === "CLASSIC" ? "bg-white text-pink-600 shadow-sm" : "text-white/70"}`}>
            <Zap size={14} /> CLASSIC
          </button>
          <button onClick={() => setMode("FUTURE")} className={`px-4 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1 ${mode === "FUTURE" ? "bg-white text-pink-600 shadow-sm" : "text-white/70"}`}>
            <Eye size={14} /> FUTURE
          </button>
        </div>

        {mode === "FUTURE" && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/20 p-3 rounded-2xl w-full text-center">
            <span className="text-[10px] font-black text-white uppercase tracking-widest block mb-2 opacity-60">Coming Next</span>
            <div className="flex justify-center gap-6 opacity-40">
              {nextHand.map(b => <BlockPreview key={b.id} block={b} scale={0.5} />)}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {gameOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-pink-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <h2 className="text-4xl font-black mb-4">GAME OVER</h2>
            <button onClick={handleRetry} className="bg-white text-pink-600 px-8 py-3 rounded-full font-black shadow-xl flex items-center gap-2"><RefreshCw size={20} /> RETRY</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}