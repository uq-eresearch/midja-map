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
            remotenessLevel: 'all',
            locations: [],
            ilocs: [],
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


        // select a place
        // load ilocs for selected places
        // load the ilocs
        // generate visualisations

        //
        function activate() {
            getColumns({
                name: 'iloc_merged_dataset'
            }).then(function (columns) {
                vm.columns = columns;
            });

            var sql = 'SELECT DISTINCT ra_name FROM iloc_merged_dataset;';
            dataService.doQuery(sql).then(function(result) {
               vm.remotenessLevels = result.rows;
            });
        }

        function isDataSelected() {
            return vm.vis.topics.length && vm.vis.locations.length;
        }


        function getColumns(dataset) {
            return datasetService.getColumns(dataset);
        }

        function selectedLocationsChanged() {

            console.log('changed!');
            var sql = 'SELECT DISTINCT iloc_name FROM iloc_merged_dataset ' +
                'WHERE ' + vm.vis.locations[0].type + '_name = \'' + vm.vis.locations[0].name + '\' ';

            if(vm.vis.locations[1]) {
                sql += ' OR ' + vm.vis.locations[1].type + '_name = \'' + vm.vis.locations[1].name + '\' ';
            }
            if(vm.vis.remotenessLevel && vm.vis.remotenessLevel !== 'all') {
                sql += ' AND ra_name = \'' + vm.vis.remotenessLevel + '\'';
            }

            sql += ';';

            dataService.doQuery(sql).then(function(results) {
                vm.vis.ilocs = results.rows;
                generateVisualisations();
            });
        }

        function generateVisualisations() {
            if(!vm.vis.ilocs.length) {
                vm.chartData = [];
                vm.tableData = [];
                return;
            }
            if(vm.vis.topics.length) {
                generateBarChart();
            }
            if (vm.vis.bubble.topic) {
                generateBubbleLayer(vm.vis.bubble.topic, vm.vis.ilocs);
            }
            if (vm.vis.choropleth.topic) {
                generateChoroplethLayer(vm.vis.choropleth.topic, vm.vis.ilocs);
            }

        }
        function selectedTopicsChanged($item, $model) {
            generateBarChart();
            if(vm.vis.topics.length === 1) {
                var topic = vm.vis.topics[0];
                // set the default for the map
                vm.vis.bubble.topic = topic;
                vm.vis.choropleth.topic = topic;

                generateBubbleLayer(vm.vis.bubble.topic, vm.vis.ilocs);
                generateChoroplethLayer(vm.vis.choropleth.topic, vm.vis.ilocs);
            }
        }

        function generateBarChart() {
            var topicsList = _.pluck(vm.vis.topics, 'name').join(',');
            var ilocNames = '\'' + _.pluck(vm.vis.ilocs, 'iloc_name').join('\' ,\'') + '\'';

            var sql = 'SELECT ' + topicsList + ' FROM iloc_merged_dataset WHERE iloc_name IN (' + ilocNames + ');';

            dataService.doQuery(sql).then(function (results) {
                if (!results.rows.length) {
                    return;
                }

                // get the columns
                var topics = _.keys(results.rows[0]);

                // build data table
                var data = [
                    ['Topic'].concat(_.pluck(vm.vis.ilocs, 'iloc_name'))
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
            generateBubbleLayer($item, vm.vis.ilocs);
        }

        function selectedRegionTopicChanged($item, $model) {
            generateChoroplethLayer($item, vm.vis.ilocs);
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