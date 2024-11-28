export class Stage {
    constructor(scene, sky, fog) {
        this.objects = [];
        this.sky = sky;
        this.fog = fog;
        this.isActive = false;
        this.scene = scene;
        this.mixer = null;
        this.action = null;
    }

    initializeAnimations(mixer, action) {
        this.mixer = mixer;
        this.action = action;
    }

    addObject(object) {
        this.objects.push(object);
        this.scene.add(object);
        if(this.isActive) { object.visible = true; }
        else { object.visible = false; }
    }

    showStage() {
        this.objects.forEach(object => { object.visible = true; });
        this.isActive = true;
        if(this.mixer) this.action.play();
    }
    
    hideStage() {
        this.objects.forEach(object => { object.visible = false; });
        this.isActive = false;
        // if(this.mixer) this.action.stop();
    }
}