import { NextRequest, NextResponse } from 'next/server';

// Default platform settings
const defaultSettings = {
  platformFeeRate: 5,
  botDetectionEnabled: true,
  botDetectionThresholds: {
    viewLikeRatio: 10,
    viewCommentRatio: 100,
    spikePercentage: 500,
    spikeTimeWindow: 5,
  },
  botDetectionConfidence: {
    ban: 90,
    warning: 50,
    monitor: 20,
  },
  payoutSettings: {
    minimumPayout: 10000,
    payoutSchedule: 'Daily at 00:00 WIB',
    autoProcessPayouts: true,
  },
  systemMaintenance: {
    maintenanceMode: false,
    maintenanceMessage: 'System is under maintenance. Please try again later.',
  },
};

export async function GET() {
  try {
    // In a real implementation, this would fetch from database
    // For now, return default settings
    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const settings = await request.json();
    
    // In a real implementation, this would save to database
    // For now, just log the settings
    console.log('Platform settings updated:', settings);
    
    return NextResponse.json({
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}