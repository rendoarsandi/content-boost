import { NextResponse } from 'next/server';
// import { prisma } from '@repo/database'; // Akan digunakan setelah migrasi penuh

export async function GET() {
  try {
    // LOGIKA DATABASE DIKOMENTARI SEMENTARA
    // const allUsers = await prisma.user.findMany({
    //   include: {
    //     campaigns: { select: { _count: true } },
    //     promotions: {
    //       where: { campaign: { payouts: { some: { status: 'completed' } } } },
    //       select: { earnings: true }
    //     },
    //   }
    // });
    // return NextResponse.json(allUsers);

    // Mengembalikan data dummy
    const dummyUsers = [
      {
        id: 'user-1',
        name: 'Dummy Creator',
        email: 'creator@test.com',
        role: 'creator',
        status: 'active',
        createdAt: new Date(),
        campaignsCount: 2,
      },
      {
        id: 'user-2',
        name: 'Dummy Promoter',
        email: 'promoter@test.com',
        role: 'promoter',
        status: 'active',
        createdAt: new Date(),
        totalEarnings: 50000,
      },
    ];
    return NextResponse.json(dummyUsers);
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
