import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // For development/demo purposes, simulate metrics fetching
    // In production, this would validate session and fetch real metrics

    const body = await request.json();
    const { postUrls } = body;

    if (!Array.isArray(postUrls) || postUrls.length === 0) {
      return NextResponse.json({ error: 'Invalid post URLs' }, { status: 400 });
    }

    // Simple URL validation
    const validUrls = postUrls.filter(
      (url: string) =>
        typeof url === 'string' &&
        (url.includes('tiktok.com') || url.includes('instagram.com'))
    );

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid post URLs provided' },
        { status: 400 }
      );
    }

    // Mock metrics data
    const metrics = validUrls.map((url: string) => ({
      url,
      views: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        processed: validUrls.length,
        total: postUrls.length,
      },
    });
  } catch (error) {
    console.error('Error fetching post metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post metrics' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // For development/demo purposes, simulate single post metrics fetching
    // In production, this would validate session and fetch real metrics

    const { searchParams } = new URL(request.url);
    const postUrl = searchParams.get('url');

    if (!postUrl) {
      return NextResponse.json(
        { error: 'Post URL is required' },
        { status: 400 }
      );
    }

    // Simple URL validation
    if (!postUrl.includes('tiktok.com') && !postUrl.includes('instagram.com')) {
      return NextResponse.json({ error: 'Invalid post URL' }, { status: 400 });
    }

    // Mock metrics data
    const metrics = {
      url: postUrl,
      views: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      timestamp: new Date().toISOString(),
      platform: postUrl.includes('tiktok.com') ? 'tiktok' : 'instagram',
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching post metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post metrics' },
      { status: 500 }
    );
  }
}
