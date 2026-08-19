/**
 * ShaderBackground.js
 * Cyberpunk interactive WebGL Fragment Shader background for AniGraph
 * Adapted from Stitch design specifications.
 */

export function initShaderBackground(canvasId = 'shader-canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    function syncSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    }
    window.addEventListener('resize', syncSize);
    syncSize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vs = `
        attribute vec2 a_position;
        varying vec2 v_texCoord;
        void main() {
            v_texCoord = a_position * 0.5 + 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    const fs = `
        precision highp float;
        varying vec2 v_texCoord;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
            vec2 uv = v_texCoord;
            vec2 mouse = u_mouse / u_resolution;
            
            // Cyberpunk palette from Stitch design system
            vec3 color1 = vec3(0.04, 0.07, 0.15); // Base surface #0b1326
            vec3 color2 = vec3(0.54, 0.36, 0.96); // Neon Violet #8b5cf6
            vec3 color3 = vec3(0.02, 0.71, 0.83); // Cyan #06b6d4
            
            float n = noise(uv * 3.5 + u_time * 0.15);
            n += 0.5 * noise(uv * 7.0 - u_time * 0.08);
            
            float distToMouse = length(uv - mouse);
            float glow = exp(-distToMouse * 3.5);
            
            vec3 finalColor = mix(color1, color2, n * 0.25);
            finalColor = mix(finalColor, color3, glow * 0.18);
            
            // Neural spider web background grid pulse
            float grid = sin(uv.x * 35.0 + u_time * 0.5) * sin(uv.y * 35.0 + u_time * 0.5);
            finalColor += color3 * clamp(grid, 0.0, 1.0) * 0.015;
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    function compileShader(type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = window.innerHeight - e.clientY;
    });

    let startTime = performance.now();

    function render() {
        const t = (performance.now() - startTime) * 0.001;
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (uTime) gl.uniform1f(uTime, t);
        if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
        if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }

    render();
}
