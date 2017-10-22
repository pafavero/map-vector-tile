var MAP = {};

/**
 * Ol3 map
 */
MAP.ol3Map = function () {
  var KEY = 'vector-tiles-LM25tq4';
  var ATTRIBUTION = '© <a href="https://mapzen.com/">Mapzen</a> ' +
      '© <a href="http://www.openstreetmap.org/copyright">' +
      'OpenStreetMap contributors</a>';
  var _places = [];
  var _layer = new ol.layer.VectorTile({
    projection: "EPSG:4326",
    source: new ol.source.VectorTile({
      attributions: [new ol.Attribution({html: ATTRIBUTION})],
      format: new ol.format.GeoJSON(),
      tileGrid: ol.tilegrid.createXYZ({maxZoom: 16, tileSize: [512, 512]}),
      url: 'http://tile.mapzen.com/mapzen/vector/v1/all/{z}/{x}/{y}.json?api_key=' + KEY,
      tileLoadFunction: tileLoadFunction
    }),
    style: createOl3Style()
  });

  var _map = new ol.Map({
    layers: [_layer],
    target: 'map',
    controls: [],
    view: new ol.View({
      center: ol.proj.transform([-73.99, 40.75], 'EPSG:4326', 'EPSG:3857'),
      zoom: 13,
      maxZoom: 16
    })
  });
  _map.on("click", function (e) {
    _map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
      console.log('over the following feature has been clicked:', feature);
    });
  });
  _map.on("precompose", function (e) {
    labelMap.clear();
  });
  _map.on("precompose", function (e) {
    //console.log('zoom', _map.getView().getZoom());
    var mapExtent = _map.getView().calculateExtent(_map.getSize());
    var zoom = _map.getView().getZoom();
    var offsetText = [0, -60];
    var offsetText2 = [0, 0];
    _layer.getSource().getTileGrid().forEachTileCoord(mapExtent, zoom - 1,
        function (tile) {
          var _placesInTile = _places[tile];
          if (_placesInTile) {
            for (var _index = 0; _index < _placesInTile.length; _index++) {
              var feature = _placesInTile[_index];
              //console.log('feature  ==========>>>>', feature.get('kind'));
              var kind = feature.get('kind');
              if (kind === 'city' &&
                  (zoom <= 13 && zoom > 10)) {
                var geometry = feature.getGeometry();
                var coords = geometry.getCoordinates();
                var _c = ol.proj.transform(coords, 'EPSG:4326', 'EPSG:3857');
                if (ol.extent.containsCoordinate(mapExtent, _c)) {
                  var _pixels = _map.getPixelFromCoordinate(_c);
                  labelMap.addLabel(_pixels, [0, 0], offsetText2, feature.get('name'));
                }
              }
              else if ((kind === 'suburb' || kind === 'town' || kind === 'Populated place')
                  && zoom >= 13) {
                var geometry = feature.getGeometry();
                var coords = geometry.getCoordinates();
                var _c = ol.proj.transform(coords, 'EPSG:4326', 'EPSG:3857');
                if (ol.extent.containsCoordinate(mapExtent, _c)) {
                  var _pixels = _map.getPixelFromCoordinate(_c);
                  labelMap.addLabel(_pixels, [0, 0], offsetText, feature.get('name'), true);
                }

              }
            }
          }
        });
  });

  function tileLoadFunction(tile, url) {
    tile.setLoader(function () {
      $.get(url, function (data) {
        var json = data;
        var format = tile.getFormat();
        var all = [];

        var water = format.readFeatures(json.water);
        water.forEach(function (el) {
          el.set('layer', 'water');
          all.push(el);
        });

        var _placesInTile = format.readFeatures(json.places);
        var _tile = tile.getTileCoord();
        _places[_tile] = [];
        _placesInTile.forEach(function (el) {
          el.set('layer', 'place_label');
          _places[_tile].push(el);
        });

        var roads = format.readFeatures(json.roads);
        roads.forEach(function (el) {
          el.set('layer', 'road');
          all.push(el);
        });

        var landuse = format.readFeatures(json.landuse);
        landuse.forEach(function (el) {
          el.set('layer', 'landuse');
          all.push(el);
        });

        var building = format.readFeatures(json.landuse);
        building.forEach(function (el) {
          el.set('layer', 'buildings');
          all.push(el);
        });

        tile.setFeatures(all);

        tile.setProjection(ol.proj.get("EPSG:4326"));
      });
    });
  }

  function createOl3Style() {
    var fill = new ol.style.Fill({color: ''});
    var stroke = new ol.style.Stroke({color: '', width: 1});
    var polygon = new ol.style.Style({fill: fill});
    var line = new ol.style.Style({stroke: stroke});
    var text = new ol.style.Style({text: new ol.style.Text({
        text: '', fill: fill, stroke: stroke
      })});

    var styles = [];
    return function (feature, resolution) {
      //console.log('=============>>> feature', feature,resolution);
      var length = 0;
      var layer = feature.get('layer');
      var kind = feature.get('kind');
      var geom = feature.getGeometry().getType();
      //console.log(layer, kind, geom);

      //water 
      if ((layer === 'water' && kind === 'water-layer')
          || (layer === 'water' && kind === 'river')
          || (layer === 'water' && kind === 'stream')
          || (layer === 'water' && kind === 'canal')) {
        stroke.setColor('#9DD9D2');
        stroke.setWidth(1.5);
        styles[length++] = line;
      } else if ((layer === 'water' && kind === 'riverbank')) {
        fill.setColor('#9DD9D2');
        stroke.setWidth(1.5);
        styles[length++] = polygon;
      } else if ((layer === 'water' && kind === 'water_boundary')
          || (layer === 'water' && kind === 'ocean_boundary')
          || (layer === 'water' && kind === 'riverbank_boundary')) {
        stroke.setColor('#93cbc4');
        stroke.setWidth(0.5);
        styles[length++] = line;
      } else if (layer === 'water' || layer === 'ocean') {
        fill.setColor('#9DD9D2');
        styles[length++] = polygon;
      } else if (layer === 'aeroway' && geom === 'Polygon') {
        fill.setColor('#9DD9D2');
        styles[length++] = polygon;
      } else if (layer === 'aeroway' && geom === 'LineString' &&
          resolution <= 76.43702828517625) {
        stroke.setColor('#f0ede9');
        stroke.setWidth(1);
        styles[length++] = line;
      }

      //parks
      else if ((layer === 'landuse' && kind === 'park')
          || (layer === 'landuse' && kind === 'nature_reserve')
          || (layer === 'landuse' && kind === 'wood')
          || (layer === 'landuse' && kind === 'protected_land')) {
        fill.setColor('#88D18A');
        styles[length++] = polygon;
      } else if (layer === 'landuse' && kind === 'hospital') {
        fill.setColor('#fde');
        styles[length++] = polygon;
      }
      else if (layer === 'landuse' && kind === 'school') {
        fill.setColor('#f0e8f8');
        styles[length++] = polygon;
      }

      //roads
      else if ((resolution > 3 && layer === 'road' && kind === 'major_road')) {
        stroke.setColor('#fb7b7a');
        stroke.setWidth(1);
        styles[length++] = line;
      }
      else if ((resolution > 3 && layer === 'road' && kind === 'minor_road')) {
        stroke.setColor('#999');
        stroke.setWidth(0.5);
        styles[length++] = line;
      }
      else if ((resolution > 3 && layer === 'road' && kind === 'highway')) {
        stroke.setColor('#FA4A48');
        stroke.setWidth(1.5);
        styles[length++] = line;
      }

      else if ((layer === 'transit' && kind === 'rail')) {
        stroke.setColor('#503D3F');
        stroke.setWidth(0.5);
        styles[length++] = line;
      }

      //building
      else if ((resolution < 3 && layer === 'buildings')) {
        stroke.setColor('#987284');
        stroke.setWidth(0.15);
        styles[length++] = line;
      }

      styles.length = length;
      return styles;
    };
  }
}();

