'use strict';

import _ from 'lodash-es'
import './styles/population-pyramid.css'

/**
 * @ngdoc directive
 * @name midjaApp.directive:dataDownloadLink
 * @description
 */
angular.module('midjaApp')
  .directive('populationPyramid', function(
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
        .then(v => v.reverse())
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
                const isFemaleAttribute = _.flow(
                  _.property('description'), v => /female/i.test(v))
                const femaleAttributes =
                  _.filter(attributes, isFemaleAttribute)
                const maleAttributes =
                  _.filter(attributes, _.negate(isFemaleAttribute))
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
                const labelForFemale =
                  _.flow(
                    _.property('name'),
                    _.propertyOf(
                      _.zipObject(
                        _.map(femaleAttributes, _.property('name')),
                        removeCommon(_.map(
                          femaleAttributes,
                          _.property('description'))))))
                const labelForMale =
                  _.flow(
                    _.property('name'),
                    _.propertyOf(
                      _.zipObject(
                        _.map(maleAttributes, _.property('name')),
                        removeCommon(_.map(
                          maleAttributes,
                          _.property('description'))))))
                var maxValue =
                  _.max(_.map(attributes, _.flow(valueFor, Math.abs)))
                scope.chart = {
                  data: [{
                    "key": "male",
                    "color": "#4444ff",
                    "values": _.map(
                      maleAttributes,
                      attribute => {
                        return {
                          "label": labelForMale(attribute),
                          "value": -1*valueFor(attribute)
                        }
                      })
                  }, {
                    "key": "female",
                    "color": "#ff4444",
                    "values": _.map(
                      femaleAttributes,
                      attribute => {
                        return {
                          "label": labelForFemale(attribute),
                          "value": valueFor(attribute)
                        }
                      })
                  }],
                  options: {
                    chart: {
                      type: 'multiBarHorizontalChart',
                      height: 250,
                      x: _.property('label'),
                      y: _.property('value'),
                      showControls: false,
                      showLegend: true,
                      showValues: true,
                      valueFormat: _.flow(
                        Math.abs,
                        formattingService.formatNumber
                      ),
                      stacked: true,
                      showXAxis: true,
                      margin: {
                        left: 40,
                        bottom: 20
                      },
                      forceY: [-1*maxValue, 0, maxValue],
                      yAxis: {
                        tickFormat: _.flow(
                          Math.abs,
                          formattingService.formatNumber
                        )
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
      template: require('./templates/population-pyramid.html'),
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
