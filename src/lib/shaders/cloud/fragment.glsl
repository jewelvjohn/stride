varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform float uTime;
uniform float uSpeed;
uniform vec3 uColor_1;
uniform vec3 uColor_2;
uniform vec3 uShadowColor;
uniform sampler2D uNoise;

vec3 hash3(vec3 p) {
    p = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123);
}

float voronoiNoise(vec3 p, float scale) {
    p *= scale;
    vec3 pi = floor(p);
    vec3 pf = fract(p);
    float minDist = 1.0;
    
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 point = hash3(pi + neighbor);
                vec3 diff = neighbor + point - pf;
                float dist = length(diff);
                minDist = min(minDist, dist);
            }
        }
    }
    return minDist;
}

vec3 multiply(vec3 base, vec3 blend, float factor) {
    vec3 multiplied = base * blend;
    return mix(base, multiplied, factor);
}

float softlight(float base, float blend, float factor) {
	float blended = ((1.0 - (2.0 * blend)) * base * base) + (2.0 * blend * base);
	return mix(base, blended, factor);
}

float drawsphere(vec2 vector) {
	return 1.0 - distance(vector, vec2(0));
}

float easeout(float x) {
    return 1.0 - pow(1.0 - x, 5.0);
}

float remapspace(float value) {
    float normalized = (value + 1.0) * 0.5;
    float curved = easeout(normalized);
    return curved * 2.0 - 1.0;
}

vec3 remap(vec3 value, vec3 offset, vec3 scale) {
    return (value - offset) / scale;
}

vec3 remapscale(vec3 value, vec3 scale) {
    return value * scale;
}

void main() {
	vec3 vector_1 = vPosition.xyz;
	vector_1.y = remapspace(vector_1.y);
	vec3 motion = vector_1 + (uTime * uSpeed);
	float shape_1 = drawsphere(vector_1.xy);

	float voro_1 = mix(1.0, 0.2, voronoiNoise(motion, 5.0));
	float voro_2 = mix(1.0, 0.1, voronoiNoise(motion, 20.0));
	float voro_3 = mix(1.0, 0.0, voronoiNoise(motion, 50.0));

	float blend_1 = softlight(shape_1, voro_1, 1.0);
	float blend_2 = softlight(blend_1, voro_2, 0.2);
	float blend_3 = softlight(blend_2, voro_3, 0.1);

    float noise = mix(0.5, 0.6, texture2D(uNoise, vUv / 1.5).r);
    vec3 vector_2 = remap(vPosition, vec3(0.0, -1.05, 0.0), vec3(1.0, 0.2, 1.0));
    vector_2 = remapscale(vector_2, vec3(noise));
    float shape_2 = drawsphere(vector_2.xy);
    float shadowMask = mix(smoothstep(0.0, 0.5, shape_2), 0.0, 0.65);

    vec3 color = mix(uColor_1, uColor_2, smoothstep(0.0, 0.85, blend_3)); 
	float alpha = smoothstep(0.45, 0.55, blend_3);

    vec3 diffuse = multiply(color, uShadowColor, shadowMask);

	gl_FragColor.rgb = diffuse;
	gl_FragColor.a = alpha;
}