'use strict';

/**
 * @ngdoc directive
 * @name midjaApp.directive:cartodbMap
 * @description
 * # cartodbMap
 */
angular.module('midjaApp')
  .directive('cartodbMap', function(cartodb, L, $http, $rootScope, dataService,
    labelService, mapService, $uibModal) {
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

      var map = null;
      var regionLayers = null;

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
            bottom: {
              "sql": 'SELECT * FROM ste_2011_aust',
              "cartocss": '#ste_2011_aust{ polygon-fill: #EEEEEE; polygon-opacity: 0.7; line-color: #67717E; line-width: 1; line-opacity: 1; }',
              "interactivity": ["state_name"]
            }
          };

          this._hasVisibleTopLayer = {
            top: false,
            bottom: true
          }

          this._leafletLayers = {
            tiles: null,
            utfGrid: null
          };

          this._updateLayers = function() {
            function layers() {
              var layers = [];
              var cartoCssVersion = "2.1.0";
              layers.push({
                "type": "mapnik",
                "options": angular.extend({
                  "cartocss_version": cartoCssVersion
                }, self._definitions.bottom)
              });
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
                  $rootScope.$emit('featureOver', e.data);
                });
                map.addLayer(utfGrid);
              }
            }, function errorCreatingLayerGroup(response) {
              console.log(response);
            })
          }

          this.setTopLayer = function RegionLayers$setTopLayer(defn) {
            self._definitions.top = defn;
            self._updateLayers();
          };

          this.setTopLayerVisibility =
            function RegionLayers$setTopLayerVisibility(isVisible) {
              self._hasVisibleTopLayer = isVisible;
              self._updateLayers();
            }

          this.setBottomLayer = function RegionLayers$setBottomLayer(defn) {
            self._definitions.bottom = defn;
            self._updateLayers();
          };

          // Init
          this._updateLayers();
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
        scope.$apply(function() {
          if (!$rootScope.feature || $rootScope.feature[0].level_name !=
            mapService.transformFeatureData(data).level_name) {
            var mouseOverFeature = [mapService.transformFeatureData(
              data)];
            var newData = {}
            console.log($rootScope)
            var vm = $rootScope.$$childTail.vm;
            if (vm.vis.choropleth.topic.name != vm.vis.bubble.topic
              .name) {

              if (mouseOverFeature[0].column != vm.vis.bubble.topic
                .name && vm.vis.bubble.topic.name) {
                // pleth
                $rootScope.feature = mouseOverFeature;
                newData.level_name = mouseOverFeature[0].level_name;
                newData.label = labelService.getLabelFromLocalMapping(
                  vm.vis.bubble.topic.name);

                var topicShort = _.findWhere(vm.vis.topics, {
                  'name': vm.vis.bubble.topic.name
                })['short_desc']
                var fullTopic = topicShort + ' (' + vm.vis.bubble.topic
                  .name + ')'
                var placeIndex = _.indexOf(vm.tableData[0], newData
                  .level_name);
                var topicIndex = _.findIndex(vm.tableData, function(
                  row) {
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
                newData.label = labelService.getLabelFromLocalMapping(
                  vm.vis.choropleth.topic.name);

                var topicShort = _.findWhere(vm.vis.topics, {
                  'name': vm.vis.choropleth.topic.name
                })['short_desc']
                var fullTopic = topicShort + ' (' + vm.vis.choropleth
                  .topic.name + ')'
                var placeIndex = _.indexOf(vm.tableData[0], newData
                  .level_name);
                var topicIndex = _.findIndex(vm.tableData, function(
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
              $rootScope.feature = [mapService.transformFeatureData(
                data)];
              $rootScope.feature2 = null;
            }
          }

        });
      });

      $rootScope.$on('featureClick', function(e, data) {
        scope.$apply(function() {
          //$rootScope.test = $rootScope.test || [];
          //$rootScope.test.unshift(mapService.transformFeatureData(data));
          if ($rootScope.placeDetails == null) {
            $rootScope.placeDetails = 1;
            var vm = $rootScope.$$childTail.vm;
            if (vm.tablePrefix == 'iloc') {
              var sql =
                "SELECT iloc_name, total_loan, num_apps FROM iloc_merged_dataset WHERE iloc_name='" +
                data.iloc_name + "';";
            } else if (vm.tablePrefix == 'lga') {
              var sql =
                "SELECT lga_name, ra_name, piho, f_time, iba_a_loan, iba_n_loan, ave_h_s, n_indig_h, own_home, indigenous, median_inc, median_mor, afford FROM lga_565_iba_final WHERE lga_name='" +
                data.lga_name + "';";
            }
            dataService.doQuery(sql).then(function(result) {
              var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'details.html',
                controller: 'DetailsModalInstanceCtrl',
                resolve: {
                  vm: function() {
                    return $rootScope;
                  },
                  stats: function() {
                    return result;
                  }
                }
              });

              modalInstance.result.then(function() {
                $rootScope.placeDetails = null;
              }, function() {
                $rootScope.placeDetails = null;
              });
            });
          }
        });
      });
    }
  });
