const vertexShaderSource = `#version 300 es

uniform vec3 uLightDirection;

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aNormal; 

out float vBrightness

void main(){
    vBrightness = max(dot(uLightDirection, aNormal), 0.0);
    gl_Position = aPositionn;
 }
`;

const fragmentShaderSource = `#version 300 es

precision mediump float;

in float vBrightness;

out vec4 fragColor;

vec4 color = vec4(1.0, 0.0, 0.0, 1.0);

void main(){
    fragColor = (color * .4) + (color * vBrightness * .6);
    fragColor.a = 1.0;
}
`;

function createShader (gl, type, sourceCode) {
    // Compiles either a shader of type gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
    var shader = gl.createShader( type );
    gl.shaderSource( shader, sourceCode );
    gl.compileShader( shader );
  
    if ( !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
      var info = gl.getShaderInfoLog( shader );
      throw new Error('Could not compile WebGL program. \n\n' + info);
    }
    return shader;
  }