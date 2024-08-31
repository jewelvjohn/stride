import './styles/main.css'
import './styles/loading.css'
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'; 
import {CSM} from 'three/addons/csm/CSM.js'
import {CSMHelper} from 'three/addons/csm/CSMHelper.js'
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

let scene, camera, renderer, effect, stats, canvas, csm, csmHelper, sky;
let player, inputSystem, interactionContainer;
let interfaceRenderer;
let textBubble, textContainer;
let loadingScreen, loadingBar, loadingText, startButton;

const lightIntensity = 3;
const lightDirection = new THREE.Vector3(1, -1, -1);
const talkBubbleOffset = new THREE.Vector3(0, 40, 0);
const cameraLookAtOffset = new THREE.Vector3(0, 30, 0);
const cameraPositionOffset = new THREE.Vector3(-160, 35, 0);

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

var stages = {};
var currentStage = '';
var highEndGraphics = false;
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

function toRadian(angle) {
    return angle * Math.PI / 180;
}

//function used for creating CSS renderer for rendering html elements in the 3D scene
function initializeGUI() {
    interfaceRenderer = new CSS2DRenderer();
    interfaceRenderer.setSize(sizes.width, sizes.height);
    interfaceRenderer.domElement.style.position = 'fixed';
    interfaceRenderer.domElement.style.top = '50%';
    interfaceRenderer.domElement.style.left = '50%';
    interfaceRenderer.domElement.style.left = '50%';
    interfaceRenderer.domElement.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(interfaceRenderer.domElement);

    interactionContainer = new InteractionContainer();
    interactionContainer.addInteractionPoint({
        message: '<p>Beautiful painting!</p>',
        position: -160,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        message: '<p>This website was developed using <span class="highlight">three.js</span>, <span class="highlight">vite</span> and <span class="highlight">blender</span></p>',
        position: -80,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        message: '<p>Use keyboard arrows, A, D or <, > buttons to move</p>',
        position: 0,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        message: '<p><span class="highlight">Burny Rush</span> is a high fidelity racing game developed in unity</p>',
        position: 80,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        message: '<p>Should I go ahead?</p><a class="talkbubble-link" href="./about/"><i>Go Ahead</i></a>',
        position: 160,
        light: false,
        focus: true,
        range: 40
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

function createBlinder(position, width, height) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({color: 0x000000});
    const mesh = new THREE.Mesh(geometry, material);

    mesh.material.side = THREE.FrontSide;
    mesh.receiveShadow = false;
    mesh.castShadow = false;

    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.y = toRadian(-90);
    scene.add(mesh);
}

function createDummyStage(color = 0xffffff, position, key) {
    const groundGeometry = new THREE.BoxGeometry(400, 2, 400);
    const boxGeometry = new THREE.BoxGeometry(40, 20, 40, 10, 10, 10);
    const material = new THREE.MeshStandardMaterial({color: color});
    csm.setupMaterial(material);

    const groundMesh = new THREE.Mesh(groundGeometry, material);
    groundMesh.castShadow = true;
    groundMesh.receiveShadow = true;
    groundMesh.side = THREE.FrontSide;
    groundMesh.shadowSide = THREE.FrontSide;
    groundMesh.position.set(100, -1, position);

    const boxMesh = new THREE.Mesh(boxGeometry, material);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    boxMesh.side = THREE.FrontSide;
    boxMesh.shadowSide = THREE.FrontSide;
    boxMesh.position.set(40, 10, position);

    const fog = new THREE.Fog(0xADDDF0, 580, 1000);
    const sky = "./resources/images/sunny.png";
    const stage = new Stage(scene, sky, fog);
    stage.addObject(groundMesh);
    stage.addObject(boxMesh);

    stages[key] = stage;
}

function loadEnvironment() {
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, -120), 6, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, -40), 6, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, 40), 6, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, 120), 6, 80);

    // const gridHelper = new THREE.GridHelper(400, 40);
    // scene.add(gridHelper);

    createDummyStage(0xFFD700, -160, 'yellow'); //yellow
    createDummyStage(0xFF69B4, -80, 'red'); //red
    
//gas station
    const loader = new GLTFLoader(loadingManager);
    loader.load("./resources/3d/low-end/gas station.glb", (gltf) => {
        const model = gltf.scene;
        model.traverse(function(child) {
            if(child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.side = THREE.FrontSide;
                child.material.shadowSide = THREE.FrontSide;
                csm.setupMaterial(child.material);
            }
        });
        model.scale.set(10, 10, 10);
        model.rotation.y = toRadian(-90);

        if(stages['gas_station']) {
            stages['gas_station'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xADDDF0, 580, 1000);
            const sky = "./resources/images/sunny.png";
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['gas_station'] = stage;
        }
    });

    loader.load("./resources/3d/high-end/lfa.glb", (gltf) => {
        const model = gltf.scene;
        const step = new Uint8Array([0, 32, 64, 255]);
        const gradientMap = new THREE.DataTexture(step, step.length, 1, THREE.RedFormat);
        gradientMap.needsUpdate = true;

        model.traverse(function(child) {
            if(child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = false;
                if(child.material && child.material.name !== "glass" && child.material.name !== "brake") {
                    child.material = new THREE.MeshToonMaterial({color: 0xFFFFFF, map: child.material.map, gradientMap: gradientMap});
                    // console.log(child.material.name);
                }
                child.material.side = THREE.FrontSide;
                child.material.shadowSide = THREE.FrontSide;
                csm.setupMaterial(child.material);
            }
        });
        model.scale.set(10, 10, 10);
        model.position.set(100, 0, -60);
        model.rotation.y = toRadian(-45);

        if(stages['gas_station']) {
            stages['gas_station'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xADDDF0, 580, 1000);
            const sky = "./resources/images/sunny.png";
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['gas_station'] = stage;
        }
    });

