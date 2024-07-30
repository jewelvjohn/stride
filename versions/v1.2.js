import './style.css'
import * as THREE from 'three' 
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/Addons.js';

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

        document.addEventListener('keydown', this.inputStart.bind(this));
        document.addEventListener('keyup', this.inputEnd.bind(this));
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

    //methods used to add html buttons to the input system
    addTouchLeftButton(touchLeft) {
        this.touchLeft = touchLeft;
        this.isTouchLeftHeld = false;
        ['mousedown', 'touchstart'].forEach(type => {
            this.touchLeft.addEventListener(type, this.onTouchLeftHoldStart.bind(this));
        });
        ['mouseup', 'mouseleave', 'touchend', 'touchcanel'].forEach(type => {
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
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchLeftButton' });
        this.inputStart(buttonEvent);
    }
    onTouchRightHoldStart() {
        this.isTouchRightHeld = true;
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchRightButton' });
        this.inputStart(buttonEvent);
    }
    onTouchLeftHoldEnd() {
        this.isTouchLeftHeld = false;
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchLeftButton' });
        this.inputEnd(buttonEvent);
    }
    onTouchRightHoldEnd() {
        this.isTouchRightHeld = false;
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', { key: 'TouchRightButton' });
        this.inputEnd(buttonEvent);
    }
}

let scene, camera, renderer;
let inputSystem, character;
let interfaceRenderer;
let talkContainer;

const playerSpeed = 2.4;
const positionLerp = 20;
const rotationLerp = 8;

const cameraLerp = 0.05;
const cameraLookAtOffset = new THREE.Vector3(0, 100, 0);
const cameraPositionOffset = new THREE.Vector3(-500, 300, 300);
const talkBubbleOffset = new THREE.Vector3(0, 210, 0);
const walkLimit = new THREE.Vector2(-800, 800);

var atWalkLimitX = false;
var atWalkLimitY = false;

var characterPositionRef = 0;
var cameraPosition = new THREE.Vector3(-500, 300, 300);
var cameraLookAt = new THREE.Vector3(0, 100, 0);
var walkAnimation = false;

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

    const text = document.createElement('p');
    text.textContent = 'Hello World!';

    const talkBubble = document.createElement('div');
    talkBubble.className = 'talk-bubble';
    talkBubble.appendChild(coneDiv);
    talkBubble.appendChild(text);

    const containerDiv = document.createElement('div');
    containerDiv.appendChild(talkBubble);

    talkContainer = new CSS2DObject(containerDiv);
    scene.add(talkContainer);

    //assigning the left and right html buttons to the input system
    const docLeftButton = document.getElementById("leftButton");
    const docRightButton = document.getElementById("rightButton");
    inputSystem.addTouchLeftButton(docLeftButton); 
    inputSystem.addTouchRightButton(docRightButton);
}

//loads the player model file
function loadCharacter(filename) {
    const manager = new THREE.LoadingManager();
    const loader = new FBXLoader(manager);
    loader.load('resources/models/'+filename+'.fbx', initializeCharacter);
}

//after player model is loaded it passed to this function to load additional animations
function initializeCharacter(model) {
    model.traverse(function(child) {
        if(child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    character = new Character(model);
    const anim = new FBXLoader();
    anim.load('resources/models/walking.fbx', initializeCharacterAnimations);
}

//after animations are all loaded up the animations mixer is initialized with all the animation clips
function initializeCharacterAnimations(walk) {
    character.actions[0] = character.mixer.clipAction(character.model.animations[0]);
    character.actions[1] = character.mixer.clipAction(walk.animations[0]);
    character.startIdle()
    character.model.rotation.y = (1/2) * Math.PI;
    scene.add(character.model);
}

//handles player translation and rotation
function characterMovement(delta) {
    //bound character movement
    atWalkLimitX = (characterPositionRef < walkLimit.x) ? true : false;
    atWalkLimitY = (characterPositionRef > walkLimit.y) ? true : false;

    //when to walk
    if((atWalkLimitX && inputSystem.inputX > 0) || (atWalkLimitY && inputSystem.inputX < 0) || (!atWalkLimitX && !atWalkLimitY)) {
        characterPositionRef += (playerSpeed * inputSystem.inputX);
    }

    //assign position and rotation according to the input
    character.model.position.z = THREE.MathUtils.lerp(character.model.position.z, characterPositionRef, positionLerp * delta);
    character.model.rotation.y = THREE.MathUtils.lerp(character.model.rotation.y, ((1-inputSystem.inputX)/2)* Math.PI, rotationLerp * delta);
}

//change character animation according to input
function characterAnimation() {
    if(Math.abs(inputSystem.inputX) > 0){
        if(!walkAnimation) {
            walkAnimation = true;
            character.playAction(1, 0.2);
        }
    } else {
        if(walkAnimation) {
            walkAnimation = false;
            character.playAction(0, 0.2);
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
function talkBubbleUpdate() {
    const talkBubblePosition = character.model.position.clone().add(talkBubbleOffset);
    talkContainer.position.set(talkBubblePosition.x, talkBubblePosition.y, talkBubblePosition.z);
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
    
    if(character){
        character.mixer.update(delta);
        characterMovement(delta);
        characterAnimation();
        talkBubbleUpdate();
        cameraMovement();
    }
}

init();
animate();