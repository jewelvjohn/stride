varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform float uTime;
uniform sampler2D uNoise; 

void main() {
    #include <begin_vertex>
    
    float normalSlop = - position.y / 2.0; //slope of the a line normal to the desired curve.
	float directionVectorX = abs(position.x) / (sqrt(1.0 + (normalSlop * normalSlop))); //distance scaled directional vectors towards the desired points.
	float directionVectorY = (abs(position.x) * normalSlop) / (sqrt(1.0 + (normalSlop * normalSlop)));

    vec3 bendPosition = position;

	bendPosition.x = pow((position.y / 2.0), 2.0); //point on the curve that corresponds to the initial point.
	bendPosition.y = position.y;

    if(position.x < 0.0) { //selecting from two available points on the line with the same distance to them.
        bendPosition.x -= directionVectorX;
	    bendPosition.y -= directionVectorY;
    } else {
        bendPosition.x += directionVectorX;
	    bendPosition.y += directionVectorY;
    }

    vec4 localPosition = vec4(bendPosition, 1.0);
    
    //include instance matrix for correct world position
    #ifdef USE_INSTANCING
        mat4 instanceWorldMatrix = modelMatrix * instanceMatrix;
        vec4 vWorldPosition = instanceWorldMatrix * localPosition;
    #else
        vec4 vWorldPosition = modelMatrix * localPosition;
    #endif

    vec2 globalUV = (vWorldPosition.xz * 0.001) - vec2(uTime * 0.02);
    float wind = texture2D(uNoise, globalUV).g;

    transformed = mix(position, bendPosition, wind);

    vPosition = transformed;
    vNormal = normal;
    vUv = uv;
    
    #include <project_vertex>
}