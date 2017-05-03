'use strict';

describe('Service: labelService', function() {

  // load the service's module
  beforeEach(module('midjaApp'));

  // instantiate service
  var labelService;
  beforeEach(inject(function(_labelService_) {
    labelService = _labelService_;
  }));

  it('should do something', function() {
    expect(!!labelService).toBe(true);
  });


  it('should provide a getResolver function', function() {
    expect(typeof labelService.getResolver).toBe('function');
  });


});
