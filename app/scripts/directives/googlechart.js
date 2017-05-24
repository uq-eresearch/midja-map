'use strict';

/**
 * @ngdoc directive
 * @name midjaApp.directive:googlechart
 * @description
 * # googlechart
 */
angular.module('midjaApp')
  .directive('googlechart', function(dataService) {
    return {
      template: '<div style="height:{{ minHeight }}px;"></div>',
      restrict: 'E',
      link: link,
      replace: true,
      scope: {
        data: '=',
        chartobj: '='
      }
    };

    function link(scope, element, attrs) {

      var minHeight = 500;

      // export a chartobj back for triggers
      scope.chartobj = {};

      activate();

      scope.chartobj.redraw = redraw;

      function activate() {
        scope.minHeight = minHeight;
        scope.$watch('data', drawStuff);
      }

      var options = {
        legend: {
          position: "none"
        },
        bars: 'horizontal'
      };

      function drawStuff(data) {

        if (!data) {
          return;
        }
        if (!data.length) {
          return;
        }
        if (!scope.data) {
          element.html('');
          return;
        }

        var chart = new google.charts.Bar(element[0]);
        chart.draw(new google.visualization.arrayToDataTable(data), options);

        scope.chartobj.chart = chart;
      }

      function redraw() {
        scope.chartobj.chart.draw(new google.visualization.arrayToDataTable(
          scope.data), options);
      }

    }
  });
