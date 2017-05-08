'use strict';

describe('Service: bubbleLayerDefinitionService', function() {

  // load the service's module
  beforeEach(module('midjaApp'));

  // instantiate service
  var bubbleLayerDefinitionService;
  beforeEach(inject(function(_bubbleLayerDefinitionService_) {
    bubbleLayerDefinitionService = _bubbleLayerDefinitionService_;
  }));

  it('should do something', function() {
    expect(!!bubbleLayerDefinitionService).toBe(true);
  });

  it('should provide a build function', function() {
    expect(typeof bubbleLayerDefinitionService.build).toBe('function');
  });


  it('_generateMapnikSQL should return expectedValue', function() {
    var sql = bubbleLayerDefinitionService._generateMapnikSQL(
      "iloc_2011_aust",
      "iloc_code", ['ILOC50400602']);

    expect(sql).toBe(
      'SELECT iloc_code, ' +
      'ST_Centroid(the_geom) as the_geom, ' +
      'ST_Transform(ST_Centroid(the_geom), 3857) as the_geom_webmercator ' +
      'FROM iloc_2011_aust ' +
      'WHERE iloc_code IN (\'ILOC50400602\')'
    );
  });

  it('_generateCartoCSS should return expectedValue', function() {
    var style = bubbleLayerDefinitionService._generateCartoCSS(
      "iloc_2011_aust",
      "iloc_code", ['ILOC50400602', 'ILOC50400603'],
      function(region) {
        return parseInt(_.repeat(region[region.length - 1], 2));
      });

    expect(style).toBe([
      '#iloc_2011_aust {' +
      ' marker-fill-opacity: 0.70;' +
      ' marker-line-color: #FFF;' +
      ' marker-line-width: 1.5;' +
      ' marker-line-opacity: 1;' +
      ' marker-placement: point;' +
      ' marker-multi-policy: largest;' +
      ' marker-type: ellipse;' +
      ' marker-fill: #3E7BB6;' +
      ' marker-allow-overlap: true;' +
      ' marker-clip: false; ' +
      '}',
      '#iloc_2011_aust [iloc_code="ILOC50400602"] { marker-width: 22; }',
      '#iloc_2011_aust [iloc_code="ILOC50400603"] { marker-width: 33; }'
    ].join(" "));
  });


});
