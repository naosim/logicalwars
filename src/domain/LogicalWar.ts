import { formationText, stageText } from "./stage.ts";

export class LogicalWar {
  constructor(
    readonly field: Field,
    readonly pieces: Pieces,
    readonly isDeadFriendKing: boolean,
    readonly isDeadEnemyKing: boolean,
    readonly side: Side,
    readonly attackLog: OffenceAndDefence[][],
    readonly turnCount: number
  ) {
    if (!attackLog[turnCount]) {
      attackLog[turnCount] = [];
    }
  }

  static init() {
    const field = new Field();
    const pieces = Pieces.init();
    const isDeadFriendKing = false;
    const isDeadEnemyKing = false;
    const side: Side = 'enemy';
    const attackLog: OffenceAndDefence[][] = [];
    const turnCount = 0;
    return new LogicalWar(field, pieces, isDeadFriendKing, isDeadEnemyKing, side, attackLog, turnCount);
  }

  run() {
    var pieces = this.pieces.map(unit => unit.reset());
    // move
    for (let i = 0; i < 3; i++) {// 駒が並んで動けなくなったとき用。あんまりよくないアルゴリズム。
      pieces = pieces.map((unit) => {
        if (unit.id == 'U0') {
          console.log(unit);
        }
        if (this.side == unit.side && unit.state == "unprocessed" && unit.isAlive) {
          return unit.moveIfNeeded({ field: this.field, pieces: pieces });
        } else {
          return unit;
        }
      });
    }

    // 奥に到達したら方向を変える
    pieces = pieces.map(unit => {
      if (unit.isDead) {
        return unit;
      }
      if (this.side != unit.side) {
        return unit;
      }
      const otherKing = this.side == 'friend' ? this.pieces.enemyKing : this.pieces.friendKing;
      const goalY = this.side == 'friend' ? 0 : 7;
      const leftOrRight = otherKing.position.x - unit.position.x > 0 ? "right" : "left";
      if (unit.position.y == goalY) {
        return unit.changeDirection(leftOrRight);
      } else {
        return unit;
      }
    });

    // attack
    const offenceAndDefenceList: OffenceAndDefence[] = pieces.mapOther(unit => {
      if (this.side == unit.side && unit.state == "unprocessed" && unit.isAlive) {
        return unit.getOffenceAndDefence({ field: this.field, pieces: pieces });
      } else {
        return null;
      }
    }).filter(v => v != null);
    const movedGame = new LogicalWar(this.field, pieces, this.isDeadFriendKing, this.isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
    const attackedGame = offenceAndDefenceList.reduce((memo, v) => {
      return memo.attack(v);
    }, movedGame);

    return attackedGame;
  }

  nextSide() {
    const side = this.side == 'friend' ? 'enemy' : 'friend';
    return new LogicalWar(this.field, this.pieces, this.isDeadFriendKing, this.isDeadEnemyKing, side, this.attackLog, this.turnCount + 1);
  }

  isGameOver() {
    return this.isDeadFriendKing || this.isDeadEnemyKing;
  }

  attack({ offence, defence }: OffenceAndDefence) {
    console.log(offence, defence);
    const pieces = this.pieces.map(unit => {
      if (unit.id == offence.id) {
        return offence.setState("attack");
      }
      if (unit.id == defence.id) {
        return defence.attacked(offence.status.attackPoint);
      }
      return unit;
    });
    // イミュータブルでない
    this.attackLog[this.turnCount].push({ offence, defence });
    const isDeadFriendKing = pieces.friendKing.isDead;
    const isDeadEnemyKing = pieces.enemyKing.isDead;
    return new LogicalWar(this.field, pieces, isDeadFriendKing, isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
  }
}

var _id = 0;
function id() {
  return `U${_id++}`;
}




function movePieces(field: Field, pieces: Pieces, side: Side) {
  pieces.map((unit) => {
    if (side == unit.side && unit.isAlive) {
      return unit.moveIfNeeded({ field: field, pieces: pieces });
    } else {
      return unit;
    }
  });
}

export enum FieldType {
  grass = 0,
  river = 1,
  forest = 2,
}

class Field {
  values: FieldType[][];
  constructor() {
    // 8x8の2次元配列を生成する
    this.values = stageText.trim().split('\n').map(v => v.trim()).map(row => row.split('').map(Number));
  }
  getFieldType(position: Position) {
    return this.values[position.y][position.x];
  }
}



class Pieces {
  values: Set<Unit>;
  friendKing!: Unit;
  enemyKing!: Unit;
  constructor(values: Set<Unit>) {
    this.values = values;
    Array.from(this.values.values()).forEach(unit => {
      if (unit.type == UnitType.King && unit.side == 'friend') {
        this.friendKing = unit;
      }
      if (unit.type == UnitType.King && unit.side == 'enemy') {
        this.enemyKing = unit;
      }
    })
    if (!this.friendKing || !this.enemyKing) {
      throw new Error('King not found');
    }
  }
  static init() {
    const createUnit = (v: string, x: number, y: number) => {
      if (v == '00') {
        return null;
      }
      const side = y <= 3 ? 'enemy' : 'friend';
      const [type, d] = v.split('');
      const direction = d == '0' ? 'up' : d == '1' ? 'down' : d == '2' ? 'left' : 'right';
      if (type == 'k') {
        return KingUnit.init(id(), { x, y }, direction, side, "unprocessed", false);
      }
      if (type == 'i') {
        return InfantryUnit.init(id(), { x, y }, direction, side, "unprocessed", false);
      }
      if (type == 'c') {
        return CavalryUnit.init(id(), { x, y }, direction, side, "unprocessed", false);
      }
      if (type == 'a') {
        return ArcherUnit.init(id(), { x, y }, direction, side, "unprocessed", false);
      }
    }
    /*
     * 書式
     * 
     * king:k
     * infantry:i
     * cavalry:c
     * archer:a
     * up:0
     * down:1
     * left:2
     * right:3
     */
    const ary: Unit[] = formationText.trim().split('\n').map(v => v.trim()).flatMap((row, y) => row.split(',').map((v, x) => createUnit(v, x, y)).filter(v => v != null));
    return new Pieces(new Set(ary))
  }
  forEach(callback: (unit: Unit) => void) {
    this.values.forEach(callback);
  }

  map(callback: (unit: Unit) => Unit) {
    const list = Array.from(this.values.values()).map(callback);
    const sets = new Set(list);
    return new Pieces(sets);
  }

  mapOther<T>(callback: (unit: Unit) => T) {
    return Array.from(this.values.values()).map(callback);
  }

  isInBounds(position: Position) {
    const { x, y } = position;
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }

  isEmpty(position: Position) {
    const { x, y } = position;
    for (const unit of this.values) {
      if (unit.isAlive && unit.position.x == x && unit.position.y == y) {
        return false;
      }
    }
    return true;
  }

  getUnit(position: Position) {
    const { x, y } = position;
    for (const unit of this.values) {
      if (unit.isAlive && unit.position.x == x && unit.position.y == y) {
        return unit;
      }
    }
    throw new Error('該当するユニットがありません');
  }
}

export enum UnitType {
  Infantry = 'Infantry', // 歩兵
  Cavalry = 'Cavalry',   // 騎兵
  Archer = 'Archer',     // 弓兵
  King = 'King',         // 王将
}



type Direction = 'up' | 'down' | 'left' | 'right';
/** 敵味方 */
type Side = 'friend' | 'enemy';

type Position = { x: number, y: number };


export class Status {
  isDead: boolean;
  constructor(
    readonly hp: number,
    readonly attackPoint: number,
    readonly defencePoint: number,
    readonly moveSpeed: number,
  ) {
    this.isDead = hp <= 0;
  }
  setHp(value: number) {
    return new Status(value, this.attackPoint, this.defencePoint, this.moveSpeed);
  }
  setAttackPoint(value: number) {
    return new Status(this.hp, value, this.defencePoint, this.moveSpeed);
  }
  setDefencePoint(value: number) {
    return new Status(this.hp, this.attackPoint, value, this.moveSpeed);
  }
  setMoveSpeed(value: number) {
    return new Status(this.hp, this.attackPoint, this.defencePoint, value);
  }
  attacked(power: number) {
    return new Status(this.hp - power, this.attackPoint, this.defencePoint, this.moveSpeed);
  }
}

type UnitState = "unprocessed" | "moved" | "attack" | "wait";
type OffenceAndDefence = { offence: Unit, defence: Unit };

export class Unit {
  readonly isDead: boolean;
  readonly isAlive: boolean;
  constructor(
    readonly id: string,
    readonly type: UnitType,
    readonly position: Position,
    readonly direction: Direction,
    readonly side: Side,
    readonly status: Status,
    readonly state: UnitState,
    readonly isAttacked: boolean
  ) {
    this.isDead = this.status.isDead;
    this.isAlive = !this.isDead;
  }
  create(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    status: Status,
    state: UnitState,
    isAttacked: boolean
  ): Unit {
    throw new Error("abstract method");
    // return new Unit(id, type, position, direction, side, status, state);
  }

  reset() {
    return this.setState("unprocessed");
  }

  attacked(power: number) {
    if (power == 0) {
      return this;
    }
    const status = this.status.attacked(power);
    return this.create(this.id, this.position, this.direction, this.side, status, this.state, true);
  }

  isMovable({ field, pieces }: { field: Field, pieces: Pieces }) {
    const nextPos: Position = this.next(1);
    return pieces.isInBounds(nextPos) && pieces.isEmpty(nextPos);
  }

  setPosition(position: Position) {
    return this.create(this.id, position, this.direction, this.side, this.status, this.state, this.isAttacked);
  }

  move({ field, pieces }: { field: Field, pieces: Pieces }) {
    if (!this.isMovable({ field, pieces })) {
      throw new Error('移動できません');
    }
    const nextPos = this.next(1);
    return this.setPosition(nextPos);
  }

  changeDirection(direction: Direction) {
    return this.create(this.id, this.position, direction, this.side, this.status, this.state, this.isAttacked);
  }

  isAttackable({ field, pieces }: { field: Field, pieces: Pieces }) {
    if (pieces.isEmpty(this.next())) {
      return false;
    }
    const unit = pieces.getUnit(this.next());
    if (unit.side == this.side) {
      return false;
    }
    return true;
  }

  getAttackTarget({ field, pieces }: { field: Field, pieces: Pieces }) {
    if (!this.isAttackable({ field, pieces })) {
      throw new Error("攻撃可能な対象がありません")
    }
    return pieces.getUnit(this.next());
  }
  /**
   * 向いている方向の座標を返す
   * @param num いくつ進むか
   * @returns 
   */
  next(num = 1) {
    const { x, y } = this.position;
    if (this.direction == 'up') {
      return { x, y: y - num };
    }
    if (this.direction == 'down') {
      return { x, y: y + num };
    }
    if (this.direction == 'left') {
      return { x: x - num, y };
    }
    if (this.direction == 'right') {
      return { x: x + num, y };
    }
    return { x, y };
  }

  moveIfNeeded({ field, pieces }: { field: Field, pieces: Pieces }) {
    if (this.state != "unprocessed") {
      return this;
    }
    let result: Unit = this;
    let isMove = false;
    for (let i = 0; i < this.status.moveSpeed; i++) {
      if (result.isMovable({ field, pieces })) {
        isMove = true;
        result = result.move({ field, pieces });
      }
    }
    if (isMove) {
      return result.setState("moved");
    }
    return this;
  }

  getOffenceAndDefence({ field, pieces }: { field: Field, pieces: Pieces }): OffenceAndDefence | null {
    if (this.state != "unprocessed") {
      return null;
    }
    const position = this.position;
    if (this.isAttackable({ field, pieces })) {
      console.log("atack")
      const offence = this;
      const defence = this.getAttackTarget({ field, pieces });
      return { offence, defence };
    } else {
      return null;
    }
  }

  setState(value: UnitState) {
    const isAttacked = value == 'unprocessed' ? false : this.isAttacked;
    return this.create(this.id, this.position, this.direction, this.side, this.status, value, isAttacked);
  }
}

export class InfantryUnit extends Unit {
  constructor(
    readonly id: string,
    readonly position: Position,
    readonly direction: Direction,
    readonly side: Side,
    readonly status: Status,
    readonly state: UnitState,
    readonly isAttacked: boolean
  ) {

    super(id, UnitType.Infantry, position, direction, side, status, state, isAttacked);
  }
  static init(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    state: UnitState,
    isAttacked: boolean
  ) {
    const status = new Status(10, 1, 1, 1);
    return new InfantryUnit(id, position, direction, side, status, state, isAttacked);
  }
  create(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    status: Status,
    state: UnitState,
    isAttacked: boolean
  ): Unit {
    return new InfantryUnit(id, position, direction, side, status, state, isAttacked);
  }

  isMovable({ field, pieces }: { field: Field, pieces: Pieces }) {
    const result = super.isMovable({ field, pieces });
    if (!result) {
      return false;
    }
    // 歩兵は草原または森を移動できる
    const fieldType = field.getFieldType(this.next(1));
    return fieldType == FieldType.grass || fieldType == FieldType.forest;
  }
}

export class CavalryUnit extends Unit {
  constructor(
    readonly id: string,
    readonly position: Position,
    readonly direction: Direction,
    readonly side: Side,
    readonly status: Status,
    readonly state: UnitState,
    readonly isAttacked: boolean
  ) {
    super(id, UnitType.Cavalry, position, direction, side, status, state, isAttacked);
  }
  static init(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    state: UnitState,
    isAttacked: boolean
  ) {
    const status = new Status(10, 5, 1, 2);
    return new CavalryUnit(id, position, direction, side, status, state, isAttacked);
  }
  create(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    status: Status,
    state: UnitState,
    isAttacked: boolean
  ): Unit {
    return new CavalryUnit(id, position, direction, side, status, state, isAttacked);
  }

  isMovable({ field, pieces }: { field: Field, pieces: Pieces }) {
    const result = super.isMovable({ field, pieces });
    if (!result) {
      return false;
    }
    // 馬は草原のみ移動できる
    const fieldType = field.getFieldType(this.next(1));
    return fieldType == FieldType.grass;
  }
}

export class ArcherUnit extends Unit {
  constructor(
    readonly id: string,
    readonly position: Position,
    readonly direction: Direction,
    readonly side: Side,
    readonly status: Status,
    readonly state: UnitState,
    readonly isAttacked: boolean
  ) {

    super(id, UnitType.Archer, position, direction, side, status, state, isAttacked);
  }

  static init(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    state: UnitState,
    isAttacked: boolean
  ) {
    const status = new Status(10, 4, 1, 0);
    return new ArcherUnit(id, position, direction, side, status, state, isAttacked);
  }
  create(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    status: Status,
    state: UnitState,
    isAttacked: boolean
  ): Unit {
    return new ArcherUnit(id, position, direction, side, status, state, isAttacked);
  }

  /**
   * 向いている方向にある最初の相手を返す。ただし王将は除外する
   * @param param0 
   * @returns 
   */
  private getAttackTargetNulable({ field, pieces }: { field: Field, pieces: Pieces }) {
    const { x, y } = this.position;
    // 向いている方向すべてに敵がいるかどうか
    for (let i = 1; i < 8; i++) {
      const pos = this.next(i);
      if (!pieces.isInBounds(pos)) {
        break;
      }
      if (pieces.isEmpty(pos)) {
        continue;
      } else {
        const unit = pieces.getUnit(pos);
        if (unit.side == this.side || unit.type == UnitType.King) {// 味方または王将は除外
          continue;
        } else {
          return unit;
        }
      }
    }
    return null;
  }

  isAttackable({ field, pieces }: { field: Field, pieces: Pieces }) {
    return this.getAttackTargetNulable({ field, pieces }) !== null;
  }

  getAttackTarget({ field, pieces }: { field: Field, pieces: Pieces }) {
    const target = this.getAttackTargetNulable({ field, pieces });
    if (target === null) {
      throw new Error("攻撃可能な対象がありません");
    }
    return target;
  }
}



export class KingUnit extends Unit {
  constructor(
    readonly id: string,
    readonly position: Position,
    readonly direction: Direction,
    readonly side: Side,
    readonly status: Status,
    readonly state: UnitState,
    readonly isAttacked: boolean
  ) {
    super(id, UnitType.King, position, direction, side, status, state, isAttacked);
  }

  static init(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    state: UnitState,
    isAttacked: boolean
  ) {
    const status = new Status(1, 0, 0, 0);
    return new KingUnit(id, position, direction, side, status, state, isAttacked);
  }

  create(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    status: Status,
    state: UnitState,
    isAttacked: boolean
  ): Unit {
    return new KingUnit(id, position, direction, side, status, state, isAttacked);
  }

  /**
   * 王将は攻撃できない
   * @param param0 
   * @returns 
   */
  isAttackable({ field, pieces }: { field: Field, pieces: Pieces }) {
    return false;
  }
}

