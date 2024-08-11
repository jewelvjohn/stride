//custom event used in input system to check html button interaction
class MyCustomKeyboardEvent extends CustomEvent {
    constructor(type, options) {
        super(type, options);
        if (options && options.key) {
            this.key = options.key;
        }
    }
}

//class used for taking player input through keyboard & html buttons
export class InputSystem {
    //constructor creates event listeners for keyboard buttons
    constructor() {
        this.inputX = 0;
        this.leftKeyInput = false;
        this.rightKeyInput = false;
        this.touchLeft = null;
        this.touchRight = null;
        this.isTouchLeftHeld = false;
        this.isTouchRightHeld = false;

        //bind keyboard input events
        document.addEventListener('keydown', this.inputStart.bind(this));
        document.addEventListener('keyup', this.inputEnd.bind(this));
        //cancel all inputs when tab is unfocused
        window.addEventListener('blur', this.cancelAllInputs.bind(this));
    }
    
    //methods used for normalizing different inputs into a single axis (inputX)
    //recognises player key down or press 
    inputStart(event) {
        if(!this.leftKeyInput && (event.key === 'a' || event.key === 'ArrowLeft' || event.key === 'TouchLeftButton')) {
            this.inputX -= 1;     
            this.leftKeyInput = true;
        } else if(!this.rightKeyInput && (event.key === 'd' || event.key === 'ArrowRight' || event.key === 'TouchRightButton')) {
            this.inputX += 1;                 
            this.rightKeyInput = true;
        }
    }
    
    //recognises player key up or release
    inputEnd(event) {
        if(this.leftKeyInput && (event.key === 'a' || event.key === 'ArrowLeft' || event.key === 'TouchLeftButton')) {
            this.inputX += 1;                 
            this.leftKeyInput = false;
        } else if(this.rightKeyInput && (event.key === 'd' || event.key === 'ArrowRight' || event.key === 'TouchRightButton')) {
            this.inputX -= 1;
            this.rightKeyInput = false;
        }
    }

    //set all input to zero
    cancelAllInputs(event) {
        if(this.rightKeyInput || this.leftKeyInput || this.isTouchRightHeld || this.isTouchLeftHeld) {
            this.inputX = 0;                 
            this.rightKeyInput = false;
            this.leftKeyInput = false;
            this.isTouchRightHeld = false;
            this.isTouchLeftHeld = false;
        }
    }

    //methods used to add html buttons to the input system
    addTouchLeftButton(touchLeft) {
        this.touchLeft = touchLeft;
        this.isTouchLeftHeld = false;
        ['mousedown', 'touchstart'].forEach(type => {
            this.touchLeft.addEventListener(type, this.onTouchLeftHoldStart.bind(this));
        });
        ['mouseup', 'mouseleave', 'touchend', 'touchcanel', 'touch'].forEach(type => {
            this.touchLeft.addEventListener(type, this.onTouchLeftHoldEnd.bind(this));
        });
    }
    addTouchRightButton(touchRight) {
        this.touchRight = touchRight;
        this.isTouchRightHeld = false;
        ['mousedown', 'touchstart'].forEach(type => {
            this.touchRight.addEventListener(type, this.onTouchRightHoldStart.bind(this));
        });
        ['mouseup', 'mouseleave', 'touchend', 'touchcanel'].forEach(type => {
            this.touchRight.addEventListener(type, this.onTouchRightHoldEnd.bind(this));
        });
    }

    //methods used for calling input start and input end methods when player interacts with html buttons  
    onTouchLeftHoldStart() {
        this.isTouchLeftHeld = true;
        this.buttonPressedAnimation(this.touchLeft)
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchLeftButton' });
        this.inputStart(buttonEvent);
    }
    onTouchRightHoldStart() {
        this.isTouchRightHeld = true;
        this.buttonPressedAnimation(this.touchRight)
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchRightButton' });
        this.inputStart(buttonEvent);
    }
    onTouchLeftHoldEnd() {
        if(this.isTouchLeftHeld) {
            this.buttonReleasedAnimation(this.touchLeft)   
            this.isTouchLeftHeld = false;
        }
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchLeftButton' });
        this.inputEnd(buttonEvent);
    }
    onTouchRightHoldEnd() {
        if(this.isTouchRightHeld) {
            this.buttonReleasedAnimation(this.touchRight)
            this.isTouchRightHeld = false;
        }
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchRightButton' });
        this.inputEnd(buttonEvent);
    }

    buttonPressedAnimation(button) {
        button.animate([
            {
                transform: "scale(1)",
            },
            {
                transform: "scale(1.1)",
            }
        ], {
            duration: 100,
            fill: "forwards",
        })
    }

    buttonReleasedAnimation(button) {
        button.animate([
            {
                transform: "scale(1.1)",
            },
            {
                transform: "scale(1)",
            }
        ], {
            duration: 100,
            fill: "forwards",
        })
    }
}