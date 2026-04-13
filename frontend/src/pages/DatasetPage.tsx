import { Card, Typography } from 'antd';

export function DatasetPage() {
  return (
    <Card className="shadow-soft">
      <Typography.Title level={2}>Dataset</Typography.Title>
      <Typography.Paragraph>
        Upload categories, inspect samples, and prepare the local dataset pipeline here.
      </Typography.Paragraph>
    </Card>
  );
}
