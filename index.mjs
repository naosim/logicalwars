// src/domain/LogicalWar.ts
var LogicalWar = class _LogicalWar {
  field;
  pieces;
  isDeadFriendKing;
  isDeadEnemyKing;
  side;
  attackLog;
  turnCount;
  constructor(field, pieces, isDeadFriendKing, isDeadEnemyKing, side, attackLog, turnCount) {
    this.field = field;
    this.pieces = pieces;
    this.isDeadFriendKing = isDeadFriendKing;
    this.isDeadEnemyKing = isDeadEnemyKing;
    this.side = side;
    this.attackLog = attackLog;
    this.turnCount = turnCount;
    if (!attackLog[turnCount]) {
      attackLog[turnCount] = [];
    }
  }
  static init() {
    const field = new Field();
    const pieces = Pieces.init();
    const isDeadFriendKing = false;
    const isDeadEnemyKing = false;
    const side = "enemy";
    const attackLog = [];
    const turnCount = 0;
    return new _LogicalWar(field, pieces, isDeadFriendKing, isDeadEnemyKing, side, attackLog, turnCount);
  }
  run() {
    const pieces = this.pieces.map((unit) => {
      if (this.side == unit.side && unit.isAlive) {
        return unit.reset().moveIfNeeded({
          field: this.field,
          pieces: this.pieces
        });
      } else {
        return unit.reset();
      }
    });
    const offenceAndDefenceList = pieces.mapOther((unit) => {
      if (this.side == unit.side && unit.state == "unprocessed" && unit.isAlive) {
        return unit.attackIfNeeded({
          field: this.field,
          pieces: this.pieces
        });
      } else {
        return null;
      }
    }).filter((v) => v != null);
    const movedGame = new _LogicalWar(this.field, pieces, this.isDeadFriendKing, this.isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
    const attackedGame = offenceAndDefenceList.reduce((memo, v) => {
      return memo.attack(v);
    }, movedGame);
    return attackedGame;
  }
  nextSide() {
    const side = this.side == "friend" ? "enemy" : "friend";
    return new _LogicalWar(this.field, this.pieces, this.isDeadFriendKing, this.isDeadEnemyKing, side, this.attackLog, this.turnCount + 1);
  }
  check() {
    const isDeadFriendKing = this.pieces.friendKing.isDead;
    const isDeadEnemyKing = this.pieces.enemyKing.isDead;
    return new _LogicalWar(this.field, this.pieces, isDeadFriendKing, isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
  }
  isGameOver() {
    return this.isDeadFriendKing || this.isDeadEnemyKing;
  }
  attack({ offence, defence }) {
    console.log(offence, defence);
    const pieces = this.pieces.map((unit) => {
      if (unit.id == defence.id) {
        return defence.attacked(offence.status.attackPoint);
      }
      return unit;
    });
    this.attackLog[this.turnCount].push({
      offence,
      defence
    });
    return new _LogicalWar(this.field, pieces, this.isDeadFriendKing, this.isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
  }
};
var _id = 0;
function id() {
  return `U${_id++}`;
}
var Field = class {
  values;
  constructor() {
    this.values = `
    00000000
    00000000
    00000000
    00000000
    00000000
    00000000
    00000000
    00000000
    `.trim().split("\n").map((v) => v.trim()).map((row) => row.split("").map(Number));
  }
};
var Pieces = class _Pieces {
  values;
  friendKing;
  enemyKing;
  constructor(values) {
    this.values = values;
    Array.from(this.values.values()).forEach((unit) => {
      if (unit.type == UnitType.King && unit.side == "friend") {
        this.friendKing = unit;
      }
      if (unit.type == UnitType.King && unit.side == "enemy") {
        this.enemyKing = unit;
      }
    });
    if (!this.friendKing || !this.enemyKing) {
      throw new Error("King not found");
    }
  }
  static init() {
    const createUnit = (v, x, y) => {
      if (v == "00") {
        return null;
      }
      const side = y <= 3 ? "enemy" : "friend";
      const [type, d] = v.split("");
      const direction = d == "0" ? "up" : d == "1" ? "down" : d == "2" ? "left" : "right";
      if (type == "k") {
        return KingUnit.init(id(), {
          x,
          y
        }, direction, side, "unprocessed", false);
      }
      if (type == "i") {
        return InfantryUnit.init(id(), {
          x,
          y
        }, direction, side, "unprocessed", false);
      }
      if (type == "c") {
        return CavalryUnit.init(id(), {
          x,
          y
        }, direction, side, "unprocessed", false);
      }
      if (type == "a") {
        return ArcherUnit.init(id(), {
          x,
          y
        }, direction, side, "unprocessed", false);
      }
    };
    const ary = `
    00,00,00,i1,k1,00,00,00
    00,00,00,00,i1,00,00,00
    00,00,00,00,00,00,00,00
    00,00,00,00,00,00,00,00
    00,00,00,00,00,00,00,00
    00,00,00,00,00,00,00,00
    00,00,00,a0,00,00,00,00
    00,00,00,k0,c0,00,00,00
    `.trim().split("\n").map((v) => v.trim()).flatMap((row, y) => row.split(",").map((v, x) => createUnit(v, x, y)).filter((v) => v != null));
    return new _Pieces(new Set(ary));
  }
  forEach(callback) {
    this.values.forEach(callback);
  }
  map(callback) {
    const list = Array.from(this.values.values()).map(callback);
    const sets = new Set(list);
    return new _Pieces(sets);
  }
  mapOther(callback) {
    return Array.from(this.values.values()).map(callback);
  }
  isInBounds(position) {
    const { x, y } = position;
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }
  isEmpty(position) {
    const { x, y } = position;
    for (const unit of this.values) {
      if (unit.isAlive && unit.position.x == x && unit.position.y == y) {
        return false;
      }
    }
    return true;
  }
  getUnit(position) {
    const { x, y } = position;
    for (const unit of this.values) {
      if (unit.isAlive && unit.position.x == x && unit.position.y == y) {
        return unit;
      }
    }
    throw new Error("\u8A72\u5F53\u3059\u308B\u30E6\u30CB\u30C3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093");
  }
};
var UnitType = /* @__PURE__ */ function(UnitType2) {
  UnitType2["Infantry"] = "Infantry";
  UnitType2["Cavalry"] = "Cavalry";
  UnitType2["Archer"] = "Archer";
  UnitType2["King"] = "King";
  return UnitType2;
}({});
var Status = class _Status {
  hp;
  attackPoint;
  defencePoint;
  moveSpeed;
  isDead;
  constructor(hp, attackPoint, defencePoint, moveSpeed) {
    this.hp = hp;
    this.attackPoint = attackPoint;
    this.defencePoint = defencePoint;
    this.moveSpeed = moveSpeed;
    this.isDead = hp <= 0;
  }
  setHp(value) {
    return new _Status(value, this.attackPoint, this.defencePoint, this.moveSpeed);
  }
  setAttackPoint(value) {
    return new _Status(this.hp, value, this.defencePoint, this.moveSpeed);
  }
  setDefencePoint(value) {
    return new _Status(this.hp, this.attackPoint, value, this.moveSpeed);
  }
  setMoveSpeed(value) {
    return new _Status(this.hp, this.attackPoint, this.defencePoint, value);
  }
  attacked(power) {
    return new _Status(this.hp - power, this.attackPoint, this.defencePoint, this.moveSpeed);
  }
};
var Unit = class {
  id;
  type;
  position;
  direction;
  side;
  status;
  state;
  isAttacked;
  isDead;
  isAlive;
  constructor(id2, type, position, direction, side, status, state, isAttacked) {
    this.id = id2;
    this.type = type;
    this.position = position;
    this.direction = direction;
    this.side = side;
    this.status = status;
    this.state = state;
    this.isAttacked = isAttacked;
    this.isDead = this.status.isDead;
    this.isAlive = !this.isDead;
  }
  create(id2, position, direction, side, status, state, isAttacked) {
    throw new Error("abstract method");
  }
  reset() {
    return this.setState("unprocessed");
  }
  attacked(power) {
    if (power == 0) {
      return this;
    }
    const status = this.status.attacked(power);
    return this.create(this.id, this.position, this.direction, this.side, status, this.state, true);
  }
  isMovavle({ field, pieces }) {
    const { x, y } = this.position;
    if (this.direction == "up") {
      return pieces.isEmpty({
        x,
        y: y - 1
      });
    }
    if (this.direction == "down") {
      return pieces.isEmpty({
        x,
        y: y + 1
      });
    }
    if (this.direction == "left") {
      return pieces.isEmpty({
        x: x - 1,
        y
      });
    }
    if (this.direction == "right") {
      return pieces.isEmpty({
        x: x + 1,
        y
      });
    }
    return false;
  }
  setPosition({ x, y }) {
    return this.create(this.id, {
      x,
      y
    }, this.direction, this.side, this.status, this.state, this.isAttacked);
  }
  move({ field, pieces }) {
    if (!this.isMovavle({
      field,
      pieces
    })) {
      throw new Error("\u79FB\u52D5\u3067\u304D\u307E\u305B\u3093");
    }
    const { x, y } = this.position;
    if (this.direction == "up") {
      return this.setPosition({
        y: y - 1,
        x
      });
    }
    if (this.direction == "down") {
      return this.setPosition({
        y: y + 1,
        x
      });
    }
    if (this.direction == "left") {
      return this.setPosition({
        y,
        x: x - 1
      });
    }
    if (this.direction == "right") {
      return this.setPosition({
        y,
        x: x + 1
      });
    }
    throw new Error("\u79FB\u52D5\u3067\u304D\u307E\u305B\u3093(\u4E0D\u660E)");
  }
  isAttackable({ field, pieces }) {
    const { x, y } = this.position;
    const debug = pieces.isEmpty(this.next({
      x,
      y
    }));
    if (pieces.isEmpty(this.next({
      x,
      y
    }))) {
      return false;
    }
    const unit = pieces.getUnit(this.next({
      x,
      y
    }));
    if (unit.side == this.side) {
      return false;
    }
    return true;
  }
  getAttackTarget({ field, pieces }) {
    if (!this.isAttackable({
      field,
      pieces
    })) {
      throw new Error("\u653B\u6483\u53EF\u80FD\u306A\u5BFE\u8C61\u304C\u3042\u308A\u307E\u305B\u3093");
    }
    return pieces.getUnit(this.next(this.position));
  }
  /**
   * 向いている方向の座標を返す
   * @param position 位置
   * @param num いくつ進むか
   * @returns 
   */
  next({ x, y }, num = 1) {
    if (this.direction == "up") {
      return {
        x,
        y: y - num
      };
    }
    if (this.direction == "down") {
      return {
        x,
        y: y + num
      };
    }
    if (this.direction == "left") {
      return {
        x: x - num,
        y
      };
    }
    if (this.direction == "right") {
      return {
        x: x + num,
        y
      };
    }
    return {
      x,
      y
    };
  }
  moveIfNeeded({ field, pieces }) {
    if (this.state != "unprocessed") {
      return this;
    }
    let result = this;
    let isMove = false;
    for (let i = 0; i < this.status.moveSpeed; i++) {
      if (result.isMovavle({
        field,
        pieces
      })) {
        isMove = true;
        result = result.move({
          field,
          pieces
        });
      }
    }
    if (isMove) {
      return result.setState("moved");
    }
    return this;
  }
  attackIfNeeded({ field, pieces }) {
    if (this.state != "unprocessed") {
      return null;
    }
    const position = this.position;
    if (this.isAttackable({
      field,
      pieces
    })) {
      console.log("atack");
      const offence = this;
      const defence = this.getAttackTarget({
        field,
        pieces
      });
      return {
        offence,
        defence
      };
    } else {
      return null;
    }
  }
  setState(value) {
    const isAttacked = value == "unprocessed" ? false : this.isAttacked;
    return this.create(this.id, this.position, this.direction, this.side, this.status, value, isAttacked);
  }
};
var InfantryUnit = class _InfantryUnit extends Unit {
  id;
  position;
  direction;
  side;
  status;
  state;
  isAttacked;
  constructor(id2, position, direction, side, status, state, isAttacked) {
    super(id2, UnitType.Infantry, position, direction, side, status, state, isAttacked), this.id = id2, this.position = position, this.direction = direction, this.side = side, this.status = status, this.state = state, this.isAttacked = isAttacked;
  }
  static init(id2, position, direction, side, state, isAttacked) {
    const status = new Status(10, 1, 1, 1);
    return new _InfantryUnit(id2, position, direction, side, status, state, isAttacked);
  }
  create(id2, position, direction, side, status, state, isAttacked) {
    return new _InfantryUnit(id2, position, direction, side, status, state, isAttacked);
  }
};
var CavalryUnit = class _CavalryUnit extends Unit {
  id;
  position;
  direction;
  side;
  status;
  state;
  isAttacked;
  constructor(id2, position, direction, side, status, state, isAttacked) {
    super(id2, UnitType.Cavalry, position, direction, side, status, state, isAttacked), this.id = id2, this.position = position, this.direction = direction, this.side = side, this.status = status, this.state = state, this.isAttacked = isAttacked;
  }
  static init(id2, position, direction, side, state, isAttacked) {
    const status = new Status(10, 5, 1, 2);
    return new _CavalryUnit(id2, position, direction, side, status, state, isAttacked);
  }
  create(id2, position, direction, side, status, state, isAttacked) {
    return new _CavalryUnit(id2, position, direction, side, status, state, isAttacked);
  }
};
var ArcherUnit = class _ArcherUnit extends Unit {
  id;
  position;
  direction;
  side;
  status;
  state;
  isAttacked;
  constructor(id2, position, direction, side, status, state, isAttacked) {
    super(id2, UnitType.Archer, position, direction, side, status, state, isAttacked), this.id = id2, this.position = position, this.direction = direction, this.side = side, this.status = status, this.state = state, this.isAttacked = isAttacked;
  }
  static init(id2, position, direction, side, state, isAttacked) {
    const status = new Status(10, 4, 1, 0);
    return new _ArcherUnit(id2, position, direction, side, status, state, isAttacked);
  }
  create(id2, position, direction, side, status, state, isAttacked) {
    return new _ArcherUnit(id2, position, direction, side, status, state, isAttacked);
  }
  /**
   * 向いている方向にある最初の相手を返す。ただし王将は除外する
   * @param param0 
   * @returns 
   */
  getAttackTargetNulable({ field, pieces }) {
    const { x, y } = this.position;
    for (let i = 1; i < 8; i++) {
      const pos = this.next({
        x,
        y
      }, i);
      if (!pieces.isInBounds(pos)) {
        break;
      }
      if (pieces.isEmpty(pos)) {
        continue;
      } else {
        const unit = pieces.getUnit(pos);
        if (unit.side == this.side || unit.type == UnitType.King) {
          continue;
        } else {
          return unit;
        }
      }
    }
    return null;
  }
  isAttackable({ field, pieces }) {
    return this.getAttackTargetNulable({
      field,
      pieces
    }) !== null;
  }
  getAttackTarget({ field, pieces }) {
    const target = this.getAttackTargetNulable({
      field,
      pieces
    });
    if (target === null) {
      throw new Error("\u653B\u6483\u53EF\u80FD\u306A\u5BFE\u8C61\u304C\u3042\u308A\u307E\u305B\u3093");
    }
    return target;
  }
};
var KingUnit = class _KingUnit extends Unit {
  id;
  position;
  direction;
  side;
  status;
  state;
  isAttacked;
  constructor(id2, position, direction, side, status, state, isAttacked) {
    super(id2, UnitType.King, position, direction, side, status, state, isAttacked), this.id = id2, this.position = position, this.direction = direction, this.side = side, this.status = status, this.state = state, this.isAttacked = isAttacked;
  }
  static init(id2, position, direction, side, state, isAttacked) {
    const status = new Status(1, 0, 0, 0);
    return new _KingUnit(id2, position, direction, side, status, state, isAttacked);
  }
  create(id2, position, direction, side, status, state, isAttacked) {
    return new _KingUnit(id2, position, direction, side, status, state, isAttacked);
  }
};

// src/index.ts
var GRID_SIZE = 32;
var p5 = window;
var game = LogicalWar.init();
p5.setup = function() {
  p5.createCanvas(400, 400);
};
var tick = 0;
p5.draw = function() {
  if (game.isGameOver()) {
    p5.noLoop();
    return;
  }
  tick = (tick + 1) % 60;
  if (tick === 0) {
    game = game.run().check().nextSide();
    console.log(game.pieces.mapOther((unit) => unit.status));
  }
  if (game.isDeadEnemyKing) {
    p5.background(220);
    p5.fill(0);
    p5.textSize(32);
    p5.text("You Win!", 100, 100);
    return;
  }
  if (game.isDeadFriendKing) {
    p5.background(220);
    p5.fill(0);
    p5.textSize(32);
    p5.text("You Lose!", 100, 100);
    return;
  }
  p5.background(220);
  game.field.values.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === 0) {
        p5.fill(100, 255, 100);
        p5.rect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      }
    });
  });
  game.pieces.forEach((unit) => {
    if (unit.isDead) {
      return;
    }
    drawUnit(unit);
  });
};
function drawUnit(unit) {
  const { x, y } = unit.position;
  var baseColor = unit.side === "friend" ? p5.color(255, 0, 0) : p5.color(0, 0, 255);
  baseColor = unit.isAttacked && tick % 2 == 0 ? p5.color(255, 255, 255) : baseColor;
  p5.fill(baseColor);
  if (unit.direction == "up") {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == "down") {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, (y + 1) * GRID_SIZE);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == "left") {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == "right") {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE);
    p5.endShape(p5.CLOSE);
  }
  p5.fill(255);
  var word = "";
  if (unit.type == UnitType.Infantry) {
    word = "\u6B69";
  } else if (unit.type == UnitType.King) {
    word = "\u738B";
  } else if (unit.type == UnitType.Cavalry) {
    word = "\u99AC";
  } else if (unit.type == UnitType.Archer) {
    word = "\u5F13";
  }
  p5.text(word, x * GRID_SIZE + GRID_SIZE / 4, y * GRID_SIZE + GRID_SIZE / 2);
}
