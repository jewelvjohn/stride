import './style.css'
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'; 
import {GLTFLoader} from 'three/examples/jsm/Addons.js';
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/Addons.js';

/* 
Current Bugs :-
    -null-
Solved Bugs  :-
    1. Player rotates opposite direction to reach idle rotation when tab refocuses
    2. Input system freezes when tab is unfocused while giving input
 */

//class for storing character data like animations
class Character {
    constructor(model) {
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
        this.actions = {};
        this.activeAction = null;
        this.previousActions = null;
    }

    //start off animation
    startIdle() {
        this.activeAction = this.actions[0];
        this.activeAction.play();
    }

    //transition to another character animation
    playAction(index, duration) {
        if (this.activeAction) {
            this.previousActions = this.activeAction;
            this.activeAction.fadeOut(duration);
        }
        this.activeAction = this.actions[index];
        this.activeAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();
    }
}

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
class InputSystem {
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

let scene, camera, renderer, stats;
let inputSystem, character;
let interfaceRenderer;
let textBubble, textContainer;
let texts = {};
let runToggle;

const runSpeed = 6.6;
const walkSpeed = 2.6;
const positionLerp = 20;
const rotationLerp = 16;

const cameraLerp = 0.1;
const cameraLookAtOffset = new THREE.Vector3(0, 100, 0);
const cameraPositionOffset = new THREE.Vector3(-500, 300, 300);
const talkBubbleOffset = new THREE.Vector3(0, 210, 0);
const walkLimit = new THREE.Vector2(-800, 800);
const interactionPoints = [-500, -200, 200, 500];
const interactionRange = 200;

var runToggleOn = false;
var runningMode = false;
var isPaused = false;
var atWalkLimitX = false;
var atWalkLimitY = false;
var isTextBubbleVisible = false;
var isInteracting = false; 
var interactionId = -1;
var currentInteractionId = -1;

var characterPositionRef = 0;
var cameraPosition = new THREE.Vector3(-500, 300, 300);
var cameraLookAt = new THREE.Vector3(0, 100, 0);
var walkAnimation = false;
var runAnimation = false;

const clock = new THREE.Clock();

function LerpVector3(start, end, t) {
    return new THREE.Vector3(
        THREE.MathUtils.lerp(start.x, end.x, t),
        THREE.MathUtils.lerp(start.y, end.y, t),
        THREE.MathUtils.lerp(start.z, end.z, t)
    );
}

//function used for creating CSS renderer for rendering html elements in the 3D scene
function initializeGUI() {
    interfaceRenderer = new CSS2DRenderer();
    interfaceRenderer.setSize(window.innerWidth, window.innerHeight);
    interfaceRenderer.domElement.style.position = 'absolute';
    interfaceRenderer.domElement.style.top = '0px';
    interfaceRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(interfaceRenderer.domElement);

    const coneDiv = document.createElement('div');
    coneDiv.id = 'textCone';
    const coneImg = document.createElement('img');
    coneImg.src = 'resources/sprites/cone.svg';
    coneDiv.appendChild(coneImg);

    texts[0] = document.createElement('p');
    texts[0].textContent = 'Hello world!';
    texts[1] = document.createElement('p');
    texts[1].textContent = 'How you doin!';
    texts[2] = document.createElement('p');
    texts[2].textContent = 'Sup dude!';
    texts[3] = document.createElement('p');
    texts[3].textContent = 'You smell!';

    textBubble = document.createElement('div');
    textBubble.className = 'talk-bubble';
    textBubble.appendChild(coneDiv);
    textBubble.appendChild(texts[0]);
    textBubble.appendChild(texts[1]);
    textBubble.appendChild(texts[2]);
    textBubble.appendChild(texts[3]);

    const containerDiv = document.createElement('div');
    containerDiv.appendChild(textBubble);

    textContainer = new CSS2DObject(containerDiv);
    scene.add(textContainer);

    //assigning the left and right html buttons to the input system
    document.addEventListener("contextmenu", function (e) {e.preventDefault();}, false);
    const docLeftButton = document.getElementById("leftButton");
    const docRightButton = document.getElementById("rightButton");
    inputSystem.addTouchLeftButton(docLeftButton); 
    inputSystem.addTouchRightButton(docRightButton);

    //creating an event for the run toggle button
    runToggle = document.getElementById("runToggle");
    runToggle.onclick = toggleRunButton;
}

function textBubbleFadeIn() {
    textBubble.animate([
        {
            transform: "translateY(calc(-50% - 10px))",
            opacity: 0,
        },
        {
            transform: "translateY(calc(-50% + 20px))",
            opacity: 1,
        }
    ], {
        duration: 250,
        fill: "forwards",
    })
}

function textBubbleFadeOut() {
    textBubble.animate([
        {
            transform: "translateY(calc(-50% + 20px))",
            opacity: 1,
        },
        {
            transform: "translateY(calc(-50% - 10px))",
            opacity: 0,
        }
    ], {
        duration: 250,
        fill: "forwards",
    })
}

function toggleButtonOn(toggle) {
    toggle.animate([
        {
            transform: "scale(1.0)",
            filter: "invert(0)",
        },
        {
            transform: "scale(1.1)",
            filter: "invert(1)",
        }
    ], {
        duration: 100,
        fill: "forwards",
    })
}

function toggleButtonOff(toggle) {
    toggle.animate([
        {
            transform: "scale(1.1)",
            filter: "invert(1)",
        },
        {
            transform: "scale(1.0)",
            filter: "invert(0)",
        }
    ], {
        duration: 100,
        fill: "forwards",
    })
}

function toggleRunButton() {
    if(runToggleOn) {
        toggleButtonOff(runToggle);
        runningMode = false;
        runToggleOn = false;
    } else {
        toggleButtonOn(runToggle);
        runningMode = true;
        runToggleOn = true;
    }
}

function initializeEnvironment() {
    const geometry = new THREE.BoxGeometry(200, 100, 200);
    const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
    const redBox = new THREE.Mesh(geometry, redMaterial);
    scene.add(redBox);
    redBox.position.set(0, 50, -200);

    const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
    const greenBox = new THREE.Mesh(geometry, greenMaterial);
    scene.add(greenBox);
    greenBox.position.set(0, 50, -500);

    const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
    const blueBox = new THREE.Mesh(geometry, blueMaterial);
    scene.add(blueBox);
    blueBox.position.set(0, 50, 200);

    const yellowMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 });
    const yellowBox = new THREE.Mesh(geometry, yellowMaterial);
    scene.add(yellowBox);
    yellowBox.position.set(0, 50, 500);
}