//medieval town
    loader.load("./resources/3d/low-end/medieval town.glb", (gltf) => {
        const model = gltf.scene;
        model.traverse(function(child) {
            if(child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.side = THREE.FrontSide;
                child.material.shadowSide = THREE.FrontSide;
                csm.setupMaterial(child.material);
            }
        });
        model.scale.set(10, 10, 10);
        model.position.set(0, 0, 80);
        model.rotation.y = toRadian(-90);

        if(stages['medieval_town']) {
            stages['medieval_town'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xADDDF0, 580, 1000);
            const sky = "./resources/images/forest.png";
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['medieval_town'] = stage;
        }
    });

//light house
    loader.load("./resources/3d/low-end/light house.glb", (gltf) => {
        const model = gltf.scene;
        model.traverse(function(child) {
            if(child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.side = THREE.FrontSide;
                child.material.shadowSide = THREE.FrontSide;
                csm.setupMaterial(child.material);
            }
        });
        model.scale.set(10, 10, 10);
        model.position.set(0, 0, 160);
        model.rotation.y = toRadian(-90);

        if(stages['light_house']) {
            stages['light_house'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xADDDF0, 580, 1000);
            const sky = "./resources/images/cloudy.png";
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['light_house'] = stage;
        }
    });
}

function selectStage(stage) {
    if(stage !== currentStage) {
        Object.entries(stages).forEach(([key, value]) => {
            if(key === stage) {
                if(!value.isActive) {
                    value.showStage();
                    sky.style.backgroundImage = `url(${value.sky})`;
                    scene.fog = value.fog;
                }
                currentStage = stage;
            } else {
                if(value.isActive) {
                    value.hideStage();
                }
            }
        });
    }
}

function updateStages() {
    const position = player.model.position.z;

    if(position <= -120) {
        selectStage('yellow');
    } else if(position <= -40) {
        selectStage('red');
    } else if(position <= 40) {
        selectStage('gas_station');
    } else if(position <= 120) {
        selectStage('medieval_town');
    } else {
        selectStage('light_house');
    }
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

    sky = document.getElementById('sky');
    canvas = document.querySelector('canvas.webgl');

    // const gl = canvas.getContext('webgl2');
    // const dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
    // const gpu = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);;
    // console.log('Graphics Card Vendor:', gpu);
    
    if(!isMobile()) highEndGraphics = true;
    // if(!isTouch()) document.querySelector('div.touch-inputs').style.display = 'none';
    
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xADDDF0, 580, 1000);
    // scene.background = new THREE.Color(0x63b0cd);
    
    camera = new THREE.PerspectiveCamera(30, sizes.width / sizes.height, 0.1, 1000);
    camera.position.set(cameraPositionOffset);
    camera.lookAt(cameraLookAtOffset);

    THREE.Cache.enabled = true;
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        canvas: canvas
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(sizes.width, sizes.height);
    renderer.render(scene, camera);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.shadowMap.enabled = true;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444400, 0.5);
    hemiLight.position.set(0, 2, 0);
    scene.add(hemiLight);

    csm = new CSM({
        maxFar: 500,
        cascades: highEndGraphics ? 2 : 1,
        mode: 'uniform',
        parent: scene,
        shadowMapSize: highEndGraphics ? 2048 : 1024,
        lightDirection: lightDirection.normalize(),
        camera: camera
    });

    for(let i=0; i<csm.lights.length; i++) {
        csm.lights[i].intensity = lightIntensity;
        csm.lights[i].shadow.normalBias = highEndGraphics ? 0.05 : 0.1;
    }

    // csmHelper = new CSMHelper(csm);
    // csmHelper.visible = true;
    // scene.add(csmHelper);
    
    stats = new Stats();
    document.body.appendChild(stats.dom);
    window.addEventListener('resize', onWindowResize);
    
    player = new CharacterController('./resources/3d/high-end/character.glb', scene, loadingManager, -200, 200);
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
    onWindowResize();
}

function clampScreenSize(min, max) {
    const aspectRatio = window.innerWidth / window.innerHeight;
    if(aspectRatio > max) {
        sizes.width = window.innerHeight * max;
        sizes.height = window.innerHeight;
    } else if(aspectRatio < min) {
        sizes.width = window.innerWidth;
        sizes.height = window.innerWidth / min;
    } else {
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;
    } 
}

//resize event used for resizing camera and renderer when window is resized
function onWindowResize() {
    clampScreenSize(0.25, 2.5);

    camera.aspect = sizes.width / sizes.height;
    camera.fov = THREE.MathUtils.clamp((-20*camera.aspect)+60 , 30, 50);
    camera.updateProjectionMatrix();

    sky.style.width = `${sizes.width}px`;
    sky.style.height = `${sizes.height}px`;
    
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    interfaceRenderer.setSize(sizes.width, sizes.height);

    csm.updateFrustums();
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
    
    // camera.updateMatrixWorld();
    // csmHelper.update();
    csm.update();
    stats.update();
    renderer.render(scene, camera);
    interfaceRenderer.render(scene, camera);
    effect.render(scene, camera);
    
    requestAnimationFrame(update);
    // console.log(renderer.info.render.triangles);
}

init();
update();