'use strict';

describe('Service: layerService', function() {

  // load the service's module
  beforeEach(module('midjaApp'));

  // instantiate service
  var layerService;
  beforeEach(inject(function(_layerService_) {
    layerService = _layerService_;
  }));

  it('should do something', function() {
    expect(!!layerService).toBe(true);
  });

});
