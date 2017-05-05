'use strict';

/**
 * @ngdoc directive
 * @name midjaApp.directive:googlechart
 * @description
 * # googlechart
 */
angular.module('midjaApp')
  .directive('googlechart', function(dataService, labelService) {
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
      ////

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

        //scope.minHeight = Math.max(minHeight, data.length * 40 + data[0].length * 10);

        console.log(scope.minHeight);
        if (!scope.data) {
          element.html('');
          return;
        }

        /*
        var options = {
            //width: 300,
            legend: { position: "none" },
            chart: {
                //title: 'Demographics of Indigenous Females in Mount Isa and Logan',
                //subtitle: 'Testing out Google Charts'
            },
            bars: 'horizontal' // Required for Material Bar Charts.
            //series: {
            //    0: {axis: 'mountisa'}, // Bind series 0 to an axis named 'distance'.
            //    1: {axis: 'logan'} // Bind series 1 to an axis named 'brightness'.
            //},
            //axes: {
            //    x: {
            //        mountisa: {label: 'Mount Isa'}, // Bottom x-axis.
            //        logan: {label: 'Logan'} // Top x-axis.
            //    }
            //}
        };
        */

        var chart = new google.charts.Bar(element[0]);
        chart.draw(new google.visualization.arrayToDataTable(data), options);

        scope.chartobj.chart = chart;
      }

      function redraw() {
        scope.chartobj.chart.draw(new google.visualization.arrayToDataTable(
          scope.data), options);
      }


      //element.html('this is a test');
      //
      //
      //console.log('google', google);
      //
      //drawStuff();
      //
      //function drawStuff() {
      //
      //    dataService.doQuery('SELECT avg_household_size_tot, a_0_4_indig_f, a_0_4_indig_m, a_0_4_nonind_m, a_0_4_nonind_f, a_0_4_totm, a_0_4_totf FROM iloc_merged_dataset WHERE iloc_code = \'ILOC30400402\' OR iloc_code = \'ILOC30100903\';').then(function(results) {
      //
      //        if(!results.rows.length) {
      //            return;
      //        }
      //
      //        // get the columns
      //        var topics = _.keys(results.rows[0]);
      //
      //        // build data table
      //        var dataTable = [
      //            ['Topic', 'Mount Isa', 'Logan']
      //        ];
      //
      //        _.forEach(topics, function(topic) {
      //            var data = [labelService.getLabelFromCartoDbName(topic)];
      //            _.forEach(results.rows, function(row) {
      //                 data.push(row[topic]);
      //            });
      //            dataTable.push(data);
      //        });
      //
      //
      //        var options = {
      //            width: 900,
      //            chart: {
      //                title: 'Demographics of Indigenous Females in Mount Isa and Logan',
      //                subtitle: 'Testing out Google Charts'
      //            },
      //            bars: 'horizontal', // Required for Material Bar Charts.
      //            //series: {
      //            //    0: {axis: 'mountisa'}, // Bind series 0 to an axis named 'distance'.
      //            //    1: {axis: 'logan'} // Bind series 1 to an axis named 'brightness'.
      //            //},
      //            //axes: {
      //            //    x: {
      //            //        mountisa: {label: 'Mount Isa'}, // Bottom x-axis.
      //            //        logan: {label: 'Logan'} // Top x-axis.
      //            //    }
      //            //}
      //        };
      //
      //        var chart = new google.charts.Bar(element[0]);
      //        chart.draw(new google.visualization.arrayToDataTable(dataTable), options);
      //
      //    });
      //
      //    // iloc_code  ILOC30400402
      //    // ILOC30100903
      //
      //
      //
      //    //var data = new google.visualization.arrayToDataTable([
      //    //    ['Topic', 'Mount Isa', 'Logan'],
      //    //    ['Age 0-4 Indig. Female', 8000, 23.3],
      //    //    ['Age 5-9 Indig. Female', 24000, 4.5],
      //    //    ['Age 10-14 Indig. Female', 30000, 14.3],
      //    //    ['Age 15-24 Indig. Female', 50000, 0.9],
      //    //    ['Age 25-34 Indig. Female', 60000, 13.1]
      //    //]);
      //
      //
      //
      //}

    }
  });
