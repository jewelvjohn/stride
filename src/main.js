import './styles/main.css';
import './styles/loading.css';
import {Rive} from "@rive-app/canvas";
import "@lottiefiles/lottie-player";
import {create} from '@lottiefiles/lottie-interactivity';

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js'; 
import {CSM} from 'three/addons/csm/CSM.js';
import {GLTFLoader} from 'three/examples/jsm/Addons.js';
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/Addons.js';

import {Stage} from './lib/stage.js';
import {InputSystem} from './lib/input.js';
import {CharacterController} from './lib/character.js';
import {InteractionContainer} from './lib/interaction.js';

import vertexShader from './lib/shaders/water/vertex.glsl';
import fragmentShader from './lib/shaders/water/fragment.glsl';

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

let scene, camera, stats, canvas, csm, sky, map;
let player, inputSystem, interactionContainer;
let renderer, interfaceRenderer;
let textBubble, textContainer;
let loadingScreen, loadingBar, loadingText, startButton;

const lightIntensity = 3;
const lightDirection = new THREE.Vector3(1, -1, -1);
const talkBubbleOffset = new THREE.Vector3(0, 40, 0);
const cameraLookAtOffset = new THREE.Vector3(0, 30, 0);
const cameraPositionOffset = new THREE.Vector3(-160, 30, 0);

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
var waterMaterial;

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

function cacheImage(url) {
    var image = new Image();
    image.src = url;
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
        message: `
        <div class="talkbubble-badge">
            <lottie-player loop autoplay src="./resources/animations/gear.json"></lottie-player>
        </div>
        <p>
            This website was developed using 
            <a class="highlight" href="https://threejs.org/" target="_blank">Three.js</a>, 
            <a class="highlight" href="https://vitejs.dev/" target="_blank">Vite</a>,
            <a class="highlight" href="https://www.blender.org/" target="_blank">Blender</a>,
            <a class="highlight" href="https://rive.app/" target="_blank">Rive</a>,
            and 
            <a class="highlight" href="https://useanimations.com/" target="_blank">UseAnimations</a>
        </p> 
        <p>
            Thanks to,
        </p>
        <p>
            <a class="highlight" href="https://sketchfab.com/Han66st" target="_blank">Han66st</a> 
            for the sport car and,
        </p>
        <p>
            <a class="highlight" href="https://sketchfab.com/boiko.pavlo4" target="_blank">Pavlo Boiko</a> 
            for the old bus 3D model.
        </p>`,
        position: -160,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        message: `
        <div class="talkbubble-badge">
            <lottie-player loop autoplay src="./resources/animations/media.json"></lottie-player>
        </div>
        <p>
            I use 
            <a class="highlight" href="https://krita.org/" target="_blank">Krita</a> 
            for digital art.
        </p> 
        <div class="gallery">
            <div class="art" style="background-image: url(./artwork/thumbnail/alone.jpg)"><img type="image/webp" loading="lazy" src="./artwork/alone.webp"></div>
            <div class="art" style="background-image: url(./artwork/thumbnail/weatherin-with-you.jpg)"><img type="image/webp" loading="lazy" src="./artwork/weatherin-with-you.webp"></div>
            <div class="art" style="background-image: url(./artwork/thumbnail/ig-girl.jpg)"><img type="image/webp" loading="lazy" src="./artwork/ip-girl.webp"></div>
            <div class="art" style="background-image: url(./artwork/thumbnail/for-weirdos.jpg)"><img type="image/webp" loading="lazy" src="./artwork/for-weirdos.webp"></div>
            <div class="art" style="background-image: url(./artwork/thumbnail/batman.jpg)"><img type="image/webp" loading="lazy" src="./artwork/batman.webp"></div>
            <div class="art" style="background-image: url(./artwork/thumbnail/ashutti.jpg)"><img type="image/webp" loading="lazy" src="./artwork/ashutti.webp"></div>
        </div>`,
        position: -80,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        message: `
        <div class="talkbubble-badge">
            <lottie-player loop autoplay src="./resources/animations/dna.json"></lottie-player>
        </div>
        <p>
            I’m Jewel John, a Game Developer who builds same ol’ games a little different. Go ahead and check out my protfolio.
            <span class="highlight">This website is under development.</span>
        </p>
        <div class="cache">
            <img src="./resources/images/green.png">
            <img src="./resources/images/sunset.png">
            <img src="./resources/images/sunny.png">
            <img src="./resources/images/forest.png">
            <img src="./resources/images/cloudy.png">
        </div>
        `,
        position: 0,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        message: `
        <div class="talkbubble-badge">
            <lottie-player loop autoplay src="./resources/animations/folder.json"></lottie-player>
        </div>
        <p>
            Check out my <a class="highlight" href="https://unity.com/" target="_blank">Unity</a> projects.
        </p> 
        <div class="portfolio">
            <div class="project">
                <img type="image/webp" loading="lazy" src="./projects/burny-rush.webp">
                <div class="content">
                    <h2>Burny Rush</h2>
                    <p>High-fidelity racing game for desktop. <span class="highlight">current project.</span></p>
                    <a href="https://jewelvjohn.github.io/burny-rush/" target="_blank"><span>Check out</span></a>
                </div>
            </div>
            <div class="project">
                <img type="image/webp" loading="lazy" src="./projects/stratosphere.webp">
                <div class="content">
                    <h2>Stratosphere</h2>
                    <p>Third-person open-world game demo project.</p>
                    <a href="https://jewelvjohn.github.io/stratosphere/" target="_blank"><span>Check out</span></a>
                </div>
            </div>
        </div>`,
        position: 80,
        light: false,
        focus: true,
        range: 40
    });
    interactionContainer.addInteractionPoint({
        message: `
        <div class="talkbubble-badge">
            <lottie-player loop autoplay src="./resources/animations/messages.json"></lottie-player>
        </div>
        <p>
            Connect with me through my socials.
        </p> 
        <div class="talkbubble-social"> 
            <a href="https://www.linkedin.com/in/jewelvjohn/" target="_blank">
                <lottie-player loop hover src="./resources/animations/linkedin.json"></lottie-player>
            </a> 
            <a href="https://github.com/jewelvjohn" target="_blank">
                <lottie-player loop hover src="./resources/animations/github.json"></lottie-player>
            </a> 
            <a href="https://www.instagram.com/jewelvjohn/" target="_blank">
                <lottie-player id="instagram-camera" src="./resources/animations/instagram.json"></lottie-player>
            </a> 
            <a href="https://dribbble.com/jeweljohn" target="_blank">
                <lottie-player loop hover id="instagram-camera" src="./resources/animations/dribbble.json"></lottie-player>
            </a> 
        </div>`,
        position: 160,
        light: false,
        focus: true,
        range: 40
    });

    // <a class="talkbubble-link" href="./about/"><i>Go Ahead</i></a>

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
        },
    });
}

