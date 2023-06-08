/**
 * Node server for the html file
 * This is because modules only work with the HTTP(s) protocol
 * Web pages opened via file:// protocol cannot use import
 */

const http = require('http');
const fs = require('fs');
const host = 'localhost'
const port = 8000;

const server = http.createServer((req,res)=>{
    res.writeHead(200,{'Content-Type':'text/html'});
    fs.readFile('index.html',(error,data)=>{
        if (error){
            res.writeHead(404);
            res.write('Error: File not Found');
        } else {
            res.write(data);
        }
    });
    res.end();
});

server.listen(port,host,(error)=>{
    if (error){
        console.log('Something went wrong',error);
    } else {
        console.log(`Server is listening to http://${host}:${port}`);
    }
});