export interface PhoneInfo {
  make: string;
  model: string;
  year: number;
}

export const PHONES: PhoneInfo[] = [
  // Apple iPhone (15)
  { make: 'Apple', model: 'iPhone 16 Pro Max', year: 2024 },
  { make: 'Apple', model: 'iPhone 16 Pro', year: 2024 },
  { make: 'Apple', model: 'iPhone 16', year: 2024 },
  { make: 'Apple', model: 'iPhone 15 Pro Max', year: 2023 },
  { make: 'Apple', model: 'iPhone 15 Pro', year: 2023 },
  { make: 'Apple', model: 'iPhone 15', year: 2023 },
  { make: 'Apple', model: 'iPhone 14 Pro Max', year: 2022 },
  { make: 'Apple', model: 'iPhone 14 Pro', year: 2022 },
  { make: 'Apple', model: 'iPhone 14', year: 2022 },
  { make: 'Apple', model: 'iPhone 13 Pro Max', year: 2021 },
  { make: 'Apple', model: 'iPhone 13', year: 2021 },
  { make: 'Apple', model: 'iPhone 12 Pro Max', year: 2020 },
  { make: 'Apple', model: 'iPhone 12', year: 2020 },
  { make: 'Apple', model: 'iPhone 11 Pro', year: 2019 },
  { make: 'Apple', model: 'iPhone 11', year: 2019 },
  // Samsung Galaxy (7)
  { make: 'Samsung', model: 'SM-S928B', year: 2024 }, // S24 Ultra
  { make: 'Samsung', model: 'SM-S926B', year: 2024 }, // S24+
  { make: 'Samsung', model: 'SM-S921B', year: 2024 }, // S24
  { make: 'Samsung', model: 'SM-S918B', year: 2023 }, // S23 Ultra
  { make: 'Samsung', model: 'SM-S911B', year: 2023 }, // S23
  { make: 'Samsung', model: 'SM-S908B', year: 2022 }, // S22 Ultra
  { make: 'Samsung', model: 'SM-S901B', year: 2022 }, // S22
  // Huawei (4)
  { make: 'Huawei', model: 'ALT-AL10', year: 2024 },  // Mate 60 Pro
  { make: 'Huawei', model: 'BRA-AL00', year: 2024 },  // Nova 12 Ultra
  { make: 'Huawei', model: 'LIO-AL00', year: 2023 },  // Mate 50 Pro
  { make: 'Huawei', model: 'NOH-AN00', year: 2023 },  // Mate 40 Pro
  // Xiaomi (4)
  { make: 'Xiaomi', model: '24050PN47C', year: 2024 }, // 14 Ultra
  { make: 'Xiaomi', model: '23116PN5BC', year: 2024 }, // 14 Pro
  { make: 'Xiaomi', model: '23078PND5C', year: 2023 }, // 13 Ultra
  { make: 'Xiaomi', model: '2211133C', year: 2023 },   // 13 Pro
];

export function getPhoneLabel(phone: PhoneInfo): string {
  return `${phone.make} ${phone.model}`;
}
