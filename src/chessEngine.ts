import { PieceType, PieceColor, Piece, Position, Move } from './types';

export const pieceSymbols: Record<PieceType, string> = { 'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟' };

export const pieceValues: Record<PieceType, number> = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 9000 };

export const centerBonus: number[][] = [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  1,  1,  1,  1,  0,  0],
    [ 0,  1,  2,  3,  3,  2,  1,  0],
    [ 0,  1,  3,  4,  4,  3,  1,  0],
    [ 0,  1,  3,  4,  4,  3,  1,  0],
    [ 0,  1,  2,  3,  3,  2,  1,  0],
    [ 0,  0,  1,  1,  1,  1,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
];

export const createInitialBoard = (): (Piece | null)[][] => {
    const b: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    const backRow: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let i = 0; i < 8; i++) {
        b[0][i] = { type: backRow[i], color: 'b' };
        b[1][i] = { type: 'p', color: 'b' };
        b[6][i] = { type: 'p', color: 'w' };
        b[7][i] = { type: backRow[i], color: 'w' };
    }
    return b;
};

export const getPseudoLegalMoves = (board: (Piece | null)[][], r: number, c: number): Position[] => {
    const piece = board[r][c];
    if (!piece) return [];
    const moves: Position[] = [];
    const color = piece.color;
    const oppColor: PieceColor = color === 'w' ? 'b' : 'w';

    const addIfValid = (nr: number, nc: number): boolean => {
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const dest = board[nr][nc];
            if (!dest) { moves.push({r: nr, c: nc}); return true; } 
            else if (dest.color === oppColor) { moves.push({r: nr, c: nc}); return false; }
            return false; 
        }
        return false; 
    };

    if (piece.type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        if (r + dir >= 0 && r + dir < 8 && !board[r + dir][c]) {
            moves.push({r: r + dir, c: c});
            if (r === startRow && !board[r + dir * 2][c] && !board[r + dir][c]) moves.push({r: r + dir * 2, c: c});
        }
        for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (nc >= 0 && nc < 8 && r + dir >= 0 && r + dir < 8) {
                const diag = board[r + dir][nc];
                if (diag && diag.color === oppColor) moves.push({r: r + dir, c: nc});
            }
        }
    } else if (piece.type === 'n') {
        [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]].forEach(([dr, dc]) => addIfValid(r+dr, c+dc));
    } else if (piece.type === 'k') {
        [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]].forEach(([dr, dc]) => addIfValid(r+dr, c+dc));
    } else {
        const dirs: [number, number][] = [];
        if (piece.type === 'r' || piece.type === 'q') dirs.push([-1,0], [1,0], [0,-1], [0,1]);
        if (piece.type === 'b' || piece.type === 'q') dirs.push([-1,-1], [-1,1], [1,-1], [1,1]);
        dirs.forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            while (addIfValid(nr, nc)) { nr += dr; nc += dc; }
        });
    }
    return moves;
};

export const isKingInCheck = (testBoard: (Piece | null)[][], color: PieceColor): boolean => {
    let kingPos: Position | null = null;
    for(let r=0; r<8; r++){
        for(let c=0; c<8; c++){
            const p = testBoard[r][c];
            if(p && p.type === 'k' && p.color === color){ kingPos = {r, c}; break; }
        }
        if(kingPos) break;
    }
    if(!kingPos) return false;
    const oppColor: PieceColor = color === 'w' ? 'b' : 'w';
    for(let r=0; r<8; r++){
        for(let c=0; c<8; c++){
            const p = testBoard[r][c];
            if(p && p.color === oppColor){
                const moves = getPseudoLegalMoves(testBoard, r, c);
                if (moves.some(m => m.r === kingPos!.r && m.c === kingPos!.c)) return true;
            }
        }
    }
    return false;
};

export const getValidMoves = (board: (Piece | null)[][], r: number, c: number): Position[] => {
    const piece = board[r][c];
    if (!piece) return [];
    const pseudoMoves = getPseudoLegalMoves(board, r, c);
    return pseudoMoves.filter(move => {
        const testBoard = board.map(row => [...row]);
        testBoard[move.r][move.c] = piece;
        testBoard[r][c] = null;
        return !isKingInCheck(testBoard, piece.color);
    });
};

