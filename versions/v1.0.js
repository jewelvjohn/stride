import './style.css'
import * as THREE from 'three' 
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import Stats from 'three/addons/libs/stats.module.js';

const clock = new THREE.Clock();
const manager = new THREE.LoadingManager();
let scene, camera, renderer, loader, mixer, stats, actions, previousAction, activeAction;
var character;
var leftInput, rightInput;

class Character {
    constructor(model, mixer) {
        this.model = model;
        this.mixer = mixer;
        
        this.walking = false;
        this.direction = 1;
    }
}

const cameraLookAtOffset = new THREE.Vector3(0, 100, 0);
const cameraPositionOffset = new THREE.Vector3(-500, 300, 300);
const walkingLimit = new THREE.Vector2(-800, 800);
var cameraPosition = new THREE.Vector3(-500, 300, 0);

function init() {
    const container = document.createElement( 'div' );
    document.body.appendChild(container);

    loader = new FBXLoader(manager);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(-500, 250, 0);
    camera.rotation.set(0, 0, 0)
    camera.lookAt(0, 100, 0);
    
    scene.background = new THREE.Color( 0xa0a0a0 );
    scene.fog = new THREE.Fog( 0xa0a0a0, 400, 2000 );
    
    renderer = new THREE.WebGLRenderer({
        antialias: true
    })
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
    window.addEventListener('resize', onWindowResize);
    
    // lights
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, 5 );
    hemiLight.position.set( 0, 200, 0 );
    scene.add( hemiLight );
    
    const dirLight = new THREE.DirectionalLight( 0xffffff, 5 );
    dirLight.position.set( 0, 200, 100 );
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = - 100;
    dirLight.shadow.camera.left = - 120;
    dirLight.shadow.camera.right = 120;
    scene.add( dirLight );

    // ground
    const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper( 2000, 20, 0x000000, 0x000000 );
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    stats = new Stats();
    container.appendChild(renderer.domElement)
    container.appendChild(stats.dom);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function loadCharacter() {
    loader.load( 'resources/models/character.fbx', function(object) {
        if(object.animations && object.animations.length) {
            mixer = new THREE.AnimationMixer(object);
            const action = mixer.clipAction(object.animations[0]);
            action.play();
        } else {
            mixer = null;
        }

        object.traverse(function(child) {
            if(child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        scene.add(object);
        createController(object, object.animations);
    });
}

function createController(model, animations) {
    mixer = new THREE.AnimationMixer(model);
    character = new Character(model, mixer);
    actions = {};
    
    for(let i=0; i<animations.length; i++) {
        const clip = animations[i];
        const action = character.mixer.clipAction(clip);
        actions[i] = action;
    }

    const anim = new FBXLoader();
    anim.load('resources/models/walking.fbx', function(animation) {
        const walking = character.mixer.clipAction(animation.animations[0]);
        actions[1] = walking;
    });
    
    // keyboard controls
    document.addEventListener('keydown', function(event) {
        if(!character.walking) {
            if((event.key === 'a') && character.model.position.z > walkingLimit.x) {
                MoveLeft();
            } else if(event.key === 'd' && character.model.position.z < walkingLimit.y) {
                MoveRight();
            }
        }
    });

    document.addEventListener('keyup', function(event) {
        if(character.walking) {
            if(event.key === 'a' || event.key === 'd') {
                StopMoving();
            }
        }
    });

    character.walking = false;
    activeAction = actions[0];
    activeAction.play();
}

function CreateInputSystem() {
    leftInput = false;
    rightInput = false;

    document.addEventListener('keydown', function(event) {
        if(event.key === 'a' || event.key === 'ArrowLeft') {
            leftInput = true;
        } else if(event.key === 'd' || event.key === 'ArrowRight') {
            rightInput = true;
        }
    });

    document.addEventListener('keyup', function(event) {
        if(event.key === 'a' || event.key === 'ArrowLeft') {
            leftInput = false;
        } else if(event.key === 'd' || event.key === 'ArrowRight') {
            rightInput = false;
        }
    });
}

function FadeToAction(index, duration) {
    previousAction = activeAction;
    activeAction = actions[index];

    if(previousAction !== activeAction) {
        previousAction.fadeOut(duration);
    }

    activeAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play();
}

function MoveLeft() {
    FadeToAction(1, 0.2);
    character.walking = true;
    character.direction = -1;
}

function MoveRight() {
    FadeToAction(1, 0.2);
    character.walking = true;
    character.direction = 1;
}

function StopMoving() {
    FadeToAction(0, 0.2);
    character.walking = false;
}

function FixedUpdate() {
    if(character) {
        // movement
        if(character.walking) {
            if(character.model.position.z < walkingLimit.x && character.direction < 0) {
                StopMoving();
            }
            if(character.model.position.z > walkingLimit.y && character.direction > 0){
                StopMoving();
            }
            character.model.rotation.y = THREE.MathUtils.lerp(character.model.rotation.y, ((1-character.direction)/2)* Math.PI, 0.1);
            character.model.position.z = character.model.position.z + (2.4 * character.direction);
        }

        // camera
        camera.lookAt(character.model.position.clone().add(cameraLookAtOffset));
        cameraPosition = LerpVector3(cameraPosition, character.model.position.clone().add(cameraPositionOffset), 0.05);
        camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    }
}

function LerpVector3(start, end, t) {
    return new THREE.Vector3(
        THREE.MathUtils.lerp(start.x, end.x, t),
        THREE.MathUtils.lerp(start.y, end.y, t),
        THREE.MathUtils.lerp(start.z, end.z, t)
    );
}

function Animate() {
    requestAnimationFrame(Animate);
    
    FixedUpdate();

    stats.update();
    renderer.render(scene, camera);
    const delta = clock.getDelta();
    if(mixer) mixer.update(delta);
}

init();
loadCharacter();
Animate()