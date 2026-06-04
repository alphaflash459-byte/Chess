export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type PieceColor = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export interface Position {
  r: number;
  c: number;
}

export interface Move {
  from: Position;
  to: Position;
}
