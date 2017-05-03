'use strict';

/**
 * @ngdoc function
 * @name midjaApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the midjaApp
 */
angular.module('midjaApp')
  .controller('MainCtrl', function(metadataService, layerService,
    dataService, labelService, $http, $scope, $uibModal, $timeout, $window) {
    var vm = this;
    vm.propTopicsOnly = false;
    vm.scatterOptions = {
      chart: {
        type: 'scatterChart',
        height: 450,
        width: 350,
        showLegend: false,
        color: d3.scale.category10().range(),
        scatter: {
          onlyCircles: true
        },
        legend: {
          updateState: false
        },
        duration: 350,
        margin: {
          right: 60
        }, // a bit hacky
        dispatch: {
          renderEnd: function(e) {
            if (vm.scatterPlot.labelLocations) {
              vm.showLabel("#scatterGraph", vm.scatterPlot.second);
            }
          }
        },
        useInteractiveGuideline: false,
        interactive: true,
        /*	tooltip:
{ position : function () {
                        return function (d) {
                            var html = "<h3>" + d.point.name + "</h3>";
                            html += "<p>x: " + d.point.x + ", y: " + d.point.y + "</p>"
                            return html;
                        }
                    }} ,*/
        zoom: {
          enabled: false
        }
      }
    };

    vm.regressionOptions = {
      chart: {
        type: 'scatterChart',
        height: 450,
        width: 350,
        showLegend: false,
        color: d3.scale.category10().range(),
        scatter: {
          onlyCircles: true
        },
        legend: {
          updateState: false
        },
        duration: 350,
        margin: {
          right: 60
        }, // a bit hacky
        useInteractiveGuideline: false,
        interactive: true,
        tooltip: {
          position: function() { //{"top": 200},
            //contentGenerator:
            return function(d) { //return html content
              var html = "<h3>" + d.point.name + "</h3>";
              html += "<p>x: " + d.point.x + ", y: " + d.point.y +
                "</p>"
              return html;
            }
          }
        },
        zoom: {
          enabled: false
        }
      }
    };

    vm.barRegressionOptions = {
      chart: {
        type: 'discreteBarChart',
        height: 450,
        margin: {
          right: 60
        },
        width: 350,
        x: function(d) {
          return d.label;
        },
        y: function(d) {
          return d.value + (1e-10);
        },
        showValues: true,
        valueFormat: function(d) {
          return d3.format(',.3f')(d);
        },
        legend: {
          updateState: false
        },
        duration: 500,
        forceY: [0, 1],
        yAxis: {
          axisLabel: 'Adjusted R-square',
          axisLabelDistance: -10
        },
        xAxis: {
          tickPadding: 10
        }
      }
    };
    //TODO: Explain
    vm.curRemoteness = [];
    vm.iRemoteness = {};

    vm.categories = [];

    vm.vis = {
      remotenessLevel: 'all',
      lgaBlock: '565',
      unitSel: "LGAs",
      filter: {
        "Population >= 150": false,
        "Households >= 20": false,
        "Affordability >= 3": false,
        "Indigenous QLD LGAs": false
      },
      locations: [],
      units: [],
      categories: [],
      topics: [],
      bubble: {
        topic: null
      },
      choropleth: {
        topic: null
      }
    };
    vm.linearRegression = {
      filename: null,
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
      filename: null,
      xaxis: null,
      yaxis: null,
      useRemoteness: false,
      labelLocations: false
    };

    vm.selectedLocationsChanged = selectedPlacesChanged;
    vm.selectedFiltersChanged = selectedFiltersChanged;
    vm.selectedTopicsChanged = selectedTopicsChanged;
    vm.selectedCategoryChanged = selectedCategoryChanged;
    vm.selectedBubbleTopicChanged = selectedBubbleTopicChanged;
    vm.selectedRegionTopicChanged = selectedRegionTopicChanged;
    vm.selectedDependentChanged = selectedDependentChanged;
    vm.selectedIndependentsChanged = selectedIndependentsChanged;
    vm.isDataSelected = isDataSelected;

    vm.selectedTable = 'lga_565_iba_final'; // TODO: tie to a GUI option, do change handler
    vm.tablePrefix = 'lga';
    vm.unitSels = ['LGAs', 'ILOCs'];
    vm.filters = [
      'Population >= 150',
      'Households >= 20',
      'Affordability >= 3',
      'Indigenous QLD LGAs'
    ]
    vm.filterPlaces = [];
    vm.mapLegend = null;

    activate(vm.selectedTable);

    vm.refreshLocations = refreshLocations;

    vm.showPropTopicsOnly = showPropTopicsOnly;

    vm.selectedScatterXChanged = selectedScatterXChanged;
    vm.selectedScatterYChanged = selectedScatterYChanged;
    vm.generateScatterPlot = generateScatterPlot;

    vm.requestScatterDownload = requestScatterDownload;
    vm.requestLinearRegressionDownload = requestLinearRegressionDownload;

    vm.clearLabels = clearLabels;

    vm.showLabel = showLabel;

    vm.placeDetails = null;

    vm.addOr - addOr;

    function clearLabels() {
      d3.selectAll(".label").remove();
    }

    function showLabel(id, id2) { // make general
      vm.clearLabels();
      d3.select(id).selectAll(".nv-group path")[0].forEach(function(d) {
        var tf = d3.select(d).attr("transform");
        var t = d3.transform(tf).translate;
        t[0] = t[0] + 6;
        t[1] = t[1] + 3;
        d3.select(d.parentNode)
          .append("text")
          .attr("class", "label")
          .attr("style", "font: normal 10px Arial")
          .text(d3.select(d).data()[0][0].name)
          .attr("transform", "translate(" + t[0] + "," + t[1] + ")");

      });
      if (typeof id2 !== 'undefined') {
        d3.select(id2).selectAll(".nv-group path")[0].forEach(function(d) {
          var tf = d3.select(d).attr("transform");
          var t = d3.transform(tf).translate;
          t[0] = t[0] + 6;
          t[1] = t[1] + 3;
          d3.select(d.parentNode)
            .append("text")
            .attr("class", "label")
            .attr("style", "font: normal 10px Arial")
            .text(d3.select(d).data()[0][0].name)
            .attr("transform", "translate(" + t[0] + "," + t[1] + ")");

        });
      }
    }

    vm.map = null;
    vm.dataColumnVisible = true;
    vm.toggleDataColumn = function() {
      $('#dataColumn').fadeToggle("fast");
      $('#mapColumn').toggleClass('col-md-6', 'col-md-9');
      vm.dataColumnVisible = !vm.dataColumnVisible;

      vm.map.invalidateSize(true);

      if (vm.dataColumnVisible && vm.chartobj.chart) {
        $timeout(function() {
          vm.chartobj.redraw();
        }, 100);
      }
    };

    // google chart does not refresh on window resize
    angular.element($window).bind('resize', function() {
      if (vm.chartobj.chart) {
        vm.chartobj.redraw();
      }
    });


    // select a place
    // load ilocs for selected places
    // load the ilocs
    // generate visualisations
    // TODO: Generalise comment

    //

    function addOr(num) {
      if (num > 0) {
        return " OR ";
      } else {
        return ""
      }
    }

    function activate(table) {
      var sql = 'SELECT DISTINCT ra_name FROM ' + table + ';';
      dataService.doQuery(sql).then(function(result) {
        vm.remotenessLevels = result.rows;
      });
      if (vm.vis.unitSel == 'LGAs' && (
          vm.vis.filter['Population >= 150'] ||
          vm.vis.filter['Households >= 20'] ||
          vm.vis.filter['Affordability >= 3'] ||
          vm.vis.filter['Indigenous QLD LGAs'])) {
        var query = 'SELECT lga_code FROM ' + table + ' WHERE ';
        var constraints = "";
        if (vm.vis.filter["Population >= 150"]) {
          constraints += "indigenous < 150";
        }
        if (vm.vis.filter["Households >= 20"]) {
          constraints += addOr(constraints.length) + "n_indig_h < 20";
        }
        if (vm.vis.filter["Affordability >= 3"]) {
          constraints += addOr(constraints.length) + "afford < 3";
        }
        if (vm.vis.filter["Indigenous QLD LGAs"]) {
          var indigenousCouncilCodes = [
            'LGA30250', // Aurukun Shire Council
            'LGA32330', // Cherbourg Aboriginal Shire Council
            'LGA32770', // Doomadgee Aboriginal Shire Council
            'LGA33830', // Hope Vale Aboriginal Shire Council
            'LGA34420', // Kowanyama Aboriginal Shire Council
            'LGA34570', // Lockhart River Aboriginal Shire Council
            'LGA34830', // Mapoon Aboriginal Shire Council
            'LGA35250', // Mornington Shire Council
            'LGA35670', // Napranum Aboriginal Shire Council
            'LGA35780', // Northern Peninsula Area Regional Council
            'LGA35790', // Palm Island Aboriginal Shire Council
            'LGA36070', // Pormpuraaw Aboriginal Shire Council
            'LGA36960', // Torres Strait Island Regional Council
            'LGA37550', // Woorabinda Aboriginal Shire Council
            'LGA37570', // Wujal Wujal Aboriginal Shire Council
            'LGA37600' // Yarrabah Aboriginal Shire Council
          ];
          var constraint = "lga_code not in (" + indigenousCouncilCodes.map(
            function(code) {
              return "'" + code + "'";
            }).join(",") + ")";
          console.log(constraint);
          constraints += addOr(constraints.length) + constraint;
        }
        console.log(constraints);

        query = query + constraints + ";";

        console.log(query);
        dataService.doQuery(query).then(function(result) {
          vm.filterPlaces = _.pluck(result.rows, 'lga_code');
        });
      } else {
        vm.filterPlaces = []
      }

      metadataService.getDataset(table).then(function(data) {
        console.log(data);
        vm.columnsFromMetadata = _.reject(data.attributes,
          function(column) {
            return column.data_type !== 'number';
          });
        vm.columns = vm.columnsFromMetadata;

        var regex = /proportion|percentage/i;
        vm.columnsFromMetadataPropCols = _.filter(vm.columnsFromMetadata,
          function(column) {
            return regex.test(column.short_desc);
          });
      });
    }

    function isDataSelected() {
      return vm.vis.topics.length && vm.vis.locations.length;
    }

    function selectedFiltersChanged() {
      selectedPlacesChanged()
    }

    /**
     * The user changed the places they selected
     */
    function selectedPlacesChanged() {
      // angular sets vm.vis.locations[1] to undefined when the
      // corresponding ui-select is cleared
      if (vm.vis.locations.length == 2 && !vm.vis.locations[1]) {
        vm.vis.locations.pop();
      }

      //vm.vis.topics = [];

      //vm.choroplethLayer = null;
      //vm.bubbleLayer = null;

      if (vm.vis.unitSel == 'ILOCs') {
        vm.tablePrefix = "iloc";
        vm.selectedTable = "iloc_merged_dataset";
        activate("iloc_merged_dataset")
      } else {
        vm.tablePrefix = "lga";
        vm.selectedTable = "lga_565_iba_final";
        activate("lga_565_iba_final")
      }


      var places = getSelectedPlaceExcludingAustralia();
      dataService.getLocsInPlaces(places, vm.selectedTable, vm.tablePrefix,
        vm.vis.remotenessLevel).then(function(results) {
        var units = results.rows;

        if (vm.filterPlaces.length > 0) {
          units = _.filter(units, function(row) {
            return !_.contains(vm.filterPlaces, row['lga_code']);
          });
        }

        if (!units.length) {
          // revert back the removenessLevel in the UI when no ILOCs are found
          vm.vis.remotenessLevel = vm.vis.currRemotenessLevel;
          window.alert('No ' + vm.vis.unitSel + ' found.');
        } else {
          vm.vis.currRemotenessLevel = vm.vis.remotenessLevel;
          vm.vis.units = units;
          generateVisualisations();
          generateScatterPlot();
          generateLinearRegression();
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
      var places = _.reject(vm.vis.locations, function(location) {
        return location.type === 'country';
      });
      return places;
    }

    function generateVisualisations() {
      if (!vm.vis.units.length) {
        vm.chartData = [];
        vm.tableData = [];
        return;
      }
      if (vm.vis.topics.length) {
        generateBarChart();
      }
      if (vm.vis.bubble.topic) {
        generateBubbleLayer(vm.vis.bubble.topic, vm.vis.units);
      }
      if (vm.vis.choropleth.topic) {
        generateChoroplethLayer(vm.vis.choropleth.topic, vm.vis.units);
      }

    }

    function selectedTopicsChanged($item, $model) {
      generateBarChart();
      if (vm.vis.topics.length === 1) {
        var topic = vm.vis.topics[0];
        // set the default for the map
        vm.vis.bubble.topic = topic;
        vm.vis.choropleth.topic = topic;

        generateBubbleLayer(vm.vis.bubble.topic, vm.vis.units);
        generateChoroplethLayer(vm.vis.choropleth.topic, vm.vis.units);
      }
    }

    function selectedCategoryChanged($item, $model) {
      if (vm.vis.category.length < 1) {
        showPropTopicsOnly(vm.propTopicsOnly);
      } else {
        if (vm.propTopicsOnly) {
          vm.columns = _.filter(vm.columnsFromMetadataPropCols, function(item) {
            return _.contains(_.pluck(vm.vis.category, 'cat_id'), item.cat_id);
          });
        } else {
          vm.columns = _.filter(vm.columnsFromMetadata, function(item) {
            return _.contains(_.pluck(vm.vis.category, 'cat_id'), item.cat_id);
          });
        }
      }
    }

    // TODO: deal with remoteness
    function generateBarChart() {
      var topicsList = _.pluck(vm.vis.topics, 'name').join(',');
      var unitCodes = _.pluck(vm.vis.units, vm.tablePrefix + '_code');

      var sql = 'SELECT ' + topicsList + ', ra_name, ' + vm.tablePrefix +
        '_name FROM ' + vm.selectedTable + ' WHERE ' + vm.tablePrefix +
        '_code IN (\'' + unitCodes.join('\' ,\'') + '\') order by ' + vm.tablePrefix +
        '_name;';

      dataService.doQuery(sql).then(function(results) {
        if (!results.rows.length) {
          return;
        }
        vm.curRemoteness = _.pluck(results.rows, 'ra_name');

        // get the columns
        var topics = _.keys(results.rows[0]);

        // build table header
        var header = ['Topic'].concat(_.pluck(results.rows, vm.tablePrefix +
          '_name'));

        // build table
        vm.tableData = [header];
        vm.chartData = vm.tableData.slice();
        _.forEach(vm.vis.topics, function(topic) {
          var dataRow = _.pluck(results.rows, topic.name);
          var dataRowText = dataRow.map(function(d) {
            return d.toFixed(2);
          });

          vm.tableData.push([topic.short_desc + ' (' + topic.name +
            ')'
          ].concat(dataRowText));
          vm.chartData.push([topic.name].concat(dataRow));
        });
        generateLegend();
      });
    }


    function generateLegend() {
      if (vm.tableData[0].length > 1) {
        var range = [];
        var i = 0;

        var colors = ['rgba(177, 0, 38, 0.70)', 'rgba(252, 78, 42, 0.70)',
          'rgba(254, 178, 76, 0.70)', 'rgba(255, 255, 178, 0.70)'
        ];
        var temp = vm.tableData[1];
        var leg_title = _.findWhere(vm.vis.topics, {
          'name': vm.vis.choropleth.topic.name
        })['short_desc']

        var bubbleLayerService = layerService.build('polygon');

        bubbleLayerService.legendPoints({
          name: vm.selectedTable
        }, vm.vis.choropleth.topic, vm.vis.units).then(function(buckets) {
          vm.classBreaks = buckets.concat(0);
          vm.classBreaks.reverse();
          var legjsonObj = [];
          for (i = 1; i < vm.classBreaks.length; i++) {
            var jsonData = {};
            jsonData['name'] = vm.classBreaks[i - 1] + ' - ' + vm.classBreaks[
              i];
            jsonData['value'] = colors[vm.classBreaks.length - i - 1];
            legjsonObj.push(jsonData);
          }
          var legend = L.control({
            position: 'bottomright'
          });
          legend.onAdd = function(map) {
            var div = L.DomUtil.create('div', 'legend');
            var ul = L.DomUtil.create('ul', '', div);
            legjsonObj.forEach(function(data) {
              var li = L.DomUtil.create('li', '', ul);
              var bullet = L.DomUtil.create('div', 'bullet', li);
              bullet.style = "background: " + data.value;
              var text = L.DomUtil.create('span', '', li);
              text.innerHTML = data.name;
            });
            return div;
          };
          if (vm.mapLegend != null) {
            vm.mapLegend.removeFrom(vm.map);
          }
          vm.mapLegend = legend;
          vm.map.addControl(legend);
        });
      }
    }


    function selectedBubbleTopicChanged($item, $model) {
      generateBubbleLayer($item, vm.vis.units);
    }

    function selectedRegionTopicChanged($item, $model) {
      generateLegend();
      generateChoroplethLayer($item, vm.vis.units);
    }


    function generateBubbleLayer(topic, locations) {
      var bubbleLayerService = layerService.build('bubble');
      bubbleLayerService.build({
        name: vm.selectedTable
      }, topic, locations).then(function(layerDefinition) {
        vm.bubbleLayer = layerDefinition;
      });
    }

    function generateChoroplethLayer(topic, locations) {
      var bubbleLayerService = layerService.build('polygon');
      bubbleLayerService.build({
        name: vm.selectedTable
      }, topic, locations).then(function(layerDefinition) {
        vm.regionLayer = layerDefinition;
      });
    }


    function refreshLocations(name) {
      if (!name || !name.length) {
        vm.locations = [];
        return;
      }

      if (vm.tablePrefix == "iloc") {
        dataService.getIlocLocationsStartingWith(name).then(function(
          locations) {
          locations.unshift({
            name: 'Australia',
            type: 'country'
          })
          vm.locations = locations;
        });
      } else { // check for lga
        dataService.getLgaLocationsStartingWith(name, vm.vis.lgaBlock).then(
          function(locations) {
            locations.unshift({
              name: 'Australia',
              type: 'country'
            })
            vm.locations = locations;
          });
      }

    }


    function selectedDependentChanged($item, $model) {
      generateLinearRegression();
    }

    function selectedIndependentsChanged($item, $model) {
      generateLinearRegression();
    }

    function generateLinearRegression() {
      if (!vm.linearRegression.dependent || !vm.linearRegression.independents
        .length) {
        return;
      }
      var resultsData = [];
      var data = {
        "dataset": vm.selectedTable,
        "depVar": vm.linearRegression.dependent.name,
        "depLabel": vm.linearRegression.dependent.short_desc,
        "indepVars": _.pluck(vm.linearRegression.independents, 'name'),
        "indepVarLabels": _.pluck(vm.linearRegression.independents,
          'short_desc'),
        "unit_prefix": vm.tablePrefix,
        "unit_codes": _.pluck(vm.vis.units, vm.tablePrefix + '_code'),
        "unit_type": vm.tablePrefix
      };
      console.debug(data);
      $http.post('/stats/', data).then(function(response) {
        var iDep = -1;
        console.debug('response', response);
        var iInds = Array.apply(null, Array(data.indepVars.length)).map(
          Number.prototype.valueOf, 0);
        var indVarLabels = _.pluck(vm.linearRegression.independents,
          'short_desc');
        if (data.indepVars.length > 1) {
          vm.barRegressionOptions["chart"]["yAxis"]["axisLabel"] =
            "Adjusted R-square";
          resultsData.push({
            key: "Data",
            values: [{
              "label": data.depLabel,
              "value": response.data.adj_rsquared
            }]
          });
          vm.linearRegression.resultsData = resultsData;
          vm.linearRegression.results = response.data;
          data.raw = vm.linearRegression.resultsData;
          data.modelType = "bar";
          vm.linearRegression.sendData = data;
          return
        }
        vm.regressionOptions["chart"]["xAxis"] = {
          "axisLabel": indVarLabels[0]
        }; // TODO: fix
        vm.regressionOptions["chart"]["yAxis"] = {
          "axisLabel": vm.linearRegression.dependent.short_desc
        };

        for (var i = 0; i < vm.remotenessLevels.length; i++) {
          resultsData.push({
            key: vm.remotenessLevels[i].ra_name,
            values: []
          });
          vm.iRemoteness[vm.remotenessLevels[i].ra_name] = i;
        }

        for (var k = 1; k < vm.tableData.length; k++) {
          if (vm.tableData[k][0] == vm.linearRegression.dependent.short_desc +
            " (" + data.depVar + ")") {
            iDep = k;
          }
          for (var v = 0; v < indVarLabels.length; v++) {
            if (vm.tableData[k][0] == indVarLabels[v] + " (" + data.indepVars[
                v] + ")") {
              iInds[v] = k;
            }
          }
        }

        for (var i = 1; i < vm.tableData[0].length - 1; i++) { // vm.tableData[0].length - 1
          resultsData[0].values.push({ //put into first one
            x: parseFloat(vm.tableData[iInds[0]][i]), //TODO: FIX
            y: parseFloat(vm.tableData[iDep][i]),
            name: vm.tableData[0][i]
          });
        }

        console.debug(response.data);

        var equationParts = response.data.equation.split(" ");

        resultsData.push({
          key: "Line",
          values: [],
          intercept: equationParts[2],
          slope: equationParts[4]
        });

        vm.linearRegression.resultsData = resultsData;
        vm.linearRegression.results = response.data;
        data.raw = vm.linearRegression.resultsData;
        vm.linearRegression.sendData = data;
      });

    }


    function showPropTopicsOnly(isChecked) {

      if (vm.vis.category.length < 1) {
        if (isChecked) {
          vm.columns = vm.columnsFromMetadataPropCols;
        } else {
          vm.columns = vm.columnsFromMetadata;
        }
      } else {
        if (vm.propTopicsOnly) {
          vm.columns = _.filter(vm.columnsFromMetadataPropCols, function(
            item) {
            return _.contains(_.pluck(vm.vis.category, 'cat_id'), item.cat_id);
          });
        } else {
          vm.columns = _.filter(vm.columnsFromMetadata, function(item) {
            return _.contains(_.pluck(vm.vis.category, 'cat_id'), item.cat_id);
          });
        }
      }
    }


    function selectedScatterXChanged() {
      generateScatterPlot();
    }

    function selectedScatterYChanged() {
      generateScatterPlot();
    }

    function generateScatterPlot() {
      if (!vm.scatterPlot.xaxis || !vm.scatterPlot.yaxis) {
        return;
      }
      if (vm.scatterPlot.labelLocations) {
        vm.showLabel("#scatterGraph", vm.scatterPlot.second);
      } else {
        vm.clearLabels();
      }
      vm.scatterPlot.filename = null;
      var data = {
        "dataset": vm.selectedTable,
        "xvar": vm.scatterPlot.xaxis.name,
        "xlabel": vm.scatterPlot.xaxis.short_desc,
        "yvar": vm.scatterPlot.yaxis.name,
        "ylabel": vm.scatterPlot.yaxis.short_desc,
        "useRemoteness": vm.scatterPlot.useRemoteness,
        "labelLocations": vm.scatterPlot.labelLocations,
        "unit_codes": _.pluck(vm.vis.units, vm.tablePrefix + '_code')
      };

      var resultsData = []
      var ix = -1;
      var iy = -1;

      for (var i = 0; i < vm.remotenessLevels.length; i++) {
        resultsData.push({
          key: vm.remotenessLevels[i].ra_name,
          values: []
        });
        vm.iRemoteness[vm.remotenessLevels[i].ra_name] = i;
      }


      for (var k = 1; k < vm.tableData.length; k++) {
        if (vm.tableData[k][0] == data.xlabel + " (" + data.xvar + ")") {
          ix = k;
        }
        if (vm.tableData[k][0] == data.ylabel + " (" + data.yvar + ")") {
          iy = k;
        }
      }

      if (vm.scatterPlot.useRemoteness) {
        for (var i = 1; i < vm.tableData[0].length - 1; i++) { // vm.tableData[0].length - 1
          resultsData[vm.iRemoteness[vm.curRemoteness[i - 1]]].values.push({
            x: parseFloat(vm.tableData[ix][i]),
            y: parseFloat(vm.tableData[iy][i]),
            name: vm.tableData[0][i]
          });
        }
      } else {
        for (var i = 1; i < vm.tableData[0].length - 1; i++) { // vm.tableData[0].length - 1
          resultsData[0].values.push({
            x: parseFloat(vm.tableData[ix][i]),
            y: parseFloat(vm.tableData[iy][i]),
            text: "fooLabelsOfScatterPoints",
            name: vm.tableData[0][i]
          });
        }
      }

      vm.scatterOptions["chart"]["showLegend"] = vm.scatterPlot.useRemoteness;

      if (vm.scatterPlot.second != null) {
        vm.scatterPlot.secondOptions["chart"]["showLegend"] = vm.scatterPlot
          .useRemoteness;
      }

      vm.scatterPlot.results = resultsData;

      data.raw = resultsData;
      vm.scatterPlot.sendData = data;

      vm.scatterOptions["chart"]["xAxis"] = {
        "axisLabel": data.xlabel
      };
      vm.scatterOptions["chart"]["yAxis"] = {
        "axisLabel": data.ylabel
      };

    }

    function requestScatterDownload(fileType) {
      vm.scatterPlot.filename = null;
      vm.scatterPlot.sendData.fileType = fileType
      $http.post('/phantomjs/receive', vm.scatterPlot.sendData).then(
        function(
          response) {
          vm.scatterPlot.filename = response.data;
          var newWindow = window.open('')
          newWindow.location = "/phantomjs/" + response.data;
        });
    }

    function requestLinearRegressionDownload(fileType) {
      vm.linearRegression.filename = null;
      vm.linearRegression.sendData.fileType = fileType
      $http.post('/phantomjs/receive', vm.linearRegression.sendData).then(
        function(response) {
          vm.linearRegression.filename = response.data;
          var newWindow = window.open('')
          newWindow.location = "/phantomjs/" + response.data;
        });
    }

    $scope.openScatterModal = function() {

      var modalInstance = $uibModal.open({
        animation: true,
        size: 'lg',
        templateUrl: 'scatter.html',
        controller: 'ModalInstanceCtrl',
        resolve: {
          vm: function() {
            return vm;
          }
        }
      });

      modalInstance.result.then(function() {}, function() {

      });
    };

    $scope.openRegModal = function() {
      var modalInstance = $uibModal.open({
        animation: true,
        size: 'lg',
        templateUrl: 'regression.html',
        controller: 'RegModalInstanceCtrl',
        resolve: {
          vm: function() {
            return vm;
          }
        }
      });

      //TODO: try without
      modalInstance.result.then(function() {}, function() {

      });
    };

  });

angular.module('midjaApp').controller('ModalInstanceCtrl', function($scope,
  $uibModalInstance, vm) {
  $scope.vm = vm;

  vm.scatterPlot.second = "#scatterGraphModal";
  $scope.modalCfg = angular.copy(vm.scatterOptions);
  $scope.modalCfg["chart"]["width"] = 800;
  $scope.modalCfg["chart"]["height"] = 760;
  vm.scatterPlot.secondOptions = $scope.modalCfg;

  $scope.ok = function() {
    vm.scatterPlot.second = null;
    vm.scatterPlot.secondOptions = null;
    $uibModalInstance.close();
  };
});

angular.module('midjaApp').controller('RegModalInstanceCtrl', function(
  $scope,
  $uibModalInstance, vm) {
  $scope.vm = vm;

  if (vm.linearRegression.sendData.modelType == "bar") {
    $scope.modalCfg = angular.copy(vm.barRegressionOptions);
  } else {
    $scope.modalCfg = angular.copy(vm.regressionOptions);
  }

  $scope.modalCfg["chart"]["width"] = 800;
  $scope.modalCfg["chart"]["height"] = 760;

  $scope.ok = function() {
    $uibModalInstance.close();
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
});

angular.module('midjaApp')
  .controller('LoginCtrl', function($scope, auth, $http, $location, store,
    $rootScope) {
    $scope.auth = auth;
    if ($location.$$path == "/login") {
      $scope.logStatus = false
      $scope.auth.signin();
    } else {
      $scope.logStatus = true
    }
    //$scope.logStatus = true
    $scope.logout = function() {
      $scope.logStatus = null
      auth.signout();
      store.remove('profile');
      store.remove('token');
      $location.path('/login');
      $scope.auth.signin();
    }

  });

angular.module('midjaApp').controller('DetailsModalInstanceCtrl', function(
  $scope, $uibModalInstance, vm, stats) {
  $scope.vm = vm;
  // insert data
  $scope.ok = function() {
    $scope.vm.placeDetails = null;
    $uibModalInstance.close();

  };

  $scope.cancel = function() {
    $scope.vm.placeDetails = null;
    $uibModalInstance.dismiss('cancel');
  };
  $scope.vm.placeDetails = stats.rows[0];
});
