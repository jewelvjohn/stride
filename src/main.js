//UI Dependancies
import './styles/main.css';
import './styles/loading.css';
import {Rive} from "@rive-app/canvas";
import "@lottiefiles/lottie-player";
import {create} from '@lottiefiles/lottie-interactivity';

//THREE.js Dependancies
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js'; 
import {CSM} from 'three/addons/csm/CSM.js';
import {GLTFLoader} from 'three/examples/jsm/Addons.js';
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/Addons.js';

//Custom Classes
import {Stage} from './lib/stage.js';
import {InputSystem} from './lib/input.js';
import {CharacterController} from './lib/character.js';
import {InteractionContainer} from './lib/interaction.js';

//GLSL Shaders
import WaterVertexShader from './lib/shaders/water/vertex.glsl';
import WaterFragmentShader from './lib/shaders/water/fragment.glsl';
import CloudVertexShader from './lib/shaders/cloud/vertex.glsl';
import CloudFragmentShader from './lib/shaders/cloud/fragment.glsl';
import FlowerVertexShader from './lib/shaders/flower/vertex.glsl';
import FlowerFragmentShader from './lib/shaders/flower/fragment.glsl';
import LeavesVertexShader from './lib/shaders/leaves/vertex.glsl';
import LeavesFragmentShader from './lib/shaders/leaves/fragment.glsl';
import ReactorVertexShader from './lib/shaders/reactor/vertex.glsl';
import ReactorFragmentShader from './lib/shaders/reactor/fragment.glsl';
import RingVertexShader from './lib/shaders/ring/vertex.glsl';
import RingFragmentShader from './lib/shaders/ring/fragment.glsl';

//Sky Images
import sky_cloudy from './resources/images/sky/cloudy.png';
import sky_forest from './resources/images/sky/forest.png';
import sky_green from './resources/images/sky/green.png';
import sky_noon from './resources/images/sky/noon.png';
import sky_sunset from './resources/images/sky/sunset.png';

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


//THREE.js Variables
const clock = new THREE.Clock();
const loadingManager = new THREE.LoadingManager();

let scene, camera, stats, canvas, csm, sky, map;
let player, inputSystem, interactionContainer;
let renderer, interfaceRenderer;
let loadingScreen, loadingBar, loadingText, startButton;

//Lighting Variables
const lightIntensity = 3;
const lightDirection = new THREE.Vector3(1, -1, -1);

//Stage Variables
const blinderPositions = [-200, -120, -40, 40, 120, 200];
const blinderWidth = 6;
var stages = {};
var currentStage = '';

//System Variables
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};
var started = false;
var highEndGraphics = false;

//Interaction Variables
var isInteracting = false; 
var interactionId = -1;
var currentInteractionId = -1;

//UI Variables
const talkBubbleOffset = new THREE.Vector3(0, 40, 0);
let textContainer, textBubble;
var isTextBubbleVisible = false;
var sceneLoaded = false;
var mapLoaded = false;
var messages = [];

//Camera Variables
const cameraLookAtOffset = new THREE.Vector3(0, 30, 0);
const cameraPositionOffset = new THREE.Vector3(-160, 30, 0);
var cameraLookAt = cameraLookAtOffset;
var cameraPosition = cameraPositionOffset;

//Material Variables
var waterMaterial, cloudMaterials = [];
var reactorMaterial, ringMaterials = [], flowerMaterials = [];

//Gallery Variables
var isDraggingGallery = false;
var prevScrollLeftGallery, prevPageXGallery;

//System Configuration
function isMobile() {
    return (/Android|iphone/i.test(navigator.userAgent));
}

function isTouch() {
    return (navigator.maxTouchPoints > 0);
}

//Maths Functions
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
        position: -160,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        position: -80,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        position: 0,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        position: 80,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        position: 160,
        light: false,
        focus: true,
        range: 40
    });

    messages[0] = document.querySelector('#about-section');
    messages[1] = document.querySelector('#artwork-section');
    messages[2] = document.querySelector('#intro-section');
    messages[3] = document.querySelector('#project-section');
    messages[4] = document.querySelector('#social-section');
    
    textBubble = document.querySelector("#talkbubble");
    const containerDiv = document.querySelector('#talkbubble-container');
    textContainer = new CSS2DObject(containerDiv);
    scene.add(textContainer);

    //assigning the left and right html buttons to the input system
    document.addEventListener("contextmenu", function (e) {e.preventDefault();}, false);
}

