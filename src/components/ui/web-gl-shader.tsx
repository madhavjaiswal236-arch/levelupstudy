"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene | null
    camera: THREE.OrthographicCamera | null
    renderer: THREE.WebGLRenderer | null
    mesh: THREE.Mesh | null
    uniforms: any
    animationId: number | null
  }>({
    scene: null,
    camera: null,
    renderer: null,
    mesh: null,
    uniforms: null,
    animationId: null,
  })

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const { current: refs } = sceneRef

    // Check if WebGL context can be created safely
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    if (!gl) {
      console.warn("WebGL not supported or context lost")
      return
    }

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        
        float d = length(p) * distortion;
        
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float waveR = sin((rx + time * 0.8) * xScale) * yScale;
        float waveG = sin((gx + time * 0.8) * xScale) * yScale;
        float waveB = sin((bx + time * 0.8) * xScale) * yScale;

        // Sleek, narrow, high-intensity glowing line with sharp falloff
        float r = 0.022 / pow(abs(p.y - waveR) + 0.0025, 1.25);
        float g = 0.022 / pow(abs(p.y - waveG) + 0.0025, 1.25);
        float b = 0.022 / pow(abs(p.y - waveB) + 0.0025, 1.25);
        
        vec3 color = vec3(r, g, b);
        float alpha = clamp(max(r, max(g, b)), 0.0, 1.0);

        gl_FragColor = vec4(color, alpha);
      }
    `

    const handleResize = () => {
      if (!refs.renderer || !refs.uniforms) return
      try {
        const width = window.innerWidth
        const height = window.innerHeight
        refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        refs.renderer.setSize(width, height, false)
        refs.uniforms.resolution.value = [width, height]
        
        // Dynamically tune wave geometry across mobile, tablet, and desktop
        if (width < 640) {
          refs.uniforms.xScale.value = 1.0
          refs.uniforms.yScale.value = 0.28
        } else if (width < 1024) {
          refs.uniforms.xScale.value = 1.1
          refs.uniforms.yScale.value = 0.32
        } else {
          refs.uniforms.xScale.value = 1.2
          refs.uniforms.yScale.value = 0.35
        }
      } catch (e) {
        // ignore resize error
      }
    }

    const initScene = (): boolean => {
      try {
        refs.scene = new THREE.Scene()
        refs.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
        
        if (!refs.renderer || !refs.renderer.capabilities) {
          return false
        }

        refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        refs.renderer.setClearColor(0x000000, 0.0)

        refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

        const initialWidth = window.innerWidth
        refs.uniforms = {
          resolution: { value: [initialWidth, window.innerHeight] },
          time: { value: 0.0 },
          xScale: { value: initialWidth < 640 ? 1.0 : initialWidth < 1024 ? 1.1 : 1.2 },
          yScale: { value: initialWidth < 640 ? 0.28 : initialWidth < 1024 ? 0.32 : 0.35 },
          distortion: { value: 0.08 },
        }

        const position = [
          -1.0, -1.0, 0.0,
           1.0, -1.0, 0.0,
          -1.0,  1.0, 0.0,
           1.0, -1.0, 0.0,
          -1.0,  1.0, 0.0,
           1.0,  1.0, 0.0,
        ]

        const positions = new THREE.BufferAttribute(new Float32Array(position), 3)
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", positions)

        const material = new THREE.RawShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: refs.uniforms,
          side: THREE.DoubleSide,
          transparent: true,
          blending: THREE.AdditiveBlending,
        })

        refs.mesh = new THREE.Mesh(geometry, material)
        refs.scene.add(refs.mesh)

        handleResize()
        return true
      } catch (e) {
        console.warn("Failed to initialize WebGL shader scene:", e)
        return false
      }
    }

    const animate = () => {
      if (refs.uniforms) refs.uniforms.time.value += 0.01
      if (refs.renderer && refs.scene && refs.camera) {
        try {
          refs.renderer.render(refs.scene, refs.camera)
        } catch (e) {
          console.warn("WebGL render error:", e)
          return
        }
      }
      refs.animationId = requestAnimationFrame(animate)
    }

    const success = initScene()
    if (success) {
      animate()
      window.addEventListener("resize", handleResize)
    }

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId)
      window.removeEventListener("resize", handleResize)
      if (refs.mesh) {
        if (refs.scene) refs.scene.remove(refs.mesh)
        refs.mesh.geometry.dispose()
        if (refs.mesh.material instanceof THREE.Material) {
          refs.mesh.material.dispose()
        }
      }
      if (refs.renderer) {
        try {
          refs.renderer.dispose()
        } catch (e) {
          // ignore cleanup errors
        }
      }
      refs.scene = null
      refs.camera = null
      refs.renderer = null
      refs.mesh = null
      refs.uniforms = null
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none"
    />
  )
}

