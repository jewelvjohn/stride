import './styles/main.css'
import './styles/loading.css'
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'; 
import {GLTFLoader} from 'three/examples/jsm/Addons.js';
import {OutlineEffect} from 'three/addons/effects/OutlineEffect.js';
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/Addons.js';

import {Stage} from './lib/stage.js';
import {InputSystem} from './lib/input.js';
import {CharacterController} from './lib/character.js';
import {InteractionContainer} from './lib/interaction.js';

/* 
    Current Bugs :-
    --null--
    Solved Bugs  :-
    1. Player rotates opposite direction to reach idle rotation when tab refocuses
    2. Input system freezes when tab is unfocused while giving input
    3. Movement glitch when a keyboard input is used while the mouse pointer leave the same control button
    4. The movement speed changes with the frame rate
    5. Input system freezes when modifier keys are held
    6. Mobile button buzz when held pressed
    7. Sub-pages have problem accessing js files after deployment
 */

let scene, camera, renderer, effect, stats, canvas;
let player, inputSystem, interactionContainer;
let interfaceRenderer;
let textBubble, textContainer;
let loadingScreen, loadingBar, loadingText, startButton;

const talkBubbleOffset = new THREE.Vector3(0, 200, 0);
const cameraLookAtOffset = new THREE.Vector3(0, 125, 0);
const cameraPositionOffset = new THREE.Vector3(-600, 150, 0);

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

var stages = [];
var currentStage = -1;
var highEndGraphics = true;
var isTextBubbleVisible = false;
var isInteracting = false; 
var interactionId = -1;
var currentInteractionId = -1;
var cameraLookAt = cameraLookAtOffset;
var cameraPosition = cameraPositionOffset;

const loadingManager = new THREE.LoadingManager();
const clock = new THREE.Clock();

function isMobile() {
    return (/Android|iphone/i.test(navigator.userAgent));
}

function isTouch() {
    return (navigator.maxTouchPoints > 0);
}

function lerpVector3(start, end, t) {
    return new THREE.Vector3(
        THREE.MathUtils.lerp(start.x, end.x, t),
        THREE.MathUtils.lerp(start.y, end.y, t),
        THREE.MathUtils.lerp(start.z, end.z, t)
    );
}

//function used for creating CSS renderer for rendering html elements in the 3D scene
function initializeGUI() {
    interfaceRenderer = new CSS2DRenderer();
    interfaceRenderer.setSize(sizes.width, sizes.height);
    interfaceRenderer.domElement.style.position = 'fixed';
    interfaceRenderer.domElement.style.top = '0px';
    document.body.appendChild(interfaceRenderer.domElement);

    interactionContainer = new InteractionContainer();
    interactionContainer.addInteractionPoint({
        message: '<p>Beautiful painting!</p>',
        position: -800,
        light: false,
        focus: true,
        range: 200
    });
    interactionContainer.addInteractionPoint({
        message: '<p>This website was developed using <span class="highlight">three.js</span>, <span class="highlight">vite</span> and <span class="highlight">blender</span></p>',
        position: -400,
        light: false,
        focus: true,
        range: 200
    });
    interactionContainer.addInteractionPoint({
        message: '<p>Use keyboard arrows, A, D or <, > buttons to move</p>',
        position: 0,
        light: false,
        focus: true,
        range: 200
    });
    interactionContainer.addInteractionPoint({
        message: '<p><span class="highlight">Burny Rush</span> is a high fidelity racing game developed in unity</p>',
        position: 400,
        light: false,
        focus: true,
        range: 200
    });
    interactionContainer.addInteractionPoint({
        message: '<p>Should I go ahead?</p><a class="talkbubble-link" href="./about/"><i>Go Ahead</i></a>',
        position: 800,
        light: false,
        focus: true,
        range: 200
    });

    textBubble = document.createElement('div');
    textBubble.className = 'talkbubble';
    textBubble.style.pointerEvents = 'none';

    const triangle = document.createElement('div');
    triangle.id = 'triangle';
    textBubble.appendChild(triangle);

    interactionContainer.points.forEach(point => {
        textBubble.appendChild(point.text);
    });

    const containerDiv = document.createElement('div');
    containerDiv.appendChild(textBubble);

    textContainer = new CSS2DObject(containerDiv);
    scene.add(textContainer);

    //assigning the left and right html buttons to the input system
    document.addEventListener("contextmenu", function (e) {e.preventDefault();}, false);
}

