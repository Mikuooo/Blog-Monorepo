import { RAIN_FRAGMENT_SHADER, RAIN_VERTEX_SHADER } from './rain-shaders'
import type { RainFit } from './types'
import { parseHexColor } from './webgl-support'

type RenderOptions = {
  fit: RainFit
  lightning: number
  mist: number
  rain: number
  surface: HTMLCanvasElement
  themeColor: string
  time: number
  wind: number
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to create WebGL shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader error'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, RAIN_VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, RAIN_FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!program) throw new Error('Unable to create WebGL program')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown WebGL link error'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
}

function createTexture(
  gl: WebGLRenderingContext,
  source: TexImageSource,
  filter: number,
): WebGLTexture {
  const texture = gl.createTexture()
  if (!texture) throw new Error('Unable to create WebGL texture')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
  return texture
}

function createBlurredScene(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const maximum = 1100
  const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight))
  canvas.width = Math.max(2, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(2, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is unavailable')
  const bleed = Math.max(18, Math.round(Math.min(canvas.width, canvas.height) * 0.035))
  context.filter = `blur(${Math.max(14, bleed * 0.66)}px) saturate(82%) brightness(78%)`
  context.drawImage(image, -bleed, -bleed, canvas.width + bleed * 2, canvas.height + bleed * 2)
  context.filter = 'none'
  context.fillStyle = 'rgba(2, 18, 19, 0.12)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}

export class WebGLRainRenderer {
  private readonly blurredTexture: WebGLTexture
  private readonly buffer: WebGLBuffer
  private readonly gl: WebGLRenderingContext
  private readonly image: HTMLImageElement
  private readonly program: WebGLProgram
  private readonly sceneTexture: WebGLTexture
  private readonly surfaceTexture: WebGLTexture
  private height = 1
  private width = 1

  constructor(
    private readonly canvas: HTMLCanvasElement,
    image: HTMLImageElement,
  ) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    })
    if (!gl) throw new Error('WebGL is unavailable')

    this.gl = gl
    this.image = image
    this.program = createProgram(gl)
    const buffer = gl.createBuffer()
    if (!buffer) throw new Error('Unable to create WebGL buffer')
    this.buffer = buffer

    gl.useProgram(this.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const position = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    this.sceneTexture = createTexture(gl, image, gl.LINEAR)
    this.blurredTexture = createTexture(gl, createBlurredScene(image), gl.LINEAR)
    const placeholder = document.createElement('canvas')
    placeholder.width = 2
    placeholder.height = 2
    this.surfaceTexture = createTexture(gl, placeholder, gl.LINEAR)
    this.setSampler('u_scene', 0)
    this.setSampler('u_blurredScene', 1)
    this.setSampler('u_surface', 2)
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    const nextWidth = Math.max(2, Math.round(width * dpr))
    const nextHeight = Math.max(2, Math.round(height * dpr))
    if (nextWidth === this.width && nextHeight === this.height) return
    this.width = nextWidth
    this.height = nextHeight
    this.canvas.width = nextWidth
    this.canvas.height = nextHeight
    this.gl.viewport(0, 0, nextWidth, nextHeight)
  }

  render(options: RenderOptions): void {
    const gl = this.gl
    gl.useProgram(this.program)
    this.bindTexture(this.sceneTexture, 0)
    this.bindTexture(this.blurredTexture, 1)
    this.bindTexture(this.surfaceTexture, 2)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, options.surface)

    this.uniform2f('u_viewSize', this.width, this.height)
    this.uniform2f('u_sceneSize', this.image.naturalWidth, this.image.naturalHeight)
    this.uniform2f('u_surfaceSize', options.surface.width, options.surface.height)
    const tint = parseHexColor(options.themeColor)
    this.uniform3f('u_tint', tint[0], tint[1], tint[2])
    this.uniform1f('u_fit', options.fit === 'contain' ? 1 : 0)
    this.uniform1f('u_lightning', options.lightning)
    this.uniform1f('u_mist', options.mist)
    this.uniform1f('u_rain', options.rain)
    this.uniform1f('u_time', options.time)
    this.uniform1f('u_wind', options.wind)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  destroy(): void {
    const gl = this.gl
    gl.deleteTexture(this.sceneTexture)
    gl.deleteTexture(this.blurredTexture)
    gl.deleteTexture(this.surfaceTexture)
    gl.deleteBuffer(this.buffer)
    gl.deleteProgram(this.program)
  }

  private bindTexture(texture: WebGLTexture, unit: number): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit)
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
  }

  private setSampler(name: string, unit: number): void {
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, name), unit)
  }

  private uniform1f(name: string, value: number): void {
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, name), value)
  }

  private uniform2f(name: string, first: number, second: number): void {
    this.gl.uniform2f(this.gl.getUniformLocation(this.program, name), first, second)
  }

  private uniform3f(name: string, first: number, second: number, third: number): void {
    this.gl.uniform3f(this.gl.getUniformLocation(this.program, name), first, second, third)
  }
}
