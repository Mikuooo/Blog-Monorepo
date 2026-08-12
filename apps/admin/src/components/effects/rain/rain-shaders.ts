// Adapted from Codrops RainEffect by Lucas Bebber.
// https://github.com/codrops/RainEffect
export const RAIN_VERTEX_SHADER = `
precision mediump float;
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

export const RAIN_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_waterMap;
uniform sampler2D u_textureFg;
uniform sampler2D u_textureBg;
uniform vec2 u_resolution;
uniform vec2 u_parallax;
uniform float u_parallaxFg;
uniform float u_parallaxBg;
uniform float u_textureRatio;
uniform float u_minRefraction;
uniform float u_refractionDelta;
uniform float u_brightness;
uniform float u_alphaMultiply;
uniform float u_alphaSubtract;

vec4 blend(vec4 bg, vec4 fg) {
  vec3 bgm = bg.rgb * bg.a;
  vec3 fgm = fg.rgb * fg.a;
  float inverseAlpha = 1.0 - fg.a;
  float alpha = fg.a + bg.a * inverseAlpha;
  vec3 rgb = alpha == 0.0 ? vec3(0.0) : (fgm + bgm * inverseAlpha) / alpha;
  return vec4(rgb, alpha);
}

vec2 pixel() {
  return vec2(1.0) / u_resolution;
}

vec2 parallax(float value) {
  return u_parallax * pixel() * value;
}

vec2 texCoord() {
  return vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;
}

vec2 scaledTexCoord() {
  float ratio = u_resolution.x / u_resolution.y;
  vec2 scale = vec2(1.0);
  vec2 offset = vec2(0.0);
  float ratioDelta = ratio - u_textureRatio;
  if (ratioDelta >= 0.0) {
    scale.y = 1.0 + ratioDelta;
    offset.y = ratioDelta / 2.0;
  } else {
    scale.x = 1.0 - ratioDelta;
    offset.x = -ratioDelta / 2.0;
  }
  return (texCoord() + offset) / scale;
}

vec4 waterColor(float x, float y) {
  float padding = u_parallaxFg * 2.0;
  vec2 scale = vec2(
    (u_resolution.x + padding) / u_resolution.x,
    (u_resolution.y + padding) / u_resolution.y
  );
  vec2 coord = texCoord() / scale;
  vec2 offset = vec2(
    (1.0 - (1.0 / scale.x)) / 2.0,
    (1.0 - (1.0 / scale.y)) / 2.0
  );
  return texture2D(
    u_waterMap,
    (coord + offset) + (pixel() * vec2(x, y)) + parallax(u_parallaxFg)
  );
}

void main() {
  vec4 background = texture2D(u_textureBg, scaledTexCoord() + parallax(u_parallaxBg));
  vec4 water = waterColor(0.0, 0.0);
  float depth = water.b;
  vec2 direction = (water.gr - 0.5) * 2.0;
  float alpha = clamp(water.a * u_alphaMultiply - u_alphaSubtract, 0.0, 1.0);
  vec2 refractionParallax = parallax(u_parallaxBg - u_parallaxFg);
  vec2 refractionPosition = scaledTexCoord()
    + (pixel() * direction * (u_minRefraction + depth * u_refractionDelta))
    + refractionParallax;
  vec4 foreground = texture2D(u_textureFg, refractionPosition);
  vec4 drop = vec4(foreground.rgb * u_brightness, alpha);
  gl_FragColor = blend(background, drop);
}
`
