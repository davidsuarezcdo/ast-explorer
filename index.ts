import * as path from 'path';
import * as fs from 'fs';
import { Worker } from 'worker_threads';

var currentFileIndex = 0;
var controllerFiles: string[] = [];

function findControllerFiles(dir: string): string[] {
  const files: string[] = [];
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory() && !/node_modules/.test(filePath)) {
      files.push(...findControllerFiles(filePath));
    } else if (/controller\.ts$/.test(filePath)) {
      files.push(filePath);
    }
  });
  return files;
}

function getNextFile() {
  if (currentFileIndex < controllerFiles.length) {
    const file = controllerFiles[currentFileIndex];
    currentFileIndex++;
    return file;
  }
  return null;
}

function letsRock() {
  return new Promise((resolve, reject) => {
    const dir = '/home/david/compara/conversation-commerce';
    controllerFiles = findControllerFiles(dir);

    console.log('processing', controllerFiles.length, 'files')

    const data = [] as any[];
    const workers = [];
    const numWorkers = 6;

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(path.join(__dirname, 'worker.js'));
      workers.push(worker);
    }

    workers.forEach(worker => {
      worker.on('message', ({ ok, functionalities }) => {
        if (ok) {
          data.push(...functionalities);  
          console.log('ok', data.length, currentFileIndex, controllerFiles[currentFileIndex - 1]);

          const file = getNextFile();
          if (file) worker.postMessage(file);
        }

        if(currentFileIndex >= controllerFiles.length) {
          resolve(data);
        }
      });
      const file = getNextFile();
      if (file) worker.postMessage(file);
    });
  });

}


letsRock().then((data) => {
  fs.writeFileSync('functionalities.json', JSON.stringify(data, null, 2));
  console.log(data);
});