function textBubbleFadeIn() {
    textBubble.animate([
        {
            transform: "translateY(calc(-50% - 20px))",
            pointerEvents: 'none',
            opacity: 0,
        },
        {
            transform: "translateY(calc(-50% + 10px))",
            pointerEvents: 'auto',
            opacity: 1,
        }
    ], {
        duration: 150,
        fill: "forwards",
    })
}

function textBubbleFadeOut() {
    textBubble.animate([
        {
            transform: "translateY(calc(-50% + 10px))",
            pointerEvents: 'auto',
            opacity: 1,
        },
        {
            transform: "translateY(calc(-50% - 20px))",
            pointerEvents: 'none',
            opacity: 0,
        }
    ], {
        duration: 150,
        fill: "forwards",
    })
}

//move the html talk bubble with the player
function textBubbleUpdate() {
    //check if the character position is inside any interaction section
    isInteracting = false;
    player.interactionMode = false;
    for(let i=0; i<interactionContainer.points.length; i++) {
        if(player.model.position.z < interactionContainer.points[i].upperBound() && player.model.position.z > interactionContainer.points[i].lowerBound()) {
            interactionId = i;
            isInteracting = true;
            if(interactionContainer.points[i].focus) player.interactionMode = true;
            break;
        }
    }

    if(isInteracting && (interactionId !== currentInteractionId)) {
        currentInteractionId = interactionId;

        for(let i=0; i<interactionContainer.points.length; i++) {
            if(i === currentInteractionId) interactionContainer.points[i].text.style.display = 'flex';
            else interactionContainer.points[i].text.style.display = 'none';
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

    const talkBubblePosition = player.model.position.clone().add(talkBubbleOffset);
    textContainer.position.set(talkBubblePosition.x, talkBubblePosition.y, talkBubblePosition.z);
}

function loadEnvironment() {
    const gridHelper = new THREE.GridHelper(2000, 40);
    scene.add(gridHelper);

    const ground = new THREE.BoxGeometry(2000, 200, 2000);
    const box = new THREE.BoxGeometry(200, 100, 200, 10, 10, 10);

    const yellow = new THREE.MeshStandardMaterial({color: 0xFF69B4});
    const yellowGround = new THREE.Mesh(ground, yellow);
    const yellowBox = new THREE.Mesh(box, yellow);
    yellowGround.position.set(500, -100, -800);
    yellowBox.position.set(200, 50, -800);

    const red = new THREE.MeshStandardMaterial({color: 0xFFD700});
    const redGround = new THREE.Mesh(ground, red);
    const redBox = new THREE.Mesh(box, red);
    redGround.position.set(500, -100, -400);
    redBox.position.set(200, 50, -400);
    
    const green = new THREE.MeshStandardMaterial({color: 0x008000});
    const greenGround = new THREE.Mesh(ground, green);
    const greenBox = new THREE.Mesh(box, green);
    greenGround.position.set(500, -100, 0);
    greenBox.position.set(200, 50, 0);
    
    const blue = new THREE.MeshStandardMaterial({color: 0x00FFFF});
    const blueGround = new THREE.Mesh(ground, blue);
    const blueBox = new THREE.Mesh(box, blue);
    blueGround.position.set(500, -100, 400);
    blueBox.position.set(200, 50, 400);

    const purple = new THREE.MeshStandardMaterial({color: 0x800080});
    const purpleGround = new THREE.Mesh(ground, purple);
    const purpleBox = new THREE.Mesh(box, purple);
    purpleGround.position.set(500, -100, 800);
    purpleBox.position.set(200, 50, 800);

    const stage1 = new Stage(scene);
    const stage2 = new Stage(scene);
    const stage3 = new Stage(scene);
    const stage4 = new Stage(scene);
    const stage5 = new Stage(scene);

    stage1.addObject(yellowGround);
    stage1.addObject(yellowBox);
    stage2.addObject(redGround);
    stage2.addObject(redBox);
    stage3.addObject(greenGround);
    stage3.addObject(greenBox);
    stage4.addObject(blueGround);
    stage4.addObject(blueBox);
    stage5.addObject(purpleGround);
    stage5.addObject(purpleBox);

    stages.push(stage1, stage2, stage3, stage4, stage5);
}

function selectStage(index) {
    if(index !== currentStage) {
        for(let i=0; i<stages.length; i++) {
            if(i === index) {
                if(!stages[i].isActive) { stages[i].showStage(); }
            } else {
                if(stages[i].isActive) { stages[i].hideStage(); }
            }
        }
        currentStage = index;
    }
}

function updateStages() {
    const position = player.model.position.z;

    if(position <= -600) {
        selectStage(0);
    } else if(position <= -200) {
        selectStage(1);
    } else if(position <= 200) {
        selectStage(2);
    } else if(position <= 600) {
        selectStage(3);
    } else {
        selectStage(4);
    }
}

//lighting
function initializeLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444400, 1);
    hemiLight.position.set(0, 200, 0);
    const color = 0xfffae6;
    const dirLight = new THREE.DirectionalLight(color, 3);
    dirLight.position.set(-200, 200, -100);
    dirLight.target.position.set(0, 0, 0);
    scene.add(hemiLight);
    scene.add(dirLight);
    scene.add(dirLight.target);
    
    // renderer.shadowMap.type = THREE.BasicShadowMap;
    // renderer.shadowMap.enabled = false;
}