function initializeLottie() {
    create({
        player:'#instagram-camera',
        mode:"cursor",
        actions: [{type: "hold"}]
    });
    create({
        player:'#leftButtonGallery',
        mode:"cursor",
        actions: [{type: "click", forceFlag: true}]
    });
    create({
        player:'#rightButtonGallery',
        mode:"cursor",
        actions: [{type: "click", forceFlag: true}]
    });
    create({
        player:'#leftButtonPortfolio',
        mode:"cursor",
        actions: [{type: "click", forceFlag: true}]
    });
    create({
        player:'#rightButtonPortfolio',
        mode:"cursor",
        actions: [{type: "click", forceFlag: true}]
    });
}

function initializeGallery() {
    const gallery = document.querySelector(".gallery");
    const prevButton = document.querySelector("#leftButtonGallery");
    const nextButton = document.querySelector("#rightButtonGallery");
    const cell = gallery.querySelectorAll("img")[0];
    
    prevButton.style.display = "none";
    
    prevButton.addEventListener("click", (e) => {
        e.preventDefault();
        gallery.scrollLeft += -(cell.clientWidth + 8);
        setTimeout(() => toggleButtons(), 250);
    });
    nextButton.addEventListener("click", (e) => {
        e.preventDefault();
        gallery.scrollLeft += (cell.clientWidth + 8);
        setTimeout(() => toggleButtons(), 250);
    });
    
    const toggleButtons = () => {
        prevButton.style.display = (gallery.scrollLeft <= 16) ? "none" : "block";
        nextButton.style.display = (gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 16) ? "none" : "block";
    }
    
    const startDragging = (e) => {
        e.preventDefault();
        isDraggingGallery = true;
        prevPageXGallery = e.pageX || e.touches[0].pageX;
        prevScrollLeftGallery = gallery.scrollLeft;
    }
    const endDragging = (e) => {
        e.preventDefault();
        isDraggingGallery = false;
        gallery.classList.remove("dragging");
        setTimeout(() => toggleButtons(), 250);
    }
    const dragging = (e) => {
        e.preventDefault();
        if(!isDraggingGallery) return;
        gallery.classList.add("dragging");
        
        var scrollDiff = (e.pageX || e.touches[0].pageX) - prevPageXGallery;
        gallery.scrollLeft = prevScrollLeftGallery - scrollDiff;
        toggleButtons();
    }
    
    gallery.addEventListener("mousedown", startDragging);
    gallery.addEventListener("touchstart", startDragging);
    
    gallery.addEventListener("mousemove", dragging);
    gallery.addEventListener("touchmove", dragging);
    
    gallery.addEventListener("mouseleave", endDragging);
    gallery.addEventListener("mouseup", endDragging);
    gallery.addEventListener("touchend", endDragging);
}

