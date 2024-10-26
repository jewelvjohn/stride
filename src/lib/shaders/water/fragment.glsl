uniform float uTime;
uniform vec3 uFoamColor;
uniform vec3 uWaterColor;
uniform float uFoamTiling;
uniform sampler2D uMask;
uniform sampler2D uNoise;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
	vec4 mask = texture2D(uMask, vUv);
	vec4 noise = texture2D(uNoise, (vUv * uFoamTiling) + (uTime * 0.05));

	vec3 foamColor = vec3(1, 1, 1);
	vec3 waterColor = vec3(0.0745, 0.2275, 0.2941);

	vec3 foamThresold = clamp((1.0 - mask.rrr), vec3(0.0), vec3(0.75));

	vec3 foam = step(foamThresold, noise.rrr);
	vec3 color = mix(waterColor, foamColor, foam);

	gl_FragColor.rgb = color;
	gl_FragColor.a = 1.0;
}