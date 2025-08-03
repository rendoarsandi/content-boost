import { NextRequest, NextResponse } from 'next/server';

// GET /api/campaigns/[id]/applications - Simplified applications list endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Sample applications data
    const applications = [
      {
        id: 'app-1',
        campaignId,
        status: 'pending',
        submittedContent: 'Great content proposal for your campaign',
        appliedAt: new Date('2024-01-01').toISOString(),
        promoter: {
          id: 'promoter-1',
          name: 'John Doe',
          email: 'john@example.com',
          followers: 15000,
          engagementRate: 3.2
        }
      },
      {
        id: 'app-2',
        campaignId,
        status: 'approved',
        submittedContent: 'Excellent video content idea',
        appliedAt: new Date('2024-01-02').toISOString(),
        promoter: {
          id: 'promoter-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          followers: 25000,
          engagementRate: 4.1
        }
      },
      {
        id: 'app-3',
        campaignId,
        status: 'rejected',
        submittedContent: 'Standard content proposal',
        appliedAt: new Date('2024-01-03').toISOString(),
        promoter: {
          id: 'promoter-3',
          name: 'Bob Wilson',
          email: 'bob@example.com',
          followers: 8000,
          engagementRate: 2.8
        }
      }
    ];

    // Filter by status if provided
    const filteredApplications = status 
      ? applications.filter(app => app.status === status)
      : applications;

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedApplications = filteredApplications.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      applications: paginatedApplications,
      pagination: {
        page,
        limit,
        total: filteredApplications.length,
        totalPages: Math.ceil(filteredApplications.length / limit)
      },
      stats: {
        total: applications.length,
        pending: applications.filter(app => app.status === 'pending').length,
        approved: applications.filter(app => app.status === 'approved').length,
        rejected: applications.filter(app => app.status === 'rejected').length
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}