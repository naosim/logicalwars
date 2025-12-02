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
    // move
    const pieces = this.pieces.map((unit) => {
      if (this.side == unit.side && unit.isAlive) {
        return unit.reset().moveIfNeeded({ field: this.field, pieces: this.pieces });
      } else {
        return unit.reset();
      }
    });

    // attack
    const offenceAndDefenceList: OffenceAndDefence[] = pieces.mapOther(unit => {
      if (this.side == unit.side && unit.state == "unprocessed" && unit.isAlive) {
        return unit.attackIfNeeded({ field: this.field, pieces: this.pieces });
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

  check() {
    const isDeadFriendKing = this.pieces.friendKing.isDead;
    const isDeadEnemyKing = this.pieces.enemyKing.isDead;
    return new LogicalWar(this.field, this.pieces, isDeadFriendKing, isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
  }

  isGameOver() {
    return this.isDeadFriendKing || this.isDeadEnemyKing;
  }

  attack({ offence, defence }: OffenceAndDefence) {
    console.log(offence, defence);
    const pieces = this.pieces.map(unit => {
      if (unit.id == defence.id) {
        return defence.attacked(offence.status.attackPoint);
      }
      return unit;
    });
    // イミュータブルでない
    this.attackLog[this.turnCount].push({ offence, defence });
    return new LogicalWar(this.field, pieces, this.isDeadFriendKing, this.isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
  }
}

var _id = 0;
function id() {
  return `U${_id++}`;
}


class Field {
  values: (number | null)[][];
  constructor() {
    // 8x8の2次元配列を生成する
    this.values = `
    00000000
    00000000
    00000000
    00000000
    00000000
    00000000
    00000000
    00000000
    `.trim().split('\n').map(v => v.trim()).map(row => row.split('').map(Number));
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
    const ary: Unit[] = `
    00,00,00,i1,k1,00,00,00
    00,00,00,00,i1,00,00,00
    00,00,00,00,00,00,00,00
    00,00,00,00,00,00,00,00
    00,00,00,00,00,00,00,00
    00,00,00,00,00,00,00,00
    00,00,00,a0,00,00,00,00
    00,00,00,k0,c0,00,00,00
    `.trim().split('\n').map(v => v.trim()).flatMap((row, y) => row.split(',').map((v, x) => createUnit(v, x, y)).filter(v => v != null));
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

type UnitState = "unprocessed" | "moved" | "attacked" | "wait";
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

  isMovavle({ field, pieces }: { field: Field, pieces: Pieces }) {
    const { x, y } = this.position;
    if (this.direction == 'up') {
      return pieces.isEmpty({ x, y: y - 1 });
    }
    if (this.direction == 'down') {
      return pieces.isEmpty({ x, y: y + 1 });
    }
    if (this.direction == 'left') {
      return pieces.isEmpty({ x: x - 1, y });
    }
    if (this.direction == 'right') {
      return pieces.isEmpty({ x: x + 1, y });
    }
    return false;
  }

  setPosition({ x, y }: Position) {
    return this.create(this.id, { x, y }, this.direction, this.side, this.status, this.state, this.isAttacked);
  }

  move({ field, pieces }: { field: Field, pieces: Pieces }) {
    if (!this.isMovavle({ field, pieces })) {
      throw new Error('移動できません');
    }

    const { x, y } = this.position;
    if (this.direction == 'up') {
      return this.setPosition({ y: y - 1, x });
    }
    if (this.direction == 'down') {
      return this.setPosition({ y: y + 1, x });
    }
    if (this.direction == 'left') {
      return this.setPosition({ y, x: x - 1 });
    }
    if (this.direction == 'right') {
      return this.setPosition({ y, x: x + 1 });
    }
    throw new Error("移動できません(不明)");
  }

  isAttackable({ field, pieces }: { field: Field, pieces: Pieces }) {
    const { x, y } = this.position;
    const debug = pieces.isEmpty(this.next({ x, y }));
    if (pieces.isEmpty(this.next({ x, y }))) {
      return false;
    }
    const unit = pieces.getUnit(this.next({ x, y }));
    if (unit.side == this.side) {
      return false;
    }
    return true;
  }

  getAttackTarget({ field, pieces }: { field: Field, pieces: Pieces }) {
    if (!this.isAttackable({ field, pieces })) {
      throw new Error("攻撃可能な対象がありません")
    }
    return pieces.getUnit(this.next(this.position));
  }
  /**
   * 向いている方向の座標を返す
   * @param position 位置
   * @param num いくつ進むか
   * @returns 
   */
  next({ x, y }: { x: number, y: number }, num = 1) {
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
      if (result.isMovavle({ field, pieces })) {
        isMove = true;
        result = result.move({ field, pieces });
      }
    }
    if (isMove) {
      return result.setState("moved");
    }
    return this;
  }

  attackIfNeeded({ field, pieces }: { field: Field, pieces: Pieces }): OffenceAndDefence | null {
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
      const pos = this.next({ x, y }, i);
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
}

