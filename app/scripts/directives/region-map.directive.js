import L from 'leaflet'
import 'leaflet.vectorgrid'
import _ from 'lodash-es'
import * as colorbrewer from "colorbrewer"

export default function regionMap($http, $rootScope, $q, dataService,
    formattingService, $timeout, $uibModal) {

  // tileserver-gl-light URL
  const tileserverBaseUrl = "https://tiles.map.midja.org"
  const tileJsonUrlTmpl = d =>
    `${tileserverBaseUrl}/data/${d.regionType}.json`
  const defaultStyles = {
    'regions': _.constant({
      weight: 1,
      color: '#000000',
      fillColor: '#ffffff',
      opacity: 1,
      fillOpacity: 0.7,
      fill: true
    }),
    'points': _.constant({
      weight: 0.1,
      color: '#000000',
      opacity: 0
    })
  }
  const regionHeadingTmpl = d => `${d.name} (${d.code})`

  // Modified VectorGrid which can take a layer order, so our points can be
  // consistently rendered above regions.
  var ModifiedVectorGrid = L.VectorGrid.Protobuf.extend({
    _getVectorTilePromise: function(coords) {
      var layerOrder = this.options.layerOrder || [];
      var overriddenMethod = _.bind(
        L.VectorGrid.Protobuf.prototype._getVectorTilePromise,
        this);
      return overriddenMethod(coords)
        .then(function(data) {
          var sortedKeys = _.sortBy(_.keys(data.layers), function(
            layer) {
            return layerOrder.indexOf(layer);
          });
          data.layers = _.zipObject(
            sortedKeys,
            _.map(sortedKeys, _.propertyOf(data.layers))
          );
          return data;
        });
    }
  })

  // Generate random ID for map
  var mapId = 'map-' + Math.random().toString().slice(2);
  // Create template using ID
  var template = `<div id="${mapId}" class="region-map"></div>`

  var map = null;
  var regionLayers = null;

  var scopeAttributes = {
    'regionType': '=',
    'regions': '=',
    'choroplethTopic': '=',
    'bubblesTopic': '=',
    'choroplethVisible': '=',
    'bubblesVisible': '=',
    'watchForResize': '=',
    'selectedRegion': '=?'
  }

  return {
    template: template,
    restrict: 'E',
    scope: scopeAttributes,
    replace: true,
    link: postLink
  };

  function setupEvents(scope) {
    function changeEmitter(baseEventName) {
      return function(newVal, oldVal) {
        if (!_.isEqual(newVal, oldVal)) {
          scope.$emit(baseEventName + ':change', newVal, oldVal);
        }
      }
    }
    // Setup attribute watchers
    for (var attr in scopeAttributes) {
      scope.$watch(attr, changeEmitter(_.kebabCase(attr)));
    }
  }

  function getTileJSON(regionType) {
    return $http.get(tileJsonUrlTmpl({
        regionType: regionType
      }))
      .then(function(response) {
        return response.data;
      });
  }

  function featureStyleCreator(scope, layer) {
    return function(properties, zoom) {
      var hideStyle = _.constant({
        opacity: 0,
        fillOpacity: 0
      });
      var regionCode = properties.region_code
      var region = _.find(
        scope.regions,
        _.flow(
          _.property('code'),
          _.partial(_.isEqual, regionCode)
        ));
      if (!region || (scope._bucketFilter && !scope._bucketFilter(region))) {
        return hideStyle();
      }
      return (
        scope.styles[layer] || defaultStyles[layer] || hideStyle
      )(region);
    };
  }

  function setupHooks(scope) {
    function initVectorGrid(regionType) {
      // Create new VectorGrid
      return getTileJSON(regionType).then(function(metadata) {
       var styles = _.fromPairs(_.map(
         metadata.vector_layers,
         _.flow(
           _.property('id'),
           function(layerId) {
             return [layerId, featureStyleCreator(scope,
               layerId)];
           }
         )));
       var bounds = L.latLngBounds(_.map(
         _.chunk(metadata.bounds, 2),
         function(p) {
           return L.latLng(p[1], p[0]);
         }));
       var vectorGrid = new ModifiedVectorGrid(metadata.tiles[0], {
         attribution: metadata.attribution,
         bounds: bounds,
         interactive: true,
         layerOrder: ['regions', 'points'],
         rendererFactory: L.canvas.tile,
         vectorTileLayerStyles: styles,
         getFeatureId: function(feature) {
           var randomId = 'feature-'+(Math.random()+"").slice(2);
           return randomId;
         }
       });
       // This uses internal APIs in VectorGrid,
       // but is *much* faster than vectorGrid.redraw().
       vectorGrid.smartRedraw = _.debounce(function() {
         _.values(vectorGrid._vectorTiles).forEach(function(tile) {
           _.keys(tile._features).forEach(function(featureId) {
             vectorGrid.resetFeatureStyle(featureId);
           });
           tile._redraw();
         });
       }, 100);
       var resolveRegion = function (regionCode) {
         return _.find(
           scope.regions,
           _.matchesProperty('code', regionCode));
       }
       var evtEmitHook = function(eventName) {
         return function(evt) {
           var region = resolveRegion(evt.layer.properties.region_code);
           if (region) {
             var data =
               scope.regionData && scope.regionData[region.code];
             scope.$emit(eventName, region, data);
           }
         };
       };
       vectorGrid.on('mouseover', evtEmitHook('vector-grid:mouseover'));
       vectorGrid.on('click', evtEmitHook('vector-grid:click'));
       vectorGrid.on('dblclick', evtEmitHook('vector-grid:dblclick'));
       vectorGrid.on('contextmenu', evtEmitHook('vector-grid:contextmenu'));

       // Trigger replacement
       scope.styles = {};
       var previousVectorGrid = scope.vectorGrid;
       scope.vectorGrid = vectorGrid;
       scope.$emit('vector-grid:change', vectorGrid, previousVectorGrid);
       // Add property to allow easier change detection
       vectorGrid.regionType = regionType;
       return vectorGrid;
     });
    }
    function redrawVectorGrid(vectorGrid) {
      vectorGrid.smartRedraw();
      return vectorGrid;
    }
    function checkVectorGrid(regionType) {
      if (scope.vectorGrid && scope.vectorGrid.regionType == regionType) {
        return Promise.resolve(scope.vectorGrid);
      } else {
        return initVectorGrid(regionType);
      }
    }
    function refreshData(vectorGrid) {
      var attributes = _.chain([scope.choroplethTopic, scope.bubblesTopic])
        .filter(_.isObject)
        .map(_.property('name'))
        .value();
      if (_.isEmpty(attributes)) {
        scope.regionData = {};
        return vectorGrid;
      } else {
        return dataService.getAttributesForRegions(
          scope.regionType, attributes, scope.regions
        ).then(function(data) {
          scope.regionData = data;
          return vectorGrid;
        });
      }
    }
    function updateChoropleth(vectorGrid) {
      var regionData = scope.regionData;
      var choroplethTopic = scope.choroplethTopic;
      if (_.isObject(choroplethTopic) && scope.choroplethVisible) {
        var buckets = generateBuckets(
          _.map(
            _.values(regionData),
            _.property(choroplethTopic.name)));
        var colorer = colorerForBuckets("YlOrRd", buckets);
        var regionColor = function(region) {
          try {
            return colorer(regionData[region.code][choroplethTopic.name]);
          } catch (e) {
            return null;
          }
        };
        scope.$emit('legend:set',
          'regions', 'right',
          getLegend(scope, choroplethTopic, buckets, colorer));
        scope.styles = _.defaults({
          regions: function(region) {
            var color = regionColor(region);
            var baseStyle = defaultStyles['regions'](region);
            if (color) {
              return _.defaults({
                fillColor: color
              }, baseStyle);
            } else {
              return baseStyle;
            }
          }
        }, scope.styles);
      } else {
        scope.$emit('legend:clear', 'regions');
        scope.styles = _.defaults({
          regions: null
        }, scope.styles);
      }
      return vectorGrid;
    };
    function updateBubbles(vectorGrid) {
      var regionData = scope.regionData;
      var bubblesTopic = scope.bubblesTopic;
      if (_.isObject(bubblesTopic) && scope.bubblesVisible) {
        var buckets = generateBuckets(
          _.map(
            _.values(regionData),
            _.property(bubblesTopic.name)));
        var colorer = colorerForBuckets("Blues", buckets);
        var sizer = sizerForBuckets(2, 6, buckets);
        var regionColor = function(region) {
          try {
            return colorer(regionData[region.code][bubblesTopic.name]);
          } catch (e) {
            return null;
          }
        };
        var regionSize = function(region) {
          try {
            return sizer(regionData[region.code][bubblesTopic.name]);
          } catch (e) {
            return null;
          }
        };
        scope.styles = _.defaults({
          points: function(region) {
            var color = regionColor(region);
            var size = regionSize(region);
            var baseStyle = defaultStyles['points'](region);
            if (color && size) {
              return _.defaults({
                fill: true,
                fillColor: color,
                fillOpacity: 1,
                opacity: 1,
                radius: size
              }, baseStyle);
            } else {
              return baseStyle;
            }
          }
        }, scope.styles);
        scope.$emit('legend:set',
          'points', 'left',
          getLegend(scope, bubblesTopic, buckets, colorer));
      } else {
        scope.styles = _.defaults({
          points: null
        }, scope.styles);
        scope.$emit('legend:clear', 'points');
      }
      return vectorGrid;
    };
    var redraw = _.debounce(function() {
      checkVectorGrid(scope.regionType)
        .then(refreshData)
        .then(updateChoropleth)
        .then(updateBubbles)
        .then(redrawVectorGrid)
        .catch((e) => { throw e });
    }, 50);
    scope.$on('region-type:change', redraw);
    scope.$on('regions:change', redraw);
    scope.$on('choropleth-topic:change', redraw);
    scope.$on('choropleth-visible:change', redraw);
    scope.$on('bubbles-topic:change', redraw);
    scope.$on('bubbles-visible:change', redraw);
    scope.$on('region-data:change', redraw);
    scope.$on('choropleth-visible:change', redraw);
    scope.$on('bubbles-visible:change', redraw);
  }

  function generateBuckets(values) {
    var series = _.filter(values, function(v) {
      return _.isNumber(v) && !_.isNaN(v);
    });
    var maxBuckets = Math.min(5, _.uniq(series).length)
    if (maxBuckets == 0) {
      return [];
    } else {
      return dataService.getCkmeansBuckets(series, maxBuckets);
    }
  }

  function colorerForBuckets(colorPaletteName, buckets) {
    var colors = colorbrewer[colorPaletteName][Math.max(buckets.length, 3)];
    return function(v) {
      var i = _.findIndex(buckets, function(bucket) {
        return bucket.contains(v);
      });
      return i == -1 ? null : colors[i];
    };
  }

  function sizerForBuckets(min, max, buckets) {
    var n = buckets.length;
    var sizes = (n >= 2) ?
      _.range(min, max, (max - min) / (n - 1)).concat([max]) :
      _.take([min, max], n);
    return function(v) {
      var i = _.findIndex(buckets, function(bucket) {
        return bucket.contains(v);
      });
      return i == -1 ? null : sizes[i];
    };
  }

  function getLegend(scope, topic, buckets, colorer) {
    var div = L.DomUtil.create('div', 'legend');
    var ul = L.DomUtil.create('ul', '', div);
    buckets.forEach(function(bucket) {
      var li = L.DomUtil.create('li', '', ul);
      li.onmouseover = () => scope.$emit('bucket:mouseover', topic, bucket)
      li.onmouseout = () => scope.$emit('bucket:mouseout', topic, bucket)
      li.onclick = () => scope.$emit('bucket:click', topic, bucket)
      var bullet = L.DomUtil.create('div', 'bullet', li);
      angular.element(bullet).css("background", colorer(bucket.min));
      var text = L.DomUtil.create('span', '', li);
      text.innerHTML = _.map(
        [bucket.min, bucket.max],
        _.partial(formattingService.formatNumber, _, topic.format)
      ).join(" - ");
    });
    return div;
  }

  function postLink(scope, element, attrs) {
    setupEvents(scope);
    setupHooks(scope);

    var map = L.map(mapId, {
      center: [-27, 134],
      doubleClickZoom: false,
      zoom: 4
    });
    // Debounce so other elements have a chance to resize first
    var resizeMap = _.debounce(function() {
      map.invalidateSize({
        pan: true,
        debounceMoveend: true
      });
      _.forEach(map.layers, _.method('redraw'));
    }, 10);
    scope.$on('watch-for-resize:change', resizeMap);
    resizeMap();

    // add a nice baselayer from Stamen
    L.tileLayer(
      'https://maps.nlp.nokia.com/maptiler/v2/maptile/newest/normal.day/{z}/{x}/{y}/' +
      '256/png8?lg=eng&token=A7tBPacePg9Mj_zghvKt9Q&app_id=KuYppsdXZznpffJsKT24', {
        attribution: 'Stamen'
      }).addTo(map);

    var topicAttribution = L.control.attribution({
      prefix: false,
      position: 'bottomleft'
    })
    topicAttribution.onAdd = function() {
      this._container =
        L.DomUtil.create('div', 'leaflet-control-attribution');
      L.DomEvent.disableClickPropagation(this._container);
      this._update();
      return this._container;
    };
    topicAttribution.addTo(map);
    var topicAttributionHandler = function(e, newTopic, oldTopic) {
      if (oldTopic && oldTopic.source) {
        topicAttribution.removeAttribution(oldTopic.source.name);
      }
      if (newTopic && newTopic.source) {
        topicAttribution.addAttribution(newTopic.source.name);
      }
    }
    scope.$on('choropleth-topic:change', topicAttributionHandler);
    scope.$on('bubbles-topic:change', topicAttributionHandler);


    scope.$on('vector-grid:change', function(evt, newLayer, oldLayer) {
      if (oldLayer) {
        try {
          oldLayer.removeFrom(map);
        } catch (e) {}
      }
      if (newLayer) {
        newLayer.addTo(map);
      }
    });

    var featureControl = null;
    var showRegionHover = function(e, region, data) {
      scope.$apply(() => scope.selectedRegion = region)
      var newFeatureControl = L.control({
        position: 'topright'
      });
      newFeatureControl.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'feature-hover');
        var heading = L.DomUtil.create('h1', '', div);
        heading.innerHTML = regionHeadingTmpl(region);
        var topics = _.chain([scope.choroplethTopic, scope.bubblesTopic])
          .filter(_.isObject)
          .uniq(_.property('name'))
          .filter(_.flow(_.property('name'), _.partial(_.has, data)))
          .value();
        if (!_.isEmpty(topics)) {
          var dl = L.DomUtil.create('dl', '', div);
          _.forEach(topics, function(topic) {
            var dt = L.DomUtil.create('dt', '', dl);
            dt.innerHTML=topic.description;
            var dd = L.DomUtil.create('dd', '', dl);
            dd.innerHTML=formattingService.formatNumber(
              data[topic.name], topic.format);
          })
        }
        return div;
      };
      if (featureControl) {
        featureControl.remove();
      }
      featureControl = newFeatureControl;
      featureControl.addTo(map);
    };
    scope.$on('vector-grid:mouseover', showRegionHover);
    scope.$on('vector-grid:click', showRegionHover);

    var showRegionModal = _.debounce(function(e, region) {
      var vm = $rootScope.$$childTail.vm;
      var regionType = region.type;
      var regionCodeAttribute = regionType+'_code';
      var attributes = vm.vis.topics;
      var attrNames = _.map(vm.vis.topics, _.property('name'));

      dataService.getAttributesForRegions(regionType, attrNames, [{
        'code': region.code
      }]).then(function(data) {
        let modalInstance = $uibModal.open({
          animation: true,
          template: require('../../views/region-details-modal.html'),
          controller: 'RegionDetailsModalController',
          resolve: {
            context: {
              heading: regionHeadingTmpl(region),
              attributes: attributes,
              getValue: _.propertyOf(
                  _.first(_.values(data))),
              formatNumber: formattingService.formatNumber
            }
          }
        });
        modalInstance.result.catch((e) => console.log(e))
      });
    }, 100);
    scope.$on('vector-grid:dblclick', showRegionModal);
    scope.$on('vector-grid:contextmenu', showRegionModal);

    var legends = {};
    scope.$on('legend:set', function(evt, type, position, legendEl) {
      var legend = L.control({
        position: 'bottom'+position
      });
      legend.onAdd = _.constant(legendEl);
      if (legends[type]) {
        legends[type].remove();
      }
      legends[type] = legend;
      legend.addTo(map);
    });
    scope.$on('legend:clear', function(evt, type) {
      if (legends[type]) {
        legends[type].remove();
      }
    });

    scope.$on('bucket:mouseover', (evt, topic, bucket) => {
      const valueFor = _.flow(
        _.property('code'),
        _.propertyOf(scope.regionData),
        _.property(topic.name))
      scope._bucketFilter = _.flow(valueFor, bucket.contains)
      scope.vectorGrid.smartRedraw()
    })

    scope.$on('bucket:mouseout', (evt) => {
      scope._bucketFilter = null
      scope.vectorGrid.smartRedraw()
    })
  }

}
