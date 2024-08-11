import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/Addons.js';

//class for storing character data like animations
export class CharacterController {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.pause = false;

        this.mixer = null;
        this.actions = {};
        this.activeAction = null;
        this.previousActions = null;
        this.walkAnimation = false;
        this.runAnimation = false;

        this.runningMode = true;
        this.PositionRef = 0;
        this.walkSpeed = 2.6;
        this.runSpeed = 6.6;
        this.moveInput = 0;
        this.rotationLerp = 0.15;
        this.positionLerp = 0.2;
    
        window.addEventListener('blur',() => { this.pause = true; });
        window.addEventListener('focus',() => { this.pause = false; });

        this.loadCharacter('resources/models/character.glb');
    }

    //loads the player model file
    loadCharacter(filename) {
        const manager = new THREE.LoadingManager();
        const loader = new GLTFLoader(manager);
        loader.load(filename, this.initializeCharacter.bind(this));
    }
    
    //after player model is loaded it passed to this function to load additional animations
    initializeCharacter(gltf) {
        const model = gltf.scene;
        const twoTone = new Uint8Array([128, 255]);
        const gradientMap = new THREE.DataTexture(twoTone, twoTone.length, 1, THREE.RedFormat);
        gradientMap.needsUpdate = true;
    
        model.traverse(function(child) {
            if(child.isMesh) {
                child.material = new THREE.MeshToonMaterial({color: 0xFFFFFF, map: child.material.map, gradientMap: gradientMap});
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        model.scale.set(50, 50, 50);
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
    
        //after animations are all loaded up the animations mixer is initialized with all the animation clips
        this.actions[0] = this.mixer.clipAction(gltf.animations[1]);
        this.actions[1] = this.mixer.clipAction(gltf.animations[2]);
        this.actions[2] = this.mixer.clipAction(gltf.animations[3]);
        this.startIdle();
        this.model.rotation.y = (1/2) * Math.PI;
        this.scene.add(this.model);
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

    //change character animation according to input
    characterAnimation() {
        if(Math.abs(this.moveInput) > 0){
            if(!this.walkAnimation && !this.runningMode) {
                this.walkAnimation = true;
                this.runAnimation = false;
                this.playAction(1, 0.15);
            }
            if(!this.runAnimation && this.runningMode) {
                this.walkAnimation = false;
                this.runAnimation = true;
                this.playAction(2, 0.15);
            }
        } else {
            if(this.walkAnimation || this.runAnimation) {
                this.walkAnimation = false;
                this.runAnimation = false;
                this.playAction(0, 0.15);
            }
        }
    }
    
    //handles player translation and rotation
    characterMovement() {
        if(!this.pause) {
            //check if the character position is inside any interaction section
            // isInteracting = false;
            // for(let i=0; i<interactionPoints.length; i++) {
            //     if(this.model.position.z < (interactionPoints[i]+(interactionRange/2)) && this.model.position.z > (interactionPoints[i]-(interactionRange/2))) {
            //         interactionId = i;
            //         isInteracting = true;
            //         break;
            //     }
            // }

            //when to walk
            if(this.runningMode) {
                this.PositionRef += (this.runSpeed * this.moveInput);
            } else {
                this.PositionRef += (this.walkSpeed * this.moveInput);
            }

            //assign position and rotation according to the input
            this.model.position.z = THREE.MathUtils.lerp(this.model.position.z, this.PositionRef, this.positionLerp);
            this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, ((1 - this.moveInput) / 2) * Math.PI, this.rotationLerp);
        }
    }

    update(input) {
        this.moveInput = input;
        this.characterMovement();
        this.characterAnimation();
    }
}