function initializePortfolio() {
    const container = document.querySelector(".portfolio-container");
    const portfolio = document.querySelector(".portfolio");
    const projects = Array.from(portfolio.children);
    const navigation = document.querySelector(".dot-nav");
    const navButtons = Array.from(navigation.children);
    const prevButton = document.querySelector("#leftButtonPortfolio");
    const nextButton = document.querySelector("#rightButtonPortfolio");
    
    prevButton.style.display = "none";

    const movePortfolio = (currentCell, targetCell) => {
        const amount = targetCell.getBoundingClientRect().left - currentCell.getBoundingClientRect().left;
        container.scrollLeft += amount;

        const targetIndex = projects.findIndex(project => project === targetCell);
        const currentDot = navigation.querySelector(".selected");
        const targetDot = navButtons[targetIndex];

        if(targetIndex === projects.length - 1) nextButton.style.display = "none";
        else nextButton.style.display = "block";

        if(targetIndex === 0) prevButton.style.display = "none";
        else prevButton.style.display = "block";

        currentDot.classList.remove("selected");
        targetDot.classList.add("selected");
        currentCell.classList.remove("selected");
        targetCell.classList.add("selected");
    }

    nextButton.addEventListener("click", (e) => {
        e.preventDefault();
        const currentCell = portfolio.querySelector(".selected");
        const nextCell = currentCell.nextElementSibling;
        if(!nextCell) return;
        movePortfolio(currentCell, nextCell);
    });

    prevButton.addEventListener("click", (e) => {
        e.preventDefault();
        const currentCell = portfolio.querySelector(".selected");
        const prevCell = currentCell.previousElementSibling;
        if(!prevCell) return;
        movePortfolio(currentCell, prevCell);
    });

    navigation.addEventListener("click", (e) => {
        const targetDot = e.target.closest("button");
        if(!targetDot) return;
        if(targetDot.classList.contains("selected")) return;

        const targetIndex = navButtons.findIndex(dot => dot === targetDot);
        const targetCell = projects[targetIndex];
        const currentCell = portfolio.querySelector(".selected");

        movePortfolio(currentCell, targetCell);
    });
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

        for(let i=0; i<messages.length; i++) {
            if(i === currentInteractionId) messages[i].style.display = 'flex';
            else messages[i].style.display = 'none';
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

function updateMap() {
    const position = ((player.model.position.z) + 200) / 100;
    map.scrub("flow", position);
}

function loadMap() {
    map = new Rive({
        src: "./resources/animations/map.riv",
        canvas: document.getElementById("map-canvas"),
        autoplay: false,
        onLoad: () => {
            map.resizeDrawingSurfaceToCanvas();
            mapLoaded = true;

            if(sceneLoaded) {
                startButton.disabled = false;
                loadingText.innerText = `Finished Loading`;
            }
        },
    });
}

function loadEnvironment() {
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, blinderPositions[0]), blinderWidth, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, blinderPositions[1]), blinderWidth, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, blinderPositions[2]), blinderWidth, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, blinderPositions[3]), blinderWidth, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, blinderPositions[4]), blinderWidth, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, blinderPositions[5]), blinderWidth, 80);

//exo planet
    const noise = new THREE.TextureLoader().load("./resources/textures/noise.png");
    const voronoi = new THREE.TextureLoader().load("./resources/textures/voronoi.jpg");
    noise.wrapT = noise.wrapS = THREE.RepeatWrapping;
    voronoi.wrapT = voronoi.wrapS = THREE.RepeatWrapping;

    const loader = new GLTFLoader(loadingManager);
    loader.load("./resources/3d/exo planet.glb", (gltf) => {
        const model = gltf.scene;
        model.traverse(function(child) {
            if(child.isMesh) {
                if(child.material.name == "cloud") {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    var cloudMaterial = new THREE.ShaderMaterial({
                        uniforms: {
                            uTime : { value: Math.random() * 10 },
                            uSpeed : { value: 0.02 },
                            uColor_1 : { value: new THREE.Color(0x9C9F96).convertLinearToSRGB() },
                            uColor_2 : { value: new THREE.Color(0xFAFCF9).convertLinearToSRGB() },
                            uShadowColor : { value: new THREE.Color(0x578163).convertLinearToSRGB() },
                            uNoise : { value: noise },
                            uVoronoi : { value: voronoi }
                        }, 
                        name: "cloud",
                        vertexShader: CloudVertexShader,
                        fragmentShader: CloudFragmentShader,
                        transparent: true,
                        side: THREE.FrontSide,
                        shadowSide: THREE.FrontSide 
                    });
                    child.material = cloudMaterial;
                    cloudMaterials.push(cloudMaterial);
                } else {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.side = THREE.FrontSide;
                    child.material.shadowSide = THREE.FrontSide;
                    csm.setupMaterial(child.material);
                }
            }
        });
        model.scale.set(10, 10, 10);
        model.position.set(0, 0, -160);
        model.rotation.y = toRadian(-90);

        if(stages['exo_planet']) {
            stages['exo_planet'].addObject(model);
        } else {
            const fog = new THREE.Fog(0x95C8C3, 1500, 2500);
            const sky = sky_green;
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['exo_planet'] = stage;
        }
    });