export const getAllValidMovesForColor = (board: (Piece | null)[][], color: PieceColor): Move[] => {
    const allMoves: Move[] = [];
    for(let r=0; r<8; r++){
        for(let c=0; c<8; c++){
            const p = board[r][c];
            if(p && p.color === color){
                getValidMoves(board, r, c).forEach(m => allMoves.push({ from: {r, c}, to: {r: m.r, c: m.c} }));
            }
        }
    }
    return allMoves;
};

export const applyMovePure = (board: (Piece | null)[][], move: Move): (Piece | null)[][] => {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[move.from.r][move.from.c];
    if (!piece) return newBoard;
    newBoard[move.from.r][move.from.c] = null;
    if (piece.type === 'p' && (move.to.r === 0 || move.to.r === 7)) {
        newBoard[move.to.r][move.to.c] = { type: 'q', color: piece.color };
    } else {
        newBoard[move.to.r][move.to.c] = piece;
    }
    return newBoard;
};

export const evaluateBoard = (b: (Piece | null)[][]): number => {
    let score = 0;
    for(let r=0; r<8; r++){
        for(let c=0; c<8; c++){
            const p = b[r][c];
            if(p){
                let val = pieceValues[p.type];
                if(p.type !== 'r' && p.type !== 'q') val += centerBonus[r][c];
                if(p.color === 'w') score += val; else score -= val;
            }
        }
    }
    return score;
};

export const minimax = (board: (Piece | null)[][], depth: number, alpha: number, beta: number, isMaximizingWhite: boolean): number => {
    if (depth === 0) return evaluateBoard(board);
    const color: PieceColor = isMaximizingWhite ? 'w' : 'b';
    const moves = getAllValidMovesForColor(board, color);
    if (moves.length === 0) return isKingInCheck(board, color) ? (isMaximizingWhite ? -99999 : 99999) : 0;

    if (isMaximizingWhite) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const evalVal = minimax(applyMovePure(board, move), depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, evalVal);
            alpha = Math.max(alpha, evalVal);
            if (beta <= alpha) break; 
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const evalVal = minimax(applyMovePure(board, move), depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, evalVal);
            beta = Math.min(beta, evalVal);
            if (beta <= alpha) break;
        }
        return minEval;
    }
};

export const getBestMove = (board: (Piece | null)[][], color: PieceColor, depth: number): Move | null => {
    const moves = getAllValidMovesForColor(board, color);
    if(moves.length === 0) return null;
    const getVictimValue = (m: Move) => {
        const p = board[m.to.r][m.to.c];
        return p ? pieceValues[p.type] : 0;
    };
    moves.sort((a, b) => getVictimValue(b) - getVictimValue(a));

    let bestMove = moves[0];
    let bestValue = color === 'w' ? -Infinity : Infinity;
    let alpha = -Infinity; let beta = Infinity;

    for (const move of moves) {
        const boardVal = minimax(applyMovePure(board, move), depth - 1, alpha, beta, color === 'b');
        if (color === 'w') {
            if (boardVal > bestValue) { bestValue = boardVal; bestMove = move; }
            alpha = Math.max(alpha, bestValue);
        } else {
            if (boardVal < bestValue) { bestValue = boardVal; bestMove = move; }
            beta = Math.min(beta, bestValue);
        }
    }
    return bestMove;
};

export const getEasyMove = (board: (Piece | null)[][], color: PieceColor): Move | null => {
    const moves = getAllValidMovesForColor(board, color);
    if(moves.length === 0) return null;
    let bestMove = moves[0]; let bestScore = -Infinity;
    for(const m of moves) {
        let score = Math.random() * 60; 
        const target = board[m.to.r][m.to.c];
        if(target) score += pieceValues[target.type] * 0.8; 
        if(score > bestScore) { bestScore = score; bestMove = m; }
    }
    return bestMove;
};
