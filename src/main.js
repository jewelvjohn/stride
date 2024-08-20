import './styles/main.css'
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
    7. Sub-pages have problem accessing js files after deployment
    --null--
    Solved Bugs  :-
    1. Player rotates opposite direction to reach idle rotation when tab refocuses
    2. Input system freezes when tab is unfocused while giving input
    3. Movement glitch when a keyboard input is used while the mouse pointer leave the same control button
    4. The movement speed changes with the frame rate
    5. Input system freezes when modifier keys are held
    6. Mobile button buzz when held pressed
 */

let scene, camera, renderer, effect, stats, canvas;
let hallway, painting;
let hallwayMixer, hallwayActions = {};
let player, inputSystem, interactionContainer;
let interfaceRenderer;
let textBubble, textContainer;

const talkBubbleOffset = new THREE.Vector3(0, 210, 0);
const cameraLookAtLerp = 5;
const cameraPositionLerp = 5;
const cameraLookAtOffset = new THREE.Vector3(0, 140, 0);
const cameraPositionOffset = new THREE.Vector3(-500, 250, 250);

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

var highEndGraphics = false;
var isDoorOpen = true;
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
    interfaceRenderer.domElement.style.top = '0px';
    // interfaceRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(interfaceRenderer.domElement);

    const coneDiv = document.createElement('div');
    coneDiv.id = 'textCone';
    const coneImg = document.createElement('img');
    coneImg.src = './resources/images/cone.svg';
    coneDiv.appendChild(coneImg);

    interactionContainer = new InteractionContainer();
    interactionContainer.addInteractionPoint({
        message: '<p>Beautiful painting!</p>',
        position: -950,
        light: true,
        focus: true,
        range: 150 
    });
    interactionContainer.addInteractionPoint({
        message: '<p>Should I go ahead?</p><a class="talkbubble-link" href="./about/"><i>Go Ahead</i></a>',
        position: -1150,
        light: false,
        focus: false,
        range: 100 
    });

    textBubble = document.createElement('div');
    textBubble.className = 'talkbubble';
    textBubble.appendChild(coneDiv);

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
            transform: "translateY(calc(-50% - 10px))",
            opacity: 0,
        },
        {
            transform: "translateY(calc(-50% + 20px))",
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
            transform: "translateY(calc(-50% + 20px))",
            opacity: 1,
        },
        {
            transform: "translateY(calc(-50% - 10px))",
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

function closeDoor() {
    if(isDoorOpen) {
        hallwayActions[1].fadeOut(0.3);
        hallwayActions[0]
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(0.3)
            .play();
        isDoorOpen = false;
    }
}

function openDoor() {
    if(!isDoorOpen) {
        hallwayActions[0].fadeOut(0.3);
        hallwayActions[1]
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(0.3)
            .play();
        isDoorOpen = true;
    }
} 

function loadEnvironment() {
    const loader = new GLTFLoader(loadingManager);
    loader.load('./resources/3d/high-end/hallway.glb', initializeEnvironment);
    loader.load('./resources/3d/high-end/painting.glb', (gltf) => {
        painting = gltf.scene;
        painting.traverse(function(child) {
            if(child.isMesh) {
                child.castShadow = false;
                child.receiveShadow = false;
                child.material.side = THREE.FrontSide;
            }
        });
        painting.scale.set(50, 50, 50);
        painting.position.set(218, 120, interactionContainer.points[0].position);
        painting.rotation.set(toRadian(10), toRadian(-90), 0);
        scene.add(painting);
    });
}

function initializeEnvironment(gltf) {
    hallway = gltf.scene;
    const animations = gltf.animations;
    
    hallway.traverse(function(child) {
        if(child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = true;
            child.material.side = THREE.FrontSide;
        }
    });

    hallway.scale.set(50, 50, 50);
    hallway.position.set(20, 0, 0);
    hallway.rotation.y = toRadian(-90);

    hallwayMixer = new THREE.AnimationMixer(hallway);
    hallwayActions[0] = hallwayMixer.clipAction(animations[0]);
    hallwayActions[1] = hallwayMixer.clipAction(animations[1]);
    hallwayActions[0].clampWhenFinished = true;
    hallwayActions[1].clampWhenFinished = true;

    closeDoor();
    scene.add(hallway);
    
    //lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444400, 1);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);
    
    const color = 0xfffae6;
    const distance = 600;
    const angle = 45 * Math.PI/180;
    const intensity = 50;
    const penubra = 0.5;
    const decay = 0.5;
    const bias = -0.00005;
    const lightPositionX = -150;
    const lightPositionY = 280;
    const lightTarget = 100;
    
    
    if(highEndGraphics) {
        //high end lighting
        const centerLight = new THREE.SpotLight(color, intensity, distance, angle, penubra, decay);
        centerLight.position.set(lightPositionX, lightPositionY, 0);
        centerLight.target.position.set(lightTarget, 0, 0);
        centerLight.castShadow = true;
        centerLight.shadow.bias = bias;
        
        scene.add(centerLight);
        scene.add(centerLight.target);
        
        for(let i=0; i<interactionContainer.points.length; i++) {
            if(interactionContainer.points[i].light) {
                const spotLight = new THREE.SpotLight(color, intensity, distance, angle, penubra, decay);
                spotLight.position.set(lightPositionX, lightPositionY, interactionContainer.points[i].position);
                spotLight.target.position.set(lightTarget, 0, interactionContainer.points[i].position);
                spotLight.castShadow = true;
                spotLight.shadow.bias = bias;
                
                scene.add(spotLight);
                scene.add(spotLight.target);
            }
        }
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.shadowMap.enabled = true;
    } else {
        //simple lighting
        const dirLight = new THREE.DirectionalLight(color, 3);
        dirLight.position.set(-200, 200, -100);
        dirLight.target.position.set(0, 0, 0);
        scene.add(dirLight);
        scene.add(dirLight.target);

        renderer.shadowMap.type = THREE.BasicShadowMap;
        renderer.shadowMap.enabled = false;
    }
}

//move camera with player
function cameraMovement(delta) {
    cameraLookAt = lerpVector3(cameraLookAt, player.model.position.clone().add(cameraLookAtOffset), cameraLookAtLerp * delta);
    camera.lookAt(cameraLookAt);
    cameraPosition = lerpVector3(cameraPosition, player.model.position.clone().add(cameraPositionOffset), cameraPositionLerp * delta);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
}

//initializes the whole scene
function init() {
    canvas = document.querySelector('canvas.webgl');
    if(!isMobile()) highEndGraphics = true;
    if(!isTouch()) document.querySelector('div.touch-inputs').style.display = 'none';
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 1, 2000);
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
    
    player = new CharacterController('./resources/3d/high-end/character v2.glb', scene, loadingManager, -1150, 150, true);
    inputSystem = new InputSystem();
    
    effect = new OutlineEffect(renderer, {
        defaultThickness: 0.002,
        defaultColor: [0, 0, 0]
    });

    loadingManager.onProgress = function(url, loaded, total) {
        const progress = (loaded / total) * 100;
        console.log(`Loading: ${progress}`);
    }

    loadingManager.onLoad = function() {
        console.log(`Finished loading!`);
    }

    initializeGUI();
    loadEnvironment();
    onWindowResize();
}

//resize event used for resizing camera and renderer when window is resized
function onWindowResize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    
    camera.aspect = sizes.width / sizes.height;
    camera.fov = THREE.MathUtils.clamp((-26*camera.aspect)+80 , 35, 80);
    camera.updateProjectionMatrix();
    
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    interfaceRenderer.setSize(sizes.width, sizes.height);
}

//game loop
function update() {
    stats.update();
    renderer.render(scene, camera);
    interfaceRenderer.render(scene, camera);
    effect.render(scene, camera);
    
    const delta = clock.getDelta();
    if(hallway) {
        hallwayMixer.update(delta);
    } if(player.model) {
        player.update(inputSystem.axes.horizontal, delta);
        textBubbleUpdate();
        cameraMovement(delta);
    } if(player.model && hallway) {
        if(player.model.position.z < -1100 && !isDoorOpen) openDoor();
        if(player.model.position.z > -1100 && isDoorOpen) closeDoor();
    }

    requestAnimationFrame(update);
    // console.log(renderer.info.render.triangles);
}

init();
update();