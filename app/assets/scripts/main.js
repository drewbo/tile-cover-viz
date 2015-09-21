'use strict';
var config = require('./config');

let leafletDraw = require('leaflet-draw');
let d3 = require('d3');
var $ = require('jquery');
let cover = require('tile-cover');
let tilebelt = require('tilebelt');
let polygon = require('turf-polygon');
let chroma = require('chroma-js');
let centroid = require('turf-centroid');

L.Icon.Default.imagePath = 'images';
L.mapbox.accessToken = 'pk.eyJ1IjoiZHJld2JvMTkiLCJhIjoiWlpRb2lYUSJ9.aT3CQyI2_wYzqKPDqjgvyw';

let map = L.mapbox.map('map','mapbox.satellite');
let drawn = new L.FeatureGroup();
map.addLayer(drawn);

// don't enable normal delete toolbar behavior
L.EditToolbar.Delete.prototype.enable = function () {};

let drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawn,
        edit: false
    },
		draw: {
			circle: false,
			polyline: false,
      rectangle: false,
      marker: false,
			polygon: {
        allowIntersection: false // Restricts shapes to simple polygons
		  }
		}
});
map.addControl(drawControl);

// our custom delete behavior
d3.select('.leaflet-draw-edit-remove').on('click', () => {
  drawn.clearLayers();
  tileCoverLayer.clearLayers();
});

let limits = {
  min_zoom: 4,
  max_zoom: 10
}

let scale = chroma.scale(['white','darkblue'])
        .mode('hsl')
        .domain(d3.range(limits.min_zoom - 1, limits.max_zoom + 1));

let tileCoverLayer = new L.FeatureGroup();
map.addLayer(tileCoverLayer);
map.on('draw:created', (e) => {

    let type = e.layerType,
        layer = e.layer;

    drawn.addLayer(layer);

    // do the thing
    let geo = cover.tiles(layer.toGeoJSON().geometry, limits)
      .map((tile) => {
        return {
          tile: tilebelt.tileToGeoJSON(tile),
          zoom: tile[2]
        };
      })
      .map((g) => {
        return polygon([g.tile.coordinates[0]], {zoom: g.zoom});
      });

    geo.forEach((g) => {
      let c = centroid(g);
      let p1 = map.latLngToContainerPoint(g.geometry.coordinates[0][0]);
      let p2 = map.latLngToContainerPoint(g.geometry.coordinates[0][2]);
      let height = Math.abs(p1.y - p2.y);
      let width = Math.abs(p1.x - p2.x);
      // round the average of the height and width to the nearest power of 2
      let dim = Math.max(1, Math.pow(2, Math.round(Math.log((height + width)/2)/Math.log(2))));
      let icon = L.divIcon({
        className: 'zoom-' + g.properties.zoom,
        iconSize: [dim, dim],
        html: '<div class="platform"><div class="fill-line"></div></div>'
      });
      L.marker(c.geometry.coordinates.reverse(), {icon: icon}).addTo(tileCoverLayer);
    });

});

let magic = false;
d3.select('.magic-button').on('click', () => {
  d3.select('.map-container').classed('magic', !magic);
  d3.select('svg').classed('magic', !magic);
  (!magic) ? map.dragging.disable() : map.dragging.enable();
  magic = !magic;
  $('#map').attr('style', '-webkit-transform:rotateZ(0deg)');
  $('#map').attr('style', 'transform:rotateZ(0deg)');
});

// from peter liu's bikeshare thing
// https://www.mapbox.com/blog/dc-bikeshare-revisited/
let angle=0;
let xdrag=0;
let isDown=false;
let xpos=0;

// map rotation
$('body').on('mousedown','.map-container.magic',
  (e) => {
        xpos= e.pageX;
        isDown = true;
    })
    .on('mousemove','.map-container.magic', (e) => {
      if(isDown){
        xdrag = (xpos-e.pageX) / 4;
        $('#map').attr('style', '-webkit-transform:rotateZ('+(angle+xdrag)%360+'deg)');
        $('#map').attr('style', 'transform:rotateZ('+(angle+xdrag)%360+'deg)');
      }
    })
  .on('mouseup','.map-container.magic', () => {
    isDown=false;
    angle = angle+xdrag;
  });
