import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { auth } from '@repo/auth/server-only';

const CreateMaterialSchema = z.object({
  type: z.enum(['google_drive', 'youtube', 'image', 'video']),
  url: z.string().url('Invalid URL'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
});

// Map frontend enum values to Prisma enum values
const mapTypeToEnum = (type: string) => {
  switch (type) {
    case 'google_drive':
      return 'GOOGLE_DRIVE';
    case 'youtube':
      return 'YOUTUBE';
    case 'image':
      return 'IMAGE';
    case 'video':
      return 'VIDEO';
    default:
      throw new Error(`Invalid material type: ${type}`);
  }
};

// Map Prisma enum values to frontend values
const mapEnumToType = (enumValue: string) => {
  switch (enumValue) {
    case 'GOOGLE_DRIVE':
      return 'google_drive';
    case 'YOUTUBE':
      return 'youtube';
    case 'IMAGE':
      return 'image';
    case 'VIDEO':
      return 'video';
    default:
      return enumValue.toLowerCase();
  }
};

const UpdateMaterialSchema = CreateMaterialSchema.partial();

// GET /api/campaigns/[id]/materials - Get campaign materials
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;

    // Check if campaign exists and user has access
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        materials: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (
      session.user.role === 'creator' &&
      campaign.creatorId !== session.user.id
    ) {
      return NextResponse.json(
        {
          error: 'Forbidden - You can only access your own campaign materials',
        },
        { status: 403 }
      );
    }

    // Map materials to frontend format
    const materials = campaign.materials.map(material => ({
      id: material.id,
      type: mapEnumToType(material.type),
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
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only creators can add materials
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can add materials' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = CreateMaterialSchema.parse(body);

    // Check if campaign exists and user owns it
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        creatorId: session.user.id,
      },
    });

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

    // Create the material
    const material = await db.campaignMaterial.create({
      data: {
        campaignId,
        type: mapTypeToEnum(validatedData.type) as any,
        url: validatedData.url,
        title: validatedData.title,
        description: validatedData.description,
      },
    });

    // Return material in frontend format
    const formattedMaterial = {
      id: material.id,
      type: mapEnumToType(material.type),
      url: material.url,
      title: material.title,
      description: material.description,
      createdAt: material.createdAt,
    };

    return NextResponse.json(
      {
        material: formattedMaterial,
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
        const imageHosts = [
          'imgur.com',
          'cloudinary.com',
          'unsplash.com',
          'pexels.com',
        ];

        const hasImageExtension = imageExtensions.some(ext =>
          urlObj.pathname.toLowerCase().includes(ext)
        );
        const isImageHost = imageHosts.some(host =>
          urlObj.hostname.includes(host)
        );

        if (!hasImageExtension && !isImageHost) {
          return {
            valid: false,
            error:
              'Image URL should point to an image file or known image hosting service',
          };
        }
        break;
      case 'video':
        // Check for common video extensions or video hosting domains
        const videoExtensions = [
          '.mp4',
          '.avi',
          '.mov',
          '.wmv',
          '.flv',
          '.webm',
        ];
        const videoHosts = ['vimeo.com', 'dailymotion.com', 'twitch.tv'];

        const hasVideoExtension = videoExtensions.some(ext =>
          urlObj.pathname.toLowerCase().includes(ext)
        );
        const isVideoHost = videoHosts.some(host =>
          urlObj.hostname.includes(host)
        );

        if (!hasVideoExtension && !isVideoHost) {
          return {
            valid: false,
            error:
              'Video URL should point to a video file or known video hosting service',
          };
        }
        break;
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
