varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform float uTime;
uniform float uEdgeThreshold;
uniform sampler2D uMap;
uniform sampler2D uNoise;

void main() {  
    vec4 color = texture2D(uMap, vUv);
    color.a = smoothstep(0.0, 0.85, color.a);
    if (color.a < 0.5) discard;
    gl_FragColor = vec4(color.rgb, color.a);
}