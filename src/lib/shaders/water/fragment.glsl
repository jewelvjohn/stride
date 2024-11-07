#include <common>
#include <packing>
#include <fog_pars_fragment>

uniform float uTime;
uniform vec3 uFoamColor;
uniform vec3 uWaterColor_1;
uniform vec3 uWaterColor_2;
uniform vec3 uShadowColor;
uniform vec3 uHighlightColor;
uniform float uFoamTiling;
uniform sampler2D uMask;
uniform sampler2D uNoise;
uniform sampler2D uShadow;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
    vec2 noiseUV = vUv * uFoamTiling + vec2(uTime * 0.025);
    vec2 waterUV = vUv * 4.0 - vec2(uTime * 0.01);
    
    vec4 noiseTexture = texture2D(uNoise, noiseUV);    
    vec4 waterTexture = texture2D(uNoise, waterUV);    
    vec4 maskTexture = texture2D(uMask, vUv);          
    vec4 shadowTexture = texture2D(uShadow, vUv);      
    
    float gradient = smoothstep(0.0, 0.8, vUv.x);
    float mask = smoothstep(0.0, 0.9, maskTexture.r);
    float waternoise = smoothstep(0.3, 1.0, waterTexture.r);
    
    vec3 surface = mix(uWaterColor_1, uWaterColor_2, gradient);
    float highlightFactor = gradient * waternoise;
    surface = mix(surface, uHighlightColor, highlightFactor);
    
    float foamMask = clamp(mask, 0.2, 1.0);
    float foam = smoothstep(noiseTexture.r - 0.05, noiseTexture.r + 0.05, foamMask);
    
    vec3 diffuse = mix(surface, uFoamColor, foam);
    gl_FragColor = vec4(mix(uShadowColor, diffuse, shadowTexture.r), 1.0);

	#include <tonemapping_fragment>
	#include <fog_fragment>
}