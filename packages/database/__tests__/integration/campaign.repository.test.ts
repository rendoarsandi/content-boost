import { CampaignRepository, CampaignMaterialRepository, CampaignApplicationRepository } from '../../src/repositories/campaign';
import { UserRepository } from '../../src/repositories/user';
import { getDatabaseConnection } from '../../src/connection';

describe('Campaign Repository Tests', () => {
  let campaignRepo: CampaignRepository;
  let materialRepo: CampaignMaterialRepository;
  let applicationRepo: CampaignApplicationRepository;
  let userRepo: UserRepository;
  let testCreatorId: string;
  let testPromoterId: string;
  let testCampaignId: string;

  beforeAll(async () => {
    campaignRepo = new CampaignRepository();
    materialRepo = new CampaignMaterialRepository();
    applicationRepo = new CampaignApplicationRepository();
    userRepo = new UserRepository();

    // Create test users
    const creator = await userRepo.create({
      email: 'creator@test.com',
      name: 'Test Creator',
      role: 'creator'
    });
    testCreatorId = creator.id;

    const promoter = await userRepo.create({
      email: 'promoter@test.com',
      name: 'Test Promoter',
      role: 'promoter'
    });
    testPromoterId = promoter.id;
  });

  afterAll(async () => {
    // Clean up test data
    const db = getDatabaseConnection();
    await db.query('DELETE FROM campaigns WHERE creator_id = $1', [testCreatorId]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testCreatorId, testPromoterId]);
    await db.disconnect();
  });

  describe('CampaignRepository', () => {
    test('should create a new campaign', async () => {
      const campaignData = {
        creatorId: testCreatorId,
        title: 'Test Campaign',
        description: 'A test campaign for unit testing',
        budget: 1000,
        ratePerView: 10,
        status: 'draft' as const,
        requirements: ['Must have TikTok account', 'Minimum 1000 followers']
      };

      const campaign = await campaignRepo.create(campaignData);
      testCampaignId = campaign.id;

      expect(campaign).toBeDefined();
      expect(campaign.id).toBeDefined();
      expect(campaign.title).toBe(campaignData.title);
      expect(campaign.creatorId).toBe(testCreatorId);
      expect(campaign.budget).toBe(campaignData.budget);
      expect(campaign.ratePerView).toBe(campaignData.ratePerView);
      expect(campaign.status).toBe('draft');
      expect(campaign.requirements).toEqual(campaignData.requirements);
    });

    test('should find campaign by id', async () => {
      const campaign = await campaignRepo.findById(testCampaignId);

      expect(campaign).toBeDefined();
      expect(campaign!.id).toBe(testCampaignId);
      expect(campaign!.title).toBe('Test Campaign');
    });

    test('should find campaigns by creator id', async () => {
      const campaigns = await campaignRepo.findByCreatorId(testCreatorId);

      expect(campaigns).toBeDefined();
      expect(campaigns.length).toBeGreaterThan(0);
      expect(campaigns[0].creatorId).toBe(testCreatorId);
    });

    test('should update campaign', async () => {
      const updateData = {
        title: 'Updated Test Campaign',
        budget: 2000,
        status: 'active' as const
      };

      const updatedCampaign = await campaignRepo.update(testCampaignId, updateData);

      expect(updatedCampaign).toBeDefined();
      expect(updatedCampaign!.title).toBe(updateData.title);
      expect(updatedCampaign!.budget).toBe(updateData.budget);
      expect(updatedCampaign!.status).toBe(updateData.status);
    });

    test('should find campaigns by status', async () => {
      const activeCampaigns = await campaignRepo.findByStatus('active');

      expect(activeCampaigns).toBeDefined();
      expect(activeCampaigns.length).toBeGreaterThan(0);
      expect(activeCampaigns.every(c => c.status === 'active')).toBe(true);
    });

    test('should find active campaigns', async () => {
      const activeCampaigns = await campaignRepo.findActiveCampaigns();

      expect(activeCampaigns).toBeDefined();
      expect(activeCampaigns.every(c => c.status === 'active')).toBe(true);
    });
  });

  describe('CampaignMaterialRepository', () => {
    let testMaterialId: string;

    test('should create campaign material', async () => {
      const materialData = {
        campaignId: testCampaignId,
        type: 'youtube' as const,
        url: 'https://youtube.com/watch?v=test',
        title: 'Test Video Material',
        description: 'A test video for the campaign'
      };

      const material = await materialRepo.create(materialData);
      testMaterialId = material.id;

      expect(material).toBeDefined();
      expect(material.id).toBeDefined();
      expect(material.campaignId).toBe(testCampaignId);
      expect(material.type).toBe(materialData.type);
      expect(material.url).toBe(materialData.url);
      expect(material.title).toBe(materialData.title);
    });

    test('should find materials by campaign id', async () => {
      const materials = await materialRepo.findByCampaignId(testCampaignId);

      expect(materials).toBeDefined();
      expect(materials.length).toBeGreaterThan(0);
      expect(materials[0].campaignId).toBe(testCampaignId);
    });

    test('should update material', async () => {
      const updateData = {
        title: 'Updated Test Material',
        description: 'Updated description'
      };

      const updatedMaterial = await materialRepo.update(testMaterialId, updateData);

      expect(updatedMaterial).toBeDefined();
      expect(updatedMaterial!.title).toBe(updateData.title);
      expect(updatedMaterial!.description).toBe(updateData.description);
    });

    test('should delete material', async () => {
      const deleted = await materialRepo.delete(testMaterialId);
      expect(deleted).toBe(true);

      const material = await materialRepo.findById(testMaterialId);
      expect(material).toBeNull();
    });
  });

  describe('CampaignApplicationRepository', () => {
    let testApplicationId: string;

    test('should create campaign application', async () => {
      const applicationData = {
        campaignId: testCampaignId,
        promoterId: testPromoterId,
        submittedContent: 'I will create engaging TikTok videos for this campaign',
        trackingLink: 'https://track.domain.com/test-tracking-link'
      };

      const application = await applicationRepo.create(applicationData);
      testApplicationId = application.id;

      expect(application).toBeDefined();
      expect(application.id).toBeDefined();
      expect(application.campaignId).toBe(testCampaignId);
      expect(application.promoterId).toBe(testPromoterId);
      expect(application.status).toBe('pending');
      expect(application.trackingLink).toBe(applicationData.trackingLink);
    });

    test('should find applications by campaign id', async () => {
      const applications = await applicationRepo.findByCampaignId(testCampaignId);

      expect(applications).toBeDefined();
      expect(applications.length).toBeGreaterThan(0);
      expect(applications[0].campaignId).toBe(testCampaignId);
    });

    test('should find applications by promoter id', async () => {
      const applications = await applicationRepo.findByPromoterId(testPromoterId);

      expect(applications).toBeDefined();
      expect(applications.length).toBeGreaterThan(0);
      expect(applications[0].promoterId).toBe(testPromoterId);
    });

    test('should update application status', async () => {
      const updateData = {
        status: 'approved' as const
      };

      const updatedApplication = await applicationRepo.update(testApplicationId, updateData);

      expect(updatedApplication).toBeDefined();
      expect(updatedApplication!.status).toBe('approved');
      expect(updatedApplication!.reviewedAt).toBeDefined();
    });

    test('should find applications by status', async () => {
      const approvedApplications = await applicationRepo.findByStatus('approved');

      expect(approvedApplications).toBeDefined();
      expect(approvedApplications.every(app => app.status === 'approved')).toBe(true);
    });

    test('should delete application', async () => {
      const deleted = await applicationRepo.delete(testApplicationId);
      expect(deleted).toBe(true);

      const application = await applicationRepo.findById(testApplicationId);
      expect(application).toBeNull();
    });
  });
});