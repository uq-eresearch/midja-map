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
  it('should provide a generateSql function', function() {
    expect(typeof polygonLayerDefinitionService.generateSql).toBe(
      'function');
  });


  it('generateSql should return expectedValue', function() {
    var result = polygonLayerDefinitionService.generateSql({
      name: 'iloc_pour_popcount_byindstatus_bysex'
    }, {
      name: 'indigenoustotal_t_percent'
    }, [{
      iloc_code: 'ILOC50400602'
    }]);

    expect(result).toBe(
      'SELECT iloc_2011_aust.*, iloc_pour_popcount_byindstatus_bysex.indigenoustotal_t_percent ' +
      'FROM iloc_pour_popcount_byindstatus_bysex, iloc_2011_aust ' +
      'WHERE iloc_2011_aust.iloc_code IN (\'ILOC50400602\') AND ' +
      'iloc_2011_aust.iloc_code = iloc_pour_popcount_byindstatus_bysex.iloc_code'
    );
  });


  it('should provide a generateCss function', function() {
    expect(typeof polygonLayerDefinitionService.generateCss).toBe(
      'function');
  });

  it('generateCss should return expectedValue', function() {
    var breakPoints = [1.2, 1.73, 3.43, 12.06, 100];
    var colors = palette('cb-YlOrBr', breakPoints.length - 1);
    var buckets = _.map(_.range(0, breakPoints.length - 1), function(i) {
      return {
        min: breakPoints[i],
        max: breakPoints[i + 1],
        color: colors[i]
      };
    });

    var result = polygonLayerDefinitionService.generateCss(buckets, {
      name: 'iloc_pour_popcount_byindstatus_bysex'
    }, {
      name: 'indigenoustotal_t_percent'
    });

    expect(result).toBe(
      '#iloc_pour_popcount_byindstatus_bysex { polygon-fill: #000000; polygon-opacity: 0.70; line-color: #000000; line-width: 1; line-opacity: 1; } ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 100] { polygon-fill: #cc4c02;} ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 12.06] { polygon-fill: #fe9929;} ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 3.43] { polygon-fill: #fed98e;} ' +
      '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 1.73] { polygon-fill: #ffffd4;}'
    );
  });



});
