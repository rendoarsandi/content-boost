import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// import { campaigns, campaignMaterials } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';

const CreateMaterialSchema = z.object({
  type: z.enum(['google_drive', 'youtube', 'image', 'video']),
  url: z.string().url('Invalid URL'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
});

const UpdateMaterialSchema = CreateMaterialSchema.partial();

// GET /api/campaigns/[id]/materials - Get campaign materials
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const campaignId = params.id;

    // Check if campaign exists and user has access
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (session.user.role === 'creator' && campaign.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own campaign materials' },
        { status: 403 }
      );
    }

    // Get materials
    const materials = await db
      .select()
      .from(campaignMaterials)
      .where(eq(campaignMaterials.campaignId, campaignId));

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can add materials
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can add materials' },
        { status: 403 }
      );
    }

    const campaignId = params.id;
    const body = await request.json();
    const validatedData = CreateMaterialSchema.parse(body);

    // Check if campaign exists and user owns it
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.creatorId, session.user.id)
        )
      );

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Validate URL based on material type
    const urlValidation = validateMaterialUrl(validatedData.type, validatedData.url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    // Create material
    const [newMaterial] = await db
      .insert(campaignMaterials)
      .values({
        campaignId,
        type: validatedData.type,
        url: validatedData.url,
        title: validatedData.title,
        description: validatedData.description,
      })
      .returning();

    return NextResponse.json(
      {
        material: newMaterial,
        message: 'Material added successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
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
function validateMaterialUrl(type: string, url: string): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);
    
    switch (type) {
      case 'google_drive':
        if (!urlObj.hostname.includes('drive.google.com') && !urlObj.hostname.includes('docs.google.com')) {
          return { valid: false, error: 'Google Drive URL must be from drive.google.com or docs.google.com' };
        }
        break;
      case 'youtube':
        if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
          return { valid: false, error: 'YouTube URL must be from youtube.com or youtu.be' };
        }
        break;
      case 'image':
        // Check for common image extensions or image hosting domains
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const imageHosts = ['imgur.com', 'cloudinary.com', 'unsplash.com', 'pexels.com'];
        
        const hasImageExtension = imageExtensions.some(ext => 
          urlObj.pathname.toLowerCase().includes(ext)
        );
        const isImageHost = imageHosts.some(host => 
          urlObj.hostname.includes(host)
        );
        
        if (!hasImageExtension && !isImageHost) {
          return { valid: false, error: 'Image URL should point to an image file or known image hosting service' };
        }
        break;
      case 'video':
        // Check for common video extensions or video hosting domains
        const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
        const videoHosts = ['vimeo.com', 'dailymotion.com', 'twitch.tv'];
        
        const hasVideoExtension = videoExtensions.some(ext => 
          urlObj.pathname.toLowerCase().includes(ext)
        );
        const isVideoHost = videoHosts.some(host => 
          urlObj.hostname.includes(host)
        );
        
        if (!hasVideoExtension && !isVideoHost) {
          return { valid: false, error: 'Video URL should point to a video file or known video hosting service' };
        }
        break;
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}