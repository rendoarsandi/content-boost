import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@repo/auth/server-only';

const CreateMaterialSchema = z.object({
  type: z.enum(['google_drive', 'youtube', 'image', 'video']),
  url: z.string().url('Invalid URL'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
});

// GET /api/campaigns/[id]/materials - Get campaign materials
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;

    // Mock campaign data for demo purposes
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: 'Summer Product Launch',
        creatorId: 'creator-1',
      },
      {
        id: 'campaign-2',
        title: 'Winter Holiday Sale',
        creatorId: 'creator-1',
      },
    ];

    const campaign = mockCampaigns.find(c => c.id === campaignId);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (
      (session.user as any).role === 'creator' &&
      campaign.creatorId !== (session.user as any).id
    ) {
      return NextResponse.json(
        {
          error: 'Forbidden - You can only access your own campaign materials',
        },
        { status: 403 }
      );
    }

    // Mock materials data
    const mockMaterials = [
      {
        id: 'material-1',
        campaignId: 'campaign-1',
        type: 'image',
        url: 'https://example.com/campaign-banner.jpg',
        title: 'Campaign Banner',
        description: 'Main promotional banner for the campaign',
        createdAt: new Date('2024-01-01').toISOString(),
      },
      {
        id: 'material-2',
        campaignId: 'campaign-1',
        type: 'video',
        url: 'https://example.com/product-demo.mp4',
        title: 'Product Demo Video',
        description: 'Video showcasing product features',
        createdAt: new Date('2024-01-02').toISOString(),
      },
      {
        id: 'material-3',
        campaignId: 'campaign-2',
        type: 'google_drive',
        url: 'https://drive.google.com/file/d/example',
        title: 'Brand Guidelines',
        description: 'Complete brand guidelines document',
        createdAt: new Date('2024-02-01').toISOString(),
      },
    ];

    const materials = mockMaterials
      .filter(m => m.campaignId === campaignId)
      .map(material => ({
        id: material.id,
        type: material.type,
        url: material.url,
        title: material.title,
        description: material.description,
        createdAt: material.createdAt,
      }));

    return NextResponse.json({ materials });
  } catch (error) {
    console.error('Error fetching campaign materials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns/[id]/materials - Add material to campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only creators can add materials
    if ((session.user as any).role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can add materials' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = CreateMaterialSchema.parse(body);

    // Mock campaign data for demo purposes
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: 'Summer Product Launch',
        creatorId: (session.user as any).id,
      },
      {
        id: 'campaign-2',
        title: 'Winter Holiday Sale',
        creatorId: (session.user as any).id,
      },
    ];

    const campaign = mockCampaigns.find(c => c.id === campaignId);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Validate the URL based on type
    const urlValidation = validateMaterialUrl(
      validatedData.type,
      validatedData.url
    );
    if (!urlValidation.valid) {
      return NextResponse.json({ error: urlValidation.error }, { status: 400 });
    }

    // Mock create material
    const material = {
      id: `material-${Date.now()}`,
      campaignId,
      type: validatedData.type,
      url: validatedData.url,
      title: validatedData.title,
      description: validatedData.description,
      createdAt: new Date().toISOString(),
    };

    console.log('Mock material created:', material);

    return NextResponse.json(
      {
        material,
        message: 'Material added successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('Error adding campaign material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to validate material URLs
function validateMaterialUrl(
  type: string,
  url: string
): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);

    switch (type) {
      case 'google_drive':
        if (
          !urlObj.hostname.includes('drive.google.com') &&
          !urlObj.hostname.includes('docs.google.com')
        ) {
          return {
            valid: false,
            error:
              'Google Drive URL must be from drive.google.com or docs.google.com',
          };
        }
        break;
      case 'youtube':
        if (
          !urlObj.hostname.includes('youtube.com') &&
          !urlObj.hostname.includes('youtu.be')
        ) {
          return {
            valid: false,
            error: 'YouTube URL must be from youtube.com or youtu.be',
          };
        }
        break;
      case 'image':
        // Check for common image extensions or image hosting domains
        const imageExtensions = [
          '.jpg',
          '.jpeg',
          '.png',
          '.gif',
          '.webp',
          '.svg',
        ];
        const hasImageExtension = imageExtensions.some(ext =>
          url.toLowerCase().includes(ext)
        );
        const isImageHost = [
          'imgur.com',
          'cloudinary.com',
          'amazonaws.com',
          'unsplash.com',
        ].some(host => urlObj.hostname.includes(host));

        if (!hasImageExtension && !isImageHost) {
          return {
            valid: false,
            error:
              'Image URL should have an image extension or be from a known image hosting service',
          };
        }
        break;
      case 'video':
        const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
        const hasVideoExtension = videoExtensions.some(ext =>
          url.toLowerCase().includes(ext)
        );
        const isVideoHost = ['vimeo.com', 'wistia.com'].some(host =>
          urlObj.hostname.includes(host)
        );

        if (!hasVideoExtension && !isVideoHost) {
          return {
            valid: false,
            error:
              'Video URL should have a video extension or be from a known video hosting service',
          };
        }
        break;
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}