#include <common>
#include <packing>
#include <fog_pars_fragment>

uniform float uTime;
uniform vec3 uFoamColor;
uniform vec3 uWaterColor;
uniform vec3 uShadowColor;
uniform float uFoamTiling;
uniform sampler2D uMask;
uniform sampler2D uNoise;
uniform sampler2D uShadow;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
	vec4 mask = texture2D(uMask, vUv);
	vec4 noise = texture2D(uNoise, (vUv * uFoamTiling) + (uTime * 0.05));
	vec4 shadow = texture2D(uShadow, vUv);

	vec3 foamThresold = clamp((1.0 - mask.rrr), vec3(0.0), vec3(0.8));

	vec3 foam = step(foamThresold, noise.rrr);
	vec3 diffuse = mix(uWaterColor, uFoamColor, foam);
	vec3 combined = mix(uShadowColor, diffuse, shadow.rrr);

	gl_FragColor.rgb = combined.rgb;
	gl_FragColor.a = 1.0;

	#include <tonemapping_fragment>
	// #include <encodings_fragment>
	#include <fog_fragment>
}