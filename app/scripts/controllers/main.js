'use strict';

/**
 * @ngdoc function
 * @name midjaApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the midjaApp
 */
angular.module('midjaApp')
    .controller('MainCtrl', function (datasetService, layerService, dataService, labelService, $http) {

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
        vm.linearRegression = {
            dependent: null,
            independents: []
        }
        vm.locations = [];
        vm.columns = [];

        //vm.selectedRegionTableChanged = selectedRegionTableChanged;
        //vm.selectedRegionColumnChanged = selectedRegionColumnChanged;
        //
        //vm.selectedBubbleTableChanged = selectedBubbleTableChanged;
        //vm.selectedBubbleColumnChanged = selectedBubbleColumnChanged;
        vm.selectedLocationsChanged = selectedPlacesChanged;
        vm.selectedTopicsChanged = selectedTopicsChanged;
        vm.selectedBubbleTopicChanged = selectedBubbleTopicChanged;
        vm.selectedRegionTopicChanged = selectedRegionTopicChanged;
        vm.selectedDependentChanged = selectedDependentChanged;
        vm.selectedIndependentsChanged = selectedIndependentsChanged;
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
            dataService.doQuery(sql).then(function (result) {
                vm.remotenessLevels = result.rows;
            });
        }

        function isDataSelected() {
            return vm.vis.topics.length && vm.vis.locations.length;
        }


        function getColumns(dataset) {
            return datasetService.getColumns(dataset);
        }

        /**
         * The user changed the places they selected
         */
        function selectedPlacesChanged() {
            // angular sets vm.vis.locations[1] to undefined when the
            // corresponding ui-select is cleared
            if(vm.vis.locations.length == 2 && !vm.vis.locations[1]) {
                vm.vis.locations.pop();
            }

            var places = getSelectedPlaceExcludingAustralia();
            dataService.getIlocsInPlaces(places, vm.vis.remotenessLevel).then(function (results) {
                var ilocs = results.rows;
                if (!ilocs.length) {
                    window.alert('No ILOCs found.');
                }
                vm.vis.ilocs = ilocs;
                generateVisualisations();
            });
        }

        /**
         * Get the places the user has selected
         *
         * Filter out australia, because its just EVERYTHING, so we don't
         * really need it.
         *
         * @returns {*} List of places selected
         */
        function getSelectedPlaceExcludingAustralia() {
            var places = _.reject(vm.vis.locations, function (location) {
                return location.type === 'country';
            });
            return places;
        }

        function generateVisualisations() {
            if (!vm.vis.ilocs.length) {
                vm.chartData = [];
                vm.tableData = [];
                return;
            }
            if (vm.vis.topics.length) {
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
            if (vm.vis.topics.length === 1) {
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
            var ilocCodes = _.pluck(vm.vis.ilocs, 'iloc_code');

            var sql = 'SELECT ' + topicsList + ' FROM iloc_merged_dataset WHERE iloc_code IN (\'' + ilocCodes.join('\' ,\'') + '\');';

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
                locations.unshift({
                    name: 'Australia',
                    type: 'country'
                })
                vm.locations = locations;
            });
        }


        function selectedDependentChanged($item, $model) {
            generateLinearRegression();
        }

        function selectedIndependentsChanged($item, $model) {
            generateLinearRegression();
        }

        function generateLinearRegression() {
            if (!vm.linearRegression.dependent || !vm.linearRegression.independents.length) {
                return;
            }

            var data = {
                "dataset": "iloc_merged_dataset",
                "depVar": vm.linearRegression.dependent.name,
                "indepVars": _.pluck(vm.linearRegression.independents, 'name')
            };
            $http.post('http://midja.org:4000', data).then(function (response) {
                vm.linearRegression.results = response.data;
            });

            //    if()
            //    ng-model="vm.linearRegression.dependent"
            //    ng-disabled="disabled"
            //    reset-search-input="true"
            //    style="width: 100%;"
            //    on-select="vm.selectedDependentChanged($item, $model)">
            //    <ui-select-match placeholder="Select dependent variable">
            //    <span class="text-capitalize">{{$select.selected.label }}</span>
            //</ui-select-match>
            //<ui-select-choices
            //repeat="column in vm.vis.topics | propsFilter: {name: $select.search}">
            //<div ng-bind-html="column.label | highlight: $select.search"></div>
            //</ui-select-choices>
            //</ui-select>
            //
            //</div>
            //
            //<div class="form-group">
            //<label>
            //Choose independent variables
            //<small class="text-muted">Optional</small>
            //</label>
            //<ui-select theme="bootstrap"
            //ng-model="vm.linearRegression.independents"

        }
    });
