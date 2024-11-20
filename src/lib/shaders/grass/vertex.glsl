varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
    #include <begin_vertex>
    
    float normalSlop = - position.y / 2.0; //slope of the a line normal to the desired curve.
	float directionVectorX = abs(position.x) / (sqrt(1.0 + (normalSlop * normalSlop))); //distance scaled directional vectors towards the desired points.
	float directionVectorY = (abs(position.x) * normalSlop) / (sqrt(1.0 + (normalSlop * normalSlop)));

	float pointX = pow((position.y / 2.0), 2.0); //point on the curve that corresponds to the initial point.
	float pointY = position.y;

    if(position.x < 0.0) { //selecting from two available points on the line with the same distance to them.
        transformed.x = pointX - directionVectorX;
	    transformed.y = pointY - directionVectorY;
    } else {
        transformed.x = pointX + directionVectorX;
	    transformed.y = pointY + directionVectorY;
    }
    
    vPosition = transformed;
    vNormal = normal;
    vUv = uv;
    
    #include <project_vertex>
}