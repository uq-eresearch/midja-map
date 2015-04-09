'use strict';

/**
 * @ngdoc function
 * @name midjaApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the midjaApp
 */
angular.module('midjaApp')
    .controller('MainCtrl', function (dataService, mapService) {

        var vm = this;
        vm.tables = null;

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
            return dataService.getTables().then(function(data) {
                vm.tables = data;
                return vm.tables;
            });
        }

        function getColumns(table) {
            return dataService.getColumns(table);
        }


        function selectedRegionTableChanged(table) {
            vm.regionColumns = null;
            getColumns(table).then(function(columns) {
                vm.regionColumns = columns;
            });
        }

        function selectedRegionColumnChanged(table, column) {
            mapService.generateLayerDefinition(table, column, 'region').then(function(layerDefinition) {
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
            mapService.generateLayerDefinition(table, column, 'bubble').then(function(layerDefinition) {
                vm.bubbleLayer = layerDefinition;
            });
        }

    });