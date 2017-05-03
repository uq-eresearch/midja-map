'use strict';

describe('Service: metadataService', function() {

  // load the service's module
  beforeEach(module('midjaApp'));

  // instantiate service
  var metadataService, $httpBackend;
  beforeEach(inject(function($injector, _metadataService_) {
    $httpBackend = $injector.get('$httpBackend');
    // Tests don't require content, so don't use any
    $httpBackend.when('GET', /.*\.json$/).respond([200, {}]);
    metadataService = _metadataService_;
  }));

  it('should do something', function() {
    expect(!!metadataService).toBe(true);
  });

  it('should provide a getDatasets function', function() {
    expect(typeof metadataService.getDatasets).toBe('function');
  });

  it('getDatasets should return a promise of datasets', function(done) {
    metadataService.getDatasets().then(function(datasets) {
      expect(typeof datasets).toBe('object');
      done();
    }, function(error) {
      expect(error).toBe('');
      done();
    });
    $httpBackend.flush();
  }, 5000);
});
