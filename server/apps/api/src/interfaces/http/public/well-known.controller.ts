import { Controller, Get, Header } from '@nestjs/common'

@Controller('.well-known')
export class WellKnownController {
  @Get('assetlinks.json')
  @Header('Content-Type', 'application/json')
  getAndroidAssetLinks() {
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.upward.pay',
          sha256_cert_fingerprints: [
            'FF:84:A7:2B:E4:97:49:68:76:7B:47:4E:B7:DA:1A:13:DF:5D:32:C3:53:A4:6A:1D:D2:AD:42:7B:2A:E9:88:06',
          ],
        },
      },
    ]
  }

  @Get('apple-app-site-association')
  @Header('Content-Type', 'application/json')
  getAppleAppSiteAssociation() {
    return {
      applinks: {
        apps: [],
        details: [
          {
            appID: 'YOUR_TEAM_ID.com.upward.pay',
            paths: ['*'],
          },
        ],
      },
    }
  }
}
