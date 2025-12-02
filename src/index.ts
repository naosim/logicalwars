import { LogicalWar, Unit, UnitType } from "./domain/LogicalWar.ts";
const GRID_SIZE = 32;
const p5: any = window;
var game = LogicalWar.init();
p5.setup = function () {
  p5.createCanvas(400, 400);
}
var tick = 0;
p5.draw = function () {
  if (game.isGameOver()) {
    p5.noLoop()
    return;
  }
  tick = (tick + 1) % 60;
  if (tick === 0) {
    game = game.run().check().nextSide();
    console.log(game.pieces.mapOther(unit => unit.status));
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
}

function drawUnit(unit: Unit) {
  const { x, y } = unit.position;
  var baseColor = unit.side === 'friend' ? p5.color(255, 0, 0) : p5.color(0, 0, 255);
  // 攻撃を食らってるときは点滅する
  baseColor = unit.isAttacked && tick % 2 == 0 ? p5.color(255, 255, 255) : baseColor;
  p5.fill(baseColor);

  if (unit.direction == 'up') {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == 'down') {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, (y + 1) * GRID_SIZE);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == 'left') {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE);
    p5.endShape(p5.CLOSE);
  } else if (unit.direction == 'right') {
    p5.beginShape();
    p5.vertex(x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE, (y + 1) * GRID_SIZE);
    p5.vertex(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE);
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


  // if (unit.side === 'friend') {

  //   p5.fill(255);
  //   // p5.rect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
  //   if (unit.type == UnitType.Infantry) {
  //     p5.fill(0);
  //     p5.text("歩", x * GRID_SIZE, y * GRID_SIZE);
  //   }
  // } else if (unit.side === 'enemy') {
  //   p5.fill(0);
  //   p5.rect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
  // }
}

