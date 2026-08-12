export const RAIN_VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

export const RAIN_FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_blurredScene;
uniform sampler2D u_surface;
uniform vec2 u_viewSize;
uniform vec2 u_sceneSize;
uniform vec2 u_surfaceSize;
uniform vec3 u_tint;
uniform float u_fit;
uniform float u_lightning;
uniform float u_mist;
uniform float u_rain;
uniform float u_time;
uniform float u_wind;

float hash(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 sceneUv(vec2 screenUv) {
  float viewAspect = u_viewSize.x / max(u_viewSize.y, 1.0);
  float sceneAspect = u_sceneSize.x / max(u_sceneSize.y, 1.0);
  vec2 uv = screenUv;

  if (u_fit < 0.5) {
    if (viewAspect > sceneAspect) {
      uv.y = (uv.y - 0.5) * (sceneAspect / viewAspect) + 0.5;
    } else {
      uv.x = (uv.x - 0.5) * (viewAspect / sceneAspect) + 0.5;
    }
  } else {
    if (viewAspect > sceneAspect) {
      float occupied = sceneAspect / viewAspect;
      uv.x = (uv.x - 0.5) / occupied + 0.5;
    } else {
      float occupied = viewAspect / sceneAspect;
      uv.y = (uv.y - 0.5) / occupied + 0.5;
    }
  }
  return uv;
}

vec3 sampleScene(sampler2D source, vec2 uv) {
  if (u_fit > 0.5 && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)) {
    return vec3(0.006, 0.026, 0.03);
  }
  return texture2D(source, clamp(uv, 0.001, 0.999)).rgb;
}

float backgroundRain(vec2 uv) {
  vec2 aspectUv = vec2(uv.x * u_viewSize.x / max(u_viewSize.y, 1.0), uv.y);
  vec2 slanted = aspectUv + vec2(-u_wind * aspectUv.y * 0.14, u_time * (0.58 + u_rain * 0.42));
  vec2 grid = vec2(74.0, 9.0 + u_rain * 8.0);
  vec2 cell = floor(slanted * grid);
  vec2 local = fract(slanted * grid);
  float seed = hash(cell);
  float x = mix(0.12, 0.88, seed);
  float line = smoothstep(0.055, 0.0, abs(local.x - x));
  float head = smoothstep(0.9, 0.1, local.y) * smoothstep(0.0, 0.28, local.y);
  return line * head * step(0.76 - u_rain * 0.18, seed);
}

void main() {
  vec2 texel = 1.0 / max(u_surfaceSize, vec2(1.0));
  vec4 surface = texture2D(u_surface, v_uv);
  float height = surface.r;
  float left = texture2D(u_surface, v_uv - vec2(texel.x * 1.35, 0.0)).r;
  float right = texture2D(u_surface, v_uv + vec2(texel.x * 1.35, 0.0)).r;
  float down = texture2D(u_surface, v_uv - vec2(0.0, texel.y * 1.35)).r;
  float up = texture2D(u_surface, v_uv + vec2(0.0, texel.y * 1.35)).r;
  vec2 gradient = vec2(right - left, up - down);
  float slope = length(gradient);
  float mask = smoothstep(0.025, 0.19, height);
  float body = smoothstep(0.16, 0.68, height);
  float edge = smoothstep(0.015, 0.2, slope) * mask;

  vec2 baseUv = sceneUv(v_uv);
  vec3 blurred = sampleScene(u_blurredScene, baseUv);
  float distantRain = backgroundRain(v_uv);
  blurred += vec3(0.54, 0.91, 0.9) * distantRain * (0.08 + u_rain * 0.18);

  vec2 lens = surface.gb * 2.0 - 1.0;
  lens.y *= -1.0;
  vec2 normalOffset = gradient * vec2(0.13, 0.16);
  vec2 lensOffset = -lens * (0.008 + body * 0.018);
  vec2 refractedUv = baseUv + normalOffset + lensOffset;
  vec3 refracted = sampleScene(u_scene, refractedUv);

  float chroma = edge * 0.0024;
  refracted.r = sampleScene(u_scene, refractedUv + gradient * chroma).r;
  refracted.b = sampleScene(u_scene, refractedUv - gradient * chroma).b;
  refracted *= 1.01 + body * 0.045;

  vec3 color = mix(blurred, refracted, mask * 0.985);
  vec3 normal = normalize(vec3(-gradient * 6.5, 0.34));
  vec3 lightDirection = normalize(vec3(-0.58, 0.72, 0.48));
  vec3 halfVector = normalize(lightDirection + vec3(0.0, 0.0, 1.0));
  float specular = pow(max(dot(normal, halfVector), 0.0), 34.0) * edge;
  float topRim = smoothstep(-0.12, 0.35, -gradient.y) * edge;
  float bottomShade = smoothstep(-0.06, 0.28, gradient.y) * edge;
  float fresnel = pow(1.0 - max(normal.z, 0.0), 2.4) * edge;

  color += vec3(0.82, 1.0, 0.98) * (specular * 1.28 + topRim * 0.13);
  color += u_tint * fresnel * 0.14;
  color -= vec3(0.16, 0.2, 0.21) * bottomShade * 0.56;
  color *= 1.0 - edge * 0.045;

  float flash = u_lightning * (0.74 + mask * 0.42);
  color = mix(color, color + vec3(0.66, 0.92, 1.0), flash * 0.64);
  color = mix(color, u_tint * 0.17, u_mist * 0.065);
  float vignette = smoothstep(0.88, 0.18, distance(v_uv, vec2(0.52, 0.5)));
  color *= mix(0.78, 1.0, vignette);
  gl_FragColor = vec4(color, 1.0);
}
`
