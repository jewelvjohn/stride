class InteractionPoint {
    constructor(message, position, light, focus, range) {
        Object.assign(this, { message, position, light, focus, range });
        this.text = document.createElement('div');
        this.text.className = 'talkbubble-message';
        this.text.innerHTML = message;
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
        message = 'hello', 
        position = 0, 
        light = false, 
        focus = false, 
        range = 100
    } = {}) {
        this.points.push(new InteractionPoint(message, position, light, focus, range))
    }
}