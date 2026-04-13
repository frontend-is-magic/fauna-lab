import { Card, Typography } from 'antd';

export function ModelsPage() {
  return (
    <Card className="shadow-soft">
      <Typography.Title level={2}>Models</Typography.Title>
      <Typography.Paragraph>
        This screen will list checkpoints, metadata, and download or delete actions.
      </Typography.Paragraph>
    </Card>
  );
}
