import { Field, FieldType } from "./field.ts";
import { formationText, stageText } from "./stage.ts";
import { OffenceAndDefence, Pieces, Side, Unit, UnitType } from "./unit.ts";

export { FieldType, Unit, UnitType }

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
    const pieces = this.pieces.run({ side: this.side, field: this.field });
    const isDeadFriendKing = pieces.friendKing.isDead;
    const isDeadEnemyKing = pieces.enemyKing.isDead;
    return new LogicalWar(this.field, pieces, isDeadFriendKing, isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
  }

  nextSide() {
    const side = this.side == 'friend' ? 'enemy' : 'friend';
    return new LogicalWar(this.field, this.pieces, this.isDeadFriendKing, this.isDeadEnemyKing, side, this.attackLog, this.turnCount + 1);
  }

  isGameOver() {
    return this.isDeadFriendKing || this.isDeadEnemyKing;
  }

  attack(offenceAndDefence: OffenceAndDefence) {
    // console.log(offence, defence);
    const pieces = this.pieces.attack(offenceAndDefence);
    // イミュータブルでない
    this.attackLog[this.turnCount].push(offenceAndDefence);
    const isDeadFriendKing = pieces.friendKing.isDead;
    const isDeadEnemyKing = pieces.enemyKing.isDead;
    return new LogicalWar(this.field, pieces, isDeadFriendKing, isDeadEnemyKing, this.side, this.attackLog, this.turnCount);
  }
}

