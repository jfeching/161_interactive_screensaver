// import { vertexShaderSource,fragmentShaderSource,createShader } from "shaders";
// import {glMatrix, mat3, mat4, vec3} from "gl-matrix.js"

const canvas = document.getElementById("output");
const gl = canvas.getContext('webgl2');
var program = gl.createProgram();

const vertexShaderSource = `#version 300 es

uniform vec3 uLightDirection;

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aNormal; 

out float vBrightness

void main(){
    vBrightness = max(dot(uLightDirection, aNormal), 0.0);
    gl_Position = aPositionn;
 }`;

const fragmentShaderSource = `#version 300 es

precision mediump float;

in float vBrightness;

out vec4 fragColor;

vec4 color = vec4(1.0, 0.0, 0.0, 1.0);

void main(){
    fragColor = (color * .4) + (color * vBrightness * .6);
    fragColor.a = 1.0;
}`;

function createShader (gl, type, sourceCode) {
    // Compiles either a shader of type gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
    var shader = gl.createShader( type );
    gl.shaderSource( shader, sourceCode );
    gl.compileShader( shader );
  
    if ( !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
      var info = gl.getShaderInfoLog( shader );
      console.log(info);
    }
    return shader;
  }

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

gl.attachShader(program, vertexShader);
gl.attachShader(program,fragmentShader);

gl.linkProgram(program);

if ( !gl.getProgramParameter( program, gl.LINK_STATUS) ) {
    var info = gl.getProgramInfoLog(program);
    throw new Error('Could not compile WebGL program. \n\n' + info);
}

gl.useProgram(program);

gl.enable(gl.DEPTH_TEST);

const loadObject = async () => {
    const file = fetch('./object_files/brown_ball.obj');
    const arrayBuffer = (await file).arrayBuffer();
    return arrayBuffer;
}

const main = async () => {
    const object = await loadObject();

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, object, gl.STATIC_DRAW);

    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);

    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);

    const lightDirectionLoc = gl.getUniformLocation(program, 'uLightDirection');
    const lightDirection = vec3.fromValues(1, 1, 1);
    vec3.normalize(lightDirection, lightDirection);

    const draw = () => {
        // Rotate the light:
        vec3.rotateY(lightDirection, lightDirection, [0,0,0], 0.02);

        gl.uniform3fv(lightDirectionLoc, lightDirection);

        gl.drawArrays(gl.TRIANGLES, 0, object.byteLength / 32);

        requestAnimationFrame(draw);
    };

    draw();
};
main();
