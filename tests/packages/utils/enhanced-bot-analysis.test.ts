import { createEnhancedBotAnalyzer } from '../src/enhanced-bot-analyzer';
import { ViewRecord } from '../src/bot-detection';

describe('Enhanced Bot Analysis Engine', () => {
  const analyzer = createEnhancedBotAnalyzer({
    logging: {
      enabled: false,
      logPath: '',
      auditTrail: false,
      detailedAnalysis: false,
    },
    actions: {
      autoExecute: true,
      requireConfirmation: false,
      notifyAdmins: false,
    },
    thresholds: {
      highConfidenceBan: 90,
      mediumConfidenceWarning: 50,
      lowConfidenceMonitor: 20,
    },
  });

  it('should identify legitimate activity as "none"', async () => {
    const legitimateViewRecords: ViewRecord[] = [
      {
        id: '1',
        promoterId: 'p-legit',
        campaignId: 'c-legit',
        platform: 'tiktok',
        contentId: 'post-1',
        viewCount: 100,
        likeCount: 15,
        commentCount: 3,
        shareCount: 2,
        timestamp: new Date(Date.now() - 600000),
      },
      {
        id: '2',
        promoterId: 'p-legit',
        campaignId: 'c-legit',
        platform: 'tiktok',
        contentId: 'post-1',
        viewCount: 150,
        likeCount: 22,
        commentCount: 5,
        shareCount: 3,
        timestamp: new Date(Date.now() - 300000),
      },
      {
        id: '3',
        promoterId: 'p-legit',
        campaignId: 'c-legit',
        platform: 'tiktok',
        contentId: 'post-1',
        viewCount: 180,
        likeCount: 28,
        commentCount: 6,
        shareCount: 4,
        timestamp: new Date(),
      },
    ];

    const { analysis } = await analyzer.performAnalysis(
      'p-legit',
      'c-legit',
      legitimateViewRecords
    );

    expect(analysis.action).toBe('none');
    expect(analysis.botScore).toBeLessThan(20);
  });

  it('should identify suspicious activity as "warning"', async () => {
    const suspiciousViewRecords: ViewRecord[] = [
      {
        id: '4',
        promoterId: 'p-suspicious',
        campaignId: 'c-suspicious',
        platform: 'instagram',
        contentId: 'post-2',
        viewCount: 1000,
        likeCount: 5,
        commentCount: 0,
        shareCount: 1,
        timestamp: new Date(Date.now() - 480000),
      },
      {
        id: '5',
        promoterId: 'p-suspicious',
        campaignId: 'c-suspicious',
        platform: 'instagram',
        contentId: 'post-2',
        viewCount: 1200,
        likeCount: 6,
        commentCount: 0,
        shareCount: 1,
        timestamp: new Date(Date.now() - 240000),
      },
    ];

    const { analysis } = await analyzer.performAnalysis(
      'p-suspicious',
      'c-suspicious',
      suspiciousViewRecords
    );

    expect(analysis.action).toBe('warning');
    expect(analysis.botScore).toBeGreaterThanOrEqual(50);
    expect(analysis.botScore).toBeLessThan(90);
  });

  it('should identify bot activity as "ban"', async () => {
    const botViewRecords: ViewRecord[] = [
      {
        id: '6',
        promoterId: 'p-bot',
        campaignId: 'c-bot',
        platform: 'tiktok',
        contentId: 'post-3',
        viewCount: 10000,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        timestamp: new Date(Date.now() - 120000),
      },
    ];

    const { analysis } = await analyzer.performAnalysis(
      'p-bot',
      'c-bot',
      botViewRecords
    );

    expect(analysis.action).toBe('ban');
    expect(analysis.botScore).toBeGreaterThanOrEqual(90);
  });

  it('should detect a view spike and issue a warning', async () => {
    const spikeViewRecords: ViewRecord[] = [
      {
        id: '7',
        promoterId: 'p-spike',
        campaignId: 'c-spike',
        platform: 'tiktok',
        contentId: 'post-4',
        viewCount: 100,
        likeCount: 10,
        commentCount: 2,
        shareCount: 1,
        timestamp: new Date(Date.now() - 600000),
      },
      {
        id: '8',
        promoterId: 'p-spike',
        campaignId: 'c-spike',
        platform: 'tiktok',
        contentId: 'post-4',
        viewCount: 800,
        likeCount: 50,
        commentCount: 8,
        shareCount: 10,
        timestamp: new Date(Date.now() - 420000),
      },
    ];

    const { analysis } = await analyzer.performAnalysis(
      'p-spike',
      'c-spike',
      spikeViewRecords
    );

    expect(analysis.metrics.spikeDetected).toBe(true);
    expect(analysis.action).toBe('warning');
  });
});
