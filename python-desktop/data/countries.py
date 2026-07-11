# Countries data with GPS coordinates - 100+ countries
# Each country has multiple GPS points for realistic randomization

COUNTRIES = [
    # ===== Europe (30+) =====
    {"code": "GB", "name": "United Kingdom", "name_cn": "英国", "flag": "🇬🇧", "lat": 51.5074, "lng": -0.1278, "region": "europe",
     "gps_points": [(51.5074, -0.1278), (53.4808, -2.2426), (55.9533, -3.1883), (52.4862, -1.8904), (53.4084, -2.9916)]},
    {"code": "FR", "name": "France", "name_cn": "法国", "flag": "🇫🇷", "lat": 48.8566, "lng": 2.3522, "region": "europe",
     "gps_points": [(48.8566, 2.3522), (43.2965, 5.3698), (45.7640, 4.8357), (43.6047, 1.4442), (47.2184, -1.5536)]},
    {"code": "DE", "name": "Germany", "name_cn": "德国", "flag": "🇩🇪", "lat": 52.5200, "lng": 13.4050, "region": "europe",
     "gps_points": [(52.5200, 13.4050), (48.1351, 11.5820), (50.9375, 6.9603), (53.5511, 9.9937), (51.3397, 12.3731)]},
    {"code": "IT", "name": "Italy", "name_cn": "意大利", "flag": "🇮🇹", "lat": 41.9028, "lng": 12.4964, "region": "europe",
     "gps_points": [(41.9028, 12.4964), (45.4642, 9.1900), (40.8518, 14.2681), (43.7696, 11.2558), (45.4408, 12.3155)]},
    {"code": "ES", "name": "Spain", "name_cn": "西班牙", "flag": "🇪🇸", "lat": 40.4168, "lng": -3.7038, "region": "europe",
     "gps_points": [(40.4168, -3.7038), (41.3874, 2.1686), (39.4699, -0.3763), (37.3891, -5.9845), (43.2630, -2.9350)]},
    {"code": "PT", "name": "Portugal", "name_cn": "葡萄牙", "flag": "🇵🇹", "lat": 38.7223, "lng": -9.1393, "region": "europe",
     "gps_points": [(38.7223, -9.1393), (41.1579, -8.6291), (37.0194, -7.9304)]},
    {"code": "NL", "name": "Netherlands", "name_cn": "荷兰", "flag": "🇳🇱", "lat": 52.3676, "lng": 4.9041, "region": "europe",
     "gps_points": [(52.3676, 4.9041), (51.9244, 4.4777), (52.0907, 5.1214)]},
    {"code": "BE", "name": "Belgium", "name_cn": "比利时", "flag": "🇧🇪", "lat": 50.8503, "lng": 4.3517, "region": "europe",
     "gps_points": [(50.8503, 4.3517), (51.2194, 4.4025), (50.6326, 5.5797)]},
    {"code": "CH", "name": "Switzerland", "name_cn": "瑞士", "flag": "🇨🇭", "lat": 46.9480, "lng": 7.4474, "region": "europe",
     "gps_points": [(46.9480, 7.4474), (47.3769, 8.5417), (46.2044, 6.1432)]},
    {"code": "AT", "name": "Austria", "name_cn": "奥地利", "flag": "🇦🇹", "lat": 48.2082, "lng": 16.3738, "region": "europe",
     "gps_points": [(48.2082, 16.3738), (47.8095, 13.0550), (47.0707, 15.4395)]},
    {"code": "SE", "name": "Sweden", "name_cn": "瑞典", "flag": "🇸🇪", "lat": 59.3293, "lng": 18.0686, "region": "europe",
     "gps_points": [(59.3293, 18.0686), (57.7089, 11.9746), (55.6049, 13.0038)]},
    {"code": "NO", "name": "Norway", "name_cn": "挪威", "flag": "🇳🇴", "lat": 59.9139, "lng": 10.7522, "region": "europe",
     "gps_points": [(59.9139, 10.7522), (60.3913, 5.3221), (63.4305, 10.3951)]},
    {"code": "DK", "name": "Denmark", "name_cn": "丹麦", "flag": "🇩🇰", "lat": 55.6761, "lng": 12.5683, "region": "europe",
     "gps_points": [(55.6761, 12.5683), (56.1629, 10.2039), (57.0488, 9.9217)]},
    {"code": "FI", "name": "Finland", "name_cn": "芬兰", "flag": "🇫🇮", "lat": 60.1699, "lng": 24.9384, "region": "europe",
     "gps_points": [(60.1699, 24.9384), (61.4978, 23.7610), (60.4518, 22.2666)]},
    {"code": "PL", "name": "Poland", "name_cn": "波兰", "flag": "🇵🇱", "lat": 52.2297, "lng": 21.0122, "region": "europe",
     "gps_points": [(52.2297, 21.0122), (50.0647, 19.9450), (51.1079, 17.0385)]},
    {"code": "CZ", "name": "Czech Republic", "name_cn": "捷克", "flag": "🇨🇿", "lat": 50.0755, "lng": 14.4378, "region": "europe",
     "gps_points": [(50.0755, 14.4378), (49.1951, 16.6068), (49.8175, 15.4730)]},
    {"code": "GR", "name": "Greece", "name_cn": "希腊", "flag": "🇬🇷", "lat": 37.9838, "lng": 23.7275, "region": "europe",
     "gps_points": [(37.9838, 23.7275), (40.6401, 22.9444), (35.3387, 25.1442)]},
    {"code": "IE", "name": "Ireland", "name_cn": "爱尔兰", "flag": "🇮🇪", "lat": 53.3498, "lng": -6.2603, "region": "europe",
     "gps_points": [(53.3498, -6.2603), (51.8985, -8.4958), (52.6638, -8.6268)]},
    {"code": "HU", "name": "Hungary", "name_cn": "匈牙利", "flag": "🇭🇺", "lat": 47.4979, "lng": 19.0402, "region": "europe",
     "gps_points": [(47.4979, 19.0402), (47.5203, 19.0435)]},
    {"code": "RO", "name": "Romania", "name_cn": "罗马尼亚", "flag": "🇷🇴", "lat": 44.4268, "lng": 26.1025, "region": "europe",
     "gps_points": [(44.4268, 26.1025), (46.7712, 23.6236)]},
    {"code": "HR", "name": "Croatia", "name_cn": "克罗地亚", "flag": "🇭🇷", "lat": 45.8150, "lng": 15.9819, "region": "europe",
     "gps_points": [(45.8150, 15.9819), (43.5081, 16.4402)]},
    {"code": "SK", "name": "Slovakia", "name_cn": "斯洛伐克", "flag": "🇸🇰", "lat": 48.1486, "lng": 17.1077, "region": "europe",
     "gps_points": [(48.1486, 17.1077)]},
    {"code": "BG", "name": "Bulgaria", "name_cn": "保加利亚", "flag": "🇧🇬", "lat": 42.6977, "lng": 23.3219, "region": "europe",
     "gps_points": [(42.6977, 23.3219)]},
    {"code": "RS", "name": "Serbia", "name_cn": "塞尔维亚", "flag": "🇷🇸", "lat": 44.7866, "lng": 20.4489, "region": "europe",
     "gps_points": [(44.7866, 20.4489)]},
    {"code": "LT", "name": "Lithuania", "name_cn": "立陶宛", "flag": "🇱🇹", "lat": 54.6872, "lng": 25.2797, "region": "europe",
     "gps_points": [(54.6872, 25.2797)]},
    {"code": "LV", "name": "Latvia", "name_cn": "拉脱维亚", "flag": "🇱🇻", "lat": 56.9496, "lng": 24.1052, "region": "europe",
     "gps_points": [(56.9496, 24.1052)]},
    {"code": "EE", "name": "Estonia", "name_cn": "爱沙尼亚", "flag": "🇪🇪", "lat": 59.4370, "lng": 24.7536, "region": "europe",
     "gps_points": [(59.4370, 24.7536)]},
    {"code": "SI", "name": "Slovenia", "name_cn": "斯洛文尼亚", "flag": "🇸🇮", "lat": 46.0569, "lng": 14.5058, "region": "europe",
     "gps_points": [(46.0569, 14.5058)]},
    {"code": "IS", "name": "Iceland", "name_cn": "冰岛", "flag": "🇮🇸", "lat": 64.1466, "lng": -21.9426, "region": "europe",
     "gps_points": [(64.1466, -21.9426)]},
    {"code": "LU", "name": "Luxembourg", "name_cn": "卢森堡", "flag": "🇱🇺", "lat": 49.6116, "lng": 6.1319, "region": "europe",
     "gps_points": [(49.6116, 6.1319)]},
    {"code": "MT", "name": "Malta", "name_cn": "马耳他", "flag": "🇲🇹", "lat": 35.8989, "lng": 14.5146, "region": "europe",
     "gps_points": [(35.8989, 14.5146)]},
    {"code": "CY", "name": "Cyprus", "name_cn": "塞浦路斯", "flag": "🇨🇾", "lat": 35.1264, "lng": 33.4299, "region": "europe",
     "gps_points": [(35.1264, 33.4299)]},

    # ===== Asia (25+) =====
    {"code": "JP", "name": "Japan", "name_cn": "日本", "flag": "🇯🇵", "lat": 35.6762, "lng": 139.6503, "region": "asia",
     "gps_points": [(35.6762, 139.6503), (34.6937, 135.5023), (35.0116, 135.7681), (43.0618, 141.3545), (33.5904, 130.4017)]},
    {"code": "KR", "name": "South Korea", "name_cn": "韩国", "flag": "🇰🇷", "lat": 37.5665, "lng": 126.9780, "region": "asia",
     "gps_points": [(37.5665, 126.9780), (35.1595, 129.0556), (35.8562, 127.1429)]},
    {"code": "TH", "name": "Thailand", "name_cn": "泰国", "flag": "🇹🇭", "lat": 13.7563, "lng": 100.5018, "region": "asia",
     "gps_points": [(13.7563, 100.5018), (13.7246, 100.6331), (7.8804, 98.3923)]},
    {"code": "SG", "name": "Singapore", "name_cn": "新加坡", "flag": "🇸🇬", "lat": 1.3521, "lng": 103.8198, "region": "asia",
     "gps_points": [(1.3521, 103.8198), (1.2834, 103.8607)]},
    {"code": "MY", "name": "Malaysia", "name_cn": "马来西亚", "flag": "🇲🇾", "lat": 3.1390, "lng": 101.6869, "region": "asia",
     "gps_points": [(3.1390, 101.6869), (5.4164, 100.4031), (1.4927, 103.7414)]},
    {"code": "ID", "name": "Indonesia", "name_cn": "印度尼西亚", "flag": "🇮🇩", "lat": -6.2088, "lng": 106.8456, "region": "asia",
     "gps_points": [(-6.2088, 106.8456), (-8.3405, 115.0920), (-7.7956, 110.3695)]},
    {"code": "PH", "name": "Philippines", "name_cn": "菲律宾", "flag": "🇵🇭", "lat": 14.5995, "lng": 120.9842, "region": "asia",
     "gps_points": [(14.5995, 120.9842), (10.3157, 123.8854)]},
    {"code": "VN", "name": "Vietnam", "name_cn": "越南", "flag": "🇻🇳", "lat": 21.0285, "lng": 105.8542, "region": "asia",
     "gps_points": [(21.0285, 105.8542), (10.8231, 106.6297), (16.4637, 107.5909)]},
    {"code": "IN", "name": "India", "name_cn": "印度", "flag": "🇮🇳", "lat": 28.6139, "lng": 77.2090, "region": "asia",
     "gps_points": [(28.6139, 77.2090), (19.0760, 72.8777), (13.0827, 80.2707), (22.5726, 88.3639)]},
    {"code": "CN", "name": "China", "name_cn": "中国", "flag": "🇨🇳", "lat": 39.9042, "lng": 116.4074, "region": "asia",
     "gps_points": [(39.9042, 116.4074), (31.2304, 121.4737), (23.1291, 113.2644), (30.5728, 104.0668)]},
    {"code": "KH", "name": "Cambodia", "name_cn": "柬埔寨", "flag": "🇰🇭", "lat": 11.5564, "lng": 104.9282, "region": "asia",
     "gps_points": [(11.5564, 104.9282)]},
    {"code": "MM", "name": "Myanmar", "name_cn": "缅甸", "flag": "🇲🇲", "lat": 16.8661, "lng": 96.1951, "region": "asia",
     "gps_points": [(16.8661, 96.1951)]},
    {"code": "NP", "name": "Nepal", "name_cn": "尼泊尔", "flag": "🇳🇵", "lat": 27.7172, "lng": 85.3240, "region": "asia",
     "gps_points": [(27.7172, 85.3240)]},
    {"code": "LK", "name": "Sri Lanka", "name_cn": "斯里兰卡", "flag": "🇱🇰", "lat": 6.9271, "lng": 79.8612, "region": "asia",
     "gps_points": [(6.9271, 79.8612)]},
    {"code": "PK", "name": "Pakistan", "name_cn": "巴基斯坦", "flag": "🇵🇰", "lat": 33.6844, "lng": 73.0479, "region": "asia",
     "gps_points": [(33.6844, 73.0479), (24.8607, 67.0011)]},
    {"code": "BD", "name": "Bangladesh", "name_cn": "孟加拉国", "flag": "🇧🇩", "lat": 23.8103, "lng": 90.4125, "region": "asia",
     "gps_points": [(23.8103, 90.4125)]},
    {"code": "TW", "name": "Taiwan", "name_cn": "中国台湾", "flag": "🇹🇼", "lat": 25.0330, "lng": 121.5654, "region": "asia",
     "gps_points": [(25.0330, 121.5654), (22.6273, 120.3014)]},
    {"code": "HK", "name": "Hong Kong", "name_cn": "中国香港", "flag": "🇭🇰", "lat": 22.3193, "lng": 114.1694, "region": "asia",
     "gps_points": [(22.3193, 114.1694)]},
    {"code": "MN", "name": "Mongolia", "name_cn": "蒙古", "flag": "🇲🇳", "lat": 47.8864, "lng": 106.9057, "region": "asia",
     "gps_points": [(47.8864, 106.9057)]},
    {"code": "LA", "name": "Laos", "name_cn": "老挝", "flag": "🇱🇦", "lat": 17.9757, "lng": 102.6331, "region": "asia",
     "gps_points": [(17.9757, 102.6331)]},

    # ===== Americas (15+) =====
    {"code": "US", "name": "United States", "name_cn": "美国", "flag": "🇺🇸", "lat": 40.7128, "lng": -74.0060, "region": "americas",
     "gps_points": [(40.7128, -74.0060), (34.0522, -118.2437), (41.8781, -87.6298), (29.7604, -95.3698), (25.7617, -80.1918)]},
    {"code": "CA", "name": "Canada", "name_cn": "加拿大", "flag": "🇨🇦", "lat": 45.4215, "lng": -75.6972, "region": "americas",
     "gps_points": [(45.4215, -75.6972), (43.6532, -79.3832), (49.2827, -123.1207), (51.0447, -114.0719)]},
    {"code": "MX", "name": "Mexico", "name_cn": "墨西哥", "flag": "🇲🇽", "lat": 19.4326, "lng": -99.1332, "region": "americas",
     "gps_points": [(19.4326, -99.1332), (20.6597, -89.6268)]},
    {"code": "BR", "name": "Brazil", "name_cn": "巴西", "flag": "🇧🇷", "lat": -23.5505, "lng": -46.6333, "region": "americas",
     "gps_points": [(-23.5505, -46.6333), (-22.9068, -43.1729), (-15.7975, -47.8919)]},
    {"code": "AR", "name": "Argentina", "name_cn": "阿根廷", "flag": "🇦🇷", "lat": -34.6037, "lng": -58.3816, "region": "americas",
     "gps_points": [(-34.6037, -58.3816)]},
    {"code": "CO", "name": "Colombia", "name_cn": "哥伦比亚", "flag": "🇨🇴", "lat": 4.7110, "lng": -74.0721, "region": "americas",
     "gps_points": [(4.7110, -74.0721)]},
    {"code": "PE", "name": "Peru", "name_cn": "秘鲁", "flag": "🇵🇪", "lat": -12.0464, "lng": -77.0428, "region": "americas",
     "gps_points": [(-12.0464, -77.0428)]},
    {"code": "CL", "name": "Chile", "name_cn": "智利", "flag": "🇨🇱", "lat": -33.4489, "lng": -70.6693, "region": "americas",
     "gps_points": [(-33.4489, -70.6693)]},
    {"code": "CU", "name": "Cuba", "name_cn": "古巴", "flag": "🇨🇺", "lat": 23.1136, "lng": -82.3666, "region": "americas",
     "gps_points": [(23.1136, -82.3666)]},
    {"code": "CR", "name": "Costa Rica", "name_cn": "哥斯达黎加", "flag": "🇨🇷", "lat": 9.9281, "lng": -84.0907, "region": "americas",
     "gps_points": [(9.9281, -84.0907)]},
    {"code": "PA", "name": "Panama", "name_cn": "巴拿马", "flag": "🇵🇦", "lat": 8.9824, "lng": -79.5199, "region": "americas",
     "gps_points": [(8.9824, -79.5199)]},
    {"code": "EC", "name": "Ecuador", "name_cn": "厄瓜多尔", "flag": "🇪🇨", "lat": -0.1807, "lng": -78.4678, "region": "americas",
     "gps_points": [(-0.1807, -78.4678)]},
    {"code": "VE", "name": "Venezuela", "name_cn": "委内瑞拉", "flag": "🇻🇪", "lat": 10.4806, "lng": -66.9036, "region": "americas",
     "gps_points": [(10.4806, -66.9036)]},
    {"code": "DO", "name": "Dominican Republic", "name_cn": "多米尼加", "flag": "🇩🇴", "lat": 18.4861, "lng": -69.9312, "region": "americas",
     "gps_points": [(18.4861, -69.9312)]},
    {"code": "JM", "name": "Jamaica", "name_cn": "牙买加", "flag": "🇯🇲", "lat": 18.1096, "lng": -76.7975, "region": "americas",
     "gps_points": [(18.1096, -76.7975)]},

    # ===== Oceania (5+) =====
    {"code": "AU", "name": "Australia", "name_cn": "澳大利亚", "flag": "🇦🇺", "lat": -33.8688, "lng": 151.2093, "region": "oceania",
     "gps_points": [(-33.8688, 151.2093), (-37.8136, 144.9631), (-27.4698, 153.0251), (-31.9505, 115.8605)]},
    {"code": "NZ", "name": "New Zealand", "name_cn": "新西兰", "flag": "🇳🇿", "lat": -36.8485, "lng": 174.7633, "region": "oceania",
     "gps_points": [(-36.8485, 174.7633), (-43.5321, 172.6362)]},
    {"code": "FJ", "name": "Fiji", "name_cn": "斐济", "flag": "🇫🇯", "lat": -18.1248, "lng": 178.4501, "region": "oceania",
     "gps_points": [(-18.1248, 178.4501)]},

    # ===== Middle East & Africa (15+) =====
    {"code": "AE", "name": "UAE", "name_cn": "阿联酋", "flag": "🇦🇪", "lat": 25.2048, "lng": 55.2708, "region": "mideast_africa",
     "gps_points": [(25.2048, 55.2708), (24.4539, 54.3773)]},
    {"code": "SA", "name": "Saudi Arabia", "name_cn": "沙特阿拉伯", "flag": "🇸🇦", "lat": 24.7136, "lng": 46.6753, "region": "mideast_africa",
     "gps_points": [(24.7136, 46.6753), (21.3891, 39.8579)]},
    {"code": "IL", "name": "Israel", "name_cn": "以色列", "flag": "🇮🇱", "lat": 31.7683, "lng": 35.2137, "region": "mideast_africa",
     "gps_points": [(31.7683, 35.2137)]},
    {"code": "TR", "name": "Turkey", "name_cn": "土耳其", "flag": "🇹🇷", "lat": 41.0082, "lng": 28.9784, "region": "mideast_africa",
     "gps_points": [(41.0082, 28.9784), (38.4237, 27.1428)]},
    {"code": "EG", "name": "Egypt", "name_cn": "埃及", "flag": "🇪🇬", "lat": 30.0444, "lng": 31.2357, "region": "mideast_africa",
     "gps_points": [(30.0444, 31.2357), (31.2001, 29.9187)]},
    {"code": "ZA", "name": "South Africa", "name_cn": "南非", "flag": "🇿🇦", "lat": -33.9249, "lng": 18.4241, "region": "mideast_africa",
     "gps_points": [(-33.9249, 18.4241), (-26.2041, 28.0473)]},
    {"code": "KE", "name": "Kenya", "name_cn": "肯尼亚", "flag": "🇰🇪", "lat": -1.2921, "lng": 36.8219, "region": "mideast_africa",
     "gps_points": [(-1.2921, 36.8219)]},
    {"code": "NG", "name": "Nigeria", "name_cn": "尼日利亚", "flag": "🇳🇬", "lat": 6.5244, "lng": 3.3792, "region": "mideast_africa",
     "gps_points": [(6.5244, 3.3792)]},
    {"code": "MA", "name": "Morocco", "name_cn": "摩洛哥", "flag": "🇲🇦", "lat": 33.9716, "lng": -6.8498, "region": "mideast_africa",
     "gps_points": [(33.9716, -6.8498), (31.6295, -7.9811)]},
    {"code": "QA", "name": "Qatar", "name_cn": "卡塔尔", "flag": "🇶🇦", "lat": 25.2854, "lng": 51.5310, "region": "mideast_africa",
     "gps_points": [(25.2854, 51.5310)]},
    {"code": "JO", "name": "Jordan", "name_cn": "约旦", "flag": "🇯🇴", "lat": 31.9454, "lng": 35.9284, "region": "mideast_africa",
     "gps_points": [(31.9454, 35.9284)]},
    {"code": "LB", "name": "Lebanon", "name_cn": "黎巴嫩", "flag": "🇱🇧", "lat": 33.8938, "lng": 35.5018, "region": "mideast_africa",
     "gps_points": [(33.8938, 35.5018)]},
    {"code": "OM", "name": "Oman", "name_cn": "阿曼", "flag": "🇴🇲", "lat": 23.5880, "lng": 58.3829, "region": "mideast_africa",
     "gps_points": [(23.5880, 58.3829)]},
    {"code": "BH", "name": "Bahrain", "name_cn": "巴林", "flag": "🇧🇭", "lat": 26.2285, "lng": 50.5860, "region": "mideast_africa",
     "gps_points": [(26.2285, 50.5860)]},
    {"code": "KW", "name": "Kuwait", "name_cn": "科威特", "flag": "🇰🇼", "lat": 29.3759, "lng": 47.9774, "region": "mideast_africa",
     "gps_points": [(29.3759, 47.9774)]},
    {"code": "TZ", "name": "Tanzania", "name_cn": "坦桑尼亚", "flag": "🇹🇿", "lat": -6.7924, "lng": 39.2083, "region": "mideast_africa",
     "gps_points": [(-6.7924, 39.2083)]},
    {"code": "GH", "name": "Ghana", "name_cn": "加纳", "flag": "🇬🇭", "lat": 5.6037, "lng": -0.1870, "region": "mideast_africa",
     "gps_points": [(5.6037, -0.1870)]},
    {"code": "ET", "name": "Ethiopia", "name_cn": "埃塞俄比亚", "flag": "🇪🇹", "lat": 9.0320, "lng": 38.7469, "region": "mideast_africa",
     "gps_points": [(9.0320, 38.7469)]},
]

REGIONS = {
    "europe": "欧洲",
    "asia": "亚洲",
    "americas": "美洲",
    "oceania": "大洋洲",
    "mideast_africa": "中东非洲",
}

def get_countries_by_region(region):
    """Get countries filtered by region"""
    return [c for c in COUNTRIES if c["region"] == region]

def get_country_by_code(code):
    """Get country by country code"""
    for c in COUNTRIES:
        if c["code"] == code:
            return c
    return None

def search_countries(query):
    """Search countries by name or code"""
    query = query.lower()
    return [c for c in COUNTRIES if 
            query in c["name"].lower() or 
            query in c["name_cn"] or 
            query in c["code"].lower()]

def get_random_gps(country):
    """Get a random GPS point within the country"""
    import random
    points = country.get("gps_points", [(country["lat"], country["lng"])])
    base_lat, base_lng = random.choice(points)
    # Add small random offset (±0.05 degrees, about ±5km)
    lat = base_lat + random.uniform(-0.05, 0.05)
    lng = base_lng + random.uniform(-0.05, 0.05)
    return lat, lng
