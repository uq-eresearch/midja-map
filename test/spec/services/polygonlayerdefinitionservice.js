'use strict';

describe('Service: polygonLayerDefinitionService', function() {

  // load the service's module
  beforeEach(module('midjaApp'));

  // instantiate service
  var polygonLayerDefinitionService;
  beforeEach(inject(function(_polygonLayerDefinitionService_) {
    polygonLayerDefinitionService = _polygonLayerDefinitionService_;
  }));

  it('should do something', function() {
    expect(!!polygonLayerDefinitionService).toBe(true);
  });

  // JavaScript
  it('should provide a build function', function() {
    expect(typeof polygonLayerDefinitionService.build).toBe('function');
  });


  it('_generateMapnikSQL should return expectedValue', function() {
    var sql = polygonLayerDefinitionService._generateMapnikSQL(
      "iloc_2011_aust",
      "iloc_code", ['ILOC50400602']);

    expect(sql).toBe(
      'SELECT * ' +
      'FROM iloc_2011_aust ' +
      'WHERE iloc_code IN (\'ILOC50400602\')'
    );
  });

  it('_generateCartoCSS should return expectedValue', function() {
    var style = polygonLayerDefinitionService._generateCartoCSS(
      "iloc_2011_aust",
      "iloc_code", ['ILOC50400602', 'ILOC50400603'],
      function(region) {
        return _.repeat(region[region.length - 1], 6);
      });

    expect(style).toBe([
      '#iloc_2011_aust {' +
      ' polygon-fill: #ffffff;' +
      ' polygon-opacity: 0.70;' +
      ' line-color: #000000;' +
      ' line-width: 1;' +
      ' line-opacity: 1; ' +
      '}',
      '#iloc_2011_aust [iloc_code="ILOC50400602"] { polygon-fill: #222222; }',
      '#iloc_2011_aust [iloc_code="ILOC50400603"] { polygon-fill: #333333; }'
    ].join(" "));
  });



});
