'use strict';

/**
 * @ngdoc function
 * @name midjaApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the midjaApp
 */
angular.module('midjaApp')
    .controller('MainCtrl', function (datasetService, layerService, dataService, labelService) {

        var vm = this;

        vm.vis = {
            locations: [],
            topics: [],
            bubble: {
                topic: null
            },
            choropleth: {
                topic: null
            }
        };
        vm.locations = [];
        vm.columns = [];

        //vm.selectedRegionTableChanged = selectedRegionTableChanged;
        //vm.selectedRegionColumnChanged = selectedRegionColumnChanged;
        //
        //vm.selectedBubbleTableChanged = selectedBubbleTableChanged;
        //vm.selectedBubbleColumnChanged = selectedBubbleColumnChanged;
        vm.selectedLocationsChanged = selectedLocationsChanged;
        vm.selectedTopicsChanged = selectedTopicsChanged;
        vm.selectedBubbleTopicChanged = selectedBubbleTopicChanged;
        vm.selectedRegionTopicChanged = selectedRegionTopicChanged;
        vm.isDataSelected = isDataSelected;

        activate();


        vm.refreshLocations = refreshLocations;

        ////

        function activate() {
            getColumns({
                name: 'iloc_merged_dataset'
            }).then(function (columns) {
                vm.columns = columns;
            });
        }

        function isDataSelected() {
            return vm.vis.topics.length && vm.vis.locations.length;
        }


        function getColumns(dataset) {
            return datasetService.getColumns(dataset);
        }

        function selectedLocationsChanged($item, $model) {
            if(!vm.vis.locations.length) {
                return;
            }

            if (vm.vis.bubble.topic) {
                generateBubbleLayer(vm.vis.bubble.topic, vm.vis.locations);
            }
            if (vm.vis.choropleth.topic) {
                generateChoroplethLayer(vm.vis.choropleth.topic, vm.vis.locations);
            }
            if(vm.vis.topics.length) {
                generateBarChart();
            }
        }
        function selectedTopicsChanged($item, $model) {
            generateBarChart();
            if(vm.vis.topics.length === 1) {
                var topic = vm.vis.topics[0];
                // set the default for the map
                vm.vis.bubble.topic = topic;
                vm.vis.choropleth.topic = topic;

                generateBubbleLayer(vm.vis.bubble.topic, vm.vis.locations);
                generateChoroplethLayer(vm.vis.choropleth.topic, vm.vis.locations);
            }
        }

        function generateBarChart() {
            var topicsList = _.pluck(vm.vis.topics, 'name').join(',');
            var ilocNames = '\'' + _.pluck(vm.vis.locations, 'iloc_name').join('\' ,\'') + '\'';

            var sql = 'SELECT ' + topicsList + ' FROM iloc_merged_dataset WHERE iloc_name IN (' + ilocNames + ');';

            dataService.doQuery(sql).then(function (results) {
                if (!results.rows.length) {
                    return;
                }

                // get the columns
                var topics = _.keys(results.rows[0]);

                // build data table
                var data = [
                    ['Topic'].concat(_.pluck(vm.vis.locations, 'iloc_name'))
                ];

                _.forEach(topics, function (topic) {
                    var dataRow = [labelService.getLabelFromCartoDbName(topic)];
                    _.forEach(results.rows, function (row) {
                        dataRow.push(row[topic]);
                    });
                    data.push(dataRow);
                });
                vm.chartData = data;
                vm.tableData = data;
            });
        }



        function selectedBubbleTopicChanged($item, $model) {
            generateBubbleLayer($item, vm.vis.locations);
        }

        function selectedRegionTopicChanged($item, $model) {
            generateChoroplethLayer($item, vm.vis.locations);
        }


        function generateBubbleLayer(topic, locations) {
            var bubbleLayerService = layerService.build('bubble');
            bubbleLayerService.build({
                name: 'iloc_merged_dataset'
            }, topic, locations).then(function (layerDefinition) {
                vm.bubbleLayer = layerDefinition;
            });
        }

        function generateChoroplethLayer(topic, locations) {
            var bubbleLayerService = layerService.build('polygon');
            bubbleLayerService.build({
                name: 'iloc_merged_dataset'
            }, topic, locations).then(function (layerDefinition) {
                vm.regionLayer = layerDefinition;
            });
        }


        function refreshLocations(name) {
            if (!name || !name.length) {
                vm.locations = [];
                return;
            }
            dataService.getLocationsStartingWith(name).then(function (locations) {
                vm.locations = locations;
            });
        }


    });