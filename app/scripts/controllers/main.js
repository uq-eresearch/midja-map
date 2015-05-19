'use strict';

/**
 * @ngdoc function
 * @name midjaApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the midjaApp
 */
angular.module('midjaApp')
    .controller('MainCtrl', function (datasetService, layerService) {

        var vm = this;
        vm.tables = null;

        vm.accordion = {
            bubble: {
                isOpen: true
            },
            choropleth: {
                isOpen: false
            }
        };

        vm.selectedRegionTableChanged = selectedRegionTableChanged;
        vm.selectedRegionColumnChanged = selectedRegionColumnChanged;

        vm.selectedBubbleTableChanged = selectedBubbleTableChanged;
        vm.selectedBubbleColumnChanged = selectedBubbleColumnChanged;

        activate();

        ////

        function activate() {
            getTables();
        }


        function getTables() {
            return datasetService.getDatasets().then(function(data) {
                vm.tables = data;
                return vm.tables;
            });
        }

        function getColumns(dataset) {
            return datasetService.getColumns(dataset);
        }


        function selectedRegionTableChanged(table) {
            vm.regionColumns = null;
            getColumns(table).then(function(columns) {
                vm.regionColumns = columns;
            });
        }

        function selectedRegionColumnChanged(table, column) {
            layerService.generateLayerDefinition(table, column, 'polygon').then(function(layerDefinition) {
                vm.regionLayer = layerDefinition;
            });
        }

        function selectedBubbleTableChanged(table) {
            vm.bubbleColumns = null;
            getColumns(table).then(function(columns) {
                vm.bubbleColumns = columns;
            });
        }

        function selectedBubbleColumnChanged(table, column) {
            layerService.generateLayerDefinition(table, column, 'bubble').then(function(layerDefinition) {
                vm.bubbleLayer = layerDefinition;
            });
        }

    });