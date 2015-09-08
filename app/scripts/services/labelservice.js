'use strict';

/**
 * @ngdoc service
 * @name midjaApp.labelService
 * @description
 * # labelService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
    .factory('labelService', function () {

        return {
            getLabelFromCartoDbName: getLabelFromCartoDbName,
            getLabelFromLocalMapping: getLabelFromLocalMapping
        };

        function getLabelFromCartoDbName(name) {
            var parts = name.split('_');
            parts = _.map(parts, function(part) {
                if(part === 'm') {
                    return 'male';
                }
                if(part === 'f') {
                    return 'female';
                }
                if(part === 'percent') {
                    return '%';
                }
                if(part === 't') {
                    return 'total';
                }
                if(part === 'a') {
                    return 'age';
                }
                if(part === 'indig') {
                    return 'indigenous';
                }
                if(part === 'p') {
                    return 'people';
                }
                if(part === 'totp') {
                    return 'total people';
                }
                return part;
            });
            return parts.join(' ');
        }
        
        function getLabelFromLocalMapping(name) {
            var localMap = {
                "portionatsi": "Percentage of Indigenous persons",
                "vfdif_sa2_nt_indst_nsf": "Visitor from Different SA2 in Northern Territory – Indigenous status not stated females",
                "vfdif_sa2_nt_indst_nsm": "Visitor from Different SA2 in Northern Territory – Indigenous status not stated males",
                "vfdif_sa2_nt_nonind_p": "Visitor from Different SA2 in Northern Territory – Non-Indigenous persons",
                "vfdif_sa2_nt_nonind_f": "Visitor from Different SA2 in Northern Territory – Non-Indigenous females",
                "vfdif_sa2_nt_nonind_m": "Visitor from Different SA2 in Northern Territory – Non-Indigenous males",
                "vfdif_sa2_nt_indig_p": "Visitor from Different SA2 in Northern Territory – Indigenous persons",
                "vfdif_sa2_nt_indig_f": "Visitor from Different SA2 in Northern Territory – Indigenous females",
                "vfdif_sa2_nt_indig_m": "Visitor from Different SA2 in Northern Territory – Indigenous males",
                "vfdif_sa2_tas_totp": "Visitor from Different SA2 in Tasmania – total persons",
                "vfdif_sa2_tas_totf": "Visitor from Different SA2 in Tasmania – total females",
                "vfdif_sa2_tas_totm": "Visitor from Different SA2 in Tasmania – total males",
                "vfdif_sa2_tas_indst_nsp": "Visitor from Different SA2 in Tasmania – Indigenous status not stated persons",
                "vfdif_sa2_tas_indst_nsf": "Visitor from Different SA2 in Tasmania – Indigenous status not stated females",
                "vfdif_sa2_tas_indst_nsm": "Visitor from Different SA2 in Tasmania – Indigenous status not stated males",
                "vfdif_sa2_tas_nonind_p": "Visitor from Different SA2 in Tasmania – Non-Indigenous persons",
                "vfdif_sa2_tas_nonind_f": "Visitor from Different SA2 in Tasmania – Non-Indigenous females",
                "vfdif_sa2_tas_nonind_m": "Visitor from Different SA2 in Tasmania – Non-Indigenous males",
                "vfdif_sa2_tas_indig_p": "Visitor from Different SA2 in Tasmania – Indigenous persons",
                "vfdif_sa2_tas_indig_f": "Visitor from Different SA2 in Tasmania – Indigenous females",
                "vfdif_sa2_tas_indig_m": "Visitor from Different SA2 in Tasmania – Indigenous males",
                "vfdif_sa2_wa_totp": "Visitor from Different SA2 in Western Australia – total persons",
                "vfdif_sa2_wa_totf": "Visitor from Different SA2 in Western Australia – total females",
                "vfdif_sa2_wa_totm": "Visitor from Different SA2 in Western Australia – total males",
                "vfdif_sa2_wa_indst_nsp": "Visitor from Different SA2 in Western Australia – Indigenous status not stated persons",
                "vfdif_sa2_wa_indst_nsf": "Visitor from Different SA2 in Western Australia – Indigenous status not stated females",
                "vfdif_sa2_wa_indst_nsm": "Visitor from Different SA2 in Western Australia – Indigenous status not stated males",
                "vfdif_sa2_wa_nonind_p": "Visitor from Different SA2 in Western Australia – Non-Indigenous persons",
                "vfdif_sa2_wa_nonind_f": "Visitor from Different SA2 in Western Australia – Non-Indigenous females",
                "vfdif_sa2_wa_nonind_m": "Visitor from Different SA2 in Western Australia – Non-Indigenous males",
                "vfdif_sa2_wa_indig_p": "Visitor from Different SA2 in Western Australia – Indigenous persons",
                "vfdif_sa2_wa_indig_f": "Visitor from Different SA2 in Western Australia – Indigenous females",
                "vfdif_sa2_wa_indig_m": "Visitor from Different SA2 in Western Australia – Indigenous males",
                "vfdif_sa2_sa_totp": "Visitor from Different SA2 in South Australia – total persons",
                "vfdif_sa2_sa_totf": "Visitor from Different SA2 in South Australia – total females",
                "vfdif_sa2_sa_totm": "Visitor from Different SA2 in South Australia – total males",
                "vfdif_sa2_sa_indst_nsp": "Visitor from Different SA2 in South Australia – Indigenous status not stated persons",
                "vfdif_sa2_sa_indst_nsf": "Visitor from Different SA2 in South Australia – Indigenous status not stated females",
                "vfdif_sa2_sa_indst_nsm": "Visitor from Different SA2 in South Australia – Indigenous status not stated males",
                "vfdif_sa2_sa_nonind_p": "Visitor from Different SA2 in South Australia – Non-Indigenous persons",
                "vfdif_sa2_sa_nonind_f": "Visitor from Different SA2 in South Australia – Non-Indigenous females",
                "vfdif_sa2_sa_nonind_m": "Visitor from Different SA2 in South Australia – Non-Indigenous males",
                "vfdif_sa2_sa_indig_p": "Visitor from Different SA2 in South Australia – Indigenous persons",
                "vfdif_sa2_sa_indig_f": "Visitor from Different SA2 in South Australia – Indigenous females",
                "vfdif_sa2_sa_indig_m": "Visitor from Different SA2 in South Australia – Indigenous males",
                "vfdif_sa2_qld_totp": "Visitor from Different SA2 in Queensland – total persons",
                "vfdif_sa2_qld_totf": "Visitor from Different SA2 in Queensland – total females",
                "vfdif_sa2_qld_totm": "Visitor from Different SA2 in Queensland – total males",
                "vfdif_sa2_qld_indst_nsp": "Visitor from Different SA2 in Queensland – Indigenous status not stated persons",
                "vfdif_sa2_qld_indst_nsf": "Visitor from Different SA2 in Queensland – Indigenous status not stated females",
                "vfdif_sa2_qld_indst_nsm": "Visitor from Different SA2 in Queensland – Indigenous status not stated males",
                "vfdif_sa2_qld_nonind_p": "Visitor from Different SA2 in Queensland – Non-Indigenous persons",
                "vfdif_sa2_qld_nonind_f": "Visitor from Different SA2 in Queensland – Non-Indigenous females",
                "vfdif_sa2_qld_nonind_m": "Visitor from Different SA2 in Queensland – Non-Indigenous males",
                "vfdif_sa2_qld_indig_p": "Visitor from Different SA2 in Queensland – Indigenous persons",
                "vfdif_sa2_qld_indig_f": "Visitor from Different SA2 in Queensland – Indigenous females",
                "vfdif_sa2_qld_indig_m": "Visitor from Different SA2 in Queensland – Indigenous males",
                "vfdif_sa2_vic_totp": "Visitor from Different SA2 in Victoria – total persons",
                "vfdif_sa2_vic_totf": "Visitor from Different SA2 in Victoria – total females",
                "vfdif_sa2_vic_totm": "Visitor from Different SA2 in Victoria – total males",
                "vfdif_sa2_vic_ind_sta_nsp": "Visitor from Different SA2 in Victoria – Indigenous status not stated persons",
                "vfdif_sa2_vic_ind_sta_nsf": "Visitor from Different SA2 in Victoria – Indigenous status not stated females",
                "vfdif_sa2_vic_ind_sta_nsm": "Visitor from Different SA2 in Victoria – Indigenous status not stated males",
                "vfdif_sa2_vic_nonind_p": "Visitor from Different SA2 in Victoria – Non-Indigenous persons",
                "vfdif_sa2_vic_nonind_f": "Visitor from Different SA2 in Victoria – Non-Indigenous females",
                "vfdif_sa2_vic_nonind_m": "Visitor from Different SA2 in Victoria – Non-Indigenous males",
                "vfdif_sa2_vic_indig_p": "Visitor from Different SA2 in Victoria – Indigenous persons",
                "vfdif_sa2_vic_indig_f": "Visitor from Different SA2 in Victoria – Indigenous females",
                "vfdif_sa2_vic_indig_m": "Visitor from Different SA2 in Victoria – Indigenous males",
                "vfdif_sa2_nsw_totp": "Visitor from Different SA2 in New South Wales – total persons",
                "vfdif_sa2_nsw_totf": "Visitor from Different SA2 in New South Wales – total females",
                "vfdif_sa2_nsw_totm": "Visitor from Different SA2 in New South Wales – total males",
                "vfdif_sa2_nsw_indst_nsp": "Visitor from Different SA2 in New South Wales – Indigenous status not stated persons",
                "vfdif_sa2_nsw_indst_nsf": "Visitor from Different SA2 in New South Wales – Indigenous status not stated females",
                "vfdif_sa2_nsw_indst_nsm": "Visitor from Different SA2 in New South Wales – Indigenous status not stated males",
                "vfdif_sa2_nsw_nonind_p": "Visitor from Different SA2 in New South Wales – Non-Indigenous persons",
                "vfdif_sa2_nsw_nonind_f": "Visitor from Different SA2 in New South Wales – Non-Indigenous females",
                "vfdif_sa2_nsw_nonind_m": "Visitor from Different SA2 in New South Wales – Non-Indigenous males",
                "vfdif_sa2_nsw_indig_p": "Visitor from Different SA2 in New South Wales – Indigenous persons",
                "vfdif_sa2_nsw_indig_f": "Visitor from Different SA2 in New South Wales – Indigenous females",
                "vfdif_sa2_nsw_indig_m": "Visitor from Different SA2 in New South Wales – Indigenous males",
                "vfsme_sa2_totp": "Visitor from Same SA2 – total persons",
                "vfsme_sa2_totf": "Visitor from Same SA2 – total females",
                "vfsme_sa2_totm": "Visitor from Same SA2 – total males",
                "vfsme_sa2_indi_stat_nsp": "Visitor from Same SA2 – Indigenous status not stated persons",
                "vfsme_sa2_indi_stat_nsf": "Visitor from Same SA2 – Indigenous status not stated females",
                "vfsme_sa2_indi_stat_nsm": "Visitor from Same SA2 – Indigenous status not stated males",
                "vfsme_sa2_nonind_p": "Visitor from Same SA2 – Non-Indigenous persons",
                "vfsme_sa2_nonind_f": "Visitor from Same SA2 – Non-Indigenous females",
                "vfsme_sa2_nonind_m": "Visitor from Same SA2 – Non-Indigenous males",
                "vfsme_sa2_indig_p": "Visitor from Same SA2 – Indigenous persons",
                "vfsme_sa2_indig_f": "Visitor from Same SA2 – Indigenous females",
                "vfsme_sa2_indig_m": "Visitor from Same SA2 – Indigenous males",
                "ctd_cn_ewh_aus_totp": "Counted on Census Night elsewhere in Australia – total persons",
                "ctd_cn_ewh_aus_totf": "Counted on Census Night elsewhere in Australia – total females",
                "ctd_cn_ewh_aus_totm": "Counted on Census Night elsewhere in Australia – total males",
                "ct_cn_ew_au_indst_nsp": "Counted on Census Night elsewhere in Australia – Indigenous status not stated persons",
                "ct_cn_ew_au_indst_nsf": "Counted on Census Night elsewhere in Australia – Indigenous status not stated females",
                "ct_cn_ew_au_indst_nsm": "Counted on Census Night elsewhere in Australia – Indigenous status not stated males",
                "ctd_cn_ewh_aus_no_indi_p": "Counted on Census Night elsewhere in Australia – Non-Indigenous persons",
                "ctd_cn_ewh_aus_no_indi_f": "Counted on Census Night elsewhere in Australia – Non-Indigenous females",
                "ctd_cn_ewh_aus_no_indi_m": "Counted on Census Night elsewhere in Australia – Non-Indigenous males",
                "cntd_cn_ewre_aus_indig_p": "Counted on Census Night elsewhere in Australia – Indigenous persons",
                "cntd_cn_ewre_aus_indig_f": "Counted on Census Night elsewhere in Australia – Indigenous females",
                "cntd_cn_ewre_aus_indig_m": "Counted on Census Night elsewhere in Australia – Indigenous males",
                "cntd_cn_home_totp": "Counted on Census Night at home – total persons",
                "cntd_cn_home_totf": "Counted on Census Night at home – total females",
                "cntd_cn_home_totm": "Counted on Census Night at home – total males",
                "ctd_cn_hme_indig_st_nsp": "Counted on Census Night at home – Indigenous status not stated persons",
                "ctd_cn_hme_indig_st_nsf": "Counted on Census Night at home – Indigenous status not stated females",
                "ctd_cn_hme_indig_st_nsm": "Counted on Census Night at home – Indigenous status not stated males",
                "cntd_cn_hme_nonind_p": "Counted on Census Night at home – Non-Indigenous persons",
                "cntd_cn_hme_nonind_f": "Counted on Census Night at home – Non-Indigenous females",
                "cntd_cn_hme_nonind_m": "Counted on Census Night at home – Non-Indigenous males",
                "cntd_cn_home_indig_p": "Counted on Census Night at home – Indigenous persons",
                "cntd_cn_home_indig_f": "Counted on Census Night at home – Indigenous females",
                "cntd_cn_home_indig_m": "Counted on Census Night at home – Indigenous males",
                "a_65_ovr_totp": "Age 65 years old and over – total persons",
                "a_65_ovr_totf": "Age 65 years old and over – total females",
                "a_65_ovr_totm": "Age 65 years old and over – total males",
                "a_65ove_indigstat_nsp": "Age 65 years old and over – Indigenous status not stated persons",
                "a_65ove_indigstat_nsf": "Age 65 years old and over – Indigenous status not stated females",
                "a_65ove_indigstat_nsm": "Age 65 years old and over – Indigenous status not stated males",
                "a_65_ovr_nonind_p": "Age 65 years old and over – Non-Indigenous persons",
                "a_65_ovr_nonind_f": "Age 65 years old and over – Non-Indigenous females",
                "a_65_ovr_nonind_m": "Age 65 years old and over – Non-Indigenous males",
                "a_65_over_indig_p": "Age 65 years old and over – Indigenous persons",
                "a_65_over_indig_f": "Age 65 years old and over – Indigenous females",
                "a_65_over_indig_m": "Age 65 years old and over – Indigenous males",
                "a_45_64_totp": "Age 45-64 years old – total persons",
                "a_45_64_totf": "Age 45-64 years old – total females",
                "a_45_64_totm": "Age 45-64 years old – total males",
                "a_45_64_indigstat_nsp": "Age 45-64 years old – Indigenous status not stated persons",
                "a_45_64_indigstat_nsf": "Age 45-64 years old – Indigenous status not stated females",
                "a_45_64_indigstat_nsm": "Age 45-64 years old – Indigenous status not stated males",
                "a_45_64_nonind_p": "Age 45-64 years old – Non-Indigenous persons",
                "a_45_64_nonind_f": "Age 45-64 years old – Non-Indigenous females",
                "a_45_64_nonind_m": "Age 45-64 years old – Non-Indigenous males",
                "a_45_64_indig_p": "Age 45-64 years old – Indigenous persons",
                "a_45_64_indig_f": "Age 45-64 years old – Indigenous females",
                "a_45_64_indig_m": "Age 45-64 years old – Indigenous males",
                "a_25_44_totp": "Age 25-44 years old – total persons",
                "a_25_44_totf": "Age 25-44 years old – total females",
                "a_25_44_totm": "Age 25-44 years old – total males",
                "a_25_44_indigstat_nsp": "Age 25-44 years old – Indigenous status not stated persons",
                "a_25_44_indigstat_nsf": "Age 25-44 years old – Indigenous status not stated females",
                "a_25_44_indigstat_nsm": "Age 25-44 years old – Indigenous status not stated males",
                "a_25_44_nonind_p": "Age 25-44 years old – Non-Indigenous persons",
                "a_25_44_nonind_f": "Age 25-44 years old – Non-Indigenous females",
                "a_25_44_nonind_m": "Age 25-44 years old – Non-Indigenous males",
                "a_25_44_indig_p": "Age 25-44 years old – Indigenous persons",
                "a_25_44_indig_f": "Age 25-44 years old – Indigenous females",
                "a_25_44_indig_m": "Age 25-44 years old – Indigenous males",
                "a_15_24_totp": "Age 15-24 years old – total persons",
                "a_15_24_totf": "Age 15-24 years old – total females",
                "a_15_24_totm": "Age 15-24 years old – total males",
                "a_15_24_indigstat_nsp": "Age 15-24 years old – Indigenous status not stated persons",
                "a_15_24_indigstat_nsf": "Age 15-24 years old – Indigenous status not stated females",
                "a_15_24_indigstat_nsm": "Age 15-24 years old – Indigenous status not stated males",
                "a_15_24_nonind_p": "Age 15-24 years old – Non-Indigenous persons",
                "a_15_24_nonind_f": "Age 15-24 years old – Non-Indigenous females",
                "a_15_24_nonind_m": "Age 15-24 years old – Non-Indigenous males",
                "a_15_24_indig_p": "Age 15-24 years old – Indigenous persons",
                "a_15_24_indig_f": "Age 15-24 years old – Indigenous females",
                "a_15_24_indig_m": "Age 15-24 years old – Indigenous males",
                "a_5_14_totp": "Age 5-14 years old – total persons",
                "a_5_14_totf": "Age 5-14 years old – total females",
                "a_5_14_totm": "Age 5-14 years old – total males",
                "a_5_14_indigstat_nsp": "Age 5-14 years old – Indigenous status not stated persons",
                "a_5_14_indigstat_nsf": "Age 5-14 years old – Indigenous status not stated females",
                "a_5_14_indigstat_nsm": "Age 5-14 years old – Indigenous status not stated males",
                "a_5_14_nonind_p": "Age 5-14 years old – Non-Indigenous persons",
                "a_5_14_nonind_f": "Age 5-14 years old – Non-Indigenous females",
                "a_5_14_nonind_m": "Age 5-14 years old – Non-Indigenous males",
                "a_5_14_indig_p": "Age 5-14 years old – Indigenous persons",
                "a_5_14_indig_f": "Age 5-14 years old – Indigenous females",
                "a_5_14_indig_m": "Age 5-14 years old – Indigenous males",
                "a_0_4_totp": "Age 0-4 years old – total persons",
                "a_0_4_totf": "Age 0-4 years old – total females",
                "a_0_4_totm": "Age 0-4 years old – total males",
                "a_0_4_indigstat_nsp": "Age 0-4 years old – Indigenous status not stated persons",
                "a_0_4_indigstat_nsf": "Age 0-4 years old – Indigenous status not stated females",
                "a_0_4_indigstat_nsm": "Age 0-4 years old – Indigenous status not stated males",
                "a_0_4_nonind_p": "Age 0-4 years old – Non-Indigenous persons",
                "a_0_4_nonind_f": "Age 0-4 years old – Non-Indigenous females",
                "a_0_4_nonind_m": "Age 0-4 years old – Non-Indigenous males",
                "a_0_4_indig_p": "Age 0-4 years old – Indigenous persons",
                "a_0_4_indig_f": "Age 0-4 years old – Indigenous females",
                "a_0_4_indig_m": "Age 0-4 years old – Indigenous males",
                "tot_p_totp": "Total persons",
                "tot_p_totf": "Total persons – females",
                "tot_p_totm": "Total persons – males",
                "tot_p_indigstat_nsp": "Total persons – Indigenous status not stated persons",
                "tot_p_indigstat_nsf": "Total persons – Indigenous status not stated females",
                "tot_p_indigstat_nsm": "Total persons – Indigenous status not stated males",
                "tot_p_nonind_p": "Total persons – Non-Indigenous persons",
                "tot_p_nonind_f": "Total persons – Non-Indigenous females",
                "tot_p_nonind_m": "Total persons – Non-Indigenous males",
                "tot_p_indig_p": "Total persons – Indigenous persons",
                "tot_p_indig_f": "Total persons – Indigenous females",
                "tot_p_indig_m": "Total persons – Indigenous males",
                "pp_bdrm_tot": "Persons per bedroom",
                "pp_bdrm_nonindig": "Persons per bedroom – Non-Indigenous Households",
                "pp_bdrm_indig": "Persons per bedroom – Indigenous Households",
                "area_albers_sqkm": "Area of region in square kilometers",
                "p_d_n_x_b_tot": "Proportion of dwellings that need 1 or more extra bedrooms",
                "p_d_n_x_b_no_in_p_oth_hh": "Proportion of dwellings that need 1 or more extra bedrooms – Non-Indigenous Households",
                "p_d_n_x_b_in_ps_hh_w_in_p": "Proportion of dwellings that need 1 or more extra bedrooms – Indigenous Households",
                "avg_household_size_tot": "Average household size",
                "avg_hh_si_no_ind_psn_othr_hhd": "Average household size – no Indigenous person in household",
                "av_hh_si_in_ps_hh_wi_ind_psns": "Average household size – Indigenous persons",
                "med_rent_wk_tot": "Median Weekly Rent",
                "me_re_wk_no_in_psns_oth_hh": "Median Weekly Rent – no Indigenous person in household",
                "me_re_wk_in_ps_hh_ind_psns": "Median Weekly Rent – Indigenous persons",
                "med_mort_repay_mth_tot": "Median Monthly mortgage repayment",
                "me_mo_re_mt_no_in_ps_ot_hh": "Median Monthly mortgage repayment – no Indigenous person in household",
                "me_mo_re_mt_in_ps_hh_in_ps": "Median Monthly mortgage repayment – Indigenous persons",
                "med_hhd_inc_wk_tot": "Median Household Income",
                "me_hh_in_wk_no_in_ps_ot_hh": "Median Household Income – no Indigenous person in household",
                "me_hh_in_wk_in_ps_hh_in_ps": "Median Household Income – Indigenous persons",
                "med_psnl_inc_wk_tot": "Median Weekly Personal Income",
                "me_ps_in_wk_no_in_ps_ot_hh": "Median Weekly Personal Income – no Indigenous person in household",
                "me_p_in_wk_in_ps_hh_in_p": "Median Weekly Personal Income – Indigenous persons",
                "med_age_psns_tot": "Median Age",
                "me_ag_ps_n_in_ps_ot_hh": "Median Age – no Indigenous person in household",
                "med_ag_pe_in_pe_h_i_p": "Median Age – Indigenous persons"
            };

            var lbl = localMap[name];
            if(!lbl) {
                lbl = getLabelFromCartoDbName(name);
            }
            return lbl;
        }
    });
