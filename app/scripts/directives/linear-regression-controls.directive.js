import R from 'ramda'
import {
  multipleLinearRegression,
} from '../../../lib/attribute/regression'
import { svgAsPngUri } from 'save-svg-as-png'

function tooltipTemplate(d) {
  return  `<h3>${d.name}</h3>`+
          `<dl>`+
          `<dt>${d.x.name}</dt>`+
          `<dd>${d.x.value}</dd>`+
          `<dt>${d.y.name}</dt>`+
          `<dd>${d.y.value}</dd>`+
          `</dl>`
}

function initializeScope(scope) {
  scope.linearRegression = {
    dependent: null,
    independents: []
  }
  scope.regressionOptions = {
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
        contentGenerator: R.pipe(
          function(d) {
            return {
              name: d.point.name,
              x: {
                name: scope.regressionOptions["chart"]["xAxis"]["axisLabel"],
                value: d.point.x
              },
              y: {
                name: scope.regressionOptions["chart"]["yAxis"]["axisLabel"],
                value: d.point.y
              }
            };
          },
          tooltipTemplate)
      },
      zoom: {
        enabled: false
      }
    }
  }
  scope.barRegressionOptions = {
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
  }
}

export default function linearRegressionControls(
      $compile, $uibModal, dataService) {

  function generateLinearRegression(scope) {
    if (!scope.linearRegression.dependent ||
        !scope.linearRegression.independents.length) {
      return;
    }
    var regions = scope.regions;

    var data = {
      "depVar": scope.linearRegression.dependent.name,
      "depLabel": scope.linearRegression.dependent.description,
      "indepVars": R.pluck(
        'name',
        scope.linearRegression.independents),
      "indepVarLabels": R.pluck(
        'description',
        scope.linearRegression.independents)
    };

    function buildBarChart(context) {
      scope.linearRegression.resultsData = [{
        key: "Data",
        values: [{
          "label": scope.linearRegression.dependent.description,
          "value": context.lrResult.adjustedRSquared
        }]
      }];
      scope.linearRegression.results = context.lrResult;
      data.raw = scope.linearRegression.resultsData;
      data.modelType = "bar";
      scope.linearRegression.sendData = data;
    }

    function buildPlot(context) {
      var lrResult = context.lrResult
      var depVar = scope.linearRegression.dependent
      var indepVar = R.head(scope.linearRegression.independents)

      scope.regressionOptions["chart"]["xAxis"] = {
        "axisLabel": indepVar.description
      };
      scope.regressionOptions["chart"]["yAxis"] = {
        "axisLabel": depVar.description
      };

      let resultsData = [
        {
          key: 'Data',
          values: R.map(
            R.zipObj(['x', 'y', 'name']),
            R.transpose([
              context.topicSeries[indepVar.name],
              context.topicSeries[depVar.name],
              R.pluck('name', context.regions)
            ])
          )
        },
        {
          key: "Line",
          values: [],
          intercept: lrResult.equation.intercept,
          slope: lrResult.equation.coefficients[0]
        }
      ]

      scope.linearRegression.resultsData = resultsData;
      scope.linearRegression.results = lrResult;
      data.raw = scope.linearRegression.resultsData;
      scope.linearRegression.sendData = data;
    }

    var buildF =
      scope.linearRegression.independents.length > 1 ?
      buildBarChart :
      buildPlot;

    const topics =
      [scope.linearRegression.dependent].concat(
        scope.linearRegression.independents)

    Promise.all(
      R.map(
        attr => dataService.getAttribute(scope.regionType, attr),
        R.pluck('name', topics)
      )
    ).then(topicData => {
      return R.map(R.pick(R.pluck('code', regions)), topicData)
    }).then(function(topicData) {
      const result = multipleLinearRegression(
        R.head(topicData),
        R.tail(topicData)
      )
      return {
        regions: R.filter(
          R.pipe(
            R.prop('code'),
            R.flip(R.contains)(result.keySet)
          ),
          regions
        ),
        topicSeries: R.zipObj(
          R.pluck('name', topics),
          R.map(R.props(result.keySet), topicData)
        ),
        lrResult: result
      }
    }).then(buildF);
  }

  function link(scope, element, attrs) {
    $compile(element.contents())(scope)
    initializeScope(scope)
    scope.selectedDependentChanged =
      ($item, $model) => generateLinearRegression(scope)
    scope.selectedIndependentsChanged =
      ($item, $model) => generateLinearRegression(scope)
    scope.openRegModal = () => {
      $uibModal.open({
        animation: true,
        size: 'lg',
        template: require('../../views/linear-regression-modal.html'),
        controller: 'LinearRegressionModalController',
        resolve: {
          vm: () => scope
        }
      })
    }
    scope.nvd3ToPng = R.memoize(
      (parentElementId) => () => {
        const nvd3El = document.getElementById(parentElementId)
        const svgEl = nvd3El.querySelector('svg')
        return new Promise((resolve, reject) => {
            svgAsPngUri(svgEl, {}, resolve)
          })
          .then(dataUri => dataUri.replace('data:image/png;base64,',''))
          .then(data => {
            return atob(data)
          })
      }
    )

    const populateHook = () => generateLinearRegression(scope)
    scope.$watch('regionType', populateHook)
    scope.$watch('regions', populateHook)
    scope.$watch('topics', populateHook)
  }

  return {
    template: require('./templates/linear-regression-controls.html'),
    restrict: 'E',
    link: link,
    replace: true,
    transclude: true,
    scope: {
      regionType: '=',
      regions: '=',
      topics: '='
    }
  }
}
