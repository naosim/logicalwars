import { Field, FieldType } from "./field.ts";
import { formationText, stageText } from "./stage.ts";
import { OffenceAndDefence, Pieces, Side, Unit, UnitType } from "./unit.ts";

export {FieldType, Unit, UnitType}

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
    const field = Field.init(stageText);
    const pieces = Pieces.init(formationText);
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
    const pieces = this.pieces.attack({ offence, defence });
    // イミュータブルでない
    this.attackLog[this.turnCount].push({ offence, defence });
    const isDeadFriendKing = pieces.friendKing.isDead;
    const isDeadEnemyKing = pieces.enemyKing.isDead;
    return new LogicalWar(this.field, pieces, isDeadFriendKing, isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
  }
}

