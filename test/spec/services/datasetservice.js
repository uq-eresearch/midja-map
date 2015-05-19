'use strict';

describe('Service: datasetService', function () {

    // load the service's module
    beforeEach(module('midjaApp'));

    beforeEach(module(function ($provide) {
            $provide.factory('dataService', function ($q) {
                return {
                    getTables: jasmine.createSpy('getTables').and.callFake(getTables)
                };

                function getTables() {
                    return $q.when([
                        {
                            id: '83d19832-e334-11e4-90e7-fa163e1887ab',
                            name: 'untitled_table_3',
                            map_id: '9f066304-a4cc-48ac-8093-9df1f1f36201',
                            active_layer_id: null,
                            type: 'table',
                            tags: [],
                            description: null,
                            privacy: 'PRIVATE',

                            created_at: '2015-04-15T05:59:01+00:00',
                            updated_at: '2015-04-15T05:59:01+00:00',
                            table: {
                                id: 'ea335b7f-f164-46e2-b6e9-64b218321844',
                                name: 'untitled_table_3',
                                privacy: 'PRIVATE',
                                updated_at: '2015-04-15T05:59:01+00:00',
                                size: 16384,
                                row_count: 0
                            },
                            synchronization: null
                        },
                        {
                            id: '0c67b4b6-e19f-11e4-a003-fa163e1887ab',
                            name: 'iloc_merged_dataset',
                            map_id: '5f9d2393-601c-4780-8b03-8b9ea87e1106',
                            active_layer_id: 'c5ffc45e-f7b9-454b-9df4-0dd4dde59f19',
                            type: 'table',
                            tags: [],
                            description: null,
                            privacy: 'PRIVATE',

                            created_at: '2015-04-13T05:36:35+00:00',
                            updated_at: '2015-04-13T05:36:38+00:00',
                            table: {
                                id: '91bc8049-683a-42b3-aaa7-0c8256595fa8',
                                name: 'iloc_merged_dataset',
                                privacy: 'PRIVATE',
                                updated_at: '2015-04-13T05:36:35+00:00',
                                size: 1433600,
                                row_count: 1097
                            },
                            synchronization: null
                        },
                        {
                            id: 'cdcab930-d733-11e4-9621-fa163e1887ab',
                            name: 'lga_poe_avg_persons_per_bedroom_2006',
                            map_id: 'ee82ee0a-1b20-4d5f-9eec-ef8ccc7150ac',
                            active_layer_id: 'f6f7357f-8f57-42b5-a1ab-d83278f005c5',
                            type: 'table',
                            tags: [],
                            description: null,
                            privacy: 'PRIVATE',

                            created_at: '2015-03-30T23:23:42+00:00',
                            updated_at: '2015-04-13T05:20:58+00:00',
                            table: {
                                id: 'ec07917e-1b32-4613-90df-bcb50fe3412e',
                                name: 'lga_poe_avg_persons_per_bedroom_2006',
                                privacy: 'PRIVATE',
                                updated_at: '2015-03-30T23:23:42+00:00',
                                size: 81920,
                                row_count: 568
                            },
                            synchronization: null
                        }
                    ]);
                }
            });
        })
    );

// instantiate service
    var datasetService;
    var $rootScope;
    beforeEach(inject(function (_datasetService_, _$rootScope_) {
        datasetService = _datasetService_;
        $rootScope = _$rootScope_;
    }));

    it('should do something', function () {
        expect(!!datasetService).toBe(true);
    });

    it('should provide a getDatasets function', function () {
        expect(typeof datasetService.getDatasets).toBe('function');
    });

    it('getDatasets should return expected value', function () {
        var result;
        datasetService.getDatasets().then(getDatasetsComplete);
        //expect(datasetService.getTables).toHaveBeenCalled();
        $rootScope.$digest();

        function getDatasetsComplete(datasets) {
            result = datasets;
            expect(result.length).toBe(2);
        }
    });

    it('should provide a getColumns functions', function () {
        expect(typeof datasetService.getColumns).toBe('function');
    });
});