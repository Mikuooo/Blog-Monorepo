import { RAIN_FRAGMENT_SHADER, RAIN_VERTEX_SHADER } from './rain-shaders'

type RendererOptions = {
  alphaMultiply: number
  alphaSubtract: number
  brightness: number
  maxRefraction: number
  minRefraction: number
  parallaxBg: number
  parallaxFg: number
}

const DEFAULT_OPTIONS: RendererOptions = {
  alphaMultiply: 6,
  alphaSubtract: 3,
  brightness: 1.04,
  maxRefraction: 512,
  minRefraction: 256,
  parallaxBg: 5,
  parallaxFg: 20,
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to create rain shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown rain shader error'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, RAIN_VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, RAIN_FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!program) throw new Error('Unable to create rain program')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown rain program error'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
}

function createTexture(
  gl: WebGLRenderingContext,
  source: TexImageSource,
  unit: number,
): WebGLTexture {
  const texture = gl.createTexture()
  if (!texture) throw new Error('Unable to create rain texture')
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
  return texture
}

export class RainRenderer {
  private readonly buffer: WebGLBuffer
  private readonly gl: WebGLRenderingContext
  private readonly liquid: HTMLCanvasElement
  private readonly options: RendererOptions
  private readonly program: WebGLProgram
  private readonly textures: WebGLTexture[]
  private readonly textureBackground: TexImageSource
  private readonly textureForeground: TexImageSource
  private frameId = 0
  private parallaxX = 0
  private parallaxY = 0
  private running = true

  constructor(
    canvas: HTMLCanvasElement,
    liquid: HTMLCanvasElement,
    textureForeground: TexImageSource,
    textureBackground: TexImageSource,
    options: Partial<RendererOptions> = {},
  ) {
    const gl = canvas.getContext('webgl', { alpha: false })
    if (!gl) throw new Error('WebGL is unavailable')
    this.gl = gl
    this.liquid = liquid
    this.textureForeground = textureForeground
    this.textureBackground = textureBackground
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.program = createProgram(gl)
    const buffer = gl.createBuffer()
    if (!buffer) throw new Error('Unable to create rain buffer')
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

    this.textures = [
      createTexture(gl, liquid, 0),
      createTexture(gl, textureForeground, 1),
      createTexture(gl, textureBackground, 2),
    ]
    this.uniform1i('u_waterMap', 0)
    this.uniform1i('u_textureFg', 1)
    this.uniform1i('u_textureBg', 2)
    this.uniform2f('u_resolution', canvas.width, canvas.height)
    this.uniform1f('u_textureRatio', 384 / 256)
    this.uniform1f('u_minRefraction', this.options.minRefraction)
    this.uniform1f('u_refractionDelta', this.options.maxRefraction - this.options.minRefraction)
    this.uniform1f('u_brightness', this.options.brightness)
    this.uniform1f('u_alphaMultiply', this.options.alphaMultiply)
    this.uniform1f('u_alphaSubtract', this.options.alphaSubtract)
    this.uniform1f('u_parallaxBg', this.options.parallaxBg)
    this.uniform1f('u_parallaxFg', this.options.parallaxFg)
    this.draw()
  }

  setParallax(x: number, y: number): void {
    this.parallaxX = x
    this.parallaxY = y
  }

  updateTextures(): void {
    this.updateTexture(1, this.textureForeground)
    this.updateTexture(2, this.textureBackground)
  }

  destroy(): void {
    this.running = false
    cancelAnimationFrame(this.frameId)
    for (const texture of this.textures) this.gl.deleteTexture(texture)
    this.gl.deleteBuffer(this.buffer)
    this.gl.deleteProgram(this.program)
  }

  private draw = (): void => {
    if (!this.running) return
    const gl = this.gl
    gl.useProgram(this.program)
    this.uniform2f('u_parallax', this.parallaxX, this.parallaxY)
    this.updateTexture(0, this.liquid)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    this.frameId = requestAnimationFrame(this.draw)
  }

  private updateTexture(unit: number, source: TexImageSource): void {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, this.textures[unit] ?? null)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
  }

  private uniform1f(name: string, value: number): void {
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, name), value)
  }

  private uniform1i(name: string, value: number): void {
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, name), value)
  }

  private uniform2f(name: string, first: number, second: number): void {
    this.gl.uniform2f(this.gl.getUniformLocation(this.program, name), first, second)
  }
}
