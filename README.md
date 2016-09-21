* What is this?
its a CLI tool that runs image compressions to JPG images and embeds GEO Lat and Long information to media files via exiftool.

Its experimental and is being used on my travels so I can share images with friends and family easily.

simply create a directory: ~/mytravels.
make directories in ~/mytravels they become albums.

run geotag

It also communicates to igotu 120 gps logger over USB to get GPX file and manipulates the gpx file for correct date stamp. https://www.amazon.co.uk/i-gotU-GT-120-IGOTU-Tracker/dp/B0021AE83M

After this step it'll geotag your images then sync with amazon S3.

* WORKFLOW
copy over images to folders in ~/mytravels
copy over images to ext HDD for backup (also preserves RAW originals)
run `geotag`

* Cleaning up local machine from files to reduce disk space used by blog
rm -rf .cache
rm <IMAGE_FOLDERS>
