'use strict';

/**
 * @ngdoc directive
 * @name midjaApp.directive:cartodbMap
 * @description
 * # cartodbMap
 */
angular.module('midjaApp')
    .directive('cartodbMap', function (cartodb, L) {
        return {
            template: '<div id="map" style="height:700px; width:100%"></div>',
            restrict: 'E',
            scope: {
                'top': '=',
                'bottom': '='
            },
            link: function postLink(scope, element, attrs) {

                var layer = null;
                var subLayers = [{}];

                activate();

                ////

                function activate() {
                    setupMap();
                    scope.$watch('top', setTopLayer);
                    scope.$watch('bottom', setBottomLayer);
                }

                function setupMap() {
                    var map = L.map('map', {
                        zoomControl: false,
                        center: [-20.72587006334744, 139.492965],
                        zoom: 5
                    });

                    // add a nice baselayer from Stamen
                    L.tileLayer('https://maps.nlp.nokia.com/maptiler/v2/maptile/newest/normal.day/{z}/{x}/{y}/' +
                        '256/png8?lg=eng&token=A7tBPacePg9Mj_zghvKt9Q&app_id=KuYppsdXZznpffJsKT24', {
                        attribution: 'Stamen'
                    }).addTo(map);

                    cartodb.createLayer(map, {
                        user_name: 'midja',
                        tiler_protocol: 'http',
                        tiler_domain: 'portal.midja.org',
                        tiler_port: '8181',
                        extra_params: {
                            map_key: 'da4921d7f2b99244897b313a75f0bd977c775a5e'
                        },

                        type: 'cartodb',
                        sublayers: [{
                            sql: 'SELECT * FROM ste_2011_aust',
                            cartocss: '#ste_2011_aust{ polygon-fill: #FF6600; polygon-opacity: 0.7; line-color: #FFF;' +
                            'line-width: 1; line-opacity: 1; }'
                        }]
                    }).addTo(map).done(function (mapLayer) {
                        layer = mapLayer;
                    });
                }
                function setTopLayer(layerDefinition) {
                    setLayer(layerDefinition, 1);
                }
                function setBottomLayer(layerDefinition) {
                    setLayer(layerDefinition, 0);
                }
                function setLayer(layerDefinition, position) {
                    if(!layerDefinition) {
                        return;
                    }
                    if(subLayers[position]) {
                        subLayers[position] = layer.getSubLayer(position).set(layerDefinition);
                        return subLayers[position];
                    }
                    var subLayer = layer.createSubLayer(layerDefinition);
                    subLayers[position] = subLayer;
                    return subLayer;

                }
            }
        };
    });
