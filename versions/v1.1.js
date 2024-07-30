import './style.css'
import * as THREE from 'three' 
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/Addons.js';

class Character {
    constructor(model) {
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
        this.actions = {};
        this.activeAction = null;
        this.previousActions = null;
    }

    startIdle() {
        this.activeAction = this.actions[0];
        this.activeAction.play();
    }

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

class MyCustomKeyboardEvent extends CustomEvent {
    constructor(type, options) {
        super(type, options);
        if (options && options.key) {
            this.key = options.key;
        }
    }
}

class InputSystem {
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
    
    inputStart(event) {
        if(!this.leftKeyInput && (event.key === 'a' || event.key === 'ArrowLeft' || event.key === 'TouchLeftButton')) {
            this.inputX -= 1;     
            this.leftKeyInput = true;
        } else if(!this.rightKeyInput && (event.key === 'd' || event.key === 'ArrowRight' || event.key === 'TouchRightButton')) {
            this.inputX += 1;                 
            this.rightKeyInput = true;
        }
    }
    
    inputEnd(event) {
        if(this.leftKeyInput && (event.key === 'a' || event.key === 'ArrowLeft' || event.key === 'TouchLeftButton')) {
            this.inputX += 1;                 
            this.leftKeyInput = false;
        } else if(this.rightKeyInput && (event.key === 'd' || event.key === 'ArrowRight' || event.key === 'TouchRightButton')) {
            this.inputX -= 1;
            this.rightKeyInput = false;
        }
    }

    addTouchLeft(touchLeft) {
        this.touchLeft = touchLeft;
        this.isTouchLeftHeld = false;
        ['mousedown', 'touchstart'].forEach(type => {
            this.touchLeft.addEventListener(type, this.onTouchLeftHoldStart.bind(this));
        });
        ['mouseup', 'mouseleave', 'touchend', 'touchcanel'].forEach(type => {
            this.touchLeft.addEventListener(type, this.onTouchLeftHoldEnd.bind(this));
        });
    }

    addTouchRight(touchRight) {
        this.touchRight = touchRight;
        this.isTouchRightHeld = false;
        ['mousedown', 'touchstart'].forEach(type => {
            this.touchRight.addEventListener(type, this.onTouchRightHoldStart.bind(this));
        });
        ['mouseup', 'mouseleave', 'touchend', 'touchcanel'].forEach(type => {
            this.touchRight.addEventListener(type, this.onTouchRightHoldEnd.bind(this));
        });
    }

    onTouchLeftHoldStart() {
        this.isTouchLeftHeld = true;
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', {
            key: 'TouchLeftButton'
        });
        this.inputStart(buttonEvent);
    }
    onTouchRightHoldStart() {
        this.isTouchRightHeld = true;
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', {
            key: 'TouchRightButton'
        });
        this.inputStart(buttonEvent);
    }
    
    onTouchLeftHoldEnd() {
        this.isTouchLeftHeld = false;
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', {
            key: 'TouchLeftButton'
        });
        this.inputEnd(buttonEvent);
    }
    onTouchRightHoldEnd() {
        this.isTouchRightHeld = false;
        const buttonEvent = new MyCustomKeyboardEvent('touchbutton', {
            key: 'TouchRightButton'
        });
        this.inputEnd(buttonEvent);
    }
}

let scene, camera, renderer;
let inputSystem, character;
let interfaceRenderer;

const playerSpeed = 2.4;
const positionLerp = 20;
const rotationLerp = 10;

const cameraLerp = 0.1;
const cameraLookAtOffset = new THREE.Vector3(0, 100, 0);
const cameraPositionOffset = new THREE.Vector3(-500, 300, 300);

var characterPositionRef = 0;
var cameraPosition = new THREE.Vector3(-500, 300, 300);
var walkAnimation = false;

const clock = new THREE.Clock();

function LerpVector3(start, end, t) {
    return new THREE.Vector3(
        THREE.MathUtils.lerp(start.x, end.x, t),
        THREE.MathUtils.lerp(start.y, end.y, t),
        THREE.MathUtils.lerp(start.z, end.z, t)
    );
}

function initializeGUI() {
    interfaceRenderer = new CSS2DRenderer();
    interfaceRenderer.setSize(window.innerWidth, window.innerHeight);
    interfaceRenderer.domElement.style.position = 'absolute';
    interfaceRenderer.domElement.style.top = '0px';
    interfaceRenderer.domElement.style.pointerEvents = 'none';

    document.body.appendChild(interfaceRenderer.domElement);
    
    const docLeftButton = document.getElementById("leftButton");
    const docRightButton = document.getElementById("rightButton");
    
    inputSystem.addTouchLeft(docLeftButton); 
    inputSystem.addTouchRight(docRightButton);
}

function loadCharacter(filename) {
    const manager = new THREE.LoadingManager();
    const loader = new FBXLoader(manager);
    loader.load('resources/models/'+filename+'.fbx', initializeCharacter);
}

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

function initializeCharacterAnimations(walk) {
    character.actions[0] = character.mixer.clipAction(character.model.animations[0]);
    character.actions[1] = character.mixer.clipAction(walk.animations[0]);
    character.startIdle()
    character.model.rotation.y = (1/2) * Math.PI;
    scene.add(character.model);
}

function characterMovement(delta) {
    characterPositionRef += (playerSpeed * inputSystem.inputX);
    character.model.position.z = THREE.MathUtils.lerp(character.model.position.z, characterPositionRef, positionLerp * delta);
    character.model.rotation.y = THREE.MathUtils.lerp(character.model.rotation.y, ((1-inputSystem.inputX)/2)* Math.PI, rotationLerp * delta);
}

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

function cameraMovement() {
    camera.lookAt(character.model.position.clone().add(cameraLookAtOffset));
    cameraPosition = LerpVector3(cameraPosition, character.model.position.clone().add(cameraPositionOffset), cameraLerp);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
}

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

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    interfaceRenderer.setSize(this.window.innerWidth, this.window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    interfaceRenderer.render(scene, camera);
    const delta = clock.getDelta();

    if(character){
        character.mixer.update(delta);
        characterMovement(delta);
        characterAnimation();
        cameraMovement();
    }
}

init();
animate();