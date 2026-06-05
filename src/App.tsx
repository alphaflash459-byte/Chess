import { useState, useEffect, useCallback, useRef } from 'react';
import { PieceType, PieceColor, Piece, Position, Move } from './types';
import {
  pieceSymbols,
  createInitialBoard,
  getValidMoves,
  getAllValidMovesForColor,
  applyMovePure,
  isKingInCheck,
  getBestMove,
  getEasyMove
} from './chessEngine';

export default function App() {
  const [gameState, setGameState] = useState<string>('main_menu'); 
  const [gameMode, setGameMode] = useState<string>('pvp'); 
  
  const [aiDifficultyW, setAiDifficultyW] = useState<string>('medium'); 
  const [aiDifficultyB, setAiDifficultyB] = useState<string>('medium'); 

  const [board, setBoard] = useState<(Piece | null)[][]>(createInitialBoard());
  const [turn, setTurn] = useState<PieceColor>('w'); 
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [isDraw, setIsDraw] = useState<boolean>(false);
  const [checkAlert, setCheckAlert] = useState<PieceColor | null>(null);
  
  const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);

  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
      if (gameState !== 'playing' || winner || isDraw) return;
      const allMoves = getAllValidMovesForColor(board, turn);
      const isCheck = isKingInCheck(board, turn);

      if (allMoves.length === 0) {
          if (isCheck) setWinner(turn === 'w' ? 'b' : 'w'); 
          else setIsDraw(true); 
      } else if (isCheck) setCheckAlert(turn);
      else setCheckAlert(null);
  }, [board, turn, gameState, winner, isDraw]);

  const executeMove = useCallback((from: Position, to: Position) => {
      const newBoard = applyMovePure(board, {from, to});
      const targetPiece = board[to.r][to.c];
      
      if (targetPiece) {
          if (targetPiece.color === 'w') setCapturedWhite(prev => [...prev, targetPiece.type]);
          else setCapturedBlack(prev => [...prev, targetPiece.type]);
      }
      
      setBoard(newBoard);
      setLastMove({ from, to });
      setTurn(turn === 'w' ? 'b' : 'w');
      setSelectedSquare(null);
      setValidMoves([]);
  }, [board, turn]);

  useEffect(() => {
      if (gameState === 'playing' && !winner && !isDraw) {
          let isAITurn = false; let diff = 'medium';
          if (gameMode === 'eve') { isAITurn = true; diff = turn === 'w' ? aiDifficultyW : aiDifficultyB; } 
          else if (gameMode === 'pve' && turn === 'b') { isAITurn = true; diff = aiDifficultyB; }

          if (isAITurn) {
              setIsThinking(true);
              timerRef.current = setTimeout(() => {
                  let bestMove: Move | null = null;
                  if (diff === 'easy') bestMove = getEasyMove(board, turn);
                  else if (diff === 'medium') bestMove = getBestMove(board, turn, 2); 
                  else bestMove = getBestMove(board, turn, 3); 

                  setIsThinking(false);
                  if (bestMove) executeMove(bestMove.from, bestMove.to);
              }, 100); 
          }
      }
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [turn, gameMode, gameState, winner, isDraw, board, aiDifficultyW, aiDifficultyB, executeMove]);

  const handleClick = (r: number, c: number) => {
      if (winner || isDraw || isThinking || gameMode === 'eve' || (gameMode === 'pve' && turn === 'b')) return;
      if (selectedSquare) {
          if (validMoves.find(m => m.r === r && m.c === c)) { executeMove(selectedSquare, {r, c}); return; }
          const colPiece = board[r][c];
          if (colPiece && colPiece.color === turn) {
              setSelectedSquare({r, c}); setValidMoves(getValidMoves(board, r, c)); return;
          }
          setSelectedSquare(null); setValidMoves([]);
      } else {
          const colPiece = board[r][c];
          if (colPiece && colPiece.color === turn) {
              setSelectedSquare({r, c}); setValidMoves(getValidMoves(board, r, c));
          }
      }
  };

  const selectMode = (mode: string) => { setGameMode(mode); setGameState('setup_menu'); };

  const startGame = () => {
      setBoard(createInitialBoard()); setTurn('w'); setSelectedSquare(null); setValidMoves([]);
      setLastMove(null); setWinner(null); setIsDraw(false); setCheckAlert(null);
      setCapturedWhite([]); setCapturedBlack([]); setIsThinking(false); setGameState('playing');
      if (gameMode === 'pve') setIsFlipped(false);
  };

  const quitToMenu = () => { if (timerRef.current) clearTimeout(timerRef.current); setGameState('main_menu'); };

  // ================= UI Elements =================
  const getPieceIcon = (type: PieceType, color: PieceColor) => {
      // ប្រើ text-white សម្រាប់គ្រាប់អុកស និង text-black សម្រាប់អុកខ្មៅ
      // ព្រមទាំងបន្ថែមស្រមោល (drop-shadow) ឱ្យមើលទៅលេចធ្លោលើក្ដារអុក
      return (
          <span className={`chess-piece text-5xl md:text-6xl lg:text-7xl select-none transition-transform duration-200 
              ${color === 'w' ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_2px_4px_rgba(255,255,255,0.6)]'}`}>
              {pieceSymbols[type]}
          </span>
      );
  };

  const renderCaptured = (pieces: PieceType[], isWhitePieces: boolean) => {
      const value: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
      const sorted = [...pieces].sort((a, b) => value[a] - value[b]);
      return (
          <div className="flex flex-wrap gap-[1px] min-h-[1.5rem] mt-1 opacity-80">
              {sorted.map((p, i) => (
                  <span key={i} className={`chess-piece text-xl md:text-2xl leading-none 
                      ${isWhitePieces ? 'text-white drop-shadow-md' : 'text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'}`}>
                      {pieceSymbols[p]}
                  </span>
              ))}
          </div>
      );
  };

  // ================= ម៉ឺនុយដើម (Main Menu) =================
  if (gameState === 'main_menu') {
      return (
          <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-black flex flex-col items-center justify-center p-4 font-sans text-white relative overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
              <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
              
              <div className="bg-white/5 backdrop-blur-3xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/10 max-w-lg w-full text-center z-10 animate-fade-in relative overflow-hidden">
                  <div className="absolute -top-20 -left-20 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl"></div>
                  
                  <div className="text-7xl mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 drop-shadow-lg chess-piece">♞{'\uFE0E'}</div>
                  <h1 className="text-5xl font-black mb-2 tracking-tight text-white drop-shadow-md">អុកអន្តរជាតិ</h1>
                  <p className="text-cyan-400/80 mb-10 text-sm md:text-base font-medium tracking-widest uppercase">Premium Chess Edition</p>

                  <div className="flex flex-col gap-4 relative z-10">
                      {[
                          { id: 'pvp', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', text: 'លេងជាមួយមិត្តភក្ដិ (PvP)', color: 'from-cyan-500 to-blue-600' },
                          { id: 'pve', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'លេងជាមួយ AI (PvE)', color: 'from-purple-500 to-pink-600' },
                          { id: 'eve', icon: 'M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5', text: 'AI ប្រកួត AI (EvE)', color: 'from-emerald-500 to-teal-600' }
                      ].map(mode => (
                          <button id={`btn-mode-${mode.id}`} key={mode.id} onClick={() => selectMode(mode.id)} className="group relative w-full p-[1px] rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg">
                              <div className={`absolute inset-0 bg-gradient-to-r ${mode.color} opacity-70 group-hover:opacity-100 transition-opacity`}></div>
                              <div className="bg-slate-950/80 backdrop-blur-md rounded-[15px] py-4 px-6 flex items-center justify-center gap-3 relative z-10">
                                 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mode.icon}></path></svg>
                                 <span className="font-bold text-lg text-white tracking-wide">{mode.text}</span>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  // ================= ផ្ទាំងទី ២: កំណត់ទម្រង់ (Setup) =================
  if (gameState === 'setup_menu') {
      return (
          <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-black flex flex-col items-center justify-center p-4 font-sans text-white relative">
              <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-2xl border border-white/10 max-w-md w-full relative z-10 animate-fade-in">
                  
                  <button id="btn-back-menu" onClick={() => setGameState('main_menu')} className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                  </button>

                  <h2 className="text-3xl font-black text-center mb-8 mt-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                      {gameMode === 'pvp' && 'Player vs Player'}
                      {gameMode === 'pve' && 'Player vs AI'}
                      {gameMode === 'eve' && 'AI vs AI'}
                  </h2>

                  <div className="flex flex-col gap-6">
                      {gameMode === 'pvp' ? (
                          <div className="text-center text-slate-300 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                              <span className="text-4xl block mb-2 chess-piece text-white drop-shadow-md">♚{'\uFE0E'}</span>
                              អ្នកកាន់អុកស នឹងចាប់ផ្ដើមដើរមុន។ ត្រៀមខ្លួនសម្រាប់សង្គ្រាម!
                          </div>
                      ) : (
                          <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 shadow-inner">
                              <h3 className="text-cyan-400 font-bold mb-5 flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                  កំណត់កម្រិត AI
                              </h3>
                              
                              <div className="flex flex-col gap-5">
                                  {gameMode === 'eve' && (
                                      <div className="space-y-2">
                                          <span className="text-slate-300 text-xs font-bold uppercase tracking-wider pl-1">AI ពណ៌ស</span>
                                          <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                                              {['easy', 'medium', 'hard'].map(level => (
                                                  <button id={`btn-aiw-${level}`} key={level} onClick={() => setAiDifficultyW(level)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiDifficultyW === level ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                                      {level === 'easy' ? 'ខ្សោយ' : level === 'medium' ? 'មធ្យម' : 'ខ្លាំង'}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                                  
                                  <div className="space-y-2">
                                      <span className="text-slate-300 text-xs font-bold uppercase tracking-wider pl-1">
                                          {gameMode === 'pve' ? 'AI គូប្រជែង (ខ្មៅ)' : 'AI ពណ៌ខ្មៅ'}
                                      </span>
                                      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                                          {['easy', 'medium', 'hard'].map(level => (
                                              <button id={`btn-aib-${level}`} key={level} onClick={() => setAiDifficultyB(level)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiDifficultyB === level ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                                  {level === 'easy' ? 'ខ្សោយ' : level === 'medium' ? 'មធ្យម' : 'ខ្លាំង'}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      <button id="btn-start-game" onClick={startGame} className="mt-4 w-full py-4 bg-white text-slate-900 rounded-xl font-black text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transform transition-all active:scale-95 uppercase tracking-wider cursor-pointer">
                          ចាប់ផ្ដើមលេង
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // ================= ផ្ទាំងទី ៣: ហ្គេម (Game Interface) =================
  return (
    <div className="min-h-screen bg-[#020617] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black flex flex-col items-center justify-center py-4 px-2 font-sans relative overflow-hidden">
        
        {/* Background Ambient Lights */}
        <div className="absolute top-0 left-0 w-full h-96 bg-cyan-600/10 blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-full h-96 bg-purple-600/10 blur-[150px] pointer-events-none"></div>

        {/* Top Controls */}
        <div className="w-full max-w-[400px] md:max-w-[600px] flex justify-between items-center mb-6 z-10">
            <button id="btn-quit" onClick={quitToMenu} className="text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2 backdrop-blur-md transition-all shadow-lg cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg> ត្រឡប់
            </button>
            <div className="px-5 py-1.5 bg-black/60 backdrop-blur-md border border-slate-700 rounded-full text-xs font-bold text-slate-300 flex items-center gap-2 shadow-inner">
                <span className="text-cyan-400">{gameMode.toUpperCase()}</span>
                {gameMode !== 'pvp' && <span className="opacity-50 border-l border-slate-600 pl-2">{gameMode === 'eve' ? `${aiDifficultyW} v ${aiDifficultyB}` : `AI: ${aiDifficultyB}`}</span>}
            </div>
            <button id="btn-flip" onClick={() => setIsFlipped(!isFlipped)} className="text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2 backdrop-blur-md transition-all shadow-lg cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> បញ្ច្រាស
            </button>
        </div>

        {/* Game Area */}
        <div className="w-full max-w-[400px] md:max-w-[600px] flex flex-col gap-4 z-10">
            
            {/* Player Top (Black) */}
            <div className={`flex justify-between items-center px-4 py-3 bg-white/5 backdrop-blur-md rounded-2xl border ${turn === 'b' ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-white/5 shadow-lg'} ${isFlipped ? 'order-3' : 'order-1'} transition-all`}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-3xl shadow-inner text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]">♚</div>
                    <div className="flex flex-col">
                        <span className="text-white font-bold tracking-wide">{gameMode === 'eve' ? 'AI' : 'អ្នកលេង'} (ខ្មៅ)</span>
                        {renderCaptured(capturedWhite, true)}
                    </div>
                </div>
                {turn === 'b' && isThinking && <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2"><div className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div> AI គិត...</span>}
            </div>

            {/* Chess Board Container */}
            <div className={`order-2 p-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isThinking || (gameMode === 'eve' && !winner && !isDraw) ? 'pointer-events-none' : ''}`}>
                <div className={`w-full aspect-square rounded-xl overflow-hidden grid grid-cols-8 grid-rows-8 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''} border border-slate-700 shadow-inner`}>
                    {board.map((row, r) => row.map((cell, c) => {
                        const isLight = (r + c) % 2 === 0;
                        const bgColor = isLight ? 'bg-[#e2e8f0]' : 'bg-[#475569]';
                        
                        const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                        const isLast = lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c));
                        const isValid = validMoves.some(m => m.r === r && m.c === c);
                        const hasPiece = cell !== null;
                        const isCheckSquare = cell?.type === 'k' && cell?.color === checkAlert;

                        return (
                            <div id={`square-${r}-${c}`} key={`${r}-${c}`} onClick={() => handleClick(r, c)} className={`w-full aspect-square relative flex items-center justify-center ${bgColor} cursor-pointer group`}>
                                {/* Last Move Highlight */}
                                {isLast && <div className="absolute inset-0 bg-yellow-400/30"></div>}
                                
                                {/* Selected & Check Highlights */}
                                {isSelected && <div className="absolute inset-0 bg-cyan-400/50 shadow-[inset_0_0_20px_rgba(34,211,238,0.8)]"></div>}
                                {isCheckSquare && <div className="absolute inset-0 bg-red-600/70 animate-pulse shadow-[inset_0_0_20px_rgba(220,38,38,1)]"></div>}
                                
                                {/* Valid Move Indicators */}
                                {isValid && !hasPiece && <div className="absolute w-3 h-3 md:w-4 md:h-4 bg-cyan-400/80 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)] z-10"></div>}
                                {isValid && hasPiece && <div className="absolute inset-1 border-4 border-cyan-400/80 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10"></div>}

                                {/* Piece */}
                                {hasPiece && (
                                    <div className={`relative z-20 w-full h-full flex items-center justify-center transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''} ${!isSelected && !isThinking ? 'group-hover:scale-110' : ''}`}>
                                        {getPieceIcon(cell.type, cell.color)}
                                    </div>
                                )}
                            </div>
                        );
                    }))}
                </div>
            </div>

            {/* Player Bottom (White) */}
            <div className={`flex justify-between items-center px-4 py-3 bg-white/5 backdrop-blur-md rounded-2xl border ${turn === 'w' ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'border-white/5 shadow-lg'} ${isFlipped ? 'order-1' : 'order-3'} transition-all`}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-3xl shadow-inner text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)] chess-piece">♚{'\uFE0E'}</div>
                    <div className="flex flex-col">
                        <span className="text-white font-bold tracking-wide">{gameMode === 'eve' ? 'AI' : 'អ្នកលេង'} (ស)</span>
                        {renderCaptured(capturedBlack, false)}
                    </div>
                </div>
                {turn === 'w' && isThinking && <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2"><div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div> AI គិត...</span>}
            </div>

        </div>

        {/* Resign Button */}
        {!winner && !isDraw && gameMode !== 'eve' && (
            <button id="btn-resign" onClick={() => setWinner(turn === 'w' ? 'b' : 'w')} className="mt-6 text-slate-500 hover:text-rose-400 text-sm font-semibold uppercase tracking-widest transition-all z-10 border border-transparent hover:border-rose-400/30 px-4 py-2 rounded-lg cursor-pointer">
                សុំចុះចាញ់
            </button>
        )}

        {/* Modal Winner */}
        {(winner || isDraw) && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] p-10 max-w-sm w-full text-center animate-modal-pop relative overflow-hidden">
                    {/* Glowing effect inside modal */}
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-[80px] ${isDraw ? 'bg-slate-500' : (winner === 'w' ? 'bg-cyan-500' : 'bg-purple-500')} opacity-50`}></div>
                    
                    <div className="text-8xl mb-6 relative z-10 drop-shadow-2xl chess-piece">
                        {isDraw ? '🤝' : (winner === 'w' ? <span className="text-white drop-shadow-md">♚{'\uFE0E'}</span> : <span className="text-black drop-shadow-[0_2px_4px_rgba(255,255,255,0.6)]">♚{'\uFE0E'}</span>)}
                    </div>
                    <h2 id="modal-title" className={`text-4xl font-black mb-3 relative z-10 tracking-tight ${isDraw ? 'text-white' : (winner === 'w' ? 'text-cyan-400' : 'text-purple-400')}`}>
                        {isDraw ? 'ស្មើគ្នា!' : (winner === 'w' ? 'អុកស ឈ្នះ!' : 'អុកខ្មៅ ឈ្នះ!')}
                    </h2>
                    <p className="text-slate-400 mb-10 font-medium relative z-10">
                        {isDraw ? 'ការប្រកួតបញ្ចប់ត្រឹមលទ្ធផលស្មើ (Stalemate)' : 'អស្ចារ្យមែន! (Checkmate)'}
                    </p>
                    
                    <div className="flex flex-col gap-4 relative z-10">
                        <button id="btn-play-again" onClick={startGame} className="w-full py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] transform transition-all active:scale-95 cursor-pointer">
                            លេងម្ដងទៀត
                        </button>
                        <button id="btn-go-menu" onClick={quitToMenu} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-all cursor-pointer">
                            ត្រឡប់ទៅម៉ឺនុយ
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Check Alert */}
        {checkAlert && !winner && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur-md text-white px-8 py-3 rounded-full font-black text-xl shadow-[0_0_30px_rgba(220,38,38,0.8)] z-50 animate-check-pulse border border-red-400 tracking-widest">
                CHECK!
            </div>
        )}

        <style dangerouslySetInnerHTML={{__html: `
            @keyframes fade-in { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
            .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            
            @keyframes modal-pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            .animate-modal-pop { animation: modal-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            
            @keyframes check-pulse { 0%, 100% { transform: translate(-50%, 0) scale(1); } 50% { transform: translate(-50%, 0) scale(1.05); } }
            .animate-check-pulse { animation: check-pulse 1s infinite; }

            /* ប្រើ Font ស្តង់ដារ ដើម្បីបញ្ចៀស Emoji Mode របស់ប្រព័ន្ធប្រតិបត្តិការ (OS) */
            .chess-piece { 
                font-family: Arial, Helvetica, "Segoe UI", sans-serif;
            }
        `}} />
    </div>
  );
}
