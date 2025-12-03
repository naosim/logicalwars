import { Position } from "./position";

export enum FieldType {
  grass = 0,
  river = 1,
  forest = 2,
}

export class Field {
  constructor(readonly values:FieldType[][]) {
  }
  getFieldType(position: Position) {
    return this.values[position.y][position.x];
  }
  static init(stageText: string) {
    // 8x8の2次元配列を生成する
    const values = stageText.trim().split('\n').map(v => v.trim()).map(row => row.split('').map(Number));
    return new Field(values);
  }
}

