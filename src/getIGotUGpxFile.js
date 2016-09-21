import { spawn } from 'child_process';
import chalk from 'chalk';
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

    // we rely on exit code for resolve/reject
    igotu2gpx.stderr.on('data', (chunk) => {
      log(chunk.toString());
    });

    igotu2gpx.on('close', (code) => {
      if (code !== 0) reject(`Child process igotu2gpx exited with code ${code}`);
      if (!data) return resolve();
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
        return resolve();
      }
      // we rely on the exit code to determine resolve or reject
      return reject('Unable to parse gpx stream');
    });
  });
