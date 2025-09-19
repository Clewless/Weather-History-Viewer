/**
 * Gets the URL for a map tile from the OpenStreetMap.
 * @param z The zoom level.
 * @param x The x coordinate.
 * @param y The y coordinate.
 * @returns The URL of the map tile.
 */
export const getMapTileUrl = (z: number, x: number, y: number): string => {
  return `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
};
