import { FieldType, LogicalWar, Unit, UnitType } from "./domain/LogicalWar.ts";
const GRID_SIZE = 32;
const p5: any = window;
var game = LogicalWar.init();
p5.setup = function () {
  p5.createCanvas(400, 400);
}
var tick = 0;
p5.draw = function () {
  tick = (tick + 1) % 60;
  if (tick === 0) {
    if (game.isGameOver()) {
      if (game.isDeadEnemyKing) {
        // p5.background(220);
        p5.fill(0);
        p5.textSize(32);
        p5.text("You Win!", 100, 300);
      }
      if (game.isDeadFriendKing) {
        // p5.background(220);
        p5.fill(0);
        p5.textSize(32);
        p5.text("You Lose!", 100, 300);
      }
      p5.noLoop();
      return;
    }
    game = game.run();
    console.log(game.pieces.mapOther(unit => unit));
  }

  p5.background(220);


  // フィールドの描画
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

  // 駒の描画
  game.pieces.forEach((unit) => {
    if (unit.isDead) {
      return;
    }
    drawUnit(unit);
  });

  if (tick === 0) {
    game = game.nextSide();
  }
}

function drawUnit(unit: Unit) {
  const { x, y } = unit.position;
  var baseColor = unit.side === 'friend' ? p5.color(255, 0, 0) : p5.color(0, 0, 255);
  // 攻撃を食らってるときは点滅する
  baseColor = unit.isAttacked && tick % 2 == 0 && tick >= 20 && tick < 40 ? p5.color(255, 255, 255) : baseColor;
  p5.fill(baseColor);

  // 攻撃をしてるとき揺れる
  var attackMotion = tick % 3 == 0 && tick < 20 && unit.state == "attack" ? 4 : 0;

  if (unit.direction == 'up') {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, (y + 1) * GRID_SIZE - attackMotion);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, (y + 1) * GRID_SIZE - attackMotion);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE - attackMotion);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == 'down') {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, y * GRID_SIZE + attackMotion);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE + attackMotion);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, (y + 1) * GRID_SIZE + attackMotion);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == 'left') {
    p5.beginShape();
    p5.vertex((x + 1) * GRID_SIZE - attackMotion, y * GRID_SIZE);
    p5.vertex((x + 1) * GRID_SIZE - attackMotion, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE - attackMotion, y * GRID_SIZE + GRID_SIZE / 2);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == 'right') {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE + attackMotion, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + attackMotion, (y + 1) * GRID_SIZE);
    p5.vertex((x + 1) * GRID_SIZE + attackMotion, y * GRID_SIZE + GRID_SIZE / 2);
    p5.endShape(p5.CLOSE);
  }

  p5.fill(255);
  var word = "";
  if (unit.type == UnitType.Infantry) {
    word = "歩"
  } else if (unit.type == UnitType.King) {
    word = "王"
  } else if (unit.type == UnitType.Cavalry) {
    word = "馬"
  } else if (unit.type == UnitType.Archer) {
    word = "弓"
  }
  p5.text(word, x * GRID_SIZE + GRID_SIZE / 4, y * GRID_SIZE + GRID_SIZE / 2);
}

