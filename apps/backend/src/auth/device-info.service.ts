import { Injectable, Logger } from '@nestjs/common';

export type ParsedUserAgent = {
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
};

@Injectable()
export class DeviceInfoService {
  private readonly logger = new Logger(DeviceInfoService.name);

  parseUserAgent(userAgent: string): ParsedUserAgent {
    const ua = userAgent || '';
    const os = this.parseOs(ua);
    const browser = this.parseBrowser(ua);
    const deviceType = this.parseDeviceType(ua);
    const deviceName = this.parseDeviceName(ua, os, deviceType);

    return { deviceName, deviceType, browser, os };
  }

  getClientIp(headers: Record<string, string | string[] | undefined>, fallback?: string) {
    const forwarded = this.readHeader(headers, 'x-forwarded-for');
    const raw = forwarded
      ? forwarded.split(',')[0]?.trim() || fallback || ''
      : this.readHeader(headers, 'x-real-ip') || fallback || '';

    return raw.replace(/^::ffff:/, '');
  }

  async resolveLocation(ipAddress: string) {
    if (!ipAddress || this.isPrivateIp(ipAddress)) {
      return ipAddress ? 'Local network' : 'Unknown location';
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const response = await fetch(
          `https://ipwho.is/${encodeURIComponent(ipAddress)}?fields=success,city,region,country`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          return 'Unknown location';
        }

        const payload = (await response.json()) as {
          success?: boolean;
          city?: string;
          region?: string;
          country?: string;
        };

        if (!payload.success) {
          return 'Unknown location';
        }

        return (
          [payload.city, payload.region || payload.country]
            .filter(Boolean)
            .join(', ') || 'Unknown location'
        );
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Unable to resolve IP location: ${message}`);
      return 'Unknown location';
    }
  }

  private parseDeviceType(ua: string): ParsedUserAgent['deviceType'] {
    if (/iPad|Tablet|PlayBook/i.test(ua)) return 'tablet';
    if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
    if (/Macintosh|Mac OS X/i.test(ua) && !/Mobile/i.test(ua)) return 'laptop';
    if (/Windows|Linux|CrOS/i.test(ua)) return 'desktop';
    return 'unknown';
  }

  private parseOs(ua: string) {
    if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
    if (/Windows NT 6.3/i.test(ua)) return 'Windows 8.1';
    if (/Mac OS X (\d+)[._](\d+)/i.test(ua)) {
      const match = ua.match(/Mac OS X (\d+)[._](\d+)/i);
      return match ? `macOS ${match[1]}.${match[2]}` : 'macOS';
    }
    if (/Android (\d+(\.\d+)?)/i.test(ua)) {
      const match = ua.match(/Android (\d+(\.\d+)?)/i);
      return match ? `Android ${match[1]}` : 'Android';
    }
    if (/iPhone OS (\d+)[._](\d+)/i.test(ua) || /CPU OS (\d+)[._](\d+)/i.test(ua)) {
      const match = ua.match(/(?:iPhone OS|CPU OS) (\d+)[._](\d+)/i);
      return match ? `iOS ${match[1]}.${match[2]}` : 'iOS';
    }
    if (/CrOS/i.test(ua)) return 'Chrome OS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Unknown OS';
  }

  private parseBrowser(ua: string) {
    if (/Edg\//i.test(ua)) {
      const match = ua.match(/Edg\/([\d.]+)/i);
      return match ? `Edge ${match[1]}` : 'Edge';
    }
    if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
      const match = ua.match(/Chrome\/([\d.]+)/i);
      return match ? `Chrome ${match[1]}` : 'Chrome';
    }
    if (/Firefox\//i.test(ua)) {
      const match = ua.match(/Firefox\/([\d.]+)/i);
      return match ? `Firefox ${match[1]}` : 'Firefox';
    }
    if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
      const match = ua.match(/Version\/([\d.]+)/i);
      return match ? `Safari ${match[1]}` : 'Safari';
    }
    return 'Unknown browser';
  }

  private parseDeviceName(
    ua: string,
    os: string,
    deviceType: ParsedUserAgent['deviceType'],
  ) {
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'Android Phone';
    if (/Android/i.test(ua)) return 'Android Tablet';
    if (/Macintosh/i.test(ua)) return os.includes('macOS') ? 'Mac (macOS)' : 'Mac';
    if (/Windows/i.test(ua)) return 'Windows Desktop';
    if (/Linux/i.test(ua)) return 'Linux Desktop';

    if (deviceType === 'mobile') return 'Mobile Device';
    if (deviceType === 'tablet') return 'Tablet';
    if (deviceType === 'laptop') return os.includes('macOS') ? 'MacBook' : 'Laptop';
    return 'Desktop';
  }

  private isPrivateIp(ip: string) {
    const value = ip.replace(/^::ffff:/, '');
    if (value === '::1' || value === '127.0.0.1') {
      return true;
    }
    if (value.startsWith('10.') || value.startsWith('192.168.') || value.startsWith('127.')) {
      return true;
    }
    const match = value.match(/^172\.(\d+)\./);
    if (match) {
      const octet = Number(match[1]);
      return octet >= 16 && octet <= 31;
    }
    return false;
  }

  private readHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0]?.trim() ?? '';
    }
    return value?.trim() ?? '';
  }
}
