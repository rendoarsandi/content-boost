import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { Award } from 'lucide-react';

export const BadgeCard = ({
  name,
  description,
}: {
  name: string;
  description: string;
}) => (
  <Card className="text-center">
    <CardHeader>
      <Award className="w-12 h-12 mx-auto text-yellow-500" />
    </CardHeader>
    <CardContent>
      <CardTitle className="text-lg">{name}</CardTitle>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);
