'use strict';

import _ from 'lodash-es'
import './styles/topic-breakdown-bar.css'

/**
 * @ngdoc directive
 * @name midjaApp.directive:dataDownloadLink
 * @description
 */
angular.module('midjaApp')
  .directive('topicBreakdownBar', function(
    dataService, formattingService, $compile, $timeout) {

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
                const firstChar = v => v.slice(0, 1)
                const tailChars = v => v.slice(1)
                const lastChar = v => v.slice(v.length - 1)
                const initChars = v => v.slice(0, v.length - 1)
                function removeCommon(vs) {
                  if (_.uniqBy(vs, firstChar).length <= 1) {
                    return removeCommon(_.map(vs, tailChars));
                  } else if (_.uniqBy(vs, lastChar).length <= 1) {
                    return removeCommon(_.map(vs, initChars));
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
                  data: _.map(
                    _.zip(attributes, vs),
                    _.spread(function (attribute, v) {
                      return {
                        "key": labelFor(attribute),
                        "values": [
                          {
                            "value": v
                          }
                        ]
                      };
                    })
                  ),
                  options: {
                    chart: {
                      type: 'multiBarHorizontalChart',
                      x: _.constant(''),
                      y: _.property('value'),
                      showControls: false,
                      showLegend: true,
                      showValues: true,
                      valueFormat: formattingService.formatNumber,
                      stacked: true,
                      showXAxis: false,
                      margin: {
                        left: 10,
                        bottom: 20
                      },
                      yAxis: {
                        tickFormat: formattingService.formatNumber
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
      const populateHook = () => {
        return populate(scope)
      }
      scope.$watch('attributeSelector', populateHook)
      scope.$watch('region', populateHook)
      scope.$watch('regionType', populateHook)
      console.log(scope)
    }

    return {
      template: require('./templates/topic-breakdown-bar.html'),
      restrict: 'E',
      link: link,
      replace: true,
      scope: {
        attributeSelector: '=',
        sorter: '=',
        description: '@',
        region: '=',
        regionType: '='
      }
    };
  });
