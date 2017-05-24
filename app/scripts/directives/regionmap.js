'use strict';

/**
 * @ngdoc directive
 * @name midjaApp.directive:cartodbMap
 * @description
 * # cartodbMap
 */
angular.module('midjaApp')
  .directive('regionMap', function(L, $http, $rootScope, $q, dataService,
    labelService, mapService, $uibModal) {

    // tileserver-gl-light URL
    var tileserverBaseUrl = "https://tiles.map.midja.org";
    var tileJsonUrlTmpl = _.template(
      tileserverBaseUrl + "/data/<%=regionType%>.json");
    var defaultStyles = {
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
        radius: 3,
        opacity: 0
      })
    };
    var regionHeadingTmpl = _.template("<%=name%> (<%=code%>)");

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
    var template = _.template(
      '<div id="<%=id%>" class="region-map"></div>'
    )({
      id: mapId
    });

    var map = null;
    var regionLayers = null;

    var scopeAttributes = {
      'regionType': '=',
      'regions': '=',
      'choroplethTopic': '=',
      'bubblesTopic': '=',
      'choroplethVisible': '=',
      'bubblesVisible': '='
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
            console.log(baseEventName + ':change', newVal, oldVal);
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
            _.partial(_.isEqual, regionCode)));
        if (!region) {
          return hideStyle();
        }
        return (
          scope.styles[layer] || defaultStyles[layer] || hideStyle
        )(region);
      };
    }

    function setupHooks(scope) {
      var redrawVectorGrid = function redrawVectorGrid() {
        if (scope.vectorGrid) {
          scope.vectorGrid.redraw();
        }
      };
      scope.$on('region-type:change', function _regionTypeChange(evt, regionType) {
        // Create new VectorGrid
        getTileJSON(regionType).then(function(metadata) {
          var styles = _.zipObject(_.map(
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
            vectorTileLayerStyles: styles
          });
          var resolveRegion = function (regionCode) {
            return _.find(
              scope.regions,
              _.matchesProperty('code', regionCode));
          }
          vectorGrid.on('mouseover', function(evt) {
            var region = resolveRegion(evt.layer.properties.region_code);
            if (region) {
              var data =
                scope.regionData && scope.regionData[region.code];
              scope.$emit('vector-grid:mouseover', region, data);
            }
          });
          vectorGrid.on('click', function(evt) {
            var region = resolveRegion(evt.layer.properties.region_code);
            if (region) {
              var data =
                scope.regionData && scope.regionData[region.code];
              scope.$emit('vector-grid:click', region, data);
            }
          });

          // Trigger replacement
          scope.styles = {};
          var previousVectorGrid = scope.vectorGrid;
          scope.vectorGrid = vectorGrid;
          scope.$emit('vector-grid:change', vectorGrid, previousVectorGrid);
        });
      });
      scope.$on('regions:change', redrawVectorGrid);
      var refreshData = function _refreshData(evt) {
        return $q(function(resolve) {
          var attributes = _.chain([scope.choroplethTopic, scope.bubblesTopic])
            .filter(_.isObject)
            .map(_.property('name'))
            .value();
          if (_.isEmpty(attributes)) {
            scope.regionData = {};
            resolve(scope.regionData);
          } else {
            dataService.getAttributesForRegions(
              scope.regionType, attributes, scope.regions
            ).then(function(data) {
              scope.regionData = data;
              resolve(scope.regionData);
            });
          }
        });
      }
      var updateChoropleth = function _updateChoropleth(evt) {
        var regionData = scope.regionData;
        var choroplethTopic = scope.choroplethTopic;
        if (_.isObject(choroplethTopic) && scope.choroplethVisible) {
          var buckets = generateBuckets(
            _.map(
              _.values(regionData),
              _.property(choroplethTopic.name)));
          var colorer = colorerForBuckets("cb-YlOrRd", buckets);
          var regionColor = function(region) {
            try {
              return colorer(regionData[region.code][choroplethTopic.name]);
            } catch (e) {
              return null;
            }
          };
          scope.$emit('legend:set',
            'regions', 'right', getLegend(buckets, colorer));
          scope.styles = _.defaults({
            regions: function(region) {
              return _.defaults({
                fillColor: regionColor(region)
              }, defaultStyles['regions'](region));
            }
          }, scope.styles);
        } else {
          scope.$emit('legend:clear', 'regions');
          scope.styles = _.defaults({
            regions: null
          }, scope.styles);
        }
      };
      var updateBubbles = function _updateBubbles(evt) {
        var regionData = scope.regionData;
        var bubblesTopic = scope.bubblesTopic;
        if (_.isObject(bubblesTopic) && scope.bubblesVisible) {
          var buckets = generateBuckets(
            _.map(
              _.values(regionData),
              _.property(bubblesTopic.name)));
          var colorer = colorerForBuckets("cb-Blues", buckets);
          var regionColor = function(region) {
            try {
              return colorer(regionData[region.code][bubblesTopic.name]);
            } catch (e) {
              return null;
            }
          };
          scope.styles = _.defaults({
            points: function(region) {
              return _.defaults({
                fill: true,
                fillColor: regionColor(region),
                fillOpacity: 1,
                opacity: 1
              }, defaultStyles['points'](region));
            }
          }, scope.styles);
          scope.$emit('legend:set',
            'points', 'left', getLegend(buckets, colorer));
        } else {
          scope.styles = _.defaults({
            points: null
          }, scope.styles);
          scope.$emit('legend:clear', 'points');
        }
      };
      var redraw = _.debounce(function() {
        refreshData()
          .then(updateChoropleth)
          .then(updateBubbles)
          .then(redrawVectorGrid);
      }, 50);
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
      var colors = palette(colorPaletteName, buckets.length);
      return function(v) {
        var i = _.findIndex(buckets, function(bucket) {
          return bucket.contains(v);
        });
        return i == -1 ? null : '#' + colors[i];
      };
    }

    function getLegend(buckets, colorer) {
      var div = L.DomUtil.create('div', 'legend');
      var ul = L.DomUtil.create('ul', '', div);
      buckets.forEach(function(bucket) {
        var li = L.DomUtil.create('li', '', ul);
        var bullet = L.DomUtil.create('div', 'bullet', li);
        angular.element(bullet).css("background", colorer(bucket.min));
        var text = L.DomUtil.create('span', '', li);
        text.innerHTML = _.map(
          [bucket.min, bucket.max],
          dataService.formatNumber
        ).join(" - ");
      });
      return div;
    }

    function postLink(scope, element, attrs) {
      setupEvents(scope);
      setupHooks(scope);

      var map = L.map(mapId, {
        center: [-27, 134],
        zoom: 4
      });

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
      scope.$on('vector-grid:mouseover', function(e, region, data) {
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
              dd.innerHTML=dataService.formatNumber(data[topic.name]);
            })
          }
          return div;
        };
        if (featureControl) {
          featureControl.remove();
        }
        featureControl = newFeatureControl;
        featureControl.addTo(map);
      });

      scope.$on('vector-grid:click', _.debounce(function(e, region) {
        var vm = $rootScope.$$childTail.vm;
        var regionType = region.type;
        var regionCodeAttribute = regionType+'_code';
        var attributes = vm.vis.topics;
        var attrNames = _.map(vm.vis.topics, _.property('name'));

        dataService.getAttributesForRegions(regionType, attrNames, [{
          'code': region.code
        }]).then(function(data) {
          console.log(data);
          var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'details.html',
            controller: 'DetailsModalInstanceCtrl',
            resolve: {
              context: {
                heading: regionHeadingTmpl(region),
                attributes: attributes,
                getValue: _.propertyOf(
                    _.first(_.values(data)))
              }
            }
          });
        });
      }, 100));

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

      scope.$emit('region-type:change', scope.regionType);
    }

  });
