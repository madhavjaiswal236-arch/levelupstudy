"use client"

import React, { useEffect, useRef } from "react"
import * as THREE from "three"

export function ShaderAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    camera: THREE.Camera
    scene: THREE.Scene
    renderer: THREE.WebGLRenderer
    uniforms: any
    animationId: number
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Vertex shader
    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `

    // Fragment shader
    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      // Cosine based palette generator for custom glowing gradients
      vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
          return a + b * cos( TWO_PI * (c * t + d) );
      }

      void main(void) {
        // Center-aligned aspect-correct coordinates
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        vec2 uv0 = uv;
        vec3 finalColor = vec3(0.0);
        
        float t = time * 0.2; // Optimized flow speed
        
        // Generate glowing multi-layered cosmic plasma rings
        for (float i = 0.0; i < 3.0; i++) {
            uv = fract(uv * 1.5) - 0.5;

            float d = length(uv) * exp(-length(uv0));

            // Custom neon palette: deep space sapphire blue, neon cyan, electric purple
            vec3 col = palette(length(uv0) + i * 0.4 + t, 
                vec3(0.5, 0.5, 0.5), 
                vec3(0.5, 0.5, 0.5), 
                vec3(1.0, 1.0, 1.0), 
                vec3(0.0, 0.33, 0.67)
            );

            d = sin(d * 8.0 + t) / 8.0;
            d = abs(d);

            // High intensity glow formula
            d = pow(0.012 / d, 1.25);

            finalColor += col * d;
        }
        
        // Ambient background gradient to add depth
        vec3 ambient = vec3(0.015, 0.02, 0.06) * (1.0 - length(uv0) * 0.4);
        finalColor += ambient;
        
        // Output safety clamp
        finalColor = clamp(finalColor, 0.0, 1.0);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    // Initialize Three.js scene
    const camera = new THREE.Camera()
    camera.position.z = 1

    const scene = new THREE.Scene()
    const geometry = new THREE.PlaneGeometry(2, 2)

    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new THREE.Vector2() },
    }

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)

    container.appendChild(renderer.domElement)

    // Handle window resize
    const onWindowResize = () => {
      if (!container) return
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      uniforms.resolution.value.x = renderer.domElement.width
      uniforms.resolution.value.y = renderer.domElement.height
    }

    // Initial resize
    onWindowResize()
    window.addEventListener("resize", onWindowResize, false)

    // Animation loop
    const animate = () => {
      const animationId = requestAnimationFrame(animate)
      uniforms.time.value += 0.05
      renderer.render(scene, camera)

      if (sceneRef.current) {
        sceneRef.current.animationId = animationId
      }
    }

    // Store scene references for cleanup
    sceneRef.current = {
      camera,
      scene,
      renderer,
      uniforms,
      animationId: 0,
    }

    // Start animation
    animate()

    // Cleanup function
    return () => {
      window.removeEventListener("resize", onWindowResize)

      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId)

        if (container && sceneRef.current.renderer.domElement) {
          container.removeChild(sceneRef.current.renderer.domElement)
        }

        sceneRef.current.renderer.dispose()
        geometry.dispose()
        material.dispose()
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        background: "#000",
        overflow: "hidden",
      }}
    />
  )
}
