varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform float uTime;
uniform float radius;
uniform float i;
uniform float j;
uniform float k;
uniform sampler2D uNoise;

void main() {
    vec3 uInnerColor = vec3(1.0, 1.0, 1.0);
    vec3 uOuterColor = vec3(0.4, 0.6, 1.0);
    float scale = 2.0;
    float sphere = smoothstep(0.0, 0.75, 1.0 - distance(vec3(0.0), vPosition/scale));
    if(sphere <= 0.0) discard;

    vec3 color = mix(uOuterColor, uInnerColor, sphere);
    gl_FragColor = vec4(color, sphere);
}

// varying vec3 vPosition;
// varying vec3 vNormal;
// varying vec2 vUv;

// uniform float uTime;
// uniform float radius;
// uniform float i;
// uniform float j;
// uniform float k;
// uniform sampler2D uNoise;

// mat3 rotateX(float angle) {
//     float c = cos(angle);
//     float s = sin(angle);
//     return mat3(
//         1.0, 0.0, 0.0,
//         0.0, c, -s,
//         0.0, s, c
//     );
// }

// mat3 rotateY(float angle) {
//     float c = cos(angle);
//     float s = sin(angle);
//     return mat3(
//         c, 0.0, s,
//         0.0, 1.0, 0.0,
//         -s, 0.0, c
//     );
// }

// mat3 rotateZ(float angle) {
//     float c = cos(angle);
//     float s = sin(angle);
//     return mat3(
//         c, -s, 0.0,
//         s, c, 0.0,
//         0.0, 0.0, 1.0
//     );
// }

// vec3 remap(vec3 pos, vec3 rotation) {
//     mat3 rotMatrix = rotateZ(rotation.z) * rotateY(rotation.y) * rotateX(rotation.x);
//     return rotMatrix * pos;
// }

// void main() {
//     float thickness = 0.05;

//     vec3 coord_1 = remap(vPosition, vec3(i, j, k));
//     vec3 coord_2 = remap(vPosition, vec3(j, i, k));

//     float torus_1 = (thickness*thickness) - (pow(sqrt((coord_1.x*coord_1.x) + (coord_1.y*coord_1.y)) - radius, 2.0) + (coord_1.z*coord_1.z));
//     float torus_2 = (thickness*thickness) - (pow(sqrt((coord_2.x*coord_2.x) + (coord_2.y*coord_2.y)) - radius + 0.5, 2.0) + (coord_2.z*coord_2.z));

//     if(torus_1 < 0.0 && torus_2 < 0.0) discard;

//     gl_FragColor = vec4(1.0);
// }