varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform float uTime;
uniform float uSpeed;
uniform sampler2D uNoise;
// uniform sampler2D uMask;

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

float softlight(float base, float blend, float factor) {
	float blended = ((1.0 - (2.0 * blend)) * base * base) + (2.0 * blend * base);
	return mix(base, blended, factor);
}

float easeout(float x) {
    return 1.0 - pow(1.0 - x, 4.0);
}

float remapspace(float value) {
    float normalized = (value + 1.0) * 0.5;
    float curved = easeout(normalized);
    return curved * 2.0 - 1.0;
}

float drawsphere(vec2 vector) {
	return 1.0 - distance(vector, vec2(0));
}

void main() {
	//position
	vec3 pos = vPosition.xyz;
	pos.y = remapspace(pos.y);
	vec3 motion = pos + (uTime * uSpeed);

	//base
	float shape = drawsphere(pos.xy);

	//textures
	float voro_1 = mix(1.0, 0.2, voronoiNoise(motion, 5.0));
	float voro_2 = mix(1.0, 0.1, voronoiNoise(motion, 20.0));
	float voro_3 = mix(1.0, 0.0, voronoiNoise(motion, 50.0));

	float blend_1 = softlight(shape, voro_1, 1.0);
	float blend_2 = softlight(blend_1, voro_2, 0.2);
	float blend_3 = softlight(blend_2, voro_3, 0.1);

	float combined = smoothstep(0.45, 0.5, blend_3); 

	gl_FragColor.rgb = vec3(1.0);
	gl_FragColor.a = combined;
}