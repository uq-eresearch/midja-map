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

  it('should provide a generateSql function', function() {
    expect(typeof bubbleLayerDefinitionService.generateSql).toBe(
      'function');
  });


  it('generateSql should return expectedValue', function() {
    var result = bubbleLayerDefinitionService.generateSql({
      name: 'iloc_pour_popcount_byindstatus_bysex'
    }, {
      name: 'indigenoustotal_t_percent'
    }, [{
      iloc_code: 'ILOC50400602'
    }]);

    expect(result).toBe(
      'SELECT iloc_2011_aust.iloc_code, iloc_2011_aust.iloc_name, ' +
      'ST_Transform(ST_Centroid(iloc_2011_aust.the_geom), 3857) as the_geom_webmercator, ' +
      'ST_Centroid(iloc_2011_aust.the_geom) as the_geom, ' +
      'iloc_pour_popcount_byindstatus_bysex.indigenoustotal_t_percent FROM iloc_pour_popcount_byindstatus_bysex, ' +
      'iloc_2011_aust WHERE iloc_2011_aust.iloc_code IN (\'ILOC50400602\') ' +
      'AND iloc_2011_aust.iloc_code = iloc_pour_popcount_byindstatus_bysex.iloc_code'
    );
  });



  it('should provide a generateCss function', function() {
    expect(typeof bubbleLayerDefinitionService.generateCss).toBe(
      'function');
  });

  it('generateCss should return expectedValue', function() {
    var breakPoints = [
      1.1, 1.21, 2.4, 3.63, 5.24, 8.2,
      14.24, 28.42, 84.15, 92.02, 100
    ];
    var buckets = _.map(_.range(0, breakPoints.length - 1), function(i) {
      return {
        min: breakPoints[i],
        max: breakPoints[i + 1]
      };
    });

    var result = bubbleLayerDefinitionService.generateCss(
      buckets, {
        name: 'iloc_pour_popcount_byindstatus_bysex'
      }, {
        name: 'indigenoustotal_t_percent'
      });

    expect(result).toBe(
      '#iloc_pour_popcount_byindstatus_bysex { marker-fill-opacity: 0.70; marker-line-color: #FFF; marker-line-width: 1.5; marker-line-opacity: 1; marker-placement: point; marker-multi-policy: largest; marker-type: ellipse; marker-fill: #3E7BB6; marker-allow-overlap: true; marker-clip: false; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 100] { marker-width: 31; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 92.02] { marker-width: 28; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 84.15] { marker-width: 25; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 28.42] { marker-width: 22; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 14.24] { marker-width: 19; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 8.2] { marker-width: 17; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 5.24] { marker-width: 14; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 3.63] { marker-width: 11; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 2.4] { marker-width: 8; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 1.21] { marker-width: 5; }'
    );
  });


});
