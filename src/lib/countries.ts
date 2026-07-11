export interface CountryInfo {
  code: string;
  name: string;
  nameEn: string;
  region: string;
  gps: {
    lat: number;
    lng: number;
  };
}

// Convert country code to flag emoji
export function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1a9 + c.charCodeAt(0)))
    .join('');
}

export const REGIONS = [
  { key: 'europe', label: '欧洲' },
  { key: 'asia', label: '亚洲' },
  { key: 'americas', label: '美洲' },
  { key: 'oceania', label: '大洋洲' },
  { key: 'mena', label: '中东/非洲' },
];

export const COUNTRIES: CountryInfo[] = [
  // ===== 欧洲 (44) =====
  { code: 'GB', name: '英国', nameEn: 'United Kingdom', region: 'europe', gps: { lat: 51.5074, lng: -0.1278 } },
  { code: 'FR', name: '法国', nameEn: 'France', region: 'europe', gps: { lat: 48.8566, lng: 2.3522 } },
  { code: 'DE', name: '德国', nameEn: 'Germany', region: 'europe', gps: { lat: 52.5200, lng: 13.4050 } },
  { code: 'IT', name: '意大利', nameEn: 'Italy', region: 'europe', gps: { lat: 41.9028, lng: 12.4964 } },
  { code: 'ES', name: '西班牙', nameEn: 'Spain', region: 'europe', gps: { lat: 40.4168, lng: -3.7038 } },
  { code: 'PT', name: '葡萄牙', nameEn: 'Portugal', region: 'europe', gps: { lat: 38.7223, lng: -9.1393 } },
  { code: 'NL', name: '荷兰', nameEn: 'Netherlands', region: 'europe', gps: { lat: 52.3676, lng: 4.9041 } },
  { code: 'BE', name: '比利时', nameEn: 'Belgium', region: 'europe', gps: { lat: 50.8503, lng: 4.3517 } },
  { code: 'CH', name: '瑞士', nameEn: 'Switzerland', region: 'europe', gps: { lat: 46.9480, lng: 7.4474 } },
  { code: 'AT', name: '奥地利', nameEn: 'Austria', region: 'europe', gps: { lat: 48.2082, lng: 16.3738 } },
  { code: 'SE', name: '瑞典', nameEn: 'Sweden', region: 'europe', gps: { lat: 59.3293, lng: 18.0686 } },
  { code: 'NO', name: '挪威', nameEn: 'Norway', region: 'europe', gps: { lat: 59.9139, lng: 10.7522 } },
  { code: 'DK', name: '丹麦', nameEn: 'Denmark', region: 'europe', gps: { lat: 55.6761, lng: 12.5683 } },
  { code: 'FI', name: '芬兰', nameEn: 'Finland', region: 'europe', gps: { lat: 60.1699, lng: 24.9384 } },
  { code: 'IS', name: '冰岛', nameEn: 'Iceland', region: 'europe', gps: { lat: 64.1466, lng: -21.9426 } },
  { code: 'IE', name: '爱尔兰', nameEn: 'Ireland', region: 'europe', gps: { lat: 53.3498, lng: -6.2603 } },
  { code: 'PL', name: '波兰', nameEn: 'Poland', region: 'europe', gps: { lat: 52.2297, lng: 21.0122 } },
  { code: 'CZ', name: '捷克', nameEn: 'Czech Republic', region: 'europe', gps: { lat: 50.0755, lng: 14.4378 } },
  { code: 'SK', name: '斯洛伐克', nameEn: 'Slovakia', region: 'europe', gps: { lat: 48.1486, lng: 17.1077 } },
  { code: 'HU', name: '匈牙利', nameEn: 'Hungary', region: 'europe', gps: { lat: 47.4979, lng: 19.0402 } },
  { code: 'RO', name: '罗马尼亚', nameEn: 'Romania', region: 'europe', gps: { lat: 44.4268, lng: 26.1025 } },
  { code: 'BG', name: '保加利亚', nameEn: 'Bulgaria', region: 'europe', gps: { lat: 42.6977, lng: 23.3219 } },
  { code: 'GR', name: '希腊', nameEn: 'Greece', region: 'europe', gps: { lat: 37.9838, lng: 23.7275 } },
  { code: 'HR', name: '克罗地亚', nameEn: 'Croatia', region: 'europe', gps: { lat: 45.8150, lng: 15.9819 } },
  { code: 'SI', name: '斯洛文尼亚', nameEn: 'Slovenia', region: 'europe', gps: { lat: 46.0569, lng: 14.5058 } },
  { code: 'RS', name: '塞尔维亚', nameEn: 'Serbia', region: 'europe', gps: { lat: 44.7866, lng: 20.4489 } },
  { code: 'BA', name: '波黑', nameEn: 'Bosnia & Herzegovina', region: 'europe', gps: { lat: 43.8563, lng: 18.4131 } },
  { code: 'ME', name: '黑山', nameEn: 'Montenegro', region: 'europe', gps: { lat: 42.4304, lng: 19.2594 } },
  { code: 'MK', name: '北马其顿', nameEn: 'North Macedonia', region: 'europe', gps: { lat: 41.9973, lng: 21.4280 } },
  { code: 'AL', name: '阿尔巴尼亚', nameEn: 'Albania', region: 'europe', gps: { lat: 41.3275, lng: 19.8187 } },
  { code: 'EE', name: '爱沙尼亚', nameEn: 'Estonia', region: 'europe', gps: { lat: 59.4370, lng: 24.7536 } },
  { code: 'LV', name: '拉脱维亚', nameEn: 'Latvia', region: 'europe', gps: { lat: 56.9496, lng: 24.1052 } },
  { code: 'LT', name: '立陶宛', nameEn: 'Lithuania', region: 'europe', gps: { lat: 54.6872, lng: 25.2797 } },
  { code: 'UA', name: '乌克兰', nameEn: 'Ukraine', region: 'europe', gps: { lat: 50.4501, lng: 30.5234 } },
  { code: 'BY', name: '白俄罗斯', nameEn: 'Belarus', region: 'europe', gps: { lat: 53.9006, lng: 27.5590 } },
  { code: 'MD', name: '摩尔多瓦', nameEn: 'Moldova', region: 'europe', gps: { lat: 47.0105, lng: 28.8638 } },
  { code: 'LU', name: '卢森堡', nameEn: 'Luxembourg', region: 'europe', gps: { lat: 49.6116, lng: 6.1319 } },
  { code: 'MT', name: '马耳他', nameEn: 'Malta', region: 'europe', gps: { lat: 35.8989, lng: 14.5146 } },
  { code: 'CY', name: '塞浦路斯', nameEn: 'Cyprus', region: 'europe', gps: { lat: 35.1264, lng: 33.4299 } },
  { code: 'LI', name: '列支敦士登', nameEn: 'Liechtenstein', region: 'europe', gps: { lat: 47.1660, lng: 9.5554 } },
  { code: 'MC', name: '摩纳哥', nameEn: 'Monaco', region: 'europe', gps: { lat: 43.7384, lng: 7.4246 } },
  { code: 'AD', name: '安道尔', nameEn: 'Andorra', region: 'europe', gps: { lat: 42.5063, lng: 1.5218 } },
  { code: 'SM', name: '圣马力诺', nameEn: 'San Marino', region: 'europe', gps: { lat: 43.9424, lng: 12.4578 } },
  { code: 'VA', name: '梵蒂冈', nameEn: 'Vatican City', region: 'europe', gps: { lat: 41.9029, lng: 12.4534 } },
  { code: 'XK', name: '科索沃', nameEn: 'Kosovo', region: 'europe', gps: { lat: 42.6026, lng: 20.9030 } },
  // ===== 亚洲 (9) =====
  { code: 'JP', name: '日本', nameEn: 'Japan', region: 'asia', gps: { lat: 35.6762, lng: 139.6503 } },
  { code: 'KR', name: '韩国', nameEn: 'South Korea', region: 'asia', gps: { lat: 37.5665, lng: 126.9780 } },
  { code: 'TH', name: '泰国', nameEn: 'Thailand', region: 'asia', gps: { lat: 13.7563, lng: 100.5018 } },
  { code: 'SG', name: '新加坡', nameEn: 'Singapore', region: 'asia', gps: { lat: 1.3521, lng: 103.8198 } },
  { code: 'MY', name: '马来西亚', nameEn: 'Malaysia', region: 'asia', gps: { lat: 3.1390, lng: 101.6869 } },
  { code: 'ID', name: '印度尼西亚', nameEn: 'Indonesia', region: 'asia', gps: { lat: -6.2088, lng: 106.8456 } },
  { code: 'VN', name: '越南', nameEn: 'Vietnam', region: 'asia', gps: { lat: 21.0285, lng: 105.8542 } },
  { code: 'PH', name: '菲律宾', nameEn: 'Philippines', region: 'asia', gps: { lat: 14.5995, lng: 120.9842 } },
  { code: 'IN', name: '印度', nameEn: 'India', region: 'asia', gps: { lat: 28.6139, lng: 77.2090 } },
  // ===== 美洲 (4) =====
  { code: 'US', name: '美国', nameEn: 'United States', region: 'americas', gps: { lat: 38.9072, lng: -77.0369 } },
  { code: 'CA', name: '加拿大', nameEn: 'Canada', region: 'americas', gps: { lat: 45.4215, lng: -75.6972 } },
  { code: 'BR', name: '巴西', nameEn: 'Brazil', region: 'americas', gps: { lat: -22.9068, lng: -43.1729 } },
  { code: 'MX', name: '墨西哥', nameEn: 'Mexico', region: 'americas', gps: { lat: 19.4326, lng: -99.1332 } },
  // ===== 大洋洲 (2) =====
  { code: 'AU', name: '澳大利亚', nameEn: 'Australia', region: 'oceania', gps: { lat: -33.8688, lng: 151.2093 } },
  { code: 'NZ', name: '新西兰', nameEn: 'New Zealand', region: 'oceania', gps: { lat: -36.8485, lng: 174.7633 } },
  // ===== 中东/非洲 (6) =====
  { code: 'AE', name: '阿联酋', nameEn: 'UAE', region: 'mena', gps: { lat: 25.2048, lng: 55.2708 } },
  { code: 'TR', name: '土耳其', nameEn: 'Turkey', region: 'mena', gps: { lat: 41.0082, lng: 28.9784 } },
  { code: 'RU', name: '俄罗斯', nameEn: 'Russia', region: 'mena', gps: { lat: 55.7558, lng: 37.6173 } },
  { code: 'EG', name: '埃及', nameEn: 'Egypt', region: 'mena', gps: { lat: 30.0444, lng: 31.2357 } },
  { code: 'ZA', name: '南非', nameEn: 'South Africa', region: 'mena', gps: { lat: -33.9249, lng: 18.4241 } },
  { code: 'MA', name: '摩洛哥', nameEn: 'Morocco', region: 'mena', gps: { lat: 33.9716, lng: -6.8498 } },
];
