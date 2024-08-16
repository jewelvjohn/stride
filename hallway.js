import './style.css'
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'; 
import {GLTFLoader} from 'three/examples/jsm/Addons.js';
import {OutlineEffect} from 'three/addons/effects/OutlineEffect.js';
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/Addons.js';

import {InputSystem} from './resources/system/input.js';
import {CharacterController} from './resources/system/character.js';

/* 
    Current Bugs :-
    --null--
    Solved Bugs  :-
    1. Player rotates opposite direction to reach idle rotation when tab refocuses
    2. Input system freezes when tab is unfocused while giving input
    3. Movement glitch when a keyboard input is used while the mouse pointer leave the same control button
    4. The movement speed changes with the frame rate
    5. Input system freezes when modifier keys are held
 */

let scene, camera, renderer, effect, stats;
let hallway, painting;
let hallwayMixer, hallwayActions = {};
let inputSystem, player;
let interfaceRenderer;
let textBubble, textContainer;
let texts = {};
let lights = [];

const cameraLerp = 0.1;
const cameraLookAtOffset = new THREE.Vector3(0, 120, 0);
const cameraPositionOffset = new THREE.Vector3(-500, 250, 250);
const talkBubbleOffset = new THREE.Vector3(0, 210, 0);
// const interactionPoints = [-1000, -600];
const interactionPoints = [-1000];
const interactionRange = 120;
const highEndGraphics = true;

var isDoorOpen = true;
var isTextBubbleVisible = false;
var isInteracting = false; 
var interactionId = -1;
var currentInteractionId = -1;
var cameraPosition = new THREE.Vector3(-500, 250, 250);
var cameraLookAt = new THREE.Vector3(0, 100, 0);
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
    for(let i=0; i<interactionPoints.length; i++) {
        if(player.model.position.z < (interactionPoints[i]+(interactionRange/2)) && player.model.position.z > (interactionPoints[i]-(interactionRange/2))) {
            interactionId = i;
            isInteracting = true;
            player.interactionMode = true;
            break;
        }
    }

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
    const manager = new THREE.LoadingManager();
    const loader = new GLTFLoader(manager);
    loader.load('resources/models/hallway.glb', initializeEnvironment);
    loader.load('resources/models/phone.glb', (gltf) => {
        painting = gltf.scene;
        painting.traverse(function(child) {
            if(child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.side = THREE.FrontSide;
            }
        });
        painting.scale.set(50, 50, 50);
        painting.position.set(150, 80, interactionPoints[0]);
        painting.rotation.set(0, toRadian(-90), 0);
        scene.add(painting);
    });
}

function initializeEnvironment(gltf) {
    hallway = gltf.scene;
    const animations = gltf.animations;

    // animations.forEach((clip, index) => {
    //     console.log(`Animation ${index}: ${clip.name}`);
    // });
    
    hallway.traverse(function(child) {
        if(child.isMesh) {
            child.castShadow = true;
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
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
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
        lights[0] = centerLight;
        
        for(let i=0; i<interactionPoints.length; i++) {
            const spotLight = new THREE.SpotLight(color, intensity, distance, angle, penubra, decay);
            spotLight.position.set(lightPositionX, lightPositionY, interactionPoints[i]);
            spotLight.target.position.set(lightTarget, 0, interactionPoints[i]);
            spotLight.castShadow = true;
            spotLight.shadow.bias = bias;
            
            scene.add(spotLight);
            scene.add(spotLight.target);
            lights[i+1] = spotLight;
        }
    } else {
        //simple lighting
        const dirLight = new THREE.DirectionalLight(color, 5);
        dirLight.position.set(0, 200, 100);
        scene.add(dirLight);
    }
}

//move camera with player
function cameraMovement() {
    cameraLookAt = lerpVector3(cameraLookAt, player.model.position.clone().add(cameraLookAtOffset), cameraLerp);
    camera.lookAt(cameraLookAt);
    cameraPosition = lerpVector3(cameraPosition, player.model.position.clone().add(cameraPositionOffset), cameraLerp);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
}

//initializes the whole scene
function init() {
    const canvas = document.querySelector('canvas.webgl');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(-500, 250, 250);
    camera.rotation.set(0, 0, 0)
    camera.lookAt(0, 100, 0);
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        canvas: canvas
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.enabled = true;
    
    stats = new Stats();
    document.body.appendChild(stats.dom);
    window.addEventListener('resize', onWindowResize);
    
    player = new CharacterController(scene, true, -1150, 150);
    inputSystem = new InputSystem();
    
    //post processing effects
    if(highEndGraphics) {
        effect = new OutlineEffect(renderer, {
            defaultThickness: 0.002,
            defaultColor: [0, 0, 0]
        });
    }

    loadEnvironment();
    initializeGUI();
    onWindowResize();
}

//resize event used for resizing camera and renderer when window is resized
function onWindowResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera.aspect = aspectRatio;
    camera.fov = THREE.MathUtils.clamp((-24 * aspectRatio)+70 , 35, 60);
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    interfaceRenderer.setSize(window.innerWidth, window.innerHeight);
}

// function levitationAnimation(model, delta, frequency, amplitude, offset) {
//     model.userData.time = (model.userData.time || 0) + delta * frequency;
//     model.position.y = offset + (Math.sin(model.userData.time) * amplitude);
// }

//game loop
function animate() {
    stats.update();
    renderer.render(scene, camera);
    interfaceRenderer.render(scene, camera);
    
    if(highEndGraphics) {
        effect.render(scene, camera);
    }
    
    const delta = clock.getDelta();
    if(hallway) {
        hallwayMixer.update(delta);
    } if(player.model) {
        player.update(inputSystem.axes.horizontal, delta);
        textBubbleUpdate();
        cameraMovement();
    } if(player.model && hallway) {
        if(player.model.position.z < -1100 && !isDoorOpen) openDoor();
        if(player.model.position.z > -1100 && isDoorOpen) closeDoor();
    }

    requestAnimationFrame(animate);
    // console.log(renderer.info.render.triangles);
}

init();
animate();