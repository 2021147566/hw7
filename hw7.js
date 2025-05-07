/*--------------------------------------------------------------------------------
18_SmoothShading.js

- Viewing a 3D unit cone at origin with perspective projection
- Rotating the cone by ArcBall interface (by left mouse button dragging)
- Keyboard controls:
    - 'a' to switch between camera and model rotation modes in ArcBall interface
    - 'r' to reset arcball
    - 's' to switch to smooth shading
    - 'f' to switch to flat shading
- Applying Diffuse & Specular reflection using Flat/Smooth shading to the cone
----------------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from './util.js';
import { Shader, readShaderFile } from './shader.js';
import { Arcball } from './arcball.js';
import { Cone } from './cone.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let lampShader;
let textOverlay; 
let textOverlay2;
let textOverlay3;
let textOverlay4;
let textOverlay5;
let textOverlay6;
let textOverlay7;
let textOverlay8;
let isInitialized = false;

let viewMatrix = mat4.create();
let projMatrix = mat4.create();
let modelMatrix = mat4.create();
let lampModelMatrix = mat4.create();
let arcBallMode = 'CAMERA';     // 'CAMERA' or 'MODEL'
let shadingMode = 'SMOOTH';  // 초기 쉐이딩 모드
let shadingMethod = 'GOURAUD'; // 기본 셰이딩 방법      // 'FLAT' or 'SMOOTH'

const cone = new Cone(gl, 32);
const lamp = new Cone(gl, 32); // create a lamp object (a small cone)

const axes = new Axes(gl, 1.5); // create an Axes object with the length of axis 1.5

const cameraPos = vec3.fromValues(0, 0, 3);
const lightPos = vec3.fromValues(1.0, 0.7, 1.0);
const lightSize = vec3.fromValues(0.1, 0.1, 0.1);

// Arcball object: initial distance 5.0, rotation sensitivity 2.0, zoom sensitivity 0.0005
// default of rotation sensitivity = 1.5, default of zoom sensitivity = 0.001
const arcball = new Arcball(canvas, 5.0, { rotation: 2.0, zoom: 0.0005 });

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('program terminated');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('program terminated with error:', error);
    });
});

function setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
        if (event.key == 'a') {
            // arcball mode toggle (CAMERA, MODEL)
            arcBallMode = arcBallMode === 'CAMERA' ? 'MODEL' : 'CAMERA';
            updateText(textOverlay, "arcball mode: " + arcBallMode);
        } else if (event.key == 'r') {
            // reset arcball and camera
            arcball.reset();
            modelMatrix = mat4.create();
            arcBallMode = 'CAMERA';
            updateText(textOverlay, "arcball mode: " + arcBallMode);
        } else if (event.key == 's') {
            // switch to smooth shading mode
            shadingMode = 'SMOOTH';
            updateText(textOverlay2, "shading mode: SMOOTH (" + shadingMethod + ")");
            cone.copyVertexNormalsToNormals();
            cone.updateNormals();
            render();
        } else if (event.key == 'f') {
            // switch to flat shading mode
            shadingMode = 'FLAT';
            updateText(textOverlay2, "shading mode: FLAT (" + shadingMethod + ")");
            cone.copyFaceNormalsToNormals();
            cone.updateNormals();
            render();
        } else if (event.key == 'g') {
            // switch to Gouraud shading mode
            shadingMethod = 'GOURAUD'; // Only Gouraud mode
            updateText(textOverlay2, "shading mode: " + shadingMode + " (" + shadingMethod + ")");
            cone.copyVertexNormalsToNormals();
            cone.updateNormals();
            render();
        } else if (event.key == 'p') {
            // switch to Phong shading mode
            shadingMethod = 'PHONG'; // Only Phong mode
            updateText(textOverlay2, "shading mode: " + shadingMode + " (" + shadingMethod + ")");
            shader.use();
            shader.setInt('u_shadingMode', 1);  // Assuming 1 for PHONG mode
            render();
        }
    });
}



function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.8, 0.9, 1.0);
    
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function initLampShader() {
    const vertexShaderSource = await readShaderFile('shLampVert.glsl');
    const fragmentShaderSource = await readShaderFile('shLampFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function render() {
    // clear canvas
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    if (arcBallMode == 'CAMERA') {
        viewMatrix = arcball.getViewMatrix();
    }
    else { // arcBallMode == 'MODEL'
        modelMatrix = arcball.getModelRotMatrix();
        viewMatrix = arcball.getViewCamDistanceMatrix();
    }

    // drawing the cone
    shader.use();  // using the cone's shader
    shader.setMat4('u_model', modelMatrix);
    shader.setMat4('u_view', viewMatrix);
    shader.setVec3('u_viewPos', cameraPos);
    cone.draw(shader);

    // drawing the lamp
    lampShader.use();
    lampShader.setMat4('u_view', viewMatrix);
    lamp.draw(lampShader);

    // drawing the axes (using the axes's shader: see util.js)
    //axes.draw(viewMatrix, projMatrix);

    // call the render function the next time for animation
    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL initialization failed');
        }
        
        // View transformation matrix (camera at cameraPos, invariant in the program)
        mat4.translate(viewMatrix, viewMatrix, cameraPos);

        // Projection transformation matrix (invariant in the program)
        mat4.perspective(
            projMatrix,
            glMatrix.toRadian(60),  // field of view (fov, degree)
            canvas.width / canvas.height, // aspect ratio
            0.1, // near
            100.0 // far
        );

        // creating shaders
        shader = await initShader();
        lampShader = await initLampShader();

        shader.use();
        shader.setMat4("u_projection", projMatrix);

        shader.setVec3("material.diffuse", vec3.fromValues(1.0, 0.5, 0.31));
        shader.setVec3("material.specular", vec3.fromValues(0.5, 0.5, 0.5));
        shader.setFloat("material.shininess", 16);

        shader.setVec3("light.position", lightPos);
        shader.setVec3("light.ambient", vec3.fromValues(0.2, 0.2, 0.2));
        shader.setVec3("light.diffuse", vec3.fromValues(0.7, 0.7, 0.7));
        shader.setVec3("light.specular", vec3.fromValues(1.0, 1.0, 1.0));
        shader.setVec3("u_viewPos", cameraPos);

        lampShader.use();
        lampShader.setMat4("u_projection", projMatrix);
        const lampModelMatrix = mat4.create();
        mat4.translate(lampModelMatrix, lampModelMatrix, lightPos);
        mat4.scale(lampModelMatrix, lampModelMatrix, lightSize);
        lampShader.setMat4('u_model', lampModelMatrix);

        textOverlay = setupText(canvas, "arcball mode: " + arcBallMode);
        textOverlay2 = setupText(canvas, "shading mode: " + shadingMode + " (" + shadingMethod + ") ", 2);
        textOverlay3 = setupText(canvas, "press 'a' to change arcball mode", 3);
        textOverlay4 = setupText(canvas, "press 'r' to reset arcball", 4);
        textOverlay5 = setupText(canvas, "press 's' to switch to smooth shading", 5);
        textOverlay6 = setupText(canvas, "press 'f' to switch to flat shading", 6);
        textOverlay7 = setupText(canvas, "press 'g' to switch to Gouraud shading", 7); // 수정된 텍스트
        textOverlay8 = setupText(canvas, "press 'p' to switch to Phong shading", 8);   // 수정된 텍스트

        setupKeyboardEvents();

        // call the render function the first time for animation
        requestAnimationFrame(render);

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('Failed to initialize program');
        return false;
    }
}