//space station
    reactorMaterial = new THREE.ShaderMaterial({
        vertexShader: ReactorVertexShader,
        fragmentShader: ReactorFragmentShader,
        side: THREE.FrontSide,
        shadowSide: THREE.FrontSide,
        transparent: true
    });

    const ringMap = new THREE.TextureLoader().load("./resources/textures/ring.png");
    for(let i=0; i<3; i++) {
        ringMaterials[i] = new THREE.ShaderMaterial({
            uniforms: {
                uMap: { value: ringMap },
                uTime: { value: 0 },
                i: { value: 3-i },
                j: { value: 3-i },
                k: { value: 3-i },
            },
            vertexShader: RingVertexShader,
            fragmentShader: RingFragmentShader,
            side: THREE.DoubleSide,
            shadowSide: THREE.FrontSide
        });
    }

    loader.load("./resources/3d/space station.glb", (gltf) => {
        const model = gltf.scene;
        model.traverse(function(child) {
            if(child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.side = THREE.FrontSide;
                child.material.shadowSide = THREE.FrontSide;

                if(child.material.name === "reactor") {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.material = reactorMaterial;
                } else if(child.name === "ring_1") {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.material = ringMaterials[0];
                } else if(child.name === "ring_2") {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.material = ringMaterials[1];
                } else if(child.name === "ring_3") {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.material = ringMaterials[2];
                } else if(child.material.name === "glass") {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.material.alphaTest = 0.16;
                } else { csm.setupMaterial(child.material); }
            }
        });
        model.scale.set(10, 10, 10);
        model.position.set(0, 0, -80);
        model.rotation.y = toRadian(-90);

        if(stages['space_station']) {
            stages['space_station'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xFFE4B4, 500, 1000);
            const sky = sky_sunset;
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['space_station'] = stage;
        }
    });
    
//gas station
    loader.load("./resources/3d/gas station.glb", (gltf) => {
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
        model.position.set(0, 0, 0);
        model.rotation.y = toRadian(-90);

        if(stages['gas_station']) {
            stages['gas_station'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xB1DDDC, 650, 1000);
            const sky = sky_noon;
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['gas_station'] = stage;
        }
    });

