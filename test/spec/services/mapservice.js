'use strict';

describe('Service: mapService', function() {

  // load the service's module
  beforeEach(module('midjaApp'));

  // instantiate service
  var mapService;
  beforeEach(inject(function(_mapService_) {
    mapService = _mapService_;
  }));

  it('should do something', function() {
    expect(!!mapService).toBe(true);
  });

  it('getFeatureTransformer should return a function', function() {
    var mockResolver = function(v) {
      return v;
    };
    expect(typeof mapService.getFeatureTransformer(mockResolver)).toBe(
      'function');
  });

});