function loadEnvironment() {
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, -200), 6, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, -120), 6, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, -40), 6, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, 40), 6, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, 120), 6, 80);
    createBlinder(new THREE.Vector3(cameraPositionOffset.x + 4, 40, 200), 6, 80);

    // const gridHelper = new THREE.GridHelper(400, 40);
    // scene.add(gridHelper);

//exo planet
    const loader = new GLTFLoader(loadingManager);
    loader.load("./resources/3d/exo planet.glb", (gltf) => {
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
        model.position.set(0, 0, -160);
        model.rotation.y = toRadian(-90);

        if(stages['exo_planet']) {
            stages['exo_planet'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xCCFFFA, 1500, 2500);
            const sky = "./resources/images/green.png";
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['exo_planet'] = stage;
        }
    });

//spiral city
    loader.load("./resources/3d/spiral city.glb", (gltf) => {
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
        model.position.set(0, 0, -80);
        model.rotation.y = toRadian(-90);

        if(stages['spiral_city']) {
            stages['spiral_city'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xFFE4B4, 500, 1000);
            const sky = "./resources/images/sunset.png";
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['spiral_city'] = stage;
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
        model.rotation.y = toRadian(-90);

        if(stages['gas_station']) {
            stages['gas_station'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xB1DDDC, 650, 1000);
            const sky = "./resources/images/sunny.png";
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['gas_station'] = stage;
        }
    });

    loader.load("./resources/3d/lfa.glb", (gltf) => {
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
        model.position.set(40, 0, -60);
        model.rotation.y = toRadian(-45);

        if(stages['gas_station']) {
            stages['gas_station'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xB1DDDC, 650, 1000);
            const sky = "./resources/images/sunny.png";
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['gas_station'] = stage;
        }
    });

//medieval town
    loader.load("./resources/3d/medieval town.glb", (gltf) => {
        const model = gltf.scene;
        model.traverse(function(child) {
            if(child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if(child.material.name != "vegitation") {
                    child.material.side = THREE.FrontSide;
                    child.material.shadowSide = THREE.FrontSide;
                }
                csm.setupMaterial(child.material);
            }
        });
        model.scale.set(10, 10, 10);
        model.position.set(0, 0, 80);
        model.rotation.y = toRadian(-90);

        if(stages['medieval_town']) {
            stages['medieval_town'].addObject(model);
        } else {
            const fog = new THREE.Fog(0xE3ECFF, 650, 1200);
            const sky = "./resources/images/forest.png";
            const stage = new Stage(scene, sky, fog);
            stage.addObject(model);
            stages['medieval_town'] = stage;
        }
    });

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
                }else if(child.material.name == "ocean"){
                    const mask = new THREE.TextureLoader().load("./resources/textures/foamMask.jpg");
                    const noise = new THREE.TextureLoader().load("./resources/textures/water.png");
                    noise.wrapT = noise.wrapS = THREE.RepeatWrapping;
                    waterMaterial = new THREE.ShaderMaterial({
                        vertexShader: vertexShader,
                        fragmentShader: fragmentShader
                    });
                    waterMaterial.uniforms.uTime = {value: 0};
                    waterMaterial.uniforms.uFoamColor = {value: new THREE.Color(0xFFFFFF)};
                    waterMaterial.uniforms.uWaterColor = {value: new THREE.Color(0x133A4B)};
                    waterMaterial.uniforms.uFoamTiling = {value: 32};
                    waterMaterial.uniforms.uMask = {value: mask};
                    waterMaterial.uniforms.uNoise = {value: noise};
                    child.material = waterMaterial;
                }else{
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
            const fog = new THREE.Fog(0xBDE5E4, 800, 1500);
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
        selectStage('exo_planet');
    } else if(position <= -40) {
        selectStage('spiral_city');
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

function loopPlayer() {
    if((player.positionRef == player.minBound) && inputSystem.axes.horizontal < 0) {
        player.model.position.z = player.maxBound;
        player.positionRef = player.model.position.z;

        textBubbleUpdate();
        cameraMovement();
        updateStages();
    }

    if((player.positionRef == player.maxBound) && inputSystem.axes.horizontal > 0) {
        player.model.position.z = player.minBound;
        player.positionRef = player.model.position.z;
        
        textBubbleUpdate();
        cameraMovement();
        updateStages();
    }
}

function loadSky() {
    cacheImage('./resources/images/green.png');
    cacheImage('./resources/images/sunset.png');
    cacheImage('./resources/images/sunny.png');
    cacheImage('./resources/images/forest.png');
    cacheImage('./resources/images/cloudy.png');
}

// function loadArt() {
//     cacheImage('./artwork/alone.webp');
//     cacheImage('./artwork/ashutti.webp');
//     cacheImage('./artwork/batman.webp');
//     cacheImage('./artwork/for-weirdos.webp');
//     cacheImage('./artwork/ip-girl.webp');
//     cacheImage('./artwork/weatherin-with-you.webp');
// }

// function loadProjects() {
//     cacheImage('./projects/burny-rush.webp');
//     cacheImage('./projects/stratosphere.webp');
// }

//initializes the whole scene
function init() {
    loadingScreen = document.querySelector('#loading-screen');
    loadingBar = document.querySelector('#loading-bar');
    loadingText = document.querySelector('#loading-text');
    
    startButton = document.querySelector('#start-button');
    startButton.disabled = true;
    startButton.onclick = () => {
        player.startIdle();
        loadingScreen.style.display = 'none';
        create({
            player:'#instagram-camera',
            mode:"cursor",
            actions: [{type: "hold"}]
        });
    }

    sky = document.getElementById('sky');
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
    renderer.outputEncoding = THREE.sRGBEncoding;
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
    window.addEventListener('focus', () => {
        loadSky();
    });
    
    player = new CharacterController('./resources/3d/character.glb', scene, loadingManager, -200, 200, true);
    inputSystem = new InputSystem();

    loadingManager.onProgress = function(url, loaded, total) {
        const progress = (loaded / total) * 100;
        loadingText.innerText = `Loading assets ${loaded} out of ${total}`;
        loadingBar.value = progress;
    }
    loadingManager.onLoad = function() {
        startButton.disabled = false;
        loadingText.innerText = `Finished Loading`;
    }
    
    loadSky();
    loadMap();
    // loadArt();
    // loadProjects();
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

const fixedTimeStep = 1/60;
const maxDelta = 0.1;
let accumulator = 0;

//game loop
function update() {
    const delta = Math.min(clock.getDelta(), maxDelta);
    accumulator += delta;

    while (accumulator >= fixedTimeStep) {
        if(player.model) {
            if(player.loop) loopPlayer();
            player.update(inputSystem.axes.horizontal, fixedTimeStep);
            textBubbleUpdate();
            cameraMovement();
            updateStages();
            updateMap();
        }
        accumulator -= fixedTimeStep;
    }

    var time = clock.getElapsedTime();
    if(waterMaterial) waterMaterial.uniforms.uTime = {value: time};

    
    csm.update();
    stats.update();
    renderer.render(scene, camera);
    interfaceRenderer.render(scene, camera);
    
    requestAnimationFrame(update);
    // console.log(renderer.info.render.triangles);
}

init();
update();