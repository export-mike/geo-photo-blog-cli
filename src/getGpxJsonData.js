import promisify from 'promisify-node';
import { flow, get, first, map } from 'lodash/fp';
import glob from './glob';
import gpxParse from 'gpx-parse';

// const parseGpx = promisify(require('gpx-parse').parseGpx);
const fs = promisify(require('fs'));

const getTracks = flow(
  get('tracks'),
  first,
  get('segments'),
  first,
  map(({ lat, lon, elevation, time }) => ({ lat, lon, elevation, time }))
);

function getTracksAndWaypoints(g) {
  const tracks = getTracks(g);
  return { tracks, waypoints: [] };
}

export default () =>
  glob('**/*.gpx')
  .then(gpxFiles =>
    Promise.resolve(gpxFiles)
    .then(paths => paths.map(p => fs.readFile(p)))
    .then(gpxFilesData => gpxFilesData.map(
        g => new Promise((resolve, reject) => {
          gpxParse.parseGpx(g, (error, data) => {
            if (error) return reject(error);
            return resolve(data);
          });
        })))
    .then(gps => {
      // IT ERRORS BUT STILL goes into a then callback?!
      console.log('got gpx', gps);
      return gps;
    })
    .then(gpxFilesJson => gpxFilesJson.map(g => getTracksAndWaypoints(g)))
    .then(({ tracks, waypoints }) => ({ tracks, waypoints, gpxFiles }))
    .catch(e => console.log('error', e))
  );
