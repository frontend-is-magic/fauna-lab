import { Card, Typography } from 'antd';

export function InferencePage() {
  return (
    <Card className="shadow-soft">
      <Typography.Title level={2}>Inference</Typography.Title>
      <Typography.Paragraph>
        This screen will host single-image prediction with theme-driven result feedback.
      </Typography.Paragraph>
    </Card>
  );
}
