import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { campaigns, campaignMaterials } from '@repo/database/schemas';
import { eq, and } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';

const UpdateMaterialSchema = z.object({
  type: z.enum(['google_drive', 'youtube', 'image', 'video']).optional(),
  url: z.string().url('Invalid URL').optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// GET /api/campaigns/[id]/materials/[materialId] - Get specific material
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId, materialId } = params;

    // Get material with campaign info
    const [material] = await db
      .select({
        material: campaignMaterials,
        campaign: campaigns,
      })
      .from(campaignMaterials)
      .innerJoin(campaigns, eq(campaignMaterials.campaignId, campaigns.id))
      .where(
        and(
          eq(campaignMaterials.id, materialId),
          eq(campaignMaterials.campaignId, campaignId)
        )
      );

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (session.user.role === 'creator' && material.campaign.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own campaign materials' },
        { status: 403 }
      );
    }

    return NextResponse.json({ material: material.material });
  } catch (error) {
    console.error('Error fetching campaign material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id]/materials/[materialId] - Update material
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can update materials
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can update materials' },
        { status: 403 }
      );
    }

    const { id: campaignId, materialId } = params;
    const body = await request.json();
    const validatedData = UpdateMaterialSchema.parse(body);

    // Check if material exists and user owns the campaign
    const [existingMaterial] = await db
      .select({
        material: campaignMaterials,
        campaign: campaigns,
      })
      .from(campaignMaterials)
      .innerJoin(campaigns, eq(campaignMaterials.campaignId, campaigns.id))
      .where(
        and(
          eq(campaignMaterials.id, materialId),
          eq(campaignMaterials.campaignId, campaignId),
          eq(campaigns.creatorId, session.user.id)
        )
      );

    if (!existingMaterial) {
      return NextResponse.json(
        { error: 'Material not found or access denied' },
        { status: 404 }
      );
    }

    // Validate URL if being updated
    if (validatedData.url && validatedData.type) {
      const urlValidation = validateMaterialUrl(validatedData.type, validatedData.url);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: urlValidation.error },
          { status: 400 }
        );
      }
    }

    // Update material
    const [updatedMaterial] = await db
      .update(campaignMaterials)
      .set(validatedData)
      .where(eq(campaignMaterials.id, materialId))
      .returning();

    return NextResponse.json({
      material: updatedMaterial,
      message: 'Material updated successfully'
    });
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

    console.error('Error updating campaign material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]/materials/[materialId] - Delete material
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can delete materials
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can delete materials' },
        { status: 403 }
      );
    }

    const { id: campaignId, materialId } = params;

    // Check if material exists and user owns the campaign
    const [existingMaterial] = await db
      .select({
        material: campaignMaterials,
        campaign: campaigns,
      })
      .from(campaignMaterials)
      .innerJoin(campaigns, eq(campaignMaterials.campaignId, campaigns.id))
      .where(
        and(
          eq(campaignMaterials.id, materialId),
          eq(campaignMaterials.campaignId, campaignId),
          eq(campaigns.creatorId, session.user.id)
        )
      );

    if (!existingMaterial) {
      return NextResponse.json(
        { error: 'Material not found or access denied' },
        { status: 404 }
      );
    }

    // Delete material
    await db
      .delete(campaignMaterials)
      .where(eq(campaignMaterials.id, materialId));

    return NextResponse.json({
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to validate material URLs (same as in materials/route.ts)
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