/**
 * It contains only labels.
 */
var labelMap = function () {
  var _width = $('#map').width();
  var _height = $('#map').height();
  var _overMapCanvas = document.getElementById("over-map");
  var _overMapCtx = _overMapCanvas.getContext("2d");
  _overMapCanvas.width = _width;
  _overMapCanvas.height = _height;
  _overMapCtx.beginPath();
  _overMapCtx.arc(95, 50, 40, 0, 2 * Math.PI);
  _overMapCtx.stroke();

  var _labelStyle = {
    padding: [2, -18],
    font: '24px Arial',
    font2: '18px Arial',
    fillStyle: '#fff',
    lineWidth: 2,
    strokeStyle: '#000',
    baselineWidth: 1,
    baseStrokeStyle: 'rgba(255,255,255,0.8)',
    textAlign: 'center'
  };

  var drawLabel = function (pixels, delta, offsetTxt, txt, isFont2) {
    pixels[0] += delta[0];
    pixels[1] = (pixels[1] + delta[1]) * Math.cos(Math.PI / 4) + (_height - (_height * Math.cos(Math.PI / 4)));

    _overMapCtx.save();
    _overMapCtx.font = isFont2 ? _labelStyle.font2 : _labelStyle.font;
    _overMapCtx.textBaseline = 'top';
    _overMapCtx.fillStyle = _labelStyle.fillStyle;
    _overMapCtx.lineWidth = _labelStyle.lineWidth;
    _overMapCtx.strokeStyle = _labelStyle.strokeStyle;
    _overMapCtx.textAlign = _labelStyle.textAlign;

    var _widthText = _overMapCtx.measureText(txt).width + 15;
    drawBaseForLabel(pixels, offsetTxt);
    if (isFont2) {
      _overMapCtx.rect(pixels[0] - _widthText / 2, pixels[1] + offsetTxt[1] - 20, _widthText,
          parseInt(_labelStyle.font2, 10) + 6);
      _overMapCtx.fillRect(pixels[0] - _widthText / 2, pixels[1] + offsetTxt[1] - 20, _widthText,
          parseInt(_labelStyle.font2, 10) + 6);
      _overMapCtx.stroke();
      _overMapCtx.fill();
    }

    _overMapCtx.fillStyle = '#000';
    _overMapCtx.fillText(txt, pixels[0] + offsetTxt[0] + _labelStyle.padding[0],
        pixels[1] + offsetTxt[1] + _labelStyle.padding[1]);
    _overMapCtx.strokeText(txt, pixels[0] + offsetTxt[0] + _labelStyle.padding[0],
        pixels[1] + offsetTxt[1] + _labelStyle.padding[1]);

    _overMapCtx.restore();
  };

  var drawBaseForLabel = function (pixels, offsetTxt) {
    _overMapCtx.beginPath();
    _overMapCtx.moveTo(pixels[0], pixels[1]);
    _overMapCtx.lineTo(pixels[0] + offsetTxt[0], pixels[1] + offsetTxt[1]);
    _overMapCtx.closePath();
    _overMapCtx.lineWidth = _labelStyle.baselineWidth;
    _overMapCtx.strokeStyle = "rgba(50,50,50,0.6)";
    _overMapCtx.stroke();
  };

  return {
    addLabel: function (coordinate, delta, offsetTxt, txt, isFont2) {
      drawLabel(coordinate, delta, offsetTxt, txt, isFont2);
    },
    clear: function () {
      _overMapCtx.clearRect(0, 0, _overMapCanvas.width, _overMapCanvas.height);
    }
  };
}();

