varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform float uTime;
uniform float uSpeed;
uniform vec3 uColor_1;
uniform vec3 uColor_2;
uniform vec3 uShadowColor;
uniform sampler2D uNoise;
uniform sampler2D uVoronoi;

vec3 multiply(vec3 base, vec3 blend, float factor) {
    return base * (1.0 + (blend - 1.0) * factor);
}

float softlight(float base, float blend, float factor) {
    return base + (base * base * (1.0 - 2.0 * blend) + 2.0 * base * blend - base) * factor;
}

float drawsphere(vec2 vector) {
    return 1.0 - sqrt(dot(vector, vector));
}

float remapspace(float value) {
    value = (value + 1.0) * 0.5;
    return (1.0 - pow(1.0 - value, 5.0)) * 2.0 - 1.0;
}

vec3 remap(vec3 value, vec3 offset, vec3 scale) {
    return (value - offset) / scale;
}

vec3 remapscale(vec3 value, vec3 scale) {
    return value * scale;
}

void main() {
    vec2 vector_1 = vPosition.xy;
    vector_1.y = remapspace(vector_1.y);
    
    float timeOffset = uTime * uSpeed;
    vec2 motion = vector_1 + timeOffset;
    
    float shape_1 = drawsphere(vector_1);

    float voro_1 = 1.0 - texture2D(uVoronoi, motion * 1.0).r;
    float voro_2 = 1.0 - texture2D(uVoronoi, motion * 4.0).r;
    float voro_3 = 1.0 - texture2D(uVoronoi, motion * 10.0).r;
    
    voro_1 = mix(1.0, 0.3, voro_1);
    voro_2 = mix(1.0, 0.15, voro_2);
    voro_3 = mix(1.0, 0.00, voro_3);
    
    float blend = shape_1;
    blend = softlight(blend, voro_1, 0.75);
    blend = softlight(blend, voro_2, 0.25);
    blend = softlight(blend, voro_3, 0.10);
    
    float noise = texture2D(uNoise, vUv / 1.5).r;
    noise = mix(0.5, 0.6, noise);
    
    vec3 vector_2 = remap(vPosition, vec3(0.0, -1.05, 0.0), vec3(1.0, 0.2, 1.0));
    vector_2 = remapscale(vector_2, vec3(noise));
    
    float shape_2 = drawsphere(vector_2.xy);
    float shadowMask = mix(smoothstep(0.0, 0.5, shape_2), 0.0, 0.65);
    
    vec3 color = mix(uColor_1, uColor_2, blend);
    
    vec3 diffuse = multiply(color, uShadowColor, shadowMask);
    float alpha = smoothstep(0.4, 0.5, blend);
    
    gl_FragColor = vec4(diffuse, alpha);
}