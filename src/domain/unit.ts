import { Field, FieldType } from "./field";
import { Position } from "./position";

var _id = 0;
function id() {
  return `U${_id++}`;
}

export class Pieces {
  values: Map<string, Unit>;
  friendKing!: Unit;
  enemyKing!: Unit;
  constructor(values: Map<string, Unit>) {
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
  static fromSet(values: Set<Unit>) {
    return new Pieces(new Map(Array.from(values.keys()).map(v => ([v.id, v] as [string, Unit]))));
  }
  static init(formationText: string) {
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
    return Pieces.fromSet(new Set(ary))
  }
  forEach(callback: (unit: Unit) => void) {
    this.values.forEach(callback);
  }

  map(callback: (unit: Unit) => Unit) {
    const list = this.toArray().map(callback);
    const sets = new Set(list);
    return Pieces.fromSet(sets);
  }
  toArray() {
    return Array.from(this.values.values());
  }

  mapOther<T>(callback: (unit: Unit) => T) {
    return this.toArray().map(callback);
  }

  isInBounds(position: Position) {
    const { x, y } = position;
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }

  isEmpty(position: Position) {
    const { x, y } = position;
    for (const unit of this.values.values()) {
      if (unit.isAlive && unit.position.x == x && unit.position.y == y) {
        return false;
      }
    }
    return true;
  }

  getUnit(position: Position) {
    const { x, y } = position;
    for (const unit of this.values.values()) {
      if (unit.isAlive && unit.position.x == x && unit.position.y == y) {
        return unit;
      }
    }
    throw new Error('該当するユニットがありません');
  }
  findById(id: string) {
    const result = this.values.get(id);
    if (!result) {
      throw new Error('該当するユニットがありません');
    }
    return result;
  }
  private copyy() {
    return new Pieces(new Map(this.values));
  }

  attack(offenceAndDefence: OffenceAndDefence) {
    const o = this.findById(offenceAndDefence.offence.id);
    const d = this.findById(offenceAndDefence.defence.id);

    const newPieces = this.copyy();
    const newDifence = d.attacked(offenceAndDefence.offence.status.attackPoint, offenceAndDefence.isAttakedFromFront());
    if (newDifence.isDead) {
      console.log("dead", newDifence);
    }
    newPieces.values.set(d.id, newDifence);
    newPieces.values.set(o.id, o.setState(newDifence.isDead && offenceAndDefence.isFrontAttack() ? "frontAttack" : "attack"));
    return newPieces;
  }

  run({ side, field }: { side: Side, field: Field }) {
    var pieces = this.map(unit => unit.reset());
    // move
    for (let i = 0; i < 3; i++) {// 駒が並んで動けなくなったとき用。あんまりよくないアルゴリズム。
      pieces = pieces.map((unit) => {
        if (side == unit.side && unit.state == "unprocessed" && unit.isAlive) {
          return unit.moveIfNeeded({ field: field, pieces: pieces });
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
      if (side != unit.side) {
        return unit;
      }
      const otherKing = side == 'friend' ? pieces.enemyKing : pieces.friendKing;
      const goalY = side == 'friend' ? 0 : 7;
      const leftOrRight = otherKing.position.x - unit.position.x > 0 ? "right" : "left";
      if (unit.position.y == goalY) {
        return unit.changeDirection(leftOrRight);
      } else {
        return unit;
      }
    });

    // attack
    const offenceAndDefenceList: OffenceAndDefence[] = pieces.mapOther(unit => {
      if (side == unit.side && unit.state == "unprocessed" && unit.isAlive) {
        return unit.getOffenceAndDefence({ field: field, pieces: pieces });
      } else {
        return null;
      }
    }).filter(v => v != null);
    var attackedPieces = offenceAndDefenceList.reduce((memo, v) => {
      return memo.attack(v);
    }, pieces);

    // frontAttackは一歩進む
    attackedPieces = attackedPieces.map((unit) => {
      if (side == unit.side && unit.state == "frontAttack" && unit.isAlive) {
        console.log("frontAttack", unit);
        return unit.moveIfNeeded({ field: field, pieces: attackedPieces });
      } else {
        return unit;
      }
    });

    return attackedPieces;
  }
}

export enum UnitType {
  Infantry = 'Infantry', // 歩兵
  Cavalry = 'Cavalry',   // 騎兵
  Archer = 'Archer',     // 弓兵
  King = 'King',         // 王将
}



export type Direction = 'up' | 'down' | 'left' | 'right';
/** 敵味方 */
export type Side = 'friend' | 'enemy';

export class Status {
  constructor(
    readonly maxHp: number,
    readonly attackPoint: number,
    readonly defencePoint: number,
    readonly moveSpeed: number,
  ) {
  }
  static readonly infantry = new Status(10, 10, 6, 1);
  static readonly cavalry = new Status(10, 12, 6, 2);
  static readonly archer = new Status(10, 10, 6, 0);
  static readonly king = new Status(1, 0, 0, 0);
}

export class Hp {
  isDead: boolean;
  constructor(
    readonly value: number
  ) {
    this.isDead = value <= 0;
  }
  attacked(attackPoint: number, status: Status, isAttakedFromFront: boolean) {
    if (isAttakedFromFront) {
      return new Hp(this.value - attackPoint + status.defencePoint);
    }
    return new Hp(this.value - attackPoint);
  }
}

export type UnitState = "unprocessed" | "moved" | "attack" | "frontAttack" | "wait";

export class OffenceAndDefence {
  constructor(
    readonly offence: Unit,
    readonly defence: Unit
  ) {
  }
  isAttakedFromFront() {
    const nextPos = this.defence.next(1);
    return this.offence.position.x == nextPos.x && this.offence.position.y == nextPos.y;
  }
  isFrontAttack() {
    // return false;
    // 移動型でない場合は前攻撃ではない
    if (this.offence.status.moveSpeed == 0) {
      return false;
    }
    const nextPos = this.offence.next(1);
    return this.defence.position.x == nextPos.x && this.defence.position.y == nextPos.y;
  }
}
// export type OffenceAndDefence = { offence: Unit, defence: Unit, offenceType: "front" | "other" };

export abstract class Unit {
  readonly id: string;
  readonly type: UnitType;
  readonly isDead: boolean;
  readonly isAlive: boolean;
  readonly hp: Hp;
  readonly status: Status;
  readonly state: UnitState;
  readonly side: Side;
  readonly position: Position;
  readonly direction: Direction;
  readonly isAttacked: boolean;
  constructor(
    readonly primitive: UnitPrimitive
  ) {
    this.id = this.primitive.id;
    this.type = this.primitive.type;
    this.isDead = this.primitive.isDead;
    this.isAlive = this.primitive.isAlive;
    this.hp = this.primitive.hp;
    this.status = this.primitive.status;
    this.state = this.primitive.state;
    this.side = this.primitive.side;
    this.position = this.primitive.position;
    this.direction = this.primitive.direction;
    this.isAttacked = this.primitive.isAttacked;
  }
  create(
    primitive: UnitPrimitive
  ): Unit {
    throw new Error("abstract method");
  }

  reset() {
    return this.setState("unprocessed");
  }

  attacked(power: number, isAttakedFromFront: boolean): Unit {
    return this.create(this.primitive.attacked(power, isAttakedFromFront));
  }

  setPosition(position: Position) {
    return this.create(this.primitive.setPosition(position));
  }

  changeDirection(direction: Direction) {
    return this.create(this.primitive.changeDirection(direction));
  }

  setState(value: UnitState) {
    return this.create(this.primitive.setState(value));
  }

  /**
   * 向いている方向の座標を返す
   * @param num いくつ進むか
   * @returns 
   */
  next(num = 1) {
    return this.primitive.next(num);
  }

  isMovable({ field, pieces }: { field: Field, pieces: Pieces }) {
    return this.primitive.isMovable({ field, pieces });
  }

  move({ field, pieces }: { field: Field, pieces: Pieces }) {
    return this.create(this.primitive.move({ field, pieces }));
  }

  moveIfNeeded({ field, pieces }: { field: Field, pieces: Pieces }) {
    return this.create(this.primitive.moveIfNeeded({ field, pieces }));
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

  getOffenceAndDefence({ field, pieces }: { field: Field, pieces: Pieces }): OffenceAndDefence | null {
    if (this.state != "unprocessed") {
      return null;
    }
    const position = this.position;
    if (this.isAttackable({ field, pieces })) {
      console.log("atack")
      const offence = this;
      const defence = this.getAttackTarget({ field, pieces });
      return new OffenceAndDefence(offence, defence);
    } else {
      return null;
    }
  }
}

export class UnitPrimitive {
  readonly isDead: boolean;
  readonly isAlive: boolean;
  constructor(
    readonly id: string,
    readonly type: UnitType,
    readonly position: Position,
    readonly direction: Direction,
    readonly side: Side,
    readonly hp: Hp,
    readonly status: Status,
    readonly state: UnitState,
    readonly isAttacked: boolean
  ) {
    this.isDead = this.hp.isDead;
    this.isAlive = !this.isDead;
  }

  reset() {
    return this.setState("unprocessed");
  }

  attacked(power: number, isAttakedFromFront: boolean) {
    if (power == 0) {
      return this;
    }
    const hp = this.hp.attacked(power, this.status, isAttakedFromFront);
    return new UnitPrimitive(this.id, this.type, this.position, this.direction, this.side, hp, this.status, this.state, true);
  }

  isMovable({ field, pieces }: { field: Field, pieces: Pieces }) {
    const nextPos: Position = this.next(1);
    return pieces.isInBounds(nextPos) && pieces.isEmpty(nextPos);
  }

  setPosition(position: Position) {
    return new UnitPrimitive(this.id, this.type, position, this.direction, this.side, this.hp, this.status, this.state, this.isAttacked);
  }

  move({ field, pieces }: { field: Field, pieces: Pieces }) {
    if (!this.isMovable({ field, pieces })) {
      throw new Error('移動できません');
    }
    const nextPos = this.next(1);
    return this.setPosition(nextPos);
  }

  changeDirection(direction: Direction) {
    return new UnitPrimitive(this.id, this.type, this.position, direction, this.side, this.hp, this.status, this.state, this.isAttacked);
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
    if (this.state != "unprocessed" && this.state != "frontAttack") {
      return this;
    }
    const moveSpeed = this.state == "frontAttack" ? 1 : this.status.moveSpeed;
    let result: UnitPrimitive = this;
    let isMove = false;
    for (let i = 0; i < moveSpeed; i++) {
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

  setState(value: UnitState) {
    const isAttacked = value == 'unprocessed' ? false : this.isAttacked;
    return new UnitPrimitive(this.id, this.type, this.position, this.direction, this.side, this.hp, this.status, value, isAttacked);
  }
}

export class InfantryUnit extends Unit {
  constructor(readonly primitive: UnitPrimitive) {
    super(primitive);
  }
  static init(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    state: UnitState,
    isAttacked: boolean
  ) {
    const status = Status.infantry;
    const hp = new Hp(status.maxHp);
    return new InfantryUnit(new UnitPrimitive(id, UnitType.Infantry, position, direction, side, hp, status, state, isAttacked));
  }
  create(
    primitive: UnitPrimitive
  ): Unit {
    return new InfantryUnit(primitive);
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
  constructor(readonly primitive: UnitPrimitive) {
    super(primitive);
  }
  static init(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    state: UnitState,
    isAttacked: boolean
  ) {
    const status = Status.cavalry;
    const hp = new Hp(status.maxHp);
    return new CavalryUnit(new UnitPrimitive(id, UnitType.Cavalry, position, direction, side, hp, status, state, isAttacked));
  }
  create(
    primitive: UnitPrimitive
  ): Unit {
    return new CavalryUnit(primitive);
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
  constructor(readonly primitive: UnitPrimitive) {
    super(primitive);
  }
  static init(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    state: UnitState,
    isAttacked: boolean
  ) {
    const status = Status.archer;
    const hp = new Hp(status.maxHp);
    return new ArcherUnit(new UnitPrimitive(id, UnitType.Archer, position, direction, side, hp, status, state, isAttacked));
  }

  create(
    primitive: UnitPrimitive
  ): Unit {
    return new ArcherUnit(primitive);
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
  constructor(readonly primitive: UnitPrimitive) {
    super(primitive);
  }
  static init(
    id: string,
    position: Position,
    direction: Direction,
    side: Side,
    state: UnitState,
    isAttacked: boolean
  ) {
    const status = Status.king;
    const hp = new Hp(status.maxHp);
    return new KingUnit(new UnitPrimitive(id, UnitType.King, position, direction, side, hp, status, state, isAttacked));
  }

  create(
    primitive: UnitPrimitive
  ): Unit {
    return new KingUnit(primitive);
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

