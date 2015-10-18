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

        vm.columnsFromMetadata = [];
        vm.columnsFromMetadataPropCols = [];

        vm.visStatus = {
            choroplethVisible: true,
            bubbleVisible: false
        };

        vm.scatterPlot = {
            xaxis: null,
            yaxis: null,
            useRemoteness: false
        };

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

        vm.showPropTopicsOnly = showPropTopicsOnly;

        vm.selectedScatterXChanged = selectedScatterXChanged;
        vm.selectedScatterYChanged = selectedScatterYChanged;
        vm.generateScatterPlot = generateScatterPlot;
        ////


        // select a place
        // load ilocs for selected places
        // load the ilocs
        // generate visualisations

        //
        function activate() {
            /*
            getColumns({
                name: 'iloc_merged_dataset'
            }).then(function (columns) {
                vm.columns = columns;
            });
            */

            var sql = 'SELECT DISTINCT ra_name FROM iloc_merged_dataset;';
            dataService.doQuery(sql).then(function (result) {
                vm.remotenessLevels = result.rows;
            });

            $http.get('http://midja.org:3232/datasets/iloc_merged_dataset?expanded').then(function(response) {
                vm.columnsFromMetadata = _.reject(response.data.attributes, function(column) {
                    return column.data_type !== 'number';
                });
                vm.columns = vm.columnsFromMetadata;

                var regex = /proportion|percentage/i;
                vm.columnsFromMetadataPropCols = _.filter(vm.columnsFromMetadata, function(column) {
                    return regex.test(column.short_desc);
                });
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
                    // revert back the removenessLevel in the UI when no ILOCs are found
                    vm.vis.remotenessLevel = vm.vis.currRemotenessLevel;
                    window.alert('No ILOCs found.');
                } else {
                    vm.vis.currRemotenessLevel = vm.vis.remotenessLevel;
                    vm.vis.ilocs = ilocs;
                    generateVisualisations();
                }
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

                vm.tableData = data;
                vm.chartData = data.slice();
                _.forEach(vm.vis.topics, function(topic) {
                    var dataRow = [];
                    _.forEach(results.rows, function(row) {
                        dataRow.push(row[topic.name]);
                    });
                    vm.tableData.push([topic.short_desc+' ('+topic.name+')'].concat(dataRow));
                    vm.chartData.push([topic.name].concat(dataRow));
                });
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


        function showPropTopicsOnly(isChecked) {
            if(isChecked) {
                vm.columns = vm.columnsFromMetadataPropCols;
            } else {
                vm.columns = vm.columnsFromMetadata;
            }
        }


        function selectedScatterXChanged() {
            generateScatterPlot();
        }

        function selectedScatterYChanged() {
            generateScatterPlot();
        }

        function generateScatterPlot() {
            if(!vm.scatterPlot.xaxis || !vm.scatterPlot.yaxis) {
                return;
            }

            var data = {
                "dataset": "iloc_merged_dataset",
                "xvar": vm.scatterPlot.xaxis.name,
                "xlabel": vm.scatterPlot.xaxis.short_desc,
                "yvar": vm.scatterPlot.yaxis.name,
                "ylabel": vm.scatterPlot.yaxis.short_desc,
                "useRemoteness": vm.scatterPlot.useRemoteness
            };
            console.log(data);

            $http.post('http://midja.org:4000/scatterplot', data).then(function(response) {
                vm.scatterPlot.results = response.data;
            });
        }
    });
