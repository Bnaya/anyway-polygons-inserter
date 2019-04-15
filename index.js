const fs = require("fs-extra");
const path = require("path");
const pg = require("pg");
const glob = require("glob");

const dataPath = path.resolve(__dirname, "../israel-municipalities-polygons/");

async function asyncWrapper() {
  const client = new pg.Client(process.env.DB_CONN_STRING);
  await client.connect();

  /** @type {string[]} */
  const files = await new Promise((res, rej) => {
    glob(path.resolve(dataPath, "**/*.geojson"), (error, matches) => {
      if (error) {
        rej(error);
        return;
      }

      res(matches);
    });
  });

  for (const file of files) {
    const data = await fs.readJSON(file, { encoding: "utf8" });
    for (const place of data.features) {
      const polygon = place.geometry;

      const { osm_id, MUN_HEB, MUN_ENG, type, name } = place.properties;
      const file_name = path.basename(file, path.extname(file));

      const res = await client.query(
        `INSERT INTO municipalities (osm_id, "MUN_HEB", "MUN_ENG", type, name, file_name, polygon) ` +
          ` VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromGeoJSON($7::text))`,
        [osm_id, MUN_HEB, MUN_ENG, type, name, file_name, polygon]
      );

      console.log(res);
    }
  }

  // client.query()

  await client.end();
}

asyncWrapper().then(
  () => {},
  e => {
    console.error("ooppss", e);
  }
);
