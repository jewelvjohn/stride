varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform sampler2D map;

void main() {  
    vec4 color = texture2D(map, vUv);
    if(color.a < 0.5) discard;
    gl_FragColor = vec4(color.rgb, 1.0);
}