import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/Addons.js';

//class for storing character data like animations
export class CharacterController {
    constructor(scene, interactionMode, minBound, maxBound) {
        this.scene = scene;
        this.model = null;
        this.pause = false;

        this.mixer = null;
        this.actions = {};
        this.activeAction = null;
        this.previousActions = null;
        this.runAnimation = false;

        this.interactionMode = interactionMode;
        this.moveInput = 0;
        this.positionRef = 0;

        //constants
        this.runSpeed = 470;
        this.rotationLerp = 20;
        this.positionLerp = 20;
        this.minBound = minBound;
        this.maxBound = maxBound;
    
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
        const step = new Uint8Array([64, 128, 255]);
        const gradientMap = new THREE.DataTexture(step, step.length, 1, THREE.RedFormat);
        gradientMap.needsUpdate = true;
    
        model.traverse(function(child) {
            if(child.isMesh) {
                child.material = new THREE.MeshToonMaterial({color: 0xFFFFFF, map: child.material.map, gradientMap: gradientMap});
                child.castShadow = true;
                child.receiveShadow = false;
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
        const insideBound = (this.positionRef > this.minBound) && (this.positionRef < this.maxBound);
        if((Math.abs(this.moveInput) > 0) && insideBound) {
            if(!this.runAnimation) {
                this.runAnimation = true;
                this.playAction(2, 0.15);
            }
        } else {
            if(this.runAnimation) {
                this.runAnimation = false;
                this.playAction(0, 0.15);
            }
        }
    }
    
    //handles player translation and rotation
    characterMovement(delta) {
        if(!this.pause) {
            this.positionRef += (this.runSpeed * this.moveInput * delta);
            this.positionRef = THREE.MathUtils.clamp(this.positionRef, this.minBound, this.maxBound);
            this.model.position.z = THREE.MathUtils.lerp(this.model.position.z, this.positionRef, this.positionLerp * delta);
            if(this.interactionMode) this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, ((1 - this.moveInput) / 2) * Math.PI, this.rotationLerp * delta);
            else if(this.moveInput != 0)this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, ((1 - this.moveInput) / 2) * Math.PI, this.rotationLerp * delta);
        }
    }

    update(input, delta) {
        this.mixer.update(delta);
        this.moveInput = input.axes.horizontal;
        this.characterMovement(delta);
        this.characterAnimation();
    }
}