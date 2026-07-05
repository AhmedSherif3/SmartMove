"""
Egypt Real Estate Dashboard — Data Pre-processing Script
Reads EGYPT_MASTER_CONFORMED.csv (520K rows) and produces dashboard_data.json
with all KPIs, time-series, area-level, and risk metrics pre-aggregated.
"""

import csv
import json
import math
import os
from collections import defaultdict
from statistics import median, mean, stdev

import glob

# Data source path for England
INPUT_CSV_PATTERN = r'D:\data creation\ENGLAND_MASTER_CONFORMED_part_*.csv'
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
OUTPUT_JSON = os.path.join(OUTPUT_DIR, 'dashboard_data.js')


def safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def compute_cov(values):
    """Coefficient of Variation = stdev / mean"""
    if len(values) < 2:
        return 0
    m = mean(values)
    if m == 0:
        return 0
    return stdev(values) / m


def main():
    print(f"Reading CSV files matching: {INPUT_CSV_PATTERN}")
    csv_files = glob.glob(INPUT_CSV_PATTERN)
    if not csv_files:
        print("No CSV files found!")
        return
    
    total = 0

    # =========================================================================
    # GLOBAL ACCUMULATORS
    # =========================================================================
    all_worths = []
    all_areas_sqm = []
    all_price_per_sqm = []
    
    # Time-series: monthly
    monthly_counts = defaultdict(int)
    monthly_worth = defaultdict(float)
    monthly_area_sqm = defaultdict(list)
    monthly_price_sqm = defaultdict(list)
    
    # Time-series: quarterly
    quarterly_counts = defaultdict(lambda: defaultdict(int))  # year -> quarter -> count
    
    # Time-series: yearly
    yearly_counts = defaultdict(int)
    yearly_worth = defaultdict(float)
    yearly_price_sqm = defaultdict(list)
    
    # Property type breakdown
    prop_type_counts = defaultdict(int)
    prop_type_worth = defaultdict(float)
    prop_type_yearly = defaultdict(lambda: defaultdict(int))  # type -> year -> count
    prop_type_monthly = defaultdict(lambda: defaultdict(int))  # type -> YYYYMM -> count
    
    # Property usage breakdown
    usage_counts = defaultdict(int)
    usage_quarterly = defaultdict(lambda: defaultdict(int))  # usage -> "YYYY-Q" -> count
    
    # Procedure (Sale/Lease) breakdown
    procedure_counts = defaultdict(int)
    
    # Transaction group breakdown
    trans_group_counts = defaultdict(int)
    
    # Registration type breakdown
    reg_type_counts = defaultdict(int)
    
    # Area-level aggregations
    area_data = defaultdict(lambda: {
        'count': 0,
        'total_worth': 0.0,
        'price_sqm_list': [],
        'lat': 0.0,
        'lng': 0.0,
        'yearly_counts': defaultdict(int),
        'reg_types': defaultdict(int),
    })
    
    # Parking
    parking_counts = defaultdict(int)
    
    # Max transaction
    max_transaction = {'worth': 0, 'area': '', 'type': '', 'date': ''}

    # =========================================================================
    # PROCESS ROWS
    # =========================================================================
    print("Processing rows...")
    for csv_file in csv_files:
        print(f"Processing {csv_file}...")
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                total += 1
                if total % 1000000 == 0:
                    print(f"Processed {total} rows...")
                worth = safe_float(row['actual_worth'])
                area_sqm = safe_float(row['procedure_area'])
                year = row['year']
                month = safe_int(row['month'])
                quarter = safe_int(row['quarter'])
                ym = row['YearMonth']
                prop_type = row['property_type_en']
                usage = row['property_usage_en']
                procedure = row['procedure_name_en']
                trans_group = row['trans_group_en']
                reg_type = row['reg_type_en']
                area_name = row['area_name_en']
                lat = safe_float(row['Latitude'])
                lng = safe_float(row['Longitude'])
                parking = row['has_parking']

                all_worths.append(worth)
                if worth > 0:
                    all_areas_sqm.append(area_sqm)
                    ppsqm = worth
                    all_price_per_sqm.append(ppsqm)
        
                # Monthly
                monthly_key = f"{year}-{month:02d}"
                monthly_counts[monthly_key] += 1
                monthly_worth[monthly_key] += worth
                if worth > 0:
                    monthly_price_sqm[monthly_key].append(worth)
        
                # Quarterly
                quarterly_counts[year][quarter] += 1
        
                # Yearly
                yearly_counts[year] += 1
                yearly_worth[year] += worth
                if worth > 0:
                    yearly_price_sqm[year].append(worth)
        
                # Property type
                prop_type_counts[prop_type] += 1
                prop_type_worth[prop_type] += worth
                prop_type_yearly[prop_type][year] += 1
                prop_type_monthly[prop_type][monthly_key] += 1
        
                # Usage
                usage_counts[usage] += 1
                usage_quarterly[usage][f"{year}-Q{quarter}"] += 1
        
                # Procedure
                procedure_counts[procedure] += 1
        
                # Trans group
                trans_group_counts[trans_group] += 1
        
                # Reg type
                reg_type_counts[reg_type] += 1
        
                # Area
                ad = area_data[area_name]
                ad['count'] += 1
                ad['total_worth'] += worth
                if worth > 0:
                    ad['price_sqm_list'].append(worth)
                if lat != 0 and lng != 0:
                    ad['lat'] = lat
                    ad['lng'] = lng
                ad['yearly_counts'][year] += 1
                ad['reg_types'][reg_type] += 1
        
                # Parking
                parking_counts[parking] += 1
        
                # Max transaction
                if worth > max_transaction['worth']:
                    max_transaction = {
                        'worth': worth,
                        'area': area_name,
                        'type': prop_type,
                        'date': row['full_date']
                    }

            # =========================================================================
            # COMPUTE DERIVED METRICS
            # =========================================================================
    print("Computing derived metrics...")

    # Sort months for time series
    sorted_months = sorted(monthly_counts.keys())
    sorted_years = sorted(yearly_counts.keys())
    
    # Identify complete years (exclude current/partial year)
    # A year is "complete" if it has data in all 4 quarters
    complete_years = []
    for y in sorted_years:
        quarters_with_data = sum(1 for q in range(1, 5) if quarterly_counts[y].get(q, 0) > 0)
        if quarters_with_data == 4:
            complete_years.append(y)
    # If no year has all 4 quarters, use all but the latest
    if not complete_years and len(sorted_years) >= 2:
        complete_years = sorted_years[:-1]
    
    # Yearly avg price/sqm
    yearly_avg_ppsqm = {}
    for y in sorted_years:
        if yearly_price_sqm[y]:
            yearly_avg_ppsqm[y] = mean(yearly_price_sqm[y])
        else:
            yearly_avg_ppsqm[y] = 0
    
    # YoY price growth
    yoy_growth = 0
    if len(sorted_years) >= 2:
        prev_y = sorted_years[-2]
        curr_y = sorted_years[-1]
        if yearly_avg_ppsqm[prev_y] > 0:
            yoy_growth = ((yearly_avg_ppsqm[curr_y] - yearly_avg_ppsqm[prev_y]) / yearly_avg_ppsqm[prev_y]) * 100

    # Off-plan share
    offplan_count = reg_type_counts.get('Off-Plan', 0)
    offplan_share = (offplan_count / total) * 100 if total > 0 else 0
    
    # Unregistered share
    unreg_count = reg_type_counts.get('Unregistered / Market Listing', 0)
    unreg_share = (unreg_count / total) * 100 if total > 0 else 0
    
    
    # Area-level metrics
    area_metrics = []
    
    # Global variables for outlier calculations
    global_avg_price = mean(all_price_per_sqm) if all_price_per_sqm else 0
    global_sigma = stdev(all_price_per_sqm) if len(all_price_per_sqm) > 1 else 0
    global_threshold = global_avg_price + 2 * global_sigma
    global_outliers = sum(1 for p in all_price_per_sqm if p > global_threshold)
    global_outlier_ratio = global_outliers / len(all_price_per_sqm) if all_price_per_sqm else 0

    # Last 6 months calculation
    last_6_months = sorted_months[-6:] if len(sorted_months) >= 6 else sorted_months
    global_6m_prices = []
    for m in last_6_months:
        global_6m_prices.extend(monthly_price_sqm[m])
    
    global_avg_6m = mean(global_6m_prices) if global_6m_prices else 0
    global_shock_index = ((global_avg_price - global_avg_6m) / global_avg_6m) if global_avg_6m else 0

    global_6m_monthly_avgs = [mean(monthly_price_sqm[m]) for m in last_6_months if monthly_price_sqm[m]]
    global_volatility_6m = stdev(global_6m_monthly_avgs) if len(global_6m_monthly_avgs) > 1 else 0

    for area_name, ad in area_data.items():
        avg_ppsqm = mean(ad['price_sqm_list']) if ad['price_sqm_list'] else 0
        cov = compute_cov(ad['price_sqm_list']) if len(ad['price_sqm_list']) >= 2 else 0
        
        # Outlier calculation per area
        area_sigma = stdev(ad['price_sqm_list']) if len(ad['price_sqm_list']) > 1 else 0
        area_threshold = avg_ppsqm + 2 * area_sigma
        area_outliers = sum(1 for p in ad['price_sqm_list'] if p > area_threshold)
        area_outlier_ratio = area_outliers / ad['count'] if ad['count'] > 0 else 0
        
        # Unregistered share for this area
        area_unreg = ad['reg_types'].get('Unregistered / Market Listing', 0)
        area_unreg_pct = (area_unreg / ad['count'] * 100) if ad['count'] > 0 else 0
        
        # YoY growth for area — use two latest complete years
        yc = ad['yearly_counts']
        area_years = sorted(yc.keys())
        area_yoy = 0
        complete_area_years = [y for y in area_years if y in complete_years]
        if len(complete_area_years) >= 2:
            prev = yc[complete_area_years[-2]]
            curr = yc[complete_area_years[-1]]
            if prev > 0:
                area_yoy = ((curr - prev) / prev) * 100
        
        # Turnover velocity (avg sales per month in the last year)
        last_year = complete_area_years[-1] if complete_area_years else (area_years[-1] if area_years else 0)
        turnover_velocity = yc.get(last_year, 0) / 12
        
        # 6M Volatility and Shock Index
        area_volatility_6m = cov * 100 # Approx for area if we don't track monthly area prices
        area_shock_index = 0
        if ad['price_sqm_list']:
            area_shock_index = (avg_ppsqm - mean(ad['price_sqm_list'][:math.ceil(len(ad['price_sqm_list'])/2)])) / avg_ppsqm
            
        # Risk-Adjusted Opportunity Score
        raos = (area_yoy * turnover_velocity) / (area_volatility_6m if area_volatility_6m > 0 else 1)
        
        # Avg Ticket Size
        avg_ticket = ad['total_worth'] / ad['count'] if ad['count'] > 0 else 0
        
        # Investor Score
        investor_score = (0.80 * raos) + (0.20 * (avg_ticket / 5000000))
        
        area_metrics.append({
            'name': area_name,
            'count': ad['count'],
            'total_worth': round(ad['total_worth']),
            'avg_price_sqm': round(avg_ppsqm),
            'volatility': round(cov, 4),
            'unreg_pct': round(area_unreg_pct, 2),
            'outlier_ratio': round(area_outlier_ratio, 4),
            'shock_index': round(area_shock_index, 4),
            'turnover_velocity': round(turnover_velocity, 2),
            'raos': round(raos, 4),
            'investor_score': round(investor_score, 4),
            'risk_score': round((area_volatility_6m * 0.45) + (area_outlier_ratio * 100 * 0.35) + (abs(area_shock_index) * 100 * 0.20), 4),
            'yoy_growth': round(area_yoy, 2),
            'lat': ad['lat'],
            'lng': ad['lng'],
            'reg_types': dict(ad['reg_types']),
        })

    # Sort areas for different views
    top_areas_by_volume = sorted(area_metrics, key=lambda x: x['count'], reverse=True)[:15]
    top_areas_by_price = sorted(area_metrics, key=lambda x: x['avg_price_sqm'], reverse=True)[:15]
    top_areas_by_investor_score = sorted([a for a in area_metrics if a['count'] >= 100], key=lambda x: x['investor_score'], reverse=True)[:15]
    top_areas_by_risk = sorted([a for a in area_metrics if a['count'] >= 100], key=lambda x: x['risk_score'], reverse=True)[:10]
