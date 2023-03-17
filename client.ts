// This is browser code that gets transformed using Parcel/Babel
// Therefore you can now use ES6 style imports

import * as Phaser from "phaser";

interface ICoords {
  [key: string]: {
    x: number;
    y: number;
    frame: number;
  }
}

function uuid(
  a?: any               // placeholder
): string {
  return a              // if the placeholder was passed, return
    ? (                 // a random number from 0 to 15
      a ^               // unless b is 8,
      Math.random()     // in which case
      * 16              // a random number from
      >> a / 4          // 8 to 11
    ).toString(16)      // in hexadecimal
    : (                 // or otherwise a concatenated string:
      1e7.toString() +  // 10000000 +
      -1e3 +            // -1000 +
      -4e3 +            // -4000 +
      -8e3 +            // -80000000 +
      -1e11             // -100000000000,
    ).replace(          // replacing
      /[018]/g,         // zeroes, ones, and eights with
      uuid              // random hex digits
    )
}

class GameScene extends Phaser.Scene {
  private HOST = window.location.hostname; // localhost and 127.0.0.1 handled
  private PORT = 8080; // change this if needed

  private wsClient?: WebSocket;
  // private sprite?: Phaser.GameObjects.Sprite;

  private id = uuid();
  private players: {[key: string]: Phaser.GameObjects.Sprite} = {};

  constructor() { super({ key: "GameScene" }); }

  /**
   * Load the assets required by the scene
   */
  public preload() {
    this.load.image("bunny", "static/bunny.png");
  }

  /**
   * Instantiate the private variables required by the scene
   */
  public init() {
    // Initialize the websocket client
    this.wsClient = new WebSocket(`ws://${this.HOST}:${this.PORT}`);
    this.wsClient.onopen = (event) => {
      // After the websocket is open, set interactivtiy
      console.log(event);

      // Start of the drag event (mouse click down)
      this.input.on("dragstart", (
        _: Phaser.Input.Pointer,
        gObject: Phaser.GameObjects.Sprite
      ) => {
        gObject.setTint(0xff0000);
      });

      // During the drag event (mouse movement)
      this.input.on("drag", (
        _: Phaser.Input.Pointer,
        gObject: Phaser.GameObjects.Sprite,
        dragX: number,
        dragY: number
      ) => {
        gObject.x = dragX;
        gObject.y = dragY;
        this.wsClient!.send(JSON.stringify({ x: gObject.x, y: gObject.y }));
      });

      // End of the drag event (mouse click up)
      this.input.on("dragend", (
        _: Phaser.Input.Pointer,
        gObject: Phaser.GameObjects.Sprite
      ) => {
        gObject.clearTint();
        this.wsClient!.send(JSON.stringify({ x: gObject.x, y: gObject.y }));
      });
    }

    this.wsClient.onmessage = (wsMsgEvent) => {
      const allCoords: ICoords = JSON.parse(wsMsgEvent.data);
      for (const playerId of Object.keys(allCoords)) {
        if (playerId === this.id) {
          // we don't need to update ourselves
          continue;
        }
        const { x, y, frame } = allCoords[playerId];
        if (playerId in this.players) {
          // We have seen this player before, update it!
          const player = this.players[playerId];
          if (player.texture.key === "__MISSING") {
            // Player was instantiated before texture was ready, reinstantiate
            player.destroy();
            this.players[playerId] = this.add.sprite(x, y, "player", frame);
          } else {
            player.setX(x);
            player.setY(y);
            player.setFrame(frame);  
          }
        } else {
          // We have not seen this player before, create it!
          this.players[playerId] = this.add.sprite(x, y, "player", frame);
        }
      }
    }
  }

  /**
   * Create the game objects required by the scene
   */
  public create() {
    // Create an interactive, draggable bunny sprite
    // this.sprite = this.add.sprite(100, 100, "bunny");
    // this.sprite.setInteractive();
    // this.input.setDraggable(this.sprite);
    this.players[this.id] = this.physics.add.sprite(48, 48, "player", 1);
    this.physics.add.collider(this.players[this.id], layer);
    this.cameras.main.startFollow(this.players[this.id]);
  }

  // update
  public update() {
    let moving = false;

    for (const playerId of Object.keys(this.players)) {
      const player = this.players[playerId];
  
      if (playerId !== this.id) {
        player.setTint(0x0000aa); // so we can tell our guy apart
        player.update();
        continue;
      }

    if (this.leftKey && this.leftKey.isDown) {
      (player.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.VELOCITY);
      player.play("left", true);
      moving = true;
    }
    if (!moving) {
      (player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      player.anims.stop();
    } else if (this.wsClient) {
      this.wsClient.send(JSON.stringify({
        id: this.id,
        x: player.x,
        y: player.y,
        frame: player.frame.name
      }));
    }
    player.update();
}


// Phaser configuration variables
const config: GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  scene: [GameScene]
};

class LabDemoGame extends Phaser.Game {
  constructor(config: GameConfig) {
    super(config);
  }
}

window.addEventListener("load", () => {
  new LabDemoGame(config);
})