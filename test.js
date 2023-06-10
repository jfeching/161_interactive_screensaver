"use strict";

// This is not a full .obj parser.
// see http://paulbourke.net/dataformats/obj/

function parseOBJ(planetText) {
  // because indices are base 1 let's just fill in the 0th planetData
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.planetData.position.length) {
      geometry = undefined;
    }
    setGeometry();
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = planetText.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  return {
    position: webglVertexData[0],
    texcoord: webglVertexData[1],
    normal: webglVertexData[2],
  };
}

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#output");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  /**UPDATE:
   * - u_projection and u_view combined into u_matrix 
  */

  const vs = `
  attribute vec4 a_position;
  attribute vec3 a_normal;

  uniform mat4 u_matrix;
  uniform mat4 u_world;

  varying vec3 v_normal;

  void main() {
    gl_Position = u_matrix * u_world * a_position;
    v_normal = mat3(u_world) * a_normal;
  }
  `;

  const fs = `
  precision mediump float;

  varying vec3 v_normal;

  uniform vec4 u_diffuse;
  uniform vec3 u_lightDirection;

  void main () {
    vec3 normal = normalize(v_normal);
    float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
    gl_FragColor = vec4(u_diffuse.rgb * fakeLight, u_diffuse.a);
  }
  `;


  // compiles and links the shaders, looks up attribute and uniform locations
  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);
  console.log("is error?");

  /**FOR THE OTHER DEVS
   * I got rid of practice_1.obj - Carlos
   */
  // const planetResponse = await fetch('https://raw.githubusercontent.com/jfeching/161_interactive_screensaver/main/object_files/practice_1.obj');
  // const planetText = await planetResponse.planetText();
  // const planetData = parseOBJ(planetText);
  // Star Object
  const planetResponse = await fetch('https://raw.githubusercontent.com/jfeching/161_interactive_screensaver/main/object_files/brown_ball.obj');
  const planetText = await planetResponse.text();
  const planetData = parseOBJ(planetText);
  // Brown Ball object
  const starResponse = await fetch('https://raw.githubusercontent.com/jfeching/161_interactive_screensaver/main/object_files/yellow_ball.obj');
  const starText = await starResponse.text();
  const starData = parseOBJ(starText);

  // Because planetData is just named arrays like this
  //
  // {
  //   position: [...],
  //   texcoord: [...],
  //   normal: [...],
  // }
  //
  // and because those names match the attributes in our vertex
  // shader we can pass it directly into `createBufferInfoFromArrays`
  // from the article "less code more fun".

  // create a buffer for each array by calling
  // gl.createBuffer, gl.bindBuffer, gl.bufferData
  const planetBufferInfo = webglUtils.createBufferInfoFromArrays(gl, planetData);
  const starBufferInfo = webglUtils.createBufferInfoFromArrays(gl, starData);

  // Camera parameters
  const cameraTarget = [0, 0, 0];
  const cameraPosition = [0, 0, 10];
  const zNear = 0.1;
  const zFar = 50;
  const up = [0, 1, 0];

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  function computeMatrix(viewProjectionMatrix,translation) {
    var matrix = m4.translate(viewProjectionMatrix,
      translation[0],
      translation[1],
      translation[2]);
    return matrix;
  }

  // Render function
  // requires the param 'time'
  function render(time) {
    time *= 0.001;  // convert to seconds

    // Resizing canvas and enabling options
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // FOV and aspect ratio
    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);
    
    gl.useProgram(meshProgramInfo.program);
    
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const viewProjectionMatrix = m4.multiply(projection,view);
    
    /**
     * PLANET
     * Requires:
     * - modified viewprojection
     * - uniforms
     * Then:
     * - set uniforms
     * - set buffers amd attributes
     * - set world rotation and diffuse (includes color)
     * - draw
     */
    var planetTranslate = [-4,0,0]

    const planetUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_matrix: computeMatrix(viewProjectionMatrix,planetTranslate),
    };

    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, planetUniforms);
    // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
    webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, planetBufferInfo);
    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, {
      u_world: m4.yRotation(time),
      u_diffuse: [1, 0.7, 0.5, 1],
    });
    // calls gl.drawArrays or gl.drawElements
    webglUtils.drawBufferInfo(gl, planetBufferInfo);

    
    /**
     * STAR
    */
    const starUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_matrix: viewProjectionMatrix,
    };

    webglUtils.setUniforms(meshProgramInfo, starUniforms);
    webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, starBufferInfo);
    webglUtils.setUniforms(meshProgramInfo, {
      u_world: m4.yRotation(-time),
      u_diffuse: [1, 1, 0, 1],
    });

    webglUtils.drawBufferInfo(gl, starBufferInfo);

    // loops the animation
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

}

main();