//loads the player model file
function loadCharacter(filename) {
    const manager = new THREE.LoadingManager();
    const loader = new GLTFLoader(manager);
    loader.load('resources/models/'+filename+'.glb', initializeCharacter);
}

//after player model is loaded it passed to this function to load additional animations
function initializeCharacter(gltf) {
    const model = gltf.scene;
    model.traverse(function(child) {
        if(child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    model.scale.set(50, 50, 50);
    character = new Character(model);

    //after animations are all loaded up the animations mixer is initialized with all the animation clips
    character.actions[0] = character.mixer.clipAction(gltf.animations[1]);
    character.actions[1] = character.mixer.clipAction(gltf.animations[2]);
    character.actions[2] = character.mixer.clipAction(gltf.animations[3]);
    character.startIdle();
    character.model.rotation.y = (1/2) * Math.PI;
    scene.add(character.model);
}

//handles player translation and rotation
function characterMovement(delta) {
    if(!isPaused) {
        //bound character movement
        atWalkLimitX = (characterPositionRef < walkLimit.x) ? true : false;
        atWalkLimitY = (characterPositionRef > walkLimit.y) ? true : false;

        //check if the character position is inside any interaction section
        isInteracting = false;
        for(let i=0; i<interactionPoints.length; i++) {
            if(character.model.position.z < (interactionPoints[i]+(interactionRange/2)) && character.model.position.z > (interactionPoints[i]-(interactionRange/2))) {
                interactionId = i;
                isInteracting = true;
                break;
            }
        }

        //when to walk
        if((atWalkLimitX && inputSystem.inputX > 0) || (atWalkLimitY && inputSystem.inputX < 0) || (!atWalkLimitX && !atWalkLimitY)) {
            if(runningMode) {
                characterPositionRef += (runSpeed * inputSystem.inputX);
            } else {
                characterPositionRef += (walkSpeed * inputSystem.inputX);
            }
        }

        //assign position and rotation according to the input
        character.model.position.z = THREE.MathUtils.lerp(character.model.position.z, characterPositionRef, positionLerp * delta);
        character.model.rotation.y = THREE.MathUtils.lerp(character.model.rotation.y, ((1 - inputSystem.inputX) / 2) * Math.PI, rotationLerp * delta);
    }
}

//change character animation according to input
function characterAnimation() {
    if(Math.abs(inputSystem.inputX) > 0){
        if(!walkAnimation && !runningMode) {
            walkAnimation = true;
            runAnimation = false;
            character.playAction(1, 0.15);
        }
        if(!runAnimation && runningMode) {
            walkAnimation = false;
            runAnimation = true;
            character.playAction(2, 0.15);
        }
    } else {
        if(walkAnimation || runAnimation) {
            walkAnimation = false;
            runAnimation = false;
            character.playAction(0, 0.15);
        }
    }
}

//move camera with player
function cameraMovement() {
    cameraLookAt = LerpVector3(cameraLookAt, character.model.position.clone().add(cameraLookAtOffset), cameraLerp);
    camera.lookAt(cameraLookAt);
    cameraPosition = LerpVector3(cameraPosition, character.model.position.clone().add(cameraPositionOffset), cameraLerp);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
}

//move the html talk bubble with the player
function textBubbleUpdate() {
    if(isInteracting && (interactionId !== currentInteractionId)) {
        currentInteractionId = interactionId;

        for(let i=0; i<Object.keys(texts).length; i++) {
            if(i === currentInteractionId) {
                texts[i].style.display = 'block';
            } else {
                texts[i].style.display = 'none';
            }
        }
    }

    if(isInteracting && !isTextBubbleVisible) {
        textBubbleFadeIn();
        isTextBubbleVisible = true;
    }

    if(!isInteracting && isTextBubbleVisible) {
        textBubbleFadeOut();
        isTextBubbleVisible = false;
    }

    const talkBubblePosition = character.model.position.clone().add(talkBubbleOffset);
    textContainer.position.set(talkBubblePosition.x, talkBubblePosition.y, talkBubblePosition.z);
}

//initializes the whole scene
function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    scene = new THREE.Scene();    
    scene.background = new THREE.Color( 0xa0a0a0 );
    scene.fog = new THREE.Fog( 0xa0a0a0, 400, 2000 );
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(-500, 300, 300);
    camera.rotation.set(0, 0, 0)
    camera.lookAt(0, 100, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);

    stats = new Stats();

    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, 5 );
    hemiLight.position.set( 0, 200, 0 );
    
    const dirLight = new THREE.DirectionalLight( 0xffffff, 5 );
    dirLight.position.set( 0, 200, 100 );
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = - 100;
    dirLight.shadow.camera.left = - 120;
    dirLight.shadow.camera.right = 120;

    const ground = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
    ground.rotation.x = - Math.PI / 2;
    ground.receiveShadow = true;
    
    const grid = new THREE.GridHelper( 2000, 20, 0x000000, 0x000000 );
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    
    scene.add(hemiLight);
    scene.add(dirLight);
    scene.add(ground);
    scene.add(grid);

    window.addEventListener('resize', onWindowResize);
    
    loadCharacter('character');
    inputSystem = new InputSystem();
    container.appendChild(renderer.domElement);
    container.appendChild(stats.dom);

    window.addEventListener('blur',() => { isPaused = true; });
    window.addEventListener('focus',() => { isPaused = false; });

    initializeEnvironment();
    initializeGUI();
}

//resize event used for resizing camera and renderer when window is resized
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    interfaceRenderer.setSize(this.window.innerWidth, this.window.innerHeight);
}

//game loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    interfaceRenderer.render(scene, camera);
    const delta = clock.getDelta();
    stats.update();
    
    if(character){
        character.mixer.update(delta);
        characterMovement(delta);
        characterAnimation();
        textBubbleUpdate();
        cameraMovement();
    }
}

init();
animate();