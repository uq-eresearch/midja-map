'use strict';

describe('Service: polygonLayerDefinitionService', function () {

    // load the service's module
    beforeEach(module('midjaApp'));

    // instantiate service
    var polygonLayerDefinitionService;
    beforeEach(inject(function (_polygonLayerDefinitionService_) {
        polygonLayerDefinitionService = _polygonLayerDefinitionService_;
    }));

    it('should do something', function () {
        expect(!!polygonLayerDefinitionService).toBe(true);
    });

    // JavaScript
    it('should provide a generateSql function', function () {
        expect(typeof polygonLayerDefinitionService.generateSql).toBe('function');
    });


    it('generateSql should return expectedValue', function() {
        var result = polygonLayerDefinitionService.generateSql({
            name: 'iloc_pour_popcount_byindstatus_bysex'
        }, {
            name: 'indigenoustotal_t_percent'
        });

        expect(result).toBe('SELECT iloc_2011_aust.*, iloc_pour_popcount_byindstatus_bysex.indigenoustotal_t_percent ' +
        'FROM iloc_pour_popcount_byindstatus_bysex, iloc_2011_aust ' +
        'WHERE iloc_2011_aust.iloc_code = iloc_pour_popcount_byindstatus_bysex.iloc_code');
    });


    it('should provide a generateCss function', function () {
        expect(typeof polygonLayerDefinitionService.generateCss).toBe('function');
    });

    it('generateCss should return expectedValue', function() {
        var result = polygonLayerDefinitionService.generateCss([
            1.73, 3.43, 6.03, 12.06, 36.02, 90, 100
        ], {
            name: 'iloc_pour_popcount_byindstatus_bysex'
        }, {
            name: 'indigenoustotal_t_percent'
        });

        expect(result).toBe('#iloc_pour_popcount_byindstatus_bysex { polygon-fill: #FFFFB2; polygon-opacity: 0.8; line-color: #FFF; line-width: 1; line-opacity: 1; } #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 100] { polygon-fill: #B10026;}  #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 90] { polygon-fill: #E31A1C;}  #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 36.02] { polygon-fill: #FC4E2A;}  #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 12.06] { polygon-fill: #FD8D3C;}  #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 6.03] { polygon-fill: #FEB24C;}  #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 3.43] { polygon-fill: #FED976;}  #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 1.73] { polygon-fill: #FFFFB2;} ');
    });



});
