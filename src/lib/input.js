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
        this.axes = {
            horizontal: 0,
            vertical: 0,
            jump: 0
        };
        this.keys = new Set();
        this.runToggle = null;
        this.touchLeft = null;
        this.touchRight = null;
        this.isRunToggle = true;
        this.isTouchLeftHeld = false;
        this.isTouchRightHeld = false;

        const docLeftButton = document.getElementById("leftButton");
        const docRightButton = document.getElementById("rightButton");
        
        this.addTouchLeftButton(docLeftButton); 
        this.addTouchRightButton(docRightButton);

        //bind keyboard input events
        document.addEventListener('keydown', this.inputStart.bind(this));
        document.addEventListener('keyup', this.inputEnd.bind(this));
        //cancel all inputs when tab is unfocused
        window.addEventListener('blur', this.cancelAllInputs.bind(this));
    }

    inputStart(event) {
        this.keys.add((event.key).toLowerCase());
        this.updateAxes();
    }

    inputEnd(event) {
        this.keys.delete((event.key).toLowerCase());
        this.updateAxes();
    }

    updateAxes() {
        if((this.keys.has('a') || this.keys.has('arrowleft') || this.keys.has('touchleftbutton')) && !(this.keys.has('d') || this.keys.has('arrowright') || this.keys.has('touchrightbutton'))) {
            this.axes.horizontal = -1;
        } else if((this.keys.has('d') || this.keys.has('arrowright') || this.keys.has('touchrightbutton')) && !(this.keys.has('a') || this.keys.has('arrowleft') || this.keys.has('touchleftbutton'))) {
            this.axes.horizontal = 1;
        } else {
            this.axes.horizontal = 0;
        }
    }
    
    //methods used for calling input start and input end methods when player interacts with html buttons  
    onTouchLeftHoldStart() {
        if(!this.isTouchLeftHeld) {
            this.isTouchLeftHeld = true;
            this.buttonPressedAnimation(this.touchLeft)
            const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchLeftButton' });
            this.inputStart(buttonEvent);
        }
    }
    onTouchRightHoldStart() {
        if(!this.isTouchRightHeld) {
            this.isTouchRightHeld = true;
            this.buttonPressedAnimation(this.touchRight)
            const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchRightButton' });
            this.inputStart(buttonEvent);
        }
    }
    onTouchLeftHoldEnd() {
        if(this.isTouchLeftHeld) {
            this.buttonReleasedAnimation(this.touchLeft)   
            this.isTouchLeftHeld = false;
            const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchLeftButton' });
            this.inputEnd(buttonEvent);
        }
    }
    onTouchRightHoldEnd() {
        if(this.isTouchRightHeld) {
            this.buttonReleasedAnimation(this.touchRight)
            this.isTouchRightHeld = false;
            const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchRightButton' });
            this.inputEnd(buttonEvent);
        }
    }

    //set all input to zero
    cancelAllInputs() {
        this.axes.vertical = 0;
        this.axes.horizontal = 0;
        this.keys = new Set();
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
        ['mouseup', 'mouseleave', 'touchend', 'touchcanel', 'touch'].forEach(type => {
            this.touchRight.addEventListener(type, this.onTouchRightHoldEnd.bind(this));
        });
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