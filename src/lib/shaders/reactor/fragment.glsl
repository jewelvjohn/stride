varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform float uTime;
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