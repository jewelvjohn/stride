varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform sampler2D uMap;

void main() {
    vec4 color = texture2D(uMap, vUv);
    if(color.a < 0.5) discard;
    gl_FragColor = vec4(color);
}