//medieval town
    loader.load("./resources/3d/flower field.glb", (gltf) => {
        const model = gltf.scene;
        model.traverse(function(child) {
            if(child.isMesh) {
                if(child.material.name === "leaves"){
                    const map = new THREE.TextureLoader().load("./resources/textures/branch.png");
                    child.castShadow = false;
                    child.receiveShadow = false;
                    const material = new THREE.ShaderMaterial({
                        vertexShader: LeavesVertexShader,
                        fragmentShader: LeavesFragmentShader,
                        side: THREE.DoubleSide,
                        shadowSide: THREE.FrontSide,
                        transparent: true
                    });
                    material.uniforms.uMap = { value: map };
                    child.material = material;
                } else {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.side = THREE.FrontSide;
                    child.material.shadowSide = THREE.FrontSide;
                }
                csm.setupMaterial(child.material);
            }
        });
        model.scale.set(10, 10, 10);
        model.position.set(0, 0, 80);
        model.rotation.y = toRadian(-90);

        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(gltf.animations[0]);

        if(stages['flower_field']) {
            stages['flower_field'].addObject(model);
            stages['flower_field'].initializeAnimations(mixer, action);
        } else {
            const fog = new THREE.Fog(0xE3ECFF, 800, 1750);
            const sky = sky_forest;
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['flower_field'] = stage;
            stages['flower_field'].initializeAnimations(mixer, { 0: action });
        }
    });

    const flowerMap = [ 
        new THREE.TextureLoader().load("./resources/textures/flower/plant(64x).png"),
        new THREE.TextureLoader().load("./resources/textures/flower/plant(128x).png"),
        new THREE.TextureLoader().load("./resources/textures/flower/plant(256x).png")
    ];

    for(let i=0; i<3; i++) {
        const uniforms = {
            uNoise: { value: noise },
            uTime: { value: 0 },
        };
    
        flowerMaterials[i] = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: FlowerVertexShader,
            fragmentShader: FlowerFragmentShader,
            side: THREE.FrontSide,
            shadowSide: THREE.FrontSide 
        });
        flowerMaterials[i].uniforms.uMap = { value: flowerMap[i] };
    }

    loader.load("./resources/3d/props/flower(32x).glb", (gltf) => {
        const model = gltf.scene;
        const mesh = model.children[0];
        const geometry = mesh.geometry;
        const rows = 8;
        const cols = 50;
        const rowSpan = 24;
        const colSpan = 14;
        const instanced = new THREE.InstancedMesh(geometry, flowerMaterials[0], rows * cols);
        instanced.castShadow = false;
        instanced.receiveShadow = false;
        const dummy = new THREE.Object3D();
        dummy.rotation.y = toRadian(-90);
        var count = 0;
        for(let i=0; i<rows; i++) {
            for(let j=0; j<cols; j++) {
                dummy.position.x = (i*rowSpan) + (Math.random() * (rowSpan/2)) + 160;
                dummy.position.z = (j*colSpan) + (Math.random() * (colSpan/2)) - ((cols*colSpan)/2) + 80;
                const scaleRand = Math.random() * 5;
                dummy.scale.set(8 + scaleRand, 8 + scaleRand, 1);
                dummy.updateMatrix();
                instanced.setMatrixAt(count++, dummy.matrix);
            }
        }

        if(stages['flower_field']) {
            stages['flower_field'].addObject(instanced);
        } else {
            const fog = new THREE.Fog(0xE3ECFF, 800, 1750);
            const sky = sky_forest;
            const stage = new Stage(scene, sky, fog);
            stage.addObject(instanced);
            stages['flower_field'] = stage;
        }
    });

    loader.load("./resources/3d/props/flower(64x).glb", (gltf) => {
        const model = gltf.scene;
        const mesh = model.children[0];
        const geometry = mesh.geometry;
        const rows = 6;
        const cols = 36;
        const rowSpan = 22;
        const colSpan = 10;
        const instanced = new THREE.InstancedMesh(geometry, flowerMaterials[1], rows * cols);
        instanced.castShadow = false;
        instanced.receiveShadow = false;
        const dummy = new THREE.Object3D();
        dummy.rotation.y = toRadian(-90);
        var count = 0;
        for(let i=0; i<rows; i++) {
            for(let j=0; j<cols; j++) {
                dummy.position.x = (i*rowSpan) + (Math.random() * (rowSpan/2)) + 10;
                dummy.position.z = (j*colSpan) + (Math.random() * (colSpan/2)) - ((cols*colSpan)/2) + 80;
    
                const scaleRand = Math.random() * 5;
                dummy.scale.set(8 + scaleRand, 8 + scaleRand, 1);
                dummy.updateMatrix();
                instanced.setMatrixAt(count++, dummy.matrix);
            }
        }

        if(stages['flower_field']) {
            stages['flower_field'].addObject(instanced);
        } else {
            const fog = new THREE.Fog(0xE3ECFF, 800, 1750);
            const sky = sky_forest;
            const stage = new Stage(scene, sky, fog);
            stage.addObject(instanced);
            stages['flower_field'] = stage;
        }
    });

    loader.load("./resources/3d/props/flower(128x).glb", (gltf) => {
        const model = gltf.scene;
        const mesh = model.children[0];
        const geometry = mesh.geometry;
        const rows = 6;
        const cols = 26;
        const rowSpan = 18;
        const colSpan = 8;
        const instanced = new THREE.InstancedMesh(geometry, flowerMaterials[2], rows * cols);
        instanced.castShadow = false;
        instanced.receiveShadow = false;
        const dummy = new THREE.Object3D();
        dummy.rotation.y = toRadian(-90);
        var count = 0;
        for(let i=0; i<rows; i++) {
            for(let j=0; j<cols; j++) {
                dummy.position.x = (i*rowSpan) + (Math.random() * (rowSpan/2)) - 120;
                dummy.position.z = (j*colSpan) + (Math.random() * (colSpan/2)) - ((cols*colSpan)/2) + 80;
    
                const scaleRand = Math.random() * 5;
                dummy.scale.set(8 + scaleRand, 8 + scaleRand, 1);
                dummy.updateMatrix();
                instanced.setMatrixAt(count++, dummy.matrix);
            }
        }

        if(stages['flower_field']) {
            stages['flower_field'].addObject(instanced);
        } else {
            const fog = new THREE.Fog(0xE3ECFF, 800, 1750);
            const sky = sky_forest;
            const stage = new Stage(scene, sky, fog);
            stage.addObject(instanced);
            stages['flower_field'] = stage;
        }
    });

    const waterUniforms = {
        uTime: { value: 0 },
        uFoamColor: { value: new THREE.Color(0xA4CEC6).convertLinearToSRGB() },
        uWaterColor_1: { value: new THREE.Color(0x01232F).convertLinearToSRGB() },
        uWaterColor_2: { value: new THREE.Color(0x3B8795).convertLinearToSRGB() },
        uShadowColor: { value: new THREE.Color(0x031b26).convertLinearToSRGB() },
        uHighlightColor: { value: new THREE.Color(0x42ACCF).convertLinearToSRGB() },
        uFoamTiling: { value: 32 }
    };

