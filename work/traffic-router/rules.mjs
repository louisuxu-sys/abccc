import { timingSafeEqual } from 'node:crypto';

export const platforms = ['其他', 'Facebook', 'Instagram', 'Google', 'TikTok', '百度搜尋', '360 搜尋', 'UC 神馬', '搜狗推廣', '小紅書', '抖音', '視訊號'];
export const devices = { any: '不限制', mobile: '手機／平板', desktop: '桌面' };
export const emptyRules = { countries: '', regions: '', device: 'any', start: '', end: '', asns: '' };
const timeFormat = /^([01]\d|2[0-3]):[0-5]\d$/;
const parts = value => value.split(/[,，、]/).map(item => item.trim().toUpperCase()).filter(Boolean);
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function parseRules(form) {
  const rules = Object.fromEntries(Object.keys(emptyRules).map(key => [key, (form.get(key) || '').trim()]));
  if (rules.countries.length > 250 || parts(rules.countries).some(code => !/^[A-Z]{2}$/.test(code)) ||
      rules.regions.length > 500 || rules.asns.length > 500 || parts(rules.asns).some(asn => !/^(AS)?[0-9]{1,10}$/.test(asn)) ||
      !Object.hasOwn(devices, rules.device) ||
      ((rules.start || rules.end) && (!timeFormat.test(rules.start) || !timeFormat.test(rules.end) || rules.start === rules.end))) return null;
  return rules;
}

function trustedMetadata(headers) {
  const expected = Buffer.from(process.env.ROUTER_PROXY_SECRET || '');
  const actual = Buffer.from(headers['x-router-secret'] || '');
  if (!expected.length || actual.length !== expected.length || !timingSafeEqual(expected, actual)) return {};
  return { country: headers['x-router-country'], region: headers['x-router-region'], asn: headers['x-router-asn'] };
}

export function ruleResult(rules, headers, now = new Date()) {
  const metadata = trustedMetadata(headers);
  const countries = parts(rules.countries);
  const regions = parts(rules.regions);
  const asns = parts(rules.asns).map(asn => asn.replace(/^AS/, ''));
  if (countries.length && !countries.includes(metadata.country?.trim().toUpperCase())) return 'country';
  if (regions.length && !regions.includes(metadata.region?.trim().toUpperCase())) return 'region';
  if (asns.length && (!metadata.asn || asns.includes(metadata.asn.trim().replace(/^AS/i, '')))) return 'asn';
  const mobile = /mobile|android|iphone|ipad|tablet/i.test(headers['user-agent'] || '');
  if ((rules.device === 'mobile' && !mobile) || (rules.device === 'desktop' && mobile)) return 'device';
  if (rules.start) {
    const time = clock.format(now);
    const inside = rules.start < rules.end ? time >= rules.start && time < rules.end : time >= rules.start || time < rules.end;
    if (!inside) return 'time';
  }
  return '';
}
