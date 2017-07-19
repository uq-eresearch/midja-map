import _ from 'lodash-es'
import './styles/topic-breakdown-bar.css'
import { formatNumber } from '../../../lib/attribute/format'

export default function topicBreakdownBar(
    dataService, $compile, $timeout) {

  function attributeMatcher(attributeSelector) {
    // TODO: Handle function selectors
    var pattern = new RegExp(attributeSelector)
    return _.partial(_.filter, _, _.flow(
      _.property('name'), v => pattern.test(v)))
  }

  function populate(scope) {
    if (!scope.regionType || !scope.region) {
      return
    }
    return dataService.getAvailableAttributes(scope.regionType)
      .then(attributeMatcher(scope.attributeSelector))
      .then(scope.sorter || _.identity)
      .then((attributes) => {
        const attributeNames =_.map(attributes, _.property('name'))
        return dataService.getAttributesForRegions(
              scope.regionType,
              attributeNames,
              [scope.region]
            )
            .then(_.flow(
              _.property(scope.region.code),
              _.propertyOf,
              _.partial(_.map, attributeNames)))
            .then(vs => $timeout(() => {
              if (vs.length == 0) {
                scope.chart = null
                return
              }
              const valueFor =
                _.flow(
                  _.property('name'),
                  _.propertyOf(
                    _.zipObject(attributeNames, vs)))
              const words = s => s.split(/\s/)
              const firstWord = v => _.head(words(v))
              const tailWords = v => _.tail(words(v)).join(" ")
              const lastWord = v => _.last(words(v))
              const initWords = v => _.initial(words(v)).join(" ")
              function removeCommon(vs) {
                if (_.uniqBy(vs, firstWord).length <= 1) {
                  return removeCommon(_.map(vs, tailWords));
                } else if (_.uniqBy(vs, lastWord).length <= 1) {
                  return removeCommon(_.map(vs, initWords));
                } else {
                  return vs;
                }
              }
              const labelFor =
                _.flow(
                  _.property('name'),
                  _.propertyOf(
                    _.zipObject(
                      _.map(attributes, _.property('name')),
                      removeCommon(_.map(
                        attributes,
                        _.property('description'))))))
              scope.chart = {
                data: _.map(attributes, attribute => {
                  return {
                    "key": labelFor(attribute),
                    "values": [
                      {
                        "value": valueFor(attribute)
                      }
                    ]
                  };
                }),
                options: {
                  chart: {
                    type: 'multiBarHorizontalChart',
                    color: (attributes.length > 10) ?
                      d3.scale.category20().range() :
                      d3.scale.category10().range(),
                    height: 50+(attributes.length * 10),
                    x: _.constant(''),
                    y: _.property('value'),
                    showControls: false,
                    showLegend: true,
                    showValues: true,
                    valueFormat: formatNumber,
                    stacked: true,
                    showXAxis: false,
                    margin: {
                      left: 10,
                      bottom: 20
                    },
                    yAxis: {
                      tickFormat: formatNumber
                    }
                  },
                  caption: {
                    enable: true,
                    text: scope.description,
                    css: {
                      textAlign: 'right'
                    }
                  }
                }
              };
            }))
      })
  }

  function link(scope, element, attrs) {
    $compile(element.contents())(scope)
    const populateHook = _.debounce(() => {
      return populate(scope)
    }, 100)
    scope.$watch('attributeSelector', populateHook)
    scope.$watch('region', populateHook)
    scope.$watch('regionType', populateHook)
    scope.$watch('refreshOn', () => {
      $timeout(() => {
        scope.chartApi.refresh()
      })
    })
  }

  return {
    template: require('./templates/topic-breakdown-bar.html'),
    restrict: 'E',
    link: link,
    replace: true,
    scope: {
      attributeSelector: '@',
      sorter: '=',
      description: '@',
      region: '=',
      regionType: '=',
      refreshOn: '=?'
    }
  };
}
