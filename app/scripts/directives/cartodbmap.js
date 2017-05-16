'use strict';

/**
 * @ngdoc directive
 * @name midjaApp.directive:cartodbMap
 * @description
 * # cartodbMap
 */
angular.module('midjaApp')
  .directive('cartodbMap', function(L, $http, $rootScope, $q, dataService,
    labelService, mapService, $uibModal) {

    var map = null;
    var regionLayers = null;

    return {
      template: '<div id="map" style="min-height: 300px; height:100%; width:100%"></div>',
      restrict: 'E',
      scope: {
        'top': '=',
        'bottom': '=',
        'topvisible': '=',
        'bottomvisible': '=',
        'map': '='
      },
      replace: true,
      link: postLink
    };

    function postLink(scope, element, attrs) {

      activate();
      // export the map reference back
      scope.map = map;

      ////

      function activate() {
        setupMap();
        scope.$watch('top', setTopLayer);
        scope.$watch('bottom', setBottomLayer);
        scope.$watch('topvisible', setTopLayerVisible);
        scope.$watch('bottomvisible', setBottomLayerVisible);
      }

      function setupMap() {
        map = L.map('map', {
          center: [-27, 134],
          zoom: 4
        });

        // add a nice baselayer from Stamen
        L.tileLayer(
          'https://maps.nlp.nokia.com/maptiler/v2/maptile/newest/normal.day/{z}/{x}/{y}/' +
          '256/png8?lg=eng&token=A7tBPacePg9Mj_zghvKt9Q&app_id=KuYppsdXZznpffJsKT24', {
            attribution: 'Stamen'
          }).addTo(map);

        function RegionLayers(map) {
          var self = this;
          var windshaftBaseUrl = "/windshaft/";

          this._definitions = {
            top: null,
            bottom: null
          };

          this._hasVisibleTopLayer = {
            top: false,
            bottom: true
          }

          this._leafletLayers = {
            tiles: null,
            utfGrid: null,
            legend: null
          };

          this._updateLayers = function() {
            function layers() {
              var layers = [];
              var cartoCssVersion = "2.1.0";
              if (self._definitions.bottom) {
                layers.push({
                  "type": "mapnik",
                  "options": angular.extend({
                    "cartocss_version": cartoCssVersion
                  }, self._definitions.bottom)
                });
              }
              if (self._definitions.top && self._hasVisibleTopLayer) {
                layers.push({
                  "type": "mapnik",
                  "options": angular.extend({
                    "cartocss_version": cartoCssVersion
                  }, self._definitions.top)
                });
              }
              return layers;
            }

            if (_.isEmpty(layers())) return;

            $http({
              method: 'POST',
              url: windshaftBaseUrl,
              data: {
                "version": "1.5.0",
                "layers": layers()
              }
            }).then(function successfullyCreatedLayerGroup(response) {
              var token = response.data.layergroupid;
              var tileLayerUrl = windshaftBaseUrl + token +
                '/{z}/{x}/{y}.png';
              var utfGridUrl = windshaftBaseUrl + token +
                '/0/{z}/{x}/{y}.grid.json';
              if (self._leafletLayers.tiles) {
                self._leafletLayers.tiles.setUrl(tileLayerUrl);
              } else {
                var tiles = L.tileLayer(tileLayerUrl);
                self._leafletLayers.tiles = tiles;
                tiles.on('tileerror', function() {
                  // Handle definition expiry semi-gracefully
                  self._updateLayers();
                });
                map.addLayer(tiles);
              }
              if (self._leafletLayers.utfGrid) {
                self._leafletLayers.utfGrid.setUrl(utfGridUrl);
              } else {
                var utfGrid = new L.UtfGrid(utfGridUrl, {
                  useJsonP: false
                });
                self._leafletLayers.utfGrid = utfGrid;
                utfGrid.on('click', function utfGridClick(e) {
                  $rootScope.$emit('featureClick', e.data);
                });
                utfGrid.on('mouseover', function utfGridMouseOver(e) {
                  var defs = _.filter(
                    _.values(self._definitions),
                    _.isObject);
                  var dataSources = [_.identity].concat(
                    _.filter(
                      _.map(defs, _.property('getRegionData'))),
                    _.isFunction);
                  var data = _(dataSources)
                    .map(function(ds) {
                      return ds(e.data);
                    })
                    .reduce(_.defaults, {});
                  $rootScope.$emit('featureOver', data);
                });
                map.addLayer(utfGrid);
              }
              if (self._leafletLayers.legend) {
                self._leafletLayers.legend.removeFrom(map);
              }
              if (self._definitions.bottom.getLegend) {
                var legend = L.control({
                  position: 'bottomright'
                });
                legend.onAdd = function(map) {
                  return self._definitions.bottom.getLegend();
                };
                self._leafletLayers.legend = legend;
                map.addControl(legend);
              }
            }, function errorCreatingLayerGroup(response) {
              console.log(response);
            })
          }

          this.setTopLayer = function RegionLayers$setTopLayer(defn) {
            if (!self._isValidDefn(defn)) return;
            self._definitions.top = defn;
            self._updateLayers();
          };

          this.setTopLayerVisibility =
            function RegionLayers$setTopLayerVisibility(isVisible) {
              self._hasVisibleTopLayer = isVisible;
              self._updateLayers();
            }

          this.setBottomLayer = function RegionLayers$setBottomLayer(defn) {
            if (!self._isValidDefn(defn)) return;
            self._definitions.bottom = defn;
            self._updateLayers();
          };

          this._isValidDefn = function RegionLayers$_isValidDefn(defn) {
            try {
              var reqAttrs = ["sql", "cartocss", "interactivity"];
              for (var i = 0; i < reqAttrs.length; i++) {
                var attr = reqAttrs[i];
                if (!defn[attr]) {
                  console.log(JSON.stringify(defn) + " is missing " + attr);
                  return false;
                }
              }
              return true;
            } catch (err) {
              console.log(err.message);
              return false;
            }
          }
        }

        regionLayers = new RegionLayers(map);
        console.log(regionLayers);
      }

      function setTopLayer(layerDefinition) {
        regionLayers.setTopLayer(layerDefinition);
      }

      function setBottomLayer(layerDefinition) {
        regionLayers.setBottomLayer(layerDefinition);
      }

      function setTopLayerVisible(visibility) {
        regionLayers.setTopLayerVisibility(visibility);
      }

      function setBottomLayerVisible(visibility) {
        // do nothing; choropleth layer is always visible
      }

      $rootScope.$on('featureOver', function(e, data) {
        var vm = $rootScope.$$childTail.vm;
        var regionType = vm.tablePrefix;
        labelService.getResolver(regionType).then(function(getLabel) {
          var transform = mapService.getFeatureTransformer(getLabel);
          if (!$rootScope.feature || $rootScope.feature[0].level_name !=
            transform(data).level_name) {
            var mouseOverFeature = [transform(data)];
            var newData = {};
            if (!vm.vis.choropleth.topic) {
              $rootScope.feature = mouseOverFeature;
            } else if (vm.vis.choropleth.topic.name != vm.vis.bubble.topic
              .name) {

              if (mouseOverFeature[0].column != vm.vis.bubble.topic
                .name && vm.vis.bubble.topic.name) {
                // pleth
                $rootScope.feature = mouseOverFeature;
                newData.level_name = mouseOverFeature[0].level_name;
                newData.label = getLabel(vm.vis.bubble.topic.name);

                var topicShort = _.findWhere(vm.vis.topics, {
                  'name': vm.vis.bubble.topic.name
                })['description']
                var fullTopic = topicShort +
                  ' (' + vm.vis.bubble.topic.name + ')';
                var placeIndex = _.indexOf(vm.tableData[0],
                  newData
                  .level_name);
                var topicIndex = _.findIndex(vm.tableData,
                  function(row) {
                    return row[0] == fullTopic;
                  });
                if (!$rootScope.feature2 || ($rootScope.feature2 &&
                    newData.level_name != $rootScope.feature2.level_name
                  )) {
                  $rootScope.feature2 = "temp";
                  newData.value = vm.tableData[topicIndex][
                    placeIndex
                  ];
                  $rootScope.feature2 = [newData];
                }
              } else if (mouseOverFeature[0].column != vm.vis.choropleth
                .topic.name) {
                // bubble
                $rootScope.feature2 = mouseOverFeature;
                newData.level_name = mouseOverFeature[0].level_name;
                newData.label = getLabel(vm.vis.choropleth.topic.name);

                var topicShort = _.findWhere(vm.vis.topics, {
                  'name': vm.vis.choropleth.topic.name
                })['description']
                var fullTopic = topicShort + ' (' + vm.vis.choropleth
                  .topic.name + ')'
                var placeIndex = _.indexOf(vm.tableData[0],
                  newData
                  .level_name);
                var topicIndex = _.findIndex(vm.tableData,
                  function(
                    row) {
                    return row[0] == fullTopic;
                  });

                if (!$rootScope.feature || ($rootScope.feature &&
                    newData.level_name != $rootScope.feature.level_name
                  )) {
                  $rootScope.feature = "temp";
                  newData.value = vm.tableData[topicIndex][
                    placeIndex
                  ];
                  $rootScope.feature = [newData];
                }
              }
            } else {
              $rootScope.feature = [transform(
                data)];
              $rootScope.feature2 = null;
            }
          }
        });
      });

      $rootScope.$on('featureClick', function(e, data) {
        var vm = $rootScope.$$childTail.vm;
        var regionType = vm.tablePrefix;
        var regionCodeAttribute = regionType+'_code';
        var attrNames = ['region_name'].concat(
          _.map(vm.vis.topics, _.property('name')));
        var regionCode = data[regionCodeAttribute];

        $q.all({
          data: dataService.getAttributesForRegions(regionType, attrNames, [{
            'code': regionCode
          }]),
          getLabel: labelService.getResolver(regionType)
        }).then(function(context) {
          var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'details.html',
            controller: 'DetailsModalInstanceCtrl',
            resolve: {
              context: {
                attributes: ['region_code'].concat(attrNames),
                getLabel: context.getLabel,
                getValue: _.propertyOf(
                  _.defaults(
                    _.first(_.values(context.data)),
                    { 'region_code': regionCode }))
              }
            }
          });
        });
      });
    }
  });
