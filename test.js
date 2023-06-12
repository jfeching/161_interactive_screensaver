"use strict";

// This is not a full .obj parser.
// see http://paulbourke.net/dataformats/obj/

function parseOBJ(text) {
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
  const lines = text.split('\n');
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

function getRandomFloat(min, max, decimals) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

//will update the colors of the spheres
function updateColor(colors, addends) {
  for (let i = 0; i < colors.length; i++) {
    // get the length of the inner array elements
    let innerArrayLength = colors[i].length;

    // looping inner array elements
    for (let j = 0; j < innerArrayLength - 1; j++) {
      if (colors[i][j] >= 1.0 || colors[i][j] <= 0.0) addends[i][j] *= -1;
      colors[i][j] += addends[i][j];
    }
  }
}

function randomOrbit(min,max,val) {
  const rand = getRandomFloat(-0.01,0.01,1);
  let temp = val + rand;
  if (temp >= max) temp = val - rand;
  if (temp <= min) temp = val + rand;
  return temp;
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
  uniform mat4 u_transformation;
  uniform mat4 u_world;

  varying vec3 v_normal;

  void main() {
    gl_Position = u_transformation * u_matrix * a_position;
    v_normal = mat3(u_world) * a_normal;
  }
  `;

  const smoothVs = `
  attribute vec4 a_position;
  attribute vec3 a_normal;

  uniform mat4 u_matrix;
  uniform mat4 u_transformation;
  uniform mat4 u_world;

  varying vec3 v_normal;

  void main() {
    gl_Position = u_transformation * u_matrix * a_position;
    v_normal = mat3(u_world) * a_position.xyz;
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
  // Regular cube-like normals
  // const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);
  // Smooth lighting normals
  const meshProgramInfo = webglUtils.createProgramInfo(gl, [smoothVs, fs]);
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

  const moonResponse = await fetch('https://raw.githubusercontent.com/jfeching/161_interactive_screensaver/main/object_files/green_ball.obj');
  const moonText = await moonResponse.text();
  const moonData = parseOBJ(moonText);

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
  const moonBufferInfo = webglUtils.createBufferInfoFromArrays(gl, moonData);

  let transformationMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];

  const cameraTarget = [0, 0, 0];
  const cameraPosition = [0, 0, 10];
  const zNear = 0.1;
  const zFar = 50;
  const up = [0, 1, 0];

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }
  let speedslider = document.getElementById("speed");
  let speed_text = document.getElementById("speed_mult");
  let speed_mult = 1;

  let ldx = 1.0, ldy = 1.0, ldz = 1.0;
  let colors = [[1, 0.7, 0.5, 1], [1, 0.7, 0.5, 1], [1, 0.7, 0.5, 1]];
  let addends = [[0.005, 0.005, 0.005, 0], [0.005, 0.005, 0.005, 0], [0.005, 0.005, 0.005, 0]];
  //sliders for light direction
  let xldslider = document.getElementById("x-lightdir");
  let yldslider = document.getElementById("y-lightdir");
  let zldslider = document.getElementById("z-lightdir");
  let lidiroutput = document.getElementById("lidirVector");

  //sliders to change the speed parameters
  speedslider.oninput = function () {
    speed_mult = this.value / 10;
    speed_text.innerHTML = String(speedslider.value / 10);
  }

  //sliders to change the light direction parameters (x y z)
  xldslider.oninput = function () {
    ldx = this.value / 10;
    lidiroutput.innerHTML = "x: " + String(xldslider.value / 10) + " y: " + String(yldslider.value / 10) + " z: " + String(zldslider.value / 10);
  }
  yldslider.oninput = function () {
    ldy = this.value / 10;
    lidiroutput.innerHTML = "x: " + String(xldslider.value / 10) + " y: " + String(yldslider.value / 10) + " z: " + String(zldslider.value / 10);
  }
  zldslider.oninput = function () {
    ldz = this.value / 10;
    lidiroutput.innerHTML = "x: " + String(xldslider.value / 10) + " y: " + String(yldslider.value / 10) + " z: " + String(zldslider.value / 10);
  }

  //listens to keyboard events
  document.addEventListener('keydown', (event) => {
    //Press T to move the camera position to "top view"
    if (event.key == 'T' || event.key == "t") {
      cameraPosition[1] = 10;
      //Press spacebar to reset
    } else if (event.key == 'A' || event.key == "a") {
      transformationMatrix[12] -= 0.1;
    } else if (event.key == 'D' || event.key == "d") {
      transformationMatrix[12] += 0.1;
    } else if (event.key == 'W' || event.key == "w") {
      transformationMatrix[13] += 0.1;
    } else if (event.key == 'S' || event.key == "s") {
      transformationMatrix[13] -= 0.1;
    } else if (event.key == 'R' || event.key == "r") {
      cameraPosition[1] = 0;
    } else if (event.key == ' ') {
      for (let i = 0; i < colors.length; i++) {

        // get the length of the inner array elements
        let innerArrayLength = colors[i].length;

        // looping inner array elements
        for (let j = 0; j < innerArrayLength - 1; j++) {
          colors[i][j] = getRandomFloat(0, 1, 2);
        }
      }
    }
  }, false);

  for (let i = 0; i < colors.length; i++) {

    // get the length of the inner array elements
    let innerArrayLength = colors[i].length;

    // looping inner array elements
    for (let j = 0; j < innerArrayLength - 1; j++) {
      colors[i][j] = getRandomFloat(0, 1, 2);
    }
  }

  /**Compute matrix
   * - basically ensures that the object is revolving correctly
   */
  function computeMatrix(viewProjectionMatrix, translation, Rotate, Revolve) {
    var matrix = viewProjectionMatrix;
    matrix = m4.yRotate(matrix, Rotate);
    matrix = m4.translate(matrix,
      translation[0],
      translation[1],
      translation[2]);
    matrix = m4.yRotate(matrix, Revolve);
    return matrix;
  }

  var planetDistance = 4;
  var moonDistance = 6;

  function render(time) {
    time *= 0.001 * speed_mult;  // convert to seconds\
    // let rand = getRandomFloat(-0.0001,0.0001,4);
    // addends = [[rand, rand, rand, 0], [rand, rand, rand, 0], [rand, rand, rand, 0]];
    for (let i=0; i<addends.length;i++){
      for (let j=0; j<addends[0].length-1; j++) {
        addends[i][j] += getRandomFloat(-0.0001,0.0001,4);
      }
    }

    // Resizing canvas and enabling options
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);

    gl.useProgram(meshProgramInfo.program);

    // Compute viewProjectionMatrix
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
    const viewProjectionMatrix = m4.multiply(projection, view);

    /**
     * PLANET
     * Requires:
     * - modified viewprojection
     *  - set planet rotation and revolution
     * - transformMatrix
     * - uniforms
     * Then:
     * - set uniforms
     * - set buffers amd attributes
     * - set world rotation and diffuse (includes color)
     *  - world rotation and planet rotation must match
     * - draw
     */

    // var planetTranslate = [-4, 0, 0];
    planetDistance = randomOrbit(4,7,planetDistance);
    var planetTranslate = [-planetDistance, 0, 0];
    var planetRotate = time;
    var planetRevolve = time;

    updateColor(colors, addends);

    // sets the revolution
    const planetUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_matrix: computeMatrix(viewProjectionMatrix, planetTranslate, planetRotate, planetRevolve),
    };

    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, planetUniforms);
    // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
    webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, planetBufferInfo);
    // calls gl.uniform
    // u_world must match rotate * revolve, thus we have multiply
    // if not, maiiwan ang calculation ng light direction
    webglUtils.setUniforms(meshProgramInfo, {
      u_world: m4.multiply(m4.yRotation(planetRotate), m4.yRotation(planetRevolve)),
      u_diffuse: colors[0],
      u_lightDirection: [ldx, ldy, ldz],
      u_transformation: transformationMatrix,
    });
    // calls gl.drawArrays or gl.drawElements
    webglUtils.drawBufferInfo(gl, planetBufferInfo);


    // var moonTranslate = [-6, 1, 0];
    moonDistance = randomOrbit(5,8,moonDistance);
    var moonTranslate = [-moonDistance, 1, 0];
    var moonRotate = -time * 0.8;
    var moonRevolve = time * 0.8;

    // sets the revolution
    const moonUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_matrix: computeMatrix(viewProjectionMatrix, moonTranslate, moonRotate, moonRevolve),
    };

    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, moonUniforms);
    // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
    webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, moonBufferInfo);
    // calls gl.uniform
    // u_world must match rotate * revolve, thus we have multiply
    // if not, maiiwan ang calculation ng light direction
    webglUtils.setUniforms(meshProgramInfo, {
      u_world: m4.multiply(m4.yRotation(moonRotate), m4.yRotation(moonRevolve)),
      u_diffuse: colors[1],
      u_lightDirection: [ldx, ldy, ldz],
      u_transformation: transformationMatrix,
    });
    // calls gl.drawArrays or gl.drawElements
    webglUtils.drawBufferInfo(gl, moonBufferInfo);

    /**
     * STAR
     * Procedure is same for PLANET except no translate and revolve
    */
    var starTranslate = [0, 0, 0];
    var starRotate = -time;
    var starRevolve = 0;

    const starUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_matrix: computeMatrix(viewProjectionMatrix, starTranslate, starRotate, starRevolve),
    };

    webglUtils.setUniforms(meshProgramInfo, starUniforms);
    webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, starBufferInfo);
    webglUtils.setUniforms(meshProgramInfo, {
      u_world: m4.multiply(m4.yRotation(starRotate), m4.yRotation(starRevolve)),
      u_diffuse: colors[2],
      u_lightDirection: [ldx, ldy, ldz],
      u_transformation: transformationMatrix,
    });

    webglUtils.drawBufferInfo(gl, starBufferInfo);

    // loops the animation
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

}

main();


