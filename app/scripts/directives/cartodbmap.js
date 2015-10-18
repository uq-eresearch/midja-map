'use strict';

/**
 * @ngdoc directive
 * @name midjaApp.directive:cartodbMap
 * @description
 * # cartodbMap
 */
angular.module('midjaApp')
    .directive('cartodbMap', function (cartodb, L, $rootScope, labelService, mapService) {
        return {
            template: '<div id="map" style="min-height: 300px; height:100%; width:100%"></div>',
            restrict: 'E',
            scope: {
                'top': '=',
                'bottom': '=',
                'topvisible': '=',
                'bottomvisible': '='
            },
            replace: true,
            link: postLink
        };

        function postLink(scope, element, attrs) {

            var layer = null;
            var map = null;
            var subLayers = [{}];

            activate();

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
                    //zoomControl: true,
                    center: [-27, 134],
                    zoom: 4
                    //legends: true,
                    //fullscreen: true,
                    //infowindow: true
                });

                //L.tileLayer('https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png', {
                //    attribution: 'Mapbox <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>'
                //}).addTo(map);

                //var layerUrl = 'http://midja.portal.midja.org/api/v2/viz/b7711414-2111-11e4-96b7-fa163e6cce2e/viz.json';


                // add a nice baselayer from Stamen
                L.tileLayer('https://maps.nlp.nokia.com/maptiler/v2/maptile/newest/normal.day/{z}/{x}/{y}/' +
                '256/png8?lg=eng&token=A7tBPacePg9Mj_zghvKt9Q&app_id=KuYppsdXZznpffJsKT24', {
                    attribution: 'Stamen'
                }).addTo(map);


                //cartodb.createLayer(map, layerUrl)
                //    .addTo(map)
                //    .on('done', function(cartoLayer) {
                //        //layer.getSubLayer(0).set(subLayerOptions);
                //        layer = cartoLayer;
                //    }).on('error', function() {
                //        //log the error
                //    });

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
                        cartocss: '#ste_2011_aust{ polygon-fill: #EEEEEE; polygon-opacity: 0.7; line-color: #67717E;' +
                        'line-width: 2; line-opacity: 1; }'
                    }]
                }).addTo(map)


                    .done(function (mapLayer) {
                        layer = mapLayer;

                        console.log(cdb.vis);


                        //var sublayer = layer.getSubLayer(0);
                        ////sublayer.set(subLayerOptions);
                        //
                        //console.log(sublayer);
                        //
                        //var template = $('#infowindow_template').html();
                        //console.log(template);
                        //
                        //sublayer.infowindow.set('template', $('#infowindow_template').html());
                        //
                        //sublayer.on('featureClick', function(e, latlng, pos, data) {
                        //    alert("Hey! You clicked " + data.cartodb_id);
                        //});

                        //console.log(mapLayer);
                        //
                        //layer.setInteraction(true);
                        //
                        //// get sublayer 0 and set the infowindow template
                        //var sublayer = layer[0].getSubLayer(0);
                        //
                        //sublayer.setInteraction(true);
                        //
                        //sublayer.on('featureOver', function(e, latlng, pos, data, layerNumber) {
                        //    console.log(e, latlng, pos, data, layerNumber);
                        //});
                        //
                        //
                        //sublayer.infowindow.set({
                        //    template: 'hello world',
                        //    width: 218,
                        //    maxHeight: 100
                        //});
                        //console.log(sublayer);
                    });
            }

            function setTopLayer(layerDefinition) {
                setLayer(layerDefinition, 1);
                if(layer && !scope.topvisible) {
                    layer.getSubLayer(1).hide();
                }
            }

            function setBottomLayer(layerDefinition) {
                setLayer(layerDefinition, 0);
            }

            function setTopLayerVisible(visibility) {
                if(!layer || !layer.getSubLayer(1)) {
                    return;
                }

                if(visibility) {
                    layer.getSubLayer(1).show();
                } else {
                    layer.getSubLayer(1).hide();
                }
            }

            function setBottomLayerVisible(visibility) {
                // do nothing; choropleth layer is always visible
            }

            function setLayer(layerDefinition, position) {
                if (!layerDefinition) {
                    return;
                }
                //
                //setTimeout(function() {
                //    cdb.vis.Vis.addInfowindow(map,  layer.getSubLayer(position), ['cartodb_id']);
                //}, 5000);

                var subLayer = null;

                if (subLayers[position]) {
                    subLayers[position] = layer.getSubLayer(position).set(layerDefinition);
                    subLayer = subLayers[position];
                } else {
                    subLayer = layer.createSubLayer(layerDefinition);
                    subLayers[position] = subLayer;
                }

                subLayer.setInteraction(true);
                subLayer.on('featureOver', function (e, latlon, pos, data, subLayerIndex) {
                    scope.$apply(function () {
                        $rootScope.feature = [mapService.transformFeatureData(data)];
                    });
                });
                //subLayer.infowindow.set('template', $('#infowindow_template').html());

                subLayer.on('featureClick', function (e, latlng, pos, data) {
                    scope.$apply(function () {
                        console.log("clicked over");
                        $rootScope.test = $rootScope.test || [];
                        $rootScope.test.unshift(mapService.transformFeatureData(data));
                    });
                });

                //setTimeout(function() {
                //    console.log('panning map now');
                //    //map.panTo(new L.LatLng(-20.72587006334744, 120));
                //}, 3000);


                return subLayer;

            }
        }
    });
