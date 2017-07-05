import _ from 'lodash-es'
import {
  sortByAttributeNameNumbers,
  sortByEducation
} from '../../../lib/attribute/sorters'
import csvStringify from 'csv-stringify'

export default function MainController(
    dataService, formattingService, statsService,
    $q, $http, $scope, $uibModal, $timeout, $window, $document, $filter) {
  var vm = this;
  vm.propTopicsOnly = false;

  var scatterPlotTooltipTemplate = d =>
    `<h3>${d.name}</h3>`+
    `<dl>`+
    `<dt>${d.x.name}</dt>`+
    `<dd>${d.x.value}</dd>`+
    `<dt>${d.y.name}</dt>`+
    `<dd>${d.y.value}</dd>`+
    `</dl>`
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

  vm.remotenessAreas = {};
  vm.getAvailableRemotenessAreas = function() {
    // applyRegexTo(value)(regex) = (true|false)
    var applyRegexTo = _.partial(_.method, 'test');
    // Note: Tick sorts earlier than cross
    var asCheckOrCross = function (b) { return b ? '\u2713' : '\u274c'; };
    return _.sortBy(_.keys(vm.remotenessAreas), function(v) {
      var patterns = [/cities/i, /regional/i, /remote/i];
      var applyTest = _.flow(applyRegexTo(v), asCheckOrCross);
      return _.map(patterns, applyTest).join('');
    });
  }

  vm.vis = {
    regionTypeSelection: "lga_2011",
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
  vm.regionTypeSelectorOptions = {
    'lga_2011': 'LGA (2011)',
    'lga_2016': 'LGA (2016)',
    'iloc_2011': 'ILOC (2011)',
    'sa2_2011': 'SA2 (2011)',
    'sa2_2016': 'SA2 (2016)',
    'sa3_2011': 'SA3 (2011)',
    'sa3_2016': 'SA3 (2016)'
  };
  vm.filters = [
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

  vm.sortByAttributeNameNumbers = sortByAttributeNameNumbers

  vm.sortByEducation = sortByEducation

  function activate(regionType) {
    return $q(function(resolve) {
        var excludeOps = [];
        if (vm.vis.regionTypeSelection.indexOf('lga') == 0) {
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
        vm.regionNameAttribute =
          availableAttributes.find(_.matchesProperty('name', 'region_name'));
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

    Promise.resolve(vm.vis.regionTypeSelection)
      .then(function(regionType) {
        var previousRegionType = vm.regionType;
        vm.regionType = regionType;
        if (regionType == previousRegionType) {
          return regionType;
        } else {
          vm.vis.topics = [];
          return dataService.getAttribute(regionType, 'ra_name')
            .then(function(data) {
              vm.remotenessAreas = _.fromPairs(
                _.map(
                  _.uniq(_.values(data)).sort(),
                  function(v) { return [v, true] }));
            })
            .then(selectedTopicsChanged)
            .then(_.constant(regionType));
        }
      }).then(
        activate
      ).then(function() {
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
        if (vm.regionType) {
          return $q.all(_.map(
            regions,
            _.partial(dataService.getSubregions, vm.regionType)))
        } else {
          // No region type => no selected regions
          return [];
        }
      })
      .then(_.flatten)
      .then(_.partial(_.uniq, _, false, _.property('code')))
      .then(_.partial(_.filter, _,
        function(region) {
          return !_.includes(vm.filterPlaces, region.code)
        }
      ))
      .then(function(regions) {
        if (_.size(vm.remotenessAreas) > 0) {
          return dataService.filterByRemotenessArea(
            regions,
            vm.regionType,
            _.filter(
              _.keys(vm.remotenessAreas),
              _.propertyOf(vm.remotenessAreas)));
        } else {
          return regions;
        }
      }).then(function(regions) {
        vm.vis.regions = regions;
        generateScatterPlot();
        generateLinearRegression();
      })
      .catch(e => { console.log(e, e.stack) });
  }

  function selectedTopicsChanged() {
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

  vm.downloadCSV = function _downloadCSV() {
    var regionType = vm.regionType;
    var attributes = [vm.regionNameAttribute].concat(vm.vis.topics)
    var attributeNames = _.map(attributes, _.property('name'));
    var locations = vm.vis.regions;

    return dataService.getAttributesForRegions(
      regionType, attributeNames, locations
    ).then(function(attrs) {
      var header = _.map(attributes, _.property('description'));
      var rowFor = _.flow(
        _.property('code'),
        _.propertyOf(attrs),
        _.propertyOf,
        _.partial(_.map, attributeNames)
      );
      var sortedRegions = _.sortBy(_.values(locations), _.property('name'));
      var table = [header].concat(_.map(sortedRegions, rowFor));
      return new Promise(function(resolve, reject) {
        csvStringify(table, function(err, s) {
          if (err) {
            reject(err);
          } else {
            resolve(s);
          }
        });
      });
    });
  };

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

  $scope.openScatterModal = () => {
    $uibModal.open({
      animation: true,
      size: 'lg',
      template: require('../../views/scatter-plot-modal.html'),
      controller: 'ScatterPlotModalController',
      resolve: {
        vm: () => vm
      }
    })
  }

  $scope.openRegModal = () => {
    $uibModal.open({
      animation: true,
      size: 'lg',
      template: require('../../views/linear-regression-modal.html'),
      controller: 'LinearRegressionModalController',
      resolve: {
        vm: () => vm
      }
    })
  }

  $scope.showTopicDetails = (item) => {
    $uibModal.open({
      animation: true,
      size: 'lg',
      template: require('../../views/topic-details-modal.html'),
      controller: 'TopicDetailsModalController',
      resolve: {
        topic: () => item
      }
    })
  }

  $scope.showTopicSelectionModal = () => {
    $uibModal.open({
      animation: true,
      size: 'lg',
      template: require('../../views/topic-selection-modal.html'),
      controller: 'TopicSelectionModalController',
      resolve: {
        topics: () => $filter('orderBy')(vm.attributes, 'description'),
        currentlySelectedTopics: () => vm.vis.topics
      }
    }).result
      .then((selectedTopics) => {
        $timeout(() => {
          vm.vis.topics = selectedTopics
        })
      })
  }

  $scope.deselectTopic = (topic) => {
    vm.vis.topics = _.without(vm.vis.topics, topic)
    selectedTopicsChanged()
  }

}