//move camera with player
function cameraMovement() {
    cameraLookAt = player.model.position.clone().add(cameraLookAtOffset);
    cameraPosition = player.model.position.clone().add(cameraPositionOffset);
    camera.lookAt(cameraLookAt);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
}

//initializes the whole scene
function init() {
    loadingScreen = document.querySelector('#loading-screen');
    loadingBar = document.querySelector('#loading-bar');
    loadingText = document.querySelector('#loading-text');
    
    startButton = document.querySelector('#start-button');
    startButton.disabled = true;
    startButton.onclick = () => {
        player.startIdle();
        loadingScreen.style.display = 'none' 
    }

    canvas = document.querySelector('canvas.webgl');
    if(!isMobile()) highEndGraphics = true;
    // if(!isTouch()) document.querySelector('div.touch-inputs').style.display = 'none';
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x909090);
    scene.fog = new THREE.Fog(scene.background, 750, 2000);
    
    camera = new THREE.PerspectiveCamera(30, sizes.width / sizes.height, 1, 2000);
    camera.position.set(cameraPositionOffset);
    camera.lookAt(cameraLookAtOffset);
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        canvas: canvas
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(sizes.width, sizes.height);
    renderer.render(scene, camera);
    
    stats = new Stats();
    document.body.appendChild(stats.dom);
    window.addEventListener('resize', onWindowResize);
    
    player = new CharacterController('./resources/3d/high-end/character v2.glb', scene, loadingManager, -1000, 1000);
    inputSystem = new InputSystem();
    
    effect = new OutlineEffect(renderer, {
        defaultThickness: 0.002,
        defaultColor: [0, 0, 0]
    });

    loadingManager.onProgress = function(url, loaded, total) {
        const progress = (loaded / total) * 100;
        loadingText.innerText = `Loading assets ${loaded} out of ${total}`;
        loadingBar.value = progress;
    }

    loadingManager.onLoad = function() {
        startButton.disabled = false;
        loadingText.innerText = `Finished Loading`;
    }

    initializeGUI();
    loadEnvironment();
    initializeLighting();
    onWindowResize();
}

//resize event used for resizing camera and renderer when window is resized
function onWindowResize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    
    camera.aspect = sizes.width / sizes.height;
    camera.fov = THREE.MathUtils.clamp((-20*camera.aspect)+60 , 30, 50);
    camera.updateProjectionMatrix();
    
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    interfaceRenderer.setSize(sizes.width, sizes.height);
}

const fixedTimeStep = 1/60;
const maxDelta = 0.1;
let accumulator = 0;

//game loop
function update() {
    const delta = Math.min(clock.getDelta(), maxDelta);
    accumulator += delta;

    while (accumulator >= fixedTimeStep) {
        if(player.model) {
            player.update(inputSystem.axes.horizontal, fixedTimeStep);
            textBubbleUpdate();
            cameraMovement();
            updateStages();
        }
        accumulator -= fixedTimeStep;
    }

    stats.update();
    renderer.render(scene, camera);
    interfaceRenderer.render(scene, camera);
    effect.render(scene, camera);
    
    requestAnimationFrame(update);
    // console.log(renderer.info.render.triangles);
}

init();
update();