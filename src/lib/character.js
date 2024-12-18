import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/Addons.js';

export class CharacterController {
    constructor(filename, onLoad, introCall, scene, manager, minBound, maxBound, loop = false, autoPositions = null, autoLength = null) {
        this.scene = scene;
        this.model = null;
        this.pause = false;
        this.takeInputs = true;
        this.inputStarted = false;
        this.introFinished = false;
        this.lastInputStartTime = 0;
        this.inputPersistance = 0.25;
        this.onLoad = onLoad;
        this.introCall = introCall;
        this.transition = 0.25;

        this.mixer = null;
        this.actions = {};
        this.activeAction = null;
        this.previousActions = null;
        this.runAnimation = false;

        this.interactionMode = false;
        this.moveInput = 0;
        this.positionRef = 0;

        //constants
        this.runSpeed = 38;
        this.rotationLerp = 8;
        this.positionLerp = 16;
        this.minBound = minBound;
        this.maxBound = maxBound;
        this.loop = loop;

        if(autoPositions) {
            this.autoLength = autoLength;
            this.autoPositions = autoPositions;
        }
    
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
        const step = new Uint8Array([0, 164, 255]);
        const gradientMap = new THREE.DataTexture(step, step.length, 1, THREE.RedFormat);
        gradientMap.needsUpdate = true;
    
        model.traverse((child) => {
            if(child.isMesh) {
                child.material = new THREE.MeshToonMaterial({color: 0xFFFFFF, map: child.material.map, gradientMap: gradientMap});
                child.castShadow = true;
                child.receiveShadow = false;
                child.material.side = THREE.DoubleSide;
                child.material.shadowSide = THREE.FrontSide;
                // this.csm.setupMaterial(child.material);
            }
        });
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
    
        //after animations are all loaded up the animations mixer is initialized with all the animation clips
        this.actions[0] = this.mixer.clipAction(gltf.animations[1]); //idle
        this.actions[1] = this.mixer.clipAction(gltf.animations[2]); //running
        this.actions[2] = this.mixer.clipAction(gltf.animations[3]); //greet
        this.actions[3] = this.mixer.clipAction(gltf.animations[4]); //choice
        this.actions[4] = this.mixer.clipAction(gltf.animations[5]); //show

        this.model.scale.set(10, 10, 10);
        this.model.rotation.y = CharacterController.toRadian(-90);
        this.scene.add(this.model);
        this.onLoad();
    }

    //start off animation
    startIdle() {
        this.activeAction = this.actions[0];
        this.activeAction.play();
    }

    startWakeUp() {
        this.takeInputs = false;
        this.actions[2].clampWhenFinished = true;
        this.actions[2].loop = THREE.LoopOnce;
        this.actions[4].clampWhenFinished = true;
        this.actions[4].loop = THREE.LoopOnce;

        this.mixer.addEventListener('finished', () => {
            if(this.activeAction == this.actions[2]) {
                this.playAction(3, 0.2);
                this.introCall(2);
                this.takeInputs = true;
            }
        });

        this.playAction(2, 0);
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
        if(!this.loop) {
            const insideBound = (this.positionRef > this.minBound) && (this.positionRef < this.maxBound);
            if((Math.abs(this.moveInput) > 0) && insideBound) {
                if(!this.runAnimation) {
                    this.runAnimation = true;
                    this.playAction(1, this.transition);
                }
            } else {
                if(this.runAnimation) {
                    this.runAnimation = false;
                    this.playAction(0, this.transition);
                }
            }
        } else {
            if(Math.abs(this.moveInput) > 0) {
                if(!this.runAnimation) {
                    this.runAnimation = true;
                    this.playAction(1, this.transition);
                }
            } else {
                if(this.runAnimation) {
                    this.runAnimation = false;
                    this.playAction(0, this.transition);
                }
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
            else if(this.moveInput != 0) this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, -((1 - this.moveInput) / 2) * Math.PI, this.rotationLerp * delta);
        }
    }

    isAutoPosition() {
        const halfDistance = this.autoLength * 2;
        let flag = false;
        for(let i=0; i<this.autoPositions.length; i++) {
            const position = this.autoPositions[i];
            if(i == 0) {
                if(this.model.position.z < position + halfDistance) flag = true;
            } else if(i == this.autoPositions.length-1) {
                if(this.model.position.z > position - halfDistance) flag = true;
            } else if((this.model.position.z > position - halfDistance) && (this.model.position.z < position + halfDistance)) flag = true;
        }
        return flag;
    }
    
    controller(input, time) {
        if(this.takeInputs) {
            if(input !== 0) {
                if(!this.introFinished) {
                    this.introFinished = true;
                    this.introCall(3);
                }
                if(!this.inputStarted) {
                    this.inputStarted = true;
                    this.lastInputStartTime = time;
                }
                this.moveInput = input;
            } else {
                if(this.inputStarted) this.inputStarted = false;
                if((time > this.lastInputStartTime + this.inputPersistance) && !this.isAutoPosition()) this.moveInput = input;
            }
        } else this.moveInput = 0;
    }

    update(delta) {
        this.characterMovement(delta);
        this.characterAnimation(delta);
    }
}