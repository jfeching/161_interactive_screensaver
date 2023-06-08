// file loader
// parser builds buffer
// binary file loader

// reference = https://www.youtube.com/watch?v=xhoILgKOOwk&list=PLPbmjY2NVO_X1U1JzLxLDdRn4NmtxyQQo&index=20

const getFileContents = async (filename) => {
    const file = await fetch(filename);
    const body = await file.text;
    return body;
};

const stringsToNumbers = (strings) => {
    const numbers = [];
    for (const str of strings) {
        numbers.push(parseFloat(str));
    }
    return numbers;
};

const parseFile = (fileContents) => {
    const positions = [];
    const textCoords = [];
    const normals = [];

    const arrayBufferSource = [];

    const lines = fileContents.split('\n');
    for (const line of lines) {
        const [command, ...values] = line.split(' ',4);

        if (command == 'v') {
            positions.push(stringsToNumbers(values));
        } else if (command == 'vt') {
            textCoords.push(stringsToNumbers(values));
        } else if (command == 'vn') {
            normals.push(stringsToNumbers(values));
        }
        
        else if (command == 'f') {
            for (const group of values) {
                const [positionIndex, textCoordIndex, normalIndex] = stringsToNumbers(group.split('/'));
                
                arrayBufferSource.push(...positions[positionIndex-1]);
                arrayBufferSource.push(...textCoords[textCoordIndex-1]);
                arrayBufferSource.push(...normals[normalIndex-1]);
            }
        }
    }
    return new Float32Array(arrayBufferSource).buffer;
};

const main = async () => {
    const fileContents = await getFileContents('brown_ball.obj');
    const arrayBuffer = parseFile(fileContents);
    console.log(arrayBuffer);
};

main();