'use strict';

/**
 * @ngdoc function
 * @name midjaApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the midjaApp
 */
angular.module('midjaApp')
  .controller('MainCtrl', function(
    dataService, formattingService, statsService,
    $q, $http, $scope, $uibModal, $timeout, $window) {
    var vm = this;
    vm.propTopicsOnly = false;

    var scatterPlotTooltipTemplate =
      _.template(
        "<h3><%= name %></h3>"+
        "<dl>"+
        "<dt><%=x.name%></dt>"+
        "<dd><%=x.value%></dd>"+
        "<dt><%=y.name%></dt>"+
        "<dd><%=y.value%></dd>"+
        "</dl>"
      );
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
        tooltip: {
          contentGenerator: _.flow(
            function(d) {
              return {
                name: d.point.name,
                x: {
                  name: vm.scatterOptions["chart"]["xAxis"]["axisLabel"],
                  value: d.point.x
                },
                y: {
                  name: vm.scatterOptions["chart"]["yAxis"]["axisLabel"],
                  value: d.point.y
                }
              };
            },
            scatterPlotTooltipTemplate)
        },
        useInteractiveGuideline: false,
        interactive: true,
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
          contentGenerator: _.flow(
            function(d) {
              return {
                name: d.point.name,
                x: {
                  name: vm.regressionOptions["chart"]["xAxis"]["axisLabel"],
                  value: d.point.x
                },
                y: {
                  name: vm.regressionOptions["chart"]["yAxis"]["axisLabel"],
                  value: d.point.y
                }
              };
            },
            scatterPlotTooltipTemplate)
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

    vm.vis = {
      remotenessLevel: 'all',
      regionTypeSelection: "LGAs",
      filter: {
        "Indigenous Population >= 150": false,
        "Indigenous Households >= 20": false,
        "Affordability >= 3": false,
        "Indigenous QLD LGAs": false
      },
      locations: [],
      regions: [],
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
    vm.attributes = [];

    vm.attributesFromMetadata = [];
    vm.attributesFromMetadataPropCols = [];

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
    vm.selectedDependentChanged = selectedDependentChanged;
    vm.selectedIndependentsChanged = selectedIndependentsChanged;
    vm.isDataSelected = isDataSelected;

    selectedPlacesChanged();
    vm.regionType = 'lga';
    vm.regionTypeSelectorOptions = ['LGAs', 'ILOCs', 'SA2s', 'SA3s'];
    vm.filters = [
      'Indigenous Population >= 150',
      'Indigenous Households >= 20',
      'Affordability >= 3',
      'Indigenous QLD LGAs'
    ]
    vm.filterPlaces = [];

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

    vm.dataColumnVisible = true;
    vm.toggleDataColumn = function() {
      $('#dataColumn').fadeToggle("fast");
      $('#mapColumn').toggleClass('col-md-6', 'col-md-9');
      vm.dataColumnVisible = !vm.dataColumnVisible;

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

    function activate(regionType) {
      dataService.getAttribute(regionType, 'ra_name').then(function(data) {
        vm.remotenessLevels = _.uniq(_.values(data)).sort();
      });
      return $q(function(resolve) {
          var excludeOps = [];
          if (vm.vis.regionTypeSelection == 'LGAs') {
            if (vm.vis.filter["Indigenous Population >= 150"]) {
              excludeOps.push(
                dataService.getAttribute(regionType, 'indigenous')
                .then(function(data) {
                  return _.chain(data)
                    .pairs()
                    .filter(function(p) {
                      return p[1] < 150;
                    })
                    .map(_.first)
                    .value();
                })
              );
            }
            if (vm.vis.filter["Indigenous Households >= 20"]) {
              excludeOps.push(
                dataService.getAttribute(regionType, 'n_indig_h')
                .then(function(data) {
                  return _.chain(data)
                    .pairs()
                    .filter(function(p) {
                      return p[1] < 20;
                    })
                    .map(_.first)
                    .value();
                })
              );
            }
            if (vm.vis.filter["Affordability >= 3"]) {
              excludeOps.push(
                dataService.getAttribute(regionType, 'afford')
                .then(function(data) {
                  return _.chain(data)
                    .pairs()
                    .filter(function(p) {
                      return p[1] < 3;
                    })
                    .map(_.first)
                    .value();
                })
              );
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
              excludeOps.push(
                dataService.getAttribute(regionType, 'region_name')
                .then(function(data) {
                  return _.chain(data)
                    .keys()
                    .difference(indigenousCouncilCodes)
                    .value();
                })
              );
            }
          }
          if (_.isEmpty(excludeOps)) {
            vm.filterPlaces = [];
            resolve();
          } else {
            $q.all(excludeOps)
              .then(_.flow(_.flatten, _.uniq))
              .then(function(excludedRegionCodes) {
                vm.filterPlaces = excludedRegionCodes;
                resolve();
              })
          }
        }).then(function() {
          return dataService.getAvailableAttributes(regionType)
        })
        .then(function(availableAttributes) {
          vm.attributesFromMetadata = _.reject(availableAttributes,
            function(attribute) {
              return attribute.type !== 'number';
            });
          vm.attributes = vm.attributesFromMetadata;

          var regex = /proportion|percentage/i;
          vm.attributesFromMetadataPropCols = _.filter(vm.attributesFromMetadata,
            function(attribute) {
              return regex.test(attribute.description);
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

      $q(function(resolve) {
          var previousRegionType = vm.regionType;
          switch (vm.vis.regionTypeSelection) {
            case 'ILOCs':
              vm.regionType = "iloc";
              break;
            case 'LGAs':
              vm.regionType = "lga";
              break;
            case 'SA2s':
              vm.regionType = "sa2";
              break;
            case 'SA3s':
              vm.regionType = "sa3";
              break;
          }
          if (previousRegionType != vm.regionType) {
            vm.vis.topics = [];
            selectedTopicsChanged();
          }
          // Clear topics if region type changed
          return activate(vm.regionType).then(resolve);
        }).then(function() {
          return $q(function(resolve) {
            // Set first location to Australia if unpopulated
            if (!_.isObject(vm.vis.locations[0])) {
              dataService.getRegionsAtOrAbove('country')
                .then(_.first)
                .then(function(location) {
                  vm.vis.locations[0] = location;
                  resolve(vm.vis.locations);
                });
            } else {
              resolve(vm.vis.locations);
            }
          })
        })
        .then(function(regions) {
          return $q.all(_.map(
            regions,
            _.partial(dataService.getSubregions, vm.regionType)))
        }).then(_.flatten)
        .then(_.partial(_.uniq, _, false, _.property('code')))
        .then(_.partial(_.filter, _,
          function(region) {
            return !_.includes(vm.filterPlaces, region.code)
          }
        ))
        .then(function(regions) {
          if (vm.vis.remotenessLevel == 'all')
            return regions;
          else
            return dataService.filterByRemotenessArea(
              regions,
              vm.regionType,
              vm.vis.remotenessLevel);
        }).then(function(regions) {
          if (!regions.length) {
            // revert back the removenessLevel in the UI when no ILOCs are found
            vm.vis.remotenessLevel = vm.vis.currRemotenessLevel;
            window.alert('No ' + vm.vis.regionTypeSelection + ' found.');
          } else {
            vm.vis.currRemotenessLevel = vm.vis.remotenessLevel;
            vm.vis.regions = regions;
            generateVisualisations();
            generateScatterPlot();
            generateLinearRegression();
          }
        });
    }

    function generateVisualisations() {
      if (!vm.vis.regions.length) {
        vm.chartData = [];
        vm.tableData = [];
        return;
      }
      if (vm.vis.topics.length) {
        generateBarChart();
      }

    }

    function selectedTopicsChanged($item, $model) {
      generateBarChart();
      if (vm.vis.topics.length === 1) {
        var topic = vm.vis.topics[0];
        // set the default for the map
        vm.vis.bubble.topic = topic;
        vm.vis.choropleth.topic = topic;
      }
      // Ensure fields are depopulated if topic is no longer selected
      var onlyIfSelected = function (topic) {
        if (!topic) return topic;
        return _.find(vm.vis.topics, function(selectedTopic) {
          return selectedTopic.name == topic.name;
        });
      };
      vm.vis.bubble.topic = onlyIfSelected(vm.vis.bubble.topic);
      vm.vis.choropleth.topic = onlyIfSelected(vm.vis.choropleth.topic);
      vm.linearRegression.dependent =
        onlyIfSelected(vm.linearRegression.dependent);
      vm.linearRegression.independents =
        _.filter(
          vm.linearRegression.independents,
          _.flow(onlyIfSelected, _.isObject));
      vm.scatterPlot.xaxis = onlyIfSelected(vm.scatterPlot.xaxis);
      vm.scatterPlot.yaxis = onlyIfSelected(vm.scatterPlot.yaxis);
    }

    // TODO: deal with remoteness
    function generateBarChart() {
      var regionType = vm.regionType;
      var attributeNames = _.map(vm.vis.topics, _.property('name'))
        .concat(['region_name', 'ra_name']);
      var locations = vm.vis.regions;

      dataService.getAttributesForRegions(regionType, attributeNames, locations)
        .then(function(attrs) {
          if (!Object.keys(attrs).length) {
            return;
          }

          var sortedRegionCodes =
            _.map(
              _.sortBy(
                _.values(locations),
                _.property('name')),
              _.property('code'));

          // Remoteness values ordered by location
          vm.curRemoteness = _.map(sortedRegionCodes, function(r) {
            return attrs[r].ra_name;
          });

          // build table header for chart
          var header = [{
            label: 'Topic',
            type: 'string'
          }].concat(_.map(
            sortedRegionCodes,
            function(r) {
              return {
                label: attrs[r]['region_name'],
                type: 'number'
              };
            }
          ));

          var dataSeries = _.map(vm.vis.topics, function(topic) {
            return {
              topic: topic,
              row: _.map(sortedRegionCodes, function(r) {
                return attrs[r][topic.name];
              })
            };
          });

          function title(topic) {
            return topic.description + ' (' + topic.name + ')';
          };

          function wrapAtSpace(text) {
            var parts = text.split(/ +/);
            var maxLength = _.max(parts, _.property('length')).length;
            var lines = _.reduce(parts, function(m, part) {
              var appendCandidate = [_.last(m), part].join(" ");
              if (appendCandidate.length > maxLength) {
                return m.concat(part);
              } else {
                return _.initial(m).concat(appendCandidate);
              }
            }, [""]);
            return lines.join("\n");
          };

          // build table
          vm.tableData = [
            _.map(header, _.property('label'))
          ].concat(_.map(dataSeries, function(data) {
            var asText = function(d) {
              return formattingService.formatNumber(d, data.topic.format);
            };
            return [title(data.topic)].concat(_.map(data.row, asText));
          }));
          vm.chartData = [header].concat(_.map(dataSeries, function(data) {
            return [wrapAtSpace(title(data.topic))].concat(data.row);
          }));
        });
    }

    function refreshLocations(name) {
      if (!name || !name.length) {
        vm.locations = [];
        return;
      }

      dataService.getRegionsStartingWith(vm.regionType, name)
        .then(function(locations) {
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
      if (!vm.linearRegression.dependent || !vm.linearRegression.independents
        .length) {
        return;
      }
      var resultsData = [];

      var topics = _.map(
        [vm.linearRegression.dependent].concat(
          vm.linearRegression.independents),
        _.property('name'));
      var regions = vm.vis.regions;

      var data = {
        "depVar": vm.linearRegression.dependent.name,
        "depLabel": vm.linearRegression.dependent.description,
        "indepVars": _.map(
          vm.linearRegression.independents,
          _.property('name')),
        "indepVarLabels": _.map(
          vm.linearRegression.independents,
          _.property('description'))
      };

      function buildBarChart(context) {
        vm.linearRegression.resultsData = [{
          key: "Data",
          values: [{
            "label": vm.linearRegression.dependent.description,
            "value": context.lrResult.adj_rsquared
          }]
        }];
        vm.linearRegression.results = context.lrResult;
        data.raw = vm.linearRegression.resultsData;
        data.modelType = "bar";
        vm.linearRegression.sendData = data;
      }

      function buildPlot(context) {
        var lrResult = context.lrResult;
        var depVar = vm.linearRegression.dependent;
        var indepVar = _.first(vm.linearRegression.independents);

        vm.regressionOptions["chart"]["xAxis"] = {
          "axisLabel": indepVar.description
        };
        vm.regressionOptions["chart"]["yAxis"] = {
          "axisLabel": depVar.description
        };

        var resultsData = [
          {
            key: 'Data',
            values: _.map(
              _.zip(
                context.topicSeries[indepVar.name],
                context.topicSeries[depVar.name],
                _.map(context.regions, _.property('name'))),
              _.partial(_.zipObject, ['x', 'y', 'name']))
          },
          {
            key: "Line",
            values: [],
            intercept: lrResult.coefficients['(Intercept)'],
            slope: lrResult.coefficients[indepVar.name]
          }
        ];

        vm.linearRegression.resultsData = resultsData;
        vm.linearRegression.results = lrResult;
        data.raw = vm.linearRegression.resultsData;
        vm.linearRegression.sendData = data;
      }

      var buildF =
        vm.linearRegression.independents.length > 1 ?
        buildBarChart :
        buildPlot;

      dataService.getAttributesForRegions(vm.regionType, topics, regions)
        .then(function(topicData) {
          var depVar = vm.linearRegression.dependent;
          var indepVars = vm.linearRegression.independents;
          var lookupAttributesForRegion =_.flow(
            _.property('code'), // Get region code
            _.propertyOf(topicData), // Get region data
            _.propertyOf) // Turn dictionary object into lookup function
          var isValidNumber = function(v) {
            return _.isNumber(v) && !_.isNaN(v);
          };
          var doesRegionHaveCompleteData = _.flow(
            lookupAttributesForRegion, // Create lookup by topic name
            _.partial(_.flow, _.property('name')), // Handle topic as input
            _.partial(_.map, [depVar].concat(indepVars)), // Lookup values
            _.partial(_.every, _, isValidNumber)); // Check all values are OK
          var usableRegions = _.filter(regions, doesRegionHaveCompleteData);
          var topicSeries = _.chain(usableRegions)
            .map(lookupAttributesForRegion)
            // Get region's data for topics (like a row)
            .map(_.partial(_.map, topics))
            // Convert region rows to attributes of topic data
            .unzip()
            .value();
          data.data = _.zipObject(topics, topicSeries);
          return statsService.linearRegression(data)
            .then(function(lrResult) {
              return {
                regions: usableRegions,
                topicSeries: _.zipObject(topics, topicSeries),
                lrResult: lrResult
              };
            });
        })
        .then(buildF);

    }


    function showPropTopicsOnly(isChecked) {
      if (isChecked) {
        vm.attributes = vm.attributesFromMetadataPropCols;
      } else {
        vm.attributes = vm.attributesFromMetadata;
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
      var xVar = vm.scatterPlot.xaxis.name;
      var yVar = vm.scatterPlot.yaxis.name;
      var useRemoteness = vm.scatterPlot.useRemoteness;
      var regions = vm.vis.regions;

      return dataService.getAttributesForRegions(
        vm.regionType, [xVar, yVar, 'ra_name'], regions
      ).then(function(data) {
        var lookupAttributesForRegion =_.flow(
          _.property('code'), // Get region code
          _.propertyOf(data), // Get region data
          _.propertyOf) // Turn dictionary object into lookup function
        var isValidNumber = function(v) {
          return _.isNumber(v) && !_.isNaN(v);
        };
        var doesRegionHaveValidXY = _.flow(
          lookupAttributesForRegion,
          _.partial(_.map, [xVar, yVar]), // Lookup X/Y values
          _.partial(_.every, _, isValidNumber));
        var lookupRemotenessForRegion = _.flow(
          lookupAttributesForRegion,
          function (f) { return f('ra_name') || "Unknown Remoteness"; })
        var usableRegions = _.filter(regions, doesRegionHaveValidXY);
        var groupedRegions = _.groupBy(
          usableRegions,
          useRemoteness ?
            lookupRemotenessForRegion :
            _.constant('All Regions'));
        var createPointForRegion = function(region) {
          var attrLookup = lookupAttributesForRegion(region);
          return {
            x: attrLookup(xVar),
            y: attrLookup(yVar),
            name: region.name
          };
        };
        return _.map(_.keys(groupedRegions).sort(), function(k) {
          return {
            key: k,
            values: _.map(groupedRegions[k], createPointForRegion)
          };
        })
      }).then(function (resultsData) {
        var data = {
          "raw": resultsData,
          "xvar": vm.scatterPlot.xaxis.name,
          "xlabel": vm.scatterPlot.xaxis.description,
          "yvar": vm.scatterPlot.yaxis.name,
          "ylabel": vm.scatterPlot.yaxis.description,
          "useRemoteness": vm.scatterPlot.useRemoteness,
          "labelLocations": vm.scatterPlot.labelLocations,
          "unit_codes": _.map(vm.vis.regions, _.property('code'))
        };

        vm.scatterOptions["chart"]["showLegend"] = vm.scatterPlot.useRemoteness;

        if (vm.scatterPlot.second != null) {
          vm.scatterPlot.secondOptions["chart"]["showLegend"] = vm.scatterPlot
            .useRemoteness;
        }

        vm.scatterPlot.results = resultsData;
        vm.scatterPlot.sendData = data;

        vm.scatterOptions["chart"]["xAxis"] = {
          "axisLabel": data.xlabel
        };
        vm.scatterOptions["chart"]["yAxis"] = {
          "axisLabel": data.ylabel
        };
      });
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
  $scope, $uibModalInstance, context) {
  $scope.context = context;

  // insert data
  $scope.ok = function() {
    $uibModalInstance.close();
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
});
