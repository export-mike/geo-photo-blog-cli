import { spawn } from 'child_process';
import gpxParse from 'gpx-parse';
import chalk from 'chalk';
import moment from 'moment';
import fs from 'fs';

export default ({ config, log, verbose, program }) =>
  // const gpxPath =
  // exec(`igotu2gpx dump --device ${device}`)
  new Promise((resolve, reject) => {
    const device = config.device;
    log(chalk.blue('connecting to device', device));
    const igotu2gpx = spawn('igotu2gpx', ['dump', '--device', device]);
    let data;
    igotu2gpx.stdout.on('data', (chunk) => {
      verbose(chunk.toString());
      data += chunk;
    });
    // we get strange data on stderr...
    // igotu2gpx.stderr.on('data', () => {
    //   // if (err) {
    //   //   log('sderr', err);
    //   //   reject(err);
    //   // }
    // });
    igotu2gpx.on('close', (code) => {
      if (code !== 0) reject(`Child process igotu2gpx exited with code ${code}`);
      data = data.toString();
      const res = data.indexOf('<?xml version="1.0" encoding="UTF-8"?>');
      if (res !== -1) {
        const gpxString = data.substr(res, data.length - 1);
        fs.writeFileSync(
          program.gpxImport ?
          program.gpxImport :
          `./${new Date().toISOString()}.gpx`,
          gpxString.replace(/2000-/g, `${new Date().getUTCFullYear()}-`)
        );
        resolve();
      }
    });
  });