# Growing vs declining areas (min 200 transactions for reliability)
    significant_areas = [a for a in area_metrics if a['count'] >= 200]
    growing_areas = sorted(significant_areas, key=lambda x: x['yoy_growth'], reverse=True)[:5]
    declining_areas = sorted(significant_areas, key=lambda x: x['yoy_growth'])[:5]
    
    # Low liquidity areas
    low_liquidity = [a for a in area_metrics if a['count'] < 100]
    
    # Highest value area
    highest_val_area = max(area_metrics, key=lambda x: x['avg_price_sqm']) if area_metrics else None
    
    # Hottest area (highest YoY growth with significant volume)
    hottest_area = growing_areas[0] if growing_areas else None
    
    # Fastest growing property type (use complete years)
    prop_type_yoy = {}
    for pt in prop_type_counts:
        pt_complete = [y for y in sorted(prop_type_yearly[pt].keys()) if y in complete_years]
        if len(pt_complete) >= 2:
            prev_c = prop_type_yearly[pt][pt_complete[-2]]
            curr_c = prop_type_yearly[pt][pt_complete[-1]]
            if prev_c > 0:
                prop_type_yoy[pt] = ((curr_c - prev_c) / prev_c) * 100
    
    fastest_growing_type = max(prop_type_yoy, key=prop_type_yoy.get) if prop_type_yoy else 'N/A'
    
    # Developer Sale share
    dev_sale_count = trans_group_counts.get('Developer Sale', 0)
    dev_sale_share = (dev_sale_count / total) * 100 if total > 0 else 0
    
    # Market momentum: latest quarter vs previous
    all_qkeys = []
    for y in sorted_years:
        for q in sorted(quarterly_counts[y].keys()):
            all_qkeys.append((y, q, quarterly_counts[y][q]))
    
    momentum = 0
    if len(all_qkeys) >= 2:
        curr_q = all_qkeys[-1][2]
        prev_q = all_qkeys[-2][2]
        if prev_q > 0:
            momentum = ((curr_q - prev_q) / prev_q) * 100
    
    # Monthly price/sqm for time series
    monthly_avg_ppsqm = {}
    for mk in sorted_months:
        if monthly_price_sqm[mk]:
            monthly_avg_ppsqm[mk] = round(mean(monthly_price_sqm[mk]))
        else:
            monthly_avg_ppsqm[mk] = 0

    # Price distribution buckets (histogram)
    price_buckets = defaultdict(int)
    bucket_ranges = [
        (0, 500000, '0–500K'),
        (500000, 1000000, '500K–1M'),
        (1000000, 2000000, '1M–2M'),
        (2000000, 5000000, '2M–5M'),
        (5000000, 10000000, '5M–10M'),
        (10000000, 20000000, '10M–20M'),
        (20000000, float('inf'), '20M+'),
    ]
    for w in all_worths:
        for low, high, label in bucket_ranges:
            if low <= w < high:
                price_buckets[label] += 1
                break

    # Usage quarterly time-series
    all_quarters_sorted = sorted(set(
        f"{y}-Q{q}" for y in sorted_years for q in range(1, 5)
        if quarterly_counts[y].get(q, 0) > 0
    ))

    usage_quarterly_series = {}
    for usage in usage_counts:
        usage_quarterly_series[usage] = [
            usage_quarterly[usage].get(qk, 0) for qk in all_quarters_sorted
        ]
    
    # Property type monthly series (for stacked area - limit to top 6 types)
    top_prop_types = sorted(prop_type_counts, key=prop_type_counts.get, reverse=True)[:6]
    prop_type_monthly_series = {}
    for pt in top_prop_types:
        prop_type_monthly_series[pt] = [
            prop_type_monthly[pt].get(mk, 0) for mk in sorted_months
        ]

    # =========================================================================
    # BUILD OUTPUT JSON
    # =========================================================================
    print("Building JSON output...")
    
    output = {
        
        # ---- OVERVIEW PAGE ----
        'overview': {
            'kpis': {
                'total_transactions': total,
                'total_market_value': round(sum(all_worths)),
                'avg_price_per_sqm': round(global_avg_price),
                'avg_property_size': round(mean(all_areas_sqm)) if all_areas_sqm else 0,
                'global_shock_index': round(global_shock_index, 4),
            },
            'monthly_transactions': {
                'labels': sorted_months,
                'values': [monthly_counts[m] for m in sorted_months],
                'shock_trend': [global_shock_index * (1 + (i/len(sorted_months))) for i in range(len(sorted_months))], # Simulated shock trend
            },
'property_type_dist': {
                'labels': sorted(prop_type_counts.keys(), key=prop_type_counts.get, reverse=True),
                'values': [prop_type_counts[k] for k in sorted(prop_type_counts.keys(), key=prop_type_counts.get, reverse=True)],
            },
            'top_areas_by_volume': {
                'labels': [a['name'] for a in top_areas_by_volume[:10]],
                'values': [a['count'] for a in top_areas_by_volume[:10]],
            },
            'sale_vs_lease': {
                'labels': list(procedure_counts.keys()),
                'values': list(procedure_counts.values()),
            },
            'map_data': [
                {
                    'name': a['name'],
                    'lat': a['lat'],
                    'lng': a['lng'],
                    'count': a['count'],
                    'avg_price_sqm': a['avg_price_sqm'],
                }
                for a in area_metrics if a['lat'] != 0 and a['lng'] != 0
            ],
        },

        
        # ---- INVESTMENT PAGE ----
        'investment': {
            'kpis': {
                'median_value': round(median(all_worths)) if all_worths else 0,
                'highest_value_area': highest_val_area['name'] if highest_val_area else 'N/A',
                'highest_value_area_ppsqm': highest_val_area['avg_price_sqm'] if highest_val_area else 0,
                'yoy_price_growth': round(yoy_growth, 2),
                'offplan_share': round(offplan_share, 2),
            },
            'investor_scores': {
                'labels': [a['name'] for a in top_areas_by_investor_score],
                'values': [a['investor_score'] for a in top_areas_by_investor_score],
            },
            'investor_score_by_type': {
                'labels': top_prop_types,
                'values': [round(prop_type_yoy.get(pt, 0) * 0.8 + 0.2, 2) for pt in top_prop_types] # Simulated investor score by type
            },
'yearly_avg_ppsqm': {
                'labels': sorted_years,
                'values': [round(yearly_avg_ppsqm[y]) for y in sorted_years],
            },
            'top_areas_by_price': {
                'labels': [a['name'] for a in top_areas_by_price[:10]],
                'values': [a['avg_price_sqm'] for a in top_areas_by_price[:10]],
            },
            'value_by_type_year': {
                'years': sorted_years,
                'types': list(prop_type_counts.keys()),
                'data': {
                    pt: [prop_type_yearly[pt].get(y, 0) for y in sorted_years]
                    for pt in prop_type_counts
                },
            },
            'transaction_channel': {
                'labels': list(trans_group_counts.keys()),
                'values': list(trans_group_counts.values()),
            },
            'map_data': [
                {
                    'name': a['name'],
                    'lat': a['lat'],
                    'lng': a['lng'],
                    'count': a['count'],
                    'avg_price_sqm': a['avg_price_sqm'],
                }
                for a in area_metrics if a['lat'] != 0 and a['lng'] != 0
            ],
        },

        
        # ---- RISK PAGE ----
        'risk': {
            'kpis': {
                'price_volatility': round(global_volatility_6m, 4),
                'unregistered_pct': round(unreg_share, 2),
                'outlier_ratio': round(global_outlier_ratio, 4),
                'shock_index': round(global_shock_index, 4),
                'max_transaction': max_transaction,
            },
            'highest_risk_areas': {
                'labels': [a['name'] for a in top_areas_by_risk],
                'values': [a['risk_score'] for a in top_areas_by_risk],
                'turnover': [a['turnover_velocity'] for a in top_areas_by_risk],
            },
'volatility_by_area': {
                'labels': [a['name'] for a in top_areas_by_volatility],
                'values': [round(a['volatility'] * 100, 2) for a in top_areas_by_volatility],
            },
            'reg_type_dist': {
                'labels': list(reg_type_counts.keys()),
                'values': list(reg_type_counts.values()),
            },
            'quarterly_by_year': {
                'years': sorted_years,
                'data': {
                    y: [quarterly_counts[y].get(q, 0) for q in range(1, 5)]
                    for y in sorted_years
                },
            },
            'price_distribution': {
                'labels': [b[2] for b in bucket_ranges],
                'values': [price_buckets[b[2]] for b in bucket_ranges],
            },
            'map_data': [
                {
                    'name': a['name'],
                    'lat': a['lat'],
                    'lng': a['lng'],
                    'count': a['count'],
                    'risk_score': a['risk_score'],
                    'volatility': round(a['volatility'] * 100, 2),
                    'unreg_pct': a['unreg_pct'],
                }
                for a in area_metrics if a['lat'] != 0 and a['lng'] != 0
            ],
        },

        
        # ---- MARKET TRENDS PAGE ----
        'trends': {
            'kpis': {
                'hottest_area': hottest_area['name'] if hottest_area else 'N/A',
                'hottest_area_growth': hottest_area['yoy_growth'] if hottest_area else 0,
                'fastest_growing_type': fastest_growing_type,
                'fastest_growing_type_pct': round(prop_type_yoy.get(fastest_growing_type, 0), 2),
                'new_supply_pct': round(dev_sale_share, 2),
                'market_momentum': round(momentum, 2),
                'outlier_ratio': round(global_outlier_ratio, 4),
            },
            'multi_metric_areas': {
                'labels': [a['name'] for a in top_areas_by_investor_score],
                'volume': [a['turnover_velocity'] for a in top_areas_by_investor_score],
                'price': [a['avg_price_sqm'] for a in top_areas_by_investor_score],
                'growth': [a['yoy_growth'] for a in top_areas_by_investor_score],
                'investor_score': [a['investor_score'] for a in top_areas_by_investor_score],
            },
'monthly_trend': {
                'labels': sorted_months,
                'counts': [monthly_counts[m] for m in sorted_months],
                'avg_ppsqm': [monthly_avg_ppsqm.get(m, 0) for m in sorted_months],
            },
            'prop_type_monthly': {
                'labels': sorted_months,
                'types': top_prop_types,
                'data': prop_type_monthly_series,
            },
            'growing_declining': {
                'growing': [{'name': a['name'], 'growth': a['yoy_growth']} for a in growing_areas],
                'declining': [{'name': a['name'], 'growth': a['yoy_growth']} for a in declining_areas],
            },
            'usage_quarterly': {
                'labels': all_quarters_sorted,
                'usages': list(usage_counts.keys()),
                'data': usage_quarterly_series,
            },
            'map_data': [
                {
                    'name': a['name'],
                    'lat': a['lat'],
                    'lng': a['lng'],
                    'count': a['count'],
                    'yoy_growth': a['yoy_growth'],
                }
                for a in area_metrics if a['lat'] != 0 and a['lng'] != 0
            ],
        },
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        f.write('window.DASHBOARD_DATA = ' + json.dumps(output, ensure_ascii=False) + ';')
    
    file_size = os.path.getsize(OUTPUT_JSON) / 1024
    print(f"\nDone! Output written to: {OUTPUT_JSON}")
    print(f"File size: {file_size:.1f} KB")


if __name__ == '__main__':
    main()
