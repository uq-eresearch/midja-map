'use strict';

describe('Service: mapService', function () {

    // load the service's module
    beforeEach(module('midjaApp'));

    // instantiate service
    var mapService;
    beforeEach(inject(function (_mapService_) {
        mapService = _mapService_;
    }));

    it('should do something', function () {
        expect(!!mapService).toBe(true);
    });

    // JavaScript
    it('should provide a generateSql function', function () {
        expect(typeof mapService.generateSql).toBe('function');
    });


    it('generateSql should return expectedValue', function() {
        var result = mapService.generateSql({
            name: 'iloc_pour_popcount_byindstatus_bysex'
        }, {
            name: 'indigenoustotal_t_percent'
        });

        expect(result).toBe('SELECT iloc_2011_aust.*, iloc_pour_popcount_byindstatus_bysex.indigenoustotal_t_percent ' +
        'FROM iloc_pour_popcount_byindstatus_bysex, iloc_2011_aust ' +
        'WHERE iloc_2011_aust.iloc_code = iloc_pour_popcount_byindstatus_bysex.iloc_code');
    });

    it('should provide a generateCartoCss function', function () {
        expect(typeof mapService.generateCartoCss).toBe('function');
    });

    it('generateCartoCss should return expectedValue', function() {
        var result = mapService.generateCartoCss([
            1.73, 3.43, 6.03, 12.06, 36.02, 90, 100
        ], {
            name: 'iloc_pour_popcount_byindstatus_bysex'
        }, {
            name: 'indigenoustotal_t_percent'
        });

        expect(result).toBe('#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 1.73] { polygon-fill: #B10026;} #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 3.43] { polygon-fill: #E31A1C;} #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 6.03] { polygon-fill: #FC4E2A;} #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 12.06] { polygon-fill: #FD8D3C;} #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 36.02] { polygon-fill: #FEB24C;} #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 90] { polygon-fill: #FED976;} #iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 100] { polygon-fill: #FFFFB2;}');
    });

    it('should provide a generateBubbleCss function', function() {
       expect(typeof mapService.generateBubbleCss).toBe('function');
    });

    it('generateBubbleCss should return expectedValue', function() {
        var result = mapService.generateBubbleCss([
            1.21, 2.4, 3.63, 5.24, 8.2, 14.24, 28.42, 84.15, 92.02, 100
        ], {
            name: 'iloc_pour_popcount_byindstatus_bysex'
        }, {
            name: 'indigenoustotal_t_percent'
        });

        expect(result).toBe('');
    });


});
