// src/domain/stage.ts
var stageText = `
00000000
00000000
00000000
11100222
11100222
00000000
00000000
00000000
`;
var formationText = `
00,00,00,i1,k1,00,00,00
00,00,00,00,i1,00,00,00
00,00,00,00,00,00,00,00
00,00,00,00,00,00,00,00
00,00,00,00,00,00,00,00
00,00,00,00,00,00,00,00
00,00,00,i0,00,00,00,00
00,00,00,k0,c0,00,i0,00
`;

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
    const field = Field.init(stageText);
    const pieces = Pieces.init(formationText);
    const isDeadFriendKing = false;
    const isDeadEnemyKing = false;
    const side = "enemy";
    const attackLog = [];
    const turnCount = 0;
    return new _LogicalWar(field, pieces, isDeadFriendKing, isDeadEnemyKing, side, attackLog, turnCount);
  }
  run() {
    var pieces = this.pieces.map((unit) => unit.reset());
    for (let i = 0; i < 3; i++) {
      pieces = pieces.map((unit) => {
        if (this.side == unit.side && unit.state == "unprocessed" && unit.isAlive) {
          return unit.moveIfNeeded({
            field: this.field,
            pieces
          });
        } else {
          return unit;
        }
      });
    }
    pieces = pieces.map((unit) => {
      if (unit.isDead) {
        return unit;
      }
      if (this.side != unit.side) {
        return unit;
      }
      const otherKing = this.side == "friend" ? this.pieces.enemyKing : this.pieces.friendKing;
      const goalY = this.side == "friend" ? 0 : 7;
      const leftOrRight = otherKing.position.x - unit.position.x > 0 ? "right" : "left";
      if (unit.position.y == goalY) {
        return unit.changeDirection(leftOrRight);
      } else {
        return unit;
      }
    });
    const offenceAndDefenceList = pieces.mapOther((unit) => {
      if (this.side == unit.side && unit.state == "unprocessed" && unit.isAlive) {
        return unit.getOffenceAndDefence({
          field: this.field,
          pieces
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
  isGameOver() {
    return this.isDeadFriendKing || this.isDeadEnemyKing;
  }
  attack({ offence, defence }) {
    console.log(offence, defence);
    const pieces = this.pieces.attack({
      offence,
      defence
    });
    this.attackLog[this.turnCount].push({
      offence,
      defence
    });
    const isDeadFriendKing = pieces.friendKing.isDead;
    const isDeadEnemyKing = pieces.enemyKing.isDead;
    return new _LogicalWar(this.field, pieces, isDeadFriendKing, isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
  }
};
var _id = 0;
function id() {
  return `U${_id++}`;
}
var FieldType = /* @__PURE__ */ function(FieldType2) {
  FieldType2[FieldType2["grass"] = 0] = "grass";
  FieldType2[FieldType2["river"] = 1] = "river";
  FieldType2[FieldType2["forest"] = 2] = "forest";
  return FieldType2;
}({});
var Field = class _Field {
  values;
  constructor(values) {
    this.values = values;
  }
  getFieldType(position) {
    return this.values[position.y][position.x];
  }
  static init(stageText2) {
    const values = stageText2.trim().split("\n").map((v) => v.trim()).map((row) => row.split("").map(Number));
    return new _Field(values);
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
  static fromSet(values) {
    return new _Pieces(new Map(Array.from(values.keys()).map((v) => [
      v.id,
      v
    ])));
  }
  static init(formationText2) {
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
    const ary = formationText2.trim().split("\n").map((v) => v.trim()).flatMap((row, y) => row.split(",").map((v, x) => createUnit(v, x, y)).filter((v) => v != null));
    return _Pieces.fromSet(new Set(ary));
  }
  forEach(callback) {
    this.values.forEach(callback);
  }
  map(callback) {
    const list = this.toArray().map(callback);
    const sets = new Set(list);
    return _Pieces.fromSet(sets);
  }
  toArray() {
    return Array.from(this.values.values());
  }
  mapOther(callback) {
    return this.toArray().map(callback);
  }
  isInBounds(position) {
    const { x, y } = position;
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }
  isEmpty(position) {
    const { x, y } = position;
    for (const unit of this.values.values()) {
      if (unit.isAlive && unit.position.x == x && unit.position.y == y) {
        return false;
      }
    }
    return true;
  }
  getUnit(position) {
    const { x, y } = position;
    for (const unit of this.values.values()) {
      if (unit.isAlive && unit.position.x == x && unit.position.y == y) {
        return unit;
      }
    }
    throw new Error("\u8A72\u5F53\u3059\u308B\u30E6\u30CB\u30C3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093");
  }
  findById(id2) {
    const result = this.values.get(id2);
    if (!result) {
      throw new Error("\u8A72\u5F53\u3059\u308B\u30E6\u30CB\u30C3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093");
    }
    return result;
  }
  copyy() {
    return new _Pieces(new Map(this.values));
  }
  attack({ offence, defence }) {
    const o = this.findById(offence.id);
    const d = this.findById(defence.id);
    const newPieces = this.copyy();
    newPieces.values.set(o.id, o.setState("attack"));
    newPieces.values.set(d.id, d.attacked(offence.status.attackPoint));
    return newPieces;
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
  isMovable({ field, pieces }) {
    const nextPos = this.next(1);
    return pieces.isInBounds(nextPos) && pieces.isEmpty(nextPos);
  }
  setPosition(position) {
    return this.create(this.id, position, this.direction, this.side, this.status, this.state, this.isAttacked);
  }
  move({ field, pieces }) {
    if (!this.isMovable({
      field,
      pieces
    })) {
      throw new Error("\u79FB\u52D5\u3067\u304D\u307E\u305B\u3093");
    }
    const nextPos = this.next(1);
    return this.setPosition(nextPos);
  }
  changeDirection(direction) {
    return this.create(this.id, this.position, direction, this.side, this.status, this.state, this.isAttacked);
  }
  isAttackable({ field, pieces }) {
    if (pieces.isEmpty(this.next())) {
      return false;
    }
    const unit = pieces.getUnit(this.next());
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
    return pieces.getUnit(this.next());
  }
  /**
   * 向いている方向の座標を返す
   * @param num いくつ進むか
   * @returns 
   */
  next(num = 1) {
    const { x, y } = this.position;
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
      if (result.isMovable({
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
  getOffenceAndDefence({ field, pieces }) {
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
  isMovable({ field, pieces }) {
    const result = super.isMovable({
      field,
      pieces
    });
    if (!result) {
      return false;
    }
    const fieldType = field.getFieldType(this.next(1));
    return fieldType == FieldType.grass || fieldType == FieldType.forest;
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
  isMovable({ field, pieces }) {
    const result = super.isMovable({
      field,
      pieces
    });
    if (!result) {
      return false;
    }
    const fieldType = field.getFieldType(this.next(1));
    return fieldType == FieldType.grass;
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
      const pos = this.next(i);
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
  /**
   * 王将は攻撃できない
   * @param param0 
   * @returns 
   */
  isAttackable({ field, pieces }) {
    return false;
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
  tick = (tick + 1) % 60;
  if (tick === 0) {
    if (game.isGameOver()) {
      if (game.isDeadEnemyKing) {
        p5.fill(0);
        p5.textSize(32);
        p5.text("You Win!", 100, 300);
      }
      if (game.isDeadFriendKing) {
        p5.fill(0);
        p5.textSize(32);
        p5.text("You Lose!", 100, 300);
      }
      p5.noLoop();
      return;
    }
    game = game.run();
    console.log(game.pieces.mapOther((unit) => unit));
  }
  p5.background(220);
  game.field.values.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell == FieldType.grass) {
        p5.fill(100, 255, 100);
      }
      if (cell == FieldType.river) {
        p5.fill(100, 100, 255);
      }
      if (cell == FieldType.forest) {
        p5.fill(0, 100, 0);
      }
      p5.rect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    });
  });
  game.pieces.forEach((unit) => {
    if (unit.isDead) {
      return;
    }
    drawUnit(unit);
  });
  if (tick === 0) {
    game = game.nextSide();
  }
};
function drawUnit(unit) {
  const { x, y } = unit.position;
  var baseColor = unit.side === "friend" ? p5.color(255, 0, 0) : p5.color(0, 0, 255);
  baseColor = unit.isAttacked && tick % 2 == 0 && tick >= 20 && tick < 40 ? p5.color(255, 255, 255) : baseColor;
  p5.fill(baseColor);
  var attackMotion = tick % 3 == 0 && tick < 20 && unit.state == "attack" ? 4 : 0;
  if (unit.direction == "up") {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, (y + 1) * GRID_SIZE - attackMotion);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, (y + 1) * GRID_SIZE - attackMotion);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE - attackMotion);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == "down") {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, y * GRID_SIZE + attackMotion);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE + attackMotion);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, (y + 1) * GRID_SIZE + attackMotion);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == "left") {
    p5.beginShape();
    p5.vertex((x + 1) * GRID_SIZE - attackMotion, y * GRID_SIZE);
    p5.vertex((x + 1) * GRID_SIZE - attackMotion, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE - attackMotion, y * GRID_SIZE + GRID_SIZE / 2);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == "right") {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE + attackMotion, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + attackMotion, (y + 1) * GRID_SIZE);
    p5.vertex((x + 1) * GRID_SIZE + attackMotion, y * GRID_SIZE + GRID_SIZE / 2);
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
