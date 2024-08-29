import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/Addons.js';

export class CharacterController {
    constructor(filename, scene, manager, minBound, maxBound) {
        this.scene = scene;
        this.model = null;
        this.pause = false;
        this.takeInputs = true;

        this.mixer = null;
        this.actions = {};
        this.activeAction = null;
        this.previousActions = null;
        this.runAnimation = false;

        this.interactionMode = false;
        this.moveInput = 0;
        this.positionRef = 0;

        //constants
        this.runSpeed = 1.9;
        this.rotationLerp = 10;
        this.positionLerp = 20;
        this.minBound = minBound;
        this.maxBound = maxBound;
    
        window.addEventListener('blur',() => { if(!this.pause) this.pause = true; });
        window.addEventListener('focus',() => { if(this.pause) this.pause = false; });

        this.loadCharacter(filename, manager);
    }

    static toRadian(angle) {
        return angle * Math.PI / 180;
    }

    //loads the player model file
    loadCharacter(filename, manager) {
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
                child.material.side = THREE.FrontSide;
            }
        });
        model.scale.set(0.5, 0.5, 0.5);
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
    
        //after animations are all loaded up the animations mixer is initialized with all the animation clips
        this.actions[0] = this.mixer.clipAction(gltf.animations[1]); //idle
        this.actions[1] = this.mixer.clipAction(gltf.animations[2]); //running
        this.actions[2] = this.mixer.clipAction(gltf.animations[3]); //walking
        this.actions[3] = this.mixer.clipAction(gltf.animations[4]); //waking up

        this.model.rotation.y = CharacterController.toRadian(-90);
        this.scene.add(this.model);
    }

    //start off animation
    startIdle() {
        this.activeAction = this.actions[0];
        this.activeAction.play();
    }

    startWakeUp() {
        this.takeInputs = false;
        this.actions[3].clampWhenFinished = true;
        this.actions[3].loop = THREE.LoopOnce;
        this.actions[3].getMixer().addEventListener('finished', () => {
            this.playAction(0, 0.4);
            this.takeInputs = true;
        });

        this.activeAction = this.actions[3];
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
    characterAnimation(delta) {
        this.mixer.update(delta);
        const insideBound = (this.positionRef > this.minBound) && (this.positionRef < this.maxBound);
        if((Math.abs(this.moveInput) > 0) && insideBound) {
            if(!this.runAnimation) {
                this.runAnimation = true;
                this.playAction(2, 0.2);
            }
        } else {
            if(this.runAnimation) {
                this.runAnimation = false;
                this.playAction(0, 0.2);
            }
        }
    }
    
    //handles player translation and rotation
    characterMovement(delta) {
        if(!this.pause) {
            this.positionRef += (this.runSpeed * this.moveInput * delta);
            this.positionRef = THREE.MathUtils.clamp(this.positionRef, this.minBound, this.maxBound);
            this.model.position.z = THREE.MathUtils.lerp(this.model.position.z, this.positionRef, this.positionLerp * delta);
            if(this.interactionMode) this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, -((1 - this.moveInput) / 2) * Math.PI, this.rotationLerp * delta);
            else if(this.moveInput != 0)this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, -((1 - this.moveInput) / 2) * Math.PI, this.rotationLerp * delta);
        }
    }

    update(input, delta) {
        if(this.takeInputs) this.moveInput = input;
        else this.moveInput = 0;
        this.characterMovement(delta);
        this.characterAnimation(delta);
    }
}