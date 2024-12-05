import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

export class ObjectOutline extends OutlineEffect {
    constructor(renderer, outlineGroup, parameters = {}) {
        super(renderer, parameters);
        this.outlineGroup = outlineGroup;
        this.render = function(scene, camera) {
            if (this.enabled === false) {
                renderer.render(scene, camera);
                return;
            }

            const currentAutoClear = renderer.autoClear;
            renderer.autoClear = this.autoClear;
            renderer.render(scene, camera);
            renderer.autoClear = currentAutoClear;
            this.renderOutline(outlineGroup, camera);
        };
    }
}