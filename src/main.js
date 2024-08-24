import './styles/main.css'
import './styles/loading.css'
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'; 
import {GLTFLoader} from 'three/examples/jsm/Addons.js';
import {OutlineEffect} from 'three/addons/effects/OutlineEffect.js';
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/Addons.js';

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
        position: -600,
        light: false,
        focus: true,
        range: 200
    });
    interactionContainer.addInteractionPoint({
        message: '<p>This website was developed using Three.js, vite and Blender</p>',
        position: -200,
        light: false,
        focus: true,
        range: 200
    });
    interactionContainer.addInteractionPoint({
        message: '<p>Burny Rush: A high fidelity racing game developed in unity</p>',
        position: 200,
        light: false,
        focus: true,
        range: 200
    });
    interactionContainer.addInteractionPoint({
        message: '<p>Should I go ahead?</p><a class="talkbubble-link" href="./about/"><i>Go Ahead</i></a>',
        position: 600,
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
    const geometry = new THREE.BoxGeometry(2000, 200, 2000);
    const material = new THREE.MeshStandardMaterial({color: 0xdddddd});
    const mesh = new THREE.Mesh(geometry, material);
    let gridHelper = new THREE.GridHelper(2000, 40);

    mesh.position.set(500, -100, 0);
    scene.add(mesh);
    scene.add(gridHelper);
}

//lighting
function initializeLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444400, 1);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);
    
    const color = 0xfffae6;
    const dirLight = new THREE.DirectionalLight(color, 3);
    dirLight.position.set(-200, 200, -100);
    dirLight.target.position.set(0, 0, 0);
    scene.add(dirLight);
    scene.add(dirLight.target);

    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.shadowMap.enabled = false;
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
    
    player = new CharacterController('./resources/3d/high-end/character v2.glb', scene, loadingManager, -750, 750);
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

const fixedTimeStep = 1 / 60;
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