import spawn from 'child_process';

export default ({ config, log, verbose, program }) =>
  // const gpxPath =
  // exec(`igotugpx dump --device ${device}`)
  new Promise((resolve, reject) => {
    const device = config.device;
    const igotugpx = spawn('igotugpx', ['dump', '--device', device]);
    igotugpx.stdout.on('data', (data) => {

    });
    igotugpx.stderr.on('data', (data) => {
      reject(data);
    });
    igotugpx.on('close', (code) => {
      if (code !== 0) reject(`Child process igotugpx exited with code ${code}`);
    });
  });
