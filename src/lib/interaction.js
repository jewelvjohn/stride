class InteractionPoint {
    constructor(position, light, focus, range) {
        Object.assign(this, { position, light, focus, range });
    }

    upperBound() {
        return (this.position+(this.range/2));
    }

    lowerBound() {
        return (this.position-(this.range/2));
    }
}

export class InteractionContainer {
    constructor() {
        this.points = [];
    }

    addInteractionPoint({
        position = 0, 
        light = false, 
        focus = false, 
        range = 100
    } = {}) {
        this.points.push(new InteractionPoint(position, light, focus, range));
    }
}