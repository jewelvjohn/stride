varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform float uTime;
uniform float i;
uniform float j;
uniform float k;

mat3 rotateX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
    );
}

mat3 rotateY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
    );
}

mat3 rotateZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, -s, 0.0,
        s, c, 0.0,
        0.0, 0.0, 1.0
    );
}

vec3 remap(vec3 pos, vec3 rotation) {
    mat3 rotMatrix = rotateZ(rotation.z) * rotateY(rotation.y) * rotateX(rotation.x);
    return rotMatrix * pos;
}

void main() {
	vPosition = position;
	vNormal = normal;
	vUv = uv;

	vec3 transformed = remap(position, vec3(uTime*i, uTime*j, uTime*k));
	gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}