//light house
    loader.load("./resources/3d/light house.glb", (gltf) => {
        const model = gltf.scene;
        model.traverse(function(child) {
            if(child.isMesh) {
                if(child.material.name == "diffuse") {
                    const unlitMaterial = new THREE.MeshBasicMaterial({map: child.material.map});
                    unlitMaterial.castShadow = false;
                    unlitMaterial.receiveShadow = false;
                    unlitMaterial.side = THREE.FrontSide;
                    unlitMaterial.shadowSide = THREE.FrontSide;
                    child.material = unlitMaterial;
                } else if(child.material.name == "ocean") {
                    const mask = new THREE.TextureLoader().load("./resources/textures/foammask.jpg");
                    const shadow = new THREE.TextureLoader().load("./resources/textures/oceanshadow.jpg");
                    
                    waterMaterial = new THREE.ShaderMaterial({
                        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib["fog"], waterUniforms]),
                        vertexShader: WaterVertexShader,
                        fragmentShader: WaterFragmentShader,
                        fog: true,
                        side: THREE.FrontSide,
                        shadowSide: THREE.FrontSide 
                    });
                    waterMaterial.uniforms.uMask = { value: mask };
                    waterMaterial.uniforms.uNoise = { value: noise };
                    waterMaterial.uniforms.uShadow = { value: shadow };
                    child.material = waterMaterial;
                } else {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.side = THREE.FrontSide;
                    child.material.shadowSide = THREE.FrontSide;
                    csm.setupMaterial(child.material);
                }
            }
        });
        model.scale.set(10, 10, 10);
        model.position.set(0, 0, 160);
        model.rotation.y = toRadian(-90);

        if(stages['light_house']) {
            stages['light_house'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xBDE5E4, 500, 1500);
            const sky = sky_cloudy;
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
                    sky.src = value.sky;
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

function updateStages(delta) {
    const position = player.model.position.z;
    if(position <= -120) {
        selectStage('exo_planet');
    } else if(position <= -40) {
        selectStage('space_station');
    } else if(position <= 40) {
        selectStage('gas_station');
    } else if(position <= 120) {
        selectStage('flower_field');
    } else {
        selectStage('light_house');
    }
    if(started && stages[currentStage].mixer) stages[currentStage].mixer.update(delta);
}

//move camera with player
function cameraMovement() {
    cameraLookAt = player.model.position.clone().add(cameraLookAtOffset);
    cameraPosition = player.model.position.clone().add(cameraPositionOffset);
    camera.lookAt(cameraLookAt);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
}

function loopPlayer() {
    if((player.positionRef == player.minBound) && player.moveInput < 0) {
        player.model.position.z = player.maxBound;
        player.positionRef = player.model.position.z;

        textBubbleUpdate();
        cameraMovement();
        updateStages();
    }
    
    if((player.positionRef == player.maxBound) && player.moveInput > 0) {
        player.model.position.z = player.minBound;
        player.positionRef = player.model.position.z;
        
        textBubbleUpdate();
        cameraMovement();
        updateStages();
    }
}

//initializes the whole scene
function init() {
    loadingScreen = document.querySelector('#loading-screen');
    loadingBar = document.querySelector('#loading-bar');
    loadingText = document.querySelector('#loading-text');
    
    startButton = document.querySelector('#start-button');
    startButton.disabled = true;
    startButton.onclick = () => {
        started = true;
        player.startIdle();
        loadingScreen.style.display = 'none';
        initializeLottie();
        initializeGallery();
        initializePortfolio();
    }

    sky = document.querySelector('#sky img');
    canvas = document.querySelector('canvas.webgl');
    
    if(!isMobile()) highEndGraphics = true;
    // if(!isTouch()) document.querySelector('div.touch-inputs').style.display = 'none';
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, sizes.width / sizes.height, 0.1, 2500);
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
    // renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.shadowMap.enabled = true;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444400, 1);
    hemiLight.position.set(0, 2, 0);
    scene.add(hemiLight);

    csm = new CSM({
        maxFar: 1000,
        cascades: highEndGraphics ? 2 : 1,
        mode: 'uniform',
        parent: scene,
        shadowMapSize: highEndGraphics ? 2048 : 1024,
        lightDirection: lightDirection.normalize(),
        camera: camera
    });

    for(let i=0; i<csm.lights.length; i++) {
        csm.lights[i].intensity = lightIntensity;
        csm.lights[i].shadow.normalBias = highEndGraphics ? 0.05 : 0.2;
    }
    
    stats = new Stats();
    document.body.appendChild(stats.dom);
    window.addEventListener('resize', onWindowResize);
    
    player = new CharacterController('./resources/3d/character.glb', scene, loadingManager, -200, 200, true, blinderPositions, blinderWidth);
    inputSystem = new InputSystem();

    loadingManager.onProgress = function(url, loaded, total) {
        const progress = (loaded / total) * 100;
        loadingText.innerText = `Loading assets ${loaded} out of ${total}`;
        loadingBar.value = progress;
    }
    loadingManager.onLoad = function() {
        if(mapLoaded) {
            startButton.disabled = false;
            loadingText.innerText = `Finished Loading`;
        } else {
            sceneLoaded = true;
            loadingText.innerText = `Loading map...`;
        }
    }
    
    loadMap();
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
    
    map.resizeDrawingSurfaceToCanvas();

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

function updateMaterials(delta) {
    if(waterMaterial) waterMaterial.uniforms.uTime.value += delta;
    if(reactorMaterial) {
        //update unifroms...
    } if(ringMaterials.length > 0) {
        ringMaterials.forEach((material) => {
            material.uniforms.uTime.value += delta;
        });
    } if(flowerMaterials.length > 0) {
        flowerMaterials.forEach((material) => {
            material.uniforms.uTime.value += delta;
        });
    } if(cloudMaterials.length > 0) {
        cloudMaterials.forEach((material) => {
            material.uniforms.uTime.value += delta;
        });
    }
}

const fixedTimeStep = 1/60;
const maxDelta = 0.1;
let accumulator = 0;

//game loop
function update() {
    const delta = Math.min(clock.getDelta(), maxDelta);
    const time = clock.getElapsedTime();
    accumulator += delta;

    while (accumulator >= fixedTimeStep) {
        if(player.model) {
            if(player.loop) loopPlayer();
            player.controller(inputSystem.axes.horizontal, time);
            player.update(fixedTimeStep);
            textBubbleUpdate();
            cameraMovement();
            updateStages(fixedTimeStep);
            updateMap();
        }
        accumulator -= fixedTimeStep;
    }
    updateMaterials(delta);
    csm.update();
    stats.update();
    renderer.render(scene, camera);
    interfaceRenderer.render(scene, camera);
    
    requestAnimationFrame(update);
    // console.log(renderer.info.render.triangles);
}

init();
update();